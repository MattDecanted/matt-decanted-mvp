// src/components/ui/ChoiceButton.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type ChoiceState = "idle" | "selected" | "correct" | "incorrect";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visible label for the option */
  label: React.ReactNode;
  /** 0-based index; used to render A., B., C.… */
  index?: number;
  /** Visual state */
  state?: ChoiceState;
  /** Custom data attrs used by keyboard/focus logic in GuessWhatPage */
  dataIndex?: number;
  dataSelected?: boolean;
};

const stateClasses: Record<ChoiceState, string> = {
  // Dark pill baseline
  idle:
    "bg-gray-900 text-white border-gray-900 hover:bg-gray-800",
  // Brand pick
  selected:
    "bg-brand-orange text-white border-brand-orange hover:opacity-95 shadow",
  // Answer review styles (if ever reused in results)
  correct:
    "bg-emerald-600 text-white border-emerald-600",
  incorrect:
    "bg-rose-600 text-white border-rose-600",
};

/** Accessible multiple-choice button used by GuessWhatPage */
const ChoiceButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    { label, index, state = "idle", className, dataIndex, dataSelected, disabled, ...rest },
    ref
  ) => {
    const dataOptIndex = typeof dataIndex === "number" ? dataIndex : undefined;

    return (
      <button
        ref={ref}
        type="button"
        // data-* used by page focus hook; keep names as-is
        data-opt-index={dataOptIndex}
        data-opt-selected={dataSelected ? "true" : undefined}
        className={cn(
          "w-full text-left px-4 py-3 rounded-xl border transition-all",
          "flex items-center gap-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40",
          disabled && "opacity-60 cursor-not-allowed",
          stateClasses[state],
          className
        )}
        aria-pressed={state === "selected"}
        aria-selected={state === "selected"}
        aria-disabled={disabled || undefined}
        {...rest}
      >
        {/* A/B/C badge */}
        {typeof index === "number" ? (
          <span
            aria-hidden
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              "text-[11px] font-bold",
              // subtle contrast ring for dark pills
              "bg-white/10 ring-1 ring-white/15"
            )}
          >
            {String.fromCharCode(65 + index)}
          </span>
        ) : null}

        <span className="font-medium">{label}</span>
      </button>
    );
  }
);

ChoiceButton.displayName = "ChoiceButton";
export default ChoiceButton;
