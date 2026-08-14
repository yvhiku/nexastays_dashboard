"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LifeBuoy, Send, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { useAuth } from "@/components/providers/auth-provider";
import {
  createTicketNote,
  fetchBookingDetail,
  fetchCannedReplies,
  fetchTicket,
  fetchTicketActivity,
  fetchTicketMessages,
  fetchTicketNotes,
  fetchTickets,
  patchOperationalSignal,
  patchTicket,
  sendTicketMessage,
  ticketContextHref,
  type TicketsResult,
} from "@/lib/api/stays-admin";
import { ApiError } from "@/lib/api/client";
import { formatDateTime, cn } from "@/lib/utils";
import type {
  BookingDetail,
  CannedReply,
  SupportActivityItem,
  Ticket,
  TicketDetail,
  TicketMessage,
  TicketNote,
  TicketPriority,
  TicketStatus,
  OperationalSignal,
} from "@/lib/types";

type Filter = "all" | TicketStatus;
type AssignmentScope = "all" | "mine" | "unassigned";
type SlaScope = "all" | "AT_RISK" | "BREACHED";

const PAGE_SIZE = 50;

const STATUS_ACTIONS: TicketStatus[] = [
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];
const PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

function senderLabel(senderType: TicketMessage["senderType"]) {
  if (senderType === "SUPPORT_AGENT") return "Support";
  if (senderType === "SYSTEM") return "System";
  return "Customer";
}

function statusQuery(filter: Filter): string | undefined {
  if (filter === "all") return undefined;
  if (filter === "WAITING_FOR_CUSTOMER") {
    return "WAITING_FOR_CUSTOMER,WAITING_FOR_HOST";
  }
  return filter;
}

function formatActivityAction(action: string) {
  return action.replace(/_/g, " ");
}

function slaLabel(state: string | undefined) {
  if (state === "AT_RISK") return "At risk";
  if (state === "BREACHED") return "Breached";
  return "On track";
}

function signalChip(type: string) {
  if (type === "SLA_ATTENTION") return "SLA At Risk";
  if (type === "SLA_BREACHED") return "SLA Breached";
  if (type === "REPEAT_REPORT" || type === "REPEAT_SAFETY_REPORT") return "Repeat Reports";
  if (type === "UNASSIGNED_HIGH_PRIORITY") return "Unassigned High Priority";
  if (type === "MULTIPLE_OPEN_TICKETS") return "Multiple Open Tickets";
  return type.replace(/_/g, " ");
}

function relationshipLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
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
  const [filter, setFilter] = useState<Filter>("OPEN");
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
          assignmentScope === "mine" && session?.userId
            ? session.userId
            : undefined,
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
    <div>
      <PageHeader
        title="Support"
        description="Live Stays support tickets. Replies land on the customer Messages → Support thread."
      />

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-nexa-danger/30 bg-nexa-danger-soft px-3 py-2 text-sm text-nexa-danger">
          <p>Unable to load support tickets. {error}</p>
          <Button size="sm" variant="outline" onClick={() => void loadTickets()}>
            Retry
          </Button>
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase text-nexa-ink-4">
              Booking context lookup
            </label>
            <input
              value={lookupRef}
              onChange={(e) => setLookupRef(e.target.value)}
              placeholder="NST-2026-000184 or booking UUID"
              className="mt-1 h-9 w-full rounded-md border border-nexa-line px-3 text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
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
            disabled={!lookupRef.trim()}
          >
            Open context
          </Button>
        </CardContent>
      </Card>

      <div className="mb-3">
        <FilterTabs<AssignmentScope>
          value={assignmentScope}
          onChange={(value) => {
            setOffset(0);
            setAssignmentScope(value);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "mine", label: "My" },
            { value: "unassigned", label: "Unassigned" },
          ]}
        />
      </div>

      <div className="mb-3">
        <FilterTabs<SlaScope>
          value={slaScope}
          onChange={(value) => {
            setOffset(0);
            setSlaScope(value);
          }}
          options={[
            { value: "all", label: "All SLA" },
            { value: "AT_RISK", label: "At risk" },
            { value: "BREACHED", label: "Breached" },
          ]}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={(value) => {
            setOffset(0);
            setFilter(value);
          }}
          options={[
            { value: "OPEN", label: "Open" },
            { value: "IN_PROGRESS", label: "In progress" },
            { value: "WAITING_FOR_CUSTOMER", label: "Waiting" },
            { value: "ESCALATED", label: "Escalated" },
            { value: "RESOLVED", label: "Resolved" },
            { value: "CLOSED", label: "Closed" },
            { value: "all", label: "All statuses", count: data.total },
          ]}
        />
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search tickets…"
          className="lg:w-72"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          {loading && tickets.length === 0 ? (
            <p className="py-10 text-center text-sm text-nexa-ink-4">Loading tickets…</p>
          ) : !error && tickets.length === 0 ? (
            <div className="py-12 text-center">
              <LifeBuoy className="mx-auto h-10 w-10 text-nexa-ink-4" />
              <p className="mt-3 text-sm text-nexa-ink-4">No support tickets right now.</p>
            </div>
          ) : tickets.length === 0 ? null : (
            <>
              <ul className="divide-y divide-nexa-line">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setLookupTicket(null);
                        setSelectedId(t.id);
                      }}
                      className={cn(
                        "flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-nexa-bg-2",
                        selected?.id === t.id && "bg-nexa-primary-soft/40",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-nexa-ink">
                          {t.ticketNumber}{" "}
                          <span className="font-normal text-nexa-ink-3">{t.subject}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-nexa-ink-4">
                          {t.customerName}
                          {t.party === "HOST" ? " · Host" : " · Guest"}
                          {t.bookingRef ? ` · ${t.bookingRef}` : ""}
                          {t.assignee ? " · Assigned" : " · Unassigned"}
                          {t.lastMessagePreview ? ` · ${t.lastMessagePreview}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={t.status.toLowerCase()} />
                        {(t.operationalSignalTypes ?? []).slice(0, 2).map((type) => (
                          <span
                            key={type}
                            className="rounded-full border border-nexa-line px-1.5 text-[10px] text-nexa-ink-3"
                          >
                            {signalChip(type)}
                          </span>
                        ))}
                        {t.unreadForSupport && (
                          <span className="rounded-full bg-nexa-primary px-1.5 text-[10px] font-semibold text-white">
                            New
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-nexa-line px-4 py-3 text-xs text-nexa-ink-4">
                <span>{pageLabel}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={offset <= 0 || loading}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!data.hasMore || loading}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        <SupportWorkspace
          ticket={selected}
          onClose={() => {
            setSelectedId(null);
            setLookupTicket(null);
          }}
          onChanged={loadTickets}
        />
      </div>
    </div>
  );
}

function SupportWorkspace({
  ticket,
  onClose,
  onChanged,
}: {
  ticket: Ticket | null;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const { session } = useAuth();
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [activity, setActivity] = useState<SupportActivityItem[]>([]);
  const [canned, setCanned] = useState<CannedReply[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const ticketIdRef = useRef<string | null>(null);

  useEffect(() => {
    const ticketId = ticket?.id ?? null;
    if (ticketIdRef.current !== ticketId) {
      setReply("");
      setNoteDraft("");
      setStatusError(null);
      setMessages([]);
      setNotes([]);
      setActivity([]);
      setBooking(null);
      setDetail(null);
      ticketIdRef.current = ticketId;
    }
    if (!ticket) return;
    const bookingKey = ticket.bookingId || ticket.bookingRef;
    if (bookingKey) {
      void fetchBookingDetail(bookingKey)
        .then(setBooking)
        .catch(() => setBooking(null));
    }
    if (ticket.id === "lookup") return;

    let cancelled = false;
    void fetchCannedReplies()
      .then((rows) => {
        if (!cancelled) setCanned(rows);
      })
      .catch(() => {
        if (!cancelled) setCanned([]);
      });
    const load = () => {
      void fetchTicketMessages(ticket.id)
        .then((next) => {
          if (!cancelled) setMessages(next);
        })
        .catch(() => {
          if (!cancelled) setMessages([]);
        });
      void fetchTicket(ticket.id)
        .then((next) => {
          if (!cancelled) setDetail(next);
        })
        .catch(() => {
          if (!cancelled) setDetail(null);
        });
      void fetchTicketNotes(ticket.id)
        .then((next) => {
          if (!cancelled) setNotes(next);
        })
        .catch(() => {
          if (!cancelled) setNotes([]);
        });
      void fetchTicketActivity(ticket.id, { limit: 50, offset: 0 })
        .then((next) => {
          if (!cancelled) setActivity(next.items);
        })
        .catch(() => {
          if (!cancelled) setActivity([]);
        });
    };
    load();
    const interval = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // Intentionally keyed to ticket identity, not object identity after list reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, ticket?.bookingId, ticket?.bookingRef]);

  async function refreshDetail() {
    if (!ticket || ticket.id === "lookup") return;
    try {
      const next = await fetchTicket(ticket.id);
      setDetail(next);
    } catch {
      // keep last known detail
    }
  }

  async function refreshActivity() {
    if (!ticket || ticket.id === "lookup") return;
    try {
      const next = await fetchTicketActivity(ticket.id, { limit: 50, offset: 0 });
      setActivity(next.items);
    } catch {
      // keep last known activity
    }
  }

  async function send() {
    if (!ticket || ticket.id === "lookup" || !reply.trim()) return;
    if ((detail ?? ticket).status === "CLOSED" || statusChanging) return;
    setSending(true);
    setStatusError(null);
    try {
      await sendTicketMessage(ticket.id, reply.trim());
      setReply("");
      const next = await fetchTicketMessages(ticket.id);
      setMessages(next);
      await onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setStatusError("This support ticket is closed.");
        await refreshDetail();
        await onChanged();
      } else {
        setStatusError(err instanceof Error ? err.message : "Failed to send");
      }
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: TicketStatus) {
    if (!ticket || ticket.id === "lookup") return;
    setStatusChanging(true);
    setStatusError(null);
    try {
      await patchTicket(ticket.id, { status });
      await refreshDetail();
      await onChanged();
      await refreshActivity();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusChanging(false);
    }
  }

  async function changePriority(priority: TicketPriority) {
    if (!ticket || ticket.id === "lookup") return;
    try {
      await patchTicket(ticket.id, { priority });
      await refreshDetail();
      await onChanged();
      await refreshActivity();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update priority");
    }
  }

  async function assignSelf() {
    if (!ticket || ticket.id === "lookup") return;
    const adminId = session?.userId;
    if (!adminId) {
      setStatusError("Your admin session has no user id to assign.");
      return;
    }
    try {
      await patchTicket(ticket.id, { assigned_admin_id: adminId });
      await refreshDetail();
      await onChanged();
      await refreshActivity();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to assign");
    }
  }

  async function unassign() {
    if (!ticket || ticket.id === "lookup") return;
    try {
      await patchTicket(ticket.id, { assigned_admin_id: null });
      await refreshDetail();
      await onChanged();
      await refreshActivity();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to unassign");
    }
  }

  async function saveNote() {
    if (!ticket || ticket.id === "lookup" || !noteDraft.trim()) return;
    setNoteSaving(true);
    setStatusError(null);
    try {
      await createTicketNote(ticket.id, noteDraft.trim());
      setNoteDraft("");
      setNotes(await fetchTicketNotes(ticket.id));
      await refreshActivity();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setNoteSaving(false);
    }
  }

  if (!ticket) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-nexa-ink-4">
          Select a ticket or look up a booking to see context.
        </CardContent>
      </Card>
    );
  }

  const live = detail ?? ticket;
  const isClosed = live.status === "CLOSED";
  const composerDisabled =
    ticket.id === "lookup" || isClosed || statusChanging || sending;
  const listingId = live.listingId ?? detail?.listing?.id;
  const hostUserId = detail?.hostUserId ?? detail?.listing?.hostUserId;
  const reportId = live.reportId ?? detail?.report?.id;
  const safetyIssueId = live.safetyIssueId ?? detail?.safetyIssue?.id;
  const bookingHref = ticketContextHref("booking", live.bookingId ?? live.bookingRef);
  const listingHref = ticketContextHref("listing", listingId);
  const hostHref = ticketContextHref("host", hostUserId);
  const reportHref = ticketContextHref("report", reportId);
  const safetyHref = ticketContextHref("safety", safetyIssueId);

  return (
    <Card className="flex max-h-[80vh] flex-col">
      <div className="border-b border-nexa-line px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-lg font-semibold text-nexa-ink">
              {live.ticketNumber}
            </p>
            <p className="text-sm text-nexa-ink-3">{live.subject}</p>
            <p className="mt-1 text-xs text-nexa-ink-4">
              {live.priority} · {live.assignee ? `Assigned ${live.assignee}` : "Unassigned"}
            </p>
            <p className="mt-1 text-xs text-nexa-ink-4">
              {live.customerName}
              {live.requesterEmail ? ` · ${live.requesterEmail}` : ""}
              {live.party === "HOST" ? " · Host" : " · Guest"}
            </p>
            <p className="mt-1 text-xs text-nexa-ink-4">
              Created {live.createdAt ? formatDateTime(live.createdAt) : "—"}
              {" · "}
              Updated {live.updatedAt ? formatDateTime(live.updatedAt) : "—"}
            </p>
            {live.firstAdminResponseAt && (
              <p className="mt-1 text-xs text-nexa-ink-4">
                First response {formatDateTime(live.firstAdminResponseAt)}
              </p>
            )}
            {live.resolvedAt && (
              <p className="mt-1 text-xs text-nexa-ink-4">
                First resolved {formatDateTime(live.resolvedAt)}
              </p>
            )}
            {live.closedAt && (
              <p className="mt-1 text-xs text-nexa-ink-4">
                Closed {formatDateTime(live.closedAt)}
              </p>
            )}
            {live.sla && (
              <p className="mt-2 text-xs text-nexa-ink-3">
                First response: {slaLabel(live.sla.firstResponse.state)}
                {" · "}
                First resolution: {slaLabel(live.sla.resolution.state)}
              </p>
            )}
            {(live.csat || detail?.csat) && (
              <p className="mt-2 text-xs text-nexa-ink-3">
                Customer satisfaction: {(live.csat ?? detail?.csat)?.rating}/5
                {(live.csat ?? detail?.csat)?.comment
                  ? ` — “${(live.csat ?? detail?.csat)?.comment}”`
                  : ""}
              </p>
            )}
          </div>
          <StatusBadge status={live.status.toLowerCase()} />
        </div>
        {ticket.id !== "lookup" && (
          <>
            <div className="mt-3 flex flex-wrap gap-1">
              {STATUS_ACTIONS.map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => changeStatus(s)}>
                  {s.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {PRIORITIES.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={live.priority === p ? "soft" : "outline"}
                  onClick={() => changePriority(p)}
                >
                  {p}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={() => void assignSelf()}>
                <UserCheck className="h-3.5 w-3.5" />
                Assign to me
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!live.assignee}
                onClick={() => void unassign()}
              >
                <UserX className="h-3.5 w-3.5" />
                Unassign
              </Button>
            </div>
          </>
        )}
        {statusError && <p className="mt-2 text-xs text-nexa-danger">{statusError}</p>}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div className="flex min-h-0 flex-col border-b border-nexa-line lg:border-b-0 lg:border-r">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-nexa-ink-4">
                {ticket.id === "lookup" ? "No conversation for booking lookup." : "No messages yet."}
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    m.senderType === "SUPPORT_AGENT"
                      ? "bg-nexa-primary-soft text-nexa-ink"
                      : m.senderType === "SYSTEM"
                        ? "bg-nexa-bg-2 text-nexa-ink-3"
                        : "border border-nexa-line",
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase text-nexa-ink-4">
                    {senderLabel(m.senderType)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                  {m.createdAt && (
                    <p className="mt-1 text-[11px] text-nexa-ink-4">
                      {formatDateTime(m.createdAt)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 border-t border-nexa-line p-3">
            {canned.length > 0 && (
              <select
                className="h-9 max-w-[140px] rounded-md border border-nexa-line bg-white px-2 text-xs"
                defaultValue=""
                disabled={composerDisabled}
                onChange={(e) => {
                  const id = e.target.value;
                  e.target.value = "";
                  const reply = canned.find((c) => c.id === id);
                  if (reply) setReply(reply.body);
                }}
              >
                <option value="" disabled>
                  Use saved reply
                </option>
                {canned.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={
                isClosed ? "This support ticket is closed." : "Write a reply…"
              }
              disabled={composerDisabled}
              className="h-9 flex-1 rounded-md border border-nexa-line px-3 text-sm disabled:bg-nexa-bg-2"
            />
            <Button
              size="sm"
              disabled={composerDisabled || !reply.trim()}
              onClick={() => void send()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 text-sm">
          <p className="text-xs font-semibold uppercase text-nexa-ink-4">Context</p>
          <ContextBlock label="Customer" value={live.customerName} />
          {live.requesterEmail && (
            <ContextBlock label="Email" value={live.requesterEmail} />
          )}
          <ContextBlock label="Party" value={live.party} />
          {live.bookingRef && (
            <ContextLink
              label="Booking"
              value={live.bookingRef}
              href={bookingHref}
            />
          )}
          {booking && (
            <>
              <ContextLink
                label="Listing"
                value={booking.listingTitle}
                href={listingHref}
              />
              <ContextBlock label="City" value={booking.city} />
              <ContextLink label="Host" value={booking.hostName} href={hostHref} />
              <ContextBlock
                label="Stay"
                value={`${booking.checkIn} → ${booking.checkOut}`}
              />
              <ContextBlock label="Booking status" value={booking.rawStatus} />
              <ContextBlock
                label="Total paid"
                value={`${booking.total} ${booking.currency ?? "MAD"}`}
              />
              {booking.guestFee != null && (
                <ContextBlock label="Guest fee" value={String(booking.guestFee)} />
              )}
              {booking.hostFee != null && (
                <ContextBlock label="Host fee" value={String(booking.hostFee)} />
              )}
              {booking.payoutAmount != null && (
                <ContextBlock label="Host payout" value={String(booking.payoutAmount)} />
              )}
            </>
          )}
          {!booking && detail?.listing && (
            <ContextLink
              label="Listing"
              value={detail.listing.title ?? detail.listing.id}
              href={listingHref}
            />
          )}
          {detail?.report && (
            <ContextLink
              label="Report"
              value={detail.report.reason?.trim() || detail.report.id}
              href={reportHref}
            />
          )}
          {!detail?.report && reportId && (
            <ContextLink label="Report" value={reportId} href={reportHref} />
          )}
          {detail?.safetyIssue && (
            <ContextLink
              label="Safety issue"
              value={detail.safetyIssue.category ?? detail.safetyIssue.id}
              href={safetyHref}
            />
          )}
          {!detail?.safetyIssue && safetyIssueId && (
            <ContextLink label="Safety issue" value={safetyIssueId} href={safetyHref} />
          )}
          {!booking && (ticket.bookingId || ticket.bookingRef) && (
            <p className="mt-3 text-xs text-nexa-ink-4">
              Booking context could not be loaded for this reference.
            </p>
          )}

          {ticket.id !== "lookup" && (detail?.signals?.length ?? 0) > 0 && (
            <div className="mt-6 border-t border-nexa-line pt-4">
              <p className="text-xs font-semibold uppercase text-nexa-ink-4">
                Operational signals
              </p>
              <p className="mt-1 text-[11px] text-nexa-ink-4">
                Advisory flags from deterministic rules. They do not change the ticket.
              </p>
              <div className="mt-2 space-y-2">
                {(detail?.signals ?? []).map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    onAcknowledged={(next) =>
                      setDetail((prev) =>
                        prev
                          ? {
                              ...prev,
                              signals: (prev.signals ?? []).map((s) =>
                                s.id === next.id ? next : s,
                              ),
                            }
                          : prev,
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {ticket.id !== "lookup" && (detail?.relatedTickets?.length ?? 0) > 0 && (
            <div className="mt-6 border-t border-nexa-line pt-4">
              <p className="text-xs font-semibold uppercase text-nexa-ink-4">
                Related tickets
              </p>
              <ul className="mt-2 space-y-1">
                {(detail?.relatedTickets ?? []).map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/support?ticket=${row.id}`}
                      className="text-sm text-nexa-primary hover:underline"
                    >
                      {row.ticketNumber}
                    </Link>
                    <span className="text-xs text-nexa-ink-4">
                      {" "}
                      · {relationshipLabel(row.relationship)} · {row.status} · {row.priority}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ticket.id !== "lookup" && (
            <>
              <div className="mt-6 border-t border-nexa-line pt-4">
                <p className="text-xs font-semibold uppercase text-nexa-ink-4">
                  Internal notes
                </p>
                <p className="mt-1 text-[11px] text-nexa-ink-4">
                  Admin-only. Never sent to the customer thread.
                </p>
                <div className="mt-2 space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-xs text-nexa-ink-4">No internal notes yet.</p>
                  ) : (
                    notes.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-md border border-dashed border-nexa-line bg-nexa-bg-2 px-3 py-2"
                      >
                        <p className="whitespace-pre-wrap text-sm text-nexa-ink">{n.body}</p>
                        <p className="mt-1 text-[11px] text-nexa-ink-4">
                          {n.authorAdminId.slice(0, 8)} ·{" "}
                          {n.createdAt ? formatDateTime(n.createdAt) : "—"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add an internal note…"
                    maxLength={5000}
                    className="h-9 flex-1 rounded-md border border-nexa-line px-3 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={noteSaving || !noteDraft.trim()}
                    onClick={() => void saveNote()}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="mt-6 border-t border-nexa-line pt-4">
                <p className="text-xs font-semibold uppercase text-nexa-ink-4">Activity</p>
                <div className="mt-2 space-y-2">
                  {activity.length === 0 ? (
                    <p className="text-xs text-nexa-ink-4">No activity yet.</p>
                  ) : (
                    activity.map((a) => (
                      <div key={a.id} className="text-xs text-nexa-ink-3">
                        <span className="font-medium text-nexa-ink">
                          {formatActivityAction(a.action)}
                        </span>
                        {a.createdAt ? ` · ${formatDateTime(a.createdAt)}` : ""}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SignalCard({
  signal,
  onAcknowledged,
}: {
  signal: OperationalSignal;
  onAcknowledged: (next: OperationalSignal) => void;
}) {
  const [saving, setSaving] = useState(false);
  async function acknowledge() {
    setSaving(true);
    try {
      onAcknowledged(await patchOperationalSignal(signal.id, "ACKNOWLEDGED"));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="rounded-md border border-nexa-line bg-nexa-bg-2 px-3 py-2">
      <p className="text-xs font-semibold text-nexa-ink">
        {signal.severity} · {signalChip(signal.type)}
      </p>
      <p className="mt-1 text-xs text-nexa-ink-3">{signal.reason.explanation}</p>
      <p className="mt-1 text-[11px] text-nexa-ink-4">
        First {signal.firstDetectedAt ? formatDateTime(signal.firstDetectedAt) : "—"}
        {" · "}
        Last {signal.lastDetectedAt ? formatDateTime(signal.lastDetectedAt) : "—"}
        {" · "}
        {signal.status}
      </p>
      {signal.status === "ACTIVE" && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={saving}
          onClick={() => void acknowledge()}
        >
          Acknowledge
        </Button>
      )}
    </div>
  );
}

function ContextBlock({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase text-nexa-ink-4">{label}</p>
      <p className="font-medium text-nexa-ink">{value}</p>
    </div>
  );
}

function ContextLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string | null;
}) {
  if (!value || value === "—") return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase text-nexa-ink-4">{label}</p>
      {href ? (
        <Link href={href} className="font-medium text-nexa-primary hover:underline">
          {value}
        </Link>
      ) : (
        <p className="font-medium text-nexa-ink">{value}</p>
      )}
    </div>
  );
}
