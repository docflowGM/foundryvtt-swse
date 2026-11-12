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
