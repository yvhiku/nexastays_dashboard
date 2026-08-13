"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/charts/charts";
import { ClientOnly } from "@/components/client-only";
import { fetchSupportAnalytics } from "@/lib/api/stays-admin";
import type { SupportAnalytics } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Clock, LifeBuoy, Star, ShieldAlert } from "lucide-react";

function startOfMonthIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function tomorrowExclusiveIso() {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1),
  ).toISOString();
}

function formatSeconds(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value < 60) return `${Math.round(value)}s`;
  if (value < 3600) return `${Math.round(value / 60)}m`;
  return `${(value / 3600).toFixed(1)}h`;
}

const EMPTY: SupportAnalytics = {
  from: "",
  to: "",
  tickets: { created: 0, open: 0, resolved: 0, closed: 0, escalated: 0 },
  response: {
    averageFirstResponseSeconds: null,
    medianFirstResponseSeconds: null,
  },
  firstResolution: { averageSeconds: null, medianSeconds: null },
  closure: { averageSeconds: null, medianSeconds: null },
  sla: {
    firstResponse: { onTrack: 0, atRisk: 0, breached: 0 },
    firstResolution: { onTrack: 0, atRisk: 0, breached: 0 },
  },
  csat: {
    responses: 0,
    averageRating: null,
    ratingDistribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  },
  categories: [],
  priorities: [],
};

export default function SupportAnalyticsPage() {
  const [from, setFrom] = useState(startOfMonthIso);
  const [to, setTo] = useState(tomorrowExclusiveIso);
  const [data, setData] = useState<SupportAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchSupportAnalytics({ from, to }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const categorySeries = useMemo(
    () => data.categories.map((c) => ({ label: c.category, value: c.count })),
    [data.categories],
  );
  const prioritySeries = useMemo(
    () => data.priorities.map((p) => ({ label: p.priority, value: p.count })),
    [data.priorities],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Support analytics"
        description="Tickets created in the selected range. Metrics use first response, first resolution, and close times."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="text-xs font-semibold uppercase text-nexa-ink-4">From</label>
          <input
            type="datetime-local"
            className="mt-1 h-9 rounded-md border border-nexa-line px-3 text-sm"
            value={from.slice(0, 16)}
            onChange={(e) => setFrom(new Date(e.target.value).toISOString())}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-nexa-ink-4">
            To (exclusive)
          </label>
          <input
            type="datetime-local"
            className="mt-1 h-9 rounded-md border border-nexa-line px-3 text-sm"
            value={to.slice(0, 16)}
            onChange={(e) => setTo(new Date(e.target.value).toISOString())}
          />
        </div>
        <Button size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-nexa-danger/30 bg-nexa-danger-soft px-3 py-2 text-sm text-nexa-danger">
          <p>{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Created" value={loading ? "…" : formatNumber(data.tickets.created)} icon={LifeBuoy} />
        <MetricCard label="Open backlog" value={loading ? "…" : formatNumber(data.tickets.open)} icon={Clock} />
        <MetricCard label="Resolved" value={loading ? "…" : formatNumber(data.tickets.resolved)} icon={LifeBuoy} accent="info" />
        <MetricCard label="Closed" value={loading ? "…" : formatNumber(data.tickets.closed)} icon={LifeBuoy} />
        <MetricCard label="Escalated" value={loading ? "…" : formatNumber(data.tickets.escalated)} icon={ShieldAlert} accent="accent" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Avg first response"
          value={loading ? "…" : formatSeconds(data.response.averageFirstResponseSeconds)}
          icon={Clock}
        />
        <MetricCard
          label="Median first response"
          value={loading ? "…" : formatSeconds(data.response.medianFirstResponseSeconds)}
          icon={Clock}
        />
        <MetricCard
          label="Avg time to first resolution"
          value={loading ? "…" : formatSeconds(data.firstResolution.averageSeconds)}
          icon={Clock}
        />
        <MetricCard
          label="Median time to first resolution"
          value={loading ? "…" : formatSeconds(data.firstResolution.medianSeconds)}
          icon={Clock}
        />
        <MetricCard
          label="Avg time to close"
          value={loading ? "…" : formatSeconds(data.closure.averageSeconds)}
          icon={Clock}
        />
        <MetricCard
          label="CSAT average"
          value={
            loading
              ? "…"
              : data.csat.averageRating != null
                ? data.csat.averageRating.toFixed(2)
                : "—"
          }
          icon={Star}
          accent="accent"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>First-response SLA</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-nexa-ink-3">
            On track {data.sla.firstResponse.onTrack} · At risk{" "}
            {data.sla.firstResponse.atRisk} · Breached {data.sla.firstResponse.breached}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>First-resolution SLA</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-nexa-ink-3">
            On track {data.sla.firstResolution.onTrack} · At risk{" "}
            {data.sla.firstResolution.atRisk} · Breached{" "}
            {data.sla.firstResolution.breached}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={<div className="h-[220px]" />}>
              <BarChart data={categorySeries} height={220} />
            </ClientOnly>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={<div className="h-[220px]" />}>
              <BarChart data={prioritySeries} height={220} />
            </ClientOnly>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>CSAT distribution ({data.csat.responses} responses)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          {(["1", "2", "3", "4", "5"] as const).map((star) => (
            <span key={star} className="rounded-md border border-nexa-line px-3 py-1">
              {star}★ · {data.csat.ratingDistribution[star]}
            </span>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
