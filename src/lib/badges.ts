// src/lib/badges.ts
import { supabase } from '@/lib/supabase';

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

export async function fetchBadgeLadder(): Promise<LadderItem[]> {
  const { data, error } = await supabase.rpc('get_badge_ladder');
  if (error) throw error;
  return (data as LadderItem[]) ?? [];
}

export async function fetchMyBadges(p_user_id: string) {
  const { data, error } = await supabase.rpc('get_my_badges', { p_user_id });
  if (error) throw error;
  return data ?? [];
}
