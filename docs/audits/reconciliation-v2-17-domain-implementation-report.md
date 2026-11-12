# Reconciliation V2 — 17-Domain Implementation Report (cumulative)

Branch `claude/clever-shannon-pwf22k-17domain`, stacked on PR #1145 (`44cc3c7`). PR #1145 itself is not modified by this workstream.

## Phase 0 — baseline and authority audit — COMPLETE (documentation only)
- Deliverable: `docs/audits/reconciliation-v2-17-domain-authority-matrix.md`. No implementation code changed.
- Remote state verified: PR #1145 head `44cc3c7` (HP-F1..F4 complete, no other commits).
- Headline findings (details in the matrix): derived statistics are prepared in memory, so recomputing them is tautological (F-1); a second
  BAB / class-defense implementation lives in the reconciler (F-2); reconciliation is synchronous while the canonical calculators are
  asynchronous (F-3); persisted `system.defenses.*` are player-editable overrides, a likely false-positive source (F-4); species
  "reconciliation" is a write-time planner (F-5); two possible modification-slot authorities (F-6).
- Foundry V13 acceptance: not performed for any domain.

## Phase 1 — character mathematics — PARTIAL BY DESIGN (adapter contract + Force Point maximum)

**Implemented**
- `reconciliation/domain-adapters.js`: pure, read-only adapter contract with the status vocabulary
  `VALID | CONFIRMED_DISCREPANCY | UNVERIFIABLE | NOT_APPLICABLE | AUTHORITY_CONFLICT`, `runDomainAdapters` (a throwing adapter becomes
  `UNVERIFIABLE`/`adapter-error`, never a thrown report or a character error), and a mapping onto the existing derived-stat row so
  findings, Ignore, the four-column overlay and the memo need no new surface. Only `CONFIRMED_DISCREPANCY` sets `needsAttention`.
- Domain 12 adapter `forcePointMaxAdapter`: persisted `system.forcePoints.max` vs `calculateMaxForcePointsForBuildPlan` (the formula the
  progression economy builder already writes), using the canonical class-level reader for level and classes. Current Force Points are
  never compared. NOT_APPLICABLE for npc / droid / vehicle. UNVERIFIABLE when class evidence is incomplete or conflicting, the stored level
  disagrees with the class record, any class lacks a definition, or the persisted maximum is unreadable.
- Finding `FORCE_POINT_MAX_MISMATCH` (`derived:force-points-max:<expected>:<actual>`), ignorable. Resolve `set-force-point-max` writes the
  adapter's verified value through `ActorEngine.updateActor` (injected dep), is verified by subject, idempotent (second click is
  `already-resolved`), and reports `unchanged` honestly.
- Tests: `tests/reconciliation-domain-adapters.test.mjs` (14 groups; real reconciler and class data; includes a read-only proof, adapter
  isolation, Resolve idempotence, Ignore persistence and re-identification when the discrepancy changes).

**Behavior to be aware of:** a character whose persisted `system.forcePoints.max` is the template default `0` (for example a manually
built character that never ran progression) now gets a Force Point finding (expected 5 + floor(level/2) + feat bonuses). It is ignorable and
resolvable. `system.forcePoints.max` is also a player-editable header field, so a deliberate GM override will appear until ignored (D-2).

**Authority conflict recorded:** `calculateMaxForcePoints(actor)` is documented as "the ONLY authoritative way to determine FP" but its helper
`getForcePointBase` calls `actor.setFlag(...)` while computing, so a calculator mutates actor flags. Reconciliation therefore uses the
read-only `calculateMaxForcePointsForBuildPlan` (same module, same formula). The two should be consolidated by the owners of that module; no
change made here.

**Deliberately NOT implemented in Phase 1 (decisions needed — none are rules decisions)**
- **D-1 Derived mathematics** (defenses, initiative, grapple, damage threshold, ability modifiers, skill totals): these are prepared in
  memory by `DerivedCalculator` (F-1), so recomputing them is tautological, and the command forbids a parallel calculation. The only
  non-tautological check is `system.derived.meta.appliedSignature` vs `DerivedCalculator.getActorComputeSignature(actor)`, but the async derived
  pass leaves a transient mismatch after every edit, and the reconciliation memo is keyed on `_stats.modifiedTime` only, so a freshness
  verdict would either flash false errors or be cached stale. Options: (a) accept no verification for prepared values; (b) design the
  sync/async seam (F-3) with a settle window and signature in the memo key. Not chosen unilaterally.
- **D-2 Player-editable persisted values** (`system.defenses.*.classBonus` / `.misc.user.extra`, `system.forcePoints.max`): treat a mismatch
  as a confirmed discrepancy (current FP behavior, relies on Ignore) or as informational? Existing class-defense rows already read
  `system.defenses.<d>.classBonus` and may flag a deliberate override.
- **D-3 Sync/async seam** for authorities that are only asynchronous (F-3).
- **F-2 consolidation** (route BAB / class-defense expectation through `BABCalculator` / `DefenseCalculator`) depends on D-3 and is not done.

**Verification:** Node harness only. Foundry V13: not performed (live `prepareDerivedData`, sheet `!`, Resolve through the real
`ActorEngine.updateActor`, and the `force-points-update` guard key are untested at runtime).

## Phase 1 corrections — owner decisions D-1, D-2, D-3 (P1-F1 … P1-F5)

**Decisions applied.** D-1 (no duplicate arithmetic; verify inputs and calculation freshness; freshness is diagnostic), D-2 (editable
values may be deliberate; only a proven inconsistency is a player-facing discrepancy), D-3 (asynchronous enrichment around the unchanged
synchronous report).

**P1-F1 Force Point classification** (`domain-adapters.js`). A differing persisted `system.forcePoints.max` is classified by evidence:
- `authorized-override` (VALID): `flags.swse.overrides.forcePointsMax` with `authority: 'gm'` whose `value` equals the stored value. Written
  only when a GM edits the maximum in the sheet resource editor (same ActorEngine update); never invented for existing data; no migration.
- `formula-managed-value-stale` (CONFIRMED_DISCREPANCY, the only error case): progression's own `system.progression.lastForcePointRefresh.newMax`
  equals the stored value (untouched since progression wrote it) and the canonical formula now disagrees.
- `uninitialized` (stored 0, no progression record) and `unknown-provenance` (anything else): informational, never a `!`. They carry an
  **optional** action (`optional:force-points-max`) shown in a separate "Optional (not an error)" overlay section; it cannot be ignored and
  does not count toward the header indicator.

**P1-F2 Safe Resolve.** The resolver re-derives the finding from a fresh report immediately before writing, requires the canonical value to
equal the displayed one, requires the actor modification stamp to be unchanged since the action began, and the sheet writer additionally
re-checks the previous stored value (`STALE_VALUE`). Any mismatch returns `stale` and writes nothing. The write goes through
`ActorEngine.updateActor` and also records `lastForcePointRefresh`, so the value stays formula-managed.

**P1-F3 Force Point authority.** The Phase 0 matrix wrongly described `calculateMaxForcePoints` as pure; corrected. Convergence on one
pure rules function with separately authorized flag persistence is **planned, not done** (a change to that module's owners' code).

**P1-F4 BAB / class-defense duplication.** Not retired: replacing the reconciler's own expectation arithmetic needs the canonical calculators
to be consumed through the new async seam and a proof that the two agree, which has not been established. Done under D-2: the class-defense and BAB
rows now read **only the prepared `system.derived.*` values**; persisted editable `system.defenses.*` overrides and the legacy `system.bab` /
`baseAttackBonus` / `hitPoints` fallbacks are no longer read, so a deliberate override cannot be reported as a build error.

**P1-F5 / D-3 Derived lifecycle and enrichment.**
- `reconciliation/derived-lifecycle.js` reads the **existing** derived-generation authority (`getDerivedAppliedSignature`,
  `getDerivedGeneration`) against `DerivedCalculator.getActorComputeSignature`. States: `current | pending | unavailable`.
- Prepared-value rows (BAB, class defenses) are `unverifiable` ("Calculation pending") unless the lifecycle is `current`; never an error. The
  reconciliation memo key now includes the lifecycle, so a derived pass that lands without any actor update is not hidden by a cached report.
- `derived-generation.js` gains `announceDerivedApplied` (a `swseDerivedApplied` hook event) called from both derived write paths
  (`SWSEV2BaseActor._computeDerivedAsync`, including the unchanged pass, and `ActorEngine._applyDerivedUpdates`). It is the completion signal;
  there are no timers.
- `reconciliation/async-enrichment.js`: captures a revision (actor stamp, feat/talent house-rule signature, derived source signature); runs
  asynchronous adapters only when the lifecycle is `current`; discards a result if the revision changed while evaluating; **re-validates at read
  time**; merges only an applicable result into a cloned report (never the synchronous memo); refreshes open sheets only when it changes what is
  shown; never mutates the actor. The shipped asynchronous adapter (`derivedPreparationAdapter`) is a diagnostic and cannot produce a finding.
- Known limit: the revision does not include non-feat/talent house rules (for example HP rules) — those do not feed any asynchronous adapter today.

**Tests.** `tests/reconciliation-domain-adapters.test.mjs` (25 groups) covers: initialized, uninitialized, override, unknown provenance,
prestige/feat bonuses, stale Resolve (revision, changed canonical value, changed stored value), optional action, Ignore stability, derived
pending/applied/reset/reapplied, memo (verified to fail when the lifecycle is removed from the key), results arriving after a newer update,
read-time revalidation, a house-rule change while pending, non-mutation, and no false `!` during preparation. Existing reconciliation tests were
updated to represent a settled derived pass (`tests/helpers/derived-lifecycle-fixture.mjs`) where they assert prepared-value discrepancies.
Node harness only; Foundry V13 not performed.

## Phase 2 — species, skills, character eligibility — COMPLETE (narrow, evidence-bound)
Implemented: Domain 1 `speciesGrantIntegrityAdapter` (informational only). Evidence used: the species apply step's manifest
(`flags.swse.speciesGrantManifest.grantKey`) and the grant key stamped on species-granted items. Items stamped with a different grant key
produce an informational note in the review overlay; a missing manifest (normal for manual builds) is silent. It can never produce a finding.
Not implemented (reasons recorded):
- Racial ability adjustments / movement / languages vs the species ledger: the ledger is async, compendium-backed and classifies trait text
  heuristically (`SpeciesGrantLedgerBuilder._classifyTrait`), and the persisted values are player-editable. No independent persisted evidence of the
  applied values exists (the manifest stores key kinds, not values). Left to a future owner decision on a species verification model.
- Domain 10 trained-skill entitlement: no canonical entitlement calculator; RECON-007.
- Domain 11 feat-derived Force power entitlement: RECON-006 (retroactivity / attribution).
- Domains 8/9 feat and talent prerequisites: historical acquisitions are intentionally not re-validated; RECON-001/002/005 remain open.
- Persistent resources other than Force Points (Second Wind, Destiny): no persisted-mirror evidence audited.
Tests: `tests/reconciliation-phase2-species.test.mjs`.

## Phase 3 — equipment and combat — COMPLETE (narrow, evidence-bound)
Implemented: Domain 13 `carriedWeightEvidenceAdapter` (informational only) using the canonical `EncumbranceEngine.carriedWeightReport`.
Items without a verified recorded weight contribute 0 to the load, so the load may be understated; this is reported as uncertainty in the
review overlay and is never a load finding. The load category itself is prepared data and is not re-derived (D-1).
Not implemented (reasons recorded):
- **Armor effects / proficiency (Domain 15/6):** `resolveArmorUsageEffects` is a calculation of prepared effects, not an integrity validator; wearing armor without
  proficiency is a rules penalty, not a build discrepancy. No persisted mirror exists to compare. No "multiple equipped armor" rule was established.
- **Modification slots (Domain 15):** `resolveSlotState` only reports certified totals when every occupant has a certified cost; certification is supplied by the
  Modification V2 catalog/planner and is gated by open register entries (D-005 development tier). Without the catalog lookup every state is `unresolved`, and
  certification is explicitly not character correctness, so no verdict is produced. Two slot authorities coexist (`modification-slot-authority.js` and `UpgradeSlotEngine`);
  consolidation is an owner task.
- **Combat statistics (Domain 14):** initiative, grapple, attack and damage values are prepared by `DerivedCalculator` / `combat-roll-math.js` (D-1); contextual rolls are
  excluded by the command. Persisted weapon inputs have no independent authority audited in this pass.
- **Damage threshold / DR / shields (Domain 7):** threshold is prepared; persisted shield and DR sources were not audited.
Tests: `tests/reconciliation-phase3-equipment.test.mjs`.

## Phase 4 — droid mechanics — COMPLETE (mode-aware, narrow)
Implemented: SUPERSEDED BY R17-F1 (see 'Review corrections'): the original adapter applied `DroidValidationEngine` to every finalized custom droid and false-flagged Store-built droids. Original description: Domain 16 `droidConstructionAdapter`. Mode comes from the existing `resolveDroidCalculationMode` / `isStockImportedDroid`:
- stock-statblock droids and stock droids converted to playable: NOT_APPLICABLE (their authority is the published statblock / the conversion service,
  not custom-construction requirements); the existing droid conversion / installation reconciliation services are untouched and are not merged in;
- custom droids whose `system.droidSystems.stateMode` is not `FINALIZED` (or with no build record): UNVERIFIABLE;
- a `FINALIZED` custom droid that fails `DroidValidationEngine.validateDroidConfiguration` (a required locomotion / appendage / processor / armor is
  missing): CONFIRMED_DISCREPANCY (`DROID_CONSTRUCTION_INCOMPLETE`), review-only (no resolve; components are never auto-installed or removed). Rationale:
  finalization is when the builder's own required-system check was satisfied.
Adapters now run independently of class establishment (a custom droid may carry no class item); each adapter decides applicability.
Not implemented: component prerequisites / capacity conflicts / droid-specific stat calculations (installation authority audited only by location), droid
HP/CON rules (covered by the HP work). Droid HP, droid CON=0 and droid Force Point applicability remain as established by their own domains.
Tests: `tests/reconciliation-phase4-droid.test.mjs`.

## Phase 5 — integration and certification

### Domain-by-domain status (implementation checkpoints - NOT mechanical certification; superseded where noted by 'Review corrections' below)
Legend: **IMPL** implemented, **OFFLINE** covered by Node-harness tests, **FOUNDRY** runtime-tested (none are), **DEFER** deferred with reason. A domain with no verdict
still emits nothing (Silent Success). "Evidence-bound" means only independent persisted evidence can produce a finding.

| # | Domain | What reconciliation now does | Status |
|---|---|---|---|
| 1 | Species and racial mechanics | Informational note when species-granted items belong to a different grant than the recorded manifest. No confirmed finding possible. | IMPL, OFFLINE, FOUNDRY no; ledger-based verification DEFER (heuristic async ledger, editable values) |
| 2 | Classes and levels | Class-level reader with conflict reporting (PR #1145). | IMPL, OFFLINE, FOUNDRY no; prestige eligibility DEFER |
| 3 | Ability scores | Ability-increase entitlements (existing). Mods/totals are prepared values (D-1). | partial; input-vs-record check DEFER (original scores unknowable) |
| 4 | Hit points | Ledger-based additive accounting; verdict only for unreflected recorded CON / feat / bonus contributions; Resolve disabled (PR #1145). | IMPL, OFFLINE, FOUNDRY no; HP-001 open |
| 5 | Base Attack Bonus | Class-only cross-check (derived BAB minus its stored adjustment) vs class-model expectation, INFORMATIONAL ONLY (never a finding) until the arithmetic is converged. | IMPL, OFFLINE; consolidation DEFER (D-6 #2) |
| 6 | Defenses | Class defense bonus vs prepared value, INFORMATIONAL ONLY; persisted editable overrides not read (D-2). Total defenses not re-derived (D-1). | partial |
| 7 | Damage threshold, DR, shields | Nothing: threshold is prepared; persisted shield / DR sources not audited. | DEFER |
| 8 | Feats | Slot/entitlement accounting, house-rule grants (existing). No historical prerequisite re-validation by design. | IMPL (existing); RECON-001/002/005 open |
| 9 | Talents | Slot/entitlement accounting (existing). | IMPL (existing); RECON-001/005 open |
| 10 | Skills | Nothing: no canonical trained-skill entitlement authority; totals prepared. | DEFER (RECON-007) |
| 11 | Force abilities | Class-derived Force choices (existing). Force Training: informational diagnostic that consumes the existing `FeatGrantEntitlementResolver` (possible unspent selections); no attribution or confirmation. | partial; attribution DEFER (RECON-006) |
| 12 | Force Points / resources | Force Point maximum: GM-documented override valid; every other difference is an OPTIONAL action (uninitialized / matches last progression write / unknown provenance), never a `!`; safe Resolve. Other resources not audited. | IMPL, OFFLINE, FOUNDRY no |
| 13 | Movement and encumbrance | Carried-weight evidence note (items without a recorded weight). Load category not re-derived. | IMPL, OFFLINE, FOUNDRY no; movement DEFER |
| 14 | Combat statistics | Nothing: prepared values; contextual rolls excluded. | DEFER |
| 15 | Equipment and modifications | Nothing: armor effects are a calculation, modification certification is gated by open register entries and is not character correctness. | DEFER |
| 16 | Droid mechanics | Provenance-aware: only a Store-built finalized droid is checked, against `quoteDroidBuild`; stock, converted and unknown-provenance droids are not confirmed. | IMPL, OFFLINE, FOUNDRY no |
| 17 | Progression integrity | Evidence model, certification, ownership classification, house-rule accounting, targeted routing (PR #1145). | IMPL, OFFLINE, FOUNDRY no |

### Integration properties (Node harness)
Silent Success across all domains for a legitimate manual build; manual and wizard-shaped builds produce identical findings; simultaneous discrepancies are
independent (distinct stable ids, independent Ignore, independent Resolve); one failing adapter never hides or corrupts others and never mutates the actor; the
reconciliation memo now also keys on carried-gear item stamps (an embedded gear edit does not bump the actor stamp); no timers anywhere in adapters or enrichment.

### Performance (measured, Node harness, 10 class levels, 62 items)
Cold reconcile ~4 ms; memo hit <1 ms. See `tests/reconciliation-phase5-integration.test.mjs` for the (deliberately loose) bounds.
**Deviation recorded for owner decision:** the command asks that damage / healing / resource spending not cause a full reconciliation. The memo is keyed on the actor
modification stamp, so an HP value change invalidates it once and the next sheet read recomputes (~4 ms). A field-relevance key would remove that, but an
exclusion/inclusion list that omits a field the pipeline reads would silently serve stale reports (fail-open), and the existing contract test pins the stamp rule.
Not changed without approval.

### Not verified at all (requires Foundry V13)
`prepareDerivedData` timing and the `swseDerivedApplied` event in a live session; sheet `!` / overlay rendering including the new Optional section; GM-only override
stamping from the resource editor; `ActorEngine.updateActor` guard behavior for `system.progression.lastForcePointRefresh` and `flags.swse.overrides.*`; two-client behavior;
compendium-backed class data; hook-driven refresh of open sheets.

### Full test sweep at the end of Phase 5 (all `tests/*.test.mjs`, Node harness, 170 s per-test limit)
Only five files fail: `force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`,
`phase6-force-direct-damage`. All five also fail at the PR #1145 merge base (`33ce3f7`; missing module `scripts/combat/damage-system.js`), so they are pre-existing and
unrelated; no force-power code was touched. `rolling-ci-support-check` (~109 s) passes. No newly introduced failures. Validators: partials, data, `system.json` pass.


## Review corrections R17-F1 … R17-F5 (independent review of 6230c74) and owner decisions D-4 … D-7

**Status distinction.** Phases 0-5 are *implementation checkpoints*. They are not *verified domain coverage*: most domains remain deferred, informational-only, or
unverified in Foundry. Nothing here certifies the 17-domain mechanical scope.

**Decisions recorded.** D-4 keep the actor-stamp memo key (no relevance key). D-5 no heuristic species verification; informational species integrity only; a future source-certified
applied-grant snapshot at the authorized mutation boundary is to be investigated (not done). D-6 consolidation order: Force Point pure calculation, BAB / class-defense convergence,
Force Training attribution, modification slots (none started; separate workstreams). D-7 HP-001 and RECON-001..007 remain open.

**R17-F1 - false droid finding (FIXED).** `quoteDroidBuild()` (the Store's own authority) requires locomotion, processor and appendage only; `buildCustomDroidActorData()` produces
`stateMode: 'FINALIZED'` with no armor, which `DroidValidationEngine` rejects. The adapter now: stock-statblock (explicit mode) and converted-stock droids (conversion
provenance flags) are NOT_APPLICABLE; an explicit `playable-derived` mode alone is NOT treated as a stock import; unfinalized builds and finalized builds of unknown provenance
are UNVERIFIABLE; a Store-built droid (`system.storeAcquisition.source` / `flags.swse.storeDroidConstruction`) is checked with `quoteDroidBuild` (OK => VALID; INCOMPLETE => review-only
finding; BLOCKED such as catalog drift => UNVERIFIABLE). `DroidValidationEngine` is no longer used by reconciliation. Regression uses the real `quoteDroidBuild` ->
`buildCustomDroidActorData` output (test 0 proves the old validator rejects it). Limitation: droids finalized through the Droid Builder (non-Store) have no provenance marker, so they
are UNVERIFIABLE.

**R17-F2 - BAB / class-defense false warnings (MITIGATED; convergence pending).** Verified: `BABCalculator.calculate` returns `class BAB + adjustment` and `DerivedCalculator` stores
`system.derived.babAdjustment`, so the reconciler's class-only expectation would flag any permanent BAB modifier; `BABCalculator._startupSafeBab` returns a provisional heroic BAB while
class data is loading, and a derived pass stamped in that window would read as "current". Class defense `classBonus` is the class-only value (modifiers are separate fields); the persisted
editable value is only a fallback inside `DefenseCalculator`. Changes: the BAB comparison removes the stored adjustment (and is silent when it is absent); BAB and class-defense differences
are INFORMATIONAL only (note, never `BAB_MISMATCH` / `DEFENSE_MISMATCH`); the `recalc` resolver kind now has no real producer (kept, exercised with a synthetic finding, candidate for
removal when the convergence workstream decides). Existing tests that used BAB as a finding vehicle were rewritten (ignore flows use slot findings). Open: whether a provisional startup value can
persist in `DerivedCalculator`'s compute cache after class data loads is not verified (Foundry-only).

**R17-F3 - Force Training authority (CORRECTED).** Earlier statements that no Force Training entitlement authority exists were wrong. `FeatGrantEntitlementResolver` computes
`max(1, 1 + configured ability modifier)` per instance, repeatable and dynamic (it follows the CURRENT modifier). RECON-006 now documents the precise gaps: attribution of owned
powers to a specific instance, repeated instances, whether a later modifier change is retroactive, and overlap with class-granted powers. A diagnostic reads the existing resolver (no second
formula) and only says that selections may be unspent when fewer Force powers are owned in total than the resolver currently opens. Note: both item type spellings `forcePower` and
`force-power` exist in the codebase.

**R17-F4 - Force Point evidence (REVISED).** `lastForcePointRefresh.newMax === system.forcePoints.max` is numerical agreement with an earlier progression write, not proof of
uninterrupted formula ownership (an edited-then-restored value is indistinguishable). The "formula-managed stale = confirmed" path was therefore REMOVED: the Force Point adapter can
no longer produce a finding. The cases stay distinct: documented GM override (VALID), matches last progression write, uninitialized (0), unknown provenance - the last three are optional
actions only. Resolve keeps its safeguards (fresh re-derivation, actor-revision check, previous-value check, ActorEngine write). Not verified in Foundry: GM/player permission behavior of the
write, and the `ActorEngine` guard behavior for the two new flag paths.

**R17-F5 - async / cache integration (VERIFIED in Node, real write paths).** `swseDerivedApplied` is announced by the real `SWSEV2BaseActor._computeDerivedAsync` (changed and unchanged
passes, and again after a destination reset) and by the real `ActorEngine._applyDerivedUpdates`; hook registration is idempotent; a request made while pending runs exactly once when the
derived pass lands; repeated sheet reads do not re-run or loop; a newer actor update discards an outdated result before and after settling. Remaining Foundry-only questions: the load order
that guarantees `async-enrichment.js` is imported (through the reconciler) before the first derived pass of interest, and real open-sheet refresh behavior.

**Tests added/changed.** New: `reconciliation-async-lifecycle-paths` (7), `reconciliation-force-training-diagnostic` (4), revised `reconciliation-phase4-droid` (10, real Store path),
`reconciliation-domain-adapters` (revised for R17-F2/F4), `reconciliation-phase6-advisory` (BAB informational + permanent-modifier regression), `reconciliation-phase5-integration`.

**Verification of this correction round (Node harness).** Full sweep of all `tests/*.test.mjs` (170 s per-test limit): only the same five force-power files fail, all red at the PR #1145 merge base
(`33ce3f7`) and untouched here; no new failures. Validators: partials, data, `system.json` pass. Foundry V13 acceptance: not performed.


## Approved future requirement: Manual Progression Completion Acknowledgments
Design addendum: `docs/audits/reconciliation-v2-manual-completion-addendum.md` (documentation only; **no implementation, UI, history field or mutation exists yet**, and it does not change the
Foundry V13 acceptance package). Principle: manual progression is first-class; a player may record that an entitlement was completed by hand ("Already Applied") without repeating it in the wizard; the acknowledgment never applies the
benefit, is never presented as mechanically verified, is distinct from Ignore and from Resolve/Apply, and is certified first for ability increases using the existing `system.progression.abilityIncreaseHistory`.
Concerns found against the existing evidence code (details in the addendum): replace-by-level in the history writers (C1); double-application of scores if Apply follows a manual edit (C2); any history record with a level counts as complete
regardless of source (C3); a possible latent defect where reconcile-mode ability-increase Apply may record `level: null` or the actor's current level, leaving the slot unresolved and risking a double increase (C4, **unverified - needs a trace or Foundry test**);
the ability-increase writer exists twice, with only `AbilityScorePlanBuilder` live (C5). Open questions Q1-Q8 are recorded without a guess; droid / Nonheroic counts remain RECON-002 / RECON-003.
