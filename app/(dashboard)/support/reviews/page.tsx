"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { RelativeTime } from "@/components/ui/relative-time";
import { fetchSupportReviews } from "@/lib/api/stays-admin";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import type { SupportCsatReview } from "@/lib/types";
import {
  CsatStars,
  formatCsatScore,
} from "@/components/support/ticket-csat-card";

type Filter = "all" | "solved" | "unsolved" | "low";

function solvedLabel(value: boolean | null): string {
  if (value == null) return "Not recorded";
  return value ? "Solved" : "Not solved";
}

function ReviewRow({
  review,
  onOpen,
}: {
  review: SupportCsatReview;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 border-b border-nexa-line px-4 py-3 text-left last:border-b-0 hover:bg-nexa-bg-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-nexa-ink">{review.ticketNumber}</p>
          <p className="mt-0.5 truncate text-xs text-nexa-ink-4">
            {review.customerName || "Customer"}
            {review.reviewAgentName ? ` · ${review.reviewAgentName}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CsatStars value={review.rating} size="sm" />
          <span className="tabular-nums text-xs text-nexa-ink-3">
            {formatCsatScore(review.rating)}/5
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-nexa-ink-3">
        <span
          className={
            review.problemSolved === false
              ? "font-medium text-nexa-danger"
              : "text-nexa-ink-3"
          }
        >
          {solvedLabel(review.problemSolved)}
        </span>
        {review.agentRating != null ? (
          <span>Agent {formatCsatScore(review.agentRating)}/5</span>
        ) : null}
        {review.submittedAt ? <RelativeTime value={review.submittedAt} /> : null}
      </div>
      {review.comment ? (
        <p className="line-clamp-2 text-sm text-nexa-ink-2">{review.comment}</p>
      ) : null}
    </button>
  );
}

export default function SupportReviewsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const search = query.trim();

  const loader = useMemo(
    () => () =>
      fetchSupportReviews({
        limit: 50,
        offset: 0,
        problemSolved:
          filter === "solved" ? true : filter === "unsolved" ? false : undefined,
        maxRating: filter === "low" ? 2 : undefined,
        search: search || undefined,
      }),
    [filter, search],
  );

  const { data, loading, error } = useAsyncData(loader, [filter, search]);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Support reviews"
        description="Customer CSAT submitted after a support ticket is closed."
      />

      <PageToolbar
        className="mb-4"
        filters={
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: filter === "all" ? total : undefined },
              { value: "solved", label: "Solved" },
              { value: "unsolved", label: "Not solved" },
              { value: "low", label: "Low" },
            ]}
          />
        }
        trailing={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search ticket, customer, or comment"
            className="w-full md:w-72"
          />
        }
      />

      {error ? (
        <ErrorState className="mb-4" title="Failed to load support reviews" detail={error} />
      ) : null}
      {loading && items.length === 0 ? (
        <LoadingState className="mb-4" label="Loading support reviews…" />
      ) : null}

      {!loading && items.length === 0 && !error ? (
        <EmptyState
          icon={Star}
          title="No support reviews yet"
          description="Reviews appear here after a customer rates a closed ticket."
        />
      ) : items.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            {items.map((review) => (
              <ReviewRow
                key={review.ticketId}
                review={review}
                onOpen={() =>
                  router.push(`/support?ticket=${encodeURIComponent(review.ticketId)}`)
                }
              />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
