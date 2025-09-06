import * as React from "react";
import { Eye, Target, BadgeCheck, PartyPopper } from "lucide-react";

type Item = { icon: React.ReactNode; title: string; body: string };

const ITEMS: Item[] = [
  {
    icon: <Eye className="h-5 w-5 text-blue-600" />,
    title: "Watch Matt",
    body: "See Matt’s blind tasting notes and descriptors.",
  },
  {
    icon: <Target className="h-5 w-5 text-emerald-600" />,
    title: "Make Guesses",
    body: "Answer questions about vintage, variety, and region.",
  },
  {
    icon: <BadgeCheck className="h-5 w-5 text-violet-600" />,
    title: "See Matt’s Guess",
    body: "Compare your answers with Matt’s predictions.",
  },
  {
    icon: <PartyPopper className="h-5 w-5 text-amber-600" />,
    title: "Big Reveal",
    body: "Discover the actual wine and who got it right!",
  },
];

export default function HowItWorks({
  className = "",
  title = "How It Works",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <div className={["rounded-2xl border bg-white shadow-sm", className].join(" ")}>
      <div className="px-5 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it, i) => (
          <div
            key={i}
            className="rounded-xl border bg-gray-50/70 p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
          >
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-white p-2 border">{it.icon}</div>
              <div className="font-medium text-gray-900">{it.title}</div>
            </div>
            <p className="mt-2 text-sm text-gray-600">{it.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
