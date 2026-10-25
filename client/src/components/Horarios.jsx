const HORARIOS = [
  { dia: 'Lunes a viernes', hora: '9:00 a.m. – 7:00 p.m.' },
  { dia: 'Sábados', hora: '8:00 a.m. – 5:00 p.m.' },
  { dia: 'Domingos y festivos', hora: 'Cerrado', cerrado: true },
];

const IconoCalendario = () => (
  <svg viewBox="0 0 24 24" className="icono horario__icono" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

const IconoCerrado = () => (
  <svg viewBox="0 0 24 24" className="icono horario__icono" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" />
  </svg>
);

export default function Horarios() {
  return (
    <section id="horarios" className="seccion seccion--compacta">
      <div className="contenedor">
        <h2 className="titulo-seccion">Horarios de atención</h2>

        <div className="horarios">
          {HORARIOS.map(({ dia, hora, cerrado }) => (
            <div key={dia} className={`horario${cerrado ? ' horario--cerrado' : ''}`}>
              {cerrado ? <IconoCerrado /> : <IconoCalendario />}
              <h3 className="horario__dia">{dia}</h3>
              <p className="horario__hora">{hora}</p>
            </div>
          ))}
        </div>
        <p className="horarios__nota">
          Las citas se asignan cada hora; la última empieza una hora antes del cierre y a la 1:00 p.m. no agendamos.
          En el formulario solo verás las fechas y horas que siguen libres.
        </p>
      </div>
    </section>
  );
}
