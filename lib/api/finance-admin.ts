import type { PaymentRecord, RefundRecord } from "../types";
import { apiFetch, isNotImplemented } from "./client";

export type FinanceListResult<T> = { items: T[]; unavailable: boolean };

function mapPayment(row: Record<string, unknown>): PaymentRecord {
  const status = String(row.status ?? "PENDING").toUpperCase();
  const mapped: PaymentRecord["status"] =
    status === "SUCCEEDED" || status === "SUCCESS"
      ? "SUCCEEDED"
      : status === "FAILED"
        ? "FAILED"
        : status === "REFUNDED"
          ? "REFUNDED"
          : status === "CANCELLED" || status === "CANCELED"
            ? "CANCELLED"
            : "PENDING";
  return {
    id: String(row.id ?? ""),
    bookingId: (row.booking_id ?? row.bookingId) as string | undefined,
    bookingRef: (row.booking_reference ?? row.bookingRef) as string | undefined,
    provider: (row.provider as string | undefined) ?? undefined,
    providerIntentId: (row.provider_intent_id ?? row.providerIntentId) as
      | string
      | undefined,
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "MAD"),
    status: mapped,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

function mapRefund(row: Record<string, unknown>): RefundRecord {
  return {
    id: String(row.id ?? ""),
    bookingId: (row.booking_id ?? row.bookingId) as string | undefined,
    bookingRef: (row.booking_reference ?? row.bookingRef) as string | undefined,
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "MAD"),
    status: (String(row.status ?? "PENDING").toUpperCase() as RefundRecord["status"]) ||
      "PENDING",
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

export async function fetchPayments(
  status?: string,
): Promise<FinanceListResult<PaymentRecord>> {
  try {
    const q =
      status && status !== "all"
        ? `?status=${encodeURIComponent(status)}&limit=200`
        : "?limit=200";
    const data = await apiFetch<
      { items?: Record<string, unknown>[] } | Record<string, unknown>[]
    >(`/admin/stays/payments${q}`);
    const rows = Array.isArray(data) ? data : data.items ?? [];
    return { items: rows.map(mapPayment), unavailable: false };
  } catch (err) {
    if (isNotImplemented(err)) return { items: [], unavailable: true };
    throw err;
  }
}

export async function fetchRefunds(
  status?: string,
): Promise<FinanceListResult<RefundRecord>> {
  try {
    const q =
      status && status !== "all"
        ? `?status=${encodeURIComponent(status)}&limit=200`
        : "?limit=200";
    const data = await apiFetch<
      { items?: Record<string, unknown>[] } | Record<string, unknown>[]
    >(`/admin/stays/refunds${q}`);
    const rows = Array.isArray(data) ? data : data.items ?? [];
    return { items: rows.map(mapRefund), unavailable: false };
  } catch (err) {
    if (isNotImplemented(err)) return { items: [], unavailable: true };
    throw err;
  }
}
