"use client";

import { TrendingUp, Users, Home, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { AreaChart, BarChart, HBar } from "@/components/charts/charts";
import { ClientOnly } from "@/components/client-only";
import { fetchStats, fetchListings, fetchBookings, EMPTY_DASHBOARD_STATS } from "@/lib/api/stays-admin";
import { useAsyncList, useAsyncStats } from "@/lib/hooks/use-async-data";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

function buildTrend(total: number, points = 12) {
  if (total <= 0) return Array.from({ length: points }, (_, i) => ({
    label: `W${i + 1}`,
    value: 0,
  }));
  const step = total / points;
  return Array.from({ length: points }, (_, i) => ({
    label: `W${i + 1}`,
    value: Math.round(step * (i + 1)),
  }));
}

export default function AnalyticsPage() {
  const { data: stats } = useAsyncStats(fetchStats, EMPTY_DASHBOARD_STATS, []);
  const { data: listings } = useAsyncList(fetchListings, []);
  const { data: bookings } = useAsyncList(fetchBookings, []);

  const gmv = stats.totalBookingValue;
  const commissionRate = stats.totalCommissionPercent / 100;
  const revenueEstimate = gmv * commissionRate;
  const gmvTrend = buildTrend(gmv);
  const signupTrend = buildTrend(stats.totalHosts);
  const funnel = [
    { stage: "Listings", value: stats.totalListings },
    { stage: "Live", value: stats.liveListings },
    { stage: "Bookings", value: stats.totalBookings },
    { stage: "Confirmed", value: stats.confirmedBookings },
  ];
  const maxFunnel = funnel[0]?.value || 1;

  const cityMap = new Map<string, number>();
  for (const l of listings) {
    cityMap.set(l.city, (cityMap.get(l.city) ?? 0) + l.pricePerNight);
  }
  const cityPerformance = [...cityMap.entries()]
    .map(([city, gmvVal]) => ({ city, gmv: gmvVal }))
    .sort((a, b) => b.gmv - a.gmv);

  const topListings = [...listings]
    .sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount)
    .slice(0, 5)
    .map((l) => ({
      title: l.title,
      city: l.city,
      gmv: l.pricePerNight * l.bookingsCount,
      rating: l.rating,
    }));

  return (
    <div>
      <PageHeader
        title="Analytics & Growth"
        description="Marketplace metrics from Stays API and database."
        actions={<Button variant="outline" size="sm">Live data</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="GMV" value={formatCurrency(gmv, "MAD", true)} sub="Confirmed bookings" icon={Wallet} />
        <KpiCard
          label="Revenue estimate"
          value={formatCurrency(revenueEstimate, "MAD", true)}
          sub={`${stats.totalCommissionPercent}% commission (${stats.guestFeePercent}% guest + ${stats.hostFeePercent}% host)`}
          icon={TrendingUp}
        />
        <KpiCard label="Hosts" value={formatNumber(stats.totalHosts)} sub="Stays host profiles" icon={Users} />
        <KpiCard label="Live listings" value={formatNumber(stats.liveListings)} sub="Published supply" icon={Home} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>GMV trend</CardTitle>
            <CardDescription>Derived from total booking value</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={<div className="h-[220px]" />}>
              <AreaChart data={gmvTrend} />
            </ClientOnly>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Host growth</CardTitle>
            <CardDescription>Total registered hosts</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={<div className="h-[220px]" />}>
              <BarChart data={signupTrend} color="#4A7FE0" height={220} />
            </ClientOnly>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
            <CardDescription>Listings → bookings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((f) => (
              <div key={f.stage}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{f.stage}</span>
                  <span className="font-medium">{formatNumber(f.value)}</span>
                </div>
                <HBar value={f.value} max={maxFunnel} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top cities</CardTitle>
            <CardDescription>By listing rate sum</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {cityPerformance.slice(0, 5).map((c) => (
              <div key={c.city} className="flex justify-between text-sm">
                <span>{c.city}</span>
                <span className="text-nexa-ink-3">{formatCurrency(c.gmv, "MAD", true)}</span>
              </div>
            ))}
            {cityPerformance.length === 0 && (
              <p className="text-sm text-nexa-ink-4">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top listings</CardTitle>
            <CardDescription>By rating</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <tr>
                  <TH>Listing</TH>
                  <TH>City</TH>
                  <TH>Rating</TH>
                </tr>
              </THead>
              <tbody>
                {topListings.map((l) => (
                  <TR key={l.title}>
                    <TD className="max-w-[140px] truncate">{l.title}</TD>
                    <TD>{l.city}</TD>
                    <TD>{l.rating.toFixed(1)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            {topListings.length === 0 && (
              <p className="py-4 text-sm text-nexa-ink-4">No listings yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Booking summary</CardTitle>
            <CardDescription>{bookings.length} total in database</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <Stat label="Today" value={String(stats.todayBookings)} />
            <Stat label="Confirmed" value={String(stats.confirmedBookings)} />
            <Stat label="Cancellation rate" value={formatPercent(stats.cancellationRate)} />
            <Stat label="Avg booking" value={formatCurrency(stats.avgBookingValue)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-nexa-ink-4">{label}</p>
          <p className="mt-1 text-xl font-semibold text-nexa-ink">{value}</p>
          <p className="mt-0.5 text-xs text-nexa-ink-3">{sub}</p>
        </div>
        <Icon className="h-5 w-5 text-nexa-primary" />
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-nexa-ink-4">{label}</p>
      <p className="mt-0.5 font-semibold text-nexa-ink">{value}</p>
    </div>
  );
}
