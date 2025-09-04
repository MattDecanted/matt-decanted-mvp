// src/context/LocaleContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import i18n from "i18next";

type LocaleValue = {
  /** "auto" or a two-letter code like "en","ko","es" */
  selected: string;
  /** the effective locale we use for content queries (2-letter) */
  locale: string;
  setSelected: (v: string) => void;
};

const Ctx = createContext<LocaleValue | null>(null);

const STORAGE_KEY = "md_locale";

function toTwoLetter(input: string | undefined) {
  return (input || "en").slice(0, 2).toLowerCase();
}

function detectBrowserOrI18n() {
  const fromI18n = toTwoLetter(i18n?.language);
  const fromNav = toTwoLetter(typeof navigator !== "undefined" ? navigator.language : "en");
  return fromI18n || fromNav || "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || "auto");

  const locale = useMemo(
    () => (selected === "auto" ? detectBrowserOrI18n() : toTwoLetter(selected)),
    [selected]
  );

  // persist + sync <html lang> + (optional) i18next
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selected);
  }, [selected]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", locale);
    }
    // keep i18next in sync, but allow "auto" to pick detected
    try {
      const target = selected === "auto" ? detectBrowserOrI18n() : locale;
      if (i18n?.changeLanguage) i18n.changeLanguage(target);
    } catch {
      /* ignore if i18n not configured */
    }
  }, [selected, locale]);

  return (
    <Ctx.Provider value={{ selected, locale, setSelected }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
