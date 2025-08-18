import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Trophy, Play, User, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePoints } from '@/context/PointsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { totalPoints, trialDaysLeft, isTrialUser } = usePoints();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">MD Trial Quiz</span>
              </Link>
              
              <nav className="hidden md:flex space-x-6">
                <Link
                  to="/games/guess-what"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/games/guess-what')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  <span>Guess What</span>
                </Link>
                
                <Link
                  to="/shorts"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/shorts')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Play className="h-4 w-4" />
                  <span>Shorts</span>
                </Link>
                
                <Link
                  to="/pricing"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/pricing')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pricing</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Trophy className="h-3 w-3" />
                    <span>{totalPoints} pts</span>
                  </Badge>
                  
                  {isTrialUser && trialDaysLeft !== null && (
                    <Badge variant="outline" className="text-xs">
                      Trial: {trialDaysLeft}d left
                    </Badge>
                  )}
                </div>
              )}
              
              <Link to="/account">
                <Button
                  variant={isActive('/account') ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {user ? 'Account' : 'Sign In'}
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}