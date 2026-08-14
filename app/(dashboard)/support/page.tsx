"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchTicket, fetchTickets, type TicketsResult } from "@/lib/api/stays-admin";
import type { Ticket } from "@/lib/types";
import {
  SupportInboxShell,
  type AssignmentScope,
  type SlaScope,
  type SupportStatusFilter,
} from "@/components/support/support-inbox-shell";
import { isSupportAgent } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

const PAGE_SIZE = 50;

function statusQuery(filter: SupportStatusFilter): string | undefined {
  if (filter === "all") return undefined;
  if (filter === "WAITING_FOR_CUSTOMER") {
    return "WAITING_FOR_CUSTOMER,WAITING_FOR_HOST";
  }
  return filter;
}

export default function SupportPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-nexa-ink-4">Loading…</p>}>
      <SupportPageInner />
    </Suspense>
  );
}

function SupportPageInner() {
  const { session } = useAuth();
  if (isSupportAgent(session)) {
    return (
      <div>
        <PageHeader
          title="Support workspace"
          description="You are signed in as a Support Agent."
        />
        <Card className="max-w-xl p-6">
          <p className="text-sm text-nexa-ink-2">
            Ticket access will be enabled once assignment isolation is active.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-nexa-ink-4">Name</dt>
              <dd className="font-medium text-nexa-ink">{session?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-nexa-ink-4">Email</dt>
              <dd className="font-medium text-nexa-ink">{session?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-nexa-ink-4">Role</dt>
              <dd className="font-medium text-nexa-ink">
                {session?.staffRole || session?.role || "SUPPORT_AGENT"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nexa-ink-4">User ID</dt>
              <dd className="font-medium text-nexa-ink">{session?.userId ?? "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>
    );
  }
  return <SupportInboxPage />;
}

function SupportInboxPage() {
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const [filter, setFilter] = useState<SupportStatusFilter>("all");
  const [assignmentScope, setAssignmentScope] = useState<AssignmentScope>("all");
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

  const loadTickets = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const next = await fetchTickets({
          limit: PAGE_SIZE,
          offset,
          status: statusQuery(filter),
          search: query.trim() || undefined,
          unassigned: assignmentScope === "unassigned" ? true : undefined,
          assignedAdminId:
            assignmentScope === "mine" && session?.userId ? session.userId : undefined,
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
    [filter, offset, query, assignmentScope, slaScope, session?.userId, requesterUserId],
  );

  const refreshSelectedTicket = useCallback(async (ticketId: string) => {
    try {
      const next = await fetchTicket(ticketId);
      setSelectedTicket(next);
      setSelectedRefreshError(null);
    } catch (err) {
      setSelectedRefreshError(
        err instanceof Error ? err.message : "Unable to refresh this ticket.",
      );
    }
  }, []);

  useEffect(() => {
    void loadTickets(false);
  }, [loadTickets]);

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "");
    setQuery(searchParams.get("q") ?? "");
    const ticketParam = searchParams.get("ticket");
    if (ticketParam) setSelectedId(ticketParam);
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
  }

  return (
    <SupportInboxShell
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
      onRetry={() => void loadTickets(false)}
      onRetrySelected={() => {
        if (selectedId && selectedId !== "lookup") void refreshSelectedTicket(selectedId);
      }}
      onSelect={(ticket) => {
        setLookupTicket(null);
        setSelectedId(ticket.id);
        setSelectedTicket(ticket);
        setSelectedRefreshError(null);
      }}
      onClose={clearSelection}
      onChanged={async () => {
        await loadTickets(true);
        if (selectedId && selectedId !== "lookup") {
          await refreshSelectedTicket(selectedId);
        }
      }}
      onPrevious={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
      onNext={() => setOffset(offset + PAGE_SIZE)}
      onFilterChange={(value) => {
        setOffset(0);
        setFilter(value);
      }}
      onAssignmentChange={(value) => {
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
      }}
    />
  );
}
