import type { AppUser, Booking, KycStatus, UserStatus } from "../types";
import { apiFetch } from "./client";
import { fetchHosts } from "./stays-admin";

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

type ApiIdentityUser = {
  id: string;
  phone_number?: string | null;
  full_name?: string | null;
  email?: string | null;
  city?: string | null;
  account_type?: string;
  kyc_status?: string;
  account_status?: string;
  created_at?: string;
  last_login_at?: string | null;
};

type IdentityUsersResponse = {
  data: ApiIdentityUser[];
  total: number;
};

const STAYS_ACCOUNT_TYPES = new Set(["CONSUMER", "HOST"]);

function mapKyc(status?: string): KycStatus {
  switch (status?.toUpperCase()) {
    case "VERIFIED":
    case "APPROVED":
      return "verified";
    case "REJECTED":
      return "rejected";
    case "PENDING":
    case "SUBMITTED":
    case "IN_REVIEW":
      return "pending";
    default:
      return "unverified";
  }
}

function mapAccountStatus(status?: string): UserStatus {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "FROZEN":
    case "SUSPENDED":
      return "suspended";
    case "BANNED":
    case "BLOCKED":
    case "TERMINATED":
      return "banned";
    case "PENDING":
      return "pending";
    default:
      return "active";
  }
}

function mapIdentityUser(row: ApiIdentityUser): AppUser {
  const accountType = row.account_type || "CONSUMER";
  return {
    id: row.id,
    name: row.full_name?.trim() || row.phone_number || row.id.slice(0, 8),
    email: row.email?.trim() || "—",
    phone: row.phone_number ?? "—",
    role: accountType === "HOST" ? "host" : "guest",
    status: mapAccountStatus(row.account_status),
    kyc: mapKyc(row.kyc_status),
    city: row.city?.trim() || "—",
    joinedAt: row.created_at ?? "",
    lastActiveAt: row.last_login_at ?? row.created_at ?? "",
    avatarColor: thumbColor(row.id),
  };
}

async function fetchIdentityUsers(): Promise<AppUser[]> {
  const res = await apiFetch<IdentityUsersResponse>(
    "/admin/users?limit=200",
    { base: "identity" },
  );
  return res.data
    .filter((row) => STAYS_ACCOUNT_TYPES.has(row.account_type || "CONSUMER"))
    .map(mapIdentityUser);
}

function mergeHostOverlay(user: AppUser, host: AppUser): AppUser {
  const kycRank: Record<KycStatus, number> = {
    verified: 3,
    pending: 2,
    rejected: 1,
    unverified: 0,
  };
  const kyc =
    kycRank[host.kyc] > kycRank[user.kyc] ? host.kyc : user.kyc;

  return {
    ...user,
    hostProfileId: host.hostProfileId,
    role: user.role === "guest" ? "host" : user.role,
    status: host.status === "pending" ? "pending" : user.status,
    kyc,
    city: host.city !== "—" ? host.city : user.city,
    listingsCount: host.listingsCount,
    joinedAt: user.joinedAt || host.joinedAt,
    lastActiveAt: host.lastActiveAt || user.lastActiveAt,
  };
}

/** Identity guests/hosts merged with Stays host profiles. */
export async function fetchUsers(): Promise<AppUser[]> {
  const [identityUsers, hosts] = await Promise.all([
    fetchIdentityUsers(),
    fetchHosts().catch(() => [] as AppUser[]),
  ]);

  const hostByUserId = new Map(hosts.map((h) => [h.id, h]));
  const seen = new Set<string>();
  const merged: AppUser[] = [];

  for (const user of identityUsers) {
    seen.add(user.id);
    const host = hostByUserId.get(user.id);
    merged.push(host ? mergeHostOverlay(user, host) : user);
  }

  for (const host of hosts) {
    if (!seen.has(host.id)) {
      merged.push(host);
    }
  }

  return merged.sort(
    (a, b) =>
      new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime(),
  );
}

export type UserActivityEvent = {
  label: string;
  at: string;
};

export type UserDrawerDetails = {
  timeline: UserActivityEvent[];
  listingsCount: number;
  bookingsCount: number;
  guestBookingsCount: number;
  earnings: number;
};

type AuditLogRow = {
  action: string;
  created_at: string;
};

type KycProfileRow = {
  status?: string;
  reviewed_at?: string | null;
  created_at?: string;
};

function formatAuditAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildTimeline(
  user: AppUser,
  kyc: KycProfileRow | null,
  auditLogs: AuditLogRow[],
  guestBookings: { listingTitle: string; status: string; createdAt: string }[],
  hostBookings: { listingTitle: string; status: string; createdAt: string }[],
): UserActivityEvent[] {
  const events: UserActivityEvent[] = [];

  for (const log of auditLogs) {
    if (!log.created_at) continue;
    events.push({
      label: formatAuditAction(log.action),
      at: log.created_at,
    });
  }

  for (const b of guestBookings) {
    events.push({
      label: `Guest booking ${b.status}: ${b.listingTitle}`,
      at: b.createdAt,
    });
  }

  for (const b of hostBookings) {
    events.push({
      label: `Host booking ${b.status}: ${b.listingTitle}`,
      at: b.createdAt,
    });
  }

  const kycVerifiedAt =
    kyc?.reviewed_at ||
    (user.kyc === "verified" ? kyc?.created_at : undefined);
  if (user.kyc === "verified" && kycVerifiedAt) {
    events.push({ label: "KYC verified", at: kycVerifiedAt });
  } else if (user.kyc === "pending") {
    events.push({
      label: "KYC submitted — pending review",
      at: kyc?.created_at || user.joinedAt,
    });
  }

  if (user.lastActiveAt && user.lastActiveAt !== user.joinedAt) {
    const location = user.city !== "—" ? ` (${user.city})` : "";
    events.push({
      label: `Last login${location}`,
      at: user.lastActiveAt,
    });
  }

  if (user.joinedAt) {
    events.push({ label: "Account created", at: user.joinedAt });
  }

  const seen = new Set<string>();
  return events
    .filter((e) => {
      const key = `${e.label}|${e.at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(e.at);
    })
    .sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    )
    .slice(0, 12);
}

/** Real profile stats + activity for the user detail drawer. */
export async function fetchUserDrawerDetails(
  user: AppUser,
): Promise<UserDrawerDetails> {
  const { fetchBookings, fetchListings } = await import("./stays-admin");

  const [auditLogs, kyc, bookings, listings] = await Promise.all([
    apiFetch<AuditLogRow[]>(
      `/admin/audit/logs?user_id=${encodeURIComponent(user.id)}&limit=20`,
      { base: "identity" },
    ).catch(() => [] as AuditLogRow[]),
    apiFetch<KycProfileRow>(
      `/admin/users/${encodeURIComponent(user.id)}/kyc`,
      { base: "identity" },
    ).catch(() => null),
    fetchBookings().catch(() => []),
    fetchListings().catch(() => []),
  ]);

  type BookingSlice = Pick<
    Booking,
    "guestUserId" | "hostUserId" | "listingTitle" | "status" | "createdAt" | "total"
  >;

  const guestBookings = (bookings as BookingSlice[]).filter(
    (b) => b.guestUserId === user.id,
  );
  const hostBookings = (bookings as BookingSlice[]).filter(
    (b) => b.hostUserId === user.id,
  );
  const userListings = listings.filter((l) => l.hostId === user.id);

  const hostEarnings = hostBookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + (b.total || 0), 0);

  return {
    timeline: buildTimeline(
      user,
      kyc,
      auditLogs,
      guestBookings,
      hostBookings,
    ),
    listingsCount: userListings.length,
    bookingsCount: guestBookings.length + hostBookings.length,
    guestBookingsCount: guestBookings.length,
    earnings: hostEarnings,
  };
}
