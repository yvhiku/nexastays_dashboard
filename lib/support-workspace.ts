import type { AdminSession } from "@/lib/api/auth";
import type { TicketStatus } from "@/lib/types";
import { isSupportAgent } from "@/lib/rbac";

export type SupportWorkspaceMode = "ADMIN" | "AGENT";
export type AssignmentScope = "all" | "mine" | "unassigned";
export type SlaScope = "all" | "AT_RISK" | "BREACHED";
export type SupportStatusFilter = "all" | TicketStatus;

export type SupportStatusFilterOption = {
  value: SupportStatusFilter;
  label: string;
};

export type SupportWorkspaceConfig = {
  mode: SupportWorkspaceMode;
  currentUserId?: string;
  allowedAssignmentScopes: AssignmentScope[];
  defaultAssignmentScope: AssignmentScope;
  canChangeAssignment: boolean;
  canAssignTickets: boolean;
  canReassignTickets: boolean;
  canUnassignTickets: boolean;
  canViewAgentWorkload: boolean;
  canManageSupportAgents: boolean;
  canChangePriority: boolean;
  canViewAssignmentFilters: boolean;
  canViewSlaFilters: boolean;
  canViewBookingLookup: boolean;
  canNavigateOpsContext: boolean;
  canFetchOpsContext: boolean;
  canReply: boolean;
  canChangeStatus: boolean;
  canReopenTickets: boolean;
  canCreateNotes: boolean;
  canViewSignals: boolean;
  canViewOperations: boolean;
  canViewQueueHealth: boolean;
  canViewAttentionQueue: boolean;
  canViewAgentMonitoring: boolean;
  canViewSupportAnalytics: boolean;
  canViewGlobalSignals: boolean;
  statusFilterOptions: SupportStatusFilterOption[];
  assignmentFilterOptions: { value: AssignmentScope; label: string }[];
  queueTitle: string;
  emptyTitle: string;
  emptyDescription: string | null;
  emptyWorkspaceHint: string;
};

const ADMIN_STATUS_FILTERS: SupportStatusFilterOption[] = [
  { value: "all", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_FOR_CUSTOMER", label: "Waiting" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const AGENT_STATUS_FILTERS: SupportStatusFilterOption[] = [
  { value: "all", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_FOR_CUSTOMER", label: "Waiting" },
  { value: "CLOSED", label: "Closed" },
];

const ADMIN_ASSIGNMENT_FILTERS: { value: AssignmentScope; label: string }[] = [
  { value: "all", label: "All assignees" },
  { value: "mine", label: "My" },
  { value: "unassigned", label: "Unassigned" },
];

export function getSupportWorkspaceConfig(
  session: AdminSession | null | undefined,
): SupportWorkspaceConfig {
  if (isSupportAgent(session)) {
    return {
      mode: "AGENT",
      currentUserId: session?.userId,
      allowedAssignmentScopes: ["mine"],
      defaultAssignmentScope: "mine",
      canChangeAssignment: false,
      canAssignTickets: false,
      canReassignTickets: false,
      canUnassignTickets: false,
      canViewAgentWorkload: false,
      canManageSupportAgents: false,
      canChangePriority: false,
      canViewAssignmentFilters: false,
      canViewSlaFilters: false,
      canViewBookingLookup: false,
      canNavigateOpsContext: false,
      canFetchOpsContext: false,
      canReply: true,
      canChangeStatus: true,
      canReopenTickets: false,
      canCreateNotes: true,
      canViewSignals: true,
      canViewOperations: false,
      canViewQueueHealth: false,
      canViewAttentionQueue: false,
      canViewAgentMonitoring: false,
      canViewSupportAnalytics: false,
      canViewGlobalSignals: false,
      statusFilterOptions: AGENT_STATUS_FILTERS,
      assignmentFilterOptions: [],
      queueTitle: "My Tickets",
      emptyTitle: "No tickets assigned to you",
      emptyDescription: "New tickets assigned to you will appear here.",
      emptyWorkspaceHint: "Select a ticket to see conversation and context.",
    };
  }

  return {
    mode: "ADMIN",
    currentUserId: session?.userId,
    allowedAssignmentScopes: ["all", "mine", "unassigned"],
    defaultAssignmentScope: "all",
    canChangeAssignment: true,
    canAssignTickets: true,
    canReassignTickets: true,
    canUnassignTickets: true,
    canViewAgentWorkload: true,
    canManageSupportAgents: true,
    canChangePriority: true,
    canViewAssignmentFilters: true,
    canViewSlaFilters: true,
    canViewBookingLookup: true,
    canNavigateOpsContext: true,
    canFetchOpsContext: true,
    canReply: true,
    canChangeStatus: true,
    canReopenTickets: true,
    canCreateNotes: true,
    canViewSignals: true,
    canViewOperations: true,
    canViewQueueHealth: true,
    canViewAttentionQueue: true,
    canViewAgentMonitoring: true,
    canViewSupportAnalytics: true,
    canViewGlobalSignals: true,
    statusFilterOptions: ADMIN_STATUS_FILTERS,
    assignmentFilterOptions: ADMIN_ASSIGNMENT_FILTERS,
    queueTitle: "Support",
    emptyTitle: "No support tickets right now.",
    emptyDescription: null,
    emptyWorkspaceHint: "Select a ticket or look up a booking to see context.",
  };
}
