// src/hooks/useLocalProgress.ts
import { useCallback, useEffect, useState } from "react";

type Dict<T> = Record<string, T>;

const KEY_SHORTS = "md_progress_shorts";
const KEY_LAST_SHORT = "md_last_short_slug";
const KEY_LAST_MODULE = "md_last_module_slug";

export function useShortProgress(slug: string | undefined) {
  const [percent, setPercent] = useState<number>(0);

  useEffect(() => {
    if (!slug) return;
    try {
      const map: Dict<number> = JSON.parse(localStorage.getItem(KEY_SHORTS) || "{}");
      setPercent(Number(map[slug] || 0));
    } catch { /* noop */ }
  }, [slug]);

  const update = useCallback((p: number) => {
    if (!slug) return;
    try {
      const map: Dict<number> = JSON.parse(localStorage.getItem(KEY_SHORTS) || "{}");
      map[slug] = Math.max(0, Math.min(100, Math.round(p)));
      localStorage.setItem(KEY_SHORTS, JSON.stringify(map));
      localStorage.setItem(KEY_LAST_SHORT, slug);
    } catch { /* noop */ }
    setPercent(p);
  }, [slug]);

  return { percent, setPercent: update };
}

export function getLastShortSlug(): string | null {
  try {
    return localStorage.getItem(KEY_LAST_SHORT);
  } catch {
    return null;
  }
}

export function setLastModuleSlug(slug: string) {
  try { localStorage.setItem(KEY_LAST_MODULE, slug); } catch { /* noop */ }
}

export function getLastModuleSlug(): string | null {
  try { return localStorage.getItem(KEY_LAST_MODULE); } catch { return null; }
}
