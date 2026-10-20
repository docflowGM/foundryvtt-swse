# TI4-A — DI-2: OD-1 Recovery Risk-Matrix Proposal

**Status:** `DESIGN_PROPOSAL`, **for independent review. No exception becomes operationally authorized by this document, and nothing is implemented.** No `TransactionEngine` code is changed. Evidence is read from lineage B `4e51a1565` (`scripts/engine/store/transaction-engine.js`, `TE`), the Phase 0 inventory (P20–P29) and this checkpoint's reading of the restore and cost paths.

## 1. The approved policy being applied (OD-1, owner)

High-risk, multi-resource transactions fail closed without adequate recovery. Simple GM credit adjustments may remain available with verified outcomes and explicit uncertainty reporting. The exception is **never** extended to an operation that can silently duplicate or lose resources. Until this matrix is independently reviewed, **no operation qualifies for the exception** (contract §7 rule 1c).

## 2. Classification rubric (so a reviewer can re-derive every row)

| Factor | Question | Why it matters |
|---|---|---|
| **F1 Resource scope** | how many distinct resources change (credits, Items, owned actors, markers, queue entries)? | multi-resource ⇒ partial application is possible ⇒ whole-scope compensation needed |
| **F2 Documents** | how many Foundry documents are written, and across how many actors? | each is a separate non-atomic write |
| **F3 Replay exposure** | can a repeated request duplicate or lose the effect (no operation id; no marker)? | OD-1: "silently duplicate or lose resources" disqualifies the exception |
| **F4 Reversibility** | does the operation delete a document or create a world actor? | irreversible without a snapshot |
| **F5 Recovery evidence available now** | snapshot, marker, audit flag, receipt | what a failure can be reconciled from |
| **F6 Used as a saga leg?** | is the method a step of a larger multi-party operation (transfer, escrow, holonet payout)? | a "simple" method inside a saga is not simple |

Rule: an operation is **exception-eligible** only if F1 = one resource in one document, F4 = reversible by a relative/conditional write, F6 = not a saga leg, F3 is mitigated by a replay guard, and the post-write value is verified.

## 3. Matrix (existing `TransactionEngine` methods)

`REQ` = recovery established before the first authoritative write or `REFUSED('recovery-unavailable')`. "Verify" = the post-write verification the contract requires.

| ID | Method (lines) | F1 resources | F2 docs | F3 replay exposure (today) | F4 irreversible? | F5 recovery evidence today | Required post-write verification | Proposed recovery requirement | OD-1 exception might apply? |
|---|---|---|---|---|---|---|---|---|---|
| P20 | `executeMutationTransaction` (:297-487) | credits + caller plan (Items, possibly created world actors) | purchaser + N | **high** (no operation id; every call a new random id; a double click is a second charge) | yes if the plan creates actors or deletes | recovery **already required** (`#establishRecovery`); audit flag; snapshot ring | balance (exists) + caller `verify` (only `UpgradeService` supplies one) | **REQ (current behavior; keep)** | **No** |
| P21 | `executeCreditAdjustment` (:538-683) | credits only | 1 | **medium–high**: no operation id; a repeated signed adjustment applies twice; used by 20+ callers | no (a relative inverse adjustment exists) | snapshot **best effort** (:620-632); audit flag | **none today** — must add balance observation | split by `transactionContext` (see §4) | **Candidate, conditional** — only the GM-only manual contexts, only when §4 prerequisites hold |
| P22 | `executeCreditTransfer` (:685-905) | credits of two actors | 2 | high (random transfer id; holonet passes `transferId` in `audit` but it is unenforced) | no, but a saga | two best-effort snapshots (:742-743); result ids | both balances | **REQ for both actors** (partial snapshot set refuses) | **No** (two documents; a saga) |
| P23 | `executeAssetCustomizationTransaction` (:926-1153) | wallet credits + asset state (droid/vehicle/item) | wallet + asset | high | state replaced wholesale (`installedSystems`/`droidSystems`) | recovery **already required** for both | wallet balance (exists) + asset state (missing) | **REQ (current; keep)** | **No** |
| P24 | `executeAssetApprovalTransaction` (:1155-1403) | owner credits + asset ownership/marker | owner + asset | **mitigated** for droid/vehicle by the `storeAcquisition` marker (`:1226-1233`); unmitigated if the asset write is lost | no (marker + owner link), but multi-doc | snapshot **best effort** (:1321-1331); marker; audit flag | marker + balance (missing) | **REQ for both** | **No** |
| P25 | `executeSaleTransaction` (:1405-1575) | credits + Item deletion (audit holds a full copy) | 1 actor (item + credits) | medium (a repeat is refused only because the Item is gone) | **yes (delete)** | snapshot best effort (:1507-1518); the audit flag stores `itemData` | item absent + balance | **REQ** | **No** |
| P26 | `executeRollbackCorrection` (:1577-1745) | credits + Item deletes + a marker on the source transaction | 1 actor, several writes | **high**: no already-rolled-back check in the engine (G20) | yes (deletes) | snapshot best effort | balance + source flag + items absent | **REQ** and a replay guard (read the source status inside the lock) | **No** |
| P27 | legacy `TransactionEngine.execute` (:1757) | n/a | n/a | n/a | n/a | none | n/a | **do not call** (dormant, no recovery); any caller is a defect | **No** |
| P28 | `StoreTransactionEngine` (inactive) | n/a | n/a | n/a | n/a | own `_rollback` | n/a | **do not wire**; would be a parallel authority | **No** |
| P29 | `StoreEngine.purchase` (stock + P20) | stock policy (world setting) + P20 | + world setting | high | stock reservation has no id | none for stock | stock restore result checked | inherits P20; stock outcome must be reported | **No** |

## 4. The only exception candidate: P21 under a closed list of contexts (proposal)

1. **Eligible contexts (closed list to be reviewed):** GM-only manual adjustments invoked by GM controls where the call site asserts `game.user.isGM` (today: `GMWorkspaceSurfaceController.js:184-187` calls `_assertGM`; `GMStoreDashboard`'s credit correction is GM-facing but see G21). Every other `P21` caller — wager escrow legs (7), holonet legs (~9 sites), `executeCreditTransfer` legs, `StoreTransactionEngine` — is **a saga leg (F6)** and is **excluded**: it stays under `REQ`.
2. **Prerequisites that must all hold before any context is treated as eligible** (restating OD-1's conditions as checkable items):
   a. **Replay guard:** a stable `operationId` + intent fingerprint accepted by the method (TI4-B), so a repeated GM click is a no-op/replay, not a second adjustment.
   b. **Post-write verification:** the observed balance equals the planned balance (the P20 mechanism); mismatch ⇒ `INDETERMINATE`.
   c. **Explicit uncertainty reporting:** a thrown write with changed balance, or an unobservable balance, ⇒ `INDETERMINATE`, never success, never a clean failure, never an automatic retry.
   d. **Authority:** a GM assertion inside the engine's own context handling, not only in the UI controller.
   e. **No second resource:** the plan writes `system.credits` and the audit record only (no Item, no flag on another document).
3. **If any prerequisite is absent for a context, that context stays under `REQ`.** "No operation qualifies until DI-2 is accepted" is preserved.
4. **What the exception removes:** only the *snapshot precondition*. It does **not** remove verification, replay protection, GM authority, or `INDETERMINATE` reporting, and it does not alter `FAILED_COMPENSATED`'s whole-scope meaning (a failure without recovery is `INDETERMINATE`).

## 5. What the matrix implies for implementation (not authorized)

| Change | Methods | Package |
|---|---|---|
| Add `#establishRecovery`-style precondition (refuse without recovery) | P21 (non-eligible contexts), P22, P24, P25, P26 | TI4-C (after DI-2 acceptance) |
| Add post-write verification (balance/marker/item) | P21, P22, P24, P25, P26 | TI4-C |
| Add already-rolled-back check | P26 | TI4-C0 (G20) |
| Accept `operationId` + fingerprint | P20–P26 | TI4-B |
| Replace `Number(cost) \|\| 0` coercion with explicit invalid-cost refusal | P20 (:344) | bounded correction candidate (Q-033-H7) |
| Single wallet-scoped lock key | all credit-mutating methods | TI4-C (G28) |

## 6. Questions for the independent reviewer (no recommendation is made on the owner's behalf)

1. Is the closed-list approach to eligible contexts acceptable, or should eligibility be a property of the *caller identity* rather than `transactionContext`?
2. Are prerequisites 2a–2e the right and complete translation of OD-1's four conditions?
3. Should `P25` (sale) and `P26` (rollback correction) be treated as always-`REQ`, as proposed, given their item deletions?
4. Is the Q-033-H7 cost coercion to be treated as a prerequisite for any `P20` change?

Until the reviewer accepts this matrix, the status of every row's exception column is **"No operation qualifies."**
