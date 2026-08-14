"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  createTicketNote,
  fetchBookingDetail,
  fetchCannedReplies,
  fetchListingDetail,
  fetchTicket,
  fetchTicketActivity,
  fetchTicketMessages,
  fetchTicketNotes,
  sendTicketMessage,
  patchTicket,
} from "@/lib/api/stays-admin";
import { ApiError } from "@/lib/api/client";
import type {
  BookingDetail,
  CannedReply,
  ListingDetail,
  OperationalSignal,
  SupportActivityItem,
  Ticket,
  TicketDetail,
  TicketMessage,
  TicketNote,
  TicketPriority,
  TicketStatus,
} from "@/lib/types";
import { TicketHeader } from "./ticket-header";
import { TicketChat } from "./ticket-chat";
import { TicketComposer } from "./ticket-composer";
import { TicketDetails } from "./ticket-details";
import { TicketDetailsSheet } from "./ticket-details-sheet";
import { statusMatchesFilter } from "./labels";

export function TicketWorkspace({
  ticket,
  selectedId,
  filter,
  selectedRefreshError,
  onRetrySelected,
  onClose,
  onChanged,
}: {
  ticket: Ticket | null;
  selectedId: string | null;
  filter: string;
  selectedRefreshError: string | null;
  onRetrySelected: () => void;
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
  const [listingDetail, setListingDetail] = useState<ListingDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pinToLatest, setPinToLatest] = useState(0);
  const ticketIdRef = useRef<string | null>(null);

  useEffect(() => {
    const ticketId = ticket?.id ?? selectedId;
    if (ticketIdRef.current !== ticketId) {
      setReply("");
      setNoteDraft("");
      setStatusError(null);
      setMessages([]);
      setNotes([]);
      setActivity([]);
      setBooking(null);
      setListingDetail(null);
      setDetail(null);
      setDetailsOpen(false);
      ticketIdRef.current = ticketId;
    }
    if (!ticket || ticket.id === "lookup") {
      const bookingKey = ticket?.bookingId || ticket?.bookingRef;
      if (bookingKey) {
        void fetchBookingDetail(bookingKey)
          .then(setBooking)
          .catch(() => setBooking(null));
      }
      return;
    }

    let cancelled = false;
    const listingId = ticket.listingId;
    if (listingId) {
      void fetchListingDetail(listingId)
        .then((next) => {
          if (!cancelled) setListingDetail(next);
        })
        .catch(() => {
          /* keep last listing detail */
        });
    }
    const bookingKey = ticket.bookingId || ticket.bookingRef;
    if (bookingKey) {
      void fetchBookingDetail(bookingKey)
        .then((next) => {
          if (!cancelled) setBooking(next);
        })
        .catch(() => {
          /* keep last booking */
        });
    }

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
          /* keep last messages */
        });
      void fetchTicket(ticket.id)
        .then((next) => {
          if (!cancelled) setDetail(next);
        })
        .catch(() => {
          /* keep last detail */
        });
      void fetchTicketNotes(ticket.id)
        .then((next) => {
          if (!cancelled) setNotes(next);
        })
        .catch(() => {
          /* keep last notes */
        });
      void fetchTicketActivity(ticket.id, { limit: 50, offset: 0 })
        .then((next) => {
          if (!cancelled) setActivity(next.items);
        })
        .catch(() => {
          /* keep last activity */
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
  }, [ticket?.id, ticket?.bookingId, ticket?.bookingRef, ticket?.listingId, selectedId]);

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
      setPinToLatest((n) => n + 1);
      await refreshDetail();
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
      <div className="flex h-full items-center justify-center bg-white">
        <Card className="border-0 shadow-none">
          <CardContent className="py-12 text-center text-sm text-nexa-ink-4">
            {selectedRefreshError ? (
              <div className="space-y-3">
                <p>Could not load this ticket. {selectedRefreshError}</p>
                <Button size="sm" variant="outline" onClick={onRetrySelected}>
                  Retry
                </Button>
              </div>
            ) : selectedId ? (
              "Loading ticket…"
            ) : (
              "Select a ticket or look up a booking to see context."
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const live = detail ?? ticket;
  const isClosed = live.status === "CLOSED";
  const composerDisabled =
    ticket.id === "lookup" || isClosed || statusChanging || sending;
  const filterMismatchNote =
    ticket.id !== "lookup" && !statusMatchesFilter(live.status, filter)
      ? `This ticket is now ${live.status.replace(/_/g, " ").toLowerCase()}`
      : null;
  const details = (
    <TicketDetails
      ticket={ticket}
      detail={detail}
      booking={booking}
      listingDetail={listingDetail}
      notes={notes}
      noteDraft={noteDraft}
      noteSaving={noteSaving}
      activity={activity}
      onNoteDraftChange={setNoteDraft}
      onSaveNote={() => void saveNote()}
      onSignalAcknowledged={(next: OperationalSignal) =>
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                signals: (prev.signals ?? []).map((s) => (s.id === next.id ? next : s)),
              }
            : prev,
        )
      }
    />
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      <TicketHeader
        ticket={live}
        isLookup={ticket.id === "lookup"}
        statusChanging={statusChanging}
        showBack
        showDetailsButton
        filterMismatchNote={filterMismatchNote}
        onBack={onClose}
        onDetails={() => setDetailsOpen(true)}
        onStatusChange={(status) => void changeStatus(status)}
        onPriorityChange={(priority) => void changePriority(priority)}
        onAssignSelf={() => void assignSelf()}
        onUnassign={() => void unassign()}
      />
      {selectedRefreshError && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-nexa-danger/20 bg-nexa-danger-soft px-3 py-1.5 text-xs text-nexa-danger">
          <p>Could not refresh ticket. {selectedRefreshError}</p>
          <Button size="sm" variant="outline" onClick={onRetrySelected}>
            Retry
          </Button>
        </div>
      )}
      {statusError && (
        <p className="shrink-0 border-b border-nexa-danger/20 bg-nexa-danger-soft px-3 py-1.5 text-xs text-nexa-danger">
          {statusError}
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TicketChat
            ticketId={ticket.id}
            messages={messages}
            pinToLatest={pinToLatest}
            emptyLabel={
              ticket.id === "lookup"
                ? "No conversation for booking lookup."
                : "No messages yet."
            }
          />
          <TicketComposer
            reply={reply}
            onReplyChange={setReply}
            canned={canned}
            disabled={composerDisabled}
            closed={isClosed}
            sending={sending}
            onSend={() => void send()}
          />
        </div>
        <aside className="hidden w-[280px] shrink-0 border-l border-nexa-line 2xl:block">
          {details}
        </aside>
      </div>
      <TicketDetailsSheet open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        {details}
      </TicketDetailsSheet>
    </div>
  );
}
