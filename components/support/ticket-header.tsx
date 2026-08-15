"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import type { Ticket, TicketPriority, TicketStatus } from "@/lib/types";
import type { SupportWorkspaceConfig } from "@/lib/support-workspace";
import type { SupportAgent } from "@/lib/api/identity-admin";
import { AgentAvatar } from "./agent-avatar";
import {
  assignedAgentDisplayName,
  assignedAgentSubtitle,
  resolveAssignedAgent,
} from "./assigned-agent";

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
  workspaceConfig,
  ticket,
  agents,
  isLookup,
  statusChanging,
  showBack,
  showDetailsButton,
  filterMismatchNote,
  onBack,
  onDetails,
  onStatusChange,
  onPriorityChange,
  onOpenAssign,
}: {
  workspaceConfig: SupportWorkspaceConfig;
  ticket: Ticket;
  agents: SupportAgent[];
  isLookup: boolean;
  statusChanging: boolean;
  showBack: boolean;
  showDetailsButton: boolean;
  filterMismatchNote?: string | null;
  onBack: () => void;
  onDetails: () => void;
  onStatusChange: (status: TicketStatus) => void;
  onPriorityChange: (priority: TicketPriority) => void;
  onOpenAssign: () => void;
}) {
  const statusOptions = Array.from(new Set([ticket.status, ...STATUS_ACTIONS]));
  const assignedToYou =
    Boolean(ticket.assignee) &&
    Boolean(workspaceConfig.currentUserId) &&
    ticket.assignee === workspaceConfig.currentUserId;
  const canAssign =
    workspaceConfig.canAssignTickets ||
    workspaceConfig.canReassignTickets ||
    workspaceConfig.canUnassignTickets;
  const assignment = resolveAssignedAgent(ticket.assignee, agents);
  const agentName = assignedAgentDisplayName(assignment);
  const subtitle = assignedAgentSubtitle(assignment, ticket.status);
  const assignmentAction = ticket.assignee ? "Change" : "Assign";
  const showAvatar =
    assignment.kind !== "unassigned" && assignment.agent != null;

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
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            className={selectClass}
            value={ticket.status}
            disabled={statusChanging || !workspaceConfig.canChangeStatus}
            aria-label="Ticket status"
            onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {workspaceConfig.canChangePriority && (
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
          )}
          {canAssign ? (
            <div className="flex min-w-0 items-center gap-2">
              {showAvatar && assignment.agent && (
                <AgentAvatar
                  name={agentName}
                  photoUrl={assignment.agent.profilePhotoUrl}
                />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase text-nexa-ink-4">
                  Assigned support agent
                </p>
                <p className="truncate text-sm font-medium text-nexa-ink">{agentName}</p>
                {subtitle && (
                  <p className="truncate text-xs text-nexa-ink-3">{subtitle}</p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={onOpenAssign}>
                {assignmentAction}
              </Button>
            </div>
          ) : assignedToYou ? (
            <p className="text-xs text-nexa-ink-3">Assigned to you</p>
          ) : null}
        </div>
      )}
      {filterMismatchNote && (
        <p className="mt-2 text-xs text-nexa-ink-3">{filterMismatchNote}</p>
      )}
    </div>
  );
}
