// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      console.log('[AuthCallbackPage] attempting to process auth callback');

      // Only process if URL contains access_token
      if (!window.location.hash.includes('access_token')) {
        console.warn('[AuthCallbackPage] No token found in URL hash');
        setErrorMsg('Missing token. Please try logging in again.');
        navigate('/account?auth=failed', { replace: true });
        return;
      }

      try {
        const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });

        // Always clean the URL
        window.history.replaceState({}, document.title, '/auth/callback');

        if (error) {
          console.error('[AuthCallbackPage] Supabase error:', error);
          setErrorMsg('Login link expired or invalid.');
          navigate('/account?auth=failed', { replace: true });
          return;
        }

        navigate('/account', { replace: true });
      } catch (e) {
        console.error('[AuthCallbackPage] Unexpected error:', e);
        setErrorMsg('Something went wrong. Please try again.');
        navigate('/account?auth=failed', { replace: true });
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
