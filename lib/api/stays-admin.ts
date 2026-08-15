import type {
  AppUser,
  AuditLog,
  Booking,
  BookingDetail,
  BookingOccupant,
  CannedReply,
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
  SupportAnalytics,
  SupportSlaPayload,
  Ticket,
  TicketCsat,
  TicketDetail,
  TicketMessage,
  TicketNote,
  SupportCsatReview,
  OperationalSignal,
  RelatedSupportTicket,
  SupportOperationsOverview,
  SupportAttentionResult,
  SupportPartyContact,
} from "../types";
import { apiConfig } from "./config";
import { apiFetch, getAccessToken, isNotImplemented } from "./client";
import type { SupportAgent } from "./identity-admin";

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
  guest_user_id?: string | null;
  guestUserId?: string | null;
  guest_name?: string | null;
  rating: number;
  comment?: string | null;
  created_at?: string;
  createdAt?: string;
  status?: string | null;
  listing_id?: string | null;
  listing_title?: string | null;
  listing?: { title?: string; host_user_id?: string } | null;
  media?: Array<{ asset_id?: string; assetId?: string }>;
}): Review {
  const rating = Number(row.rating) || 0;
  const raw = row.status?.toUpperCase();
  const status: Review["status"] =
    raw === "HIDDEN" || raw === "FLAGGED"
      ? "flagged"
      : raw === "REMOVED"
        ? "removed"
        : "published";
  const guestId = row.guest_user_id ?? row.guestUserId ?? undefined;
  return {
    id: row.id,
    guestName: row.guest_name?.trim() || (guestId ? guestId.slice(0, 8) : "—"),
    listingTitle:
      row.listing?.title ??
      row.listing_title ??
      (row.listing_id ? row.listing_id.slice(0, 8) : "—"),
    listingId: row.listing_id ?? undefined,
    hostName: row.listing?.host_user_id?.slice(0, 8) ?? "—",
    rating,
    comment: row.comment ?? "",
    createdAt: row.created_at ?? row.createdAt ?? "",
    status,
    sentiment: rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral",
    media: (row.media ?? [])
      .map((item) => item.asset_id ?? item.assetId)
      .filter((id): id is string => Boolean(id))
      .map((assetId) => ({ assetId })),
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
  hostUserId?: string;
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
  if (options?.hostUserId) params.set("hostUserId", options.hostUserId);

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

export async function fetchBookingsPage(options?: {
  status?: string;
  limit?: number;
  offset?: number;
  guestUserId?: string;
  hostUserId?: string;
}): Promise<{ items: Booking[]; total: number; limit: number; offset: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (options?.status && options.status !== "all") {
    params.set("status", options.status);
  }
  if (options?.guestUserId) params.set("guestUserId", options.guestUserId);
  if (options?.hostUserId) params.set("hostUserId", options.hostUserId);
  const data = await apiFetch<
    Paginated<Parameters<typeof mapBooking>[0]> & { limit?: number; offset?: number }
  >(`/admin/stays/bookings?${params.toString()}`);
  return {
    items: data.items.map(mapBooking),
    total: data.total,
    limit: data.limit ?? limit,
    offset: data.offset ?? offset,
  };
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

export type StaysPersonHostProfile = {
  id: string;
  userId: string;
  applicationStatus: string;
  hostVerificationStatus: string;
  identityStatus: string;
  city: string | null;
  listingFrozen: boolean;
  documentType: string | null;
  documentFrontAssetId: string | null;
  documentBackAssetId: string | null;
  selfieAssetId: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

export type StaysPersonCompactListing = {
  id: string;
  title: string;
  status: string;
  city: string;
  price: number;
  bookingCount: number;
  rating: number | null;
};

export type StaysPersonCompactBooking = {
  id: string;
  reference: string;
  status: string;
  checkinDate: string | null;
  checkoutDate: string | null;
  listingId: string;
  amount: number;
};

export type StaysPersonCompactTicket = {
  id: string;
  ticketNumber: string;
  status: string;
  subject: string;
  createdAt: string;
};

export type StaysPersonOverview = {
  userId: string;
  hostProfile: StaysPersonHostProfile | null;
  listings: {
    total: number;
    byStatus: Record<string, number>;
    items: StaysPersonCompactListing[];
  };
  bookingsAsHost: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    totalPayout: number;
    items: StaysPersonCompactBooking[];
  };
  bookingsAsGuest: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    totalPaid: number;
    items: StaysPersonCompactBooking[];
  };
  reviews: {
    asGuest: { written: number };
    asHost: { received: number; averageRating: number | null };
  };
  trust: {
    reportsMade: number;
    reportsAgainst: number;
    safetyIssuesMade: number;
    safetyIssuesAgainst: number;
  };
  tickets: {
    total: number;
    open: number;
    items: StaysPersonCompactTicket[];
  };
};

/** Stays operational half of Admin 360. Bounded latest items; full history via filtered list endpoints. */
export async function fetchStaysPerson(
  userId: string,
  init?: { signal?: AbortSignal },
): Promise<StaysPersonOverview> {
  return apiFetch<StaysPersonOverview>(
    `/admin/stays/people/${encodeURIComponent(userId)}`,
    { signal: init?.signal },
  );
}

export async function fetchReviews(options?: {
  guestUserId?: string;
  hostUserId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams({
    limit: String(options?.limit ?? 200),
    offset: String(options?.offset ?? 0),
  });
  if (options?.guestUserId) params.set("guestUserId", options.guestUserId);
  if (options?.hostUserId) params.set("hostUserId", options.hostUserId);
  if (options?.status) params.set("status", options.status);
  const data = await apiFetch<Paginated<Parameters<typeof mapReview>[0]>>(
    `/admin/stays/reviews?${params.toString()}`,
  );
  return (data.items ?? []).map(mapReview);
}

export async function fetchAuditLogs(options?: {
  actorUserId?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams({
    limit: String(options?.limit ?? 200),
    offset: String(options?.offset ?? 0),
  });
  if (options?.actorUserId) params.set("actorUserId", options.actorUserId);
  if (options?.entityId) params.set("entityId", options.entityId);
  const data = await apiFetch<Paginated<Parameters<typeof mapAuditLog>[0]>>(
    `/admin/stays/audit-logs?${params.toString()}`,
    { signal: options?.signal },
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

export async function fetchReviewMediaBlobUrl(
  reviewId: string,
  assetId: string,
): Promise<string> {
  const token = getAccessToken();
  const res = await fetch(
    `${apiConfig.staysBaseUrl}/admin/stays/reviews/${encodeURIComponent(reviewId)}/media/${encodeURIComponent(assetId)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to load review photo (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
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
  slaState?: "AT_RISK" | "BREACHED";
};

export type TicketsResult = {
  items: Ticket[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

function mapSla(row: unknown): SupportSlaPayload | undefined {
  const sla = asRecord(row);
  if (!sla) return undefined;
  const mapLeg = (leg: unknown) => {
    const l = asRecord(leg);
    if (!l) return undefined;
    return {
      targetAt: String(l.targetAt ?? l.target_at ?? ""),
      completedAt: (l.completedAt ?? l.completed_at ?? null) as string | null,
      state: String(l.state ?? "ON_TRACK") as SupportSlaPayload["firstResponse"]["state"],
    };
  };
  const firstResponse = mapLeg(sla.firstResponse ?? sla.first_response);
  const resolution = mapLeg(sla.resolution);
  if (!firstResponse || !resolution) return undefined;
  return { firstResponse, resolution };
}

function mapTicketCsat(row: Record<string, unknown> | null | undefined): TicketCsat | undefined {
  const csatRow = asRecord(row);
  if (!csatRow) return undefined;
  const agentRatingRaw = csatRow.agent_rating ?? csatRow.agentRating;
  const agentIdRaw = csatRow.agent_id ?? csatRow.agentId;
  const solvedRaw = csatRow.problem_solved ?? csatRow.problemSolved;
  return {
    rating: Number(csatRow.rating ?? 0),
    comment: (csatRow.comment as string | null | undefined) ?? null,
    submittedAt: String(csatRow.submitted_at ?? csatRow.submittedAt ?? ""),
    agentRating:
      agentRatingRaw == null || agentRatingRaw === ""
        ? null
        : Number(agentRatingRaw),
    agentId: agentIdRaw == null || agentIdRaw === "" ? null : String(agentIdRaw),
    problemSolved:
      solvedRaw == null || solvedRaw === ""
        ? null
        : Boolean(solvedRaw),
  };
}

function mapTicket(row: Record<string, unknown>): Ticket {
  const routing = asRecord(row.routing_suggestion ?? row.routingSuggestion);
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
    closedAt: (row.closed_at ?? row.closedAt) as string | undefined,
    firstAdminResponseAt: (row.first_admin_response_at ??
      row.firstAdminResponseAt) as string | undefined,
    bookingId: (row.booking_id ?? row.bookingId) as string | undefined,
    bookingRef: (row.booking_reference ?? row.bookingRef) as string | undefined,
    listingId: (row.listing_id ?? row.listingId) as string | undefined,
    reportId: (row.report_id ?? row.reportId) as string | undefined,
    safetyIssueId: (row.safety_issue_id ?? row.safetyIssueId) as string | undefined,
    unreadForSupport: Boolean(row.unread_for_support ?? row.unreadForSupport),
    lastMessagePreview: (row.last_message_preview ?? row.lastMessagePreview) as
      | string
      | undefined,
    conversationId: (row.conversation_id ?? row.conversationId) as string | undefined,
    requesterUserId: (row.requester_user_id ?? row.requesterUserId) as
      | string
      | undefined,
    sla: mapSla(row.sla),
    routingSuggestion: routing
      ? {
          suggestedPriority: String(
            routing.suggestedPriority ?? routing.suggested_priority ?? "NORMAL",
          ) as Ticket["priority"],
          reason: String(routing.reason ?? ""),
        }
      : undefined,
    csat:
      row.csat === null ? null : mapTicketCsat(asRecord(row.csat)),
    reviewAgentId: (row.review_agent_id ?? row.reviewAgentId) as
      | string
      | null
      | undefined,
    reviewAgentName: (row.review_agent_name ?? row.reviewAgentName) as
      | string
      | null
      | undefined,
    operationalSignalTypes: Array.isArray(row.operational_signal_types)
      ? (row.operational_signal_types as string[])
      : Array.isArray(row.operationalSignalTypes)
        ? (row.operationalSignalTypes as string[])
        : [],
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
  if (query.slaState) params.set("slaState", query.slaState);
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

export type SupportReviewsQuery = {
  limit?: number;
  offset?: number;
  problemSolved?: boolean;
  maxRating?: number;
  search?: string;
};

export type SupportReviewsResult = {
  items: SupportCsatReview[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

function mapSupportCsatReview(row: Record<string, unknown>): SupportCsatReview {
  const agentRatingRaw = row.agent_rating ?? row.agentRating;
  const solvedRaw = row.problem_solved ?? row.problemSolved;
  const reviewAgentId = row.review_agent_id ?? row.reviewAgentId;
  const reviewAgentName = row.review_agent_name ?? row.reviewAgentName;
  return {
    ticketId: String(row.ticket_id ?? row.ticketId ?? ""),
    ticketNumber: String(row.ticket_number ?? row.ticketNumber ?? ""),
    status: String(row.status ?? ""),
    customerName: ((row.customer_name ?? row.customerName) as string | null) ?? null,
    rating: Number(row.rating ?? 0),
    agentRating:
      agentRatingRaw == null || agentRatingRaw === ""
        ? null
        : Number(agentRatingRaw),
    problemSolved:
      solvedRaw == null || solvedRaw === "" ? null : Boolean(solvedRaw),
    comment: (row.comment as string | null | undefined) ?? null,
    submittedAt: String(row.submitted_at ?? row.submittedAt ?? ""),
    reviewAgentId:
      reviewAgentId == null || reviewAgentId === ""
        ? null
        : String(reviewAgentId),
    reviewAgentName:
      reviewAgentName == null || reviewAgentName === ""
        ? null
        : String(reviewAgentName),
  };
}

export async function fetchSupportReviews(
  query: SupportReviewsQuery = {},
): Promise<SupportReviewsResult> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(query.limit ?? 50, 1), 100)));
  params.set("offset", String(Math.max(query.offset ?? 0, 0)));
  if (query.problemSolved === true) params.set("problemSolved", "true");
  if (query.problemSolved === false) params.set("problemSolved", "false");
  if (query.maxRating != null) params.set("maxRating", String(query.maxRating));
  if (query.search?.trim()) params.set("search", query.search.trim());
  const data = await apiFetch<{
    items?: Record<string, unknown>[];
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  }>(`/admin/stays/support/reviews?${params}`);
  const items = (data.items ?? []).map(mapSupportCsatReview);
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

function mapSupportContact(value: unknown): SupportPartyContact | null {
  const row = asRecord(value);
  if (!row?.id) return null;
  return {
    id: String(row.id),
    name: (row.name as string | null | undefined) ?? null,
    email: (row.email as string | null | undefined) ?? null,
    phone: (row.phone as string | null | undefined) ?? null,
  };
}

function mapOperationalSignal(row: Record<string, unknown>): OperationalSignal {
  const reason = asRecord(row.reason) ?? {};
  return {
    id: String(row.id ?? ""),
    type: String(row.type ?? row.signal_type ?? ""),
    severity: String(row.severity ?? "INFO") as OperationalSignal["severity"],
    status: String(row.status ?? "ACTIVE") as OperationalSignal["status"],
    reason: {
      code: String(reason.code ?? ""),
      explanation: String(reason.explanation ?? ""),
    },
    firstDetectedAt: String(row.firstDetectedAt ?? row.first_detected_at ?? ""),
    lastDetectedAt: String(row.lastDetectedAt ?? row.last_detected_at ?? ""),
    ticketId: (row.ticketId ?? row.ticket_id) as string | null | undefined,
  };
}

function mapSignalList(value: unknown): OperationalSignal[] {
  if (!Array.isArray(value)) return [];
  return (value as Record<string, unknown>[]).map(mapOperationalSignal);
}

function mapRelatedTickets(value: unknown): RelatedSupportTicket[] {
  if (!Array.isArray(value)) return [];
  return (value as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ""),
    ticketNumber: String(row.ticketNumber ?? row.ticket_number ?? ""),
    status: String(row.status ?? ""),
    priority: String(row.priority ?? ""),
    relationship: String(row.relationship ?? ""),
  }));
}

export async function fetchTicket(ticketId: string): Promise<TicketDetail> {
  const row = await apiFetch<Record<string, unknown>>(`/admin/stays/support/tickets/${ticketId}`);
  const listing = asRecord(row.listing);
  const report = asRecord(row.report);
  const safety = asRecord(row.safetyIssue ?? row.safety_issue);
  const host = mapSupportContact(row.host) ?? mapSupportContact(listing?.host);
  const guest = mapSupportContact(row.guest);
  const reporter = mapSupportContact(row.reporter);
  const checkIn = asRecord(
    listing?.check_in_contact ?? listing?.checkInContact,
  );
  const csatRow = asRecord(row.csat);
  const csat: TicketCsat | null | undefined = csatRow
    ? mapTicketCsat(csatRow)
    : row.csat === null
      ? null
      : undefined;
  return {
    ...mapTicket(row),
    conversationId: (row.conversationId ?? row.conversation_id) as string | undefined,
    listingTitle: (listing?.title ?? row.listing_title) as string | undefined,
    hostUserId: (host?.id ?? listing?.hostUserId ?? listing?.host_user_id) as
      | string
      | undefined,
    host,
    guest,
    reporter,
    listing: listing
      ? {
          id: String(listing.id ?? ""),
          title: listing.title as string | undefined,
          hostUserId: (listing.hostUserId ?? listing.host_user_id) as string | undefined,
          city: listing.city as string | undefined,
          address: (listing.address as string | null | undefined) ?? null,
          host: host ?? undefined,
          checkInContact: checkIn
            ? {
                name: (checkIn.name as string | null | undefined) ?? null,
                phone: (checkIn.phone as string | null | undefined) ?? null,
                role: (checkIn.role as string | null | undefined) ?? null,
              }
            : null,
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
    csat,
    signals: mapSignalList(row.signals),
    relatedTickets: mapRelatedTickets(row.related_tickets ?? row.relatedTickets),
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
): Promise<Ticket> {
  const row = await apiFetch<Record<string, unknown>>(
    `/admin/stays/support/tickets/${ticketId}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return mapTicket(row);
}

export type SupportAgentWorkload = {
  agentId: string;
  assigned: number;
  open: number;
  inProgress: number;
  waiting: number;
  atRisk: number;
  breached: number;
  oldestActiveTicketAt: string | null;
  reviewCount: number;
  averageAgentRating: number | null;
};

export type SupportAgentWithWorkload = SupportAgent & {
  assigned: number;
  open: number;
  inProgress: number;
  waiting: number;
  atRisk: number;
  breached: number;
  oldestActiveTicketAt: string | null;
  reviewCount: number;
  averageAgentRating: number | null;
};

export function joinSupportAgentsWithWorkload(
  agents: SupportAgent[],
  workload: SupportAgentWorkload[],
): SupportAgentWithWorkload[] {
  const byId = new Map(workload.map((row) => [row.agentId, row]));
  return agents.map((agent) => {
    const row = byId.get(agent.id);
    return {
      ...agent,
      assigned: row?.assigned ?? 0,
      open: row?.open ?? 0,
      inProgress: row?.inProgress ?? 0,
      waiting: row?.waiting ?? 0,
      atRisk: row?.atRisk ?? 0,
      breached: row?.breached ?? 0,
      oldestActiveTicketAt: row?.oldestActiveTicketAt ?? null,
      reviewCount: row?.reviewCount ?? 0,
      averageAgentRating: row?.averageAgentRating ?? null,
    };
  });
}

export async function fetchSupportAgentWorkload(): Promise<SupportAgentWorkload[]> {
  const data = await apiFetch<{
    items?: Array<{
      agentId?: string;
      agent_id?: string;
      assigned?: number;
      open?: number;
      inProgress?: number;
      in_progress?: number;
      waiting?: number;
      atRisk?: number;
      at_risk?: number;
      breached?: number;
      oldestActiveTicketAt?: string | null;
      oldest_active_ticket_at?: string | null;
      reviewCount?: number;
      review_count?: number;
      averageAgentRating?: number | null;
      average_agent_rating?: number | null;
    }>;
  }>("/admin/stays/support/agents/workload");
  return (data.items ?? []).map((row) => ({
    agentId: String(row.agentId ?? row.agent_id ?? ""),
    assigned: Number(row.assigned ?? 0),
    open: Number(row.open ?? 0),
    inProgress: Number(row.inProgress ?? row.in_progress ?? 0),
    waiting: Number(row.waiting ?? 0),
    atRisk: Number(row.atRisk ?? row.at_risk ?? 0),
    breached: Number(row.breached ?? 0),
    oldestActiveTicketAt: (row.oldestActiveTicketAt ??
      row.oldest_active_ticket_at ??
      null) as string | null,
    reviewCount: Number(row.reviewCount ?? row.review_count ?? 0),
    averageAgentRating:
      row.averageAgentRating != null
        ? Number(row.averageAgentRating)
        : row.average_agent_rating != null
          ? Number(row.average_agent_rating)
          : null,
  }));
}

function mapCannedReply(row: Record<string, unknown>): CannedReply {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    category: (row.category as string | null | undefined) ?? null,
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ""),
  };
}

export async function fetchCannedReplies(
  includeInactive = false,
): Promise<CannedReply[]> {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  const qs = params.toString();
  const data = await apiFetch<{ items?: Record<string, unknown>[] }>(
    `/admin/stays/support/canned-replies${qs ? `?${qs}` : ""}`,
  );
  return (data.items ?? []).map(mapCannedReply);
}

export async function fetchSupportAnalytics(query: {
  from?: string;
  to?: string;
} = {}): Promise<SupportAnalytics> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const qs = params.toString();
  const data = await apiFetch<Record<string, unknown>>(
    `/admin/stays/support/analytics${qs ? `?${qs}` : ""}`,
  );
  const tickets = asRecord(data.tickets) ?? {};
  const response = asRecord(data.response) ?? {};
  const firstResolution = asRecord(data.firstResolution ?? data.first_resolution) ?? {};
  const closure = asRecord(data.closure) ?? {};
  const sla = asRecord(data.sla) ?? {};
  const fr = asRecord(sla.firstResponse ?? sla.first_response) ?? {};
  const fres = asRecord(sla.firstResolution ?? sla.first_resolution) ?? {};
  const csat = asRecord(data.csat) ?? {};
  const dist = asRecord(csat.ratingDistribution ?? csat.rating_distribution) ?? {};
  return {
    from: String(data.from ?? ""),
    to: String(data.to ?? ""),
    tickets: {
      created: Number(tickets.created ?? 0),
      open: Number(tickets.open ?? 0),
      resolved: Number(tickets.resolved ?? 0),
      closed: Number(tickets.closed ?? 0),
      escalated: Number(tickets.escalated ?? 0),
    },
    response: {
      averageFirstResponseSeconds:
        response.averageFirstResponseSeconds != null
          ? Number(response.averageFirstResponseSeconds)
          : response.average_first_response_seconds != null
            ? Number(response.average_first_response_seconds)
            : null,
      medianFirstResponseSeconds:
        response.medianFirstResponseSeconds != null
          ? Number(response.medianFirstResponseSeconds)
          : response.median_first_response_seconds != null
            ? Number(response.median_first_response_seconds)
            : null,
    },
    firstResolution: {
      averageSeconds:
        firstResolution.averageSeconds != null
          ? Number(firstResolution.averageSeconds)
          : firstResolution.average_seconds != null
            ? Number(firstResolution.average_seconds)
            : null,
      medianSeconds:
        firstResolution.medianSeconds != null
          ? Number(firstResolution.medianSeconds)
          : firstResolution.median_seconds != null
            ? Number(firstResolution.median_seconds)
            : null,
    },
    closure: {
      averageSeconds:
        closure.averageSeconds != null
          ? Number(closure.averageSeconds)
          : closure.average_seconds != null
            ? Number(closure.average_seconds)
            : null,
      medianSeconds:
        closure.medianSeconds != null
          ? Number(closure.medianSeconds)
          : closure.median_seconds != null
            ? Number(closure.median_seconds)
            : null,
    },
    sla: {
      firstResponse: {
        onTrack: Number(fr.onTrack ?? fr.on_track ?? 0),
        atRisk: Number(fr.atRisk ?? fr.at_risk ?? 0),
        breached: Number(fr.breached ?? 0),
      },
      firstResolution: {
        onTrack: Number(fres.onTrack ?? fres.on_track ?? 0),
        atRisk: Number(fres.atRisk ?? fres.at_risk ?? 0),
        breached: Number(fres.breached ?? 0),
      },
    },
    csat: {
      responses: Number(csat.responses ?? 0),
      averageRating:
        csat.averageRating != null
          ? Number(csat.averageRating)
          : csat.average_rating != null
            ? Number(csat.average_rating)
            : null,
      ratingDistribution: {
        "1": Number(dist["1"] ?? 0),
        "2": Number(dist["2"] ?? 0),
        "3": Number(dist["3"] ?? 0),
        "4": Number(dist["4"] ?? 0),
        "5": Number(dist["5"] ?? 0),
      },
    },
    categories: Array.isArray(data.categories)
      ? (data.categories as Record<string, unknown>[]).map((r) => ({
          category: String(r.category ?? ""),
          count: Number(r.count ?? 0),
        }))
      : [],
    priorities: Array.isArray(data.priorities)
      ? (data.priorities as Record<string, unknown>[]).map((r) => ({
          priority: String(r.priority ?? ""),
          count: Number(r.count ?? 0),
        }))
      : [],
    statusDistribution: Array.isArray(data.statusDistribution ?? data.status_distribution)
      ? ((data.statusDistribution ?? data.status_distribution) as Record<string, unknown>[]).map(
          (r) => ({
            status: String(r.status ?? ""),
            count: Number(r.count ?? 0),
          }),
        )
      : [],
    assignment: {
      assigned: Number(
        asRecord(data.assignment)?.assigned ?? asRecord(data.assignment)?.assigned_count ?? 0,
      ),
      unassigned: Number(
        asRecord(data.assignment)?.unassigned ??
          asRecord(data.assignment)?.unassigned_count ??
          0,
      ),
    },
    volume: Array.isArray(data.volume)
      ? (data.volume as Record<string, unknown>[]).map((r) => ({
          date: String(r.date ?? ""),
          created: Number(r.created ?? 0),
          closed: Number(r.closed ?? 0),
        }))
      : [],
  };
}

export async function fetchSupportOperationsOverview(): Promise<SupportOperationsOverview> {
  const data = await apiFetch<Record<string, unknown>>(
    "/admin/stays/support/operations/overview",
  );
  const workload = Array.isArray(data.agentWorkload)
    ? data.agentWorkload
    : Array.isArray(data.agent_workload)
      ? data.agent_workload
      : [];
  return {
    activeTickets: Number(data.activeTickets ?? data.active_tickets ?? 0),
    openTickets: Number(data.openTickets ?? data.open_tickets ?? 0),
    inProgressTickets: Number(
      data.inProgressTickets ?? data.in_progress_tickets ?? 0,
    ),
    waitingTickets: Number(data.waitingTickets ?? data.waiting_tickets ?? 0),
    escalatedTickets: Number(data.escalatedTickets ?? data.escalated_tickets ?? 0),
    unassignedTickets: Number(data.unassignedTickets ?? data.unassigned_tickets ?? 0),
    highPriorityTickets: Number(
      data.highPriorityTickets ?? data.high_priority_tickets ?? 0,
    ),
    highPriorityUnassigned: Number(
      data.highPriorityUnassigned ?? data.high_priority_unassigned ?? 0,
    ),
    urgentTickets: Number(data.urgentTickets ?? data.urgent_tickets ?? 0),
    slaOnTrack: Number(data.slaOnTrack ?? data.sla_on_track ?? 0),
    slaAtRisk: Number(data.slaAtRisk ?? data.sla_at_risk ?? 0),
    slaBreached: Number(data.slaBreached ?? data.sla_breached ?? 0),
    activeSignals: Number(data.activeSignals ?? data.active_signals ?? 0),
    acknowledgedSignals: Number(
      data.acknowledgedSignals ?? data.acknowledged_signals ?? 0,
    ),
    generatedAt: String(data.generatedAt ?? data.generated_at ?? ""),
    agentWorkload: (workload as Record<string, unknown>[]).map((row) => ({
      adminId: String(row.adminId ?? row.admin_id ?? ""),
      openTickets: Number(row.openTickets ?? row.open_tickets ?? 0),
      highPriorityTickets: Number(
        row.highPriorityTickets ?? row.high_priority_tickets ?? 0,
      ),
      waitingTickets: Number(row.waitingTickets ?? row.waiting_tickets ?? 0),
    })),
  };
}

export async function fetchSupportAttention(query: {
  limit?: number;
  offset?: number;
} = {}): Promise<SupportAttentionResult> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(query.limit ?? 20, 1), 50)));
  params.set("offset", String(Math.max(query.offset ?? 0, 0)));
  const data = await apiFetch<{
    items?: Record<string, unknown>[];
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  }>(`/admin/stays/support/operations/attention?${params}`);
  const items = (data.items ?? []).map((row) => ({
    ticketId: String(row.ticketId ?? row.ticket_id ?? row.id ?? ""),
    ticketNumber: String(row.ticketNumber ?? row.ticket_number ?? ""),
    subject: String(row.subject ?? ""),
    status: String(row.status ?? ""),
    priority: String(row.priority ?? ""),
    assignedAdminId: (row.assignedAdminId ??
      row.assigned_admin_id ??
      null) as string | null,
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    attentionReasons: Array.isArray(row.attentionReasons ?? row.attention_reasons)
      ? ((row.attentionReasons ?? row.attention_reasons) as unknown[]).map(String)
      : [],
  }));
  const limit = Number(data.limit ?? query.limit ?? 20);
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

export async function fetchSupportSignals(query: {
  limit?: number;
  offset?: number;
  status?: string;
  includeResolved?: boolean;
} = {}): Promise<{ items: OperationalSignal[]; total: number }> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(query.limit ?? 50, 1), 100)));
  params.set("offset", String(Math.max(query.offset ?? 0, 0)));
  if (query.status) params.set("status", query.status);
  if (query.includeResolved) params.set("includeResolved", "true");
  const data = await apiFetch<{
    items?: Record<string, unknown>[];
    total?: number;
  }>(`/admin/stays/support/signals?${params}`);
  return {
    items: (data.items ?? []).map(mapOperationalSignal),
    total: Number(data.total ?? data.items?.length ?? 0),
  };
}

export async function patchOperationalSignal(
  id: string,
  status: "ACKNOWLEDGED" | "RESOLVED",
): Promise<OperationalSignal> {
  const row = await apiFetch<Record<string, unknown>>(
    `/admin/stays/support/signals/${id}`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
  return mapOperationalSignal(row);
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
  userId?: string;
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
    operationalSignals: mapSignalList(row.operational_signals ?? row.operationalSignals),
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
  if (query.userId) params.set("userId", query.userId);
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
