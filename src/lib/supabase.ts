import { createClient, type Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // We handle redirects manually (hash and PKCE)
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

/** v2-compatible: handles #access_token + ?code and persists the session */
export async function completeAuthFromUrl(): Promise<Session | null> {
  const loc = new URL(window.location.href);

  // 1) Check for implicit/hash tokens (magic/recovery)
  const rawHash = loc.hash.startsWith('#') ? loc.hash.slice(1) : loc.hash;
  const hp = new URLSearchParams(rawHash);

  const hashError = hp.get('error_description') || hp.get('error');
  if (hashError) throw new Error(decodeURIComponent(hashError));

  const access_token = hp.get('access_token') || undefined;
  const refresh_token = hp.get('refresh_token') || undefined;
  const expires_in = Number(hp.get('expires_in') || '3600');
  const token_type = hp.get('token_type') || 'bearer';

  let didHandle = false;

  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
      expires_in,
      token_type,
    });
    if (error) throw error;
    didHandle = true;
  }

  // 2) PKCE code (?code=...)
  const code = loc.searchParams.get('code');
  if (!didHandle && code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    didHandle = true;
  }

  if (!didHandle) {
    throw new Error('No Supabase auth parameters found in URL');
  }

  // 3) Clean the URL (remove hash & query) without reload
  window.history.replaceState({}, document.title, loc.pathname);

  // 4) Verify we actually have a session
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

/** Back-compat aliases used elsewhere in your app */
export async function setSessionFromHash() {
  return completeAuthFromUrl();
}
export async function setSessionFromUrlFragment() {
  return completeAuthFromUrl();
}
