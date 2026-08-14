# Support & Trust Phase 5 — Production Readiness

**Date:** 2026-08-14  
**Commits:** database `e3063b9`; backend `90514e8`; dashboard this document.  
**Method:** Code-first inspection of current `main`, migrations `036`–`042` on existing `nexa_stays` and fresh `nexa_stays_phase5_fresh`, live E2E against local Identity (`:3001`) + Stays (`:3002`), dashboard/API comparison, Jest `src/modules/support` + `src/modules/messaging`.  
**No Phase 6.** No AI. Humans stay in control. After this document: stop the Support & Trust roadmap unless a new incident or approved requirement appears.

**Environment:** Docker Postgres `stays-db` `localhost:5434` (`nexa_stays` / `nexa_stays_dev`). `DB_SYNCHRONIZE=false` in `backend/stays/.env` and `.env.example`. Did **not** run `migrate.ps1 -Reset`.

---

## Verdict

**Production ready** after the High fixes listed below. No Critical remains open. Remaining items are Medium/Low accepted limitations.

Verification required a Stays **rebuild** (`npm start` is `nest build && node dist/main`, not watch). The first live pass hit a stale `dist` (Phase 4 routes 404, `slaState` rejected as unknown). Evidence below is from the rebuilt process unless noted.

---

## Architecture (unchanged)

```
Report / Safety / Contact → canonical Stays row → one Support Ticket
  → SUPPORT conversation → stays_messages → SSE
```

Ticket numbers: `SUP-{YYYY}-{NNNNNN}`. Conversation `type=SUPPORT`. Notes never enter `stays_messages`. Operational signals are advisory only.

---

## 5A — Migrations

### Existing `nexa_stays`

Preflight before applying pending files:

| Check | Result |
|---|---|
| Duplicate `report_id` | 0 |
| Duplicate `safety_issue_id` | 0 |
| Ticket statuses | `CLOSED` only (2 rows) |
| Report statuses | `OPEN` (2 rows) |
| Safety statuses | none |
| Orphan ticket/report/safety FKs | 0 |

`schema_migrations` was at `037_support_trust_ops.sql`. `migrate.ps1` (no `-Reset`) applied:

- `038_support_ticket_notes.sql`
- `039_support_service_metrics.sql`
- `040_support_ticket_csat.sql`
- `041_support_canned_replies.sql`
- `042_support_operational_signals.sql`

Post-apply: `036`–`042` present. Entity columns match information_schema (`dedupe_key VARCHAR(160) UNIQUE`, CSAT, notes, canned, `first_admin_response_at`, `closed_at`, `requester_email`). Partial uniques `uq_stays_support_tickets_report_id` / `uq_stays_support_tickets_safety_issue_id` exist.

### Fresh `nexa_stays_phase5_fresh`

First apply of `000`–`042` in filename order **failed at `027_restore_orphaned_conversations.sql`**: inserts hardcoded booking FKs that do not exist on an empty cluster (`Key (booking_id)=(42f8947a-…) is not present in stays_bookings`).

**High (fixed):** guard those inserts with `EXISTS (SELECT 1 FROM stays_bookings WHERE id = …)`. After the guard, `027`–`042` applied; 45 migration rows; support tables/indexes match existing DB. Fresh database dropped after recording.

`035_host_list_pagination_indexes.sql` remains a dirty unrelated working-tree file and was not committed.

### Deploy order

**036–042 → backend → dashboard → web only if a Phase 5 web fix is confirmed.** Phase 5 confirmed **no web deploy**.

---

## 5B — E2E flows A–E (live local APIs)

Recorded after Stays rebuild unless marked “stale dist”.

### A — Report

- `POST /api/v1/messaging/conversations/{BOOKING}/report` → **201**
- Canonical `stays_conversation_reports` row + ticket `SUP-2026-000003` + SUPPORT conv `0e240aa1-…` + first customer message
- Admin `GET /admin/stays/reports/:id` and `GET /admin/stays/support/tickets/:id` → 200
- Customer `GET /support/tickets/:id` → 200

**Repeat / concurrent on the same BOOKING conversation:** two parallel POSTs both **201**, sequential repeat **201**. Each POST inserts a **new** report row and a **new** ticket (`uq_stays_support_tickets_report_id` is per `report_id`, not per conversation). Three tickets on `ef0e89c2-…`. See Medium M-DUP.

### B — Safety

- `THREATS_HARASSMENT` → ticket **HIGH**, later `REPEAT_SAFETY_REPORT` **URGENT** signal (Phase 4 rule)
- `FEEL_UNSAFE` → ticket **HIGH**
- `PROPERTY_PROBLEM` ×2 on one conversation → two HIGH tickets (repeat pair for the safety rule)
- Extra safety after rebuild → `REPEAT_SAFETY_REPORT` **ACTIVE**

### C — Contact

- `POST /api/v1/support/tickets` `{ category: TECHNICAL, subject, message }` → **201** (`c72a68f7-…` / `SUP-2026-000015` class)
- Forced failure: `listingId` unknown UUID → **404**, no orphan ticket/conversation (`orphan_ticket_conv = 0`)
- Code path: `createTicketForUser` wraps conversation + ticket + first message in `dataSource.transaction`

### D — Messaging lifecycle (rebuilt)

| Step | HTTP | Notes |
|---|---|---|
| Admin first reply | 201 | `first_admin_response_at` set once (`2026-08-14T02:33:29.689Z`) |
| Admin second reply | 201 | timestamp **unchanged** |
| PATCH `WAITING_FOR_CUSTOMER` | 200 | |
| Customer send | 201 | |
| PATCH `RESOLVED` | 200 | |
| Customer send | 201 | reopens |
| PATCH `CLOSED` | 200 | `closed_at` set |
| Customer send | **409** | message count unchanged (5 → 5) |
| Parallel CLOSED sends | **409 / 409** | no insert |

Stale-dist first pass: customer SUPPORT send returned **500** `invalid input syntax for type uuid: ""` — High, fixed (see Confirmed fixes).

### E — Report lifecycle

- PATCH `REVIEWED` / `ESCALATED` / `DISMISSED` → 200
- Dismissed still listed (`GET /admin/stays/reports?limit=50` contains the id)
- Escalate ensures ticket (already present); URGENT not downgraded (safety tickets stayed HIGH, not lowered)
- Investigation transcript `GET …/reports/:id/conversation?kind=conversation_reported` → 200, `conversation.type = BOOKING`

---

## 5C — Concurrency

1. **Two simultaneous reports on the same BOOKING conv:** 201 + 201, **two** canonical rows (see M-DUP). The 23505 reuse path applies when two inserters share the **same** `report_id`, not when each POST creates a new report.
2. **Two customer sends on CLOSED:** 409 + 409, no extra `stays_messages`.
3. **Admin GET messages vs customer send (M1):** code still clears `unread_for_support` without a ticket lock (`listMessagesForAdmin`). First probe’s customer send 500’d (stale dist). **Not High** — same Medium as Phase 1.1 M1. Not fixed in Phase 5.
4. **Two `applyDesires` inserts vs `UNIQUE(dedupe_key)`:** find-then-`save` + fail-soft. **High (fixed):** retry as update after 23505 so the winner row is updated instead of swallowed.

---

## 5D — Security

| Probe | Expected | Actual |
|---|---|---|
| Other user `GET /support/tickets/{id}` | 404 | 404 |
| Other user `GET …/csat` | 404 | 404 |
| Other user send on SUPPORT thread | 404 | 404 |
| Customer `GET /admin/stays/support/signals` | deny | **403** (RolesGuard; not 404) |
| Customer operations/overview | deny | 403 (stale dist was 404) |
| Admin `GET/POST` BOOKING messages via messaging API | 404 | 404 |
| Investigation transcript of reported BOOKING | 200 via report-scoped API | 200 |
| Foreign attachment id | no signed URL | 404 |
| PATCH extra `dedupe_key` / `requester_user_id` | reject | **400** `forbidNonWhitelisted` |
| Note body in messages / activity metadata | absent | 0 rows `SECRET_NOTE_PHASE5` in `stays_messages` and audit `metadata` |
| Identity assignment | `getAuthz` ADMIN-before-TX | unchanged; no Identity ticket model |

---

## 5E — SLA consistency

Locked semantics: incomplete `<80%` ON_TRACK, `80–<100%` AT_RISK, `≥100%` BREACHED. Complete: on/before target ON_TRACK else BREACHED. `SUPPORT_SLA` in [`support-sla.config.ts`](../../backend/stays/src/modules/support/support-sla.config.ts).

### First-response matrix (NORMAL 12h, `resolved_at` null)

| Elapsed / window | TS `slaStateFor` | Ticket detail `sla.firstResponse` | Notes |
|---|---|---|---|
| 79.99% | ON_TRACK | ON_TRACK | |
| 80% | AT_RISK | AT_RISK | resolution still ON_TRACK (12h / 72h) |
| 99.99% | AT_RISK | AT_RISK | later crossed 100% as wall clock moved |
| 100% | BREACHED | BREACHED | |
| Complete on target | ON_TRACK | ON_TRACK | `first_admin_response_at = created + 12h` |
| Complete after target | BREACHED | BREACHED | +1s |

### SQL copies

- Ticket list/detail: `computeSupportSla` (TS)
- `slaState` filter: `applySlaStateFilter` → `liveSlaStateSqlNamed`
- Operations overview: `liveSlaStateSql` positional `$n::int`
- Analytics: positional `legStateSql` in `getAnalyticsForAdmin`
- Phase 4 SLA signals: `computeSupportSla`

**High (fixed):** `GET …/tickets?slaState=AT_RISK|BREACHED` returned **500** `operator does not exist: text * interval` because TypeORM named params were text. Named hour params are now `CAST(:slaFrLow AS int)` (and siblings). After fix: AT_RISK **200** (2 rows), BREACHED **200**. Operations overview `slaAtRisk: 2`, `slaBreached: 2` for **active** tickets. List `slaState=BREACHED` also includes CLOSED historical rows (see M-SLA-CLOSED). No preemptive shared-helper extract; TS and SQL agree at the probed boundaries after the cast.

---

## 5F — Operational signals

Live `stays_support_operational_signals` after rebuilt evaluators:

| Type | Observed |
|---|---|
| `REPEAT_REPORT` | ACTIVE after additional report on reported host |
| `REPEAT_SAFETY_REPORT` | ACTIVE after extra safety (severe categories URGENT in engine; ticket stays HIGH) |
| `MULTIPLE_OPEN_TICKETS` | ACTIVE (guest ≥3 open) |
| `SLA_ATTENTION` | ACTIVE on 80–99.99% fixtures; RESOLVED when that ticket later BREACHED |
| `SLA_BREACHED` | ACTIVE on ≥100% fixtures |
| `UNASSIGNED_HIGH_PRIORITY` | ACTIVE; ACK → ACKNOWLEDGED (200); RESOLVED then list eval → **ACTIVE** again |
| `LOW_CSAT_PATTERN` | Unit spec covers activate; live 5 CSATs submitted but not all on one assigned admin — no ACTIVE row. Rule unchanged. |

Engine does not mutate ticket `status` / `priority` / `assigned_admin_id` / `stays_messages`. `safeEvaluate` still fail-softs parent ops.

**GET list write amplification:** `listForAdmin` → `evaluateListedTickets` (SLA + unassigned only) for **returned page**. Dashboard polls ~8s. Measured: signal rows appear after GET/detail, not a full-table scan. **Medium** (not lock-contention High). Not fixed.

---

## 5G — Dashboard vs API

Running Next app (`nexastays_dashboard`). Compile error on `support/page.tsx` extra `}` was already fixed on dashboard `main` (`c2df496`). Live `/support`, `/support/operations`, `/support/analytics` returned 200.

| UI | API |
|---|---|
| Pagination / search / All·My·Unassigned | `limit`/`offset`/`search`/`assignedAdminId`/`unassigned` — 200 |
| At risk / Breached tabs | `slaState` query (not client math) — **500 until High fix**, then 200 |
| CLOSED composer | API 409; message “This support ticket is closed.” |
| Notes / activity | POST notes 201; GET notes/activity 200; note body not in messages |
| SLA labels | `sla` from `toListRow` / `computeSupportSla` |
| Signal Acknowledge | `PATCH …/signals/:id` `{ status: ACKNOWLEDGED }` |
| Related tickets | `/support?ticket=` via `related` 200 |
| Operations MetricCards | `GET …/operations/overview` SQL aggregates (`activeTickets`, `slaAtRisk`, …) |
| Reports drawer | dismissed listed; `operational_signals` on report detail |

**Web:** CSAT prompt unchanged. **No web deploy.**

---

## 5H / 5I — Observability and performance

Support module still has **no** `Logger`. Phase 5 failures were diagnosable from HTTP bodies (`uuid: ""`, `text * interval`). **No structured logs added.**

Performance sanity (EXPLAIN on local small tables shows `Limit` + seq scan; expected at this cardinality):

- Ticket/report list: SQL `LIMIT` / TypeORM `.take(limit)` — not Node full-table load
- Overview: SQL `COUNT(*) FILTER` aggregates
- `hydrateTicketIdentities`: Identity only for rows missing name/email; Phase 5 creates persist name at insert — **not High**
- Related tickets: `RELATED_LIMIT = 10`
- Investigation transcript: cap **50**
- Admin ticket message list: `take: 500` (workspace, not investigation)
- `evaluateListedTickets`: returned page only

---

## Confirmed fixes (Phase 5)

### H-FRESH-027 — greenfield `027` insert vs missing bookings

- **Files:** [`database/stays/migrations/027_restore_orphaned_conversations.sql`](../../database/stays/migrations/027_restore_orphaned_conversations.sql)
- **Expected:** `000`–`042` apply on empty cluster
- **Actual:** FK violation on hardcoded booking ids
- **Fix:** `AND EXISTS (SELECT 1 FROM stays_bookings WHERE id = …)` before insert. Already-applied envs skip `027`.

### H-SUPPORT-SEND-UUID — customer SUPPORT send 500 on contact tickets

- **Files:** [`messages.service.ts`](../../backend/stays/src/modules/messaging/messages.service.ts), [`participant-presentation.service.ts`](../../backend/stays/src/modules/messaging/participant-presentation.service.ts)
- **Reproduction:** `POST /support/tickets` (no booking) → admin reply → customer `POST /messaging/conversations/{supportId}/messages`
- **Expected:** 201
- **Actual:** 500 `invalid input syntax for type uuid: ""` (`resolveGuestDisplayName(conv.booking_id ?? '')`)
- **Fix:** skip occupant lookup when `booking_id` is null; fall back to `"Guest"`. Spec: `sends on SUPPORT contact threads when booking_id is null`.

### H-SLA-NAMED-SQL — `slaState` filter 500

- **Files:** [`operational-intelligence.service.ts`](../../backend/stays/src/modules/support/operational-intelligence.service.ts) `liveSlaStateSqlNamed`
- **Reproduction:** `GET /admin/stays/support/tickets?slaState=AT_RISK`
- **Expected:** 200 filtered list (dashboard At risk / Breached tabs)
- **Actual:** 500 `operator does not exist: text * interval`
- **Fix:** `CAST(:slaFrLow AS int)` (and all named hour params). Spec asserts CAST in filter SQL.

### H-SIGNAL-23505 — concurrent `applyDesires` insert

- **Files:** [`operational-intelligence.service.ts`](../../backend/stays/src/modules/support/operational-intelligence.service.ts)
- **Expected:** one row per `dedupe_key`; loser does not hide the signal
- **Actual:** find-then-save; UNIQUE 23505 thrown into `safeEvaluate` swallow
- **Fix:** retry `applyDesires` once as updates after 23505. Spec: `retries as an update after UNIQUE(dedupe_key) 23505`.

Also removed a duplicate `safeEvaluateConversation` call after customer SUPPORT send (no behavior change).

---

## Accepted limitations (Medium / Low)

### M-DUP — one report POST ≠ one conversation

There is no unique `(conversation_id, reporter_user_id)` on `stays_conversation_reports`. Repeat/concurrent `POST …/report` on the same BOOKING thread creates additional canonical rows and tickets. Ticket unique remains `uq_stays_support_tickets_report_id`. Not changed in Phase 5 (would be a product uniqueness change + data backfill).

### M1 — unread lost-update

`listMessagesForAdmin` still updates `unread_for_support=false` without `FOR UPDATE`. Same as Phase 1.1 Medium.

### M-GET-WRITES — list GET writes SLA/unassigned signals

Dashboard ~8s poll evaluates the current page. No full-table scan. No lock-contention High observed.

### M-SLA-CLOSED — `slaState` list includes CLOSED

Operations overview counts only active statuses. Breached tab can show CLOSED historical tickets. Filter is server SQL, not client math.

### M-N+1-HYDRATE — Identity per missing name/email

Only missing rows; persist on create. Batch not required for launch.

### M-NO-LOGGER — support module has no Logger

Messaging has Logger; support does not. Phase 5 Highs were diagnosable from HTTP. Not added.

### L-LOW-CSAT-LIVE — pattern needs 5 CSATs on one assigned admin

Unit spec covers activate. Live submitted 5 ratings across mixed tickets; no `LOW_CSAT_PATTERN` row. Rule engine unchanged.

### L-STALE-DIST — `npm start` does not watch

Operators must rebuild after pull (`npm start` or `nest build && node dist/main`).

---

## Test results

```
cd backend/stays
npx jest src/modules/support src/modules/messaging --no-coverage
```

**16 suites / 134 tests passed** (was 131; +3 for Phase 5 findings). Dashboard: no app code changes (docs only). Web: no changes.

---

## Deploy checklist

1. Apply stays migrations **036–042** in filename order (`migrate.ps1`, never `-Reset` on unified stack). New empty clusters need the **027** booking-exists guard (already-applied DBs skip 027).
2. Deploy **backend/stays** including Phase 5 High fixes. Confirm `DB_SYNCHRONIZE=false`. Restart from a **fresh build** (`npm start` rebuilds `dist`).
3. Deploy **dashboard** (Phase 4 UI already on `main`; this commit is the readiness doc).
4. **Do not** deploy web for Phase 5.
5. Smoke: contact ticket customer reply 201; `GET …/tickets?slaState=AT_RISK` 200; admin signals list 200; customer BOLA 404; CLOSED customer send 409.

---

## Final verdict

**Production ready.** Critical: none. High: four confirmed, all fixed and retested. Medium/Low accepted as above. Support & Trust planned phases **stop here**.
