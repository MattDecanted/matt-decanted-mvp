// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type State =
  | { status: 'processing' }
  | { status: 'ok'; email?: string; userId?: string }
  | { status: 'error'; message: string };

export default function AuthCallbackPage() {
  const [state, setState] = useState<State>({ status: 'processing' });

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        const hashErr = hashParams.get('error') || hashParams.get('error_description');

        // provider error passed in hash
        if (hashErr) {
          window.history.replaceState({}, document.title, '/auth/callback');
          return setState({ status: 'error', message: `Provider error: ${hashErr}` });
        }

        if (code) {
          // PKCE flow
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          window.history.replaceState({}, document.title, '/auth/callback');
          if (error) throw error;
        } else if (access_token && refresh_token) {
          // Legacy implicit flow — parse hash and set session manually
          const anyAuth = (supabase.auth as any);
          if (typeof anyAuth.getSessionFromUrl === 'function') {
            // if present in your build, use it
            const { error } = await anyAuth.getSessionFromUrl({ storeSession: true });
            if (error) throw error;
          } else {
            // fallback: set the session directly
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
          }
          // Clean hash from URL
          window.history.replaceState({}, document.title, url.pathname + url.search);
        } else {
          window.history.replaceState({}, document.title, '/auth/callback');
          return setState({
            status: 'error',
            message: 'No code or token found. Please request a fresh sign-in link.',
          });
        }

        // confirm session
        const { data, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;
        if (!data.session) throw new Error('Session not created');
        setState({
          status: 'ok',
          email: data.session.user?.email,
          userId: data.session.user?.id,
        });
      } catch (e: any) {
        setState({ status: 'error', message: e?.message || String(e) });
      }
    })();
  }, []);

  if (state.status === 'processing') {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="rounded-xl border bg-white shadow p-6 text-center">
          <div className="font-semibold mb-1">Signing you in…</div>
          <div className="text-sm text-gray-500">Processing your link.</div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="rounded-xl border bg-white shadow p-6 text-center max-w-md">
          <div className="font-semibold mb-2">Login problem</div>
          <div className="text-sm text-red-600 mb-4">{state.message}</div>
          <a className="inline-flex items-center rounded-lg bg-black text-white px-4 py-2" href="/signin">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  // ok
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 text-center max-w-md space-y-3">
        <div className="text-lg font-semibold">You’re signed in ✅</div>
        <div className="text-sm text-gray-600">
          {state.email && <>Email: <b>{state.email}</b><br/></>}
          {state.userId && <>User ID: <code className="text-xs">{state.userId}</code></>}
        </div>
        <div className="pt-2 flex gap-2 justify-center">
          <a className="rounded bg-black text-white px-4 py-2" href="/account">Go to Account</a>
          <a className="rounded border px-4 py-2" href="/dashboard">Go to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
