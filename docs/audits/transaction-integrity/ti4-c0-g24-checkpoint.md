# TI4-C0 / G24 — legacy GM Store Dashboard pending sales: stable request identity

Branch `audit/ti4c0-g24-pending-sale-identity`, cut from `main` @ `530697f85227ddb41a01085f4185cccf4f25921e`. Level: **L1 only** (offline, one client). Not L2 (cross-client), not L3 (durable), not live Foundry.

## 1. Defect (verified on the baseline)

The legacy dashboard's Pending Sales tab rendered Approve / Set Amount / Deny with `data-index="{{@index}}"`; the click handlers passed `Number(dataset.index)` to `_resolvePendingSale(index, …)`, which re-read `pendingSales` from the setting and acted on `pendingSales[index]` and `pendingSales.splice(index, 1)`. When the queue changes between render and click (another request resolved from the GM Datapad, a new request, a reorder), the index points at a different request. Fail-before reproduction on `530697f` (tests 1, 2): with rendered queue `[r1, r2, r3]` and `r1` resolved elsewhere, a click aimed at `r2` approved and sold **`r3`'s item**; a Deny aimed at `r1` removed **`r2`**.

Reachability (not dead code): `GMStoreDashboard` is registered as the `gmStoreDashboard` settings menu (`scripts/core/settings.js`) and has a sidebar launcher (`actor-sidebar-controls.js`). The GM Datapad's store-control surface (`GMStoreControlSurfaceController`) already resolves pending sales by request id through `GMStoreOperationsService.resolvePendingSaleRequest`. The dashboard also carried a second, divergent copy of the sale logic (its own `executeSaleTransaction` call, no approval hook, a different audit record).

## 2. Change

- `templates/apps/gm-store-dashboard.hbs`: the three pending-sale buttons (and their row) carry `data-request-id="{{this.id}}"`, not `data-index`. A request with no id renders an "Unidentifiable request" label instead of buttons.
- `scripts/apps/gm-store-dashboard.js`: the three handlers read `dataset.requestId`. `_resolvePendingSale(requestId, action, customAmount)` accepts **only a non-blank string id** (a numeric position is refused) and delegates to `GMStoreOperationsService.resolvePendingSaleRequest`; the duplicated sale/splice/setting logic is deleted. Approve → `approve`, Set Amount → `approve` with the amount (same `store-sale-approval` context as before), Deny → `deny` with the reason "Denied from legacy GM Store Dashboard".
- `scripts/ui/shell/gm/GMStoreOperationsService.js` (the existing canonical authority; no competing service): `resolvePendingSaleRequest` now refuses a blank / missing / non-scalar id (`pending-sale-invalid-id`) — previously a blank id matched the first **id-less** request — refuses **duplicate** ids for every decision (`pending-sale-ambiguous-id`), and refuses a concurrent repeat for an id already being resolved (`pending-sale-in-progress`, per-id in-memory guard, released in `finally`). Not-found is unchanged. These guards also protect the GM Datapad path.
- `TransactionEngine` is not touched and remains the only authority for credits and items; historical sale records are not rewritten.

## 3. Behaviour changes to note

- A dashboard approval now behaves as a Datapad approval does: the `swseStoreSaleApproved` hook fires (the old dashboard path did not fire it) and the audit record carries the Datapad's fields (`approvedBy`, `requestType`, `source: 'GM Store Control Approvals'` instead of `'Legacy GM Store Dashboard'`). Deny and its `swseStoreSaleDenied` hook are unchanged; the deny notification now also appears (it already did on the Datapad).
- Requests lacking a stable id can no longer be resolved from the dashboard (and, via the canonical guard, from anywhere). `ItemSellingSystem` always assigns an id (`saleRequestId()`), so only malformed/legacy setting data is affected; this was never safe to resolve by position.
- A second click while the first is in flight is refused instead of racing.

## 4. Evidence

`tests/ti4c0-g24-pending-sale-identity.test.mjs` — 17 checks on the real dashboard and service with a recording `executeSaleTransaction` model and an in-memory `pendingSales` setting. **Fail-before on `main`:** 3/15 passed (the first version of the file; tests 1–2 show the wrong sale being approved/removed). **After:** 17/17. Coverage: queue reordering / removal of earlier entries, stale index (approve, deny), numeric ids refused, approve / deny / Set Amount by id, normal approval behaviour (price, queue, notice, hook, refresh), no duplicated sale logic in the dashboard (delegation + source check), missing / blank / unknown / id-less ids (dashboard and canonical service), duplicate ids, stale click after resolution, repeated and concurrent clicks, failed sale keeps the request queued and releases the guard, item-no-longer-owned guard, template and handler addressing.

Mutation checks (each reverted): service blank-id guard removed → 2 failures; duplicate-id guard removed → 2; in-flight guard removed → 1; dashboard deny sent as approve → 3; custom amount dropped → 3; Approve / Deny handler back to `dataset.index` → 2 each; Set Amount button back to `data-index` → 2; positional fallback for numeric ids → 4. One mutation survived and is an **equivalent mutant**: letting an id-less request match (`String(request?.id ?? '') === requestId`) changes nothing because the blank-id guard has already rejected the only id that could match it.

Rolling suite `Result: 393 passed, 0 failed (of 393 run; 5 excluded as documented pre-existing failures)`; rolling syntax check; `validate-partials`; `system.json` parse; `git diff --check`; every `node tools/…` guard in `rolling-system-validation.yml` passes locally (the feat-inventory guard rewrites generated reports; reverted, not part of this change).

## 5. Not changed / remaining

- `pendingApprovals` (custom droid/vehicle purchases) are also addressed by `data-index` in the same dashboard (`preview-approval` / approve / deny handlers). That is a **separate surface** (it already routes through the shared approval service per TI-3 notes) and is outside G24's authorized scope; flagged for the owner.
- The dashboard still overlaps the GM Datapad's store control. Retiring the legacy dashboard is a product decision (it also hosts the transaction history, availability and pricing tabs) and was not attempted.
- No per-request in-flight guard exists across clients (L2): two GMs on different clients can still race on the same request through the world setting; the first to persist wins and the second finds it not found.
