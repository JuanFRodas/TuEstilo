// Comprueba la conexión con Google Calendar y pasa al calendario las citas pendientes.
// Uso: npm run calendario
import '../src/env.js';
import { existsSync } from 'node:fs';
import { calendarioConfigurado, explicarError, probarCalendario } from '../src/calendario.js';
import { sincronizarPendientes } from '../src/sincronizacion.js';

const { GOOGLE_CREDENCIALES, GOOGLE_CREDENCIALES_JSON, GOOGLE_CALENDAR_ID } = process.env;

if (!calendarioConfigurado()) {
  console.log('Google Calendar todavía no está configurado:');
  if (!GOOGLE_CALENDAR_ID) console.log('  - Falta GOOGLE_CALENDAR_ID en .env');
  if (!GOOGLE_CREDENCIALES && !GOOGLE_CREDENCIALES_JSON) console.log('  - Falta GOOGLE_CREDENCIALES (o GOOGLE_CREDENCIALES_JSON) en .env');
  else if (!GOOGLE_CREDENCIALES_JSON && !existsSync(GOOGLE_CREDENCIALES)) console.log(`  - No existe el archivo de credenciales: ${GOOGLE_CREDENCIALES}`);
  console.log('Sigue los pasos de la sección "Google Calendar" del README.');
  process.exit(1);
}

try {
  const nombre = await probarCalendario();
  console.log(`Conectado al calendario "${nombre}" (${GOOGLE_CALENDAR_ID}).`);
} catch (error) {
  console.error(`No se pudo acceder al calendario: ${explicarError(error)}`);
  process.exit(1);
}

const { total, sincronizada, error } = await sincronizarPendientes();
console.log(total
  ? `Citas pendientes: ${total}. Pasadas al calendario: ${sincronizada}. Con error: ${error}.`
  : 'No hay citas pendientes: todas las citas futuras ya están en el calendario.');
process.exit(error ? 1 : 0);
