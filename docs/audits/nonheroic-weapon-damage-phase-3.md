# NH-3 Galaxy of Intrigue Nonheroic Damage Profiles

## Purpose

NH-3 continues the nonheroic statblock damage profile pass by adding sourcebook-backed *Galaxy of Intrigue* rows using the canonical NH-2 profile schema.

This is a profile-data expansion only. It does not rewrite compendium actors, mutate source JSON, alter attack math, or change the mitigation pipeline.

## Files changed

```text
data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json
scripts/engine/import/nonheroic-damage-profile-hydrator.js
```

## Added source family

```text
NH-3 Galaxy of Intrigue nonheroic statblock damage profiles
```

The profile file uses the same canonical runtime fields introduced in NH-2:

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

### Deluge Facility Technician, CL 1, page 219

- Unarmed — `1d4`, kinetic, single-target, unarmed delivery.

### Deluge Facility Guard, CL 3, page 218

- Stun Baton — `1d6+2`, energy, single-target.
- Blaster Pistol — `3d6`, energy, single-target.
- Blaster Pistol with Rapid Shot — `4d6`, energy, single-target variant.
- Blaster Rifle — `3d8`, energy, single-target.
- Blaster Rifle with Rapid Shot — `4d8`, energy, single-target variant.

### Corporate Sector Mine Guard, CL 2, page 216

- Stun Baton — `1d6+2`, energy, single-target.
- Blaster Carbine — `3d8`, energy, single-target.
- Blaster Carbine with autofire — `3d8`, energy, autofire/area variant with half damage on miss and no critical double.

### Corporate Sector Miner, CL 1, page 217

- Club with Power Attack — `1d6+6`, kinetic, single-target.
- Club with Mighty Swing — `2d6+4`, kinetic, single-target variant.

## Hydrator update

`nonheroic-damage-profile-hydrator.js` now loads:

```text
data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json
```

Hydration still requires:

1. `confidence: "verified"`,
2. actor/template slug match, and
3. raw attack-row text match.

Unmatched rows and non-verified rows remain reference-only.

## Source authority notes

The Galaxy of Intrigue rows were added only where the sourcebook text prints the attack row and damage expression directly. Printed attack totals are not copied into item `attackBonus`; they are complete statblock totals and would risk double counting against actor-derived math.

## Non-goals

NH-3 does not:

- parse printed attack totals,
- infer weapon rows from generic equipment names,
- add non-sourcebook-confirmed rows,
- implement token geometry,
- execute riders/effects,
- change damage mitigation,
- change actor packs or source JSON.

## Suggested smoke tests

After NH-2 and NH-3 are both present in a local Foundry checkout:

- Import Deluge Facility Technician and verify the unarmed item is hydrated.
- Import Deluge Facility Guard and verify blaster pistol/rifle rows hydrate with Rapid Shot variants when raw row text includes `with Rapid Shot`.
- Import Corporate Sector Mine Guard and verify blaster carbine autofire variant hydrates as `attackShape: "autofire"` when raw row text includes `with autofire`.
- Import Corporate Sector Miner and verify club rows hydrate without parsing printed attack totals into item `attackBonus`.
