import { createClient, type Session } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,     // we will do it ourselves
    flowType: 'implicit',          // simplest + matches your magic links
  },
});

// Handy for console checks:
console.log('[supabase.init]', { url, anon_prefix: anon.slice(0, 6) });
// @ts-expect-error
window.SB = supabase;

// Helper: complete auth from a *hash* magic link on /auth/callback
export async function setSessionFromHash(): Promise<Session | null> {
  const loc = new URL(window.location.href);
  const hp  = new URLSearchParams(loc.hash.replace(/^#/, ''));

  const err = hp.get('error') || hp.get('error_description');
  if (err) throw new Error(decodeURIComponent(err));

  const access_token  = hp.get('access_token') || undefined;
  const refresh_token = hp.get('refresh_token') || undefined;
  const expires_in    = Number(hp.get('expires_in') || '3600');
  const token_type    = hp.get('token_type') || 'bearer';

  if (!access_token || !refresh_token) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token, refresh_token, expires_in, token_type,
  });
  if (error) throw error;

  // clean hash
  window.history.replaceState({}, document.title, loc.pathname + loc.search);

  const sessionRes = await supabase.auth.getSession();
  return sessionRes.data.session ?? null;
}
