"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import type { Ticket, TicketPriority, TicketStatus } from "@/lib/types";

const STATUS_ACTIONS: TicketStatus[] = [
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];
const PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

const selectClass =
  "h-8 max-w-[11rem] rounded-md border border-nexa-line bg-white px-2 text-xs text-nexa-ink disabled:bg-nexa-bg-2";

export function TicketHeader({
  ticket,
  isLookup,
  statusChanging,
  showBack,
  showDetailsButton,
  onBack,
  onDetails,
  onStatusChange,
  onPriorityChange,
  onAssignSelf,
  onUnassign,
}: {
  ticket: Ticket;
  isLookup: boolean;
  statusChanging: boolean;
  showBack: boolean;
  showDetailsButton: boolean;
  onBack: () => void;
  onDetails: () => void;
  onStatusChange: (status: TicketStatus) => void;
  onPriorityChange: (priority: TicketPriority) => void;
  onAssignSelf: () => void;
  onUnassign: () => void;
}) {
  const statusOptions = Array.from(new Set([ticket.status, ...STATUS_ACTIONS]));

  return (
    <div className="shrink-0 border-b border-nexa-line px-3 py-2.5">
      <div className="flex items-start gap-2">
        {showBack && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-0.5 shrink-0 px-2 lg:hidden"
            onClick={onBack}
            aria-label="Back to tickets"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-base font-semibold text-nexa-ink">
              {ticket.ticketNumber || "Ticket"}
            </p>
            <StatusBadge status={ticket.status.toLowerCase()} />
          </div>
          <p className="truncate text-sm text-nexa-ink-3">{ticket.subject}</p>
        </div>
        {showDetailsButton && (
          <Button size="sm" variant="outline" className="shrink-0 2xl:hidden" onClick={onDetails}>
            Details
          </Button>
        )}
      </div>
      {!isLookup && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <select
            className={selectClass}
            value={ticket.status}
            disabled={statusChanging}
            aria-label="Ticket status"
            onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={ticket.priority}
            aria-label="Ticket priority"
            onChange={(e) => onPriorityChange(e.target.value as TicketPriority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {ticket.assignee ? (
            <Button size="sm" variant="outline" onClick={onUnassign}>
              Unassign
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onAssignSelf}>
              Assign to me
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
