# Runtime Cache Coherency Audit — Round 1

Follow-up to `docs/audits/v2-derived-panel-cache-coherency.md` (PR #975).
That fix repaired two caches in the V2 defense/panel path. This audit widens
the search: which OTHER caches introduced (or touched) in the June 29
cache-optimization pass share the same category error — **a cache identity
that omits a semantic input the wrapped computation actually reads** — and
which of those are real, reproducible bugs versus merely theoretical risk.

**Scope of this round:** four targets, in dependency order, each carried
through the same contract before any production code changed:

```text
computation reads
       ↓
semantic inputs
       ↓
cache identity (as committed)
       ↓
invalidation sources (as committed)
```

A target was only fixed once a REAL fail-before test (real, imported,
unmodified production code — no reimplementations) proved the cache could
serve a wrong answer. Every fix below was verified fail-before (reverted,
test fails) and pass-after (restored, test passes) against the actual
committed code, the same discipline used in the PR #975 audit.

No cache in this round was "fixed" by blindly stapling
`derivedGeneration` onto its key. Each fix is the smallest correct change
for what that specific cache's computation actually reads.

---

## Target 1 — TalentStep Block/Deflect membership cache (CONFIRMED, fixed)

**File:** `scripts/apps/progression-framework/steps/talent-step.js`
**Cache:** `TalentStep._treeTalentCache` (`_getTalentsForTreeCached()`)

| | |
|---|---|
| Computation reads | `getTalentMembership(tree)` (registry, static) + `HouseRuleTalentCombination.processBlockDeflectCombination(talents)` (live world setting) |
| Semantic inputs | tree identity, `blockDeflectTalents` house-rule mode (`'separate'` \| `'combined'`) |
| Cache identity (pre-fix) | tree identity ONLY |
| Invalidation (pre-fix) | reset on `TalentStep` construction and `onStepEnter()` only — never on a settings change |

**Bug:** a GM can flip `blockDeflectTalents` while a player has this exact
tree already open/cached. Re-querying the same tree serves the stale
pre-flip membership list (separate `Block`/`Deflect` instead of the combined
`Block/Deflect` entry, or vice versa) until the step is torn down and
re-entered.

**Fix:** added a public `HouseRuleTalentCombination.getBlockDeflectMode()`
accessor and folded it into the cache key:
`${treeIdentity}::${HouseRuleTalentCombination.getBlockDeflectMode()}`.

**Fail-before proof:** `tests/talent-step-block-deflect-cache-coherency.test.mjs`
— extracts the real `_getTalentsForTreeCached()` method body from committed
source (talent-step.js cannot be imported directly under this repo's
Node/Foundry-shim harness — it transitively imports `FeatChoiceDialog`, an
`ApplicationV2` subclass) and executes it via `new Function` against the
real, imported `HouseRuleTalentCombination.processBlockDeflectCombination()`.
Reverting the fix reproduces the exact failure: re-querying the same tree
after flipping the setting still returns `['Block', 'Deflect']` instead of
`['Block/Deflect']`. Cache-retention is also proven: an unchanged mode still
reuses the cached entry (no rebuild), and a mode change rebuilds exactly
once.

---

## Target 2 — AbilityEngine acquisition cache (HIGH RISK, confirmed, fixed)

**File:** `scripts/engine/abilities/AbilityEngine.js`
**Cache:** `AbilityEngine._acquisitionCache` (`evaluateAcquisition()`)

| | |
|---|---|
| Computation reads | `PrerequisiteChecker.check*Prerequisites()` → for an ability-score prerequisite, `SchemaAdapters.getAbilityScore(actor, key)`, whose FIRST-preference authority is `system.derived.attributes[key].total` |
| Semantic inputs | persisted actor/item revision, AND the runtime derived ability snapshot (`system.derived.attributes`) |
| Cache identity (pre-fix) | persisted revision + item signature ONLY — no `system.derived` awareness at all |
| Invalidation (pre-fix) | `clearAcquisitionCache()`, called by a hand-maintained list of house-rule-change hooks — never by a derived-state change |

**Bug:** `system.derived.attributes` is written asynchronously by
`SWSEV2BaseActor._computeDerivedAsync()` / `ActorEngine._applyDerivedUpdates()`
(the exact pipeline PR #975 fixed) and can lag behind — or be corrected
after — an ability-score change (e.g. an ActiveEffect enhancement bonus,
applied onto prepared data before `prepareDerivedData()` runs, well before
that value propagates into `system.derived`). Neither the AE application nor
the derived recompute touches the actor's persisted revision. A legality
verdict cached while `system.derived.attributes` was stale therefore
survives forever once the correction lands, for as long as the actor/item
revision stays the same — exactly the defect class fixed for the panel
cache, now reproduced against `AbilityEngine.evaluateAcquisition()` itself.

**Fix:** folded the shared, runtime-only `getDerivedGeneration(actor)` stamp
(from PR #975's `derived-generation.js` — reused, not duplicated) into
`_actorCacheSignature()`.

**Fail-before proof:** `tests/ability-engine-acquisition-cache-derived-coherency.test.mjs`
— real `AbilityEngine.evaluateAcquisition()` against a real
`PrerequisiteChecker` structured ability prerequisite (`{type:'attribute',
ability:'dex', minimum:15}`). DEX 14 → `legal:false`, cached. DEX corrected
to 16 (both `system.attributes` and `system.derived.attributes` updated,
generation stamped) on the SAME actor/item revision → re-evaluating must
report `legal:true`. Reverting the fix reproduces the stale `false` verdict.
Cache-retention proven: unchanged actor/generation still reuses the cached
verdict (`PrerequisiteChecker.checkFeatPrerequisites` spy shows exactly one
real call across two evaluations).

---

## Target 3 — CandidatePoolBuilder eligibility cache (HIGH RISK, confirmed, fixed)

**File:** `scripts/engine/suggestion/CandidatePoolBuilder.js`
**Cache:** `CandidatePoolBuilder._candidatePoolCache` (`build()`)

| | |
|---|---|
| Computation reads | `AbilityEngine.canAcquire()` per candidate (`_filterHeroicFeats()` / `_filterTalentCandidates()`) |
| Semantic inputs | actor/item revision, candidate-list identity, AND the same runtime derived-generation `AbilityEngine`'s own answer depends on |
| Cache identity (pre-fix) | actor/item revision + slot context + candidate list ONLY |
| Invalidation (pre-fix) | none observing derived state; no `clearCandidatePoolCache()` equivalent to `AbilityEngine.clearAcquisitionCache()` |

**Bug — the "parallel cache authority" risk:** this cache sits in FRONT of
`AbilityEngine.canAcquire()`. A cache HIT here never re-consults
`AbilityEngine` at all. Fixing Target 2 alone is therefore not sufficient:
even after `AbilityEngine` itself correctly reports a candidate as legal
following a real derived correction, `CandidatePoolBuilder.build()` can
still return the stale, pre-correction filtered list, because ITS OWN cache
key never changed. Two independently-plausible caches, only one of which
(after Target 2) observes the input that actually changed.

**Fix:** folded the same shared `getDerivedGeneration(actor)` stamp into
`CandidatePoolBuilder._actorCacheSignature()` — one invalidation authority
shared by both layers, not two that can drift apart.

**Fail-before proof:** `tests/candidate-pool-builder-derived-coherency.test.mjs`
— real `CandidatePoolBuilder.build()` with a real `AbilityEngine.canAcquire()`
call chain (`slotContext: {slotKind:'feat', slotType:'heroic'}` →
`_filterHeroicFeats()`). DEX 14 → candidate excluded, pool cached empty. DEX
corrected to 16 on the same actor/item revision (verified via a direct
`AbilityEngine.canAcquire()` sanity check that Target 2's fix already
reports `legal:true`) → `CandidatePoolBuilder.build()` must now include the
candidate. Reverting the fix reproduces the stale empty pool. Cache-retention
proven via a spy on `AbilityEngine.canAcquire`: unchanged actor/generation
reuses the cached pool without re-consulting `AbilityEngine`.

---

## Target 4 — SnapshotBuilder ability-score extraction (HIGH RISK, confirmed, fixed — worse than staleness)

**File:** `scripts/engine/suggestion/SnapshotBuilder.js`
**Function:** `SnapshotBuilder._extractAbilityScore()` (feeds the
suggestion-cache fingerprint's `attributes` component, `SuggestionService`'s
snapshot hash)

This one is not a stale-cache defect — it is a **wrong-authority read**,
confirmed to be strictly worse:

```js
// pre-fix
const attr = actor?.system?.attributes?.[ability];
const ab = actor?.system?.abilities?.[ability];
for (const value of [attr?.total, attr?.value, attr?.score, attr,
                      ab?.total, ab?.value, ab?.score, ab]) { ... }
```

The canonical schema is `system.attributes.<key> = {base, racial,
enhancement, temp}` — there is no `.total`/`.value`/`.score` field on that
object, and `Number(attr)` (the whole component object) is `NaN`. The loop
then falls through to `system.abilities`, a legacy compatibility mirror a
modern, canonical-schema-only actor never populates. **Verified directly:**
building a snapshot for a completely normal actor (DEX 18 / CON 17 / WIS 14
— the same schema as PR #975's golden-path fixture) produces
`attributes: {str:0, dex:0, con:0, int:0, wis:0, cha:0}` — every ability,
always, for every actor using the canonical schema. This is not an edge
case; it is the universal case for a modern V2 actor.

**Consequence:** the suggestion-cache fingerprint's ability component is a
constant. Two actors with genuinely different scores collide onto the same
fingerprint; a real ability-score change (attribute boost, ActiveEffect,
level-up allocation) never changes it either. Any ability-driven suggestion
scoring reading `snapshot.attributes` sees zeroes for every actor, always.

**Fix:** delegate to the same canonical authority `PrerequisiteChecker` and
`DefenseCalculator` already use — `SchemaAdapters.getAbilityScore(actor,
ability)` — instead of a second, independent, broken reconstruction.

**Fail-before proof:** `tests/snapshot-builder-ability-authority.test.mjs`
— builds a real snapshot via `SnapshotBuilder.build()` for a canonical-only
actor and asserts the DEX/CON/WIS components equal
`SchemaAdapters.getAbilityScore()`'s real output (18/17/14), not the
pre-fix's universal 0. Also proves two actors differing only in DEX (10 vs
18) now produce different snapshot hashes — pre-fix, they collided.

---

## Deferred, NOT fixed this round (documented, not silently dropped)

Per the reviewer's explicit direction, this round stops after the four
targets above. Two related risks were identified but are deliberately out
of scope:

- **AbilityEngine house-rule settings gap.** `PrerequisiteChecker` consumes
  several house rules (e.g. `prestigeClassLevelThreshold`) that are not
  represented in `AbilityEngine._actorCacheSignature()` at all. A hand
  -maintained subset of settings (`weaponFinesseDefault`,
  `pointBlankShotDefault`, `powerAttackDefault`, `preciseShotDefault`,
  `dodgeDefault`, `armoredDefenseForAll`) already explicitly call
  `clearAcquisitionCache()` on change, but this is not systematic — a
  settings-consuming prerequisite outside that hand-maintained list can
  still go stale after a house-rule change with no revision/generation
  change to invalidate it. This needs an audit of every setting
  `PrerequisiteChecker` reads, not a one-off fix, and was not attempted here.
- **Combat-action-economy cache** (`_buildCombatActionCacheKey` /
  `_getCachedCombatActionContext`, `actor-sheet-base.js`) — flagged in the
  PR #975 audit as having no confirmed production consumers wiring it back
  in; not re-investigated this round either. Still uncertified.

Both are recorded here so they are not rediscovered as a surprise; neither
was touched.

## Caches audited and cleared (no change made)

- **RowTransformers** (inventory/armor/feat/talent/maneuver rows) — key
  includes the actual persisted values it renders (revision, name, image,
  equipped, quantity, uses, ammo, activation flags, editability); does not
  read `system.derived`. Kept as-is.
- **CompendiumResolver** — caches static compendium-content identity
  (domain + pack + normalized name → document). Not analogous to a
  runtime-derived staleness risk. Kept as-is.
- **ProgressionShell render-scheduler memoization** — explicitly job-scoped
  (one render job only), never persists across actor revisions or future
  render jobs. Correct use of caching by design. Kept as-is.
- **ProgressionReconciler cache** — key already includes actor revision,
  level, item revision data, and ActiveEffect revision/disabled state; also
  has an intentional last-known-good fallback contract. Not touched without
  evidence of a gap.

---

## Files changed this round

- `scripts/houserules/houserule-talent-combination.js` — added
  `HouseRuleTalentCombination.getBlockDeflectMode()` public accessor.
- `scripts/apps/progression-framework/steps/talent-step.js` —
  `_getTalentsForTreeCached()` folds the house-rule mode into its cache key.
- `scripts/engine/abilities/AbilityEngine.js` — `_actorCacheSignature()`
  folds in `getDerivedGeneration(actor)` (from PR #975's
  `derived-generation.js`, reused).
- `scripts/engine/suggestion/CandidatePoolBuilder.js` —
  `_actorCacheSignature()` folds in the same `getDerivedGeneration(actor)`.
- `scripts/engine/suggestion/SnapshotBuilder.js` —
  `_extractAbilityScore()` now delegates to `SchemaAdapters.getAbilityScore()`.
- New tests: `tests/talent-step-block-deflect-cache-coherency.test.mjs`,
  `tests/ability-engine-acquisition-cache-derived-coherency.test.mjs`,
  `tests/candidate-pool-builder-derived-coherency.test.mjs`,
  `tests/snapshot-builder-ability-authority.test.mjs`.

## Not changed (explicitly out of scope this round)

Any broader systematic pass over every setting `PrerequisiteChecker` reads;
the combat-action-economy cache; `RowTransformers`/`CompendiumResolver`/
`ProgressionShell` render-scheduler/`ProgressionReconciler` (audited,
cleared, not modified); any DefenseCalculator/DerivedCalculator math;
Action Authority work; Damage SSOT work; broad refactors.
