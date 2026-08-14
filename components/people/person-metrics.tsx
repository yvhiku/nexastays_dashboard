import { formatCurrency } from "@/lib/utils";
import type { StaysPersonOverview } from "@/lib/api/stays-admin";
import { MetricCard } from "./person-field";
import { personRoles } from "./person-role-badges";

export function PersonMetrics({ stays }: { stays: StaysPersonOverview }) {
  const { isHost, isGuest } = personRoles(stays);
  const live = stays.listings.byStatus.LIVE ?? stays.listings.byStatus.live ?? 0;

  return (
    <div className="space-y-5">
      {isHost ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
            Hosting
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard label="Listings" value={stays.listings.total} />
            <MetricCard label="Active listings" value={live} />
            <MetricCard label="Host bookings" value={stays.bookingsAsHost.total} />
            <MetricCard label="Completed stays" value={stays.bookingsAsHost.completed} />
            <MetricCard label="Cancelled stays" value={stays.bookingsAsHost.cancelled} />
            <MetricCard
              label="Total payout"
              value={formatCurrency(stays.bookingsAsHost.totalPayout)}
            />
            <MetricCard
              label="Average rating"
              value={
                stays.reviews.asHost.averageRating != null
                  ? stays.reviews.asHost.averageRating.toFixed(1)
                  : "Not collected"
              }
            />
          </div>
        </section>
      ) : null}
      {isGuest ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
            Travel
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard label="Guest bookings" value={stays.bookingsAsGuest.total} />
            <MetricCard label="Upcoming stays" value={stays.bookingsAsGuest.upcoming} />
            <MetricCard label="Completed stays" value={stays.bookingsAsGuest.completed} />
            <MetricCard label="Cancelled stays" value={stays.bookingsAsGuest.cancelled} />
            <MetricCard
              label="Total paid"
              value={formatCurrency(stays.bookingsAsGuest.totalPaid)}
            />
            <MetricCard label="Reports made" value={stays.trust.reportsMade} />
            <MetricCard label="Reports against" value={stays.trust.reportsAgainst} />
            <MetricCard
              label="Safety against"
              value={stays.trust.safetyIssuesAgainst}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
