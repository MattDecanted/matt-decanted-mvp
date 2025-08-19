// src/pages/AuthCallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        // Clean the URL so refreshes don’t retry
        window.history.replaceState({}, document.title, '/auth/callback');
        if (error) throw error;
        navigate('/account', { replace: true });
      } catch (e) {
        // If the link was already used / expired you’ll land on account with a flag
        navigate('/account?auth=failed', { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="p-6 text-center">Signing you in…</div>
  );
}
