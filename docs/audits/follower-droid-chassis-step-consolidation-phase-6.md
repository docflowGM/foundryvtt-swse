# Droid Stabilization Phase 6 — Consolidate Follower Droid Chargen into One Chassis Step

This phase is scoped narrowly: fix the specific bug where follower chargen
exposed two droid-related steps instead of one. It does not redesign
follower progression, does not touch chargen for ordinary (non-follower)
actors, and does not add new droid features.

## Bug

Follower chargen presented two separate, independently reachable
droid-related steps instead of one, so a droid follower could configure
its chassis identity twice, in two different, incompatible ways.

## Previous step graph

`FollowerShell._getCanonicalDescriptors()` (`scripts/apps/progression-framework/follower-shell.js`)
declared a fixed, static list of step descriptors including both:

- **`species`** ("Species / Chassis") — `FollowerSpeciesStep`. For living
  followers, a thin adapter over the real, mature species browser
  (`SpeciesStep`). For droid followers, it instead ran a second, entirely
  separate branch (`_isDroidPath`): a hand-rolled chassis picker built from
  two hardcoded local arrays (`BASE_DROID_SYSTEMS`/`OPTIONAL_DROID_SYSTEMS`
  — 4 fixed base systems, 15 optional ones with fixed ids/costs), rendering
  its own raw HTML radio/checkbox UI, with no connection whatsoever to the
  real canonical droid-part catalog.
- **`droid-builder`** ("Droid Systems") — `FollowerDroidBuilderStep`,
  extending the shared, mature `DroidBuilderStep` used by ordinary PC droid
  chargen. This is the real chassis authority: it reads the actual
  `DROID_SYSTEMS` catalog, enforces a follower-specific category/subcategory
  purchase constraint (`_getFollowerConstraint()`), rolls and tracks a real
  credit budget, and validates a complete build (`_validateDroidBuild()`:
  requires locomotion, processor, ≥1 appendage, non-negative remaining
  credits).

**Root cause, confirmed by tracing the actual code, not assumed:**
`FollowerShell._shouldSkipFollowerStep(stepId)` already existed and already
correctly decided "hide `species` for droid followers, hide `droid-builder`
for organic followers" — but it was only ever consulted by forward/backward
Next/Back auto-advance (`_findNextApplicableStep`/`_findPreviousApplicableStep`).
Two other paths iterated `this.steps` directly with **no applicability
filter at all**:

1. The progress-rail construction (`stepProgress = this.steps.map(...)` in
   `ProgressionShell._prepareContext`) — so the rail always rendered a row
   for both `species` and `droid-builder`, regardless of which one
   `_shouldSkipFollowerStep` said should be hidden.
2. Rail-click navigation (`ProgressionShell._onJumpStep`) — its only guard
   was `stepIndex >= this.currentStepIndex` ("can only go back"); once a
   droid follower had advanced past index 1 (`species`), clicking that
   rail row was fully functional and re-entered `FollowerSpeciesStep`'s
   droid branch, re-running `_buildDroidConfig()` and overwriting
   `draftSelections.droidConfig` with the hand-rolled shape — clobbering
   whatever the real `droid-builder` step had already built.

Both steps wrote to the exact same session key,
`progressionSession.draftSelections.droidConfig`, but with incompatible
shapes: the removed branch wrote `{baseSystems, optionalSystems}` (fixed
hardcoded ids); the canonical step writes `{droidSystems: {locomotion,
processor, appendages, accessories, ...}}` (built from the real catalog).
Whichever step ran *last* silently overwrote the other's work — a droid
follower's actual chassis depended on click order, not intent.

A confirmed-fully-dead third file, `follower-droid-step.js`
(`FollowerDroidStep`), contained a near-duplicate of the same hand-rolled
picker but was never imported anywhere — inert, but confusing to a future
reader trying to determine which implementation was "the real one."

## Canonical step

**`FollowerDroidBuilderStep` (descriptor id `droid-builder`) is the
canonical, surviving step**, relabeled from "Droid Systems" to **"Droid
Chassis"**. It was selected because it already owned every piece of real
authority the removed branch never had:

- The only real chassis/component **filtering** mechanism
  (`DroidBuilderStep._systemAllowedBySpeciesConstraints`/
  `_applySpeciesDroidConstraintsToPresentation`, gated by
  `_getFollowerConstraint()`'s category/subcategory allowlist).
- The only real **required-system validation**
  (`_validateDroidBuild()`).
- The only real connection to the canonical `DROID_SYSTEMS` catalog and
  credit-budget accounting.

`FollowerSpeciesStep` is now organic-only, unconditionally — its entire
droid branch (`_isDroidPath`, `_buildDroidConfig`, `_baseSystemsForLocomotion`,
`_renderDroidStep`, `_attachDroidListeners`, `_saveDroidConfig`, and the
`BASE_DROID_SYSTEMS`/`OPTIONAL_DROID_SYSTEMS`/`ALLOWED_DROID_ABILITIES`
constants) was deleted, not merely hidden — a droid follower never reaches
this step at all (see "Step visibility" below), so the branch was
genuinely dead code once that fix landed, and removing it prevents any
future regression from reintroducing a reachable second implementation.
`follower-droid-step.js` was deleted outright (confirmed fully dead —
`FollowerDroidStep` had exactly one reference anywhere in the repository:
its own definition).

## Removed/compatibility step

No compatibility *adapter* class was needed — `species` remains a live,
useful step (the organic species browser), just without its droid branch.
What needed compatibility handling was the **session data** an in-progress
follower chargen might already carry from before this phase:

- Because both steps wrote the *same key* (`draftSelections.droidConfig`),
  there is no "two different valid selections stored simultaneously" case
  to reconcile — by construction, only the last writer's shape survives in
  a persisted session. What a pre-existing session *can* legitimately
  contain is the removed branch's shape only (a follower whose chargen was
  mid-flight through the old droid branch when this phase landed).
- New `scripts/apps/progression-framework/steps/follower-steps/follower-droid-chassis-compat.js`
  exports `classifyFollowerDroidChassisSelection(droidConfig)`, a pure
  function distinguishing `none` / `valid` (has a real `droidSystems`
  object) / `legacy-needs-reconfiguration` (has only the old
  `baseSystems`/`optionalSystems` arrays) / `incomplete`. It never mutates
  anything — `FollowerDroidBuilderStep.onStepEnter()` calls it to log an
  explicit, surfaced warning when a legacy selection is detected, then
  proceeds into its own existing `_seedFollowerDroidSession()`, which
  **already** re-seeds a fresh, real chassis build from the canonical
  catalog whenever no canonical `droidSystems` object is present — this
  self-healing behavior pre-dates this phase and needed no change; the
  classifier makes the state explicit and testable rather than purely
  incidental.
- `abilityChoice` (the one field genuinely compatible across both old and
  new shapes) is already carried forward automatically by
  `_seedFollowerDroidSession`'s existing `{...existingConfig, ...,
  abilityChoice: existingConfig.abilityChoice || ...}` merge — confirmed
  unchanged, no fix needed.
- **"Changing from droid to organic removes chassis state"** was already
  correctly implemented, pre-dating this phase:
  `FollowerOriginStep._selectKind('living')` already sets
  `draftSelections.droidConfig = null` explicitly. Verified, not modified.

## Applicability rules

The real, working filtering logic already existed inside
`DroidBuilderStep._systemAllowedBySpeciesConstraints`/
`_applySpeciesDroidConstraintsToPresentation`, gated by
`FollowerDroidBuilderStep._getFollowerConstraint()`'s constraint object:

```js
{
  allowedCategories: ['appendage', 'accessory', 'communication', 'compartment', 'sensor', 'translator'],
  allowedAccessorySubcategories: ['communication', 'compartment', 'sensor', 'translator']
}
```

i.e. follower droids get a **fixed base chassis** (default processor +
locomotion + starting appendages, granted automatically, never purchased)
and may spend their credit budget only on the six listed categories —
they cannot buy an alternate processor or locomotion system. This phase
extracted the two methods verbatim into pure, standalone functions in new
`scripts/apps/progression-framework/steps/follower-droid-chassis-applicability.js`
— `isFollowerDroidChassisApplicable(constraints, {category, id,
subcategory})` and `getApplicableFollowerDroidChassisOptions(available,
constraints, enhanceFn)` — and `DroidBuilderStep`'s two methods are now
thin delegates to them. **Behavior is unchanged** for every existing
caller: ordinary PC droid chargen passes no constraint object (`null`) and
still gets everything unfiltered; follower droid chargen passes the same
constraint object as before.

Confirmed supported filtering criteria (by reading the actual constraint
object, not assumed): category, subcategory, and an optional explicit
accessory-id allowlist. **Confirmed NOT supported by any current rule or
data** (verified by reading `_getFollowerConstraint()`, which returns a
fixed object regardless of caller context): follower level, follower size,
or follower template type (aggressive/defensive/utility) never affect
chassis applicability today. Per the explicit instruction not to invent
restrictions the current rules don't have, this phase adds no such
restriction — the required tests for these cases (11–13) instead lock in
that applicability is correctly *unaffected* by those fields today.

## Finalization

`scripts/apps/follower-creator.js`'s existing `_resolveFollowerDroidSystems(droidConfig)`
was read in full and **required no changes** — it already prioritizes the
canonical shape correctly:

```js
const systems = droidConfig.droidSystems && typeof droidConfig.droidSystems === 'object'
  ? structuredClone(droidConfig.droidSystems)
  : null;
// ...falls back to {baseSystems, optionalSystems} only if `systems` is null.
```

Before this phase, this fallback existed *because* two different shapes
could legitimately arrive here (whichever step ran last). After this
phase, only the canonical step ever writes `draftSelections.droidConfig`
at all — the fallback branch is now purely defensive (protecting only
against a pre-existing session's legacy shape, per the compatibility
section above), not a routine "which of two writers won" resolution. One
normalized chassis result now reaches finalization by construction, not by
this function picking between two live writers. No embedded Items are
created for follower droid systems (confirmed pre-existing, documented
behavior — `tests/droid-installation-reconciler.test.mjs` already asserts
this), so "no duplicate embedded Item," "modifiers apply once," and "costs
apply once" all hold trivially: there was only ever one write path for
credits/systems into the created NPC actor's `system.droidSystems`/
`system.droidCredits`, and this phase didn't touch it.

## Files changed

- `scripts/apps/progression-framework/follower-shell.js` — the core
  structural fix: `_recomputeFollowerSteps()` (new) keeps `this.steps` in
  sync with `_shouldSkipFollowerStep()` on every render, so the progress
  rail and rail-click navigation see the same applicable-step plan
  Next/Back already trusted; `_onJumpStep` (new override) adds an explicit
  applicability check so a direct/stale-DOM jump to an inapplicable step
  is rejected the same way a UI click is; `_shouldSkipFollowerStep`/
  `_getMissingFollowerRequirements` now delegate to the shared
  `isFollowerDroidDraft`/`shouldSkipFollowerStep` pure functions instead of
  re-deriving their own OR chains; the `droid-builder` descriptor's label
  is now "Droid Chassis"; the `species` descriptor's label is now plain
  "Species" (no longer implies dual chassis responsibility).
- `scripts/apps/progression-framework/steps/follower-steps/follower-species-step.js` —
  droid branch entirely removed; organic-species-only, unconditionally.
- `scripts/apps/progression-framework/steps/follower-steps/follower-droid-builder-step.js` —
  `_isDroidFollowerDraft` now delegates to the shared `isFollowerDroidDraft`;
  logs an explicit warning via the new compatibility classifier when a
  legacy (pre-consolidation) selection is detected.
- `scripts/apps/progression-framework/steps/follower-steps/follower-step-base.js` —
  `isDroidFollowerChoice` now delegates its core OR-chain to the shared
  `isFollowerDroidDraft`.
- `scripts/apps/progression-framework/steps/droid-builder-step.js` —
  `_systemAllowedBySpeciesConstraints`/`_applySpeciesDroidConstraintsToPresentation`
  are now thin delegates to the extracted pure applicability functions;
  behavior unchanged.
- `scripts/apps/progression-framework/steps/follower-steps/follower-droid-step.js` —
  **deleted** (confirmed fully dead).
- New pure modules: `follower-droid-context.js` (`isFollowerDroidDraft`),
  `follower-step-visibility.js` (`shouldSkipFollowerStep`,
  `computeApplicableFollowerSteps`, `resolvePreservedFollowerStepIndex`,
  `followerStepListsAreEqual`), `follower-droid-chassis-compat.js`
  (`classifyFollowerDroidChassisSelection`),
  `follower-droid-chassis-applicability.js`
  (`isFollowerDroidChassisApplicable`, `getApplicableFollowerDroidChassisOptions`).
- New static guard: `tools/check-follower-droid-chassis-authority.mjs`.
- 4 new test files (see below).

No unrelated file was touched — confirmed by reviewing the full diff
before committing. No character, NPC, vehicle, or ordinary (non-follower)
chargen file was modified.

## Tests

All 4 new test files exercise real, unmodified production logic (every
function under test is the actual exported function the shell/step
classes call, not a reimplementation for testing purposes) — no Foundry
shim was needed since all of this phase's decision logic was deliberately
extracted into zero/minimal-import pure modules.

- `tests/follower-droid-context.test.mjs` — **7 test blocks, 10
  assertions** — `isFollowerDroidDraft` across explicit field, legacy
  droidConfig, speciesName fallback, organic, null/undefined, and the
  post-switch-to-living shape `FollowerOriginStep` already produces.
- `tests/follower-step-visibility.test.mjs` — **14 test blocks, 26
  assertions** — step-plan tests 1–5 (organic has zero chassis steps,
  droid has exactly one, the duplicate is absent, ordering is
  deterministic, resume doesn't reintroduce it), applicability/visibility
  tests 9–13 and 19 (explicit context, cannot force-open, level/size/role
  are confirmed unaffected since no such rule exists), fixed-profile
  regression, and selection-state tests 14/17/20 (valid selection
  survives, upstream change revalidates, no array-order auto-selection).
- `tests/follower-droid-chassis-applicability.test.mjs` — **10 test
  blocks, 22 assertions** — applicability tests 6–9, 11–13, 20, using the
  real, verbatim follower constraint object copied from
  `_getFollowerConstraint()`.
- `tests/follower-droid-chassis-compat.test.mjs` — **5 test blocks, 10
  assertions** — selection-state tests 15–16 (legacy selection correctly
  classified as needing reconfiguration; the "two different valid
  selections" case is confirmed structurally unreachable for this
  single-key field, documented rather than force-tested).

**Honest scope**: finalization tests 22–30 are **not** separately
Node-tested — `scripts/apps/follower-creator.js` could not be loaded even
through the Phase 4/5 Foundry-shim harness (`Cannot read properties of
undefined (reading 'api')`, the same class of transitive-import wall
`progression-entry.js` hit in Phase 5), and this phase made no code change
to it (verified correct by reading, as documented above) — so there is
nothing new to regression-test there beyond what Phase 1–5's existing
suites already cover. Regression tests 31–42 are satisfied by re-running
the full existing suite (below), not new test files, since this phase
didn't touch character/NPC/stock-droid/progression-guard code.

### Validation performed (this phase, Node-only — exact counts)

- `node tools/run-rolling-syntax-check.mjs` — **discovered 2117, executed
  2115, passed 2115, failed 0, excluded 2** (pre-existing, documented,
  unrelated).
- `node tools/run-rolling-tests.mjs` — **discovered 54, executed 49,
  passed 49, failed 0, excluded 5** (pre-existing, documented Force-power-
  track exclusions) — up from 45 before this phase, reflecting the 4 new
  Phase 6 test files.
- `node tools/check-droid-authority-ssot.mjs --strict` — pass (Phase 1,
  unaffected).
- `node tools/check-droid-installation-write-authority.mjs --strict` —
  pass (Phase 2, unaffected).
- `node tools/check-droid-calculation-mode-authority.mjs --strict` — pass
  (Phase 3, unaffected).
- `node tools/check-droid-reconciliation-authority.mjs --strict` — pass
  (Phase 4, unaffected).
- `node tools/check-follower-droid-chassis-authority.mjs --strict` — **new
  this phase**, 0 violations across 1965 scanned files; separately
  verified to correctly catch three independently-injected fake
  violations (a reintroduced dead step, a duplicate applicability-engine
  definition, and name-only applicability logic) before those temporary
  edits were reverted.
- `bash tools/check-mutation-paths.sh` — pass.
- `node tools/check-progression-integrity.mjs` — **44 violations**
  (`progression-registry-bypass`: 21, `draft-write-bypass`: 23) —
  **identical to the recorded baseline.**
- `node tools/check-architecture-boundaries.mjs` — **37 violations**
  (`direct-actor-mutation`: 6, `progression-registry-bypass`: 31) —
  **identical to the recorded baseline.** Neither tool's output references
  any file this phase touched — zero new violations introduced, confirmed
  by exact-count comparison, not merely "the tool still passes."
- All 8 pre-existing combat/vehicle SSOT guards — still pass, unaffected
  (this phase touched no combat/vehicle file).

## Runtime status

**No live Foundry VTT v13 testing occurred.** Per Phase 5's confirmed,
unchanged environmental finding (no Foundry installation, license,
server, or `foundryconfig.json` exists anywhere in this repository or
container), nothing in this phase could be exercised inside an actual
running Foundry instance. Every result above is a real, Node-executed
pass/fail against real production code (this phase's decision logic was
deliberately extracted into pure modules specifically so it could be
tested this way without a Foundry shim) — but the actual rail rendering,
rail-click DOM behavior, and end-to-end follower-creation flow remain
unverified in a live client.

## Merge readiness

**CONDITIONALLY READY** — unchanged from Phase 5's assessment, for the
same reason: this phase's fix is well-covered at the Node level (73 new
assertions across 4 test files, all against real production code) and
introduces zero new integrity/architecture-boundary violations, but per
the existing PR criteria established in Phase 5, merge readiness cannot
become READY while live Foundry v13 runtime verification remains blocked
by this environment's lack of a Foundry installation — that constraint is
unrelated to and unaffected by this phase's work, and remains true
regardless of how much additional Node-level coverage is added. PR #937
remains a draft.
