import * as React from "react";
import { CheckCircle2, XCircle, Dot } from "lucide-react";

type ChoiceState = "idle" | "selected" | "correct" | "incorrect" | "disabled";

export default function ChoiceButton({
  label,
  index,
  state = "idle",
  onClick,
  autoFocus,
  dataIndex,
  dataSelected,
}: {
  label: React.ReactNode;
  index: number; // 0-based
  state?: ChoiceState;
  onClick?: () => void;
  autoFocus?: boolean;
  /** keep your keyboard/autofocus helpers working */
  dataIndex?: number;
  dataSelected?: boolean;
}) {
  const isSelected = state === "selected";
  const isDisabled = state === "disabled";
  const isCorrect = state === "correct";
  const isIncorrect = state === "incorrect";

  const base =
    "block w-full text-left px-4 py-3 rounded-lg border transition select-none h-auto justify-start focus:outline-none focus:ring-2 focus:ring-offset-2";
  const idle = "bg-white text-gray-900 border-gray-300 hover:bg-gray-50 focus:ring-primary/30";
  const selected = "bg-primary text-white border-primary hover:bg-primary focus:ring-primary/40";
  const correct = "bg-emerald-600 text-white border-emerald-600 focus:ring-emerald-400";
  const incorrect = "bg-rose-600 text-white border-rose-600 focus:ring-rose-400";
  const disabled = "opacity-60 cursor-not-allowed";

  let cls = base + " " + idle;
  if (isSelected) cls = base + " " + selected;
  if (isCorrect) cls = base + " " + correct;
  if (isIncorrect) cls = base + " " + incorrect;
  if (isDisabled) cls += " " + disabled;

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      autoFocus={autoFocus}
      role="radio"
      aria-checked={isSelected}
      aria-disabled={isDisabled}
      data-opt-index={dataIndex ?? index}
      data-opt-selected={dataSelected ? "true" : "false"}
    >
      <span className="mr-2 inline-flex shrink-0 items-center justify-center rounded-md text-xs opacity-80">
        {isCorrect ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : isIncorrect ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <span className="inline-flex items-center">
            <span className="mr-1">{index + 1}.</span>
            <Dot className="h-4 w-4 opacity-50" />
          </span>
        )}
      </span>
      <span className="align-middle">{label}</span>
    </button>
  );
}
