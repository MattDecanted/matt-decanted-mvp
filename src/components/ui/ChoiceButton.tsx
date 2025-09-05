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
  idle:
    "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900",
  selected:
    "border-blue-500 bg-blue-50 text-blue-800",
  correct:
    "border-green-500 bg-green-50 text-green-800",
  incorrect:
    "border-red-500 bg-red-50 text-red-800",
};

/** Accessible multiple-choice button used by GuessWhatPage */
const ChoiceButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      label,
      index,
      state = "idle",
      className,
      dataIndex,
      dataSelected,
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        // data-* are used by the page’s focus hook; keep names as-is
        data-opt-index={dataIndex}
        data-opt-selected={dataSelected ? "true" : undefined}
        className={cn(
          "w-full text-left p-4 rounded-lg border transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          disabled && "opacity-60 cursor-not-allowed",
          stateClasses[state],
          className
        )}
        aria-pressed={state === "selected"}
        {...rest}
      >
        <span className="font-medium mr-3">
          {typeof index === "number" ? `${String.fromCharCode(65 + index)}.` : null}
        </span>
        <span>{label}</span>
      </button>
    );
  }
);

ChoiceButton.displayName = "ChoiceButton";
export default ChoiceButton;
