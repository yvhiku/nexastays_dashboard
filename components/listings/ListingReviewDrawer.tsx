"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Film, ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import {
  fetchListingDetail,
  fetchListingMediaBlobUrl,
} from "@/lib/api/stays-admin";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Listing, ListingDetail } from "@/lib/types";

export function ListingReviewDrawer({
  listing,
  acting,
  onClose,
  onAction,
}: {
  listing: Listing | null;
  acting: string | null;
  onClose: () => void;
  onAction: (
    id: string,
    action: "approve" | "reject" | "live",
    reason?: string,
  ) => Promise<void>;
}) {
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [mediaLoading, setMediaLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    setRejectReason("");
    setSelectedPhoto(null);
    if (!listing) {
      setDetail(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchListingDetail(listing.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setDetail(null);
          setLoadError(e instanceof Error ? e.message : "Failed to load listing");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listing?.id]);

  const photos = useMemo(
    () => detail?.mediaItems.filter((m) => m.kind === "PHOTO") ?? [],
    [detail],
  );
  const walkthrough = useMemo(
    () =>
      detail?.mediaItems.find(
        (m) => m.kind === "WALKTHROUGH" || m.kind === "VIDEO",
      ) ?? null,
    [detail],
  );

  useEffect(() => {
    if (!detail) {
      setMediaUrls({});
      return;
    }

    const items = detail.mediaItems;
    if (items.length === 0) return;

    let cancelled = false;
    setMediaLoading(true);

    Promise.all(
      items.map(async (item) => {
        try {
          const url = await fetchListingMediaBlobUrl(detail.id, item.assetId);
          return [item.assetId, url] as const;
        } catch {
          return null;
        }
      }),
    )
      .then((entries) => {
        if (cancelled) {
          for (const entry of entries) {
            if (entry) URL.revokeObjectURL(entry[1]);
          }
          return;
        }
        const next: Record<string, string> = {};
        for (const entry of entries) {
          if (entry) next[entry[0]] = entry[1];
        }
        setMediaUrls(next);
        const firstPhoto = photos[0]?.assetId;
        if (firstPhoto && next[firstPhoto]) {
          setSelectedPhoto(firstPhoto);
        }
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false);
      });

    return () => {
      cancelled = true;
      setMediaUrls((prev) => {
        for (const url of Object.values(prev)) URL.revokeObjectURL(url);
        return {};
      });
    };
  }, [detail?.id, detail?.mediaItems, photos]);

  const heroUrl = selectedPhoto ? mediaUrls[selectedPhoto] : undefined;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-nexa-ink/40 transition-opacity",
          listing ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-nexa-line bg-white shadow-xl transition-transform",
          listing ? "translate-x-0" : "translate-x-full",
        )}
      >
        {listing && (
          <div>
            <div className="relative h-52 w-full bg-nexa-bg-2">
              {heroUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroUrl}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: listing.thumbnailColor }}
                >
                  {loading || mediaLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white/80" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-white/80" />
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-nexa-ink">
                    {detail?.title ?? listing.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-nexa-ink-3">
                    {detail?.fullAddress ?? listing.address} · {detail?.city ?? listing.city}
                  </p>
                </div>
                <StatusBadge status={listing.status} />
              </div>

              {loading && (
                <p className="mt-4 flex items-center gap-2 text-sm text-nexa-ink-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading full listing details…
                </p>
              )}
              {loadError && (
                <p className="mt-4 text-sm text-nexa-danger">{loadError}</p>
              )}

              {detail && (
                <>
                  <Section title="Photos">
                    {photos.length === 0 ? (
                      <p className="text-sm text-nexa-ink-4">No photos uploaded.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {photos.map((photo) => {
                          const url = mediaUrls[photo.assetId];
                          return (
                            <button
                              key={photo.assetId}
                              type="button"
                              onClick={() => setSelectedPhoto(photo.assetId)}
                              className={cn(
                                "relative aspect-square overflow-hidden rounded-md border bg-nexa-bg-2",
                                selectedPhoto === photo.assetId
                                  ? "border-nexa-primary ring-2 ring-nexa-primary/30"
                                  : "border-nexa-line",
                              )}
                            >
                              {url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin text-nexa-ink-4" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Section>

                  <Section title="Walkthrough video">
                    {walkthrough && mediaUrls[walkthrough.assetId] ? (
                      <video
                        controls
                        className="w-full rounded-lg border border-nexa-line bg-black"
                        src={mediaUrls[walkthrough.assetId]}
                      />
                    ) : walkthrough ? (
                      <p className="flex items-center gap-2 text-sm text-nexa-ink-4">
                        <Film className="h-4 w-4" />
                        {mediaLoading ? "Loading video…" : "Walkthrough video could not be loaded."}
                      </p>
                    ) : (
                      <p className="text-sm text-nexa-ink-4">No walkthrough video uploaded.</p>
                    )}
                  </Section>

                  <Section title="Description">
                    <p className="whitespace-pre-wrap text-sm text-nexa-ink-2">
                      {detail.description}
                    </p>
                  </Section>

                  <Section title="Property details">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <Detail label="Property type" value={detail.type} />
                      <Detail label="Max guests" value={String(detail.maxGuests || "—")} />
                      <Detail label="Check-in" value={detail.checkInTime} />
                      <Detail label="Check-out" value={detail.checkOutTime} />
                      <Detail label="Backend status" value={detail.rawStatus} />
                      <Detail label="Submitted" value={formatDate(detail.createdAt)} />
                    </dl>
                  </Section>

                  <Section title="Pricing">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <Detail
                        label="Base price / night"
                        value={formatCurrency(detail.pricePerNight, detail.currency)}
                      />
                      <Detail
                        label="Weekend price"
                        value={
                          detail.weekendPrice != null
                            ? formatCurrency(detail.weekendPrice, detail.currency)
                            : "—"
                        }
                      />
                      <Detail
                        label="Cleaning fee"
                        value={formatCurrency(detail.cleaningFee, detail.currency)}
                      />
                      <Detail label="Deposit policy" value={detail.depositPolicy} />
                    </dl>
                  </Section>

                  <Section title="House rules">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <Detail label="Pets" value={detail.petsPolicy} />
                      <Detail label="Smoking" value={detail.smokingPolicy} />
                      <Detail label="Quiet hours" value={detail.quietHours ? "Yes" : "No"} />
                      <Detail
                        label="Couples welcome"
                        value={detail.couplesWelcome ? "Yes" : "No"}
                      />
                      <Detail label="Cancellation" value={detail.cancellationPolicy} />
                    </dl>
                    {detail.amenities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {detail.amenities.map((a) => (
                          <span
                            key={a}
                            className="rounded-full bg-nexa-bg-2 px-3 py-1 text-xs text-nexa-ink-2"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    {detail.extraRules !== "—" && (
                      <p className="mt-3 text-sm text-nexa-ink-3">{detail.extraRules}</p>
                    )}
                  </Section>

                  <Section title="Check-in contact">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <Detail label="Name" value={detail.checkInContactName} />
                      <Detail label="Phone" value={detail.checkInContactPhone} />
                      <Detail label="Role" value={detail.checkInContactRole} />
                    </dl>
                  </Section>

                  <Section title="Host">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <Detail label="Name" value={detail.hostName} />
                      <Detail label="Email" value={detail.hostEmail} />
                      <Detail label="Phone" value={detail.hostPhone} />
                      <Detail label="City" value={detail.hostCity} />
                      <Detail label="User ID" value={detail.hostId} />
                    </dl>
                  </Section>
                </>
              )}

              <div className="mt-6 space-y-3 border-t border-nexa-line pt-5">
                {listing.status === "pending" && (
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (optional)"
                    rows={2}
                    className="w-full rounded-lg border border-nexa-line px-3 py-2 text-sm outline-none focus:border-nexa-primary"
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  {listing.status === "pending" ? (
                    <>
                      <Button
                        variant="success"
                        className="flex-1"
                        disabled={acting === listing.id || loading}
                        onClick={() => onAction(listing.id, "approve")}
                      >
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        variant="danger-outline"
                        className="flex-1"
                        disabled={acting === listing.id || loading}
                        onClick={() =>
                          onAction(
                            listing.id,
                            "reject",
                            rejectReason.trim() || "Rejected by admin",
                          )
                        }
                      >
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </>
                  ) : listing.status !== "active" ? (
                    <Button
                      variant="success"
                      className="flex-1"
                      disabled={acting === listing.id}
                      onClick={() => onAction(listing.id, "live")}
                    >
                      Set live
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-nexa-ink-4">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-nexa-ink">{value}</dd>
    </div>
  );
}
