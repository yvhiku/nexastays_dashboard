"use client";

import Link from "next/link";
import {
  Users,
  Home,
  CalendarCheck,
  Wallet,
  Percent,
  Tag,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { AreaChart, BarChart } from "@/components/charts/charts";
import { ClientOnly } from "@/components/client-only";
import { RelativeTime } from "@/components/ui/relative-time";
import { fetchStats, fetchListings, fetchAuditLogs, EMPTY_DASHBOARD_STATS } from "@/lib/api/stays-admin";
import { useAsyncList, useAsyncStats } from "@/lib/hooks/use-async-data";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/utils";

const CHART_FALLBACK = <div className="h-[220px]" />;
const BAR_FALLBACK = <div className="h-[200px]" />;

function buildTrend(total: number, points = 7) {
  if (total <= 0) return Array(points).fill(0);
  const step = total / points;
  return Array.from({ length: points }, (_, i) => Math.round(step * (i + 1)));
}

export default function OverviewPage() {
  const { data: stats, loading: statsLoading, error: statsError } = useAsyncStats(
    fetchStats,
    EMPTY_DASHBOARD_STATS,
    [],
  );
  const { data: listings } = useAsyncList(fetchListings, []);
  const { data: auditLogs } = useAsyncList(fetchAuditLogs, []);

  if (statsError) {
    return (
      <div className="rounded-md border border-nexa-danger/30 bg-nexa-danger-soft p-4 text-sm text-nexa-danger">
        Failed to load dashboard: {statsError}
      </div>
    );
  }

  const m = stats;

  const pending = listings.filter((l) => l.status === "pending").slice(0, 5);
  const gmvTrend = buildTrend(m.totalBookingValue).map((value, i) => ({
    label: `W${i + 1}`,
    value,
  }));
  const bookingsTrend = buildTrend(m.totalBookings).map((value, i) => ({
    label: `W${i + 1}`,
    value,
  }));

  const cityMap = new Map<string, number>();
  for (const l of listings) {
    cityMap.set(l.city, (cityMap.get(l.city) ?? 0) + l.pricePerNight);
  }
  const cityPerformance = [...cityMap.entries()]
    .map(([city, gmv]) => ({ city, gmv }))
    .sort((a, b) => b.gmv - a.gmv);

  const avgNightly =
    listings.length > 0
      ? listings.reduce((s, l) => s + l.pricePerNight, 0) / listings.length
      : 0;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Real-time snapshot of the Nexa Stays marketplace (Stays API + DB)."
        actions={
          <Button size="sm" variant="outline" disabled={statsLoading}>
            {statsLoading ? "Loading…" : "Live data"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total hosts"
          value={formatNumber(m.totalUsers)}
          icon={Users}
          spark={buildTrend(m.totalUsers)}
          accent="primary"
        />
        <MetricCard
          label="Active listings"
          value={formatNumber(m.activeListings)}
          icon={Home}
          spark={buildTrend(m.activeListings)}
          sparkColor="#F9A86C"
          accent="accent"
        />
        <MetricCard
          label="Total bookings"
          value={formatNumber(m.totalBookings)}
          icon={CalendarCheck}
          spark={buildTrend(m.totalBookings)}
          sparkColor="#4A7FE0"
          accent="info"
        />
        <MetricCard
          label="Booking value (GMV)"
          value={formatCurrency(m.totalBookingValue, "MAD", true)}
          icon={Wallet}
          spark={buildTrend(m.totalBookingValue)}
          sparkColor="#3DAA84"
          accent="success"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Platform revenue"
          value={formatCurrency(m.totalRevenue, "MAD", true)}
          icon={Percent}
          accent="primary"
        />
        <MetricCard
          label="Avg nightly price"
          value={formatCurrency(avgNightly)}
          icon={Tag}
          accent="accent"
        />
        <MetricCard
          label="Cancellation rate"
          value={formatPercent(m.cancellationRate)}
          icon={XCircle}
          accent="info"
        />
        <MetricCard
          label="Avg booking value"
          value={formatCurrency(m.avgBookingValue)}
          icon={TrendingUp}
          accent="success"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Gross Merchandise Value</CardTitle>
              <CardDescription>Derived trend from confirmed booking value</CardDescription>
            </div>
            <span className="text-right">
              <span className="block text-xl font-semibold text-nexa-ink">
                {formatCurrency(m.totalBookingValue, "MAD", true)}
              </span>
            </span>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={CHART_FALLBACK}>
              <AreaChart data={gmvTrend} />
            </ClientOnly>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent audit events</CardTitle>
              <CardDescription>From Stays audit log</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-y-auto nexa-scrollbar-thin">
            <ActivityFeed logs={auditLogs.slice(0, 12)} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Bookings volume</CardTitle>
              <CardDescription>Derived from total bookings</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={BAR_FALLBACK}>
              <BarChart data={bookingsTrend} color="#F9A86C" height={200} />
            </ClientOnly>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top cities by listing value</CardTitle>
              <CardDescription>Sum of nightly rates by city</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {cityPerformance.slice(0, 5).map((c, i) => (
              <div key={c.city} className="flex items-center gap-3">
                <span className="w-5 text-sm font-semibold text-nexa-ink-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-nexa-ink">{c.city}</span>
                    <span className="text-nexa-ink-3">
                      {formatCurrency(c.gmv, "MAD", true)}
                    </span>
                  </div>
                  {cityPerformance[0] && (
                    <div className="mt-1 h-1.5 w-full rounded-full bg-nexa-bg-2">
                      <div
                        className="h-full rounded-full bg-nexa-primary"
                        style={{
                          width: `${cityPerformance[0].gmv > 0 ? (c.gmv / cityPerformance[0].gmv) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {cityPerformance.length === 0 && (
              <p className="text-sm text-nexa-ink-4">No listings yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pending approvals</CardTitle>
              <CardDescription>{m.pendingListings} listings awaiting review</CardDescription>
            </div>
            <Link href="/listings">
              <Button variant="soft" size="sm">Review all</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {pending.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-md border border-nexa-line px-3 py-2"
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-md"
                  style={{ backgroundColor: l.thumbnailColor }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-nexa-ink">{l.title}</p>
                  <p className="text-xs text-nexa-ink-4">
                    {l.city} · <RelativeTime value={l.createdAt} className="text-xs text-nexa-ink-4" />
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </div>
            ))}
            {pending.length === 0 && (
              <p className="text-sm text-nexa-ink-4">No pending listings.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
