import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // We handle ?code= and #access_token ourselves (callback/handler)
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

/** Read tokens from a legacy implicit hash:
 *   /auth/callback#access_token=...&refresh_token=...&expires_in=3600&token_type=bearer
 */
export function readHashTokens() {
  const loc = new URL(window.location.href);
  const hp = new URLSearchParams(loc.hash.replace(/^#/, ''));
  const access_token = hp.get('access_token') || undefined;
  const refresh_token = hp.get('refresh_token') || undefined;
  const expires_in = Number(hp.get('expires_in') || '3600');
  const token_type = hp.get('token_type') || 'bearer';
  return { access_token, refresh_token, expires_in, token_type };
}

/** Strict setter: always writes the session using all token fields, then cleans the URL hash. */
export async function setSessionFromHashStrict() {
  const { access_token, refresh_token, expires_in, token_type } = readHashTokens();
  if (!access_token || !refresh_token) throw new Error('Missing tokens in URL hash');

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
    expires_in,
    token_type,
  });
  if (error) throw error;

  // remove the hash now that session is stored
  const loc = new URL(window.location.href);
  window.history.replaceState({}, document.title, loc.pathname + loc.search);
}

/** Back-compat aliases (so existing imports keep working) */
export async function setSessionFromUrlFragment() {
  return setSessionFromHashStrict();
}

// 👇 Add this alias so DebugAuth and others can import it without errors
export async function setSessionFromHash() {
  return setSessionFromHashStrict();
}
