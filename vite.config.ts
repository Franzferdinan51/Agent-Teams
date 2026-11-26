import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The Chamber talks to council-api-server.cjs (:3001) for the councilor
// registry, mode list and session registration. Both `vite dev` and
// `vite preview` proxy /api there so the built app works same-origin.
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  build: {
    outDir: 'council-dist',
    emptyOutDir: false,
  },
});
