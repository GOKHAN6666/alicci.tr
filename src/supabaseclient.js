import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trnzalpmrhhuefolsccu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybnphbHBtcmhodWVmb2xzY2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTMxNjcsImV4cCI6MjA2MzU4OTE2N30.aRgjvx4ENryKcHHwcUHwmMoKyOB6LbK4HYqWrDTadGI';

export const supabase = createClient(supabaseUrl, supabaseKey);
