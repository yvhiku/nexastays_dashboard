"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  fetchHostApplicationDocumentBlobUrl,
  type StaysPersonOverview,
} from "@/lib/api/stays-admin";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MetricCard, PersonField } from "./person-field";

export function PersonHosting({
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
  if (loading && !stays) return <LoadingState label="Loading hosting…" />;
  if (error && !stays) {
    return (
      <ErrorState
        title="Couldn't load hosting"
        detail={error}
        onRetry={onRetry}
      />
    );
  }
  if (!stays) return null;

  const profile = stays.hostProfile;
  const listingsHref = `/listings?status=all&hostUserId=${encodeURIComponent(userId)}`;
  const bookingsHref = `/bookings?hostUserId=${encodeURIComponent(userId)}`;
  const reviewsHref = `/reviews?hostUserId=${encodeURIComponent(userId)}`;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
          Host profile
        </h3>
        {profile ? (
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PersonField label="Application" value={profile.applicationStatus} />
            <PersonField
              label="Host verification"
              value={profile.hostVerificationStatus}
            />
            <PersonField label="Identity status" value={profile.identityStatus} />
            <PersonField
              label="Listings frozen"
              value={profile.listingFrozen ? "Yes" : "No"}
            />
            <PersonField label="Document type" value={profile.documentType} />
            <PersonField
              label="Submitted"
              value={profile.submittedAt ? formatDate(profile.submittedAt) : null}
            />
            <PersonField
              label="Reviewed"
              value={profile.reviewedAt ? formatDate(profile.reviewedAt) : null}
            />
            <PersonField label="Rejection reason" value={profile.rejectionReason} />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-nexa-ink-4">Not collected</p>
        )}
        {profile ? <HostDocuments profileId={profile.id} profile={profile} /> : null}
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
            Listings
          </h3>
          <Link
            href={listingsHref}
            className="text-xs font-medium text-nexa-primary hover:underline"
          >
            View all listings →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard label="Total" value={stays.listings.total} />
          {Object.entries(stays.listings.byStatus).map(([status, count]) => (
            <MetricCard key={status} label={status.replace(/_/g, " ")} value={count} />
          ))}
        </div>
        {stays.listings.items.length === 0 ? (
          <EmptyState className="py-6" title="No listings" />
        ) : (
          <ul className="mt-3 space-y-2">
            {stays.listings.items.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`${listingsHref}&q=${encodeURIComponent(listing.id)}`}
                  className="block rounded-md border border-nexa-line px-3 py-2 hover:bg-nexa-bg-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-nexa-ink">
                      {listing.title}
                    </p>
                    <StatusBadge status={listing.status.toLowerCase()} />
                  </div>
                  <p className="mt-1 text-xs text-nexa-ink-4">
                    {listing.city} · {formatCurrency(listing.price)} ·{" "}
                    {listing.bookingCount} bookings
                    {listing.rating != null ? ` · ${listing.rating.toFixed(1)}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
            Host bookings
          </h3>
          <Link
            href={bookingsHref}
            className="text-xs font-medium text-nexa-primary hover:underline"
          >
            View all host bookings →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard label="Total" value={stays.bookingsAsHost.total} />
          <MetricCard label="Upcoming" value={stays.bookingsAsHost.upcoming} />
          <MetricCard label="Completed" value={stays.bookingsAsHost.completed} />
          <MetricCard label="Cancelled" value={stays.bookingsAsHost.cancelled} />
          <MetricCard
            label="Total payout"
            value={formatCurrency(stays.bookingsAsHost.totalPayout)}
          />
        </div>
        <BookingList
          items={stays.bookingsAsHost.items}
          hrefBase={bookingsHref}
        />
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
            Reviews received
          </h3>
          <Link
            href={reviewsHref}
            className="text-xs font-medium text-nexa-primary hover:underline"
          >
            View all reviews →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetricCard label="Received" value={stays.reviews.asHost.received} />
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
    </div>
  );
}

function BookingList({
  items,
  hrefBase,
}: {
  items: StaysPersonOverview["bookingsAsHost"]["items"];
  hrefBase: string;
}) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-nexa-ink-4">No bookings yet.</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {items.map((booking) => (
        <li key={booking.id}>
          <Link
            href={`${hrefBase}&q=${encodeURIComponent(booking.reference)}`}
            className="block rounded-md border border-nexa-line px-3 py-2 hover:bg-nexa-bg-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-nexa-ink">{booking.reference}</p>
              <StatusBadge status={booking.status.toLowerCase()} />
            </div>
            <p className="mt-1 text-xs text-nexa-ink-4">
              {booking.checkinDate ?? "Not collected"} →{" "}
              {booking.checkoutDate ?? "Not collected"} · listing {booking.listingId.slice(0, 8)} ·{" "}
              {formatCurrency(booking.amount)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function HostDocuments({
  profileId,
  profile,
}: {
  profileId: string;
  profile: NonNullable<StaysPersonOverview["hostProfile"]>;
}) {
  const [urls, setUrls] = useState<{ front?: string; back?: string; selfie?: string }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ label: string; url: string } | null>(
    null,
  );
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      blobUrlsRef.current = [];
      setUrls({});
      setError(null);
      try {
        const next: { front?: string; back?: string; selfie?: string } = {};
        const kinds: Array<{ key: "front" | "back" | "selfie"; enabled: boolean }> =
          [
            { key: "front", enabled: Boolean(profile.documentFrontAssetId) },
            { key: "back", enabled: Boolean(profile.documentBackAssetId) },
            { key: "selfie", enabled: Boolean(profile.selfieAssetId) },
          ];
        for (const { key, enabled } of kinds) {
          if (!enabled) continue;
          const url = await fetchHostApplicationDocumentBlobUrl(profileId, key);
          blobUrlsRef.current.push(url);
          if (!cancelled) next[key] = url;
        }
        if (!cancelled) setUrls(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load documents");
        }
      }
    }
    if (
      profile.documentFrontAssetId ||
      profile.documentBackAssetId ||
      profile.selfieAssetId
    ) {
      void load();
    }
    return () => {
      cancelled = true;
    };
  }, [
    profileId,
    profile.documentFrontAssetId,
    profile.documentBackAssetId,
    profile.selfieAssetId,
  ]);

  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
    };
  }, []);

  if (
    !profile.documentFrontAssetId &&
    !profile.documentBackAssetId &&
    !profile.selfieAssetId
  ) {
    return null;
  }

  return (
    <>
      <div className="mt-4 rounded-md border border-nexa-line p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-nexa-ink-4">
          <FileText className="h-3.5 w-3.5" />
          Uploaded documents
        </p>
        {error ? <p className="mt-2 text-xs text-nexa-danger">{error}</p> : null}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {profile.documentFrontAssetId ? (
            <DocPreview
              label="ID front"
              url={urls.front}
              onOpen={(url) => setLightbox({ label: "ID front", url })}
            />
          ) : null}
          {profile.documentBackAssetId ? (
            <DocPreview
              label="ID back"
              url={urls.back}
              onOpen={(url) => setLightbox({ label: "ID back", url })}
            />
          ) : null}
          {profile.selfieAssetId ? (
            <DocPreview
              label="Selfie"
              url={urls.selfie}
              onOpen={(url) => setLightbox({ label: "Selfie", url })}
            />
          ) : null}
        </div>
      </div>
      {lightbox ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-nexa-ink/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
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
      ) : null}
    </>
  );
}

function DocPreview({
  label,
  url,
  onOpen,
}: {
  label: string;
  url?: string;
  onOpen: (url: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-nexa-ink-4">{label}</p>
      {url ? (
        <button
          type="button"
          onClick={() => onOpen(url)}
          className="block w-full overflow-hidden rounded-md border border-nexa-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="max-h-44 w-full bg-nexa-bg-2 object-contain" />
        </button>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-nexa-line bg-nexa-bg-2 text-xs text-nexa-ink-4">
          Loading…
        </div>
      )}
    </div>
  );
}
