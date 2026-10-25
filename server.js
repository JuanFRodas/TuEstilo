// Servidor de "Tu estilo, Tu cita": sirve la página y la API de citas.
import './src/env.js';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import express from 'express';
import {
  listarServicios, buscarServicio, horasOcupadasEntre, crearCita, CupoOcupadoError,
} from './src/db.js';
import { rangoAgendable, horasLibres, etiquetaHora, etiquetaFecha, esFechaValida } from './src/horarios.js';
import { validarCita } from './src/validacion.js';
import { calendarioConfigurado } from './src/calendario.js';
import { sincronizarCita, sincronizarPendientes } from './src/sincronizacion.js';

const app = express();
const servidor = createServer(app);
const PUERTO = Number(process.env.PORT) || 3000;
const DESARROLLO = process.argv.includes('--dev');

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// Fechas de los próximos días que todavía tienen al menos una hora libre.
function fechasDisponibles() {
  const fechas = rangoAgendable();
  const ocupadas = horasOcupadasEntre(fechas[0], fechas.at(-1));
  return fechas
    .map((fecha) => ({ fecha, horas: horasLibres(fecha, ocupadas.get(fecha)) }))
    .filter(({ horas }) => horas.length > 0);
}

const conEtiquetas = ({ fecha, horas }) => ({
  fecha,
  etiqueta: etiquetaFecha(fecha),
  horas: horas.map((hora) => ({ hora, etiqueta: etiquetaHora(hora) })),
});

app.get('/api/servicios', (req, res) => {
  res.json(listarServicios());
});

app.get('/api/disponibilidad', (req, res) => {
  res.json(fechasDisponibles().map(conEtiquetas));
});

app.get('/api/disponibilidad/:fecha', (req, res) => {
  const { fecha } = req.params;
  if (!esFechaValida(fecha)) return res.status(400).json({ error: 'Fecha no válida.' });
  const dia = fechasDisponibles().find((d) => d.fecha === fecha) ?? { fecha, horas: [] };
  res.json(conEtiquetas(dia));
});

// Límite sencillo para evitar envíos masivos: 5 solicitudes por IP cada 15 minutos.
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

app.post('/api/citas', limitarEnvios, (req, res) => {
  const { datos, errores } = validarCita(req.body);
  if (errores) return res.status(400).json({ error: 'Revisa los campos marcados.', errores });

  const servicio = buscarServicio(datos.servicio);
  if (!servicio) {
    return res.status(400).json({ error: 'Revisa los campos marcados.', errores: { servicio: 'Elige un servicio de la lista.' } });
  }

  const libre = fechasDisponibles().find((d) => d.fecha === datos.fecha)?.horas.includes(datos.hora);
  if (!libre) {
    return res.status(409).json({ error: 'Esa hora ya no está disponible. Elige otra fecha u hora.' });
  }

  let guardada;
  try {
    guardada = crearCita({ ...datos, servicioId: servicio.id });
  } catch (error) {
    if (error instanceof CupoOcupadoError) {
      return res.status(409).json({ error: 'Esa hora acaba de ser reservada. Elige otra fecha u hora.' });
    }
    throw error;
  }

  // El evento de Google Calendar se crea en segundo plano para no hacer esperar a la clienta.
  sincronizarCita({ ...datos, ...guardada, servicio: servicio.nombre });

  res.status(201).json({
    id: guardada.id,
    nombre: datos.nombre,
    servicio: servicio.nombre,
    fecha: etiquetaFecha(datos.fecha),
    hora: etiquetaHora(datos.hora),
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use('/api', (error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Solicitud no válida.' });
  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error en el servidor. Intenta de nuevo.' });
});

// Frontend en React: en desarrollo lo sirve Vite (con recarga en vivo);
// en producción se sirve la versión compilada de client/dist ("npm run build").
if (DESARROLLO) {
  const { createServer: crearVite } = await import('vite');
  const vite = await crearVite({ server: { middlewareMode: true, hmr: { server: servidor } }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  if (!existsSync('client/dist/index.html')) {
    console.warn('Aviso: no existe client/dist. Ejecuta "npm run build" o usa "npm run dev".');
  }
  app.use(express.static('client/dist'));
}

servidor.listen(PUERTO, async () => {
  console.log(`Tu estilo, Tu cita${DESARROLLO ? ' (desarrollo)' : ''} → http://localhost:${PUERTO}`);
  if (!calendarioConfigurado()) {
    console.log('Aviso: Google Calendar no está configurado (ver README); las citas se guardan y quedan pendientes de pasar al calendario.');
    return;
  }
  // Al arrancar, pasa al calendario las citas que hayan quedado pendientes o con error.
  const { total, sincronizada, error } = await sincronizarPendientes();
  if (total) console.log(`Google Calendar: ${sincronizada} citas pendientes sincronizadas, ${error} con error.`);
});
