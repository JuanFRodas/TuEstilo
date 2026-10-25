const ENLACES = [
  { id: 'inicio', texto: 'Inicio' },
  { id: 'servicios', texto: 'Servicios' },
  { id: 'horarios', texto: 'Horarios' },
  { id: 'contacto', texto: 'Contacto' },
];

export default function Encabezado() {
  return (
    <header className="encabezado">
      <div className="contenedor encabezado__fila">
        <a href="#inicio" className="marca" aria-label="Tu estilo, Tu cita - inicio">
          <img src="/img/logo.png" alt="" className="marca__logo" width="82" height="85" />
          <span className="marca__texto">Tu estilo, Tu cita</span>
        </a>

        <nav className="menu" aria-label="Navegación principal">
          {ENLACES.map(({ id, texto }) => (
            <a key={id} href={`#${id}`} className={`menu__enlace menu__enlace--${id}`}>{texto}</a>
          ))}
        </nav>

        <a href="#agendar" className="boton boton--chico encabezado__cta">Agendar cita</a>
      </div>
    </header>
  );
}
