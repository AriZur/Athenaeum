import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL: string = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  'https://iwtiuksdcohleojgoncg.supabase.co';

const SUPABASE_ANON_KEY: string = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dGl1a3NkY29obGVvamdvbmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTc0ODksImV4cCI6MjEwMzkzMzQ4OX0.eGdYUZX1IcIM41Ij0kR2YqI36fQcZPf0SoVsX7yNW7o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  isConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
});
