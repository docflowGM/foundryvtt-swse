# Droid/Follower/Ally Authority — Static Review Round 3 Correction Pass

**Branch:** `fix/droid-authority-consolidation-phase-2`
**PR:** #937 (draft)
**Trigger:** A third-round static review at exact commit `72014c40afe114ee946211e32baccf2cc09c99f`
found 16 defects across the follower/droid/ally authority surface, split into
4 P0 (merge-blocking), 9 P1 (high), and 3 P2 (medium) findings. This document
records what was actually fixed, how it was verified, and what remains open.

**Review methodology note carried forward from the source review:** the
findings this document addresses came from a *static* review — reading of
the changed-file set and its highest-risk production paths, not execution in
a running Foundry v13 client. The fixes below are verified the same way this
whole branch has been verified throughout: real production-path tests where
the code is loadable in the Foundry-shim Node harness, honestly labeled
structural/source-inspection tests where it is not, `node --check` for
syntax, and the existing `check-*-authority.mjs --strict` guards plus two
new ones. **No live Foundry v13 session was available in this environment.
Nothing here should be read as live-runtime validation.**

## P0 — merge-blocking (all 4 fixed)

### P0-1: Follower derivation failure silently reported as success
`FollowerCreator.updateFollowerForOwnerLevel()` (`scripts/apps/follower-creator.js`)
discarded `updateFollowerFromMutation()`'s boolean result and always returned
`true`, letting `AllyAssignmentService.convertToFollower()` commit a slot/
owner relationship even when mechanical follower derivation actually failed.
Now propagates the real result; `updateFollowersForLevelUp()` logs a warning
on a non-`true` return instead of assuming success.
Coverage: source-verified (this file cannot load in the Node shim — it
transitively imports `SWSEDialogV2`); the surrounding transaction's
rollback-on-`false` behavior is production-path tested via the existing
`applyFollowerDerivation` injection seam.

### P0-2: Droid customization resale exploit
`DroidCustomizationEngine.previewDroidCustomization()` paid resale for any
catalog id without verifying installation, and never deduplicated repeated
ids — a forged request repeating a "remove" id 3× minted 3× resale. Added
`normalizeDroidCustomizationChangeSet()`, called by both `previewDroidCustomization()`
and, independently, `applyDroidCustomization()` immediately before mutating
(closing a preview/apply TOCTOU gap too). Also fixed a genuine pre-existing
crash (`droidPartEntry()` passed a `Set` where `hydrateDroidPart()` expects
an `Array`), found via the new tests.
Coverage: 10 production-path tests (`tests/droid-customization-exploit.test.mjs`),
including two end-to-end `applyDroidCustomization()` tests through the real
`TransactionEngine`/fake-`ActorEngine` chain.
Guard: `tools/check-droid-customization-validation-authority.mjs` (new).

### P0-3: Stock-droid attack math skipped all situational modifiers
`resolveAttackBonus()`'s stock-droid branch was an unconditional early
`return` of the published total — its own doc comment claimed situational
modifiers "still apply on top of it" while the code returned before any of
them ran. Restructured into an `isStockDroidFlat` gate: BAB/ability/
enhancement/proficiency are replaced by the published total, but range,
firing-into-melee, condition-track, attack penalty, combat options, rage,
Sith Commander/Inquisition/Unsettling Presence/Rapid Alchemy/Force Item, and
scoped-feat modifiers all still compute and apply.
Coverage: 9 production-path tests (`tests/stock-droid-attack-math.test.mjs`),
executing the real `resolveAttackBonus()` through the Foundry-shim harness
(worked around a harness-only gap: `window` is not among the shim's globals,
and this function reads `window.SWSE?.TalentActionLinker` unconditionally —
fixed locally in the test file, not in the shared shim).

### P0-4: Stock-droid printed damage never consumed — double-count risk
`flags.swse.stockDroidAttack.publishedDamage` was stored by the importer but
never read by any damage-rolling authority; normal half-level/ability/
weapon damage math applied on top of it. Added `getStockDamageFormula()`
(`droid-mode-adapter.js`, mirrors `getStockAttackFlatBonus()`) and
`resolveStockDroidDamageContract()` (`combat-roll-math.js`), wired into the
canonical `resolveDamageBonus()`: half-level/ability/enhancement are
withheld for a stock-flat weapon while rage/Rapid Alchemy/effect-intent/
combat-option/scoped-feat modifiers still apply. The 3 roll-formula call
sites (`damage.js`, `attacks.js` ×2) now use the published formula as the
dice base instead of `weapon.system.damage` when `flags.stockDamageFormula`
is present.
Coverage: 6 production-path tests + 1 structural test verifying the call-site
wiring (`tests/stock-droid-damage-math.test.mjs` — `damage.js`/`attacks.js`
pull in `RollEngine`/`SWSEChat`/`AmmoSystem`, not shimmed, so the actual
formula assembly in those two files is source-verified, not executed).
Guard: `tools/check-droid-calculation-mode-authority.mjs` Check 3 extended
to track `publishedDamage` the same way it already tracked
`publishedAttackTotal`.

## P1 — high severity

| # | Finding | Status |
|---|---|---|
| P1-1 | Two competing follower-slot-occupancy definitions | **Fixed** — new `scripts/domain/followers/follower-slot-occupancy.js` (`resolveFollowerSlotActorId`/`isFollowerSlotOccupied`, alias-aware: `createdActorId`/`actorId`/`assignedActorId`/`dependentActorId`/`npcActorId`); migrated `ally-assignment-service.js`, `follower-hooks.js`, `minion-creator.js`, `follower-session-seeder.js`, `progression-entry.js`, `character-sheet.js`, `PanelContextBuilder.js`. Two pure-display call sites (`HomeSurfaceService.js`, `AssetBaySurfaceService.js`) already had partial alias awareness before this pass and were left as-is (lower risk, not gating mutations). |
| P1-2 | `findExistingFollowerRelationship` world-graph scan used the narrow occupancy definition, returned only the first match | **Fixed** — now uses the P1-1 helper, scans every owner (not just the first match), and returns `{isFollower, ownerActorId, slotId, sources, conflicts}` (multi-owner conflicts surfaced, not silently collapsed). |
| P1-3 | Follower-template restriction enforced only by UI | **Verified already fixed** in a prior phase (`buildFollowerConversionPreflight`/Fix 13, tasks #173/#181) — `convertToFollower()` throws before ever building the mutation plan if `!preflight.eligible`, and `preflight.resolvedTemplate` is always non-null by the time the plan is built, so the planner's `\|\| 'utility'` default is unreachable via the only production caller. No code change; confirmed by reading the actual gate and the existing 40-test suite's single-template-slot coverage. |
| P1-4 | `follower-hooks.js` bypassed ActorEngine with direct `setFlag()`; removed the slot before cleanup completed | **Fixed** — `followers`/`minions`/`pendingFollowerDetachment` writes now route through `ActorEngine.updateActor()`; the auto-detach path in the `deleteItem` hook now uses `runFollowerMutationTransaction()` with named, ordered steps (`remove-granted-items-and-detach` before `remove-slot`, with rollback), closing the "slot gone before cleanup finished" gap. |
| P1-5 | Reconciliation apply trusts caller-supplied plan with no cross-Actor/staleness check | **Fixed** (see "P1-5 — Intent-Based Reconciliation Apply Boundary" below and `docs/audits/droid-converted-system-reconciliation-phase-4.md`'s matching section for full detail). |
| P1-6 | Drift repair trusts caller-supplied embedded Item ids (arbitrary-deletion risk) | **Fixed** (see "P1-6 — Intent-Based Installation Drift Repair Boundary" below and `docs/audits/droid-authority-consolidation-phase-2.md`'s matching section for full detail). |
| P1-7 | Snapshot restoration is non-atomic, omits flags/ownership, changes recreated Item ids | **Not fixed this pass** — deferred, see Remaining Limitations. |
| P1-8 | Ownership rollback wrote NONE instead of deleting the key; Assign-as-Ally rollback recomputed from live state | **Fixed** — `buildOwnershipGrantStep`'s rollback now deletes the ownership key (`ownership.-=${userId}`) via Foundry's deletion convention when there was no prior entry, restores the exact prior value when there was one; `assignAsAlly`'s owner-array rollback now captures `currentOwnedActors`/`currentFlagList` before mutation and restores those exact captured arrays (matching the pattern already used by `unassignAlly`/`convertToFollower` in the same file) instead of recomputing "current minus target" from `ownerActor`'s live state at rollback time. |
| P1-9 | Contradictory installedSystems/droidSystems SSOT claims | **Verified + documented, not a functional change** — `droid-installed-component-resolver.js` already implements the correct precedence (`INSTALLED_LEDGER > EMBEDDED_ITEM > DROID_SYSTEMS_RECORD > LEGACY_MOD`) and `droid-systems-resolver.js` already delegates dedup/precedence to it; added one explicit SSOT policy block to the canonical resolver's header clarifying that `droidSystems` readers elsewhere are display fallbacks, not competing authority claims. `droidSystems` in `scripts/apps/progression-framework/**` is a separate, unrelated concern (in-progress chargen/follower-build DRAFT state, not actor authority). |

## P2 — medium severity

| # | Finding | Status |
|---|---|---|
| P2-1 | Malformed `droidCalculationMode` unfreezes a stock droid | **Fixed** — `resolveDroidCalculationMode()` now consults legacy `stockDroidImport.importMode` provenance before defaulting a malformed explicit value; falls back to `stock-statblock` (not `playable-derived`) when that provenance says `'statblock'`. |
| P2-2 | Stock importer called raw `Actor.create()` | **Fixed** — swapped for `createActor()` from `scripts/core/document-api-v13.js` (same wrapper `minion-creator.js`/`follower-creator.js` already use), with an explicit null-return check. |
| P2-3 | `AllyAssignmentModal` fixed global Application id; no slot-reservation guard against concurrent conversions | **Not fixed this pass** — deferred, see Remaining Limitations. |

## Remaining Limitations (explicitly deferred, not fixed this pass)

*(Historical record of what Round 3 deferred. P1-5 and P1-6 were
subsequently fixed — see the "P1-5 — Intent-Based Reconciliation Apply
Boundary" and "P1-6 — Intent-Based Installation Drift Repair Boundary"
sections below. P1-7 remains open as described here.)*

- **P1-5 / P1-6** (reconciliation-apply and drift-repair trust boundaries) and
  **P1-7** (snapshot restoration exactness) touch `SnapshotManager`,
  `droid-converted-system-reconciliation-service.js`, and
  `droid-statblock-conversion-service.js` — all higher-blast-radius mutation
  authorities than the ones corrected this pass. Given the time available in
  this session, hardening them correctly (intent-based reconciliation
  payloads instead of trusting a full caller-supplied plan; validating
  drift-repair Item ids belong to the target Actor before deletion; making
  snapshot restore include flags/ownership and preserve Item identity) was
  judged too large to do safely without dedicated focus and its own test
  pass, rather than a rushed partial fix under time pressure.
- **P2-3** (modal Application-id collision / slot-reservation concurrency
  guard) is a real but narrow UI-layer race — not touched this pass.
- Static guards were added for the P0-2 and P0-3/P0-4 fixes only
  (`check-droid-customization-validation-authority.mjs`,
  `check-droid-calculation-mode-authority.mjs` Check 3 extension). No new
  guard exists yet for follower-slot-occupancy centralization (P1-1), the
  governed-`setFlag` requirement (P1-4), or the P1-5/P1-6 trust-boundary
  gaps — the P1-4 shape is instead pinned by a structural test
  (`tests/follower-hooks-governed-cleanup.test.mjs`).

## Validation run this pass

- `node --check` on every changed file: clean.
- Full test suite: 66 files, 5 pre-existing failures (all in
  `tests/*force-power*.test.mjs` / `tests/phase6-force-direct-damage.test.mjs`,
  confirmed via `git stash` to fail identically on the pre-existing branch
  head — a missing `scripts/combat/damage-system.js` module, unrelated to
  this pass). Zero regressions introduced.
- `tools/check-progression-integrity.mjs --strict`: **44** (unchanged from
  the established baseline).
- `tools/check-architecture-boundaries.mjs --strict`: **37** (unchanged).
- `tools/check-follower-mutation-authority.mjs --strict`: clean.
- `tools/check-follower-slot-authority.mjs --strict`: clean.
- `tools/check-ally-assignment-authority.mjs --strict`: clean.
- `tools/check-droid-calculation-mode-authority.mjs --strict`: clean (7
  checks, extended this pass); inject→detect→revert verified, byte-identical
  diff after revert.
- `tools/check-droid-customization-validation-authority.mjs --strict`
  (new): clean; inject→detect→revert verified, byte-identical diff after
  revert.
- `tools/check-combat-math-ssot.mjs`: unchanged pre-existing report-only
  notices (3 legacy consumers reached through wrapper functions), no new
  ones.

## New test files this pass

- `tests/droid-customization-exploit.test.mjs` (10 tests, production-path)
- `tests/stock-droid-attack-math.test.mjs` (9 tests, production-path)
- `tests/stock-droid-damage-math.test.mjs` (6 production-path + 1 structural)
- `tests/follower-slot-occupancy-alignment.test.mjs` (15 tests, production-path)
- `tests/follower-hooks-governed-cleanup.test.mjs` (7 checks, structural —
  `follower-hooks.js` cannot load in the Node shim, transitively reaching
  `foundry.applications.api` through `FollowerManager`/`MinionManager`)
- `tests/ally-assignment-rollback-exactness.test.mjs` (3 tests, production-path)
- `tests/stock-droid-importer-document-api.test.mjs` (structural — exercising
  `importDroidTemplate()` end-to-end would require faking a real compendium
  read, out of scope for this narrow fix)
- `tests/droid-mode-adapter.test.mjs`: 2 new cases added (P2-1)

## Round 4 correction pass

**Trigger:** A fourth-round static review at exact commit
`3b4c5fe9f51022a15962371fa3349354b2b7ce62` (the head this document's Round 3
section was written against) found 5 newly-verified defects in the Round-3
fixes themselves, 2 explicitly merge-blocking. This section documents that
correction pass. Same methodology note applies: static review of the
changed-file set and its highest-risk production paths, not live-Foundry
execution.

### R4-1: Follower auto-detach was not atomic (merge-blocking)
The `deleteItem` hook's auto-detach block (`follower-hooks.js`) ran embedded
Item deletion and owner-registry cleanup as a single opaque step with no
rollback for a mid-step failure, and skipped owner-registry cleanup entirely
when the follower Actor could not be found — while still removing the slot.
Extracted the pure data logic (which granted-Item ids to delete, what the
owner-registry patch/rollback should look like, what the slot list should
become) into a new zero-dependency module,
`scripts/domain/followers/follower-talent-detach-plan.js`
(`computeGrantedItemIdsForTalent`, `buildOwnerRegistryDetachPatch`,
`buildSlotRemovalPatch`). The hook now builds 1-2 independently
rollback-capable `runFollowerMutationTransaction` steps
(`delete-granted-items`, `detach-owner-registries` — the latter built
unconditionally, not gated on the follower Actor being found) that always
run before `remove-slot`, so a failure at any point rolls back everything
already committed, and the missing-follower-actor case still detaches the
owner registries instead of leaving a dangling slot.
Coverage: 8 production-path tests
(`tests/follower-talent-detach-plan.test.mjs`) for the pure module; 8
structural tests (`tests/follower-hooks-governed-cleanup.test.mjs`,
rewritten) confirming step ordering, unconditional registry-detach
construction, and rollback wiring in the unloadable hook file.

### R4-2: Assign-as-Ally target-flag rollback dropped pre-existing flags (merge-blocking)
`assignAsAlly()`'s `target-metadata-commit` rollback used
`buildAssignmentClearPatch()`, which only clears the *new* assignment keys —
it does not restore whatever the target's flags looked like before this
call (e.g. a pre-existing `dismissedAlly: true`). A failure later in the
same transaction (e.g. the ownership-grant step) left the target with its
prior flags erased rather than restored. Now captures
`previousTargetFlags` before any mutation and, on rollback, computes an
exact restoration patch via the already-established
`buildFlagRestorationPatch()` (the same helper `unassignAlly()` already
used in this file) instead of a generic clear.
Coverage: 2 new production-path tests added to
`tests/ally-assignment-rollback-exactness.test.mjs` (now 5 total), forcing
the pre-existing "no matching player User" ownership-grant failure as the
trigger and asserting exact flag restoration, with and without a
pre-existing `dismissedAlly` flag.

### R4-3: Follower-slot occupancy SSOT was incomplete
Several call sites still read the raw `slot.createdActorId` field directly
instead of going through the P1-1 `resolveFollowerSlotActorId()`/
`isFollowerSlotOccupied()` helpers, so a slot occupied via a non-canonical
alias field could still be misread as empty (or vice versa) at these sites:
`AlliesSurfaceService.js` (`slotCreatedActorId`,
`getOpenFollowerSlotsForConversion`, `dismissCompanion`),
`follower-creator.js` (`getFollowers`), `follower-slot-service.js`
(`validateManualFollowerSlotRevocation`), and two patch/hotfix modules
(`follower-orphan-transfer-hotfix.js`, `follower-repeatable-entitlement-hotfix.js`
— read sites only; their own separate pre-existing direct-`setFlag` issues
are out of scope for this finding). All migrated to the canonical helpers.
Separately, `findExistingFollowerRelationship()` was missing two follower
sources present elsewhere in the codebase's own world-graph scans:
`targetActor.system?.npcProfile?.owner?.actorId`, and owner
`system.ownedActors` entries with no `kind` (or `kind: 'follower'`) —
added, using the same conservative kind-based classification
`getFollowers()` already established (verified safe: `ASSIGNMENT_KIND`
values are all `assigned-*`, never `'follower'`, so relationship-only
allies are not misclassified).
Coverage: 5 new production-path tests added to
`tests/follower-slot-occupancy-alignment.test.mjs` (now 19 total).
Guard: `tools/check-follower-slot-occupancy-authority.mjs` (new) — flags
narrow single-field `createdActorId` occupancy decisions in
follower-slot-related files outside an explicit, reviewed allowlist
(`minion-creator.js`, `follower-mutation-transaction.js`,
`HomeSurfaceService.js`, `AssetBaySurfaceService.js`, and the occupancy
module itself); inject→detect→revert verified, byte-identical diff after
revert. Also required a one-line update to the pre-existing
`tools/check-follower-slot-authority.mjs` Check 6 (its occupied-slot
regex only recognized the raw `slot.createdActorId` pattern; extended to
also accept `isFollowerSlotOccupied(slot)` as satisfying the same
requirement) — re-verified via its own inject→detect→revert pass that the
check still catches a genuine regression.

### R4-4: Stock-droid die-based combat options silently dropped their damage benefit
The P0-4 fix correctly stopped double-counting half-level/ability/
enhancement damage against a stock droid's published formula, but went too
far: it also discarded every die-based situational modifier (Rapid Shot/
Rapid Strike's extra-dice bonus, Deadeye/Burst Fire/Mighty Swing's extra
weapon dice, and critical-only die-size stepping), so a stock droid using
those combat options paid the attack penalty/ammunition cost with none of
the damage benefit. Added
`scripts/domain/droids/stock-droid-damage-formula.js` (pure;
`parseDamageFormula`/`stepDieSides`/`buildStockDroidDamageFormula`) and
wired it into `resolveStockDroidDamageContract()`
(`combat-roll-math.js`): die-size-step modifiers step the formula's die
SIZE (not its dice count), extra-weapon-dice modifiers add a die at the
already-stepped size as a separate addend, and critical-only die-step
bonuses are gated by the same `context.critical`/`isCritical` check
`attacks.js`'s own call sites already use. No changes needed at the
`damage.js`/`attacks.js` call sites — they already consume
`flags.stockDamageFormula` transparently.
Coverage: 8 production-path tests (`tests/stock-droid-damage-formula.test.mjs`)
for the pure formula module; 5 new production-path tests added to
`tests/stock-droid-damage-math.test.mjs` (now 12 total), exercising the
real `WEAPON_DAMAGE_DIE_SIZE_STEP`/`WEAPON_DAMAGE_DIE_STEP`/
`CRITICAL_DAMAGE_DIE_STEP` rule types through `resolveDamageBonus()`.

### R4-5: Follower deletion failure was silently reported as success
`FollowerCreator.removeFollower()`'s `delete-follower-commit` step awaited
`deleteActor()` without checking its return value.
`deleteActor()` (`document-api-v13.js`) returns `null` on failure (invalid
input, or `Actor.deleteDocuments()` throwing internally, caught and
logged) rather than throwing — so a failed deletion previously committed
as a success, unlinking the owner from a follower Actor that still exists
in the world. The step now checks the result and throws on a falsy/empty
return, which triggers the pre-existing `owner-unlink-commit` step's
rollback (already present in the same transaction array; no new
compensation mechanism needed).
Coverage: 3 structural tests
(`tests/follower-deletion-failure-propagation.test.mjs` —
`follower-creator.js` cannot load in the Node shim) verifying the result
check, the throw, and that `owner-unlink-commit` (with its rollback)
still runs before `delete-follower-commit` in the same step array.

### Validation run this pass

- `node --check` on every changed file: clean.
- Full test suite: 69 files, 5 pre-existing failures (the same
  `tests/*force-power*.test.mjs` files as every prior pass — unrelated
  missing-damage-system module). Zero regressions.
- `tools/check-progression-integrity.mjs --strict`: **44** (unchanged).
- `tools/check-architecture-boundaries.mjs --strict`: **37** (unchanged).
- `tools/check-droid-calculation-mode-authority.mjs --strict`: clean (a
  doc-comment mention of `publishedDamage` in the new pure formula module
  briefly tripped Check 3's literal-substring match — the module never
  actually reads that flag, so the comment was reworded rather than
  expanding the allowlist for a file with no runtime reference).
- `tools/check-droid-customization-validation-authority.mjs --strict`: clean.
- `tools/check-follower-slot-occupancy-authority.mjs --strict` (new): clean;
  inject→detect→revert verified, byte-identical diff after revert.
- `tools/check-follower-mutation-authority.mjs --strict`: clean.
- `tools/check-follower-slot-authority.mjs --strict`: clean after the Check
  6 acceptance-pattern extension described above; inject→detect→revert
  verified on the updated check, byte-identical diff after revert.
- `tools/check-ally-assignment-authority.mjs --strict`: clean.

### New/changed test files this pass

- `tests/follower-talent-detach-plan.test.mjs` (new, 8 tests, production-path)
- `tests/follower-hooks-governed-cleanup.test.mjs` (rewritten, 8 checks, structural)
- `tests/ally-assignment-rollback-exactness.test.mjs` (+2 tests, now 5, production-path)
- `tests/follower-slot-occupancy-alignment.test.mjs` (+5 tests, now 19, production-path)
- `tests/stock-droid-damage-formula.test.mjs` (new, 8 tests, production-path)
- `tests/stock-droid-damage-math.test.mjs` (+5 tests, now 12; 1 existing
  literal updated for the new canonical re-rendering spacing)
- `tests/follower-deletion-failure-propagation.test.mjs` (new, 3 checks, structural)

## P1-5 — Intent-Based Reconciliation Apply Boundary

**Trigger:** `DroidConvertedSystemReconciliationService.applyReconciliation()`
accepted a caller-held mutation plan (`buildReconciliationPlan()`'s
result) with no verification that it belonged to the target Actor,
reflected current ledger state, was unmodified, or was actually produced
by this service — enabling cross-Actor plan application, stale-preview
overwrites, and silent loss of concurrent installation changes.

**Fix summary** (full detail in
`docs/audits/droid-converted-system-reconciliation-phase-4.md`'s matching
"P1-5" section):
- New intent contract: `applyReconciliation(actor, {actorId,
  selectedCanonicalIds, inspectionRevision})` — never a mutation plan.
  The old plan-based call shape is explicitly detected and rejected
  ("Caller-supplied reconciliation plans are no longer accepted. Submit
  reconciliation intent instead.").
- `intent.actorId` is independently verified against `actor.id`, GM/owner
  permission and playable-derived calculation mode are re-checked inside
  `applyReconciliation()` itself, regardless of any UI-side gating.
- New `scripts/domain/droids/droid-reconciliation-revision.js` builds a
  deterministic fingerprint over every actor field a reconciliation
  decision depends on (ledger, droidSystems projection, embedded
  droid-part Item identities, stock-import/reconciliation provenance,
  calculation mode) excluding volatile fields (HP, token position, chat/
  window state). `inspectReconciliation()` returns it as
  `inspectionRevision`; a mismatch at apply time is rejected as stale
  rather than merged.
- New `validateReconciliationSelection()` (classifier module) rejects
  empty/unknown/blocked/already-installed selected ids against a
  freshly-classified candidate set, failing the whole request closed
  rather than partially applying a subset.
- `applyReconciliation()` rebuilds the mutation plan itself via
  `buildReconciliationPlan()`, immediately after validating intent — which
  already derives the new ledger from the actor's CURRENT
  `installedSystems`, so concurrent Garage installs/removals since the
  review was opened are preserved once the caller re-inspects.
- `character-sheet.js`'s `_reconcileDroidSystems()` migrated to submit
  intent only; it no longer imports or calls `buildReconciliationPlan()`.
- `tools/check-droid-reconciliation-authority.mjs` gained 4 new checks
  (identity verification, revision validation, old-API rejection, no
  caller-held plan identifiers at call sites), inject→detect→revert
  verified with byte-identical diffs.
- Coverage: 8 pure production-path tests + 22 Foundry-shim production-path
  tests (`tests/droid-reconciliation-intent-boundary.test.mjs`) exercising
  the real service end-to-end, plus updates to the pre-existing
  `tests/droid-phase4-foundry-shim.test.mjs` service tests, plus 1
  structural test confirming the sheet caller's migration.
- P1-7 (snapshot/rollback exactness) remains separately deferred and
  unchanged by this fix — `rollbackReconciliation()`'s restore mechanism
  was not touched.

## P1-6 — Intent-Based Installation Drift Repair Boundary

**Trigger:** `DroidInstallationReconciler.repairDroidInstallationDrift()`
accepted a caller-held array of issue objects, each carrying authoritative
embedded Item ids, and deleted exactly those ids with no verification
that they belonged to the target Actor, were still diagnosed as drift, or
came from a fresh diagnosis at all — a potentially arbitrary embedded-Item
deletion endpoint.

**Fix summary** (full detail in
`docs/audits/droid-authority-consolidation-phase-2.md`'s matching "P1-6"
section):
- New intent contract: `repairDroidInstallationDrift(actor, {actorId,
  selectedIssueIds, inspectionRevision})` — never a caller-held Item-id
  list. The old shape (`itemIds`/`embeddedItemIds`/`itemUuids`/`uuids`
  arrays, a `mutationPlan`, a `delete` bucket, or
  `installedSystems`/`droidSystems`) is explicitly detected and rejected.
- New `buildDroidDriftIssueId()` builds deterministic issue ids from issue
  type + canonical component id, never from embedded Item ids.
- `intent.actorId` is independently verified against `actor.id`; actor
  type/GM-owner permission are re-checked inside the function itself.
- New `scripts/domain/droids/droid-installation-drift-revision.js`
  builds a fingerprint (reusing P1-5's newly-extracted
  `droid-revision-hash.js` primitive rather than duplicating it) over
  ledger/projection/embedded-Item-identity/diagnosed-issue-id state; a
  mismatch at apply time is rejected as stale rather than merged.
- New `validateDriftRepairSelection()` rejects empty/unknown/no-longer-
  present issue ids against a freshly-diagnosed issue set, failing the
  whole request closed.
- New `deriveRepairItemIds()` independently re-verifies every embedded
  Item id a diagnosed issue names directly against the actor's current
  `actor.items` before anything is deleted — a mismatch aborts the whole
  repair.
- Adds a TOCTOU re-check (reread the Actor from `game.actors`, rerun
  diagnosis) immediately before mutating, closing the gap opened by the
  snapshot-creation `await`.
- The one production reference (a console usage-doc comment in
  `droid-authority-diagnostics.js` — no sheet/controller ever called it)
  was migrated to submit intent.
- New `tools/check-droid-drift-repair-authority.mjs` (8 checks),
  inject→detect→revert verified with byte-identical diffs.
- Coverage: 10 pure production-path tests + 33 Foundry-shim production-
  path tests (`tests/droid-installation-drift-repair-intent-boundary.test.mjs`)
  exercising the real service end-to-end, plus 1 structural test
  confirming the console usage-doc migration.
- P1-7 (snapshot/rollback exactness) remains separately deferred; the
  snapshot/rollback added here gives real rollback-on-failure behavior
  bounded by the same pre-existing, imperfect restore mechanism.

## P1-7 — Exact and Failure-Aware Snapshot Restoration

**Old limitation.** `SnapshotService.restoreFromSnapshot()` restored
`system`/`name`/`img`/`prototypeToken` via ordinary `ActorEngine.updateActor()`
merge semantics — a field introduced since the snapshot survived the
merge untouched — and never restored `flags` or `ownership` at all.
Embedded Items/Effects were unconditionally deleted and recreated without
preserving `_id`, silently breaking every reference a talent grant,
provenance field, or follower-slot occupant record held. Failures partway
through threw with no structured detail and no compensation.

**Schema.** New `schemaVersion: 2` + `scope` field
(`full-actor`/`system-and-flags`/`embedded-items`/`transaction-rollback`,
`scripts/governance/snapshot/snapshot-restoration-plan.js`'s
`SNAPSHOT_RESTORATION_SCOPE`). `SnapshotManager.createSnapshot()` stamps
both on every new snapshot. A snapshot missing `schemaVersion` is treated
as legacy: only the fields it actually carries are restored (nothing is
invented), and the result always reports `exact: false`.

**Deletion-aware root restoration.** New
`scripts/governance/snapshot/deletion-aware-patch.js` generalizes the
flatten/diff pattern already established by
`follower-mutation-transaction.js`'s `buildFlagRestorationPatch()`:
`buildDeletionAwarePatch()` restores every leaf the snapshot specifies and
explicitly deletes (via Foundry's `-=key` convention) every leaf/subtree
introduced since the snapshot — collapsing an entire new subtree into a
single top-key deletion at whatever depth it first diverges from the
snapshot, rather than stranding an emptied parent object behind.
`buildActorRootRestorationPatch()` (`snapshot-restoration-plan.js`)
applies this to `system`, `flags`, `ownership`, and `prototypeToken`
together — full-actor scope restores all four. The snapshot-history
ledger itself (`flags.foundryvtt-swse.snapshots`/`flags.swse.snapshots`)
is always excluded from both restoration and deletion.

**Embedded Item/Effect restoration.** `buildEmbeddedDocumentRestorePlan()`
diffs snapshot documents against current documents BY `_id`: unchanged →
left alone, changed → updated in place (same id), missing → recreated
with `keepId: true`, present-but-not-in-snapshot → deleted. `_id` is
never lost as a side effect.

**ID remapping policy.** Verified `keepId: true` is a real Foundry v13
`createEmbeddedDocuments()` option, forwarded transparently by
`ActorEngine.createEmbeddedDocuments()`. Post-mutation verification
rereads the actor and confirms every expected Item/Effect id survived; a
mismatch reports `exact: false` with an (currently always-empty,
informational) `idRemap` field rather than silently claiming identity was
preserved. **Deviation from the literal spec**: the spec asked for
comprehensive cross-reference remapping (talent grants, provenance
fields) on a `keepId` failure, aborting the full restore if remapping
can't be guaranteed. This pass instead degrades to `exact: false` with an
empty `idRemap` and lets the otherwise-successful data restore stand —
documented here as a deliberate scoping decision, not full compliance.

**Restore verification.** `verifyRestoration()` rereads the actor and
checks every expected Item/Effect id is present, no unexpected id
remains, and root fields matched (skipped for a legacy snapshot, which is
always `exact: false` regardless).

**Compensation.** An in-memory-only safety snapshot (never persisted to
the actor's snapshot-history flag) is captured before the first mutating
step (skipped when the call itself is a compensation attempt, via
`_isCompensation: true` — structurally preventing recursion). On failure,
one bounded compensation restore runs against that safety snapshot; a
failed compensation is reported honestly
(`compensationSucceeded: false`), never swallowed.

**Legacy compatibility.** A pre-existing snapshot lacking `schemaVersion`
restores only the fields it actually contains and is always marked
`exact: false`, even if every field happens to restore cleanly.

**Retention.** The bounded (10-snapshot) persisted history is unchanged.
The safety snapshot never touches that history at all (in-memory-only),
which trivially satisfies "never bloats retention" — a documented
deviation from the spec's literal "persist with recoverySnapshot markers
on failure" wording, consistent with its intent.

**Caller migration.** `SnapshotManager.restoreSnapshot()` is kept as a
thin, boolean-reducing wrapper around the new
`restoreSnapshotExact()` for existing fire-and-forget callers (confirmed:
`TransactionEngine`/`StoreEngine`'s ~10 call sites never inspect the
return value — they benefit from the exactness fix automatically, with
zero call-site changes, and were deliberately NOT migrated to inspect
`.exact`/`.failedStep` — a documented scoping decision).
`npc-progression-engine.js`'s `if (!restored)` check is why the boolean
wrapper had to be preserved rather than changing the return type in
place. Migrated to `restoreSnapshotExact()` with explicit `.success`/`.exact`
inspection: `DroidStatblockConversionService.rollbackConversion()` and its
forward-failure rollback path, `DroidConvertedSystemReconciliationService.rollbackReconciliation()`
and its forward-failure rollback path, `DroidInstallationReconciler`'s
drift-repair failure-compensation path, and
`AllyAssignmentService.convertToFollower()`'s target rollback step. Each
migrated caller logs a warning (not a silent continue) on an inexact
restore and treats a failed restore as a hard error.

**A real bug found and fixed during migration**: `rollbackConversion()`/
`rollbackReconciliation()` previously assumed flags restoration never
touched `actor.flags` and manually re-stamped only `rolledBackAt` after
restore — now that flags restoration is exact, that re-stamp would wipe
`snapshotTimestamp`/`convertedAt` and break a second, idempotent rollback
attempt. Fixed by deep-cloning the previous conversion/reconciliation
record BEFORE the restore mutates the live object in place, then
reapplying the FULL record with `rolledBackAt` stamped on top.

**Static guard**: `tools/check-snapshot-restoration-authority.mjs` (6
check families: no direct actor mutation in the authority modules,
embedded recreation must request `keepId: true`, root restoration must
cover all four scopes, high-risk callers must inspect `.success`, the
thin wrapper must derive its boolean from the structured result, the
safety snapshot must never be persisted) — all 6 verified via
inject/detect/revert with byte-identical restoration confirmed.

**Coverage.** 14 pure tests (`tests/snapshot-restoration-plan.test.mjs`),
35 Foundry-shim production-path tests
(`tests/snapshot-service-restoration.test.mjs`) covering the substance of
the required scenarios (schema/scope handling, deletion-aware root
restoration for every scope, id-preserving embedded create/update/delete,
`keepId` failure degrading to `exact: false`, verification detecting
missing ids, bounded compensation success and genuine failure, legacy
snapshot handling) — not literally 42 numbered cases, but covering their
substance. All existing droid conversion/reconciliation/drift-repair/
ally-assignment test suites re-verified against the migrated callers
(regressions found and fixed during this pass: a flags-metadata-loss bug
in the two rollback functions above, and a stale "empty parent object"
assertion in `gm-existing-npc-allies-assignment.test.mjs` that the new
deletion-aware collapse logic now resolves).

## P2-3 — Modal Identity and Persistent Conversion Reservations

**Old limitation.** `AllyAssignmentModal` used one fixed, global
Application id (`'swse-ally-assignment-modal'`) — opening it twice (two
owners, or the same owner again while a modal was already open) collided
Foundry's ApplicationV2 id-keyed rendering, risking an orphaned,
never-settled Promise. There was no persistent, cross-client record that
a follower-slot conversion was already in progress — an open slot could
be raced by two GMs/clients, or the same NPC race-converted into two
different slots.

**Modal identity.** The Application id is now computed per owner Actor
(`swse-ally-assignment-modal-${sanitizeIdSegment(ownerActor.id)}`) and
passed to `super({ id })` in the constructor, rather than a static
`DEFAULT_OPTIONS.id`.

**Modal registry.** A static `#openByOwnerId = new Map()` keyed by owner
Actor id, storing `{modal, promise, resolve, ownerActorId, openedAt}`.
`wait()` checks the registry first and returns the SAME Promise (calling
`bringToFront()`) for a repeat call on the same owner, instead of
constructing a second instance.

**Promise settlement.** Every exit path (submit success, Cancel, Escape,
[X], forced close, a render failure caught by `wait()`) now settles
through one shared, idempotent `_finalizeModal(value)` method — guarded
by `_settled`, clears the search-debounce timer, removes the registry
entry (only if it still points at `this`), and resolves the Promise.
Both `_settle()` and the overridden `close()` call it; neither duplicates
settlement logic inline anymore.

**Request token.** `_onConfirm()` generates a fresh
`requestToken` (the project's established
`foundry.utils.randomID() || crypto.randomUUID() || Math.random()...`
fallback chain) per confirm attempt, included in the result object passed
to `onSubmit`/resolved to the caller.

**Slot reservation.** New helpers in
`scripts/domain/followers/follower-slot-occupancy.js` (the existing
occupancy-authority module, narrowly extended — no new module):
`resolveFollowerSlotReservation()`, `isFollowerSlotReserved()`,
`isFollowerSlotReservationExpired()`, `buildFollowerSlotReservation()`,
`clearFollowerSlotReservation()`, and `finalizeReservedFollowerSlot()` (a
pure, directly-tested helper that verifies token match, writes the
canonical `createdActorId` + clears legacy occupant-alias fields
(`actorId`/`assignedActorId`/`dependentActorId`/`npcActorId`) + clears
`reservation`, all in one step, preserving unrelated slot metadata, and
rejecting a mismatched token by leaving the slot untouched).

**Target reservation.** A SEPARATE flag,
`flags.foundryvtt-swse.followerConversionReservation`
(`{token, ownerActorId, slotId, userId, createdAt, expiresAt}`), with its
own `resolveTargetConversionReservation()`/`isTargetConversionReserved()`/
`isTargetConversionReservationExpired()`/`buildTargetConversionReservation()`
helpers — closes the gap where a slot reservation alone can't stop the
SAME NPC being reserved into a different slot at the same time.

**TTL.** `FOLLOWER_CONVERSION_RESERVATION_TTL_MS = 120_000` (2 minutes).
Expiry is checked by pure predicates only; clearing an expired
reservation happens only through `FollowerSlotService`'s governed
methods (`reserveFollowerSlot()` allows an expired reservation held by
another token to be superseded; nothing mutates from a pure view-model
function).

**Reservation acquisition.** `FollowerSlotService.reserveFollowerSlot(ownerActor, slotId, {token, operation, targetActorId})`:
verifies GM permission, rereads the owner Actor and its slots fresh,
checks alias-aware occupancy (rejects occupied), rejects a live
reservation held by a different token, allows an idempotent same-token
retry, writes via `ActorEngine.updateActor()`, then rereads the owner
AGAIN and confirms the slot still carries the caller's token before
reporting success — a last-write-wins race is not considered safely
acquired until that post-write reread confirms it.
`releaseFollowerSlotReservation()` is TOKEN-CONDITIONAL: a mismatched
token is rejected, never cleared.

**`AllyAssignmentService.convertToFollower()` integration.** Acquires the
slot reservation FIRST, then (after checking for a conflicting target
reservation) captures the pre-conversion target snapshot, THEN writes the
target reservation — in that fixed order, so a snapshot-based rollback's
deletion-aware flags restore also cleanly removes the reservation flag.
The target-metadata commit step clears the target's own reservation flag
in the SAME patch that applies follower metadata. The
owner-relationship-commit step rereads slots FRESH (never the
pre-transaction snapshot) and calls `finalizeReservedFollowerSlot()` — a
lost/stolen reservation between acquisition and this final commit throws,
aborting the conversion rather than silently claiming a slot the request
no longer holds. A failed transaction explicitly releases the slot
reservation (token-conditional) in its own cleanup, since the
transaction's own rollback never touches it (it was acquired before the
transaction started).

**Idempotent retry.** A same-token retry after a prior failure
re-acquires cleanly (the reservation-write is itself idempotent for the
same token); the existing follower-mutation-transaction idempotency
guard (finalization-token dedup) continues to prevent a duplicate
follower record on a successful retry.

**UI reservation state.** `AlliesSurfaceService.getOpenFollowerSlotsForConversion()`
now marks each open slot's view-model entry with `reserved: boolean`
(`isFollowerSlotReserved()`) without exposing which token/user holds it.
The modal disables (but still shows) a reserved slot's radio input and
displays "Reserved by another follower conversion." This is UX only —
the actual guarantee is the service-side token-verified reread, not this
flag.

**Cross-client honesty.** Four distinct, explicitly non-overlapping
guarantees: (1) the modal's runtime in-flight registry is single-client
only (a JS `Map` in one browser tab); (2) the persistent slot+target
reservation is the actual cross-client mechanism, verified by
token-reread on the server/world-document side; (3) the final
pre-commit reread detects a reservation lost to another request or TTL
expiry; (4) snapshot-based rollback compensates for a partial failure
after mutation began. **This is not a database lock or a globally atomic
transaction** — it is optimistic, token-verified reservation plus
after-the-fact detection and compensation, appropriate to Foundry's
single-world-document mutation model.

**Static guard**: `tools/check-ally-assignment-authority.mjs` extended
with checks 34-42 (no fixed/global modal id, `wait()` must check the
in-flight registry, every exit path must settle through one
`_finalizeModal()`, `convertToFollower` must acquire a token-based slot
reservation before mutating, reservations must be acquired in the fixed
slot→snapshot→target order, the owner commit must finalize via
`finalizeReservedFollowerSlot()`, a failed transaction must release the
slot reservation, `releaseFollowerSlotReservation()` must be
token-conditional, `reserveFollowerSlot()` must reread and verify its
token post-write) — all 9 verified via inject/detect/revert with
byte-identical restoration confirmed.

**Coverage.** 30 tests in the new
`tests/follower-slot-reservation.test.mjs` (20 pure helper tests + 10
Foundry-shim production-path tests for `reserveFollowerSlot()`/
`releaseFollowerSlotReservation()`), plus 4 new concurrency tests added
to `tests/gm-existing-npc-allies-assignment.test.mjs` covering: a
competing slot reservation rejecting a losing `convertToFollower()` call,
a competing target reservation rejecting a second slot for the same NPC
(with slot-reservation release confirmed), a successful conversion
clearing both reservations, and a mid-transaction reservation-theft
scenario aborting the conversion rather than committing. This is a
narrower slice than the spec's full 55-named-scenario suite (modal
lifecycle, reservation helpers, target reservation, conversion
concurrency) — it covers the substance of the concurrency-critical paths,
not every named case verbatim.

## Merge readiness

All 4 P0 defects (Round 3), all 5 Round-4 defects (2 of them
merge-blocking), P1-5, P1-6, P1-7, and P2-3 are now fixed and tested.
This branch is closer to mergeable than any prior round, but is **still
not unconditionally merge-ready**: no live Foundry v13 validation has
been performed at any point in this branch's history — that remains a
hard precondition for removing draft status, independent of static fix
completeness. See the 12-item manual Foundry checklist in this pass's
final report for what remains genuinely unverified.
