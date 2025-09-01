// src/lib/supabase.ts
import { createClient, type Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Fail fast if envs are missing (helps diagnose prod)
if (!url || !anon) {
  throw new Error(
    `Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Got URL="${url || '∅'}", ANON="${anon ? anon.slice(0,6)+'…' : '∅'}"`
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // we handle callback URLs ourselves
    flowType: 'implicit',      // magic links return #access_token
  },
});

// Helpful breadcrumb in console; also expose for debugging
console.log('[supabase.init]', { url, anon_prefix: anon.slice(0, 6) });
// @ts-expect-error
window.SB = supabase;

/** Parse tokens from a URL hash like:
 * /auth/callback#access_token=...&refresh_token=...&expires_in=3600&token_type=bearer
 */
export function readHashTokens() {
  const loc = new URL(window.location.href);
  const hp = new URLSearchParams(loc.hash.replace(/^#/, ''));
  const access_token = hp.get('access_token') || undefined;
  const refresh_token = hp.get('refresh_token') || undefined;
  const expires_in = Number(hp.get('expires_in') || '3600');
  const token_type = hp.get('token_type') || 'bearer';
  const error = hp.get('error') || hp.get('error_description') || undefined;
  return { access_token, refresh_token, expires_in, token_type, error };
}

/** Strict setter: writes session from hash tokens and then cleans the hash. */
export async function setSessionFromHashStrict(): Promise<void> {
  const { access_token, refresh_token, expires_in, token_type, error } = readHashTokens();
  if (error) throw new Error(decodeURIComponent(error));
  if (!access_token || !refresh_token) throw new Error('Missing tokens in URL hash');

  const { error: setErr } = await supabase.auth.setSession({
    access_token,
    refresh_token,
    expires_in,
    token_type,
  });
  if (setErr) throw setErr;

  const loc = new URL(window.location.href);
  // remove only the hash, keep path+query
  window.history.replaceState({}, document.title, loc.pathname + loc.search);
}

/** Convenience: finalize auth from current URL (hash or ?code). Returns the session (or null). */
export async function completeAuthFromUrl(): Promise<Session | null> {
  const loc = new URL(window.location.href);
  const hasHash = loc.hash.includes('access_token') || loc.hash.includes('refresh_token') || loc.hash.includes('type=magiclink');
  const code = loc.searchParams.get('code');

  if (hasHash) {
    await setSessionFromHashStrict();
  } else if (code) {
    // v2 expects the FULL URL, not just the code string
    const { error } = await supabase.auth.exchangeCodeForSession(loc.href);
    if (error) throw error;
    // clean the query (keep any hash if present)
    window.history.replaceState({}, document.title, loc.pathname + loc.hash);
  } else {
    // nothing to do
    return (await supabase.auth.getSession()).data.session ?? null;
  }

  const { data, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) throw sessErr;
  return data.session ?? null;
}

/** Back-compat aliases used elsewhere in your app */
export async function setSessionFromUrlFragment(): Promise<void> {
  return setSessionFromHashStrict();
}
export async function setSessionFromHash(): Promise<void> {
  return setSessionFromHashStrict();
}
