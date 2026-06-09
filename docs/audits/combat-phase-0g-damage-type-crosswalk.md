# Combat Phase 0G - Damage Type / Feat / Talent / Item Crosswalk

Audit only. No runtime files were changed.

## Purpose

This crosswalk lists the current rules dependencies discovered for special damage semantics. It is not a complete rulebook inventory. It is a first-pass accounting of damage-type-related repo seams that need to be considered before combat implementation phases begin.

## Damage type crosswalk

| Damage type | Rule meaning from audit input | Found repo support | Current concern |
|---|---|---|---|
| Acid | Recurring hazard; `+4 vs Fortitude`; `2d10`, half on miss; repeats until washed/treated | Damage type option exists; Acid data appears in packs | No canonical Acid hazard creation/resolution found |
| Bludgeoning | Physical subtype; unarmed/power hammer style damage | Some natural/special data uses `bludgeoning`; system mostly uses `kinetic` | Physical subtype may be collapsed/lost in many UI paths |
| Electrical | Distinct type for shock/electrical hazards | Not found as first-class item editor option | Likely missing from canonical type options |
| Energy | Core blaster/lightsaber type | Widely used | Needs formal alias relation with Sonic |
| Fire | Triggers Fire hazard/Burning | Fire type exists; Barab Ingot changes lightsaber to Fire | Damage does not appear to create recurring Burning hazard automatically |
| Force | Force powers/effects; Yuuzhan Vong immunity if targeting Will | Force type appears in data/reactions; Yuuzhan Vong trait exists | Immunity depends on effect source + target defense, not just type |
| Ion | Half HP damage; original damage for DT; special effects for droids/vehicles/devices/cybernetics | Ion type exists; threshold hook accepts `isIon`; Ion Shielding hook exists | Needs split damage packet and target eligibility gate |
| Piercing | Physical subtype; slugthrowers/bites | Some data uses `piercing`; system mostly uses `kinetic` | Physical subtype may be collapsed/lost in many UI paths |
| Slashing | Physical subtype; blades/claws/explosives | Some data uses `slashing`; lightsabers often only `energy` | Mixed damage like Energy+Slashing needs packet support |
| Sonic | Counts as Energy; ranged Sonic cannot be Deflected; bonus Sonic can persist after Deflect | Sonic type exists; Sonic weapons/effects exist | No clear Energy alias, no Deflect exclusion, no mixed packet support |
| Stun | Half HP damage to creatures; no damage to non-creatures; original damage for DT; CT effects | Stun type exists; threshold hook accepts `isStun`; stun weapons exist | Needs split damage packet and target type gate |

## Feats/talents/items with obvious dependencies

| Name | Type | Damage dependency | Current concern |
|---|---|---|---|
| Evasion | Talent | Area attack hit/miss damage semantics | Depends on area damage context surviving into damage resolution |
| Burst Fire | Feat | Single-target, not area; +2 weapon dice; no half damage on miss; no Evasion | Needs damage context that explicitly avoids area hooks |
| Ion Shielding | Feat | Ion DT CT movement cap | Hook exists, but baseline Ion CT behavior is not safe yet |
| Ion Resistance 10 | Talent | Type-specific mitigation vs Ion | Needs reliable `damageType: ion` and type-specific DR matching |
| Ion Mastery | Talent | Attack/damage bonuses with Ion weapons | Needs attack and damage contexts to preserve Ion weapon type |
| Damage Conversion | Feat | Can exclude Ion / change damage semantics | Requires canonical type checking |
| Deflect | Talent/reaction | Cannot Deflect ranged Sonic; mixed Sonic bonus may remain | Current reaction registry does not appear to restrict Sonic |
| Negate Energy | Force Power | Energy interactions, possibly Sonic-as-Energy | Needs Sonic counts-as-Energy alias |
| Barab Ingot | Lightsaber crystal | Changes lightsaber damage to Fire | Fire should then trigger hazard semantics |
| Bondar Crystal | Lightsaber crystal | Changes lightsaber damage to Stun | Stun packet rules needed |
| Firkraan Crystal | Lightsaber crystal | Changes lightsaber damage to Ion | Ion packet rules needed |
| Dragite Crystal | Lightsaber crystal | Adds Sonic damage on critical | Mixed packet support needed |
| Lambent Crystal | Lightsaber crystal | Interacts with Yuuzhan Vong perception/Force suppression | Related to species Force immunity context |
| Yuuzhan Vong Force Immunity | Species trait | Immune to Force effects targeting Will | Needs target-defense-aware Force effect context |
| Fire weapons/templates | Weapons/upgrades | Fire should trigger hazard | Needs Burning effect/hazard creation |
| Acid hazards/weapons | Hazards/weapons | Acid should recur until removed | Needs Acid effect/hazard creation |
| Sonic weapons | Weapons | Cannot be Deflected if ranged Sonic | Needs Deflect eligibility check |

## UI / data crosswalk

| UI/data path | Current support | Concern |
|---|---|---|
| Entity item weapon editor | Shows several damage types via `WeaponDataResolver` | Lacks Electrical and physical subtype clarity |
| Older weapon config dialog | Smaller/different type list | Drift from entity dialog |
| Old item sheet | Energy/Kinetic/Ion only | Legacy drift can hide valid types |
| Weapon data defaults | Normalizes invalid blank weapon type to Energy | May erase new types unless registry updated |
| Attack rolls | Can build `damageType` and `damageTypes` context | Context may not survive damage buttons/application |
| Damage resolution | Accepts one `damageType` string | Not enough for split/mixed/special damage |
| Recurring damage adapter | Displays pending recurring damage | Does not create or resolve hazards |

## Implementation caution

Do not implement these as isolated one-off fixes. Stun, Ion, Sonic, Fire, Acid, and Evasion all need the same underlying improvement: a normalized damage packet that survives from attack declaration through damage application.
