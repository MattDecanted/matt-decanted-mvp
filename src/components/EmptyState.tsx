// src/components/EmptyState.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";

export default function EmptyState({
  title,
  description,
  ctaText,
  ctaHref,
}: {
  title: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-8 text-center">
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {ctaText && ctaHref && (
        <Button asChild>
          <a href={ctaHref}>{ctaText}</a>
        </Button>
      )}
    </div>
  );
}
