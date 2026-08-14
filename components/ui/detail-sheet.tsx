"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WIDTH = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

/**
 * Generic detail drawer/sheet extracted from Support details + listing drawers.
 * Viewport overlay by default; `nested` fills a parent workspace (absolute).
 */
export function DetailSheet({
  open,
  onClose,
  title,
  children,
  footer,
  width = "md",
  nested = false,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: keyof typeof WIDTH;
  nested?: boolean;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "z-50 flex",
        nested ? "absolute inset-0 z-20" : "fixed inset-0",
      )}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="h-full min-w-0 flex-1 bg-nexa-ink/40"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside
        className={cn(
          "flex h-full w-full flex-col border-l border-nexa-line bg-white shadow-xl",
          WIDTH[width],
          className,
        )}
      >
        {title != null && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-nexa-line px-4 py-2.5">
            <div className="min-w-0 text-sm font-semibold text-nexa-ink">{title}</div>
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              onClick={onClose}
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer}
      </aside>
    </div>
  );
}
