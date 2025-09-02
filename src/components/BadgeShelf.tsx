import React from 'react';

type Badge = {
  badge_code: string;
  name: string;
  description?: string;
  icon?: string | null;
  tier?: string | null;
  awarded_at?: string | null;
};

type Props = {
  badges: Badge[];
  max?: number;          // how many to show inline
  showNames?: boolean;   // whether to render text labels
  className?: string;
};

const tierColor: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-gray-200 text-gray-800',
  gold: 'bg-yellow-100 text-yellow-800',
};

export default function BadgeShelf({ badges, max = 6, showNames = false, className = '' }: Props) {
  const list = badges.slice(0, max);
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {list.map(b => (
        <div
          key={b.badge_code}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white"
          title={`${b.name}${b.awarded_at ? ` • earned ${new Date(b.awarded_at).toLocaleDateString()}` : ''}`}
        >
          <span className="text-base">{b.icon ?? '🏅'}</span>
          {showNames && (
            <span className="text-xs font-medium">
              {b.name}
            </span>
          )}
          {b.tier && (
            <span className={`text-[10px] px-1 rounded ${tierColor[b.tier] ?? 'bg-gray-100 text-gray-700'}`}>
              {b.tier}
            </span>
          )}
        </div>
      ))}
      {badges.length > max && (
        <span className="text-xs text-gray-500">+{badges.length - max}</span>
      )}
    </div>
  );
}
