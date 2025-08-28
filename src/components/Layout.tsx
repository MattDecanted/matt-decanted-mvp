import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Play, User, CreditCard, BookOpen, Brain, Joystick, Newspaper } from 'lucide-react';
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

  // Highlight exact match AND subpaths (e.g. /blog/* keeps Blog active)
  const isActive = (path: string) => {
    const p = location.pathname;
    if (p === path) return true;
    if (path !== '/' && p.startsWith(path + '/')) return true;
    return false;
  };

  const linkClass = (path: string) =>
    `flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              {/* Logo + Title Block */}
              <Link to="/" className="flex items-center space-x-3">
                <img
                  src="/Matt_decantednk.png"
                  alt="Matt Decanted Logo"
                  className="h-10 w-auto"
                />
                <div className="leading-tight">
                  <h1 className="text-xl font-bold text-foreground">Matt Decanted</h1>
                  <span className="text-sm text-muted-foreground -mt-1 block">
                    Wine Education
                  </span>
                </div>
              </Link>

              {/* Main Nav Links */}
              <nav className="hidden md:flex space-x-6">
                <Link to="/games/guess-what" className={linkClass('/games/guess-what')}>
                  <Trophy className="h-4 w-4" />
                  <span>Guess What</span>
                </Link>

                <Link to="/shorts" className={linkClass('/shorts')}>
                  <Play className="h-4 w-4" />
                  <span>Shorts</span>
                </Link>

                <Link to="/vocab" className={linkClass('/vocab')}>
                  <BookOpen className="h-4 w-4" />
                  <span>Vino Vocab</span>
                </Link>

                <Link to="/swirdle" className={linkClass('/swirdle')}>
                  <Brain className="h-4 w-4" />
                  <span>Swirdle</span>
                </Link>

                <Link to="/wine-options/solo" className={linkClass('/wine-options/solo')}>
                  <Joystick className="h-4 w-4" />
                  <span>Wine Options</span>
                </Link>

                <Link to="/blog" className={linkClass('/blog')}>
                  <Newspaper className="h-4 w-4" />
                  <span>Blog</span>
                </Link>

                <Link to="/pricing" className={linkClass('/pricing')}>
                  <CreditCard className="h-4 w-4" />
                  <span>Pricing</span>
                </Link>
              </nav>
            </div>

            {/* Right-side (User + Points) */}
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
