// API de citas en Express. La usan server.js (en local) y api/index.js (en Vercel).
import './env.js';
import express from 'express';
import {
  listarServicios, buscarServicio, horasOcupadasEntre, crearCita, CupoOcupadoError,
} from './db.js';
import { rangoAgendable, horasLibres, etiquetaHora, etiquetaFecha, esFechaValida } from './horarios.js';
import { validarCita } from './validacion.js';
import { sincronizarCita } from './sincronizacion.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true); // en Vercel la IP real de la clienta llega en X-Forwarded-For

// En Vercel el cuerpo JSON puede llegar ya leído; si es así, se usa tal cual.
app.use((req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') req._body = true;
  } catch { /* JSON inválido: lo reporta express.json() */ }
  next();
});
app.use(express.json({ limit: '10kb' }));

// Express 4 no atrapa errores de funciones async: este envoltorio los pasa al manejador de errores.
const conErrores = (manejador) => (req, res, next) => manejador(req, res).catch(next);

// Fechas de los próximos días que todavía tienen al menos una hora libre.
async function fechasDisponibles() {
  const fechas = rangoAgendable();
  const ocupadas = await horasOcupadasEntre(fechas[0], fechas.at(-1));
  return fechas
    .map((fecha) => ({ fecha, horas: horasLibres(fecha, ocupadas.get(fecha)) }))
    .filter(({ horas }) => horas.length > 0);
}

const conEtiquetas = ({ fecha, horas }) => ({
  fecha,
  etiqueta: etiquetaFecha(fecha),
  horas: horas.map((hora) => ({ hora, etiqueta: etiquetaHora(hora) })),
});

app.get('/api/servicios', conErrores(async (req, res) => {
  res.json(await listarServicios());
}));

app.get('/api/disponibilidad', conErrores(async (req, res) => {
  res.json((await fechasDisponibles()).map(conEtiquetas));
}));

app.get('/api/disponibilidad/:fecha', conErrores(async (req, res) => {
  const { fecha } = req.params;
  if (!esFechaValida(fecha)) return res.status(400).json({ error: 'Fecha no válida.' });
  const dia = (await fechasDisponibles()).find((d) => d.fecha === fecha) ?? { fecha, horas: [] };
  res.json(conEtiquetas(dia));
}));

// Límite sencillo para evitar envíos masivos: 5 solicitudes por IP cada 15 minutos.
// (En Vercel cada instancia lleva su propia cuenta.)
const intentos = new Map();
function limitarEnvios(req, res, next) {
  const ahora = Date.now();
  const recientes = (intentos.get(req.ip) ?? []).filter((t) => ahora - t < 15 * 60_000);
  if (recientes.length >= 5) {
    return res.status(429).json({ error: 'Has enviado varias solicitudes seguidas. Intenta de nuevo en unos minutos.' });
  }
  intentos.set(req.ip, [...recientes, ahora]);
  next();
}

app.post('/api/citas', limitarEnvios, conErrores(async (req, res) => {
  const { datos, errores } = validarCita(req.body);
  if (errores) return res.status(400).json({ error: 'Revisa los campos marcados.', errores });

  const servicio = await buscarServicio(datos.servicio);
  if (!servicio) {
    return res.status(400).json({ error: 'Revisa los campos marcados.', errores: { servicio: 'Elige un servicio de la lista.' } });
  }

  const libre = (await fechasDisponibles()).find((d) => d.fecha === datos.fecha)?.horas.includes(datos.hora);
  if (!libre) {
    return res.status(409).json({ error: 'Esa hora ya no está disponible. Elige otra fecha u hora.' });
  }

  let guardada;
  try {
    guardada = await crearCita({ ...datos, servicioId: servicio.id });
  } catch (error) {
    if (error instanceof CupoOcupadoError) {
      return res.status(409).json({ error: 'Esa hora acaba de ser reservada. Elige otra fecha u hora.' });
    }
    throw error;
  }

  // Se espera al calendario antes de responder: en Vercel la función se congela al responder.
  // Si Google falla, la cita ya está guardada y queda marcada para reintentarse.
  await sincronizarCita({ ...datos, ...guardada, servicio: servicio.nombre });

  res.status(201).json({
    id: guardada.id,
    nombre: datos.nombre,
    servicio: servicio.nombre,
    fecha: etiquetaFecha(datos.fecha),
    hora: etiquetaHora(datos.hora),
  });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use('/api', (error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Solicitud no válida.' });
  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error en el servidor. Intenta de nuevo.' });
});

export default app;
