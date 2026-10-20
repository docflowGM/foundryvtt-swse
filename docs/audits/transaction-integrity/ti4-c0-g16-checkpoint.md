# TI4-C0 / G16 — Holonet credit-transfer evidence (checkpoint)

Base: PR #1066 (`audit/ti4c0-g11-follower-rollback`) at the certified head `3b20c392e348ad37b9f7316f04ed64d6a4a3fc56`. Stacked draft PR; earlier branches unmodified.
Evidence level: **L1** (offline, single client, real holonet functions over recorded stubs). No L2 (cross-client coordination) or L3 (durable recovery/reload) claim. No rules decision was needed.

## 1. Defect (verified on the base head)

`HolonetMessengerService._gmResolveCreditRequest` (`pay-credit-request`) recorded **every** `TransactionEngine.executeCreditTransfer` failure as `entry.status = 'failed'`, copying only the error text — so an `indeterminate` / `rollbackFailed` result (the payer may still be debited, the recipient may hold the credits) was displayed as an ordinary failed payment and its evidence (transaction ids, leg summaries, restore results) was discarded. The direct-transfer path (`_executeCreditTransfer`, used by `accept-transfer` / `approve-transfer`) did the same through a thrown `Error(moved.error)`, and the GM-grant branch likewise for `executeCreditAdjustment`.

## 2. Source findings

| Question | Finding |
|---|---|
| What the engine returns | `success:false` plus, as applicable: `compensated`, `rollbackFailed`, `indeterminate`, `recovery`, `debitTransactionId`, `failedCreditTransactionId`, `refundTransactionId`, `evidence{debit,credit,refund,restores[]}` (TI-2). |
| Paths that persisted a status | `_gmResolveCreditRequest` (the register's `:4157`), `_executeCreditTransfer` direct transfer + GM grant. The last two are the same defect class in the same function family and are **included** (flagged for review). |
| Retry exposure | `pay-credit-request` pays only `pendingRecipient` entries; `_gmResolveCreditTransfer` refuses terminal statuses — a new status **must** be added to that terminal list or an unresolved transfer could be accepted again (second debit). Done and tested. |
| Retention | `MessengerMaintenanceService.isSafeToPrune` would have deleted an unresolved record (and with it the only copy of the evidence). Now protected. (Its existing "pending" list uses `pending/offered/...`, not the real `pendingRecipient/pendingGm` statuses — pre-existing, **not** changed here.) |
| Other `executeCreditTransfer` call sites | `:6750` (counter-offer credits) returns `{success:false, error}` and drops the evidence; `:6839` (requested trade credits) returns the engine result unchanged (evidence kept); `:7309` (item-trade compensation) ignores the result. These belong to the item/asset trade saga, not the credit-transfer record, and are **not changed** (listed under limitations). |
| The engine's last-resort whole-actor restore | The register notes it "can revert unrelated changes". It is existing TI-2 behaviour and the register's proposed correction is on the holonet side; **not changed**. |

## 3. Change (scripts/holonet only)

- `creditMovementEvidence(result)` classifies a failed movement: `INDETERMINATE` (`indeterminate` or `rollbackFailed`), `FAILED_COMPENSATED` (`compensated`), otherwise `FAILED`; it stores the engine's ids, `recovery`, flags, `error` and `evidence` verbatim (JSON-cloned) plus `level:'L1'` and `recordedAt` as `transferEvidence`.
- Request entry and direct transfer: an INDETERMINATE result sets status **`indeterminate`** (new, non-payable, terminal), keeps `failureReason`, stores `transferEvidence`, and publishes a system message (`credit-request-indeterminate` / `credit-transfer-indeterminate`) that says the amount needs GM review and the payer may still be charged — never "failed". Compensated / plain failures keep status `failed` and their previous messages, now with `transferEvidence`. The GM-grant branch uses the same classification. Boolean return values are unchanged (`false`).
- View model: `transferStatusLabel('indeterminate')` = "Unresolved — GM Review Needed"; a credit request with an indeterminate entry shows that label and `hasUnresolved`; an indeterminate direct transfer is `isResolved` with no actions.
- `_gmResolveCreditTransfer`: `indeterminate` added to the terminal-status guard.
- `messenger-maintenance-service`: records with an `indeterminate` credit transfer (or request entry) are not prune candidates.
- Not changed: `TransactionEngine`, rules, UI templates, GM dashboards, the trade saga.

## 4. Tests — `tests/ti4c0-g16-holonet-credit-evidence.test.mjs` (15 checks)

Real `HolonetMessengerService` functions; `TransactionEngine.executeCreditTransfer/executeCreditAdjustment` return the exact shapes `transaction-engine.js` produces (plain, compensated, rollbackFailed with restore evidence, unresolved recipient leg, indeterminate debit, grant rollbackFailed); `HolonetStorage` and publish helpers are recorded stubs.

**Fail-before** (base head): 3 of 14 passed (15th, the maintenance case, was added next and also failed: the pruner selected the indeterminate record). Failures show `failed` displayed for every unresolved shape, no evidence stored, no distinct status. **After:** 15/15.
Coverage: request × {rollbackFailed, unresolved credit, indeterminate debit}; direct transfer × the same three; no second payment/acceptance of an indeterminate entry/transfer (the engine is not called again); compensated and plain failures unchanged plus evidence; success unchanged (`complete`, receipt, no evidence); GM grant; view model label/actions; plain `failed` still labelled Failed; maintenance retention.

Mutation checks (each reverted): terminal guard without `indeterminate` → 1 failure; request status written as `failed` → 4; evidence not stored on the entry → 5; `rollbackFailed` not classified INDETERMINATE → 4; label shown as "Failed" → 1; direct transfer status written as `failed` → 5; maintenance protection removed → 1.

## 5. Verification

G16 15/15; `ti2-commerce-integrity` passes; rolling suite `Result: 388 passed, 0 failed (of 388 run; 5 excluded as documented pre-existing failures)`; guards 26 of 27 pass locally; `validate-partials`, `system.json` parse and the rolling syntax check (2881 files) pass; `git diff --check` clean. The guard `node tools/migrate-phase-5c-weapon-references.mjs --check` crashes only in a local git worktree (`ENOTDIR … .git/index`) and is verified in exact-head CI, not reported as locally passing.

## 6. Remaining limitations (not certified)

- **L1 only.** The status and evidence live on the Holonet message record (`saveRecord`); there is no cross-client coordination (L2) and no durable/certified receipt or reload-recovery guarantee (L3). If `saveRecord` itself fails after the engine call, the evidence is lost (the pre-existing post-commit ordering is unchanged).
- Nothing reconciles an `indeterminate` record: it needs a GM to inspect the transactions named in the evidence. No GM reconcile action, dashboard attention item or notification was added (UI not authorized).
- The engine's last-resort whole-actor restore still snapshots and restores both actors (can revert unrelated changes); the trade-saga call sites (`:6750`, `:6839`, `:7309`) and party-fund refund results (G26) are untouched.
- Existing maintenance "pending" list mismatch (`pending/offered/...` vs real statuses) is pre-existing and unchanged.
- Live Foundry behaviour is not established by the offline stubs.
