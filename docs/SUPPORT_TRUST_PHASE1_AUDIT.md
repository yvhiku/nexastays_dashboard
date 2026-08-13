# Support & Trust Phase 1 Audit

**Date:** 2026-08-13  
**Scope:** `database/stays` (036/037), `backend/stays`, `backend/identity`, `nexastays_web`, `nexastays_dashboard`  
**Method:** Code + migration inspection; unit specs for support/messaging (30 passed); no Phase 2 work.

## Executive summary

**Overall status: Ready with fixes**

The locked chain (Report/Safety/Contact → canonical row → one Support Ticket → SUPPORT conversation → stays_messages → SSE) is implemented and largely coherent. Customer BOLA, admin SUPPORT-only messaging ACL (via ticket APIs, not the unused `isAdmin` path), evidence allowlisting on submit, and PATCH mass-assignment controls look sound.

Launch blockers are **ops lifecycle / transaction gaps**, not a missing architecture:

1. Customer follow-ups on **RESOLVED** tickets do not reopen and can hide under Open filters.
2. **CLOSED** tickets still accept customer messages while admins cannot reply.
3. Report/safety **canonical create + ensureTicket** are not one transaction; escalate persists **ESCALATED** before ticket ensure.

Fix those before treating Phase 1 as production-ready. Then polish unread TX boundaries, reports list bias, and deploy-order docs.

---

## Critical — must fix before launch

### C1. Customer message on RESOLVED does not reopen; unread can be invisible in Open queue

- **Severity:** Critical  
- **Affected flow:** D (admin ops), customer SUPPORT reply  
- **Files:**  
  - [`backend/stays/src/modules/support/support-tickets.service.ts`](../backend/stays/src/modules/support/support-tickets.service.ts) (`markUnreadForSupportFromCustomerMessage`)  
  - [`backend/stays/src/modules/messaging/messages.service.ts`](../backend/stays/src/modules/messaging/messages.service.ts) (`markSupportUnreadIfNeeded`)  
- **Root cause:** Customer send only sets `unread_for_support` + preview. It never changes ticket `status`. Audit expectation was `RESOLVED → OPEN`; actual behavior keeps `RESOLVED`. Default dashboard filter is `OPEN`, so follow-ups rely on agents noticing unread on non-Open tabs or “All”.  
- **Reproduction:** Resolve ticket → customer replies in SUPPORT inbox → `unread_for_support=true`, status stays `RESOLVED` → Support page Open tab does not list it.  
- **Recommended fix:** On customer message (requester), if status is `RESOLVED` (and optionally `WAITING_FOR_*`), set status to `OPEN` (or `IN_PROGRESS`). Do **not** reopen `CLOSED` unless product explicitly allows it—see C2.

### C2. CLOSED tickets accept customer messages; admin reply returns 404

- **Severity:** Critical  
- **Affected flow:** D, customer SUPPORT send  
- **Files:**  
  - [`support-tickets.service.ts`](../backend/stays/src/modules/support/support-tickets.service.ts) (`sendAdminMessage` rejects `CLOSED`)  
  - Messaging permissions still allow send while conversation `messaging_state` remains `ACTIVE`  
- **Root cause:** Closing a ticket does not lock the SUPPORT conversation. Customers can keep messaging; `markUnreadForSupportFromCustomerMessage` still fires; admins cannot reply (`NotFoundException`).  
- **Reproduction:** Close ticket → customer sends → unread badge may appear → admin reply fails.  
- **Recommended fix:** On `CLOSED`, set conversation to `LOCKED`/`READ_ONLY` (or deny send in support path), and/or reject customer sends when linked ticket is `CLOSED`. Document product rule: reopen requires new ticket or explicit reopen action.

---

## High

### H1. Report/safety canonical row + ticket create are not atomic

- **Severity:** High  
- **Affected flow:** A, B  
- **Files:**  
  - [`conversations.service.ts`](../backend/stays/src/modules/messaging/conversations.service.ts) (`report`, `safety`)  
  - [`support-tickets.service.ts`](../backend/stays/src/modules/support/support-tickets.service.ts) (`createReport` / `createSafetyIssue` then `ensureTicketFor*`)  
- **Root cause:** Two separate write phases. If `ensureTicket*` fails after the canonical save, a report/safety row exists with **no** ticket / no SUPPORT thread. UI error path shows failure; admin still sees a report without linked ticket.  
- **Reproduction:** Force failure in `createTicketForUser` after `createReport` (e.g. inject TX error).  
- **Recommended fix:** Single transaction: insert report/safety + ticket + SUPPORT conversation + first message; keep unique-index race reuse.

### H2. ESCALATED status committed before ticket ensure

- **Severity:** High  
- **Affected flow:** E  
- **Files:** [`support-tickets.service.ts`](../backend/stays/src/modules/support/support-tickets.service.ts) (`applyTrustStatus`)  
- **Root cause:** Status is saved first; then ticket is loaded/created; then priority may bump. Failure after status save leaves `ESCALATED` without ticket.  
- **Reproduction:** Patch to `ESCALATED` with ticket ensure failing (e.g. missing source conversation).  
- **Recommended fix:** Ensure/reuse ticket inside the same logical unit before or with status commit; or roll back status if ensure fails.

### H3. Customer reply does not move WAITING_FOR_* → open/in-progress

- **Severity:** High (ops)  
- **Affected flow:** D  
- **Files:** `markUnreadForSupportFromCustomerMessage`  
- **Root cause:** Same as C1—status never updates on customer send. Tickets left in `WAITING_FOR_CUSTOMER` stay there after the customer replies; agents must patch manually.  
- **Recommended fix:** On requester message: `WAITING_FOR_CUSTOMER` / `WAITING_FOR_HOST` → `OPEN` or `IN_PROGRESS`; keep priority; bump `updated_at`.

---

## Medium

### M1. `unread_for_support` updated outside the message transaction

- **Severity:** Medium  
- **Affected flow:** Customer SUPPORT send  
- **Files:** [`messages.service.ts`](../backend/stays/src/modules/messaging/messages.service.ts) (post-TX `markSupportUnreadIfNeeded`)  
- **Root cause:** Message can commit while unread mark fails → queue misses “New”.  
- **Recommended fix:** Update ticket unread inside the same TX as message insert (or outbox-driven compensation).

### M2. Admin GET messages clears unread (side effect)

- **Severity:** Medium (document / race)  
- **Affected flow:** D  
- **Files:** `listMessagesForAdmin`  
- **Root cause:** Intentional clear-on-read. Concurrent customer send can race with clear. Dashboard 8s poll can clear unread when workspace is open even if agent did not “read” yet.  
- **Recommended fix:** Keep behavior but clear only when agent opens workspace / marks read; or accept and document. Prefer not clearing on background poll if listMessages is polled blindly (current support page polls every 8s while selected).

### M3. Reports list fetch bias (200 + 200 then slice)

- **Severity:** Medium  
- **Affected flow:** Admin reports  
- **Files:** `listReportsForAdmin`  
- **Root cause:** Loads up to 200 reports and 200 safety issues, merges by `created_at`, then slices to `take`. Under load, one kind can crowd out the other.  
- **Recommended fix:** Phase 2 pagination; interim unified SQL `UNION ALL` with single ORDER/LIMIT.

### M4. Dashboard ticket detail can stay stale after PATCH

- **Severity:** Medium  
- **Affected flow:** D  
- **Files:** [`nexastays_dashboard/app/(dashboard)/support/page.tsx`](../nexastays_dashboard/app/(dashboard)/support/page.tsx)  
- **Root cause:** `onChanged` reloads list; workspace `detail` refreshes on 8s interval, not immediately after status/priority/assign.  
- **Recommended fix:** After successful patch/send, re-fetch `fetchTicket` for the open id.

### M5. Migration / deploy order: backend requires 037

- **Severity:** Medium (deployment)  
- **Affected flow:** All  
- **Files:** [`037_support_trust_ops.sql`](../../database/stays/migrations/037_support_trust_ops.sql), entities writing `OPEN` + context columns + `requester_email`  
- **Root cause:** Backend after Phase 1 assumes uppercase trust statuses and new columns. Deploying app before 037 breaks inserts/updates. Pre-037 DBs with duplicate `report_id` ticket rows fail unique index creation.  
- **Recommended fix:** Run 036→037 before/with backend; preflight `COUNT` duplicates on `report_id`/`safety_issue_id`; document in release notes.

### M6. Support filter tabs lost per-status counts

- **Severity:** Medium (UX)  
- **Affected flow:** D  
- **Files:** support page  
- **Root cause:** Server-side filter removed client count-from-dump; tabs no longer show accurate Open/In progress counts (only total on “All”).  
- **Recommended fix:** Optional `open-count`-style endpoints per status, or accept until Phase 2.

---

## Low / polish

### L1. Dashboard support is poll-only (8s), no SSE

- Expected for Phase 1 ops UI. Document latency for unread/status.

### L2. `isAdmin` messaging path is dead in production

- Permissions support ADMIN-on-SUPPORT, but no caller passes `{ isAdmin: true }`. Admin correctly uses `/admin/stays/support/tickets/...` instead. Safe today; remove or wire deliberately later.

### L3. Safety `supportUrl` still returned; web ignores when thread exists

- Backward compatible. Old clients may still land on `/contact`. Acceptable.

### L4. Organic `/contact?report_id=` after auto-ticket is idempotent

- Unique index + reuse path works. Not a bug.

### L5. Assigned admin id not validated as a real ADMIN user

- Mass-assignment safe; wrong UUID can be stored. Low.

### L6. Signed evidence URLs are public-with-signature until expiry

- By design (`@Public()` media route). Protect secret; use short TTL if needed.

### L7. Report/safety success without `supportConversationId`

- CTA becomes “Done” only—no thread. Tied to H1 failure modes.

---

## Verified working

Traced in code (and covered by unit specs where noted):

| Flow | Result |
|------|--------|
| **A Report** | Participant check; reject SUPPORT nesting; context copy; `ensureTicketForReport`; response `supportConversationId`; web CTA → `/inbox/{id}`; admin reports + ticket link |
| **B Safety** | Same pattern; `supportUrl` retained; web prefers thread |
| **C Contact** | Authenticated `POST /support/tickets`; TX creates ticket + SUPPORT conv + first message; redirect to inbox; SSE publish to requester |
| **D Admin ops** | Paginated list (`limit`/`offset`/`total`/`hasMore`); filters/search; open-count for overview; messages clear unread; assign/priority/status; reply increments guest/host unread + SSE to requester; CLOSED reply blocked |
| **E Lifecycle** | Kind-required PATCH; whitelist statuses; dismissed still listed; escalate does not downgrade URGENT/HIGH; ticket status independent of report status |
| **Idempotency** | Partial unique indexes + 23505 reuse for report/safety ticket links (spec covered) |
| **canReport on SUPPORT** | Disabled (spec covered) |
| **Dashboard honesty** | No false “API not connected” / `isNotImplemented` soft-fail on support/reports pages |

Unit tests run: `support-tickets.service.spec`, `conversations.service.spec`, `permissions.service.spec`, `messages.service.spec` — **30 passed**.

---

## Security findings

### BOLA (customer)

**Result: Pass (with notes)**

- Tickets: `listForUser` / `getForUser` scoped by `requester_user_id`; foreign id → 404.  
- Contact links: `resolveOwnedLinks` ownership checks for booking/listing/report/safety; failures → `Ticket not found` (no existence leak).  
- Conversations: participant-only; non-participant → 404.  
- Report/safety: participant-only; SUPPORT type rejected as 404.  
- No customer GET-by-id for arbitrary report/safety UUIDs outside owned ticket create path.

### Admin authorization

**Result: Pass for guest↔host isolation**

- Admin ticket/report APIs: `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')`.  
- Admin replies go through ticket → `conversation_id` created as `SUPPORT` only.  
- Customer messaging API never passes `isAdmin`, so ADMIN JWT cannot open booking conversations via `/messaging/...` unless they are a real guest/host participant.  
- Gap: any ADMIN can open any support ticket (no assignment ACL)—acceptable for Phase 1.

### Evidence authorization

**Result: Pass on write path; signed-read by design**

- Submit: `assertEvidenceReady` requires attachment ids owned by uploader + same conversation + image mime.  
- Admin detail: `buildEvidence` only resolves IDs already on the canonical `attachment_ids` list (not client-supplied arbitrary ids).  
- `resolveEvidenceForCanonical` exists for allowlist refusal (unit tested) but HTTP detail uses stored ids only—sufficient.  
- Media GET is `@Public()` with HMAC expiry/signature—anyone with a live signed URL can fetch (standard).

### Mass assignment

**Result: Pass**

- Global `ValidationPipe`: `whitelist` + `forbidNonWhitelisted`.  
- `PatchSupportTicketDto`: status, priority, `assigned_admin_id` only.  
- `PatchTrustReportDto`: `kind` + `status` only.  
- Extra fields on PATCH rejected.

---

## Transaction findings

| Operation | Atomic? | Orphan risk |
|-----------|---------|-------------|
| Contact / `createTicketForUser` (ticket + SUPPORT conv + first message) | Yes (single TX) | Low — rollback together; `conversation_id` UNIQUE NOT NULL held |
| Report/safety create + ensureTicket | **No** | **Yes** — canonical row without ticket (H1) |
| Escalate | Status save then ensure | **Yes** — ESCALATED without ticket (H2) |
| Admin reply | Message + unread + ticket patch in TX | Low |
| Customer send + unread mark | Message TX then separate unread update | Message without unread flag (M1) |

**Orphan SUPPORT conversation without ticket:** Not expected on the create path (same TX).  
**Ticket without conversation:** Blocked by NOT NULL + TX.  
**Ticket without first message:** Rolled back with create TX.

---

## SSE / unread findings

**Verified behavior:**

| Event | Behavior |
|-------|----------|
| Customer text/image/file on SUPPORT | After send, `unread_for_support=true`, preview + `updated_at` updated (outside TX) |
| Admin lists messages | Clears `unread_for_support` |
| Admin reply | Clears support unread; increments `unread_guest` or `unread_host` by party; SSE `MESSAGE_CREATED` to `requester_user_id` |
| Customer send SSE to “counterpart” | SUPPORT often has null host/guest counterpart; `publish` no-ops on null — **OK** (admin uses poll, not SSE) |
| RESOLVED + customer message | Unread true; **status unchanged** (C1) |
| CLOSED + customer message | Unread may set; admin cannot reply (C2) |
| Dashboard | 8s polling only — no admin SSE |

Reconnect: customer SSE reconnects via existing messaging realtime client; no support-specific gap found beyond general messaging behavior.

---

## API contract findings

| Area | Status |
|------|--------|
| Report response `supportConversationId` / `ticketId` / `ticketNumber` | Match web adapter (camelCase from controller) |
| Safety same + `supportUrl` | Match; web prefers conversation id |
| Create ticket `conversation_id` (snake) | Match contact page |
| Admin tickets pagination `items/total/limit/offset/hasMore` | Match dashboard `fetchTickets` |
| `open-count` `{ total }` | Match overview/stats |
| Ticket snake→camel (`ticket_number`, `unread_for_support`, `requester_email`, …) | Match `mapTicket` |
| Report nested `reporter` / `reported_user` / `booking` / `listing` / `ticket` / `evidence` / `evidence_count` | Match `mapSafetyReport` |
| No silent `unavailable: true` on support/reports | Confirmed removed |

**No critical silent undefined mapping** found on primary fields. Minor: list ticket `customer_name` null displays as `"—"` in UI (intentional).

---

## Migration findings

| Item | Finding |
|------|---------|
| 036 | Creates reports, safety, tickets; `conversation_id UUID NOT NULL UNIQUE`; lowercase report/safety statuses |
| 037 | Uppercases statuses; context columns + backfill; partial unique on `report_id` / `safety_issue_id`; `requester_email`; queue indexes; does **not** alter `conversation_id` |
| Fresh DB | 036 then 037 is correct |
| Existing DB | Unique indexes fail if duplicate linked tickets exist—preflight required |
| Deploy order | **Must apply 037 before (or with) current backend** |
| Idempotency | Runner skips applied files; raw re-run of 037 mostly `IF NOT EXISTS` / DROP+ADD; interrupted status CHECK rewrite is the main footgun |

---

## Recommended fix order

1. **C1 + H3** — On requester message: reopen `RESOLVED` → `OPEN`; move `WAITING_FOR_*` → `OPEN`/`IN_PROGRESS`; never auto-reopen `CLOSED`.  
2. **C2** — Lock or deny send when ticket is `CLOSED`; align admin + customer behavior.  
3. **H1** — Atomic report/safety + ticket + SUPPORT thread + first message.  
4. **H2** — Escalate only after ticket ensure succeeds (or single TX).  
5. **M1** — Move unread mark into message TX.  
6. **M2** — Stop clearing unread on blind 8s poll (or dedicated mark-read).  
7. **M4** — Refresh ticket detail immediately after PATCH/send.  
8. **M5** — Release checklist: migrate 037 + duplicate preflight.  
9. **M3 / M6 / L\*** — Phase 2 or polish.

---

## Explicit non-goals (unchanged)

- No Phase 2 (assignment workflows, internal notes, SLA, guest↔host transcript in admin)  
- No architecture redesign  
- No Identity/Pay support tickets  

**Next step:** a separate small fix plan covering Critical + High only.
