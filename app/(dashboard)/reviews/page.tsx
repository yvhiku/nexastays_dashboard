"use client";

import { useMemo, useState } from "react";
import { Star, Flag, Trash2, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { HBar } from "@/components/charts/charts";
import { fetchReviews } from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { RelativeTime } from "@/components/ui/relative-time";
import type { Review } from "@/lib/types";

type Filter = "all" | "published" | "flagged" | "removed";

export default function ReviewsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const { data: reviews, loading, error } = useAsyncList(fetchReviews, []);

  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
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
        <p className="mb-4 text-sm text-nexa-danger">Failed to load reviews: {error}</p>
      )}
      {loading && (
        <p className="mb-4 text-sm text-nexa-ink-4">Loading reviews…</p>
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
              Based on {totalRatings} ratings
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
                    {((s.value / reviews.length) * 100).toFixed(0)}%
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

      <div className="mt-6 mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
        <SearchInput value={query} onChange={setQuery} placeholder="Search reviews…" className="lg:w-72" />
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <ReviewRow key={r.id} review={r} />
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-nexa-ink-4">No reviews found.</p>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ review }: { review: Review }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
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
        </div>
        <div className="flex shrink-0 gap-1">
          {review.status === "flagged" && (
            <Button variant="ghost" size="icon" title="Keep">
              <Check className="h-4 w-4" />
            </Button>
          )}
          {review.status !== "removed" && (
            <>
              <Button variant="ghost" size="icon" title="Flag">
                <Flag className="h-4 w-4" />
              </Button>
              <Button variant="danger-outline" size="icon" title="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
