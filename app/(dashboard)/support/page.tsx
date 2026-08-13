"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LifeBuoy, Send, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchBookingDetail,
  fetchTicket,
  fetchTickets,
  fetchTicketMessages,
  sendTicketMessage,
  patchTicket,
  ticketContextHref,
  type TicketsResult,
} from "@/lib/api/stays-admin";
import { formatDateTime, cn } from "@/lib/utils";
import type {
  BookingDetail,
  Ticket,
  TicketDetail,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from "@/lib/types";

type Filter = "all" | TicketStatus;

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

export default function SupportPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-nexa-ink-4">Loading…</p>}>
      <SupportPageInner />
    </Suspense>
  );
}

function SupportPageInner() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>("OPEN");
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
      });
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, [filter, offset, query]);

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
            { value: "all", label: "All", count: data.total },
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
                          {t.lastMessagePreview ? ` · ${t.lastMessagePreview}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={t.status.toLowerCase()} />
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
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const ticketIdRef = useRef<string | null>(null);

  useEffect(() => {
    const ticketId = ticket?.id ?? null;
    if (ticketIdRef.current !== ticketId) {
      setReply("");
      setStatusError(null);
      setMessages([]);
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

  async function send() {
    if (!ticket || ticket.id === "lookup" || !reply.trim()) return;
    setSending(true);
    try {
      await sendTicketMessage(ticket.id, reply.trim());
      setReply("");
      const next = await fetchTicketMessages(ticket.id);
      setMessages(next);
      await onChanged();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: TicketStatus) {
    if (!ticket || ticket.id === "lookup") return;
    try {
      await patchTicket(ticket.id, { status });
      await onChanged();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function changePriority(priority: TicketPriority) {
    if (!ticket || ticket.id === "lookup") return;
    try {
      await patchTicket(ticket.id, { priority });
      await onChanged();
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
      await onChanged();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to assign");
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
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply…"
              disabled={ticket.id === "lookup"}
              className="h-9 flex-1 rounded-md border border-nexa-line px-3 text-sm disabled:bg-nexa-bg-2"
            />
            <Button
              size="sm"
              disabled={ticket.id === "lookup" || sending || !reply.trim()}
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
          <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Card>
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
