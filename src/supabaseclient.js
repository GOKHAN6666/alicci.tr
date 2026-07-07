import { createClient } from '@supabase/supabase-js';

// URL'nin sonundaki "/rest/v1/" kısmını sildik, sadece temiz hali kalmalı:
const supabaseUrl = "https://uunncptklxipioiwgbav.supabase.co";

// Bu ekranın hemen altında "Project API keys" kısmında "anon public" yazan anahtarı buraya yapıştır:
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bm5jcHRrbHhpcGlvaXdnYmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjIzMjgsImV4cCI6MjA5ODg5ODMyOH0.i_jTX4gthlpMTCqAIHFDiMeuMEiUD4UI2SeraTT04tA"; 

export const supabase = createClient(supabaseUrl, supabaseKey);
