import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // we’ll handle it manually here
    flowType: 'pkce',
  },
});

// --- New: one handler to parse either #access_token or ?code and store session
export async function handleAuthRedirect() {
  // Let the SDK read the fragment/query and persist the session
  const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
  if (error) throw error;

  // Clean the URL (remove hash/query) without reloading
  const loc = new URL(window.location.href);
  window.history.replaceState({}, document.title, loc.pathname);

  return data.session;
}

/** Back-compat aliases so existing imports keep working */
export async function setSessionFromHash() {
  return handleAuthRedirect();
}
export async function setSessionFromUrlFragment() {
  return handleAuthRedirect();
}

// (Optional) keep your helpers if other code uses them, but they’re no longer needed:
// export function readHashTokens() { ... }
// export async function setSessionFromHashStrict() { ... }
