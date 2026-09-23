# V2 Damage Modifier Authority Audit

Status: **SSOT IMPLEMENTED AND CORRECTED.** Sections 1-17 below are the
original audit (read-only investigation, produced before implementation
was authorized). Section 18 records the authorized implementation itself
— the canonical Damage Modifier SSOT
(`resolveDamageComposition()`/`buildDamageFormula()` in
`combat-roll-math.js`) and its migration into
`damage.js#rollDamage()`/`attacks.js` — plus the Phase A closure findings
that were required to gate it. Section 18.12 records a subsequent
independent-review correction pass (three blockers + one hardening item
found by direct inspection of the pushed head) that closes the gap
between "the formula-builder fragmentation is solved" and "the Damage
domain is actually certified." Section 18.13 records a follow-up addendum
that re-certified one of those three blockers (attack-option activation
context transport) to a materially higher rigor bar, and explicitly
reconciles that addendum's now-outdated assumption that the other two
blockers were still open. Phase A closure detail lives in
`docs/audits/v2-damage-modifier-authority-audit-correction-1.md`; Section
18 summarizes and finalizes it rather than repeating it in full.

Companion ledger entry: `docs/audits/v2-math-integrity-authority-ledger.md`, "Domain: Damage" section (pointer only — this document is the full record).

---

## 1. Executive Summary

Damage composition in this codebase is **not a single authority** — it is at minimum **three independently-implemented formula-construction paths**, two of which are named identically (`rollDamage`) in different files, plus **at least three independent declarative-rule interpretation systems**, plus **at least two independent modifier-target vocabularies** for what should be one concept ("a damage bonus"). This mirrors, and in some respects exceeds, the fragmentation the original Attack Bonus audit found before that domain's SSOT work began.

**The single most severe, confirmed, live finding**: the actual production damage-roll path every player reaches from the character sheet's Damage button and from the post-attack chat card's Damage button (`SWSERoll.rollDamage` → `scripts/combat/rolls/damage.js#rollDamage()`) **never applies `damageExtraWeaponDice`, `damageDiceStepBonus`, `damageDieStepIncreases`, or `criticalDamageDieStepBonus`** for an ordinary (non-stock-droid) actor. Concretely: **Deadeye, Burst Fire, Mighty Swing, Rapid Shot's/Rapid Strike's damage-die-step bonus, and any critical-only die-step bonus are computed correctly by `CombatOptionResolver.collectAttackModifiers()` but are silently discarded before the dice are ever rolled**, because the live formula-builder never reads those four fields at all. A second, separate `rollDamage()` implementation exists in `scripts/combat/rolls/attacks.js` that *does* read them correctly — but it has no live UI caller for ordinary weapon attacks (only a narrow Force Adept talent-action path reaches it), and it is itself missing features the live path has (Sneak Attack, Force Item/Inquisition extra dice, Force Point bonus, custom modifier, critical multiplier/critical-bonus-formula handling).

This is presented as a confirmed defect per the audit's explicit permission to document (not fix) a severe live bug found in passing. **No fix is applied in this document or this round.**

Beyond that centerpiece finding, the audit found: a documented ("Phase 3 Locked") `CombatEngine.resolveAttack()` orchestration architecture (`scripts/engine/combat/ARCHITECTURE.md`) that does **not** appear to be the live path for an ordinary character weapon attack at all (the live path is `SWSERoll.rollAttack`/`SWSERoll.rollDamage`, which never calls `CombatEngine.resolveAttack()`); two independently-implemented `getCriticalMultiplier()` functions with different signatures and different rule-awareness; two independent chat-button click handlers for the same damage button class, one silently shadowing the other via `stopImmediatePropagation()`; a `TalentEffectEngine.calculateDamageBonus` that does not exist as a real class method anywhere and is only ever installed as a runtime monkey-patch fallback (implementing Sneak Attack only, despite `damage.js`'s own comment claiming "Sneak Attack, Skirmisher, etc."); and a modifier-target vocabulary for damage that is declared one way in `ModifierTypes.js` (`global.damage` only) and consumed a second, different way inside `CombatOptionResolver` (`damage`/`damage.weapon`/`damage.melee`/`damage.ranged`), while real pack data additionally contains an `attack_and_damage` target that matches **neither** vocabulary.

**Recommendation (detailed in §13)**: promote `combat-roll-math.js#resolveDamageBonus()` — already the correct, single, well-documented numeric-bonus authority both the attack dialog's tooltip and (indirectly) the live roll consult — into a genuine **Damage Contribution Engine** that also owns dice-count/die-step/critical composition, and make it the *only* function that ever constructs a damage formula string. Retire `damage.js`'s and `attacks.js`'s independent formula-building logic in favor of calling this engine. This is a smaller, more targeted change than building a new parallel system, and it directly closes the severe die-step/extra-dice omission by construction (there would be nowhere else for that logic to be silently absent from).

---

## 2. Current Damage Authority Graph

```
SOURCE DATA
  packs/feats.db, packs/talents.db (abilityMeta.rules[], abilityMeta.modifiers[])
  weapon Item.system.damage / .damageFormula
  actor level / abilities / class features
       │
       ▼
CLASSIFICATION / DISCOVERY  (at least 3 independent interpreters — see §9)
  (a) CombatOptionResolver.collectAttackModifiers()
        └─ collectWeaponRuleModifiers()   — switch on rule.type (WEAPON_DAMAGE_DIE_STEP,
                                             WEAPON_DAMAGE_DIE_SIZE_STEP, UNARMED_DAMAGE_STEP,
                                             UNARMED_EXTRA_WEAPON_DICE, WEAPON_DAMAGE_BONUS,
                                             CRITICAL_DAMAGE_DIE_STEP, EXTEND_CRITICAL_RANGE,
                                             CRITICAL_RIDER, HIT_RIDER, WEAPON_CRITICAL_MULTIPLIER_MIN)
        └─ collectModifierRollBonuses()   — reads item.system.abilityMeta.modifiers[],
                                             target ∈ {damage, damage.weapon, damage.ranged, damage.melee}
                                             (a DIFFERENT vocabulary than ModifierEngine's own — see §5)
  (b) attack-option-adapter.js / attack-primitives.js / attack-option-contract.js
        — owns FORCE_POINT_DIE_STEP, RIDER_EFFECT, and other rule types CombatOptionResolver's
          own switch does NOT handle. NOT traced in depth in this pass (flagged, §17).
  (c) ResolutionContext / RULES.* (scripts/combat/utils/combat-utils.js)
        — owns RULES.CRITICAL_DAMAGE_BONUS, RULES.MODIFY_CRITICAL_MULTIPLIER (getCriticalDamageBonus,
          getCriticalMultiplier(actor, weapon)) — a THIRD independent rule-instance reader, with its
          own getCriticalMultiplier() signature distinct from combat-stat-rules.js's (§9, Blocker-class finding)
       │
       ▼
NORMALIZATION
  CombatOptionResolver.collectAttackModifiers() returns one shape:
  { damageBonus, damageExtraWeaponDice, damageDiceStepBonus, damageDieStepIncreases,
    criticalDamageDieStepBonus, criticalThreatNaturalMin, criticalMultiplierMin,
    targetEffectsOnHit, targetEffectsOnCritical, flags, breakdown }
  — this is a genuinely good, already-normalized shape. The problem is downstream (next stage),
    not here.
       │
       ▼
DAMAGE MODIFIER COMPOSITION (numeric bonus only)
  combat-roll-math.js#resolveDamageBonus(actor, weapon, context)
    = ½ level + ability + weapon enhancement + rage + Rapid Alchemy + Effect-Intent(global.damage)
      + optionModifiers.damageBonus + scoped-feat damage
    — CANONICAL for the numeric total. Both attacks.js's live rollAttack() tooltip/breakdown path
      and (indirectly) the live damage roll consult this. See §3, §4.
    — Special-cased: resolveStockDroidDamageContract() — the ONLY path that also applies
      damageDieStepIncreases/damageExtraWeaponDice/criticalDamageDieStepBonus on top of a base
      formula, but ONLY for stock-statblock droids.
       │
       ▼
DAMAGE FORMULA / DICE CONSTRUCTION  ⚠ NOT SINGLE-AUTHORITY — see §3, §9 Blocker 1
  Path A (LIVE, both sheet Damage button and chat-card Damage button):
    damage.js#rollDamage() — base formula + numeric bonus + TalentEffectEngine (Sneak Attack only)
      + Force Item extra die + Inquisition extra die + FP bonus + custom modifier
      + (formula) * critMultiplier on confirmed crit + getCriticalDamageBonus()
      ⚠ NEVER reads damageExtraWeaponDice / damageDiceStepBonus / damageDieStepIncreases /
        criticalDamageDieStepBonus AT ALL for an ordinary actor.
  Path B (narrow live caller: Force Adept talent actions ONLY):
    attacks.js#rollDamage() — base formula WITH damageDieStepIncreases/damageExtraWeaponDice/
      criticalDamageDieStepBonus correctly applied + numeric bonus
      ⚠ Missing: TalentEffectEngine, Force Item/Inquisition extra dice, FP bonus, custom
        modifier, critical multiplier, getCriticalDamageBonus().
  Path C (DEAD — zero callers, confirmed):
    attacks.js#rollAttackAndDamageWithNarration() — combines the attack AND damage roll in one
      call, correctly includes damageDieStepIncreases/damageExtraWeaponDice, but is provably
      unreachable from any current caller.
       │
       ▼
CRITICAL TRANSFORMATION
  damage.js#rollDamage(): (formula) * critMultiplier, then + getCriticalDamageBonus() appended
    AFTER the multiplier (correct RAW order — multiplier never touches the bonus formula).
  critMultiplier itself: rollContext.critMultiplier (threaded from the attack roll's own
    chat-card dataset, itself computed by rollAttack() as
    max(weapon.critMultiplier, optionModifiers.criticalMultiplierMin)) — falls back to
    combat-stat-rules.js#getCriticalMultiplier(weapon, 2) (NO rule/actor awareness) when no
    prior attack roll supplied one (i.e. the sheet's standalone Damage button used without a
    preceding attack roll). See §9 for the two independently-implemented getCriticalMultiplier().
       │
       ▼
ROLLED DAMAGE  →  chat card (SWSEChat.postRoll)
       │
       ▼
TARGET APPLICATION / DAMAGE THRESHOLD (boundary only — not audited in depth, per explicit scope)
  rollAndApplyDamage() → damage-packet-builder.js#buildDamagePacket() → DamageSystem.applyPacketToActor()
    (scripts/combat/damage-system.js)
  — a SEPARATE module from scripts/engine/combat/damage-engine.js (part of the documented
    CombatEngine.resolveAttack() pipeline, ARCHITECTURE.md) — these two appear to be different
    systems; not resolved in this pass (flagged, §17).
  actor.applyDamage() (scripts/actors/base/swse-actor-base.js) — "Uses your new CT + threshold logic"
    per damage.js's own comment — the actual HP/Condition-Track/Threshold mutation authority.
```

---

## 3. Production Damage Formula Entry Point(s)

Two functions named `rollDamage`, in two different files, both exported, both independently constructing a damage formula string:

| | `scripts/combat/rolls/damage.js#rollDamage()` | `scripts/combat/rolls/attacks.js#rollDamage()` |
|---|---|---|
| **Live UI callers** | **YES — the only one that matters for ordinary play.** `game.swse.rolls.damage.rollDamage` (registered in `rolls-init.js`); `enhanced-rolls.js`'s `SWSERoll.rollDamage` (`window.SWSERoll`, imported by both `character-like-sheet.js`'s `.damage-btn` handler and `chat-interaction-bridge.js`'s post-attack chat-card Damage button) delegates directly here. | Only `scripts/engine/talent/force-adept-talent-actions.js` imports and calls this version directly. |
| Base dice | `weapon.system?.damage ?? '1d6'`, or the stock-droid published formula | same |
| Numeric bonus | `resolveDamageBonus()` (canonical) | `resolveDamageBonus()` (canonical) |
| **Extra weapon dice / die-step / critical die-step** | ❌ **never read** for an ordinary actor | ✅ read from `CombatOptionResolver.collectAttackModifiers()` directly |
| Talent damage bonus (Sneak Attack) | ✅ `TalentEffectEngine.calculateDamageBonus()` | ❌ not called |
| Force Item / Inquisition extra die | ✅ (local helper functions, duplicated verbatim in both files) | ❌ not called |
| Force Point bonus / custom modifier | ✅ | ❌ not called |
| Critical multiplier applied to formula | ✅ `(formula) * critMultiplier`, area-attack exempted | ❌ not applied at all |
| `getCriticalDamageBonus()` (post-multiplier addend) | ✅ | ❌ not called |

A **third** function, `attacks.js#rollAttackAndDamageWithNarration()`, combines attack+damage in one call and correctly includes the die-step/extra-dice fields — but is **confirmed dead**: `grep`-verified zero callers anywhere in `scripts/` outside its own definition and two comments referencing it (one of which, in `combat-roll-math.js`, explicitly documents that it was fixed once already, in Attack Bonus round 6, then never wired to a caller).

**Base weapon dice fidelity** (confirmed, unchanged from the earlier Attack Bonus-era ledger entry): a weapon's own `system.damage` dice string (e.g. a custom `4d12kh3`) is used verbatim by every path above — never parsed, validated, or "corrected" toward a default. `weapon-data-resolver.js`'s `'1d8'` fallback only fires when the field is empty.

---

## 4. Complete Damage Contribution Taxonomy

**A. Static additive modifiers** — ½ level, ability modifier, weapon enhancement bonus, rage, Rapid Alchemy sacrifice bonus, Effect-Intent (`global.damage`) modifiers, scoped-feat damage, `WEAPON_DAMAGE_BONUS` rule-type contributions, `collectModifierRollBonuses()`'s `damage`/`damage.weapon`/`damage.ranged`/`damage.melee`-targeted item modifiers. All numeric, all composed by `resolveDamageBonus()` into one `total`.

**B. Weapon-dice count modifiers** — `damageExtraWeaponDice` (Deadeye +1, Burst Fire +2, Mighty Swing +1, `UNARMED_EXTRA_WEAPON_DICE` rule type). Distinct from die-SIZE changes. Confirmed populated correctly by `CombatOptionResolver`; confirmed **not consumed** by the live `rollDamage()` path (§3, §9 Blocker 1).

**C. Die-size/die-step modifiers** — `damageDieStepIncreases` (`WEAPON_DAMAGE_DIE_SIZE_STEP`, `UNARMED_DAMAGE_STEP` rule types; e.g. `1d8 → 1d10`), plus `damageDiceStepBonus` (Rapid Shot/Rapid Strike, +1). **Confirmed field-naming duplication**: `WEAPON_DAMAGE_DIE_STEP` and `UNARMED_EXTRA_WEAPON_DICE` rule handlers both increment `damageExtraWeaponDice` AND `damageDiceStepBonus` with the *same* value in the same call — every downstream consumer reads only one via `optionModifiers.damageExtraWeaponDice ?? optionModifiers.damageDiceStepBonus ?? 0`, so this is not a double-count, but it is dead/duplicate field surface that should be collapsed to one name in any SSOT.

**D. Base-damage replacement/override** — `resolveStockDroidDamageContract()`'s published-formula replacement (droid statblocks); `WEAPON_PROPERTY_OVERRIDE` rule type (flags only, e.g. effective weapon size); unarmed/natural-weapon base-die resolution (separate from this audit's primary scope — delegated to `weapon-branch-resolver.js` per the Attack Bonus work).

**E. Multiplicative/critical transformations** — `critMultiplier` (×2 default, `WEAPON_CRITICAL_MULTIPLIER_MIN` rule type can raise the floor), applied as `(formula) * critMultiplier`; `criticalDamageDieStepBonus` (`CRITICAL_DAMAGE_DIE_STEP` rule type, only on a confirmed crit); `getCriticalDamageBonus()` (a formula string appended *after* the multiplier, from a third rule system — `RULES.CRITICAL_DAMAGE_BONUS` via `ResolutionContext`); `EXTEND_CRITICAL_RANGE` (lowers the natural-roll threshold for a crit, does not touch damage math directly).

**F. Conditional modifiers** — nearly everything in A/B/C above is itself conditional (Aim-gated Deadeye, Charge-gated Powerful Charge/Mighty Swing, autofire-gated Burst Fire, target-gated Droid Hunter-style damage bonuses via `HIT_RIDER`/`targetEffectsOnHit`). Gating logic is the certified `CombatOptionResolver.optionAllowedForWeapon()` path (Attack Bonus domain, already hardened) — this audit did not find a second, independent gating implementation for damage specifically.

**G. Damage-type modification** — `damageDamageType`-style fields were not found as a distinct rule type in the current 136-`ATTACK_OPTION` dataset; damage typing appears to be read from `weapon.system` directly (`damage-type-rules.js#damageTypesFromContext()`) rather than modified by feat/talent rules. Not deeply traced — flagged for the SSOT design phase.

**H. Post-roll damage adjustment** — none found that mutates an already-rolled numeric total before target application; `getCriticalDamageBonus()` is pre-roll (folded into the formula string), not post-roll.

**I. Target-side mitigation/application** — explicitly out of primary scope per the review's own instruction. Boundary only: `DamageSystem.applyPacketToActor()` / `actor.applyDamage()`. See §11.

---

## 5. ModifierEngine Damage Target Inventory

`scripts/engine/effects/modifiers/ModifierTypes.js#VALID_TARGET_PATTERNS` declares exactly **one** damage-shaped pattern: `global: /^global\.(attack|damage)$/` (plus `defense: /^defense\.(fort|reflex|will|damageThreshold|dexLimit)$/i` for the mitigation-side Damage Threshold target). Nothing else in this file's declared vocabulary is damage-shaped.

`resolveDamageBonus()`'s own Effect-Intent consumption (`getBasicEffectIntentBonus(actor, 'global.damage', ...)`) queries **exactly** `'global.damage'` — nothing else.

**Real target strings found in current pack data** (`grep` across all `packs/*.db`):

| Target string | Count | File(s) | Matches `ModifierTypes.js`? | Matches `CombatOptionResolver.collectModifierRollBonuses()`? |
|---|---:|---|:---:|:---:|
| `damage` | 3 | lightsaber-crystals.db, talents.db | ❌ | ✅ |
| `damage.weapon` | 2 | feat-catalog.db | ❌ | ✅ |
| `damage.melee` | 1 | talents.db | ❌ | ✅ |
| `damage.ranged` | 2 | feats.db, feat-catalog.db | ❌ | ✅ |
| `attack_and_damage` | 1 | talent-enhancements.db | ❌ | ❌ |
| `damageThreshold` | 1 | talents.db | (defense-side, out of scope) | — |
| `defense.damageThreshold` | 2 | feats.db, feat-catalog.db | ✅ (defense pattern) | — |

**Confirmed finding**: real data uses a damage-target vocabulary (`damage`, `damage.weapon`, `damage.melee`, `damage.ranged`) that `ModifierEngine`'s own declared `VALID_TARGET_PATTERNS` does not recognize at all — these modifiers are consumed **only** by `CombatOptionResolver.collectModifierRollBonuses()`'s own separate, undeclared vocabulary, never by `ModifierEngine.getEffectIntentModifierTotalForContext()`. Whether `VALID_TARGET_PATTERNS` is actually enforced anywhere (rejecting an unrecognized target) or is purely descriptive/unused validation metadata was **not resolved** in this pass — flagged for the SSOT design.

**Unresolved finding, flagged, not confirmed**: the single `attack_and_damage` target (`talent-enhancements.db`) matches **neither** vocabulary above. Whether it is consumed by a third, not-yet-traced authority (a "talent enhancement" specific resolver) or is silently inert was not determined in this pass. Requires follow-up before any migration.

---

## 6. Declarative Metadata Inventory (`packs/feats.db` + `packs/talents.db`)

Every `abilityMeta.rules[].type` value that is damage-shaped, counted directly from the real, current pack files:

| `rule.type` | Count | Consumed by |
|---|---:|---|
| `WEAPON_DAMAGE_DIE_STEP` | 5 | `CombatOptionResolver` (populates BOTH `damageExtraWeaponDice` and `damageDiceStepBonus` — §4.C) |
| `WEAPON_DAMAGE_DIE_SIZE_STEP` | 0 | `CombatOptionResolver` (declared, currently unused by any shipped record) |
| `UNARMED_DAMAGE_STEP` | 3 | `CombatOptionResolver` |
| `UNARMED_EXTRA_WEAPON_DICE` | 2 | `CombatOptionResolver` (same dual-field population as `WEAPON_DAMAGE_DIE_STEP`) |
| `WEAPON_DAMAGE_BONUS` | 2 | `CombatOptionResolver` |
| `CRITICAL_DAMAGE_DIE_STEP` | 0 | `CombatOptionResolver` (declared, currently unused) |
| `EXTEND_CRITICAL_RANGE` | 4 | `CombatOptionResolver` |
| `CRITICAL_RIDER` | 5 | `CombatOptionResolver` (`targetEffectsOnCritical`) |
| `HIT_RIDER` | 6 | `CombatOptionResolver` (`targetEffectsOnHit`) |
| `WEAPON_CRITICAL_MULTIPLIER_MIN` | 2 | `CombatOptionResolver` |
| `RIDER_EFFECT` | 7 | **NOT** `CombatOptionResolver`'s switch — consumed by the `attack-option-adapter`/`attack-primitives` system (§2, §9). Not traced in depth. |
| `FORCE_POINT_DIE_STEP` | 4 | **NOT** `CombatOptionResolver`'s switch — same as above. Not traced in depth. |
| `GRAPPLE_RIDER` | 4 | Grapple domain (already SSOT-certified separately per the ledger); out of scope here. |

Also: `item.system.abilityMeta.modifiers[]` entries (a *separate* array from `.rules[]`, on the same Items) targeting `damage`/`damage.weapon`/`damage.melee`/`damage.ranged` — counted in §5's real-data grep, consumed by `collectModifierRollBonuses()`, a different code path from the `.rules[]` switch above even though both live inside `collectWeaponRuleModifiers()`.

**Not inventoried in this pass** (flagged, §17): species-, background-, and generic item-level damage metadata outside `feats.db`/`talents.db`; the full `RULES.*` vocabulary `ResolutionContext` consumes (only `CRITICAL_DAMAGE_BONUS` and `MODIFY_CRITICAL_MULTIPLIER` were confirmed traced); vehicle/starship weapon-specific metadata.

---

## 7. Specialized JavaScript Damage Implementation Inventory

Implementations with **no declarative metadata backing at all** — pure hand-written JS, found by direct source read:

- `damage.js`'s and `attacks.js`'s **near-identical, independently duplicated** local helper functions: `forceItemState()`, `firstWeaponDamageDieFormula()`, `forceItemExtraDamageFormula()`, `actorHasTalentNamed()`, `actorHasFeatNamed()` — the same logic, copy-pasted into two files rather than shared.
- `damage.js`'s `inquisitionExtraDamageFormula()` — Inquisition talent's extra damage die vs. a Force-Sensitive target, entirely ad hoc, no metadata, present only in `damage.js` (not duplicated in `attacks.js`).
- `runtime-bugfix-hotfixes.js`'s `buildTalentDamageBonusFallback()` — the **actual, only** live implementation of `TalentEffectEngine.calculateDamageBonus`, monkey-patched onto the class at runtime (§9, confirmed finding). Implements Sneak Attack only (`countTalentsNamed(actor, 'Sneak Attack')` × d6, gated on `targetIsDeniedDexForDamage()`); no "Skirmisher" logic was found anywhere despite `damage.js`'s own doc comment listing it as an example.
- `combat-stat-rules.js#getCriticalMultiplier(weapon, fallback)` vs. `combat-utils.js#getCriticalMultiplier(actor, weapon)` — two independent implementations, different signatures, different rule-awareness (§9).
- `resolveStockDroidDamageContract()` — a genuinely well-documented, deliberate special case (stock droid statblocks), not flagged as a defect.

---

## 8. Duplicate-Authority Findings

| Mechanic | Duplicate implementations | Classification |
|---|---|---|
| Damage formula construction (`rollDamage`) | `damage.js` vs. `attacks.js` vs. `attacks.js#rollAttackAndDamageWithNarration()` | **6. Confirmed double-application-adjacent bug** — not double-application (only one path is ever live per call site), but a confirmed **feature-set divergence between the live path and a dead/narrow path**, causing the die-step/extra-dice omission (§9 Blocker 1). |
| Critical multiplier resolution | `combat-utils.js#getCriticalMultiplier(actor, weapon)` vs. `combat-stat-rules.js#getCriticalMultiplier(weapon, fallback)` | **5. Dangerous duplicate authority** — different signatures, different behavior, and the live sheet-only Damage button (fired without a preceding attack roll) falls through to the rule-unaware version. |
| Chat-card Damage button click handling | `chat-interaction-bridge.js`'s handler vs. `runtime-bugfix-hotfixes.js`'s `bindDamageButtons()`/`rollDamageFromButton()` (capture-phase, `stopImmediatePropagation()`) | **1. Deliberate layered behavior, but with a confirmed shadowing side effect** — both bind to `.swse-roll-damage`/`.swse-roll-damage-btn`; the hotfix's capture-phase listener with `stopImmediatePropagation()` pre-empts the other handler entirely. Both ultimately converge on the same `SWSERoll.rollDamage()` call, so this is a maintenance/architecture hazard (two independent context-extraction implementations for the same button), not a math divergence. |
| Modifier-target vocabulary for damage | `ModifierTypes.js#VALID_TARGET_PATTERNS` (`global.damage` only) vs. `CombatOptionResolver.collectModifierRollBonuses()` (`damage`/`damage.weapon`/`damage.melee`/`damage.ranged`) | **5. Dangerous duplicate authority** — two parallel, non-overlapping consumption paths for "a damage modifier," with a third real-data target (`attack_and_damage`) matching neither. |
| Declarative rule interpretation | `CombatOptionResolver`'s switch vs. `attack-option-adapter`/`attack-primitives` vs. `ResolutionContext`/`RULES.*` | **3. Dead/legacy — status uncertain, flagged** for the three systems' actual overlap/boundary; not resolved in this pass. |
| Documented orchestration vs. live path | `ARCHITECTURE.md`'s `CombatEngine.resolveAttack()` pipeline vs. the live `SWSERoll.rollAttack`/`rollDamage` path | **3/4. Uncertain — advisory or dead.** `CombatEngine.resolveAttack()` is implemented and has at least one caller (`combat-executor.js`), but the ordinary character-sheet weapon-attack UI flow (`.attack-btn`/`.damage-btn`, confirmed by direct source read) does **not** call it. Whether `CombatEngine.resolveAttack()` is live for some other actor/weapon combination (vehicle gunner? a different sheet?) was not resolved in this pass. |
| Damage target-application system | `scripts/combat/damage-system.js#DamageSystem` (consumed by the live `rollAndApplyDamage()`) vs. `scripts/engine/combat/damage-engine.js#DamageEngine` (part of the `ARCHITECTURE.md` pipeline) | **3/4. Uncertain — flagged**, not resolved. Out of primary scope per the review's own instruction (target-side application is a consumer boundary here, not the audit's subject). |

---

## 9. Confirmed Double-Application Risks / Bugs

**Blocker 1 (severe, confirmed, live) — the production damage-roll path never applies extra weapon dice or die-step increases.**

Direct trace, `damage.js#rollDamage()` (the function every player-facing Damage button reaches):

```js
const dmgResult = resolveDamageBonus(actor, weapon, {...});   // numeric total ONLY
const baseFormula = dmgResult.flags?.stockDamageFormula ?? (weapon.system?.damage ?? '1d6');
const dmgBonus = dmgResult.total;
const formulaParts = [baseFormula];
if (dmgBonus !== 0) formulaParts.push(dmgBonus.toString());
// ... talent bonus, force item, inquisition, FP, custom modifier appended here ...
let formula = formulaParts.join(' + ');
if (rollContext.isCritical && ...) formula = `(${formula}) * ${critMultiplier}`;
```

`optionModifiers` (i.e. `CombatOptionResolver.collectAttackModifiers()`'s return value, which correctly contains `damageExtraWeaponDice`/`damageDiceStepBonus`/`damageDieStepIncreases`/`criticalDamageDieStepBonus`) **is never referenced in this function at all** — confirmed by direct read of the entire file, and by its absence from every grep for those four field names within `scripts/combat/rolls/damage.js`. Compare to `attacks.js#rollDamage()`, which explicitly comments *"optionModifiers is still needed for die-formula modifiers"* and reads them correctly — proving this was understood as necessary in one file and simply never carried into the other.

**Live consequence**: a character with Deadeye (Aim + ranged, +1 weapon die), Burst Fire (autofire, +2 weapon dice), Mighty Swing (melee charge... actually swift-action gated, +1 weapon die), or Rapid Shot/Rapid Strike (+1 die step) sees the correct attack-roll penalty applied (attack math is unaffected — this is damage-only), and the option is correctly shown as active/selected in the attack dialog (Attack Bonus domain, already certified), but **the extra damage die never appears in the rolled damage** when the player clicks the sheet's Damage button or the chat card's post-attack Damage button — the only two ways an ordinary player rolls damage in this codebase.

This is presented as a **confirmed, severe, live bug** per the review's explicit "if you find a live severe damage bug, document and prove it" instruction. **Not fixed in this pass.**

**Blocker 2 (confirmed, narrower) — critical-multiplier rule-awareness depends on which UI path triggered the roll.**

`attacks.js#rollAttack()` (the live attack-roll function) correctly computes `Math.max(weapon.critMultiplier, optionModifiers.criticalMultiplierMin)` and threads it through the chat card's dataset, so the **chat-card-triggered** Damage button receives the correct, rule-aware multiplier. But `damage.js#rollDamage()`'s own fallback (used when no `rollContext.critMultiplier` is supplied — i.e. the character sheet's standalone Damage button, fired without a preceding attack roll) reads `combat-stat-rules.js#getCriticalMultiplier(weapon, 2)`, which has **no actor or rule awareness at all** and would miss a `WEAPON_CRITICAL_MULTIPLIER_MIN`-sourced bonus. Confirmed by direct read of both call sites; the actual player-facing consequence (how often the standalone sheet Damage button is used without a preceding attack roll, e.g. manual re-rolls) was not measured.

**No other double-application (the same bonus counted twice) was confirmed.** The `damageExtraWeaponDice`/`damageDiceStepBonus` dual-field population (§4.C) looked at first read like a double-count risk but is confirmed **not** one — every consumer reads exactly one of the two fields via `??`, never sums both.

---

## 10. Critical Ordering Analysis

Confirmed order, live path (`damage.js#rollDamage()`):

1. Base weapon dice (or stock-droid published formula)
2. Numeric bonus (`resolveDamageBonus()`'s `total` — ½ level, ability, enhancement, rage, Rapid Alchemy, Effect-Intent, combat-option damage, scoped feat)
3. Talent bonus (Sneak Attack, appended as its own dice/flat term)
4. Force Item extra die
5. Inquisition extra die
6. Force Point bonus
7. Custom modifier
8. **Critical multiplier applied to the entire summed formula**: `(formula) * critMultiplier`
9. `getCriticalDamageBonus()` appended **after** the multiplier, explicitly to avoid double-multiplying a critical-only bonus (confirmed correct per the file's own comment, and matches RAW: a critical-only bonus formula is not itself doubled by the crit multiplier)
10. Area-attack exemption from the crit multiplier (RAW-correct: area attacks don't get critical-hit doubling)

This order is **internally consistent and RAW-plausible** for what it includes. The defect is an *omission* (steps for die-count/die-step never run at all in this path), not a *misordering* of what is present. The `attacks.js#rollDamage()` path's order (base dice with die-step/extra-dice correctly applied, then + numeric bonus, with **no** critical multiplier or critical-bonus-formula step at all) is a different, narrower, and itself incomplete ordering.

---

## 11. Target Mitigation / Application Boundary (consumer boundary only, not audited in depth)

`rollAndApplyDamage()` (`damage.js`) → `buildDamagePacket()` (`damage-packet-builder.js`) → `DamageSystem.applyPacketToActor()` (`scripts/combat/damage-system.js`) → ultimately `actor.applyDamage()` (`scripts/actors/base/swse-actor-base.js`), described by `damage.js`'s own comment as using "your new CT + threshold logic." A **separate** `DamageEngine`/`ThresholdEngine` pair exists under `scripts/engine/combat/damage/` as part of the `ARCHITECTURE.md`-documented `CombatEngine.resolveAttack()` pipeline; whether these two systems are the same thing under different names, genuinely parallel, or one is dead, was **not resolved** in this pass — flagged for a dedicated Damage Threshold investigation, explicitly out of this audit's scope per the review's own instruction.

---

## 12. Representative Real Mechanic Traces

| Mechanic | Source → gate → contribution → composition → formula → rolled output |
|---|---|
| **Power Attack** | `DEFAULT_ATTACK_OPTIONS.powerAttack` (slider, `requiresAttackType: melee`) → gated live in the attack dialog (Attack Bonus domain, certified) → `attackOptionModifiers.damageModifierFormula: 'value'` (the slider's own selected value becomes the damage bonus, 1:1 with the attack penalty traded) → folds into `optionModifiers.damageBonus` → `resolveDamageBonus()`'s `total` → **applied correctly** via any live path (numeric bonus, not dice-shaped). |
| **Rapid Shot / Rapid Strike** | `damageDiceStepBonus: 1` (a static option definition, not pack metadata) → gated on attack type → `optionModifiers.damageDiceStepBonus` → **read correctly by `attacks.js#rollDamage()`, silently dropped by the LIVE `damage.js#rollDamage()`** (Blocker 1). |
| **Deadeye** | `damageExtraWeaponDice: 1`, `requiresAim: true` → same as above: **dropped by the live path.** |
| **Burst Fire** | `damageExtraWeaponDice: 2`, `requiresAutofire: true` → same: **dropped by the live path.** |
| **Mighty Swing** | `damageExtraWeaponDice: 1`, `requiresSwiftActions: 2` (the swift-action cost gate is itself unenforced by the live resolver, per the Attack Bonus ledger's own prior finding) → same: **dropped by the live path.** |
| **Point Blank Shot (static ranged bonus)** | Attack-side only (a `+1` attack bonus at point-blank range); has no damage-side contribution in the current data — confirmed no `WEAPON_DAMAGE_BONUS`/`WEAPON_DAMAGE_DIE_STEP` rule is attached to it. Out of this audit's scope beyond that confirmation. |
| **A selected-weapon-choice damage bonus** | `collectModifierRollBonuses()`'s `attack.weapon-matches-selected-choice` predicate, target `damage`/`damage.weapon` → `optionModifiers.damageBonus` → `resolveDamageBonus()` → **applied correctly** (numeric, unaffected by Blocker 1). |
| **Unarmed damage improvement** | `UNARMED_DAMAGE_STEP` (die-size step) / `UNARMED_EXTRA_WEAPON_DICE` (dice count) rule types, both dice-shaped → `optionModifiers.damageDieStepIncreases` / `.damageExtraWeaponDice` → **dropped by the live path**, same as Deadeye/Burst Fire/Mighty Swing. |
| **A critical-range/critical-damage mechanic** | `EXTEND_CRITICAL_RANGE` (lowers the natural-roll threshold, attack-side) + `CRITICAL_DAMAGE_DIE_STEP`/`WEAPON_CRITICAL_MULTIPLIER_MIN` (damage-side, on-crit-only) → `criticalDamageDieStepBonus`/`criticalMultiplierMin` → **die-step bonus dropped by the live path (it's die-shaped, same Blocker 1 class); multiplier-min correctly threaded when a prior attack roll supplied `critMultiplier` (Blocker 2's narrower exception), otherwise dropped.** |
| **A target-dependent bonus (Droid Hunter-style)** | `HIT_RIDER`/`targetEffectsOnHit` — confirmed to exist as a distinct mechanism (post-hit target *effects*, e.g. conditions applied) rather than a damage-*number* bonus; the Attack Bonus domain's own Droid Hunter implementation uses a flat `damageModifier` (numeric), not a rider — **applied correctly**, numeric. |
| **Sneak Attack** | `TalentEffectEngine.calculateDamageBonus()` → in reality `buildTalentDamageBonusFallback()` (a runtime monkey-patch, §7/§9) → `sneakAttackCount d6`, gated on `targetIsDeniedDexForDamage()` → appended as its own formula term in `damage.js#rollDamage()` only → **NOT consumed by `attacks.js#rollDamage()` at all** (a second, independent confirmed omission, on the narrow/dead-code side rather than the live side). |
| **Vehicle weapon damage modifier** | **Not traced in this pass.** `scripts/combat/systems/vehicle/vehicle-weapons.js` and `scripts/engine/combat/vehicle-attack-math.js` were located (both reference `rollDamage`) but not read in depth. Flagged, §17. |

---

## 13. Proposed Canonical Damage Modifier SSOT

**Recommendation: extend, do not replace, `combat-roll-math.js#resolveDamageBonus()`.**

It is already: (a) the sole numeric-bonus authority both the certified attack-bonus tooltip path and every live damage-roll path consult; (b) already well-documented as canonical in its own module header; (c) already correctly composing ½-level/ability/enhancement/rage/Rapid-Alchemy/Effect-Intent/combat-option/scoped-feat contributions in one typed, breakdown-producing pass, matching the pattern the Attack Bonus domain's own SSOT already uses successfully. The defect is not in this function — it is that **nothing downstream of it also owns dice-count/die-step/critical composition**, so two different, incomplete formula-builders grew up independently around it.

Proposed shape (extending, not replacing, the existing return contract):

```js
resolveDamageBonus(actor, weapon, context) → {
  total,            // unchanged: the existing numeric bonus total
  components,       // unchanged: the existing named breakdown
  flags,            // unchanged
  dice: {           // NEW
    base: '2d8',                    // from weapon.system.damage / stock-droid published formula
    extraWeaponDice: 1,             // from optionModifiers.damageExtraWeaponDice (single field, §4.C cleanup)
    dieStepIncreases: 0,            // from optionModifiers.damageDieStepIncreases
    criticalDieStepIncreases: 1,    // from optionModifiers.criticalDamageDieStepBonus, gated on context.isCritical
    talentDice: ['2d6'],            // from TalentEffectEngine (a REAL method, not a monkey-patch — see below)
    otherDiceTerms: ['1d8']         // Force Item / Inquisition extra dice, still formula-string terms
  },
  critical: {
    multiplier: 2,                  // Math.max(weapon.critMultiplier, criticalMultiplierMin) — computed HERE, once
    bonusFormula: ''                // getCriticalDamageBonus(), still appended post-multiplier
  }
}
```

**One function then builds the final formula string from this single object** — this replaces both `damage.js#rollDamage()`'s and `attacks.js#rollDamage()`'s independent, hand-rolled `formulaParts.push(...)` logic. Both files would call the same formula-builder; there would be no second place for a field to be silently unread.

**Required fixes as part of any migration** (not performed in this audit):
1. `TalentEffectEngine.calculateDamageBonus` must become a real class method (Sneak Attack, and Skirmisher if it exists as a real mechanic — needs its own confirmation pass) — not a runtime monkey-patch whose installation is a load-order dependency.
2. `getCriticalMultiplier()` must have exactly one implementation, actor/rule-aware, called from exactly one place (currently computed correctly once already, inside `rollAttack()` — the SSOT should call that same logic, not `combat-stat-rules.js`'s non-rule-aware duplicate).
3. The `damageExtraWeaponDice`/`damageDiceStepBonus` dual-field population in `CombatOptionResolver` should collapse to one field name.
4. `ModifierEngine`'s declared damage-target vocabulary and `CombatOptionResolver`'s own damage-target vocabulary need to be reconciled into one (§5) — likely by having `collectModifierRollBonuses()` delegate to `ModifierEngine` rather than maintaining a second, parallel target-matching implementation, mirroring how the Attack Bonus domain's own round-3/round-4 work unified `global.attack`/`attack.bonus` into one stacking universe.

**Modules that would delegate to this SSOT**: `damage.js#rollDamage()`, `attacks.js#rollDamage()` (collapsed into one, or one becomes a thin wrapper of the other), `attacks.js#rollAttackAndDamageWithNarration()` (revive or delete — currently dead), `resolveStockDroidDamageContract()` (already correctly a special case feeding the same downstream consumer).

**Modules that would become obsolete/reduced**: the duplicated `forceItemState()`/`firstWeaponDamageDieFormula()`/`forceItemExtraDamageFormula()` local helpers in both `damage.js` and `attacks.js` (become one shared module); `combat-stat-rules.js#getCriticalMultiplier()` (superseded by the actor/rule-aware version); `runtime-bugfix-hotfixes.js#buildTalentDamageBonusFallback()` (superseded once `TalentEffectEngine.calculateDamageBonus` is real).

**Action Authority boundary** (per the review's explicit question): `ActionDefinition`'s `damageModifier`/`damageModifierFormula`/`damageExtraWeaponDice`/`damageDiceStepBonus`/`criticalDamage*`/`targetEffectsOnHit` fields (currently informational-only, `effects: []` in the v1 normalizer) should eventually route to this same Damage SSOT's contribution-discovery stage — **not** duplicate it. Action Authority continues to answer only "does the actor own this, and is it available right now"; it must never independently calculate a damage number. This groundwork remains unwired to production either way (per the standing constraint), so this is a forward-looking note only, not a change made in this pass.

---

## 14. Contribution-Ledger Proposal

The existing `breakdown: [{label, value, type}]` array `CombatOptionResolver.collectAttackModifiers()` already produces, and the existing `components: {}` named-object `resolveDamageBonus()` already produces, are **exactly** the pattern already proven for Attack Bonus (`typedModifierLedger`, `buildModifierLedger()`). The Damage SSOT should reuse this same pattern, not invent a new one:

```
Base weapon dice      2d8           (source: weapon)
Ability                +3           (source: STR/DEX per weapon)
½ Level                +4           (source: character level)
Power Attack            +2           (source: feat, slider value)
Droid Hunter            +2           (source: feat, target-gated)
Deadeye              +1 weapon die   (source: feat, dice-shaped — NOT summed into the flat total)
────────────────────────────────────
Final                3d8 + 9
```

The key structural requirement (already true of `components`/`breakdown` today, just not fully populated for dice-shaped contributions): **dice-shaped contributions must stay dice-shaped** in the ledger, never coerced into the flat integer total. This is exactly the gap Blocker 1 exposes — the current `components` object has no slot for a dice-shaped entry at all, which is plausibly *why* the live formula-builder never grew logic to read one.

---

## 15. Migration Plan (proposed, not authorized, not started)

1. Extend `resolveDamageBonus()`'s return shape per §13, additive only (no existing consumer's `total`/`components`/`flags` reads change).
2. Write characterization tests proving the CURRENT (buggy) live behavior first — i.e. a fail-before test showing Deadeye/Burst Fire/Mighty Swing/Rapid Shot's extra dice do NOT appear in `damage.js#rollDamage()`'s formula today. This is standard practice for this project's freeze methodology and was not done in this audit (audit-only, no test-writing authorized beyond what's needed to characterize, and none was judged necessary to prove the finding — direct source trace was sufficient and is cited above).
3. Build one shared formula-builder consuming the extended shape; point both `damage.js#rollDamage()` and `attacks.js#rollDamage()` at it.
4. Collapse the duplicated Force Item/Inquisition/talent-name-matching helper functions into one shared module.
5. Resolve the `getCriticalMultiplier()` duplication.
6. Reconcile the `ModifierEngine`/`CombatOptionResolver` damage-target vocabulary split.
7. Only after the above: decide whether `attacks.js#rollAttackAndDamageWithNarration()` should be revived (wired to a caller) or deleted as confirmed-dead code.

None of this is authorized or performed in this document.

---

## 16. Golden-Test Plan (proposed, not written)

Matrix (per the review's own required list), each fixture to be checked for identical final damage total across **every** production consumer (sheet button, chat-card button, and — once unified — any future single entry point):

ordinary melee · ordinary ranged · unarmed · static +damage · ability-based damage · half-level damage · single extra weapon die · multiple extra weapon dice · die-size step · Power Attack · Aim-gated damage (Deadeye) · charge damage · target-gated damage (Droid Hunter-style) · critical (multiplier + critical-only die-step + critical bonus formula, in the correct order) · selected-weapon-choice bonus · simultaneous-modifier interaction (e.g. Deadeye + critical on the same roll) · no-double-application proof (a single `WEAPON_DAMAGE_DIE_STEP` rule must not silently also count under `damageDiceStepBonus` as a second, separate contribution) · same final damage total across `damage.js` and `attacks.js`'s two current implementations for a case where they currently disagree (proving the fail-before state before any fix).

None of these tests were written in this audit pass, per the explicit "characterization tests where needed to prove current behavior" allowance being judged unnecessary — the direct source trace in §3/§9 is the proof.

---

## 17. Explicitly Deferred / Not Fully Traced

- The `attack-option-adapter.js`/`attack-primitives.js`/`attack-option-contract.js` system's full rule vocabulary (`RIDER_EFFECT`, `FORCE_POINT_DIE_STEP`, and others) — confirmed to exist as a third, separate rule-consumption authority; not read in depth.
- The full `ResolutionContext`/`RULES.*` vocabulary in `combat-utils.js` beyond `CRITICAL_DAMAGE_BONUS` and `MODIFY_CRITICAL_MULTIPLIER` — whether `RULES.EXTEND_CRITICAL_RANGE` or similar overlaps with `CombatOptionResolver`'s own `EXTEND_CRITICAL_RANGE` rule-type handling was not checked.
- `CombatEngine.resolveAttack()`'s actual live callers/consumers (`combat-executor.js`, `swse-combat.js`, `enhanced-combat-system.js`) — confirmed NOT to be the ordinary character-sheet weapon-attack path, but whether it is live for some other flow (vehicle gunner? a legacy sheet?) was not resolved.
- `scripts/engine/combat/damage-engine.js`/`threshold-engine.js` (the `ARCHITECTURE.md`-documented pipeline) vs. `scripts/combat/damage-system.js` (the actually-live target-application consumer) — whether these are the same system, genuinely parallel, or one is dead was not resolved. Explicitly out of primary scope per the review's own "Damage Threshold is a consumer boundary for this audit, not the primary domain" instruction.
- Vehicle/starship weapon damage — confirmed to exist as its own code (`vehicle-weapons.js`, `vehicle-attack-math.js`) referencing `rollDamage`, not traced for parity/divergence against the character-weapon path.
- Species-, background-, and item-level (non-feat/non-talent) declarative damage metadata.
- Whether "Skirmisher" (named in `damage.js`'s own doc comment alongside Sneak Attack) exists as a real, implemented mechanic anywhere, or was aspirational/removed.
- Whether `VALID_TARGET_PATTERNS` in `ModifierTypes.js` is actually enforced (rejecting/warning on a non-matching target) anywhere, or is unused validation metadata.
- The `attack_and_damage` modifier target (`talent-enhancements.db`, 1 occurrence) — confirmed to match neither the `ModifierEngine` nor the `CombatOptionResolver` damage-target vocabulary; whether it is consumed by an undiscovered third authority or silently inert was not determined.
- The pre-existing `scripts/dev/audit-phase10*-damage-*.mjs` developer scripts (10f/10g/10h/10m/10n) — their names suggest prior internal investigation of adjacent damage-timing/rider/callsite topics; not read in this pass, and may contain directly relevant prior findings worth consulting before implementation begins.

**No implementation, migration, deletion, or production code change was made in this audit.** No NPC-flat work, no Damage Threshold refactor, and no Action Authority production wiring was performed or begun.

---

## 18. SSOT Implementation — Migration Results

Authorized following Correction #1's closure of all six HOLD items
(`docs/audits/v2-damage-modifier-authority-audit-correction-1.md`).
Implements the refined 3-function API from that document's §7, superseding
this document's original §13 "extend `resolveDamageBonus()` directly"
recommendation.

### 18.1 Phase A closure (final restatement)

All six items are closed with direct source evidence in Correction #1;
restated here in final form as this document's authoritative record:

- **RIDER_EFFECT / FORCE_POINT_DIE_STEP**: confirmed consumed by zero code
  anywhere. Out of Damage SSOT scope — unimplemented combat-maneuver
  side-effects and Force-Point skill/attack die-size mechanics
  respectively, neither of which is a damage-dice contribution.
- **ResolutionContext / RULES.\* damage inventory**: closed at exactly 4
  values (`EXTEND_CRITICAL_RANGE`, `CRITICAL_DAMAGE_BONUS`,
  `MODIFY_CRITICAL_MULTIPLIER`, `CRITICAL_CONFIRM_BONUS`).
  `MODIFY_CRITICAL_MULTIPLIER` and `CRITICAL_DAMAGE_BONUS` are now the
  exclusive, single-reader inputs to `resolveCriticalMultiplier()`/
  `getCriticalDamageBonusFormula()` in `combat-roll-math.js` (§18.3).
  `EXTEND_CRITICAL_RANGE`'s confirmed overlap with
  `CombatOptionResolver`'s own handling is a critical-**range** (attack-side
  threat range), not critical-**damage**, duplication — correctly out of
  this migration's scope (attack-side critical-range unification was not
  authorized in this command).
- **Damage modifier target vocabulary**: `VALID_TARGET_PATTERNS` confirmed
  never enforced (dead validation metadata, left as-is — enforcing it now
  would be an unrelated behavior change). `attack_and_damage` confirmed
  inert (one "Weakening Strike" record, no roll-time consumer) —
  **deliberately NOT wired live** in this migration (wiring a previously-
  inert -5 penalty as suddenly-live would be a SWSE rules-behavior change
  beyond "fix the confirmed live dice-shape bug," which this project's own
  standing rules prohibit without explicit instruction). `damage` /
  `damage.weapon` / `damage.melee` / `damage.ranged` are now normalized
  in-memory onto `global.damage` at the composition boundary (§18.4).
- **Vehicle/starship damage boundary**: confirmed to share the live
  character `resolveDamageComposition()`/`buildDamageFormula()` pipeline
  via `crew-skill-router.js` → `attacks.js#rollAttack()` →
  `damage.js#rollDamage()` (not a separate domain). The confirmed bug
  (gunner half-level/ability leaking onto vehicle weapon damage) is now
  **fixed** — see §18.6.
- **Non-feat/talent damage metadata**: repo-wide scan confirmed the
  feat/talent universe is the complete surface; the newly-discovered
  `combat-actions.db` is confirmed inert descriptive/UI metadata, not
  migrated (nothing to migrate).
- **Sneak Attack / Skirmisher**: Sneak Attack is now a stable, importable
  production module (`damage-talent-contributions.js`), consumed directly
  by `resolveDamageComposition()` with zero dependency on
  `runtime-bugfix-hotfixes.js` having run first (§18.7). Skirmisher
  confirmed to be an attack-bonus talent — correctly out of Damage scope,
  not migrated.

### 18.2 Canonical Damage composition contract (as implemented)

`scripts/engine/combat/combat-roll-math.js`:

```js
resolveDamageBonus(actor, weapon, context)
  → { total, components, flags }
  UNCHANGED CONTRACT — every existing consumer's reads are untouched.
  Gained one behavior change as a side effect of §18.6's vehicle fix: its
  half-level/ability sub-calls (getHalfLevelDamageBonus/
  getDamageAbilityContribution in combat-stat-rules.js) now return 0 for a
  vehicle weapon, for every caller of resolveDamageBonus(), not just the
  new composition seam.

resolveDamageComposition(actor, weapon, context)
  → { bonus, dice, critical, damageTypes, riders, flags, ledger, talentNotifications }
  NEW. Discovers every dice-shaped and critical-shaped contribution in one
  pass: dice.base/extraWeaponDice/dieStepIncreases/criticalDieStepIncreases/
  talentDice/talentBreakdown/otherDiceTerms; critical.isCritical/multiplier/
  bonusFormula; a typed, provenance-preserving ledger.

buildDamageFormula(composition, {extraTerms, isAreaAttack})
  → string
  NEW, pure. The one production function that assembles the final formula
  string — base dice → die-size step → extra weapon dice → additive bonus
  → talent/other dice terms → invocation-only extraTerms (Force Point
  bonus, UI custom modifier) → critical multiplier wrap → critical bonus
  formula appended after the multiplier. damage.js#rollDamage() and
  attacks.js's rollAttackAndDamageWithNarration() both call this; there is
  no second formula-assembly function anywhere in the codebase.

resolveCriticalMultiplier(actor, weapon, context, precomputedOptionModifiers)
  → number
  NEW. The single critical-multiplier authority (§18.3), replacing three
  independent prior implementations.
```

### 18.3 Critical multiplier SSOT

Three prior independent implementations — `combat-stat-rules.js#getCriticalMultiplier(weapon, fallback)`
(weapon-only), `combat-utils.js#getCriticalMultiplier(actor, weapon)`
(actor/`RULES.MODIFY_CRITICAL_MULTIPLIER`-aware but not
`CombatOptionResolver`-aware), and `attacks.js#rollAttack()`'s own inline
`Math.max(weapon base, optionModifiers.criticalMultiplierMin)`
(`CombatOptionResolver`-aware but not rule-aware) — are superseded by
`combat-roll-math.js#resolveCriticalMultiplier()`, which considers the
weapon's base multiplier, `CombatOptionResolver`'s
`criticalMultiplierMin`, AND `RULES.MODIFY_CRITICAL_MULTIPLIER` in one
function. `attacks.js#rollAttack()` now calls it directly.
`combat-utils.js#getCriticalMultiplier()` and
`combat-stat-rules.js#getCriticalMultiplier()` are left in place
(unchanged, still correct for their own narrower semantics) but are no
longer the source of the value used anywhere in the **live character
Attack/Damage path** — reduced to non-authoritative there, per the
command's "retire/reduce" instruction (removing them outright was judged
higher-risk than necessary, since their other existing callers were out
of this migration's scope). **Correction (independent review of
`4d05a80`): stated precisely, this is "one canonical multiplier authority
for the live Damage/Attack path; legacy dead compatibility code still
retains old helper references," not a global "every implementation is
gone."** `combat-stat-rules.js#getCriticalMultiplier()` is still the value
`enhanced-rolls.js`'s deprecated `computeAttackBonus()`-based
Autofire/Full-Attack paths reference — prior project audits classify that
pipeline as dead/unwired (matching this project's own "old combat action
browser" retirement-candidate classification), so it is not a live
duplicate, but the doc should not imply that code no longer exists.

**Hardening (independent review of `4d05a80`):** `resolveCriticalMultiplier()`
originally returned a valid carried `context.critMultiplier` immediately,
before consulting the weapon/option/rule sources at all — a stale or
otherwise-invalid carried value could suppress a currently-active
`RULES.MODIFY_CRITICAL_MULTIPLIER` increase or `criticalMultiplierMin`
option. **Fixed**: the carried value is now folded in as one more input to
the same `Math.max(...)` composition (a floor, never a short-circuit) —
a canonical carried value (produced by this same function inside a prior
`rollAttack()` call) can never be lower than a fresh resolution would
produce, so this changes nothing for the correct case while closing the
stale-value gap. See the test suite's dedicated hardening check.

Consumer parity: a prior attack roll's resolved multiplier (`context.critMultiplier`,
carried through `damageWorkflowContext`) is reused verbatim by a
chat-card-driven Damage roll — never recomputed — while a standalone
sheet-Damage-button roll (no prior attack context) computes fresh through
this same function. Both paths are now rule-aware; previously only the
attack-card path was (partially — it lacked `RULES.MODIFY_CRITICAL_MULTIPLIER`
too).

### 18.4 Damage modifier target vocabulary unification

`combat-option-resolver.js#collectModifierRollBonuses()`'s damage branch
now emits each matching item-authored `abilityMeta.modifiers` alias record
as a typed, `global.damage`-normalized record on a new
`damageContributions` array, threaded up through
`collectWeaponRuleModifiers()`/`collectAttackModifiers()` exactly like the
existing (previously always-empty) `attackContributions` field.
`resolveDamageBonus()`/`resolveStockDroidDamageContract()` combine this
pool with `ModifierEngine.getEffectIntentModifiersForContext()`'s own
damage-target modifiers (switched from the pre-summed
`getEffectIntentModifierTotalForContext()` to the individual-record
variant, mirroring `resolveAttackBonus()`'s own pattern for
`global.attack`) into one `ModifierUtils.resolveStacking()` pass via the
shared `computeTypedDamageModifierPool()` helper.

**Correction (independent review of `4d05a80`, "Blocker 2 — typed Damage
stacking is currently cosmetic"): the first pass built this pool correctly
but only surfaced it as an inspection ledger — `resolveDamageBonus()`'s
own additive total still independently summed
`getBasicEffectIntentBonus()`'s isolated pool total PLUS
`optionModifiers.damageBonus` (which, at that point, still separately
included the SAME alias-modifier contribution the typed pool ALSO
counted). A same-typed collision across the two sources (e.g. an Effect
Intent +4 competence bonus and an item-alias +2 competence bonus) could
show "+4 applied / +2 suppressed" in the ledger while the actual roll
still received +6 — a ledger that disagreed with the roll it described.**
**Fixed**: `collectModifierRollBonuses()` no longer double-writes the
alias-matched contribution into `damageBonus` (its only path to the
numeric total is now the typed pool); `computeTypedDamageModifierPool()`'s
stacked result feeds `resolveDamageBonus()`'s/
`resolveStockDroidDamageContract()`'s `total` directly, and
`resolveDamageComposition()` reads the SAME ledger those functions already
built rather than recomputing a parallel one. Golden test 24 proves both
historical alias spellings (`damage`, `damage.melee`) land in this same
pool; the correction round's dedicated collision test proves a
`highestOnly` competence collision resolves to the correct total (not a
naive sum), with matching `stackUnlessSameSource`/`untyped` coverage
against the actual total, not merely ledger shape.

### 18.5 damageExtraWeaponDice / damageDiceStepBonus collapse

Every real producer in `CombatOptionResolver` already writes both fields
to the identical value (a historical dual-write, not two independent
contributions — confirmed by direct source read). `resolveDamageComposition()`
reads **only** `damageExtraWeaponDice`, never falling back to
`damageDiceStepBonus`. Golden test 25 proves a dual-written source
contributes its extra die exactly once. The dual-write itself was left in
place in `CombatOptionResolver` (not mass-edited) per the command's "do
not mass-edit every historical source unless needed" instruction — no
downstream reader other than the two now-removed hand-rolled formula
builders (§18.8) ever consumed the second field independently.

### 18.6 Vehicle domain fix

`combat-stat-rules.js#getHalfLevelDamageBonus()` and
`#getDamageAbilityContribution()` now return `0` for any `isVehicleWeapon()`-
classified weapon, closing the confirmed live bug (a named gunner's
personal half-heroic-level and ability modifier were silently added to
vehicle weapon damage). Golden test 29 proves the gate is vehicle-weapon-
specific, not actor-specific (the same gunner still receives half-level on
an ordinary personal weapon in the same test).

**Certification wording (independent review of `4d05a80`): this is "vehicle
weapon damage no longer receives personal character half-level/ability
scaling," not "vehicle damage fully certified."** Vehicle-scale damage
multiplier (x2/x5/x10) and ion/special damage-type interpretation remain
unwired at runtime — explicitly out of scope for this migration per the
authorizing command's own allowance ("we don't necessarily need to
migrate vehicle damage in the first implementation").

### 18.7 Sneak Attack / TalentEffectEngine

`scripts/engine/combat/damage-talent-contributions.js` is the new, real,
stable, importable production module (`resolveTalentDamageContributions()`).
`resolveDamageComposition()` calls it directly. `runtime-bugfix-hotfixes.js`'s
`buildTalentDamageBonusFallback()` (the compatibility shim backing the
`TalentEffectEngine.calculateDamageBonus` monkey-patch, kept for any other
caller of that API) now delegates to the same module instead of
maintaining its own copy. Golden test 28 proves Sneak Attack damage
resolves correctly with the runtime hotfix installer never having run.

**Known, pre-existing, unfixed gap (flagged, not blocking): the RAW
"within 6 squares... for a ranged weapon" range restriction on Sneak
Attack is not enforced anywhere** — `targetIsDeniedDexForDamage()` gates
on denied-Dex/flat-footed only. This predates this migration (already
noted in Damage Audit Correction #1 §6) and the correction audit
explicitly scoped it out; it does not block this migration's own
certification, but the extraction to a real production module must not be
read as having also fixed it — that qualification carries forward
unchanged, not silently dropped.

### 18.8 Force Item / Inquisition dedup

`scripts/engine/combat/damage-item-dice-contributions.js` is the one
neutral, shared module both `damage.js` (previously) and
`attacks.js#rollAttackAndDamageWithNarration()` (previously missing
Inquisition entirely — a confirmed, narrower omission on that dead-code
path) now consume via `resolveDamageComposition()`'s `dice.otherDiceTerms`.

### 18.9 Roll wrapper roles after migration

- **`damage.js#rollDamage()`**: orchestration only. Gathers workflow
  context, preserves the NPC-flat and stock-droid branches unchanged, calls
  `resolveDamageComposition()` + `buildDamageFormula()`, rolls, posts chat,
  clears Rapid Alchemy state. No damage term is computed locally anymore.
- **`attacks.js#rollDamage()`**: a thin delegate to `damage.js#rollDamage()`
  — collapsed into one, per the command's explicit "collapsed into one, or
  one becomes a thin wrapper of the other" instruction. Its own prior
  formula-building logic (confirmed divergent AND confirmed missing
  Inquisition) is removed, not preserved as dead code.
- **`attacks.js#rollAttackAndDamageWithNarration()`**: confirmed dead (zero
  live callers), left in place but its damage side now delegates to the
  same `resolveDamageComposition()`/`buildDamageFormula()` pair, reordered
  to resolve the attack outcome (and therefore `isCritical`) BEFORE
  building the damage formula — the old code built its damage formula
  before the attack roll resolved, so it could never apply a critical
  multiplier or critical-only die-step at all on this path; a dormant
  divergence, not a reproduced live bug, now closed as a side effect of
  delegating rather than opportunistically deleted (per the command's
  "prefer minimizing scope: delegation is safer than opportunistic
  deletion").

### 18.10 Tests

`tests/damage-modifier-ssot.test.mjs` — 35 checks (29 from the initial
implementation + 6 from the §18.12 correction round): 3 fail-before/pass-after
proofs (extra weapon dice, die-size step, standalone critical-multiplier
rule-awareness — each reproducing the confirmed-removed old logic inline
and proving it produces the wrong result, then proving the new canonical
path produces the right one), the full golden matrix (ordinary
melee/ranged, unarmed die-step, half-level/ability/enhancement stacking,
Deadeye/Burst Fire/Mighty Swing extra dice, item-authored damage modifier,
Sneak Attack single/multiple-talent dice-shaped stacking, Force
Item/Inquisition target-gating, critical multiplier/rule-modification/
critical-only-die-step/bonus-formula-ordering, area-attack critical
exemption, stock-droid published formula, simultaneous-modifier
composition, alias normalization, no-double-application, composition
purity/caller-parity, no-runtime-hotfix-dependency, vehicle-domain
gating), and structural source-text parity checks proving `damage.js`/
`attacks.js` actually call the canonical functions (RollEngine/SWSEChat/
AmmoSystem are not shimmed by this project's Foundry-shim harness, the
same documented boundary `tests/stock-droid-damage-math.test.mjs` already
established for this exact file — full end-to-end chat-posting execution
of `rollDamage()` was not attempted for the same reason it wasn't
attempted there).

### 18.11 Explicitly not done in this migration

Per the authorizing command's "DO NOT DO" list: `ActionAvailabilityEngine`
was not wired into Damage; no `ATTACK_OPTION` records were migrated into
`ActionDefinition` effects; Damage Threshold, HP application, and
Condition Track were not touched; no unrelated NPC-flat problems were
fixed; vehicle combat was not redesigned; no damage mechanic was converted
to declarative data; no legacy system was deleted merely for looking
redundant (`combat-stat-rules.js#getCriticalMultiplier()`/
`combat-utils.js#getCriticalMultiplier()` are reduced-to-non-authoritative,
not deleted); no SWSE rule was changed to make a test pass (`attack_and_damage`
stayed inert by deliberate choice, not migrated to "make it work").

### 18.12 Correction round (independent review of `4d05a80`/`1b93e1a`)

A direct re-inspection of the pushed head — not a fresh audit cycle —
found three blockers and one hardening item. The review's own verdict:
"Claude solved the formula-builder fragmentation, but two composition
seams still bypass the new authority and the real attack→damage workflow
does not yet prove it carries the option data the new resolver needs."
All four are fixed in this same commit; §18.3/§18.4/§18.6/§18.7 above are
updated in place with the corrected claims rather than left to silently
disagree with this section.

**Blocker 1 — attack-option selections were not transported to a later
Damage roll.** `combat-context-serializer.js#summarizeCombatWorkflowContext()`
captured only a fixed set of high-level booleans (Aim/Charge/Autofire/...)
— never the attack roll's actual `combatOptions`/`attackOptions`
selection map (`{deadeye: true, powerAttack: 3}`) `CombatOptionResolver.
collectAttackModifiers()` needs to know a toggle/slider option was
genuinely selected, not merely owned and gate-satisfied. A chat-card-
driven Damage roll (the primary live path — click "Damage" on an attack's
chat message) reconstructs its context entirely from this serializer's
output; without the selection map, `resolveDamageComposition()` correctly
reading `damageExtraWeaponDice`/etc. was moot, because
`CombatOptionResolver` itself would evaluate every toggle option as
unselected regardless. (The sheet's own standalone Damage-button dialog
was separately confirmed NOT to be affected the same way — `roll-config.
js#buildWeaponPanel()` deliberately never renders ATTACK_OPTION toggles
for `rollType: 'damage'` at all, by pre-existing design, since a
standalone Damage roll has no attack of its own to select them for; this
blocker is specifically about the attack-roll's own selections surviving
into ITS paired chat-card Damage roll.) **Fixed**: `summarizeCombatWorkflowContext()`
now captures a merged `attack.selectedOptions` map (booleans and numeric
slider values alike, falsy/absent entries pruned); it round-trips
losslessly through `encodeCombatWorkflowContext()`/`decodeCombatWorkflowContext()`
(plain `JSON.stringify`/`parse`, already lossless for this shape); and
`mergeCombatWorkflowContextIntoRollOptions()` restores it onto
`rollOptions.combatOptions`/`rollOptions.attackOptions` — with an explicit
caller-supplied value always taking precedence over a carried one, never
silently merged with or overridden by it. Proven by a literal round-trip
test: real roll options → `summarizeCombatWorkflowContext()` → `encodeCombatWorkflowContext()`
→ `decodeCombatWorkflowContext()` → `mergeCombatWorkflowContextIntoRollOptions()`
→ `CombatOptionResolver.collectAttackModifiers()`, asserting Deadeye's
extra die and a Power-Attack-shaped slider value both survive intact.

**Blocker 2 — typed Damage stacking was ledger-only, not the real total.**
See the rewritten §18.4 above for the fix; summarized here: a same-typed
collision across the Effect-Intent pool and the item-alias pool could
show a correct "highest applied / other suppressed" ledger while the
actual roll still summed both in full. Fixed by making
`computeTypedDamageModifierPool()`'s stacked result the ONLY path either
source contributes through, feeding `resolveDamageBonus()`'s/
`resolveStockDroidDamageContract()`'s own `total` directly. Proven by a
`highestOnly` competence collision test (Effect +4, item-alias +2 →
total is 2/*STR*/+4, never +6, ledger's applied/suppressed values match
the total exactly) plus `stackUnlessSameSource` and `untyped` collision
tests against the actual total, not merely ledger shape.

**Blocker 3 — stock-droid dice modifiers were applied twice.**
`resolveStockDroidDamageContract()` used to pre-apply
`damageDieStepIncreases`/`damageExtraWeaponDice` to the published formula
itself (baking them into `flags.stockDamageFormula`), and
`resolveDamageComposition()` then treated that already-mutated string as
its own unmutated `dice.base` and applied the SAME die-step/extra-dice
generically a second time — e.g. a +1 die-step + +1 extra-die stock
formula would reach the roll stepped twice and with the extra die added
twice. **Fixed**: the published formula's dice portion is now returned
RAW from `resolveStockDroidDamageContract()` (re-rendered only for
canonical spacing, via `buildStockDroidDamageFormula(publishedFormula)`
with no dice-mutation arguments) — the single generic
`dieStepIncreases`/`extraWeaponDice` application inside
`resolveDamageComposition()`/`buildDamageFormula()` now runs exactly
once, uniformly, for stock and ordinary weapons alike. Proven by full-path
tests through `resolveDamageComposition()`/`buildDamageFormula()` with
active die-size-step, extra-weapon-dice, critical-only-die-step, and
combined stock-droid fixtures — `tests/stock-droid-damage-math.test.mjs`'s
own die-mutation tests (8-12) were rewritten in the same pass, since they
previously asserted the now-removed pre-mutation behavior directly on
`resolveDamageBonus()`'s output.

**Hardening — a carried critical multiplier could override current
rules.** `resolveCriticalMultiplier()` returned a valid
`context.critMultiplier` immediately, before consulting the weapon/
option/rule sources at all, so a stale or otherwise-invalid carried value
could suppress a currently-active `RULES.MODIFY_CRITICAL_MULTIPLIER`
increase. **Fixed**: the carried value is now one more input to the same
`Math.max(...)` composition (a floor, not a short-circuit) — a genuinely
canonical carried value can never be lower than a fresh resolution would
produce, so correct behavior is unchanged while a stale value can no
longer suppress a current rule. Proven by a test where a carried
`critMultiplier: 2` cannot suppress an active
`RULES.MODIFY_CRITICAL_MULTIPLIER` of 3, alongside a sanity check that a
carried value higher than every other source is still honored.

**Validation**: full rolling suite (239/239), full syntax sweep
(2518/2518 `node --check`), `tools/check-combat-math-ssot.mjs --strict`,
`validate-data.js`, `validate-partials.mjs` all re-run clean after this
correction round.

### 18.13 Attack-to-Damage Option Context Certification (addendum correction)

A follow-up addendum, reviewed independently against head `1b93e1a` —
i.e. written before §18.12 above existed — scoped a further correction
to exactly one of the three blockers §18.12 records: attack-option
activation context surviving losslessly from the attack dialog through
the attack chat card into the later Damage roll. The addendum raised the
proof bar substantially above §18.12's own Blocker 1 write-up: a
dedicated test file (not folded into generic formula tests), one named
round-trip test per representative option with exact expected values,
snapshot-immutability and actor/UI-mutation proofs, a negative
(no-inference) test, an unowned-option (no-entitlement-grant) test, and
an explicit hop-by-hop trace of the real production data-flow chain
rather than an assertion that it exists.

**Explicit reconciliation, not silent compliance.** The addendum was
written on the stated belief that the other two §18.12 blockers — typed
Damage stacking driving only the ledger, and stock-droid dice
transformations applying twice — were still open, and it explicitly
instructed the correction to leave them alone "unless a tiny shared
change is strictly necessary." Both were, in fact, already fixed and
tested earlier in the same working session that produced §18.12, before
this addendum arrived. This section does not silently accept that
outdated premise: neither existing fix was touched, reverted, or
otherwise interacted with by this addendum's work, and the current true
state — all three original blockers plus the hardening item are closed
— is stated plainly here rather than left to disagree with the
addendum's own text.

**Canonical transport shape.** `combat-context-serializer.js#summarizeCombatWorkflowContext()`
now builds `attack.selectedOptions` via a new `mergeSelectedOptions(...sources)`
helper, merging (in order) the summary's own `attack.selectedOptions`
(so re-summarizing an already-summarized context is idempotent),
`context.combatOptions`, `context.attackOptions`, `extra.combatOptions`,
and `extra.attackOptions` — the historical `combatOptions`/`attackOptions`
spelling split collapses into this one canonical map. Only
JSON-safe primitive values survive: `isSerializableOptionValue(value)`
accepts a `boolean`, a finite `number`, or a `string`, and rejects
everything else (an object, a function, a Foundry document reference, a
non-finite number) — such a value is silently dropped from the snapshot,
never serialized, and never throws. Falsy/absent entries (`undefined`,
`null`, `''`, `false`) are pruned rather than carried as explicit
"inactive" markers.

**No inference, no entitlement grant.** The snapshot is the literal
selection map the player made — nothing is inferred from a higher-level
flag. Aim being true does not imply Deadeye was selected; Autofire being
true does not imply Burst Fire was selected; only an explicit
`combatOptions.deadeye === true` (etc.) counts as selected. Symmetrically,
a stored selection is never itself an entitlement: `CombatOptionResolver.
getAvailableAttackOptions()`'s pre-existing feat-ownership gate (only an
item with a matching `ATTACK_OPTION` rule makes an option discoverable at
all) still governs downstream — a synthetic selection for an option the
actor does not own is never granted.

**Production data-flow chain (traced against real source, not assumed):**
1. `scripts/rolls/roll-config.js#showRollModifiersDialog()` reads the
   dialog form's `combatOptions`/`attackOptions` fields into its returned
   result.
2. `scripts/sheets/v2/actor-sheet-base.js#_runCanonicalAttackWithPreroll()`
   spreads that same result into the options object passed to
   `SWSERoll.rollAttack()` — not a reconstruction.
3. `scripts/combat/rolls/attacks.js#rollAttack()` calls
   `summarizeCombatWorkflowContext()` (idempotently preserving
   `attack.selectedOptions` across the re-summarization into
   `damageWorkflowContext`) and attaches it to the chat message via
   `SWSEChat.postRoll({flags:{swse:{workflowContext}}, context:{workflowContext}})`.
4. `scripts/engine/rolls/swse-roll-engine.js` calls
   `encodeCombatWorkflowContext()` to produce `workflowContextEncoded` for
   the chat-card template context.
5. `templates/chat/holo-roll.hbs` (the real production chat-card template)
   embeds it as `data-workflow-context="{{...workflowContextEncoded}}"` on
   the chat card's Damage button.
6. `scripts/patches/runtime-bugfix-hotfixes.js#rollDamageFromButton()`
   decodes it via `decodeCombatWorkflowContext(button.dataset.workflowContext)`.
7. `scripts/combat/rolls/damage.js#rollDamage()` restores it onto roll
   options via `mergeCombatWorkflowContextIntoRollOptions()` **before**
   `resolveDamageComposition()`/`CombatOptionResolver` are ever called —
   with an explicit caller-supplied value always taking precedence over a
   carried one, never silently merged with or overridden by it.

(`scripts/ui/chat/chat-interaction-bridge.js` has three further call
sites of the same decode pattern; `scripts/engine/combat/full-attack-card-renderer.js`
is a separate multi-attack-sequence renderer using the same encode
function — both inherit the fix automatically since they call the same
serializer functions, not a parallel implementation.)

**Proof.** A new dedicated suite,
`tests/attack-damage-option-context-transport.test.mjs` (18 checks, not
folded into `damage-modifier-ssot.test.mjs`'s generic formula tests):
- Section 1 (3 checks): canonical round-trip of mixed boolean/numeric
  values with an inactive `false` entry that must never resolve as
  active; `attackOptions`-only input still reaching `combatOptions` after
  round-trip (one canonical selection universe, not two independently
  tracked maps); and non-primitive/non-finite value rejection that
  doesn't throw.
- Section 2 (6 checks): one named round-trip test per required option —
  Deadeye → `damageExtraWeaponDice = 1`; Burst Fire → `= 2`; Rapid Shot →
  `+1` extra weapon die exactly once (not double-counted against its
  `damageDiceStepBonus` dual-write alias); Rapid Strike → `+1` weapon
  die; Mighty Swing → `+1` weapon die; Power Attack (slider value `3`) →
  `damageBonus = 3` exactly, proving a non-boolean value transports, not
  only booleans.
- Section 3 (4 checks): snapshot immutability (mutating the original
  source object after serialization does not affect the already-encoded
  snapshot); actor/UI-mutation proof (a later, different option selection
  never retroactively changes an earlier attack's own stored snapshot);
  the negative test (Aim true, Deadeye not selected — must not apply,
  proving no inference from a high-level flag); the unowned-option test
  (a stored selection for an option the actor does not own is never
  granted, proving no entitlement grant).
- Section 4 (1 check): the pre-existing target/aim/autofire/range-band/
  critical/damage-type transport is not regressed by the additive option
  snapshot.
- Section 5 (4 checks): structural source-text verification of each real
  production hop listed above, including an explicit line-order
  assertion that `mergeCombatWorkflowContextIntoRollOptions(` appears
  before `resolveDamageComposition(` in `damage.js`.

The pre-existing 136-record `ATTACK_OPTION` normalization/discovery
surface (`docs/audits/v2-action-authority-groundwork-architecture.md`)
was not altered by this addendum. `tools/check-combat-math-ssot.mjs` was
inspected for a narrower transport-specific guard; none of its existing
invariants target workflow-context transport specifically (they target
the roll-math resolver seam), and the addendum's own dedicated test file
already exercises this invariant directly by executing the serializer
functions rather than only inspecting source text, so no new guard was
added — the existing SSOT guard's scope was kept narrow, per the
addendum's own instruction.

**Validation**: `tests/attack-damage-option-context-transport.test.mjs`
(18/18), `tests/damage-modifier-ssot.test.mjs` (35/35, re-run to confirm
the `isSerializableOptionValue()` hardening did not regress the earlier
Blocker 1 test), `tests/stock-droid-damage-math.test.mjs` (unaffected,
re-run clean), `tests/attack-bonus-math-integrity.test.mjs`,
`tests/attack-dialog-context-authority.test.mjs`,
`tests/attack-dialog-context-authority-correction.test.mjs`,
`tests/action-authority-groundwork.test.mjs`,
`tests/action-authority-groundwork-normalization-audit.test.mjs` (136
records, 0 silent drops) all re-run clean, full rolling suite, full
syntax sweep, and `tools/check-combat-math-ssot.mjs --strict` all re-run
clean after this addendum.

**Current status of all three original §18.12 blockers plus the
hardening item: all four are fixed and independently tested.** Per the
addendum's own explicit instruction, this section does not self-declare
the overall Damage SSOT re-certified — that determination is left to the
next independent review pass, which now has a materially more complete
picture than the addendum had when it was written.
