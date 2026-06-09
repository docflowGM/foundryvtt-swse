# Combat Phase 0A — Rules Source Baseline and First-Pass Gap Accounting

Audit date: 2026-06-09  
Scope: source-baseline/accounting only. No runtime files changed.

## Purpose

This is Phase 0A of the combat audit. It does **not** try to exhaust the whole Saga Edition combat rulebook. The user-provided combat excerpts are treated as the skeleton baseline: actions in combat, attacks, damage, defenses, stun, autofire, shooting into melee, combat sequence, and grappling. The goal is to find obvious rule/code mismatches early before the later implementation phases lock in a routing model.

The important design boundary remains:

- automate sheet-owned math, action economy, roll context, damage math, and actor states when the rules are deterministic;
- assist with GM-facing reminders for positioning, line of sight, exact affected targets, cover adjudication, ready triggers, and area placement;
- do not build a mandatory map/template automation layer for rules that should remain table-adjudicated.

## Source skeleton captured for Phase 0A

### Action economy baseline

Rules skeleton:

- A normal turn has one Standard, one Move, and one Swift action.
- Standard may be exchanged down for Move or Swift; Move may be exchanged down for Swift.
- A Full-Round action consumes the actor's effort for the round.
- Free actions are GM-limited and can occur outside the normal action budget.
- Reactions are responses to another action/effect and are generally one reaction to one triggering action/effect.
- Some actions consume multiple swift actions, and those swift actions can matter across same-round/consecutive-round timing.

Current evidence:

- The combat action data can record action text such as `swift + standard`, `2 swift actions`, or `full-round`, but the sheet normalizer reduces that to a single action type and often reads `cost` before `actionType` (`scripts/sheets/v2/character-sheet.js`, `_deriveCombatActionEconomyType`).
- `Autofire` is data-modeled as `swift + standard` with no numeric cost (`data/combat-actions.json` lines 102-119).
- `Brace Autofire-Only Weapon` is data-modeled as `2 swift actions` with `cost: 2` (`data/combat-actions.json` lines 122-130).

First-pass accounting:

| Rule area | Current posture | Phase 0A finding |
|---|---|---|
| Single standard/move/swift actions | mostly supported | basic spend path exists |
| Full-round actions | partially supported | full-attack has a real engine, but only if action rows have `resolutionMode: fullAttack` |
| Action exchange/downshifting | partial | action economy tracker appears to track budgets, but compound rule intent is not captured in data contract |
| Multi-swift actions | weak | `cost: 2` can normalize as an invalid action type instead of “spend two swift actions” |
| Compound actions | weak | `swift + standard` cannot be faithfully spent as written |
| GM/manual action reminders | supported | manual/reference route can spend economy and create chat cards |

Immediate glaring gap: **compound and multi-swift action costs need an explicit action-cost contract before Autofire, Brace, Recover, Aim, Mighty Swing, or similar rules can be considered faithful.**

---

### Attack baseline

Rules skeleton:

- Attacking is normally a Standard Action.
- Melee/unarmed attack roll: `1d20 + BAB + Strength modifier`.
- Ranged attack roll: `1d20 + BAB + Dexterity modifier + range penalty`.
- Natural 20 automatically hits and threatens/produces a critical according to the applicable rule path.
- Natural 1 automatically misses.
- Most attacks target Reflex Defense.
- Area attacks compare one roll to each target in the affected area.
- Area attacks do not deal double damage on a critical hit.
- Shooting or throwing into melee imposes `-5` unless suppressed by Precise Shot.

Current evidence:

- Core attack bonus in `scripts/combat/rolls/attacks.js` uses BAB, ability modifier, range penalty, attack penalty, condition penalty, proficiency penalty, attack options, rage, and Basic effect intents (lines 255-353).
- Range penalties are implemented in `scripts/engine/combat/combat-stat-rules.js` as Short `-2`, Medium `-5`, Long `-10` (lines 251-259).
- The current attack roller determines target defense and hit/miss, but does not implement natural 1 automatic miss in the visible branch; it computes `isHit` as `roll.total >= targetReflex` and then computes critical state from the d20 (lines 375-381).
- `Precise Shot` is modeled as an attack option that suppresses `firingIntoMeleePenalty` (`scripts/engine/combat/combat-option-resolver.js` lines 88-94), but I did not find the corresponding base firing-into-melee penalty being applied in `computeAttackBonus`.

First-pass accounting:

| Rule area | Current posture | Phase 0A finding |
|---|---|---|
| BAB + ability attack math | strong | core math appears centralized and sane |
| Range penalty | supported | point-blank/none, short, medium, long supported |
| Proficiency penalty | supported | `-5` if weapon explicitly not proficient |
| Condition penalty | supported | derived CT penalty included |
| Natural 20 | partial | crit/hit logic present, but area critical handling depends on damage context |
| Natural 1 | suspect | visible attack path does not force miss solely from d20=1 |
| Shooting into melee | missing/unclear | Precise Shot suppression exists, but base penalty is not evident |
| Area attack roll vs multiple targets | not in canonical sheet attack path | legacy enhanced-rolls has a multi-target path, current sheet path mostly does one attack result |

Immediate glaring gaps:

1. **Precise Shot is currently mostly a dead suppression flag unless a firing-into-melee penalty is actually applied somewhere else.**
2. **Natural 1 automatic miss should be verified and likely patched later.**
3. **Area attack context needs to survive from attack declaration through damage.**

---

### Damage baseline

Rules skeleton:

- Melee/thrown melee damage: weapon damage + half heroic level + Strength modifier.
- Ranged damage: weapon damage + half heroic level.
- Two-handed melee attacks add double Strength bonus, except where rule exceptions apply.
- Damage always deals at least 1 damage on a hit unless a special rule says otherwise.
- Critical hits generally double damage.
- Area attacks do not double damage on critical hits.
- Damage threshold can move the target down the Condition Track.

Current evidence:

- There are at least two weapon damage authorities: `scripts/combat/rolls/attacks.js` contains a `rollDamage` path after the attack functions, while `scripts/combat/rolls/damage.js` also exports `rollDamage`.
- `scripts/combat/rolls/damage.js` computes base formula, half-level/ability contribution through helper functions, talent damage, force/custom modifiers, and crit multiplier (lines 262-309).
- The damage roller correctly attempts to avoid critical multiplication for area attacks when `isAreaAttack(weapon, context)` is true (`scripts/combat/rolls/damage.js` lines 294-300).
- `isAreaAttack` only works if the weapon or context says area attack (`scripts/engine/combat/combat-stat-rules.js` lines 333-340).
- Damage resolution applies mitigation, checks threshold, and moves condition track on threshold exceedance (`scripts/engine/combat/damage-resolution-engine.js` lines 215-282).

First-pass accounting:

| Rule area | Current posture | Phase 0A finding |
|---|---|---|
| Half-level damage | supported | helper-based damage path appears to support it |
| Strength to melee/thrown | supported/complex | helper handles melee/thrown and two-handed selectors |
| Ranged no Strength | likely supported | default no damage ability selector for normal ranged weapons |
| Two-handed Strength | supported | context-dependent, but relies on correct grip/context |
| Crit doubling | supported | implemented in damage path |
| Area crit no double damage | conditionally supported | only if `areaAttack` context survives |
| Minimum 1 damage | not proven | not obvious in visible roll path |
| Damage threshold | supported | damage engine has a threshold pipeline |
| Duplicate authority | risk | two damage rollers invite drift |

Immediate glaring gap: **damage context preservation is the key risk. Even good damage rules fail if the attack card’s damage button does not carry attack-mode flags like area, autofire, burst fire, aim, charge, or crit state.**

---

### Defenses baseline

Rules skeleton:

- Reflex: `10 + Heroic Level or Armor Bonus + Dexterity modifier + Class Bonus + Size Modifier`.
- Fortitude: `10 + Heroic Level + Constitution modifier + Class Bonus + Equipment Bonus`.
- Will: `10 + Heroic Level + Wisdom modifier + Class Bonus`.
- Droids and nonliving targets may substitute Strength where Constitution is absent.
- Flat-footed/unaware targets lose Dexterity bonus to Reflex.
- Helpless targets calculate Reflex as if Dexterity were 0.
- Size modifier applies to Reflex only.

Current evidence:

- Size modifier constants exist for Reflex in `scripts/engine/combat/combat-stat-rules.js`.
- The current attack roll reads target defense totals already present on the actor rather than recomputing defense from source pieces.
- The combat-status work has a `CombatStatusResolver`, but this phase did not audit defense derivation deeply; that belongs in Phase 0G/0H.

First-pass accounting:

| Rule area | Current posture | Phase 0A finding |
|---|---|---|
| Defense totals available | supported | attack roller reads target totals |
| Size modifiers | supported at helper level | needs end-to-end defense audit |
| Armor vs heroic level for Reflex | needs audit | likely related to recent follower/NPC defense bug reports |
| Flat-footed | unclear | no clear context pass into target defense resolution from attack roller |
| Helpless | unclear | no clear target-state defense transformation in attack path |
| Pinned loses Dex to Reflex | currently wrong in grappling system | current grapple applies flat defense penalties/CT override instead |

Immediate glaring gap: **defense totals may be good for normal cases, but target-state transforms like flat-footed, helpless, pinned, cover, and denied-Dex need a dedicated state audit before combat automation trusts them.**

---

### Stun baseline

Rules skeleton:

- Stun setting can require switching weapon mode as a Swift Action.
- Blaster stun usually max range 6 squares with no range penalties.
- Only creatures can be stunned; droids, vehicles, and objects are immune to Stun Damage.
- Successful stun attack subtracts half stun damage from HP.
- If stun damage reduces HP to 0, target moves `-5` steps down condition track and is unconscious.
- If pre-halved stun damage equals/exceeds Damage Threshold, target moves `-2` steps down condition track.
- Stun unconsciousness does not become death from failed recovery checks.

Current evidence:

- `Switch Weapon Mode` exists as a combat action (`data/combat-actions.json` lines 762-773).
- Damage resolution accepts `isStun`/`damageType === 'stun'` in threshold evaluation (`scripts/engine/combat/damage-resolution-engine.js` around threshold evaluation), but I did not see a complete stun-specific damage pipeline in the canonical weapon damage path.

First-pass accounting:

| Rule area | Current posture | Phase 0A finding |
|---|---|---|
| Switch weapon mode | reminder/action exists | does not prove weapon state mutation works |
| Stun range cap | not proven | no obvious combat path enforcement |
| Half HP damage | not proven | needs damage application audit |
| Pre-halved DT comparison | not proven | damage engine likely sees one damage number only |
| Creature-only stun immunity | not proven | droid/vehicle/object immunity should be explicitly audited |
| Stun unconsciousness vs death | not proven | death/rescue pipeline may not distinguish stun well enough |

Immediate glaring gap: **stun has enough special handling that it should not be treated as just `damageType: stun`; it needs a dedicated Phase 0D/E audit.**

---

### Autofire / Burst Fire / Evasion baseline

Rules skeleton:

Autofire:

- Weapon must have Autofire setting or be Autofire-only.
- Switching a weapon to Autofire is a Swift Action.
- Autofire targets a GM-adjudicated 2x2-square area.
- Single attack roll at `-5`.
- Compare one roll against Reflex Defense of every affected creature.
- Hit = full damage; miss = half damage.
- Consumes 10 shots/slugs and requires at least 10 available.
- Area attacks do not double damage on critical hits.

Brace:

- Autofire-only weapons may be braced by taking two Swift Actions immediately before the attack.
- Bracing reduces Autofire/Burst Fire penalty to `-2` under qualifying weapon conditions.

Burst Fire:

- Requires Burst Fire feat.
- Uses an Autofire-capable weapon against one target instead of an area.
- Takes `-5` attack penalty.
- Adds `+2` weapon dice.
- Consumes 5 shots.
- Is **not** an area attack, so Evasion should not apply.

Evasion:

- Against area attacks, if the attack hits: take half damage.
- Against area attacks, if the attack misses: take no damage.
- Does not modify Burst Fire because Burst Fire is not an area attack.

Current evidence:

- Combat action data documents Autofire and Burst Fire in mostly correct rule text (`data/combat-actions.json` lines 102-153).
- `CombatOptionResolver` has a Burst Fire attack option with `-5`, `+2` dice, `requiresAutofire`, and 5-shot metadata (`scripts/engine/combat/combat-option-resolver.js` lines 69-78).
- The Roll Configurator displays raw `attackOptions.autofire` and `attackOptions.burstFire` checkboxes (`scripts/rolls/roll-config.js` lines 924-925), while `CombatOptionResolver` also generates curated `combatOptions` cards separately (lines 803, 920).
- The Roll Configurator returns `attackOptions` and `combatOptions`, but its `Aiming`/`Charging` quick toggles are returned under `situational`, not as top-level `aim`/`charge` flags (lines 1099-1147).
- Legacy `enhanced-rolls.js` contains a dedicated `rollAutofire` path with ammo, multi-target handling, and Evasion comments (lines 479-505), but the current character sheet attack route goes through `SWSERoll.rollAttack` in the canonical sheet path (`scripts/sheets/v2/character-sheet.js` lines 7342-7390).
- If the legacy autofire path is used, it checks Evasion on the **attacker** (`actor.items`) instead of each target (`scripts/combat/rolls/enhanced-rolls.js` lines 643-651), and it incorrectly gives half damage on a missed Burst Fire attack (`scripts/combat/rolls/enhanced-rolls.js` lines 670-676).

First-pass accounting:

| Rule area | Current posture | Phase 0A finding |
|---|---|---|
| Autofire rule text | strong | data has good notes |
| Autofire attack penalty | weak in canonical route | raw checkbox may not activate a resolver rule |
| Autofire ammo 10 | partial legacy | legacy path has it, canonical path not proven |
| Autofire affected targets | GM-managed by design | should be chat-guided, not template-forced |
| Autofire hit/miss damage | partial legacy | needs canonical damage-context implementation |
| Brace two swift | weak | data contract/action economy cannot faithfully represent it yet |
| Burst Fire attack/damage | partially modeled | resolver has rule, but action data conflicts and damage context must persist |
| Burst Fire action cost | conflicting | core action says standard; feat action says full-round |
| Evasion | high-risk | metadata claims existing runtime, but current/legacy paths are suspect |

Immediate glaring gaps:

1. **Evasion is a red-flag audit item.** Metadata says it is implemented by enhanced-rolls, but the current sheet’s canonical route appears different, and the legacy route checks the wrong actor.
2. **Burst Fire miss behavior in legacy autofire is wrong for a single-target attack.** A miss should not become half damage just because it used an autofire-capable weapon.
3. **Autofire should remain GM-managed for target selection, but the system still needs to automate penalty, ammo, area-damage note, Evasion reminder/application, and no crit doubling.**

---

### Grapple / Grab / Pin / Trip baseline

Rules skeleton from the pasted Grappling 101 source:

- The three states are Grabbed, Grappled, and Pinned.
- Grab is an unarmed melee attack as a Standard Action.
- An untrained attacker without Pin or Trip takes `-5` on the Grab attack.
- A trained attacker with Pin or Trip takes no penalty and can immediately improve a successful Grab into a Grapple.
- Grabbed target cannot move and takes `-2` to attacks unless using a Natural Weapon or Light Weapon.
- Grappled has the same movement/attack limits as Grabbed, but escape is harder and grapple riders can apply.
- Grapple upgrade is an opposed Grapple check; attacker succeeds if the attacker's check equals or exceeds defender's result.
- If the defender wins the opposed Grapple check, the attempted Pin/Trip/hit fails, but the defender remains Grabbed/Grappled as applicable.
- Pin requires Pin feat and successful opposed Grapple check.
- Pinned target cannot take actions and loses Dex bonus to Reflex. It remains pinned for one round until the attacker's next turn.
- Maintaining a Pin uses another opposed Grapple check; no new melee attack is required if the target is already Grabbed/Grappled/Pinned.
- Grab escape is automatic as a Standard Action from one grabber per character level.
- Grapple escape is Standard Action Acrobatics vs the attacker's last Grapple check.
- Pin escape only happens by winning the opposed Grapple check during the attacker's turn.

Current evidence:

- Combat action data has a `Grapple / Grab` card, but the rule text collapses Grab and Grapple into one action and says “Unarmed attack to grab (-5). If hit, make opposed grapple checks” without the Pin/Trip training gate (`data/combat-actions.json` lines 295-309).
- A dedicated grappling system exists in `scripts/combat/systems/grappling-system.js`.
- The grappling system’s Grab penalty checks for talents named `Grabber` and `Entangler`; it does not use Pin/Trip feats as the basic trained/untrained gate (`scripts/combat/systems/grappling-system.js` lines 56-60).
- `attemptGrab` does roll an unarmed attack, applies the grab penalty, uses `maneuver: 'grab'`, and adds Grapple Resistance to target Reflex (lines 76-105).
- The opposed Grapple check treats only strict `>` as attacker win, not `>=` (lines 112-127).
- Successful Grapple applies Grappled to both attacker and defender (lines 134-135 onward), while the source flow says the target becomes grappled; the attacker is participating but not necessarily penalized as the defender.
- Grabbed and Grappled apply `-5` Reflex via Active Effects (lines 225-249), even though the skeleton rule says they cannot move and take `-2` to attacks except with Natural/Light weapons.
- Pinned applies `-10` Reflex and overrides condition track to 5 (lines 253-260), while the skeleton rule says the target cannot act and loses Dex bonus to Reflex; it does not automatically move to the bottom of the condition track.
- Escape Grapple calls another opposed grapple check and clears both states if escaper wins (lines 173-180), while the skeleton says Grappled escape is Acrobatics vs the attacker's last grapple check; Grabbed escape is automatic.

First-pass accounting:

| Rule area | Current posture | Phase 0A finding |
|---|---|---|
| Three-state model | partially present | state names exist |
| Grab attack | partial | unarmed attack path exists in grappling system |
| Pin/Trip trained gate | wrong/missing | system checks different talents for penalty relief |
| Grabbed effects | wrong | applies Reflex penalty instead of movement lock + conditional attack penalty |
| Grappled effects | wrong/partial | applies Reflex penalty, not the actual attack/movement limits |
| Pin effects | wrong/high risk | condition track override is not the rule |
| Opposed check tie | wrong | attacker should win ties per pasted rule language |
| Escape from Grab | missing/wrong | should be automatic Standard Action |
| Escape from Grapple | wrong/house-rule-like | should be Acrobatics vs last grapple result, not opposed check by default |
| Pin maintenance | partial/wrong | opposed check exists, but state duration/maintenance model needs accounting |
| Crush/Bone Crusher/Rancor Crush/Throw | metadata present | runtime application not proven |

Immediate glaring gap: **grappling has the largest rules-fidelity mismatch found in 0A. The current system has useful pieces, but it is not faithful enough to build later combat automation on top of without a dedicated Phase 0F and implementation phase.**

---

## Feat/talent context baseline found in this pass

This is not the full Phase 0H crosswalk yet. It is the initial 0A accounting of obvious dependencies.

### Strong/usable metadata that still depends on context routing

| Feat/Talent | Metadata posture | Blocking context risk |
|---|---|---|
| Burst Fire | attack option exists with `-5`, `+2 dice`, 5 ammo | needs selected option, autofire-capable weapon, ammo, and damage context |
| Rapid Shot | attack option exists | needs damage button to preserve +1 weapon die context |
| Rapid Strike | attack option exists | same damage-context risk |
| Careful Shot | requires Aim | Roll Configurator returns `situational.aiming`, but resolver requires `aim` |
| Deadeye | requires Aim | same mismatch as Careful Shot |
| Powerful Charge | requires Charge | Roll Configurator returns `situational.charging`, but resolver requires `charge` |
| Charging Fire | requires Charge | same mismatch; defense penalty persistence also unproven |
| Improved Disarm | requires maneuver `disarm` | generic action route does not clearly pass `maneuver: 'disarm'` |
| Melee Defense | produces defense modifier | modifier collection exists, persistence into actor state is unproven |
| Precise Shot | suppresses firing-into-melee penalty | base penalty not evident |
| Far Shot | range penalty adjustment exists | needs correct range band context |

### Grapple-family metadata that needs dedicated Phase 0F/0H

| Feat/Talent | Current metadata posture | 0A concern |
|---|---|---|
| Pin | rider metadata exists | runtime grapple state is not faithful |
| Trip | rider metadata exists | runtime grapple state is not faithful |
| Crush | rider metadata exists | damage/CT rider path not proven |
| Bone Crusher | metadata-only/conditional | needs actual grapple damage event context |
| Rancor Crush | metadata-only/conditional | needs actual Crush event context |
| Throw | rider metadata exists | needs Trip/grapple state and GM movement note |
| Grapple Resistance | metadata exists and is referenced by grappling system | route needs to use correct resist contexts consistently |
| Multi-Grab | metadata exists | runtime multi-target grab action not proven |
| Grab Back | metadata exists | reaction context not proven |
| Improved Grapple | metadata exists | AoO suppression and +5 grapple context not proven |

### Area/autofire/evasion metadata that needs dedicated Phase 0E/0H

| Feat/Talent | Current metadata posture | 0A concern |
|---|---|---|
| Evasion | metadata says existing runtime in enhanced-rolls | current route likely bypasses it; legacy route checks attacker not target |
| Improved Evasion | legacy comments mention it | legacy code did not actually halve hit damage in inspected branch |
| Autofire Assault | metadata/authority text exists | needs sustained same-area context, probably GM-assisted only |
| Autofire Sweep | metadata/authority text exists | needs area-width context, GM-assisted only |
| Controlled Burst | feat combat action data exists | needs autofire/burst penalty context |
| Burst Fire | good resolver rule | must not be area; must not trigger Evasion; miss should be miss |

---

## First-pass glaring gaps summary

### High severity

1. **Grapple rules fidelity is not safe yet.** The existing grappling system has a useful shell but wrong basic gates/effects for Grabbed, Grappled, Pinned, escape, and tie handling.
2. **Evasion is not trustworthy yet.** Metadata claims it is handled, but canonical route likely bypasses the old enhanced-roll path, and the old path checks Evasion on the attacker rather than targets.
3. **Attack context naming mismatch blocks several feats.** `Careful Shot`, `Deadeye`, `Powerful Charge`, and `Charging Fire` require `aim`/`charge`, but the current preroller returns `situational.aiming`/`situational.charging` plus a flat situational bonus.
4. **Compound action costs are not faithfully represented.** Autofire, Brace, and other multi-action rules cannot be fully trusted until action costs are represented as structured costs rather than one normalized action string.
5. **Damage context drift is likely.** There are duplicate damage paths and attack-card damage buttons may not preserve the combat option context needed by Burst Fire, Rapid Shot, Rapid Strike, area critical rules, and Evasion.

### Medium severity

6. **Precise Shot has metadata but no obvious base firing-into-melee penalty to suppress.**
7. **Natural 1 automatic miss needs verification in canonical attack path.**
8. **Burst Fire action cost conflicts between data sources.** Core combat action says standard; feat combat action says full-round.
9. **Full Attack engine is strong, but action rows must explicitly route to it.** Data-only `Full attack` rows without `resolutionMode: fullAttack` are not enough.
10. **Stun Damage likely needs a dedicated path.** Half HP damage, pre-halved DT comparison, stun immunities, and stun unconsciousness are not proven from visible code.

### Lower severity / GM-managed by design

11. Exact Autofire area, targets, line of sight, cover geometry, and template placement should remain GM-managed.
12. Charge path legality, movement path, and terrain constraints should remain GM-managed, while the sheet handles attack/defense math and chat summaries.
13. Feint, Ready, Create Diversion, and similar table-context actions should primarily create roll/chat/state reminders rather than hard automation.

---

## Recommended next Phase 0 subphases

### Phase 0B — Combat Action Database Audit

Audit every combat action row and classify it as:

- executable attack
- executable skill/ability check
- combat-state mutation
- full-attack route
- manual/reference only
- GM-managed reminder
- broken/ambiguous

This should include action economy cost shape and whether the action spends the correct budget.

### Phase 0C — Attack Roll Audit

Deep trace canonical attack formula, natural 1/20, firing into melee, precise shot, range, target defense transforms, and attack option context.

### Phase 0D — Damage Audit

Deep trace damage button context, duplicate damage rollers, crits, area attack crit exception, minimum 1 damage, threshold, stun, and condition track changes.

### Phase 0E — Autofire / Burst / Evasion Audit

Trace the exact route from the combat tab and attack preroller through attack, damage, chat cards, ammo, and target area outcome notes.

### Phase 0F — Grapple Audit

Build a dedicated Grabbed/Grappled/Pinned truth table from the pasted rules and compare every existing code path and feat/talent rider to it.

## Phase 0A conclusion

The system has a meaningful combat backbone: attack math, range penalties, attack option metadata, a full-attack executor, damage resolution, and action economy infrastructure all exist. The first-pass problem is not lack of code; it is **context fidelity**.

The glaring gaps are concentrated in places where one rule is actually a multi-step state machine:

- Grapple/Grab/Pin/Trip
- Autofire/Burst/Evasion
- Aim/Charge/Brace/Mighty Swing
- Full Attack / dual weapon / multiattack
- Stun damage

Phase 0B through 0F should keep separating “automate” from “assist/GM-managed” so the system remains a tabletop assistant instead of a forced map simulator.
