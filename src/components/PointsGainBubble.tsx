// src/components/PointsGainBubble.tsx
import * as React from "react";

export default function PointsGainBubble({
  amount,
  onDone,
  durationMs = 1800,
}: {
  amount: number;
  onDone?: () => void;
  durationMs?: number;
}) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 10); // kick in transition
    const t2 = setTimeout(() => {
      setShow(false);
      if (onDone) setTimeout(onDone, 250);
    }, durationMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [durationMs, onDone]);

  return (
    <div
      className={[
        "fixed left-1/2 -translate-x-1/2 bottom-16 z-[60]",
        "px-3 py-1.5 rounded-full text-sm font-semibold",
        "bg-emerald-600 text-white shadow-lg",
        "transition-all duration-300",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
      ].join(" ")}
      aria-live="polite"
    >
      +{amount} pts
    </div>
  );
}
