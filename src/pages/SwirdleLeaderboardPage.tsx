import React from "react";
import { Crown, Trophy, Medal, RefreshCw, Search, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Row = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  best_streak: number;
  last_played: string | null; // ISO
};

const DEFAULT_LIMIT = 50;

export default function SwirdleLeaderboardPage() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [days, setDays] = React.useState<7 | 30 | 90 | 365>(30);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Preferred: materialized/regular VIEW named swirdle_leaderboard
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceISO = since.toISOString();

      // Try the view first
      let { data, error } = await supabase
        .from("swirdle_leaderboard")
        .select("*")
        .gte("last_played", sinceISO)
        .order("total_points", { ascending: false })
        .limit(DEFAULT_LIMIT);

      // Fallback: call RPC if the view isn't there (error.code === '42P01' server-side)
      if (error) {
        const rpc = await supabase.rpc("get_swirdle_leaderboard", { since_iso: sinceISO });
        if (rpc.error) throw rpc.error;
        data = rpc.data as Row[];
      }

      // Client-side filter for quick search (by name)
      const filtered = (data || []).filter((r) =>
        q.trim() ? (r.display_name || "").toLowerCase().includes(q.trim().toLowerCase()) : true
      );

      setRows(filtered);
    } catch (e: any) {
      setError(e?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [q, days]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Swirdle Leaderboard</h1>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 rounded-xl border px-3 py-2">
            <Search className="h-4 w-4" />
            <input
              className="outline-none bg-transparent"
              placeholder="Search player"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 rounded-xl border px-3 py-2">
            <Calendar className="h-4 w-4" />
            <select
              className="bg-transparent outline-none"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as any)}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </select>
          </label>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2"
            aria-label="Refresh leaderboard"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      {loading && <div className="p-6">Loading…</div>}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="p-6 text-sm opacity-70">No results.</div>
      )}

      <section className="space-y-3">
        {rows.map((row, i) => (
          <article
            key={row.user_id}
            className="flex items-center justify-between rounded-xl border p-4"
          >
            <div className="flex items-center gap-3">
              {i === 0 ? (
                <Trophy className="h-5 w-5" />
              ) : i === 1 ? (
                <Medal className="h-5 w-5" />
              ) : i === 2 ? (
                <Medal className="h-5 w-5" />
              ) : (
                <span className="w-5 text-center text-sm opacity-60">{i + 1}</span>
              )}
              {row.avatar_url ? (
                <img
                  src={row.avatar_url}
                  className="h-8 w-8 rounded-full object-cover"
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200" />
              )}
              <div>
                <div className="font-medium">
                  {row.display_name || "Anonymous"}{" "}
                  <span className="text-xs opacity-60">• best streak {row.best_streak}d</span>
                </div>
                <div className="text-xs opacity-60">
                  {row.last_played ? new Date(row.last_played).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>
            <div className="text-sm font-semibold">{row.total_points} pts</div>
          </article>
        ))}
      </section>
    </main>
  );
}
