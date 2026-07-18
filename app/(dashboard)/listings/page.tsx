"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  X,
  Ban,
  Flag,
  MapPin,
  Eye,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { SearchInput, FilterTabs } from "@/components/ui/toolbar";
import {
  approveListing,
  fetchListingCounts,
  fetchListingsPage,
  rejectListing,
  setListingLive,
  EMPTY_LISTING_COUNTS,
  type ListingCounts,
  type ListingsPageResult,
} from "@/lib/api/stays-admin";
import { ListingReviewDrawer } from "@/components/listings/ListingReviewDrawer";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Listing, ListingStatus } from "@/lib/types";

type Filter = "all" | ListingStatus | "live";
type SortMode = "oldest" | "newest" | "priority";

const PAGE_SIZE = 50;

function normalizeFilter(raw: string | null): Filter {
  if (!raw) return "pending";
  if (raw === "live") return "active";
  if (raw === "paused") return "suspended";
  if (
    raw === "all" ||
    raw === "pending" ||
    raw === "approved" ||
    raw === "active" ||
    raw === "rejected" ||
    raw === "suspended" ||
    raw === "flagged"
  ) {
    return raw;
  }
  return "pending";
}

function filterToApiStatus(filter: Filter): string | undefined {
  if (filter === "all") return undefined;
  if (filter === "active" || filter === "live") return "active";
  if (filter === "suspended") return "suspended";
  return filter;
}

function filterToUrlStatus(filter: Filter): string | null {
  if (filter === "all") return null;
  if (filter === "active") return "live";
  if (filter === "suspended") return "paused";
  return filter;
}

function countForFilter(counts: ListingCounts, filter: Filter): number {
  switch (filter) {
    case "all":
      return counts.all;
    case "pending":
      return counts.pending;
    case "approved":
      return counts.approved;
    case "rejected":
      return counts.rejected;
    case "active":
      return counts.live;
    case "suspended":
      return counts.paused;
    default:
      return 0;
  }
}

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <p className="py-10 text-center text-sm text-nexa-ink-4">Loading queue…</p>
      }
    >
      <ListingsPageInner />
    </Suspense>
  );
}

function ListingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(() =>
    normalizeFilter(searchParams.get("status")),
  );
  const [sort, setSort] = useState<SortMode>(() => {
    const s = searchParams.get("sort");
    return s === "newest" || s === "priority" ? s : "oldest";
  });
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [counts, setCounts] = useState<ListingCounts>(EMPTY_LISTING_COUNTS);
  const [pageData, setPageData] = useState<ListingsPageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilter(normalizeFilter(searchParams.get("status")));
    const s = searchParams.get("sort");
    if (s === "newest" || s === "oldest" || s === "priority") setSort(s);
    const p = parseInt(searchParams.get("page") || "1", 10);
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const replaceParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/listings?${params.toString()}`);
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const [nextCounts, nextPage] = await Promise.all([
        fetchListingCounts(),
        fetchListingsPage({
          status: filterToApiStatus(filter),
          sort: sort === "priority" ? "oldest" : sort,
          limit: PAGE_SIZE,
          offset,
        }),
      ]);
      setCounts(nextCounts);
      setPageData(nextPage);
      // If page is past the end after a delete/approve, clamp
      if (nextPage.total > 0 && offset >= nextPage.total) {
        const lastPage = Math.max(1, Math.ceil(nextPage.total / PAGE_SIZE));
        replaceParams({ page: String(lastPage) });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [filter, page, sort, replaceParams]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateFilter(next: Filter) {
    setFilter(next);
    replaceParams({
      status: filterToUrlStatus(next),
      page: "1",
    });
  }

  function updateSort(next: SortMode) {
    setSort(next);
    replaceParams({ sort: next, page: "1" });
  }

  function goPage(next: number) {
    setPage(next);
    replaceParams({ page: String(next) });
  }

  const listings = pageData?.items ?? [];
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return listings;
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.hostName.toLowerCase().includes(q),
    );
  }, [listings, query]);

  async function runAction(
    id: string,
    action: "approve" | "reject" | "live",
    reason?: string,
  ) {
    setActing(id);
    try {
      if (action === "approve") await approveListing(id);
      else if (action === "reject")
        await rejectListing(id, reason?.trim() || "Rejected by admin");
      else await setListingLive(id);
      setSelected(null);
      await load();
    } finally {
      setActing(null);
    }
  }

  const total = pageData?.total ?? 0;
  const limit = pageData?.limit ?? PAGE_SIZE;
  const offset = pageData?.offset ?? (page - 1) * PAGE_SIZE;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + (pageData?.items.length ?? 0), total);

  return (
    <div>
      <PageHeader
        title="Listing Review Queue"
        description="Treat each listing as a task — oldest waiting first by default."
        actions={
          <Button size="sm" variant="outline" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error && (
        <p className="mb-4 text-sm text-nexa-danger">Failed to load listings: {error}</p>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={updateFilter}
          options={[
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "approved", label: "Approved", count: counts.approved },
            { value: "rejected", label: "Needs Changes", count: counts.rejected },
            { value: "active", label: "Live", count: counts.live },
            { value: "suspended", label: "Paused", count: counts.paused },
            { value: "all", label: "All", count: counts.all },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(e) => updateSort(e.target.value as SortMode)}
            className="rounded-md border border-nexa-line bg-white px-3 py-2 text-sm text-nexa-ink"
            title="Sort order — priority ranking reserved for later"
          >
            <option value="oldest">Oldest waiting</option>
            <option value="newest">Newest</option>
            <option value="priority" disabled>
              Priority (soon)
            </option>
          </select>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search current page…"
            className="lg:w-72"
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="py-10 text-center text-sm text-nexa-ink-4">Loading listings…</p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Listing</TH>
                <TH>Host</TH>
                <TH>Location</TH>
                <TH>Price / night</TH>
                <TH>Waiting since</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {filtered.map((l) => (
                <TR key={l.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: l.thumbnailColor }}
                      >
                        <ImageIcon className="h-4 w-4 opacity-90" />
                      </span>
                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate font-medium text-nexa-ink">
                          {l.title}
                        </p>
                        <p className="text-xs text-nexa-ink-4">
                          {l.id.slice(0, 8)}… · {l.type}
                        </p>
                      </div>
                    </div>
                  </TD>
                  <TD>{l.hostName}</TD>
                  <TD>
                    <span className="inline-flex items-center gap-1 text-nexa-ink-3">
                      <MapPin className="h-3.5 w-3.5" /> {l.city}
                    </span>
                  </TD>
                  <TD className="font-medium">{formatCurrency(l.pricePerNight)}</TD>
                  <TD className="text-nexa-ink-3">{formatDate(l.createdAt)}</TD>
                  <TD>
                    <StatusBadge status={l.status} />
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View"
                        onClick={() => setSelected(l)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {l.status === "pending" && (
                        <>
                          <Button
                            variant="success"
                            size="icon"
                            title="Approve"
                            disabled={acting === l.id}
                            onClick={() => runAction(l.id, "approve")}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="danger-outline"
                            size="icon"
                            title="Reject"
                            disabled={acting === l.id}
                            onClick={() => runAction(l.id, "reject")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {l.status === "approved" && (
                        <Button
                          variant="success"
                          size="icon"
                          title="Set live"
                          disabled={acting === l.id}
                          onClick={() => runAction(l.id, "live")}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {l.status === "active" && (
                        <Button variant="outline" size="icon" title="Live" disabled>
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      {l.status === "flagged" && (
                        <Button variant="danger-outline" size="icon" title="Review flag" disabled>
                          <Flag className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-nexa-ink-4">
            No listings match your filters.
          </p>
        )}

        {!loading && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-nexa-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-nexa-ink-3">
              Showing {formatNumber(from)}–{formatNumber(to)} of{" "}
              {formatNumber(total)} listings
              {query.trim()
                ? ` · ${filtered.length} match on this page`
                : ""}
              {filter !== "all"
                ? ` · ${formatNumber(countForFilter(counts, filter))} in this status`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!pageData?.hasPrevious || loading}
                onClick={() => goPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-xs text-nexa-ink-4">
                Page {page}
                {limit > 0 ? ` of ${Math.max(1, Math.ceil(total / limit))}` : ""}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!pageData?.hasNext || loading}
                onClick={() => goPage(page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ListingReviewDrawer
        listing={selected}
        acting={acting}
        onClose={() => setSelected(null)}
        onAction={runAction}
      />
    </div>
  );
}
