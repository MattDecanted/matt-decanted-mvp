import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // We’ll parse ?code= / #access_token ourselves in the callback/handler
    detectSessionInUrl: false,
    flowType: 'pkce', // fine with email links & OAuth
  },
});

/**
 * Robust fallback for legacy hash links: /auth/callback#access_token=...&refresh_token=...
 * Uses getSessionFromUrl if available; otherwise sets the session directly.
 * Also cleans the URL hash afterwards.
 */
export async function setSessionFromUrlFragment() {
  const loc = new URL(window.location.href);
  const hashParams = new URLSearchParams(loc.hash.replace(/^#/, ''));
  const access_token = hashParams.get('access_token');
  const refresh_token = hashParams.get('refresh_token');
  if (!access_token || !refresh_token) return;

  const expires_in = Number(hashParams.get('expires_in') || '3600');
  const token_type = hashParams.get('token_type') || 'bearer';

  const anyAuth = supabase.auth as any;
  if (typeof anyAuth.getSessionFromUrl === 'function') {
    const { error } = await anyAuth.getSessionFromUrl({ storeSession: true });
    if (error) throw error;
  } else {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
      expires_in,
      token_type,
    });
    if (error) throw error;
  }

  // remove the hash now that session is stored
  window.history.replaceState({}, document.title, loc.pathname + loc.search);
}
