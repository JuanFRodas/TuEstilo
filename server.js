// Servidor local de "Tu estilo, Tu cita": la API (src/app.js) más la página de React.
// En Vercel no se usa este archivo: la API corre como función desde api/index.js.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import express from 'express';
import app from './src/app.js';
import { calendarioConfigurado } from './src/calendario.js';
import { sincronizarPendientes } from './src/sincronizacion.js';

const servidor = createServer(app);
const PUERTO = Number(process.env.PORT) || 3000;
const DESARROLLO = process.argv.includes('--dev');

// Frontend en React: en desarrollo lo sirve Vite (con recarga en vivo);
// en producción se sirve la versión compilada de client/dist ("npm run build").
if (DESARROLLO) {
  const { createServer: crearVite } = await import('vite');
  const vite = await crearVite({ server: { middlewareMode: true, hmr: { server: servidor } }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  if (!existsSync('client/dist/index.html')) {
    console.warn('Aviso: no existe client/dist. Ejecuta "npm run build" o usa "npm run dev".');
  }
  app.use(express.static('client/dist'));
}

servidor.listen(PUERTO, async () => {
  console.log(`Tu estilo, Tu cita${DESARROLLO ? ' (desarrollo)' : ''} → http://localhost:${PUERTO}`);
  console.log(`Base de datos: ${process.env.TURSO_DATABASE_URL ? 'Turso' : `archivo local ${process.env.DB_RUTA || 'data/tuestilo.db'}`}`);
  if (!calendarioConfigurado()) {
    console.log('Aviso: Google Calendar no está configurado (ver README); las citas se guardan y quedan pendientes de pasar al calendario.');
    return;
  }
  // Al arrancar, pasa al calendario las citas que hayan quedado pendientes o con error.
  try {
    const { total, sincronizada, error } = await sincronizarPendientes();
    if (total) console.log(`Google Calendar: ${sincronizada} citas pendientes sincronizadas, ${error} con error.`);
  } catch (error) {
    console.error('No se pudieron revisar las citas pendientes:', error.message);
  }
});
