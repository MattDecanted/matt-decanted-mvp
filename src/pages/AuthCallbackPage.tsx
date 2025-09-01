import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, setSessionFromHash } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1) Implicit flow (email magic link / recovery): tokens are in the hash
        if (url.hash.includes('access_token')) {
          setMsg('Storing session…');
          const session = await setSessionFromHash(); // writes session + cleans hash
          if (!session) throw new Error('Missing tokens in URL hash.');
          console.log('[auth] stored from hash for', session.user?.email);
          navigate('/account', { replace: true });
          return;
        }

        // 2) PKCE flow (?code=…)
        const code = url.searchParams.get('code');
        if (code) {
          setMsg('Exchanging code…');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // Clean the URL (?code=…) -> /auth/callback
          window.history.replaceState({}, document.title, url.pathname);
          console.log('[auth] stored from code');
          navigate('/account', { replace: true });
          return;
        }

        // 3) Nothing usable in the URL
        setMsg('Missing token. Please request a new sign-in link.');
        setTimeout(() => navigate('/signin?auth=missing', { replace: true }), 1200);
      } catch (e: any) {
        console.error('[AuthCallbackPage] fatal:', e);
        setMsg(e?.message || 'Login link expired or invalid.');
        setTimeout(() => navigate('/signin?auth=failed', { replace: true }), 1500);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-[70vh] grid place-items-center p-6">
      <div className="rounded-xl border p-5 shadow bg-white text-sm">
        {msg}
      </div>
    </div>
  );
}
