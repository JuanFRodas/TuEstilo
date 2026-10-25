import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El frontend (React) vive en client/; "npm run build" lo compila en client/dist.
export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
