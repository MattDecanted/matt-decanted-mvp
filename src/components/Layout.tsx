import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Trophy, Flame, Globe, Menu, X, ChevronDown, User, LogOut, LayoutDashboard, BookOpen, Brain } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";

/** Simple active link styling */
function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 text-sm font-medium rounded-md transition ${
          isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, startTrial } = useAuth();
  const { totalPoints = 0, currentStreak = 0 } = usePoints?.() ?? ({} as any);
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);
  const [acctOpen, setAcctOpen] = React.useState(false);
  const [challOpen, setChallOpen] = React.useState(false);

  const lang = React.useMemo(
    () => (localStorage.getItem("md_lang") || "en").toUpperCase(),
    []
  );

  function setLang(next: string) {
    localStorage.setItem("md_lang", next);
    setLangOpen(false);
    // optional: broadcast to your i18n context if you add one later
    window.dispatchEvent(new CustomEvent("md:lang", { detail: next }));
  }

  const isTrial = profile?.subscription_status === "trial";
  const trialEnds = profile?.trial_expires_at
    ? new Date(profile.trial_expires_at).toLocaleDateString()
    : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Left: brand + primary nav */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-gray-50"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="font-semibold text-gray-900">
              Matt Decanted
            </Link>

            <nav className="hidden lg:flex items-center gap-1 ml-2">
              <NavItem to="/blog">Blog</NavItem>

              {/* Challenges dropdown */}
              <div className="relative">
                <button
                  onClick={() => setChallOpen((v) => !v)}
                  onBlur={(e) => {
                    // close when focus leaves
                    if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                      setChallOpen(false);
                    }
                  }}
                  className="px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 inline-flex items-center gap-1"
                >
                  Challenges <ChevronDown className="h-4 w-4" />
                </button>
                {challOpen && (
                  <div className="absolute mt-1 w-48 rounded-md border bg-white shadow-lg p-1">
                    <Link
                      to="/swirdle"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50"
                      onClick={() => setChallOpen(false)}
                    >
                      <Brain className="h-4 w-4" /> Swirdle
                    </Link>
                    <Link
                      to="/trial-quiz"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50"
                      onClick={() => setChallOpen(false)}
                    >
                      <BookOpen className="h-4 w-4" /> Daily Quiz
                    </Link>
                    <Link
                      to="/vocab"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50"
                      onClick={() => setChallOpen(false)}
                    >
                      <BookOpen className="h-4 w-4" /> Vino Vocab
                    </Link>
                  </div>
                )}
              </div>

              <NavItem to="/shorts">Courses</NavItem>
              {/* If you add a /community route later, change this link */}
              <NavItem to="/shorts">Community</NavItem>
              <NavItem to="/about">About</NavItem>
              <NavItem to="/dashboard">Dashboard</NavItem>
            </nav>
          </div>

          {/* Right: language + points + account */}
          <div className="flex items-center gap-2">
            {/* Trial badge */}
            {isTrial && (
              <button
                onClick={() => startTrial(7)}
                className="hidden md:inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800"
                title={trialEnds ? `Trial ends ${trialEnds}` : "7-day trial"}
              >
                Trial
              </button>
            )}

            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md border hover:bg-gray-50"
              >
                <Globe className="h-4 w-4" />
                {lang}
                <ChevronDown className="h-4 w-4" />
              </button>
              {langOpen && (
                <div
                  className="absolute right-0 mt-1 w-28 rounded-md border bg-white shadow-lg p-1"
                  onMouseLeave={() => setLangOpen(false)}
                >
                  {["EN", "FR", "DE", "ES"].map((code) => (
                    <button
                      key={code}
                      onClick={() => setLang(code.toLowerCase())}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 ${
                        code === lang ? "font-semibold" : ""
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Points/streak */}
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md bg-gray-100">
              <span className="inline-flex items-center gap-1 text-sm">
                <Trophy className="h-4 w-4 text-amber-600" />
                {totalPoints ?? 0}
              </span>
              <span className="text-gray-300">|</span>
              <span className="inline-flex items-center gap-1 text-sm">
                <Flame className="h-4 w-4 text-orange-600" />
                {currentStreak ?? 0}
              </span>
            </div>

            {/* Account */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setAcctOpen((v) => !v)}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-md border hover:bg-gray-50"
                >
                  <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                    {profile?.full_name?.[0]?.toUpperCase() ??
                      user.email?.[0]?.toUpperCase() ??
                      "U"}
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {acctOpen && (
                  <div
                    className="absolute right-0 mt-1 w-52 rounded-md border bg-white shadow-lg p-1"
                    onMouseLeave={() => setAcctOpen(false)}
                  >
                    <div className="px-3 py-2 text-xs text-gray-500">
                      {profile?.full_name || user.email}
                      {isTrial && trialEnds && (
                        <div className="mt-1">
                          <span className="inline-flex items-center text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Trial until {trialEnds}
                          </span>
                        </div>
                      )}
                    </div>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50"
                      onClick={() => setAcctOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link
                      to="/account"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50"
                      onClick={() => setAcctOpen(false)}
                    >
                      <User className="h-4 w-4" /> Account
                    </Link>
                    <button
                      onClick={async () => {
                        setAcctOpen(false);
                        await signOut();
                        navigate("/signin");
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/signin"
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm hover:bg-black"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-gray-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-2 pb-3 space-y-1">
              <NavLink
                to="/blog"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Blog
              </NavLink>

              <div className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                Challenges
              </div>
              <Link
                to="/swirdle"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Swirdle
              </Link>
              <Link
                to="/trial-quiz"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Daily Quiz
              </Link>
              <Link
                to="/vocab"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Vino Vocab
              </Link>

              <Link
                to="/shorts"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Courses
              </Link>
              <Link
                to="/shorts"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Community
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-gray-100"
              >
                About
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Dashboard
              </Link>

              {/* Points & streak */}
              <div className="mt-3 px-3 py-2 rounded-md bg-gray-50 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-sm">
                  <Trophy className="h-4 w-4 text-amber-600" /> {totalPoints ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 text-sm">
                  <Flame className="h-4 w-4 text-orange-600" /> {currentStreak ?? 0}
                </span>
              </div>

              {/* Auth shortcuts */}
              <div className="px-3 py-2">
                {user ? (
                  <div className="flex gap-2">
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 text-center px-3 py-2 rounded border hover:bg-gray-50"
                    >
                      Account
                    </Link>
                    <button
                      onClick={async () => {
                        setMobileOpen(false);
                        await signOut();
                        navigate("/signin");
                      }}
                      className="flex-1 text-center px-3 py-2 rounded bg-gray-900 text-white"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/signin"
                    onClick={() => setMobileOpen(false)}
                    className="block text-center px-3 py-2 rounded bg-gray-900 text-white"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main>{children}</main>

      {/* Footer (simple) */}
      <footer className="border-t mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm text-gray-500 flex items-center justify-between">
          <div>© {new Date().getFullYear()} Matt Decanted</div>
          <div className="flex items-center gap-3">
            <Link to="/about" className="hover:underline">About</Link>
            <Link to="/pricing" className="hover:underline">Pricing</Link>
            <a href="mailto:hello@matdecanted.example" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
