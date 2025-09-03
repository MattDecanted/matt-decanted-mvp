// src/hooks/useQuizKeyboard.ts
import { useEffect } from "react";

type UseQuizKeyboardParams = {
  enabled: boolean;
  optionsCount: number;
  onSelect: (index: number) => void;
  onNext: () => void;
  allowNext?: boolean;
};

/**
 * Keyboard shortcuts for MCQs:
 * - 1–9 selects option 0–8
 * - Numpad 1–9 also supported
 * - Enter / ArrowRight advances when allowNext = true
 * Skips when typing in inputs/textareas/contentEditable.
 */
export function useQuizKeyboard({
  enabled,
  optionsCount,
  onSelect,
  onNext,
  allowNext,
}: UseQuizKeyboardParams) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        !t ||
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
      ) {
        return;
      }

      // Top-row numbers 1..9
      if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < optionsCount) {
          e.preventDefault();
          onSelect(idx);
        }
        return;
      }

      // Numpad 1..9
      if (e.code.startsWith("Numpad")) {
        const n = Number(e.code.replace("Numpad", ""));
        if (!Number.isNaN(n)) {
          const idx = n - 1;
          if (idx >= 0 && idx < optionsCount) {
            e.preventDefault();
            onSelect(idx);
          }
          return;
        }
      }

      // Advance
      if ((e.key === "Enter" || e.key === "ArrowRight") && allowNext) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, optionsCount, onSelect, onNext, allowNext]);
}

export default useQuizKeyboard;
