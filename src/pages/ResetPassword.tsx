// src/pages/ResetPassword.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const nav = useNavigate();
  const location = useLocation();

  const [phase, setPhase] =
    React.useState<'checking' | 'ready' | 'error'>('checking');
  const [error, setError] = React.useState<string | null>(null);
  const [pw1, setPw1] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  // Bridge hash -> session here too (in case the app-level bridge hasn’t run yet)
  React.useEffect(() => {
    (async () => {
      try {
        setPhase('checking');

        // 1) If hash has tokens, use them
        const hash = location.hash?.startsWith('#')
          ? new URLSearchParams(location.hash.slice(1))
          : null;
        const at = hash?.get('access_token');
        const rt = hash?.get('refresh_token');

        if (at && rt) {
          const { error } = await supabase.auth.setSession({
            access_token: at,
            refresh_token: rt,
          });
          // Clean the URL (keep path+query; drop hash)
          window.history.replaceState(null, '', location.pathname + location.search);
          if (error) throw error;
        }

        // 2) Confirm we have a session user (recovery links create a temp session)
        const { data, error: getErr } = await supabase.auth.getSession();
        if (getErr) throw getErr;
        if (!data.session?.user) {
          setError('This reset link is invalid or has expired. Please request a new one.');
          setPhase('error');
          return;
        }

        setPhase('ready');
      } catch (e: any) {
        console.warn('Reset bridge failed:', e?.message || e);
        setError('This reset link is invalid or has expired. Please request a new one.');
        setPhase('error');
      }
    })();
  }, [location.pathname, location.search, location.hash]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw1 !== pw2) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      // Optional: sign them out and force a fresh login (or send to dashboard)
      // await supabase.auth.signOut();
      nav('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Failed to set new password.');
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'checking') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="rounded-xl border p-6 text-center max-w-md w-full">
          <h1 className="text-lg font-semibold mb-2">Reset Password</h1>
          <p className="text-sm text-gray-600">Checking link…</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="rounded-xl border p-6 text-center max-w-md w-full">
          <h1 className="text-lg font-semibold mb-2">Reset Password</h1>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => nav('/signin')}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // phase === 'ready'
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border p-6 bg-white space-y-4"
      >
        <h1 className="text-xl font-bold">Set a new password</h1>
        {error && (
          <div className="text-sm p-3 rounded bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-sm text-gray-700">New password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">Confirm new password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save password'}
        </button>

        <button
          type="button"
          onClick={() => nav('/signin')}
          className="w-full text-sm text-gray-700 underline"
        >
          Back to sign in
        </button>
      </form>
    </div>
  );
}
