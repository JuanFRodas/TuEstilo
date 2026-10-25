import { useState } from 'react';
import { crearCita, useDisponibilidad } from '../api.js';

const VACIO = { nombre: '', edad: '', telefono: '', servicio: '', fecha: '', hora: '', consentimiento: false };

// Íconos de los campos (trazos dentro de un viewBox de 24×24).
const ICONOS = {
  nombre: <><circle cx="12" cy="8" r="4" className="relleno" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" className="relleno" /></>,
  edad: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  telefono: <path className="relleno" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />,
  servicio: <><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" /><path d="M8 16L19 3M16 16L5 3" /></>,
  fecha: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4M8 14h2M12 14h2M8 17h2M12 17h2" /></>,
  hora: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

function Campo({ id, etiqueta, error, lista = false, children }) {
  return (
    <div className={`campo${lista ? ' campo--lista' : ''}`}>
      <label htmlFor={id} className="solo-lector">{etiqueta}</label>
      <svg viewBox="0 0 24 24" className="campo__icono" aria-hidden="true">{ICONOS[id]}</svg>
      {children}
      <span className="campo__error" id={`error-${id}`}>{error}</span>
    </div>
  );
}

export default function FormularioCita({ servicios, onReservada }) {
  const disponibilidad = useDisponibilidad();
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);
  // Cambiar la "key" del <form> lo vuelve a crear: así los campos vacíos no quedan marcados en rojo tras enviar.
  const [versionFormulario, setVersionFormulario] = useState(0);

  const dias = disponibilidad.dias ?? [];
  // Si la fecha u hora elegida dejó de estar libre (otra persona la reservó), se descarta.
  const diaElegido = dias.find((d) => d.fecha === datos.fecha);
  const fecha = diaElegido ? datos.fecha : '';
  const hora = diaElegido?.horas.some((h) => String(h.hora) === datos.hora) ? datos.hora : '';

  function cambiar(evento) {
    const { name, value, type, checked } = evento.target;
    setDatos((anteriores) => ({
      ...anteriores,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'fecha' && { hora: '' }),
    }));
  }

  // onSubmit solo se ejecuta cuando el navegador ya validó todos los campos.
  async function enviar(evento) {
    evento.preventDefault();
    setErrorEnvio(null);
    setEnviando(true);
    try {
      const cita = await crearCita({ ...datos, fecha, edad: Number(datos.edad), hora: Number(hora) });
      setDatos(VACIO);
      setVersionFormulario((v) => v + 1);
      onReservada(cita);
      disponibilidad.recargar(); // la hora reservada deja de aparecer
    } catch (error) {
      const detalle = error.errores ? ` ${Object.values(error.errores).join(' ')}` : '';
      setErrorEnvio(error.message + detalle);
      if (error.estado === 409) disponibilidad.recargar(); // la hora ya fue tomada
    } finally {
      setEnviando(false);
    }
  }

  const sinFechas = disponibilidad.dias?.length === 0;
  const mensajeEstado = errorEnvio || disponibilidad.error
    || (sinFechas && 'Por ahora no hay horas libres en los próximos 30 días. Escríbenos al correo de contacto.');

  let guiaFecha = 'Fecha';
  if (!disponibilidad.dias) guiaFecha = 'Cargando fechas…';
  else if (sinFechas) guiaFecha = 'No hay fechas disponibles';

  return (
    <section id="agendar" className="seccion seccion--formulario">
      <div className="contenedor">
        <div className="caja-formulario">
          <h2 className="titulo-seccion">Agenda tu cita</h2>
          <p className="caja-formulario__intro">Completa todos los campos y te contactaremos para confirmar tu cita.</p>

          <form key={versionFormulario} className="formulario" onSubmit={enviar}>
            <Campo id="nombre" etiqueta="Nombre completo" error="Escribe tu nombre completo (solo letras).">
              <input
                type="text" id="nombre" name="nombre" value={datos.nombre} onChange={cambiar}
                placeholder="Nombre completo" autoComplete="name" required minLength={3} maxLength={60}
                pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]+" aria-describedby="error-nombre"
              />
            </Campo>

            <Campo id="edad" etiqueta="Edad" error="Escribe tu edad (debes tener 12 años o más).">
              <input
                type="number" id="edad" name="edad" value={datos.edad} onChange={cambiar}
                placeholder="Edad" required min={12} max={99} inputMode="numeric" aria-describedby="error-edad"
              />
            </Campo>

            <Campo id="telefono" etiqueta="Número de contacto" error="Escribe un celular de 10 dígitos, sin espacios.">
              <input
                type="tel" id="telefono" name="telefono" value={datos.telefono} onChange={cambiar}
                placeholder="Número de contacto" autoComplete="tel" required pattern="[0-9]{10}" maxLength={10}
                inputMode="numeric" aria-describedby="error-telefono"
              />
            </Campo>

            <Campo id="servicio" etiqueta="Servicio" error="Elige el servicio que deseas." lista>
              <select id="servicio" name="servicio" value={datos.servicio} onChange={cambiar} required aria-describedby="error-servicio">
                <option value="" disabled hidden>Servicio</option>
                {servicios.map(({ id, nombre }) => <option key={id} value={nombre}>{nombre}</option>)}
              </select>
            </Campo>

            {/* Solo aparecen las fechas que todavía tienen horas libres */}
            <Campo id="fecha" etiqueta="Fecha" error="Selecciona la fecha de tu cita." lista>
              <select id="fecha" name="fecha" value={fecha} onChange={cambiar} required aria-describedby="error-fecha">
                <option value="" disabled hidden>{guiaFecha}</option>
                {dias.map((d) => <option key={d.fecha} value={d.fecha}>{d.etiqueta}</option>)}
              </select>
            </Campo>

            {/* Solo aparecen las horas libres de la fecha elegida */}
            <Campo id="hora" etiqueta="Hora" error="Elige la hora de tu cita." lista>
              <select
                id="hora" name="hora" value={hora} onChange={cambiar} required disabled={!diaElegido}
                aria-describedby="error-hora"
              >
                <option value="" disabled hidden>{diaElegido ? 'Hora' : 'Hora (elige primero la fecha)'}</option>
                {diaElegido?.horas.map((h) => <option key={h.hora} value={h.hora}>{h.etiqueta}</option>)}
              </select>
            </Campo>

            <label className="consentimiento">
              <input type="checkbox" name="consentimiento" checked={datos.consentimiento} onChange={cambiar} required />
              <span>Acepto que mis datos se usen <strong>solo para gestionar mi cita</strong>.</span>
            </label>

            <p className="formulario__aviso" role="alert">Revisa los campos marcados en rojo antes de enviar.</p>
            {mensajeEstado && <p className="formulario__estado" role="alert">{mensajeEstado}</p>}

            <button type="submit" className="boton boton--enviar" disabled={enviando} aria-busy={enviando}>
              {enviando ? 'Enviando…' : 'Enviar solicitud'}
              <svg viewBox="0 0 24 24" className="icono icono--relleno" aria-hidden="true">
                <path d="M2.5 11.2 21 3.5l-6.3 17.6-3.4-7.1zM11.3 14 21 3.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
