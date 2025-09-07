// src/components/LanguageSwitcher.tsx
import React, { useEffect } from "react";
import { useLocale } from "@/context/LocaleContext";
import { useLocation, useNavigate } from "react-router-dom";

const LANGS = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
];

const CODES = new Set(LANGS.map(l => l.code));
const STORAGE_KEY = "md_locale";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();

  // Helper: set lang everywhere safely
  const applyLocale = (next: string, pushUrl = true) => {
    if (!CODES.has(next)) return;
    if (locale !== next) setLocale(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    try { document.documentElement.setAttribute("lang", next); } catch {}

    if (pushUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      // Preserve hash and all other params; replace to avoid history spam
      navigate(url.pathname + "?" + url.searchParams.toString() + url.hash, { replace: true });
    }
  };

  // 1) Pick up ?lang=xx and persist (only whitelisted codes)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qLang = params.get("lang");
    if (qLang && CODES.has(qLang) && qLang !== locale) {
      applyLocale(qLang, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // 2) On first load, fall back to saved or browser language
  useEffect(() => {
    if (locale) {
      // keep <html lang=""> updated if context already had a value
      try { document.documentElement.setAttribute("lang", locale); } catch {}
      return;
    }

    let next = "en";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && CODES.has(saved)) next = saved;
      else {
        const nav = (navigator?.language || navigator?.languages?.[0] || "en").slice(0, 2).toLowerCase();
        if (CODES.has(nav)) next = nav;
      }
    } catch {}

    applyLocale(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyLocale(e.target.value);
  };

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Choose language</span>
      <select
        value={locale || "en"}
        onChange={onChange}
        className="rounded-md border px-2 py-1 text-sm bg-white"
        aria-label="Choose language"
      >
        {LANGS.map(l => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
