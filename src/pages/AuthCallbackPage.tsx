// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type State =
  | { status: 'processing'; details?: string }
  | { status: 'ok'; email?: string; userId?: string }
  | { status: 'error'; message: string };

export default function AuthCallbackPage() {
  const [state, setState] = useState<State>({ status: 'processing' });

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const type = url.searchParams.get('type');
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const hashErr = hashParams.get('error') || hashParams.get('error_description');

        // 0) Provider error in hash
        if (hashErr) {
          window.history.replaceState({}, document.title, '/auth/callback');
          return setState({ status: 'error', message: `Provider error: ${hashErr}` });
        }

        // 1) Recovery links should land here too; both PKCE and hash are possible
        if (type === 'recovery' && code) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          window.history.replaceState({}, document.title, '/auth/callback');
          if (error) throw error;
        } else if (code) {
          // 2) PKCE
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          window.history.replaceState({}, document.title, '/auth/callback');
          if (error) throw error;
        } else if (accessToken) {
          // 3) Legacy implicit hash
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          window.history.replaceState({}, document.title, '/auth/callback');
          if (error) throw error;
        } else {
          window.history.replaceState({}, document.title, '/auth/callback');
          return setState({
            status: 'error',
            message: 'No code or token found in URL. Please request a fresh link.',
          });
        }

        // Confirm session
        const { data, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;
        const email = data.session?.user?.email;
        const userId = data.session?.user?.id;
        if (!data.session) {
          return setState({
            status: 'error',
            message: 'Session not created. Link may have expired; request a new one.',
          });
        }
        setState({ status: 'ok', email, userId });
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

  // state.status === 'ok'
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 text-center max-w-md space-y-3">
        <div className="text-lg font-semibold">You’re signed in ✅</div>
        <div className="text-sm text-gray-600">
          {state.email ? <>Email: <b>{state.email}</b></> : null}
          {state.userId ? <><br/>User ID: <code className="text-xs">{state.userId}</code></> : null}
        </div>
        <div className="pt-2 flex gap-2 justify-center">
          <a className="rounded bg-black text-white px-4 py-2" href="/account">Go to Account</a>
          <a className="rounded border px-4 py-2" href="/dashboard">Go to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
