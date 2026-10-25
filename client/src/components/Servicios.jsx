// Ícono de cada servicio según su nombre en la base de datos.
const ICONOS = {
  Peinados: { src: '/img/icono-peinados.png', ancho: 201, alto: 214 },
  Cortes: { src: '/img/icono-cortes.png', ancho: 164, alto: 206 },
  'Arreglos capilares': { src: '/img/icono-arreglos.png', ancho: 185, alto: 183 },
};

export default function Servicios({ servicios }) {
  const { lista, cargando, error } = servicios;

  return (
    <section id="servicios" className="seccion">
      <div className="contenedor">
        <h2 className="titulo-seccion">Nuestros servicios</h2>

        {cargando && <p className="seccion__mensaje">Cargando servicios…</p>}
        {error && <p className="seccion__mensaje seccion__mensaje--error">{error}</p>}

        <ul className="servicios">
          {lista.map(({ id, nombre, descripcion }) => {
            const icono = ICONOS[nombre];
            return (
              <li key={id} className="tarjeta-servicio">
                <span className="tarjeta-servicio__icono">
                  {icono && <img src={icono.src} alt="" width={icono.ancho} height={icono.alto} />}
                </span>
                <div>
                  <h3 className="tarjeta-servicio__nombre">{nombre}</h3>
                  <p className="tarjeta-servicio__detalle">{descripcion}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
