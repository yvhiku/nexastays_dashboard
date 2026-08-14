"use client";

import { StatusBadge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/lib/types";
import { ticketSlaChip } from "./labels";

export function TicketListItem({
  ticket,
  selected,
  onSelect,
  assigneeLabel,
}: {
  ticket: Ticket;
  selected: boolean;
  onSelect: () => void;
  assigneeLabel?: string | null;
}) {
  const sla = ticketSlaChip(ticket);
  const preview = ticket.lastMessagePreview?.trim();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full px-3 py-2.5 text-left hover:bg-nexa-bg-2",
        selected && "bg-nexa-primary-soft/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-medium text-nexa-ink">{ticket.ticketNumber}</p>
        <StatusBadge status={ticket.status.toLowerCase()} />
      </div>
      <p className="mt-0.5 truncate text-sm text-nexa-ink-2">{ticket.subject}</p>
      <p className="mt-0.5 truncate text-xs text-nexa-ink-4">
        {ticket.customerName}
        {ticket.party === "HOST" ? " · Host" : " · Guest"}
        {preview ? ` · ${preview}` : ""}
      </p>
      {assigneeLabel ? (
        <p className="mt-0.5 truncate text-[11px] text-nexa-ink-4">{assigneeLabel}</p>
      ) : null}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {ticket.updatedAt ? (
          <RelativeTime value={ticket.updatedAt} className="text-[11px] text-nexa-ink-4" />
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-1">
          {ticket.unreadForSupport && (
            <span className="rounded-full bg-nexa-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
              New
            </span>
          )}
          {sla && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                sla === "Breached"
                  ? "bg-nexa-danger-soft text-nexa-danger"
                  : "bg-nexa-warning-soft text-[#8A5B00]",
              )}
            >
              {sla}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
