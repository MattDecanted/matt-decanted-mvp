import * as React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Globe, Trophy, Flame, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const LOGO_URL =
  import.meta.env.VITE_BRAND_LOGO_URL ||
  "/md-logo.svg"; // set VITE_BRAND_LOGO_URL to your hosted logo URL

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, profile } = useAuth() as any;
  const { points } = usePoints?.() ?? { points: 0 };
  const [open, setOpen] = React.useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      "px-2 py-1 rounded-md transition-colors",
      "text-sm font-medium",
      "hover:text-brand",
      isActive && "text-brand"
    );

  const loc = useLocation();
  const hideChrome =
    loc.pathname.startsWith("/auth/callback") ||
    loc.pathname.startsWith("/reset-password");

  if (hideChrome) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  const displayName =
    profile?.display_name || user?.user_metadata?.full_name || user?.email;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="site-header">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between">
            {/* Far-left brand cluster: text (LHS) + logo (RHS) */}
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <div className="text-right leading-tight">
                <div className="font-semibold text-gray-900">Matt Decanted</div>
                <div className="-mt-0.5 text-[11px] text-orange-600">
                  Wine Education
                </div>
              </div>
              <img
                src={LOGO_URL}
                alt="Matt Decanted"
                className="h-7 w-auto"
                onError={(e) => {
                  // fail-safe so missing asset doesn't break layout
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </Link>

            {/* Desktop nav (removed Swirdle Leaderboard link here) */}
            <nav className="hidden md:flex items-center gap-5">
              <NavLink to="/blog" className={linkClass}>Blog</NavLink>
              <NavLink to="/play" className={linkClass}>Challenges</NavLink>
              <NavLink to="/courses" className={linkClass}>Courses</NavLink>
              <NavLink to="/community" className={linkClass}>Community</NavLink>
              <NavLink to="/about" className={linkClass}>About</NavLink>
              <NavLink to="/pricing" className={linkClass}>Pricing</NavLink>
            </nav>

            {/* Right cluster */}
            <div className="hidden md:flex items-center gap-2">
              {/* language */}
              <details className="group relative">
                <summary className="list-none inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 cursor-pointer">
                  <Globe className="w-3.5 h-3.5" />
                  <span>US English</span>
                </summary>
                <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white p-2 shadow z-50">
                  <button className="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-50">
                    English
                  </button>
                  <button className="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-50">
                    한국어
                  </button>
                </div>
              </details>

              {/* points / streak chip */}
              <Link
                to={user ? "/account" : "/signin"}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800 hover:bg-gray-50"
                title="Your points"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>{Number(points || 0)}</span>
                <span className="mx-1 h-3 w-px bg-gray-200" />
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="tabular-nums">0</span>
              </Link>

              {/* account / sign in/out */}
              {user ? (
                <>
                  <Link
                    to="/account"
                    className="btn-ghost"
                    title="Your account"
                  >
                    {displayName}
                  </Link>
                  <button onClick={() => signOut()} className="btn-brand-outline">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/signin" className="btn-ghost">Sign in</Link>
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
              <NavLink to="/blog" className={linkClass} onClick={() => setOpen(false)}>Blog</NavLink>
              <NavLink to="/play" className={linkClass} onClick={() => setOpen(false)}>Challenges</NavLink>
              <NavLink to="/courses" className={linkClass} onClick={() => setOpen(false)}>Courses</NavLink>
              <NavLink to="/community" className={linkClass} onClick={() => setOpen(false)}>Community</NavLink>
              <NavLink to="/about" className={linkClass} onClick={() => setOpen(false)}>About</NavLink>
              <NavLink to="/pricing" className={linkClass} onClick={() => setOpen(false)}>Pricing</NavLink>

              <div className="pt-2 flex items-center gap-2">
                <details className="group relative">
                  <summary className="list-none inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 cursor-pointer">
                    <Globe className="w-3.5 h-3.5" />
                    <span>US English</span>
                  </summary>
                  <div className="absolute left-0 mt-2 w-40 rounded-md border bg-white p-2 shadow z-50">
                    <button className="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-50">
                      English
                    </button>
                    <button className="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-50">
                      한국어
                    </button>
                  </div>
                </details>

                <Link
                  to={user ? "/account" : "/signin"}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>{Number(points || 0)}</span>
                  <span className="mx-1 h-3 w-px bg-gray-200" />
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="tabular-nums">0</span>
                </Link>

                {user ? (
                  <>
                    <Link to="/account" onClick={() => setOpen(false)} className="btn-ghost">
                      {displayName}
                    </Link>
                    <button
                      onClick={() => {
                        setOpen(false);
                        void signOut();
                      }}
                      className="btn-brand-outline"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/signin" onClick={() => setOpen(false)} className="btn-ghost">
                      Sign in
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

      {/* Darker/softer orange underline BELOW the header */}
      <div className="header-underline" />

      {/* Page body */}
      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Matt Decanted
      </footer>
    </div>
  );
}
