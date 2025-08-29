// src/components/games/HowToPlayCard.tsx
import React from 'react';
import { Lightbulb } from 'lucide-react';

export default function HowToPlayCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-900">How to play it truly blind</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-amber-900/90 text-sm">
            <li>Ask a friend who <em>isn’t playing</em> to take/upload the label photo for you (or cover the label).</li>
            <li>No black glass? A simple blindfold works — it keeps color a secret.</li>
            <li>Best with friends: smell, taste, debate your answers before you lock them in.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
