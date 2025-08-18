import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { PointsProvider } from '@/context/PointsContext';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import GuessWhatPage from '@/pages/GuessWhatPage';
import ShortsPage from '@/pages/ShortsPage';
import ShortDetailPage from '@/pages/ShortDetailPage';
import AccountPage from '@/pages/AccountPage';
import PricingPage from '@/pages/PricingPage';
import { AnalyticsProvider } from '@/context/AnalyticsContext';

function App() {
  return (
    <AnalyticsProvider>
      <AuthProvider>
        <PointsProvider>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/games/guess-what" element={<GuessWhatPage />} />
                <Route path="/shorts" element={<ShortsPage />} />
                <Route path="/shorts/:slug" element={<ShortDetailPage />} />
                <Route path="/account" element={<AccountPage />} />
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