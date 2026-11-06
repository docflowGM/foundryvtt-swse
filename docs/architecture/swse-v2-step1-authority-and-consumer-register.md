# SWSE V2 Step 1 - Authority and Consumer Register (keep / merge / redirect / delete)

| | |
|---|---|
| **Repo / branch** | `docflowGM/foundryvtt-swse`, branch `feature/v2-vehicle-upgrade-writer-closure`, based on `7e1a753d60891c5d0080b1f678df8f755db9cc81` (PR #1117 head) |
| **Date** | 2026-11-06 UTC |
| **Evidence** | `CODE_VERIFIED` = read at this SHA; reachability = **static** (targeted greps over `scripts/ tests/ tools/ system.json index.js`); dynamic/computed loading is not ruled out. Nothing Foundry-tested. |
| **Related** | [Architecture Map](../audits/SWSE_V2_SSOT_Master_Architecture_Map.md), [Ledger](../audits/SWSE_V2_SSOT_5_Category_Consumer_Ledger.md), [Roadmap](../audits/SWSE_V2_SSOT_Convergence_Roadmap_for_Claude.md) |

Three things are kept distinct below: **exists**, **wired into production**, **enforces the contract its docs describe**.

## 1. Register

| Component | File | Exists | Wired (static evidence) | Enforces what its docs claim | Owner's review said | Verified disposition |
|---|---|---|---|---|---|---|
| ActorEngine | `scripts/governance/actor-engine/actor-engine.js` | yes | yes (all mutation services) | Structure + buckets + recalculation. `applyMutationPlan` `transactional` **defaults false** (`:3015`); callers pass `transactional:true` explicitly (ProgressionFinalizer `progression-finalizer.js:3771`, officer-share, enforcer delivery). Not a legality/pricing authority. | Preserve | **KEEP** (no contract change) |
| TransactionEngine | `scripts/engine/store/transaction-engine.js` | yes | yes (Garage, Shipyard, Store) | Snapshots, affordability recheck, same-client lock, wallet verification; **not** multi-document ACID; no domain postcondition check | Preserve; add domain postconditions | **KEEP**; Step 1E: add per-domain postcondition checks in the *callers* (ledger instance/host for Droid, installation record for Vehicle) |
| ProgressionFinalizer | `scripts/apps/progression-framework/shell/progression-finalizer.js` | yes | yes | requests `transactional:true` | Preserve | **KEEP** |
| CommandBus | `scripts/engine/core/CommandBus.js` | yes | yes, **but narrow**: the only commands any caller dispatches are `APPLY_ITEM_UPGRADE`, `REMOVE_ITEM_UPGRADE`, `FINALIZE_ITEM_UPGRADES`, `SET_LIGHTSABER_{CRYSTAL,CHASSIS,COLOR}` (17 `execute` call sites in `ShellHost`, `upgrade-app`, `actor-sheet-base`, `UpgradeCommands`). `PROGRESS_TO_STEP`/`COMPLETE_STEP`/`REWIND_PROGRESSION`/`SET_THEME` forward to `game.swse.engine.*?` and have no dispatcher call sites found. | Header says "ONLY valid way for UI to modify actor": **not true** (sheets/apps mutate via ActorEngine directly) | "Evaluate and retain" | **KEEP as upgrade command router only**; do not extend into a universal bus (Step 3 decision) |
| UpgradeService | `scripts/engine/upgrades/UpgradeService.js` | yes | yes | **Vehicle branch bypassed every rule** (N-01) | Preserve Item functionality; redirect Vehicle | **REDIRECT: DONE in this branch** - vehicle record not offered; `applyUpgrade`/`removeUpgrade` refuse `vehicle-actor-*` (fail closed, zero ActorEngine calls). Droid branch still delegates to `DroidCustomizationEngine`. Full "Shipyard job adapter" is a later step (Section 3). |
| MutationAdapter | `scripts/governance/mutation-adapter.js` | yes | **no importer found** (class and path appear only in the file itself) | n/a | "Preserve where useful" | **UNREFERENCED (static)** - owner's "preserve" cannot be honored as a live dependency; candidate for removal after confirming no useful logic to merge (Step 1B) |
| PreflightValidator | `scripts/governance/enforcement/preflight-validator.js` | yes | yes (imported by `actor-engine.js`; named in `tools/check-architecture-boundaries.mjs`) | structural validation only | Integrate selectively | **KEEP**; do not make it a rules authority |
| MutationInterceptor | `scripts/governance/mutation/MutationInterceptor.js` | yes | yes (base actor, enforcement gates, sentinel) | Owner says context tracking/diagnostics only and permissive in normal mode. **Not independently verified by me** (UNVERIFIED) | Distinguish docs vs enforcement | **KEEP**; Step 1E: write a small test proving what it blocks vs logs before anyone relies on it |
| MutationGateway | `scripts/governance/mutation/mutation-gateway.js` | yes | **no references anywhere** except itself; file header: "FUTURE SCAFFOLD - UNWIRED"; methods `throw` ("not wired") (`:91,107,122`) | no | Quarantine | **DELETE candidate** (C4 static). Do not wire. |
| MutationRouter | `scripts/governance/mutation/mutation-router.js` | yes | **no references** except itself; header "UNWIRED" | no | Quarantine | **DELETE candidate** (C4 static) |
| MutationCoordinator + shell `MutationPlan` | `scripts/apps/progression-framework/shell/mutation-coordinator.js`, `mutation-plan.js` | yes | `mutation-plan.js` is imported only by `mutation-coordinator.js:23`; `mutation-coordinator.js` is referenced only as a path string in `scripts/dev/prerequisite-authority-audit.js:47`. The `*-plan-builder.js` files under `shell/mutation/` matched on the *name*, not on this class. | owner: applies plan to in-memory `actor.system`, logs Item mutations only | Reachability audit | **UNREFERENCED chain (static)**; retire after removing the dev-audit entry; check the plan builders do not import it |
| UpdatePipeline | `scripts/engine/core/UpdatePipeline.js` | yes | importers are `ProgressionStatePersistence.js` and `commands/ActorCommands.js`; **neither of those has an importer** outside itself (`CommandBus` does not import `ActorCommands`). Chain is unreferenced. It calls `actor.update`/`setFlag` directly (`:31,53,76`). | bypasses ActorEngine | Redirect then retire | **UNREFERENCED chain (static)** -> delete `UpdatePipeline`, `ActorCommands`, `ProgressionStatePersistence` together after a final grep and a startup smoke |
| StoreTransactionEngine | `scripts/engine/store/store-transaction-engine.js` | yes | **no importer**; the class name appears only in a comment in `scripts/holonet/emitters/store-emitter.js:5` | n/a | "Check consumers" | **UNREFERENCED (static)** - delete candidate; confirm `store-emitter` does not need it |
| VehicleTransactionService | `scripts/domain/vehicles/vehicle-transaction-service.js` | yes | **no reference by file or class name anywhere**; `approveTransaction` (`:100`) applies a stored plan via ActorEngine (`:134`) without a fresh legality check | no | Quarantine | **DELETE candidate** (C4 static); latent unpaid-apply path |
| DroidCustomizationEngine | `scripts/engine/customization/droid-customization-engine.js` | yes | yes | confirmed-ledger removal; independent revalidation in `apply` | Preserve | **KEEP** |
| VehicleInstallationService | `scripts/engine/vehicles/vehicle-installation-service.js` | yes | yes (sheet Shipyard actions) | sealed ledger, job, EP, price | Preserve | **KEEP** (single Vehicle installation authority) |
| VehicleCustomizationEngine | `scripts/engine/customization/vehicle-customization-engine.js` | yes | yes via `CustomizationBayApp` Shipyard mode | charges via TransactionEngine; `canonicalBlock` refuses published hulls; writes legacy `system.installedSystems` | Consolidate and retire | **MERGE/REDIRECT then retire** - blocked on the owner's custom-hull ruling (Roadmap W3) |
| Follower wallet Proxy/hotfix | `scripts/patches/follower-droid-garage-hotfix.js` (**deleted in this branch**) | was yes | was registered `runtime-bugfix-hotfixes-init.js:38` | wallet-view only | Replace and remove | **DELETED (Stage 2).** Replacement: one owner definition `scripts/domain/droids/droid-asset-owner.js` `resolveAssetOwnerId` (purchase links + follower links), used by `tech-specialist-modification-service.js` `resolveWalletActor` (Bay) and by `UpgradeService.#walletOptions` (Workshop, which previously passed no `walletActor`). Engine and TransactionEngine already took explicit `walletActor`/`assetActor`. |

## 2. Corrections to the architecture review's premises (verified)

- `CommandBus` is **not** a general UI-intention dispatcher today; it routes upgrade commands only.
- `MutationAdapter` is **not** wired; "preserve where useful" has no live consumer to preserve.
- `UpdatePipeline` has no live consumer chain (its two importers are themselves unreferenced), so "redirect consumers" is moot: it can be deleted.
- `ActorEngine` `transactional` defaults to `false`, as stated; `ProgressionFinalizer` is not its only transactional caller.

## 3. Implemented so far in this branch (see the implementation log for SHAs)

`feature/v2-vehicle-upgrade-writer-closure` closes the unpaid Vehicle write only:
- `UpgradeService.collectOwnedUpgradeRecords` no longer offers the vehicle; `applyUpgrade`/`removeUpgrade` throw `VEHICLE_WORKSHOP_REFUSAL`.
- `tests/vehicle-upgrade-writer-closure.test.mjs` (apply, remove, record absent, Droid delegation intact; mutation-verified: restoring the raw write fails it).

**Done in Stage 2 (see implementation log):** follower wallet bridge removed; Workshop pays from the owner for follower droids.

**Deliberately not done yet:** (a) a "Shipyard job adapter" inside the Upgrade App (needs `VehicleInstallationService`'s job API contract and a UI decision; the Shipyard on the vehicle sheet already exposes it); (b) a `preUpdateActor` guard on raw `system.installedSystems` for vehicles, because the legacy paid `VehicleCustomizationEngine` lane (non-canonical hulls) legitimately writes that field until the custom-hull ruling.

## 4. Remaining staged plan

| Step | Work | Gate |
|---|---|---|
| 1B | Extract anything useful from `MutationAdapter`, shell `MutationCoordinator`, `StoreTransactionEngine`, `VehicleTransactionService` (none found yet) into the live authorities | owner review of the register |
| 1C | (Workshop wallet + follower proxy removal: DONE, Stage 2.) Route Bay Shipyard mode to the sheet Shipyard; static `droid-rules-profile` import in `ModifierEngine` (Roadmap W2) | custom-hull ruling for the Bay lane; v13 for the proxy removal |
| 1D | Delete: `mutation-gateway.js`, `mutation-router.js`, shell coordinator/plan, `UpdatePipeline` chain, `store-transaction-engine.js`, `vehicle-transaction-service.js`, `vehicle-modification-manager.js` (+ its pinning test), `assets-hooks.js`; add a retired-surface scanner test | static re-grep + Foundry startup smoke |
| 1E | Domain postcondition checks; MutationInterceptor behavior test; full regression; live Foundry v13 acceptance | v13 world |
