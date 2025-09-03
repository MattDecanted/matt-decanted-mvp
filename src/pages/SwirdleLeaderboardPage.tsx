// src/pages/SwirdleLeaderboardPage.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = {
  alias: string;
  total_points: number;
  user_suffix: string; // last 4 chars of user id for tie-break display
};

const PAGE_SIZE = 25;

export default function SwirdleLeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load(p = 0) {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase.rpc("leaderboard_public", {
        p_limit: PAGE_SIZE,
        p_offset: p * PAGE_SIZE,
      });
      if (error) throw error;
      setRows((data || []) as Row[]);
      setPage(p);
    } catch (e: any) {
      setErr(e?.message || "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0);
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Leaderboard</h1>
      <p className="text-sm text-gray-600 mb-6">
        Rankings are based on total points earned across games and challenges.
      </p>

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
          {err}
        </div>
      )}

      {loading ? (
        <div className="p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">No results yet. Be the first to score!</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 w-16">#</th>
                <th className="px-4 py-2">Alias</th>
                <th className="px-4 py-2 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.alias}-${i}`} className="border-t">
                  <td className="px-4 py-2">{page * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-2">
                    <span className="font-medium">{r.alias}</span>
                    <span className="ml-2 text-xs text-gray-500">#{r.user_suffix}</span>
                  </td>
                  <td className="px-4 py-2 text-right">{r.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          onClick={() => load(Math.max(0, page - 1))}
          disabled={loading || page === 0}
        >
          Prev
        </button>
        <button
          className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          onClick={() => load(page + 1)}
          disabled={loading || rows.length < PAGE_SIZE}
        >
          Next
        </button>
        <span className="text-xs text-gray-500 ml-2">Page {page + 1}</span>
      </div>
    </div>
  );
}
