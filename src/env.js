// Carga las variables del archivo .env antes de que se importe el resto de módulos.
try { process.loadEnvFile(); } catch { /* sin archivo .env: se usan los valores por defecto */ }
