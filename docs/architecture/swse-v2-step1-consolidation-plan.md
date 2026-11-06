# SWSE V2 Step 1 - Consolidation Plan (dependency-ordered)

Status vocabulary: **DONE** (committed on this branch, offline-tested), **NEXT** (authorized, not started), **GATED** (needs an owner ruling, source, or Foundry v13 runtime). Nothing here is Foundry-tested. Evidence for each completed item is in the implementation log; this file only states the order and the gates.

Branch: `feature/v2-vehicle-upgrade-writer-closure` (draft PR #1118), stacked on `feature/v2-unified-clean-break-convergence` (PR #1117) <- #1116 <- #1115 ... <- integration branch. `origin/main` already contains merge #1109 of the integration branch; the stack is **not** merged and `main` is untouched. A retarget/merge-main decision is the owner's.

| # | Tranche | Consumer migrated | Canonical authority | Tests | Status |
|---|---|---|---|---|---|
| 1 | Vehicle Workshop writer closed | `UpgradeService` vehicle branches | `VehicleInstallationService` (Shipyard) via fail-closed refusal | `vehicle-upgrade-writer-closure` (apply, remove, record absent, Droid delegation, mutation-verified) | **DONE** |
| 1b | Guard consistency | `check-droid-installation-write-authority` allowance | n/a | `droid-strict-authority-guards` | **DONE** |
| 2 | Follower wallet bridge removed | `follower-droid-garage-hotfix.js`, Workshop payer | `DroidCustomizationEngine` + `TransactionEngine` (explicit `walletActor`/`assetActor`); `resolveAssetOwnerId` | `droid-follower-owner-wallet` (owner pays/receives, follower untouched, rich follower cannot pay, Workshop payer, mutation-verified), `ti2-commerce-integrity` | **DONE** |
| 3 | Unreferenced mutation scaffolding deleted | `mutation-gateway.js`, `mutation-router.js`, `store-transaction-engine.js`, `vehicle-transaction-service.js` (3a); shell `mutation-coordinator.js` + `mutation-plan.js`, `UpdatePipeline.js`, `ActorCommands.js`, `ProgressionStatePersistence.js` (3b) | ActorEngine / TransactionEngine / VehicleInstallationService / ProgressionFinalizer | `step1-retired-mutation-surfaces` (files gone, no import, no non-comment symbol reference) | **DONE** (static reachability only). `mutation-adapter.js` is unreferenced but kept (owner preserve list) pending a decision; `architecture-governance.js` (unimported, comment-only rule text naming MutationCoordinator) left for a separate cleanup |
| 4 | Legacy Vehicle manager + hooks | `vehicle-modification-manager.js` (+ replace its pinning test), `assets-hooks.js` | n/a | scanner test | **NEXT** (Foundry startup smoke is the final proof) |
| 5 | Static identity import | `ModifierEngine._followsDroidRules` fallback | `droid-rules-profile.js` | simulated import failure grants nothing | **NEXT** |
| 6 | Vehicle modifier shadow | `_getVehicleModModifiers` raw `system.installedSystems` | sealed ledger / effective projector | tamper test | **NEXT** (depends on how custom vehicles are treated) |
| 7 | Bay Shipyard -> sheet Shipyard | `CustomizationBayApp` Shipyard mode, `VehicleCustomizationEngine` | `VehicleInstallationService` | published hull cannot reach legacy mutation | **GATED** (owner ruling on custom/unpublished vehicles) |
| 8 | Domain postconditions | Droid ledger instance/host, Vehicle installation record | callers of `executeAssetCustomizationTransaction` | postcondition-failure tests | **NEXT** after 3-5 |
| 9 | Droid Store honesty (234 models / 194-pack) | Store loader/checkout | per-model status | | **GATED** (source) |
| 10 | F3 zero-HP, G5 Heuristic defaults | combat / construction | | | **GATED** (printed ruling) |
| 11 | Live Foundry v13 acceptance | all of the above | | | **GATED** (runtime) |

Rules for every tranche: re-verify consumers right before acting; keep the working tree clean between tranches; one logical change per commit; exact-head CI before calling a tranche verified; never weaken a guard or source gate.
