// src/pages/AuthCallbackPage.tsx
import { useEffect } from 'react';
import { supabase, setSessionFromHashStrict } from '@/lib/supabase';

export default function AuthCallbackPage() {
  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const hasHash = url.hash.includes('access_token');
        const code = url.searchParams.get('code');

        if (hasHash) {
          // Implicit: tokens are in the hash. Store them and clean the URL.
          await setSessionFromHashStrict();
        } else if (code) {
          // PKCE/recovery: exchange the code for a session.
          await supabase.auth.exchangeCodeForSession(url.href);
          // Clean the URL query so refreshes don’t retry the exchange.
          window.history.replaceState({}, document.title, '/auth/callback');
        }
      } catch (e) {
        // swallow; we’ll still push through to /account
        // console.error('[AuthCallbackPage] auth finalize error:', e);
      } finally {
        // Always finish by landing on Account
        window.location.replace('/account');
      }
    })();
  }, []);

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 text-center">
        <div className="font-semibold mb-1">Signing you in…</div>
        <div className="text-sm text-gray-600">Finishing up.</div>
      </div>
    </div>
  );
}
