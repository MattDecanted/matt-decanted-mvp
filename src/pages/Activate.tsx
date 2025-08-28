// src/pages/Activate.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function Activate() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    setErr(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + '/dashboard',
      },
    });

    setSending(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg('Check your email for a sign-in link.');
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <form onSubmit={sendMagicLink} className="w-full max-w-sm bg-white shadow rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-bold">Activate / Create Account</h1>

        {msg && <div className="text-sm p-3 rounded bg-green-50 text-green-700 border border-green-200">{msg}</div>}
        {err && <div className="text-sm p-3 rounded bg-red-50 text-red-700 border border-red-200">{err}</div>}

        <label className="block">
          <span className="text-sm text-gray-700">Email</span>
          <input
            type="email"
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-60"
          disabled={sending}
        >
          {sending ? 'Sending…' : 'Send magic link'}
        </button>

        <p className="text-xs text-gray-500">
          We’ll email you a sign-in link. Clicking it will create/activate your account.
        </p>

        <button
          type="button"
          className="w-full text-sm text-gray-700 underline"
          onClick={() => navigate('/signin')}
        >
          Prefer password? Sign in
        </button>
      </form>
    </div>
  );
}
