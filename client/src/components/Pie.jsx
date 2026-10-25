const REDES = [
  {
    nombre: 'Instagram',
    url: 'https://www.instagram.com/',
    icono: (
      <svg viewBox="0 0 24 24" className="icono" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" />
        <circle cx="16.8" cy="7.2" r=".6" className="relleno" />
      </svg>
    ),
  },
  {
    nombre: 'Facebook',
    url: 'https://www.facebook.com/',
    icono: (
      <svg viewBox="0 0 24 24" className="icono icono--relleno" aria-hidden="true">
        <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z" />
      </svg>
    ),
  },
  {
    nombre: 'TikTok',
    url: 'https://www.tiktok.com/',
    icono: (
      <svg viewBox="0 0 24 24" className="icono icono--relleno" aria-hidden="true">
        <path d="M15.6 3c.4 2.2 1.8 3.7 4 3.9v3c-1.5 0-2.8-.4-4-1.2v6.2a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.1a2.6 2.6 0 1 0 1.7 2.4V3z" />
      </svg>
    ),
  },
];

export default function Pie() {
  return (
    <footer id="contacto" className="pie">
      <div className="contenedor pie__fila">
        <h2 className="pie__titulo">Contacto</h2>

        <a href="mailto:contacto@tuestilotucita.com" className="pie__dato">
          <svg viewBox="0 0 24 24" className="icono" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3 6l9 7 9-7" />
          </svg>
          Correo: contacto@tuestilotucita.com
        </a>

        <p className="pie__lema">
          <svg viewBox="0 0 24 24" className="icono" aria-hidden="true">
            <path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.2 4.5 7.3 4.5c2 0 3.4 1.1 4.7 2.8 1.3-1.7 2.7-2.8 4.7-2.8 3.1 0 5.3 2.9 4.3 6.2-1.5 4.7-9 9.3-9 9.3z" />
          </svg>
          Belleza y cuidado en un solo lugar
        </p>

        <ul className="redes" aria-label="Redes sociales">
          {REDES.map(({ nombre, url, icono }) => (
            <li key={nombre}>
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={nombre}>{icono}</a>
            </li>
          ))}
        </ul>
      </div>
      <p className="pie__legal">
        Tus datos se usan únicamente para gestionar tu solicitud de cita. © {new Date().getFullYear()} Tu estilo, Tu cita.
      </p>
    </footer>
  );
}
