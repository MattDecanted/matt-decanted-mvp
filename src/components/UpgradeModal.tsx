// src/components/UpgradeModal.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";

export default function UpgradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-1">Unlock more with Pro</h3>
        <p className="text-sm text-gray-600 mb-4">
          Access premium shorts and modules, earn points faster, and track progress.
        </p>
        <ul className="list-disc ml-5 text-sm space-y-2 mb-6 text-gray-700">
          <li>All Pro & Free content</li>
          <li>Bonus point multipliers</li>
          <li>Early access to new modules</li>
        </ul>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Not now</Button>
          <Button asChild>
            <a href="/pricing">See plans</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
