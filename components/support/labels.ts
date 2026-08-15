import type { Ticket, TicketMessage } from "@/lib/types";

export function senderLabel(senderType: TicketMessage["senderType"]) {
  if (senderType === "SUPPORT_AGENT") return "Support";
  if (senderType === "SYSTEM") return "System";
  return "Customer";
}

export function formatActivityAction(
  action: string,
  metadata?: Record<string, unknown>,
  agentNames?: Record<string, string>,
) {
  if (action === "support_ticket_assigned") {
    const toId = (metadata?.toAdminId ?? metadata?.to_admin_id) as string | null | undefined;
    const fromId = (metadata?.fromAdminId ?? metadata?.from_admin_id) as
      | string
      | null
      | undefined;
    const nameFor = (id: string | null | undefined) =>
      id ? agentNames?.[id] ?? "unavailable agent" : null;
    if (!toId) {
      return fromId ? `Unassigned from ${nameFor(fromId)}` : "Unassigned";
    }
    const assigned = `Assigned to ${nameFor(toId)}`;
    if (metadata?.source === "AUTO") {
      const bits = ["Automatically assigned to " + (nameFor(toId) ?? "an agent")];
      if (metadata.categoryMatch) bits.push("Category match");
      if (metadata.languageMatch) {
        const language = String(metadata.language ?? "").toLowerCase();
        bits.push(
          language === "fr"
            ? "French"
            : language === "ar"
              ? "Arabic"
              : language === "en"
                ? "English"
                : "Language match",
        );
      }
      if (metadata.routingScore != null) bits.push(`Routing score ${metadata.routingScore}`);
      return bits.join(" · ");
    }
    return assigned;
  }
  if (action === "support_ticket_reopened") {
    const reason = String(metadata?.reason ?? "");
    return reason
      ? `Ticket reopened · ${reopenReasonLabel(reason)}`
      : "Ticket reopened";
  }
  if (action === "support_ticket_resolution_changed") {
    const next = String(
      metadata?.newResolutionType ?? metadata?.new_resolution_type ?? "",
    );
    return next
      ? `Resolution marked as ${resolutionTypeLabel(next)}`
      : "Resolution updated";
  }
  return action.replace(/_/g, " ");
}

export function resolutionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    ISSUE_FIXED: "Issue fixed",
    INFORMATION_PROVIDED: "Information provided",
    PAYMENT_RESOLVED: "Payment resolved",
    BOOKING_UPDATED: "Booking updated",
    POLICY_EXPLAINED: "Policy explained",
    DUPLICATE: "Duplicate",
    NO_ACTION_POSSIBLE: "No action possible",
    OTHER: "Other",
  };
  return labels[type] ?? type.replace(/_/g, " ").toLowerCase();
}

export function reopenReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    CUSTOMER_UNRESOLVED: "Customer reported unresolved",
    INCORRECT_RESOLUTION: "Incorrect resolution",
    ADDITIONAL_INFORMATION: "Additional information",
    NEW_RELATED_ISSUE: "New related issue",
    ADMIN_REVIEW: "Admin review",
    ADMIN_FOLLOW_UP: "Admin follow-up",
    OTHER: "Other",
  };
  return labels[reason] ?? reason.replace(/_/g, " ").toLowerCase();
}

export const SUPPORT_RESOLUTION_TYPES = [
  "ISSUE_FIXED",
  "INFORMATION_PROVIDED",
  "PAYMENT_RESOLVED",
  "BOOKING_UPDATED",
  "POLICY_EXPLAINED",
  "DUPLICATE",
  "NO_ACTION_POSSIBLE",
  "OTHER",
] as const;

export const SUPPORT_REOPEN_REASONS = [
  "CUSTOMER_UNRESOLVED",
  "INCORRECT_RESOLUTION",
  "ADDITIONAL_INFORMATION",
  "NEW_RELATED_ISSUE",
  "ADMIN_REVIEW",
  "ADMIN_FOLLOW_UP",
  "OTHER",
] as const;

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
  if (type === "FOLLOW_UP_REQUIRED") return "Follow-up required";
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

export function statusMatchesFilter(
  status: string,
  filter: string,
): boolean {
  if (filter === "all") return true;
  if (filter === "WAITING_FOR_CUSTOMER") {
    return status === "WAITING_FOR_CUSTOMER" || status === "WAITING_FOR_HOST";
  }
  return status === filter;
}
