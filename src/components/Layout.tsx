// src/components/Layout.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Trophy,
  Play,
  User,
  CreditCard,
  BookOpen,
  Brain,
  Joystick,
  Newspaper,
  Menu,
  X,
} from 'lucide-react';
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
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Exact or subpath match (e.g., /blog/* keeps Blog active)
  const isActive = (path: string) => {
    const p = location.pathname;
    return p === path || (path !== '/' && p.startsWith(path + '/'));
  };

  // Bolt-like nav styling: soft text, subtle hover, clear active pill + underline
  const linkClass = (path: string) =>
    [
      'group relative flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
      isActive(path)
        ? [
            'text-gray-900 bg-white shadow-sm',
            // underline now renders because we set content
            "after:content-[''] after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-amber-500",
          ].join(' ')
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    ].join(' ');

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav — sticky, airy, Bolt-ish */}
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 md:gap-8">
              {/* Brand */}
              <Link to="/" className="flex items-center gap-3" onClick={closeMobile}>
                <img
                  src="/Matt_decantednk.png"
                  alt="Matt Decanted Logo"
                  className="h-10 w-auto"
                />
                <div className="leading-tight">
                  <h1 className="text-xl font-bold text-gray-900">Matt Decanted</h1>
                  <span className="text-sm text-gray-500 -mt-1 block">Wine Education</span>
                </div>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center space-x-2">
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
                <Link
                  to="/wine-options/multiplayer"
                  className={linkClass('/wine-options/multiplayer')}
                >
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

            {/* Right-side: points/trial + account button */}
            <div className="flex items-center gap-2">
              {/* Mobile hamburger */}
              <button
                className="md:hidden inline-flex items-center justify-center p-2 rounded hover:bg-gray-100"
                aria-label="Toggle menu"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {/* Points + Trial badges (keep!) */}
              {user && (
                <div className="hidden sm:flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
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

              <Link to="/account" onClick={closeMobile}>
                <Button
                  variant={isActive('/account') ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user ? 'Account' : 'Sign In'}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-white/95 backdrop-blur">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-2">
              {user && (
                <div className="flex items-center gap-2 pb-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
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

              <Link to="/games/guess-what" className={linkClass('/games/guess-what')} onClick={closeMobile}>
                <Trophy className="h-4 w-4" />
                <span>Guess What</span>
              </Link>
              <Link to="/shorts" className={linkClass('/shorts')} onClick={closeMobile}>
                <Play className="h-4 w-4" />
                <span>Shorts</span>
              </Link>
              <Link to="/vocab" className={linkClass('/vocab')} onClick={closeMobile}>
                <BookOpen className="h-4 w-4" />
                <span>Vino Vocab</span>
              </Link>
              <Link to="/swirdle" className={linkClass('/swirdle')} onClick={closeMobile}>
                <Brain className="h-4 w-4" />
                <span>Swirdle</span>
              </Link>
              <Link
                to="/wine-options/multiplayer"
                className={linkClass('/wine-options/multiplayer')}
                onClick={closeMobile}
              >
                <Joystick className="h-4 w-4" />
                <span>Wine Options</span>
              </Link>
              <Link to="/blog" className={linkClass('/blog')} onClick={closeMobile}>
                <Newspaper className="h-4 w-4" />
                <span>Blog</span>
              </Link>
              <Link to="/pricing" className={linkClass('/pricing')} onClick={closeMobile}>
                <CreditCard className="h-4 w-4" />
                <span>Pricing</span>
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
