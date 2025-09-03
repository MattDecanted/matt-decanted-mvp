// src/App.tsx
import React, { Suspense, lazy, useEffect, useState } from 'react';
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
import Terms from '@/pages/Terms';

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

// ✅ NEW: Onboarding page (created in Step 5)
import Onboarding from '@/pages/Onboarding';

// ✅ NEW: Modules pages
import ModulesIndex from '@/pages/ModulesIndex';
import ModuleDetail from '@/pages/ModuleDetail';

// ✅ NEW: Admin Content Gate Manager
import ContentGateManager from '@/pages/admin/ContentGateManager';

// ✅ NEW: Admin Users Manager
import UsersManager from '@/pages/admin/UsersManager';

const FN_SUBMIT = '/.netlify/functions/trial-quiz-attempt';
const PENDING_KEY = 'md_trial_pending';

/* ---------- Auto resume pending trial-quiz posts on Account ---------- */
function AutoResumeOnAccount() {
  useEffect(() => {
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

/* ---------- Route guards ---------- */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  return <>{children}</>;
}

/** ✅ NEW: Onboarding guard
 * Sends signed-in users to /onboarding until they have an alias AND terms_accepted_at.
 */
function RequireOnboarded({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (loading) { setOk(null); return; }
      if (!user) { setOk(false); return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('alias, terms_accepted_at')
        .eq('id', user.id)
        .single();

      if (!active) return;

      if (error) {
        console.error('profiles check failed:', error);
        setOk(false);
        return;
      }

      const needsOnboarding = !data?.alias || !data?.terms_accepted_at;
      if (needsOnboarding && location.pathname !== '/onboarding') {
        setOk(false);
        // imperative redirect avoids rendering children flash
        window.location.replace('/onboarding');
      } else {
        setOk(true);
      }
    })();

    return () => { active = false; };
  }, [user, loading, location.pathname]);

  if (ok === null) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }
  return <>{ok ? children : null}</>;
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
  useEffect(() => {
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
            {/* ✅ Dedicated auth route OUTSIDE Layout (avoid header/layout interfering) */}
            <Routes>
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
            </Routes>

            <AppErrorBoundary>
              <Layout>
                {/* Wrap lazy pages (leaderboard) */}
                <Suspense fallback={<div className="p-6">Loading…</div>}>
                  <Routes>
                    {/* Optional no-op so wildcard doesn't catch it inside Layout */}
                    <Route path="/auth/callback" element={<></>} />

                    {/* ✅ NEW: Onboarding (public but typically reached when signed in) */}
                    <Route path="/onboarding" element={<Onboarding />} />

                    {/* Home (public) */}
                    <Route path="/" element={<Home />} />

                    {/* Core info & auth (public) */}
                    <Route path="/about" element={<About />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/sign-in" element={<Navigate to="/signin" replace />} />
                    <Route path="/activate" element={<Activate />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/terms" element={<Terms />} />

                    {/* Debug (public) */}
                    <Route path="/debug/auth" element={<DebugAuth />} />

                    {/* Blog (public) */}
                    <Route path="/blog" element={<BlogIndex />} />
                    <Route path="/blog/how-to-become-winemaker" element={<HowToBecomeWinemaker />} />
                    <Route path="/blog/wset-level-2-questions" element={<WSETLevel2Questions />} />
                    <Route path="/blog/wine-tasting-guide" element={<WineTastingGuide />} />
                    <Route path="/blog/wine-vocabulary-quiz" element={<WineVocabularyQuiz />} />

                    {/* Games (some public, some gated) */}
                    <Route
                      path="/games/guess-what"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <GuessWhatPage />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/swirdle"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <Swirdle />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />
                    {/* ⬇️ NEW: Swirdle Leaderboard (public view is fine) */}
                    <Route path="/swirdle/leaderboard" element={<SwirdleLeaderboardPage />} />
                    {/* Convenience redirect */}
                    <Route path="/leaderboard" element={<Navigate to="/swirdle/leaderboard" replace />} />
                    <Route
                      path="/play"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <GamePage />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/game/:slug"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <GamePage />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />

                    {/* Badges */}
                    <Route path="/badges" element={<BadgesPage />} />
                    <Route
                      path="/account/badges"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <AccountBadges />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />

                    {/* Shorts (public list + gated detail handled in page) */}
                    <Route path="/shorts" element={<ShortsPage />} />
                    <Route path="/shorts/:slug" element={<ShortDetailPage />} />

                    {/* Modules (gated) */}
                    <Route
                      path="/modules"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <ModulesIndex />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/modules/:slug"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <ModuleDetail />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />

                    {/* Daily Quiz (gated) */}
                    <Route
                      path="/daily-quiz"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <DailyQuizPage />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />
                    <Route path="/trial-quiz" element={<Navigate to="/daily-quiz" replace />} />

                    {/* Vocab (gated) */}
                    <Route
                      path="/vocab"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <VinoVocabPage />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />

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
                    {/* ✅ NEW: Admin Content Gate Manager */}
                    <Route
                      path="/admin/content"
                      element={
                        <RequireAdmin>
                          <ContentGateManager />
                        </RequireAdmin>
                      }
                    />
                    {/* ✅ NEW: Admin Users Manager */}
                    <Route
                      path="/admin/users"
                      element={
                        <RequireAdmin>
                          <UsersManager />
                        </RequireAdmin>
                      }
                    />

                    {/* Wine Options (gated) */}
                    <Route
                      path="/wine-options/solo"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <SoloWineOptions />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/wine-options/multiplayer"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <WineOptionsGame />
                          </RequireOnboarded>
                        </RequireAuth>
                      }
                    />

                    {/* Dashboard / Account */}
                    <Route
                      path="/dashboard"
                      element={
                        <RequireAuth>
                          <RequireOnboarded>
                            <Dashboard />
                          </RequireOnboarded>
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

                    {/* Pricing (public) */}
                    <Route path="/pricing" element={<PricingPage />} />

                    {/* Legacy demo (public) */}
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
