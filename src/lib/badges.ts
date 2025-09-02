// src/lib/badges.ts
import { supabase } from '@/lib/supabase';

/* ========= Types ========= */

export type LadderItem = {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  is_active: boolean;
  is_earned: boolean;
  awarded_at: string | null;
};

export type EarnedBadge = {
  badge_code: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  awarded_at: string; // ISO
};

export type RecentBadge = {
  user_id: string;
  badge_code: string;
  name: string;
  icon: string | null;
  tier: string | null;
  awarded_at: string | null;
};

/* ========= RPCs / Fetchers ========= */

/** 13.3.1 — Full ladder (with earned flags for current session user) */
export async function fetchBadgeLadder(): Promise<LadderItem[]> {
  const { data, error } = await supabase.rpc('get_badge_ladder');
  if (error) throw error;
  return (data as LadderItem[]) ?? [];
}

/** 13.3.2 — My earned badges (for toasts/profile) */
export async function fetchMyBadges(p_user_id: string): Promise<EarnedBadge[]> {
  const { data, error } = await supabase.rpc('get_my_badges', { p_user_id });
  if (error) throw error;
  return (data as EarnedBadge[]) ?? [];
}

/** 13.3.3 — Batch: most recent badges for a set of users (leaderboard strip) */
export async function fetchRecentBadgesForUsers(
  userIds: string[],
  limit = 2
): Promise<RecentBadge[]> {
  if (!userIds?.length) return [];
  const { data, error } = await supabase.rpc('get_recent_badges_for_users', {
    p_user_ids: userIds,
    p_limit: limit,
  });
  if (error) {
    console.warn('get_recent_badges_for_users error:', error.message);
    return [];
  }
  return (data as RecentBadge[]) ?? [];
}

/* ========= Helpers ========= */

/** 13.3.4 — Build a Set from earned badges for quick diffing */
export function toBadgeSet(list: { badge_code: string }[]): Set<string> {
  return new Set<string>(list?.map(b => b.badge_code) ?? []);
}

/** 13.3.5 — Returns the subset of `after` not present in `beforeSet` */
export function diffNewlyEarned(
  beforeSet: Set<string>,
  after: EarnedBadge[]
): EarnedBadge[] {
  if (!after?.length) return [];
  return after.filter(b => !beforeSet.has(b.badge_code));
}
