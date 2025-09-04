// src/components/ShortCard.tsx
import * as React from "react";
import { LangLink as Link } from "@/components/LangLink";

export type ShortLite = {
  id: string;
  slug: string;
  title: string;
  preview?: boolean | null;
  is_published?: boolean | null;
};

export default function ShortCard({ s }: { s: ShortLite }) {
  return (
    <Link
      to={`/shorts/${s.slug}`}
      className="group block rounded-2xl border bg-white/90 shadow-card hover:bg-white transition hover:shadow-lg overflow-hidden"
    >
      <div className="h-28 bg-gradient-to-br from-brand-200 to-brand-50" />
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 group-hover:text-brand-800">
          {s.title}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {s.preview && (
            <span className="rounded-full bg-brand-100 text-brand-800 px-2 py-0.5">Preview</span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 ${
              s.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
            }`}
          >
            {s.is_published ? "Published" : "Draft"}
          </span>
        </div>
      </div>
    </Link>
  );
}
