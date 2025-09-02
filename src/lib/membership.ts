import { supabase } from '@/lib/supabase';

export type TrialStatus = {
  tier?: string;                 // e.g. 'free' | 'trial' | 'premium'
  is_trial?: boolean;            // optional convenience flag
  trial_started_at?: string | null;
  trial_expires_at?: string | null;
  days_left?: number | null;     // some versions of the SQL return this
};

export async function fetchTrialStatus(): Promise<TrialStatus | null> {
  const { data, error } = await supabase.rpc('trial_status');
  if (error) {
    console.warn('[trial_status] error', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;

  // Be defensive about shapes
  if (!row) return null;

  // If the SQL didn’t compute days_left, do it here.
  let days_left: number | null = row?.days_left ?? null;
  if (days_left == null && row?.trial_expires_at) {
    const ms = new Date(row.trial_expires_at).getTime() - Date.now();
    days_left = Math.max(0, Math.ceil(ms / (24*3600*1000)));
  }

  return {
    tier: row.tier ?? row.subscription_tier ?? undefined,
    is_trial: row.is_trial ?? (row.subscription_tier === 'trial'),
    trial_started_at: row.trial_started_at ?? null,
    trial_expires_at: row.trial_expires_at ?? null,
    days_left,
  };
}
