import { useState } from 'react';
import Encabezado from './components/Encabezado.jsx';
import Hero from './components/Hero.jsx';
import Servicios from './components/Servicios.jsx';
import Horarios from './components/Horarios.jsx';
import FormularioCita from './components/FormularioCita.jsx';
import Confirmacion from './components/Confirmacion.jsx';
import Pie from './components/Pie.jsx';
import { useServicios } from './api.js';

export default function App() {
  const servicios = useServicios();
  const [citaConfirmada, setCitaConfirmada] = useState(null);

  return (
    <>
      <Encabezado />
      <main>
        <Hero />
        <Servicios servicios={servicios} />
        <Horarios />
        <FormularioCita servicios={servicios.lista} onReservada={setCitaConfirmada} />
      </main>
      <Pie />
      <Confirmacion cita={citaConfirmada} onCerrar={() => setCitaConfirmada(null)} />
    </>
  );
}
