// alicci/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Bu satırı ekleyin veya güncelleyin
  },
  server: {
    fs: {
      strict: false,
    },
  },
});