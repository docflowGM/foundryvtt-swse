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
| P1-5 | Reconciliation apply trusts caller-supplied plan with no cross-Actor/staleness check | **Not fixed this pass** — deferred, see Remaining Limitations. |
| P1-6 | Drift repair trusts caller-supplied embedded Item ids (arbitrary-deletion risk) | **Not fixed this pass** — deferred, see Remaining Limitations. |
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

## Merge readiness

All 4 P0 defects (Round 3) and all 5 Round-4 defects (2 of them
merge-blocking) are fixed and tested. This branch is closer to mergeable
than either prior round, but is **still not unconditionally merge-ready**:
P1-5, P1-6, P1-7, and P2-3 remain open, and no live Foundry v13 validation
has been performed at any point in this branch's history — that remains a
hard precondition for removing draft status, independent of static fix
completeness.
