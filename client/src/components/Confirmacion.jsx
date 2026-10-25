import { useEffect, useRef } from 'react';

// Ventana de "¡Solicitud enviada!". Usa <dialog> para que el foco y la tecla Esc funcionen solos.
export default function Confirmacion({ cita, onCerrar }) {
  const dialogo = useRef(null);

  useEffect(() => {
    const d = dialogo.current;
    if (cita && !d.open) d.showModal();
    if (!cita && d.open) d.close();
  }, [cita]);

  return (
    <dialog
      ref={dialogo}
      className="confirmacion"
      aria-labelledby="confirmacion-titulo"
      onClose={onCerrar}
      // Clic en el fondo oscuro: cerrar
      onClick={(evento) => evento.target === dialogo.current && dialogo.current.close()}
    >
      {cita && (
        <div className="confirmacion__caja">
          <span className="confirmacion__check" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="icono"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <h2 id="confirmacion-titulo" className="confirmacion__titulo">¡Solicitud enviada!</h2>
          <p>
            Recibimos tu solicitud de cita, {cita.nombre.split(' ')[0]}. Te contactaremos al número que
            registraste para confirmar la fecha y la hora.
          </p>
          <dl className="confirmacion__detalle">
            <div><dt>Servicio</dt><dd>{cita.servicio}</dd></div>
            <div><dt>Fecha</dt><dd>{cita.fecha}</dd></div>
            <div><dt>Hora</dt><dd>{cita.hora}</dd></div>
          </dl>
          <button type="button" className="boton boton--chico" onClick={() => dialogo.current.close()} autoFocus>
            Entendido
          </button>
        </div>
      )}
    </dialog>
  );
}
