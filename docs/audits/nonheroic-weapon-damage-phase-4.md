# NH-4 Unknown Regions Nonheroic Damage Profiles

## Purpose

NH-4 continues the nonheroic statblock damage profile pass by adding sourcebook-backed *The Unknown Regions* rows using the canonical NH-2 profile schema.

The batch is source-strict. It includes only rows where the source text clearly prints the attack and damage expression.

This phase also pilots the base-weapon reference pattern for ordinary weapons: `weapon.uuid` identifies the reusable compendium item where one exists, while `formula.printed` remains the authoritative statblock damage expression used for hydration.

This update also adds schema support for secondary attack options such as autofire, burst fire, charge variants, and other mode changes by allowing variant-level `delivery`, `attackShape`, and `scale` overrides.

## Files changed

```text
data/nonheroic/nonheroic-weapon-damage-profiles.schema.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json
scripts/engine/import/nonheroic-damage-profile-hydrator.js
```

## Added source families

```text
NH-4 Unknown Regions nonheroic statblock damage profiles
NH-4 Unknown Regions beast natural attack profiles
```

Both profile files use the same canonical runtime fields as the prior nonheroic phases:

```text
delivery
attackShape
scale
primaryType
tags
attack
area
components
riders
sourceRefs
confidence
```

Source, actor, match, weapon, formula, and printedAttack fields remain attribution/matching/audit wrappers and are not a separate runtime damage model.

## Base weapon reference pattern

Ordinary equipment rows can now carry:

```json
"weapon": {
  "printedName": "Blaster Pistol",
  "uuid": "Compendium.foundryvtt-swse.weapons-pistols.Item.weapon-blaster-pistol",
  "baseSlug": "weapon-blaster-pistol",
  "basePack": "weapons-pistols",
  "baseFormula": "3d6",
  "baseType": "energy",
  "baseFormulaPolicy": "uuid"
},
"formula": {
  "mode": "base-plus-delta",
  "printed": "3d6+2",
  "delta": "+2",
  "deltaSource": "printed-statblock"
},
"printedAttack": {
  "text": "+12",
  "bonus": 12,
  "bonuses": [12],
  "source": "printed-statblock",
  "hydratePolicy": "metadata-only"
}
```

The UUID/base fields let tools audit or explain duplication against the compendium weapon. The printed formula remains the authority for imported NPC damage.

`printedAttack` keeps the profile self-contained and lets the UI show the complete printed row, but its hydration policy is metadata-only. Printed attack totals are complete statblock totals and are not copied into `item.system.attackBonus`.

Natural attacks and custom actions use `formula.mode: "custom"` and `weapon.uuid: null` until the system has a deliberate reusable natural-weapon item model.

## Secondary attack options

Secondary modes should be represented as variants on the same base weapon/action family when they share the same weapon UUID or natural attack identity.

Variants may now override:

```text
delivery
attackShape
scale
primaryType
attack
area
components
riders
formula
printedAttack
```

That supports rows such as:

```text
base blaster carbine -> single-target 3d8
variant autofire -> autofire/area 3d8, half damage on miss, no critical double
variant burst fire -> single-target burst-fire mode with printed formula
natural gore -> single-target 1d8+7
variant charge -> single-target 1d8+10 with printed +13 attack metadata
```

The hydrator now prefers `variant.delivery`, `variant.attackShape`, and `variant.scale` over the base profile when a variant is selected.

## Packet compatibility

The UUID/formula/printedAttack layer is not a new combat path. During hydration, the importer still writes the same runtime-facing fields used by the packet builders:

```text
item.system.damage
item.system.damageFormula
item.system.damageType
item.system.damageTypes
item.system.primaryType
item.system.delivery
item.system.attackShape
item.system.scale
item.system.attack
item.system.area
item.system.components
item.system.riders
item.system.tags
```

The canonical damage packet builder can keep consuming the hydrated item exactly as before. The new fields are retained as metadata:

```text
item.system.sourceWeaponUuid
item.system.sourceWeaponBaseSlug
item.system.sourceWeaponBaseFormula
item.system.statblockPrintedFormula
item.system.statblockFormulaMode
item.system.statblockFormulaDelta
item.system.statblockPrintedAttackText
item.system.statblockPrintedAttackBonus
item.system.statblockPrintedAttackBonuses
flags.swse.damageProfile.sourceWeaponUuid
flags.swse.damageProfile.printedFormula
flags.swse.damageProfile.formulaDelta
flags.swse.damageProfile.printedAttackText
flags.swse.damageProfile.printedAttackBonus
```

That gives the UI and validators a way to explain `Blaster Pistol 3d6 + printed statblock delta +2 = 3d6+2`, while the packet still receives a normal printed formula.

## Verified sourcebook rows covered

### Wanderer Scout Surveyor Droid, CL 1

Source: *The Unknown Regions*.

- Claw — `+2`, `1d4`, natural delivery, single-target, custom natural attack.
- Stun Blaster / Stun Blast — `+3`, `3d6`, stun, single-target, references the base Blaster Pistol UUID but overrides type to stun.

### Vagaari Infiltrator, CL 5

Source: *The Unknown Regions*.

- Stun Baton — `+9`, `2d6+4 stun`, single-target, base Stun Baton plus printed delta `+1d6+4`.
- Blaster Pistol — `+7`, `3d6+1`, single-target, base Blaster Pistol plus printed delta `+1`.
- Hold-Out Blaster Pistol — `+7`, `3d4+1`, single-target, base Hold-Out Blaster Pistol plus printed delta `+1`.

### Sando's Boys, CL 8

Source: *The Unknown Regions*.

- Vibroblade — `+13`, `2d6+3`, single-target, base Vibroblade plus printed delta `+3`.
- Blaster Pistol — `+12`, `3d6+2`, single-target, base Blaster Pistol plus printed delta `+2`.

### Sando's Hired Blasters, CL 6

Source: *The Unknown Regions*.

- Unarmed — `+11`, `1d6+1`, squad melee area attack, custom unarmed row.
- Blaster Pistol — `+12`, `3d6`, single-target, base Blaster Pistol match.
- Blaster Carbine — `+13`, `3d8`, single-target, base Blaster Carbine match.

### Reyko, CL 5

Source: *The Unknown Regions*.

- Gore — `+11`, `1d8+7`, natural delivery, single-target, custom natural attack.
- Gore when charging — `+13`, `1d8+10`, natural delivery, single-target variant.
- Vehicle charge x2 and push effect are retained as riders/tags, not executable runtime effects.

### Vindinax, CL 6

Source: *The Unknown Regions*.

- Claw — `+7/+7`, `1d4+8`, natural delivery, single-target, custom natural attack.
- Bite — `+7`, `1d6+8`, natural delivery, single-target, custom natural attack.
- Rend `+2d6` is retained as a rider, not an executable runtime effect.

## Hydrator update

`nonheroic-damage-profile-hydrator.js` now loads:

```text
data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json
```

Hydration still requires:

1. `confidence: "verified"`,
2. actor/template slug match, and
3. raw attack-row text match.

Unmatched rows and non-verified rows remain reference-only.

## Source authority notes

The source text directly prints the included attack rows and damage formulas, including:

- `Melee claw +2 (1d4)` and `Ranged stun blaster +3 (3d6 stun)` for the Wanderer Scout Surveyor Droid.
- `Melee stun baton +9 (2d6+4 stun)`, `Ranged blaster pistol +7 (3d6+1)`, and `Ranged hold-out blaster pistol +7 (3d4+1)` for the Vagaari Infiltrator.
- `Melee vibroblade +13 (2d6+3)` and `Ranged blaster pistol +12 (3d6+2)` for Sando's Boys.
- `Melee unarmed +11 (1d6+1)`, `Ranged blaster pistol +12 (3d6)`, and `Ranged blaster carbine +13 (3d8)` for Sando's Hired Blasters.
- `Melee gore +11 (1d8+7)`, `Melee gore +13 (1d8+10) when charging`, and `Melee gore +13 (1d8+10 x2) when charging a vehicle` for the Reyko.
- `Melee claw +7/+7 (1d4+8)`, `Melee bite +7 (1d6+8)`, and Rend `+2d6` for the Vindinax.

The printed attack totals are not copied into item `attackBonus` because they are complete statblock totals and would risk double counting against actor-derived math.

## Non-goals

NH-4 does not:

- hydrate printed attack totals into item attack math,
- reverse-engineer why a statblock delta exists,
- resolve compendium UUIDs at runtime,
- infer weapon rows from generic equipment names,
- rewrite compendium actors,
- rewrite source JSON,
- implement token geometry,
- execute riders/effects,
- change damage mitigation.

## Suggested smoke tests

After NH-4 is present in a local Foundry checkout:

- Import a Wanderer Scout Surveyor Droid if present in the importer source data.
- Verify the claw row hydrates as `delivery: "natural"`, `attackShape: "single-target"`, `primaryType: "slashing"`, formula `1d4`, and printed attack metadata `+2`.
- Verify the stun blaster/stun blast row hydrates as `delivery: "weapon"`, `primaryType: "stun"`, source weapon UUID for Blaster Pistol, formula `3d6`, and printed attack metadata `+3`.
- Import a Vagaari Infiltrator if present and verify stun baton/blaster/hold-out rows hydrate with `statblockPrintedFormula`, `statblockFormulaDelta`, and `statblockPrintedAttackText` metadata.
- Import Sando's Boys and Sando's Hired Blasters if present and verify their printed weapon rows hydrate.
- Import Reyko and Vindinax if present and verify their natural weapon rows hydrate while riders remain metadata-only.
- Verify Reyko's charge variant can override the base row metadata with `printedAttack.text: "+13"`, `formula.printed: "1d8+10"`, `delivery: "natural"`, and `attackShape: "single-target"` when selected.
- Roll a hydrated row and verify the packet builder receives the printed damage formula from `item.system.damageFormula` without needing to resolve `weapon.uuid`.
- Verify printed attack totals are not inserted into `item.system.attackBonus`.
