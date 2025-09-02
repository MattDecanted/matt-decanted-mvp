// src/components/Layout.tsx
import * as React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  Globe,
  Trophy,
  Flame,
  Menu,
  X,
  User as UserIcon,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, profile } = useAuth(); // ⬅️ profile expected to include display_name, avatar_url
  const { points } = usePoints?.() ?? { points: 0 };
  const [open, setOpen] = React.useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      "px-2 py-1 rounded-md transition-colors",
      "text-sm font-medium",
      "hover:text-brand",
      isActive && "text-brand"
    );

  // Hide chrome on auth-processing routes
  const loc = useLocation();
  const hideChrome =
    loc.pathname.startsWith("/auth/callback") ||
    loc.pathname.startsWith("/reset-password");

  // ---- derived display name
  const displayName =
    (profile as any)?.display_name ||
    (user?.user_metadata as any)?.full_name ||
    (user?.email ? user.email.split("@")[0] : "");

  // Small circle avatar (initial)
  const Avatar = ({ className = "h-6 w-6" }: { className?: string }) => {
    const letter = (displayName || user?.email || "?").slice(0, 1).toUpperCase();
    return (
      <div
        className={cx(
          "rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-semibold",
          className
        )}
        aria-hidden
      >
        {letter}
      </div>
    );
  };

  if (hideChrome) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* soft orange underline (bottom of header) */}
      <div className="top-accent" />

      {/* Header */}
      <header className="site-header">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between">
            {/* Left: primary nav */}
            <nav className="hidden md:flex items-center gap-5 site-nav">
              <NavLink to="/blog" className={linkClass}>
                Blog
              </NavLink>
              <NavLink to="/play" className={linkClass}>
                Challenges
              </NavLink>
              <NavLink to="/swirdle" className={linkClass}>
                Swirdle
              </NavLink>
              <NavLink to="/swirdle/leaderboard" className={linkClass}>
                Leaderboard
              </NavLink>
              <NavLink to="/badges" className={linkClass}>
                Badges
              </NavLink>
              <NavLink to="/courses" className={linkClass}>
                Courses
              </NavLink>
              <NavLink to="/community" className={linkClass}>
                Community
              </NavLink>
              <NavLink to="/about" className={linkClass}>
                About
              </NavLink>
              <NavLink to="/pricing" className={linkClass}>
                Pricing
              </NavLink>
            </nav>

            {/* Center spacer (keeps logo right-aligned) */}
            <div className="flex-1" />

            {/* Right: brand logo + controls */}
            <div className="hidden md:flex items-center gap-3">
              {/* Brand on RHS */}
              <a
                href="/"
                className="flex items-center gap-2 pr-2 border-r border-gray-200"
                title="Matt Decanted"
              >
                <img
                  src="https://cdn.jsdelivr.net/gh/mattdecanted/assets/md-logo-32.png"
                  alt="Matt Decanted"
                  className="h-7 w-7 rounded"
                />
                <div className="leading-tight text-right">
                  <div className="font-semibold text-gray-900">Matt Decanted</div>
                  <div className="-mt-0.5 text-[11px] text-brand-orange">Wine Education</div>
                </div>
              </a>

              {/* Language (placeholder for now; hook up i18n when ready) */}
              <div
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 bg-white"
                title="Language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>EN</span>
              </div>

              {/* Points pill */}
              <Link
                to={user ? "/account" : "/signin"}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800 hover:bg-gray-50"
                title="Your points"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="tabular-nums">{Number(points || 0)}</span>
                <span className="mx-1 h-3 w-px bg-gray-200" />
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="tabular-nums">0</span>
              </Link>

              {/* User cluster */}
              {user ? (
                <>
                  <Link
                    to="/account"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    title="Your account"
                  >
                    <Avatar />
                    <span className="max-w-[12ch] truncate">{displayName || "Account"}</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    title="Dashboard"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:opacity-95"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/signin" className="btn-ghost">
                    Sign In
                  </Link>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center rounded-lg px-4 py-2 font-semibold text-white bg-brand-orange shadow hover:opacity-95"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden border-t border-gray-200">
            <div className="mx-auto max-w-7xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <a href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                  <img
                    src="https://cdn.jsdelivr.net/gh/mattdecanted/assets/md-logo-32.png"
                    alt="Matt Decanted"
                    className="h-7 w-7 rounded"
                  />
                  <div className="leading-tight">
                    <div className="font-semibold text-gray-900">Matt Decanted</div>
                    <div className="-mt-0.5 text-[11px] text-brand-orange">Wine Education</div>
                  </div>
                </a>
                <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700">
                  <Globe className="w-3.5 h-3.5" />
                  <span>EN</span>
                </div>
              </div>

              <NavLink to="/blog" className={linkClass} onClick={() => setOpen(false)}>
                Blog
              </NavLink>
              <NavLink to="/play" className={linkClass} onClick={() => setOpen(false)}>
                Challenges
              </NavLink>
              <NavLink to="/swirdle" className={linkClass} onClick={() => setOpen(false)}>
                Swirdle
              </NavLink>
              <NavLink
                to="/swirdle/leaderboard"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                Leaderboard
              </NavLink>
              <NavLink to="/badges" className={linkClass} onClick={() => setOpen(false)}>
                Badges
              </NavLink>
              <NavLink to="/courses" className={linkClass} onClick={() => setOpen(false)}>
                Courses
              </NavLink>
              <NavLink to="/community" className={linkClass} onClick={() => setOpen(false)}>
                Community
              </NavLink>
              <NavLink to="/about" className={linkClass} onClick={() => setOpen(false)}>
                About
              </NavLink>
              <NavLink to="/pricing" className={linkClass} onClick={() => setOpen(false)}>
                Pricing
              </NavLink>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <Link
                  to={user ? "/account" : "/signin"}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span className="tabular-nums">{Number(points || 0)}</span>
                  <span className="mx-1 h-3 w-px bg-gray-200" />
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="tabular-nums">0</span>
                </Link>

                {user ? (
                  <>
                    <Link
                      to="/account"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800"
                    >
                      <Avatar />
                      <span className="max-w-[18ch] truncate">
                        {displayName || "Account"}
                      </span>
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={() => {
                        setOpen(false);
                        void signOut();
                      }}
                      className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/signin" onClick={() => setOpen(false)} className="btn-ghost">
                      Sign In
                    </Link>
                    <Link
                      to="/pricing"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center rounded-lg px-4 py-2 font-semibold text-white bg-brand-orange shadow hover:opacity-95"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Page body */}
      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Matt Decanted
      </footer>
    </div>
  );
}
