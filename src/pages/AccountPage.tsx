// src/pages/AccountPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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

export default function AccountPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, signInWithEmail, signOut } = useAuth();
  const { totalPoints } = usePoints(); // keep using your existing points total
  const { track } = useAnalytics();

  // --- New: server-truth trial status from profiles.trial_started_at ---
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

  // Unauthed view (unchanged)
  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <p className="text-muted-foreground">
              Enter your email to receive a magic sign-in link
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

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
                <p className="text-sm text-muted-foreground">
                  Start your free trial instantly upon sign-in
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compute trial state from server value
  const nowADL = adelaideNow();
  const started = trialStartedAt ? new Date(trialStartedAt) : null;
  const ends = started ? addDays(started, 7) : null;
  const msLeft = started ? ends!.getTime() - nowADL.getTime() : 0;
  const daysLeft = started ? Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))) : null;
  const trialActive = started ? msLeft > 0 : false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Your Account</h1>
        <p className="text-muted-foreground">Track your progress and manage your trial</p>
      </div>

      {/* NEW: Trial Status Card (server-truth) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            <span>Your 7-day Trial</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trialLoading ? (
            <div className="text-muted-foreground">Loading trial status…</div>
          ) : trialError ? (
            <div className="text-red-600">{trialError}</div>
          ) : !started ? (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-medium">Start your trial by playing today’s Daily Trial Quiz.</p>
                <p className="text-sm text-muted-foreground">
                  Your 7-day timer begins as soon as you bank your first points.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/trial-quiz"
                  className="inline-flex items-center rounded-lg border px-4 py-2 hover:bg-accent"
                >
                  Play Daily Quiz
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center rounded-lg border px-4 py-2 hover:bg-accent"
                >
                  See Plans
                </Link>
              </div>
            </div>
          ) : trialActive ? (
            <div className="space-y-2">
              <p>
                <span className="font-medium">Started:</span> {formatAdelaide(started)}
              </p>
              <p>
                <span className="font-medium">Ends:</span> {formatAdelaide(ends!)} ({daysLeft}{' '}
                day{daysLeft === 1 ? '' : 's'} left)
              </p>
              <div className="flex gap-2 pt-1">
                <Link
                  to="/trial-quiz"
                  className="inline-flex items-center rounded-lg border px-4 py-2 hover:bg-accent"
                >
                  Play today’s Daily Quiz
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center rounded-lg border px-4 py-2 hover:bg-accent"
                >
                  Upgrade to keep access
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-destructive">Your trial has ended.</p>
              <p className="text-sm text-muted-foreground">
                Ended on {formatAdelaide(ends!)}. Upgrade to continue unlimited access.
              </p>
              <Link
                to="/pricing"
                className="inline-flex items-center rounded-lg border px-4 py-2 hover:bg-accent"
              >
                See Plans
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{user.email}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Member Since</div>
              <div className="font-medium">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </CardContent>
        </Card>

        {/* Points & Progress Card (uses server-truth trial where available) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Points & Progress</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{totalPoints}</div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>

            {started && trialActive && daysLeft !== null && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Trial Progress</span>
                  <span className="text-sm text-muted-foreground">{daysLeft} days left</span>
                </div>
                <Progress value={((7 - daysLeft) / 7) * 100} className="h-2" />
              </div>
            )}

            {!started && (
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Trial will start when you save points from the Daily Quiz
                </p>
              </div>
            )}

            {started && !trialActive && (
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <Crown className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive">Your trial has ended</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Activity tracking coming soon!</p>
            <p className="text-sm">Keep playing games to build your history</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
