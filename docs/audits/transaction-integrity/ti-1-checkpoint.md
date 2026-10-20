# Transaction Integrity — TI-1 Checkpoint (Resource Transactions)

**Branch:** `audit/ti1-resource-integrity`, a child of PR #1056 head `f4555227edfd27669608d2bd577bbb6d64c8dc95` (WP5-C3 independently accepted). Not merged; merging requires explicit owner authorization. PR #1056 / #1057 / #1058 histories untouched.
**Level of every guarantee below: L1** (one Foundry client, offline harness). Force Point cases run against the REAL `ActorEngine.spendForcePoints` / `gainForcePoints` (grafted); persistence and dice are in-memory. Nothing is `FOUNDRY_TESTED`. No L2 (multi-client) or L3 (durable recovery) claim is made.
**Scope kept:** no rules change, no modification code, no inline-spender migration, no `undoLast` removal, no cross-client lock.

## Fixes (each: fail-before test on `f455522`, smallest change, then green)
| Step | Ledger | Defect (reproduced) | Change | Test |
|---|---|---|---|---|
| 1.1 | TX-04a/b/c | `ForcePointSpendCoordinator._safeRefund` swallowed a failed refund and the receipt still said `rolledBack:true`; a spent **bonus** point was refunded to the **normal** pool (lost if at maximum); the refund was not tied to what the spend took | New `scripts/engine/force/force-point-spend-receipt.js` is the single "what did this spend take / give back exactly that" implementation (bonus by entry id, normal as a relative gain, idempotent per part, never throws, `{ok}`); the coordinator **and** the attack transaction (`force-point-transaction.js`) both use it. Failure receipts carry `refundFailed` and the still-deducted `spent`; `reason` says the refund failed | `ti1-resource-integrity` §1.1 (a: failed refund; b: bonus returns as bonus; c: concurrent gain survives; d: partial spend) |
| 1.1b | TX-04 (second path) | `RollCore._refundForcePoints` — a **second**, parallel refund — had the same defects (gain to normal pool, failure only logged) | The coordinator's success receipt carries a non-enumerable, idempotent `refundSpend()`; `RollCore` calls it and returns `forcePointRefundFailed` when the point could not be restored | §1.1b |
| 1.2 | TX-06 | A required action finalized `COMMITTED` (`spend:'not-required'`) for **any** non-committed allowed result, including `economy-modules-unavailable` (no action paid in combat) | The coordinator accepts a non-expenditure only for the authority's established policy no-ops (`out-of-combat`, `free`, `passive`); any other result (unavailable authority, unrecognized shape, empty) is `INDETERMINATE` (existing outcome): Items stay applied but unfinalized, readiness withheld, duplicate never replayed | §1.2 |
| 1.3 | TX-05 | Process-local ledger keyed by `requestId` only: another actor reusing an id was refused as `REQUEST_ID_CONFLICT` | Key is `(actorId, requestId)`; same-actor duplicate still replays, same-actor different-intent still conflicts | §1.3 |
| 1.4 | TX-04 (Force Secrets) | `_processEnhancements` ignored the spend receipt: a Force Secret was applied and displayed as "Force Point spent" even when the spend threw or spent 0 | Applied only when the receipt confirms `spent >= 1`; otherwise skipped and the player is told | §1.4 |

## Existing tests touched (reported, not silent)
* `tests/force-point-transaction-integrity.test.mjs` is a **static source-text** guard. Three pins changed in *form* (same invariant): the `_refundForcePoints` call may carry a trailing `forcePointDetails` receipt argument; the coordinator's refund is now asserted as `giveBack(ActorEngine, …)` + `ActorEngine.gainForcePoints(actor, receipt.spentNormal)` in the shared receipt module (still ActorEngine, still relative); and the failure receipt's `spent` is `0` by default and non-zero only when a refund failed. All other assertions untouched.
* **Mock corrections (4 files, one line each; assertions unchanged):** `equipment-e4c1-wp4-writer-convergence`, `equipment-e4c1-wp5-combat-readiness`, `weapon-readiness-production-path`, `weapon-readiness-ui-contract` mocked `ActionEconomyConsumption.spend` as `{ allowed: true }` / `{ allowed: true, committed: false }` — shapes the real authority never returns (it returns `committed:true`, or a `noOp` with a reason). Under §1.2 such a result is correctly `INDETERMINATE`, so the mocks now return `{ allowed: true, committed: true }`, the real paid-action shape. The full suite caught these (4 failures on the first run).
* **Flaky-test fix (my own accepted C3b test, no assertion changed):** `equipment-e4c1-wp5-c3b-force-point-lifecycle` waited for an in-flight `commit()`/`rollback()` with one `setTimeout(0)` tick; the first step of those calls is a dynamic `import()`, which can outlast one tick under suite load, and the test failed once in a full-suite run ("two simultaneous commit() calls reach the spend authority ONCE: 0 !== 1"). The waits are now condition-based (`until(() => ctl.writes …)`); the test passes 12/12 in parallel and 6/6 sequentially.
* No other existing test file was modified. `equipment-e4c1-wp3a-coordinator` (23 checks), the WP5-C3 suites and the C3b lifecycle suite pass unchanged.

## Independent-review corrections (TI1-R1, TI1-R2) — on `97942ff`
**TI1-R1 — refund receipt concurrency / uncertain writes (reproduced: two simultaneous `giveBack()` calls issued `gainForcePoints` twice; a refund that applied and then threw was retryable).** `force-point-spend-receipt.js` now gives every receipt an explicit refund lifecycle, kept off the receipt in a `WeakMap`: `idle → refunding → refunded | failed | indeterminate`.
* **Single-flight:** concurrent `giveBack()` callers on one receipt share one run and one result; once `refunded` or `indeterminate`, later calls report the settled result and change nothing. This covers every consumer (coordinator `refundSpend()`, `RollCore`, the attack transaction), not only the one with an outer guard.
* **Uncertain writes:** each write is wrapped by an observation of the Force Point pools (`observePools`: normal value + every bonus entry). A write that threw with the pools **unchanged** is a clean failure (retryable; completed parts are not repeated). A write that threw after the pools **changed** is `indeterminate`: it may have fully, partly or not applied, so it is never retried or compensated automatically; `{ ok:false, indeterminate:true, evidence:{before,after} }` is returned. This is deliberately conservative — an unrelated concurrent change during a failed write is also classified indeterminate (the safe direction).
* **Consumers:** the coordinator returns `refundIndeterminate` (+ `evidence`); `RollCore` returns `forcePointRefundIndeterminate`; the attack transaction closes as `state:'refund-indeterminate'` with `refundEvidence`, after which nothing retries it.
* Normal and bonus points still return to their own pools; refunds stay relative (unrelated changes preserved). No new rules or mutation authority — all writes remain `ActorEngine`.

**TI1-R2 — uncertain spend (reproduced: `spendForcePoints` applied the deduction and threw → the coordinator reported "failed, original balance").** `rollAndSpend()` now observes the pools around the spend (the same `observePools`/`poolsChanged` the attack transaction uses — its private copy was removed). If the call threw **and** the pools changed, the result is `{ success:false, spendIndeterminate:true, spent:<observed deduction>, evidence:{before,after,error} }`, no refund handle, no compensation. A throw with the pools unchanged remains a plain failure.

**Tests:** `ti1-resource-integrity` §TI1-R1/R2 — simultaneous refunds (normal, bonus, mixed), clean partial failure then retry that repeats only the outstanding part, unrelated concurrent change preserved, applied-then-threw refund (receipt, coordinator, `RollCore`, attack transaction), applied-then-threw spend (normal and bonus), clean spend failure unchanged. Every behavior assertion fails on `97942ff`; two blocks (unrelated change preserved; partial progress not repeated) pass on both as regression controls. Static pin `force-point-transaction-integrity` loosened again in *form* only (the `_failure` signature gained parameters). **Limits:** L1, single client; `indeterminate` relies on what the pools show to this client.

## Failure-injection matrix (A1–A12) — evidence for the resource domain
| Row | Evidence |
|---|---|
| A1 failed write | C3b (`failWrite`), TI-1 §1.1a, FireStateStore (C3) |
| A2 duplicate | wp3a (journal/ledger replay), C3b (single-flight) ; **gap:** `ActionEconomyConsumption.spend` has no operation id — each call is a new action by design (recorded, not changed) |
| A3 same id/different intent | wp3a |
| A4 retry after uncertain completion | wp3a (journal), C3b (`indeterminate`) |
| A5 independent operations | C3 (two interleaved FP transactions; action spend A/B) |
| A6 refund after intervening operation | C3 (action `superseded`), TI-1 §1.1c |
| A7 repeated refund | C3, C3b, TI-1 (idempotent receipt) |
| A8 failed compensation | C3 (action `failed`), TI-1 §1.1a/1b (`refundFailed`) |
| A9 change between validation and commit | TI-1 §1.1c (relative delta), wp3a (plan digest) |
| A10 authority unavailable | TI-1 §1.2 |
| A11 concurrent sibling change | WP5-C1 field-scoped compensation |
| A12 interrupted execution | wp3a journal classification; **gap:** FP coordinator spend→roll→refund has no durable record (L3) |

## Findings recorded, deliberately NOT changed (need an owner call or a later package)
1. **Free Force Secret at 0 Force Points.** `_processEnhancements` applies a Force-Point Secret with **no payment** when the actor has 0 Force Points (`if (fp > 0) spend`). Whether that is intended is a rules question; left as is (`DESIGN_GAP`, owner decision).
2. **Destiny-Point Secrets** use `spendDestinyPoints` with the same unchecked pattern; its receipt shape was not audited; untouched.
3. `ActionEconomyConsumption.spend` has no caller-supplied operation id (A2 above). Retrying a spend after an uncertain completion in a caller other than the equipment coordinator can double-pay. Design needed in TI-4.
4. The remaining ~30 inline `ActorEngine.spendForcePoints` call sites are untouched (out of scope).

## Limits
Single-client, in-process only; Foundry has no compare-and-swap, so a second client writing the same pool between a spend and its refund is not detectable here (the relative refund preserves the other client's *committed* change but cannot see an in-flight one). The `indeterminate` classification relies on observing the pool before/after. Offline evidence only.

## Reload transactions / action receipts (from the TI-1 charge)
Already delivered and accepted in WP5-C3 (C3-R3 truthful reload persistence; own-spend action rollback with `refunded/superseded/failed`); TI-1 adds no further change there. Required-action truthfulness is §1.2.
