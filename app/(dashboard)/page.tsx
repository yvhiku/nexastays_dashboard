"use client";

import {
  Home,
  Users,
  CalendarCheck,
  Wallet,
  CalendarRange,
  Star,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { HostMarketplaceFunnel } from "@/components/dashboard/host-funnel";
import { GroupedActivity } from "@/components/dashboard/grouped-activity";
import { OpsHero } from "@/components/dashboard/ops-hero";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AreaChart, BarChart } from "@/components/charts/charts";
import { ClientOnly } from "@/components/client-only";
import {
  fetchOpsOverview,
  EMPTY_OPS_OVERVIEW,
} from "@/lib/api/stays-admin";
import { useAsyncStats } from "@/lib/hooks/use-async-data";
import { formatCurrency, formatNumber } from "@/lib/utils";

const CHART_FALLBACK = <div className="h-[200px]" />;
const OVERVIEW_REFRESH_MS = 60_000;

export default function OverviewPage() {
  const { data: overview, loading, error } = useAsyncStats(
    fetchOpsOverview,
    EMPTY_OPS_OVERVIEW,
    [],
    OVERVIEW_REFRESH_MS,
  );

  if (error) {
    return (
      <div className="rounded-md border border-nexa-danger/30 bg-nexa-danger-soft p-4 text-sm text-nexa-danger">
        Failed to load operations overview: {error}
      </div>
    );
  }

  const s = overview.snapshot;
  const a = overview.attention;
  const attentionTotal =
    a.pendingListings +
    a.pendingHostApplications +
    (a.pendingKyc ?? 0) +
    a.needsChangesListings +
    a.failedPayouts +
    a.urgentAlerts;

  const bookingsSeries = overview.series.map((p) => ({
    label: p.date.slice(5),
    value: p.bookings,
  }));
  const revenueSeries = overview.series.map((p) => ({
    label: p.date.slice(5),
    value: p.revenue,
  }));

  return (
    <div className="space-y-8">
      <OpsHero overview={overview} attentionTotal={attentionTotal} />

      <NeedsAttention overview={overview} />

      <HostMarketplaceFunnel overview={overview} />

      <section>
        <h2 className="font-display text-lg font-semibold text-nexa-ink">
          Business Snapshot
        </h2>
        <p className="mt-1 text-sm text-nexa-ink-3">
          How the marketplace is doing right now.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Live listings"
            value={loading ? "…" : formatNumber(s.liveListings)}
            icon={Home}
          />
          <MetricCard
            label="Active hosts"
            value={loading ? "…" : formatNumber(s.activeHosts)}
            icon={Users}
          />
          <MetricCard
            label="Active bookings"
            value={loading ? "…" : formatNumber(s.activeBookings)}
            icon={CalendarCheck}
          />
          <MetricCard
            label="Revenue today"
            value={loading ? "…" : formatCurrency(s.revenueToday)}
            icon={Wallet}
          />
          <MetricCard
            label="Revenue this month"
            value={loading ? "…" : formatCurrency(s.revenueMonth)}
            icon={CalendarRange}
          />
          <MetricCard
            label="Average rating"
            value={loading ? "…" : s.avgRating > 0 ? s.avgRating.toFixed(1) : "—"}
            icon={Star}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-nexa-ink">
          Business Trends
        </h2>
        <p className="mt-1 text-sm text-nexa-ink-3">
          Last 30 days (UTC) — historical movement, not operational work.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientOnly fallback={CHART_FALLBACK}>
                <BarChart data={bookingsSeries} height={200} />
              </ClientOnly>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Platform revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientOnly fallback={CHART_FALLBACK}>
                <AreaChart data={revenueSeries} height={200} />
              </ClientOnly>
            </CardContent>
          </Card>
        </div>
      </section>

      <GroupedActivity overview={overview} />
    </div>
  );
}
