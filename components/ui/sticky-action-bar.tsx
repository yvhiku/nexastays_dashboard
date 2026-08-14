import * as React from "react";
import { cn } from "@/lib/utils";

/** Keeps primary actions reachable at the bottom of a scrolling workspace or sheet. */
export function StickyActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 mt-auto border-t border-nexa-line bg-white px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
