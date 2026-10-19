# Transaction Integrity — Master Remediation Ledger (TI-0)

**Phase:** TI-0 (preservation, baseline, reachability, evidence). Read-only except documentation and non-CI evidence scripts. **No production code was changed.**
**Inputs:** the supplied audit `SWSE_Orchestration_Transaction_Authority_Audit_2026-10-19.md` (treated as evidence, not authority) and the source at: `main` `4392c90`; PR #1056 equipment head `961f4bc` (includes WP5-C3); PR #1057 modification head `d191d60`.
**Classification vocabulary:** `CONFIRMED_DEFECT` · `DESIGN_GAP` · `INTENTIONAL_LIMITATION` · `INACTIVE_LEGACY` · `ALREADY_CORRECTED` · `NOT_REPRODUCED` · `CERTIFICATION_GATE`.
**Reachability vocabulary:** `ACTIVE` (a production UI/engine path reaches it) · `DORMANT` (wired but only behind an unused setting/state) · `INACTIVE` (no production caller found by import/call search) · `TEST-ONLY`. Reachability was established by static import/call search; **it is not Foundry-runtime proof**.
**Evidence key:** `R:<script>` = a reproduction in `repro/` (run as `SWSE_ROOT=<tree> node repro/<script>`; captured output in `repro/captured-output.txt`). A reproduction on the offline shim demonstrates the *logic*; the shim replaces `ActorEngine` with a fake (see "Offline-harness limitation" in the checkpoint), so each repro states which parts are real.

## Summary table

| ID | Finding (verified wording) | Class | Reachability | Repro | Severity | Package |
|---|---|---|---|---|---|---|
| TX-01 | Legacy upgrade install writes the Item before charging | `CONFIRMED_DEFECT` | ACTIVE (3 UI surfaces) | R:tx01 | High | TI-2 |
| TX-02 | Several live installed-upgrade writers and representations | `DESIGN_GAP` + `CERTIFICATION_GATE` | ACTIVE ×4, INACTIVE ×2 | source | High (architectural) | gated (V2) |
| TX-03 | Action rollback is history-last | `CONFIRMED_DEFECT` on `main` · `ALREADY_CORRECTED` on `961f4bc` | ACTIVE | R:tx03 | High | TI-1 (accept C3, then converge) |
| TX-04 | FP refund hides failure; refund ignores bonus pool; parallel paths | `CONFIRMED_DEFECT` (coordinator) + `DESIGN_GAP` (paths); SWSERoll path partly corrected by C3 | ACTIVE | R:tx04, R:c3-fp | High | TI-1 |
| TX-05 | Equipment ledger keyed by requestId only | `CONFIRMED_DEFECT` (narrower than audited: false conflict, not replay) + `INTENTIONAL_LIMITATION` (cross-client) | ACTIVE (GM-local) | R:tx05 | Low | TI-1 (small) |
| TX-06 | Required action finalizes on an allowed no-op | `CONFIRMED_DEFECT` (acceptance rule cannot tell policy no-ops from authority-unavailable) | ACTIVE | R:tx06 | High | TI-1 |
| TX-07 | `applyMutationPlan` transactional is opt-in and whole-actor | `DESIGN_GAP` / `INTENTIONAL_LIMITATION` (overclaim risk) | ACTIVE | R:tx07 | High (semantic) | TI-3/TI-4 |
| TX-08 | Store/customization transaction continues without a snapshot; rollback outcome ignored; absolute credit write | `CONFIRMED_DEFECT` ×3 | ACTIVE (store checkout, Workbench, Tech Specialist) | R:tx08 | High | TI-2 |
| TX-09 | Progression `MutationPlan.apply` has no rollback | `INACTIVE_LEGACY` (live path is transactional); sub-gap `DESIGN_GAP` | INACTIVE / ACTIVE | source | Low / Medium | TI-3 (sub-gap only) |
| TX-10 | Cross-actor sagas and GM approvals | `INACTIVE_LEGACY` (StoreTransactionEngine, Droid/VehicleTransactionService) · `DESIGN_GAP` (live GM approvals) | INACTIVE / ACTIVE | source | Medium | TI-3 |
| TX-11 | Follower transaction judges success by "no throw" | `CONFIRMED_DEFECT` (contract) + caller gap | ACTIVE | R:tx11 | Medium | TI-3 |
| TX-12 | No durable operation identity | `DESIGN_GAP` | ACTIVE (cross-cutting) | R:tx01b (partial), source | High | TI-4 (contract) |
| TX-13 | Governance is not concurrency isolation | `INTENTIONAL_LIMITATION` | ACTIVE | source | Medium | document; TI-4 guards |
| TX-14 | Modification installation not certified | `CERTIFICATION_GATE` | — | data: `selectable: 0` | Gate | not bypassed |

New sub-findings discovered during verification are tracked as `TI-N#` at the end.

---

## TX-01 — Upgrade installation writes before payment
1. **Code:** `scripts/engine/upgrades/UpgradeService.js` `applyUpgrade` (`main` `4392c90`, lines ~612–680). Standard-item branch: validates funds, then `ActorEngine.updateEmbeddedDocuments(... 'system.installedUpgrades')` (or `item.update` for a world Item), **then** `LedgerService.buildCreditDelta` + `ActorEngine.applyMutationPlan` for the cost. Droid branch routes to `DroidCustomizationEngine`; the **vehicle branch writes `installedSystems` and charges nothing** (a separate pre-existing "free" path; not changed by this ledger).
2. **Callers / reachability — ACTIVE:** `CommandBus` `APPLY_ITEM_UPGRADE` → `UpgradeCommands.applyItemUpgrade` → `UpgradeService.applyUpgrade`; dispatched from `ShellHost.js:1187,1253`, `apps/upgrade-app.js:131`, `sheets/v2/actor-sheet-base.js:1102,1147`.
3. **Mutation authority in use:** `ActorEngine` (item write) + `ActorEngine.applyMutationPlan` (credits) via `LedgerService`; **not** `TransactionEngine`, which owns commerce.
4. **Failure mode:** credit write fails (or the actor changes) after the Item write → upgrade installed, unpaid; the call throws, so a user retry installs again. Funds validation protects only the simple insufficient-balance case.
5. **Reproduction:** `R:tx01` — REPRODUCED (write order ITEM→CREDIT; installed=1, credits unchanged after injected credit failure). `tx01b` REPRODUCED with the eligibility catalog **stubbed**; whether the real catalog would offer an installed upgrade again is **not established**.
6. **Existing coverage:** none for the order or failure (no test injects a credit failure).
7. **Smallest correct remediation:** one mutation through the commerce authority — the Item update and the credit deduction as a **single** `TransactionEngine.executeMutationTransaction` (context `owned-customization`, already allowed; this is exactly how the Workbench commits), so there is no window between them and the snapshot/lock/ledger apply. **Dependency:** TX-08 must be corrected first or together (the engine currently continues without a snapshot).
8. **Changed mechanical behavior:** none intended (same upgrade, same price, same eligibility). Failure now means *neither* applied.
9. **Owner ruling needed:** none for the ordering fix. Replacing `UpgradeService` with the V2 installer remains gated (TX-14). Whether the vehicle branch should charge is a **rules/commerce question** and is **not** touched.
10. **Verification / disposition:** fail-before test with injected credit failure; same test passes; credits and Item verified atomic from the caller's view. Disposition: `CONFIRMED_DEFECT` → TI-2.

## TX-02 — Multiple legacy installed-upgrade writers
**Verified writers and reachability**
| Writer | Writes | Reachability |
|---|---|---|
| `UpgradeService.applyUpgrade/removeUpgrade` (Item path) | `system.installedUpgrades` | **ACTIVE** (TX-01 surfaces) |
| `ItemCustomizationWorkbench._applyCurrentItem` | `flags.foundryvtt-swse.customization`, `flags.swse.*Upgrades`/`gearMods`, templates, via `TransactionEngine` (cost + item in one plan) | **ACTIVE** (item sheet, shell overlay, holopad adapter) |
| `TechSpecialistModificationService` | direct stat writes/flags via `TransactionEngine` | **ACTIVE** (customization bay, workbench) |
| `lightsaber-construction-engine` / `_applyLightsaber` | `lightsaberConfig`, `transactional:true` | **ACTIVE** |
| `InstallRemoveEngine.applyInstall/applyRemove` | `flags.foundryvtt-swse.customization` + `system.installedUpgrades` mirror + effect stat keys, in ONE plan | **INACTIVE** — reachable only through `CustomizationWorkflow.applyInstall/applyRemove`, which have **no external caller** (`UpgradeService` uses the workflow only for read-only state) |
| `ModificationIntentBuilder` (crafting) | arbitrary intent paths | **INACTIVE** — no importer found |
- **Failure mode:** two live, incompatible representations of "installed" (`system.installedUpgrades` vs `flags.foundryvtt-swse.customization`); readers of one do not see the other; costs, slot math and effects differ per writer. Note `InstallRemoveEngine` passes the Item as the third argument of `applyMutationPlan` (the *options* slot) — latent, dormant.
- **Classification:** `DESIGN_GAP` (convergence) + `CERTIFICATION_GATE` (the replacement is the gated V2 installer; `docs/audits/modification-v2-legacy-inventory.md` already marks these REPLACE/REFACTOR).
- **Remediation:** none in TI-1…TI-4 beyond making each *live* writer's commit atomic and honest (TX-01, TX-08). **No new writer, no wiring of the D-005 evaluator into any of them.**
- **Owner ruling:** V2 installation design/approval (existing gate).

## TX-03 — Action rollback identity
- **Code:** `ActionEconomyConsumption.spend` rollback → `ActionEconomyPersistence.undoLast` (pops the last history entry). `main` and `8fbd863`.
- **Reachability — ACTIVE:** 7 modules spend through it (`chat-interaction-bridge`, `combat-feature-handlers`, `full-attack-executor`, `fire-state-store`, `core-attack-option-action-economy`, `InventoryEngine`, `combat-ui-behavior-hotfix`); six of them contain `.rollback` call sites (14 in total) plus the rollbacks in `attacks.js`/`fire-state-store.js`. Which individual call sites run on a failure path was not traced in TI-0.
- **Reproduction:** `R:tx03` — on `main`: rollback(A) after B was recorded **restored B's swift action, left A spent, and returned a truthy object** (a false success). On `961f4bc`: returns `false`, `rollbackStatus=superseded`, nothing changed.
- **Correction:** WP5-C3 (`961f4bc`, CI run 39318390232 **success**): unique `spendId` per history entry, strict boolean + `rollbackStatus` (`refunded|superseded|failed`), verified removal from history, idempotent, player notified when the action stays spent.
- **Disposition:** `ALREADY_CORRECTED` on the equipment branch pending independent review; `CONFIRMED_DEFECT` on `main` until that branch lands. **Remaining gap (TI-1):** the check-and-undo is atomic only within one client (TX-13); `undoLast` itself is still history-last and is *not* removed (the fix is a guard around it).

## TX-04 — Force Point spend/refund
- **Code:** `ForcePointSpendCoordinator.rollAndSpend` (`engine/force/force-point-spend-coordinator.js`), `_safeRefund` returns nothing; roll-failure path returns `rolledBack:true` unconditionally. Refund is `ActorEngine.gainForcePoints` (normal pool) although `spendForcePoints` consumes **bonus** points first.
- **Paths (ACTIVE):** (1) `RollCore.applyForcePointLogic` → coordinator; (2) `SWSERoll.promptForcePointUse` (attack/damage/UtF in `enhanced-rolls.js`); (3) **30 inline `ActorEngine.spendForcePoints` call sites in 13 files** (talent actions, feats/meta-resource, force executors, force suite, `utils/force-points.js`), counted outside the coordinator and `SWSERoll` that spend then apply an effect with no compensation; (4) `enhanced-rolls.js:~1820` Force Secrets spend.
- **Reproduction (real `spendForcePoints`/`gainForcePoints` grafted onto the shim):** `R:tx04` — **TX-04a REPRODUCED:** refund write fails → receipt says `rolledBack:true`, balance stays 2 of 3. **TX-04b REPRODUCED:** a spent *bonus* point is "refunded" to the normal pool; at the maximum it is clamped away (bonus 0, normal 5/5).
- **WP5-C3 effect:** path (2) for attacks is now the `force-point-transaction.js` transaction (relative, bonus-by-id, idempotent). **Verified against the real engine methods:** `R:c3-fp` — all four scenarios correct (normal point + concurrent regain; bonus point restored by id with a concurrent grant untouched; legacy value-only pool; nothing-to-spend refused). Paths (1), (3), (4) are unchanged.
- **Smallest remediation (TI-1):** (a) make the coordinator's refund report its verdict and return `rolledBack:true` only when verified; (b) restore the *bonus* point by id using what the spend receipt reports (`bonusSpent`/entry deltas) — reuse the WP5-C3 transaction's rollback logic rather than a third implementation; (c) **do not** migrate the 30 inline spenders wholesale: classify each (spend-then-effect with an effect that can fail vs. terminal) and fix only those whose effect failure strands a spend, per package.
- **Behavior change:** none to FP rules; failed refunds become visible; bonus points are restored as bonus points.
- **Owner ruling:** none (this restores the existing spend/bonus-first rule; it does not decide a new one).

## TX-05 — Equipment journal replay scope
- **Code:** `equipment-state-coordinator.js` `enqueue` (process-local per-actor FIFO), `defaultLedger` keyed by `requestId` only (`ledger.get(ctx.requestId)`), durable journal per actor.
- **Reproduction:** `R:tx05` — **narrower than the audit's wording.** Actor A commits `shared-request-id`; actor B reusing the id gets `REQUEST_ID_CONFLICT` (**not** a replay of A's outcome — the intent digest includes the actor id — and B's Item is not written). `TX-05b` (cross-actor false replay) **NOT REPRODUCED**. So the hazard is a spurious refusal of a legitimate, differently scoped operation, not data corruption.
- **Classification:** `CONFIRMED_DEFECT` (low) for the key scope; the cross-client limits (no CAS, GM-local, per-actor serialization is process-local) are `INTENTIONAL_LIMITATION`, documented in the coordinator header.
- **Remediation (TI-1, small):** key the ledger by `actorId + requestId`. **Behavior change:** none except removing the false conflict.

## TX-06 — Required action finalized on an allowed no-op
- **Code:** `runExecution` — `spendOk = true; spendState = result?.committed === true ? 'committed' : 'not-required'` for any result not `allowed:false`/`permitted:false`. `ActionEconomyConsumption.spend` returns allowed no-ops for `free`/`passive` (intentional), `out-of-combat` (intentional established policy), **`economy-modules-unavailable`** (the authority itself failed to load) and, in loose enforcement, an allowed over-spend with `committed:false`.
- **Reproduction:** `R:tx06` — both `economy-modules-unavailable` and `out-of-combat` finalize `COMMITTED`, `spend:'not-required'`, posture READIED. The coordinator **cannot distinguish a policy no-op from an unavailable authority**.
- **Classification:** `CONFIRMED_DEFECT` for the acceptance rule. (Reproducing the *real* in-combat module-unavailable path needs the economy modules to fail to import; the repro injects the exact result shape the authority returns for that case. **Runtime-only:** whether it can occur in a live Foundry session.)
- **Remediation (TI-1):** accept `committed:false` only for an explicit allow-list of policy no-op reasons (`out-of-combat`, `free`, `passive`; loose-enforcement over-spend only if the active setting says so); treat `economy-modules-unavailable`/`missing-actor`/unknown shapes as `INDETERMINATE` (existing outcome) so nothing finalizes unpaid in combat. **Behavior change:** none for legitimate out-of-combat or in-combat paid transitions. **Owner ruling:** none — the out-of-combat no-op is already established project behavior; this does not alter it.

## TX-07 — `applyMutationPlan` guarantees
- **Code:** `actor-engine.js` `applyMutationPlan` (`transactional = false` default; strict bucket order CREATE→DELETE→SET→UPDATE→ADD→recalc; transactional mode snapshots `actor.toObject(true)` and restores the **whole actor** through `SnapshotService`, deleting CREATE-bucket world actors separately).
- **Callers:** 21 files apply plans (customization, droids, crafting, store, vehicles, combat, holonet, patches, progression). **Only two pass `transactional:true`:** `ProgressionFinalizer._applyMutationPlan` and `lightsaber-construction-engine`.
- **Reproduction (real `applyMutationPlan` control flow; op executors and `restoreFromSnapshot` stubbed):** `R:tx07` — **TX-07a REPRODUCED:** default mode leaves the earlier SET applied when a later UPDATE fails. **TX-07b REPRODUCED:** `transactional:true` reverts credits (intended) **and an unrelated concurrent change** (the whole-actor restore).
- **Classification:** `DESIGN_GAP` / `INTENTIONAL_LIMITATION`. **Not a code bug to "fix" into atomicity** — Foundry offers no multi-document ACID. The defect is *claims*: labels such as "atomic" on non-transactional applies. The whole-actor restore is the prohibited pattern for *new* code (safeguard) but is existing behavior for the two callers.
- **Remediation:** TI-3/TI-4 — (a) correct overclaiming comments/labels; (b) a static guard that forbids new "atomic/transactional" wording on non-transactional paths; (c) for the two transactional callers, document the exact guarantee (whole-actor restore; concurrent-change loss) rather than change it. **Owner ruling:** none.

## TX-08 — TransactionEngine recovery
- **Code:** `engine/store/transaction-engine.js` `executeMutationTransaction` (~207–360). Lock key `${actor.id}:${context}` (process-local, **context-scoped**); `transactionId` random per call; `SnapshotManager.createSnapshot` failure is a warning then **continues**; the catch restores via `SnapshotManager.restoreSnapshot`, whose **non-throwing `false`** (not identity-exact / not found) is **ignored** and "Rollback successful" is logged; credits come from `LedgerService.buildCreditDelta` as an **absolute** `system.credits = read − cost`.
- **Callers — ACTIVE:** `store-engine.js:367` (store checkout), `item-customization-workbench.js:3646`, `tech-specialist-modification-service.js:726,753`; the sibling `executeAssetApprovalTransaction`/`executeCreditAdjustment` have many live callers (GM approvals, store checkout, GM dashboard, Holonet services, wager escrow).
- **Reproduction:** `R:tx08` — **a REPRODUCED** (snapshot throws; a late failure leaves credits 1000→900, no recovery, no signal); **b REPRODUCED** ("Rollback successful" logged though `restoreSnapshot` returned false; original error returned; credits stay charged); **c REPRODUCED** (absolute credit write overwrites a concurrent +500 → final 900, correct 1400). The ActorEngine boundary is the shim fake in these repros.
- **Same pattern elsewhere in the engine (verified by reading, not yet reproduced):** `executeCreditAdjustment` (~421–568; the entry with the most live callers — Holonet intel/messenger services, wager escrow, store checkout, GM dashboard) also "continues without rollback snapshot" on snapshot failure and also ignores `restoreSnapshot`'s `false` (it logs "rollback successful"). `executeCreditTransfer` documents its fallback to compensating-refund only (an explicit design, still a best-effort saga). `executeAssetApprovalTransaction`, `executeSaleTransaction`, `executeRollbackCorrection` and `executeAssetCustomizationTransaction` snapshot too and were **not** individually audited in TI-0 (TI-2 scope).
- **Classification:** `CONFIRMED_DEFECT` ×3 (in `executeMutationTransaction`; the credit-adjustment twin by reading).
- **Remediation (TI-2):** (a) fail closed — no irreversible multi-step commerce mutation without a recoverable snapshot **or** a plan that is a single ActorEngine operation; (b) check the restore verdict and return an explicit `rollback-failed` outcome; (c) credits: re-read the live balance immediately before the write and **verify after**, or express the deduction in a form that is checked against the live value (Foundry has no atomic increment; state the actual guarantee precisely). Whole-actor restore is existing behavior and is *not* extended. **Behavior change:** a purchase that previously went through with no snapshot now refuses with a clear reason — this is a commerce-policy-adjacent change and is **flagged for owner confirmation before TI-2 coding** (see checkpoint, owner decisions).

## TX-09 — Progression application
- **Verified:** `MutationCoordinator`/`MutationPlan` (`progression-framework/shell/mutation-*.js`) have **no importer anywhere** (only a path string in `dev/prerequisite-authority-audit.js`) → **`INACTIVE_LEGACY`**, safe-deletion candidate (category C) but **not deleted here**.
- **Live path:** `ProgressionShell`/`ProgressionSurfaceAdapter` → `ProgressionFinalizer.finalize/finalizeSingleStep` → `_applyMutationPlan` → `ActorEngine.applyMutationPlan(..., transactional:true)` (whole-actor restore on failure).
- **Sub-gap (`DESIGN_GAP`, TI-3, needs reproduction):** after a *successful* plan, `_syncPostApplyState` (starship-maneuver suite) can throw; the catch returns `{success:false}` although the plan is applied and **not** rolled back (the transactional restore lives inside `applyMutationPlan`). A retry could re-apply. Reproduce before touching.
- **Remediation:** none to progression outcomes. **Owner ruling:** none.

## TX-10 — Cross-actor and approval workflows
- **`StoreTransactionEngine`** (buyer debit → seller credit → delete → create, best-effort saga): **INACTIVE** — no importer (a comment in a Holonet emitter only). **`DroidTransactionService`/`VehicleTransactionService`** (sets in-memory status, applies the plan, **then** saves the world flag): **INACTIVE** — no caller; `droid-system-definitions.js` itself says "nothing in the codebase currently" calls it. → `INACTIVE_LEGACY`.
- **Live GM approvals** (`GMApprovalOperationsService.approveDroid/approvePendingCustom`, `gm-store-dashboard`): `TransactionEngine.executeAssetApprovalTransaction` (snapshots both actors; lock `owner:asset:context:asset-approval`, process-local). `approveDroid` checks `stateMode === 'PENDING'` first (state-based replay guard, check-then-act). `approvePendingCustom(host, index)` re-reads the queue **by index**; queue removal uses an id lookup with the index as fallback. → `DESIGN_GAP`: index-addressed read on a stale UI; no durable approval id; two GMs/tabs can pass the check concurrently.
- **Remediation (TI-3, after TI-2):** address approvals by stable id; make the asset-state check part of the same transaction. **Not reproduced offline** (requires two clients); marked for the Foundry runtime checkpoint.

## TX-11 — Follower transaction contract
- **Verified:** `runFollowerMutationTransaction` counts a step failed only if `commit()` **throws**, and a rollback failed only if `rollback()` **throws**.
- **Reproduction:** `R:tx11` — **a REPRODUCED** (`commit()` returning `{ok:false}` → `result.ok === true`); **b REPRODUCED** (`rollback()` returning `false` → `rollbackFailed === false`).
- **Callers — ACTIVE:** `follower-hooks.js`, `ally-assignment-service.js` (assign/unassign/convert), `follower-creator.js`. Their steps use `ActorEngine.updateActor` (throws on failure), so **no current step is known to return a failure value** (contract gap, not a live misclassification). **Live caller gap:** `assignAsAlly` and `unassignAlly` log "failed and was rolled back" and rethrow **without consulting `rollbackFailed`**, while `convertToFollower` and the creator do consult it. Step rollbacks write **absolute** prior values (`system.ownedActors`), overwriting a concurrent change to that list.
- **Classification:** `CONFIRMED_DEFECT` (contract) + caller gap. **Remediation (TI-3):** treat a returned `{ok:false}`/`false` as failure; surface `rollbackFailed` in ally assign/unassign; keep the narrow follower model.

## TX-12 — Operation identity
- **Verified:** `TransactionEngine` ids are `tx_${Date.now()}_${random}` per invocation (and for asset approvals); `SafetyEngine` in-flight guard is a process-local map with a 30 s timeout; equipment requests carry caller-supplied ids with a durable journal (the only domain with durable identity).
- **Evidence:** `R:tx01b` (retry duplicates an install; caveat above). A retry after an *uncertain* completion (applied but errored) is indistinguishable from a new purchase in the commerce and upgrade paths.
- **Classification:** `DESIGN_GAP`. **Remediation:** TI-4 (contract) — but note independent valid actions need distinct ids; ids alone give **no atomicity or isolation** (stated in the contract proposal).

## TX-13 — Governance versus isolation
- **Verified:** `MutationInterceptor.initialize` sets `strict` only on `localhost` or with the dev setting; production is `normal` (logs and continues); the prototype-wrapping interception was **removed** ("PERMANENT FIX"), so enforcement is context tracking + hooks. `ActionEconomyPersistence.setTurnState` is `actor.setFlag` (last write wins).
- **Classification:** `INTENTIONAL_LIMITATION` — authorization is not atomicity. **Action:** document the precise guarantee per domain in the contract; add negative static guards (TI-4). No attempt to build cross-client locking.

## TX-14 — Modification installation
- **Verified:** PR #1057 `data/modifications/status-ledger-v1.json` → `selectable: 0`. T4d-4 and production adapters are not authorized. **`CERTIFICATION_GATE` — not bypassed, not modified.**

---

## New sub-findings from verification (`TI-N#`)

| ID | Finding | Evidence | Class | Package |
|---|---|---|---|---|
| TI-N1 | **The offline test harness replaces `ActorEngine` with a fake.** No offline test exercises the real `spendForcePoints`/`gainForcePoints`/`applyMutationPlan`/`updateEmbeddedDocuments`; fakes mirror a subset. The real engine **does** load under the shim by file URL (used by `repro/_boot.mjs`). | `tests/helpers/foundry-shim/path-loader.mjs`; `R:c3-fp` | `DESIGN_GAP` (verification) | TI-1 (reuse the graft in failure-injection tests) |
| TI-N2 | `TransactionEngine` ignores `SnapshotManager.restoreSnapshot`'s `false` return (TX-08b). | `R:tx08` | `CONFIRMED_DEFECT` | TI-2 |
| TI-N3 | Credits are written as absolute values everywhere (`LedgerService.buildCreditDelta`); direct credit writers outside the commerce authority exist (`talents/DarkSidePowers.js:1601,1969`, `progression-event-processor.js:409`, `equipment-engine.js:68`) | grep | `DESIGN_GAP` | TI-2 (classify; do not centralize) |
| TI-N4 | `ForcePointSpendCoordinator` refund restores the wrong pool (TX-04b). | `R:tx04` | `CONFIRMED_DEFECT` | TI-1 |
| TI-N5 | Ally assign/unassign ignore `rollbackFailed` (TX-11 caller gap). | source | `CONFIRMED_DEFECT` | TI-3 |
| TI-N6 | `ProgressionFinalizer._syncPostApplyState` failure after a successful plan reports whole-finalization failure (TX-09 sub-gap). | source | `DESIGN_GAP` (needs repro) | TI-3 |
| TI-N7 | Equipment-branch `ActionEconomyConsumption` rollback is correct only within one client; `undoLast` itself remains history-last. | `R:tx03`, TX-13 | `INTENTIONAL_LIMITATION` | document |
| TI-N8 | `InstallRemoveEngine` passes the Item as `applyMutationPlan`'s *options* argument (dormant code). | source | `INACTIVE_LEGACY` | none |
