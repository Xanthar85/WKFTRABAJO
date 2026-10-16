// vite.config.ts
// WKF — Configuración de Vite.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    hmr: {
      protocol: 'wss',
      host: 'ais-dev-tv6yemod7didwa36pmidll-168841142908.europe-west2.run.app',
      clientPort: 443,
    },
    allowedHosts: [
      'ais-dev-tv6yemod7didwa36pmidll-168841142908.europe-west2.run.app',
      '.run.app',
      'localhost',
    ],
  },
});