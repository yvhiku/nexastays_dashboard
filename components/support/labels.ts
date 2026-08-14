import type { Ticket, TicketMessage } from "@/lib/types";

export function senderLabel(senderType: TicketMessage["senderType"]) {
  if (senderType === "SUPPORT_AGENT") return "Support";
  if (senderType === "SYSTEM") return "System";
  return "Customer";
}

export function formatActivityAction(action: string) {
  return action.replace(/_/g, " ");
}

export function slaLabel(state: string | undefined) {
  if (state === "AT_RISK") return "At risk";
  if (state === "BREACHED") return "Breached";
  return "On track";
}

export function signalChip(type: string) {
  if (type === "SLA_ATTENTION") return "SLA At Risk";
  if (type === "SLA_BREACHED") return "SLA Breached";
  if (type === "REPEAT_REPORT" || type === "REPEAT_SAFETY_REPORT") return "Repeat Reports";
  if (type === "UNASSIGNED_HIGH_PRIORITY") return "Unassigned High Priority";
  if (type === "MULTIPLE_OPEN_TICKETS") return "Multiple Open Tickets";
  return type.replace(/_/g, " ");
}

export function relationshipLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function ticketSlaChip(ticket: Ticket): string | null {
  const response = ticket.sla?.firstResponse.state;
  const resolution = ticket.sla?.resolution.state;
  if (response === "BREACHED" || resolution === "BREACHED") return "Breached";
  if (response === "AT_RISK" || resolution === "AT_RISK") return "At risk";
  const types = ticket.operationalSignalTypes ?? [];
  if (types.includes("SLA_BREACHED")) return "Breached";
  if (types.includes("SLA_ATTENTION")) return "At risk";
  return null;
}
