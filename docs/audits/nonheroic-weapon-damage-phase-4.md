# NH-4 Unknown Regions Nonheroic Damage Profiles

## Purpose

NH-4 continues the nonheroic statblock damage profile pass by adding sourcebook-backed *The Unknown Regions* rows using the canonical NH-2 profile schema.

The batch is source-strict. It includes only rows where the source text clearly prints the attack and damage expression.

## Files changed

```text
data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json
scripts/engine/import/nonheroic-damage-profile-hydrator.js
```

## Added source family

```text
NH-4 Unknown Regions nonheroic statblock damage profiles
```

The profile file uses the same canonical runtime fields as the prior nonheroic phases:

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

Source, actor, match, and weapon fields remain attribution/matching wrappers and are not a separate runtime damage model.

## Verified sourcebook rows covered

### Wanderer Scout Surveyor Droid, CL 1

Source: *The Unknown Regions*.

- Claw — `1d4`, natural delivery, single-target.
- Stun Blaster / Stun Blast — `3d6`, stun, single-target.

### Vagaari Infiltrator, CL 5

Source: *The Unknown Regions*.

- Stun Baton — `2d6+4 stun`, single-target.
- Blaster Pistol — `3d6+1`, single-target.
- Hold-Out Blaster Pistol — `3d4+1`, single-target.

### Sando's Boys, CL 8

Source: *The Unknown Regions*.

- Vibroblade — `2d6+3`, single-target.
- Blaster Pistol — `3d6+2`, single-target.

### Sando's Hired Blasters, CL 6

Source: *The Unknown Regions*.

- Unarmed — `1d6+1`, squad melee area attack.
- Blaster Pistol — `3d6`, single-target.
- Blaster Carbine — `3d8`, single-target.

## Hydrator update

`nonheroic-damage-profile-hydrator.js` now loads:

```text
data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json
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

The printed attack totals are not copied into item `attackBonus` because they are complete statblock totals and would risk double counting against actor-derived math.

## Non-goals

NH-4 does not:

- parse printed attack totals,
- infer weapon rows from generic equipment names,
- rewrite compendium actors,
- rewrite source JSON,
- implement token geometry,
- execute riders/effects,
- change damage mitigation.

## Suggested smoke tests

After NH-4 is present in a local Foundry checkout:

- Import a Wanderer Scout Surveyor Droid if present in the importer source data.
- Verify the claw row hydrates as `delivery: "natural"`, `attackShape: "single-target"`, `primaryType: "slashing"`, and formula `1d4`.
- Verify the stun blaster/stun blast row hydrates as `delivery: "weapon"`, `primaryType: "stun"`, and formula `3d6`.
- Import a Vagaari Infiltrator if present and verify stun baton/blaster/hold-out rows hydrate without printed attack totals.
- Import Sando's Boys and Sando's Hired Blasters if present and verify their printed weapon rows hydrate.
- Verify printed attack totals are not inserted into `item.system.attackBonus`.
