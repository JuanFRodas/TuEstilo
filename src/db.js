// Base de datos SQLite: servicios, clientas y citas.
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';

const RUTA_DB = process.env.DB_RUTA || 'data/tuestilo.db';
mkdirSync(dirname(RUTA_DB), { recursive: true });

const db = new Database(RUTA_DB);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS servicios (
    id          INTEGER PRIMARY KEY,
    nombre      TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clientas (
    id        INTEGER PRIMARY KEY,
    nombre    TEXT    NOT NULL,
    edad      INTEGER NOT NULL CHECK (edad BETWEEN 12 AND 99),
    telefono  TEXT    NOT NULL UNIQUE,
    creada_en TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS citas (
    id              INTEGER PRIMARY KEY,
    clienta_id      INTEGER NOT NULL REFERENCES clientas(id),
    servicio_id     INTEGER NOT NULL REFERENCES servicios(id),
    fecha           TEXT    NOT NULL,                          -- AAAA-MM-DD
    hora            INTEGER NOT NULL CHECK (hora BETWEEN 0 AND 23),
    estado          TEXT    NOT NULL DEFAULT 'agendada'
                    CHECK (estado IN ('agendada', 'cancelada', 'atendida')),
    calendario_evento_id TEXT,                                 -- id del evento en Google Calendar
    calendario_estado    TEXT NOT NULL DEFAULT 'pendiente',    -- pendiente | sincronizada | error
    creada_en       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Un mismo cupo (fecha + hora) no puede tener dos citas activas.
  -- Si una cita se cancela, el cupo vuelve a quedar libre.
  CREATE UNIQUE INDEX IF NOT EXISTS cupo_unico
    ON citas (fecha, hora) WHERE estado <> 'cancelada';
`);

// Id que tendrá el evento en Google Calendar (solo letras a-v y números, como exige Google).
const nuevoEventoId = () => `cita${randomUUID().replaceAll('-', '')}`;

// Bases creadas con versiones anteriores (aviso por WhatsApp o Telegram): se pasan al calendario.
const columnasCitas = db.prepare('PRAGMA table_info(citas)').all().map((c) => c.name);
for (const anterior of ['whatsapp_estado', 'aviso_estado']) {
  if (columnasCitas.includes(anterior)) {
    db.exec(`ALTER TABLE citas RENAME COLUMN ${anterior} TO calendario_estado;
             UPDATE citas SET calendario_estado = 'pendiente';`);
  }
}
if (!columnasCitas.includes('calendario_evento_id')) {
  db.exec('ALTER TABLE citas ADD COLUMN calendario_evento_id TEXT');
}
const asignarEventoId = db.prepare('UPDATE citas SET calendario_evento_id = ? WHERE id = ?');
for (const { id } of db.prepare('SELECT id FROM citas WHERE calendario_evento_id IS NULL').all()) {
  asignarEventoId.run(nuevoEventoId(), id);
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS evento_unico ON citas (calendario_evento_id)');

const sembrarServicio = db.prepare('INSERT OR IGNORE INTO servicios (nombre, descripcion) VALUES (?, ?)');
sembrarServicio.run('Peinados', 'Recogidos, trenzas y ondas para el día a día o eventos especiales.');
sembrarServicio.run('Cortes', 'Cortes en capas, flequillos, despuntes y cambios de look.');
sembrarServicio.run('Arreglos capilares', 'Cepillados, planchados, hidratación y tratamientos.');

export class CupoOcupadoError extends Error {}

const consultas = {
  servicios: db.prepare('SELECT id, nombre, descripcion FROM servicios ORDER BY id'),
  servicioPorNombre: db.prepare('SELECT id, nombre FROM servicios WHERE nombre = ?'),
  ocupadasEntre: db.prepare(`
    SELECT fecha, hora FROM citas
    WHERE fecha BETWEEN ? AND ? AND estado <> 'cancelada'`),
  guardarClienta: db.prepare(`
    INSERT INTO clientas (nombre, edad, telefono) VALUES (@nombre, @edad, @telefono)
    ON CONFLICT (telefono) DO UPDATE SET nombre = excluded.nombre, edad = excluded.edad
    RETURNING id`),
  crearCita: db.prepare(`
    INSERT INTO citas (clienta_id, servicio_id, fecha, hora, calendario_evento_id)
    VALUES (@clientaId, @servicioId, @fecha, @hora, @eventoId)`),
  estadoCalendario: db.prepare('UPDATE citas SET calendario_estado = ? WHERE id = ?'),
  sinSincronizar: db.prepare(`
    SELECT c.id, c.calendario_evento_id AS eventoId, cl.nombre, cl.edad, cl.telefono,
           s.nombre AS servicio, c.fecha, c.hora
    FROM citas c
    JOIN clientas cl ON cl.id = c.clienta_id
    JOIN servicios s ON s.id = c.servicio_id
    WHERE c.estado = 'agendada' AND c.calendario_estado <> 'sincronizada' AND c.fecha >= ?
    ORDER BY c.fecha, c.hora`),
};

export function listarServicios() {
  return consultas.servicios.all();
}

export function buscarServicio(nombre) {
  return consultas.servicioPorNombre.get(nombre);
}

/** Devuelve un Map fecha -> Set de horas ya reservadas entre dos fechas (inclusive). */
export function horasOcupadasEntre(desde, hasta) {
  const ocupadas = new Map();
  for (const { fecha, hora } of consultas.ocupadasEntre.all(desde, hasta)) {
    if (!ocupadas.has(fecha)) ocupadas.set(fecha, new Set());
    ocupadas.get(fecha).add(hora);
  }
  return ocupadas;
}

const crearCitaTx = db.transaction(({ nombre, edad, telefono, servicioId, fecha, hora }) => {
  const { id: clientaId } = consultas.guardarClienta.get({ nombre, edad, telefono });
  const eventoId = nuevoEventoId();
  const { lastInsertRowid } = consultas.crearCita.run({ clientaId, servicioId, fecha, hora, eventoId });
  return { id: Number(lastInsertRowid), eventoId };
});

/**
 * Guarda la clienta y la cita; devuelve { id, eventoId }.
 * Lanza CupoOcupadoError si alguien tomó el cupo primero.
 */
export function crearCita(datos) {
  try {
    return crearCitaTx(datos);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new CupoOcupadoError();
    throw error;
  }
}

export function marcarCalendario(citaId, estado) {
  consultas.estadoCalendario.run(estado, citaId);
}

/** Citas agendadas desde una fecha que todavía no tienen evento en Google Calendar. */
export function citasSinSincronizar(desde) {
  return consultas.sinSincronizar.all(desde);
}
