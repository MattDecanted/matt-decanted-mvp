import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, setSessionFromHash } from '@/lib/supabase';

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // If the user landed here directly with a hash, handle it
        if (window.location.hash.includes('access_token')) {
          await setSessionFromHash();
          history.replaceState(null, '', window.location.pathname);
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data?.session) {
          setError('This reset link is invalid or has expired. Please request a new one.');
        }
      } catch (e: any) {
        setError(e?.message || 'Unable to validate the reset link.');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setError(error.message);
    navigate('/signin?reset=success', { replace: true });
  }

  if (!ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="rounded-xl border bg-white shadow p-6 text-center">
          <div className="font-semibold mb-1">Reset Password</div>
          <div className="text-sm text-gray-500">Checking link…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="rounded-xl border bg-white shadow p-6 text-center max-w-md">
          <div className="font-semibold mb-2">Reset link problem</div>
          <div className="text-sm text-red-600 mb-4">{error}</div>
          <a className="inline-flex items-center rounded-lg bg-brand-orange text-white px-4 py-2"
             href="/activate">
            Send me a fresh link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border bg-white shadow p-6 space-y-4">
        <h1 className="text-xl font-bold">Choose a new password</h1>
        <label className="block">
          <span className="text-sm text-gray-700">New password</span>
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Confirm password</span>
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          className="w-full rounded bg-brand-blue text-white py-2 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
