# NH-1 Scum and Villainy / Droid-Heavy Damage Profile Pass

## Purpose

NH-1 starts the first source-backed correction batch after NH-0. It does **not** rewrite compendium actor packs yet. Instead, it creates the first statblock weapon/action profile dataset that later importer and pack-migration work can consume.

This keeps the project aligned with the damage architecture rule:

- one packet shape,
- source-specific builders/profiles,
- one mitigation pipeline,
- no parallel damage paths.

## Why this phase is profile-first

The NH-0 audit found that imported statblock weapons are currently reference-only items: the raw attack text is preserved, but parsed damage, damage type, attack-shape, area, and rider metadata are not populated. Correcting packs before a profile layer exists would make later review difficult and would risk hardcoding one-off fixes directly into actor data.

NH-1 therefore adds source-backed profile seed data first.

## Added data

```text
 data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json
```

The file stores statblock attack rows, not generic equipment definitions. Each profile records:

- actor name,
- attack name,
- source book/source status,
- match hints for actor/raw statblock text,
- damage formula,
- damage type(s),
- delivery,
- attack shape,
- scale,
- tags,
- area metadata where applicable,
- riders where applicable,
- confidence/review state.

## Added validator

```bash
node tools/validate-nonheroic-damage-profiles.mjs
```

The validator checks:

- required profile fields,
- normalized unique slugs,
- valid delivery/attackShape/scale values,
- valid damage types,
- roll-like damage formulas,
- area metadata for area attacks,
- confidence/review consistency.

## Seeded profile coverage

### 11-17-Series Mining Droid — Heavy Plasma Jet

The repository JSON source labels this as *Scum and Villainy* and includes source text stating that the Heavy Plasma Jet:

- fires a blast four squares long by two squares wide,
- deals `3d10` damage,
- moves the target `-2` steps on the Condition Track on a hit,
- deals half damage on a miss,
- does not move the target along the Condition Track on a miss.

This is entered as `sourceTextVerified` with `reviewRequired: true`, because the exact printed page still needs confirmation. The damage/rider shape is clear enough to preserve as a candidate statblock profile, but it should not be treated as final page-verified sourcebook data yet.

### Scavenger's Guide to Droids droid statblocks

The uploaded droid sourcebook provides directly comparable droid statblock patterns. NH-1 seeds verified examples so the later importer/migration can support the common droid cases:

- KM1 Mining Droid
  - unarmed `1d4+7`, kinetic/unarmed delivery,
  - laser cutter `3d8`, energy weapon delivery.
- Viper-Series Probe Droid
  - Pacify Hostile `3d6`, energy single-target weapon,
  - Self-Destruct `4d6`, self-origin burst with self-destroy rider.
- Colicoid T4 Turret Droid
  - blaster cannon `3d12`, energy,
  - Rapid Shot variant `4d12`, energy,
  - grenade launcher `5d6`, burst/area,
  - cutting laser `3d10`, energy + fire, area/line, ignores DR rider.

These profiles cover the patterns that caused the nonheroic damage schema problem in the first place: droid integrated weapons, area attacks, self-destruct attacks, splash/burst/line attacks, and riders that should not be folded into base HP damage.

## Correction policy reinforced by NH-1

1. **Statblock attack row wins.** These profiles represent printed/statblock attack rows, not generic item base damage.
2. **One attack row becomes one profile.** Rapid Shot/autofire/area/special rows are separate profiles or variants.
3. **Riders stay separate.** Condition-track movement, self-destruction, and DR bypass are riders/tags, not extra base damage.
4. **Area attacks carry area metadata.** Burst, line, and contiguous-square attacks are not just damage formulas.
5. **Review state matters.** Sourcebook-verified rows and repository-source-text rows are differentiated.

## Non-goals

- No pack rewrite in NH-1.
- No actor migration.
- No runtime importer wiring yet.
- No heroic NPC corrections.
- No vehicle/starship weapon corrections.
- No poison implementation.
- No token geometry.

## Next phase recommendation

NH-2 should wire these profiles into the NPC template importer in a safe way:

- parse statblock attack rows,
- match against profile data,
- hydrate imported reference weapons/actions with damage formula, damage type, delivery, attackShape, area, tags, and riders,
- keep unmatched rows reference-only/manual,
- do not mutate compendium packs yet.

After importer hydration is working, a later pack rewrite can apply the same profiles to existing compendium actors.
