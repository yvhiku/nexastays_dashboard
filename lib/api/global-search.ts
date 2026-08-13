import { fetchBookings, fetchHosts, fetchListingDetail, fetchListingsPage } from "./stays-admin";
import { fetchUsers } from "./users-admin";

export type SearchHitKind = "booking" | "listing" | "host" | "guest";

export type SearchHit = {
  kind: SearchHitKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOOKING_REF_RE = /^(NS|NST)[-_]?/i;
const PHONE_RE = /^\+?\d[\d\s.-]{6,}$/;

function qIncludes(hay: string | undefined, needle: string) {
  return (hay ?? "").toLowerCase().includes(needle);
}

/**
 * Client-side fan-out search. Swap the body for GET /admin/stays/search?q= later.
 */
export async function globalSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const lower = q.toLowerCase();

  if (BOOKING_REF_RE.test(q) || q.toUpperCase().startsWith("SUP-")) {
    const bookings = await fetchBookings().catch(() => []);
    return bookings
      .filter(
        (b) =>
          qIncludes(b.reference, lower) ||
          qIncludes(b.id, lower) ||
          qIncludes(b.guestName, lower),
      )
      .slice(0, 8)
      .map((b) => ({
        kind: "booking" as const,
        id: b.id,
        title: b.reference,
        subtitle: `${b.listingTitle} · ${b.rawStatus}`,
        href: `/bookings?q=${encodeURIComponent(b.reference)}`,
      }));
  }

  if (PHONE_RE.test(q.replace(/\s/g, ""))) {
    const users = await fetchUsers().catch(() => []);
    const needle = q.replace(/\s/g, "");
    return users
      .filter((u) => (u.phone ?? "").replace(/\s/g, "").includes(needle))
      .slice(0, 8)
      .map((u) => ({
        kind: u.role === "host" || u.role === "both" ? ("host" as const) : ("guest" as const),
        id: u.id,
        title: u.name,
        subtitle: u.phone,
        href: u.role === "host" ? `/hosts?q=${encodeURIComponent(u.name)}` : `/guests?q=${encodeURIComponent(u.name)}`,
      }));
  }

  if (UUID_RE.test(q)) {
    const listing = await fetchListingDetail(q).catch(() => null);
    if (listing) {
      return [
        {
          kind: "listing",
          id: listing.id,
          title: listing.title,
          subtitle: `${listing.city} · ${listing.rawStatus ?? listing.status}`,
          href: `/listings?status=all&q=${encodeURIComponent(listing.title)}`,
        },
      ];
    }
    const users = await fetchUsers().catch(() => []);
    const user = users.find((u) => u.id === q);
    if (user) {
      return [
        {
          kind: user.role === "host" ? "host" : "guest",
          id: user.id,
          title: user.name,
          subtitle: user.email,
          href:
            user.role === "host"
              ? `/hosts?q=${encodeURIComponent(user.name)}`
              : `/guests?q=${encodeURIComponent(user.name)}`,
        },
      ];
    }
  }

  const [listingsPage, hosts, users, bookings] = await Promise.all([
    fetchListingsPage({ status: "all", limit: 50, offset: 0 }).catch(() => null),
    fetchHosts().catch(() => []),
    fetchUsers().catch(() => []),
    fetchBookings().catch(() => []),
  ]);

  const hits: SearchHit[] = [];

  for (const b of bookings) {
    if (
      qIncludes(b.reference, lower) ||
      qIncludes(b.guestName, lower) ||
      qIncludes(b.listingTitle, lower)
    ) {
      hits.push({
        kind: "booking",
        id: b.id,
        title: b.reference,
        subtitle: `${b.listingTitle} · ${b.rawStatus}`,
        href: `/bookings?q=${encodeURIComponent(b.reference)}`,
      });
    }
  }

  for (const l of listingsPage?.items ?? []) {
    if (qIncludes(l.title, lower) || qIncludes(l.city, lower) || qIncludes(l.hostName, lower)) {
      hits.push({
        kind: "listing",
        id: l.id,
        title: l.title,
        subtitle: `${l.city} · ${l.hostName}`,
        href: `/listings?status=all&q=${encodeURIComponent(q)}`,
      });
    }
  }

  for (const h of hosts) {
    if (qIncludes(h.name, lower) || qIncludes(h.email, lower) || qIncludes(h.phone, lower)) {
      hits.push({
        kind: "host",
        id: h.id,
        title: h.name,
        subtitle: h.email,
        href: `/hosts?q=${encodeURIComponent(h.name)}`,
      });
    }
  }

  for (const u of users.filter((u) => u.role === "guest" || u.role === "both")) {
    if (qIncludes(u.name, lower) || qIncludes(u.email, lower) || qIncludes(u.phone, lower)) {
      hits.push({
        kind: "guest",
        id: u.id,
        title: u.name,
        subtitle: u.email !== "—" ? u.email : u.phone,
        href: `/guests?q=${encodeURIComponent(u.name)}`,
      });
    }
  }

  const seen = new Set<string>();
  return hits
    .filter((h) => {
      const key = `${h.kind}:${h.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}
