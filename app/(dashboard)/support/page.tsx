"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchTicket,
  fetchTickets,
  fetchSupportAgentWorkload,
  joinSupportAgentsWithWorkload,
  type SupportAgentWithWorkload,
  type TicketsResult,
} from "@/lib/api/stays-admin";
import { fetchSupportAgents } from "@/lib/api/identity-admin";
import type { Ticket } from "@/lib/types";
import { SupportInboxShell } from "@/components/support/support-inbox-shell";
import {
  getSupportWorkspaceConfig,
  type AssignmentScope,
  type SlaScope,
  type SupportStatusFilter,
} from "@/lib/support-workspace";
import { ApiError } from "@/lib/api/client";

const PAGE_SIZE = 50;

function statusQuery(filter: SupportStatusFilter): string | undefined {
  if (filter === "all") return undefined;
  if (filter === "WAITING_FOR_CUSTOMER") {
    return "WAITING_FOR_CUSTOMER,WAITING_FOR_HOST";
  }
  return filter;
}

function supportHref(searchParams: URLSearchParams, ticketId: string | null) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("ticket");
  if (ticketId && ticketId !== "lookup") {
    params.set("ticket", ticketId);
  }
  const qs = params.toString();
  return qs ? `/support?${qs}` : "/support";
}

export default function SupportPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-nexa-ink-4">Loading…</p>}>
      <SupportInboxPage />
    </Suspense>
  );
}

function SupportInboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const workspaceConfig = useMemo(
    () => getSupportWorkspaceConfig(session),
    [session],
  );
  const [filter, setFilter] = useState<SupportStatusFilter>("all");
  const [assignmentScope, setAssignmentScope] = useState<AssignmentScope>(
    workspaceConfig.defaultAssignmentScope,
  );
  const [slaScope, setSlaScope] = useState<SlaScope>("all");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const requesterUserId = searchParams.get("requesterUserId") || undefined;
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => searchParams.get("ticket") ?? null,
  );
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedRefreshError, setSelectedRefreshError] = useState<string | null>(null);
  const [lookupTicket, setLookupTicket] = useState<Ticket | null>(null);
  const [lookupRef, setLookupRef] = useState("");
  const [data, setData] = useState<TicketsResult>({
    items: [],
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<SupportAgentWithWorkload[]>([]);

  const syncTicketUrl = useCallback(
    (ticketId: string | null) => {
      const next = supportHref(new URLSearchParams(searchParams.toString()), ticketId);
      const current = searchParams.toString()
        ? `/support?${searchParams.toString()}`
        : "/support";
      if (next !== current) {
        router.replace(next, { scroll: false });
      }
    },
    [router, searchParams],
  );

  const loadTickets = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      const scoped = workspaceConfig.allowedAssignmentScopes.includes(assignmentScope)
        ? assignmentScope
        : workspaceConfig.defaultAssignmentScope;
      try {
        const next = await fetchTickets({
          limit: PAGE_SIZE,
          offset,
          status: statusQuery(filter),
          search: query.trim() || undefined,
          unassigned: scoped === "unassigned" ? true : undefined,
          assignedAdminId:
            scoped === "mine" && session?.userId ? session.userId : undefined,
          slaState: slaScope === "all" ? undefined : slaScope,
          requesterUserId,
        });
        setData(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load support tickets.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [
      filter,
      offset,
      query,
      assignmentScope,
      slaScope,
      session?.userId,
      requesterUserId,
      workspaceConfig,
    ],
  );

  const refreshSelectedTicket = useCallback(
    async (ticketId: string) => {
      try {
        const next = await fetchTicket(ticketId);
        setSelectedTicket(next);
        setSelectedRefreshError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setSelectedId(null);
          setSelectedTicket(null);
          setSelectedRefreshError(null);
          syncTicketUrl(null);
          return;
        }
        setSelectedRefreshError(
          err instanceof Error ? err.message : "Unable to refresh this ticket.",
        );
      }
    },
    [syncTicketUrl],
  );

  useEffect(() => {
    setAssignmentScope(workspaceConfig.defaultAssignmentScope);
  }, [workspaceConfig.defaultAssignmentScope]);

  useEffect(() => {
    if (!workspaceConfig.canViewAgentWorkload) {
      setAgents([]);
      return;
    }
    let cancelled = false;
    void Promise.all([fetchSupportAgents(), fetchSupportAgentWorkload()])
      .then(([roster, workload]) => {
        if (!cancelled) setAgents(joinSupportAgentsWithWorkload(roster, workload));
      })
      .catch(() => {
        if (!cancelled) setAgents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceConfig.canViewAgentWorkload]);

  useEffect(() => {
    void loadTickets(false);
  }, [loadTickets]);

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "");
    setQuery(searchParams.get("q") ?? "");
    const ticketParam = searchParams.get("ticket");
    if (ticketParam) {
      setSelectedId(ticketParam);
    } else {
      setSelectedId((current) => (current === "lookup" ? current : null));
      setSelectedTicket(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setOffset(0);
      setQuery(searchInput);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!selectedId || selectedId === "lookup") return;
    const fromQueue = data.items.find((t) => t.id === selectedId);
    if (fromQueue) setSelectedTicket(fromQueue);
  }, [data.items, selectedId]);

  useEffect(() => {
    if (!selectedId || selectedId === "lookup") return;
    void refreshSelectedTicket(selectedId);
    const interval = setInterval(() => {
      void refreshSelectedTicket(selectedId);
      void loadTickets(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedId, loadTickets, refreshSelectedTicket]);

  const tickets = data.items;
  const selected =
    selectedId === "lookup" ? lookupTicket : selectedId ? selectedTicket : null;

  const pageLabel = useMemo(() => {
    if (data.total === 0) return "0 tickets";
    const from = data.offset + 1;
    const to = Math.min(data.offset + tickets.length, data.total);
    return `${from}–${to} of ${data.total}`;
  }, [data.offset, data.total, tickets.length]);

  function clearSelection() {
    setSelectedId(null);
    setSelectedTicket(null);
    setLookupTicket(null);
    setSelectedRefreshError(null);
    syncTicketUrl(null);
  }

  return (
    <SupportInboxShell
      workspaceConfig={workspaceConfig}
      tickets={tickets}
      selected={selected}
      selectedId={selectedId}
      loading={loading}
      error={error}
      selectedRefreshError={selectedRefreshError}
      pageLabel={pageLabel}
      hasPrevious={offset > 0}
      hasNext={data.hasMore}
      filter={filter}
      assignmentScope={assignmentScope}
      slaScope={slaScope}
      searchInput={searchInput}
      lookupRef={lookupRef}
      ticketCount={data.total}
      agents={agents}
      onRetry={() => void loadTickets(false)}
      onRetrySelected={() => {
        if (selectedId && selectedId !== "lookup") void refreshSelectedTicket(selectedId);
      }}
      onSelect={(ticket) => {
        setLookupTicket(null);
        setSelectedId(ticket.id);
        setSelectedTicket(ticket);
        setSelectedRefreshError(null);
        syncTicketUrl(ticket.id === "lookup" ? null : ticket.id);
      }}
      onClose={clearSelection}
      onChanged={async () => {
        await loadTickets(true);
      }}
      onTicketPatched={(ticket) => {
        setSelectedTicket(ticket);
      }}
      onPrevious={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
      onNext={() => setOffset(offset + PAGE_SIZE)}
      onFilterChange={(value) => {
        setOffset(0);
        setFilter(value);
      }}
      onAssignmentChange={(value) => {
        if (!workspaceConfig.allowedAssignmentScopes.includes(value)) return;
        setOffset(0);
        setAssignmentScope(value);
      }}
      onSlaChange={(value) => {
        setOffset(0);
        setSlaScope(value);
      }}
      onSearchChange={setSearchInput}
      onLookupRefChange={setLookupRef}
      onLookup={() => {
        if (!workspaceConfig.canViewBookingLookup) return;
        const lookup: Ticket = {
          id: "lookup",
          ticketNumber: "Lookup",
          subject: "Booking context",
          category: "BOOKING",
          customerName: "—",
          party: "GUEST",
          status: "OPEN",
          priority: "NORMAL",
          createdAt: "",
          updatedAt: "",
          bookingId: lookupRef.trim(),
          bookingRef: lookupRef.trim(),
        };
        setLookupTicket(lookup);
        setSelectedId("lookup");
        setSelectedTicket(null);
        setSelectedRefreshError(null);
        syncTicketUrl(null);
      }}
    />
  );
}
