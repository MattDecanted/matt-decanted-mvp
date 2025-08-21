// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

// UI / Providers
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { PointsProvider } from '@/context/PointsContext';
import { AnalyticsProvider } from '@/context/AnalyticsContext';

// Layout & Pages
import Layout from '@/components/Layout';
import Home from '@/pages/Home';  // ✅ Corrected here
import GuessWhatPage from '@/pages/GuessWhatPage';
import ShortsPage from '@/pages/ShortsPage';
import ShortDetailPage from '@/pages/ShortDetailPage';
import AccountPage from '@/pages/AccountPage';
import PricingPage from '@/pages/PricingPage';
import TrialQuizPage from '@/pages/TrialQuizPage';
import VinoVocabPage from "@/pages/VinoVocabPage";
import BrandedDemo from '@/pages/BrandedDemo';
import VocabChallengeManager from '@/pages/admin/VocabChallengeManager';
import QuizManager from '@/pages/admin/QuizManager';
import TrialQuizManager from '@/pages/admin/TrialQuizManager';
import DashboardLite from './pages/DashboardLite';
import Swirdle from '@/pages/Swirdle'; // or '../pages/Swirdle' if you’re not using '@'

// MVP additions
import TrialQuizWidget from '@/components/TrialQuizWidget';
import { supabase } from '@/lib/supabase';

const FN_SUBMIT = '/.netlify/functions/trial-quiz-attempt';
const PENDING_KEY = 'md_trial_pending';

function HomeWithTrial() {
  return (
    <>
      <div className="mb-8">
        <TrialQuizWidget />
      </div>
      <Home />
    </>
  );
}

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
function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const [err, setErr] = React.useState<Error | null>(null);
  if (err) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Something went wrong</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{String(err.stack || err.message)}</pre>
      </div>
    );
  }
  return (
    <React.ErrorBoundary
      fallbackRender={({ error }) => {
        setErr(error as Error);
        return null;
      }}
    >
      {children}
    </React.ErrorBoundary>
  );
}

function App() {
  return (
    <AnalyticsProvider>
      <AuthProvider>
        <PointsProvider>
          <Router>
            <Layout>
              <Routes>
  <Route path="/" element={<HomeWithTrial />} />

  {/* Games */}
  <Route path="/games/guess-what" element={<GuessWhatPage />} />
  <Route path="/swirdle" element={
    <RouteErrorBoundary>
      <Swirdle />
    </RouteErrorBoundary>
  } />

  {/* Shorts */}
  <Route path="/shorts" element={<ShortsPage />} />
  <Route path="/shorts/:slug" element={<ShortDetailPage />} />

  {/* Trial & Vocab */}
  <Route path="/trial-quiz" element={<TrialQuizPage />} />
  <Route path="/vocab" element={<VinoVocabPage />} />

  {/* Admin */}
  <Route path="/admin/vocab" element={<VocabChallengeManager />} />
  <Route path="/admin/quizzes" element={<QuizManager />} />
  <Route path="/admin/trial-quizzes" element={<TrialQuizManager />} /> {/* ✅ renamed path */}

  {/* Dashboard / Account */}
  <Route path="/dashboard" element={<DashboardLite />} />
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
