// src/components/ui/BrandButton.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

/** Brand-flavoured primary button that still accepts all shadcn Button props */
const BrandButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    const base =
      "bg-primary text-primary-foreground hover:bg-primary/90 [&_svg]:text-primary-foreground";

    return (
      <Button
        ref={ref}
        variant={variant ?? "default"}
        className={cn(base, className)}
        {...props}
      />
    );
  }
);

BrandButton.displayName = "BrandButton";
export default BrandButton;
