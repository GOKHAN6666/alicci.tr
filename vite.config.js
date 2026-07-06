import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import EnvCompatible from 'vite-plugin-env-compatible';

export default defineConfig({
  plugins: [react(), EnvCompatible()],
  server: {
    host: true,
  },
  base: '/',
  build: {
    rollupOptions: {
      // Vite'in Next.js paketlerini arayıp hata vermesini tamamen engelliyoruz
      external: ['next/navigation'],
    },
  },
});
