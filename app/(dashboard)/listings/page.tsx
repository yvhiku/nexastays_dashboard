"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  X,
  Ban,
  Flag,
  MapPin,
  Eye,
  ImageIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { SearchInput, FilterTabs } from "@/components/ui/toolbar";
import {
  approveListing,
  fetchListings,
  rejectListing,
  setListingLive,
} from "@/lib/api/stays-admin";
import { ListingReviewDrawer } from "@/components/listings/ListingReviewDrawer";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Listing, ListingStatus } from "@/lib/types";

type Filter = "all" | ListingStatus | "live";
type SortMode = "oldest" | "newest" | "priority";

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
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const { data: listings, loading, error, reload } = useAsyncList(
    () => fetchListings(undefined, sort === "priority" ? "oldest" : sort),
    [sort],
  );

  useEffect(() => {
    const next = normalizeFilter(searchParams.get("status"));
    setFilter(next);
    const s = searchParams.get("sort");
    if (s === "newest" || s === "oldest" || s === "priority") setSort(s);
  }, [searchParams]);

  function updateFilter(next: Filter) {
    setFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    const statusParam =
      next === "active" ? "live" : next === "suspended" ? "paused" : next;
    if (next === "all") params.delete("status");
    else params.set("status", statusParam);
    router.replace(`/listings?${params.toString()}`);
  }

  function updateSort(next: SortMode) {
    setSort(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", next);
    router.replace(`/listings?${params.toString()}`);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: listings.length };
    for (const l of listings) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [listings]);

  const filtered = useMemo(() => {
    let rows = listings.filter((l) => {
      const matchFilter = filter === "all" || l.status === filter;
      const matchQuery =
        l.title.toLowerCase().includes(query.toLowerCase()) ||
        l.city.toLowerCase().includes(query.toLowerCase()) ||
        l.hostName.toLowerCase().includes(query.toLowerCase());
      return matchFilter && matchQuery;
    });
    // Client-side wait-time sort for the pending queue
    if (filter === "pending" || sort === "oldest") {
      rows = [...rows].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    } else if (sort === "newest") {
      rows = [...rows].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return rows;
  }, [listings, filter, query, sort]);

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
      await reload();
      setSelected(null);
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Listing Review Queue"
        description="Treat each listing as a task — oldest waiting first by default."
        actions={
          <Button size="sm" variant="outline" onClick={() => reload()} disabled={loading}>
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
            { value: "pending", label: "Pending", count: counts.pending ?? 0 },
            { value: "approved", label: "Approved", count: counts.approved ?? 0 },
            { value: "rejected", label: "Needs Changes", count: counts.rejected ?? 0 },
            { value: "active", label: "Live", count: counts.active ?? 0 },
            { value: "suspended", label: "Paused", count: counts.suspended ?? 0 },
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
            placeholder="Search title, city, host…"
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
