# Tu estilo, Tu cita

Landing page para agendar citas de peluquería (peinados, cortes y arreglos capilares).
Frontend en **React** (con Vite); backend en **Express** con base de datos **SQLite / libSQL**
(un archivo local para desarrollar y [Turso](https://turso.tech) en producción). Se publica en **Vercel**.
Cada cita nueva se guarda en la base de datos y se crea como evento en **Google Calendar**.

## Cómo ejecutarlo

Requisitos: [Node.js](https://nodejs.org) 22 o superior.

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```

**Para desarrollar** (React con recarga en vivo y la API en el mismo puerto):

```bash
npm run dev
```

**Para producción** (compila React y lo sirve Express):

```bash
npm run build
npm start
```

En ambos casos se abre <http://localhost:3000>.
En local, si `TURSO_DATABASE_URL` está vacío, la base de datos es el archivo `data/tuestilo.db` (se crea sola).
Las tablas se crean solas la primera vez, tanto en el archivo como en Turso.

## Publicar en Vercel

En Vercel la página (React) se publica como sitio estático y la API (Express) corre como una función
(`api/index.js`). `vercel.json` ya tiene la configuración. Como Vercel no guarda archivos, la base de datos
va en **Turso**, una base de datos en la nube compatible con SQLite (tiene plan gratis).

1. **Crear la base en Turso.** Entrar a <https://app.turso.tech> (se puede con la cuenta de GitHub) →
   **Create Database** → nombre `tuestilo`, región cercana a Vercel (por ejemplo AWS us-east-1).
2. **Copiar la URL y crear un token.** En la base de datos → **Connect**: copiar la URL
   (empieza por `libsql://...turso.io`) y crear un token con permiso de lectura y escritura.
3. **Variables de entorno en Vercel.** En el proyecto de Vercel → **Settings → Environment Variables**, agregar:

   | Variable | Valor |
   |---|---|
   | `TURSO_DATABASE_URL` | la URL `libsql://...` de Turso |
   | `TURSO_AUTH_TOKEN` | el token de Turso |
   | `GOOGLE_CALENDAR_ID` | el id del calendario (el correo de Gmail para el calendario principal) |
   | `GOOGLE_CREDENCIALES_JSON` | el **contenido completo** del archivo `credenciales/google-calendar.json` (abrirlo, copiar todo y pegarlo) |

4. **Volver a publicar.** En **Deployments** → el último → **Redeploy** (o subir un cambio a GitHub).

Las tablas se crean solas en Turso con la primera visita. Para usar esa misma base desde tu computador
(por ejemplo para correr `npm run calendario` sobre las citas reales), pon `TURSO_DATABASE_URL` y
`TURSO_AUTH_TOKEN` también en tu `.env`.

## Google Calendar

Cada cita que se guarda en la base de datos se crea también como evento de 1 hora en Google Calendar
(título “Servicio - Nombre”, color rosado, con edad, teléfono y servicio en la descripción).
El servidor escribe en el calendario con una **cuenta de servicio** de Google, así no hay que iniciar sesión.
Pasos (una sola vez):

1. **Crear un proyecto en Google Cloud.** Entrar a <https://console.cloud.google.com> con la cuenta de Google
   del calendario → selector de proyectos → **Proyecto nuevo** (por ejemplo “Tu estilo Tu cita”). No necesita facturación.
2. **Activar la API.** Menú → **APIs y servicios → Biblioteca** → buscar **Google Calendar API** → **Habilitar**.
3. **Crear la cuenta de servicio.** Menú → **IAM y administración → Cuentas de servicio** →
   **Crear cuenta de servicio** (nombre, por ejemplo, `citas-web`; no hace falta darle roles) → **Listo**.
4. **Descargar la clave.** Abrir la cuenta de servicio → pestaña **Claves** → **Agregar clave → Crear clave nueva → JSON**.
   Se descarga un archivo `.json`: guardarlo en el proyecto como `credenciales/google-calendar.json`.
   Ese archivo es secreto: la carpeta `credenciales/` no se sube a Git.
5. **Compartir el calendario con la cuenta de servicio.** En <https://calendar.google.com> → ⚙️ **Configuración** →
   en “Configuración de mis calendarios” elegir el calendario → **Compartir con personas o grupos específicos** →
   **Agregar personas** → pegar el correo de la cuenta de servicio (termina en `.iam.gserviceaccount.com`;
   también aparece como `client_email` dentro del JSON) → permiso **Hacer cambios en eventos** → **Enviar**.
6. **Poner el id del calendario en `.env`.** En la misma página de configuración, sección **Integrar el calendario** →
   **ID de calendario**. Para el calendario principal es el mismo correo de Gmail:
   ```
   GOOGLE_CREDENCIALES=credenciales/google-calendar.json
   GOOGLE_CALENDAR_ID=tucorreo@gmail.com
   ```
7. **Probar la conexión:**
   ```bash
   npm run calendario
   ```
   Muestra el nombre del calendario si todo está bien y pasa al calendario las citas que estaban pendientes.
   Si algo falla, explica qué revisar (calendario no compartido, credenciales inválidas, etc.).

Si Google Calendar no está configurado o falla, **la cita se guarda igual** y queda marcada en la columna
`calendario_estado` como `pendiente` o `error`. Esas citas se pasan al calendario al ejecutar
`npm run calendario` o, en local, solas la próxima vez que arranca el servidor. Cada evento tiene un id propio (`calendario_evento_id`),
así que reintentar nunca crea eventos duplicados.

## Cómo funciona la disponibilidad

- Solo se puede agendar en los próximos 30 días.
- Lunes a viernes: citas de 9:00 a.m. a 6:00 p.m. Sábados: de 8:00 a.m. a 4:00 p.m.
  No hay citas a la 1:00 p.m. Domingos y festivos de Colombia (calculados automáticamente) cerrado.
- Cuando se reserva una hora, deja de aparecer en el formulario. Si un día se llena, la fecha desaparece.
- La base de datos tiene un índice único sobre `(fecha, hora)`, así que aunque dos personas
  envíen la misma hora al mismo tiempo, solo una queda guardada; la otra recibe un aviso para elegir otra.
- Si una cita se marca como `cancelada`, ese cupo vuelve a quedar libre.

Los horarios se cambian en `src/horarios.js` (`HORAS_POR_DIA`).

## Estructura

```
src/app.js                API en Express (rutas /api/*)
server.js                 Servidor local: la API más el frontend (Vite en desarrollo, client/dist en producción)
api/index.js              Función de Vercel: expone la API de src/app.js
vercel.json               Configuración de Vercel (compilar React, publicar client/dist, enviar /api/* a la función)
src/db.js                 Base de datos libSQL: archivo local o Turso (tablas, consultas)
src/horarios.js           Horarios, festivos y horas libres
src/validacion.js         Validación de los datos de la cita
src/calendario.js         Conexión con Google Calendar (crear eventos)
src/sincronizacion.js     Pasa al calendario las citas de la base de datos
scripts/calendario.js     "npm run calendario": prueba la conexión y sincroniza pendientes
credenciales/             Clave JSON de la cuenta de servicio (no se sube a Git)
vite.config.js            Configuración de Vite (el frontend vive en client/)
client/index.html         Página base de React
client/public/img/        Logo, ilustración e íconos
client/src/main.jsx       Punto de entrada de React
client/src/App.jsx        Arma la página con los componentes
client/src/api.js         Llamadas a la API y hooks (useServicios, useDisponibilidad)
client/src/estilos.css    Estilos de toda la página
client/src/components/    Encabezado, Hero, Servicios, Horarios, FormularioCita, Confirmacion, Pie
data/                     Archivo de la base de datos (no se sube a Git)
```

Los servicios que se muestran en la página y en el formulario vienen de la base de datos (`/api/servicios`).

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/servicios` | Lista de servicios |
| GET | `/api/disponibilidad` | Fechas con horas libres y sus horas |
| GET | `/api/disponibilidad/:fecha` | Horas libres de una fecha (`AAAA-MM-DD`) |
| POST | `/api/citas` | Crea una cita. Cuerpo JSON: `nombre, edad, telefono, servicio, fecha, hora, consentimiento` |

Respuestas de `POST /api/citas`: `201` cita creada, `400` datos inválidos (con el error de cada campo),
`409` la hora ya no está disponible, `429` demasiadas solicitudes seguidas desde el mismo equipo.

## Modelo de datos

```
servicios (id, nombre, descripcion)
clientas  (id, nombre, edad, telefono UNIQUE, creada_en)
citas     (id, clienta_id → clientas, servicio_id → servicios, fecha, hora,
           estado [agendada | cancelada | atendida], calendario_evento_id, calendario_estado [pendiente | sincronizada | error], creada_en)
           UNIQUE (fecha, hora) para citas no canceladas
```
