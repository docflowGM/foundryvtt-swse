# NH-4 Unknown Regions Droid Damage Profiles

## Purpose

NH-4 continues the nonheroic statblock damage profile pass by adding sourcebook-backed *The Unknown Regions* droid rows using the canonical NH-2 profile schema.

The initial batch is intentionally small and source-strict. It includes only rows where the source text clearly prints the attack and damage expression.

## Files changed

```text
data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json
scripts/engine/import/nonheroic-damage-profile-hydrator.js
```

## Added source family

```text
NH-4 Unknown Regions droid statblock damage profiles
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

The Wanderer Scout Surveyor Droid source text prints:

- `Melee claw +2 (1d4)`
- `Ranged stun blaster +3 (3d6 stun)`
- action text for `Stun Blast`, specifying a ranged attack at +3 that deals `3d6` stun damage on a successful hit.

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
- Verify printed attack totals are not inserted into `item.system.attackBonus`.
