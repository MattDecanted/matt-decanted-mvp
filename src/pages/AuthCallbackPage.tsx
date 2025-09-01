// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { supabase, setSessionFromHash } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    const go = () => {
      const dest = `${window.location.origin}/account`;
      // 3 ways to force navigation, in case one is blocked by SPA history/state
      window.location.replace(dest);
      setTimeout(() => { window.location.href = dest; }, 400);
      setTimeout(() => { window.location.assign(dest); }, 1200);
    };

    const callJoinMember = async () => {
      try {
        // locale: keep super-simple and safe
        const locale = (navigator.language || 'en').slice(0, 2);
        const { error } = await supabase.rpc('join_member', {
          p_plan: 'free',
          p_start_trial: true,
          p_locale: locale,
          // leave optional fields null if you don't have a form here:
          p_first_name: null,
          p_country: null,
          p_accept_terms: null,
          p_accept_notifications: null,
        });
        if (error) console.warn('[AuthCallback.join_member] rpc error:', error);
      } catch (e) {
        console.warn('[AuthCallback.join_member] threw:', e);
      }
    };

    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1) Implicit/hash (magic link): #access_token=...
        if (url.hash.includes('access_token') || url.hash.includes('refresh_token')) {
          setMsg('Storing session…');
          await setSessionFromHash(); // also cleans the hash

          // best-effort: ensure we actually have a session before RPC
          const { data: s1 } = await supabase.auth.getSession();
          if (s1?.session) {
            setMsg('Setting up your account…');
            await callJoinMember();
          }

          setMsg('Redirecting…');
          go();
          return;
        }

        // 2) PKCE: ?code=...
        const code = url.searchParams.get('code');
        if (code) {
          setMsg('Exchanging code…');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // Clean query so the app can’t mistake it for a fresh callback later
          window.history.replaceState({}, document.title, url.pathname);

          // best-effort: ensure we actually have a session before RPC
          const { data: s2 } = await supabase.auth.getSession();
          if (s2?.session) {
            setMsg('Setting up your account…');
            await callJoinMember();
          }

          setMsg('Redirecting…');
          go();
          return;
        }

        // 3) Nothing useful in URL → back to sign in
        setMsg('Missing token. Please request a new link.');
        window.location.replace(`${window.location.origin}/signin?auth=missing`);
      } catch (e: any) {
        console.error('[AuthCallbackPage] error:', e);
        setMsg(e?.message || 'Could not sign you in.');
        window.location.replace(`${window.location.origin}/signin?auth=error`);
      }
    })();
  }, []);

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 text-center">
        <div className="font-semibold mb-1">Signing you in…</div>
        <div className="text-sm text-gray-600">{msg}</div>
      </div>
    </div>
  );
}
