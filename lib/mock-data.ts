import type {
  AppUser,
  Listing,
  Booking,
  Review,
  Ticket,
  RiskFlag,
  KycRecord,
  AuditLog,
  ActivityEvent,
  RolePermission,
} from "./types";

const CITIES = [
  "Marrakech",
  "Casablanca",
  "Tangier",
  "Rabat",
  "Fes",
  "Agadir",
  "Essaouira",
  "Chefchaouen",
];

const AVATAR_COLORS = [
  "#E8507A",
  "#F9A86C",
  "#4A7FE0",
  "#3DAA84",
  "#C93A62",
  "#9E8A93",
  "#E3A008",
];

const FIRST = [
  "Yasmine",
  "Omar",
  "Salma",
  "Youssef",
  "Nadia",
  "Karim",
  "Leila",
  "Hamza",
  "Amine",
  "Sara",
  "Mehdi",
  "Imane",
  "Rania",
  "Bilal",
  "Sofia",
  "Anas",
  "Hana",
  "Reda",
  "Lina",
  "Zakaria",
];
const LAST = [
  "Benali",
  "El Amrani",
  "Cherkaoui",
  "Bennani",
  "Idrissi",
  "Alaoui",
  "Tazi",
  "Fassi",
  "Berrada",
  "Sabri",
  "Ouazzani",
  "Lahlou",
];

const PROPERTY_TYPES = [
  "Riad",
  "Apartment",
  "Villa",
  "Studio",
  "Guesthouse",
  "Loft",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60000).toISOString();
}

// ---------- Users ----------
export const users: AppUser[] = Array.from({ length: 48 }).map((_, i) => {
  const name = `${pick(FIRST, i)} ${pick(LAST, i * 3)}`;
  const isHost = i % 3 === 0;
  const isBoth = i % 7 === 0;
  const role = isBoth ? "both" : isHost ? "host" : "guest";
  const statusRoll = i % 11;
  const status =
    statusRoll === 0
      ? "suspended"
      : statusRoll === 5
        ? "banned"
        : statusRoll === 8
          ? "pending"
          : "active";
  const kycRoll = i % 5;
  const kyc =
    role === "guest" && kycRoll > 2
      ? "unverified"
      : kycRoll === 0
        ? "pending"
        : kycRoll === 4
          ? "rejected"
          : "verified";
  return {
    id: `USR-${1000 + i}`,
    name,
    email: `${name.split(" ")[0].toLowerCase()}.${i}@mail.ma`,
    phone: `+212 6${(10000000 + i * 137).toString().slice(0, 8)}`,
    role,
    status,
    kyc,
    city: pick(CITIES, i),
    joinedAt: daysAgo(3 + i * 7),
    lastActiveAt: daysAgo(i % 14),
    avatarColor: pick(AVATAR_COLORS, i),
    ...(role !== "guest"
      ? {
          listingsCount: 1 + (i % 5),
          rating: 4 + ((i % 10) / 10),
          reviewsCount: 5 + i * 2,
          earnings: 12000 + i * 3400,
          bookingsCount: 8 + i * 3,
        }
      : { bookingsCount: i % 6 }),
  };
});

const hosts = users.filter((u) => u.role !== "guest");

// ---------- Listings ----------
const LISTING_TITLES = [
  "Sunlit Riad with Rooftop Pool",
  "Modern Medina Apartment",
  "Ocean View Villa",
  "Cozy Studio Near Souks",
  "Atlas Mountain Guesthouse",
  "Design Loft Downtown",
  "Traditional Riad Retreat",
  "Beachfront Family Home",
  "Bohemian Blue House",
  "Palm Grove Villa",
  "Boutique City Flat",
  "Garden Courtyard Riad",
];

export const listings: Listing[] = Array.from({ length: 36 }).map((_, i) => {
  const host = pick(hosts, i);
  const statusRoll = i % 9;
  const status =
    statusRoll === 0
      ? "pending"
      : statusRoll === 3
        ? "flagged"
        : statusRoll === 6
          ? "suspended"
          : statusRoll === 8
            ? "rejected"
            : "active";
  const flags: string[] = [];
  if (status === "flagged") {
    flags.push(pick(["Possible duplicate", "Low image quality", "Spam keywords"], i));
  }
  if (i % 13 === 0) flags.push("Price anomaly");
  return {
    id: `LST-${2000 + i}`,
    title: pick(LISTING_TITLES, i),
    hostId: host.id,
    hostName: host.name,
    city: pick(CITIES, i),
    address: `${10 + i} Rue ${pick(LAST, i)}, ${pick(CITIES, i)}`,
    type: pick(PROPERTY_TYPES, i),
    status,
    pricePerNight: 350 + (i % 12) * 180,
    rating: 4.1 + ((i % 9) / 10),
    reviewsCount: 3 + i * 2,
    bookingsCount: 4 + i * 3,
    occupancy: 45 + (i % 50),
    bedrooms: 1 + (i % 5),
    guests: 2 + (i % 6),
    createdAt: daysAgo(2 + i * 5),
    photos: 5 + (i % 20),
    flags,
    thumbnailColor: pick(AVATAR_COLORS, i + 2),
  };
});

// ---------- Bookings ----------
export const bookings: Booking[] = Array.from({ length: 60 }).map((_, i) => {
  const listing = pick(listings, i);
  const guest = pick(
    users.filter((u) => u.role === "guest" || u.role === "both"),
    i,
  );
  const statusRoll = i % 8;
  const status =
    statusRoll === 0 || statusRoll === 1
      ? "pending"
      : statusRoll === 6
        ? "cancelled"
        : statusRoll === 7
          ? "completed"
          : "confirmed";
  const nights = 2 + (i % 10);
  const checkInDays = status === "completed" ? -(i % 20) - 5 : (i % 40) + 3;
  return {
    id: `BKG-${5000 + i}`,
    reference: `NX${(70000 + i * 13).toString()}`,
    guestName: guest.name,
    hostName: listing.hostName,
    listingTitle: listing.title,
    city: listing.city,
    checkIn: daysAgo(-checkInDays),
    checkOut: daysAgo(-checkInDays - nights),
    nights,
    guests: 1 + (i % 5),
    total: listing.pricePerNight * nights,
    status,
    createdAt: daysAgo(i % 30),
    cancellationReason:
      status === "cancelled"
        ? pick(
            [
              "Guest changed plans",
              "Host unavailable",
              "Payment failed",
              "Found alternative",
            ],
            i,
          )
        : undefined,
  };
});

// ---------- Reviews ----------
const REVIEW_TEXTS = [
  "Amazing stay, the host was incredibly welcoming and the place was spotless.",
  "Great location but the photos were a bit misleading about the size.",
  "Perfect riad, would definitely come back. Rooftop was a dream.",
  "Check-in was smooth and the neighborhood felt very safe.",
  "Cleanliness could be improved, but overall a decent value.",
  "Absolutely stunning views and impeccable service throughout.",
  "The listing does not match reality — avoid this one.",
  "Wonderful family trip, kids loved the pool.",
];

export const reviews: Review[] = Array.from({ length: 40 }).map((_, i) => {
  const booking = pick(bookings, i);
  const rating = 2 + (i % 4);
  const statusRoll = i % 12;
  const status =
    statusRoll === 2 ? "flagged" : statusRoll === 9 ? "removed" : "published";
  return {
    id: `RVW-${8000 + i}`,
    guestName: booking.guestName,
    listingTitle: booking.listingTitle,
    hostName: booking.hostName,
    rating,
    comment: pick(REVIEW_TEXTS, i),
    createdAt: daysAgo(i % 25),
    status,
    sentiment: rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative",
    flagReason:
      status === "flagged"
        ? pick(["Abusive language", "Spam / promotional", "Off-topic"], i)
        : undefined,
  };
});

// ---------- Tickets ----------
export const tickets: Ticket[] = Array.from({ length: 24 }).map((_, i) => {
  const types = [
    "guest_complaint",
    "host_complaint",
    "booking_dispute",
  ] as const;
  const statuses = ["open", "in_progress", "resolved", "escalated"] as const;
  const priorities = ["low", "medium", "high", "urgent"] as const;
  const subjects = [
    "Refund not processed after cancellation",
    "Property not as described",
    "Guest damaged furniture",
    "Double booking conflict",
    "Host not responding to messages",
    "Cleaning fee dispute",
    "Early check-in denied",
    "Security deposit not returned",
  ];
  return {
    id: `TKT-${3000 + i}`,
    subject: pick(subjects, i),
    type: pick([...types], i),
    requester: pick(users, i).name,
    assignee: i % 4 === 0 ? undefined : pick(["Ops Team", "Sana K.", "Reda B."], i),
    status: pick([...statuses], i),
    priority: pick([...priorities], i),
    createdAt: daysAgo(i % 15),
    updatedAt: minutesAgo(i * 90),
    bookingRef: `NX${(70000 + i * 13).toString()}`,
  };
});

// ---------- Risk flags ----------
export const riskFlags: RiskFlag[] = Array.from({ length: 16 }).map((_, i) => {
  const types = [
    "Rapid listing creation",
    "Duplicate images detected",
    "Suspicious pricing pattern",
    "Multiple accounts, same device",
    "Fake listing suspected",
    "Spam review pattern",
  ];
  const targetTypes = ["host", "listing", "user"] as const;
  const severities = ["low", "medium", "high"] as const;
  const statuses = ["open", "reviewing", "resolved"] as const;
  return {
    id: `RSK-${4000 + i}`,
    type: pick(types, i),
    target: i % 2 === 0 ? pick(hosts, i).name : pick(listings, i).title,
    targetType: pick([...targetTypes], i),
    severity: pick([...severities], i),
    detail: pick(
      [
        "3 listings created within 10 minutes from a new account.",
        "Image hash matches 4 other active listings.",
        "Nightly price 78% below city median for the property type.",
        "Same fingerprint used across 5 guest accounts.",
        "No verifiable address, stock-like photos.",
      ],
      i,
    ),
    detectedAt: minutesAgo(i * 220),
    status: pick([...statuses], i),
  };
});

// ---------- KYC ----------
export const kycRecords: KycRecord[] = Array.from({ length: 28 }).map((_, i) => {
  const u = pick(users, i);
  const statusRoll = i % 6;
  const status =
    statusRoll === 0 || statusRoll === 3
      ? "pending"
      : statusRoll === 5
        ? "rejected"
        : "verified";
  return {
    id: `KYC-${6000 + i}`,
    name: u.name,
    role: u.role === "guest" ? "guest" : "host",
    status,
    provider: "Sumsub",
    submittedAt: daysAgo(i % 20),
    reviewedAt: status !== "pending" ? daysAgo((i % 20) - 1) : undefined,
    failureReason:
      status === "rejected"
        ? pick(
            [
              "Document expired",
              "Face mismatch",
              "Blurry document photo",
              "Suspected forgery",
            ],
            i,
          )
        : undefined,
    documentType: pick(["National ID", "Passport", "Driver License"], i),
  };
});

// ---------- Audit logs ----------
export const auditLogs: AuditLog[] = Array.from({ length: 50 }).map((_, i) => {
  const actors = [
    { name: "You (Super Admin)", role: "Super Admin" },
    { name: "Sana K.", role: "Ops Manager" },
    { name: "Reda B.", role: "Moderator" },
    { name: "Layla M.", role: "Support Agent" },
    { name: "Analyst Bot", role: "Analyst" },
  ];
  const actions = [
    { action: "Approved listing", module: "Listings", before: "pending", after: "active" },
    { action: "Suspended user", module: "Users", before: "active", after: "suspended" },
    { action: "Cancelled booking", module: "Bookings", before: "confirmed", after: "cancelled" },
    { action: "Removed review", module: "Reviews", before: "published", after: "removed" },
    { action: "Updated commission rate", module: "Settings", before: "12%", after: "14%" },
    { action: "Resolved ticket", module: "Support", before: "open", after: "resolved" },
    { action: "Rejected KYC", module: "KYC", before: "pending", after: "rejected" },
  ];
  const actor = pick(actors, i);
  const act = pick(actions, i);
  return {
    id: `LOG-${9000 + i}`,
    actor: actor.name,
    actorRole: actor.role,
    action: act.action,
    module: act.module,
    target: pick([...listings.map((l) => l.id), ...users.map((u) => u.id)], i * 7),
    before: act.before,
    after: act.after,
    ip: `41.${100 + (i % 150)}.${i % 255}.${(i * 13) % 255}`,
    timestamp: minutesAgo(i * 47),
  };
});

// ---------- Activity feed ----------
export const activityFeed: ActivityEvent[] = [
  {
    id: "ACT-1",
    type: "booking",
    title: "New booking created",
    detail: "Yasmine B. booked ‘Sunlit Riad with Rooftop Pool’ — 4 nights · MAD 3,200",
    timestamp: minutesAgo(2),
  },
  {
    id: "ACT-2",
    type: "host_signup",
    title: "New host signup",
    detail: "Karim Idrissi joined as a host in Marrakech",
    timestamp: minutesAgo(11),
  },
  {
    id: "ACT-3",
    type: "listing_submitted",
    title: "New listing submitted",
    detail: "‘Ocean View Villa’ awaiting approval — Agadir",
    timestamp: minutesAgo(24),
  },
  {
    id: "ACT-4",
    type: "kyc_approved",
    title: "KYC approved",
    detail: "Sumsub verified Nadia Alaoui (host)",
    timestamp: minutesAgo(38),
  },
  {
    id: "ACT-5",
    type: "cancellation",
    title: "Booking cancelled",
    detail: "NX70234 cancelled by guest — refund pending",
    timestamp: minutesAgo(52),
  },
  {
    id: "ACT-6",
    type: "review",
    title: "New review posted",
    detail: "★★★★★ on ‘Design Loft Downtown’",
    timestamp: minutesAgo(67),
  },
  {
    id: "ACT-7",
    type: "refund",
    title: "Refund processed",
    detail: "MAD 1,150 refunded for NX70012",
    timestamp: minutesAgo(95),
  },
  {
    id: "ACT-8",
    type: "booking",
    title: "New booking created",
    detail: "Omar T. booked ‘Bohemian Blue House’ — 2 nights · MAD 980",
    timestamp: minutesAgo(120),
  },
];

// ---------- Roles ----------
export const roles: RolePermission[] = [
  {
    id: "ROLE-1",
    name: "Super Admin",
    description: "Full unrestricted access across every module.",
    members: 2,
    permissions: {
      Listings: ["view", "edit", "delete", "approve"],
      Users: ["view", "edit", "delete", "approve"],
      Bookings: ["view", "edit", "delete", "approve"],
      Settings: ["view", "edit", "delete", "approve"],
    },
  },
  {
    id: "ROLE-2",
    name: "Ops Manager",
    description: "Manages listings, bookings and hosts day-to-day.",
    members: 4,
    permissions: {
      Listings: ["view", "edit", "approve"],
      Users: ["view", "edit"],
      Bookings: ["view", "edit", "approve"],
      Settings: ["view"],
    },
  },
  {
    id: "ROLE-3",
    name: "Support Agent",
    description: "Handles tickets and guest/host disputes.",
    members: 9,
    permissions: {
      Bookings: ["view"],
      Users: ["view"],
      Support: ["view", "edit"],
    },
  },
  {
    id: "ROLE-4",
    name: "Moderator",
    description: "Reviews content, listings and abusive reviews.",
    members: 6,
    permissions: {
      Listings: ["view", "approve"],
      Reviews: ["view", "edit", "delete"],
      Moderation: ["view", "edit"],
    },
  },
  {
    id: "ROLE-5",
    name: "Analyst",
    description: "Read-only access to analytics and growth data.",
    members: 3,
    permissions: {
      Analytics: ["view"],
      Bookings: ["view"],
      Listings: ["view"],
    },
  },
];

// ---------- Derived metrics ----------
export const metrics = {
  totalUsers: users.length * 271 + 148,
  totalGuests: Math.round(users.filter((u) => u.role !== "host").length * 271),
  totalHosts: Math.round(hosts.length * 61),
  activeListings: listings.filter((l) => l.status === "active").length * 43 + 12,
  totalBookings: bookings.length * 128 + 44,
  gmv: bookings.reduce((s, b) => s + b.total, 0) * 96,
  occupancyRate: 68.4,
  avgNightlyPrice: Math.round(
    listings.reduce((s, l) => s + l.pricePerNight, 0) / listings.length,
  ),
  cancellationRate: 7.2,
  conversionRate: 3.8,
  pendingListings: listings.filter((l) => l.status === "pending").length,
  flaggedListings: listings.filter((l) => l.status === "flagged").length,
  openTickets: tickets.filter((t) => t.status !== "resolved").length,
  pendingKyc: kycRecords.filter((k) => k.status === "pending").length,
  openRisks: riskFlags.filter((r) => r.status !== "resolved").length,
};

// GMV trend (last 12 weeks)
export const gmvTrend = [
  420, 468, 512, 498, 560, 604, 588, 662, 710, 754, 812, 905,
].map((v, i) => ({ label: `W${i + 1}`, value: v * 1000 }));

export const bookingsTrend = [
  180, 210, 195, 240, 265, 258, 300, 320, 344, 360, 402, 448,
].map((v, i) => ({ label: `W${i + 1}`, value: v }));

export const signupTrend = [
  45, 62, 58, 74, 88, 96, 110, 128, 142, 160, 188, 214,
].map((v, i) => ({ label: `W${i + 1}`, value: v }));

export const cityPerformance = CITIES.map((city, i) => ({
  city,
  listings: 40 + i * 22,
  bookings: 120 + i * 64,
  occupancy: 55 + ((i * 7) % 40),
  gmv: (800 + i * 340) * 1000,
})).sort((a, b) => b.gmv - a.gmv);

export const funnel = [
  { stage: "Searches", value: 100000 },
  { stage: "Listing Views", value: 42000 },
  { stage: "Booking Started", value: 9800 },
  { stage: "Booking Completed", value: 3800 },
];

export const topListings = [...listings]
  .filter((l) => l.status === "active")
  .sort((a, b) => b.bookingsCount - a.bookingsCount)
  .slice(0, 6);

export const ratingDistribution = [
  { stars: 5, count: 62 },
  { stars: 4, count: 24 },
  { stars: 3, count: 8 },
  { stars: 2, count: 4 },
  { stars: 1, count: 2 },
];
