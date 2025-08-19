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
import { supabase } from '@/lib/supabase';

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

/** Fallback: if a magic link lands directly on /account, exchange it here. */
function useSupabaseMagicLinkExchange() {
  const { hash, search, pathname } = useLocation();

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const desc = params.get('error_description') || 'Sign-in link is invalid or expired.';
        toast.error(decodeURIComponent(desc));
        history.replaceState({}, document.title, pathname);
        return;
      }

      const hasHashToken =
        hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('type=magiclink');
      const hasCode = !!url.searchParams.get('code');
      if (!hasHashToken && !hasCode) return;

      const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
      if (error) {
        console.error('getSessionFromUrl error:', error);
        toast.error('Could not complete sign-in. Please request a new link.');
      }

      history.replaceState({}, document.title, pathname);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ------------------------------ Component -------------------------------- */
export default function AccountPage() {
  console.log('✅ AccountPage mounted');
  useSupabaseMagicLinkExchange();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signInWithEmail, signOut } = useAuth();
  const { totalPoints } = usePoints();
  const { track } = useAnalytics();

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await signInWithEmail(email);
      toast.success('Check your email for the sign-in link!');
      track('signup_complete', { method: 'magic_link' });
      setEmail('');
    } catch (error) {
      console.error('Sign in error:', error);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* You can keep everything below exactly as-is */}
      {/* ... */}
    </div>
  );
}
