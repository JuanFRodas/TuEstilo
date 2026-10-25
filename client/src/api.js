// Comunicación con el backend (Express) y hooks que la usan.
import { useCallback, useEffect, useState } from 'react';

export class ErrorApi extends Error {
  constructor(mensaje, estado, errores) {
    super(mensaje);
    this.estado = estado;     // código HTTP (0 si no hubo conexión)
    this.errores = errores;   // { campo: mensaje } cuando el servidor rechaza datos
  }
}

async function pedir(ruta, opciones) {
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, opciones);
  } catch {
    throw new ErrorApi('No pudimos conectarnos. Revisa tu conexión a internet e intenta de nuevo.', 0);
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ErrorApi(cuerpo.error || 'Ocurrió un error. Intenta de nuevo.', respuesta.status, cuerpo.errores);
  }
  return cuerpo;
}

export function crearCita(datos) {
  return pedir('/citas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

/** Servicios guardados en la base de datos. */
export function useServicios() {
  const [estado, setEstado] = useState({ lista: [], cargando: true, error: null });

  useEffect(() => {
    pedir('/servicios')
      .then((lista) => setEstado({ lista, cargando: false, error: null }))
      .catch((error) => setEstado({ lista: [], cargando: false, error: error.message }));
  }, []);

  return estado;
}

/**
 * Fechas que todavía tienen horas libres:
 * [{ fecha: '2026-10-26', etiqueta: 'Lunes, 26 de octubre', horas: [{ hora: 9, etiqueta: '9:00 a.m.' }] }]
 */
export function useDisponibilidad() {
  const [dias, setDias] = useState(null); // null mientras carga
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    try {
      setDias(await pedir('/disponibilidad'));
      setError(null);
    } catch {
      setDias((anteriores) => anteriores ?? []);
      setError('No pudimos cargar las fechas disponibles. Revisa tu conexión y recarga la página.');
    }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  return { dias, error, recargar };
}
