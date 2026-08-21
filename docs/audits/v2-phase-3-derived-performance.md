# Phase 3 — Derived-Data + Performance Optimization

Builds on the accepted Phase 2 / Phase 2B gate (`docs/audits/v2-phase-2-actor-authority-normalization.md`,
PR #953, "PHASE 2 COMPLETE WITH DOCUMENTED RUNTIME BLOCKERS"). Branch:
`claude/swse-phase-3-derived-performance`, based on the Phase 2B tip
(`88523d6`) so its eventual PR shows a Phase-3-only diff against
`claude/swse-phase-2-authority-normalization`.

**Objective** (verbatim from the Phase 3 brief): make the existing
authoritative architecture (`ActorEngine`, `DerivedCalculator`,
`ModifierEngine`, Transaction Engine) do materially less redundant work
without changing mechanical behavior or crossing unresolved authority
boundaries. Measure first. Remove duplicate work second. Add architecture
only when simpler options are insufficient.

**Evidence taxonomy used throughout**: VERIFIED (confirmed by direct code
read and/or a passing automated test against real production code),
INFERRED (a reasonable conclusion from code structure/comments that cannot
be directly executed in this environment), NOT VERIFIED (a plausible but
unconfirmed hypothesis), BLOCKED ON LIVE FOUNDRY (requires a live client —
this repo's Node/Foundry-shim harness cannot execute it).

---

## 1. Baseline — derived-data lifecycle and cost map

**VERIFIED** (direct code read, `scripts/actors/v2/base-actor.js`,
`scripts/actors/derived/derived-calculator.js`,
`scripts/actors/v2/character-actor.js`):

Every `prepareDerivedData()` pass on a `SWSEV2BaseActor` runs two genuinely
different derived computations, not a duplicate pair:

1. **Sync mirror pass** — `_performDerivedCalculation(system)` dispatches
   via `switch(this.type)` to `computeCharacterDerived` / `computeNpcDerived`
   / `computeDroidDerived` / `computeVehicleDerived`
   (`scripts/actors/v2/{character,npc,droid,vehicle}-actor.js`). This is a
   cheap, synchronous view-model mirror: it scans `actor.items`/`actor.effects`
   directly off the live document and writes placeholder/default shapes into
   `system.derived.*` so templates never see `undefined`.
2. **Async authoritative pass** — `_computeDerivedAsync(system)` calls the
   awaited `DerivedCalculator.computeAll(actor)`
   (`scripts/actors/derived/derived-calculator.js`), the actual mechanical
   authority (HP, defenses, BAB, skills, damage threshold, modifier
   aggregation/breakdown). Its result is merged into `system.derived.*`, and
   a follow-up render is only queued when the merged result actually differs
   from what the sync pass already wrote.

Both passes independently traverse `actor.items`/`actor.effects` for
different purposes. Within each pass, several sub-scans were found to
duplicate work for the *same* actor state in the *same* cycle — that
duplication, not the sync/async split itself, is Phase 3's target.

`shouldSkipDerivedData(actor)` (`scripts/utils/hardening.js`) gates only the
async pass; it has no effect on the sync mirror, `_applyV2ConditionTrackDerived`,
or `computeXpDerived` — **VERIFIED**, re-confirmed unchanged from Phase 2B.

## 2. Bottleneck ranking

| # | Subsystem | Severity | Evidence |
|---|-----------|----------|----------|
| 1 | `ModifierEngine` actor-source signature (items+effects scan/sort/join) | **HIGH** | VERIFIED — computed up to 5× per single `DerivedCalculator.computeAll()` cycle for unchanged actor state (`getAllModifiers` ×1, `aggregateAll` ×1 direct + ×1 internal fan-out, `buildModifierBreakdown` ×1 direct + ×1 internal fan-out). Confirmed by a call-count spy test (`tests/modifier-engine-signature-reuse.test.mjs`, Test 3), not just static reading. |
| 2 | `DerivedCalculator` actor-compute signature (items+effects scan/sort/join) | **HIGH** | VERIFIED — computed twice per single `_computeDerivedAsync()` invocation (once for `SWSEV2BaseActor`'s own coalescing guard, once again inside `computeAll()`'s cache check), for identical actor state each time. |
| 3 | Vehicle `mirrorAttacks`/`mirrorActions` in `computeCharacterDerived()` | **HIGH** | VERIFIED — both run real, non-trivial work (item filtering + entry construction; `mirrorActions` alone iterates a ~53-entry static combat-actions table) for every Vehicle actor, but their output (`system.derived.attacks`/`actions`) is dead: the templates that would read it are unregistered for the vehicle sheet (`load-templates.js`), and the generic reader code is unreachable behind the vehicle sheet's own pre-existing early-return in `character-sheet.js`. |
| 4 | `character-actor.js` `mirrorInventory` re-scanning `actor.items` independently of the shared `itemIndex` | **MEDIUM** | VERIFIED — `computeCharacterDerived()` already builds `itemIndex` via `buildActorItemIndex(actor)` for feats/talents/maneuvers, but `mirrorInventory` performed its own separate single-pass traversal instead of reusing it. |
| 5 | `DefenseCalculator._collectSpeciesDefenseBonus`'s species-item filter | **MEDIUM** | VERIFIED — `actor.items.filter(item => item.type === 'species')` re-run independently for each of fort/ref/will inside a single `calculate()` call, whenever an actor lacks a precomputed "direct" species bonus field for that defense (the common case, since those fields are themselves normally populated from species items). |
| 6 | `character-sheet.js` NPC context construction (16-panel loop + `buildConceptSheetViewModel`, ~1,971 lines, unconditional) | **HIGH (value), DEFERRED (risk)** | VERIFIED the waste exists (exhaustive template grep: NPC concept-sheet templates never reference `conceptLayout`'s output); NOT VERIFIED as safely fixable in this pass — no test harness can import `PanelContextBuilder.js` under Node (`Cannot read properties of undefined (reading 'api')`, confirmed in Phase 2B), so an early-return here cannot be proven output-equivalent without a live Foundry client. See §9. |
| 7 | `DroidSheetContextBuilder` double-building 5 panels via its own separate `PanelContextBuilder` instance | **LOW–MEDIUM (value), DEFERRED (risk)** | VERIFIED the double-build exists (own `PanelContextBuilder` instance rebuilds `healthPanel`/`defensePanel`/`biographyPanel`/`secondWindPanel`/`abilitiesPanel`, discarding all but 3 of ~25 returned keys); same unverifiable-without-live-Foundry risk as #6, and lower total cost (5 of 21 panels vs. NPC's full 16-panel loop + 1,971-line builder). See §9. |
| 8 | Sync-vs-async duplicate derived computation | **NOT A BOTTLENECK** | VERIFIED false as a hypothesis — the two passes compute genuinely different things (cheap view-model defaults vs. authoritative mechanical math), not duplicate work. Investigated per the brief's explicit instruction not to assume; ruled out. |

## 3. Changes implemented (5 fixes, all HIGH/MEDIUM-ranked, all statically verifiable)

### Fix #1 — DerivedCalculator: eliminate redundant signature computation

- **Files**: `scripts/actors/derived/derived-calculator.js`, `scripts/actors/v2/base-actor.js`
- **Previous behavior**: `SWSEV2BaseActor._computeDerivedAsync()` computed
  `DerivedCalculator.getActorComputeSignature(this)` for its own in-flight/
  applied-signature coalescing guard, then called `DerivedCalculator.computeAll(this)`,
  which immediately recomputed the exact same signature itself as its cache key.
- **New behavior**: `computeAll(actor, options = {})` accepts an optional
  `options.signature`; when provided, it is used as the cache key instead of
  recomputing. `_computeDerivedAsync` now passes the signature it already
  computed: `DerivedCalculator.computeAll(this, { signature })`.
- **Why safe**: `options` defaults to `{}`, so every other pre-existing
  caller of `computeAll(actor)` (e.g. `ActorEngine.recalcAll()`) is
  unaffected — they never pass a second argument, and the code falls back
  to `this.getActorComputeSignature(actor)` exactly as before.
- **Tests**: `tests/derived-calculator-signature-reuse.test.mjs` — proves
  (a) a provided signature is used with zero recomputation calls, (b)
  omitting `options` still computes the signature exactly once (backward
  compatibility), (c) output is byte-identical either way.
- **Measurable reduction**: signature computations (each a full
  `actor.items`+`actor.effects` scan/sort/join) per single
  `_computeDerivedAsync()` invocation: **2 → 1**.

### Fix #2 — ModifierEngine: eliminate redundant signature computation (5× → 1×)

- **Files**: `scripts/engine/effects/modifiers/ModifierEngine.js`, `scripts/actors/derived/derived-calculator.js`
- **Previous behavior**: `getAllModifiers`, `aggregateAll`, and
  `buildModifierBreakdown` each independently called
  `_actorModifierSourceSignature(actor)` for their own cache-key check, and
  `aggregateAll`/`buildModifierBreakdown` additionally called
  `getAllModifiers(actor)` internally (which recomputed the signature a
  second time). `DerivedCalculator.computeAll()` called all three
  externally in one cycle, for a total of 5 signature computations for one
  unchanged actor state.
- **New behavior**: all three methods accept an optional `options.signature`
  and use it as their cache key when provided. Their internal
  `getAllModifiers()` fan-out calls now pass their own already-computed key
  through (`getAllModifiers(actor, { signature: cacheKey })`). A new public
  accessor, `ModifierEngine.getActorModifierSourceSignature(actor)`, lets
  `derived-calculator.js` compute the signature once per `computeAll()`
  cycle and thread it through all three external call sites.
- **Why safe**: `options` defaults to `{}` on every method; every other
  existing caller (`modifier-inspector-app.js`, `threshold-engine.js`,
  `ModifierEngineExtensions.js`) calls with a single argument and is
  unaffected.
- **Tests**: `tests/modifier-engine-signature-reuse.test.mjs` — a call-count
  spy on the private signature method proves each public method honors a
  provided signature (0 recomputation calls), that `aggregateAll`/
  `buildModifierBreakdown` without options call it exactly once each (not
  twice, via the fan-out reuse), and — the strongest single result in this
  pass — that a full `DerivedCalculator.computeAll()` cycle now computes the
  ModifierEngine signature **exactly once**, not five times, for one actor.
  A fourth test confirms output is unchanged.
- **Measurable reduction**: ModifierEngine signature computations per single
  `DerivedCalculator.computeAll()` cycle: **5 → 1** (VERIFIED by test, not
  static reasoning).

### Fix #3 — DefenseCalculator: hoist species-item filter out of the fort/ref/will loop

- **File**: `scripts/actors/derived/defense-calculator.js`
- **Previous behavior**: `_collectSpeciesDefenseBonus(actor, defenseType)`
  independently ran `actor.items.filter(item => item.type === 'species')`
  every time it was called; `calculate()` calls it three times per
  invocation (once each for fortitude/reflex/will).
- **New behavior**: `_collectSpeciesDefenseBonus` accepts an optional third
  parameter, `speciesItems`, and only filters `actor.items` itself when it
  is omitted (`null` default — fully backward compatible, since no other
  caller exists). `calculate()` now filters once
  (`speciesItemsForDefense`) and passes it to all three calls.
- **Why safe**: the fallback path is byte-identical to the pre-fix
  behavior; the only external caller (`calculate()`) always supplies the
  pre-filtered array.
- **Known trade-off, disclosed rather than hidden**: the pre-fix code only
  ran the filter when a defense type actually reached the item-derived
  fallback (i.e., only when it lacked a precomputed "direct" species bonus
  field — the common case). The new code always filters once per
  `calculate()` call, even in the rare case where all three defenses have a
  direct bonus and the filter result would go unused. Net effect across the
  realistic case distribution is still a reduction (3→1 in the common case
  the fix targets; a small 0→1 regression only in the uncommon case where
  no defense ever needs the item-derived path).
- **Tests**: `tests/defense-calculator-species-bonus-hoist.test.mjs` — a
  pre-filtered array is honored over re-deriving from `actor.items`;
  omitting it falls back correctly; both call shapes produce identical
  output for equivalent input.
- **Measurable reduction**: `actor.items` filter passes for species items,
  common case, per single `calculate()` invocation: **3 → 1**.

### Fix #4 — character-actor.js: `mirrorInventory` reuses the shared item index

- **File**: `scripts/actors/v2/character-actor.js`
- **Previous behavior**: `computeCharacterDerived()` already built
  `itemIndex = buildActorItemIndex(actor)` (one full `actor.items` pass,
  grouped by `item.type`) for `mirrorFeats`/`mirrorTalents`/
  `mirrorStarshipManeuvers`, but `mirrorInventory(actor, system)`
  performed its own independent single-pass traversal of `actor.items`
  with a 6-type switch, ignoring the already-built index entirely.
- **New behavior**: `mirrorInventory(actor, system, itemIndex)` now reuses
  `itemIndex.byType.get(type)` directly for the four single-source-type
  groups (weapons/armor/equipment/consumables) — O(1) map lookups instead
  of a re-scan. The `misc` group merges two source types (`ammo`, `misc`);
  concatenating two independently-ordered index buckets would not preserve
  the original `actor.items` document order across that merge, so `misc`
  still uses one filtered `actor.items` pass restricted to just those two
  types (not all six). A `null`-itemIndex fallback path preserves the
  exact pre-fix single-pass-switch behavior for any future caller that
  doesn't build an index.
- **Why safe**: `itemIndex.byType.get(type)` returns the exact same items,
  in the exact same relative order, that `.filter(i => i.type === type)`
  would have returned (this equivalence is the exact contract Phase 1's
  `buildActorItemIndex` was built and tested to guarantee —
  `tests/actor-item-index.test.mjs`). Per-group order is therefore
  unaffected; the `misc`-merge order-preservation concern was caught and
  fixed during implementation (an earlier draft would have grouped by type
  before merging, silently changing `misc` entry order — corrected before
  landing).
- **Tests**: `tests/character-actor-inventory-index-and-vehicle-skip.test.mjs`
  (Test 1) — deliberately interleaves item types (ammo before armor, misc
  before equipment) and asserts every group's contents *and* the `misc`
  group's specific cross-type document order.
- **Measurable reduction**: for the four single-type groups, item-processing
  work moves from "re-scan every item, check against a 6-value array" to
  "one `Map.get()` per group." The `misc` group's `actor.items` pass now
  only evaluates items of 2 types instead of all 6 (still a full-length
  iteration, but a cheaper predicate over the same length — see §5 for the
  precise, honest accounting).

### Fix #5 — character-actor.js: skip `mirrorAttacks`/`mirrorActions` for Vehicle actors

- **File**: `scripts/actors/v2/character-actor.js`
- **Previous behavior**: `computeCharacterDerived()` unconditionally called
  `mirrorAttacks(actor, system)` (filters `actor.items` for attack-capable
  items, builds a full attack-entry object per equipped weapon) and
  `mirrorActions(actor, system)` (iterates the ~53-entry static
  `combat-actions.json` table plus item-derived entries) for every actor
  type, including Vehicle.
- **New behavior**: both calls are now guarded with
  `if (actor.type !== 'vehicle') { ... }`, mirroring the pre-existing,
  already-shipped pattern in `base-actor.js`
  (`if (this.type !== 'vehicle') { computeXpDerived(this, system); }`).
  `system.derived.attacks`/`actions` remain initialized to `{}` (from the
  existing `??=` defaults at the top of `computeCharacterDerived`) rather
  than being left `undefined`.
- **Why safe**: VERIFIED by background investigation (exhaustive template
  registration + JS-reachability grep) that Vehicle's own sheet templates
  never register the attacks/actions panels this data feeds, and the
  generic panel-reading code is unreachable for vehicles because
  `character-sheet.js`'s existing `if (useVehicleSheet) { ...; return
  vehicleContext; }` early-return already prevents that code from running
  for vehicle actors. `computeVehicleDerived()` (`vehicle-actor.js`) then
  layers `buildVehicleDerived()` on top, which does not read
  `system.derived.attacks`/`actions` either.
- **Tests**: `tests/character-actor-inventory-index-and-vehicle-skip.test.mjs`
  (Tests 3–5) — proves vehicle actors get `{}` for both fields while
  inventory mirroring is unaffected, and that character/NPC/droid actors
  (the only other types routed through `computeCharacterDerived`) are
  completely unaffected by the vehicle-only guard.
- **Measurable reduction**: per Vehicle actor derived-computation pass:
  `actor.items` attack-predicate scan: **1 → 0**; static
  `combat-actions.json` (53-entry) iteration: **1 → 0**.

## 4. Deferred findings (documented, not implemented)

### NPC sheet-context early-return (Bottleneck #6, HIGH value)

`character-sheet.js`'s `_prepareContext()` has a proven-safe precedent for
exactly this shape of fix — Vehicle's own early-return
(`if (useVehicleSheet) { ...; return vehicleContext; }`) — and NPC's own
`useNpcConceptSheet` branch (lines ~2854–2884) already exists but does
*not* return; it only augments `context` and falls through into the same
~1,600-line shared pipeline every other actor type uses, including the
unconditional 16-panel `PanelContextBuilder` loop and the unconditional,
~1,971-line `buildConceptSheetViewModel()` call whose `conceptLayout`
output an exhaustive template grep confirms no NPC concept-sheet template
ever reads.

**Deferred because**: this repo's Foundry-shim test harness cannot import
`PanelContextBuilder.js` at all (`Cannot read properties of undefined
(reading 'api')`, independently confirmed during the Phase 2B compliance
audit) — there is no automated way to prove an NPC early-return would
produce an output-equivalent context for every NPC sheet variant (concept
sheet, statblock, follower) without a live Foundry client. The brief's
explicit constraint — "If a performance problem requires broader
architectural work, document it and stop at the smallest safe boundary" —
applies directly: building a trimmed `npcContext` construction path
analogous to `_prepareVehicleActorSheetContext` is itself sheet-layer
design work, not a mechanical dedup, and risks a silent template-breaking
regression that cannot be caught by this repo's test suite. Recommended as
the top item in §9 for a follow-up pass that includes live-Foundry
verification.

### Droid `DroidSheetContextBuilder` double-build (Bottleneck #7, LOW–MEDIUM value)

`DroidSheetContextBuilder` instantiates its own separate
`PanelContextBuilder` and independently rebuilds `healthPanel`/
`defensePanel`/`biographyPanel`/`secondWindPanel`/`abilitiesPanel` — panels
the main 16-panel loop already built for the same actor in the same
`_prepareContext()` call — then discards all but 3 of its ~25 returned
keys at the call site.

**Deferred for the same reason as the NPC finding**: no test harness can
verify `PanelContextBuilder` output equivalence, and the fix (passing the
main loop's already-built panels into `DroidSheetContextBuilder` instead
of letting it rebuild them) touches the same unverifiable sheet-context
surface. Lower priority than the NPC finding because the cost is 5 of 21
panels for Droid vs. a full 16-panel loop plus a 1,971-line builder for
every NPC.

### Both deferred items are intentionally excluded from this pass's

5 implemented fixes to honor the brief's explicit guidance: *"A good
outcome could be only 2–4 meaningful fixes if those fixes remove the
dominant redundant work. Avoid creating a massive performance PR with
unrelated architecture changes."* — 5 statically-verifiable, fully-tested
backend fixes were judged the safer stopping point than adding 2 more
sheet-layer changes with no automated equivalence proof available in this
environment.

## 5. Runtime benchmark checklist (BLOCKED ON LIVE FOUNDRY)

None of the 5 fixes in this pass change template output, panel visibility,
or any user-visible sheet content — they only reduce redundant internal
computation. No exact millisecond timings are claimed anywhere in this
document (per the brief: "If exact runtime timing cannot be measured
without Foundry, do NOT invent milliseconds."). A maintainer with a live
Foundry client should still confirm no regression using the following
steps. For each scenario: open DevTools Performance panel, click Record,
perform the action, stop recording, and note wall-clock time plus call
counts for `DerivedCalculator.computeAll`, `ModifierEngine.getAllModifiers`/
`aggregateAll`/`buildModifierBreakdown`, and `character-actor.js`'s
`mirrorInventory`/`mirrorAttacks`/`mirrorActions` (all visible via
`ActorPerfDiagnostics` when `isPerformanceDiagnosticsEnabled()` is on).

1. **Character sheet open** — reset counters, open a PC sheet with a
   nontrivial item count (10+ items, 2+ active effects), stop recording.
   Expect: `ModifierEngine` signature computation count for this cycle ≈ 1
   (previously ≈ 5); `DerivedCalculator` signature computation count ≈ 1
   (previously ≈ 2).
2. **Character Item add** — with the sheet open, drag a new weapon onto the
   actor. Record from drop to sheet repaint. Expect: same signature-count
   reduction as #1, applied once per triggered recompute cycle.
3. **Character Item remove** — delete an equipped item from the sheet.
   Same expectation as #2.
4. **Character Effect add** — apply an Active Effect via a condition or
   item. Same expectation as #1/#2.
5. **Character Effect remove** — remove the effect from #4. Same
   expectation.
6. **HP-only update** — apply damage via the HP field directly (no item/
   effect change). Confirm `mirrorInventory`/`mirrorAttacks`/`mirrorActions`
   output is unchanged (byte-identical `system.derived.inventory`/
   `attacks`/`actions` before and after, for a Character actor).
7. **Ability score update** — change Strength via the sheet. Confirm
   defense values (`system.derived.defenses.*`) are unchanged from
   pre-Phase-3 behavior for a species-item-bearing actor (validates Fix
   #3's fort/ref/will hoist did not alter output).
8. **NPC progression actor sheet open** — open an NPC using
   `calculationMode: 'progression'`. Confirm no visual/content change (no
   NPC-facing fix shipped in this pass).
9. **NPC statblock actor sheet open** — same as #8 for `'statblock'` mode.
10. **Vehicle sheet open** — open a Vehicle sheet with 1+ equipped weapon
    items. Confirm the sheet renders identically to pre-Phase-3 (attacks/
    actions panels were already unreachable for vehicles before this pass,
    so this validates Fix #5 introduced no visible change), and record
    `mirrorAttacks`/`mirrorActions` call counts — expect **0** calls for
    this actor (previously 1 each).
11. **Vehicle HP damage update** — apply hull/HP damage on a Vehicle actor.
    Confirm `system.derived.damageThreshold`/hull/HP/defenses/DR/SR/crew
    values are byte-identical to pre-Phase-3 behavior (no Vehicle authority
    fix shipped in this pass; Phase 2's DT fix is untouched).
12. **Droid sheet open** — open a Droid sheet. Confirm
    `system.derived.attacks`/`actions` are still populated (Droid is not
    in the vehicle-only skip guard) and armor/processor/credits/degree
    panel values are unchanged (Fix #4/#5 do not touch Droid-specific
    representation — see §6 exclusions).

## 6. Phase 2 authority exclusions — carried forward, explicitly preserved

None of this pass's 5 changes touch, normalize, reinterpret, or
"fix-while-here" any of the following, per the Phase 3 brief's hard
constraints (all still unresolved from Phase 2/2B):

- **Droid armor representation** (`.bonus`/`.rating`/`.armorBonus`
  conflict) — untouched. `_collectSpeciesDefenseBonus` (Fix #3) reads
  species items, not droid armor items.
- **Droid processor representation** — untouched; no fix in this pass
  reads `system.droidSystems.*`.
- **Droid credits representation** — untouched.
- **Droid degree dual-write divergence** — untouched.
- **Droid creation-path source-shape divergence** (six divergent shapes,
  documented in Phase 2) — untouched; `ensureDroidSystemsDefaults()` was
  not modified.
- **Vehicle SR dual-field representation** — untouched; no new authority
  established. Fix #5's vehicle guard only skips attack/action mirroring,
  which never touched SR.
- **Vehicle weapon-mount duplicate-display behavior** — untouched.
- **`MutationInterceptor`/`ActorEngine` routing enforcement** — this pass
  did not assume any write path mechanically passes through `ActorEngine`
  (confirmed, per Phase 2B's finding, that `Actor.prototype.update()` is
  not prototype-wrapped — enforcement is a followed convention, not a
  runtime gate). No revision-counter or writer-coverage-dependent
  invalidation scheme was introduced; every fix in this pass uses
  memoization scoped to a single already-in-progress call stack (a
  pre-computed value passed as a function argument within one synchronous-ish
  cycle), never a persisted or cross-cycle "trust this hasn't changed"
  counter. The brief's revision-counter guardrail was therefore never
  triggered — Tier 1–4 of the safe-optimization preference order (eliminate
  exact duplicate work; reuse existing per-cycle data; skip provably
  irrelevant subtype work) fully covered every fix implemented; Tier 7
  (cheap invalidation signals / revision counters) was never needed.

## 7. Remaining performance work (ranked by expected value)

1. **NPC sheet-context early-return** (§4) — highest remaining value;
   requires live-Foundry verification before implementation. Do not begin
   sheet redesign as part of this — the fix is a targeted early-return
   mirroring Vehicle's existing pattern, not a rearchitecture.
2. **Droid `DroidSheetContextBuilder` double-build** (§4) — same
   verification blocker, lower value than #1.
3. **`mirrorEncumbrance`/`mirrorForceTechniques`/`mirrorForceSecrels`
   itemIndex adoption** — NOT VERIFIED as currently redundant (not traced
   in this pass); worth a follow-up trace to check whether any of these
   independently re-scan `actor.items` in a way `itemIndex` could serve,
   following the exact Fix #4 pattern.
4. **`_resolveClassLevels`'s independent `type === 'class'` filter**
   (`derived-calculator.js` ~line 174) — VERIFIED as an unindexed,
   currently-singleton scan (called once per `computeAll()`, not
   redundant against another scan in this pass's scope) — low priority on
   its own, but worth folding into `itemIndex` if a future pass adds more
   `type === 'class'` consumers.
5. **Live-Foundry timing capture** — this pass's reductions are all
   structural (call-count/traversal-count), not measured wall-clock time.
   A maintainer with a live client should capture before/after timings for
   the §5 checklist to confirm the structural reductions translate to a
   perceptible improvement, particularly for actors with large item/effect
   counts where the signature-computation savings compound most.

## 8. Test summary

- `node tools/run-rolling-syntax-check.mjs` — 2235/2235 discovered source
  files pass `node --check`.
- `node tools/run-rolling-tests.mjs` — 126 passed, 1 failed (127 run, 5
  documented pre-existing Force-power-track exclusions). The 1 failure,
  `progression-suggestion-and-render-contracts.test.mjs`
  ("lang/en.json is missing the announced form of Select"), is the
  same pre-existing failure independently reproduced against `origin/main`
  in the Phase 2B compliance audit — not a Phase 3 regression.
- 4 new focused test files added, all passing:
  - `tests/derived-calculator-signature-reuse.test.mjs`
  - `tests/modifier-engine-signature-reuse.test.mjs`
  - `tests/defense-calculator-species-bonus-hoist.test.mjs`
  - `tests/character-actor-inventory-index-and-vehicle-skip.test.mjs`
