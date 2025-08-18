import React, { useState } from 'react';
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

export default function AccountPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, signInWithEmail, signOut } = useAuth();
  const { totalPoints, trialDaysLeft, isTrialUser } = usePoints();
  const { track } = useAnalytics();

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

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Your Account</h1>
        <p className="text-muted-foreground">Track your progress and manage your trial</p>
      </div>

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
                  day: 'numeric'
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

        {/* Points Card */}
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

            {isTrialUser && trialDaysLeft !== null && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Trial Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {trialDaysLeft} days left
                  </span>
                </div>
                <Progress
                  value={((7 - trialDaysLeft) / 7) * 100}
                  className="h-2"
                />
              </div>
            )}

            {!isTrialUser && trialDaysLeft === null && (
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Trial will start when you save points from the daily quiz
                </p>
              </div>
            )}

            {!isTrialUser && trialDaysLeft === 0 && (
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <Crown className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive">
                  Your trial has ended
                </p>
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