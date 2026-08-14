"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReportsQueue } from "@/components/reports/reports-queue";
import { LoadingState } from "@/components/ui/states";
import {
  fetchReportActivity,
  fetchReportConversation,
  fetchReportDetail,
  fetchReports,
  patchReportStatus,
  type ReportsResult,
} from "@/lib/api/stays-admin";
import type {
  InvestigationMessage,
  SafetyReport,
  SupportActivityItem,
} from "@/lib/types";

type KindFilter = "all" | "conversation_reported" | "safety_issue";
type TrustStatus = "OPEN" | "REVIEWED" | "ESCALATED" | "DISMISSED";
type StatusFilter = "all" | TrustStatus;

const PAGE_SIZE = 50;

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
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
  const reporterUserId = searchParams.get("reporterUserId") || undefined;
  const reportedUserId = searchParams.get("reportedUserId") || undefined;

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const hasItemsRef = useRef(false);

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
      if (reporterUserId) params.set("reporterUserId", reporterUserId);
      if (reportedUserId) params.set("reportedUserId", reportedUserId);
      const qs = params.toString();
      router.replace(qs ? `/reports?${qs}` : "/reports");
    },
    [kind, status, offset, q, reporterUserId, reportedUserId, router],
  );

  const loadReports = useCallback(async () => {
    if (!hasItemsRef.current) setLoading(true);
    setError(null);
    try {
      const next = await fetchReports({
        limit: PAGE_SIZE,
        offset,
        kind: kind === "all" ? undefined : kind,
        status: status === "all" ? undefined : status,
        search: q.trim() || undefined,
        reporterUserId,
        reportedUserId,
      });
      setData(next);
      hasItemsRef.current = next.items.length > 0;
      setSelected((current) => {
        if (!current) return current;
        return next.items.find((item) => item.id === current.id) ?? current;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [kind, status, offset, q, reporterUserId, reportedUserId]);

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
    if (!needle || data.items.length === 0 || selectedId) return;
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
    setSelectedId(report.id);
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

  return (
    <ReportsQueue
      data={data}
      loading={loading}
      error={error}
      pageLabel={pageLabel}
      offset={offset}
      kind={kind}
      status={status}
      searchInput={searchInput}
      selected={selected}
      selectedId={selectedId}
      detailLoading={detailLoading}
      actionError={actionError}
      lightbox={lightbox}
      transcript={transcript}
      transcriptCursor={transcriptCursor}
      transcriptHasMore={transcriptHasMore}
      transcriptLoading={transcriptLoading}
      transcriptError={transcriptError}
      activity={activity}
      onRetry={() => void loadReports()}
      onSelect={(report) => void openReport(report)}
      onClose={() => {
        setSelectedId(null);
        setSelected(null);
      }}
      onKindChange={(value) => syncUrl({ kind: value, offset: 0 })}
      onStatusChange={(value) => syncUrl({ status: value, offset: 0 })}
      onSearchChange={setSearchInput}
      onPrevious={() => syncUrl({ offset: Math.max(0, offset - PAGE_SIZE) })}
      onNext={() => syncUrl({ offset: offset + PAGE_SIZE })}
      onChangeStatus={(next) => void changeStatus(next)}
      onLoadEarlier={() => {
        if (selected && transcriptCursor != null) {
          void loadTranscript(selected, transcriptCursor, true);
        }
      }}
      onLightbox={setLightbox}
    />
  );
}
