// src/components/ui/sonner.tsx
import type { ComponentProps } from "react";
import { Toaster as BaseToaster } from "sonner";

type ToasterProps = ComponentProps<typeof BaseToaster>;

// Export toast if you want to trigger toasts elsewhere:
// export { toast } from "sonner";

export const Toaster = (props: ToasterProps) => {
  // Decide theme at runtime without next-themes
  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const theme: ToasterProps["theme"] = isDark ? "dark" : "light";

  return (
    <BaseToaster
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export default Toaster;
