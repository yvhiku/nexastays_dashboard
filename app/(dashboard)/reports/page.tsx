"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { ApiUnavailable } from "@/components/ui/api-unavailable";
import { fetchReports, type ReportsResult } from "@/lib/api/stays-admin";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { formatDateTime } from "@/lib/utils";
import type { SafetyReport } from "@/lib/types";

type Filter = "all" | SafetyReport["kind"];

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
  const { data, loading, error } = useAsyncData<ReportsResult>(
    fetchReports,
    [],
    { items: [], unavailable: true },
  );

  const items = data?.items ?? [];
  const unavailable = data?.unavailable ?? false;

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
        (r.category ?? "").toLowerCase().includes(q),
    );
    if (match) setSelected(match);
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
        (r.category ?? "").toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Conversation reports and safety issues. Never silently delete — open the related listing, host, or support ticket."
      />
      {unavailable && (
        <ApiUnavailable
          title="Reports API not connected"
          detail="GET /admin/stays/reports is not available yet. When it lands, this queue will list conversation_reported and safety_issue events from Stays messaging."
        />
      )}
      {error && <p className="mb-4 text-sm text-nexa-danger">{error}</p>}

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
                <TH>Report</TH>
                <TH>Kind</TH>
                <TH>Reason</TH>
                <TH>Created</TH>
                <TH>Status</TH>
                <TH className="text-right">Open</TH>
              </tr>
            </THead>
            <tbody>
              {filtered.map((r) => (
                <TR key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                  <TD className="font-medium text-nexa-ink">{r.id.slice(0, 8)}</TD>
                  <TD>{r.kind.replace(/_/g, " ")}</TD>
                  <TD className="text-nexa-ink-3">{r.reason ?? r.category ?? "—"}</TD>
                  <TD className="text-nexa-ink-3">
                    {r.createdAt ? formatDateTime(r.createdAt) : "—"}
                  </TD>
                  <TD>
                    <StatusBadge status={(r.status ?? "open").toLowerCase()} />
                  </TD>
                  <TD className="text-right text-xs text-nexa-primary">View</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-nexa-ink-4" />
            <p className="mt-3 text-sm text-nexa-ink-4">
              {unavailable ? "No reports until the Stays API is connected." : "No reports found."}
            </p>
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
                <dt className="text-xs text-nexa-ink-4">Reporter</dt>
                <dd>{selected.reporterId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Created</dt>
                <dd>{selected.createdAt ? formatDateTime(selected.createdAt) : "—"}</dd>
              </div>
            </dl>
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
              {selected.supportTicketId && (
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/support?ticket=${encodeURIComponent(selected.supportTicketId!)}`)
                  }
                >
                  Open support ticket
                </Button>
              )}
              {!selected.supportTicketId && (
                <Button variant="outline" onClick={() => router.push("/support")}>
                  Open support tickets
                </Button>
              )}
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <p className="mt-4 text-xs text-nexa-ink-4">
              Reports are never silently deleted. Use freeze host, hide review, or a support
              ticket from the related queues.
            </p>
          </aside>
        </>
      )}
    </div>
  );
}
