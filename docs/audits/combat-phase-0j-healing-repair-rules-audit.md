# SWSE Combat Phase 0J - Healing, Repair, and Positive-Damage Rules Audit

Audit scope: healing/positive-damage/repair accounting only. No runtime code was changed.

This pass audits the obvious healing and repair seams against the rules material supplied for Treat Injury, Medpacs, Natural Healing, Bonus Hit Points, Second Wind, and Droid/Object/Vehicle Repair. It also accounts for existing system code paths so later implementation phases can use the existing authorities instead of inventing parallel recovery systems.

## Executive summary

The repo already has several useful healing/recovery systems, but they are not yet one coherent rules pipeline.

1. **Second Wind is the strongest healing subsystem.** `SecondWindRules` and `ActorEngine.applySecondWind()` already model the core formula `max(floor(max HP / 4), Constitution score)`, use counts, encounter cap, houserule timing, and several feat/talent resource hooks.
2. **Organic healing and droid/vehicle repair are partially separated in the GM Combat & Recovery console, but not in the low-level HP mutation authority.** `GMCombatRecoveryService` correctly distinguishes Heal vs Repair for GM UI actions, while `ActorEngine.applyHealing()` accepts either organic or droid actors and only blocks destroyed droids.
3. **Treat Injury exists in at least two layers that do not agree.** `HealingMechanics` has RAW-shaped methods for First Aid, Long-Term Care, Surgery, Revivify, and Critical Care, but the GM console uses simplified fixed-amount workflow stubs. Combat action data has First Aid / Revivify / Treat Injury as non-executable reference content.
4. **Gear requirements are currently mostly nominal.** Medpac, Medical Kit, Surgery Kit, Bacta, and other medical gear exist as equipment compendium entries, but the healing/repair pipelines do not reliably check possession, consume single-use medpacs, decrement kit uses, or require a toolkit/surgery kit before allowing a workflow.
5. **Natural Healing is not RAW-complete.** RAW skeleton from the supplied rules is 8 hours rest -> heal character level; no natural healing while any Persistent Condition remains; once per 24 hours. Existing rest recovery is houserule-driven and uses hit die/custom formulas, while GM full recovery heals to full.
6. **Droid repair needs a dedicated Mechanics repair path, not organic healing.** The supplied repair rule is DC 20 Mechanics after 1 hour, restore HP equal to droid character level and remove Persistent Conditions; objects/vehicles restore 1d8 HP and remove Persistent Conditions. Current GM repair stubs use fixed amounts and do not fully encode the target-type formula.
7. **Positive damage should not become another duplicate authority.** Healing/repair should route through a single HP mutation authority, but the rule packet must say whether it is organic healing, droid repair, object/vehicle repair, bonus HP, Force healing, or drain-to-heal.
8. **Bonus Hit Points are present as data/mechanics, but need a canonical temporary HP/bonus HP model.** ActorEngine damage already accounts for `system.hp.bonus`, and Bolster Ally grants temp HP, but the audit found multiple terms: bonus HP, temp HP, shoulder-to-shoulder HP, and encounter-only buffers.
9. **Force healing/drain healing is metadata-rich but not fully executable.** Vital Transfer is present in force power data, but the force effect builder explicitly returns no persistent effect and does not apply HP; Dark Healing plans directly mutate HP instead of using the canonical damage/healing packet path.
10. **Future gear implementation should be stubbed around healing use-cases.** Since gear is currently nominal, the first pass should create shared stubs for requirement checks and consumption rather than forcing full inventory automation immediately.

## Rules baseline from supplied material

### Second Wind

Rules target:

- Swift Action.
- Only at half maximum HP or lower, unless a feat/talent says otherwise.
- Heroic characters only by default.
- Once per day.
- Never more than once in a single encounter.
- Heals one-quarter max HP, rounded down, or Constitution score, whichever is greater.
- Extra Second Wind grants an additional daily use; a Nonheroic character with Extra Second Wind can use Second Wind once per day.

Current accounting:

- `SecondWindRules.canUseSecondWind()` checks heroic/nonheroic eligibility, half-HP gating, encounter-use flag, and Swift Action availability in combat.
- `SecondWindRules.calculateHealingAmount()` implements `max(floor(maxHP / 4), conScore)`.
- `ActorEngine.applySecondWind()` calculates uses via `SecondWindRules.calculateMaxUses()` and `MetaResourceFeatResolver.getSecondWindRules()`.
- `SecondWindEngine` handles houserule recovery timing.

Seams:

- Legacy `SWSEActor._onSecondWind()` still exists and directly uses `system.secondWind.healing`, bypassing the newer `SecondWindRules`/`ActorEngine.applySecondWind()` path if it is still reachable.
- Some UI labels appear to hardcode `/1` instead of displaying computed `system.secondWind.max`.
- The rules say only heroic characters can catch Second Wind by default. The code treats actor type `character` as heroic even if level data is malformed; this may be acceptable for PCs but should be explicitly documented.
- Droids should not benefit from organic rest or organic healing, but Second Wind for droid-type actors should remain feat/rules gated rather than accidentally restored by rest.

### Treat Injury - First Aid

Rules target:

- Full-Round Action.
- Requires Medpac.
- DC 15 Treat Injury check.
- On success, target regains `Character Level + (check result - DC)` HP.
- Medical Kit gives +2 Equipment bonus.
- Target cannot benefit from additional First Aid for 24 hours.
- Self-administering First Aid has a -5 penalty.
- Medpac is expended even if the check fails.

Current accounting:

- `HealingMechanics.performFirstAid()` implements DC 15 and healing by level + margin through `_calculateFirstAidHealing()` when the healing skill houserule is enabled.
- It marks `lastFirstAid` on the target.
- It does not appear to consume a Medpac item or enforce inventory requirement.
- The GM console `performTreatInjury()` has a First Aid workflow, but default amount is fixed at 5 and not formula-derived.
- The combat action entry is non-executable and bundles First Aid/Revivify/Treat Injury together.

Seams:

- First Aid has no unified target eligibility: the HealingMechanics path targets characters, GM service skips droids/vehicles, but low-level applyHealing can still heal almost anything if called directly.
- Gear requirement and medpac consumption are not enforced.
- Self-treatment penalty is not clearly represented in the call path.
- 24-hour cooldown is stored by `HealingMechanics`, but the GM console fixed workflow does not appear to honor it.

### Treat Injury - Long-Term Care

Rules target:

- 8 consecutive hours of care.
- Target regains HP equal to Character Level in addition to Natural Healing.
- Once per 24-hour period.
- One creature at a time if untrained; up to six if trained.
- Cannot give Long-Term Care to self.

Current accounting:

- `HealingMechanics.performLongTermCare()` exists and uses flags to track last care.
- It supports target count via houserule setting.
- GM console workflow currently marks a `longTermCare` flag and does not apply HP directly.

Seams:

- Need one authority for whether Long-Term Care applies HP immediately or attaches a pending rest modifier.
- Need trained/untrained target-count logic from Treat Injury skill state.
- Need self-care prohibition.
- Need 24-hour cooldown consistency between HealingMechanics and GM console.

### Treat Injury - Surgery

Rules target:

- Trained only; requires Surgery Kit.
- 1 hour uninterrupted work.
- DC 20 Treat Injury.
- Heal `Constitution bonus, minimum 1, x level`.
- Also removes Persistent Conditions when performed to heal damage.
- Failure yields no benefit and resources are lost.
- Failure by 5 or more deals damage equal to Damage Threshold; if target is already 0 HP, it dies unless Force Point rescue applies.
- Self-surgery has a -5 penalty.
- Cybernetic installation requires Cybernetic Surgery feat.

Current accounting:

- `HealingMechanics.performSurgery()` exists and calculates healing by Con modifier x level.
- It has failure-damage logic, but reads damage threshold from `patient.system?.traits?.damageThreshold || 5`, which may not be the canonical DT path.
- GM console surgery workflow removes `system.conditionTrack.persistent` and applies a fixed amount if the GM provided it.

Seams:

- Surgery Kit requirement is not enforced.
- Trained-only requirement is not strongly enforced in the GM workflow.
- Failure damage should route through `ActorEngine.applyDamage()`/damage packet authority, not direct HP subtraction.
- Persistent condition removal should be source-scoped where possible, not just `persistent=false` globally unless GM confirms.
- Self-surgery -5 is not represented.
- Cybernetic installation belongs in a separate cybernetic/gear workflow, not generic healing.

### Treat Injury - Revivify

Rules target:

- Trained only; requires Medical Kit.
- Full-Round Action.
- Must reach target within 1 round of death.
- DC 25 Treat Injury.
- Medpac grants +2 Equipment bonus according to supplied text.
- Success means the creature is unconscious instead of dead.
- Failure means unable to revive.

Current accounting:

- `HealingMechanics.performRevivify()` exists in the healing module.
- GM console has a simplified Revivify workflow with DC 25 and default 1 HP.
- Combat action data includes Revivify in a bundled non-executable action.

Seams:

- Death timestamp/window is not clearly encoded.
- Medical Kit/Medpac equipment is not checked or consumed.
- Result should probably set state to unconscious/0 HP/appropriate CT, not simply heal 1 HP unless a table chooses that shortcut.
- Force Point rescue and death-state code should be coordinated with the existing death/damage threshold systems.

### Treat Disease / Poison / Radiation

Rules target:

- Disease and Radiation: 8 hours, trained only, Medical Kit, check against hazard DC; cures ill effects including Persistent Conditions caused by it.
- Poison: Full-Round Action, trained only, Medical Kit, check against poison DC; detoxifies and removes related ill effects/persistent conditions.

Current accounting:

- Combat action data has Treat Poison as non-executable reference with `equals or exceeds Poison DC` wording.
- GM Combat & Recovery service has status-effect and poison handling helpers.
- PoisonEngine exists separately.

Seams:

- Need source-scoped persistent condition removal: poison/disease/radiation should remove conditions caused by that source, not all unrelated persistent conditions unless GM chooses.
- Treat Poison should be Full-Round Action and trained/kit gated.
- Disease/Radiation 8-hour workflows are not obviously first-class.

### Critical Care

Rules target:

- Trained only; requires Medpac and Surgery Kit.
- One minute.
- Expends one Medpac.
- DC 20 Treat Injury.
- Heals `Character Level + margin` HP.
- -5 cumulative penalty per previous Critical Care attempt in 24 hours.
- Failure causes overdose damage equal to Damage Threshold; if this drops target to 0 HP, it dies unless Force Point rescue applies.
- Self-treatment has -5 penalty.

Current accounting:

- `HealingMechanics.performCriticalCare()` and `getCriticalCarePenalty()` exist.
- GM console has a Critical Care / Stabilize workflow but default DC is 15 and amount is 1, which does not match the supplied Critical Care rule.

Seams:

- GM console labels appear to conflate Critical Care and Stabilize.
- Medpac and Surgery Kit requirements are not enforced.
- Overdose damage should route through canonical damage, not direct HP mutation.
- Critical Care attempt history must count both failed and successful attempts.

### Natural Healing

Rules target:

- Living creature only.
- 8 consecutive uninterrupted hours of rest.
- Heals HP equal to Character Level.
- Cannot heal naturally if the creature has any Persistent Conditions.
- Once per 24-hour period.
- Stacks with First Aid or Long-Term Care.

Current accounting:

- `RecoveryMechanics` handles rest recovery when the recovery houserule is enabled.
- It explicitly excludes droids and vehicles from rest recovery.
- It calculates HP recovery by houserule `recoveryHPType`: standard hit die, slow, fast, custom, etc.
- GMHealingTrigger calls RecoveryMechanics for natural healing.
- GM full organic recovery heals to full and resets condition, which is useful as a GM override but not RAW Natural Healing.

Seams:

- RAW Natural Healing is not the default calculation in the houserule adapter.
- Persistent condition blockade is not clearly enforced in `isRestRecoveryEligible()` or `performRecovery()`.
- Once-per-24-hour natural healing tracking is not clearly present.
- NPC/beast eligibility differs between GMHealingTrigger and GMCombatRecoveryService.

### Bonus Hit Points / Temporary HP

Rules target:

- Bonus HP is a temporary buffer.
- Damage is subtracted from Bonus HP first.
- Remaining Bonus HP disappears at end of encounter.
- Multiple sources do not stack; use only the larger pool.

Current accounting:

- `ActorEngine.applyDamage()` persists `resolution.bonusHpAfter` to `system.hp.bonus` and temp HP mitigation to `system.hp.temp`.
- Bolster Ally has existing mechanics to grant temporary HP.
- Some data sources refer to Bonus Hit Points, temp HP, or source-specific buffer HP.

Seams:

- Need one canonical field for SWSE Bonus Hit Points vs Foundry-style temp HP, or a documented mapping.
- Multiple bonus HP sources must compare and keep the larger amount, not add unless a specific rule says otherwise.
- End-of-encounter cleanup must remove Bonus HP.
- Gear/talent source attribution should be preserved so the Summary tab can show why the buffer exists.

### Droid/Object/Vehicle Repair

Rules target from the supplied addendum:

- Requires Tool Kit.
- At least 1 hour of work.
- Mechanics check.
- Only one character may Repair a given object at a time; Aid Another can assist.
- DC 20 to repair damaged/Disabled Droid.
- Droid repair restores HP equal to Droid Character Level and removes Persistent Conditions currently affecting the Droid.
- Droid can self-repair, but takes -5 penalty.
- DC 20 to repair damaged/Disabled object.
- Object/Vehicle repair restores 1d8 HP and removes Persistent Conditions.
- If repairing a vehicle while onboard, apply vehicle condition-track penalties to the Mechanics check.

Current accounting:

- GM Combat & Recovery service separates repair actions for droids/vehicles from organic healing actions.
- `performRepairSkill()` has repair workflows and uses `ActorEngine.applyHealing()` to restore HP.
- `ActorEngine.applyHealing()` knows how to move disabled droids back to operational status if HP becomes positive.
- Repair-specific talents exist in data: Repairs on the Fly, Droid Expert, Expert Droid Repair, Fast Repairs, and others.

Seams:

- Repair workflows use fixed amounts rather than droid level or object/vehicle `1d8` formula.
- Tool Kit requirement is not enforced.
- One-hour duration is not represented, except potentially GM adjudicated.
- Aid Another support is not connected to the Repair workflow.
- Persistent condition removal is not fully source/type scoped.
- Vehicle condition penalty while onboard is not obviously applied.
- Self-repair -5 is not clearly represented.

## Automation boundary recommendation

### Automate

- Second Wind eligibility, healing amount, use decrement, and encounter flag.
- First Aid healing formula once check result and target are known.
- Surgery healing formula once check result and target are known.
- Critical Care cumulative penalty and overdose damage once check result is known.
- Droid repair HP formula once Mechanics result and target type are known.
- Positive HP mutation capping at max HP.
- Bonus HP damage absorption and encounter cleanup.

### Assist / GM-confirmed

- Whether a Medpac, Medical Kit, Surgery Kit, or Tool Kit is actually available if gear tracking is nominal.
- Whether a target died within one round for Revivify.
- Whether Long-Term Care time was uninterrupted.
- Whether self-treatment applies.
- Whether Aid Another applies to a medical/repair workflow.
- Which Persistent Conditions are caused by poison/disease/radiation/surgery-relevant injuries.

### GM-managed

- Full surgery/cybernetic installation narrative consequences.
- Whether a vehicle is in a repair facility vs field conditions.
- Edge cases for living biotech devices, biotech repair, living vehicles, and unusual species traits.

## Recommended future posture

Build healing and repair as **rule packets**, not as generic negative damage.

A future packet should look like:

```js
{
  kind: "healing" | "repair" | "bonusHp" | "drainHeal",
  source: "first-aid" | "second-wind" | "mechanics-repair" | "vital-transfer",
  targetKind: "organic" | "droid" | "vehicle" | "object" | "biotech",
  amountFormula: "level + margin" | "max(floor(maxHP/4), conScore)" | "droidLevel" | "1d8",
  actionCost: "swift" | "full-round" | "1-hour" | "8-hours" | "1-minute",
  requiresGear: ["medpac"],
  consumesGear: ["medpac"],
  cooldown: "24h-per-target",
  canSelfApply: true,
  selfPenalty: -5,
  removesPersistentCondition: false,
  persistentConditionScope: null
}
```

This lets the system remain a tabletop assistant: it can calculate and remember the rules without pretending it knows every downtime or equipment circumstance.
