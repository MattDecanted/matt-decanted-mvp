// src/pages/SwirdleLeaderboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Crown, Loader2, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import RecentBadgesStrip from '@/components/RecentBadgesStrip';

type Row = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  best_streak: number;
  last_played: string | null;
};

type RecentBadge = {
  user_id: string;
  badge_code: string;
  icon: string | null;
  awarded_at: string | null;
};

async function fetchLeaderboard(limit = 100): Promise<Row[]> {
  const { data, error } = await supabase
    .from('swirdle_leaderboard')
    .select('user_id, display_name, avatar_url, total_points, best_streak, last_played')
    .order('total_points', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as Row[]) ?? [];
}

async function fetchRecentBadgesForUsers(userIds: string[]): Promise<RecentBadge[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase.rpc('get_recent_badges_for_users', { p_user_ids: userIds });
  if (error) throw error;
  return (data as RecentBadge[]) ?? [];
}

const rankEmoji = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`);

const SwirdleLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [badges, setBadges] = useState<Record<string, RecentBadge[]>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const lb = await fetchLeaderboard(100);
        setRows(lb);

        const ids = lb.map((r) => r.user_id);
        const rb = await fetchRecentBadgesForUsers(ids);

        // group by user_id then keep latest 3 by awarded_at
        const grouped: Record<string, RecentBadge[]> = {};
        for (const b of rb) {
          if (!grouped[b.user_id]) grouped[b.user_id] = [];
          grouped[b.user_id].push(b);
        }
        for (const uid of Object.keys(grouped)) {
          grouped[uid] = grouped[uid]
            .sort(
              (a, b) =>
                new Date(b.awarded_at || 0).getTime() - new Date(a.awarded_at || 0).getTime()
            )
            .slice(0, 3);
        }

        setBadges(grouped);
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const myId = user?.id ?? null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-2">
            <Crown className="w-8 h-8 text-purple-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Swirdle Leaderboard</h1>
          </div>
          <p className="text-gray-600">Top players by total points. Badges show latest achievements.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 px-4 py-3 text-xs font-medium text-gray-500 bg-gray-50">
            <div className="col-span-1">Rank</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-2 text-right">Points</div>
            <div className="col-span-1 text-center">Best Streak</div>
            <div className="col-span-2 text-right">Last Played</div>
          </div>

          <ul className="divide-y divide-gray-100">
            {rows.map((r, idx) => {
              const isMe = myId && r.user_id === myId;
              const rowBadges = badges[r.user_id] ?? [];

              return (
                <li
                  key={r.user_id}
                  className={`grid grid-cols-12 items-center px-4 py-3 ${isMe ? 'bg-purple-50' : 'bg-white'}`}
                >
                  <div className="col-span-1 font-mono text-sm text-gray-700">{rankEmoji(idx)}</div>

                  <div className="col-span-6 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="h-8 w-8 object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500">👤</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {r.display_name || 'Anonymous'} {isMe ? <span className="text-xs text-purple-600">(you)</span> : null}
                      </div>

                      <div className="mt-1">
                        {rowBadges.length === 0 ? (
                          <span className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Award className="w-3 h-3" /> No badges yet
                          </span>
                        ) : (
                          <RecentBadgesStrip
                            items={rowBadges.map((b) => ({
                              badge_code: b.badge_code,
                              icon: b.icon,
                              awarded_at: b.awarded_at,
                            }))}
                            max={3}
                            size={18}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 text-right font-semibold text-gray-900">
                    {r.total_points}
                  </div>

                  <div className="col-span-1 text-center text-gray-700">
                    {r.best_streak}
                  </div>

                  <div className="col-span-2 text-right text-xs text-gray-500">
                    {r.last_played ? new Date(r.last_played).toLocaleDateString() : '—'}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Earn badges by winning daily, keeping streaks, and hitting point milestones!
        </div>
      </div>
    </div>
  );
};

export default SwirdleLeaderboardPage;
