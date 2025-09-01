import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSessionFromHash, supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const nav = useNavigate();
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    (async () => {
      try {
        // 1) Try legacy hash (your emails are hash magic links)
        const s = await setSessionFromHash();
        if (s) {
          nav('/account', { replace: true });
          return;
        }

        // 2) If we ever switch to PKCE (?code=), this covers it
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          if (error) throw error;
          window.history.replaceState({}, document.title, url.pathname);
          nav('/account', { replace: true });
          return;
        }

        setMsg('Missing auth data in URL. Please request a new link.');
      } catch (e: any) {
        setMsg(e?.message || 'Could not complete sign-in.');
      }
    })();
  }, [nav]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 text-center">
        <div className="font-semibold mb-1">Signing you in…</div>
        <div className="text-sm text-gray-600">{msg}</div>
      </div>
    </div>
  );
}
