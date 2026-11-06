import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api is proxied to the local Express server, so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  // Some Cognito libraries expect a Node-style global.
  define: { global: 'globalThis' },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
});
