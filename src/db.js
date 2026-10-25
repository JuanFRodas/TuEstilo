// Base de datos (SQLite / libSQL): servicios, clientas y citas.
// En producción (Vercel) se usa una base de Turso; en local, un archivo en data/.
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';

async function crearConexion() {
  const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, DB_RUTA, VERCEL } = process.env;
  if (TURSO_DATABASE_URL) {
    // Turso por HTTP: versión "web" del cliente, sin módulos nativos (ideal para Vercel).
    const { createClient } = await import('@libsql/client/web');
    return createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });
  }
  if (VERCEL) throw new Error('Falta TURSO_DATABASE_URL en las variables de entorno de Vercel.');

  const ruta = DB_RUTA || 'data/tuestilo.db';
  mkdirSync(dirname(ruta), { recursive: true });
  const { createClient } = await import('@libsql/client');
  return createClient({ url: `file:${ruta}` });
}

const filas = (resultado) => resultado.rows.map((fila) => ({ ...fila }));

// Id que tendrá el evento en Google Calendar (solo letras a-v y números, como exige Google).
const nuevoEventoId = () => `cita${randomUUID().replaceAll('-', '')}`;

const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS servicios (
     id          INTEGER PRIMARY KEY,
     nombre      TEXT NOT NULL UNIQUE,
     descripcion TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS clientas (
     id        INTEGER PRIMARY KEY,
     nombre    TEXT    NOT NULL,
     edad      INTEGER NOT NULL CHECK (edad BETWEEN 12 AND 99),
     telefono  TEXT    NOT NULL UNIQUE,
     creada_en TEXT    NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS citas (
     id                   INTEGER PRIMARY KEY,
     clienta_id           INTEGER NOT NULL REFERENCES clientas(id),
     servicio_id          INTEGER NOT NULL REFERENCES servicios(id),
     fecha                TEXT    NOT NULL,                       -- AAAA-MM-DD
     hora                 INTEGER NOT NULL CHECK (hora BETWEEN 0 AND 23),
     estado               TEXT    NOT NULL DEFAULT 'agendada'
                          CHECK (estado IN ('agendada', 'cancelada', 'atendida')),
     calendario_evento_id TEXT,                                   -- id del evento en Google Calendar
     calendario_estado    TEXT    NOT NULL DEFAULT 'pendiente',   -- pendiente | sincronizada | error
     creada_en            TEXT    NOT NULL DEFAULT (datetime('now'))
   )`,
  // Un mismo cupo (fecha + hora) no puede tener dos citas activas.
  // Si una cita se cancela, el cupo vuelve a quedar libre.
  `CREATE UNIQUE INDEX IF NOT EXISTS cupo_unico ON citas (fecha, hora) WHERE estado <> 'cancelada'`,
];

const SERVICIOS = [
  ['Peinados', 'Recogidos, trenzas y ondas para el día a día o eventos especiales.'],
  ['Cortes', 'Cortes en capas, flequillos, despuntes y cambios de look.'],
  ['Arreglos capilares', 'Cepillados, planchados, hidratación y tratamientos.'],
];

async function prepararBase() {
  const db = await crearConexion();
  await db.batch(ESQUEMA, 'write');

  // Bases creadas con versiones anteriores (aviso por WhatsApp o Telegram): se pasan al calendario.
  const columnas = filas(await db.execute('PRAGMA table_info(citas)')).map((c) => c.name);
  for (const anterior of ['whatsapp_estado', 'aviso_estado']) {
    if (columnas.includes(anterior)) {
      await db.batch([
        `ALTER TABLE citas RENAME COLUMN ${anterior} TO calendario_estado`,
        `UPDATE citas SET calendario_estado = 'pendiente'`,
      ], 'write');
    }
  }
  if (!columnas.includes('calendario_evento_id')) {
    await db.execute('ALTER TABLE citas ADD COLUMN calendario_evento_id TEXT');
  }
  const sinEvento = filas(await db.execute('SELECT id FROM citas WHERE calendario_evento_id IS NULL'));

  await db.batch([
    ...sinEvento.map(({ id }) => ({
      sql: 'UPDATE citas SET calendario_evento_id = ? WHERE id = ?', args: [nuevoEventoId(), id],
    })),
    'CREATE UNIQUE INDEX IF NOT EXISTS evento_unico ON citas (calendario_evento_id)',
    ...SERVICIOS.map((args) => ({ sql: 'INSERT OR IGNORE INTO servicios (nombre, descripcion) VALUES (?, ?)', args })),
  ], 'write');
  return db;
}

// La conexión y las tablas se preparan una vez por proceso (o por instancia de Vercel),
// en la primera consulta. lista() devuelve la conexión ya preparada.
let preparada = null;
function lista() {
  preparada ??= prepararBase().catch((error) => {
    preparada = null; // si falló (por ejemplo, sin conexión), se reintenta en la siguiente consulta
    throw error;
  });
  return preparada;
}

export class CupoOcupadoError extends Error {}

export async function listarServicios() {
  const db = await lista();
  return filas(await db.execute('SELECT id, nombre, descripcion FROM servicios ORDER BY id'));
}

export async function buscarServicio(nombre) {
  const db = await lista();
  return filas(await db.execute({ sql: 'SELECT id, nombre FROM servicios WHERE nombre = ?', args: [nombre] }))[0];
}

/** Devuelve un Map fecha -> Set de horas ya reservadas entre dos fechas (inclusive). */
export async function horasOcupadasEntre(desde, hasta) {
  const db = await lista();
  const reservadas = await db.execute({
    sql: `SELECT fecha, hora FROM citas WHERE fecha BETWEEN ? AND ? AND estado <> 'cancelada'`,
    args: [desde, hasta],
  });
  const ocupadas = new Map();
  for (const { fecha, hora } of filas(reservadas)) {
    if (!ocupadas.has(fecha)) ocupadas.set(fecha, new Set());
    ocupadas.get(fecha).add(hora);
  }
  return ocupadas;
}

/**
 * Guarda la clienta y la cita en una sola transacción; devuelve { id, eventoId }.
 * Lanza CupoOcupadoError si alguien tomó el cupo primero.
 */
export async function crearCita({ nombre, edad, telefono, servicioId, fecha, hora }) {
  const db = await lista();
  const eventoId = nuevoEventoId();
  try {
    const [, cita] = await db.batch([
      {
        sql: `INSERT INTO clientas (nombre, edad, telefono) VALUES (?, ?, ?)
              ON CONFLICT (telefono) DO UPDATE SET nombre = excluded.nombre, edad = excluded.edad`,
        args: [nombre, edad, telefono],
      },
      {
        sql: `INSERT INTO citas (clienta_id, servicio_id, fecha, hora, calendario_evento_id)
              VALUES ((SELECT id FROM clientas WHERE telefono = ?), ?, ?, ?, ?)
              RETURNING id`,
        args: [telefono, servicioId, fecha, hora, eventoId],
      },
    ], 'write');
    return { id: Number(cita.rows[0].id), eventoId };
  } catch (error) {
    // 2067 = SQLITE_CONSTRAINT_UNIQUE (el índice cupo_unico)
    if (error.rawCode === 2067 || /UNIQUE constraint failed/i.test(error.message)) throw new CupoOcupadoError();
    throw error;
  }
}

export async function marcarCalendario(citaId, estado) {
  const db = await lista();
  await db.execute({ sql: 'UPDATE citas SET calendario_estado = ? WHERE id = ?', args: [estado, citaId] });
}

/** Citas agendadas desde una fecha que todavía no tienen evento en Google Calendar. */
export async function citasSinSincronizar(desde) {
  const db = await lista();
  return filas(await db.execute({
    sql: `SELECT c.id, c.calendario_evento_id AS eventoId, cl.nombre, cl.edad, cl.telefono,
                 s.nombre AS servicio, c.fecha, c.hora
          FROM citas c
          JOIN clientas cl ON cl.id = c.clienta_id
          JOIN servicios s ON s.id = c.servicio_id
          WHERE c.estado = 'agendada' AND c.calendario_estado <> 'sincronizada' AND c.fecha >= ?
          ORDER BY c.fecha, c.hora`,
    args: [desde],
  }));
}
