// src/components/ui/BrandButton.tsx  (Bolt-style)
import * as React from "react";
import { Button } from "@/components/ui/button";

type ButtonProps = React.ComponentProps<typeof Button>;

/** Brand-coloured primary button that still accepts all shadcn Button props */
const BrandButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    const base =
      "bg-brand-orange text-white shadow hover:opacity-95 [&_svg]:text-white";
    return (
      <Button
        ref={ref}
        className={[base, className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  }
);
BrandButton.displayName = "BrandButton";

export default BrandButton;
