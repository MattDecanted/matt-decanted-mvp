import React from "react";
import { Crown, Trophy, Medal } from "lucide-react";

export default function SwirdleLeaderboardPage() {
  // Replace this with your real hook / RPC when ready
  const rows = [
    { name: "Player One", points: 420, streak: 12 },
    { name: "Player Two", points: 375, streak: 9 },
    { name: "Player Three", points: 333, streak: 8 },
  ];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="flex items-center gap-3 mb-6">
        <Crown className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Swirdle Leaderboard</h1>
      </header>

      <section className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.name} className="flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-3">
              {i === 0 ? <Trophy className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
              <span className="font-medium">{i + 1}. {row.name}</span>
            </div>
            <div className="text-sm opacity-80">
              {row.points} pts • {row.streak}-day streak
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
