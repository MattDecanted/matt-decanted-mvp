// src/lib/trial.ts
import { supabase } from '@/lib/supabase';

/** Best-effort, idempotent: never blocks UI and safe to call multiple times */
export async function startTrialBestEffort() {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return; // not signed in

    const p = supabase.rpc('start_trial'); // server handles "only if not started"
    await Promise.race([p, new Promise((r) => setTimeout(r, 1000))]);
  } catch (e) {
    // don't surface – this should never block gameplay
    console.warn('[start_trial] best-effort failed:', e);
  }
}
