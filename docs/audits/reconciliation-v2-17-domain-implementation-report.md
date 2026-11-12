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
