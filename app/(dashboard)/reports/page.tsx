"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import {
  fetchReportDetail,
  fetchReports,
  patchReportStatus,
  type ReportsResult,
} from "@/lib/api/stays-admin";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { formatDateTime } from "@/lib/utils";
import type { SafetyReport } from "@/lib/types";

type Filter = "all" | SafetyReport["kind"];
type TrustStatus = "OPEN" | "REVIEWED" | "ESCALATED" | "DISMISSED";

const STATUS_ACTIONS: TrustStatus[] = ["OPEN", "REVIEWED", "ESCALATED", "DISMISSED"];

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
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [selected, setSelected] = useState<SafetyReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ label: string; url: string } | null>(
    null,
  );
  const { data, loading, error, reload } = useAsyncData<ReportsResult>(
    fetchReports,
    [],
    { items: [] },
  );

  const items = data?.items ?? [];

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const q = (searchParams.get("q") ?? "").toLowerCase();
    if (!q || items.length === 0) return;
    const match = items.find(
      (r) =>
        r.id.toLowerCase() === q ||
        r.id.toLowerCase().includes(q) ||
        (r.reason ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q) ||
        (r.ticket?.ticketNumber ?? "").toLowerCase().includes(q),
    );
    if (match) void openReport(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchParams]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const r of items) c[r.kind] = (c[r.kind] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = items.filter((r) => {
    const match = filter === "all" || r.kind === filter;
    const q = query.toLowerCase();
    return (
      match &&
      (r.id.toLowerCase().includes(q) ||
        (r.reason ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q) ||
        (r.reporter?.name ?? "").toLowerCase().includes(q) ||
        (r.ticket?.ticketNumber ?? "").toLowerCase().includes(q))
    );
  });

  async function openReport(report: SafetyReport) {
    setSelected(report);
    setActionError(null);
    setLightbox(null);
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to load report detail");
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeStatus(status: TrustStatus) {
    if (!selected) return;
    if (
      selected.kind !== "conversation_reported" &&
      selected.kind !== "safety_issue"
    ) {
      return;
    }
    setActionError(null);
    try {
      const next = await patchReportStatus(selected.id, selected.kind, status);
      setSelected(next);
      await reload();
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
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            {
              value: "conversation_reported",
              label: "Conversation",
              count: counts.conversation_reported ?? 0,
            },
            { value: "safety_issue", label: "Safety", count: counts.safety_issue ?? 0 },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
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
              {filtered.map((r) => (
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
        {!loading && !error && filtered.length === 0 && (
          <div className="py-12 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-nexa-ink-4" />
            <p className="mt-3 text-sm text-nexa-ink-4">No reports found.</p>
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
                <dt className="text-xs text-nexa-ink-4">Conversation</dt>
                <dd className="break-all font-mono text-xs">
                  {selected.conversationId ?? "—"}
                </dd>
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

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase text-nexa-ink-4">Status actions</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {STATUS_ACTIONS.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={
                      (selected.status ?? "").toUpperCase() === status ? "soft" : "outline"
                    }
                    onClick={() => void changeStatus(status)}
                  >
                    {status}
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
