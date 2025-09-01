// src/pages/AuthCallbackPage.tsx
import { useEffect, useRef, useState } from 'react';
import { supabase, setSessionFromHash } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState('Signing you in…');
  const ran = useRef(false); // guard against double-run (React StrictMode)

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const dest = `${window.location.origin}/account`;

    const redirect = () => {
      // 3 ways, staggered, to defeat SPA history quirks
      window.location.replace(dest);
      setTimeout(() => (window.location.href = dest), 400);
      setTimeout(() => window.location.assign(dest), 1200);
    };

    (async () => {
      try {
        const url = new URL(window.location.href);
        const hp = new URLSearchParams(url.hash.replace(/^#/, ''));
        const hasAccess = !!hp.get('access_token');
        const hasRefresh = !!hp.get('refresh_token');

        if (hasAccess && hasRefresh) {
          // Magic-link (implicit) flow
          setMsg('Storing session…');
          await setSessionFromHash(); // also cleans the hash
        } else {
          // PKCE / OAuth (?code=...)
          const code = url.searchParams.get('code');
          if (!code) {
            // Nothing useful → back to sign-in
            setMsg('Missing token. Please request a new link.');
            window.location.replace(`${window.location.origin}/signin?auth=missing`);
            return;
          }
          setMsg('Exchanging code…');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // Clean query so we don’t loop on refresh
          window.history.replaceState({}, document.title, url.pathname + url.hash);
        }

        setMsg('Finalizing…');

        // If we already have a session, go now
        const first = await supabase.auth.getSession();
        if (first.data.session) {
          redirect();
          return;
        }

        // Redirect as soon as auth state flips to signed in
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
          if (session) {
            try { sub.subscription.unsubscribe(); } catch {}
            redirect();
          }
        });

        // Fallback: short poll in case the event above is missed
        const t0 = Date.now();
        while (Date.now() - t0 < 3000) {
          await new Promise((r) => setTimeout(r, 150));
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            try { sub.subscription.unsubscribe(); } catch {}
            redirect();
            return;
          }
        }

        // Last resort fallback
        redirect();
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
