import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import type { StaysPersonOverview } from "@/lib/api/stays-admin";
import { formatDateTime } from "@/lib/utils";
import { MetricCard } from "./person-field";

export function PersonSupport({
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
  if (loading && !stays) return <LoadingState label="Loading support…" />;
  if (error && !stays) {
    return (
      <ErrorState title="Couldn't load support" detail={error} onRetry={onRetry} />
    );
  }
  if (!stays) return null;

  const allHref = `/support?requesterUserId=${encodeURIComponent(userId)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
          Support tickets
        </h3>
        <Link
          href={allHref}
          className="text-xs font-medium text-nexa-primary hover:underline"
        >
          View all support tickets →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Total tickets" value={stays.tickets.total} />
        <MetricCard label="Open tickets" value={stays.tickets.open} />
      </div>
      {stays.tickets.items.length === 0 ? (
        <EmptyState title="No support tickets" />
      ) : (
        <ul className="space-y-2">
          {stays.tickets.items.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/support?ticket=${encodeURIComponent(ticket.id)}`}
                className="block rounded-md border border-nexa-line px-3 py-2 hover:bg-nexa-bg-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-nexa-ink">
                    {ticket.ticketNumber}
                  </p>
                  <StatusBadge status={ticket.status.toLowerCase()} />
                </div>
                <p className="mt-1 truncate text-sm text-nexa-ink-2">{ticket.subject}</p>
                <p className="mt-1 text-xs text-nexa-ink-4">
                  {ticket.createdAt ? formatDateTime(ticket.createdAt) : "Not collected"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
