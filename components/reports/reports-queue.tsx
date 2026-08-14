"use client";

import * as React from "react";
import { ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollectionCard, CollectionFooter } from "@/components/ui/collection";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { MasterDetail } from "@/components/ui/master-detail";
import { PageShell } from "@/components/ui/page-shell";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import type { ReportsResult } from "@/lib/api/stays-admin";
import type {
  InvestigationMessage,
  SafetyReport,
  SupportActivityItem,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type KindFilter = "all" | "conversation_reported" | "safety_issue";
type TrustStatus = "OPEN" | "REVIEWED" | "ESCALATED" | "DISMISSED";
type StatusFilter = "all" | TrustStatus;

const STATUS_ACTIONS: TrustStatus[] = ["OPEN", "REVIEWED", "ESCALATED", "DISMISSED"];

function formatActivityAction(action: string) {
  return action.replace(/_/g, " ");
}

export function ReportsQueue({
  data,
  loading,
  error,
  pageLabel,
  offset,
  kind,
  status,
  searchInput,
  selected,
  selectedId,
  detailLoading,
  actionError,
  lightbox,
  transcript,
  transcriptCursor,
  transcriptHasMore,
  transcriptLoading,
  transcriptError,
  activity,
  onRetry,
  onSelect,
  onClose,
  onKindChange,
  onStatusChange,
  onSearchChange,
  onPrevious,
  onNext,
  onChangeStatus,
  onLoadEarlier,
  onLightbox,
}: {
  data: ReportsResult;
  loading: boolean;
  error: string | null;
  pageLabel: string;
  offset: number;
  kind: KindFilter;
  status: StatusFilter;
  searchInput: string;
  selected: SafetyReport | null;
  selectedId: string | null;
  detailLoading: boolean;
  actionError: string | null;
  lightbox: { label: string; url: string } | null;
  transcript: InvestigationMessage[];
  transcriptCursor: number | null;
  transcriptHasMore: boolean;
  transcriptLoading: boolean;
  transcriptError: string | null;
  activity: SupportActivityItem[];
  onRetry: () => void;
  onSelect: (report: SafetyReport) => void;
  onClose: () => void;
  onKindChange: (value: KindFilter) => void;
  onStatusChange: (value: StatusFilter) => void;
  onSearchChange: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onChangeStatus: (next: TrustStatus) => void;
  onLoadEarlier: () => void;
  onLightbox: (next: { label: string; url: string } | null) => void;
}) {
  const hasSelection = Boolean(selectedId);
  const hasRows = data.items.length > 0;

  return (
    <PageShell variant="workspace">
      <div className="shrink-0 border-b border-nexa-line bg-white px-4 py-3 sm:px-6">
        <PageToolbar
          className={hasSelection ? "hidden md:flex" : undefined}
          filters={
            <div className="flex flex-col gap-2">
              <FilterTabs<StatusFilter>
                value={status}
                onChange={onStatusChange}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "OPEN", label: "Open" },
                  { value: "REVIEWED", label: "Reviewed" },
                  { value: "ESCALATED", label: "Escalated" },
                  { value: "DISMISSED", label: "Dismissed" },
                ]}
              />
              <FilterTabs<KindFilter>
                value={kind}
                onChange={onKindChange}
                options={[
                  { value: "all", label: "All", count: data.total },
                  { value: "conversation_reported", label: "Conversation" },
                  { value: "safety_issue", label: "Safety" },
                ]}
              />
            </div>
          }
          trailing={
            <SearchInput
              value={searchInput}
              onChange={onSearchChange}
              placeholder="Search reports…"
              className="w-full md:w-64"
            />
          }
        />
        {error ? (
          <ErrorState
            className="mt-3"
            title="Unable to load reports"
            detail={error}
            onRetry={onRetry}
          />
        ) : null}
      </div>

      <MasterDetail
        hasSelection={hasSelection}
        onBack={onClose}
        backLabel="Back to reports"
        list={
          <div className="flex min-h-0 flex-1 flex-col bg-nexa-bg">
            {loading && !hasRows ? (
              <LoadingState label="Loading reports…" />
            ) : !loading && !error && data.items.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title="No reports found"
                description="Reports are never silently deleted."
              />
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="hidden md:block">
                    {data.items.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onSelect(r)}
                        className={`block w-full border-b border-nexa-line px-4 py-3 text-left hover:bg-nexa-bg-2 ${
                          selectedId === r.id ? "bg-nexa-primary-soft" : "bg-white"
                        }`}
                      >
                        <p className="text-xs uppercase text-nexa-ink-4">
                          {r.kind.replace(/_/g, " ")}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm font-medium text-nexa-ink">
                          {r.reason ?? r.category ?? "Untitled report"}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <StatusBadge status={(r.status ?? "OPEN").toLowerCase()} />
                          <span className="text-[11px] text-nexa-ink-4">
                            {r.createdAt ? formatDateTime(r.createdAt) : "—"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2 p-3 md:hidden">
                    {data.items.map((r) => (
                      <CollectionCard
                        key={r.id}
                        selected={selectedId === r.id}
                        onClick={() => onSelect(r)}
                      >
                        <p className="text-xs uppercase text-nexa-ink-4">
                          {r.kind.replace(/_/g, " ")}
                        </p>
                        <p className="mt-1 text-sm font-medium text-nexa-ink">
                          {r.reason ?? r.category ?? "Untitled report"}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <StatusBadge status={(r.status ?? "OPEN").toLowerCase()} />
                          <span className="text-xs text-nexa-ink-4">
                            {r.evidenceCount ?? 0} evidence
                          </span>
                        </div>
                      </CollectionCard>
                    ))}
                  </div>
                </div>
                {hasRows ? (
                  <CollectionFooter>
                    <span>{pageLabel}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={offset <= 0 || loading}
                        onClick={onPrevious}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!data.hasMore || loading}
                        onClick={onNext}
                      >
                        Next
                      </Button>
                    </div>
                  </CollectionFooter>
                ) : null}
              </>
            )}
          </div>
        }
        workspace={
          selected ? (
            <ReportWorkspace
              selected={selected}
              detailLoading={detailLoading}
              actionError={actionError}
              transcript={transcript}
              transcriptHasMore={transcriptHasMore}
              transcriptCursor={transcriptCursor}
              transcriptLoading={transcriptLoading}
              transcriptError={transcriptError}
              activity={activity}
              onChangeStatus={onChangeStatus}
              onLoadEarlier={onLoadEarlier}
              onLightbox={onLightbox}
            />
          ) : (
            <EmptyState
              className="h-full"
              icon={ShieldAlert}
              title="Select a report"
              description="Open a queue item to investigate reason, evidence, and the reported conversation."
            />
          )
        }
        context={selected ? <ReportContext report={selected} /> : null}
      />

      {lightbox ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-nexa-ink/80 p-4"
          onClick={() => onLightbox(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{lightbox.label}</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                onClick={() => onLightbox(null)}
              >
                <X className="h-4 w-4" /> Close
              </Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.label}
              className="max-h-[85vh] w-full rounded-md bg-white object-contain"
            />
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

function ReportWorkspace({
  selected,
  detailLoading,
  actionError,
  transcript,
  transcriptHasMore,
  transcriptCursor,
  transcriptLoading,
  transcriptError,
  activity,
  onChangeStatus,
  onLoadEarlier,
  onLightbox,
}: {
  selected: SafetyReport;
  detailLoading: boolean;
  actionError: string | null;
  transcript: InvestigationMessage[];
  transcriptHasMore: boolean;
  transcriptCursor: number | null;
  transcriptLoading: boolean;
  transcriptError: string | null;
  activity: SupportActivityItem[];
  onChangeStatus: (next: TrustStatus) => void;
  onLoadEarlier: () => void;
  onLightbox: (next: { label: string; url: string } | null) => void;
}) {
  const [contextOpen, setContextOpen] = React.useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-nexa-ink-4">
              {selected.kind.replace(/_/g, " ")}
            </p>
            <h2 className="font-display text-xl font-semibold text-nexa-ink">
              {selected.reason ?? selected.category ?? `Report ${selected.id.slice(0, 8)}`}
            </h2>
            {detailLoading ? (
              <p className="mt-1 text-xs text-nexa-ink-4">Loading detail…</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={(selected.status ?? "OPEN").toLowerCase()} />
            <Button
              size="sm"
              variant="outline"
              className="2xl:hidden"
              onClick={() => setContextOpen(true)}
            >
              Context
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-nexa-ink-4">Reported party</dt>
            <dd>{selected.reportedUser?.name ?? selected.reportedUser?.id ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-nexa-ink-4">Created</dt>
            <dd>{selected.createdAt ? formatDateTime(selected.createdAt) : "—"}</dd>
          </div>
        </dl>

        {(selected.operationalSignals?.length ?? 0) > 0 && (
          <div className="mt-5 rounded-md border border-nexa-line bg-nexa-bg-2 p-3">
            <p className="text-xs font-semibold uppercase text-nexa-ink-4">
              Operational context
            </p>
            <p className="mt-1 text-[11px] text-nexa-ink-4">
              Advisory only. Does not escalate or change this report.
            </p>
            <div className="mt-2 space-y-2">
              {selected.operationalSignals!.map((signal) => (
                <div key={signal.id}>
                  <p className="text-sm font-semibold text-nexa-ink">
                    {signal.severity} · {signal.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-nexa-ink-3">{signal.reason.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(selected.evidence?.length ?? 0) > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase text-nexa-ink-4">Evidence</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {selected.evidence!.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="overflow-hidden rounded-md border border-nexa-line"
                  onClick={() =>
                    onLightbox({
                      label: item.filename || `Evidence ${index + 1}`,
                      url: item.url,
                    })
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.filename || `Evidence ${index + 1}`}
                    className="h-20 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {(selected.kind === "conversation_reported" ||
          selected.kind === "safety_issue") && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase text-nexa-ink-4">
              Reported conversation
            </p>
            <p className="mt-1 text-[11px] text-nexa-ink-4">
              Read-only investigation transcript (source thread only).
            </p>
            {transcriptError && (
              <p className="mt-2 text-xs text-nexa-danger">{transcriptError}</p>
            )}
            <div className="mt-2 max-h-80 space-y-2 overflow-y-auto rounded-md border border-nexa-line p-2">
              {transcriptLoading && transcript.length === 0 ? (
                <p className="text-xs text-nexa-ink-4">Loading transcript…</p>
              ) : transcript.length === 0 ? (
                <p className="text-xs text-nexa-ink-4">No messages available.</p>
              ) : (
                transcript.map((m) => (
                  <div key={m.id} className="rounded-md bg-nexa-bg-2 px-2 py-1.5 text-xs">
                    <p className="font-semibold uppercase text-nexa-ink-4">{m.senderRole}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-nexa-ink">{m.body}</p>
                    {m.createdAt && (
                      <p className="mt-0.5 text-[10px] text-nexa-ink-4">
                        {formatDateTime(m.createdAt)}
                      </p>
                    )}
                    {m.attachments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.attachments.map((att) => (
                          <button
                            key={att.id}
                            type="button"
                            className="text-[10px] text-nexa-primary underline"
                            onClick={() =>
                              onLightbox({
                                label: att.filename || "Attachment",
                                url: att.url,
                              })
                            }
                          >
                            Attachment
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            {transcriptHasMore && transcriptCursor != null && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={transcriptLoading}
                onClick={onLoadEarlier}
              >
                {transcriptLoading ? "Loading…" : "Load earlier messages"}
              </Button>
            )}
          </div>
        )}

        <div className="mt-5">
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
      </div>

      <StickyActionBar>
        <p className="mb-2 text-xs font-semibold uppercase text-nexa-ink-4">
          Status actions
        </p>
        <div className="flex flex-wrap gap-1">
          {STATUS_ACTIONS.map((nextStatus) => (
            <Button
              key={nextStatus}
              size="sm"
              variant={
                (selected.status ?? "").toUpperCase() === nextStatus ? "soft" : "outline"
              }
              onClick={() => onChangeStatus(nextStatus)}
            >
              {nextStatus}
            </Button>
          ))}
        </div>
        {actionError ? <p className="mt-2 text-xs text-nexa-danger">{actionError}</p> : null}
        <p className="mt-2 text-xs text-nexa-ink-4">
          Reports are never silently deleted. Dismissed rows stay in the queue.
        </p>
      </StickyActionBar>

      <DetailSheet
        nested
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        title="Context"
      >
        <ReportContext report={selected} />
      </DetailSheet>
    </div>
  );
}

function ReportContext({ report }: { report: SafetyReport }) {
  const router = useRouter();
  const ticketId = report.ticket?.id ?? report.supportTicketId;

  return (
    <div className="space-y-4 p-4 text-sm">
      <section>
        <p className="text-xs font-semibold uppercase text-nexa-ink-4">Listing</p>
        <p className="mt-1 font-medium text-nexa-ink">
          {report.listing?.title ?? report.listingId ?? "—"}
        </p>
      </section>
      <section>
        <p className="text-xs font-semibold uppercase text-nexa-ink-4">Reporter</p>
        <p className="mt-1 font-medium text-nexa-ink">
          {report.reporter?.name ?? report.reporterId ?? "—"}
        </p>
        {report.reporter?.email ? (
          <p className="text-xs text-nexa-ink-4">{report.reporter.email}</p>
        ) : null}
      </section>
      <section>
        <p className="text-xs font-semibold uppercase text-nexa-ink-4">Ticket</p>
        <p className="mt-1 font-medium text-nexa-ink">
          {report.ticket?.ticketNumber ?? report.supportTicketId ?? "—"}
        </p>
      </section>
      <section>
        <p className="text-xs font-semibold uppercase text-nexa-ink-4">Booking</p>
        <p className="mt-1 font-medium text-nexa-ink">
          {report.booking?.reference ?? report.bookingId ?? "—"}
        </p>
      </section>
      <div className="flex flex-col gap-2 pt-2">
        {report.listingId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/listings?status=all&q=${report.listingId}`)}
          >
            Open listing
          </Button>
        )}
        {report.bookingId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/bookings?q=${report.bookingId}`)}
          >
            Open booking
          </Button>
        )}
        {ticketId ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/support?ticket=${encodeURIComponent(ticketId)}`)}
          >
            Open support ticket
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => router.push("/support")}>
            Open support tickets
          </Button>
        )}
      </div>
    </div>
  );
}
