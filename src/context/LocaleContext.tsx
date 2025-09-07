import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import i18n from "i18next";

type LocaleValue = {
  /** "auto" or a two-letter code like "en","ko","es" */
  selected: string;
  /** the effective locale we use for content queries (2-letter) */
  locale: string;
  /** legacy/alias setters for compatibility */
  setSelected: (v: string) => void;
  setLocale: (v: string) => void; // alias of setSelected
};

const Ctx = createContext<LocaleValue | null>(null);

const STORAGE_KEY = "md_locale";

/** Normalize to a two-letter lowercase code */
function toTwoLetter(input: string | undefined) {
  return (input || "en").slice(0, 2).toLowerCase();
}

/** Detect from i18next or browser */
function detectBrowserOrI18n() {
  const fromI18n = toTwoLetter(i18n?.language);
  const fromNav = toTwoLetter(typeof navigator !== "undefined" ? navigator.language : "en");
  return fromI18n || fromNav || "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Guard localStorage for SSR/build
  const initialSelected =
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "auto" : "auto";

  const [selected, _setSelected] = useState<string>(initialSelected);

  const locale = useMemo(
    () => (selected === "auto" ? detectBrowserOrI18n() : toTwoLetter(selected)),
    [selected]
  );

  const setSelected = (v: string) => _setSelected(v);
  const setLocale = (v: string) => _setSelected(v); // alias for older code

  // Persist selection safely
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, selected);
      } catch {
        /* ignore */
      }
    }
  }, [selected]);

  // Sync <html lang> and i18next
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", locale);
    }
    try {
      const target = selected === "auto" ? detectBrowserOrI18n() : locale;
      if (i18n?.changeLanguage && i18n.language !== target) {
        i18n.changeLanguage(target);
      }
    } catch {
      /* ignore if i18n not configured */
    }
  }, [selected, locale]);

  return (
    <Ctx.Provider value={{ selected, locale, setSelected, setLocale }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Compatibility aliases for older imports */
export { LocaleProvider as LanguageProvider };
export { useLocale as useLanguage };

/** Default export for flexibility */
export default LocaleProvider;
