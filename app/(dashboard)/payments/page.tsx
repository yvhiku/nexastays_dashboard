"use client";

import { useMemo, useState } from "react";
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
import { fetchPayments } from "@/lib/api/finance-admin";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { PaymentRecord } from "@/lib/types";
import { useRouter } from "next/navigation";

type Filter = "all" | PaymentRecord["status"];

export default function PaymentsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const { data, loading, error } = useAsyncData(
    () => fetchPayments(),
    [],
    { items: [], unavailable: true },
  );

  const items = data?.items ?? [];
  const unavailable = data?.unavailable ?? false;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const p of items) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = items.filter((p) => {
    const match = filter === "all" || p.status === filter;
    const q = query.toLowerCase();
    return (
      match &&
      (p.id.toLowerCase().includes(q) ||
        (p.bookingRef ?? "").toLowerCase().includes(q) ||
        (p.providerIntentId ?? "").toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Read-only payment intents. Financial records cannot be edited here."
      />
      {unavailable && (
        <ApiUnavailable
          title="Payments API not connected"
          detail="GET /admin/stays/payments is not available yet. This queue will populate when Stays exposes payment intents."
        />
      )}
      {error && <ErrorState className="mb-4" title="Failed to load payments" detail={error} />}

      <PageToolbar
        className="mb-4"
        filters={
          <FilterTabs<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "SUCCEEDED", label: "Succeeded", count: counts.SUCCEEDED ?? 0 },
              { value: "FAILED", label: "Failed", count: counts.FAILED ?? 0 },
              { value: "PENDING", label: "Pending", count: counts.PENDING ?? 0 },
              { value: "REFUNDED", label: "Refunded", count: counts.REFUNDED ?? 0 },
            ]}
          />
        }
        trailing={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search id, booking, provider…"
            className="lg:w-72"
          />
        }
      />

      <Card>
        {loading && items.length === 0 ? (
          <LoadingState label="Loading payments…" />
        ) : (
          <ResponsiveCollection
            table={
          <Table>
            <THead>
              <tr>
                <TH>Payment</TH>
                <TH>Booking</TH>
                <TH>Provider</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {filtered.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium text-nexa-ink">{p.id.slice(0, 8)}</TD>
                  <TD>{p.bookingRef ?? p.bookingId?.slice(0, 8) ?? "—"}</TD>
                  <TD className="text-nexa-ink-3">{p.provider ?? "—"}</TD>
                  <TD className="font-medium">{formatCurrency(p.amount, p.currency)}</TD>
                  <TD>
                    <StatusBadge status={p.status.toLowerCase()} />
                  </TD>
                  <TD className="text-nexa-ink-3">
                    {p.createdAt ? formatDateTime(p.createdAt) : "—"}
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Open booking"
                        disabled={!p.bookingId && !p.bookingRef}
                        onClick={() =>
                          router.push(
                            `/bookings?q=${encodeURIComponent(p.bookingRef ?? p.bookingId ?? "")}`,
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
                {filtered.map((p) => (
                  <CollectionCard
                    key={p.id}
                    onClick={() =>
                      router.push(
                        `/bookings?q=${encodeURIComponent(p.bookingRef ?? p.bookingId ?? "")}`,
                      )
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-nexa-ink">{p.id.slice(0, 8)}</p>
                        <p className="text-xs text-nexa-ink-4">
                          {p.bookingRef ?? p.bookingId?.slice(0, 8) ?? "—"} · {p.provider ?? "—"}
                        </p>
                      </div>
                      <StatusBadge status={p.status.toLowerCase()} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-nexa-ink">
                      {formatCurrency(p.amount, p.currency)}
                    </p>
                  </CollectionCard>
                ))}
              </div>
            }
          />
        )}
        {!loading && filtered.length === 0 && (
          <EmptyState
            title={unavailable ? "No payment data until the Stays API is connected." : "No payments found."}
          />
        )}
      </Card>
    </div>
  );
}
