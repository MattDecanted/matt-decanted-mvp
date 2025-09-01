// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { supabase, setSessionFromHash } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState('Processing your link…');

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);

      try {
        // Case A: implicit/hash magic link
        if (url.hash.includes('access_token') || url.hash.includes('refresh_token')) {
          setMsg('Storing session…');
          await setSessionFromHash(); // also cleans the hash
          setMsg('Redirecting…');
          window.location.replace('/account'); // ⬅️ hard redirect (most reliable)
          return;
        }

        // Case B: PKCE (?code=…)
        const code = url.searchParams.get('code');
        if (code) {
          setMsg('Exchanging code…');
          // You can pass the code *or* the full URL. Using code is clearer.
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // Clean the query string
          window.history.replaceState({}, document.title, url.pathname);
          setMsg('Redirecting…');
          window.location.replace('/account'); // ⬅️ hard redirect
          return;
        }

        // Case C: nothing usable in the URL
        setMsg('Missing token in URL. Please request a new link.');
        window.location.replace('/signin?auth=missing');
      } catch (e: any) {
        console.error('[AuthCallbackPage] error', e);
        setMsg(e?.message || 'Could not sign you in.');
        window.location.replace('/signin?auth=error');
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
