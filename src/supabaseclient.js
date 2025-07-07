import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  "https://jqolgnlespsbtnyvqobg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxb2xnbmxlc3BzYnRueXZxb2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0Mzg2NjgsImV4cCI6MjA2NDAxNDY2OH0.pPfNR2JhvHbwmfFOk0mUZeW-nSsQDUVThoDDR3gfcqg"
);