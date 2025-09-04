import * as React from "react";
import { Button } from "@/components/ui/button";

type ButtonProps = React.ComponentProps<typeof Button>;

/** Low-emphasis, brand-coloured outline/ghost button */
const BrandGhostButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    // Outline base + brand colour. Icons inherit currentColor.
    const base =
      "bg-transparent text-brand-orange border border-brand-orange " +
      "hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-orange/40 " +
      "[&_svg]:text-current";

    return (
      <Button
        ref={ref}
        variant="outline"
        className={[base, className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  }
);
BrandGhostButton.displayName = "BrandGhostButton";

export default BrandGhostButton;
