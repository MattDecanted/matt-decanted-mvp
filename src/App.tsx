// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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
import Activate from '@/pages/Activate';

import GuessWhatPage from '@/pages/GuessWhatPage';
import ShortsPage from '@/pages/ShortsPage';
import ShortDetailPage from '@/pages/ShortDetailPage';
import AccountPage from '@/pages/AccountPage';
import PricingPage from '@/pages/PricingPage';
import TrialQuizPage from '@/pages/TrialQuizPage';
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

import { supabase } from '@/lib/supabase';

const FN_SUBMIT = '/.netlify/functions/trial-quiz-attempt';
const PENDING_KEY = 'md_trial_pending';

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
        // silent fail is fine for MVP
      }
    })();
  }, []);
  return null;
}

/** ✅ RequireAuth wrapper */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

/** ✅ Safe error boundary for routes */
class RouteErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('Route error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

function App() {
  return (
    <AnalyticsProvider>
      <AuthProvider>
        <PointsProvider>
          <Router>
            <Layout>
              <Routes>
                {/* Home */}
                <Route path="/" element={<Home />} />

                {/* Core info & auth */}
                <Route path="/about" element={<About />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/sign-in" element={<Navigate to="/signin" replace />} />
                <Route path="/activate" element={<Activate />} />

                {/* Games */}
                <Route path="/games/guess-what" element={<GuessWhatPage />} />
                <Route
                  path="/swirdle"
                  element={
                    <RouteErrorBoundary>
                      <Swirdle />
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/play"
                  element={
                    <RouteErrorBoundary>
                      <GamePage />
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/game/:slug"
                  element={
                    <RouteErrorBoundary>
                      <GamePage />
                    </RouteErrorBoundary>
                  }
                />

                {/* Shorts */}
                <Route path="/shorts" element={<ShortsPage />} />
                <Route path="/shorts/:slug" element={<ShortDetailPage />} />

                {/* Trial & Vocab */}
                <Route path="/trial-quiz" element={<TrialQuizPage />} />
                <Route path="/vocab" element={<VinoVocabPage />} />

                {/* Admin */}
                <Route path="/admin/vocab" element={<VocabChallengeManager />} />
                <Route path="/admin/quizzes" element={<QuizManager />} />
                <Route path="/admin/trial-quizzes" element={<TrialQuizManager />} />
                <Route path="/admin/swirdle" element={<SwirdleAdmin />} />

                {/* Options (solo/multiplayer) */}
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

                {/* (Optional) Legacy demo route */}
                <Route path="/demo" element={<BrandedDemo />} />

                {/* 404 fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
            <Toaster />
          </Router>
        </PointsProvider>
      </AuthProvider>
    </AnalyticsProvider>
  );
}

export default App;
