# Nexa Stays — Admin Operations Center

**Audience:** product / engineering / ops.  
**Code:** [`nexastays_dashboard/`](../nexastays_dashboard/)  
**Local URL:** [http://localhost:3010](http://localhost:3010)  
**Related:** [`LISTING_FLOW.md`](./LISTING_FLOW.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)

**Status:** Launch P0. Phase 1 ops-queue product is preserved. This document records the product decision to expand the dashboard into a launch Operations Center (finance, support, trust) **without rebuilding** Overview, listing review, or host onboarding.

---

## 1. One-sentence summary

`nexastays_dashboard` is the **operations center** for Nexa Stays: admins clear review queues, watch marketplace health, inspect money, and handle support — not a generic CRUD admin panel.

### Product Principles

- **Operations over administration** — prioritize decisions, not CRUD.
- **Attention before analytics** — unresolved work is more important than historical data.
- **Trust before scale** — review queues are a core product capability, not an operational burden.
- **Metrics must drive action** — if a metric cannot change a decision, it does not belong on Overview.
- **Overview answers questions. Queue pages complete work.**
- **Money is append-only** — admins never edit ledger rows.
- **No mock-data regression** — missing APIs show honest empty / unavailable states.

### Page roles

| Surface | Answers |
|---------|---------|
| **Overview** | Operational questions — what needs attention, where hosts stick, health now |
| **Analytics** | Strategic questions — trends and growth over time |
| **Operations inbox** | Completes work — inbox into queues |
| **Queue pages** | Listings, hosts, guests, bookings, KYC, reviews, payments, refunds, support, reports |

---

## 2. Navigation (Launch P0)

| Group | Nav | Route | Role |
|-------|-----|-------|------|
| — | Overview | `/` | Decision dashboard |
| Operations | Inbox | `/operations` | Inbox of queues |
| Operations | Bookings | `/bookings` | Booking inspection + financial breakdown |
| Operations | Listings | `/listings` | Listing review queue |
| Operations | Hosts | `/hosts` | Unified host queue |
| Operations | Guests | `/guests` | Guest accounts |
| Finance | Payments | `/payments` | Payment intents (read-only) |
| Finance | Refunds | `/refunds` | Refund ledger (append-only) |
| Support | Tickets | `/support` | Support workspace + booking context |
| Trust & Safety | KYC | `/kyc` | Identity verification queue |
| Trust & Safety | Reports | `/reports` | Conversation / safety reports |
| Trust & Safety | Reviews | `/reviews` | Review moderation |
| Trust & Safety | Audit Logs | `/audit-logs` | Stays audit log |
| System | Admin Users | `/admin-users` | Session identity + role catalog |
| System | Settings | `/settings` | Fee % |
| — | Analytics | `/analytics` | Strategic metrics |

**Redirects:** `/host-applications` → `/hosts?status=pending`, `/users` → `/guests`, `/moderation` → `/reports`, `/roles` → `/admin-users`.

---

## 3. Overview hierarchy

Priority order (permanent):

1. **Hero** — greeting + health score + revenue today + attention total  
2. **Needs Attention** — clickable queues (omit zero stubs); include oldest-pending ages  
3. **Host Marketplace Funnel** — visual north star with conversion %  
4. **Business Snapshot** — live supply, hosts, bookings, revenue today/month, avg rating, **today’s bookings**, **total bookings**, **open support tickets** (when known)  
5. **Business Trends** — exactly two real 30-day charts (bookings + revenue/GMV)  
6. **Recent Activity** — day-grouped cards (Today / Yesterday) + compact audit-log event list (last 20)

Operator mental model: urgent → where hosts stick → is the marketplace healthy → how trends evolve.

Do **not** add occupancy, booking conversion, or new-guest vanity counts to Overview.

Needs Attention extra cards (hide when 0): payment failures, open support tickets, pending refunds, failed payouts.

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

Dashboard may also read `GET /admin/stays/stats` for `todayBookings` / `totalBookings` and `GET /admin/stays/audit-logs` for the activity strip.

### `snapshot`
`liveListings`, `activeHosts`, `activeBookings`, `revenueToday`, `revenueMonth`, `avgRating`

### `attention`
- `pendingListings` (SUBMITTED), `pendingHostApplications`, `pendingKyc` (null from Stays), `needsChangesListings` (REJECTED)
- `failedPayouts` / `urgentAlerts` (0 Phase 1; UI hides zeros)
- Optional Launch P0 keys (hide when 0 / unknown): `openTickets`, `paymentFailures`, `pendingRefunds`
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

---

## 7. Queue pages

### Listings
Default **Pending**; tabs Pending / Approved / Needs Changes / Live / Paused / Drafts / All.  
Sort: **oldest waiting** first; `sort=` supports `oldest` | `newest` (`priority` reserved).  
Pause / unpublish stays disabled until `POST /admin/stays/listings/:id/pause|unpause` exists.

### Hosts
Unified tabs: **Pending | Approved | Needs Changes | Rejected | Frozen**. Freeze / unfreeze for approved hosts.

### Guests
Identity guest accounts; host work lives under Hosts. Suspend / reactivate from table and drawer.

### Bookings
Filters preserve Stays statuses: `INITIATED`, `PAYMENT_PENDING`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED_BY_GUEST`, `CANCELLED_BY_HOST`, `EXPIRED`.  
Detail: timeline + financial breakdown. No fake cancel / refund / dispute actions.

### KYC
Identity queue (`source=STAYS`) with case drawer. Approve/reject gated until Identity exposes POST endpoints.

### Reviews
Hide / publish / delete wired to Stays. Hide ≠ delete.

### Payments / Refunds
Read-only queues. Honest unavailable state until Stays list APIs exist. Never edit ledger rows.

### Support
Ticket queue + conversation + booking context composer. Do not consume Identity Pay tickets. Honest unavailable state until Stays support APIs exist.

### Reports
Conversation / safety reports. Replaces `/moderation`.

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

Documented for product direction; enforcement and alerting are later.

---

## 10. Runtime

| Service | Env | Default |
|---------|-----|---------|
| Stays | `NEXT_PUBLIC_STAYS_API_URL` | `http://127.0.0.1:3002/api/v1` |
| Identity | `NEXT_PUBLIC_IDENTITY_API_URL` | `http://127.0.0.1:3001/api/v1` |

Auth: Identity `POST /auth/admin/login` → Bearer token in memory; refresh via HttpOnly cookie.

---

## 11. Roadmap

| Phase | Focus |
|-------|--------|
| **1 (shipped)** | Ops center, Needs Attention, north-star funnel, real charts, inbox Operations, queue-first Hosts/Listings, health score, timing + oldest-pending KPIs |
| **Launch P0 (this)** | Nav IA, global search, deepen bookings/listings/people, review moderation, KYC drawer, payments/refunds/support/reports surfaces, session-based admin identity |
| **P1** | Payouts execution, disputes, CMS/SEO admin, promotions, notification templates, listing pause APIs, support ticket store, real RBAC |
| **P2** | Occupancy/ADR, fraud engine, AI ops assistant, SLA automation |

**Explicitly out of Launch P0:** payouts execution, disputes engine, CMS, promotions, notification templates, fraud engine, AI assistant, occupancy analytics, canned responses, attachments, full RBAC administration.

---

## 12. Design freeze (updated)

The **Overview hierarchy** and **queue-first listing/host review** remain stable.

Launch P0 is a documented product decision to add Finance / Support / Trust / System groups around that core. Future IA changes still require a documented product decision.
