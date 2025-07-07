import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Gerekirse ek yapılandırmalar buraya eklenebilir
  // Örneğin, sunucu portu veya proxy ayarları
  server: {
    // Portu belirtebilirsiniz, varsayılan 5173'tür
    // port: 3000,
    host: true // Vercel'in network erişimine izin verir
  },
  // Vercel gibi platformlarda doğru yol çözünürlüğü için base yolu ayarı
  base: '/',
  // Ortam değişkenleri için özel bir yapılandırma genellikle gerekmez.
  // Vite, VITE_ ile başlayan değişkenleri otomatik olarak algılar.
});
