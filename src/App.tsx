// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// UI / Providers
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { PointsProvider } from '@/context/PointsContext';
import { AnalyticsProvider } from '@/context/AnalyticsContext';

// Layout & Pages
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import GuessWhatPage from '@/pages/GuessWhatPage';
import ShortsPage from '@/pages/ShortsPage';
import ShortDetailPage from '@/pages/ShortDetailPage';
import AccountPage from '@/pages/AccountPage';
import PricingPage from '@/pages/PricingPage';
import TrialQuizPage from '@/pages/TrialQuizPage';
import VinoVocabPage from "@/pages/VinoVocabPage";

// MVP additions
import TrialQuizWidget from '@/components/TrialQuizWidget';
import { supabase } from '@/lib/supabase';

const FN_SUBMIT = '/.netlify/functions/trial-quiz-attempt';
const PENDING_KEY = 'md_trial_pending';

// Renders HomePage with the Trial Quiz block above it
function HomeWithTrial() {
  return (
    <>
      <div className="mb-8">
        <TrialQuizWidget />
      </div>
      <HomePage />
    </>
  );
}

// When user lands on /account after magic-link, auto-submit any pending quiz
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
        // silent fail is fine for MVP; widget handles user-visible status
      }
    })();
  }, []);
  return null;
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
                <Route path="/games/guess-what" element={<GuessWhatPage />} />
                <Route path="/shorts" element={<ShortsPage />} />
                <Route path="/shorts/:slug" element={<ShortDetailPage />} />
                <Route path="/trial-quiz" element={<TrialQuizPage />} />
                <Route path="/vocab" element={<VinoVocabPage />} />

                <Route
                  path="/account"
                  element={
                    <>
                      <AutoResumeOnAccount />
                      <AccountPage />
                      <div>Fallback render</div> {/* 👈 Added for debug */}
                    </>
                  }
                />
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
