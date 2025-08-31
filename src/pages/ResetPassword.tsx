// src/pages/ResetPassword.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

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
        const url = new URL(window.location.href);

        // --- A) Legacy implicit flow: tokens in hash (#access_token, #refresh_token)
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const hasHashTokens =
          !!hashParams.get('access_token') && !!hashParams.get('refresh_token');

        if (hasHashTokens) {
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          // Clean URL (remove hash)
          window.history.replaceState({}, document.title, url.pathname + url.search);
          if (error) throw error;
        } else {
          // --- B) PKCE recovery: /reset-password?type=recovery&code=...
          const type = url.searchParams.get('type');
          const code = url.searchParams.get('code');
          if (type === 'recovery' && code) {
            const { error } = await supabase.auth.exchangeCodeForSession(url.href);
            // Clean URL (remove query)
            window.history.replaceState({}, document.title, url.pathname);
            if (error) throw error;
          }
        }

        // Confirm we have a session before letting them set a new password
        const { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
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
          <a
            className="inline-flex items-center rounded-lg bg-brand-orange text-white px-4 py-2"
            href="/activate"
          >
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
