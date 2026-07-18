"use client";

import { Wallet, Home, Inbox, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AreaChart, BarChart } from "@/components/charts/charts";
import { ClientOnly } from "@/components/client-only";
import { MetricCard } from "@/components/dashboard/metric-card";
import { HostMarketplaceFunnel } from "@/components/dashboard/host-funnel";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import {
  fetchOpsOverview,
  EMPTY_OPS_OVERVIEW,
} from "@/lib/api/stays-admin";
import { useAsyncStats } from "@/lib/hooks/use-async-data";
import { formatCurrency, formatNumber } from "@/lib/utils";

const CHART_FALLBACK = <div className="h-[220px]" />;

export default function AnalyticsPage() {
  const { data: overview, loading, error } = useAsyncStats(
    fetchOpsOverview,
    EMPTY_OPS_OVERVIEW,
    [],
  );

  const s = overview.snapshot;
  const bookingsSeries = overview.series.map((p) => ({
    label: p.date.slice(5),
    value: p.bookings,
  }));
  const revenueSeries = overview.series.map((p) => ({
    label: p.date.slice(5),
    value: p.revenue,
  }));
  const gmvSeries = overview.series.map((p) => ({
    label: p.date.slice(5),
    value: p.gmv,
  }));

  const attentionTotal =
    overview.attention.pendingListings +
    overview.attention.pendingHostApplications +
    (overview.attention.pendingKyc ?? 0) +
    overview.attention.needsChangesListings;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Decision metrics only — if it cannot change today’s work, it is not here."
      />

      {error && (
        <p className="text-sm text-nexa-danger">Failed to load analytics: {error}</p>
      )}

      <section>
        <h2 className="font-display text-lg font-semibold text-nexa-ink">Revenue</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Revenue today"
            value={loading ? "…" : formatCurrency(s.revenueToday)}
            icon={Wallet}
          />
          <MetricCard
            label="Revenue this month"
            value={loading ? "…" : formatCurrency(s.revenueMonth)}
            icon={Wallet}
            accent="accent"
          />
          <MetricCard
            label="Live listings"
            value={loading ? "…" : formatNumber(s.liveListings)}
            icon={Home}
            accent="info"
          />
          <MetricCard
            label="Open queues"
            value={loading ? "…" : formatNumber(attentionTotal)}
            icon={Inbox}
            accent="success"
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-nexa-ink">
          Bookings & growth (30d)
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>Created per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientOnly fallback={CHART_FALLBACK}>
                <BarChart data={bookingsSeries} height={220} />
              </ClientOnly>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>GMV</CardTitle>
              <CardDescription>Paid booking value per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientOnly fallback={CHART_FALLBACK}>
                <AreaChart data={gmvSeries} height={220} />
              </ClientOnly>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Platform revenue</CardTitle>
            <CardDescription>Guest + host fees</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={CHART_FALLBACK}>
              <AreaChart data={revenueSeries} height={200} color="#3DAA84" />
            </ClientOnly>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-nexa-ink">
          Host pipeline
        </h2>
        <p className="mt-1 text-sm text-nexa-ink-3">
          Where onboarding and listing conversion break.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="Avg hours to host approval"
            value={
              overview.opsTiming.avgHoursToHostApproval != null
                ? String(overview.opsTiming.avgHoursToHostApproval)
                : "—"
            }
            icon={Clock}
          />
          <MetricCard
            label="Avg days draft → submit"
            value={
              overview.opsTiming.avgDaysDraftToSubmit != null
                ? String(overview.opsTiming.avgDaysDraftToSubmit)
                : "—"
            }
            icon={Clock}
            accent="accent"
          />
        </div>
        <div className="mt-4">
          <HostMarketplaceFunnel overview={overview} />
        </div>
      </section>

      <NeedsAttention overview={overview} />
    </div>
  );
}
