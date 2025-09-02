// src/components/MyBadgesStrip.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Medal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchMyBadges } from '@/lib/badges';

type EarnedBadge = {
  user_id: string;
  badge_code: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  awarded_at: string; // ISO
};

type Props = {
  limit?: number;   // how many to show in the strip
};

const tierRing = (tier?: string | null) => {
  switch ((tier ?? '').toLowerCase()) {
    case 'gold': return 'ring-yellow-300';
    case 'silver': return 'ring-gray-300';
    case 'bronze': return 'ring-amber-300';
    default: return 'ring-gray-200';
  }
};

const MyBadgesStrip: React.FC<Props> = ({ limit = 8 }) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!user?.id) { setBadges([]); setLoading(false); return; }
      try {
        setLoading(true);
        setErr('');
        const all = await fetchMyBadges(user.id);
        const earned = (all as EarnedBadge[])
          .sort((a, b) => new Date(b.awarded_at).getTime() - new Date(a.awarded_at).getTime());
        setBadges(earned);
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load your badges');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const visible = useMemo(() => badges.slice(0, limit), [badges, limit]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">My badges</h3>
        </div>
        <a href="/badges" className="text-xs text-purple-600 hover:text-purple-700 font-medium">View all</a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : badges.length === 0 ? (
        <div className="text-sm text-gray-600 flex items-center justify-between">
          <span>No badges yet — play Swirdle to start earning!</span>
          <a href="/swirdle" className="text-purple-600 hover:text-purple-700 font-medium">Play</a>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {visible.map((b) => (
            <div key={`${b.badge_code}-${b.awarded_at}`} className="shrink-0 w-16 text-center">
              <div className={`mx-auto h-12 w-12 rounded-full ring-2 ${tierRing(b.tier)} grid place-items-center`}>
                <span className="text-2xl" title={b.name}>{b.icon || '🏅'}</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-700 truncate" title={b.name}>
                {b.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBadgesStrip;
