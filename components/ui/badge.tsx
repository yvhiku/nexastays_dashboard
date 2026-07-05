import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-nexa-bg-2 text-nexa-ink-2 border border-nexa-line",
        primary: "bg-nexa-primary-soft text-nexa-primary-dark",
        accent: "bg-nexa-accent-soft text-[#B45309]",
        success: "bg-nexa-success-soft text-nexa-success",
        warning: "bg-nexa-warning-soft text-[#8A5B00]",
        danger: "bg-nexa-danger-soft text-nexa-danger",
        info: "bg-nexa-info-soft text-nexa-info",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      )}
      {children}
    </span>
  );
}

type StatusTone = BadgeProps["variant"];

const statusMap: Record<string, StatusTone> = {
  active: "success",
  confirmed: "success",
  completed: "info",
  verified: "success",
  published: "success",
  resolved: "success",
  pending: "warning",
  in_progress: "info",
  reviewing: "info",
  open: "warning",
  flagged: "danger",
  suspended: "danger",
  banned: "danger",
  rejected: "danger",
  cancelled: "danger",
  removed: "danger",
  escalated: "danger",
  unverified: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusMap[status] ?? "neutral";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge variant={tone} dot>
      {label}
    </Badge>
  );
}
