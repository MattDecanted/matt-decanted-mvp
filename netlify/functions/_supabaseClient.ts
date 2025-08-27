// netlify/functions/_supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

/** Get the first defined/non-empty value from a list of env var names. */
function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && String(v).trim().length > 0) return v;
  }
  return undefined;
}

/** Required env getter with a friendly error. */
function requiredEnv(...names: string[]): string {
  const v = firstEnv(...names);
  if (!v) throw new Error(`Missing Supabase env var: one of [${names.join(', ')}] must be set`);
  return v;
}

// Prefer service-role key (server only). Do NOT expose this to the browser.
const SUPABASE_URL = requiredEnv('VITE_SUPABASE_URL', 'SUPABASE_URL');
const SERVICE_KEY  = requiredEnv('SUPABASE_SERVICE_ROLE', 'SUPABASE_SERVICE_ROLE_KEY');

/**
 * Server-side Supabase client.
 * - Uses the service role for RLS-bypassing operations inside Netlify Functions
 * - No session persistence/refresh (not needed server-side)
 */
export const sbServer = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Optional: named export alias if some files were importing `supabase` before.
// Remove this line once all functions import { sbServer }.
export const supabase = sbServer;
