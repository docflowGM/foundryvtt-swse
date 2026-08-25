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

## 5. Runtime benchmark checklist (OPTIONAL FUTURE VALIDATION — not a Phase 3 closure requirement)

**Status update (Static Closure Review, see §9): live Foundry access is not
currently available, and per the revised Phase 3 closure standard, its
absence is not by itself grounds for withholding closure.** Every claim in
this document is now backed by direct static code/dataflow tracing and/or
an automated test against real production code (see §9 for the full
per-fix evidence). The checklist below (and the companion procedure,
`docs/audits/v2-phase-3-live-benchmark-procedure.md`) remains in the repo
as a **recommended future smoke-test pass**, not a blocker.

None of the 5 originally-shipped fixes, nor the Phase 3B NPC guard added in
the static closure pass (§9), change template output, panel visibility, or
any user-visible sheet content — they only reduce redundant internal
computation. No exact millisecond timings are claimed anywhere in this
document (per the brief: "If exact runtime timing cannot be measured
without Foundry, do NOT invent milliseconds."). A maintainer with a live
Foundry client can still use the following steps for a future smoke test.
For each scenario: open DevTools Performance panel, click Record,
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

## 9. Static Closure Review

Performed after live Foundry access became unavailable. Per the revised
closure standard, live benchmark timing is a recommended future validation
step, not a blocker — every claim below is instead backed by direct
static code/dataflow tracing and/or an automated test. Evidence taxonomy:
**VERIFIED** (proven by direct code trace and/or passing test),
**INFERRED** (strongly supported, one non-exhaustive link in the chain —
e.g. a framework getter this repo doesn't define), **NOT VERIFIED**,
**RUNTIME FOLLOW-UP** (recommended future live smoke test, not blocking).

### 9.1 Five-fix re-verification

**Fix #1 (DerivedCalculator signature reuse) — VERIFIED.** Traced
`base-actor.js`'s `_computeDerivedAsync()`: `signature` is computed at line
130 (`DerivedCalculator.getActorComputeSignature?.(this)`) and consumed at
line 145 (`DerivedCalculator.computeAll(this, { signature })`) with zero
`await` or actor-mutation boundary between them — only synchronous
in-flight/applied-signature coalescing checks run in between. The signature
is a pure function of actor/item/effect revision fields
(`_getActorComputeSignatureImpl`), so it provably describes the exact same
state `computeAll()` consumes. `computeAll(actor, options = {})` falls back
to self-computing when `options.signature` is `undefined`, so every other
caller (`ActorEngine.recalcAll()`) is unaffected — confirmed unchanged.

**Fix #2 (ModifierEngine signature threading) — VERIFIED for the primary
path, one narrow edge case flagged as RUNTIME FOLLOW-UP (not blocking).**
Traced `computeAll()`'s modifier section: `modifierSignature` is computed
once (line 231) and threaded into `getAllModifiers`/`aggregateAll`/
`buildModifierBreakdown` (lines 234, 237, and the `buildModifierBreakdown`
call further down), and each of those in turn passes it to their own
internal `getAllModifiers` fan-out call. All three public methods still
default to self-computing when `options.signature` is omitted (confirmed
at all 3 `ModifierEngine.js` call sites), so the many other single-argument
external callers are unaffected. Edge case: unlike the pre-Phase-3 code
(where each of the 3 methods independently re-read `actor.items`/`effects`
at its own call time, self-healing against a concurrent mutation to the
same actor mid-`computeAll()`), the shared signature means a mutation
landing in the `await`-window between the top-level computation and a
later consuming call would be invisible to that call's cache lookup. This
is narrow (requires a non-ActorEngine-routed write to the *same* actor
inside a single microtask window — Phase 2B already established
ActorEngine routing is a followed convention, not a mechanically-enforced
gate, so this can't be fully ruled out) and self-correcting (a stale hit
only reflects the state from immediately before the mutation, and the next
`computeAll()` cycle recomputes fresh) — not a data-integrity risk, but
flagged as RUNTIME FOLLOW-UP rather than claimed fully proven.

**Fix #3 (DefenseCalculator species filter hoist) — VERIFIED as a net
improvement, not reverted.** Re-examined per the brief's explicit
"don't defend sunk cost" instruction. The `direct` early-return in
`_collectSpeciesDefenseBonus` sums 5 fields
(`defenseState.speciesBonus`/`.species`/`.misc.auto.species`,
`speciesTraitBonuses`, `speciesCombatBonuses`). Grepped the entire `scripts/`
tree for writers of all 5: **zero writers exist** for any of them as actor
*source* data (the only matches are the function's own read sites and, for
`speciesBonus`, unrelated *output* fields in other objects). This means
`direct` is effectively always `0` in the current codebase — the "rare
0→1 regression case" this fix trades against requires a writer that
doesn't exist today, while the "common 3→1 improvement case" is
essentially universal. Kept as-is.

**Fix #4 (mirrorInventory itemIndex reuse) — VERIFIED, unchanged since
initial implementation.** Re-read `buildActorItemIndex()` (single forward
pass, `bucket.push(item)` preserves `actor.items` relative order per type
— also independently locked in by `tests/actor-item-index.test.mjs`) and
`mirrorInventory()`'s current code: 4 single-type groups read
`itemIndex.byType.get(type)` directly; the `misc` group (merging `ammo`+
`misc` types) still uses one filtered `actor.items` pass specifically to
preserve document order across that merge, per the existing test
(`tests/character-actor-inventory-index-and-vehicle-skip.test.mjs`, Test 1,
which interleaves types and asserts the merged order).

**Fix #5 (Vehicle mirrorAttacks/mirrorActions skip) — VERIFIED via a fuller
reachability proof than the original Phase 3 pass, two new facts found:**
1. Two vehicle-specific templates exist on disk —
   `templates/actors/vehicle/v2/partials/{attacks,actions}-panel.hbs` — and
   *do* reference `derived.attacks.list`/`derived.actions.groups`. Grepped
   the entire repo for any inclusion of these two exact paths (partial
   registration in `scripts/load-templates.js`, or a `{{> "..."}}`
   reference anywhere): **zero matches other than the files' own content.**
   They are orphaned/dead files, never registered, never included by the
   actually-rendered `vehicle-sheet-content.hbs` (which includes 15
   partials by explicit path — none of them these two; weapon/station UI
   comes from `vehicle-weapon-mount-panel.hbs`, reading `vehiclePanels.
   weaponMountPanel`, not `derived.attacks`/`actions`).
2. `character-sheet.js` has an attacks-fallback-rescue mechanism
   (`_buildAttacksFallback`, called at line ~3390) that reconstructs an
   attacks list from equipped weapons when `derived.attacks.list` is
   missing — exactly the kind of second-order consumer that could
   silently negate this fix. Traced its call site: it lives *after* the
   `useVehicleSheet` early-return (~line 2850) in `_prepareContext()`, so
   vehicle actors never reach it — confirmed by grepping
   `_prepareVehicleActorSheetContext()`'s entire body (lines 4457–4684)
   for any attack/action reference: **zero matches.**
   `VehicleRulesAdapter.buildAllRuleContexts()` and `buildVehicleSheetContext()`
   were also checked directly: neither reads `derived.attacks`/`actions`.
   The two debug/diagnostic readers found (`sheet-diagnostics.js`,
   `scripts/debug/phase-9-runtime-matrix.js`, `scripts/debug/
   actor-contract-inspector.js`) are either purely informational (optional
   chaining, no throw) or explicitly scoped to `actor.type === 'character'`
   only, never invoked against vehicles.

### 9.2 NPC static redundancy review — reclassified: STATICALLY SAFE TO IMPLEMENT (implemented this pass)

Traced the full chain rather than relying on a template grep:
1. `character-sheet.js`'s `PARTS` declares one fixed root template,
   `templates/actors/character/v2-concept/character-sheet.hbs`, used for
   every actor type this sheet class handles.
2. That root template's structure is `{{#if actorSheetMode.useVehicleSheet}}
   ...vehicle-sheet-content.hbs...{{else if actorSheetMode.useNpcConceptSheet}}
   ...npc-concept-content.hbs...{{else}}...[[every `conceptLayout.*`
   reference across 50 template files lives here]]...{{/if}}` — a
   mutually-exclusive Handlebars chain. When `useNpcConceptSheet` is true,
   the `{{else}}` branch (and everything inside it, including every
   `conceptLayout` reference) provably never evaluates.
3. `useNpcConceptSheet = actor.type === 'npc' && !isPromotedHeroicNpcActor(actor)`
   (`actor-sheet-mode.js`) — independent of `calculationMode`
   (progression/statblock/follower), so this covers every standard
   (non-promoted) NPC actor.
4. `buildNpcConceptSheetContext()` (`npc-sheet-helpers.js`, the function
   that produces `context.npcConcept`, which `npc-concept-content.hbs` and
   its partials *do* read) receives `conceptLayout` as an input option but
   — grepped its entire 1,257-line file — never references it.
5. `buildConceptSheetViewModel()` itself (`concept-context.js`, 1,971
   lines): grepped for `.update(`, `.setFlag`, `Hooks.call`,
   `.create(`/`.delete(` — zero matches, consistent with a pure
   context-shaping function. (Not independently traced through every
   helper it calls, so this one link is INFERRED rather than fully
   exhaustively proven — a genuinely hidden side effect several calls deep
   would not have been caught by this grep.)
6. No JS-side consumer (`_onRender`, listener setup) reads `conceptLayout`
   — grepped `character-sheet.js` for the identifier outside the
   declaration/consumption sites already covered above.

**Implemented**: `scripts/sheets/v2/character-sheet.js` — the
`buildConceptSheetViewModel()` call is now guarded:
`useNpcConceptSheet ? null : ActorPerfDiagnostics.time(...)`. Nothing
upstream of the call (combatStatus/effectiveDefenses/etc. construction) was
touched, keeping the change narrow. Test:
`tests/npc-concept-layout-skip.test.mjs` — a source-text contract test
(following the established pattern for this un-importable-under-Node file,
see `tests/dsp-engine-consolidation.test.mjs`) that (a) asserts the guard
exists, (b) asserts `buildNpcConceptSheetContext` still never reads
`conceptLayout` — re-checked every future change to this fix's safety
argument, and (c) asserts the root template's mutually-exclusive branch
structure and `npc-concept-content.hbs`'s non-use of `conceptLayout` are
preserved.

**Structural reduction**: for every non-promoted NPC actor render, the
entire `buildConceptSheetViewModel()` execution (a ~1,971-line function,
previously invoked unconditionally regardless of actor type) is now
skipped — the largest single structural reduction in the Phase 3 track.

### 9.3 Droid static redundancy review — PROBABLY SAFE, KEEP DEFERRED (not implemented)

Built the required per-panel equivalence table. `DroidSheetContextBuilder`
constructs its own second `PanelContextBuilder` instance:
`new PanelContextBuilder(actor, { isEditable: actor?.isOwner === true })` —
note the *second* constructor argument is a bare `{ isEditable }` object,
not the real sheet instance the main loop's builder receives
(`new PanelContextBuilder(this.document, this)`, i.e. `this.sheet` = the
actual `ActorSheet` there).

| Panel | Second-pass call | Transformed after? | `this.sheet` dependency | Consumer | Safe to reuse main-loop copy? |
|---|---|---|---|---|---|
| `healthPanel` | `this.panelBuilder.buildHealthPanel()` | No | `this.sheet.isEditable` only (×3 sites) | `droidSheetContext.healthPanel`, `quickGlance` | Probably — pending `isEditable` equivalence (below) |
| `defensePanel` | `this.panelBuilder.buildDefensePanel()` | No | `this.sheet.isEditable` (×2) + `getRecentHydrationMutation(this.sheet)` | `droidSheetContext.defensePanel`, `quickGlance` | Probably — the `getRecentHydrationMutation` divergence is diagnostic-log-only, confirmed not present in the returned `panel` object |
| `secondWindPanel` | `this.panelBuilder.buildSecondWindPanel()` | No | `this.sheet.isEditable` (×3) | `droidSheetContext.secondWindPanel` | Probably — same `isEditable` caveat |
| `biographyPanel` | `this.buildBiographyPanel()` → `this.panelBuilder.buildBiographyPanel()` | **Yes** — overwrites `identity.class/species/profession/homeworld` with droid-specific fields (`droidType`/`droidModel`/`manufacturer`) | n/a (post-processing, not `this.sheet`) | `droidSheetContext.biographyPanel` | **Not directly** — reuse would require re-applying this transform on top of the cached main-loop panel |
| `abilitiesPanel` | `this.buildAbilitiesPanel()` → `this.panelBuilder.buildAbilitiesPanel()` | **Yes** — filters out the `'con'` ability entry | n/a | `droidSheetContext.abilitiesPanel`, plus `abilities`/`derived.identity.abilities` derived from it | **Not directly** — same, and the main loop doesn't even guarantee building `abilitiesPanel` every render (`abilitiesPanel` is absent from `alwaysHydratedPanels`; it's only built if `visibilityManager.getPanelsToBuild()` dynamically selects it for the active tab) |

The `isEditable` equivalence question: Droid's second builder computes it as
a bare `actor?.isOwner === true` check; the main loop's builder gets it from
the real sheet's inherited `ActorSheet`/`DocumentSheet` `isEditable` getter
(no local override in `character-sheet.js`), which is Foundry framework
code this repo doesn't define and can layer in additional permission/lock
logic beyond plain ownership. This one link is **NOT VERIFIED** without
either reading Foundry's core source or a live check.

**Classification: PROBABLY SAFE — KEEP DEFERRED.** 2 of 5 panels require a
real, non-trivial transform layer on top of any reused value (not a
"narrow" reuse); the other 3 depend on an `isEditable`-equivalence
assumption this pass could not fully verify. Not implemented this pass —
consistent with the brief's "only implement if equivalence is provable."

### 9.4 Diagnostic label commit (`18589f1`) review

Confirmed: all label changes in that commit are string arguments to
`ActorPerfDiagnostics.recordSheetContext(label, ms)` calls only — no
control flow, condition, or test anywhere in the repo branches on the old
label strings (`'droid'`/`'npc'`/`actor.type` directly). Grepped for any
other reference to the old label strings as diagnostic keys: none found
outside the changed call sites. Purely additive/renaming, gated behind the
existing disabled-by-default `performanceDiagnostics`/`debugMode` setting.
The live benchmark procedure (`docs/audits/v2-phase-3-live-benchmark-procedure.md`)
remains in the repo unchanged in content, with its role downgraded from
"the Phase 3 gate" to "recommended future validation" per §5 above.

### 9.5 Authority boundary re-confirmation

Every change in this static closure pass (the NPC guard in
`character-sheet.js`, the two test files) was checked against the Phase 2
exclusion list: none read or write Droid armor/processor/credits/degree
fields, none read or write Vehicle SR/weapon-mount fields, and none
establish a new canonical representation for any of them through a cache
or signature projection. The NPC guard only affects `conceptLayout`
computation gated on `actor.type === 'npc'`, which is disjoint from Droid's
`isDroidActor` branch — Droid rendering is completely unaffected by it.

### 9.6 Performance claim quality (separated per the brief's categories)

| Claim | Category |
|---|---|
| ModifierEngine signature calls 5 → 1 per `computeAll()` cycle | TEST VERIFIED (`tests/modifier-engine-signature-reuse.test.mjs`, Test 3, a call-count spy) |
| DerivedCalculator signature calls 2 → 1 per async pass | TEST VERIFIED (`tests/derived-calculator-signature-reuse.test.mjs`) |
| Species-item filter 3 → 1 (common case) | STRUCTURALLY VERIFIED (no live writer makes the regression case reachable — §9.1) |
| Vehicle `mirrorAttacks`/`mirrorActions` dead work eliminated | STRUCTURALLY VERIFIED (exhaustive reachability proof, §9.1) |
| NPC `buildConceptSheetViewModel()` skip (~1,971 lines) | STRUCTURALLY VERIFIED (template branch-exclusivity proof + unused-parameter proof, §9.2) |
| Actual milliseconds saved, any fix | REQUIRES LIVE TIMING — not claimed anywhere in this document |
| Droid double-panel-build reduction | NOT IMPLEMENTED — equivalence not fully provable (§9.3); no performance claim made |

### 9.7 CI re-confirmation

`node tools/run-rolling-syntax-check.mjs` — 2236/2236 pass (was 2235; +1 new
test file). `node tools/run-rolling-tests.mjs` — 127 passed, 1 failed (128
run, 5 documented exclusions); the 1 failure is the same
`progression-suggestion-and-render-contracts.test.mjs` / `lang/en.json` gap,
re-confirmed unchanged. 2 new test files added this pass:
`tests/npc-concept-layout-skip.test.mjs` (Phase 3B guard contract) — the
other new file from the live-benchmark pass
(`docs/audits/v2-phase-3-live-benchmark-procedure.md`) is documentation,
not a test.

### 9.8 Final static-closure verdict

**PHASE 3 COMPLETE — STATICALLY VERIFIED WITH DOCUMENTED RUNTIME
FOLLOW-UP.** All shipped optimizations (the original 5, plus the Phase 3B
NPC guard) are statically safe per direct dataflow tracing and/or
passing automated tests. The two residual items (Fix #2's narrow
concurrent-mutation edge case, and the Droid double-panel-build finding)
are documented, non-blocking (narrow/self-correcting or simply not
implemented), and carried forward as runtime follow-up rather than
treated as an open correctness question.

**GATE: PHASE 4 MAY BEGIN — RUNTIME SMOKE TEST DEFERRED.**
