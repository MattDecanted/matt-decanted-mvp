import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [msg, setMsg] = React.useState('Completing sign-in…');

  React.useEffect(() => {
    (async () => {
      try {
        // Always try the exchange (works for #access_token or ?code flows)
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          setMsg(error.message || 'Sign-in link is invalid or has expired.');
          // If it’s an OTP expiry, offer to resend from /account
          setTimeout(() => navigate('/account'), 1200);
          return;
        }
        if (data?.session) {
          setMsg('Signed in! Redirecting…');
          // Clean up the URL and go to account
          navigate('/account', { replace: true });
          return;
        }
        setMsg('No session found. Redirecting…');
        navigate('/account', { replace: true });
      } catch (e: any) {
        setMsg(e?.message || 'Something went wrong. Redirecting…');
        setTimeout(() => navigate('/account'), 1200);
      }
    })();
  }, [navigate]);

  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}
