// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// Bu isimler Vercel'deki ile TAMAMEN aynı olmalı.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY;

console.log("Supabase URL from env:", supabaseUrl);
console.log("Supabase Anon Key from env:", supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required environment variables.');
  throw new Error('Supabase URL and Anon Key are required environment variables.'); // Bu hatayı fırlatması uygulamanın çökmesine neden olur, geçici olarak yorumlayabilirsiniz.
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);