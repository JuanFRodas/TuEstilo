export default function Hero() {
  return (
    <section id="inicio" className="hero">
      <div className="contenedor hero__fila">
        <div className="hero__texto">
          <h1 className="hero__titulo">
            Tu cabello, tu estilo
            <svg className="hero__destello" viewBox="0 0 60 60" aria-hidden="true">
              <path d="M8 22 L22 4" /><path d="M16 34 L40 20" /><path d="M20 50 L52 50" />
            </svg>
          </h1>
          <p className="hero__subtitulo">Agenda tu cita de forma fácil y rápida</p>
          <a href="#agendar" className="boton boton--grande">
            Reservar ahora
            <svg viewBox="0 0 24 24" className="icono" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>
        <img
          src="/img/hero-mujer.png"
          alt="Ilustración de una mujer con cabello largo y unas tijeras"
          className="hero__imagen"
          width="914"
          height="584"
        />
      </div>
      <svg className="hero__ola" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 60 C 240 120, 520 0, 820 40 S 1260 120, 1440 30 L1440 120 L0 120 Z" />
      </svg>
    </section>
  );
}
