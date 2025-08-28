// src/pages/SignIn.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn(email.trim(), password);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white shadow rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-bold">Sign in</h1>

        {error && (
          <div className="text-sm p-3 rounded bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-sm text-gray-700">Email</span>
          <input
            type="email"
            className="mt-1 w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">Password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="text-sm text-center text-gray-600">
          Don’t have an account?{' '}
          <Link to="/activate" className="text-blue-600 hover:text-blue-800">
            Activate / Create
          </Link>
        </div>
      </form>
    </div>
  );
}
