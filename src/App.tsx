// src/App.tsx
import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

// ✅ Lazy where useful (keeps initial bundle small)
const SwirdleLeaderboardPage = lazy(() => import("@/pages/SwirdleLeaderboardPage"));

// UI / Providers
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PointsProvider } from "@/context/PointsContext";
import { AnalyticsProvider } from "@/context/AnalyticsContext";
import { LocaleProvider } from "@/context/LocaleContext";

// Layout & Pages
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import About from "@/pages/About";
import SignIn from "@/pages/SignIn";
import ResetPassword from "@/pages/ResetPassword";
import Activate from "@/pages/Activate";

import GuessWhatPage from "@/pages/GuessWhatPage";
import ShortsPage from "@/pages/ShortsPage";
import ShortDetailPage from "@/pages/ShortDetailPage";
import AccountPage from "@/pages/AccountPage";
import PricingPage from "@/pages/PricingPage";

import DailyQuizPage from "@/pages/DailyQuiz";
import VinoVocabPage from "@/pages/VinoVocabPage";
import BrandedDemo from "@/pages/BrandedDemo";
import VocabChallengeManager from "@/pages/admin/VocabChallengeManager";
import QuizManager from "@/pages/admin/QuizManager";
import TrialQuizManager from "@/pages/admin/TrialQuizManager";
import Swirdle from "@/pages/Swirdle";
import SwirdleAdmin from "@/pages/admin/SwirdleAdmin";
import WineOptionsGame from "@/pages/WineOptionsGame";
import SoloWineOptions from "@/pages/SoloWineOptions";
import GamePage from "@/pages/GamePage";

import Dashboard from "@/pages/Dashboard";
import BadgesPage from "@/pages/BadgesPage";
import Terms from "@/pages/Terms";

import AccountBadges from "@/pages/AccountBadges";

import BlogIndex from "@/pages/blog/BlogIndex";
import HowToBecomeWinemaker from "@/pages/blog/HowToBecomeWinemaker";
import WSETLevel2Questions from "@/pages/blog/WSETLevel2Questions";
import WineTastingGuide from "@/pages/blog/WineTastingGuide";
import WineVocabularyQuiz from "@/pages/blog/WineVocabularyQuiz";

import DebugAuth from "@/pages/DebugAuth";
import { supabase } from "@/lib/supabase";

// Auth callback
import AuthCallbackPage from "@/pages/AuthCallbackPage";

// Onboarding + modules
import Onboarding from "@/pages/Onboarding";
import ModulesIndex from "@/pages/ModulesIndex";
import ModuleDetail from "@/pages/ModuleDetail";

// Admin
import ContentGateManager from "@/pages/admin/ContentGateManager";
import UsersManager from "@/pages/admin/UsersManager";
import AdminGuessWhat from "@/pages/admin/AdminGuessWhat";
import ShortsManager from "@/pages/admin/ShortsManager";

const FN_SUBMIT = "/.netlify/functions/trial-quiz-attempt";
const PENDING_KEY = "md_trial_pending";

/* ---------- Small page wrapper (no-op, keeps your earlier JSX intact) ---------- */
function PageBoundary({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

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
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quiz_id: pending.quiz_id,
            locale: "en",
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

/** Onboarding guard: needs alias + terms_accepted_at (profiles.user_id) */
function RequireOnboarded({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (loading) {
        setOk(null);
        return;
      }
      if (!user) {
        setOk(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("alias, terms_accepted_at")
        .eq("user_id", user.id)
        .single();

      if (!active) return;

      if (error) {
        console.error("profiles check failed:", error);
        setOk(false);
        return;
      }

      const needsOnboarding = !data?.alias || !data?.terms_accepted_at;
      if (needsOnboarding && location.pathname !== "/onboarding") {
        setOk(false);
        window.location.replace("/onboarding"); // avoid child flash
      } else {
        setOk(true);
      }
    })();

    return () => {
      active = false;
    };
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

/** Admin guard — robust: checks context, user metadata, then DB (id OR user_id) */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (loading) return setAllowed(null);
      if (!user) return setAllowed(false);

      // 1) From context or auth metadata
      const roleFromCtx = (profile as any)?.role;
      const roleFromAuth = (user as any)?.user_metadata?.role;
      const quick =
        roleFromCtx === "admin" ||
        roleFromAuth === "admin" ||
        (profile as any)?.is_admin === true;

      if (quick) {
        if (active) setAllowed(true);
        return;
      }

      // 2) Fallback: DB check by id OR user_id
      const uid = user.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("role, is_admin")
        .or(`id.eq.${uid},user_id.eq.${uid}`)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("RequireAdmin profiles fetch failed:", error);
        setAllowed(false);
        return;
      }

      const ok = data?.role === "admin" || Boolean((data as any)?.is_admin);
      setAllowed(ok);
    })();

    return () => {
      active = false;
    };
  }, [user, profile, loading]);

  if (loading || allowed === null) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  if (!allowed) return <div className="p-6 text-sm text-red-600">Admins only.</div>;
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    // Helpful diagnostics in production
    window.addEventListener("error", (e) =>
      console.error("[window.error]", (e as any).error || (e as any).message)
    );
    window.addEventListener("unhandledrejection", (e: any) =>
      console.error("[unhandledrejection]", e?.reason || e)
    );
  }, []);

  return (
    <AnalyticsProvider>
      <AuthProvider>
        <PointsProvider>
          <LocaleProvider>
            <Router>
              {/* 🔒 Keep auth callback route outside Layout to avoid visual flash */}
              <Routes>
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
              </Routes>

              <AppErrorBoundary>
                {/* 🌐 Global Suspense protects ALL lazy chunks on any route */}
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                    </div>
                  }
                >
                  <Layout>
                    <Routes>
                      {/* Avoid double render inside Layout */}
                      <Route path="/auth/callback" element={<></>} />

                      {/* Onboarding */}
                      <Route path="/onboarding" element={<Onboarding />} />

                      {/* Public */}
                      <Route path="/" element={<Home />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/signin" element={<SignIn />} />
                      <Route path="/sign-in" element={<Navigate to="/signin" replace />} />
                      <Route path="/activate" element={<Activate />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/terms" element={<Terms />} />

                      {/* Debug */}
                      <Route path="/debug/auth" element={<DebugAuth />} />

                      {/* Blog */}
                      <Route path="/blog" element={<BlogIndex />} />
                      <Route path="/blog/how-to-become-winemaker" element={<HowToBecomeWinemaker />} />
                      <Route path="/blog/wset-level-2-questions" element={<WSETLevel2Questions />} />
                      <Route path="/blog/wine-tasting-guide" element={<WineTastingGuide />} />
                      <Route path="/blog/wine-vocabulary-quiz" element={<WineVocabularyQuiz />} />

                      {/* ✅ Legacy redirect so /guess-what works */}
                      <Route path="/guess-what" element={<Navigate to="/games/guess-what" replace />} />

                      {/* Games */}
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
                      <Route path="/swirdle/leaderboard" element={<SwirdleLeaderboardPage />} />
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

                      {/* Shorts (public list + detail) */}
                      <Route path="/shorts" element={<PageBoundary><ShortsPage /></PageBoundary>} />
                      <Route path="/shorts/:slug" element={<PageBoundary><ShortDetailPage /></PageBoundary>} />

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

                      {/* Admin: Guess What */}
                      <Route
                        path="/admin/guess-what"
                        element={
                          <RequireAdmin>
                            <AdminGuessWhat />
                          </RequireAdmin>
                        }
                      />

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

                      {/* Admin (other) */}
                      <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                      <Route
                        path="/admin/shorts"
                        element={
                          <RequireAdmin>
                            <ShortsManager />
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
                      <Route
                        path="/admin/content"
                        element={
                          <RequireAdmin>
                            <ContentGateManager />
                          </RequireAdmin>
                        }
                      />
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
                  </Layout>
                </Suspense>

                <Toaster />
              </AppErrorBoundary>
            </Router>
          </LocaleProvider>
        </PointsProvider>
      </AuthProvider>
    </AnalyticsProvider>
  );
}

/* ---------- Error boundary ---------- */
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: any; info: React.ErrorInfo | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error, info: null };
  }
  componentDidCatch(error: any, info: React.ErrorInfo) {
    this.setState({ info });
    console.error("[AppErrorBoundary]", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      const showDetails =
        import.meta.env.DEV || String(import.meta.env.VITE_DEBUG_ERRORS) === "1";
      return (
        <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          {!showDetails ? (
            <p className="text-sm text-gray-600">
              An error occurred. Enable details by setting <code>VITE_DEBUG_ERRORS=1</code> and redeploying.
            </p>
          ) : (
            <>
              <h2 className="font-semibold mt-4 mb-1">Error</h2>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
              </pre>
              {this.state.info?.componentStack && (
                <>
                  <h2 className="font-semibold mt-4 mb-1">Component stack</h2>
                  <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.info.componentStack}</pre>
                </>
              )}
            </>
          )}
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

export default App;
