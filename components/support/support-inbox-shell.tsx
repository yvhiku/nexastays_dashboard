"use client";

import { Button } from "@/components/ui/button";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { cn } from "@/lib/utils";
import type { Ticket, TicketStatus } from "@/lib/types";
import { TicketList } from "./ticket-list";
import { TicketWorkspace } from "./ticket-workspace";

export type SupportStatusFilter = "all" | TicketStatus;
export type AssignmentScope = "all" | "mine" | "unassigned";
export type SlaScope = "all" | "AT_RISK" | "BREACHED";

export function SupportInboxShell({
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
  onRetry,
  onRetrySelected,
  onSelect,
  onClose,
  onChanged,
  onPrevious,
  onNext,
  onFilterChange,
  onAssignmentChange,
  onSlaChange,
  onSearchChange,
  onLookupRefChange,
  onLookup,
}: {
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
  onRetry: () => void;
  onRetrySelected: () => void;
  onSelect: (ticket: Ticket) => void;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onPrevious: () => void;
  onNext: () => void;
  onFilterChange: (value: SupportStatusFilter) => void;
  onAssignmentChange: (value: AssignmentScope) => void;
  onSlaChange: (value: SlaScope) => void;
  onSearchChange: (value: string) => void;
  onLookupRefChange: (value: string) => void;
  onLookup: () => void;
}) {
  const hasSelection = Boolean(selectedId);

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-var(--dashboard-topbar-height))] flex-col overflow-hidden sm:-mx-6 lg:-mx-8">
      <div
        className={cn(
          "shrink-0 border-b border-nexa-line bg-white px-4 py-3 sm:px-6",
          hasSelection && "hidden lg:block",
        )}
      >
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
            options={[
              { value: "all", label: "All statuses", count: ticketCount },
              { value: "OPEN", label: "Open" },
              { value: "IN_PROGRESS", label: "In progress" },
              { value: "WAITING_FOR_CUSTOMER", label: "Waiting" },
              { value: "ESCALATED", label: "Escalated" },
              { value: "RESOLVED", label: "Resolved" },
              { value: "CLOSED", label: "Closed" },
            ]}
          />
          <FilterTabs<AssignmentScope>
            value={assignmentScope}
            onChange={onAssignmentChange}
            options={[
              { value: "all", label: "All assignees" },
              { value: "mine", label: "My" },
              { value: "unassigned", label: "Unassigned" },
            ]}
          />
          <FilterTabs<SlaScope>
            value={slaScope}
            onChange={onSlaChange}
            options={[
              { value: "all", label: "All SLA" },
              { value: "AT_RISK", label: "At risk" },
              { value: "BREACHED", label: "Breached" },
            ]}
          />
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
            hasPrevious={hasPrevious}
            hasNext={hasNext}
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
            ticket={selected}
            selectedId={selectedId}
            filter={filter}
            selectedRefreshError={selectedRefreshError}
            onRetrySelected={onRetrySelected}
            onClose={onClose}
            onChanged={onChanged}
          />
        </div>
      </div>
    </div>
  );
}
