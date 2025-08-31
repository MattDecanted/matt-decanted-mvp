// src/pages/AuthCallbackPage.tsx
import { useEffect, useState } from 'react';
import { supabase, setSessionFromUrlFragment as setSessionFromHashStrict } from '@/lib/supabase';

type State =
  | { status: 'processing'; note?: string }
  | { status: 'ok'; email?: string; userId?: string }
  | { status: 'error'; message: string };

export default function AuthCallbackPage() {
  const [state, setState] = useState<State>({ status: 'processing', note: 'init' });

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hasHash = url.hash.includes('access_token');

        if (code) {
          setState({ status: 'processing', note: 'exchange PKCE code' });
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          window.history.replaceState({}, document.title, '/auth/callback'); // clean query
          if (error) throw error;
        } else if (hasHash) {
          setState({ status: 'processing', note: 'set session from hash' });
          await setSessionFromHashStrict(); // uses setSession(...) + cleans hash
        } else {
          throw new Error('No code or access_token found in URL.');
        }

        setState({ status: 'processing', note: 'confirm session' });
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error('Session not created.');
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

  if (state.status !== 'ok') {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="rounded-xl border bg-white shadow p-6 text-center">
          <div className="font-semibold mb-1">
            {state.status === 'processing' ? 'Signing you in…' : 'Login problem'}
          </div>
          <div className="text-sm text-gray-600">
            {state.status === 'processing'
              ? state.note
              : <span className="text-red-600">{state.message}</span>}
          </div>
          {state.status === 'error' && (
            <a className="inline-flex items-center rounded-lg bg-black text-white px-4 py-2 mt-3" href="/signin">
              Back to sign in
            </a>
          )}
        </div>
      </div>
    );
  }

  // Signed in
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 text-center space-y-3">
        <div className="text-lg font-semibold">You’re signed in ✅</div>
        <div className="text-sm text-gray-600">
          {state.email && <>Email: <b>{state.email}</b><br/></>}
          {state.userId && <>User ID: <code className="text-xs">{state.userId}</code></>}
        </div>
        <div className="flex gap-2 justify-center pt-1">
          <a className="rounded bg-black text-white px-4 py-2" href="/account">Go to Account</a>
          <a className="rounded border px-4 py-2" href="/dashboard">Go to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
