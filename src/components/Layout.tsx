// src/components/Layout.tsx
import * as React from "react";
import { NavLink, Link } from "react-router-dom";
import { Globe, Trophy, Flame, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { points } = usePoints?.() ?? { points: 0 };
  const [open, setOpen] = React.useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
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
            {/* Brand: two-line text logo */}
            <Link to="/" className="flex items-center gap-3">
              {/* (optional) place a small avatar/logo image here */}
              {/* <img src="/logo.svg" alt="" className="w-6 h-6 rounded-full" /> */}
              <div className="leading-tight">
                <div className="font-semibold text-gray-900">Matt Decanted</div>
                <div className="-mt-0.5 text-[11px] text-gray-500">
                  Wine Education
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-5 site-nav">
              <NavLink to="/blog" className={linkClass}>Blog</NavLink>
              <NavLink to="/play" className={linkClass}>Challenges</NavLink>
              <NavLink to="/courses" className={linkClass}>Courses</NavLink>
              <NavLink to="/community" className={linkClass}>Community</NavLink>
              <NavLink to="/about" className={linkClass}>About</NavLink>
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            </nav>

            {/* Right cluster */}
            <div className="hidden md:flex items-center gap-2">
              {/* Language pill */}
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
                <button onClick={() => signOut()} className="btn-ghost">
                  Sign out
                </button>
              ) : (
                <>
                  <Link to="/signin" className="btn-ghost">Sign in</Link>
                  {/* Orange sign up */}
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

      {/* Page body */}
      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Matt Decanted
      </footer>
    </div>
  );
}
