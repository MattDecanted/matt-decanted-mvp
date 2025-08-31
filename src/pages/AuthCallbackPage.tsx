import { useEffect, useState } from 'react';
import { supabase, setSessionFromUrlFragment } from '@/lib/supabase';

type State = { status: 'processing' } | { status: 'ok'; email?: string } | { status: 'error'; message: string };

export default function AuthCallbackPage() {
  const [state, setState] = useState<State>({ status: 'processing' });

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hash = url.hash;

        if (code) {
          // PKCE ?code=...
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          // clean query
          window.history.replaceState({}, document.title, '/auth/callback');
          if (error) throw error;
        } else if (hash.includes('access_token')) {
          // Legacy implicit #access_token=...
          await setSessionFromUrlFragment();
        } else {
          throw new Error('No code or token found in URL.');
        }

        // confirm session exists
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error('Session not created.');
        setState({ status: 'ok', email: data.session.user?.email ?? undefined });
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

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="rounded-xl border bg-white shadow p-6 text-center max-w-md space-y-3">
        <div className="text-lg font-semibold">You’re signed in ✅</div>
        {state.email && <div className="text-sm text-gray-600">Email: <b>{state.email}</b></div>}
        <div className="pt-2 flex gap-2 justify-center">
          <a className="rounded bg-black text-white px-4 py-2" href="/account">Go to Account</a>
          <a className="rounded border px-4 py-2" href="/dashboard">Go to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
