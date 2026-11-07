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

## Independent-review corrections (PR #1115 head `46d40c7`)

Exact-head CI was green on `46d40c7` (Rolling 620 passed / 0 failed / 5 excluded; Droid targeted success). Review found creation-state boundary gaps that CI did not exercise. Each was **reproduced first** on the `46d40c7` core, then fixed:

| # | Reproduced on `46d40c7` | Fix |
|---|---|---|
| A | Two draft rows with the same `instanceId` -> zero errors, ONE ledger entry (the second overwrote the first) and a duplicated mirror identity | Duplicate or malformed supplied `instanceId`, and duplicate or non-token supplied `locationId`, are refused (`DUPLICATE_INSTANCE_ID`, `CONFLICTING_LOCATION`, `MALFORMED_SUPPLIED_IDENTITY`) before anything is written. Distinct supplied identities of one kind stay legal and are honored; derived locations never reuse a supplied token. A supplied id that belongs to a different existing component is a conflict (no impersonation). |
| B | A ledger holding a different physical appendage made the approved appendages silently "skipped": no error, build and ledger disagreed | An EXACT repeat (same count, kinds, identities, locations) is accepted and reuses the records. Anything else is `EXISTING_APPENDAGES_CONFLICT`. A disabled (`installed`/`enabled` false), malformed, or different singleton under the component's id is `EXISTING_COMPONENT_CONFLICT`; a malformed existing instance record is `MALFORMED_EXISTING_RECORD`. A valid existing singleton is preserved verbatim. Nothing is overwritten. |
| C | A locomotion row marked `restricted: true` still reached the source-review gate as `restrictedLocomotion: false` | The constant is gone. The first-unrestricted fact is the builder's OWN acceptance of the primary locomotion (see below); an explicit restriction marker other than `false` is `RESTRICTION_UNVERIFIED`; any other slot has no such fact. The five HOLD locomotions still pass only as the builder-accepted first locomotion; none is promoted. |
| D | Follower fixtures were `type: 'droid'` | New fixtures match `follower-mutation-planning.js`: `type: 'npc'`, `system.isDroid: true`. |

**All-or-nothing:** on any unresolved condition the returned ledger and mirror are exactly the inputs (asserted over four failure shapes).

### Acceptance boundary (where validation is guaranteed)
A selection is installed only if the builder's own initial-build workflow accepts it. `acceptWithBuilderWorkflow` (droid-initial-installation-service.js) calls `quoteDroidBuilderSelection` with `operationPhase: 'INITIAL_BUILD'` - the single builder quote consumer that DroidBuilderStep uses at selection time. That consumer applies the published-source review, the typed prerequisites (draft mode) and an exact quote. It is asked only "would the builder accept this?"; no price is used and no pricing rule is duplicated. It also supplies the locomotion speed from the row and requires a published `variant` where the source demands one. With no workflow supplied nothing is accepted. Fields the builder does not produce (`sensors`, `weapons`, `integratedSystems`, `processorEnhancements`, `locomotionSystems`, `secondaryLocomotion`) have no validated acceptance path and are refused when non-empty (`UNVALIDATED_SELECTION`); so are definitions with no builder quotation path. Reasons name the real cause (for example a missing locomotion speed is reported as such, not as a source HOLD).

### NPC-shaped droid followers - audit findings (no authority changed)
- `resolveDroidCalculationMode` returns playable-derived for any actor whose type is not `droid` (reason `not-a-droid-actor`), so an NPC-typed follower is never in stock-statblock mode and is seeded. Stock imports are `droid` actors, so the stock protection is unaffected.
- `ModifierEngine._getDroidModModifiers` returns early for `actor.type !== 'droid'`, so NPC-typed droid followers collect no droid-part modifiers at all - seeding neither applies nor double-counts any. **Observation for the owner (existing behavior, not changed):** droid-part modifiers therefore do not apply to NPC-typed droid followers today.
- The Garage engine rejects non-`droid` actors, which is why creation seeding is a separate path rather than a call into it.
- Organic NPC followers have no droid build and are untouched.

### Verification of these corrections
Tests: 18 groups (was 12), including duplicate / conflicting / malformed identities, the existing-ledger conflict matrix, the restricted-locomotion cases, the acceptance boundary, all-or-nothing, and NPC-shaped followers. Eleven mutations (duplicate ids, duplicate locations, tolerated differing ledger, tolerated disabled singleton, restricted constant, ignored restriction claim, no-workflow accept, ignored acceptance failure, builder-foreign fields, made-up speed, partial output) are each caught; two initially survived and exposed test gaps that were closed. All four strict guards and phase-5c pass; the related droid / follower / chargen / transaction / calculation-mode sweep passes. Rolling and CI results are recorded on the PR.
