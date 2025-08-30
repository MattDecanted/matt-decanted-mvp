// src/components/Layout.tsx
import * as React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Globe, Trophy, Flame, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { points } = usePoints?.() ?? { points: 0 }; // fallback safety
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  // Simple active style (no black pill), matches .site-nav in CSS
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "px-2 py-1 rounded-md transition-colors",
      "text-sm font-medium",
      "hover:text-brand",
      isActive && "text-brand"
    );

  return (
    <div className="min-h-screen flex flex-col">
      {/* thin brand top bar */}
      <div className="top-accent" />

      {/* Header */}
      <header className="site-header">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between">
            {/* Left: logo / brand */}
            <div className="flex items-center gap-3">
              <Link to="/" className="font-semibold text-gray-900">
                Matt Decanted
              </Link>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-5 site-nav">
              <NavLink to="/blog" className={linkClass}>Blog</NavLink>

              {/* Challenges group (just a link for now; swap to menu later) */}
              <NavLink
                to="/play"
                className={linkClass}
                end={false}
              >
                Challenges
              </NavLink>

              <NavLink to="/courses" className={linkClass}>Courses</NavLink>
              <NavLink to="/community" className={linkClass}>Community</NavLink>
              <NavLink to="/about" className={linkClass}>About</NavLink>
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            </nav>

            {/* Right cluster */}
            <div className="hidden md:flex items-center gap-2">
              {/* Language pill (visual only) */}
              <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700">
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
                <span>{Number(points || 0)}</span>
                <span className="mx-1 h-3 w-px bg-gray-200" />
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="tabular-nums">0</span>
              </Link>

              {/* Auth */}
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="btn-ghost"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link to="/signin" className="btn-ghost">Sign in</Link>
                  <Link to="/pricing" className="btn-primary">Sign Up</Link>
                </>
              )}
            </div>

            {/* Mobile: hamburger */}
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
              <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>Dashboard</NavLink>

              <div className="pt-2 flex items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700">
                  <Globe className="w-3.5 h-3.5" />
                  <span>EN</span>
                </div>
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
                  <button onClick={() => { setOpen(false); void signOut(); }} className="btn-ghost">
                    Sign out
                  </button>
                ) : (
                  <>
                    <Link to="/signin" onClick={() => setOpen(false)} className="btn-ghost">Sign in</Link>
                    <Link to="/pricing" onClick={() => setOpen(false)} className="btn-primary">Sign Up</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Page body */}
      <main className="flex-1">{children}</main>

      {/* (Optional) simple footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Matt Decanted
      </footer>
    </div>
  );
}
