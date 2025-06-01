import { createClient } from '@supabase/supabase-js';

// Ortam değişkenlerini kullanarak Supabase URL ve Anahtarını alın
// Bu, Vercel'de ayarladığınız VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY'i kullanmasını sağlayacak
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
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
  // supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybnphbHBtcmhodWVmb2xzY2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTMxNjcsImV4cCI6MjA2MzU4OTE2N30.aRgjvx4ENryKcHHwcUHwmMoKyOB6LbK4HYqWrDTadGI' ;

export const supabase = createClient(supabaseUrl, supabaseKey);