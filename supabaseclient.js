import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trnzalpmrhhuefolsccu.supabase.co'; // Supabase panelinden alın
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybnphbHBtcmhodWVmb2xzY2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTMxNjcsImV4cCI6MjA2MzU4OTE2N30.aRgjvx4ENryKcHHwcUHwmMoKyOB6LbK4HYqWrDTadGI'; // Supabase panelindeki public anon key

export const supabase = createClient(supabaseUrl, supabaseKey);
