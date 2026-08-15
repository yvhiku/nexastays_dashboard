"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/lib/types";
import type {
  AssignmentScope,
  SlaScope,
  SupportStatusFilter,
  SupportWorkspaceConfig,
} from "@/lib/support-workspace";
import type { SupportAgentWithWorkload } from "@/lib/api/stays-admin";
import { assignedAgentListLabel, resolveAssignedAgent } from "./assigned-agent";
import { TicketList } from "./ticket-list";
import { TicketWorkspace } from "./ticket-workspace";

export type { AssignmentScope, SlaScope, SupportStatusFilter };

export function SupportInboxShell({
  workspaceConfig,
  tickets,
  selected,
  selectedId,
  loading,
  error,
  selectedRefreshError,
  pageLabel,
  hasPrevious,
  hasNext,
  filter,
  assignmentScope,
  slaScope,
  searchInput,
  lookupRef,
  ticketCount,
  agents,
  onRetry,
  onRetrySelected,
  onSelect,
  onClose,
  onChanged,
  onTicketPatched,
  onTicketGone,
  onPrevious,
  onNext,
  onFilterChange,
  onAssignmentChange,
  onSlaChange,
  onSearchChange,
  onLookupRefChange,
  onLookup,
  headerExtra,
}: {
  workspaceConfig: SupportWorkspaceConfig;
  tickets: Ticket[];
  selected: Ticket | null;
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  selectedRefreshError: string | null;
  pageLabel: string;
  hasPrevious: boolean;
  hasNext: boolean;
  filter: SupportStatusFilter;
  assignmentScope: AssignmentScope;
  slaScope: SlaScope;
  searchInput: string;
  lookupRef: string;
  ticketCount: number;
  agents: SupportAgentWithWorkload[];
  onRetry: () => void;
  onRetrySelected: () => void;
  onSelect: (ticket: Ticket) => void;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onTicketPatched?: (ticket: Ticket) => void;
  onTicketGone?: (ticketId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFilterChange: (value: SupportStatusFilter) => void;
  onAssignmentChange: (value: AssignmentScope) => void;
  onSlaChange: (value: SlaScope) => void;
  onSearchChange: (value: string) => void;
  onLookupRefChange: (value: string) => void;
  onLookup: () => void;
  headerExtra?: ReactNode;
}) {
  const hasSelection = Boolean(selectedId);
  const isAgent = workspaceConfig.mode === "AGENT";
  const unassignedQueue = assignmentScope === "unassigned";
  const queueTitle = unassignedQueue ? "Unassigned Tickets" : workspaceConfig.queueTitle;
  const emptyTitle = unassignedQueue ? "No unassigned tickets" : workspaceConfig.emptyTitle;
  const emptyDescription = unassignedQueue
    ? "New tickets without an assigned support agent will appear here."
    : workspaceConfig.emptyDescription;
  const statusOptions = workspaceConfig.statusFilterOptions.map((option) => ({
    ...option,
    count:
      option.value === "all" && !isAgent ? ticketCount : undefined,
  }));

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-var(--dashboard-topbar-height))] flex-col overflow-hidden sm:-mx-6 lg:-mx-8">
      <div
        className={cn(
          "shrink-0 border-b border-nexa-line bg-white px-4 py-3 sm:px-6",
          hasSelection && "hidden lg:block",
        )}
      >
        {(isAgent || unassignedQueue) && (
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-nexa-ink-4">
              Support
            </p>
            <h1 className="font-display text-lg font-semibold text-nexa-ink">
              {queueTitle}
            </h1>
            {unassignedQueue ? (
              <p className="mt-0.5 text-xs text-nexa-ink-4">
                {ticketCount} unassigned
              </p>
            ) : null}
            {headerExtra}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={searchInput}
            onChange={onSearchChange}
            placeholder="Search tickets…"
            className="w-full sm:w-56"
          />
          <FilterTabs<SupportStatusFilter>
            value={filter}
            onChange={onFilterChange}
            options={statusOptions}
          />
          {workspaceConfig.canViewAssignmentFilters && (
            <FilterTabs<AssignmentScope>
              value={assignmentScope}
              onChange={onAssignmentChange}
              options={workspaceConfig.assignmentFilterOptions}
            />
          )}
          {workspaceConfig.canViewSlaFilters && (
            <FilterTabs<SlaScope>
              value={slaScope}
              onChange={onSlaChange}
              options={[
                { value: "all", label: "All SLA" },
                { value: "AT_RISK", label: "At risk" },
                { value: "BREACHED", label: "Breached" },
              ]}
            />
          )}
          {workspaceConfig.canViewBookingLookup && (
            <div className="flex min-w-[12rem] flex-1 items-center gap-2">
              <input
                value={lookupRef}
                onChange={(e) => onLookupRefChange(e.target.value)}
                placeholder="Booking lookup"
                aria-label="Booking context lookup"
                className="h-9 min-w-0 flex-1 rounded-md border border-nexa-line px-3 text-sm"
              />
              <Button size="sm" onClick={onLookup} disabled={!lookupRef.trim()}>
                Open
              </Button>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-nexa-danger/30 bg-nexa-danger-soft px-3 py-2 text-sm text-nexa-danger">
            <p>Unable to load support tickets. {error}</p>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "min-h-0 w-full shrink-0 border-nexa-line lg:w-[360px] lg:border-r",
            hasSelection ? "hidden lg:flex lg:flex-col" : "flex flex-col",
          )}
        >
          <TicketList
            tickets={tickets}
            selectedId={selectedId}
            loading={loading}
            error={error}
            pageLabel={pageLabel}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            assigneeLabelFor={
              isAgent
                ? undefined
                : (ticket) =>
                    assignedAgentListLabel(
                      resolveAssignedAgent(ticket.assignee, agents),
                    )
            }
            onSelect={onSelect}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </div>
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1",
            hasSelection ? "flex flex-col" : "hidden lg:flex lg:flex-col",
          )}
        >
          <TicketWorkspace
            workspaceConfig={workspaceConfig}
            ticket={selected}
            selectedId={selectedId}
            filter={filter}
            selectedRefreshError={selectedRefreshError}
            agents={agents}
            onRetrySelected={onRetrySelected}
            onClose={onClose}
            onChanged={onChanged}
            onTicketPatched={onTicketPatched}
            onTicketGone={onTicketGone}
          />
        </div>
      </div>
    </div>
  );
}
