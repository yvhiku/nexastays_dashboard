"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TicketDetailsSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 flex 2xl:hidden">
      <button
        type="button"
        className="h-full flex-1 bg-nexa-ink/30"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-nexa-line bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-nexa-line px-3 py-2">
          <p className="text-sm font-semibold text-nexa-ink">Details</p>
          <Button size="sm" variant="ghost" className="px-2" onClick={onClose} aria-label="Close details">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </aside>
    </div>
  );
}
