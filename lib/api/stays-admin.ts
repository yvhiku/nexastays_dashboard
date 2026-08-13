import type {
  AppUser,
  AuditLog,
  Booking,
  BookingDetail,
  BookingOccupant,
  HostApplication,
  InvestigationMessage,
  KycRecord,
  LedgerEntry,
  Listing,
  ListingDetail,
  Review,
  RiskFlag,
  SafetyReport,
  SupportActivityItem,
  Ticket,
  TicketDetail,
  TicketMessage,
  TicketNote,
} from "../types";
import { apiConfig } from "./config";
import { apiFetch, getAccessToken, isNotImplemented } from "./client";

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

function normalizeSenderType(value: unknown): TicketMessage["senderType"] {
  const upper = String(value ?? "").toUpperCase();
  if (upper === "SUPPORT_AGENT") return "SUPPORT_AGENT";
  if (upper === "SYSTEM") return "SYSTEM";
  return "CUSTOMER";
}

export function ticketContextHref(
  kind: "booking" | "listing" | "host" | "report" | "safety",
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  const q = encodeURIComponent(id);
  if (kind === "booking") return `/bookings?q=${q}`;
  if (kind === "listing") return `/listings?status=all&q=${q}`;
  if (kind === "host") return `/hosts?status=all&q=${q}`;
  return `/reports?q=${q}`;
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
      return "pending";
    case "DRAFT":
      return "draft";
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
  /** Sum of actionable queue counts for Operations badge. */
  opsAttention: number;
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
  opsAttention: 0,
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
    rawStatus: row.status,
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
  booking_reference?: string | null;
  guest_user_id: string;
  status: string;
  checkin_date: string;
  checkout_date: string;
  guest_count: number;
  total_paid?: number | null;
  created_at: string;
  paid_at?: string | null;
  confirmed_at?: string | null;
  completed_at?: string | null;
  listing_id?: string;
  listing?: { id?: string; title?: string; city?: string; host_user_id?: string } | null;
}): Booking {
  // Match stays bookingNightsBetween: UTC YMD, checkout exclusive.
  const ci = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(row.checkin_date));
  const co = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(row.checkout_date));
  const nights =
    ci && co
      ? Math.max(
          1,
          Math.trunc(
            (Date.UTC(Number(co[1]), Number(co[2]) - 1, Number(co[3])) -
              Date.UTC(Number(ci[1]), Number(ci[2]) - 1, Number(ci[3]))) /
              86_400_000,
          ),
        )
      : 1;
  return {
    id: row.id,
    reference: row.booking_reference?.trim() || row.id.slice(0, 8).toUpperCase(),
    guestUserId: row.guest_user_id,
    hostUserId: row.listing?.host_user_id,
    guestName: row.guest_user_id.slice(0, 8),
    hostName: row.listing?.host_user_id?.slice(0, 8) ?? "—",
    listingTitle: row.listing?.title ?? "—",
    listingId: row.listing_id ?? row.listing?.id,
    city: row.listing?.city ?? "—",
    checkIn: row.checkin_date,
    checkOut: row.checkout_date,
    nights,
    guests: row.guest_count,
    total: Number(row.total_paid ?? 0),
    status: mapBookingStatus(row.status),
    rawStatus: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at ?? null,
    confirmedAt: row.confirmed_at ?? null,
    completedAt: row.completed_at ?? null,
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
  listing_frozen?: boolean;
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
    listingFrozen: Boolean(row.listing_frozen),
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
  status?: string | null;
  listing?: { title?: string; host_user_id?: string } | null;
}): Review {
  const rating = row.rating;
  const raw = row.status?.toUpperCase();
  const status: Review["status"] =
    raw === "HIDDEN" || raw === "FLAGGED"
      ? "flagged"
      : raw === "REMOVED"
        ? "removed"
        : "published";
  return {
    id: row.id,
    guestName: row.guest_user_id.slice(0, 8),
    listingTitle: row.listing?.title ?? "—",
    hostName: row.listing?.host_user_id?.slice(0, 8) ?? "—",
    rating,
    comment: row.comment ?? "",
    createdAt: row.created_at,
    status,
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

export type OpsFunnelStage = {
  key: string;
  label: string;
  count: number;
  unit: "hosts" | "listings";
};

export type OpsOverview = {
  snapshot: {
    liveListings: number;
    activeHosts: number;
    activeBookings: number;
    revenueToday: number;
    revenueMonth: number;
    avgRating: number;
  };
  attention: {
    pendingListings: number;
    pendingHostApplications: number;
    pendingKyc: number | null;
    needsChangesListings: number;
    failedPayouts: number;
    urgentAlerts: number;
    openTickets?: number;
    paymentFailures?: number;
    pendingRefunds?: number;
    oldestPendingListingAt: string | null;
    oldestPendingListingHours: number | null;
    oldestPendingHostApplicationAt: string | null;
    oldestPendingHostApplicationHours: number | null;
  };
  healthScore: {
    score: number;
    label: "Healthy" | "Watch" | "Critical";
  };
  funnel: {
    period: string;
    stages: OpsFunnelStage[];
    conversions: {
      applicationsToApproved: number | null;
      approvedToDraft: number | null;
      draftToSubmitted: number | null;
      submittedToLive: number | null;
      liveToFirstBooking: number | null;
    };
  };
  opsTiming: {
    avgHoursToHostApproval: number | null;
    avgDaysDraftToSubmit: number | null;
  };
  series: { date: string; bookings: number; gmv: number; revenue: number }[];
  activityGrouped: {
    key: string;
    label: string;
    listingsApproved: number;
    hostsApproved: number;
    bookings: number;
    reviews: number;
    cancellations: number;
  }[];
};

export const EMPTY_OPS_OVERVIEW: OpsOverview = {
  snapshot: {
    liveListings: 0,
    activeHosts: 0,
    activeBookings: 0,
    revenueToday: 0,
    revenueMonth: 0,
    avgRating: 0,
  },
  attention: {
    pendingListings: 0,
    pendingHostApplications: 0,
    pendingKyc: null,
    needsChangesListings: 0,
    failedPayouts: 0,
    urgentAlerts: 0,
    openTickets: 0,
    paymentFailures: 0,
    pendingRefunds: 0,
    oldestPendingListingAt: null,
    oldestPendingListingHours: null,
    oldestPendingHostApplicationAt: null,
    oldestPendingHostApplicationHours: null,
  },
  healthScore: { score: 100, label: "Healthy" },
  funnel: {
    period: "mtd_utc",
    stages: [],
    conversions: {
      applicationsToApproved: null,
      approvedToDraft: null,
      draftToSubmitted: null,
      submittedToLive: null,
      liveToFirstBooking: null,
    },
  },
  opsTiming: {
    avgHoursToHostApproval: null,
    avgDaysDraftToSubmit: null,
  },
  series: [],
  activityGrouped: [],
};

export async function fetchOpsOverview(): Promise<OpsOverview> {
  const data = await apiFetch<OpsOverview>("/admin/stays/ops-overview");
  let pendingKyc = data.attention.pendingKyc;
  try {
    const { fetchKycApplications } = await import("./identity-admin");
    const pending = await fetchKycApplications("pending");
    pendingKyc = pending.length;
  } catch {
    // Identity unavailable — leave null/0
    if (pendingKyc == null) pendingKyc = 0;
  }
  let openTickets = data.attention.openTickets ?? 0;
  try {
    openTickets = await fetchOpenTicketCount();
  } catch {
    // Support API unavailable
  }
  return {
    ...data,
    attention: {
      ...data.attention,
      pendingKyc: pendingKyc ?? 0,
      openTickets,
    },
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

  const opsAttention =
    s.pendingListings + s.pendingHostVerification + pendingKyc;

  let openTickets = 0;
  try {
    openTickets = await fetchOpenTicketCount();
  } catch {
    openTickets = 0;
  }

  return {
    ...s,
    pendingListingsBadge: s.pendingListings,
    openRisks: 0,
    pendingKyc,
    openTickets,
    opsAttention,
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

/** Map UI queue filters to Stays listing status query values. */
export function listingStatusQuery(ui?: string): string | undefined {
  if (!ui || ui === "all") return undefined;
  switch (ui) {
    case "pending":
      return "SUBMITTED";
    case "approved":
      return "APPROVED";
    case "active":
    case "live":
      return "LIVE";
    case "suspended":
    case "paused":
      return "PAUSED";
    case "rejected":
      return "REJECTED";
    case "draft":
      return "DRAFT";
    default:
      return ui.toUpperCase();
  }
}

export type ListingCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  live: number;
  paused: number;
  draft: number;
};

export const EMPTY_LISTING_COUNTS: ListingCounts = {
  all: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  live: 0,
  paused: 0,
  draft: 0,
};

export type ListingsPageResult = {
  items: Listing[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export async function fetchListingCounts(): Promise<ListingCounts> {
  const data = await apiFetch<Partial<ListingCounts>>("/admin/stays/listing-counts");
  let draft = data.draft ?? 0;
  if (data.draft == null) {
    try {
      const page = await fetchListingsPage({ status: "draft", limit: 1, offset: 0 });
      draft = page.total;
    } catch {
      draft = 0;
    }
  }
  return {
    all: data.all ?? 0,
    pending: data.pending ?? 0,
    approved: data.approved ?? 0,
    rejected: data.rejected ?? 0,
    live: data.live ?? 0,
    paused: data.paused ?? 0,
    draft,
  };
}

export async function fetchListingsPage(options?: {
  status?: string;
  sort?: "oldest" | "newest" | "priority";
  limit?: number;
  offset?: number;
}): Promise<ListingsPageResult> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const apiStatus = listingStatusQuery(options?.status);
  if (apiStatus) params.set("status", apiStatus);
  const sort = options?.sort;
  if (sort) params.set("sort", sort);
  else if (apiStatus === "SUBMITTED") params.set("sort", "oldest");

  const data = await apiFetch<{
    items: ApiListing[];
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>(`/admin/stays/listings?${params.toString()}`);

  return {
    items: data.items.map(mapListing),
    total: data.total,
    limit: data.limit ?? limit,
    offset: data.offset ?? offset,
    hasNext: Boolean(data.hasNext),
    hasPrevious: Boolean(data.hasPrevious),
  };
}

/** @deprecated Prefer fetchListingsPage — kept for callers that only need items. */
export async function fetchListings(
  status?: string,
  sort?: "oldest" | "newest" | "priority",
) {
  const page = await fetchListingsPage({ status, sort, limit: 50, offset: 0 });
  return page.items;
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
  ledger?: Array<{
    id: string;
    booking_id?: string;
    type: LedgerEntry["type"];
    amount: number | string;
    currency?: string;
    status: LedgerEntry["status"];
    created_at: string;
  }>;
};

function mapLedger(row: NonNullable<ApiBookingDetail["ledger"]>[number]): LedgerEntry {
  return {
    id: row.id,
    bookingId: row.booking_id ?? "",
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency ?? "MAD",
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapBookingDetail(row: ApiBookingDetail): BookingDetail {
  const base = mapBooking(row);
  return {
    ...base,
    listingId: row.listing_id ?? base.listingId,
    subtotal: row.total_subtotal != null ? Number(row.total_subtotal) : undefined,
    guestFee: row.guest_fee != null ? Number(row.guest_fee) : undefined,
    hostFee: row.host_fee != null ? Number(row.host_fee) : undefined,
    payoutAmount: row.payout_amount != null ? Number(row.payout_amount) : null,
    currency: row.currency ?? "MAD",
    occupants: row.occupants ?? [],
    ledger: row.ledger?.map(mapLedger),
  };
}

export async function fetchBookingDetail(id: string): Promise<BookingDetail> {
  const row = await apiFetch<ApiBookingDetail>(`/admin/stays/bookings/${id}`);
  const detail = mapBookingDetail(row);
  if (!detail.ledger) {
    try {
      const ledger = await apiFetch<ApiBookingDetail["ledger"]>(
        `/admin/stays/bookings/${id}/ledger`,
      );
      if (Array.isArray(ledger)) detail.ledger = ledger.map(mapLedger);
    } catch (err) {
      if (!isNotImplemented(err)) {
        // ignore missing ledger; keep booking detail
      }
    }
  }
  return detail;
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

export async function pauseListing(id: string) {
  return apiFetch(`/admin/stays/listings/${id}/pause`, { method: "POST" });
}

export async function unpauseListing(id: string) {
  return apiFetch(`/admin/stays/listings/${id}/unpause`, { method: "POST" });
}

export async function hideReview(id: string) {
  return apiFetch(`/admin/stays/reviews/${id}/hide`, { method: "PATCH" });
}

export async function publishReview(id: string) {
  return apiFetch(`/admin/stays/reviews/${id}/publish`, { method: "PATCH" });
}

export async function deleteReview(id: string) {
  return apiFetch(`/admin/stays/reviews/${id}`, { method: "DELETE" });
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

export async function freezeHost(id: string) {
  return apiFetch(`/admin/stays/hosts/${id}/freeze`, { method: "POST" });
}

export async function unfreezeHost(id: string) {
  return apiFetch(`/admin/stays/hosts/${id}/unfreeze`, { method: "POST" });
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

export type TicketsQuery = {
  limit?: number;
  offset?: number;
  status?: string;
  priority?: string;
  category?: string;
  assignedAdminId?: string;
  /** When true, only tickets with assigned_admin_id IS NULL. Conflicts with assignedAdminId. */
  unassigned?: boolean;
  requesterUserId?: string;
  bookingId?: string;
  listingId?: string;
  search?: string;
};

export type TicketsResult = {
  items: Ticket[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

function mapTicket(row: Record<string, unknown>): Ticket {
  return {
    id: String(row.id ?? ""),
    ticketNumber: String(row.ticket_number ?? row.ticketNumber ?? row.id ?? ""),
    subject: String(row.subject ?? row.category ?? "Support"),
    category: (row.category as Ticket["category"]) ?? "OTHER",
    customerName: String(row.customer_name ?? row.customerName ?? "—"),
    requesterEmail: (row.requester_email ?? row.requesterEmail) as string | undefined,
    party: row.party_type === "HOST" || row.party === "HOST" ? "HOST" : "GUEST",
    assignee: (row.assigned_admin_id ?? row.assignee) as string | undefined,
    status: (row.status as Ticket["status"]) ?? "OPEN",
    priority: (row.priority as Ticket["priority"]) ?? "NORMAL",
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ""),
    resolvedAt: (row.resolved_at ?? row.resolvedAt) as string | undefined,
    bookingId: (row.booking_id ?? row.bookingId) as string | undefined,
    bookingRef: (row.booking_reference ?? row.bookingRef) as string | undefined,
    listingId: (row.listing_id ?? row.listingId) as string | undefined,
    reportId: (row.report_id ?? row.reportId) as string | undefined,
    safetyIssueId: (row.safety_issue_id ?? row.safetyIssueId) as string | undefined,
    unreadForSupport: Boolean(row.unread_for_support ?? row.unreadForSupport),
    lastMessagePreview: (row.last_message_preview ?? row.lastMessagePreview) as
      | string
      | undefined,
  };
}

function ticketsQueryString(query: TicketsQuery): string {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(query.limit ?? 50, 1), 100)));
  params.set("offset", String(Math.max(query.offset ?? 0, 0)));
  if (query.status) params.set("status", query.status);
  if (query.priority) params.set("priority", query.priority);
  if (query.category) params.set("category", query.category);
  if (query.unassigned === true) params.set("unassigned", "true");
  else if (query.assignedAdminId) {
    params.set("assignedAdminId", query.assignedAdminId);
  }
  if (query.requesterUserId) params.set("requesterUserId", query.requesterUserId);
  if (query.bookingId) params.set("bookingId", query.bookingId);
  if (query.listingId) params.set("listingId", query.listingId);
  if (query.search?.trim()) params.set("search", query.search.trim());
  return params.toString();
}

/** Stays support tickets with server-side filters and pagination. */
export async function fetchTickets(query: TicketsQuery = {}): Promise<TicketsResult> {
  const data = await apiFetch<{
    items?: Record<string, unknown>[];
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  }>(`/admin/stays/support/tickets?${ticketsQueryString(query)}`);
  const items = (data.items ?? []).map(mapTicket);
  const limit = Number(data.limit ?? query.limit ?? 50);
  const offset = Number(data.offset ?? query.offset ?? 0);
  const total = Number(data.total ?? items.length);
  return {
    items,
    total,
    limit,
    offset,
    hasMore: Boolean(data.hasMore ?? offset + items.length < total),
  };
}

export async function fetchOpenTicketCount(): Promise<number> {
  const data = await apiFetch<{ total?: number }>("/admin/stays/support/tickets/open-count");
  return Number(data.total ?? 0);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export async function fetchTicket(ticketId: string): Promise<TicketDetail> {
  const row = await apiFetch<Record<string, unknown>>(`/admin/stays/support/tickets/${ticketId}`);
  const listing = asRecord(row.listing);
  const report = asRecord(row.report);
  const safety = asRecord(row.safetyIssue ?? row.safety_issue);
  return {
    ...mapTicket(row),
    conversationId: (row.conversationId ?? row.conversation_id) as string | undefined,
    listingTitle: (listing?.title ?? row.listing_title) as string | undefined,
    hostUserId: (listing?.hostUserId ?? listing?.host_user_id) as string | undefined,
    listing: listing
      ? {
          id: String(listing.id ?? ""),
          title: listing.title as string | undefined,
          hostUserId: (listing.hostUserId ?? listing.host_user_id) as string | undefined,
          city: listing.city as string | undefined,
        }
      : null,
    report: report
      ? {
          id: String(report.id ?? ""),
          reason: (report.reason as string | null | undefined) ?? null,
          conversationId: (report.conversationId ?? report.conversation_id) as string | undefined,
          reporterUserId: (report.reporterUserId ?? report.reporter_user_id) as string | undefined,
        }
      : null,
    safetyIssue: safety
      ? {
          id: String(safety.id ?? ""),
          category: safety.category as string | undefined,
          details: (safety.details as string | null | undefined) ?? null,
          conversationId: (safety.conversationId ?? safety.conversation_id) as string | undefined,
          reporterUserId: (safety.reporterUserId ?? safety.reporter_user_id) as string | undefined,
        }
      : null,
  };
}

export async function fetchTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const data = await apiFetch<{ items?: Record<string, unknown>[] } | Record<string, unknown>[]>(
    `/admin/stays/support/tickets/${ticketId}/messages`,
  );
  const rows = Array.isArray(data) ? data : data.items ?? [];
  return rows.map((row) => ({
    id: String(row.id ?? ""),
    ticketId,
    senderType: normalizeSenderType(row.sender_type ?? row.senderType),
    senderId: (row.sender_id ?? row.senderId) as string | undefined,
    body: String(row.body ?? ""),
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  }));
}

export async function sendTicketMessage(ticketId: string, body: string) {
  return apiFetch(`/admin/stays/support/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function patchTicket(
  ticketId: string,
  patch: { status?: string; priority?: string; assigned_admin_id?: string | null },
) {
  return apiFetch(`/admin/stays/support/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

function mapTicketNote(row: Record<string, unknown>, ticketId: string): TicketNote {
  return {
    id: String(row.id ?? ""),
    ticketId: String(row.ticket_id ?? row.ticketId ?? ticketId),
    authorAdminId: String(row.author_admin_id ?? row.authorAdminId ?? ""),
    body: String(row.body ?? ""),
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

export async function fetchTicketNotes(
  ticketId: string,
  limit = 100,
): Promise<TicketNote[]> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(limit, 1), 200)));
  const data = await apiFetch<{ items?: Record<string, unknown>[] }>(
    `/admin/stays/support/tickets/${encodeURIComponent(ticketId)}/notes?${params}`,
  );
  return (data.items ?? []).map((row) => mapTicketNote(row, ticketId));
}

export async function createTicketNote(
  ticketId: string,
  body: string,
): Promise<TicketNote> {
  const row = await apiFetch<Record<string, unknown>>(
    `/admin/stays/support/tickets/${encodeURIComponent(ticketId)}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );
  return mapTicketNote(row, ticketId);
}

function mapActivityItem(row: Record<string, unknown>): SupportActivityItem {
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  return {
    id: String(row.id ?? ""),
    action: String(row.action ?? ""),
    actorId: (row.actor_id ?? row.actorId) as string | null | undefined,
    metadata,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

export type ActivityResult = {
  items: SupportActivityItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export async function fetchTicketActivity(
  ticketId: string,
  query: { limit?: number; offset?: number } = {},
): Promise<ActivityResult> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(query.limit ?? 50, 1), 100)));
  params.set("offset", String(Math.max(query.offset ?? 0, 0)));
  const data = await apiFetch<{
    items?: Record<string, unknown>[];
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  }>(
    `/admin/stays/support/tickets/${encodeURIComponent(ticketId)}/activity?${params}`,
  );
  const items = (data.items ?? []).map(mapActivityItem);
  const limit = Number(data.limit ?? query.limit ?? 50);
  const offset = Number(data.offset ?? query.offset ?? 0);
  const total = Number(data.total ?? items.length);
  return {
    items,
    total,
    limit,
    offset,
    hasMore: Boolean(data.hasMore ?? offset + items.length < total),
  };
}

export async function fetchReportActivity(
  reportId: string,
  kind: "conversation_reported" | "safety_issue",
  query: { limit?: number; offset?: number } = {},
): Promise<ActivityResult> {
  const params = new URLSearchParams();
  params.set("kind", kind);
  params.set("limit", String(Math.min(Math.max(query.limit ?? 50, 1), 100)));
  params.set("offset", String(Math.max(query.offset ?? 0, 0)));
  const data = await apiFetch<{
    items?: Record<string, unknown>[];
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  }>(`/admin/stays/reports/${encodeURIComponent(reportId)}/activity?${params}`);
  const items = (data.items ?? []).map(mapActivityItem);
  const limit = Number(data.limit ?? query.limit ?? 50);
  const offset = Number(data.offset ?? query.offset ?? 0);
  const total = Number(data.total ?? items.length);
  return {
    items,
    total,
    limit,
    offset,
    hasMore: Boolean(data.hasMore ?? offset + items.length < total),
  };
}

export type InvestigationConversationResult = {
  conversation: {
    id: string;
    bookingId?: string | null;
    listingId?: string | null;
    type?: string;
  } | null;
  items: InvestigationMessage[];
  nextCursor: { beforeSequence: number } | null;
  hasMore: boolean;
};

export async function fetchReportConversation(
  reportId: string,
  kind: "conversation_reported" | "safety_issue",
  query: { limit?: number; beforeSequence?: number } = {},
): Promise<InvestigationConversationResult> {
  const params = new URLSearchParams();
  params.set("kind", kind);
  params.set("limit", String(Math.min(Math.max(query.limit ?? 50, 1), 50)));
  if (query.beforeSequence != null) {
    params.set("before_sequence", String(query.beforeSequence));
  }
  const data = await apiFetch<{
    conversation?: Record<string, unknown> | null;
    items?: Record<string, unknown>[];
    next_cursor?: { before_sequence?: number } | null;
    has_more?: boolean;
  }>(
    `/admin/stays/reports/${encodeURIComponent(reportId)}/conversation?${params}`,
  );
  const conv = asRecord(data.conversation);
  const items = (data.items ?? []).map((row): InvestigationMessage => {
    const atts = Array.isArray(row.attachments)
      ? (row.attachments as Record<string, unknown>[]).map(mapEvidence)
      : [];
    const role = String(row.sender_role ?? row.senderRole ?? "UNKNOWN").toUpperCase();
    return {
      id: String(row.id ?? ""),
      senderId: (row.sender_id ?? row.senderId) as string | null | undefined,
      senderRole:
        role === "GUEST" || role === "HOST" ? role : "UNKNOWN",
      type: row.type as string | undefined,
      body: String(row.body ?? ""),
      conversationSequence: Number(
        row.conversation_sequence ?? row.conversationSequence ?? 0,
      ),
      createdAt: String(row.created_at ?? row.createdAt ?? ""),
      attachments: atts,
    };
  });
  const cursor = data.next_cursor;
  return {
    conversation: conv
      ? {
          id: String(conv.id ?? ""),
          bookingId: (conv.booking_id ?? conv.bookingId) as string | null | undefined,
          listingId: (conv.listing_id ?? conv.listingId) as string | null | undefined,
          type: conv.type as string | undefined,
        }
      : null,
    items,
    nextCursor:
      cursor?.before_sequence != null
        ? { beforeSequence: Number(cursor.before_sequence) }
        : null,
    hasMore: Boolean(data.has_more ?? !!cursor),
  };
}

export type ReportsQuery = {
  limit?: number;
  offset?: number;
  status?: string;
  kind?: "conversation_reported" | "safety_issue";
  category?: string;
  reporterUserId?: string;
  reportedUserId?: string;
  bookingId?: string;
  listingId?: string;
  search?: string;
};

export type ReportsResult = {
  items: SafetyReport[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

function mapPerson(
  value: unknown,
  fallbackId?: string,
): SafetyReport["reporter"] {
  const row = asRecord(value);
  if (!row && !fallbackId) return null;
  return {
    id: String(row?.id ?? fallbackId ?? ""),
    name: (row?.name as string | null | undefined) ?? null,
    email: (row?.email as string | null | undefined) ?? null,
  };
}

function mapEvidence(row: Record<string, unknown>): NonNullable<SafetyReport["evidence"]>[number] {
  return {
    id: String(row.id ?? ""),
    url: String(row.url ?? ""),
    contentType: (row.contentType ?? row.content_type) as string | undefined,
    filename: (row.filename as string | null | undefined) ?? null,
    createdAt: (row.createdAt ?? row.created_at) as string | undefined,
  };
}

function mapSafetyReport(row: Record<string, unknown>, includeEvidence = false): SafetyReport {
  const reporter = mapPerson(row.reporter, (row.actor_user_id ?? row.reporter_id ?? row.reporterId) as string | undefined);
  const reported = mapPerson(row.reported_user ?? row.reportedUser);
  const booking = asRecord(row.booking);
  const listing = asRecord(row.listing);
  const ticket = asRecord(row.ticket);
  const evidenceRows = Array.isArray(row.evidence)
    ? (row.evidence as Record<string, unknown>[]).map(mapEvidence)
    : undefined;
  return {
    id: String(row.id ?? ""),
    kind: (row.kind ?? row.action ?? "conversation_reported") as SafetyReport["kind"],
    reason: (row.reason ??
      (row.metadata as { reason?: string } | undefined)?.reason) as string | undefined,
    category: (row.category ??
      (row.metadata as { category?: string } | undefined)?.category) as string | undefined,
    reporterId: reporter?.id,
    conversationId: (row.conversation_id ?? row.conversationId) as string | undefined,
    bookingId: (row.booking_id ?? row.bookingId ?? booking?.id) as string | undefined,
    listingId: (row.listing_id ?? row.listingId ?? listing?.id) as string | undefined,
    supportTicketId: (ticket?.id ??
      row.support_ticket_id ??
      row.supportTicketId) as string | undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    status: String(row.status ?? "OPEN").toUpperCase(),
    reporter,
    reportedUser: reported,
    booking: booking
      ? {
          id: String(booking.id ?? ""),
          reference: (booking.reference as string | null | undefined) ?? null,
        }
      : null,
    listing: listing
      ? {
          id: String(listing.id ?? ""),
          title: (listing.title as string | null | undefined) ?? null,
        }
      : null,
    ticket: ticket
      ? {
          id: String(ticket.id ?? ""),
          ticketNumber: String(ticket.ticket_number ?? ticket.ticketNumber ?? ""),
          status: String(ticket.status ?? ""),
        }
      : null,
    evidenceCount: Number(row.evidence_count ?? row.evidenceCount ?? evidenceRows?.length ?? 0),
    ...(includeEvidence && evidenceRows ? { evidence: evidenceRows } : {}),
  };
}

function reportsQueryString(query: ReportsQuery): string {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(query.limit ?? 50, 1), 100)));
  params.set("offset", String(Math.max(query.offset ?? 0, 0)));
  if (query.status) params.set("status", query.status);
  if (query.kind) params.set("kind", query.kind);
  if (query.category) params.set("category", query.category);
  if (query.reporterUserId) params.set("reporterUserId", query.reporterUserId);
  if (query.reportedUserId) params.set("reportedUserId", query.reportedUserId);
  if (query.bookingId) params.set("bookingId", query.bookingId);
  if (query.listingId) params.set("listingId", query.listingId);
  if (query.search?.trim()) params.set("search", query.search.trim());
  return params.toString();
}

export async function fetchReports(query: ReportsQuery = {}): Promise<ReportsResult> {
  const data = await apiFetch<{
    items?: Record<string, unknown>[];
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  }>(`/admin/stays/reports?${reportsQueryString(query)}`);
  const items = (data.items ?? []).map((row) => mapSafetyReport(row, false));
  const limit = Number(data.limit ?? query.limit ?? 50);
  const offset = Number(data.offset ?? query.offset ?? 0);
  const total = Number(data.total ?? items.length);
  return {
    items,
    total,
    limit,
    offset,
    hasMore: Boolean(data.hasMore ?? offset + items.length < total),
  };
}

export async function fetchReportDetail(
  id: string,
  kind: "conversation_reported" | "safety_issue",
): Promise<SafetyReport> {
  const row = await apiFetch<Record<string, unknown>>(
    `/admin/stays/reports/${encodeURIComponent(id)}?kind=${encodeURIComponent(kind)}`,
  );
  return mapSafetyReport(row, true);
}

export async function patchReportStatus(
  id: string,
  kind: "conversation_reported" | "safety_issue",
  status: "OPEN" | "REVIEWED" | "ESCALATED" | "DISMISSED",
): Promise<SafetyReport> {
  const row = await apiFetch<Record<string, unknown>>(`/admin/stays/reports/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ kind, status }),
  });
  return mapSafetyReport(row, true);
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
