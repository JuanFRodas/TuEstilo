// Crea un evento en Google Calendar por cada cita, usando una cuenta de servicio de Google
// con permiso para "Hacer cambios en eventos" en el calendario del salón (ver README).
import { existsSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';
import { ZONA_HORARIA } from './horarios.js';

const API_CALENDAR = 'https://www.googleapis.com/calendar/v3';
const COLOR_FLAMENCO = '4'; // rosado, como la página

let clienteGoogle;

// Credenciales de la cuenta de servicio: en Vercel, el contenido del JSON en GOOGLE_CREDENCIALES_JSON;
// en local, la ruta del archivo en GOOGLE_CREDENCIALES.
function credenciales() {
  const { GOOGLE_CREDENCIALES_JSON, GOOGLE_CREDENCIALES } = process.env;
  if (GOOGLE_CREDENCIALES_JSON) return { credentials: JSON.parse(GOOGLE_CREDENCIALES_JSON) };
  return { keyFile: GOOGLE_CREDENCIALES };
}

/** true si están el calendario y las credenciales (variable con el JSON o archivo existente). */
export function calendarioConfigurado() {
  const { GOOGLE_CREDENCIALES_JSON, GOOGLE_CREDENCIALES, GOOGLE_CALENDAR_ID } = process.env;
  const hayCredenciales = Boolean(GOOGLE_CREDENCIALES_JSON) || Boolean(GOOGLE_CREDENCIALES && existsSync(GOOGLE_CREDENCIALES));
  return Boolean(GOOGLE_CALENDAR_ID) && hayCredenciales;
}

async function pedirGoogle(ruta, opciones = {}) {
  clienteGoogle ??= new GoogleAuth({
    ...credenciales(),
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
  const calendario = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID);
  const { data } = await clienteGoogle.request({
    url: `${API_CALENDAR}/calendars/${calendario}${ruta}`,
    timeout: 20_000,
    ...opciones,
  });
  return data;
}

/** Explica en español los errores más comunes al configurar el calendario. */
export function explicarError(error) {
  const estado = error.response?.status ?? error.status;
  const detalle = error.response?.data?.error?.message ?? error.message;
  if (/insufficient authentication scopes/i.test(detalle)) return `El servidor pidió un permiso distinto al configurado. (${detalle})`;
  if (estado === 404) return 'No se encontró el calendario: revisa GOOGLE_CALENDAR_ID y que esté compartido con la cuenta de servicio.';
  if (estado === 403) return `La cuenta de servicio no tiene permiso: compártele el calendario con "Hacer cambios en eventos". (${detalle})`;
  if (error instanceof SyntaxError) return 'GOOGLE_CREDENCIALES_JSON no es un JSON válido: pega el contenido completo del archivo de la clave.';
  if (/invalid_grant|invalid_client|account not found/i.test(detalle)) return `Las credenciales no son válidas: descarga de nuevo la clave JSON. (${detalle})`;
  return detalle;
}

/** Comprueba el acceso al calendario y devuelve su nombre. */
export async function probarCalendario() {
  // Se consulta la lista de eventos (y no el calendario en sí) porque el permiso pedido
  // es solo "calendar.events"; la respuesta igual trae el nombre del calendario.
  const { summary } = await pedirGoogle('/events?maxResults=1');
  return summary;
}

const dosDigitos = (n) => String(n).padStart(2, '0');

/**
 * Crea (o confirma que ya existe) el evento de una cita.
 * cita: { eventoId, nombre, edad, telefono, servicio, fecha: 'AAAA-MM-DD', hora: 9 }
 */
export async function crearEventoCita(cita) {
  const evento = {
    id: cita.eventoId, // id propio: si se reintenta, Google no duplica el evento
    summary: `${cita.servicio} - ${cita.nombre}`,
    description: [
      `Clienta: ${cita.nombre}`,
      `Edad: ${cita.edad} años`,
      `Teléfono: ${cita.telefono}`,
      `Servicio: ${cita.servicio}`,
      '',
      'Agendada desde la página Tu estilo, Tu cita.',
    ].join('\n'),
    start: { dateTime: `${cita.fecha}T${dosDigitos(cita.hora)}:00:00`, timeZone: ZONA_HORARIA },
    end: { dateTime: `${cita.fecha}T${dosDigitos(cita.hora + 1)}:00:00`, timeZone: ZONA_HORARIA },
    colorId: COLOR_FLAMENCO,
  };

  try {
    await pedirGoogle('/events', { method: 'POST', data: evento });
  } catch (error) {
    if (error.response?.status === 409) return; // el evento ya se había creado antes
    throw error;
  }
}
