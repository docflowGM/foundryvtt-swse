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

**Phase 0 (no-code-changes audit) — in progress.** This document is being
filled in as the audit proceeds. See the "First Report" section at the
bottom for the point-in-time summary required before any broad edits
begin.

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

## Domain: Flat-Footed Reflex — CONFIRMED DEFECT

`DefenseCalculator.calculate()` (defense-calculator.js:841-844, 896-912):
```js
const flatFootedTotal = Math.max(1, reflexTotal - Math.max(0, reflexAbilityMod));
```
This strips only the positive Dexterity modifier from `reflexTotal`. But `reflexTotal` already includes `refStateBonus` — the sum of ALL passive/state "defense.reflex" modifiers, including **dodge-type bonuses** that SWSE RAW says flat-footed characters lose along with their Dex bonus. Confirmed dodge-type sources feeding this exact channel with no filtering anywhere (`_sumPassiveStateDefenseModifiers`/`_getStateModifiers` in defense-calculator.js, and `ModifierEngine.js`, have zero `dodge`-type handling — grep-confirmed):
- Martial Arts I/II/III (`martial-arts-feat-normalization-hooks.js:67-80`, `type:'dodge', target:'defense.reflex'`)
- Defense Avoidance feat line (`defense-avoidance-feat-normalization-hooks.js:173`, `defense-avoidance-runtime-patches.js:160`)
- Area Explosives, Rebellion Combat, core attack-option feats (all `type:'dodge'`)

**Classification: CONFIRMED (not merely suspected) — a real SWSE rules-correctness bug**, not an architecture/duplication issue. The code comment at the flat-footed calc only discusses the Dex-penalty nuance and never mentions dodge bonuses, indicating this was never deliberately excluded — an oversight, not a design choice.

Also flag: `rolls/defenses.js:115-117` (`calculateFlatFooted`) reads `system.derived.defenses.flatFooted` (the whole object) rather than `.total` — needs a call-site check for whether this is a live bug or callers destructure `.total` themselves.

## Domain: Damage Threshold — CONFIRMED DEFECT (two independent formulas)

Storage: `system.derived.damageThreshold` (flat number — NOT `derived.damage.threshold`, per an explicit warning comment in `character-like-sheet.js:985`).

- **Path A (persisted authority):** `DerivedCalculator.computeAll()` inline (`derived-calculator.js:838-906`). Honors `MetaResourceFeatResolver.getDamageThresholdRules()` (Improved Damage Threshold's `+5` flat bonus, "use Will as base" feats) and `modifierMap['defense.damageThreshold']`. Sole writer of `system.derived.damageThreshold`.
- **Path B (combat engine, independently recomputes):** `scripts/engine/combat/threshold-engine.js`:
  - `computeBaseThreshold()` (:86-96) reads `defenses.fortitude.total` directly, **ignoring** `MetaResourceFeatResolver` rules entirely.
  - `getDamageThreshold()` (:106-141) runs a **third**, parallel modifier-aggregation path (`ModifierEngine.getAllModifiers` filtered for damage-threshold targets) distinct from Path A's `modifierMap['defense.damageThreshold']`.
  - `calculateDamageThreshold()` (:171-205, used by `evaluateThreshold()` — the actual gameplay/combat consumer): defers to `system.derived?.damageThreshold` when the "Enhanced Massive Damage" house rule is OFF (correct), but **recomputes from scratch** (`fortTotal + heroicLevel + sizeMod`, no feat-rule awareness) when the house rule is ON.

**Classification: CONFIRMED.** Any actor with Improved Damage Threshold, a "use Will as base" feat, or any table with `enableEnhancedMassiveDamage` on can see the sheet-displayed Damage Threshold disagree with the value `ThresholdEngine` actually uses to resolve massive-damage/condition-track-shift checks in combat.

## Domain: HP / Max HP — CONFIRMED DEFECT (multiclass-relevant; directly affects Gar'ee)

- **Formula 1 (correct multiclass accumulation, DEAD CODE):** `HPCalculator.calculate()` (`scripts/actors/derived/hp-calculator.js:47-95`). Iterates every class-level entry, correctly stacking each class's own hit die per level (nonheroic hitDie forced to 4). Imported into `derived-calculator.js:25` but explicitly never called — comment at :254 states "Do NOT call HPCalculator.calculate() - that is now owned by ActorEngine."
- **Formula 2 (sole writer of `system.hp.max`):** `ActorEngine.recomputeHP()` (`scripts/governance/actor-engine/actor-engine.js:3781-3894`). Uses **only the actor's first class item** (`ActorAbilityBridge.getClasses(actor)[0]`) and a single overall `system.level` for the entire HP calculation: `hpAtFirstLevel + (level-1)*hpPerLevel + conMod*level + bonusHP + featHPBonus`.

**Classification: CONFIRMED divergence, SUSPECTED live-impact** (needs a direct multiclass HP fixture test to confirm the actual numeric error, but the algorithmic difference is proven by reading both implementations). **Gar'ee is Soldier 6 / Scoundrel 2 — exactly the multiclass shape this bug would affect** if `getClasses(actor)[0]` returns Soldier (probably added first) and Scoundrel's own hit die/progression is never consulted for its 2 levels. This needs to be checked directly against Gar'ee's actual persisted `system.hp.max` in Phase 2 (golden fixture).

Guard comment confirms intended single-writer contract (`actor-engine.js:618`: "[HP SSOT Violation] system.hp.max may only be written by ActorEngine.recomputeHP()") — the contract is fine, the **formula itself** is what's suspect for multiclass actors.

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

## Domain: Grapple — CONFIRMED DEFECT (roll-time formula diverges from displayed formula)

Three to four independent implementations, not one:
- **A (canonical/derived):** `derived-calculator.js:348-357` — `bab.total + max(strMod,dexMod) + sizeMod + speciesGrapple` → `system.derived.grappleBonus`. Matches RAW.
- **D (guarded duplicate, currently consistent):** `PanelContextBuilder.js:1428-1438` — identical formula, own copy of the size table, used only as a fallback when `derived.grappleBonus` is unset. Numerically consistent today but a second hand-maintained copy that can silently fork from the canonical table on a future edit.
- **D — CONFIRMED live bug:** `scripts/houserules/houserule-grapple.js:58-60` (`GrappleMechanics.performGrappleCheck()`), the code that actually builds the `1d20 + grappleBonus` roll for the grapple house-rule action: `bab + strMod` **only** — no size modifier, no species bonus, no STR/DEX "better of" comparison (hardcodes STR), and doesn't read `system.derived.grappleBonus` at all. **Classification: CONFIRMED.** Any Small/Large creature, DEX-based grappler, or species with a grapple racial bonus gets a materially wrong number on the actual roll while the sheet displays the correct one. Already tracked as a known gap in `docs/audits/combat-phase-1a-ssot-decision-matrix.md:30` ("Grapple... Keep and later fix RAW seams") — not a fresh regression, but unresolved.
- A fourth, chargen-preview-only formula exists (`follower-deriver.js:320`, STR mod alone) — lower stakes, scoped to the follower-creation wizard.

**Gar'ee's certified Grapple = +12 (BAB 7 + DEX +5 + size 0) requires the DEX-vs-STR "better of" comparison** (his DEX +5 > STR +2) — `houserule-grapple.js`'s STR-only formula would compute `7 + 2 = 9` instead, a directly-testable, already-confirmed divergence.

## Domain: Weapon Melee/Ranged Schema — CONFIRMED DEFECT (the "Bluebolt" bug)

**Verdict: the reported mechanism is real and reproducible from the code as written**, though not currently present in any shipped compendium/pack data (364 standalone weapon items + ~1989 actor-embedded weapons across all packs checked — zero existing mismatches found). This is a live authoring hazard in the item sheet's write path, reachable through completely normal sheet use (not just direct DB editing).

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
