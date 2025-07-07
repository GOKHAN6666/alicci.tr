import { createClient } from '@supabase/supabase-js';

// Ortam değişkenlerinden değerleri al
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Console çıktısı: ENV değerleri geldi mi?
console.log('Supabase URL:', `"${supabaseUrl}"`);
console.log('Supabase KEY:', `"${supabaseAnonKey}"`);

// Env değerleri yoksa hata fırlat
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL veya Key eksik. .env dosyanı kontrol et.');
}

// Supabase client yarat
export const supabase = createClient(supabaseUrl, supabaseAnonKey);