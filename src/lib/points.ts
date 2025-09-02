// src/lib/points.ts
import { supabase } from '@/lib/supabase';

/**
 * Best-effort server-side points award.
 * - No throws (never breaks gameplay)
 * - Safe to call multiple times — server dedupes by (user, activity, ref_id)
 */
export async function awardPoints(
  activity: 'vocab' | 'daily_quiz' | 'swirdle' | 'guess_what' | 'options_round',
  refId: string,
  meta: Record<string, any> = {}
) {
  try {
    const { error } = await supabase.rpc('award_points_v1', {
      p_activity: activity,
      p_ref_id: String(refId || ''),
      p_points: null,          // use catalog default
      p_meta: meta,
    });
    if (error) console.warn('[award_points_v1]', error);
  } catch (e) {
    console.warn('[awardPoints] failed:', e);
  }
}
