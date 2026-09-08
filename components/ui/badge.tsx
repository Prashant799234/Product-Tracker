import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-surface-2 text-text-secondary",
        orange: "border-transparent bg-brand-orange/15 text-brand-orange-tint",
        blue: "border-transparent bg-brand-blue/15 text-brand-blue",
        success: "border-transparent bg-success/15 text-success",
        critical: "border-transparent bg-critical/15 text-critical",
        outline: "border-text-muted/20 text-text-faint",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
