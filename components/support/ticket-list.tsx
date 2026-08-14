"use client";

import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Ticket } from "@/lib/types";
import { TicketListItem } from "./ticket-list-item";

export function TicketList({
  tickets,
  selectedId,
  loading,
  error,
  pageLabel,
  emptyTitle,
  emptyDescription,
  hasPrevious,
  hasNext,
  assigneeLabelFor,
  onSelect,
  onPrevious,
  onNext,
}: {
  tickets: Ticket[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  pageLabel: string;
  emptyTitle: string;
  emptyDescription: string | null;
  hasPrevious: boolean;
  hasNext: boolean;
  assigneeLabelFor?: (ticket: Ticket) => string | null;
  onSelect: (ticket: Ticket) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && tickets.length === 0 ? (
          <p className="py-10 text-center text-sm text-nexa-ink-4">Loading tickets…</p>
        ) : !error && tickets.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <LifeBuoy className="mx-auto h-10 w-10 text-nexa-ink-4" />
            <p className="mt-3 text-sm font-medium text-nexa-ink">{emptyTitle}</p>
            {emptyDescription && (
              <p className="mt-1 text-sm text-nexa-ink-4">{emptyDescription}</p>
            )}
          </div>
        ) : tickets.length === 0 ? null : (
          <ul className="divide-y divide-nexa-line">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <TicketListItem
                  ticket={ticket}
                  selected={selectedId === ticket.id}
                  onSelect={() => onSelect(ticket)}
                  assigneeLabel={assigneeLabelFor?.(ticket)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-nexa-line px-3 py-2 text-xs text-nexa-ink-4">
        <span>{pageLabel}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!hasPrevious || loading} onClick={onPrevious}>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={!hasNext || loading} onClick={onNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
