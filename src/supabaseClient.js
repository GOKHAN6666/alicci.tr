// supabaseClient.js dosyasında:

import { createClient } from '@supabase/supabase-js';

// Ortam değişkenlerini kullanarak Supabase URL ve Anahtarını alın
const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL; // BURAYI DÜZELTTİK: VITE_SUPABASE_URL yerine VITE_APP_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY;

// Eğer geliştirme ortamında (localhost) çalışıyorsanız ve ortam değişkenleri tanımlı değilse
// yedek olarak sabit değerler kullanabilirsiniz, ancak bu sadece geliştirme içindir.
// Canlıda Vercel'deki ortam değişkenleri kullanılacaktır.
if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key is missing from environment variables.");
  // Alternatif olarak, burada bir hata mesajı gösterebilir veya uygulamayı başlatmayabilirsiniz.
  // Veya sadece geliştirme ortamı için buraya geçici sabit değerler koyabilirsiniz.
  // Örneğin:
  // supabaseUrl = 'https://trnzalpmrhhuefolsccu.supabase.co';
  // supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxb2xnbmxlc3BzYnRueXZxb2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0Mzg2NjgsImV4cCI6MjA2NDAxNDY2OH0.pPfNR2JhvHbwmfFOk0mUZeW-nSsQDUVThoDDR3gfcqg';
} // Bu if bloğunu da düzgün kapatmalıyız.

export const supabase = createClient(supabaseUrl, supabaseKey);