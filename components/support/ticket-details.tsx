"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ticketContextHref, patchOperationalSignal } from "@/lib/api/stays-admin";
import { formatDateTime } from "@/lib/utils";
import type {
  BookingDetail,
  ListingDetail,
  OperationalSignal,
  SupportActivityItem,
  Ticket,
  TicketDetail,
  TicketNote,
} from "@/lib/types";
import type { SupportWorkspaceConfig } from "@/lib/support-workspace";
import type { SupportAgent } from "@/lib/api/identity-admin";
import { AgentAvatar } from "./agent-avatar";
import {
  assignedAgentDisplayName,
  assignedAgentSubtitle,
  resolveAssignedAgent,
} from "./assigned-agent";
import {
  formatActivityAction,
  relationshipLabel,
  signalChip,
  slaLabel,
} from "./labels";

export function TicketDetails({
  workspaceConfig,
  ticket,
  detail,
  booking,
  listingDetail,
  notes,
  noteDraft,
  noteSaving,
  activity,
  agents = [],
  agentNames,
  onNoteDraftChange,
  onSaveNote,
  onSignalAcknowledged,
}: {
  workspaceConfig: SupportWorkspaceConfig;
  ticket: Ticket;
  detail: TicketDetail | null;
  booking: BookingDetail | null;
  listingDetail: ListingDetail | null;
  notes: TicketNote[];
  noteDraft: string;
  noteSaving: boolean;
  activity: SupportActivityItem[];
  agents?: SupportAgent[];
  agentNames?: Record<string, string>;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
  onSignalAcknowledged: (next: OperationalSignal) => void;
}) {
  const live = detail ?? ticket;
  const isLookup = ticket.id === "lookup";
  const listingId = listingDetail?.id ?? live.listingId ?? detail?.listing?.id;
  const host = detail?.host ?? detail?.listing?.host;
  const hostUserId = host?.id ?? listingDetail?.hostId ?? detail?.hostUserId ?? detail?.listing?.hostUserId;
  const listingTitle =
    listingDetail?.title ??
    detail?.listing?.title ??
    detail?.listingTitle ??
    "";
  const listingCity = listingDetail?.city ?? detail?.listing?.city ?? "";
  const listingAddress = listingDetail?.address ?? detail?.listing?.address ?? "";
  const hostName =
    (listingDetail?.hostName && listingDetail.hostName !== listingDetail.hostId?.slice(0, 8)
      ? listingDetail.hostName
      : "") ||
    host?.name ||
    "";
  const hostEmail = listingDetail?.hostEmail && listingDetail.hostEmail !== "—"
    ? listingDetail.hostEmail
    : host?.email || "";
  const hostPhone = listingDetail?.hostPhone && listingDetail.hostPhone !== "—"
    ? listingDetail.hostPhone
    : host?.phone || "";
  const guest = detail?.guest;
  const reporter = detail?.reporter;
  const checkIn = detail?.listing?.checkInContact;
  const reportId = live.reportId ?? detail?.report?.id;
  const safetyIssueId = live.safetyIssueId ?? detail?.safetyIssue?.id;
  const csat = live.csat ?? detail?.csat;
  const hasListing = Boolean(listingId || listingTitle);
  const hasBooking = Boolean(booking || live.bookingRef || live.bookingId);
  const assignment = resolveAssignedAgent(live.assignee, agents);
  const agentName = assignedAgentDisplayName(assignment);
  const agentSubtitle = assignedAgentSubtitle(assignment, live.status);
  const opsHref = (kind: "booking" | "listing" | "host" | "report" | "safety", id?: string | null) =>
    workspaceConfig.canNavigateOpsContext ? ticketContextHref(kind, id) : null;

  return (
    <div className="h-full overflow-y-auto p-4 text-sm">
      <Section title="Reporter">
        <ContextBlock label="Customer" value={reporter?.name || live.customerName} />
        {(reporter?.email || live.requesterEmail) && (
          <ContextMailto label="Email" value={reporter?.email || live.requesterEmail || ""} />
        )}
        {reporter?.phone && <ContextTel label="Phone" value={reporter.phone} />}
        <ContextBlock label="Party" value={live.party} />
      </Section>

      {!isLookup && (
        <Section title="Support agent">
          {assignment.kind === "unassigned" ? (
            <p className="mt-2 text-sm font-medium text-nexa-ink">Unassigned</p>
          ) : (
            <div className="mt-2 flex items-center gap-3">
              {assignment.agent && (
                <AgentAvatar
                  name={agentName}
                  photoUrl={assignment.agent.profilePhotoUrl}
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-nexa-ink">{agentName}</p>
                {agentSubtitle && (
                  <p className="truncate text-xs text-nexa-ink-3">{agentSubtitle}</p>
                )}
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="Reported listing / host">
        {hasListing ? (
          <>
            <ContextLink
              label="Listing"
              value={listingTitle || listingId || ""}
              href={opsHref("listing", listingId)}
            />
            <ContextBlock label="City" value={listingCity} />
            {listingAddress && <ContextBlock label="Address" value={listingAddress} />}
            {listingDetail?.status && (
              <ContextBlock label="Listing status" value={listingDetail.status} />
            )}
            <ContextLink
              label="Host"
              value={hostName || "Unknown host"}
              href={opsHref("host", hostUserId)}
            />
            {hostEmail && <ContextMailto label="Host email" value={hostEmail} />}
            {hostPhone && <ContextTel label="Host phone" value={hostPhone} />}
            {checkIn?.name && <ContextBlock label="Check-in contact" value={checkIn.name} />}
            {checkIn?.phone && <ContextTel label="Check-in phone" value={checkIn.phone} />}
            {checkIn?.role && <ContextBlock label="Check-in role" value={checkIn.role} />}
          </>
        ) : (
          <p className="mt-2 text-xs text-nexa-ink-4">No listing linked</p>
        )}
        {detail?.report && (
          <ContextLink
            label="Report"
            value={detail.report.reason?.trim() || detail.report.id}
            href={opsHref("report", reportId)}
          />
        )}
        {!detail?.report && reportId && (
          <ContextLink
            label="Report"
            value={reportId}
            href={opsHref("report", reportId)}
          />
        )}
        {detail?.safetyIssue && (
          <ContextLink
            label="Safety issue"
            value={detail.safetyIssue.category ?? detail.safetyIssue.id}
            href={opsHref("safety", safetyIssueId)}
          />
        )}
        {!detail?.safetyIssue && safetyIssueId && (
          <ContextLink
            label="Safety issue"
            value={safetyIssueId}
            href={opsHref("safety", safetyIssueId)}
          />
        )}
      </Section>

      {guest && guest.id !== hostUserId && (guest.name || guest.email || guest.phone) && (
        <Section title="Guest">
          {guest.name && <ContextBlock label="Name" value={guest.name} />}
          {guest.email && <ContextMailto label="Email" value={guest.email} />}
          {guest.phone && <ContextTel label="Phone" value={guest.phone} />}
        </Section>
      )}

      <Section title="Booking">
        {hasBooking ? (
          <>
            {live.bookingRef && (
              <ContextLink
                label="Booking"
                value={live.bookingRef}
                href={opsHref("booking", live.bookingId ?? live.bookingRef)}
              />
            )}
            {!live.bookingRef && live.bookingId && (
              <ContextBlock label="Booking" value={live.bookingId} />
            )}
            {booking && (
              <>
                <ContextBlock label="Stay" value={`${booking.checkIn} → ${booking.checkOut}`} />
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
            {!booking &&
              workspaceConfig.canFetchOpsContext &&
              (ticket.bookingId || ticket.bookingRef) && (
              <p className="mt-3 text-xs text-nexa-ink-4">
                Booking context could not be loaded for this reference.
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-xs text-nexa-ink-4">No booking linked</p>
        )}
      </Section>

      <Section title="SLA">
        <ContextBlock
          label="Created"
          value={live.createdAt ? formatDateTime(live.createdAt) : ""}
        />
        <ContextBlock
          label="Updated"
          value={live.updatedAt ? formatDateTime(live.updatedAt) : ""}
        />
        {live.firstAdminResponseAt && (
          <ContextBlock label="First response" value={formatDateTime(live.firstAdminResponseAt)} />
        )}
        {live.resolvedAt && (
          <ContextBlock label="First resolved" value={formatDateTime(live.resolvedAt)} />
        )}
        {live.closedAt && (
          <ContextBlock label="Closed" value={formatDateTime(live.closedAt)} />
        )}
        {live.sla && (
          <>
            <ContextBlock
              label="First response SLA"
              value={slaLabel(live.sla.firstResponse.state)}
            />
            <ContextBlock
              label="First resolution SLA"
              value={slaLabel(live.sla.resolution.state)}
            />
          </>
        )}
      </Section>

      {workspaceConfig.canViewSignals && !isLookup && (detail?.signals?.length ?? 0) > 0 && (
        <Section title="Operational signals">
          <p className="mt-1 text-[11px] text-nexa-ink-4">
            Advisory flags from deterministic rules. They do not change the ticket.
          </p>
          <div className="mt-2 space-y-2">
            {(detail?.signals ?? []).map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onAcknowledged={onSignalAcknowledged}
              />
            ))}
          </div>
        </Section>
      )}

      {!isLookup && (detail?.relatedTickets?.length ?? 0) > 0 && (
        <Section title="Related tickets">
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
        </Section>
      )}

      {csat && (
        <Section title="CSAT">
          <p className="mt-2 text-sm text-nexa-ink-3">
            Overall: {csat.rating}/5
            {csat.agentRating != null ? ` · Agent: ${csat.agentRating}/5` : ""}
            {csat.comment ? ` — “${csat.comment}”` : ""}
          </p>
        </Section>
      )}

      {!isLookup && (
        <>
          <Section title="Internal notes">
            <p className="mt-1 text-[11px] text-nexa-ink-4">
              Internal only. Never sent to the customer thread.
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
            {workspaceConfig.canCreateNotes && (
            <div className="mt-2 flex gap-2">
              <input
                value={noteDraft}
                onChange={(e) => onNoteDraftChange(e.target.value)}
                placeholder="Add an internal note…"
                maxLength={5000}
                className="h-9 flex-1 rounded-md border border-nexa-line px-3 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={noteSaving || !noteDraft.trim()}
                onClick={onSaveNote}
              >
                Add
              </Button>
            </div>
            )}
          </Section>

          <Section title="Activity">
            <div className="mt-2 space-y-2">
              {activity.length === 0 ? (
                <p className="text-xs text-nexa-ink-4">No activity yet.</p>
              ) : (
                activity.map((a) => (
                  <div key={a.id} className="text-xs text-nexa-ink-3">
                    <span className="font-medium text-nexa-ink">
                      {formatActivityAction(a.action, a.metadata, agentNames)}
                    </span>
                    {a.createdAt ? ` · ${formatDateTime(a.createdAt)}` : ""}
                  </div>
                ))
              )}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-nexa-line py-4 first:pt-0 last:border-b-0">
      <p className="text-xs font-semibold uppercase text-nexa-ink-4">{title}</p>
      {children}
    </section>
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

function ContextMailto({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase text-nexa-ink-4">{label}</p>
      <a href={`mailto:${value}`} className="font-medium text-nexa-primary hover:underline">
        {value}
      </a>
    </div>
  );
}

function ContextTel({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase text-nexa-ink-4">{label}</p>
      <a href={`tel:${value}`} className="font-medium text-nexa-primary hover:underline">
        {value}
      </a>
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
