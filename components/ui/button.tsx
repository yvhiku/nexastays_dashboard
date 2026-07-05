import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-primary/40 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-nexa-primary text-white hover:bg-nexa-primary-dark shadow-nexa-sm",
        outline:
          "border border-nexa-line bg-white text-nexa-ink-2 hover:bg-nexa-bg-2",
        ghost: "text-nexa-ink-2 hover:bg-nexa-bg-2",
        soft: "bg-nexa-primary-soft text-nexa-primary-dark hover:bg-nexa-primary-soft/70",
        danger: "bg-nexa-danger text-white hover:opacity-90",
        "danger-outline":
          "border border-nexa-danger/30 text-nexa-danger hover:bg-nexa-danger-soft",
        success: "bg-nexa-success text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
