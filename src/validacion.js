// Validación de la solicitud de cita (los mismos criterios que el formulario).
import { esFechaValida } from './horarios.js';

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]+$/;

/** Devuelve { datos } si todo está bien o { errores } con un mensaje por campo. */
export function validarCita(cuerpo = {}) {
  const errores = {};
  const nombre = String(cuerpo.nombre ?? '').trim().replace(/\s+/g, ' ');
  const edad = Number(cuerpo.edad);
  const telefono = String(cuerpo.telefono ?? '').trim();
  const servicio = String(cuerpo.servicio ?? '').trim();
  const fecha = String(cuerpo.fecha ?? '').trim();
  const hora = Number(cuerpo.hora);

  if (nombre.length < 3 || nombre.length > 60 || !SOLO_LETRAS.test(nombre)) {
    errores.nombre = 'Escribe tu nombre completo (solo letras).';
  }
  if (!Number.isInteger(edad) || edad < 12 || edad > 99) {
    errores.edad = 'Escribe tu edad (debes tener 12 años o más).';
  }
  if (!/^\d{10}$/.test(telefono)) {
    errores.telefono = 'Escribe un celular de 10 dígitos, sin espacios.';
  }
  if (!servicio) errores.servicio = 'Elige el servicio que deseas.';
  if (!esFechaValida(fecha)) errores.fecha = 'Selecciona la fecha de tu cita.';
  if (!Number.isInteger(hora)) errores.hora = 'Elige la hora de tu cita.';
  if (cuerpo.consentimiento !== true) {
    errores.consentimiento = 'Debes aceptar el uso de tus datos para gestionar la cita.';
  }

  return Object.keys(errores).length
    ? { errores }
    : { datos: { nombre, edad, telefono, servicio, fecha, hora } };
}
