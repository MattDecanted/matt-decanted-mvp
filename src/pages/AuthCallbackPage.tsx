// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const type = url.searchParams.get('type');        // e.g., type=recovery
        const code = url.searchParams.get('code');        // PKCE flow
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token'); // legacy implicit flow
        const hashError =
          hashParams.get('error') || hashParams.get('error_description');

        console.log('[AuthCallback] init', {
          pathname: url.pathname,
          search: url.search,
          hash: url.hash ? '(present)' : '(none)',
          type,
          hasCode: !!code,
          hasAccessToken: !!accessToken,
          hashError,
        });

        // 0) Hash-style error from provider
        if (hashError) {
          console.error('[AuthCallback] Hash auth error:', Object.fromEntries(hashParams.entries()));
          setErrorMsg('Login was cancelled or failed with your provider.');
          // Clean the URL
          window.history.replaceState({}, document.title, '/auth/callback');
          return navigate('/login?auth=error', { replace: true });
        }

        // 1) Password recovery flow → send user to reset page
        if (type === 'recovery') {
          // Clean the URL before leaving
          window.history.replaceState({}, document.title, '/auth/callback');
          return navigate('/reset-password', { replace: true });
        }

        // 2) PKCE flow: exchange ?code= for a session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          // Clean the URL regardless of result
          window.history.replaceState({}, document.title, '/auth/callback');

          if (error) {
            console.error('[AuthCallback] exchangeCodeForSession error:', error);
            setErrorMsg('Login link expired or invalid.');
            return navigate('/login?auth=error', { replace: true });
          }

          // Success: session is stored
          return navigate('/account', { replace: true });
        }

        // 3) Legacy implicit flow: token in hash (#access_token=…)
        if (accessToken) {
          // getSessionFromUrl parses the hash and stores the session
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          window.history.replaceState({}, document.title, '/auth/callback');

          if (error) {
            console.error('[AuthCallback] getSessionFromUrl error:', error);
            setErrorMsg('Login link expired or invalid.');
            return navigate('/login?auth=error', { replace: true });
          }

          return navigate('/account', { replace: true });
        }

        // 4) Nothing usable in URL → back to login
        console.warn('[AuthCallback] No code or token in URL');
        setErrorMsg('Missing code. Please try logging in again.');
        window.history.replaceState({}, document.title, '/auth/callback');
        return navigate('/login?auth=failed', { replace: true });
      } catch (e) {
        console.error('[AuthCallback] Unexpected error:', e);
        setErrorMsg('Something went wrong. Please try again.');
        window.history.replaceState({}, document.title, '/auth/callback');
        return navigate('/login?auth=error', { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="p-6 text-center text-base">
      {errorMsg ? (
        <div className="text-red-500">{errorMsg}</div>
      ) : (
        <div>Signing you in…</div>
      )}
    </div>
  );
}
