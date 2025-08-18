import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Trophy, Play, Brain, Crown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAnalytics } from '@/context/AnalyticsContext';
import { Link } from 'react-router-dom';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

export default function PaywallModal({ isOpen, onClose, feature }: PaywallModalProps) {
  const { user } = useAuth();
  const { track } = useAnalytics();

  const handlePaywallView = () => {
    track('paywall_view', { feature, user_type: user ? 'trial_expired' : 'guest' });
  };

  React.useEffect(() => {
    if (isOpen) {
      handlePaywallView();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center space-x-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            <span>Unlock Full Access</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              {user ? 
                'Your 7-day trial has ended. Upgrade to continue playing!' :
                'Sign in to unlock full access and start your free 7-day trial!'
              }
            </p>
            
            {!user && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                <Star className="h-3 w-3 mr-1" />
                Free 7-Day Trial
              </Badge>
            )}
          </div>

          <Card className="border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-center">What You're Missing:</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="text-sm">Daily trial quiz with points</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Trophy className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">Full Guess What game access</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Play className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Video shorts with quizzes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm">Points tracking & leaderboard</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col space-y-3">
            {!user ? (
              <Link to="/account" onClick={onClose}>
                <Button size="lg" className="w-full">
                  Start Free Trial
                </Button>
              </Link>
            ) : (
              <Link to="/pricing" onClick={onClose}>
                <Button size="lg" className="w-full">
                  View Pricing
                </Button>
              </Link>
            )}
            
            <Button variant="outline" onClick={onClose}>
              Maybe Later
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            No credit card required for trial
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}