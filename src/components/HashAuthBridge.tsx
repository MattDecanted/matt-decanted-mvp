// src/components/HashAuthBridge.tsx
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
        type === 'recovery'
          ? '/reset-password'
          : params.get('redirect_to') || '/dashboard';

      // Turn #access_token/#refresh_token into a Supabase session
      const { handled, error } = await setSessionFromHash(hash);
      if (!handled) return;

      if (error) {
        console.error('[HashAuthBridge] setSession error:', error);
        return;
      }

      // Strip the hash on the current URL (avoid flashes / double-handling)
      const cleanUrl = loc.pathname + loc.search;
      window.history.replaceState(null, '', cleanUrl);

      // Navigate to the intended page, replacing history
      navigate(redirectTo, { replace: true });
    })();
    // Re-run on navigation or when the hash changes
  }, [loc.key, loc.hash, loc.pathname, loc.search, navigate]);

  return null;
}
