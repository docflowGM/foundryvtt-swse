# Droid V2 - Gate C-3A: initial installation seeding (2026-11-06)

**Branch:** `feature/v2-unified-gate-c3a-creation-ledger`, stacked on `feature/v2-unified-wave-2b-host-eligibility` (PR #1114 head `e0d7a55`; exact-head CI green: Rolling 619 passed / 0 failed / 5 documented exclusions, Droid targeted success). **Offline only; no Foundry V13 runtime test.**

## 1. Writer audit (before any change)

| Lifecycle | Where `system.droidSystems` is finalized | Wrote `system.installedSystems`? | Notes |
|---|---|---|---|
| **Chargen** (custom / standard-model) | `DroidSubtypeAdapter.contributeMutationPlan` in `scripts/apps/progression-framework/adapters/default-subtypes.js` - the only writer of droid system fields in the progression mutation plan, applied by ActorEngine | No | The builder's draft appendages are `{ id: 'hand-1', type: 'hand' }` (slot-style id, kind in `type`). |
| **Droid follower** | `FollowerCreator` in `scripts/apps/follower-creator.js`, two sites: `_applyFollowerProgressionMaterial` (materialize step) and `updateFromMutation` (update step), both via `ActorEngine.updateActor` inside `runFollowerMutationTransaction` (create-actor -> materialize -> link, reverse-order rollback) | No | The two sites write the same `droidSystems` twice, so the seeding must be idempotent across them. |
| **Stock import** | `scripts/engine/import/stock-droid-importer-engine.js` (creation data), then optional reconciliation (`DroidConvertedSystemReconciliationService`) | Only via reconciliation | A stock-statblock droid must NOT be seeded: any ledger record un-suppresses a component's modifiers (`shouldSuppressComponentModifiers`), double-counting bonuses already baked into the published totals. |
| **Post-creation customization** | `DroidCustomizationEngine` (Garage / Workshop) through `TransactionEngine.executeAssetCustomizationTransaction` | Yes | Charges credits; this wave does not use it. |

Creation is therefore a one-time writer of the build draft; only the ledger was missing.

## 2. Design

`scripts/domain/droids/droid-initial-installation.js` (pure) projects the finalized build into the ledger the Garage already uses; `droid-initial-installation-service.js` wires the real catalog, the published-source review gate and the stock-statblock check, and exposes the two decision points both lifecycles call (`applyInitialInstallationToPlan`, `resolveFollowerDroidInstallation`). No second ledger, no purchase, no quote.

- **Deterministic.** Appendage ids derive from (actor id, canonical part id, ordinal) with a fixed hash, locations are `appendage-slot-N` in draft order; no random, no clock. Previews, retries, recomputation and repeated finalization yield identical records. An identity already present on a draft row is kept. On a repeat the actor's own records are recognized and reused (the mirror re-attaches the same identities); nothing is duplicated.
- **Two hands stay two.** Kind comes from the row's `type` when its id is not canonical (appendages list only); display names ("Hand (Right)") are never read, so no anatomy is inferred.
- **Fail closed, before commit.** A selection that is not a canonical component, is not cleared by the published-source review in the INITIAL_BUILD context (the certified first-unrestricted-locomotion subset still passes; a HOLD in another slot does not), is a typed fitting with no established host, or is a duplicate singleton raises `DROID_INITIAL_INSTALLATION_UNRESOLVED` naming the component and the reason. Chargen aborts before its plan is returned; a follower step throws inside the follower transaction, which rolls back the created actor like any step failure.
- **Never overwrites.** Existing ledger records win; existing physical appendage instances suppress appendage seeding; backup-processor slot mirrors are draft-only and are reported as skipped, never installed. Stock-statblock droids are not seeded.
- **No billing.** The creation modules contain no `TransactionEngine`, store, customization-engine or direct update call (asserted by a test); `droidCredits` / `spent` accounting is untouched.
- **Entries** carry `provenance.origin: 'initial-build'` and no `mechanicalState` (absence means "applies"; that field has its own approved writers), so modifiers are neither suppressed nor double-counted.

## 3. Files

`scripts/domain/droids/droid-initial-installation.js` (new), `droid-initial-installation-service.js` (new), `scripts/apps/progression-framework/adapters/default-subtypes.js`, `scripts/apps/follower-creator.js`, `tools/check-droid-installation-write-authority.mjs` (the new service is a documented one-time creation writer; chargen's entry now requires evidence that it delegates), `tests/droid-gate-c3a-initial-installation.test.mjs` (new, 12 groups), `.github/workflows/droid-v2-gate-a.yml`.

## 4. Evidence

12 test groups on the real catalog, real source-review gate and the real follower transaction coordinator. Nine mutations (random identities, shared identity for two hands, stock droid seeded, existing record overwritten, source clearance ignored, unknown component accepted, mirror not updated, repeat not recognized, duplicate singleton accepted) are each caught. All four strict authority guards and the phase-5c check pass. `follower-creator.js` and the chargen adapter file cannot be loaded under Node (Foundry application surface; a documented limit of this repository's harness), so their behavior is covered through the extracted service plus source-contract assertions (droid-only branch, delegation, ActorEngine). Rolling and CI results are recorded on the PR.

## 5. Limitations and remaining unresolved identities

- The builder's appendage rows keep their display names ("Hand (Right)") in the mirror; this wave neither relies on nor changes them.
- A droid whose build cannot be mapped now blocks finalization (by design); no player droid is migrated (none is authorized).
- Typed fittings (e.g. climbing claws) have no initial-build host mapping and therefore fail closed; they are also source-HOLD today.
- Embedded-Item integrated equipment is not reconciled into the ledger (separate task).
- Not done here: Garage instance picker (C-3B), dead-module removal (C-3C), Foundry V13 acceptance. No source HOLD promoted; DROID-RD-001..003 and SGD-HOST-002 untouched; no vehicle code touched.
