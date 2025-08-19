// netlify/functions/_sbPublic.ts
import { createClient } from '@supabase/supabase-js';

export function sbPublic() {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing Supabase env variables');
  return createClient(url, anon);
}

export const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,HEAD,OPTIONS,POST',
  'access-control-allow-headers': 'content-type',
};
