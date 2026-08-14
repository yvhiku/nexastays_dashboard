"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { CollectionCard, ResponsiveCollection } from "@/components/ui/collection";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ApiUnavailable } from "@/components/ui/api-unavailable";
import { fetchRefunds } from "@/lib/api/finance-admin";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { RefundRecord } from "@/lib/types";

type Filter = "all" | RefundRecord["status"];

export default function RefundsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const { data, loading, error } = useAsyncData(
    () => fetchRefunds(),
    [],
    { items: [], unavailable: true },
  );

  const items = data?.items ?? [];
  const unavailable = data?.unavailable ?? false;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const r of items) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = items.filter((r) => {
    const match = filter === "all" || r.status === filter;
    const q = query.toLowerCase();
    return (
      match &&
      (r.id.toLowerCase().includes(q) ||
        (r.bookingRef ?? "").toLowerCase().includes(q) ||
        (r.bookingId ?? "").toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <PageHeader
        title="Refunds"
        description="Refund ledger entries. Admins cannot edit amounts — controlled actions create new rows."
      />
      {unavailable && (
        <ApiUnavailable
          title="Refunds API not connected"
          detail="GET /admin/stays/refunds is not available yet. When it lands, this queue lists REFUND ledger entries. POST /admin/stays/bookings/:id/refunds will create new entries — never PATCH existing ones."
        />
      )}
      {error && <ErrorState className="mb-4" title="Failed to load refunds" detail={error} />}

      <PageToolbar
        className="mb-4"
        filters={
          <FilterTabs<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "PENDING", label: "Pending", count: counts.PENDING ?? 0 },
              { value: "SETTLED", label: "Settled", count: counts.SETTLED ?? 0 },
              { value: "FAILED", label: "Failed", count: counts.FAILED ?? 0 },
            ]}
          />
        }
        trailing={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search refund or booking…"
            className="lg:w-72"
          />
        }
      />

      <Card>
        {loading && items.length === 0 ? (
          <LoadingState label="Loading refunds…" />
        ) : (
          <ResponsiveCollection
            table={
          <Table>
            <THead>
              <tr>
                <TH>Refund</TH>
                <TH>Booking</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {filtered.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium text-nexa-ink">{r.id.slice(0, 8)}</TD>
                  <TD>{r.bookingRef ?? r.bookingId?.slice(0, 8) ?? "—"}</TD>
                  <TD className="font-medium">{formatCurrency(r.amount, r.currency)}</TD>
                  <TD>
                    <StatusBadge status={r.status.toLowerCase()} />
                  </TD>
                  <TD className="text-nexa-ink-3">
                    {r.createdAt ? formatDateTime(r.createdAt) : "—"}
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Open booking"
                        disabled={!r.bookingId && !r.bookingRef}
                        onClick={() =>
                          router.push(
                            `/bookings?q=${encodeURIComponent(r.bookingRef ?? r.bookingId ?? "")}`,
                          )
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
            }
            cards={
              <div className="space-y-2 p-3">
                {filtered.map((r) => (
                  <CollectionCard
                    key={r.id}
                    onClick={
                      r.bookingId || r.bookingRef
                        ? () =>
                            router.push(
                              `/bookings?q=${encodeURIComponent(r.bookingRef ?? r.bookingId ?? "")}`,
                            )
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-nexa-ink">{r.id.slice(0, 8)}</p>
                      <StatusBadge status={r.status.toLowerCase()} />
                    </div>
                    <p className="mt-1 text-xs text-nexa-ink-4">
                      {r.bookingRef ?? r.bookingId?.slice(0, 8) ?? "—"}
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {formatCurrency(r.amount, r.currency)}
                    </p>
                  </CollectionCard>
                ))}
              </div>
            }
          />
        )}
        {!loading && filtered.length === 0 && (
          <EmptyState
            title={unavailable ? "No refund data until the Stays API is connected." : "No refunds found."}
          />
        )}
      </Card>
    </div>
  );
}
