// Reglas de horario del salón: días de atención, horas de cita y festivos de Colombia.
// Todas las fechas se manejan como texto 'AAAA-MM-DD' en hora de Colombia.

export const ZONA_HORARIA = 'America/Bogota';
export const DIAS_PARA_AGENDAR = 30;

// Horas en que puede empezar una cita, por día de la semana (0 = domingo).
// Lunes a viernes atienden de 9:00 a 19:00 y los sábados de 8:00 a 17:00;
// la última cita empieza una hora antes del cierre y a la 1:00 p.m. no hay citas.
const HORAS_POR_DIA = {
  0: [],
  1: [9, 10, 11, 12, 14, 15, 16, 17, 18],
  2: [9, 10, 11, 12, 14, 15, 16, 17, 18],
  3: [9, 10, 11, 12, 14, 15, 16, 17, 18],
  4: [9, 10, 11, 12, 14, 15, 16, 17, 18],
  5: [9, 10, 11, 12, 14, 15, 16, 17, 18],
  6: [8, 9, 10, 11, 12, 14, 15, 16],
};

const aTexto = (d) => d.toISOString().slice(0, 10);
const aFecha = (texto) => new Date(`${texto}T00:00:00Z`);
const sumarDias = (d, n) => new Date(d.getTime() + n * 86_400_000);

/** Fecha y hora actuales en Colombia. */
export function ahoraEnColombia() {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hora: Number(partes.hour) };
}

// Domingo de Pascua (algoritmo de Butcher / Meeus).
function domingoDePascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

// Ley Emiliani: el festivo se pasa al lunes siguiente si no cae en lunes.
const alLunes = (d) => sumarDias(d, (8 - d.getUTCDay()) % 7);

const festivosCache = new Map();

/** Conjunto de festivos de Colombia para un año. */
export function festivosColombia(anio) {
  if (festivosCache.has(anio)) return festivosCache.get(anio);
  const fijo = (mes, dia) => new Date(Date.UTC(anio, mes - 1, dia));
  const pascua = domingoDePascua(anio);
  const festivos = [
    fijo(1, 1), fijo(5, 1), fijo(7, 20), fijo(8, 7), fijo(12, 8), fijo(12, 25),
    ...[[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]].map(([m, d]) => alLunes(fijo(m, d))),
    sumarDias(pascua, -3), sumarDias(pascua, -2),           // Jueves y Viernes Santo
    sumarDias(pascua, 43), sumarDias(pascua, 64), sumarDias(pascua, 71), // Ascensión, Corpus, Sagrado Corazón
  ];
  const conjunto = new Set(festivos.map(aTexto));
  festivosCache.set(anio, conjunto);
  return conjunto;
}

export function esFechaValida(texto) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && aTexto(aFecha(texto)) === texto;
}

/** Horas de atención de un día, sin contar reservas (vacío si es domingo o festivo). */
export function horasDeAtencion(fecha) {
  const d = aFecha(fecha);
  if (festivosColombia(d.getUTCFullYear()).has(fecha)) return [];
  return HORAS_POR_DIA[d.getUTCDay()];
}

/** Fechas desde hoy hasta el límite para agendar. */
export function rangoAgendable() {
  const { fecha: hoy } = ahoraEnColombia();
  const fechas = [];
  for (let i = 0; i < DIAS_PARA_AGENDAR; i++) fechas.push(aTexto(sumarDias(aFecha(hoy), i)));
  return fechas;
}

/** Horas libres de una fecha: de atención, no reservadas y, si es hoy, que no hayan pasado. */
export function horasLibres(fecha, ocupadas = new Set()) {
  const ahora = ahoraEnColombia();
  return horasDeAtencion(fecha).filter(
    (h) => !ocupadas.has(h) && (fecha !== ahora.fecha || h > ahora.hora),
  );
}

export function etiquetaHora(h) {
  const sufijo = h < 12 ? 'a.m.' : 'p.m.';
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${sufijo}`;
}

export function etiquetaFecha(fecha) {
  const texto = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  }).format(aFecha(fecha));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
