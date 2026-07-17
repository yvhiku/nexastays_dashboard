import type {
  AppUser,
  AuditLog,
  Booking,
  BookingDetail,
  BookingOccupant,
  HostApplication,
  KycRecord,
  Listing,
  ListingDetail,
  Review,
  RiskFlag,
  Ticket,
} from "../types";
import { apiConfig } from "./config";
import { apiFetch, getAccessToken } from "./client";

const THUMB_COLORS = [
  "#E8507A",
  "#F9A86C",
  "#4A7FE0",
  "#3DAA84",
  "#C93A62",
  "#9E8A93",
  "#E3A008",
];

function thumbColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % THUMB_COLORS.length;
  return THUMB_COLORS[h];
}

function mapListingStatus(
  status: string,
): Listing["status"] {
  switch (status?.toUpperCase()) {
    case "LIVE":
      return "active";
    // APPROVED passed moderation but is NOT public until an admin sets it live.
    case "APPROVED":
      return "approved";
    case "PAUSED":
      return "suspended";
    case "SUBMITTED":
    case "DRAFT":
      return "pending";
    case "REJECTED":
      return "rejected";
    default:
      return "pending";
  }
}

function mapBookingStatus(status: string): Booking["status"] {
  switch (status?.toUpperCase()) {
    case "CONFIRMED":
    case "CHECKED_IN":
      return "confirmed";
    case "PAYMENT_PENDING":
    case "INITIATED":
      return "pending";
    case "COMPLETED":
      return "completed";
    case "CANCELLED_BY_GUEST":
    case "CANCELLED_BY_HOST":
    case "EXPIRED":
      return "cancelled";
    default:
      return "pending";
  }
}

type ApiListing = {
  id: string;
  title: string;
  host_user_id: string;
  host_profile?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
  } | null;
  city: string;
  listing_type: string;
  status: string;
  avg_rating?: number | null;
  review_count?: number;
  created_at: string;
  rate_plan?: {
    base_price?: number | string | null;
    weekend_price?: number | string | null;
    cleaning_fee?: number | string | null;
    deposit_policy_text?: string | null;
    currency?: string;
  } | null;
  media?: { asset_id: string; kind?: string; sort_order?: number }[];
};

type Paginated<T> = { items: T[]; total: number };

export type DashboardStats = {
  totalListings: number;
  liveListings: number;
  pendingListings: number;
  totalHosts: number;
  pendingHostVerification: number;
  approvedHosts: number;
  totalBookings: number;
  todayBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  todayRevenue: number;
  totalBookingValue: number;
  pendingListingsBadge: number;
  openRisks: number;
  pendingKyc: number;
  openTickets: number;
  totalUsers: number;
  activeListings: number;
  monthlyBookings: number;
  monthlyRevenue: number;
  commissionRate: number;
  guestFeePercent: number;
  hostFeePercent: number;
  totalCommissionPercent: number;
  cancellationRate: number;
  avgBookingValue: number;
};

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalListings: 0,
  liveListings: 0,
  pendingListings: 0,
  totalHosts: 0,
  pendingHostVerification: 0,
  approvedHosts: 0,
  totalBookings: 0,
  todayBookings: 0,
  confirmedBookings: 0,
  totalRevenue: 0,
  todayRevenue: 0,
  totalBookingValue: 0,
  pendingListingsBadge: 0,
  openRisks: 0,
  pendingKyc: 0,
  openTickets: 0,
  totalUsers: 0,
  activeListings: 0,
  monthlyBookings: 0,
  monthlyRevenue: 0,
  commissionRate: 10,
  guestFeePercent: 5,
  hostFeePercent: 5,
  totalCommissionPercent: 10,
  cancellationRate: 0,
  avgBookingValue: 0,
};

export function mapListing(row: ApiListing): Listing {
  const price = Number(row.rate_plan?.base_price ?? 0);
  return {
    id: row.id,
    title: row.title,
    hostId: row.host_user_id,
    hostName: row.host_profile?.full_name?.trim() || row.host_user_id.slice(0, 8),
    city: row.city,
    address: row.city,
    type: row.listing_type,
    status: mapListingStatus(row.status),
    pricePerNight: price,
    rating: Number(row.avg_rating ?? 0),
    reviewsCount: row.review_count ?? 0,
    bookingsCount: 0,
    occupancy: 0,
    bedrooms: 0,
    guests: 0,
    createdAt: row.created_at,
    photos: row.media?.length ?? 0,
    flags: [],
    thumbnailColor: thumbColor(row.id),
  };
}

type ApiListingMedia = {
  asset_id: string;
  kind: "PHOTO" | "VIDEO" | "WALKTHROUGH";
  sort_order?: number;
};

type ApiListingDetail = ApiListing & {
  address_encrypted?: string | null;
  description?: string | null;
  checkin_time?: string;
  checkout_time?: string;
  instant_booking?: boolean;
  rules?: {
    pets_policy?: string | null;
    smoking_policy?: string | null;
    quiet_hours?: boolean;
    couples_welcome?: boolean;
    max_guests?: number;
    amenities?: string[];
    cancellation_policy?: string;
    extra_rules_text?: string | null;
  } | null;
  check_in_contact?: {
    full_name?: string;
    phone_encrypted?: string;
    role?: string;
  } | null;
  media?: ApiListingMedia[];
};

function mapListingDetail(row: ApiListingDetail): ListingDetail {
  const base = mapListing(row);
  const rate = row.rate_plan;
  return {
    ...base,
    address: row.address_encrypted?.trim() || row.city,
    fullAddress: row.address_encrypted?.trim() || "—",
    description: row.description?.trim() || "—",
    checkInTime: row.checkin_time ?? "14:00",
    checkOutTime: row.checkout_time ?? "11:00",
    instantBooking: row.instant_booking ?? false,
    weekendPrice: rate?.weekend_price != null ? Number(rate.weekend_price) : null,
    cleaningFee: Number(rate?.cleaning_fee ?? 0),
    depositPolicy: rate?.deposit_policy_text?.trim() || "—",
    currency: rate?.currency ?? "MAD",
    maxGuests: row.rules?.max_guests ?? 0,
    petsPolicy: row.rules?.pets_policy ?? "—",
    smokingPolicy: row.rules?.smoking_policy ?? "—",
    quietHours: row.rules?.quiet_hours ?? false,
    couplesWelcome: row.rules?.couples_welcome ?? true,
    amenities: row.rules?.amenities ?? [],
    cancellationPolicy: row.rules?.cancellation_policy ?? "—",
    extraRules: row.rules?.extra_rules_text?.trim() || "—",
    checkInContactName: row.check_in_contact?.full_name ?? "—",
    checkInContactPhone: row.check_in_contact?.phone_encrypted ?? "—",
    checkInContactRole: row.check_in_contact?.role ?? "—",
    hostEmail: row.host_profile?.email ?? "—",
    hostPhone: row.host_profile?.phone ?? "—",
    hostCity: row.host_profile?.city ?? "—",
    guests: row.rules?.max_guests ?? 0,
    mediaItems: (row.media ?? [])
      .map((m) => ({
        assetId: m.asset_id,
        kind: (m.kind ?? "PHOTO") as ListingDetail["mediaItems"][number]["kind"],
        sortOrder: m.sort_order ?? 0,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    rawStatus: row.status,
  };
}

export function listingMediaApiPath(listingId: string, assetId: string) {
  return `${apiConfig.staysBaseUrl}/admin/stays/listings/${listingId}/media/${assetId}`;
}

export async function fetchListingMediaBlobUrl(
  listingId: string,
  assetId: string,
): Promise<string> {
  const token = getAccessToken();
  const res = await fetch(listingMediaApiPath(listingId, assetId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Failed to load media (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function fetchListingDetail(id: string): Promise<ListingDetail> {
  const row = await apiFetch<ApiListingDetail>(`/admin/stays/listings/${id}`);
  return mapListingDetail(row);
}

export function mapBooking(row: {
  id: string;
  guest_user_id: string;
  status: string;
  checkin_date: string;
  checkout_date: string;
  guest_count: number;
  total_paid?: number | null;
  created_at: string;
  listing?: { title?: string; city?: string; host_user_id?: string } | null;
}): Booking {
  const checkIn = new Date(row.checkin_date);
  const checkOut = new Date(row.checkout_date);
  const nights = Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000),
  );
  return {
    id: row.id,
    reference: row.id.slice(0, 8).toUpperCase(),
    guestUserId: row.guest_user_id,
    hostUserId: row.listing?.host_user_id,
    guestName: row.guest_user_id.slice(0, 8),
    hostName: row.listing?.host_user_id?.slice(0, 8) ?? "—",
    listingTitle: row.listing?.title ?? "—",
    city: row.listing?.city ?? "—",
    checkIn: row.checkin_date,
    checkOut: row.checkout_date,
    nights,
    guests: row.guest_count,
    total: Number(row.total_paid ?? 0),
    status: mapBookingStatus(row.status),
    createdAt: row.created_at,
  };
}

type HostProfileRow = {
  id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  host_type?: string | null;
  application_status: string;
  host_verification_status: string;
  identity_status: string;
  source?: string | null;
  submitted_from?: string | null;
  identity_reused?: boolean;
  document_type?: string | null;
  document_front_asset_id?: string | null;
  document_back_asset_id?: string | null;
  selfie_asset_id?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
};

function hostApplicationUiStatus(row: HostProfileRow): AppUser["status"] {
  if (
    row.application_status === "REJECTED" ||
    row.host_verification_status === "REJECTED"
  ) {
    return "banned";
  }
  if (row.application_status === "PENDING" || row.application_status === "DRAFT") {
    return "pending";
  }
  return "active";
}

export function mapHost(row: HostProfileRow): AppUser {
  const pending = row.application_status === "PENDING";
  return {
    id: row.user_id,
    hostProfileId: row.id,
    name: row.full_name?.trim() || "Host",
    email: row.email ?? "—",
    phone: row.phone ?? "—",
    role: "host",
    status: hostApplicationUiStatus(row),
    kyc: row.identity_status === "VERIFIED" ? "verified" : pending ? "pending" : "unverified",
    city: row.city ?? "—",
    joinedAt: row.submitted_at ?? row.created_at ?? "",
    lastActiveAt: row.submitted_at ?? row.created_at ?? "",
    avatarColor: thumbColor(row.user_id),
    listingsCount: 0,
  };
}

export function mapHostApplication(row: HostProfileRow): HostApplication {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.full_name?.trim() || "Applicant",
    email: row.email ?? "—",
    phone: row.phone ?? "—",
    city: row.city ?? "—",
    hostType: row.host_type ?? undefined,
    applicationStatus: row.application_status,
    verificationStatus: row.host_verification_status,
    identityStatus: row.identity_status,
    source: row.source ?? undefined,
    submittedFrom: row.submitted_from ?? undefined,
    identityReused: row.identity_reused ?? false,
    documentType: row.document_type ?? undefined,
    documentFrontAssetId: row.document_front_asset_id ?? undefined,
    documentBackAssetId: row.document_back_asset_id ?? undefined,
    selfieAssetId: row.selfie_asset_id ?? undefined,
    submittedAt: row.submitted_at ?? row.created_at ?? "",
    reviewedAt: row.reviewed_at ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    status: hostApplicationUiStatus(row),
    avatarColor: thumbColor(row.user_id),
  };
}

export function mapReview(row: {
  id: string;
  guest_user_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  listing?: { title?: string; host_user_id?: string } | null;
}): Review {
  const rating = row.rating;
  return {
    id: row.id,
    guestName: row.guest_user_id.slice(0, 8),
    listingTitle: row.listing?.title ?? "—",
    hostName: row.listing?.host_user_id?.slice(0, 8) ?? "—",
    rating,
    comment: row.comment ?? "",
    createdAt: row.created_at,
    status: "published",
    sentiment: rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral",
  };
}

export function mapAuditLog(row: {
  id: string;
  actor_user_id?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  created_at: string;
}): AuditLog {
  return {
    id: row.id,
    actor: row.actor_user_id?.slice(0, 8) ?? "system",
    actorRole: row.actor_role ?? "ADMIN",
    action: row.action,
    module: row.entity_type,
    target: row.entity_id ?? "—",
    before: undefined,
    after: row.metadata ? JSON.stringify(row.metadata) : undefined,
    ip: row.ip ?? "—",
    timestamp: row.created_at,
  };
}

export async function fetchStats(): Promise<DashboardStats> {
  const s = await apiFetch<{
    totalListings: number;
    liveListings: number;
    pendingListings: number;
    totalHosts: number;
    pendingHostVerification: number;
    approvedHosts: number;
    totalBookings: number;
    todayBookings: number;
    confirmedBookings: number;
    totalRevenue: number;
    todayRevenue: number;
    totalBookingValue: number;
    guest_fee_pct?: number;
    host_fee_pct?: number;
    guest_fee_percent?: number;
    host_fee_percent?: number;
    total_commission_percent?: number;
  }>("/admin/stays/stats");

  let pendingKyc = s.pendingHostVerification;
  try {
    const { fetchKycApplications } = await import("./identity-admin");
    const pending = await fetchKycApplications("pending");
    pendingKyc = pending.length;
  } catch {
    // Identity unavailable — fall back to host verification count
  }

  const totalCommission =
    s.total_commission_percent ??
    ((s.guest_fee_percent ?? 5) + (s.host_fee_percent ?? 5));

  return {
    ...s,
    pendingListingsBadge: s.pendingListings,
    openRisks: 0,
    pendingKyc,
    openTickets: 0,
    totalUsers: s.totalHosts,
    activeListings: s.liveListings,
    monthlyBookings: s.totalBookings,
    monthlyRevenue: s.totalRevenue,
    commissionRate: totalCommission,
    guestFeePercent: s.guest_fee_percent ?? 5,
    hostFeePercent: s.host_fee_percent ?? 5,
    totalCommissionPercent: totalCommission,
    cancellationRate: 0,
    avgBookingValue:
      s.confirmedBookings > 0
        ? s.totalBookingValue / s.confirmedBookings
        : 0,
  };
}

export async function fetchListings(status?: string) {
  const q = status && status !== "all" ? `?status=${encodeURIComponent(status)}&limit=200` : "?limit=200";
  const data = await apiFetch<Paginated<ApiListing>>(`/admin/stays/listings${q}`);
  return data.items.map(mapListing);
}

export async function fetchBookings(status?: string) {
  const q = status && status !== "all" ? `?status=${encodeURIComponent(status)}&limit=200` : "?limit=200";
  const data = await apiFetch<Paginated<Parameters<typeof mapBooking>[0]>>(
    `/admin/stays/bookings${q}`,
  );
  return data.items.map(mapBooking);
}

type ApiBookingDetail = Parameters<typeof mapBooking>[0] & {
  listing_id?: string;
  total_subtotal?: number | string | null;
  guest_fee?: number | string | null;
  host_fee?: number | string | null;
  payout_amount?: number | string | null;
  currency?: string;
  occupants?: BookingOccupant[];
};

function mapBookingDetail(row: ApiBookingDetail): BookingDetail {
  const base = mapBooking(row);
  return {
    ...base,
    rawStatus: row.status,
    listingId: row.listing_id,
    subtotal: row.total_subtotal != null ? Number(row.total_subtotal) : undefined,
    guestFee: row.guest_fee != null ? Number(row.guest_fee) : undefined,
    hostFee: row.host_fee != null ? Number(row.host_fee) : undefined,
    payoutAmount: row.payout_amount != null ? Number(row.payout_amount) : null,
    currency: row.currency ?? "MAD",
    occupants: row.occupants ?? [],
  };
}

export async function fetchBookingDetail(id: string): Promise<BookingDetail> {
  const row = await apiFetch<ApiBookingDetail>(`/admin/stays/bookings/${id}`);
  return mapBookingDetail(row);
}

export function occupantIdDocumentApiPath(
  bookingId: string,
  occupantId: string,
  side: "front" | "back",
) {
  return `${apiConfig.staysBaseUrl}/admin/stays/bookings/${bookingId}/occupants/${occupantId}/id-document/${side}`;
}

export async function fetchOccupantIdDocumentBlobUrl(
  bookingId: string,
  occupantId: string,
  side: "front" | "back",
): Promise<string> {
  const token = getAccessToken();
  const res = await fetch(occupantIdDocumentApiPath(bookingId, occupantId, side), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Failed to load ID document (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function hostApplicationDocumentApiPath(
  applicationId: string,
  kind: "front" | "back" | "selfie",
) {
  return `${apiConfig.staysBaseUrl}/admin/stays/host-applications/${applicationId}/documents/${kind}`;
}

export async function fetchHostApplicationDocumentBlobUrl(
  applicationId: string,
  kind: "front" | "back" | "selfie",
): Promise<string> {
  const token = getAccessToken();
  const res = await fetch(hostApplicationDocumentApiPath(applicationId, kind), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Failed to load host document (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function fetchHosts() {
  const data = await apiFetch<Paginated<Parameters<typeof mapHost>[0]>>(
    "/admin/stays/hosts?limit=200",
  );
  return data.items.map(mapHost);
}

export async function fetchReviews() {
  const data = await apiFetch<Paginated<Parameters<typeof mapReview>[0]>>(
    "/admin/stays/reviews?limit=200",
  );
  return data.items.map(mapReview);
}

export async function fetchAuditLogs() {
  const data = await apiFetch<Paginated<Parameters<typeof mapAuditLog>[0]>>(
    "/admin/stays/audit-logs?limit=200",
  );
  return data.items.map(mapAuditLog);
}

export async function approveListing(id: string) {
  return apiFetch(`/admin/stays/listings/${id}/approve`, { method: "POST" });
}

export async function rejectListing(id: string, reason: string) {
  return apiFetch(`/admin/stays/listings/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function setListingLive(id: string) {
  return apiFetch(`/admin/stays/listings/${id}/set-live`, { method: "POST" });
}

export async function approveHost(id: string) {
  return apiFetch(`/admin/stays/hosts/${id}/approve`, { method: "POST" });
}

export async function rejectHost(id: string, reason: string) {
  return apiFetch(`/admin/stays/hosts/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function approveHostApplication(id: string) {
  return apiFetch(`/admin/stays/host-applications/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectHostApplication(id: string, reason: string) {
  return apiFetch(`/admin/stays/host-applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/** Not yet backed by Stays API — returns empty until implemented. */
export async function fetchTickets(): Promise<Ticket[]> {
  return [];
}

export async function fetchRiskFlags(): Promise<RiskFlag[]> {
  return [];
}

/** KYC records from Identity admin API. */
export async function fetchKycRecords(): Promise<KycRecord[]> {
  const { fetchKycApplications } = await import("./identity-admin");
  return fetchKycApplications();
}

export async function fetchHostApplications(status?: string) {
  const q =
    status && status !== "all"
      ? `?status=${encodeURIComponent(status)}&limit=200`
      : "?limit=200";
  const data = await apiFetch<Paginated<HostProfileRow>>(
    `/admin/stays/host-applications${q}`,
  );
  return data.items.map(mapHostApplication);
}

export type FeeSettings = {
  guest_fee_pct: number;
  host_fee_pct: number;
  guest_fee_percent: number;
  host_fee_percent: number;
  total_commission_percent: number;
};

export async function fetchFeeSettings(): Promise<FeeSettings> {
  return apiFetch<FeeSettings>("/admin/stays/settings/fees");
}

export async function updateFeeSettings(
  guestFeePercent: number,
  hostFeePercent: number,
): Promise<FeeSettings> {
  return apiFetch<FeeSettings>("/admin/stays/settings/fees", {
    method: "PATCH",
    body: JSON.stringify({
      guest_fee_pct: guestFeePercent / 100,
      host_fee_pct: hostFeePercent / 100,
    }),
  });
}
