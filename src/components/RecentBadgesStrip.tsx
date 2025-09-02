import React from 'react';
import { fetchRecentBadgesForUsers } from '@/lib/badges';

type Props = {
  userId: string;
  limit?: number;         // how many to show, default 2
  className?: string;
};

type Row = {
  user_id: string;
  badge_code: string;
  name: string;
  icon: string | null;
  tier: string | null;
  awarded_at: string | null;
};

const RecentBadgesStrip: React.FC<Props> = ({ userId, limit = 2, className = '' }) => {
  const [rows, setRows] = React.useState<Row[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) { setRows([]); return; }
      try {
        const res = await fetchRecentBadgesForUsers([userId], limit);
        if (!alive) return;
        setRows(res || []);
      } catch {
        if (!alive) setRows([]);
      }
    })();
    return () => { alive = false; };
  }, [userId, limit]);

  if (!rows) {
    // tiny skeleton
    return (
      <div className={`flex gap-1 ${className}`}>
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!rows.length) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label="recent-badges">
      {rows.slice(0, limit).map((b) => (
        <span
          key={`${b.badge_code}-${b.awarded_at ?? ''}`}
          title={`${b.name}${b.tier ? ` — ${b.tier}` : ''}`}
          className="text-base leading-none select-none"
        >
          {b.icon ?? '🏅'}
        </span>
      ))}
    </div>
  );
};

export default RecentBadgesStrip;
