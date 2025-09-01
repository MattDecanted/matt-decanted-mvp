// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { supabase, setSessionFromHash } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState('Processing your link…');

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const dest = `${window.location.origin}/account`;

      try {
        // Implicit flow: #access_token=... (magic link)
        if (url.hash.includes('access_token') || url.hash.includes('refresh_token')) {
          setMsg('Storing session…');
          await setSessionFromHash(); // also cleans the hash
          setMsg('Redirecting…');
          // Force a full page load with two fallbacks
          window.location.replace(dest);
          setTimeout(() => (window.location.href = dest), 600);
          return;
        }

        // PKCE: ?code=...
        const code = url.searchParams.get('code');
        if (code) {
          setMsg('Exchanging code…');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // Clean query
          window.history.replaceState({}, document.title, url.pathname);

          setMsg('Redirecting…');
          window.location.replace(dest);
          setTimeout(() => (window.location.href = dest), 600);
          return;
        }

        // Nothing useful in URL
        setMsg('Missing token in URL. Please request a new link.');
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
