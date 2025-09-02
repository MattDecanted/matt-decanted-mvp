import * as React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Globe, Trophy, Flame, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  // ⬇️ Read any of: totalPoints | points | balance, and refresh after login
  const pointsCtx = usePoints?.();
  const displayPoints = Number(
    (pointsCtx as any)?.totalPoints ??
      (pointsCtx as any)?.points ??
      (pointsCtx as any)?.balance ??
      0
  );
  const pointsLoading = Boolean((pointsCtx as any)?.loading);

  React.useEffect(() => {
    // refresh when user changes (no-op if provider already does this)
    if (user?.id && (pointsCtx as any)?.refreshPoints) {
      (pointsCtx as any).refreshPoints();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (hideChrome) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="site-header">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between">
            {/* Brand (far-left) */}
            <Link to="/" className="flex items-center gap-3">
              {/* Logo image (kept inline so the URL can be updated easily) */}
              <img
                src="https://matt-decanted.s3.ap-southeast-2.amazonaws.com/brand/matt-decanted-logo.png"
                alt="Matt Decanted"
                className="h-8 w-auto"
              />
              <div className="leading-tight">
                <div className="font-semibold text-gray-900">Matt Decanted</div>
                <div className="-mt-0.5 text-[11px] text-orange-600">Wine Education</div>
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
              {/* Language (no-op for now) */}
              <div
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700"
                title="Language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>EN</span>
              </div>

              {/* Points / streak pill */}
              <Link
                to={user ? "/account" : "/signin"}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800 hover:bg-gray-50"
                title="Your points"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="tabular-nums">
                  {pointsLoading ? "…" : displayPoints}
                </span>
                <span className="mx-1 h-3 w-px bg-gray-200" />
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="tabular-nums">0</span>
              </Link>

              {/* Username (if you want to show it) */}
              {user?.email && (
                <span className="text-xs text-gray-600 max-w-[180px] truncate" title={user.email}>
                  {user.email}
                </span>
              )}

              {user ? (
                // ⬇️ Easier to read per your request (green/orange on white)
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center rounded-md border border-green-600 bg-white px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                >
                  Sign out
                </button>
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

        {/* Orange underline (under the menu, softer + slightly darker) */}
        <div
          style={{
            height: 4,
            background:
              "linear-gradient(to bottom, rgba(255,128,0,0.85), rgba(255,128,0,0.75))",
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6,
          }}
        />
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
                  <span className="tabular-nums">
                    {pointsLoading ? "…" : displayPoints}
                  </span>
                  <span className="mx-1 h-3 w-px bg-gray-200" />
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="tabular-nums">0</span>
                </Link>
                {user ? (
                  <button
                    onClick={() => { setOpen(false); void signOut(); }}
                    className="inline-flex items-center rounded-md border border-green-600 bg-white px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                  >
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
