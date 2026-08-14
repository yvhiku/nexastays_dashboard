import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import type { StaysPersonOverview } from "@/lib/api/stays-admin";
import { formatCurrency } from "@/lib/utils";
import { MetricCard } from "./person-field";

export function PersonTravel({
  userId,
  stays,
  loading,
  error,
  onRetry,
}: {
  userId: string;
  stays: StaysPersonOverview | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading && !stays) return <LoadingState label="Loading travel…" />;
  if (error && !stays) {
    return (
      <ErrorState title="Couldn't load travel" detail={error} onRetry={onRetry} />
    );
  }
  if (!stays) return null;

  const href = `/bookings?guestUserId=${encodeURIComponent(userId)}`;
  const reviewsHref = `/reviews?guestUserId=${encodeURIComponent(userId)}`;

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
            Guest bookings
          </h3>
          <Link
            href={href}
            className="text-xs font-medium text-nexa-primary hover:underline"
          >
            View all bookings →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard label="Total bookings" value={stays.bookingsAsGuest.total} />
          <MetricCard label="Upcoming" value={stays.bookingsAsGuest.upcoming} />
          <MetricCard label="Completed" value={stays.bookingsAsGuest.completed} />
          <MetricCard label="Cancelled" value={stays.bookingsAsGuest.cancelled} />
          <MetricCard
            label="Total paid"
            value={formatCurrency(stays.bookingsAsGuest.totalPaid)}
          />
          <MetricCard label="Reviews written" value={stays.reviews.asGuest.written} />
        </div>
        {stays.bookingsAsGuest.items.length === 0 ? (
          <EmptyState className="py-6" title="No guest bookings" />
        ) : (
          <ul className="mt-3 space-y-2">
            {stays.bookingsAsGuest.items.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`${href}&q=${encodeURIComponent(booking.reference)}`}
                  className="block rounded-md border border-nexa-line px-3 py-2 hover:bg-nexa-bg-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-nexa-ink">
                      {booking.reference}
                    </p>
                    <StatusBadge status={booking.status.toLowerCase()} />
                  </div>
                  <p className="mt-1 text-xs text-nexa-ink-4">
                    {booking.checkinDate ?? "Not collected"} →{" "}
                    {booking.checkoutDate ?? "Not collected"} · listing{" "}
                    {booking.listingId.slice(0, 8)} · {formatCurrency(booking.amount)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p>
        <Link
          href={reviewsHref}
          className="text-xs font-medium text-nexa-primary hover:underline"
        >
          View reviews written →
        </Link>
      </p>
    </div>
  );
}
