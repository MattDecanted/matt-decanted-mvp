// src/lib/locale.ts
export function getLocaleCandidates(pref?: string | null) {
  // 1) explicit user preference (profile.locale), 2) browser, 3) base language, 4) 'en'
  const browser = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : null;

  const raw = [pref, browser].filter(Boolean) as string[];
  const out: string[] = [];

  for (const loc of raw) {
    const norm = loc.trim();
    if (!norm) continue;
    // full tag first (e.g., 'en-AU')
    if (!out.includes(norm)) out.push(norm);
    // base language (e.g., 'en')
    const base = norm.split('-')[0];
    if (base && !out.includes(base)) out.push(base);
  }

  if (!out.includes('en')) out.push('en');
  return out;
}
