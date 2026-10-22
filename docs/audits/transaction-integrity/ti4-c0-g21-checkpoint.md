# TI4-C0 / G21 — Legacy GM dashboard reversal convergence (checkpoint)

Base: PR #1068 (`audit/ti4c0-g20-rollback-replay`) at the certified head `a8cfa74e4bfda5c83e9d81a954da794b3b4a8007`. Stacked draft PR; earlier branches unmodified.
Evidence level: **L1** (offline, single client, real dashboard + service + engine over an in-memory actor model, dialogs injected). No L2 (cross-client coordination) or L3 (durable recovery/reload) claim. No rules decision was needed; the credits-only vs full-rollback question was resolved by converging on the canonical workflow, as the directive prefers.

## 1. Defect (verified on the base head)

`GMStoreDashboard._reverseTransaction(index)` (legacy dashboard) looked up `this.transactions[index]` and called `TransactionEngine.executeCreditAdjustment({transactionContext:'store-rollback-correction', …})` directly. It never called `executeRollbackCorrection`, so it bypassed the G20 guard, **never marked the source `Rolled Back`**, and could be repeated: demonstrated on the base head, two clicks on the same row left the actor at **1100** credits (900 + 100 + 100).

## 2. Source preflight findings

| Question | Finding |
|---|---|
| Legacy projection | `_loadTransactionHistory` flattened `TransactionEngine.getAllTransactions({includeZeroCost:false})` to `{transactionId, actorId, amount, item, …}` — no status, no `rolledBackByTransactionId`, no `rollbackOf`, no rollbackability. The template addressed rows by `data-index="{{@index}}"` and showed the button on **every** row (including rollback records and already-rolled-back sources). |
| Legacy semantics | Credits only: its confirm said "Ledger Correction Only … inventory items are not restored or removed". |
| Canonical semantics | `GMStoreOperationsService.rollbackTransaction(index, {transactions, render})`: confirmation prompt with a reconciliation preview ("Credit adjustment: ±N", "Owned items to remove: N", "Manual review: …", reason), then `TransactionEngine.executeRollbackCorrection` (credits + owned Item removals + source marking, G20-guarded), then inventory-policy quantity restore. It is addressed by array index and gated by the **caller-supplied** `canRollback`/`canReverse` of the row (the datapad computes it in `_formatTransactionEngineRow`). |
| Stable-id entry point | None existed. |
| Who else calls the service | `GMStoreControlSurfaceController` (datapad) only; unchanged. |

## 3. Change

- **`GMStoreOperationsService`** (additive; `rollbackTransaction` unchanged):
  - `rollbackability(tx)` — pure rule over an authoritative ledger record: needs a stable id; a rollback/correction record, an already-rolled-back source (`status:'Rolled Back'` or `rolledBackByTransactionId`) or a zero-credit-impact record is not reversible (same rule the datapad row uses).
  - `rollbackTransactionById(transactionId, actorId, context)` — GM-only; requires string ids; resolves the actor, then the transaction **from the current `TransactionEngine.getActorTransactions(actor)` ledger**; fails closed on unknown id (`transaction-not-found`), ambiguous id (`transaction-ambiguous`), a record claiming another actor (`transaction-actor-mismatch`), and a non-reversible record (including `already-rolled-back`); builds the one-row array from the authoritative record with `canRollback` **derived** from `rollbackability()` (never from a caller or a rendered row) and calls the unchanged canonical `rollbackTransaction(0, …)`.
- **`GMStoreDashboard`**: `_reverseTransaction(transactionId, actorId)` now only delegates to `rollbackTransactionById` (with a `render` callback). The direct `executeCreditAdjustment` path and the credits-only confirm are removed. A numeric argument (the old rendered index) is not an identity and is refused. `_loadTransactionHistory` additionally projects `status`, `rolledBackByTransactionId`, `rollbackOf` and `canRollback`.
- **Template**: the button is rendered only when `canRollback`, carries `data-transaction-id` / `data-actor-id` (no `data-index`), is labelled **Roll Back**, and its tooltip says it adjusts credits **and can remove owned Items**, previewed first, once only. Non-reversible rows show "Rolled Back" or "—".
- Behaviour for the GM: the dialog is now the canonical rollback prompt (with the item/credit preview) instead of the credits-only confirm. This is an intentional, disclosed change in scope (credits-only → credits + owned-Item reconciliation); nothing is deleted before the GM accepts that preview.
- Unchanged: the datapad path, `TransactionEngine` (incl. G20), SnapshotManager, other dashboard tabs (G24's pending-sale index handling untouched).

## 4. Historical / source-less records (documented treatment)

The dashboard lists only the TransactionEngine ledger (`flags.foundryvtt-swse.transactions`). A record **without a stable id** has no address: it is shown without a button and `rollbackTransactionById` would refuse it (it was previously clickable and was adjusted under its generated id). Rollback/correction records and already-rolled-back sources show no action. Legacy `purchaseHistory` mirrors are not on this dashboard (the datapad lists them as `canReverse:false`).

## 5. Tests — `tests/ti4c0-g21-legacy-dashboard-reversal.test.mjs` (21 checks)

**Fail-before** (base head): 3 of 20 passed (the 21st, a refinement, was added after). Direct defect shown by checks 1–2: the legacy route made the direct `store-rollback-correction` adjustment and a double click produced 1100 credits. **After:** 21/21.
Coverage: no direct credit-adjust reversal; no double credit via the legacy index route; stable-id reversal delegates to the canonical service once, marks the right source with its rollback id, removes the purchased Item, one success notice, dashboard refresh; second reversal refused (no credits/Items/records, accurate "already rolled back" message, no prompt); stale reordered list cannot reverse another transaction and a numeric index is refused; unknown/blank/ghost-actor/other-actor ids, ambiguous ids and a mismatched record fail closed with no prompt and no success notice; cancelling the confirmation mutates nothing; the prompt discloses "Credit adjustment" and "Owned items to remove" before any mutation and the old credits-only text is gone; engine failure → error, no success notice, source unmarked; non-GM refused; the datapad path still reverses by index, honours its `canRollback` gate and is still stopped by G20 on replay; rollback/zero-impact/id-less/already-rolled-back rows are not reversible and stay so after a refresh; supplementary structural guards (template ids/gating/wording; no `executeCreditAdjustment` or `store-rollback-correction` in the dashboard; handler passes ids).

Mutation checks (each reverted): direct credit-adjust path reintroduced → 4 failures; resolve by stale index → 1; already-rolled-back allowed → 3; identity checks (mismatch/ambiguity) skipped → 2; credits-only confirmation reintroduced → 1; success notice after a refusal → 1; template button ungated → 1.

## 6. Verification

G21 21/21; G20 15/15; `ti2-commerce-integrity` passes; rolling suite `Result: 390 passed, 0 failed (of 390 run; 5 excluded as documented pre-existing failures)`; guards 26 of 27 pass locally; `validate-partials`, `system.json` parse and the rolling syntax check (2883 files) pass; `git diff --check` clean. The guard `node tools/migrate-phase-5c-weapon-references.mjs --check` crashes only in a local git worktree (`ENOTDIR … .git/index`) and is verified in exact-head CI, not reported as locally passing.

## 7. Remaining limitations (not certified)

- **L1 only.** G20's guard is the final replay defence and is same-client (process-local lock, read-then-write, no compare-and-swap); another client can still race a rollback. No L2/L3.
- The dashboard's rows are a snapshot from the last render; the identity is re-resolved on click, but the GM confirms against the preview computed at click time, not at render time.
- The legacy credits-only correction no longer exists from this UI. A pure credit correction without Item reconciliation must use a source-less correction by another route; none is offered here.
- Inventory-policy quantity restore and Item reconciliation (`unmatchedItems`, manual review) are the canonical service's existing behaviour and are not re-certified here; droid/vehicle assets still need manual review as before.
- G24 (pending-sale index addressing on the same dashboard), G22, G26, G34, G35 and TI4-B/C are untouched.
