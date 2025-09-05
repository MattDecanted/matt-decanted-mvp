// src/components/LevelUpBanner.tsx
import * as React from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  ctaText?: string;
  ctaHref?: string;
};

export default function LevelUpBanner({
  open,
  onClose,
  title = "New content unlocked!",
  message = "You just crossed a points gate and unlocked more learning content.",
  ctaText = "Explore",
  ctaHref = "/shorts",
}: Props) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50" role="dialog" aria-live="polite" aria-label="Unlocked content">
      <div className="mx-auto w-[94%] sm:max-w-xl rounded-xl border border-amber-200 bg-white shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 rounded-md bg-amber-100 p-2">
            <Sparkles className="h-5 w-5 text-amber-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-gray-600">{message}</div>
            <div className="mt-3 flex items-center gap-2">
              <Button asChild>
                <a href={ctaHref}>{ctaText}</a>
              </Button>
              <Button variant="outline" onClick={onClose}>
                Dismiss
              </Button>
            </div>
          </div>
          <button
            aria-label="Close"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
