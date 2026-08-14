"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchTickets, type TicketsResult } from "@/lib/api/stays-admin";
import type { Ticket } from "@/lib/types";
import {
  SupportInboxShell,
  type AssignmentScope,
  type SlaScope,
  type SupportStatusFilter,
} from "@/components/support/support-inbox-shell";

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
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const [filter, setFilter] = useState<SupportStatusFilter>("OPEN");
  const [assignmentScope, setAssignmentScope] = useState<AssignmentScope>("all");
  const [slaScope, setSlaScope] = useState<SlaScope>("all");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => searchParams.get("ticket") ?? null,
  );
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

  const loadTickets = useCallback(async () => {
    setLoading(true);
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
      });
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, [filter, offset, query, assignmentScope, slaScope, session?.userId]);

  useEffect(() => {
    void loadTickets();
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
    const interval = setInterval(() => {
      void loadTickets();
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedId, loadTickets]);

  const tickets = data.items;
  const selected =
    selectedId === "lookup"
      ? lookupTicket
      : (tickets.find((t) => t.id === selectedId) ?? null);

  const pageLabel = useMemo(() => {
    if (data.total === 0) return "0 tickets";
    const from = data.offset + 1;
    const to = Math.min(data.offset + tickets.length, data.total);
    return `${from}–${to} of ${data.total}`;
  }, [data.offset, data.total, tickets.length]);

  return (
    <SupportInboxShell
      tickets={tickets}
      selected={selected}
      selectedId={selectedId}
      loading={loading}
      error={error}
      pageLabel={pageLabel}
      hasPrevious={offset > 0}
      hasNext={data.hasMore}
      filter={filter}
      assignmentScope={assignmentScope}
      slaScope={slaScope}
      searchInput={searchInput}
      lookupRef={lookupRef}
      ticketCount={data.total}
      onRetry={() => void loadTickets()}
      onSelect={(ticket) => {
        setLookupTicket(null);
        setSelectedId(ticket.id);
      }}
      onClose={() => {
        setSelectedId(null);
        setLookupTicket(null);
      }}
      onChanged={loadTickets}
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
        setLookupTicket({
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
        });
        setSelectedId("lookup");
      }}
    />
  );
}
