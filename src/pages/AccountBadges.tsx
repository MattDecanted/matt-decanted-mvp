import React from 'react';
import { Award, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import BadgeShelf from '@/components/BadgeShelf';

type LadderBadge = {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  is_active: boolean;
  is_earned: boolean;
  awarded_at: string | null;
};

async function fetchLadder(userId: string | null): Promise<LadderBadge[]> {
  // Prefer the RPC you created (get_badge_ladder_v1). If it’s not present,
  // this will throw and we’ll show a friendly empty state.
  const { data, error } = await supabase.rpc('get_badge_ladder_v1', {
    p_user_id: userId,
  });
  if (error) throw error;
  return (data as LadderBadge[]) ?? [];
}

export default function AccountBadges() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [ladder, setLadder] = React.useState<LadderBadge[]>([]);
  const [err, setErr] = React.useState<string>('');

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const rows = await fetchLadder(user?.id ?? null);
        if (!mounted) return;
        // Sort: earned first (newest first), then active locked, then everything else
        const sorted = [...rows].sort((a, b) => {
          const aEarn = a.is_earned ? 1 : 0;
          const bEarn = b.is_earned ? 1 : 0;
          if (aEarn !== bEarn) return bEarn - aEarn;
          // newer first within earned
          if (a.is_earned && b.is_earned) {
            return (new Date(b.awarded_at ?? 0).getTime() - new Date(a.awarded_at ?? 0).getTime());
          }
          // otherwise by tier-ish priority
          const tierOrder: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
          const at = tierOrder[a.tier ?? ''] ?? 0;
          const bt = tierOrder[b.tier ?? ''] ?? 0;
          return bt - at;
        });
        setLadder(sorted);
      } catch (e: any) {
        console.warn('AccountBadges ladder error:', e?.message ?? e);
        setErr('Badges are not available yet.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading badges…</span>
        </div>
      </div>
    );
  }

  if (err || ladder.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h2 className="text-lg font-semibold">No badges yet</h2>
          <p className="text-gray-600 text-sm mt-1">
            Play daily to earn your first badge and unlock the ladder.
          </p>
        </div>
      </div>
    );
  }

  const earned = ladder.filter(b => b.is_earned);
  const locked = ladder.filter(b => !b.is_earned && b.is_active);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <header className="flex items-center gap-3">
        <Award className="w-7 h-7 text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold">Your Badges</h1>
          <p className="text-gray-600 text-sm">Earn badges by playing daily and hitting milestones.</p>
        </div>
      </header>

      {/* Earned quick shelf */}
      {earned.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Recently earned</h2>
          <BadgeShelf
            badges={earned.slice(0, 8).map(b => ({
              badge_code: b.code, name: b.name, description: b.description ?? '',
              icon: b.icon, tier: b.tier ?? undefined, awarded_at: b.awarded_at ?? undefined
            }))}
            max={8}
            className="mb-4"
          />
        </section>
      )}

      {/* Grid of all (earned + locked) */}
      <section className="grid sm:grid-cols-2 gap-4">
        {ladder.map(b => (
          <div
            key={b.code}
            className={`rounded-lg border p-4 ${b.is_earned ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{b.icon ?? '🏅'}</span>
                <div>
                  <div className="font-semibold">{b.name}</div>
                  {b.tier && (
                    <div className="text-xs text-gray-600 mt-0.5 capitalize">{b.tier}</div>
                  )}
                </div>
              </div>
              {!b.is_earned && <Lock className="w-4 h-4 text-gray-400" />}
            </div>
            {b.description && (
              <p className="text-sm text-gray-700 mt-2">{b.description}</p>
            )}
            {b.is_earned && b.awarded_at && (
              <div className="text-xs text-emerald-700 mt-3">
                Earned {new Date(b.awarded_at).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
