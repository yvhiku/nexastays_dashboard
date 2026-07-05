"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, XCircle, RefreshCw, MapPin, ArrowRight, User, FileImage } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { SearchInput, FilterTabs } from "@/components/ui/toolbar";
import {
  fetchBookings,
  fetchBookingDetail,
  fetchOccupantIdDocumentBlobUrl,
} from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Booking, BookingDetail, BookingOccupant } from "@/lib/types";

type Filter = "all" | Booking["status"];

export default function BookingsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);

  const { data: bookings, loading, error } = useAsyncList(fetchBookings, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    for (const b of bookings) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  }, [bookings]);

  const filtered = bookings.filter((b) => {
    const matchFilter = filter === "all" || b.status === filter;
    const matchQuery =
      b.reference.toLowerCase().includes(query.toLowerCase()) ||
      b.guestName.toLowerCase().includes(query.toLowerCase()) ||
      b.listingTitle.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return (
    <div>
      <PageHeader
        title="Bookings Management"
        description="Reservations from the Stays database."
      />

      {error && (
        <p className="mb-4 text-sm text-nexa-danger">Failed to load bookings: {error}</p>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "confirmed", label: "Confirmed", count: counts.confirmed },
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "completed", label: "Completed", count: counts.completed },
            { value: "cancelled", label: "Cancelled", count: counts.cancelled },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search ref, guest, property…"
          className="lg:w-72"
        />
      </div>

      <Card>
        {loading ? (
          <p className="py-10 text-center text-sm text-nexa-ink-4">Loading bookings…</p>
        ) : (
        <Table>
          <THead>
            <tr>
              <TH>Reference</TH>
              <TH>Guest</TH>
              <TH>Property</TH>
              <TH>Dates</TH>
              <TH>Nights</TH>
              <TH>Total</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {filtered.map((b) => (
              <TR key={b.id}>
                <TD className="font-medium text-nexa-ink">{b.reference}</TD>
                <TD>{b.guestName}</TD>
                <TD>
                  <div className="min-w-0">
                    <p className="truncate max-w-[200px] text-nexa-ink">{b.listingTitle}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-nexa-ink-4">
                      <MapPin className="h-3 w-3" /> {b.city}
                    </p>
                  </div>
                </TD>
                <TD className="text-nexa-ink-3 whitespace-nowrap">
                  {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                </TD>
                <TD>{b.nights}</TD>
                <TD className="font-medium">{formatCurrency(b.total)}</TD>
                <TD>
                  <StatusBadge status={b.status} />
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" title="View" onClick={() => setSelected(b)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(b.status === "confirmed" || b.status === "pending") && (
                      <Button variant="danger-outline" size="icon" title="Cancel">
                        <XCircle className="h-4 w-4" />
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
          <p className="py-10 text-center text-sm text-nexa-ink-4">No bookings found.</p>
        )}
      </Card>

      <BookingDrawer booking={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function BookingDrawer({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBookingDetail(booking.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load booking");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [booking]);

  const data = detail ?? booking;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-nexa-ink/40 transition-opacity",
          booking ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-nexa-line bg-white transition-transform",
          booking ? "translate-x-0" : "translate-x-full",
        )}
      >
        {booking && data && (
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-nexa-ink-4">Booking reference</p>
                <h2 className="font-display text-xl font-semibold text-nexa-ink">
                  {data.reference}
                </h2>
                {detail?.rawStatus && (
                  <p className="text-xs text-nexa-ink-4 mt-1">Status: {detail.rawStatus}</p>
                )}
              </div>
              <StatusBadge status={data.status} />
            </div>

            {loading && (
              <p className="mt-4 text-sm text-nexa-ink-4">Loading full booking details…</p>
            )}
            {error && (
              <p className="mt-4 text-sm text-nexa-danger">{error}</p>
            )}

            <div className="mt-5 rounded-md bg-nexa-bg-2 p-4">
              <p className="font-medium text-nexa-ink">{data.listingTitle}</p>
              <p className="text-sm text-nexa-ink-3">{data.city}</p>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <div>
                  <p className="text-xs text-nexa-ink-4">Check-in</p>
                  <p className="font-medium text-nexa-ink">{formatDate(data.checkIn)}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-nexa-ink-4" />
                <div>
                  <p className="text-xs text-nexa-ink-4">Check-out</p>
                  <p className="font-medium text-nexa-ink">{formatDate(data.checkOut)}</p>
                </div>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Guest ID" value={data.guestUserId?.slice(0, 12) ?? data.guestName} />
              <Detail label="Host ID" value={data.hostUserId?.slice(0, 12) ?? data.hostName} />
              <Detail label="Guests" value={String(data.guests)} />
              <Detail label="Nights" value={String(data.nights)} />
              <Detail label="Total paid" value={formatCurrency(data.total)} />
              <Detail label="Booked on" value={formatDate(data.createdAt)} />
              {detail?.subtotal != null && (
                <Detail label="Subtotal" value={formatCurrency(detail.subtotal, detail.currency)} />
              )}
              {detail?.guestFee != null && (
                <Detail label="Guest fee" value={formatCurrency(detail.guestFee, detail.currency)} />
              )}
              {detail?.hostFee != null && (
                <Detail label="Host fee" value={formatCurrency(detail.hostFee, detail.currency)} />
              )}
            </dl>

            {detail && detail.occupants.length > 0 && (
              <div className="mt-6 space-y-4">
                <p className="text-xs font-semibold uppercase text-nexa-ink-4">
                  Guest verification ({detail.occupants.length})
                </p>
                {detail.occupants.map((occupant, index) => (
                  <OccupantCard
                    key={occupant.id}
                    bookingId={detail.id}
                    occupant={occupant}
                    index={index}
                  />
                ))}
              </div>
            )}

            {booking.cancellationReason && (
              <div className="mt-4 rounded-md bg-nexa-danger-soft p-3">
                <p className="text-xs font-semibold text-nexa-danger">Cancellation reason</p>
                <p className="text-sm text-nexa-danger">{booking.cancellationReason}</p>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase text-nexa-ink-4">Admin actions</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" /> Override status
                </Button>
                <Button variant="outline" size="sm">
                  Resolve dispute
                </Button>
                <Button variant="danger-outline" size="sm">
                  <XCircle className="h-4 w-4" /> Cancel booking
                </Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function OccupantCard({
  bookingId,
  occupant,
  index,
}: {
  bookingId: string;
  occupant: BookingOccupant;
  index: number;
}) {
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];

    async function loadDocs() {
      try {
        if (occupant.id_document_front_asset_id) {
          const url = await fetchOccupantIdDocumentBlobUrl(bookingId, occupant.id, "front");
          if (!cancelled) {
            setFrontUrl(url);
            urls.push(url);
          }
        }
        if (occupant.id_document_back_asset_id) {
          const url = await fetchOccupantIdDocumentBlobUrl(bookingId, occupant.id, "back");
          if (!cancelled) {
            setBackUrl(url);
            urls.push(url);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDocError(err instanceof Error ? err.message : "Failed to load ID documents");
        }
      }
    }

    loadDocs();
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [bookingId, occupant.id, occupant.id_document_front_asset_id, occupant.id_document_back_asset_id]);

  return (
    <div className="rounded-md border border-nexa-line p-4">
      <div className="flex items-center gap-2 mb-3">
        <User className="h-4 w-4 text-nexa-primary" />
        <p className="font-medium text-nexa-ink">
          {occupant.is_primary ? "Primary guest" : `Guest ${index + 1}`}: {occupant.full_name}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Detail label="ID number" value={occupant.id_number ?? "—"} />
        <Detail label="Gender" value={occupant.gender ?? "—"} />
        {occupant.phone && <Detail label="Phone" value={occupant.phone} />}
        {occupant.email && <Detail label="Email" value={occupant.email} />}
      </dl>
      {docError && <p className="mt-2 text-xs text-nexa-danger">{docError}</p>}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {occupant.id_document_front_asset_id && (
          <IdDocPreview label="ID front" url={frontUrl} />
        )}
        {occupant.id_document_back_asset_id && (
          <IdDocPreview label="ID back" url={backUrl} />
        )}
        {!occupant.id_document_front_asset_id && !occupant.id_document_back_asset_id && (
          <p className="text-xs text-nexa-ink-4 col-span-2 flex items-center gap-1">
            <FileImage className="h-3.5 w-3.5" /> No ID documents on file
          </p>
        )}
      </div>
    </div>
  );
}

function IdDocPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <p className="text-xs text-nexa-ink-4 mb-1">{label}</p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={label}
          className="w-full rounded-md border border-nexa-line object-cover max-h-40"
        />
      ) : (
        <div className="h-28 rounded-md border border-dashed border-nexa-line bg-nexa-bg-2 flex items-center justify-center text-xs text-nexa-ink-4">
          Loading…
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-nexa-ink-4">{label}</dt>
      <dd className="mt-0.5 font-medium text-nexa-ink">{value}</dd>
    </div>
  );
}
