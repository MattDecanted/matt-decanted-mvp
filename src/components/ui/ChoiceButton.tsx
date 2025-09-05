import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  index: number;
  state?: "idle" | "selected" | "correct" | "incorrect";
  onClick?: () => void;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** forwarded to data attributes used by the keyboard helper */
  dataIndex?: number;
  dataSelected?: boolean;
};

const stateClasses: Record<NonNullable<Props["state"]>, string> = {
  idle: "border-gray-200 hover:bg-gray-50",
  selected: "border-blue-500 bg-blue-50 text-blue-800",
  correct: "border-green-500 bg-green-50 text-green-800",
  incorrect: "border-red-500 bg-red-50 text-red-800",
};

const ChoiceButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      label,
      index,
      state = "idle",
      onClick,
      className,
      autoFocus,
      disabled,
      dataIndex,
      dataSelected,
    },
    ref
  ) => {
    const letter = String.fromCharCode(65 + (index ?? 0)); // A, B, C...
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn(
          "w-full text-left p-4 rounded-lg border transition-all focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-blue-400",
          stateClasses[state],
          className
        )}
        data-opt-index={dataIndex ?? index}
        data-opt-selected={dataSelected ? "true" : undefined}
      >
        <span className="font-medium mr-3">{letter}.</span>
        {label}
      </button>
    );
  }
);

ChoiceButton.displayName = "ChoiceButton";
export default ChoiceButton;
