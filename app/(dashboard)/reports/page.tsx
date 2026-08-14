"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import {
  fetchReportActivity,
  fetchReportConversation,
  fetchReportDetail,
  fetchReports,
  patchReportStatus,
  type ReportsResult,
} from "@/lib/api/stays-admin";
import { formatDateTime } from "@/lib/utils";
import type {
  InvestigationMessage,
  SafetyReport,
  SupportActivityItem,
} from "@/lib/types";

type KindFilter = "all" | "conversation_reported" | "safety_issue";
type TrustStatus = "OPEN" | "REVIEWED" | "ESCALATED" | "DISMISSED";
type StatusFilter = "all" | TrustStatus;

const PAGE_SIZE = 50;
const STATUS_ACTIONS: TrustStatus[] = ["OPEN", "REVIEWED", "ESCALATED", "DISMISSED"];

function formatActivityAction(action: string) {
  return action.replace(/_/g, " ");
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-nexa-ink-4">Loading…</p>}>
      <ReportsPageInner />
    </Suspense>
  );
}

function ReportsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const kind = (searchParams.get("kind") as KindFilter | null) ?? "all";
  const status = (searchParams.get("status") as StatusFilter | null) ?? "all";
  const offset = Math.max(Number(searchParams.get("offset") ?? "0") || 0, 0);
  const q = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(q);
  const [data, setData] = useState<ReportsResult>({
    items: [],
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SafetyReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ label: string; url: string } | null>(null);
  const [transcript, setTranscript] = useState<InvestigationMessage[]>([]);
  const [transcriptCursor, setTranscriptCursor] = useState<number | null>(null);
  const [transcriptHasMore, setTranscriptHasMore] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [activity, setActivity] = useState<SupportActivityItem[]>([]);

  const syncUrl = useCallback(
    (next: {
      kind?: KindFilter;
      status?: StatusFilter;
      offset?: number;
      q?: string;
    }) => {
      const params = new URLSearchParams();
      const nextKind = next.kind ?? kind;
      const nextStatus = next.status ?? status;
      const nextOffset = next.offset ?? offset;
      const nextQ = next.q ?? q;
      if (nextKind !== "all") params.set("kind", nextKind);
      if (nextStatus !== "all") params.set("status", nextStatus);
      if (nextOffset > 0) params.set("offset", String(nextOffset));
      if (nextQ.trim()) params.set("q", nextQ.trim());
      const qs = params.toString();
      router.replace(qs ? `/reports?${qs}` : "/reports");
    },
    [kind, status, offset, q, router],
  );

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchReports({
        limit: PAGE_SIZE,
        offset,
        kind: kind === "all" ? undefined : kind,
        status: status === "all" ? undefined : status,
        search: q.trim() || undefined,
      });
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [kind, status, offset, q]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput === q) return;
      syncUrl({ q: searchInput, offset: 0 });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput, q, syncUrl]);

  useEffect(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || data.items.length === 0 || selected) return;
    const match = data.items.find(
      (r) =>
        r.id.toLowerCase() === needle ||
        r.id.toLowerCase().includes(needle) ||
        (r.reason ?? "").toLowerCase().includes(needle) ||
        (r.category ?? "").toLowerCase().includes(needle) ||
        (r.ticket?.ticketNumber ?? "").toLowerCase().includes(needle),
    );
    if (match) void openReport(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.items, q]);

  const pageLabel = useMemo(() => {
    if (data.total === 0) return "0 reports";
    const from = data.offset + 1;
    const to = Math.min(data.offset + data.items.length, data.total);
    return `${from}–${to} of ${data.total}`;
  }, [data]);

  async function loadTranscript(
    report: SafetyReport,
    beforeSequence?: number,
    append = false,
  ) {
    if (
      report.kind !== "conversation_reported" &&
      report.kind !== "safety_issue"
    ) {
      return;
    }
    setTranscriptLoading(true);
    setTranscriptError(null);
    try {
      const page = await fetchReportConversation(report.id, report.kind, {
        limit: 50,
        beforeSequence,
      });
      setTranscript((prev) => (append ? [...page.items, ...prev] : page.items));
      setTranscriptCursor(page.nextCursor?.beforeSequence ?? null);
      setTranscriptHasMore(page.hasMore);
    } catch (err) {
      setTranscriptError(
        err instanceof Error ? err.message : "Unable to load conversation",
      );
      if (!append) {
        setTranscript([]);
        setTranscriptCursor(null);
        setTranscriptHasMore(false);
      }
    } finally {
      setTranscriptLoading(false);
    }
  }

  async function openReport(report: SafetyReport) {
    setSelected(report);
    setActionError(null);
    setLightbox(null);
    setTranscript([]);
    setTranscriptCursor(null);
    setTranscriptHasMore(false);
    setTranscriptError(null);
    setActivity([]);
    if (
      report.kind !== "conversation_reported" &&
      report.kind !== "safety_issue"
    ) {
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await fetchReportDetail(report.id, report.kind);
      setSelected(detail);
      const activityPage = await fetchReportActivity(report.id, report.kind, {
        limit: 50,
        offset: 0,
      });
      setActivity(activityPage.items);
      await loadTranscript(detail);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to load report detail");
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeStatus(nextStatus: TrustStatus) {
    if (!selected) return;
    if (
      selected.kind !== "conversation_reported" &&
      selected.kind !== "safety_issue"
    ) {
      return;
    }
    setActionError(null);
    try {
      const next = await patchReportStatus(selected.id, selected.kind, nextStatus);
      setSelected(next);
      await loadReports();
      const activityPage = await fetchReportActivity(selected.id, selected.kind, {
        limit: 50,
        offset: 0,
      });
      setActivity(activityPage.items);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  const ticketId = selected?.ticket?.id ?? selected?.supportTicketId;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Conversation reports and safety issues. Never silently delete — open the related listing, host, or support ticket."
      />
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-nexa-danger/30 bg-nexa-danger-soft px-3 py-2 text-sm text-nexa-danger">
          <p>Unable to load reports. {error}</p>
          <Button size="sm" variant="outline" onClick={() => void loadReports()}>
            Retry
          </Button>
        </div>
      )}

      <div className="mb-3">
        <FilterTabs<StatusFilter>
          value={status}
          onChange={(value) => syncUrl({ status: value, offset: 0 })}
          options={[
            { value: "all", label: "All statuses" },
            { value: "OPEN", label: "Open" },
            { value: "REVIEWED", label: "Reviewed" },
            { value: "ESCALATED", label: "Escalated" },
            { value: "DISMISSED", label: "Dismissed" },
          ]}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<KindFilter>
          value={kind}
          onChange={(value) => syncUrl({ kind: value, offset: 0 })}
          options={[
            { value: "all", label: "All", count: data.total },
            { value: "conversation_reported", label: "Conversation" },
            { value: "safety_issue", label: "Safety" },
          ]}
        />
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search reports…"
          className="lg:w-72"
        />
      </div>

      <Card>
        {loading ? (
          <p className="py-10 text-center text-sm text-nexa-ink-4">Loading reports…</p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Kind</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH>Evidence</TH>
                <TH className="text-right">Open</TH>
              </tr>
            </THead>
            <tbody>
              {data.items.map((r) => (
                <TR key={r.id} className="cursor-pointer" onClick={() => void openReport(r)}>
                  <TD>{r.kind.replace(/_/g, " ")}</TD>
                  <TD className="text-nexa-ink-3">{r.reason ?? r.category ?? "—"}</TD>
                  <TD>
                    <StatusBadge status={(r.status ?? "OPEN").toLowerCase()} />
                  </TD>
                  <TD className="text-nexa-ink-3">
                    {r.createdAt ? formatDateTime(r.createdAt) : "—"}
                  </TD>
                  <TD className="text-nexa-ink-3">{r.evidenceCount ?? 0}</TD>
                  <TD className="text-right text-xs text-nexa-primary">View</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        {!loading && !error && data.items.length === 0 && (
          <div className="py-12 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-nexa-ink-4" />
            <p className="mt-3 text-sm text-nexa-ink-4">No reports found.</p>
          </div>
        )}
        {!loading && data.items.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-nexa-line px-4 py-3 text-xs text-nexa-ink-4">
            <span>{pageLabel}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={offset <= 0 || loading}
                onClick={() => syncUrl({ offset: Math.max(0, offset - PAGE_SIZE) })}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!data.hasMore || loading}
                onClick={() => syncUrl({ offset: offset + PAGE_SIZE })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selected && (
        <>
          <div
            className="fixed inset-0 z-50 bg-nexa-ink/40"
            onClick={() => setSelected(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-nexa-line bg-white p-5">
            <h2 className="font-display text-xl font-semibold text-nexa-ink">
              Report {selected.id.slice(0, 8)}
            </h2>
            {detailLoading && (
              <p className="mt-2 text-xs text-nexa-ink-4">Loading detail…</p>
            )}
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-nexa-ink-4">Kind</dt>
                <dd>{selected.kind.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Reason</dt>
                <dd>{selected.reason ?? selected.category ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Status</dt>
                <dd>
                  <StatusBadge status={(selected.status ?? "OPEN").toLowerCase()} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Reporter</dt>
                <dd>
                  {selected.reporter?.name ?? selected.reporterId ?? "—"}
                  {selected.reporter?.email ? (
                    <span className="block text-xs text-nexa-ink-4">
                      {selected.reporter.email}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Reported party</dt>
                <dd>{selected.reportedUser?.name ?? selected.reportedUser?.id ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Booking</dt>
                <dd>
                  {selected.booking?.reference ?? selected.bookingId ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Listing</dt>
                <dd>{selected.listing?.title ?? selected.listingId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Linked ticket</dt>
                <dd>
                  {selected.ticket?.ticketNumber ??
                    selected.supportTicketId ??
                    "—"}
                </dd>
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
                      <p className="text-xs text-nexa-ink-3">
                        {signal.reason.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(selected.evidence?.length ?? 0) > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase text-nexa-ink-4">Evidence</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {selected.evidence!.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className="overflow-hidden rounded-md border border-nexa-line"
                      onClick={() =>
                        setLightbox({
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
                <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-md border border-nexa-line p-2">
                  {transcriptLoading && transcript.length === 0 ? (
                    <p className="text-xs text-nexa-ink-4">Loading transcript…</p>
                  ) : transcript.length === 0 ? (
                    <p className="text-xs text-nexa-ink-4">No messages available.</p>
                  ) : (
                    transcript.map((m) => (
                      <div key={m.id} className="rounded-md bg-nexa-bg-2 px-2 py-1.5 text-xs">
                        <p className="font-semibold uppercase text-nexa-ink-4">
                          {m.senderRole}
                        </p>
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
                                  setLightbox({
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
                    onClick={() =>
                      void loadTranscript(selected, transcriptCursor, true)
                    }
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

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase text-nexa-ink-4">Status actions</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {STATUS_ACTIONS.map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    size="sm"
                    variant={
                      (selected.status ?? "").toUpperCase() === nextStatus
                        ? "soft"
                        : "outline"
                    }
                    onClick={() => void changeStatus(nextStatus)}
                  >
                    {nextStatus}
                  </Button>
                ))}
              </div>
            </div>

            {actionError && <p className="mt-3 text-xs text-nexa-danger">{actionError}</p>}

            <div className="mt-6 flex flex-col gap-2">
              {selected.listingId && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/listings?status=all&q=${selected.listingId}`)}
                >
                  Open listing
                </Button>
              )}
              {selected.bookingId && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/bookings?q=${selected.bookingId}`)}
                >
                  Open booking
                </Button>
              )}
              {ticketId && (
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/support?ticket=${encodeURIComponent(ticketId)}`)
                  }
                >
                  Open support ticket
                </Button>
              )}
              {!ticketId && (
                <Button variant="outline" onClick={() => router.push("/support")}>
                  Open support tickets
                </Button>
              )}
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <p className="mt-4 text-xs text-nexa-ink-4">
              Reports are never silently deleted. Dismissed rows stay in the queue.
            </p>
          </aside>
        </>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-nexa-ink/80 p-4"
          onClick={() => setLightbox(null)}
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
                onClick={() => setLightbox(null)}
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
      )}
    </div>
  );
}
