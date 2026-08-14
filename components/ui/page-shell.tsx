import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Document pages scroll inside app chrome padding.
 * Workspace pages fill the viewport under the topbar (Support inbox pattern).
 * Negative margins match AppChrome main padding so Support layout stays unchanged.
 */
export function PageShell({
  variant = "document",
  children,
  className,
}: {
  variant?: "document" | "workspace";
  children: React.ReactNode;
  className?: string;
}) {
  if (variant === "workspace") {
    return (
      <div
        className={cn(
          "-mx-4 -my-6 flex h-[calc(100dvh-var(--dashboard-topbar-height))] flex-col overflow-hidden sm:-mx-6 lg:-mx-8",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return <div className={cn("min-w-0", className)}>{children}</div>;
}
