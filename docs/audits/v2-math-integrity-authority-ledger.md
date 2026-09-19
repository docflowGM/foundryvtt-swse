# V2 Math Integrity Freeze — Mechanical Authority Ledger

Effective start of the Math Integrity Freeze. No feature expansion, no new
mechanics, no new automation until the domains below are certified per
Phase 14 of the freeze charter (see PR description).

## Freeze start record

| Field | Value |
|---|---|
| Starting branch | `claude/ability-schema-authority-migration` (PR #971) |
| Starting SHA | `91e37e37b90c41318ee8230c54096c5fb2899765` |
| Working tree state at start | Clean (no uncommitted changes) |
| New branch | `claude/v2-math-integrity-freeze` |
| Parent PR / base | #971 (`claude/ability-schema-authority-migration`), which is itself based on #970's commit history while targeting `main` |

This branch includes #970's and #971's commits until both merge, exactly
as #971 currently includes #970's. See #971's own PR description for the
verified-ancestry note; the same relationship applies here one level
deeper.

## Governing requirement

> If a player sees a number in a character sheet box, weapon card,
> tooltip, roll dialog, or chat result, we must be able to prove exactly
> why that number exists.

Target shape: `persisted inputs → ONE domain authority → contribution
ledger → derived/static result → sheet/tooltip/roll consumer`.

## Site classification key

- **A** — canonical calculation authority
- **B** — legitimate consumer
- **C** — legitimate contextual resolver
- **D** — duplicate/reimplemented formula
- **E** — compatibility fallback
- **F** — dead/unreachable
- **G** — UI reconstruction
- **H** — unknown / needs tracing

## Status

**Phase 0 (audit) complete. Phase 2 (Gar'ee golden fixture) complete.
Batch 1 implemented, then certification-corrected after review** (a
second review pass found real gaps in the first pass's fixes and
wording — see "Batch 1 certification correction" below). All fixes
currently in this document are tested and passing the full rolling
suite.

Fixed and certified:
1. Grapple roll formula (`houserule-grapple.js`) now reads canonical `system.derived.grappleBonus`, and its fallback now calls `combat-stat-rules.js#resolveGrappleBonus()` — the same canonical formula, not a second known-wrong one. `getGrappleDC()`'s BAB read also corrected to `SchemaAdapters.getBAB()`.
2. Flat-footed Reflex (`defense-calculator.js`) now strips dodge-type bonuses, not just the ability mod.
3. Damage Threshold (`threshold-engine.js#computeBaseThreshold()`) now agrees with the canonical, feat-rule-aware stored value, and `getDamageThreshold()` no longer double-counts a static ModifierEngine DT modifier that's already folded into that canonical value.

**HP is reclassified, not fixed: Gar'ee's `system.hp.max = 108` is CERTIFIED CORRECT** — it is not a defect and must never be reconstructed from current class/level data. The domain's remaining work is a preservation audit ("prove nothing can corrupt 108"), not a formula fix. Two things stand ready to corrupt it if ever triggered: `ActorEngine.recomputeHP()`'s stateless-recompute model (would compute 88 from Gar'ee's real state) and a live-confirmed `ReferenceError` that currently blocks it from writing at all — fixing the crash alone, without also fixing the reconstruction model, would be actively dangerous. See the HP domain section's "Required preservation proofs" and `tests/hp-preservation-authority.test.mjs`.

Remaining confirmed defects (Energy Shield ACP, weapon melee/ranged schema, follower-NPC Fortitude, custom-skill armor/condition gap) are queued for Batch 2.

## Batch 1 certification correction (post-review)

A review of the first Batch 1 pass found:
1. The HP "open question" (Gar'ee's first class item) was answerable from evidence already available and had not been checked — resolved to Soldier by tracing `ActorItemIndex`/`ActorAbilityBridge` directly.
2. The PR/ledger wording claimed a "live-reproduced 20-point HP undercount" — wrong; Gar'ee's persisted `system.hp.max` is 108, not 88. Corrected throughout this document.
3. A second, more severe HP defect was found and live-confirmed: `recomputeHP()` throws a `ReferenceError` on every value-changing call due to a block-scoping bug, currently masking the first defect from ever manifesting.
4. HP's real fix requires an authority-contract decision (additive/historical vs. stateless-recompute), not a multiclass-formula patch — explicitly not attempted in this pass.
5. The Damage Threshold fix introduced a real double-count risk (the canonical base and a re-collected `ModifierEngine` static modifier could both include the same bonus) — found, live-reproduced, and fixed.
6. The Grapple fix's own fallback path was itself a second, known-wrong formula (BAB+STR-only) — replaced with a shared, canonical `resolveGrappleBonus()` resolver instead of a second reimplementation.
7. Flat-footed Reflex was reviewed and confirmed sound as-is — no changes.

All six action items are addressed in this document and in the corresponding commits/tests.

---

## Domain: Abilities / Ability Modifiers

Covered by PR #971 (V2 Ability Schema Authority Migration) — see
`docs/audits/ability-schema-authority-migration-phase3-ledger.md` for the
full ledger. Canonical authority: `SchemaAdapters.getAbilityScore()` /
`getAbilityMod()` (`scripts/utils/schema-adapters.js`). All 33 known
Category C sites (reads that got the fallback order wrong) are fixed as
of that PR. This freeze does not duplicate that work — see this
document's later domains for places that still need to be confirmed
clean of legacy `system.abilities` reads specifically in the context of
BAB/defenses/skills/grapple/attack.

## Domain: BAB

- **A (canonical):** `BABCalculator.calculate()` (`scripts/actors/derived/bab-calculator.js`), called from `DerivedCalculator.computeAll()` (`derived-calculator.js:262`). Uses exact per-class `level_progression` data; `_estimateBabFromProgression()` heuristic (bab-calculator.js:97-103) only fires when exact data is missing.
- Storage: `system.derived.bab`, `system.derived.babAdjustment`; `system.derived.grappleBonus` derives from `bab.total` (derived-calculator.js:356).
- Canonical read: `SchemaAdapters.getBAB(actor)` (schema-adapters.js:439-457).
- **D (duplicate):** `SchemaAdapters.getBAB`'s own fallback (`estimateBabForClass`/`classLevelsFromActor`, schema-adapters.js:100-140) independently re-derives BAB from a class-name regex + `floor(level*0.75)` heuristic — only fires when `system.derived.bab` is entirely absent, but is genuinely separate logic from `BABCalculator` and can diverge for any class name not in its regex list.
- Consumers (B): `base-attack-bonus-rule.js:22`, `combat-roll-math.js:413,471,479` (both via `SchemaAdapters.getBAB`), `character-like-sheet.js:1473-1479` (read-only fallback chain, not a reimplementation).
- **Open question:** should `SchemaAdapters.getBAB`'s fallback call `BABCalculator.calculate()` directly instead of maintaining a parallel heuristic?

## Domain: Reflex / Fortitude / Will Defense

- **A (canonical):** `DefenseCalculator.calculate()` (`scripts/actors/derived/defense-calculator.js:683-914`) computes all three (+flat-footed) together: `10 + levelTerm + classBonus + abilityMod + species + misc + state/active-effect bonus + adjustments + conditionPenalty` (armor replaces the heroic-level term for Reflex, not adds to it). Size modifier for Reflex from single-source `getReflexSizeModifier()` (`combat-stat-rules.js:56-59`).
- Storage: `system.derived.defenses.{fortitude,reflex,will}`, each with a full named-part object (`base,total,adjustment,stateBonus,classBonus,heroicLevel,levelContribution,speciesBonus,miscBonus,armorBonus,abilityKey,abilityMod,conditionPenalty`).
- **D/G (guarded duplicates, lower risk — both prefer the canonical total when finite):**
  - `PanelContextBuilder.js:302-327` (`buildDefensePanel`) — self-documented incomplete fallback (comment admits it's missing at least Psychic Citadel's Will bonus), prefers `derivedDefense.total` when finite.
  - `defense-tooltip.js:255` (`getDefenseBreakdown`) — display-only partial resum missing species/state/condition terms; uses `defense.total || subtotal`, authoritative total preferred, but the *displayed breakdown* could fail to sum to the shown total in edge cases (Psychic Citadel, implant penalties).
- Consumers (B): `character-sheet/context.js:192-199`, `PanelContextBuilder.js:245-403`, `npc-sheet-helpers.js`, `vehicle-context-builder.js`, `character-like-sheet.js:254-330` (`buildEffectiveDefensesViewModel`, applies `CombatStatusResolver.resolveTargetDefense` cover/situational adjustments on top of stored total — legitimate contextual layer, Category C), `rolls/defenses.js:18-22` (marked `DEPRECATED`, reads `.total`), `defense-tooltip.js`.

## Domain: Flat-Footed Reflex — CONFIRMED DEFECT — **FIXED**

`DefenseCalculator.calculate()` (defense-calculator.js:841-844, 896-912):
```js
const flatFootedTotal = Math.max(1, reflexTotal - Math.max(0, reflexAbilityMod));
```
This strips only the positive Dexterity modifier from `reflexTotal`. But `reflexTotal` already includes `refStateBonus` — the sum of ALL passive/state "defense.reflex" modifiers, including **dodge-type bonuses** that SWSE RAW says flat-footed characters lose along with their Dex bonus. Confirmed dodge-type sources feeding this exact channel with no filtering anywhere (`_sumPassiveStateDefenseModifiers`/`_getStateModifiers` in defense-calculator.js, and `ModifierEngine.js`, have zero `dodge`-type handling — grep-confirmed):
- Martial Arts I/II/III (`martial-arts-feat-normalization-hooks.js:67-80`, `type:'dodge', target:'defense.reflex'`)
- Defense Avoidance feat line (`defense-avoidance-feat-normalization-hooks.js:173`, `defense-avoidance-runtime-patches.js:160`)
- Area Explosives, Rebellion Combat, core attack-option feats (all `type:'dodge'`)

**Classification: CONFIRMED (not merely suspected) — a real SWSE rules-correctness bug**, not an architecture/duplication issue. The code comment at the flat-footed calc only discusses the Dex-penalty nuance and never mentions dodge bonuses, indicating this was never deliberately excluded — an oversight, not a design choice.

**FIXED**: `_sumPassiveStateDefenseModifiers()` gained an `onlyDodge` filter (reused, not reimplemented), and `flatFootedTotal` now subtracts the dodge-only subtotal alongside the existing ability-mod subtraction. Live-verified against a real Martial-Arts-I-shaped item (dodge bonus correctly stripped) and a non-dodge control case (correctly preserved). See `tests/flat-footed-dodge-bonus-authority.test.mjs`.

Also flag (not yet fixed, separate from this): `rolls/defenses.js:115-117` (`calculateFlatFooted`) reads `system.derived.defenses.flatFooted` (the whole object) rather than `.total` — needs a call-site check for whether this is a live bug or callers destructure `.total` themselves.

## Domain: Damage Threshold — CONFIRMED DEFECT (two independent formulas) — **PARTIALLY FIXED**

Storage: `system.derived.damageThreshold` (flat number — NOT `derived.damage.threshold`, per an explicit warning comment in `character-like-sheet.js:985`).

- **Path A (persisted authority):** `DerivedCalculator.computeAll()` inline (`derived-calculator.js:838-906`). Honors `MetaResourceFeatResolver.getDamageThresholdRules()` (Improved Damage Threshold's `+5` flat bonus, "use Will as base" feats) and `modifierMap['defense.damageThreshold']`. Sole writer of `system.derived.damageThreshold`.
- **Path B (combat engine, independently recomputes):** `scripts/engine/combat/threshold-engine.js`:
  - `computeBaseThreshold()` (:86-96) reads `defenses.fortitude.total` directly, **ignoring** `MetaResourceFeatResolver` rules entirely.
  - `getDamageThreshold()` (:106-141) runs a **third**, parallel modifier-aggregation path (`ModifierEngine.getAllModifiers` filtered for damage-threshold targets) distinct from Path A's `modifierMap['defense.damageThreshold']`.
  - `calculateDamageThreshold()` (:171-205, used by `evaluateThreshold()` — the actual gameplay/combat consumer): defers to `system.derived?.damageThreshold` when the "Enhanced Massive Damage" house rule is OFF (correct), but **recomputes from scratch** (`fortTotal + heroicLevel + sizeMod`, no feat-rule awareness) when the house rule is ON.

**Classification: CONFIRMED.** Any actor with Improved Damage Threshold, a "use Will as base" feat, or any table with `enableEnhancedMassiveDamage` on can see the sheet-displayed Damage Threshold disagree with the value `ThresholdEngine` actually uses to resolve massive-damage/condition-track-shift checks in combat.

**PARTIALLY FIXED**: `computeBaseThreshold()` (and therefore `getDamageThreshold()`, its live consumer via `damage-resolution-engine.js:277`) now prefers the canonical `system.derived.damageThreshold` when finite, falling back to the raw `fort+size` recompute only when derived data isn't yet populated. Live-verified: an actor with a feat-bonus-inclusive stored value of 25 now correctly returns 25 (previously 20). **Not yet fixed**: `calculateDamageThreshold()`'s separate "Enhanced Massive Damage" house-rule branch (`fortTotal + heroicLevel + sizeMod` when that house rule is ON) still ignores `MetaResourceFeatResolver`'s feat bonuses — left untouched since it's an intentionally different formula (not a duplicate), and reconciling a house-rule-specific formula with feat-rule semantics needs a deliberate decision about intended interaction, not a silent fix. Flagged as a follow-up, not assumed resolved by this batch.

**Certification-correction addendum (post-review):** the first pass of this fix introduced a real double-count risk that a second review caught: `getDamageThreshold()` still unconditionally re-collected `ModifierEngine.getAllModifiers(actor)` and summed any `defense.damageThreshold`-targeted modifier on top of `base` — but `base` (once sourced from the canonical `system.derived.damageThreshold`) **already includes** that exact class of modifier, since `DerivedCalculator`'s `modifierMap['defense.damageThreshold']` is itself built from `ModifierEngine.aggregateAll()`, which internally calls the same `getAllModifiers()`. **Live fail-before proof:** a stored canonical value of 25 (fort 20 + a +5 static modifier, already included) became **30** once `computeBaseThreshold()` started returning the canonical value — the exact double-count the review flagged. **Fixed**: `getDamageThreshold()` now only re-collects and re-adds those static modifiers when `computeBaseThreshold()` had to fall back to the raw `fort+size` formula (i.e. when they were never included in `base` to begin with); when the canonical value is used, they're skipped entirely, since they're already inside it. Both cases (canonical-base/no-re-add and fallback-base/re-add) are live-verified. See `tests/damage-threshold-authority.test.mjs` (tests 4-5).

## Domain: HP / Max HP — CURRENT VALUE: CERTIFIED CORRECT. THIS IS A PRESERVATION AUDIT, NOT A FORMULA AUDIT.

**Second correction to the original Phase 2 writeup** (the first correction, below, already fixed the "20-point undercount" framing — this correction goes further and changes what HP is being audited *for*): Gar'ee's `system.hp.max = 108` is not merely "not currently wrong" — it is **certified correct**, and it must not be treated as something to reconstruct, normalize, or validate against a from-scratch formula at all. 108 is the accumulated result of his real, historical, per-level progression choices (see Defect A below for the exact accounting: starting HP + seven individually-recorded level gains, each using that level's actual class, hit die, and chosen method — rolled/average/maximum). Because those historical choices are real player decisions, **no current-class-and-level summary can safely reconstruct them** — averaging away a chosen "maximum" roll, or assuming a single class's hit die for levels actually gained in a different class, both destroy real information that the persisted history already correctly captured.

**The governing invariant for this domain is therefore:**
```
historical progression HP (locked, additive, never recomputed)
  + current legitimate adjustments (CON-mod rescaling, HP-affecting feats)
  = system.hp.max
```
**not:**
```
current classes + current level + generic hit-die average → reconstruct entire HP history
```

Consequently, this is no longer "fix the HP formula" — it is **"prove nothing can corrupt the certified 108."** The two defects below are reframed accordingly: Defect A is not "HP is sometimes wrong," it is "a specific function's reconstruction model, if it ever runs, computes a wrong value that would corrupt a correct one." Defect B is not "a crash bug to fix in isolation," it is the only thing currently standing between Defect A's reconstruction model and Gar'ee's real actor — removing it without also fixing Defect A would make the system actively worse. See "Required preservation proofs" at the end of this section for what must be demonstrated before any HP code changes, and `tests/hp-preservation-authority.test.mjs` for what has already been proven live.

*(Original first-correction text, kept for the record — the "20-point undercount" framing this superseded):* this section previously said Gar'ee had "a live-reproduced 20-point HP undercount." That was wrong. Verified directly against Gar'ee's actual actor export: `system.hp.max = 108`, and it is **not** currently sitting at 88 — his real HP was never destructively recomputed.

### Open question resolved: `ActorAbilityBridge.getClasses(actor)[0]` is Soldier for Gar'ee

Traced the actual code (not assumed): `ActorItemIndex.build()` (`scripts/adapters/ActorItemIndex.js:19-99`) populates `index.classes`, a `Map`, first from `system.progression.classLevels` (in array order — Gar'ee's is `[Soldier, Scoundrel]`), then from `actor.items` of type `class` via `addClass(...)` → `index.classes.set(key, ...)` (:90-96). A `Map.set()` on an **already-present key** updates its value but does **not** change its insertion-order position — so regardless of item order, the Map's iteration order stays `[Soldier, Scoundrel]`. `ActorAbilityBridge.getClasses()` (`scripts/adapters/ActorAbilityBridge.js:87-112`) iterates that Map directly with `for (const [classId, classLevel] of index.classes)`. **Confirmed: `getClasses(Gar'ee)[0]` = Soldier.** This is no longer an open question.

### Defect A — CONFIRMED, live-executed: `ActorEngine.recomputeHP()`'s stateless-recompute model is incompatible with the real HP authority

The real, currently-correct HP authority is **`scripts/apps/progression-framework/shell/progression-finalizer.js`**, not `ActorEngine.recomputeHP()`:
- Chargen (`:1458-1466`): `system.hp.max` = a one-time computed starting HP.
- Level-up (`:1511-1534`): `nextHpMax = currentHpMax + hpGain`, where `hpGain` is **the player's actual chosen amount for that specific level** (`summary.hpGain`, sourced from whichever method — rolled/average/maximum — was used, recorded verbatim into `system.progression.hpGainHistory` and `lastHpGain`). This is **additive and history-preserving by construction**: each level's class and hit die are correctly used at the moment of that level's gain (confirmed against Gar'ee's own `classLevelHistory`/`hpGainHistory`: level 7 and 8 both show Soldier, hitDie 10, CON mod 2, method "maximum", amount 12, `previousMax: 96 → newMax: 108` — exactly matching `96 + 12 = 108`).

`ActorEngine.recomputeHP()` (`actor-engine.js:3781-3894`) is a **fundamentally different, stateless model**: it discards all of that history and recomputes `hpAtFirstLevel + (level-1)*hpPerLevel + conMod*level + bonusHP + featHPBonus` from scratch, using only the *current* first class item's hit die/progression fields and a flat per-level average (`floor(hitDie/2)+1`) for every level. This is wrong for **any** character with real per-level history, not only multiclass ones — a single-class character who rolled or chose maximum HP at any level would also have that choice silently discarded and replaced with the generic average the instant this function successfully writes.

For Gar'ee specifically (Soldier 6/Scoundrel 2, CON +2, level 8, first class = Soldier per above): `recomputeHP()`'s formula computes `30 + 7*6 + 2*8 = 88`, live-verified against the **real, unmodified** `ActorEngine.recomputeHP()` (imported directly, bypassing this repo's own test-only fake — see Defect B below for how). This would silently overwrite Gar'ee's correct, history-derived 108 with 88 **if it ever successfully ran** — which, per Defect B, it currently cannot.

**Classification: CONFIRMED — `recomputeHP()`'s reconstruction model is the defect; Gar'ee's 108 is not.** Not merely a multiclass-formula gap, and not "Gar'ee currently has 88 HP" — his persisted, certified-correct value remains 108. The finding is precisely and only that this function would produce 88 from his current class/level/CON state if it ever successfully wrote, discarding his legitimate history. **If any function wants to turn Gar'ee into 88, that function is the defect — 108 is not.**

### Defect B — CONFIRMED, live-executed: `recomputeHP()` throws `ReferenceError` on every value-changing call

Found on direct code reading, then reproduced live against the **real, unmodified** `actor-engine.js` (imported via its literal filesystem path rather than the absolute `/systems/foundryvtt-swse/...` specifier this repo's test harness intercepts and redirects to a fake — see `tests/helpers/foundry-shim/path-loader.mjs`'s `OVERRIDES` map, keyed on that exact specifier string only; a relative/direct-path import bypasses it and loads the genuine file):

```js
// actor-engine.js:3820-3829
let conMod = 0;
if (!isDroid) {
  const conSrc = actor.system.attributes?.con ?? actor.system.abilities?.con ?? {};
  const conBase = Number(conSrc.base ?? 10);        // const, block-scoped
  const conRacial = Number(conSrc.racial ?? 0);      // const, block-scoped
  const conEnhancement = Number(conSrc.enhancement ?? 0); // const, block-scoped
  const conTemp = Number(conSrc.temp ?? 0);          // const, block-scoped
  const conTotal = conBase + conRacial + conEnhancement + conTemp;
  conMod = Math.floor((conTotal - 10) / 2);
}
// ... (newHPMax computed, guardrail check) ...
// actor-engine.js:3865-3877 — only reached when newHPMax !== currentMax:
SWSELogger.debug(`ActorEngine.recomputeHP: ${actor.name}`, {
  ...
  conTotal: conBase + conRacial + conEnhancement + conTemp,  // <-- out of scope here
  ...
});
```

`conBase`/`conRacial`/`conEnhancement`/`conTemp` are declared with `const` **inside** the `if (!isDroid) { ... }` block and go out of scope when it closes. The debug-log object at line 3870 — reached only on the branch where `newHPMax !== currentMax`, i.e. **every real HP change** — references them anyway. The early-return "no change" branch (`:3850-3862`) only logs `conMod`, so it doesn't crash; only the value-changing branch does.

**Live-executed, real production code, not a reimplementation** (`ClassesDB` — normally built from a Foundry compendium pack unavailable under this harness — was populated directly for the test, matching the exact shape `ActorAbilityBridge.getClasses()` expects, so the *real* `recomputeHP()` ran unmodified end-to-end):
```
THREW: ReferenceError - conBase is not defined
    at Object.recomputeHP (actor-engine.js:3870:19)
```
A parallel run with `currentMax` set equal to the computed `newHPMax` (forcing the early-return branch) returned normally with no crash, confirming the scope bug is isolated to the value-changing path.

`recomputeHP()`'s own `catch` block (`:3895-3902`) re-throws (`throw err;`) rather than swallowing, but its two hook call sites (`scripts/governance/actor-engine/hp-recompute-hooks.js:267-271, 311-315`) both wrap the call in their own `try/catch` that only logs and continues. **Net effect: every hook-triggered HP recompute that would actually change a value (level change, CON change, HP-bonus change, a class/HP-affecting item added/updated/deleted) currently throws and is silently swallowed, for every actor in the system, not just multiclass ones.** This is very likely *why* Gar'ee's correct 108 has survived: `progression-finalizer.js` writes it directly (bypassing `recomputeHP()` entirely), and any later hook-triggered recompute attempt crashes before it can overwrite that value with Defect A's wrong formula.

**Classification: CONFIRMED, most severe defect found in this audit to date** — it doesn't just make one formula wrong, it makes the entire HP-recompute pipeline non-functional for its stated purpose, silently, for the whole system.

### Why this is not "just multiclass hit dice" — an authority contract is required before any fix

Per explicit project direction: **do not fix HP by looping through current class levels.** The real authority (`progression-finalizer.js`) is fundamentally **additive/incremental with locked-in historical per-level choices** (rolled, average, or maximum HP, decided once at the moment of that level-up and never revisited). `ActorEngine.recomputeHP()`'s model is **stateless/recompute-from-scratch with a generic per-level average**. These two models cannot be reconciled by "use the right hit die" alone — they disagree in kind, not just in formula. Fixing `recomputeHP()` to iterate real per-class hit dice (matching dead-code `HPCalculator.calculate()`'s already-correct multiclass accumulation) would still discard any level where the player rolled or chose maximum rather than average, silently replacing a real (possibly higher or lower) historical value with a generic one.

A closer read of `MetaResourceFeatResolver.getHitPointMaxBonus()` (`meta-resource-feat-resolver.js:155-170`) shows `featHPBonus` supports both a flat `MAX_BONUS` (e.g. Toughness) and a level-scaling `MAX_BONUS_PER_LEVEL` — genuinely recomputable bonus terms, independent of the locked-in per-level base. This suggests the real fix is architectural, not a formula swap: **separate the locked historical base HP (owned exclusively by `progression-finalizer.js`, append-only, never recomputed) from recomputable bonus deltas (CON-mod-driven `bonusHP`, feat-driven `featHPBonus`) that `recomputeHP()` could legitimately reapply on top of that base without ever reconstructing the base itself.** Today `system.hp.max` is a single merged field with no persisted separation between "locked base" and "last-applied bonus," so implementing this cleanly requires either persisting that separation explicitly or deriving it some other way — an actual design decision, not a one-line fix.

Note on item 3 above: SWSE RAW actually *does* say a Constitution modifier change retroactively rescales HP "as if you had that Constitution modifier since 1st level" — so `conMod * level` is not wrong in *kind*, only in combination with a base that (per `hpGainHistory`) already has the *old* CON mod baked into each historical `amount`. Correctly supporting RAW's retroactive-CON rule requires knowing the CON-*free* hit-die-only component of the historical base separately from the applied CON contribution — which isn't persisted separately today. This sharpens, rather than resolves, point 1 above: the required persisted-data shape must separate at least three things — locked hit-die-only history, the CON mod that history should currently be rescaled against, and other recomputable bonus deltas (feats, `hp.bonus`).

**Per explicit instruction: no HP code change in this pass.** Required before implementation (not yet done):
1. Decide the persisted-data shape that lets `recomputeHP()` (or its replacement) apply/reapply bonus deltas — including RAW's retroactive CON rescaling — without ever reconstructing the per-level-accumulated base.
2. Audit `progression.hpGainHistory`/`classLevelHistory` completeness for **legacy actors** who leveled up before these history fields existed (an actor with `system.hp.max` set but empty/partial `hpGainHistory` needs a defined fallback that doesn't equal "recompute from scratch and silently disagree").
3. Confirm the CON-retroactivity nuance above against this codebase's actual intended house rules (it may already deliberately deviate from RAW here — needs a decision, not an assumption either way).
4. Fix Defect B (the scope bug) — but **only together with, or after, Defect A**, never in isolation (see the warning at the end of `tests/hp-preservation-authority.test.mjs`): removing the crash alone would unmask Defect A's destructive overwrite for every actor with real per-level history, not just multiclass ones.

Guard comment confirms the intended single-writer *contract* is sound (`actor-engine.js:618`: "[HP SSOT Violation] system.hp.max may only be written by ActorEngine.recomputeHP()") — the problem is that `recomputeHP()` itself doesn't yet implement a model compatible with the real, additive authority `progression-finalizer.js` already correctly uses.

### Required preservation proofs (per explicit project direction — this replaces "fix the formula" as the domain's task)

Since Gar'ee's 108 is certified correct, the HP domain's remaining work is to prove nothing can corrupt it, not to derive it. Required proofs, with current status:

1. **Ordinary derived-data preparation does not change 108.** ✅ Live-proven: `computeCharacterDerived()` never writes `system.hp.max` at all (grep-confirmed zero occurrences in `derived-calculator.js`) — only mirrors the persisted value, read-only, into `system.derived.hp`. Proven idempotent across repeated prepare passes. See `tests/hp-preservation-authority.test.mjs` (test 1).
2. **Unrelated actor/item mutations do not change 108.** Not yet proven — needs a live-Foundry or fuller-harness test exercising `hp-recompute-hooks.js`'s `needsRecompute`/`itemAffectsHpMax()` gating logic directly (confirm an unrelated field change or a non-HP-affecting item correctly skips calling `recomputeHP()` at all).
3. **Save/reload does not change 108.** Not yet proven under this lightweight harness — needs live-Foundry verification (no persistence layer to exercise here).
4. **A legitimate CON change adjusts max HP by the correct level-scaled delta without replacing historical level gains, and is reversible.** Not yet proven, and **cannot be proven yet** — no code currently implements this correctly (see the CON-retroactivity nuance above); this is a design/implementation gap, not a missing test.
5. **HP feats/species modifiers adjust only the correct component without rebuilding progression HP.** Not yet proven — same status as #4, blocked on the same architectural decision.
6. **`ActorEngine.recomputeHP()` is inspected only for whether it can accidentally destroy correctly-accumulated HP.** ✅ Done: it can (Defect A, live-verified: computes 88 from Gar'ee's real 108-producing state) and currently doesn't only because it crashes first (Defect B, live-verified). See `tests/hp-preservation-authority.test.mjs` (test 2) and its closing warning about the danger of fixing Defect B alone.

## Domain: Second Wind — CLEAN, no action needed

Single canonical rules module (`scripts/engine/combat/SecondWindRules.js`, pure static functions), single execution authority (`ActorEngine`, all call sites), single recovery-timing authority (`SecondWindEngine.js`, delegates state reset to `ActorEngine.resetSecondWind`). No reimplementation found anywhere else in the codebase (grep-confirmed). One fragility flag (not a defect): `second-wind-rider-runtime-patches.js:299-312` monkey-patches `SecondWindRules.calculateHealingAmount` temporarily for suppression feats — needs confirmation the monkey-patch always restores on every exit path, but this is a robustness note, not a math-correctness one.

## Domain: Skills / Initiative

- **A (canonical writer):** `DerivedCalculator.computeAll()` (`derived-calculator.js:437-734`) builds `system.derived.skills[skillKey]` for every `CANONICAL_SKILL_DEFS` entry (`scripts/utils/skill-normalization.js:13-41`), with an explicit self-checking **contribution ledger**: `skillBreakdown` array of `{key,label,value,source}` parts (ability, misc, species, trained, halfLevel, focus, occupation, modifiers, state, armor, condition), summed and compared against `total` with a runtime warning (`derived-calculator.js:680-733`) if they disagree by >0.001. **This is exactly the target architecture the freeze charter asks for**, already implemented for skills.
- **A (canonical read for rolls):** `roll-config.js#getSkillTotal()` (line 683) reads `derivedByKey.total`/etc. rather than recomputing (one deliberate exception: `useTheForce` via `getSkillComponentTotal()`, commented as intentional). `buildRollConfigModel()` has an anti-drift guard that discards a disagreeing caller-supplied `baseBonus` with a warning rather than trusting it.
- `getSkillComponentTotal()` (roll-config.js:669-681) is the **one complete fallback formula** in the codebase — includes ability, half-level, trained, focus, misc, species, armor, AND condition.

### D — CONFIRMED: at least 9 independent duplicate/fallback formulas, all but one missing armor/condition terms

All fire only when `derived.skills[key].total` isn't yet finite (mid-repaint/mid-chargen/stale-actor), but are unguarded against future edits removing the underlying derived path:

| File | Formula | Missing terms |
|---|---|---|
| `SWSEInitiative.js:24-58` `getActorInitiativeSkillTotal()` (live initiative authority) | ability+halfLevel+trained*5+focused*5+misc | armor, condition |
| `swse-combatant.js:19-46` `getInitiativeSkillTotal()` (2nd, separately-maintained near-duplicate of the above) | same as above | armor, condition |
| `skills.js:70-98` `buildAthleticsRollSkill()` | ability+halfLevel+trained+focused+misc | armor, condition |
| `skills.js:289-303` `calculateSkillModifier()` (zero call sites — dead but a landmine) | ability+trained+focus+armor+misc | **half-level entirely** |
| `lightsaber-construction-engine.js:364-393` `getUseTheForceTotal()` | ability+halfLevel+trained+focused+misc | condition |
| `character-like-sheet.js:1132-1151` AND a second copy at `:6143` | ability+halfLevel+misc+trained+focused | armor, condition |
| `character-sheet/concept-context.js:707-725` | ability+halfLevel+trained+focused+misc | armor, condition |
| `progression-framework/steps/summary-step.js:1140` (chargen preview) | halfLevel+ability+trained+focused+misc | armor, condition (arguably acceptable pre-equipment, but unguarded as such) |
| `engine/progression/skills/skill-validator.js:83-103` (dead — zero call sites via `SkillEngine.calculateModifier`, itself uncalled) | **+3 class-skill / +3 trained** (D&D-3.5-style) | half-level, armor, condition — wrong rules system entirely |
| `rolls/skills-reference.js:248-303` (orphaned example file, not imported anywhere) | includes condition, not armor | armor |

**Classification: CONFIRMED architectural debt** (narrow real-world exposure since these only fire on missing derived data), plus two items that are **CONFIRMED wrong-if-ever-used**: `skill-validator.js` encodes non-SWSE rules (dead), `skills.js#calculateSkillModifier` has zero half-level term (dead but exported/callable).

### Armor Check Penalty (ACP) — CONFIRMED defects in the "who applies it" layer

`CANONICAL_SKILL_DEFS` correctly marks `acrobatics, climb, endurance, initiative, jump, stealth, swim, athletics` as `armorPenalty: true` (single source of truth for *which* skills are affected). But three independent code paths apply the actual penalty:
1. `DerivedCalculator` — correct, single application inside its own skill loop.
2. `ModifierEngine.js:1334-1360` — hardcodes its **own copy** of the same 7-skill list and independently emits `skill.${skillKey}` penalty modifiers from equipped armor. Not currently double-counting by accident of manual maintenance, but two independent literals for the same semantic list, with no shared constant and no de-dupe guard against DerivedCalculator's own term (contrast: the codebase DOES have such a guard for condition-track penalties specifically, see below — this asymmetry suggests the ACP double-count risk wasn't considered).
3. `scripts/engine/skills/rules/armor-rule.js:25-54` — **CONFIRMED DEAD/BROKEN**: gates on `CONFIG.SWSE?.skills?.[skillKey]?.armorPenalty`, but `CONFIG.SWSE.skills` is never populated anywhere in the codebase (grep-confirmed) — this rule silently no-ops on every invocation despite being wired into the live skill-enforcement pipeline (`skill-enforcement-engine.js:62`).

### Energy Shield ACP-persists-despite-proficiency — CONFIRMED: rule does not exist, and is actively excluded

This is the specific SWSE rule the freeze charter calls out (personal energy shield's ACP applies while activated even if the wearer is proficient). **No implementation of this rule exists anywhere in the codebase.** Worse, energy shields are structurally excluded from every ACP path found:
- `ModifierEngine.js:1258`: `find(i => i.type==='armor' && i.system?.equipped && !isEnergyShieldItem(i))` — if the only worn defensive item is a shield, this returns `null` and **zero ACP is applied**, regardless of proficiency.
- `armor-rule.js:35`: same shield exclusion (moot anyway, since this rule is dead per above).
- `armor-benefit-simulator.js:158-166` (`effectiveArmorCheckPenalty`, equipment-suggestion/scoring advisory code only, not live roll math) is the *only* shield-ACP logic that exists at all, and it encodes **the opposite of the correct rule**: `if (isProficient) return 0;` — i.e. it assumes proficiency removes shield ACP, when SWSE RAW says it should persist.

**Classification: CONFIRMED — a missing feature, not a duplicate-formula bug.** An equipped/activated energy shield currently contributes zero ACP to any skill, for any actor, proficient or not. This directly affects Gar'ee's golden Stealth/Initiative expected values (+22/+17 active shield vs +24/+19 inactive) — those numbers will not currently be produced by any code path.

### Condition-track penalty — mostly clean, one dead outlier

Single canonical writer: `base-actor.js:359` (`system.derived.damage.conditionPenalty = this.getConditionPenalty(step)`), read once by `DerivedCalculator` and folded into skill breakdown. `ModifierEngine.js` has an explicit, correct de-dupe comment (:1207-1209): condition penalties for skills are pre-computed in DerivedCalculator, so ModifierEngine deliberately does NOT re-apply them — **this is the right pattern, and notably the ACP path above lacks the equivalent guard**. Two dead/unreferenced outliers found (no importers, grep-confirmed): `rolls/skills-reference.js:275` and `scripts/utils/calc-conditions.js:8` (writes to a non-canonical `actor.conditionPenalty` property, never read).

## Domain: Attack Bonus

- **A (canonical):** `resolveAttackBonus()` (`scripts/engine/combat/combat-roll-math.js:382-501`) returns `{total, components, flags}` — a real summed component list, not a bare number. Contributions: BAB, ability mod (+ substitution rider), weapon flat/enhancement bonus, range penalty, firing-into-melee (suppressed by Precise Shot), rage modifiers, condition-track penalty, global attack-penalty field, proficiency penalty (-5 if not proficient), talent bonus (`TalentActionLinker`), passive/STATE item modifiers, effect-intent (ModifierEngine) bonus, combat-option bonus (Power Attack etc.), several talent-specific modifiers, scoped combat-feat bonus. NPC-statblock/stock-droid published-total short-circuits deliberately *replace* rather than stack with BAB/ability/enhancement/proficiency (explicit anti-double-count comment). No species contribution — confirmed deliberate per `docs/systems/COMBAT_MATH_SSOT.md:77-83` (old dead write-path removed, not reinstated).
- Thin, confirmed-clean wrappers (B): `scripts/combat/utils/combat-utils.js:48-51,235-237` (`computeAttackBonus`/`computeDamageBonus`), `weapons-engine.js:413-429` tooltip breakdown (called with empty context, so range/PBS correctly show 0 in static display — Category C, correct by design).
- **D — CONFIRMED duplicate/divergent calculators:**
  - `enhanced-rolls.js:594,891` (`rollAutofire`/`rollFullAttack`) call `computeAttackBonus(actor, weapon)` with **no context**, silently dropping range penalty, firing-into-melee, and any context-dependent combat-option/feat modifier, then hand-add `autofirePenalty`/`attackPenalty`/`fpBonus`/`customModifier`/`situationalBonus`. The single-attack path (`attacks.js:271/620`) correctly passes full context — only the legacy multi-attack paths are affected.
  - `roll-config.js:703-720` (`getWeaponAttackBonus()`) — `bab + abilityMod + enhancementBonus` only, missing proficiency/range/condition/feats/talents/combat-options. Feeds `getRollBaseTotal()`, which is what the pre-roll modifier dialog displays as its base number for `rollType:'attack'` (via `enhanced-rolls.js:357-364,552-557` calling `showRollModifiersDialog` with no `baseBonus`). **Confirmed and explicitly pre-existing/known**: `docs/audits/skill-roll-dialog-base-authority.md:295-301` documents that PR #970's dialog-base-authority hardening was deliberately scoped to `skill`/`force`/`force-power` only, leaving `attack`/`damage`/`ability`/`initiative` on the old `baseBonus ?? getRollBaseTotal()` behavior. **This is cosmetic, not a scoring bug** — the dialog's own preview number is never fed back into the actual roll (the real roll goes through `resolveAttackBonus()` with full context via `canonicalRollAttack()`), but a player/GM can see the pre-roll dialog disagree with the chat-card result.
  - `houserule-block-mechanic.js:124` — `bab + halfLevel + abilityMod + weaponBonus + blockPenalty`; adds half-level to an attack roll (canonical model never does this for attack) and omits proficiency/range/condition/feats.
- No double-counting found for the specific scenario hypothesized (Energy Shield ACP or condition-track penalty applied twice to attack) — condition-track penalty is read once with a fallback chain, ACP isn't wired into attack math at all (it's skill-only in this codebase).

## Domain: Damage

- **A (canonical):** `resolveDamageBonus()` (`combat-roll-math.js:567-606`, stock-droid path at 503-565): ½ level, ability, weapon enhancement, rage, Rapid Alchemy, effect-intent, combat-option damage, scoped feat damage.
- **CONFIRMED — custom weapon damage formulas are respected verbatim, never "corrected."** `scripts/combat/rolls/damage.js:186`: `dmgResult.flags?.stockDamageFormula ?? (weapon.system?.damage ?? '1d6')` — the Item's stored dice string (e.g. `4d12kh3`) is used as-is; the resolver's numeric bonus and talent/force-item dice are appended as separate formula parts, never substituted into or parsed out of the base string. `weapon-data-resolver.js:191` only supplies a fallback (`'1d8'`) when the field is **empty**, never overwrites an existing value. **This directly confirms Gar'ee's Heavy Blaster Rifle `4d12kh3` will survive unmodified** — no repair-toward-default mechanism exists anywhere in this path.

## Domain: Grapple — CONFIRMED DEFECT (roll-time formula diverges from displayed formula) — **FIXED**

Three to four independent implementations, not one:
- **A (canonical/derived):** `derived-calculator.js:348-357` — `bab.total + max(strMod,dexMod) + sizeMod + speciesGrapple` → `system.derived.grappleBonus`. Matches RAW.
- **D (guarded duplicate, currently consistent, not yet touched):** `PanelContextBuilder.js:1428-1438` — identical formula, own copy of the size table, used only as a fallback when `derived.grappleBonus` is unset. Numerically consistent today but a second hand-maintained copy that can silently fork from the canonical table on a future edit.
- **D — CONFIRMED live bug — FIXED:** `scripts/houserules/houserule-grapple.js:58-60` (`GrappleMechanics.performGrappleCheck()`), the code that actually builds the `1d20 + grappleBonus` roll for the grapple house-rule action: `bab + strMod` **only** — no size modifier, no species bonus, no STR/DEX "better of" comparison (hardcodes STR), and doesn't read `system.derived.grappleBonus` at all. **Classification: CONFIRMED.** Any Small/Large creature, DEX-based grappler, or species with a grapple racial bonus gets a materially wrong number on the actual roll while the sheet displays the correct one. Already tracked as a known gap in `docs/audits/combat-phase-1a-ssot-decision-matrix.md:30` ("Grapple... Keep and later fix RAW seams") — not a fresh regression, but unresolved until now. **Fixed** to read `system.derived.grappleBonus`. Live-verified end-to-end through the real async `performGrappleCheck()` pipeline (`RollEngine.safeRoll` mocked to capture the formula string). See `tests/houserule-grapple-authority.test.mjs`.
- A fourth, chargen-preview-only formula exists (`follower-deriver.js:320`, STR mod alone) — lower stakes, scoped to the follower-creation wizard, not yet touched.
- Related: `getGrappleDC()`'s target-BAB read (`houserule-grapple.js:29`, was `target.system?.attributes?.bab?.value`) is a field this schema never populates (grep-confirmed zero writers anywhere) — always silently read 0, so the DC-scaling-with-target-BAB house rule (`grappleDCBonus`) never actually applied. **Fixed** to `SchemaAdapters.getBAB(target)`.

**Gar'ee's certified Grapple = +12 (BAB 7 + DEX +5 + size 0)** requires the DEX-vs-STR "better of" comparison (his DEX +5 > STR +2) — `houserule-grapple.js`'s STR-only formula previously computed `7 + 2 = 9` instead; now correctly reads the canonical `+12` when available.

**Certification-correction addendum (post-review):** the first pass of this fix kept the exact known-wrong BAB+STR-only formula as its own fallback for when `system.derived.grappleBonus` is unavailable — a second review correctly flagged this as "use the right answer normally, but fall back to a known-wrong one," precisely what the freeze charter forbids ("No independent known-wrong fallback... Do not maintain a second formula"). **Fixed**: extracted the canonical formula into `combat-stat-rules.js#resolveGrappleBonus(actor)` (BAB via `SchemaAdapters.getBAB()`, best-of-STR/DEX via `SchemaAdapters.getAbilityMod()`, a new `GRAPPLE_SIZE_MODIFIERS` table matching `derived-calculator.js`'s exact values, and the same species-bonus path) — a standalone, independently-callable resolver, not a competing reimplementation. `houserule-grapple.js`'s fallback now calls this same function, so there is exactly one grapple formula in the codebase, used both ways. Live-verified: `resolveGrappleBonus()` called directly against Gar'ee's build returns 12; the fallback path (no `derived.grappleBonus`) now correctly credits DEX over STR and includes a size modifier the old fallback omitted entirely (a Large creature: BAB 7 + STR +2 + size +4 = 13, verified live). See `tests/houserule-grapple-authority.test.mjs` (tests 2-5).

## Domain: Weapon Melee/Ranged Schema — CONFIRMED DEFECT (the "Bluebolt" bug)

**Verdict: the reported mechanism is real, and directly confirmed on a real, currently-played actor.** While not present in any shipped compendium/pack data (364 standalone weapon items + ~1989 actor-embedded weapons across all packs checked — zero mismatches there), Gar'ee's own actor export contains the exact contradiction: his "Bluebolt Blaster Pistol" item has `weaponCategory:"ranged"`, `category:"pistol"`, `proficiency:"pistols"`, `attackAttribute:"dex"` (all correctly ranged) alongside `meleeOrRanged:"melee"` and `ranged:false` (both wrong). This is not a theoretical authoring hazard — it is live, manifested data on a real character, reachable through completely normal sheet use (not just direct DB editing).

**Root cause:** `template.json` defines 5 independent, schema-unlinked fields: `weaponCategory`, `proficiency`, `attackAttribute`, `meleeOrRanged`, `ranged` (legacy boolean). The item sheet's branch-change handler (`scripts/items/swse-item-sheet.js#onMeleeOrRangedChange`, :2351-2365) only (a) sets a client preview flag, (b) repopulates the `weaponCategory` dropdown with `preserveValue:true` — meaning a category string valid in both melee and ranged lists (e.g. `simple`) silently survives a branch flip without actually changing, and (c) re-hydrates range-band fields. It **never touches `system.ranged` or `system.proficiency`, and never re-derives `system.attackAttribute`.** The one branch-aware save-time reconciliation block (`#onSubmitForm`, :2661-2679) only syncs range-band fields, conspicuously omitting `ranged`/`proficiency` — confirming the omission is structural, not incidental. `normalizeItemSystem` (`item-defaults.js`) never reads or writes either field (grep-confirmed zero occurrences).

**Net effect (directly matches the reported bug):** a weapon created as melee, then switched to Branch=Ranged/Category=Pistols via the sheet, saves with `meleeOrRanged:"ranged"` and correct pistol range bands, but `ranged` stays `false`, `proficiency` stays `"simple"` (not `"pistols"`), and `attackAttribute` stays whatever it was — exactly the Bluebolt contradiction.

**No single canonical field is enforced.** `meleeOrRanged` is the de facto primary for most modern consumers (`combat-stat-rules.js`, `roll-config.js`, `weapon-range-profile-resolver.js`, `combat-ui-behavior-hotfix.js`, droid sheet) — but a real minority of consumers **ignore it entirely**, pattern-matching on other fields instead:
- `scripts/engine/species/rage-engine.js:79-100` — text search over `system.combat.range` (a **dead field that doesn't exist** in template.json), `system.range`, `weaponType`, `weaponGroup`, `system.category` (not `weaponCategory` — wrong field name).
- `scripts/engine/talent/sith-talent-actions.js:242-249` — same wrong-field text-search pattern.
- `scripts/apps/force-alchemy/force-alchemy-context-resolver.js:209-215` — category/name regex, ignores `meleeOrRanged`.
- `scripts/combat/utils/combat-utils.js:119-123` local `isMeleeWeapon` — checks `system.range` string equality, ignores `meleeOrRanged`.
- `scripts/engine/combat/weapons-engine.js:51-53` `isMeleeWeapon` — checks `weapon.system.combat.range.type`, a field that **does not exist anywhere in the schema** — this predicate is always `false`; dead/vestigial, no other callers found.
- `scripts/engine/inventory/ammo-system.js:450-452` — `meleeOrRanged==='ranged'` **OR** `range !== 'Melee'` (OR, not fallback) — actively diverges from `meleeOrRanged` if `range` text isn't literally `"Melee"`.
- `scripts/engine/combat/damage-type-rules.js:217-218` — falls through to `system.category` (wrong field name, doesn't exist) before `options.attackType`.
- `scripts/items/weapon-data-resolver.js:87-120` (`normalizeBranch`) — `meleeOrRanged==="ranged"` always wins, but `meleeOrRanged==="melee"` can be **silently overridden to ranged** by category/name text heuristics — a second, one-directional inconsistency-repair mechanism layered on top of the first bug.

**Classification: CONFIRMED**, with a clear recommended remediation already identified by the audit (not yet implemented): make `meleeOrRanged` the single enforced SSOT field, add a normalization step in `normalizeItemSystem` that derives/resets `ranged`/`proficiency`/`attackAttribute` whenever `meleeOrRanged` changes, and repoint the ignoring consumers onto `combat-stat-rules.js`'s canonical `isMeleeWeapon`/`isRangedWeapon` helpers.

## Domain: Armor / ACP / Max Dex / Energy Shield

**A1 — ACP has no single canonical site (3 overlapping implementations):**
- `ModifierEngine.js#_getItemModifiers()` (:1250-1547) and `scripts/engine/skills/rules/armor-rule.js:25-54` agree on intent (explicit comment: proficiency does NOT remove base ACP, only prevents an *additional* non-proficiency penalty) and both correctly exclude energy shields from their "equipped armor" lookup (see A2).
- `scripts/rolls/skills.js:299` is a **third, SSOT-bypassing path**: `actor.system.armorCheckPenalty || 0` — a flat actor-level field, not read from `resolveArmorData()` at all. Candidate for deprecation/removal.
- (Cross-reference: the skills-domain audit above separately confirmed `armor-rule.js` is dead/broken due to an unpopulated `CONFIG.SWSE.skills` — so in practice only `ModifierEngine.js` is live.)

**A2 — Energy Shield ACP/Max-Dex-while-activated exception: CONFIRMED absent, and structurally excluded (independently confirmed by two agents).** `defense-calculator.js:719`, `ModifierEngine.js:1258`, and `armor-rule.js:35` all explicitly filter energy shields OUT of the "equipped armor" lookup that drives both ACP and Max Dex. `resolveArmorData()` *does* compute `armorCheckPenalty`/`maxDexBonus` for shield items (armor-data-resolver.js:321-331,346) and even an `activated` flag (:356) — but nothing downstream ever reads a shield's values for ACP/Max Dex. The intended rule is documented as UI copy only (`templates/apps/customization/partials/workbench-content.hbs:381`) and never wired into math. The only shield-ACP logic that exists at all is advisory/scoring code (`armor-benefit-simulator.js:158-166`) and it encodes **the opposite of the correct rule** (`if (isProficient) return 0`). **Classification: CONFIRMED — a missing feature, not a miscomputed formula.** This directly blocks Gar'ee's golden Stealth/Initiative shield-active values (+22/+17) — no code path currently produces the -2 shield ACP term at all, active or inactive.

**A3 — Armor talent bonuses (Armored Defense, Improved Armored Defense, Second Skin, Armor Mastery): not written back into armor item fields (the specific write-back mechanism hypothesized was NOT found)**, but a different, real drift risk exists instead: `scripts/patches/armor-hydration-defense-hotfix.js` monkey-patches `DefenseCalculator.calculate` and `PanelContextBuilder.prototype.buildDefensePanel`, and its `applyArmorDefenseCorrectionsToResult`/`effectiveArmorDefenseState` independently re-derive the same proficiency/Second-Skin/Armored-Defense/Armor-Mastery logic and **overwrite** the canonical result — not additive double-counting, but a second, independently-maintained implementation of the identical rule that already lacks one alias the canonical calculator has (`hasKnightArmorMastery`, a Jedi Knight talent-tree variant) — a Jedi Knight with that specific talent gets inconsistent Reflex math depending on whether this hotfix's post-processing runs.

**A4 — Max Dex:** computed twice with consistent logic (`defense-calculator.js:784-790`, `ModifierEngine.js:1307-1332`, both +1 for Armor Mastery) — but since both derive `equippedArmor` by excluding energy shields (same exclusion as A2), there is no active/inactive toggle to evaluate: **the restriction is never applied for a shield at all, in any state.**

## Domain: Speed / Movement — CLEAN, no defect found

Clean two-layer split confirmed: base authority `system.speed` (species/droid/vehicle grants set this via declarative rules, never overwritten by armor/talent logic), effective authority `system.derived.speed.{base,total,walk,adjustment}` (character-actor.js:38-47). Armor speed penalty and **Juggernaut** (correctly requires proficiency, zeroes the penalty modifier rather than mutating base speed) are both modifier-based, not mutations — `ModifierEngine.js:1369-1406`. No code path found that writes an armor/talent-adjusted number back into the persisted base `system.speed` field. Sheet correctly displays the effective (post-penalty) speed as primary, with base shown only as a secondary "base N ±adj" annotation when there's a delta (`resources-panel.hbs:11-14`). **No action needed for this domain.**

## Domain: Condition Track — mostly clean authority, but the lookup table is copy-pasted 6+ times

Single canonical writer confirmed: `BaseActor.getConditionPenalty(step)` (`scripts/actors/v2/base-actor.js:307-313`, table `[0,-1,-2,-5,-10,0]`) → `system.derived.damage.conditionPenalty`. Most high-stakes consumers (skills, defenses, attacks) correctly read this single field (`derived-calculator.js:671-672`, defense breakdowns, `combat-roll-math.js:422`) — this part of the architecture is sound and matches the target shape.

**D — CONFIRMED: the step→penalty table itself is independently hand-copied in at least 6 places**, with an inconsistent helpless-step value (`0` in most, `-999` in one):
- `scripts/engine/combat/ConditionEngine.js:379-389` (`#getConditionPenalty`, own literal table, helpless=`-999`)
- `scripts/utils/calc-conditions.js:5-13` (writes to `actor.conditionPenalty`, a **different, seemingly-dead property path** than the canonical `system.derived.damage.conditionPenalty` — grep found zero importers)
- `defense-calculator.js:745-751` (`getConditionPenalty()` closure — fallback-only, prefers canonical field first)
- `scripts/ui/combat-stats-tooltip.js:207-221` — **CONFIRMED live divergence risk**: builds its own table AND computes the Initiative tooltip's total independently, reading `system.conditionTrack?.current` **raw**, completely bypassing `system.derived.damage.conditionPenalty`. Since the numeric table (0,-1,-2,-5,-10) isn't currently house-rule-configurable (confirmed via `houserule-condition-track.js`, which only proxies to `ConditionEngine.calculateConditionStep`), these don't disagree *today* — but if the canonical table is ever edited in one place, Initiative's tooltip would silently diverge from Skills/Defenses/Attacks.
- `scripts/ui/defense-tooltip.js:332-343` — a fifth table (positive magnitudes), display-text only, doesn't feed the shown total.
- `scripts/engine/effects/adapters/effect-card-utils.js:87-96` — a sixth, text-only (not additive) step→label mapping.

**Classification: CONFIRMED architectural debt, narrow current exposure** (no live numeric disagreement today since the table is static, but the redundancy is real and the Initiative tooltip's raw-field read is a genuine bypass of the canonical accessor).

## Domain: UI/Sheet Math Reconstruction — 3 confirmed live divergence bugs found

Beyond the skill/initiative fallbacks already covered above, the sheet-reconstruction sweep found:

- **CONFIRMED live bug:** `scripts/sheets/v2/npc/npc-sheet-helpers.js:238-240` (`buildFollowerDefenseValues()`) computes follower-NPC Fortitude as `10 + level + max(strMod,conMod) + bonus` — but the actual follower-stat generator (`follower-deriver.js:290-294`) has an explicit comment stating *"Fortitude uses Constitution, not the better of STR/CON"*. The sheet helper does exactly what that comment forbids. **This is a genuine, confirmed rules-disagreement bug** between two parts of the same subsystem, not just redundant math — follower NPCs' displayed Fortitude can be higher than the system's own documented rule intends.
- **CONFIRMED gap:** Custom skills (`customSkills`) have **no canonical engine computation at all** — `derived-calculator.js` never touches them. Two independent sheet-layer implementations (`custom-skills-helpers.js:22-35`, `character-sheet/concept-context.js:709-713`) are the *only* math, computed twice, and both omit armor-check-penalty and condition-track-penalty that every named skill includes — a custom skill's total will not reflect Condition Track state, unlike every other skill.
- **Guarded/lower-risk duplicates** (fallback-only, prefer canonical when finite): `PanelContextBuilder.js:1428-1438` (grapple fallback, consistent today), `character-like-sheet.js:1140-1151` and the explicitly-`@deprecated` `:6121-6144` (skill total fallbacks, omit armor/condition, transient-only), `progression-framework/steps/summary-step.js:1127-1176` (chargen wizard preview, necessarily actor-less, but a 4th independent copy of the same skill/defense/grapple formulas that must be kept in sync by hand).

---

## Cross-cutting theme across every domain audited

The codebase already has the *right pattern* in exactly one place — `DerivedCalculator`'s skill contribution ledger, which sums named parts, compares the sum against the stored total, and logs a warning on mismatch (`derived-calculator.js:680-733`). **No other domain has this self-checking pattern yet.** The freeze's Phase 13 contribution-ledger contract should generalize this exact mechanism (already proven, already shipping) to BAB, defenses, damage threshold, HP, attack, damage, and grapple, rather than inventing a new architecture.

The single largest, most consistent finding across all 6 audits: **duplicate fallback formulas are pervasive (at least 25+ distinct reimplementation sites found across skills/initiative/defenses/BAB/grapple/attack/condition-track), but the large majority are guarded (only fire when canonical derived data is unavailable) and currently numerically consistent.** The genuinely load-bearing, CONFIRMED-wrong-today defects are a much shorter list — see the First Report below.

---

## Phase 2: Gar'ee golden fixture — live proofs and hand-computed divergences

Two confirmed defects above were reproduced **live, against the real production calculators**, under the `tests/helpers/foundry-shim` harness (not mocked, not reimplemented — the actual `DefenseCalculator`/`ThresholdEngine` classes imported and executed). This is stronger evidence than a code-reading classification alone, so it's recorded here in full with the exact commands and output.

### Live proof 1 — Flat-footed Reflex keeps a dodge bonus (CONFIRMED, executed)

```js
const actor = {
  type: 'character',
  system: {
    attributes: { dex: { base: 20, racial: 0, enhancement: 0, temp: 0 } },
    activeEffects: [{ target: 'defense.reflex', value: 3, enabled: true }] // simulates a +3 dodge bonus
  },
  items: []
};
const result = await DefenseCalculator.calculate(actor, [], {}, {});
```
Result: `reflex.total = 18` (10 + dex 5 + dodge 3, correct), `flatFooted.total = 13` (18 − 5, i.e. **only the Dex mod was stripped — the +3 dodge bonus survived into flat-footed**). SWSE RAW: a flat-footed character loses dodge bonuses along with Dex; correct flat-footed here is `10`. **Divergence: +3 (flat-footed Reflex is 3 points too high whenever the character has any dodge-type bonus active).**

### Live proof 2 — Damage Threshold disagrees between DerivedCalculator and ThresholdEngine (CONFIRMED, executed)

```js
const actor = {
  system: {
    size: 'medium',
    derived: {
      defenses: { fortitude: { total: 20 } },
      damageThreshold: 25 // what DerivedCalculator actually stores: fort 20 + Improved Damage Threshold's +5
    }
  }
};
ThresholdEngine.computeBaseThreshold(actor); // => 20
```
`ThresholdEngine`'s combat-time base (20) ignores the Improved Damage Threshold feat bonus that `DerivedCalculator` already folded into the stored/displayed value (25). **Divergence: −5 for any actor with Improved Damage Threshold** (the combat engine under-counts DT relative to what the sheet shows, meaning a hit that should NOT push the character down the condition track could incorrectly trigger a shift in actual play).

### HP: corrected against Gar'ee's real actor export, and live-executed against the real `ActorEngine.recomputeHP()`

**This section originally described a "20-point HP undercount" against Gar'ee's live actor. That was wrong and has been corrected** (see the HP domain section above for the full writeup). Gar'ee's actual, current `system.hp.max` is **108** — obtained directly from his real actor export, not hand-derived. He was never destructively recomputed. The finding is that `ActorEngine.recomputeHP()`'s formula **would** produce 88 from his current data, and — separately — currently cannot even complete a value-changing call at all due to a live-confirmed `ReferenceError` (Defect B in the HP domain section). Both were verified by importing and executing the real, unmodified `actor-engine.js` directly (bypassing this repo's test-only fake, which the standard harness entry point redirects to — see `tests/helpers/foundry-shim/path-loader.mjs`), with `ClassesDB` populated directly (it normally builds from a Foundry compendium pack unavailable under this harness) so `ActorAbilityBridge.getClasses()` could resolve a real class item.

**Correct RAW multiclass HP**, confirmed against Gar'ee's own `progression.hpGainHistory`/`classLevelHistory` (both recorded verbatim in his actor export — his HP is genuinely additive/historical, not something to hand-derive): starting HP + accumulated per-level gains through his actual level-up choices, landing on 108 exactly (his own history shows `previousMax: 96 → newMax: 108` at level 8, `+12` via "maximum" method, Soldier hit die 10 + CON mod 2). `HPCalculator.calculate()`'s dead-code algorithm (`hp-calculator.js`) independently arrives at the same 108 via `10*3+2` (level 1) `+ 5*(10+2)` (Soldier levels 2-6) `+ 2*(6+2)` (Scoundrel levels 7-8) — consistent with, not the source of, the real authority.

**`ActorEngine.recomputeHP()`'s live formula**, executed for real (not hand-computed) with `ActorAbilityBridge.getClasses(Gar'ee)[0]` confirmed = Soldier (see the HP domain section's "Open question resolved"):
```
hpAtFirstLevel = 10*3 = 30
hpPerLevel     = floor(10/2)+1 = 6
newHPMax       = 30 + (8-1)*6 + 2*8 = 30 + 42 + 16 = 88
```
This is what the live function actually returns when the `ReferenceError` doesn't fire (verified in isolation); with it firing (the actual live behavior on any value-changing call), it throws before returning anything, and the calling hooks swallow the error — so in practice `system.hp.max` is never touched by this path at all today, for any actor.

### Certified/expected values not yet reproducible under this harness

The following golden values from the freeze charter require either (a) real class-progression/compendium data the lightweight test harness doesn't load (`BABCalculator.calculate()` returned `0` for Soldier 6/Scoundrel 2 under this harness — confirmed it needs `class-data-loader.js`'s async pack-data path, not available here), or (b) the live `ActorEngine`/`ModifierEngine` talent-registration pipeline this harness fakes. They are recorded as **targets to verify against the real Foundry runtime**, not fabricated pass/fail results:

| Value | Charter's certified expectation | Status |
|---|---|---|
| BAB | +7 | Not reproducible under this harness (needs real class-data pack load); formula read confirms Soldier(full)+Scoundrel(3/4, floor(2*0.75)=1)=7 is consistent with `bab-calculator.js`'s documented algorithm |
| Grapple | +12 (BAB 7 + DEX +5 + size 0) | `derived-calculator.js`'s formula (BAB+max(STR,DEX)+size+species) would produce this correctly if BAB is correct; **`houserule-grapple.js`'s live roll formula would instead produce BAB+STR-only = 7+2 = 9 — FIXED, and its fallback replaced (see the Grapple domain section)**, live-verified via `resolveGrappleBonus()` (`combat-stat-rules.js`) directly: BAB 7 + DEX +5 + medium size (0) = 12 |
| Stealth (shield inactive) | +24 | Formula-consistent per `DerivedCalculator`'s skill ledger (dex+halfLevel+trained+focus+misc = 5+4+5+5+5=24); **not independently executed** (needs real derived-skill pipeline) |
| Stealth (shield active) | +22 | **Not currently producible by any code path** — confirmed above, no Energy Shield ACP implementation exists anywhere |
| Initiative (shield inactive) | +19 | Formula-consistent (5+4+5+5=19); not independently executed |
| Initiative (shield active) | +17 | **Not currently producible** — same Energy Shield ACP gap |
| Knowledge (Tactics) | +10 | Formula-consistent (1+4+5=10), unaffected by ACP per the charter — not independently executed |
| Use Computer | +10 | Formula-consistent (1+4+5=10) — not independently executed |

### Open questions from the original Phase 2 pass — now resolved

1. ~~Does `ActorAbilityBridge.getClasses(actor)[0]` return Soldier or Scoundrel for Gar'ee specifically?~~ **Resolved: Soldier** — traced directly in code (`ActorItemIndex`/`ActorAbilityBridge`, see the HP domain section) and confirmed against Gar'ee's real actor export.
2. ~~What is Gar'ee's actual current persisted `system.hp.max`?~~ **Resolved: 108** — obtained directly from his real actor export.
3. ~~Bluebolt Blaster Pistol's actual persisted item data~~ **Resolved: captured directly from Gar'ee's actor export** — see the Weapon Melee/Ranged Schema domain section above for the exact field values, ready to build the Phase 8 golden test fixture precisely.
