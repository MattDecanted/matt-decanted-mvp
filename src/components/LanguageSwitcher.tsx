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

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();

  // 1) Pick up ?lang=xx (and persist)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qLang = params.get("lang");
    if (qLang) {
      setLocale(qLang);
      localStorage.setItem("md_locale", qLang);
    }
  }, [location.search, setLocale]);

  // 2) On load, fall back to saved locale
  useEffect(() => {
    if (!locale) {
      const saved = localStorage.getItem("md_locale") || "en";
      setLocale(saved);
    }
  }, [locale, setLocale]);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setLocale(next);
    localStorage.setItem("md_locale", next);

    // keep current path, update ?lang= for shareable links
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    navigate(url.pathname + "?" + url.searchParams.toString(), { replace: true });
  };

  return (
    <select
      value={locale || "en"}
      onChange={onChange}
      className="rounded-md border px-2 py-1 text-sm"
      aria-label="Choose language"
    >
      {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  );
}
