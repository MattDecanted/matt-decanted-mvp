// src/components/Layout.tsx
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Globe, Trophy, Flame, Menu, X, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePoints } from "@/context/PointsContext";
import { useLocale } from "@/context/LocaleContext";
import { LangLink as Link, LangNavLink as NavLink } from "@/components/LangLink";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// ✅ change this if you have a different logo URL (or move to ENV)
const LOGO_URL =
  "https://matt-decanted.s3.ap-southeast-2.amazonaws.com/brand/matt-decanted-logo.png";

// Supported languages (keep in sync with your data)
const LANGS = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, profile } = useAuth();
  const pointsCtx = usePoints?.();
  const { selected, locale, setSelected } = useLocale(); // <- matches your LocaleContext
  const navigate = useNavigate();
  const loc = useLocation();

  // ---- Admin detection (ctx role, metadata role, or boolean flag) ----
  const isAdmin =
    (profile as any)?.role === "admin" ||
    (profile as any)?.is_admin === true ||
    ((user?.user_metadata as any)?.role === "admin");

  // Be flexible: accept totalPoints | points | balance
  const displayPoints = Number(
    (pointsCtx as any)?.totalPoints ??
      (pointsCtx as any)?.points ??
      (pointsCtx as any)?.balance ??
      0
  );
  const pointsLoading = Boolean((pointsCtx as any)?.loading);

  React.useEffect(() => {
    if (user?.id && (pointsCtx as any)?.refreshPoints) {
      (pointsCtx as any).refreshPoints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [open, setOpen] = React.useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      "px-2 py-1 rounded-md transition-colors",
      "text-sm font-medium",
      "no-underline border-b-0 hover:no-underline hover:text-brand",
      isActive && "text-brand"
    );

  const hideChrome =
    loc.pathname.startsWith("/auth/callback") ||
    loc.pathname.startsWith("/reset-password");

  // ---- Language handling ----
  // 1) Pick up ?lang=xx → set context + persist
  React.useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const qLang = params.get("lang");
    if (!qLang) return;
    const supported = LANGS.some((l) => l.code === qLang);
    if (supported && qLang !== selected) {
      setSelected(qLang);
      try {
        localStorage.setItem("md_locale", qLang);
      } catch {}
    }
  }, [loc.search, selected, setSelected]);

  // 2) Restore from localStorage on first mount if not set yet
  React.useEffect(() => {
    if (!selected) {
      try {
        const saved = localStorage.getItem("md_locale");
        setSelected(saved && LANGS.some((l) => l.code === saved) ? saved : "en");
      } catch {
        setSelected("en");
      }
    }
  }, [selected, setSelected]);

  // 3) Always keep ?lang in the URL on every route
  React.useEffect(() => {
    if (!locale) return;
    const params = new URLSearchParams(loc.search);
    if (params.get("lang") !== locale) {
      params.set("lang", locale);
      navigate(loc.pathname + "?" + params.toString(), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname, locale]);

  // 4) Handler for dropdown
  function handleLangChange(next: string) {
    setSelected(next);
    try {
      localStorage.setItem("md_locale", next);
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    navigate(url.pathname + "?" + url.searchParams.toString(), { replace: true });
  }

  // ---- SEO: prevent crawling of /admin routes ----
  React.useEffect(() => {
    const shouldNoIndex = loc.pathname.startsWith("/admin");
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(
        `meta[name="${name}"][data-dynamic="1"]`
      ) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        tag.setAttribute("data-dynamic", "1");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    const content = shouldNoIndex ? "noindex,nofollow" : "index,follow";
    setMeta("robots", content);
    setMeta("googlebot", content);
  }, [loc.pathname]);

  if (hideChrome) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // prefer display name if available
  const displayName =
    (profile as any)?.display_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="bg-white"
        style={{ borderBottom: "none", boxShadow: "none" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between">
            {/* Brand (far left) */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src={LOGO_URL}
                alt="Matt Decanted"
                className="h-8 w-auto block"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="leading-tight">
                <div className="font-semibold text-gray-900">Matt Decanted</div>
                <div className="-mt-0.5 text-[11px] text-orange-600">
                  Wine Education
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav
              className={cx(
                "hidden md:flex items-center gap-5",
                "[&_a]:no-underline [&_a]:border-b-0"
              )}
              style={{ borderBottom: "none" }}
            >
              <NavLink to="/blog" className={linkClass}>
                Blog
              </NavLink>
              <NavLink to="/shorts" className={linkClass}>
                Shorts
              </NavLink>
              <NavLink to="/modules" className={linkClass}>
                Modules
              </NavLink>
              <NavLink to="/challenges" className={linkClass}>
                Challenges
              </NavLink>
              <NavLink to="/about" className={linkClass}>
                About
              </NavLink>
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>

              {/* 🔒 Admin tab (only visible to admins) */}
              {isAdmin && (
                <NavLink to="/admin" className={linkClass} rel="nofollow">
                  Admin
                </NavLink>
              )}
            </nav>

            {/* Right cluster (desktop) */}
            <div className="hidden md:flex items-center gap-2">
              {/* Language switcher */}
              <label
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 bg-white"
                title="Language"
              >
                <Globe className="w-3.5 h-3.5" />
                <select
                  aria-label="Choose language"
                  className="bg-transparent outline-none"
                  value={locale || "en"}
                  onChange={(e) => handleLangChange(e.target.value)}
                >
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Points / streak pill */}
              <Link
                to={user ? "/account" : "/signin"}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800 hover:bg-gray-50"
                title="Your points"
                style={{ borderBottom: "none" }}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="tabular-nums">
                  {pointsLoading ? "…" : displayPoints}
                </span>
                <span className="mx-1 h-3 w-px bg-gray-200" />
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="tabular-nums">0</span>
              </Link>

              {/* User name (truncate) */}
              {user && (
                <span
                  className="text-xs text-gray-600 max-w-[180px] truncate"
                  title={displayName}
                >
                  {displayName}
                </span>
              )}

              {/* Sign in/out */}
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center rounded-md border border-green-600 bg-white px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                  title="Sign out"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Sign in
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

            {/* Right cluster (mobile): Account + Menu */}
            <div className="md:hidden flex items-center gap-2">
              <Link
                to={user ? "/account" : "/signin"}
                aria-label={user ? "Account" : "Sign in"}
                className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-white"
                onClick={() => setOpen(false)}
              >
                <User className="w-5 h-5 text-gray-800" />
              </Link>
              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-white"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {open ? <X className="w-5 h-5 text-gray-800" /> : <Menu className="w-5 h-5 text-gray-800" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {open && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 flex flex-col gap-1">
              <NavLink to="/blog" className={linkClass} onClick={() => setOpen(false)}>
                Blog
              </NavLink>
              <NavLink to="/shorts" className={linkClass} onClick={() => setOpen(false)}>
                Shorts
              </NavLink>
              <NavLink to="/modules" className={linkClass} onClick={() => setOpen(false)}>
                Modules
              </NavLink>
              <NavLink to="/challenges" className={linkClass} onClick={() => setOpen(false)}>
                Challenges
              </NavLink>
              <NavLink to="/about" className={linkClass} onClick={() => setOpen(false)}>
                About
              </NavLink>
              <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
                Dashboard
              </NavLink>

              {/* 🔒 Admin (mobile) */}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={linkClass}
                  rel="nofollow"
                  onClick={() => setOpen(false)}
                >
                  Admin
                </NavLink>
              )}

              <div className="my-2 h-px bg-gray-200" />

              {/* Language (mobile) */}
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <Globe className="w-4 h-4" />
                <select
                  aria-label="Choose language"
                  className="flex-1 rounded-md border border-gray-200 px-2 py-1"
                  value={locale || "en"}
                  onChange={(e) => handleLangChange(e.target.value)}
                >
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Points pill (mobile) */}
              <Link
                to={user ? "/account" : "/signin"}
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-800"
                onClick={() => setOpen(false)}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="tabular-nums">
                  {pointsLoading ? "…" : displayPoints}
                </span>
                <span className="mx-1 h-3 w-px bg-gray-200" />
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="tabular-nums">0</span>
              </Link>

              {/* Auth actions (mobile) */}
              <div className="mt-2 flex items-center gap-2">
                {user ? (
                  <button
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                    className="flex-1 inline-flex items-center justify-center rounded-md border border-green-600 bg-white px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50"
                  >
                    Sign out
                  </button>
                ) : (
                  <>
                    <Link
                      to="/signin"
                      onClick={() => setOpen(false)}
                      className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/pricing"
                      onClick={() => setOpen(false)}
                      className="flex-1 inline-flex items-center justify-center rounded-md bg-brand-orange px-3 py-2 text-xs font-semibold text-white shadow hover:opacity-95"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🍊 Orange underline */}
        <div
          className="w-full"
          style={{
            height: 6,
            background:
              "linear-gradient(to bottom, rgba(255,128,0,0.90), rgba(255,128,0,0.78))",
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
          }}
        />
      </header>

      {/* Page body — warmer canvas */}
      <main className="flex-1 bg-[linear-gradient(180deg,#ffffff,#fff8f5)]">
        {children}
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Matt Decanted
      </footer>
    </div>
  );
}
