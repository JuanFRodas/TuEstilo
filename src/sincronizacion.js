// Une la base de datos con Google Calendar: cada cita agendada debe tener su evento.
import { calendarioConfigurado, crearEventoCita, explicarError } from './calendario.js';
import { citasSinSincronizar, marcarCalendario } from './db.js';
import { ahoraEnColombia } from './horarios.js';

/** Crea el evento de una cita y guarda el resultado. Devuelve 'sincronizada', 'error' o 'pendiente'. */
export async function sincronizarCita(cita) {
  if (!calendarioConfigurado()) {
    console.log(`[Google Calendar sin configurar] La cita ${cita.id} (${cita.fecha} ${cita.hora}:00, ${cita.nombre}) queda pendiente.`);
    return 'pendiente';
  }
  try {
    await crearEventoCita(cita);
    marcarCalendario(cita.id, 'sincronizada');
    return 'sincronizada';
  } catch (error) {
    console.error(`[Google Calendar] No se pudo crear el evento de la cita ${cita.id}: ${explicarError(error)}`);
    marcarCalendario(cita.id, 'error');
    return 'error';
  }
}

/** Pasa al calendario las citas de hoy en adelante que todavía no tienen evento. */
export async function sincronizarPendientes() {
  const citas = citasSinSincronizar(ahoraEnColombia().fecha);
  const resumen = { total: citas.length, sincronizada: 0, error: 0, pendiente: 0 };
  for (const cita of citas) resumen[await sincronizarCita(cita)]++;
  return resumen;
}
