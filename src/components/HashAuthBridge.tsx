import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setSessionFromHash } from '@/lib/supabase';

/**
 * Reads magic-link / recovery tokens from the URL hash, sets the Supabase
 * session, then cleans the URL and routes to a sensible place.
 */
export default function HashAuthBridge() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const hash = window.location.hash || '';
      if (!hash.includes('access_token')) return;

      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const type = params.get('type') || '';
      const redirectTo =
        type === 'recovery' ? '/reset-password' : params.get('redirect_to') || '/dashboard';

      const { handled, error } = await setSessionFromHash(hash);
      if (!handled) return;

      if (error) {
        console.error('[HashAuthBridge] setSession error:', error);
        return;
      }

      // Strip the hash and move to the target without a full reload
      navigate(redirectTo, { replace: true });
    })();
  }, [loc.key, navigate]);

  return null;
}
