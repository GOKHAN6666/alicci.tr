// ✅ OLMASI GEREKEN DOĞRU HALİ:
import { createClient } from '@supabase/supabase-js'

// Bilgileri direkt .env dosyasından çekiyoruz, elle link yazmıyoruz
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
