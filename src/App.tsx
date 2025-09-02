// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// ⬇️ lazy import for Swirdle Leaderboard page
const SwirdleLeaderboardPage = lazy(() => import('@/pages/SwirdleLeaderboardPage'));

// UI / Providers
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PointsProvider } from '@/context/PointsContext';
import { AnalyticsProvider } from '@/context/AnalyticsContext';

// Layout & Pages
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import About from '@/pages/About';
import SignIn from '@/pages/SignIn';
import ResetPassword from '@/pages/ResetPassword';
import Activate from '@/pages/Activate';

import GuessWhatPage from '@/pages/GuessWhatPage';
import ShortsPage from '@/pages/ShortsPage';
import ShortDetailPage from '@/pages/ShortDetailPage';
import AccountPage from '@/pages/AccountPage';
import PricingPage from '@/pages/PricingPage';

import DailyQuizPage from '@/pages/DailyQuiz';
import VinoVocabPage from '@/pages/VinoVocabPage';
import BrandedDemo from '@/pages/BrandedDemo';
import VocabChallengeManager from '@/pages/admin/VocabChallengeManager';
import QuizManager from '@/pages/admin/QuizManager';
import TrialQuizManager from '@/pages/admin/TrialQuizManager';
import Swirdle from '@/pages/Swirdle';
import SwirdleAdmin from '@/pages/admin/SwirdleAdmin';
import WineOptionsGame from '@/pages/WineOptionsGame';
import SoloWineOptions from '@/pages/SoloWineOptions';
import GamePage from '@/pages/GamePage';

import Dashboard from '@/pages/Dashboard';
import BadgesPage from '@/pages/BadgesPage';
import AccountBadges from '@/pages/AccountBadges';

import BlogIndex from '@/pages/blog/BlogIndex';
import HowToBecomeWinemaker from '@/pages/blog/HowToBecomeWinemaker';
import WSETLevel2Questions from '@/pages/blog/WSETLevel2Questions';
import WineTastingGuide from '@/pages/blog/WineTastingGuide';
import WineVocabularyQuiz from '@/pages/blog/WineVocabularyQuiz';

import DebugAuth from '@/pages/DebugAuth';
import { supabase } from '@/lib/supabase';

// ✅ Auth callback + optional URL debugger
import AuthCallbackPage from '@/pages/AuthCallbackPage';

const FN_SUBMIT = '/.netlify/functions/trial-quiz-attempt';
const PENDING_KEY = 'md_trial_pending';

/* ---------- Auto resume pending trial-quiz posts on Account ---------- */
function AutoResumeOnAccount() {
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (!uid) return;

        const raw = localStorage.getItem(PENDING_KEY);
        if (!raw) return;
        const pending = JSON.parse(raw);
        if (!pending?.quiz_id || !Array.isArray(pending?.selections)) return;

        await fetch(FN_SUBMIT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quiz_id: pending.quiz_id,
            locale: 'en',
            user_id: uid,
            selections: pending.selections,
          }),
        });

        localStorage.removeItem(PENDING_KEY);
      } catch {
        // silent for MVP
      }
    })();
  }, []);
  return null;
}

/* ---------- Route guards (simplified) ---------- */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  if ((profile as any)?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/* ---------- Error boundary ---------- */
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('App crash:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

function App() {
  React.useEffect(() => {
    window.addEventListener('error', (e) =>
      console.error('[window.error]', (e as any).error || (e as any).message)
    );
    window.addEventListener('unhandledrejection', (e: any) =>
      console.error('[unhandledrejection]', e?.reason || e)
    );
  }, []);

  return (
    <AnalyticsProvider>
      <AuthProvider>
        <PointsProvider>
          <Router>
            {/* ✅ Dedicated auth routes OUTSIDE Layout (so nothing interferes) */}
            <Routes>
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
            </Routes>

            <AppErrorBoundary>
              <Layout>
                {/* If you already have a Suspense wrapper, keep it.
                    Here we wrap routes that include lazy pages (like SwirdleLeaderboardPage). */}
                <Suspense fallback={<div className="p-6">Loading…</div>}>
                  <Routes>
                    {/* optional no-op for callback so the wildcard doesn't catch it */}
                    <Route path="/auth/callback" element={<></>} />

                    {/* Home */}
                    <Route path="/" element={<Home />} />

                    {/* Core info & auth */}
                    <Route path="/about" element={<About />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/sign-in" element={<Navigate to="/signin" replace />} />
                    <Route path="/activate" element={<Activate />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* ✅ Debug (public) */}
                    <Route path="/debug/auth" element={<DebugAuth />} />

                    {/* Blog */}
                    <Route path="/blog" element={<BlogIndex />} />
                    <Route path="/blog/how-to-become-winemaker" element={<HowToBecomeWinemaker />} />
                    <Route path="/blog/wset-level-2-questions" element={<WSETLevel2Questions />} />
                    <Route path="/blog/wine-tasting-guide" element={<WineTastingGuide />} />
                    <Route path="/blog/wine-vocabulary-quiz" element={<WineVocabularyQuiz />} />

                    {/* Games */}
                    <Route path="/games/guess-what" element={<GuessWhatPage />} />
                    <Route path="/swirdle" element={<Swirdle />} />
                    {/* ⬇️ NEW: Swirdle Leaderboard */}
                    <Route path="/swirdle/leaderboard" element={<SwirdleLeaderboardPage />} />
                    <Route path="/play" element={<GamePage />} />
                    <Route path="/game/:slug" element={<GamePage />} />

                     {/* Badges */}
                    <Route path="/badges" element={<BadgesPage />} />
                    <Route path="/account/badges" element={<AccountBadges />} />

                    {/* Shorts */}
                    <Route path="/shorts" element={<ShortsPage />} />
                    <Route path="/shorts/:slug" element={<ShortDetailPage />} />

                    {/* Daily Quiz */}
                    <Route path="/daily-quiz" element={<DailyQuizPage />} />
                    <Route path="/trial-quiz" element={<Navigate to="/daily-quiz" replace />} />

                    {/* Vocab */}
                    <Route path="/vocab" element={<VinoVocabPage />} />

                    {/* Admin (guarded) */}
                    <Route
                      path="/admin/vocab"
                      element={
                        <RequireAdmin>
                          <VocabChallengeManager />
                        </RequireAdmin>
                      }
                    />
                    <Route
                      path="/admin/quizzes"
                      element={
                        <RequireAdmin>
                          <QuizManager />
                        </RequireAdmin>
                      }
                    />
                    <Route
                      path="/admin/trial-quizzes"
                      element={
                        <RequireAdmin>
                          <TrialQuizManager />
                        </RequireAdmin>
                      }
                    />
                    <Route
                      path="/admin/swirdle"
                      element={
                        <RequireAdmin>
                          <SwirdleAdmin />
                        </RequireAdmin>
                      }
                    />

                    {/* Options */}
                    <Route path="/wine-options/solo" element={<SoloWineOptions />} />
                    <Route path="/wine-options/multiplayer" element={<WineOptionsGame />} />

                    {/* Dashboard / Account */}
                    <Route
                      path="/dashboard"
                      element={
                        <RequireAuth>
                          <Dashboard />
                        </RequireAuth>
                      }
                    />
                    <Route path="/Dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route
                      path="/account"
                      element={
                        <>
                          <AutoResumeOnAccount />
                          <AccountPage />
                        </>
                      }
                    />

                    {/* Pricing */}
                    <Route path="/pricing" element={<PricingPage />} />

                    {/* Legacy demo */}
                    <Route path="/demo" element={<BrandedDemo />} />

                    {/* 404 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </Layout>

              <Toaster />
            </AppErrorBoundary>
          </Router>
        </PointsProvider>
      </AuthProvider>
    </AnalyticsProvider>
  );
}

export default App;
