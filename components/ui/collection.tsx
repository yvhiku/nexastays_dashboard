import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Desktop table (≥768px) and mobile cards/list (<768px).
 * overflow-x-auto tables remain a fallback via the existing Table primitive.
 */
export function ResponsiveCollection({
  table,
  cards,
  className,
}: {
  table: React.ReactNode;
  cards: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="hidden md:block">{table}</div>
      <div className="space-y-2 md:hidden">{cards}</div>
    </div>
  );
}

export function CollectionCard({
  children,
  onClick,
  selected,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  const classes = cn(
    "w-full rounded-lg border bg-white p-3 text-left shadow-nexa-sm",
    selected ? "border-nexa-primary ring-1 ring-nexa-primary/30" : "border-nexa-line",
    onClick && "transition-colors hover:bg-nexa-bg-2/60",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}

export function CollectionFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-nexa-line px-4 py-3 text-xs text-nexa-ink-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}
