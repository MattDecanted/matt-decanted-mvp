// src/lib/trial.ts
import { supabase } from "@/lib/supabase";

/** Local trial window config */
export const TRIAL_KEY = "md_trial_start";
export const TRIAL_DAYS = 7;

/** Ensure a trial start exists (guest-friendly, idempotent). Returns the start Date. */
export function ensureTrialStart(): Date {
  const now = new Date();
  try {
    const raw = localStorage.getItem(TRIAL_KEY);
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    localStorage.setItem(TRIAL_KEY, now.toISOString());
  } catch {
    /* storage blocked? fall back to "now" without persisting */
  }
  return now;
}

/** True if within the 7-day trial window for this browser/device. */
export function isTrialOpen(now: Date = new Date()): boolean {
  const start = ensureTrialStart();
  const ms = now.getTime() - start.getTime();
  const days = Math.floor(ms / 86_400_000);
  return days < TRIAL_DAYS;
}

/** Whole days left (0+). */
export function trialDaysLeft(now: Date = new Date()): number {
  const start = ensureTrialStart();
  const ms = now.getTime() - start.getTime();
  const days = Math.floor(ms / 86_400_000);
  return Math.max(0, TRIAL_DAYS - 1 - days);
}

/**
 * Best-effort server record of trial (non-blocking).
 * - Always ensures a local trial start for guests.
 * - If signed in, calls RPC `start_trial` (server should noop if already started).
 */
export async function startTrialBestEffort(): Promise<void> {
  // Always make sure guests get the trial locally.
  ensureTrialStart();

  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return; // guest: local trial is enough

    // Fire-and-forget server-side trial start; don't block UI.
    const p = supabase.rpc("start_trial");
    await Promise.race([p, new Promise((r) => setTimeout(r, 1000))]);
  } catch (e) {
    // Never block gameplay; just log for diagnostics.
    // eslint-disable-next-line no-console
    console.warn("[start_trial] best-effort failed:", e);
  }
}
