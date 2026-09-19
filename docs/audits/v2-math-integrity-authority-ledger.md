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
1. Grapple: **SSOT-certified, rules-fidelity-certified, AND static-modifier-composition-certified**. `computeGrappleBonus()` (`combat-stat-rules.js`) is the only core grapple arithmetic in the codebase, its `GRAPPLE_SIZE_MODIFIERS` table has been checked against the published Core Rulebook table (and cross-validated against real Aiwha/Bantha compendium stat blocks), and every legitimate permanent bonus source (species, and background bonuses like Enslaved's "Grapple Survivor") now provably reaches `system.derived.grappleBonus` exactly once, while every genuinely contextual source (Expert Grappler, Grapple Resistance) is confirmed to apply only at roll time and never leak into the static total. Six call sites provably cannot disagree because they read the same canonical value or call the same function: `derived-calculator.js`, `resolveGrappleBonus(actor)`, `houserule-grapple.js`'s roll formula, `PanelContextBuilder`'s displayed sheet box, `combat-stats-tooltip.js`'s hover breakdown (whose displayed rows are now proven to sum to its displayed total), and `SWSEGrappling._rollGrappleBonus()` (the base for every opposed Grab/Grapple/Pin/Trip/Throw/Crush/Escape check). `getGrappleDC()`'s BAB read also corrected to `SchemaAdapters.getBAB()`. Along the way this also fixed: a previously-invisible bug where `system.derived.grappleBonus` was always `NaN`; a sheet-display bug where a legitimate canonical `0` could be silently discarded; an extra half-heroic-level term the opposed-combat-check engine wrongly added; a BAB-box display-priority conflict; a background bonus that was authored twice for the same grant and then silently dropped entirely regardless (Enslaved's +2 never reached any character); and a modifier-breakdown path bug that made the tooltip's contextual-modifier rows always empty. See the Grapple domain section for the full four-round history.
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

## Batch 1 certification correction, round 2 (post-review): Grapple SSOT was still not actually true

A third review found that round 1's Grapple fix, despite being described as achieving "one grapple formula," still had **two independent implementations**: the new `resolveGrappleBonus(actor)` resolver, and `derived-calculator.js`'s own inline grapple block, which round 1 never touched. They agreed numerically, but per the freeze charter, agreement is not the standard — a single arithmetic authority is. **Fixed**: extracted the arithmetic itself into `combat-stat-rules.js#computeGrappleBonus({bab, strMod, dexMod, sizeMod, speciesBonus})`; both `resolveGrappleBonus(actor)` and `derived-calculator.js` now call this one function rather than each computing the formula independently. This also surfaced and fixed an unrelated, previously-invisible bug: `derived-calculator.js`'s old `bab.total` read was always `undefined` (`BABCalculator.calculate()` returns a plain number, never an object), so the canonical `system.derived.grappleBonus` was always `NaN` — silently masked by a sheet-side `Number.isFinite()` guard falling back to its own correct duplicate formula. New parity test (`tests/grapple-bonus-ssot-parity.test.mjs`) proves the four call sites (`computeGrappleBonus`, `DerivedCalculator`, `resolveGrappleBonus`, the actual roll formula) cannot disagree, across 5 input combinations, because they are now the same function rather than four functions that happen to agree today.

**Wording standard going forward**: "one grapple formula" is only claimed in this document once every consumer demonstrably calls the same function — not merely produces the same output. That standard is now met for Grapple.

## Batch 1 certification correction, round 3 (post-review): SSOT was true, but the single source itself was wrong, and two more consumers still bypassed it

A fourth review found that round 2's SSOT extraction, while a genuine architectural improvement, had certified agreement without ever checking the underlying constant against a published rule — and separately, that "SSOT" itself was still not complete: two more live consumers (the character sheet's displayed Grapple box, and the actual opposed-combat-check engine) were still independently reconstructing the formula rather than reading the canonical value. Three fixes, all detailed in the Grapple domain section's "Certification-correction addendum 3":

1. **`GRAPPLE_SIZE_MODIFIERS` was wrong.** Round 2 centralized a step-of-4 table (`fine:-8 … colossal:+16`) that had simply been copied forward from the original inline formula, with no citation and no check against the actual rule. Cross-validated against two real creature stat blocks already in this repo's compendium data (Aiwha, Bantha) and two independent rules-reference lookups: the correct table is step-of-5 (`fine:-20 … colossal:+20`). Fixed, with golden tests for all 9 categories plus the Aiwha/Bantha cross-check (`tests/grapple-size-modifier-book-values.test.mjs`).
2. **`PanelContextBuilder`'s displayed Grapple box and `SWSEGrappling._rollGrappleBonus()` (the opposed-combat-check base) were still each independently reconstructing the formula**, not reading the canonical value — the sheet box could silently discard a legitimate canonical `0`, and the opposed-check engine added a half-heroic-level term the published rule doesn't have, on top of a *third* independently-wrong size table. Both fixed to read `system.derived.grappleBonus`/`resolveGrappleBonus(actor)` and add only genuinely contextual bonuses on top.
3. **Repository-wide search found a fourth, previously unclassified duplicate**: `combat-stats-tooltip.js`'s Grapple hover-breakdown (STR-only, a fourth wrong size table, a dead miscMod field, no species-bonus row). Fixed. Every other remaining occurrence found in the search was classified (legitimate passthrough consumers, an out-of-scope data-authoring tool, two confirmed-but-deferred chargen/follower-preview defects recommended for Batch 2, and one newly-discovered modifier-pipeline wiring question flagged for a future audit) — see the Grapple domain section for the full list.

The parity test now covers 6 live consumers across 6 input combinations (`tests/grapple-bonus-ssot-parity.test.mjs`), and a new book-value golden test protects the size table itself against a future silent edit (`tests/grapple-size-modifier-book-values.test.mjs`).

**Wording standard, reaffirmed**: "one grapple formula" requires every consumer to call the same function; **"rules-fidelity-certified" additionally requires that function's constants to have been checked against a published source**. Both are now true for Grapple — this is the first domain in this freeze certified to both standards.

## Batch 1 certification correction, round 4 (post-review): the core formula was correct, but permanent static bonuses never reached it

A fifth review pointed out that round 3 certified the Grapple *arithmetic* without auditing whether every legitimate bonus source actually feeds it. The "Enslaved" background's "Grapple Survivor" (+2 competence, permanent, not mode-gated) was traced end-to-end through the real background pipeline and found to never reach a character's Grapple total at all, for two independent, interacting reasons — full detail in the Grapple domain section's "Certification-correction addendum 4":

1. **Duplicate representation at the source.** Enslaved's raw authoring data (`data/backgrounds.json`) describes the same +2 grant twice (`mechanicalEffect` and `specialAbilities[0]`), and `BackgroundGrantLedgerBuilder._mergeBonuses()` faithfully turned that into two ledger entries for one real grant.
2. **The consumer silently dropped it entirely, independent of (1).** `ModifierEngine._getBackgroundModifiers()`'s flat-bonus loop required every record to have `applicableSkills` (a skill-bonus-only shape) — Enslaved's `target:'grapple'`-shaped records always failed that guard and were silently skipped. Live-verified via the real pipeline: the +2 was authored, merged (twice), and materialized onto the actor — then discarded at the last step.

**The named trap, and why fix order mattered**: fixing (2) alone would have turned a silently-missing +2 into a silently-wrong +4. Fixed in the correct order — semantic-identity dedup at the ledger-builder level first, then generic target-shaped bonus support in `ModifierEngine`, with its own *defensive* dedup so an actor whose flags were already materialized with a stale duplicate (persisted before fix #1 existed) is still protected.

Also required and completed this round: an explicit static-vs-contextual audit of every `GRAPPLE_BONUS`-shaped source. Species and background bonuses are static (now correctly layered into `system.derived.grappleBonus` exactly once, via the same `modifierMap` every other domain already uses). Expert Grappler and Grapple Resistance are genuinely contextual (mode-gated in their own authored data) and were already correctly excluded from the static total since round 3 — confirmed directly against their compendium data, not assumed. A separate, pre-existing bug was found and fixed while wiring the tooltip: `combat-stats-tooltip.js#_getModifiersForTarget()` read the wrong storage path and had always returned no rows for any target, so `getGrappleBreakdown()`'s "SUM(rows) === total" invariant was previously untested and untrue in principle — now proven directly.

**New test**: `tests/grapple-static-modifier-composition.test.mjs` — 6 static-composition golden cases (including a pre-fix duplicate-representation input), Expert Grappler and Grapple Resistance contextual-boundary checks, and a real-pipeline reproduction (`hydrateBackgroundEvent` → `BackgroundGrantLedgerBuilder` → `applyCanonicalBackgroundsToActor` → `ModifierEngine`) confirming exactly one +2 grapple contribution reaches the modifier engine.

**Wording standard, extended**: "static-modifier-composition-certified" requires every static source to be traced from its authoring data to the canonical total and confirmed to arrive exactly once, every contextual source confirmed to never leak into that total, and the tooltip's displayed parts proven (not asserted) to sum to its displayed total. All three are now true for Grapple.

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
- Consumers (B): `base-attack-bonus-rule.js:22`, `combat-roll-math.js:413,471,479` (both via `SchemaAdapters.getBAB`), `character-like-sheet.js:1473-1479` (read-only fallback chain, correctly prioritized `derived.bab` first, not a reimplementation).
- **CONFIRMED DEFECT, FIXED (Batch 1, round 3):** `PanelContextBuilder.buildResourcesPanel()` (the live context builder for the v2 character sheet's editable BAB box, `templates/actors/character/v2/partials/resources-panel.hbs`) computed `Number(system.baseAttackBonus ?? derived.bab)` — preferring the legacy/NPC-import `system.baseAttackBonus` field over the canonical `derived.bab` whenever both were present, backwards from every other BAB read site in the codebase (all of which put `derived.bab` first). This is a genuine two-box disagreement risk: `combat-stats-panel.hbs`'s BAB box (`buildCombatStatsPanel()`, already correctly `derived.bab`-only) and `resources-panel.hbs`'s BAB box could show different numbers for the same PC whenever a stale `system.baseAttackBonus` value existed (e.g. imported/legacy actor data). **Fixed**: priority flipped to `derived.bab ?? system.baseAttackBonus`, matching `character-like-sheet.js`'s already-correct pattern. `system.baseAttackBonus` remains a genuine, separate authority for NPCs/vehicles/droids/followers (a flat statblock field for actor types that don't run the class-based `BABCalculator` pipeline) — that usage is untouched; this fix is scoped to the PC sheet's resources-panel box only. Residual note: the box's `<input name="system.baseAttackBonus">` remains editable; typing a value still saves it, but the box will redisplay the canonical `derived.bab` on next render once derived data exists, since canonical now always wins the display. Live-verified via direct construction of `PanelContextBuilder` and `buildResourcesPanel()` (see the Grapple domain section's parity test, which also exercises this box).
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

For Gar'ee specifically (Soldier 6/Scoundrel 2, CON +2, level 8, first class = Soldier per above): `recomputeHP()`'s formula computes `30 + 7*6 + 2*8 = 88`. **Precision on what "88" is and isn't**: 88 is a formula/source-level derivation — the literal arithmetic quoted directly from `actor-engine.js:3844-3846`, hand-evaluated with Gar'ee's real inputs. It is **not** a value the live function has ever been observed to return or write: per Defect B, the function throws before reaching its `return newHPMax;` statement, so `newHPMax`'s runtime value was never captured, logged, or asserted equal to 88 in any test. What **is** live-verified (against the real, unmodified `ActorEngine.recomputeHP()`, imported directly to bypass this repo's own test-only fake — see Defect B below) is narrower and different in kind: that the function enters its value-changing branch (`newHPMax !== currentMax`) for Gar'ee's real data, and crashes there with a `ReferenceError` before writing anything. The 88 figure explains *why* that branch is entered (a real, computed difference) without itself being something execution confirmed. This would silently overwrite Gar'ee's correct, history-derived 108 with a value the formula computes to 88 **if it ever successfully ran and returned** — which, per Defect B, it currently cannot.

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
6. **`ActorEngine.recomputeHP()` is inspected only for whether it can accidentally destroy correctly-accumulated HP.** ✅ Done: it can — Defect A's formula, hand-derived from the quoted source (not live-observed as a return value), would compute 88 from Gar'ee's real 108-producing state — and it currently doesn't only because it crashes first, live-confirmed (Defect B). See `tests/hp-preservation-authority.test.mjs` (test 2) and its closing warning about the danger of fixing Defect B alone.

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

## Domain: Grapple — CONFIRMED DEFECT (roll-time formula diverges from displayed formula) — **FIXED, SSOT-CERTIFIED, RULES-FIDELITY-CERTIFIED, STATIC-MODIFIER-COMPOSITION-CERTIFIED**

Three to four independent implementations, not one:
- **A (canonical/derived, ORIGINALLY BROKEN — see below):** `derived-calculator.js` — `bab.total + max(strMod,dexMod) + sizeMod + speciesGrapple` → `system.derived.grappleBonus`. Matched RAW in shape, but see the newly-discovered NaN defect below.
- **D (guarded duplicate, currently consistent, not yet touched):** `PanelContextBuilder.js:1428-1438` — identical formula, own copy of the size table, used as a fallback when `derived.grappleBonus` is unset **or non-finite** (this guard is what silently masked the NaN defect below — see that writeup). Numerically consistent today but a second hand-maintained copy that can silently fork from the canonical table on a future edit. Not yet touched by this SSOT extraction (out of scope for this pass — flagged as a follow-up).
- **D — CONFIRMED live bug — FIXED:** `scripts/houserules/houserule-grapple.js:58-60` (`GrappleMechanics.performGrappleCheck()`), the code that actually builds the `1d20 + grappleBonus` roll for the grapple house-rule action: `bab + strMod` **only** — no size modifier, no species bonus, no STR/DEX "better of" comparison (hardcodes STR), and doesn't read `system.derived.grappleBonus` at all. **Classification: CONFIRMED.** Any Small/Large creature, DEX-based grappler, or species with a grapple racial bonus gets a materially wrong number on the actual roll while the sheet displays the correct one. Already tracked as a known gap in `docs/audits/combat-phase-1a-ssot-decision-matrix.md:30` ("Grapple... Keep and later fix RAW seams") — not a fresh regression, but unresolved until now. **Fixed** to read `system.derived.grappleBonus`. Live-verified end-to-end through the real async `performGrappleCheck()` pipeline (`RollEngine.safeRoll` mocked to capture the formula string). See `tests/houserule-grapple-authority.test.mjs`.
- A fourth, chargen-preview-only formula exists (`follower-deriver.js:320`, STR mod alone) — lower stakes, scoped to the follower-creation wizard, not yet touched.
- Related: `getGrappleDC()`'s target-BAB read (`houserule-grapple.js:29`, was `target.system?.attributes?.bab?.value`) is a field this schema never populates (grep-confirmed zero writers anywhere) — always silently read 0, so the DC-scaling-with-target-BAB house rule (`grappleDCBonus`) never actually applied. **Fixed** to `SchemaAdapters.getBAB(target)`.

**Gar'ee's certified Grapple = +12 (BAB 7 + DEX +5 + size 0)** requires the DEX-vs-STR "better of" comparison (his DEX +5 > STR +2) — `houserule-grapple.js`'s STR-only formula previously computed `7 + 2 = 9` instead; now correctly reads the canonical `+12` when available.

**Certification-correction addendum 1 (post-review):** the first pass of this fix kept the exact known-wrong BAB+STR-only formula as its own fallback for when `system.derived.grappleBonus` is unavailable — a second review correctly flagged this as "use the right answer normally, but fall back to a known-wrong one," precisely what the freeze charter forbids. **Fixed in an intermediate pass**: extracted `resolveGrappleBonus(actor)` into `combat-stat-rules.js` (BAB via `SchemaAdapters.getBAB()`, best-of-STR/DEX via `SchemaAdapters.getAbilityMod()`, a new `GRAPPLE_SIZE_MODIFIERS` table, the same species-bonus path). This closed the fallback-formula problem but — per addendum 2 — did **not** yet make this the only grapple formula in the codebase.

**Certification-correction addendum 2 (post-review, SSOT completion): a THIRD review correctly found `derived-calculator.js`'s inline grapple block was still a second, independent implementation of the identical formula** (own copy of the size table, own best-of-ability comparison) — the intermediate fix above added a correct standalone resolver but never removed the original duplicate it was extracted from, so "one grapple formula" was not yet true despite being stated as such. **Fixed properly this time**: extracted the actual arithmetic into `combat-stat-rules.js#computeGrappleBonus({bab, strMod, dexMod, sizeMod, speciesBonus})` — a pure function over already-resolved numeric inputs, now the **only** grapple arithmetic expression in the codebase. `resolveGrappleBonus(actor)` resolves those inputs from a live actor (via `SchemaAdapters` + `getGrappleSizeModifier()`) and delegates to it; `derived-calculator.js` supplies its own freshly-computed current-pass inputs directly to the same function (deliberately *not* via `resolveGrappleBonus(actor)`, since some of those values may not be written back onto `actor` itself yet mid-pass, and re-reading them via `SchemaAdapters` could see stale prior-cycle data).

**Bonus discovery while doing this extraction: `derived-calculator.js`'s grapple computation has never actually worked.** It read `bab.total` for the BAB term, but `BABCalculator.calculate()` always returns a plain number (confirmed by reading every return path in `bab-calculator.js` and live-executing it), never an object — so `bab.total` was always `undefined`, and `system.derived.grappleBonus` was always `NaN`. This had **zero visible player impact** because `PanelContextBuilder.js`'s sheet-display fallback already guards with `Number.isFinite(grappleCandidate)` (line ~1435) and silently falls through to its own correct duplicate formula whenever the canonical value is `NaN` — exactly the kind of silent-fallback-masks-a-broken-canonical-source risk this migration's earlier ability-schema work also found repeatedly. Fixed as a natural side effect of passing the correct `bab` (not `bab.total`) into `computeGrappleBonus()`.

**Live-verified invariant, as of round 2** (`tests/grapple-bonus-ssot-parity.test.mjs`, 5 input combinations — STR>DEX, DEX>STR/Gar'ee-shaped, equal STR/DEX, Large size, a species grapple bonus): `computeGrappleBonus()` === `DerivedCalculator`'s real `system.derived.grappleBonus` (now a finite number, not `NaN`) === `resolveGrappleBonus(actor)` === the actual grapple roll modifier (`houserule-grapple.js`), across every case. This is the required parity the freeze charter's SSOT standard calls for — not "these currently agree," but "these cannot disagree because they're the same function."

**Certification-correction addendum 3 (post-review, round 3): SSOT was finally true, but the single source of truth was itself wrong, and two more live consumers still bypassed it.** A fourth review made the point the whole freeze exists to enforce: *agreement is not the standard the single source itself must also be correct.* Three separate findings, all fixed in this round:

**1. `GRAPPLE_SIZE_MODIFIERS` (`combat-stat-rules.js`) was never checked against a published rule and was wrong.** It used a step-of-4 table (`fine:-8 … colossal:+16`), copied forward from `derived-calculator.js`'s original inline formula with no book citation anywhere. Checked two independent ways:
- Two real, published creature stat blocks already present in this repo's own compendium data (`packs/beasts.db`): **Aiwha** (Gargantuan, BAB +3, STR 25/+7 mod, published Grapple modifier **+25** → back-solved size modifier = 25 − 3 − 7 = **+15**) and **Bantha** (Huge, BAB +2, STR 28/+9 mod, published Grapple modifier **+21** → back-solved size modifier = 21 − 2 − 9 = **+10**).
- Two independent SWSE rules-reference lookups of the Core Rulebook's Grapple size modifier table, both agreeing on the same values.

Both confirm the correct table is step-of-5 (`fine:-20, diminutive:-15, tiny:-10, small:-5, medium:0, large:+5, huge:+10, gargantuan:+15, colossal:+20`), **not** the step-of-4 table that had just been centralized. **Fixed**: `GRAPPLE_SIZE_MODIFIERS` corrected with a source-citation comment; golden tests for all 9 categories plus the Aiwha/Bantha cross-check live in `tests/grapple-size-modifier-book-values.test.mjs` (the Aiwha/Bantha check re-reads `packs/beasts.db` directly at test time and asserts the compendium's own BAB/STR/size fields haven't drifted, so the test can't silently stop meaning anything if that data changes later). This also required a companion fix to `tests/houserule-grapple-authority.test.mjs`'s Test 3, which had hardcoded the old (wrong) Large = +4 expectation.

**2. Two more live consumers were still independently reconstructing the formula, not reading the canonical value — SSOT was not actually complete:**
- **`PanelContextBuilder.buildResourcesPanel()`** (the live context builder for the v2 character sheet's displayed Grapple box) still computed its own `BAB + max(STR,DEX) + local size table + species` and only used the canonical `derived.grappleBonus` when it read as non-zero — `Number.isFinite(grappleCandidate) && (grappleCandidate !== 0 || grappleFallback === 0)`. **This meant a legitimate canonical Grapple of exactly `0` could be silently discarded in favor of the private fallback formula whenever that formula returned something non-zero** — a real player-visible correctness bug, not just a duplication risk. **Fixed**: removed the private formula and local size table entirely; the box now shows `system.derived.grappleBonus` whenever finite (including `0`), falling back to the shared `resolveGrappleBonus(actor)` resolver — never a private formula — only for the brief window before derived data exists.
- **`scripts/combat/systems/grappling-system.js#_rollGrappleBonus()`**, the base every opposed Grab/Grapple/Pin/Trip/Throw/Crush/Escape check in `SWSEGrappling` (and its `grapple-runtime-patches.js` overrides, which call `this._rollGrappleBonus` and therefore inherit this fix automatically) is built on, was the most serious of the three: it computed `bab + ability + halfLevel + sizeMod + speciesGrapple`, adding **a half-heroic-level term the published Grapple formula does not have at all**, on top of yet a **third**, independently-wrong local size table (`_sizeMod()`: step-of-8, `fine:-16 … colossal:+16`) that agreed with neither the old centralized table nor the correct one. For Gar'ee (BAB +7, DEX +5, medium size 0 → certified +12), this path would have produced `12 + halfLevel(4) = 16` — a real, live mechanical discrepancy in actual opposed-grapple combat rolls, not a display-only issue. **Fixed**: `_rollGrappleBonus()` now starts from `system.derived.grappleBonus` when finite, else `resolveGrappleBonus(actor)`, and applies only genuinely contextual, non-static additions on top (talent/feat grapple-rule bonuses via `swseTalentGrappleBonus()`, and `MetaResourceFeatResolver.getGrappleResistanceBonus()` for `resistGrapple` mode) — the half-level term, the local `_sizeMod()` table, and the duplicate BAB/ability/species computation were removed entirely (dead code, no other caller referenced `_sizeMod` or the `useDex` context option it also supported, which nothing ever passed).

**3. Repository-wide search (per the review's item F) found a fourth, previously unclassified duplicate: `scripts/ui/combat-stats-tooltip.js#getGrappleBreakdown()`**, the hover-tooltip breakdown shown on the character sheet's Grapple stat. It computed `BAB + Strength-only + a local size table (step-of-4, the same wrong one as #1) + a dead, never-set system.grapple.miscMod field` (grep-confirmed zero writers anywhere in the codebase — an orphaned schema field), and never showed a species-bonus row despite the canonical formula including one. A DEX-based grappler like Gar'ee would see a tooltip breakdown crediting Strength (+2) instead of Dexterity (+5). **Fixed**: now decomposes the same `computeGrappleBonus()` inputs (BAB, whichever of STR/DEX is actually higher — correctly labeled, size via the corrected `getGrappleSizeModifier()`, species bonus when present) and displays the canonical `system.derived.grappleBonus` as the total whenever finite. See `tests/combat-stats-tooltip-grapple-authority.test.mjs`.

**Repository-wide search — remaining occurrences classified (none left unclassified):**
- `scripts/sheets/v2/character-sheet/concept-context.js:1849` and `scripts/apps/progression-framework/steps/follower-steps/follower-confirm-step.js:168` — **Category B (legitimate consumers)**: both display an already-computed `grappleBonus`/`stats.grappleBonus` value passed into them; no formula, no action needed.
- `scripts/migration/migrate-species-to-structured-rules.js` — **out of scope**: a one-time species-data-authoring tool that parses descriptive text like "+X species bonus on grapple checks" into `speciesCombatBonuses.grapple` metadata. Not a live formula; feeds the canonical formula's species-bonus input rather than competing with it.
- `scripts/apps/progression-framework/steps/summary-step.js:578` (`afterGrapple = beforeGrapple - beforeBAB - currentStrMod + afterBAB + afterStrMod`, the level-up wizard's before/after preview) — **Category C, low severity, not fixed this round**: a delta computed on top of the canonical `_getCurrentGrapple(actor)` (which itself correctly reads `system.derived.grappleBonus`), not an independent from-scratch formula. It only omits a size/species delta, which essentially never changes during a level-up. Flagged, not blocking certification.
- `scripts/apps/progression-framework/steps/summary-step.js:1166` (`grapple = bab + strMod`, a chargen-time "projected stats" preview shown before any actor exists) and `scripts/apps/progression-framework/adapters/follower-deriver.js:320` (`grappleBonus = abilities.str.mod`, follower-template stat generation) — **CONFIRMED defects, deliberately not fixed in this round**: both omit the DEX "better of" comparison, size modifier, and species bonus, structurally identical in kind to the bugs fixed above. Both are chargen/follower-creation-time previews with no live actor to read `system.derived.grappleBonus` from (unlike every other fix in this round, which touched live sheet/roll consumers on an existing, already-prepared actor) — fixing them correctly means threading size/species data through the chargen and follower-creation pipelines, which is out of scope for a Grapple-domain-only pass. **Recommended**: fold into Batch 2's already-queued follower-authority work (expanding item 3 from "follower Fortitude" to "follower/chargen combat-stat preview authority").
- `scripts/data/background-events.js:96` (the "Enslaved" background's "Grapple Survivor" special ability, `target:'grapple', value:2, requiresRuntime:false`) — **flagged here as an unresolved modifier-pipeline wiring question; fully traced, confirmed CONFIRMED DEFECT, and FIXED in round 4** — see "Certification-correction addendum 4" below.

**Live-verified invariant, round 3 (`tests/grapple-bonus-ssot-parity.test.mjs`, now 6 input combinations — STR>DEX, DEX>STR/Gar'ee-shaped, equal STR/DEX, Large size, a species grapple bonus, and a legitimate exact `0`)**: `computeGrappleBonus()` === `DerivedCalculator`'s `system.derived.grappleBonus` === `resolveGrappleBonus(actor)` === the grapple roll modifier (`houserule-grapple.js`) === the displayed sheet Grapple box (`PanelContextBuilder`) === `SWSEGrappling`'s opposed-check base (`_rollGrappleBonus`) — six call sites, one function, across every case including the `0`-discard edge case that motivated adding it.

**Wording standard, reaffirmed**: "one grapple formula" is claimed only once every consumer demonstrably calls the same function; **"rules-fidelity-certified" is claimed only once that one function's constants have been checked against a published source**, not merely asserted or pattern-copied forward from an earlier version of the code. Both standards are now met for Grapple.

**Certification-correction addendum 4 (post-review, round 4): the core formula was correct, but permanent static Grapple bonuses never reached it at all.** A fifth review pointed out that round 3 certified the *arithmetic* of Grapple but never audited whether every legitimate source of a Grapple bonus actually feeds that arithmetic. Tracing the "Enslaved" background's "Grapple Survivor" (+2 competence, permanent, not mode-gated) end-to-end through the real pipeline found it never reached a character's Grapple total at all, for two independent reasons that would have interacted dangerously if fixed in the wrong order:

1. **Duplicate representation at the source.** `data/backgrounds.json`'s Enslaved record authors the same +2 grant twice — once in `mechanicalEffect` (`{type:'bonus', target:'grapple', value:2}`) and again in `specialAbilities[0]` (`{type:'bonus', target:'grapple', value:2, bonusType:'competence', abilityId:'enslaved-grapple-bonus'}`). `hydrateBackgroundEvent()` (`scripts/data/background-events.js`) doesn't introduce this — both fields already coexist in the raw authoring data. `BackgroundGrantLedgerBuilder._mergeBonuses()` faithfully turned this into **two** `flat` bonus entries for one real grant.
2. **The consumer silently dropped it entirely, independent of (1).** `ModifierEngine._getBackgroundModifiers()`'s flat-bonus loop required every record to have `Array.isArray(bonus.applicableSkills)` — a skill-bonus-only shape. Enslaved's records are `{value, target:'grapple'}` (no `applicableSkills`), so they always failed the guard and were `continue`d past. **Live-verified via the real pipeline** (`hydrateBackgroundEvent()` → `BackgroundGrantLedgerBuilder.build()` → `applyCanonicalBackgroundsToActor()` → `ModifierEngine._getBackgroundModifiers()`, reading the actual record from `data/backgrounds.json`, not a hand-typed fixture): the +2 was authored, merged (twice), and materialized onto `actor.flags.swse.backgroundBonuses.flat` — then discarded at the very last step. An Enslaved character's Grapple was silently 2 points low, on every roll and every display, with no code path anywhere adding it back.

**The trap the review named explicitly, and why fix order matters:** fixing (2) alone — teaching `ModifierEngine` to understand generic `target`-shaped flat bonuses — without first fixing (1) would have flipped a silently-missing +2 into a silently-wrong +4. **Fixed in the correct order:**
1. `BackgroundGrantLedgerBuilder._mergeBonuses()` (`scripts/engine/progression/backgrounds/background-grant-ledger-builder.js`) now establishes semantic identity per background: `specialAbilities`-derived flat bonuses (richer metadata: `abilityId`, `bonusType`) are collected first; a `mechanicalEffect`-derived bonus is only added if no `specialAbilities` entry for the same background already matches its `target`+`value`. Live-verified: Enslaved now produces exactly one `flat` entry.
2. `ModifierEngine._getBackgroundModifiers()` (`scripts/engine/effects/modifiers/ModifierEngine.js`) now handles the generic `target`-shaped record (creating one modifier targeting that raw key, e.g. `'grapple'`, with `type` taken from `bonusType` when it's a recognized `ModifierType`), in addition to the pre-existing `applicableSkills`-shaped one. **Defensively dedupes a second time**, by `backgroundId + target + value` (deliberately excluding `bonusType` from the identity key, since the two duplicate representations don't agree on it) — this protects any actor whose `flags.swse.backgroundBonuses` was already materialized and persisted *before* fix (1) existed, which would otherwise still carry a stale duplicate pair forever (materialization only re-runs on background reselection, not on every `prepareData()`). **Live-verified against exactly that stale-duplicate shape**: the defensive dedup collapses it to one +2, not two.

**Layering point and the static/contextual boundary audit (per explicit review requirement — every `GRAPPLE_BONUS`-shaped source individually classified):**
- `DerivedCalculator`'s grapple block (`derived-calculator.js`) now adds `'grapple'` to the same `allTargets` list already feeding `ModifierEngine.buildModifierBreakdown()` for skills/defenses/HP/BAB/initiative, and layers the resulting `modifierMap['grapple']` on top of `computeGrappleBonus()`'s core result **exactly once**, storing an explicit breakdown (`system.derived.grappleBonusParts = {core, staticModifiers, total}`) other consumers can decompose from rather than rediscovering.
- **Species grapple bonus** (`speciesCombatBonuses.grapple`) — **STATIC**, already correctly part of the core formula (unchanged).
- **Background grapple bonus** (Enslaved's Grapple Survivor) — **STATIC** (permanent, not mode-gated in its authored data) — now correctly layered as above.
- **Expert Grappler** (talent, `packs/talents.db`) — audited directly against its actual compendium data, not assumed: authored as a `GRAPPLE_BONUS` rule with `mode:'attackGrapple'` and an explicit `staticSheetPolicy:'manual_only'` annotation — **CONTEXTUAL by the data's own authorial intent**, correctly excluded from the static total. It is *not* dead code (an earlier pass of this same review mistakenly concluded `GRAPPLE_BONUS`/`swseTalentGrappleBonus()` had no live producer, having checked only the feat-normalization hooks and missed that this talent's compendium item ships the rule pre-authored) — it is the sole live `GRAPPLE_BONUS` source in the entire compendium (grep-confirmed against `packs/feats.db`/`packs/talents.db`/`packs/feat-catalog.db`) and was already being correctly consumed by `SWSEGrappling._rollGrappleBonus()`'s existing `swseTalentGrappleBonus()` call since round 3, unchanged. Live-verified: applies +2 only when `context.mode === 'attackGrapple'`, never in `resistGrapple` mode, never folded into `system.derived.grappleBonus`.
- **Grapple Resistance** (feat) — `RESIST_GRAB_AND_GRAPPLE`, `modes:['resistGrab','resistGrapple']` — **CONTEXTUAL**, correctly excluded from the static total and already correctly consumed via `MetaResourceFeatResolver.getGrappleResistanceBonus()` since round 3, unchanged. Live-verified: applies +5 only in `resistGrapple`/`resistGrab` modes.
- No source is eligible in both layers — confirmed by construction (the static layer only ever reads `ModifierEngine`'s aggregated `'grapple'` target, which nothing mode-gated writes to, since `GRAPPLE_BONUS`/`RESIST_GRAB_AND_GRAPPLE` rules are consumed exclusively by `swseTalentGrappleBonus()`/`MetaResourceFeatResolver`, never by `ModifierEngine`'s generic item-modifier collection) and live-verified with both a background bonus and Expert Grappler present on the same actor simultaneously (static total includes only the background's +2; `attackGrapple` mode adds Expert Grappler's +2 on top, for +4 total; `resistGrapple` mode shows only the static +2).
- **Also newly found while auditing feats for other `target`-shaped grapple bonuses**: "Improved Grapple" (+5 on grapple checks, per its description) exists only as a `value:0, enabled:false, staticSheetPolicy:'exclude'` metadata placeholder — a genuinely missing feature (like Energy Shield ACP), not a math-authority duplication. Flagged for Batch 2, not fixed here.

**Tooltip ledger fix — the required `SUM(rows) === total` invariant.** `combat-stats-tooltip.js#_getModifiersForTarget()` had an independent, pre-existing bug found while wiring this: it read `actor.system.derived?.modifiers?.[target]?.modifiers`, but `DerivedCalculator` actually persists this at `system.derived.modifiers.breakdown[target].breakdown` (`ModifierEngine.buildModifierBreakdown()`'s real shape) — so this helper had always returned `[]` for every target that called it (`Grapple`, `BaseAttackBonus`, `Initiative`), regardless of any real modifier. **Fixed** the path/shape read. `getGrappleBreakdown()` now sources its static-modifier rows from this same corrected path — i.e., from the identical ledger `DerivedCalculator` used to build the canonical total — rather than any independent computation, so the rows can never disagree with the displayed total. The old test's synthetic `derivedGrappleBonus: 999` fixture (which only proved the tooltip *preferred* the canonical total, not that its rows summed to it) is superseded by `tests/grapple-static-modifier-composition.test.mjs`, which asserts `SUM(rows) === total` directly against real computed values across every golden case. Two related, pre-existing target-key bugs were found and left unfixed as explicitly out of scope for a Grapple-only pass: `BaseAttackBonus`'s modifier row remains inert because `'attack.bonus'` was never added to `DerivedCalculator`'s `allTargets` list at all, and `Initiative`'s modifier row queries the wrong key (`'initiative'` instead of the actual `'initiative.total'`) — both flagged for a future audit.

**Live-verified invariant, round 4** (`tests/grapple-static-modifier-composition.test.mjs`): across 6 static-composition golden cases (plain, Enslaved alone, species alone, Enslaved + species together, Large size, and a pre-fix duplicate-representation input proving the dedup) — `derived Grapple` === `sheet box` === `SUM(tooltip rows)` === `tooltip total` === `SWSEGrappling`'s neutral-mode opposed-check base === the grapple roll formula's static base, and the Enslaved contribution is exactly `+2` in every case, never `+4`. Separately, Expert Grappler and Grapple Resistance are each verified to add their bonus only in their gated mode, on top of the (unaffected) static total, exactly once. A fourth check reproduces the full real background pipeline end-to-end and confirms exactly one +2 grapple modifier reaches `ModifierEngine`.

**Wording standard, extended**: "static-modifier-composition-certified" is claimed only once (a) every legitimate static source of a Grapple bonus has been traced from its authoring data through to `system.derived.grappleBonus` and confirmed to arrive exactly once, (b) every contextual source has been confirmed to apply only at roll time and never leak into the static total, and (c) the tooltip's displayed parts have been proven — not merely asserted — to sum to the displayed total. All three are now true for Grapple.

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

**This section originally described a "20-point HP undercount" against Gar'ee's live actor. That was wrong and has been corrected** (see the HP domain section above for the full writeup). Gar'ee's actual, current `system.hp.max` is **108** — obtained directly from his real actor export, not hand-derived. He was never destructively recomputed. The finding is that `ActorEngine.recomputeHP()`'s formula, hand-derived from its quoted source, **would** produce 88 from his current data if it ever completed and returned a value — and, separately, it currently cannot even complete a value-changing call at all, due to a live-confirmed `ReferenceError` (Defect B in the HP domain section) that fires before any `return` statement in that branch is reached. The crash itself — not the 88 figure — is what was verified by importing and executing the real, unmodified `actor-engine.js` directly (bypassing this repo's test-only fake, which the standard harness entry point redirects to — see `tests/helpers/foundry-shim/path-loader.mjs`), with `ClassesDB` populated directly (it normally builds from a Foundry compendium pack unavailable under this harness) so `ActorAbilityBridge.getClasses()` could resolve a real class item.

**Correct RAW multiclass HP**, confirmed against Gar'ee's own `progression.hpGainHistory`/`classLevelHistory` (both recorded verbatim in his actor export — his HP is genuinely additive/historical, not something to hand-derive): starting HP + accumulated per-level gains through his actual level-up choices, landing on 108 exactly (his own history shows `previousMax: 96 → newMax: 108` at level 8, `+12` via "maximum" method, Soldier hit die 10 + CON mod 2). `HPCalculator.calculate()`'s dead-code algorithm (`hp-calculator.js`) independently arrives at the same 108 via `10*3+2` (level 1) `+ 5*(10+2)` (Soldier levels 2-6) `+ 2*(6+2)` (Scoundrel levels 7-8) — consistent with, not the source of, the real authority.

**`ActorEngine.recomputeHP()`'s formula, hand-evaluated (not executed to completion)** with `ActorAbilityBridge.getClasses(Gar'ee)[0]` confirmed = Soldier (see the HP domain section's "Open question resolved"):
```
hpAtFirstLevel = 10*3 = 30
hpPerLevel     = floor(10/2)+1 = 6
newHPMax       = 30 + (8-1)*6 + 2*8 = 30 + 42 + 16 = 88
```
This is the value the source arithmetic algebraically produces for Gar'ee's real inputs — it is **not** a value the live function was observed to return. Live-executing the real function against Gar'ee's actual state (`currentMax = 108`, which differs from the computed 88) enters the value-changing branch and throws the `ReferenceError` before reaching any `return` statement, so nothing is ever returned on that path. A separate, artificial isolation run — with `currentMax` deliberately set equal to the computed 88 so the function takes its early-return "no change" branch instead — confirmed that branch returns normally without crashing (proving the crash is confined to the value-changing branch, not the whole function), but that run cannot be read as "the function returned 88 for Gar'ee," since it required overwriting his real 108 input to avoid the branch that always crashes. In practice, on Gar'ee's real data, the calling hooks swallow the thrown error — so `system.hp.max` is never touched by this path at all today, for any actor with real per-level history.

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
