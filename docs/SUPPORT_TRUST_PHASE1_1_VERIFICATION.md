# Support & Trust Phase 1.1 Verification

**Date:** 2026-08-13  
**Commits verified:** backend `78c2985`, `6e12ca9`, `07dfbad`; dashboard `70ae662`  
**Method:** Code-first inspection of current implementation; support/messaging unit specs (37 passed). No Phase 2 work. No production code changes in this audit.

## Executive summary

**Ready with minor fixes**

Phase 1.1 closed the original Critical/High audit blockers for the happy path: customer SUPPORT sends lock the ticket before insert, reject `CLOSED` with 409, apply party-aware waiting / `RESOLVED → OPEN` (clearing `resolved_at` only on that transition) inside the same TX; report/safety provision shares one outer TX with savepoint-safe `23505` reuse; escalation ensures the ticket before persisting `ESCALATED` on the throw-failure path; dashboard disables the CLOSED composer and handles 409 with refresh.

Remaining gaps are edge cases that still violate two acceptance literals in uncommon paths (`ESCALATED` / provision with a null ticket when ensure cannot create or reuse), plus Medium concurrency/UX races (`unread_for_support` clear vs customer send; brief stale composer state). They do **not** restore the original Critical “RESOLVED stays RESOLVED” or “CLOSED still accepts customer messages” failures.

## Critical

None confirmed in current code for the Phase 1.1 happy paths.

(Original Phase 1 Criticals C1 RESOLVED-not-reopening and C2 CLOSED-accepts-customer are verified fixed.)

## High

### H1. Escalation can still persist `ESCALATED` with no ticket when ensure yields null

- **Issue:** After ticket lookup/ensure, `applyTrustStatus` always sets canonical status to `ESCALATED` even when `ticket` remains `null` (missing source conversation, or `ensureTicketFor*` returning null).
- **Severity:** High
- **Affected flow:** Admin trust report/safety PATCH → `ESCALATED`
- **Exact file(s):** [`backend/stays/src/modules/support/support-tickets.service.ts`](../../backend/stays/src/modules/support/support-tickets.service.ts) (`applyTrustStatus`, ~1156–1192)
- **Root cause:** Comment claims failure cannot leave escalated without a ticket, but only *thrown* ensure failures roll back. A successful null return still continues to `status = 'ESCALATED'` and commit; audit may record `ticketId: null`.
- **Reproduction:** Patch a `REVIEWED` report to `ESCALATED` where `conversation_id` has no matching conversation row (or force `ensureTicketForReport` to return `null` without throwing).
- **Expected behavior:** Escalation cannot persist without a ticket (abort TX / reject).
- **Actual behavior:** Status becomes `ESCALATED` with `ticketId: null` when ensure does not throw.
- **Recommended fix:** If `!ticket` after ensure, throw (e.g. `ConflictException` / `BadRequestException`) inside the TX so status is not saved.

### H2. Provision can commit canonical report/safety with `ticket: null` on unreused unique conflict

- **Issue:** `ensureTicketFor*` catches `23505`, then `findOne` for reuse; if reuse is null it returns `null` without throwing. Outer `provision*` then commits the canonical row.
- **Severity:** High (edge race / data anomaly)
- **Affected flow:** Report / safety → ticket provisioning
- **Exact file(s):** [`support-tickets.service.ts`](../../backend/stays/src/modules/support/support-tickets.service.ts) (`ensureTicketForReport` / `ensureTicketForSafetyIssue` catch blocks ~290–296 / ~345–351; `provisionReportWithTicket` / `provisionSafetyIssueWithTicket`)
- **Root cause:** Unique-violation “reuse” path treats missing reuse as soft success (`null`) instead of failing the outer TX.
- **Reproduction:** Nested insert hits `23505`, savepoint rolls back insert, but subsequent find-by-`report_id` returns null (extreme race / wrong key). Provision returns `{ report, ticket: null }` and commits.
- **Expected behavior:** Atomic success = canonical + ticket (or full rollback).
- **Actual behavior:** Throw-after-canonical correctly rolls back (verified by unit mock). Soft-null ensure path can leave orphan canonical without ticket.
- **Recommended fix:** If reuse after `23505` is null, rethrow; optionally assert `ticket` non-null before provision commit.

## Medium

### M1. Admin list messages can clear `unread_for_support` after a newer customer message

- **Issue:** `listMessagesForAdmin` reads ticket then `UPDATE unread_for_support = false` with no pessimistic lock and outside the customer-send TX.
- **Severity:** Medium
- **Affected flow:** Admin opens thread while customer sends
- **Exact file(s):** [`support-tickets.service.ts`](../../backend/stays/src/modules/support/support-tickets.service.ts) (`listMessagesForAdmin` ~748–756)
- **Root cause:** Lost update: admin saw unread=true → customer TX commits unread=true for a new message → admin’s delayed clear wins.
- **Reproduction:** Concurrent admin GET messages + customer POST on SUPPORT.
- **Expected behavior:** Unread clear does not erase a newer unread signal (compare `updated_at` / lock / clear only if no newer message).
- **Actual behavior:** Unread can flip false after a committed customer message.
- **Recommended fix:** Clear unread under ticket `FOR UPDATE`, or conditional update (`WHERE unread_for_support AND updated_at <= :seenAt`).

### M2. Dashboard composer can briefly use stale list/detail status

- **Issue:** `live = detail ?? ticket`. Before detail loads (or if `fetchTicket` fails), list row status drives the composer. Stale OPEN detail can keep composer enabled after list already shows CLOSED (API still returns 409).
- **Severity:** Medium (UX); API enforcement remains correct
- **Affected flow:** Admin support workspace CLOSED UX
- **Exact file(s):** [`nexastays_dashboard/app/(dashboard)/support/page.tsx`](../app/(dashboard)/support/page.tsx) (~391, ~463–466, ~379–387, ~401–404)
- **Root cause:** Preferring detail over list without a “statusChanging / loading detail” soft-disable beyond status PATCH.
- **Reproduction:** Select ticket whose list row is not yet CLOSED while server is CLOSED; or fail detail fetch.
- **Expected behavior:** Composer disabled whenever live/server status is CLOSED; minimal stale window.
- **Actual behavior:** Brief enable possible; 409 path shows “This support ticket is closed.” and refreshes detail.
- **Recommended fix:** Disable composer while `detail === null` for non-lookup tickets, or treat unknown status as send-blocked until detail loads.

### M3. Unused `isAdmin` messaging ACL could bypass ticket CLOSED lock if wired later

- **Issue:** `MessagingPermissionsService` allows admin send on SUPPORT when `{ isAdmin: true }`, but `MessagesService.getParticipantConversation` never passes that flag. `prepareCustomerSupportSend` also returns null for non-requester senders (skipping lock).
- **Severity:** Medium (latent)
- **Affected flow:** Future admin-via-messaging path
- **Exact file(s):** [`permissions.service.ts`](../../backend/stays/src/modules/messaging/permissions.service.ts); [`messages.service.ts`](../../backend/stays/src/modules/messaging/messages.service.ts) (`prepareCustomerSupportSend`, `getParticipantConversation`)
- **Root cause:** CLOSED enforcement lives on ticket lock for requesters and on `sendAdminMessage` for ops; messaging admin path is unused today.
- **Reproduction:** N/A in production until `isAdmin` is wired into message send.
- **Expected behavior:** Any SUPPORT insert path must enforce CLOSED.
- **Actual behavior:** Today’s customer + admin ticket APIs enforce CLOSED; latent bypass if messaging admin send is enabled without lock.
- **Recommended fix:** If wiring admin messaging, call the same ticket lock / CLOSED check (or keep admin-only on ticket APIs).

## Low / coverage gaps

- No CLOSED / lock-order specs for `sendWithAttachments` / `sendWithSession` (only `sendText` covered).
- No assertion that SSE is skipped when TX rolls back (ordering is by code structure only).
- No `provisionSafetyIssueWithTicket` twin rollback / savepoint race specs (report path covered).
- No unit assert that escalate bumps non-URGENT → HIGH (URGENT preservation is covered).
- No concurrency / unread-clear race test for M1.
- `WAITING_FOR_CUSTOMER → OPEN` and `WAITING_FOR_HOST + HOST → OPEN` covered in state helper; effects helper only tests RESOLVED and WAITING_FOR_HOST+GUEST.
- Entity TypeORM metadata does not declare partial unique indexes on `report_id` / `safety_issue_id` (DB migration `037` does).

## State machine verification

Locked Phase 1.1 semantics: requester may send whenever not CLOSED; `WAITING_FOR_HOST` advances only for `party === 'HOST'`; message still allowed for GUEST party with status preserved.

| State | Customer action | Expected | Actual | Result |
|---|---|---|---|---|
| OPEN | requester send | stays OPEN | stays OPEN | Pass |
| IN_PROGRESS | requester send | stays IN_PROGRESS | stays IN_PROGRESS | Pass |
| WAITING_FOR_CUSTOMER | requester send | → OPEN | → OPEN (guest or host party) | Pass |
| WAITING_FOR_HOST + party HOST | requester send | → OPEN | → OPEN | Pass |
| WAITING_FOR_HOST + party GUEST | requester send | status preserved; unread/preview update | preserved; effects set unread, no resolved_at clear | Pass |
| ESCALATED | requester send | stays ESCALATED | stays ESCALATED | Pass |
| RESOLVED | requester send | → OPEN, `resolved_at = null` | → OPEN + `resolved_at = null` | Pass |
| CLOSED | requester send | 409, no message | ConflictException before insert | Pass |
| Non-requester on SUPPORT | send | no ticket side effects / denied by ACL | `prepareCustomerSupportSend` returns null if not guest/host; non-participants get 404 | Pass |

## Transaction verification

### Customer message transaction

- **Order:** `BEGIN` → `prepareCustomerSupportSend` / `lockTicketForCustomerSend` (`FOR UPDATE`) → CLOSED → 409 → `insertMessage` → `applyCustomerSupportMessageEffects` (unread, status, preview, conditional `resolved_at`) → `COMMIT` → `publishMessageCreated`.
- **Same EntityManager:** Yes for text / attachments / session paths.
- **Post-commit unread-only path:** Removed (`markUnreadForSupportFromCustomerMessage` / `markSupportUnreadIfNeeded` absent).
- **SSE:** After successful commit only; throw inside TX prevents publish.
- **If ticket update fails after insert:** Same TX rolls back message (by design).

### Report provisioning

- `conversations.service.report` calls only `provisionReportWithTicket`.
- Outer `dataSource.transaction`: create report (manager) → `ensureTicketForReport({ manager })` → createTicket uses savepoint when manager present (no nested independent TX).
- SSE for new ticket published after outer commit.
- Messaging audit after successful provision.
- Throw after canonical insert rolls back (unit-covered). Soft-null ensure: see H2.

### Safety provisioning

- Same pattern via `provisionSafetyIssueWithTicket`.
- Default ticket priority HIGH on ensure.
- Rollback twin not unit-tested (coverage gap); code path mirrors report.

### Escalation

- Non-ESCALATED: simple status save + audit.
- ESCALATED: one TX → find/ensure ticket (manager) → HIGH unless URGENT → then status ESCALATED → commit → audit after commit.
- Ensure **throw** → TX rollback → prior status preserved (unit-covered REVIEWED case).
- Ensure **null** without throw → H1.

### Rollback behavior

| Failure mode | Result |
|---|---|
| CLOSED lock | No message, no ticket mutation |
| Ticket effects fail after insert | Full TX rollback |
| Ticket ensure throws inside provision | Canonical + ticket work rolled back |
| Escalate ensure throws | Prior status preserved |
| Escalate ensure returns null | Status may still escalate (H1) |

### Locking / concurrency observations

- Customer and admin **sends** serialize on ticket row via `pessimistic_write`.
- Close vs customer send: lock ensures either message then later close, or close then 409—no CLOSED + later-committed customer message on same lock schedule.
- Admin **list** unread clear is unlocked (M1).

## CLOSED enforcement

### Customer API

- `POST …/conversations/:id/messages` → `MessagesService` → lock before insert → `ConflictException('This support ticket is closed.')`.
- Applies to text, attachments, and session sends via `prepareCustomerSupportSend`.

### Admin API

- `POST …/admin/stays/support/tickets/:id/messages` → `sendAdminMessage` → same CLOSED message + 409 (Nest ConflictException).
- Unit-asserted: no `insertMessage` on CLOSED.

### Alternate message paths

- No other SUPPORT customer insert path found outside the three `MessagesService` send methods + ticket provisioning first message.
- Latent unused `isAdmin` messaging path: M3.

### Dashboard UX

- Composer disabled when `live.status === 'CLOSED'` or `statusChanging` / `sending` / lookup.
- 409 → exact copy “This support ticket is closed.” + `refreshDetail` + list refresh; other errors use generic/API message.
- ~8s polling for list (when selected) and detail/messages.

## SSE / unread verification

### Customer → Support

- After commit: `unread_for_support = true`, status per contract, `last_message_preview` updated in same TX.
- Admin queue relies on list/detail polling (~8s)—acceptable; not an SSE-to-admin design.
- `publishMessageCreated` targets the other conversation participant; SUPPORT threads often have a null counterpart—ops visibility is unread + polling, not counterpart SSE. Not a Phase 1.1 regression.

### Admin → Customer

- After commit: requester unread incremented on conversation; `realtime.publish(requester)` with `MESSAGE_CREATED`.
- Ticket `unread_for_support` cleared on admin send; status OPEN/WAITING_FOR_CUSTOMER → IN_PROGRESS (existing behavior).

### Regressions checked

- No duplicate post-commit unread updater.
- No SSE before commit on success paths inspected.
- Unread clear race remains (M1).

## Concurrency findings

### Scenario 1 — Two simultaneous report submissions for same conversation

- No unique constraint on reports per conversation → two reports + two tickets possible. Exactly-one is **per `report_id` / `safety_issue_id`**, not per conversation. Documented limitation, not a Phase 1.1 regression.

### Scenario 2 — Two `ensureTicketForReport` on same `report_id`

- Partial unique index `uq_stays_support_tickets_report_id` (migration 037). Nested path: savepoint + reuse. Standalone create: TX abort + reuse find. Expected: one ticket.

### Scenario 3 — Customer send vs admin close

- Both take ticket `FOR UPDATE`. Safe outcomes: message commits then close, or close wins and customer gets 409 with no message. Must not observe CLOSED + later customer message under that serialization.

### Scenario 4 — Admin opens messages while customer sends

- M1: `unread_for_support` can be cleared after a newer customer message. Remaining Medium issue.

## Regression test results

### Commands run

```text
cd backend/stays
npx jest src/modules/support src/modules/messaging/messages.service.spec.ts src/modules/messaging/conversations.service.spec.ts --no-coverage
```

### Passing specs

- `support-ticket-state.spec.ts`
- `support-tickets.service.spec.ts`
- `messages.service.spec.ts`
- `conversations.service.spec.ts`
- **4 suites, 37 tests, all passed**

### Failing specs

- None

### Required cases → coverage

| Case | Coverage |
|---|---|
| RESOLVED → customer reply → OPEN + resolved_at null | Covered (state + effects specs) |
| WAITING_FOR_CUSTOMER → OPEN | Covered (state helper) |
| WAITING_FOR_HOST + HOST → OPEN | Covered (state helper) |
| WAITING_FOR_HOST + GUEST preserved + unread | Covered (effects spec) |
| ESCALATED stays ESCALATED | Covered (state helper) |
| CLOSED customer → 409 + no message | Covered (messages + lock specs) |
| CLOSED admin → 409 + no message | Covered |
| Ticket side-effect failure → message rollback | By TX structure; no dedicated failing-update mock |
| Report provision failure → canonical rollback | Covered (throw path) |
| Safety provision failure → rollback | **Gap** (code mirror only) |
| Escalation ensure failure → prior status | Covered (throw path) |
| Racing ensure → one ticket | Covered (savepoint reuse + standalone unique race) |
| URGENT escalation remains URGENT | Covered |
| Non-URGENT → HIGH on escalate | **Gap** |
| SSE only after commit | Structural only; **gap** |
| Attachment/session CLOSED | **Gap** |

## Verified working

- Commits present on `main`: `78c2985`, `6e12ca9`, `07dfbad`, `70ae662`.
- Party-aware waiting and RESOLVED reopen with selective `resolved_at` clear.
- CLOSED → 409 for customer messaging API and admin ticket message API; no insert on reject.
- Customer message + ticket side effects share one TX; SSE after commit; old post-commit markUnread removed.
- Report/safety provision uses shared outer TX + savepoint-safe unique reuse; conversations call atomic APIs only.
- Escalation ensure-before-status on throw path; URGENT not downgraded.
- DB partial unique indexes protect one ticket per report/safety id.
- Dashboard CLOSED composer + 409 copy + detail refresh.
- 37 related unit tests passing.

## Remaining known limitations

Only limitations that still exist after Phase 1.1:

- H1 / H2 null-ticket edge paths on escalate / provision.
- M1 unread clear race on admin list vs customer send.
- M2 brief stale composer enable; mitigated by API 409.
- M3 latent unused `isAdmin` messaging bypass.
- Multiple reports/safety rows per conversation still allowed (one ticket each).
- Admin queue freshness ~8s polling (by design).
- Coverage gaps listed above.
- Phase 2 items remain out of scope (notes, SLA, CSAT, canned replies, assignment redesign, guest↔host transcript UI, reports pagination, mobile, Identity/Pay tickets, SSE redesign).

## Final verdict

**Ready with minor fixes**

Phase 1.1 made the Support & Trust system safe for the audited Critical paths and for normal production Report → ticket → reply → reopen → close flows. Do **not** start Phase 2 until H1/H2 are closed (or explicitly accepted as residual risk) if the org requires the literal acceptance criterion “ESCALATED / provision cannot persist without a ticket” in all edge cases.
