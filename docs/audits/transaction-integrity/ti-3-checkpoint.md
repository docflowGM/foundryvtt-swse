# Transaction Integrity — TI-3 Checkpoint (Progression, Followers, Approvals)

**Branch:** `audit/ti3-progression-followers-approvals`, a child of PR #1060 head `903269083f9b7d3dac779b5313df7f78be635063` (TI-2, independently accepted) because the approvals path runs through the TI-2-hardened `TransactionEngine`. Not merged; merging requires explicit owner authorization. PR #1056–#1060 histories untouched.
**Level of every guarantee below: L1** (one Foundry client, offline harness): real `TransactionEngine`, `GMApprovalOperationsService`, `GMApprovalsSurfaceService`, `AllyAssignmentService`, `ProgressionFinalizer`, `runFollowerMutationTransaction`; the shim's `ActorEngine` is a fake or a small model of `applyMutationPlan`; settings are an in-memory model. Nothing is `FOUNDRY_TESTED`. No L2/L3 claim.
**Scope kept:** no SWSE rule, cost, eligibility, slot or level-up rule changed; no new orchestrator or ledger; existing specialized authorities (`ProgressionFinalizer`, `TransactionEngine`, `AllyAssignmentService`, `FollowerSlotService`) retained; no modification runtime; TI-4 untouched.

## 1. Read-only pass (done first)
| Surface | Live path (reachability) | Finding |
|---|---|---|
| Progression | `ProgressionShell` / adapter → `ProgressionFinalizer.finalize / finalizeSingleStep` → `_applyMutationPlan` → `ActorEngine.applyMutationPlan(transactional:true)` → `_syncPostApplyState` (**ACTIVE**) | TX-09 sub-gap **reproduced**: a throw from the post-apply sync *after* a committed plan returned `{success:false}` (the plan is applied and not rolled back). The level-up post-audit failure also returns `success:false` after the plan applied. `MutationCoordinator/MutationPlan` are unreachable (**INACTIVE**, unchanged). |
| Followers / allies | `runFollowerMutationTransaction` ← `follower-creator`, `follower-hooks`, `ally-assignment-service` (assign / unassign / convert) (**ACTIVE**) | TX-11 **reproduced**: a step that *returns* `{ok:false}` / `false` counted as success; a rollback that *returns* `false` was not recorded. TI-N5: `assignAsAlly`/`unassignAlly` logged "rolled back" and rethrew without telling the caller whether the rollback had completed; `convertToFollower` logged it but also threw the bare original error. |
| GM approvals | `GMApprovalsSurfaceController` (buttons) → `GMApprovalOperationsService.approveRequest / denyRequest / finalizeWithEdits` → `TransactionEngine.executeAssetApprovalTransaction` (**ACTIVE**) | TX-10 **reproduced and extended** (below). |
| `applyMutationPlan` contract | 21 callers, 2 `transactional:true` (TX-07) | Not changed (it is an `INTENTIONAL_LIMITATION`); overclaiming wording corrected (§3.6); a static guard belongs to TI-4. |

## 2. Findings and dispositions
| ID | Finding | Class | Disposition |
|---|---|---|---|
| TX-09 sub-gap / TI-N6 | Post-apply sync failure after a committed progression plan reported as a failed finalization | `CONFIRMED_DEFECT` | **Fixed** (§3.5) |
| TX-11 | Follower runner judges failure only by a *throw* | `CONFIRMED_DEFECT` (contract) | **Fixed** (§3.1) |
| TI-N5 | Ally assign/unassign (and convert) hide an incomplete rollback from the caller | `CONFIRMED_DEFECT` | **Fixed** (§3.2) |
| TX-10a | The engine would approve an already-approved asset again (second charge + relink) | `CONFIRMED_DEFECT` (new) | **Fixed** (§3.3) |
| TX-10b | Approve / deny / edit buttons carry `custom:<index>`; after another GM/tab changed the queue the index names a *different* request | `CONFIRMED_DEFECT` (extends the ledger's "index-addressed read") | **Fixed** (§3.4a) |
| TX-10c | `denyPendingCustom` deletes the draft actor unconditionally — a stale deny after approval deleted an owned, paid-for asset | `CONFIRMED_DEFECT` (new, data loss) | **Fixed** (§3.4b) |
| TX-10d | A hook / history-mirror / queue-removal failure *after* a committed approval was reported as "Failed to approve" (inviting a second charge) and could leave the request in the queue | `CONFIRMED_DEFECT` (TI2-R2 class) | **Fixed** (§3.4c) |
| TX-07 | "Atomic" wording on non-atomic, sequential paths | `DESIGN_GAP` | **Comments corrected** in the touched modules (§3.6); guard → TI-4 |
| — | Cross-client approval races (two GMs on two machines) | `INTENTIONAL_LIMITATION` | Not solvable at L1; recorded |

## 3. Changes
### 3.1 TX-11 — `runFollowerMutationTransaction` failure-value contract
A `commit` or `rollback` outcome counts as **failed** when it throws, returns the boolean `false`, or returns an object with `ok === false` or `success === false`. Everything else (undefined, `true`, a document, a plain object, `0`, `null`, a string) is success — the previous contract for every existing step. A reported commit failure rolls back the *earlier* steps and never runs later ones (the failing step itself is not rolled back, exactly like a thrown one); a reported rollback failure sets `rollbackFailed` and is listed in `rollbackErrors`. No existing step returns a failure value, so no current behavior changes; the full suite confirms it.
### 3.2 TI-N5 — rollback outcome reaches the caller
`assignAsAlly`, `unassignAlly` and `convertToFollower` throw the **original error, message unchanged**, annotated with `failedStep`, `rollbackFailed` (strict boolean) and `rollbackErrors`. Assign/unassign now log at `error` level ("rollback INCOMPLETE, manual review required") instead of the unconditional "failed and was rolled back" when it was not. The existing `convertToFollower` reservation-cleanup logging is unchanged.
### 3.3 TX-10a — the asset-state check is part of the approval transaction
`TransactionEngine.executeAssetApprovalTransaction` refuses, **inside its lock and before any write**, an asset that already carries a store-acquisition record (`system.storeAcquisition.transactionId`, the same marker the approval itself writes): `{ success:false, refused:'already-acquired', acquiredTransactionId }`, owner not charged, nothing changed. This makes every re-approval path (stale queue entry, retry after an unrelated post-commit failure, second client) safe against a double charge.
### 3.4 TX-10b/c/d — GM approvals service and surface
* **a. Stable action keys.** The surface already exposed `stableKey` (`custom-id:<id>`) for *selection continuity* only; the mutation buttons still read `selectedApproval.key` (`custom:<index>`). Each request now also carries `actionKey` (`stableKey || key`) and the nine `data-approval-key` bindings on the approve / deny / edit / finalize buttons read it. `parseApprovalKey` understands `custom-id:<id>`; `resolveCustomIndex` resolves the **current** queue index at the moment of the action, and an id no longer in the queue resolves to `-1` ("no longer pending") — never to whatever record now occupies the old slot. Legacy `custom:<index>` keys still parse. Selection keys are unchanged (`key` is pinned by an existing test).
* **b. Deny guard.** A draft that already has a store-acquisition record is an owned asset, not a draft: deny removes only the stale queue entry (warning to the GM) and **keeps the asset**. Genuine pending drafts are deleted as before.
* **c. Post-commit isolation.** After `executeAssetApprovalTransaction` / `StoreEngine.purchase` reports success, the history mirror, queue removal, `swseCustomPurchaseApproved` / `swseApprovalResolved` hooks, refresh and notification run through `_afterCommit`: a failure is a *warning* ("…the approval itself is committed; do not approve it again"), never "Failed to approve". Combined with §3.3 a retry cannot charge twice.
### 3.5 TX-09 sub-gap — `ProgressionFinalizer._applyMutationPlan`
Plan application and post-apply bookkeeping are separate `try` blocks. A plan failure is still `{ success:false, error }` (and skips the sync). A post-apply sync failure after a **committed** plan is `{ success:true, postApplyWarnings:[{ step:'post-apply-sync', error }] }`, logged at `error`, with a GM/player notice not to finalize again; `finalize` and `finalizeSingleStep` pass the warnings through. The level-up post-audit failure keeps `success:false` (the audit disagrees with the result) and now carries `committed:true`. `_emitLevelUpComplete` already isolated its own failures.
### 3.6 TX-07(a) — wording
"Atomic" claims on sequential, non-multi-document paths were corrected to the real guarantee in `transaction-engine.js` (header), `store-engine.js` (header and `purchase()` doc), `ally-assignment-service.js` (module and `convertToFollower` docs), `droid-/vehicle-customization-engine.js` and `GMApprovalOperationsService.approveDroid`. Remaining inline "atomic" comments in `ally-assignment-service.js` step bodies, `follower-creator.js` and the transactional progression/lightsaber callers were left (no behavior depends on them); the project-wide static wording guard is TI-4.

## 4. Evidence
`tests/ti3-progression-followers-approvals.test.mjs` (8 checks): §3.1 failure-value contract (3 commit shapes, 7 success shapes, 3 rollback shapes, clean rollbacks); §3.2 `assignAsAlly` / `unassignAlly` with a clean and a broken rollback; §3.3 two sequential approvals charge once; §3.4a stale `custom-id` never approves the record in its old slot; §3.4a′ surface `actionKey` + template; §3.4b stale deny keeps an approved asset but still deletes a real draft; §3.4c throwing hooks / failing history mirror / failing queue removal around a committed custom approval and a committed droid approval, with a no-double-charge retry; §3.5 post-apply sync failure vs plan failure vs healthy path. **All eight sections fail when run one at a time against the unmodified TI-2 head `9032690`** and pass here.
Existing suites touching these modules (approvals, ally assignment, follower transaction, customization bay, store, finalizer) are unchanged and green.

## 5. Existing tests changed
None. (One TI-3 fixture note: the shared `mutate-and-repaint` queue stores a `.finally()` promise whose rejection is never handled, which crashes a Node test that injects a settings-write failure through it; that helper is out of scope, so the test injects the failure one level above it. It is only console noise in the browser.)

## 6. Limits and residual risk (stated, not hidden)
* Same client only (L1). Two GMs on two machines, or a writer outside these services, are not coordinated; the engine's already-acquired refusal and the id-addressed keys *narrow* the damage of a cross-client race but cannot serialize it.
* `convertToFollower`/`assignAsAlly` step rollbacks still write **absolute** prior values (e.g. `system.ownedActors`), so a concurrent change to that list inside the failure window is overwritten (ledger TX-11, unchanged — an existing test pins "exact pre-commit array" rollback).
* The follower-creator's multi-step flows were not re-engineered; they already consult `rollbackFailed`.
* Foundry runtime, durable replay (operation ids) and multi-client arbitration remain outside scope (TI-4 / runtime certification).

## 7. Questions for the project owner
None that change a rule. For information: the approvals surface now treats `custom-id:<id>` as the mutation address; any external macro still sending `custom:<index>` keeps working.
