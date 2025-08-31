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

        // 1) Handle either flow, prefer hash (implicit)
        if (hasHash) {
          await setSessionFromHashStrict(); // sets session + cleans hash
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          window.history.replaceState({}, document.title, '/auth/callback'); // clean query
          if (error) throw error;
        } else {
          // no tokens/code – just send them back to sign in
          window.location.replace('/signin?auth=missing');
          return;
        }

        // 2) Poll up to 5s for the session to be visible (robust against race conditions)
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          const { data, error } = await supabase.auth.getSession();
          if (error) break;
          if (data?.session) {
            // 3) Success → go straight to Account
            window.location.replace('/account');
            return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        // Fallback: continue anyway (the session may still be stored)
        window.location.replace('/account');
      } catch {
        window.location.replace('/signin?auth=error');
      }
    })();
  }, []);

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 text-center">
        <div className="font-semibold mb-1">Signing you in…</div>
        <div className="text-sm text-gray-600">Setting your session and finishing up.</div>
      </div>
    </div>
  );
}
