// src/pages/AccountPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, Trophy, Calendar, Mail, LogOut, Crown } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { toast } from 'sonner';
import { supabase, setSessionFromUrlFragment as setSessionFromHashStrict } from '@/lib/supabase';

/* ------------------------------ Helpers ---------------------------------- */
function adelaideNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Adelaide' }));
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function formatAdelaide(dt: Date): string {
  return dt.toLocaleString('en-AU', {
    timeZone: 'Australia/Adelaide',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Fallback: if a magic link lands directly on /account, finalize it here. */
function useFinalizeAuthIfNeeded() {
  const { hash, pathname, search } = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        if (hash.includes('error=')) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const desc = params.get('error_description') || 'Sign-in link is invalid or expired.';
          toast.error(decodeURIComponent(desc));
          history.replaceState({}, document.title, pathname);
          return;
        }

        const hasHashToken =
          hash.includes('access_token') ||
          hash.includes('refresh_token') ||
          hash.includes('type=magiclink');

        const code = url.searchParams.get('code');

        if (hasHashToken) {
          await setSessionFromHashStrict(); // sets session + cleans hash
          history.replaceState({}, document.title, pathname + search.replace(/\??$/, ''));
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          if (error) throw error;
          history.replaceState({}, document.title, pathname);
        }
      } catch (e) {
        console.error('[AccountPage] finalize auth failed:', e);
        toast.error('Could not complete sign-in. Please request a new link.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ------------------------------ Component -------------------------------- */
export default function AccountPage() {
  useFinalizeAuthIfNeeded();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, signOut } = useAuth();
  const { track } = useAnalytics();

  // points (guarded)
  const pointsCtx = usePoints?.();
  const totalPoints = (pointsCtx?.totalPoints ?? pointsCtx?.points ?? 0) as number;

  // session expiry (status banner)
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setExpiresAt(data.session?.expires_at ?? null);
    })();
  }, []);

  // trial status
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(true);
  const [trialError, setTrialError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user?.id) {
          setTrialLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('trial_started_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) {
          setTrialStartedAt(data?.trial_started_at ?? null);
          setTrialLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setTrialError(e?.message || 'Failed to load trial status.');
          setTrialLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Send magic link from here (forces correct redirect)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      toast.success('Check your email for the sign-in link.');
      track?.('signup_complete', { method: 'magic_link' });
      setEmail('');
    } catch (err) {
      console.error('Sign in error:', err);
      toast.error('Failed to send sign-in link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  /* ---------------------------- Unauthed view ----------------------------- */
  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <p className="text-muted-foreground">Enter your email to receive a magic sign-in link</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                  <Crown className="h-3 w-3 mr-1" />
                  Free 7-Day Trial
                </Badge>
                <p className="text-sm text-muted-foreground">Start your free trial instantly upon sign-in</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ------------------------- Trial state (server) ------------------------- */
  const nowADL = adelaideNow();
  const started = trialStartedAt ? new Date(trialStartedAt) : null;
  const ends = started ? addDays(started, 7) : null;
  const msLeft = started ? ends!.getTime() - nowADL.getTime() : 0;
  const daysLeft = started ? Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))) : null;
  const trialActive = started ? msLeft > 0 : false;

  /* --------------------------- Authed view --------------------------- */
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ✅ Signed-in status banner */}
      <div
        className={
          'rounded-md border px-3 py-2 text-sm ' +
          (user ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800')
        }
      >
        {user ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Signed in</span>
            <span>
              as <b>{user.email}</b>
            </span>
            {expiresAt ? (
              <span className="text-xs text-gray-600">
                (token expires {new Date(expiresAt * 1000).toLocaleString()})
              </span>
            ) : null}
          </div>
        ) : (
          <div>
            <span className="font-medium">Not signed in.</span>{' '}
            <a className="underline" href="/signin">
              Go to sign in
            </a>
          </div>
        )}
      </div>

      {/* Profile + quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Your Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500">Email</div>
              <div className="font-medium">{user.email}</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500">User ID</div>
              <div className="font-mono text-xs break-all">{user.id}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard" className="inline-flex items-center rounded border px-3 py-2 text-sm">
              <Trophy className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
            <Button variant="outline" onClick={async () => { await handleSignOut(); }}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Points & Trial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Number(totalPoints || 0)}</div>
            <div className="text-xs text-gray-500">Total points earned</div>
            <div className="mt-4">
              <Progress value={Math.min(100, Number(totalPoints || 0) % 100)} />
              <div className="text-xs mt-1 text-gray-500">Next reward at +100</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Trial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* trial state */}
            {trialLoading ? (
              <div className="text-sm text-gray-500">Loading trial status…</div>
            ) : trialError ? (
              <div className="text-sm text-red-600">{trialError}</div>
            ) : started ? (
              <>
                <div className="text-sm">
                  Started: <b>{formatAdelaide(started)}</b>
                </div>
                <div className="text-sm">
                  Ends: <b>{formatAdelaide(ends!)}</b>
                </div>
                <div className="text-sm">
                  Status:{' '}
                  {trialActive ? (
                    <Badge className="bg-green-600">Active ({daysLeft} day{daysLeft === 1 ? '' : 's'} left)</Badge>
                  ) : (
                    <Badge variant="secondary">Expired</Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm">Your free trial will start the first time you play.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
