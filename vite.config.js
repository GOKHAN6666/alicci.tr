import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import EnvCompatible from 'vite-plugin-env-compatible';

export default defineConfig({
  plugins: [react(), EnvCompatible()],
  server: {
    host: true,
  },
  base: '/',
  // Vercel Analytics'in harici Next bağımlılıklarını Vite derlemesinden tamamen muaf tutuyoruz
  optimizeDeps: {
    exclude: ['@vercel/analytics']
  }
});
