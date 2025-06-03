// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    fs: {
      strict: false,
    },
  },
  define: {
    // Supabase değişkenleri
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_APP_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_APP_SUPABASE_ANON_KEY),

    // EmailJS değişkenleri (Bunları eklediğinizden emin olun!)
    'import.meta.env.VITE_EMAILJS_SERVICE_ID': JSON.stringify(process.env.VITE_EMAILJS_SERVICE_ID),
    'import.meta.env.VITE_EMAILJS_TEMPLATE_ID': JSON.stringify(process.env.VITE_EMAILJS_TEMPLATE_ID),
    'import.meta.env.VITE_EMAILJS_PUBLIC_KEY': JSON.stringify(process.env.VITE_EMAILJS_PUBLIC_KEY),

    // Ayrıca process.env için de yedek olarak tanımlayabiliriz (bazen gerekli olabilir)
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_APP_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_APP_SUPABASE_ANON_KEY),
    'process.env.VITE_EMAILJS_SERVICE_ID': JSON.stringify(process.env.VITE_EMAILJS_SERVICE_ID),
    'process.env.VITE_EMAILJS_TEMPLATE_ID': JSON.stringify(process.env.VITE_EMAILJS_TEMPLATE_ID),
    'process.env.VITE_EMAILJS_PUBLIC_KEY': JSON.stringify(process.env.VITE_EMAILJS_PUBLIC_KEY),
  },
});