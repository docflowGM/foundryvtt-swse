# V2 Derived / Panel-Cache Coherency — Root-Cause Fix

**Scope:** surgical cache-coherence correction only. DefenseCalculator's
formula was independently reproduced and confirmed correct before any code
was touched (see "Golden path proof" below) and was not modified.

## 1. Root cause

Two independent, confirmed defects, both traced to the June 29 cache-pass
optimization work, both rooted in the same underlying category error:
**treating "the persisted actor/item revision is unchanged" as equivalent to
"the runtime `system.derived` output is unchanged."** Those are different
facts — `system.derived` is Foundry's ephemeral prepared-data output,
recomputed (and sometimes reset) on every `prepareDerivedData()` cycle, and
never bumps `actor._stats.modifiedTime`.

### 1a. Panel view-model cache (`actor-sheet-base.js`)

`_buildPanelViewModelCacheSignature(actor)` keyed a cached panel off actor/item
`_stats.modifiedTime`, equipped/quantity/uses/ammo, editability, help level,
and shell surface — never off `system.derived` itself. Sequence:

```
source revision = R
  -> early sheet render (pre-async system.derived: defaults)
  -> defensePanel built showing Fort/Ref/Will = 10/10/10, zeroed rows
  -> cached under key derived from R
  -> DerivedCalculator finishes; system.derived corrected (23/24/20)
  -> corrective render requested
  -> source revision is STILL R -> cache signature unchanged -> cache HIT
  -> stale 10/10/10 panel reused; buildDefensePanel() never re-runs
```

### 1b. Async "already applied" short-circuit (`base-actor.js`)

`SWSEV2BaseActor._computeDerivedAsync()` treated "I computed source signature
S at some point" (an actor-INSTANCE-level flag,
`_swseDerivedAsyncAppliedSignature`) as proof that "the CURRENT
`system.derived` destination still holds S's result." Foundry can
reconstruct/reset `system.derived` (e.g. `this.system` gets rebuilt fresh by
a later `prepareData()` pass) without changing the actor's persisted source
signature at all. The instance-level flag survives that reset untouched
(it lives on the actor object, not inside `system.derived`), so the old code
would skip reapplication forever, for as long as the source stayed
unchanged — leaving the freshly-reset, empty `system.derived` in place.

## 2. Fail-before proof

Both defects were reproduced against the actual, unmodified production code
(not a reimplementation) before any fix was written, by temporarily
reverting the fix and re-running the new regression tests:

- **Test A** (`tests/v2-derived-panel-cache-coherency.test.mjs`): with the
  pre-fix `_buildPanelViewModelCacheSignature`, a panel cached from a
  pre-async render (Fort/Ref/Will = 10/10/10) was still returned by
  `_getCachedPanelViewModel` after `system.derived` was corrected to
  23/24/20 on the same actor/item revision. Assertion failure observed:
  `wasCacheHit === true` where `false` was required.
- **Test B** (`tests/v2-derived-async-applied-signature-coherency.test.mjs`):
  with the pre-fix `_computeDerivedAsync`, after `system.derived` was reset
  (simulating a Foundry-level prepare-cycle reconstruction) while the
  persisted source signature stayed identical, a second
  `_computeDerivedAsync()` call left `system.derived.defenses` empty
  forever — the instance-level `_swseDerivedAsyncAppliedSignature === S`
  check short-circuited before `DerivedCalculator.computeAll()` ever ran
  again. Assertion failure observed on
  `system.derived.meta.appliedSignature` (the marker didn't exist under the
  old code at all).

Both failures were captured by running the new test files against the
production code with the fix files stashed out, then restoring the fix and
confirming the same tests pass. No test in this fix reimplements
`DefenseCalculator`, `DerivedCalculator`, `ActorEngine`, or
`PanelContextBuilder` — every assertion runs the real, imported production
function.

## 3. The fix: one coherent invalidation authority

New module: `scripts/actors/derived/derived-generation.js`. It stamps a
monotonically increasing, **runtime-only** generation marker directly inside
`system.derived.meta` (never onto persisted source, never as a
separately-tracked instance counter) whenever either derived-write path
applies an authoritative snapshot:

- `SWSEV2BaseActor._computeDerivedAsync()` — stamps when `changed === true`
  (a per-field value actually differs from the current destination).
- `ActorEngine._applyDerivedUpdates()` — stamps on every real merge (called
  from `recalcAll()`'s deliberate, mutation-driven recompute).

Both paths use the exact same `stampDerivedGeneration()`/
`getDerivedGeneration()`/`getDerivedAppliedSignature()` helpers — a single
shared counter, not two independent ones that could drift.

### Why a destination-anchored stamp, not an instance-level flag

The marker (`system.derived.meta.generation`, `system.derived.meta.appliedSignature`)
lives **inside** `system.derived` itself, not on the actor instance. That is
what makes it self-healing: when Foundry reconstructs/resets
`system.derived` independent of the persisted source signature, the stamp is
wiped along with everything else, so:

- `_computeDerivedAsync()`'s entry check
  (`getDerivedAppliedSignature(this) === signature`) correctly reads "no
  marker" and falls through to `DerivedCalculator.computeAll()` again —
  which is cheap, because DerivedCalculator's own signature-keyed result
  cache still holds S's authoritative output (proven by Test B: zero
  additional `ModifierEngine.getAllModifiers()` calls on reapplication).
- `_buildPanelViewModelCacheSignature()` reads the same
  `system.derived.meta.generation` value; a reset (or a genuine correction)
  changes it, so a panel cached against the old generation cannot survive.

An instance-level flag cannot make this distinction — that was exactly the
bug in 1b.

### Why in-flight deduplication remains safe

`_swseDerivedAsyncInFlightSignature` is intentionally left as an
actor-instance field. Its only job is coalescing two concurrent calls
against the same live actor instance within the same tick — a case where
`system.derived` cannot have been reset between the two calls (nothing has
had a chance to run yet). Test B's second case proves two concurrent
same-signature calls still collapse into one `ModifierEngine` pass.

### Why the old "already applied" shortcut was unsafe

It answered a different question than the one that matters. "Did I compute
S once" says nothing about whether the current destination still reflects
it. The fix replaces that question with "does the CURRENT destination
already reflect S" — answered by reading `system.derived.meta.appliedSignature`
back off the live destination, exactly per the required behavior:
DerivedCalculator cache HIT → reapply against current `system.derived`,
never a blind "signature seen before, skip".

## 4. Panel-cache-hit retention proof (performance preserved)

Test D (`tests/v2-derived-panel-cache-coherency.test.mjs`, second block)
spies on the real panel builder call and proves:

- First render → builder runs (cache miss, nothing cached yet).
- Unchanged next render (same actor/item revision, same derived generation,
  same UI state) → cached result reused, builder does **not** run again.
- A new derived generation (even one that happens to produce identical
  totals) → builder runs again, proving invalidation is live, not simply
  "always miss."

This confirms the fix does not degrade to "disable all panel caching."

## 5. Golden path proof

Test C (`tests/v2-golden-defense-lifecycle.test.mjs`) exercises the real
production chain end to end for the golden case (Scout 1 / Soldier 7, DEX 18
/ CON 17 / WIS 14, level 8):

```
SWSEV2BaseActor.prototype._computeDerivedAsync()
  -> DerivedCalculator.computeAll()
  -> DefenseCalculator.calculate()          <- untouched, real formula
  -> system.derived.defenses.* (authoritative)
  -> PanelContextBuilder.buildDefensePanel() <- untouched, real builder
  -> effective defense display model
```

Result: Fortitude 23 (heroic 8, class 2, CON +3), Reflex 24 (heroic 8, class
2, DEX +4), Will 20 (heroic 8, class 0, WIS +2) — matching the problem
statement's golden case exactly, both in the authoritative
`system.derived.defenses` snapshot and in the final panel display model.
`DefenseCalculator` was never edited; this test is proof of that, not an
assumption.

## 6. Adjacent derived-panel findings (BAB / Grapple / Initiative)

The panel view-model cache signature is actor-wide, not defense-specific:
`_buildPanelViewModelCacheSignature()` is the single signature every panel
builder method in `PanelContextBuilder` is keyed against
(`character-like-sheet.js`'s panel-build loop). The adjacent-panel audit
block in `tests/v2-derived-panel-cache-coherency.test.mjs` proves the same
generation-aware signature changes when BAB/Grapple/Initiative-shaped
`system.derived` content is corrected on an unchanged actor/item revision —
i.e. **any** panel consuming `system.derived` through this cache
(`resourcesPanel`, which surfaces BAB/Grapple/Initiative, included) is
automatically covered by this fix. Classification:

- **Automatically fixed by the common correction:** `defensePanel`,
  `resourcesPanel` (BAB/Grapple/Initiative), and every other panel built
  through `character-like-sheet.js`'s shared `_buildPanelViewModelCacheSignature`
  / `_getCachedPanelViewModel` / `_setCachedPanelViewModel` cache — the fix
  is at the shared signature, not per-panel.
- **Separately unaffected, not investigated further (out of scope for this
  fix):** the combat-action-economy cache
  (`_buildCombatActionCacheKey`/`_getCachedCombatActionContext`,
  `actor-sheet-base.js`). It is a genuinely separate cache keyed on item
  state + action-economy turn state (standard/move/swift/reactions/combat
  id/turn/round), not on `system.derived` combat totals directly. Whether it
  has an analogous staleness risk was not investigated — flagged here for a
  future, separately-scoped look rather than folded into this fix or
  guessed at.
- **Skill totals / health:** both are also derived through the same shared
  panel cache (`skillsPanel`, `healthPanel`) and are therefore covered by
  the same generation stamp; not given a dedicated regression test here
  beyond the general non-defense assertion above, per the instruction to
  avoid an arbitrary per-panel invalidation list.

No manual per-panel invalidation list (`defensePanel`, `skillsPanel`,
`resourcesPanel`, ...) was introduced — the shared signature is the single
invalidation authority, as required.

## 7. Files changed

- `scripts/actors/derived/derived-generation.js` (new) — shared runtime-only
  derived-generation authority.
- `scripts/actors/v2/base-actor.js` — `_computeDerivedAsync()`: destination-
  anchored "already applied" check; stamps generation on real change.
- `scripts/governance/actor-engine/actor-engine.js` — `_applyDerivedUpdates()`
  stamps generation on every real merge; `recalcAll()` (and the progression
  finalize call site) compute and pass the signature through.
- `scripts/sheets/v2/actor-sheet-base.js` — `_buildPanelViewModelCacheSignature()`
  folds `system.derived.meta.generation` into the cache key.
- New tests: `tests/v2-derived-panel-cache-coherency.test.mjs` (Test A + Test
  D + adjacent-panel audit), `tests/v2-derived-async-applied-signature-coherency.test.mjs`
  (Test B + in-flight dedup proof), `tests/v2-golden-defense-lifecycle.test.mjs`
  (Test C, golden path).

## 8. Not changed (explicitly out of scope)

`DefenseCalculator` formula/rules, heroic-level rules, class-defense rules,
ability-selection rules, `DerivedCalculator`'s own result cache (proven
still working, not removed), Action Authority work, Damage SSOT work, any
broad sheet refactor. No arbitrary per-panel manual invalidation list was
added.

## 9. Remaining risks / deferred findings

- The combat-action-economy cache (`_buildCombatActionCacheKey`) was
  identified but not audited for an analogous staleness risk — see §6.
- `_computeDerivedAsync`'s per-field `changed` check
  (`_swseDerivedValuesEqual`, a `JSON.stringify` deep-equal) is unchanged by
  this fix; it was already the mechanism deciding whether to bump the new
  generation counter and was not itself in scope.
