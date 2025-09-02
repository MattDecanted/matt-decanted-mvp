import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';

export type StripItem = {
  badge_code: string;
  name: string;
  icon?: string | null;
  tier?: string | null;
  awarded_at?: string | null;
};

export default function BadgeStrip({
  items,
  className = '',
  size = 'text-base',
  gap = 'gap-1.5',
  max = 2,
}: {
  items: StripItem[];
  className?: string;
  size?: string;   // tailwind text size
  gap?: string;    // tailwind gap
  max?: number;
}) {
  if (!items || items.length === 0) return null;
  const take = items.slice(0, max);

  return (
    <TooltipProvider>
      <div className={`inline-flex items-center ${gap} ${className}`}>
        {take.map(b => (
          <Tooltip key={`${b.badge_code}-${b.awarded_at ?? ''}`}>
            <TooltipTrigger asChild>
              <span
                className={`${size} leading-none`}
                aria-label={b.name}
                title={b.name}
              >
                {b.icon ?? '🏅'}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-md bg-gray-900 text-white text-xs px-2 py-1">
              <div className="font-medium">{b.name}</div>
              {b.tier && <div className="opacity-75 capitalize">{b.tier}</div>}
              {b.awarded_at && (
                <div className="opacity-75">
                  {new Date(b.awarded_at).toLocaleString()}
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
