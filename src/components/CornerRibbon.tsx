// src/components/CornerRibbon.tsx
import * as React from "react";

export default function CornerRibbon({
  label,
}: {
  label: string;
}) {
  return (
    <div className="absolute -right-10 top-3 rotate-45">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-10 py-1 shadow-md rounded">
        {label}
      </div>
    </div>
  );
}
