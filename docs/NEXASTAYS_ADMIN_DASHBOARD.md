# Nexa Stays — Admin Operations Center

**Audience:** product / engineering / ops.  
**Code:** [`nexastays_dashboard/`](../nexastays_dashboard/)  
**Local URL:** [http://localhost:3010](http://localhost:3010)  
**Related:** [`LISTING_FLOW.md`](./LISTING_FLOW.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)

**Principle:** every widget answers one of: *What needs attention?* / *How is the business doing?* / *Where are hosts stuck?* / *How is the business growing?* If it cannot change a decision, it does not ship.

---

## 1. One-sentence summary

`nexastays_dashboard` is the **operations center** for Nexa Stays: admins clear review queues, watch marketplace health, and track the host funnel — not a generic CRUD admin panel.

---

## 2. Navigation (work-based)

| Nav | Route | Role |
|-----|-------|------|
| Overview | `/` | Decision dashboard |
| Operations | `/operations` | Inbox of queues |
| Listings | `/listings` | Listing review queue |
| Bookings | `/bookings` | Booking inspection |
| Hosts | `/hosts` | Unified host queue |
| Guests | `/guests` | Guest accounts |
| Trust & Safety | group | KYC, Reviews, Audit (Moderation only if count &gt; 0) |
| Analytics | `/analytics` | Decision-only metrics |
| Settings | `/settings` | Fee % |

**Hidden from nav:** Support, Roles & Permissions (routes may remain unused).  
**Redirects:** `/host-applications` → `/hosts`, `/users` → `/guests`.

---

## 3. Overview layout

1. **Hero** — greeting + `healthScore` + revenue today + attention total  
2. **Business Snapshot** — live listings, active hosts, active bookings, revenue today/month, avg rating  
3. **Needs Attention** — clickable queues (omit zero stubs)  
4. **Host Marketplace Funnel** — visual north star (larger than charts) with conversion %  
5. **Revenue & Activity** — exactly two real 30-day charts  
6. **Recent Activity** — day-grouped cards (Today / Yesterday)

---

## 4. API: `GET /admin/stays/ops-overview`

Stays admin endpoint (UTC month/day boundaries). Dashboard enriches `attention.pendingKyc` from Identity.

### `snapshot`
`liveListings`, `activeHosts`, `activeBookings`, `revenueToday`, `revenueMonth`, `avgRating`

### `attention`
`pendingListings` (SUBMITTED), `pendingHostApplications`, `pendingKyc` (null from Stays), `needsChangesListings` (REJECTED), `failedPayouts` / `urgentAlerts` (0 Phase 1)

### `healthScore`
Starts at 100; penalizes pending queues, low avg rating (&lt; 4), cancellation rate. Labels: Healthy ≥ 80, Watch ≥ 55, else Critical.

### `funnel` (MTD host marketplace)
Stages with `unit: hosts | listings` and adjacent conversion rates (highlight **draft → submitted**):

Applications → Approved → Draft Listings → Submitted → Live → First Booking

### `opsTiming`
- `avgHoursToHostApproval` — mean `reviewed_at − submitted_at` for hosts approved MTD  
- `avgDaysDraftToSubmit` — approximation via `last_edited_at − created_at` for non-draft listings touched MTD

### `series`
Last 30 days: `{ date, bookings, gmv, revenue }[]` (real aggregates — no client synthetic trends).

### `activityGrouped`
Today / Yesterday counts: listings approved, hosts approved, bookings, reviews, cancellations.

Legacy `GET /admin/stays/stats` remains for sidebar badges.

---

## 5. Operations inbox

`/operations` lists queues with counts — Gmail metaphor, not another dashboard:

- Listing Queue → `/listings?status=pending`  
- Host Queue → `/hosts?status=pending`  
- KYC Queue → `/kyc?status=pending`  
- Needs Changes → `/listings?status=rejected`  
- Live Listings → `/listings?status=live`

**Phase 2+:** optional default landing on Operations for moderators vs Overview for managers.

---

## 6. Queue pages

### Listings
Default **Pending**; tabs Pending / Approved / Needs Changes / Live / Paused / All.  
Sort: **oldest waiting** first; `sort=` supports `oldest` | `newest` (`priority` reserved).

### Hosts
Unified tabs: **Pending | Approved | Needs Changes | Rejected | Frozen** — moderator does not think in DB tables. Freeze / unfreeze for approved hosts.

### Guests
Identity guest accounts; host work lives under Hosts.

---

## 7. Analytics

Decision filter only: revenue today/month, live supply, open queues, 30d bookings/GMV/revenue, host funnel + timing KPIs, Needs Attention.  
No vanity “registered guests” hero metrics. No synthetic `buildTrend` charts.

---

## 8. Runtime

| Service | Env | Default |
|---------|-----|---------|
| Stays | `NEXT_PUBLIC_STAYS_API_URL` | `http://127.0.0.1:3002/api/v1` |
| Identity | `NEXT_PUBLIC_IDENTITY_API_URL` | `http://127.0.0.1:3001/api/v1` |

Auth: Identity `POST /auth/admin/login` → Bearer token in `localStorage`.

---

## 9. Roadmap

| Phase | Focus |
|-------|--------|
| **1 (shipped)** | Ops center, Needs Attention, north-star funnel, real charts, inbox Operations, queue-first Hosts/Listings, health score, timing KPIs |
| **2** | Story/quality metrics, host performance, notifications, **Executive Mode** (Revenue / Growth / Bookings / Hosts / Funnel — no queues), moderator default → `/operations` |
| **3** | Guest funnel, search analytics, occupancy/ADR/RevPAR, forecasting, fraud, executive reports |

**Explicitly deferred:** guest conversion funnel, hotel KPIs, fraud center, support tickets UI, push notifications.
