// src/components/StatsPanel.tsx
import React from 'react';
import { Trophy } from 'lucide-react';

interface StatsPanelProps {
  gamesPlayed: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  showStreakMessage?: boolean;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  gamesPlayed,
  winRate,
  currentStreak,
  bestStreak,
  showStreakMessage = true,
}) => {
  return (
    <div className="mt-10 max-w-md mx-auto p-6 bg-white rounded-2xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-purple-800">
        <Trophy className="w-5 h-5 text-orange-400" />
        Your Stats
      </h2>

      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-700 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-black">{gamesPlayed}</div>
          <div className="text-xs text-gray-500 mt-1">Games Played</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{winRate}%</div>
          <div className="text-xs text-gray-500 mt-1">Win Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{currentStreak}</div>
          <div className="text-xs text-gray-500 mt-1">Current Streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{bestStreak}</div>
          <div className="text-xs text-gray-500 mt-1">Best Streak</div>
        </div>
      </div>

      {showStreakMessage && (
        <div className="mt-2 bg-yellow-100 text-yellow-800 text-center text-sm px-3 py-2 rounded-xl border border-yellow-300">
          🔥 {currentStreak} day streak! Keep it up!
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
