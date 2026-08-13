"use client";

import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { ApiUnavailable } from "@/components/ui/api-unavailable";
import {
  fetchBookingDetail,
  fetchTickets,
  fetchTicketMessages,
  sendTicketMessage,
  patchTicket,
  type TicketsResult,
} from "@/lib/api/stays-admin";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { formatDateTime, cn } from "@/lib/utils";
import type { BookingDetail, Ticket, TicketMessage, TicketStatus } from "@/lib/types";

type Filter = "all" | TicketStatus;

export default function SupportPage() {
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [lookupRef, setLookupRef] = useState("");
  const { data, loading, error, reload } = useAsyncData<TicketsResult>(
    fetchTickets,
    [],
    { items: [], unavailable: true },
  );

  const tickets = data?.items ?? [];
  const unavailable = data?.unavailable ?? false;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    for (const t of tickets) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [tickets]);

  const filtered = tickets.filter((t) => {
    const match = filter === "all" || t.status === filter;
    const q = query.toLowerCase();
    return (
      match &&
      (t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.bookingRef ?? "").toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <PageHeader
        title="Support"
        description="Stays marketplace tickets. Replies belong on the customer Messages → Support thread when the API is connected."
      />

      {unavailable && (
        <ApiUnavailable
          title="Support ticket store not connected"
          detail="GET /admin/stays/support/tickets is not available yet. Do not use Nexa Pay support tickets. You can still look up a booking below to see guest → listing → host → payment context."
        />
      )}
      {error && <p className="mb-4 text-sm text-nexa-danger">{error}</p>}

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
            onClick={() =>
              setSelected({
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
              })
            }
            disabled={!lookupRef.trim()}
          >
            Open context
          </Button>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "OPEN", label: "Open", count: counts.OPEN ?? 0 },
            { value: "IN_PROGRESS", label: "In progress", count: counts.IN_PROGRESS ?? 0 },
            {
              value: "WAITING_FOR_CUSTOMER",
              label: "Waiting",
              count: (counts.WAITING_FOR_CUSTOMER ?? 0) + (counts.WAITING_FOR_HOST ?? 0),
            },
            { value: "ESCALATED", label: "Escalated", count: counts.ESCALATED ?? 0 },
            { value: "RESOLVED", label: "Resolved", count: counts.RESOLVED ?? 0 },
            { value: "all", label: "All", count: counts.all },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search tickets…"
          className="lg:w-72"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          {loading ? (
            <p className="py-10 text-center text-sm text-nexa-ink-4">Loading tickets…</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <LifeBuoy className="mx-auto h-10 w-10 text-nexa-ink-4" />
              <p className="mt-3 text-sm text-nexa-ink-4">
                {unavailable ? "No ticket store connected." : "No tickets match."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-nexa-line">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(t)}
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
                        {t.bookingRef ? ` · ${t.bookingRef}` : ""}
                        {t.lastMessagePreview ? ` · ${t.lastMessagePreview}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={t.status.toLowerCase()} />
                      {t.unreadForSupport && (
                        <span className="rounded-full bg-nexa-primary px-1.5 text-[10px] font-semibold text-white">
                          ●
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <SupportWorkspace
          ticket={selected}
          unavailable={unavailable}
          onClose={() => setSelected(null)}
          onChanged={reload}
        />
      </div>
    </div>
  );
}

function SupportWorkspace({
  ticket,
  unavailable,
  onClose,
  onChanged,
}: {
  ticket: Ticket | null;
  unavailable: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setReply("");
    setStatusError(null);
    setMessages([]);
    setBooking(null);
    if (!ticket) return;
    const bookingKey = ticket.bookingId || ticket.bookingRef;
    if (bookingKey) {
      void fetchBookingDetail(bookingKey)
        .then(setBooking)
        .catch(() => setBooking(null));
    }
    if (ticket.id !== "lookup") {
      void fetchTicketMessages(ticket.id).then(setMessages).catch(() => setMessages([]));
    }
  }, [ticket]);

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

  if (!ticket) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-nexa-ink-4">
          Select a ticket or look up a booking to see context.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex max-h-[80vh] flex-col">
      <div className="border-b border-nexa-line px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-lg font-semibold text-nexa-ink">
              {ticket.ticketNumber}
            </p>
            <p className="text-sm text-nexa-ink-3">{ticket.subject}</p>
          </div>
          <StatusBadge status={ticket.status.toLowerCase()} />
        </div>
        {ticket.id !== "lookup" && !unavailable && (
          <div className="mt-3 flex flex-wrap gap-1">
            {(["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"] as const).map(
              (s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => changeStatus(s)}>
                  {s.replace(/_/g, " ")}
                </Button>
              ),
            )}
          </div>
        )}
        {statusError && <p className="mt-2 text-xs text-nexa-danger">{statusError}</p>}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div className="flex min-h-0 flex-col border-b border-nexa-line lg:border-b-0 lg:border-r">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-nexa-ink-4">
                {unavailable || ticket.id === "lookup"
                  ? "No conversation until the support API is connected."
                  : "No messages yet."}
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
                    {m.senderType.replace(/_/g, " ")}
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
              disabled={unavailable || ticket.id === "lookup"}
              className="h-9 flex-1 rounded-md border border-nexa-line px-3 text-sm disabled:bg-nexa-bg-2"
            />
            <Button
              size="sm"
              disabled={unavailable || ticket.id === "lookup" || sending || !reply.trim()}
              onClick={() => void send()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 text-sm">
          <p className="text-xs font-semibold uppercase text-nexa-ink-4">Context</p>
          <ContextBlock label="Customer" value={ticket.customerName} />
          <ContextBlock label="Party" value={ticket.party} />
          {ticket.bookingRef && <ContextBlock label="Booking" value={ticket.bookingRef} />}
          {booking && (
            <>
              <ContextBlock label="Listing" value={booking.listingTitle} />
              <ContextBlock label="City" value={booking.city} />
              <ContextBlock label="Host" value={booking.hostName} />
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
          {ticket.reportId && <ContextBlock label="Report" value={ticket.reportId} />}
          {ticket.safetyIssueId && (
            <ContextBlock label="Safety issue" value={ticket.safetyIssueId} />
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
