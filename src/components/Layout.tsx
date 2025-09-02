// src/components/Layout.tsx
import * as React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Globe, Trophy, Flame, Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RHS_LOGO_SRC = "/public/Branding/Matt_decantednk.png"; // put your image in /public/brand/matt-avatar.png

const LANGS = [
  { id: "en-US", country: "US", label: "English" },
  { id: "ko-KR", country: "KR", label: "한국어" },
];

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

  const loc = useLocation();
  const hideChrome =
    loc.pathname.startsWith("/auth/callback") ||
    loc.pathname.startsWith("/reset-password");

  // Language selector
  const [langOpen, setLangOpen] = React.useState(false);
  const [lang, setLang] = React.useState<string>(() => localStorage.getItem("app_lang") || "en-US");
  const activeLang = React.useMemo(() => LANGS.find(l => l.id === lang) || LANGS[0], [lang]);

  React.useEffect(() => {
    document.documentElement.lang = (lang || "en-US").split("-")[0];
    localStorage.setItem("app_lang", lang);
  }, [lang]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const node = e.target as HTMLElement;
      if (!node.closest?.("#lang-popover") && !node.closest?.("#lang-button")) setLangOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  if (hideChrome) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="site-header relative bg-white"
        style={{ borderBottom: "0", boxShadow: "none" }} // 🔧 remove any inherited 1px line
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-3">
              <div className="leading-tight">
                <div className="font-semibold text-gray-900">Matt Decanted</div>
                <div className="-mt-0.5 text-[11px] text-amber-600">Wine Education</div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-5">
              <NavLink to="/blog" className={linkClass}>Blog</NavLink>
              <NavLink to="/play" className={linkClass}>Challenges</NavLink>
              <NavLink to="/swirdle" className={linkClass}>Swirdle</NavLink>
              <NavLink to="/swirdle/leaderboard" className={linkClass}>Leaderboard</NavLink>
              <NavLink to="/badges" className={linkClass}>Badges</NavLink>
              <NavLink to="/courses" className={linkClass}>Courses</NavLink>
              <NavLink to="/community" className={linkClass}>Community</NavLink>
              <NavLink to="/about" className={linkClass}>About</NavLink>
              <NavLink to="/pricing" className={linkClass}>Pricing</NavLink>
            </nav>

            {/* Right cluster */}
            <div className="hidden md:flex items-center gap-3">
              {/* Language */}
              <div className="relative">
                <button
                  id="lang-button"
                  onClick={() => setLangOpen(v => !v)}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="uppercase">{activeLang.country}</span>
                  <span>{activeLang.label}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>
                {langOpen && (
                  <div
                    id="lang-popover"
                    className="absolute right-0 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg z-20"
                  >
                    <div className="px-3 py-2 text-[10px] font-semibold text-gray-400">
                      Select language
                    </div>
                    {LANGS.map((l) => {
                      const active = l.id === lang;
                      return (
                        <button
                          key={l.id}
                          onClick={() => { setLang(l.id); setLangOpen(false); }}
                          className={cx(
                            "w-full flex items-center justify-between px-3 py-2 text-sm",
                            active ? "bg-amber-50 text-amber-800" : "hover:bg-gray-50 text-gray-700"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span className="uppercase text-xs text-gray-400">{l.country}</span>
                            <span>{l.label}</span>
                          </span>
                          {active && <span className="text-amber-500">•</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Points chip */}
              <Link
                to={user ? "/account" : "/signin"}
                className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs text-gray-800 hover:bg-amber-50"
                title="Your points"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="tabular-nums">{Number(points || 0)}</span>
                <span className="mx-1 h-3 w-px bg-amber-200" />
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="tabular-nums">0</span>
              </Link>

              {/* Auth */}
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link to="/signin" className="btn-ghost text-gray-700">Sign In</Link>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center rounded-lg px-4 py-2 font-semibold text-white bg-brand-orange shadow hover:opacity-95"
                  >
                    Sign Up
                  </Link>
                </>
              )}

              {/* RHS logo/avatar */}
              <Link to="/" className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 overflow-hidden bg-white">
                <img
                  src={RHS_LOGO_SRC}
                  alt="Matt Decanted"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    (e.currentTarget.parentElement as HTMLElement).textContent = "🍷";
                  }}
                />
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200"
              onClick={() => setOpen(v => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Soft-edged orange accent at the BOTTOM */}
        <div className="w-full">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full" />
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-3 space-y-2">
            <NavLink to="/blog" className={linkClass} onClick={() => setOpen(false)}>Blog</NavLink>
            <NavLink to="/play" className={linkClass} onClick={() => setOpen(false)}>Challenges</NavLink>
            <NavLink to="/swirdle" className={linkClass} onClick={() => setOpen(false)}>Swirdle</NavLink>
            <NavLink to="/swirdle/leaderboard" className={linkClass} onClick={() => setOpen(false)}>Leaderboard</NavLink>
            <NavLink to="/badges" className={linkClass} onClick={() => setOpen(false)}>Badges</NavLink>
            <NavLink to="/courses" className={linkClass} onClick={() => setOpen(false)}>Courses</NavLink>
            <NavLink to="/community" className={linkClass} onClick={() => setOpen(false)}>Community</NavLink>
            <NavLink to="/about" className={linkClass} onClick={() => setOpen(false)}>About</NavLink>
            <NavLink to="/pricing" className={linkClass} onClick={() => setOpen(false)}>Pricing</NavLink>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setLang(LANGS[(LANGS.findIndex(l => l.id === lang) + 1) % LANGS.length].id)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 bg-white"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="uppercase">{activeLang.country}</span>
                <span>{activeLang.label}</span>
              </button>

              <Link
                to={user ? "/account" : "/signin"}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs text-gray-800"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="tabular-nums">{Number(points || 0)}</span>
                <span className="mx-1 h-3 w-px bg-amber-200" />
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="tabular-nums">0</span>
              </Link>

              {user ? (
                <button
                  onClick={() => { setOpen(false); void signOut(); }}
                  className="inline-flex items-center rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link to="/signin" onClick={() => setOpen(false)} className="btn-ghost">Sign In</Link>
                  <Link
                    to="/pricing"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center rounded-lg px-4 py-2 font-semibold text-white bg-brand-orange shadow hover:opacity-95"
                  >
                    Sign Up
                  </Link>
                </>
              )}

              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 overflow-hidden bg-white"
              >
                <img
                  src={RHS_LOGO_SRC}
                  alt="Matt Decanted"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    (e.currentTarget.parentElement as HTMLElement).textContent = "🍷";
                  }}
                />
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Matt Decanted
      </footer>
    </div>
  );
}
