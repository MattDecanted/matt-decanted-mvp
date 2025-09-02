// src/pages/SwirdleLeaderboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Award, Crown, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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
  awarded_at: string;
};

async function fetchLeaderboard(limit = 100): Promise<Row[]> {
  // If you exposed a RPC, prefer that:
  // const { data, error } = await supabase.rpc('get_swirdle_leaderboard', { p_limit: limit });

  // Using the view from step 7.3 (rename if different):
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

        // Group by user_id and keep the 2 most recent
        const grouped: Record<string, RecentBadge[]> = {};
        rb
          .sort((a, b) => new Date(b.awarded_at).getTime() - new Date(a.awarded_at).getTime())
          .forEach((b) => {
            if (!grouped[b.user_id]) grouped[b.user_id] = [];
            if (grouped[b.user_id].length < 2) grouped[b.user_id].push(b);
          });

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

          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No players yet — be the first!</div>
          ) : (
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
                          <img src={r.avatar_url} alt={`${r.display_name || 'Player'} avatar`} className="h-8 w-8 object-cover" />
                        ) : (
                          <span className="text-xs text-gray-500">👤</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {r.display_name || 'Anonymous'}
                        </div>
                        {/* Badge strip */}
                        <div className="flex items-center gap-1 mt-1">
                          {rowBadges.length === 0 ? (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Award className="w-3 h-3" /> No badges yet
                            </span>
                          ) : (
                            rowBadges.map((b) => (
                              <span key={`${r.user_id}-${b.badge_code}`} title={b.badge_code} className="text-base">
                                {b.icon || '🏅'}
                              </span>
                            ))
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
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Earn badges by winning daily, keeping streaks, and hitting point milestones!
        </div>
      </div>
    </div>
  );
};

export default SwirdleLeaderboardPage;
