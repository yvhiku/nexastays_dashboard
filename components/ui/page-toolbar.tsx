import * as React from "react";
import { cn } from "@/lib/utils";

/** Compact filter/search row. Filters scroll horizontally instead of stacking tall. */
export function PageToolbar({
  filters,
  trailing,
  className,
}: {
  filters?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      {filters ? (
        <div className="min-w-0 flex-1 overflow-x-auto pb-0.5 nexa-scrollbar-thin">
          {filters}
        </div>
      ) : null}
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}
