import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Crown, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';

const features = {
  free: [
    'Daily trial quiz preview',
    'Limited game access',
    'Basic point tracking',
  ],
  trial: [
    'Full daily quiz access',
    'All games unlocked',
    'Complete point system',
    'Progress tracking',
    '7 days free',
  ],
  pro: [
    'Everything in trial',
    'Advanced analytics',
    'Custom challenges',
    'Priority support',
    'Leaderboard access',
    'Achievement badges',
  ],
};

export default function PricingPage() {
  const { user } = useAuth();
  const { isTrialUser, trialDaysLeft } = usePoints();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Unlock your full learning potential with our quiz platform
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Free Plan */}
        <Card className="relative">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Free</CardTitle>
            <div className="text-3xl font-bold">$0</div>
            <p className="text-muted-foreground">Perfect for trying out</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full"
              disabled={!user}
            >
              {user ? 'Current Plan' : 'Sign Up Free'}
            </Button>
          </CardContent>
        </Card>

        {/* Trial Plan */}
        <Card className="relative border-primary shadow-lg">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Badge className="bg-primary text-primary-foreground px-4 py-1">
              Most Popular
            </Badge>
          </div>

          <CardHeader className="text-center pb-4 pt-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">7-Day Trial</CardTitle>
            <div className="text-3xl font-bold">Free</div>
            <p className="text-muted-foreground">Full access for 7 days</p>
            {isTrialUser && trialDaysLeft !== null && (
              <Badge variant="secondary" className="mt-2">
                {trialDaysLeft} days remaining
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {features.trial.map((feature, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              disabled={isTrialUser}
            >
              {isTrialUser ? 'Active Trial' : 'Start Free Trial'}
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="relative">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Pro</CardTitle>
            <div className="space-y-1">
              <div className="text-3xl font-bold">$9.99</div>
              <div className="text-sm text-muted-foreground">/month</div>
            </div>
            <p className="text-muted-foreground">For serious learners</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {features.pro.map((feature, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              variant="outline"
            >
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">How does the 7-day trial work?</h3>
            <p className="text-muted-foreground text-sm">
              Your trial starts when you save points from your first daily quiz. You'll have full access to all games and features for 7 days. No credit card required.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What happens after my trial ends?</h3>
            <p className="text-muted-foreground text-sm">
              You'll be moved to the free plan and can still access limited features. Your points and progress are preserved.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
            <p className="text-muted-foreground text-sm">
              Yes! The trial is completely free with no commitments. When Pro launches, you'll be able to cancel your subscription at any time.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How are points calculated?</h3>
            <p className="text-muted-foreground text-sm">
              Points are awarded based on quiz performance and game completion. Daily quizzes give 15 points, Guess What games up to 25 points (fewer clues = more points), and video quiz questions are worth 5 points each.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}