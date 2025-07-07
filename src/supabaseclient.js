import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://xyz.supabase.co", "eyJ..."); // test için sabit ver

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL veya Key eksik. .env dosyanı kontrol et.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);