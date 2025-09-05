// src/components/ui/BrandGhostButton.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

/** Low-emphasis, brand-coloured outline/ghost button (keeps all shadcn Button props) */
const BrandGhostButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    const base =
      "bg-transparent text-brand-orange border border-brand-orange " +
      "hover:bg-brand-50 " +
      "focus-visible:ring-2 focus-visible:ring-brand-orange/40 focus-visible:ring-offset-2 " +
      "[&_svg]:text-current";

    return (
      <Button
        ref={ref}
        variant="outline"
        className={cn(base, className)}
        {...props}
      />
    );
  }
);

BrandGhostButton.displayName = "BrandGhostButton";
export default BrandGhostButton;
