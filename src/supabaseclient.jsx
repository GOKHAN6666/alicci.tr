import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  "https://uunncptklxipioiwgbav.supabase.co/rest/v1/",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bm5jcHRrbHhpcGlvaXdnYmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjIzMjgsImV4cCI6MjA5ODg5ODMyOH0.i_jTX4gthlpMTCqAIHFDiMeuMEiUD4UI2SeraTT04tA"
);
