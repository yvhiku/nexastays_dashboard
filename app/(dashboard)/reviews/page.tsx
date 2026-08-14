"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Star, Trash2, Check, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { HBar } from "@/components/charts/charts";
import { fetchReviews, hideReview, publishReview, deleteReview, fetchReviewMediaBlobUrl } from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { RelativeTime } from "@/components/ui/relative-time";
import type { Review } from "@/lib/types";

type Filter = "all" | "published" | "flagged" | "removed";

export default function ReviewsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-nexa-ink-4">Loading…</p>}>
      <ReviewsPageInner />
    </Suspense>
  );
}

function ReviewsPageInner() {
  const searchParams = useSearchParams();
  const hostUserId = searchParams.get("hostUserId") || undefined;
  const guestUserId = searchParams.get("guestUserId") || undefined;
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const { data: reviews, loading, error, reload } = useAsyncList(
    () => fetchReviews({ hostUserId, guestUserId }),
    [hostUserId, guestUserId],
  );

  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Math.round(r.rating) === stars).length,
  }));

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;
  const totalRatings = ratingDistribution.reduce((s, r) => s + r.count, 0);
  const positive = reviews.filter((r) => r.sentiment === "positive").length;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reviews.length };
    for (const r of reviews) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [reviews]);

  const filtered = reviews.filter((r) => {
    const matchFilter = filter === "all" || r.status === filter;
    const matchQuery =
      r.listingTitle.toLowerCase().includes(query.toLowerCase()) ||
      r.guestName.toLowerCase().includes(query.toLowerCase()) ||
      r.comment.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return (
    <div>
      <PageHeader
        title="Reviews & Ratings"
        description="Reviews from the Stays database."
      />

      {error && (
        <ErrorState className="mb-4" title="Failed to load reviews" detail={error} />
      )}
      {loading && reviews.length === 0 && (
        <LoadingState className="mb-4" label="Loading reviews…" />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Average rating</CardTitle>
              <CardDescription>Across all published reviews</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <span className="font-display text-4xl font-semibold text-nexa-ink">
                {avg.toFixed(2)}
              </span>
              <div className="mb-1.5 flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={
                      s <= Math.round(avg)
                        ? "h-4 w-4 fill-nexa-accent text-nexa-accent"
                        : "h-4 w-4 text-nexa-line"
                    }
                  />
                ))}
              </div>
            </div>
            <p className="mt-1 text-xs text-nexa-ink-4">
              Based on {reviews.length} ratings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Rating distribution</CardTitle>
              <CardDescription>Host rating spread</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {ratingDistribution.map((r) => (
              <div key={r.stars} className="flex items-center gap-2 text-sm">
                <span className="flex w-8 items-center gap-0.5 text-nexa-ink-3">
                  {r.stars}
                  <Star className="h-3 w-3 fill-nexa-accent text-nexa-accent" />
                </span>
                <div className="flex-1">
                  <HBar value={r.count} max={totalRatings} color="#F9A86C" />
                </div>
                <span className="w-8 text-right text-xs text-nexa-ink-4">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sentiment tracking</CardTitle>
              <CardDescription>Review tone analysis</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {[
              { label: "Positive", value: positive, color: "#3DAA84" },
              {
                label: "Neutral",
                value: reviews.filter((r) => r.sentiment === "neutral").length,
                color: "#E3A008",
              },
              {
                label: "Negative",
                value: reviews.filter((r) => r.sentiment === "negative").length,
                color: "#E0475B",
              },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-nexa-ink-2">{s.label}</span>
                  <span className="text-nexa-ink-4">
                    {reviews.length
                      ? ((s.value / reviews.length) * 100).toFixed(0)
                      : "0"}
                    %
                  </span>
                </div>
                <div className="mt-1">
                  <HBar value={s.value} max={reviews.length} color={s.color} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <PageToolbar
        className="mt-6 mb-4"
        filters={
          <FilterTabs<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "published", label: "Published", count: counts.published },
              { value: "flagged", label: "Flagged", count: counts.flagged },
              { value: "removed", label: "Removed", count: counts.removed },
            ]}
          />
        }
        trailing={
          <SearchInput value={query} onChange={setQuery} placeholder="Search reviews…" className="lg:w-72" />
        }
      />

      <div className="space-y-3">
        {filtered.map((r) => (
          <ReviewRow key={r.id} review={r} onChanged={reload} />
        ))}
        {filtered.length === 0 && (
          <EmptyState title="No reviews found." />
        )}
      </div>
    </div>
  );
}

function ReviewRow({
  review,
  onChanged,
}: {
  review: Review;
  onChanged: () => Promise<void> | void;
}) {
  const [acting, setActing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);

  async function run(action: "hide" | "publish" | "remove") {
    if (action === "remove") {
      setConfirmRemove(true);
      return;
    }
    setActing(true);
    try {
      if (action === "hide") await hideReview(review.id);
      else await publishReview(review.id);
      await onChanged();
    } finally {
      setActing(false);
    }
  }

  async function confirmDelete() {
    setActing(true);
    try {
      await deleteReview(review.id);
      setConfirmRemove(false);
      await onChanged();
    } finally {
      setActing(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={
                    s <= review.rating
                      ? "h-3.5 w-3.5 fill-nexa-accent text-nexa-accent"
                      : "h-3.5 w-3.5 text-nexa-line"
                  }
                />
              ))}
            </div>
            <span className="text-sm font-medium text-nexa-ink">{review.guestName}</span>
            <span className="text-xs text-nexa-ink-4">on {review.listingTitle}</span>
            <StatusBadge status={review.status} />
            {review.flagReason && <Badge variant="danger">{review.flagReason}</Badge>}
          </div>
          <p className="mt-2 text-sm text-nexa-ink-2">“{review.comment}”</p>
          <RelativeTime value={review.createdAt} className="mt-1.5 block text-xs text-nexa-ink-4" />
          <ReviewPhotos
            reviewId={review.id}
            media={review.media}
            onOpen={(next) => setLightbox(next)}
          />
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          {review.status === "published" ? (
            <Button
              size="sm"
              variant="outline"
              title="Hide this review from public listing pages"
              disabled={acting}
              onClick={() => run("hide")}
            >
              <EyeOff className="h-4 w-4" /> Hide
            </Button>
          ) : null}
          {review.status === "flagged" || review.status === "removed" ? (
            <Button
              size="sm"
              variant="success"
              title="Publish this review"
              disabled={acting}
              onClick={() => run("publish")}
            >
              <Check className="h-4 w-4" /> Restore
            </Button>
          ) : null}
          {review.status !== "removed" ? (
            <Button
              size="sm"
              variant="danger-outline"
              title="Remove this review (audited)"
              disabled={acting}
              onClick={() => run("remove")}
            >
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={confirmRemove}
        title="Remove this review?"
        description="This is audited server-side and is not a silent delete. Guests will no longer see it on the listing."
        confirmLabel="Remove"
        danger
        busy={acting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmRemove(false)}
      />
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
                Close
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
    </Card>
  );
}

function ReviewPhotos({
  reviewId,
  media,
  onOpen,
}: {
  reviewId: string;
  media: Review["media"];
  onOpen: (next: { url: string; label: string }) => void;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const blobUrlsRef = useRef<string[]>([]);

  const photos = media ?? [];
  const assetKey = photos.map((item) => item.assetId).join(",");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      blobUrlsRef.current = [];
      setUrls([]);
      if (photos.length === 0) return;
      try {
        const next: string[] = [];
        for (const item of photos) {
          const url = await fetchReviewMediaBlobUrl(reviewId, item.assetId);
          blobUrlsRef.current.push(url);
          if (!cancelled) next.push(url);
        }
        if (!cancelled) setUrls(next);
      } catch {
        if (!cancelled) setUrls([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // assetKey stands in for media identity so parent rerenders do not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, assetKey]);

  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
    };
  }, []);

  if (photos.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {urls.length === 0
        ? photos.map((item) => (
            <div
              key={item.assetId}
              className="h-20 w-20 rounded-md border border-dashed border-nexa-line bg-nexa-bg-2"
            />
          ))
        : urls.map((url, index) => (
            <button
              key={url}
              type="button"
              className="overflow-hidden rounded-md border border-nexa-line"
              onClick={() => onOpen({ url, label: `Review photo ${index + 1}` })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Review photo ${index + 1}`} className="h-20 w-20 object-cover" />
            </button>
          ))}
    </div>
  );
}
