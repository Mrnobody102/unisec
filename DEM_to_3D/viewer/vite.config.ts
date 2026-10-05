import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173 },
  build: {
    target: 'es2022',
    rollupOptions: { output: { manualChunks(id) {
      const path = id.replace(/\\/g, '/');
      if (/\/node_modules\/(react|react-dom|scheduler)\//.test(path)) return 'react';
      if (path.includes('/node_modules/leaflet/')) return 'leaflet';
      if (/\/node_modules\/(ajv|ajv-formats|fast-uri|fast-deep-equal|json-schema-traverse|require-from-string)\//.test(path)) return 'validation';
    } } }
  },
});
