// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// Supabase URL'si ve Anon Key'i ortam değişkenlerinden al.
// Vercel'de bu değişkenlerin VITE_APP_SUPABASE_URL
// ve VITE_APP_SUPABASE_ANON_KEY olarak ayarlandığından emin olun.
const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY;

// Hata ayıklama için bu console.log satırlarını ekliyoruz.
// Canlı uygulamada tarayıcınızın konsolunda bu değerleri görebileceksiniz.
// Bu satırları daha sonra kaldırabilirsiniz.
console.log("Supabase URL from env:", supabaseUrl);
console.log("Supabase Anon Key from env:", supabaseAnonKey);

// Eğer URL veya Anahtar eksikse, bir hata fırlat.
// Bu, uygulamanın başlatılmadan önce gerekli bilgileri kontrol etmesini sağlar.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required environment variables.');
}

// Supabase istemcisini oluştur ve dışa aktar.
// Uygulamanızın diğer kısımlarında bu 'supabase' nesnesini kullanacaksınız.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Alternatif olarak, eğer Auth ile ilgili farklı bir kurulumunuz varsa,
// createClient içinde seçenekleri de belirtebilirsiniz:
/*
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage, // Veya sessionStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});
*/