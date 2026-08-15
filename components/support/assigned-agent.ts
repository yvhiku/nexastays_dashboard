import {
  supportAgentDisplayName,
  type SupportAgent,
} from "@/lib/api/identity-admin";
import type { Ticket, TicketStatus } from "@/lib/types";

export type AssignedAgentResolution =
  | { kind: "unassigned" }
  | { kind: "assigned"; agent: SupportAgent }
  | { kind: "unavailable"; agent?: SupportAgent };

export function resolveAssignedAgent(
  assigneeId: string | null | undefined,
  agents: SupportAgent[],
): AssignedAgentResolution {
  if (!assigneeId) return { kind: "unassigned" };
  const agent = agents.find((row) => row.id === assigneeId);
  if (agent && agent.status === "ACTIVE") {
    return { kind: "assigned", agent };
  }
  return { kind: "unavailable", agent };
}

export function humanTicketStatus(status: TicketStatus | string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Header / details primary name. */
export function assignedAgentDisplayName(
  resolution: AssignedAgentResolution,
): string {
  if (resolution.kind === "unassigned") return "Unassigned";
  if (resolution.agent) return supportAgentDisplayName(resolution.agent);
  return "Unavailable agent";
}

export function assignedAgentSubtitle(
  resolution: AssignedAgentResolution,
  ticketStatus: Ticket["status"],
): string | null {
  if (resolution.kind === "unassigned") return null;
  if (resolution.kind === "unavailable") return "Unavailable";
  return humanTicketStatus(ticketStatus);
}

/** Compact inbox list line. Frozen agents keep their name. */
export function assignedAgentListLabel(
  resolution: AssignedAgentResolution,
): string {
  if (resolution.kind === "unassigned") return "Unassigned";
  if (resolution.kind === "assigned") {
    return supportAgentDisplayName(resolution.agent);
  }
  if (resolution.agent) {
    return `${supportAgentDisplayName(resolution.agent)} · Unavailable`;
  }
  return "Unavailable agent";
}
