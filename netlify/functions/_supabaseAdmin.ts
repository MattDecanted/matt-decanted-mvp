// netlify/functions/_supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (service role).
 * Reads URL from VITE_SUPABASE_URL and secret from SUPABASE_SERVICE_ROLE.
 * NOTE: Do NOT expose SUPABASE_SERVICE_ROLE to the browser.
 */
export const admin = createClient(
  process.env.VITE_SUPABASE_URL!,        // already set for frontend; safe to reuse on server
  process.env.SUPABASE_SERVICE_ROLE!,    // add this in Netlify env (server secret)
  { auth: { persistSession: false } }
);
