// src/pages/BadgesPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Medal, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchBadgeLadder, LadderItem } from '@/lib/badges';

const normalizeTier = (t: string | null | undefined) => (t ? t.toLowerCase() : null);
const TIERS: (string | null)[] = ['gold', 'silver', 'bronze', null];

const BadgesPage: React.FC = () => {
  const { user } = useAuth();
  const [ladder, setLadder] = useState<LadderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const data = await fetchBadgeLadder();
        setLadder((data ?? []).slice());
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load badges');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const activeLadder = useMemo(
    () => ladder.filter((b) => b.is_active),
    [ladder]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-600">{err}</p>
      </div>
    );
  }

  const byTier = (tier: string | null) =>
    activeLadder
      .filter((b) => normalizeTier(b.tier) === normalizeTier(tier))
      // earned first, then name
      .sort((a, b) => {
        if (a.is_earned !== b.is_earned) return a.is_earned ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

  const earnedCount = ladder.filter((b) => b.is_earned).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-3">
            <Medal className="w-8 h-8 text-purple-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Badges</h1>
          </div>
          <p className="text-gray-600">
            {user
              ? <>You’ve earned <b>{earnedCount}</b> of <b>{ladder.length}</b> badges. Keep going!</>
              : <>Sign in to start earning badges by playing daily and hitting milestones.</>}
          </p>
        </div>

        {TIERS.map((tierKey) => {
          const group = byTier(tierKey);
          if (!group.length) return null;
          const title = tierKey ? tierKey[0].toUpperCase() + tierKey.slice(1) : 'Other';
          return (
            <section key={tierKey ?? 'other'} className="mb-10">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {group.map((b) => {
                  const locked = !b.is_earned;
                  const awardedDate = b.awarded_at ? new Date(b.awarded_at) : null;
                  return (
                    <article
                      key={b.code}
                      className={`rounded-xl border p-4 bg-white shadow-sm transition ${
                        locked ? 'opacity-70' : 'ring-1 ring-purple-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{b.icon ?? '🏅'}</span>
                          <div>
                            <div className="font-semibold text-gray-900">{b.name}</div>
                            <div className="text-xs text-gray-500">{b.code}</div>
                          </div>
                        </div>
                        {locked ? (
                          <Lock className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Medal className="w-4 h-4 text-purple-600" />
                        )}
                      </div>

                      <p className="text-sm text-gray-600 min-h-[2.5rem]">
                        {b.description || '—'}
                      </p>

                      <div className="mt-3">
                        {locked ? (
                          <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                            Locked
                          </span>
                        ) : (
                          <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                            Earned {awardedDate ? awardedDate.toLocaleDateString() : 'recently'}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Empty state if nothing active */}
        {activeLadder.length === 0 && (
          <div className="text-center text-sm text-gray-500">No badges available yet.</div>
        )}
      </div>
    </div>
  );
};

export default BadgesPage;
