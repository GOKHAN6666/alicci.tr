import { createClient } from '@supabase/supabase-js';

// Bilgileri elle yazmak yerine .env dosyasından ve Vercel'den otomatik çekiyoruz
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
