import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// YENİ EKLENEN HATA AYIKLAMA LOGLARI - Bunlar hatadan ÖNCE görünmeli
console.log("DEBUG - import.meta.env.VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("DEBUG - import.meta.env.VITE_SUPABASE_ANON_KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log("DEBUG - supabaseUrl değişkeni:", supabaseUrl); // `const supabaseUrl` ataması sonrası değeri
console.log("DEBUG - supabaseAnonKey değişkeni:", supabaseAnonKey); // `const supabaseAnonKey` ataması sonrası değeri


if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Key is missing from environment variables. Please check your .env file.");
  throw new Error('Supabase URL and Key must be defined in your .env file.');
}

console.log("Supabase client oluşturuluyor...");
console.log("URL:", supabaseUrl ? "Defined" : "Undefined");
console.log("Key:", supabaseAnonKey ? "Defined" : "Undefined");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("Supabase client başarıyla oluşturuldu.");