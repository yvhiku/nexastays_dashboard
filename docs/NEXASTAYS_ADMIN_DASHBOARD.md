# Nexa Stays — Admin Operations Center

**Audience:** product / engineering / ops.  
**Code:** [`nexastays_dashboard/`](../nexastays_dashboard/)  
**Local URL:** [http://localhost:3010](http://localhost:3010)  
**Related:** [`LISTING_FLOW.md`](./LISTING_FLOW.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)

**Status:** Phase 1 specification **frozen**. Next iterations should come from observed operator behavior and production usage, not speculative redesign.

---

## 1. One-sentence summary

`nexastays_dashboard` is the **operations center** for Nexa Stays: admins clear review queues, watch marketplace health, and track the host funnel — not a generic CRUD admin panel.

### Product Principles

- **Operations over administration** — prioritize decisions, not CRUD.
- **Attention before analytics** — unresolved work is more important than historical data.
- **Trust before scale** — review queues are a core product capability, not an operational burden.
- **Metrics must drive action** — if a metric cannot change a decision, it does not belong on Overview.
- **Overview answers questions. Queue pages complete work.**

### Page roles

| Surface | Answers |
|---------|---------|
| **Overview** | Operational questions — what needs attention, where hosts stick, health now |
| **Analytics** | Strategic questions — trends and growth over time |
| **Operations** | Completes work — inbox into queues |

These three pages should not overlap in purpose.

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
| Trust & Safety | group | KYC, Reviews, Audit (Moderation only if count > 0) |
| Analytics | `/analytics` | Strategic metrics |
| Settings | `/settings` | Fee % |

**Hidden from nav:** Support, Roles & Permissions.  
**Redirects:** `/host-applications` → `/hosts`, `/users` → `/guests`.

---

## 3. Overview hierarchy

Priority order (permanent):

1. **Hero** — greeting + health score + revenue today + attention total  
2. **Needs Attention** — clickable queues (omit zero stubs); include oldest-pending ages  
3. **Host Marketplace Funnel** — visual north star with conversion %  
4. **Business Snapshot** — live supply, hosts, bookings, revenue today/month, avg rating  
5. **Business Trends** — exactly two real 30-day charts (bookings + revenue/GMV)  
6. **Recent Activity** — day-grouped cards (Today / Yesterday)

Operator mental model: urgent → where hosts stick → is the marketplace healthy → how trends evolve.

---

## 4. Refresh policy

| Surface | Freshness |
|---------|-----------|
| Overview | Refresh every **60 seconds** |
| Operations queues | Manual refresh + optimistic updates after actions |
| Review drawers | Always live |
| Charts | Cached with Overview payload (same 60s cycle) |

---

## 5. API: `GET /admin/stays/ops-overview`

Stays admin endpoint (UTC month/day boundaries). Dashboard enriches `attention.pendingKyc` from Identity.

**Contract stability:** The shape of `ops-overview` is considered stable. New fields should be added **inside existing sections** whenever possible. Avoid new top-level objects unless a new product area is introduced.

### `snapshot`
`liveListings`, `activeHosts`, `activeBookings`, `revenueToday`, `revenueMonth`, `avgRating`

### `attention`
- `pendingListings` (SUBMITTED), `pendingHostApplications`, `pendingKyc` (null from Stays), `needsChangesListings` (REJECTED)
- `failedPayouts` / `urgentAlerts` (0 Phase 1; UI hides zeros)
- **Oldest pending** (timestamps are source of truth for UI display; hours for convenience):
  - `oldestPendingListingAt` / `oldestPendingListingHours`
  - `oldestPendingHostApplicationAt` / `oldestPendingHostApplicationHours`
  - Listing: oldest SUBMITTED by `COALESCE(last_edited_at, created_at)`
  - Host: oldest PENDING by `COALESCE(submitted_at, created_at)`
  - `null` when that queue is empty

### `healthScore`
Starts at 100; penalizes pending queues, low avg rating (< 4), cancellation rate. Labels: Healthy ≥ 80, Watch ≥ 55, else Critical.

**Health Score is an operational indicator only. It is not a business KPI and should never be used for reporting.**

### `funnel` (MTD host marketplace)
Stages with `unit: hosts | listings` and adjacent conversion rates (highlight **draft → submitted**):

Applications → Approved → Draft Listings → Submitted → Live → First Booking

### `opsTiming`
- `avgHoursToHostApproval` — mean `reviewed_at − submitted_at` for hosts approved MTD  
- `avgDaysDraftToSubmit` — approximation via `last_edited_at − created_at` for non-draft listings touched MTD

### `series`
Last 30 days: `{ date, bookings, gmv, revenue }[]`

### `activityGrouped`
Today / Yesterday counts: listings approved, hosts approved, bookings, reviews, cancellations.

Legacy `GET /admin/stays/stats` remains for sidebar badges.

---

## 6. Operations inbox

`/operations` lists queues with counts — Gmail metaphor:

- Listing Queue → `/listings?status=pending`  
- Host Queue → `/hosts?status=pending`  
- KYC Queue → `/kyc?status=pending`  
- Needs Changes → `/listings?status=rejected`  
- Live Listings → `/listings?status=live`

**Phase 2+:** optional default landing on Operations for moderators vs Overview for managers.

---

## 7. Queue pages

### Listings
Default **Pending**; tabs Pending / Approved / Needs Changes / Live / Paused / All.  
Sort: **oldest waiting** first; `sort=` supports `oldest` | `newest` (`priority` reserved).

### Hosts
Unified tabs: **Pending | Approved | Needs Changes | Rejected | Frozen**. Freeze / unfreeze for approved hosts.

### Guests
Identity guest accounts; host work lives under Hosts.

---

## 8. Analytics

Analytics answers **strategic** questions. Overview answers **operational** questions. Operations completes work.

Show: revenue today/month, live supply, open queues, 30d bookings/GMV/revenue, host funnel + timing KPIs, Needs Attention.  
No vanity “registered guests” hero metrics. No synthetic charts.

---

## 9. Future KPI / SLA targets (not enforced yet)

| Queue | Target |
|-------|--------|
| Host approval | < 24h |
| Listing review | < 24h |
| Needs Changes response | < 48h |

Documented for product direction; enforcement and alerting are Phase 2+.

---

## 10. Runtime

| Service | Env | Default |
|---------|-----|---------|
| Stays | `NEXT_PUBLIC_STAYS_API_URL` | `http://127.0.0.1:3002/api/v1` |
| Identity | `NEXT_PUBLIC_IDENTITY_API_URL` | `http://127.0.0.1:3001/api/v1` |

Auth: Identity `POST /auth/admin/login` → Bearer token in `localStorage`.

---

## 11. Roadmap

| Phase | Focus |
|-------|--------|
| **1 (frozen)** | Ops center, Needs Attention, north-star funnel, real charts, inbox Operations, queue-first Hosts/Listings, health score, timing + oldest-pending KPIs |
| **2** | Story/quality metrics, host performance, notifications, **Executive Mode**, moderator default → `/operations`, SLA enforcement |
| **3** | Guest funnel, search analytics, occupancy/ADR/RevPAR, forecasting, fraud, executive reports |

**Explicitly deferred:** guest conversion funnel, hotel KPIs, fraud center, support tickets UI, push notifications.

---

## 12. Design freeze

The information architecture of the Operations Center is considered **stable**.

Future iterations should be driven by observed operator behavior, queue metrics, and production usage rather than speculative redesign.

Large IA changes require a documented product decision.
