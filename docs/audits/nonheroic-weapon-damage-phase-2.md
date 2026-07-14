# NH-2 NPC Importer Damage Profile Hydration

## Purpose

NH-2 wires the NH-1 statblock weapon/action profile seed data into the NPC template importer without rewriting compendium packs.

This phase is intentionally conservative:

- matched statblock attack rows are hydrated with damage/profile metadata,
- unmatched rows remain the same reference-only weapon items the importer already created,
- no pack data is mutated,
- no generic item base-damage inference is introduced.

## Files changed

```text
scripts/engine/import/nonheroic-damage-profile-hydrator.js
scripts/engine/import/npc-template-importer-engine.js
data/nonheroic/nonheroic-weapon-damage-profiles.schema.json
data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json
```

## Canonical profile parity

The nonheroic profile schema is not a second runtime damage model.

It is a source-attribution wrapper around the same canonical damage profile axes used by `data/combat/damage-profiles.schema.json` and the v2 packet builder:

```text
source / actor / match / weapon attribution
+ delivery
+ attackShape
+ scale
+ primaryType
+ tags
+ attack
+ area
+ components
+ riders
+ sourceRefs
+ confidence
```

That means later importer, packet, audit, and migration code can read the canonical fields directly instead of translating from a separate `resolution` shape.

## Hydrator behavior

The hydrator loads known nonheroic statblock profile files:

```text
data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json
```

For each imported weapon row, it requires both:

1. actor/template identity match via `match.actorSlugs`, and
2. raw attack-row text match via `match.rawIncludes`.

It also gates runtime hydration on canonical wireability confidence. In the v2 record shape, only `confidence: "verified"` rows hydrate imports. Rows marked `manualRequired`, including source-text-only rows that still need page confirmation, stay reference-only.

This prevents common text such as `blaster cannon`, `grenade launcher`, or `unarmed` from hydrating the wrong actor, and prevents unverified source rows from silently driving runtime metadata.

## Metadata applied to matched weapon rows

When a profile matches, the imported weapon item receives:

- `system.damage`
- `system.damageFormula`
- `system.damageType`
- `system.damageTypes`
- `system.primaryType`
- `system.delivery`
- `system.attackShape`
- `system.scale`
- `system.attack`
- `system.area`
- `system.components`
- `system.riders`
- `system.tags`
- `system.damageProfileSlug`
- `system.damageProfileBaseSlug`
- `system.statblockAttackName`
- `system.statblockAttackKind`
- `system.statblockSourceBook`
- `system.statblockSourceStatus`
- `system.statblockHydrated`
- `system.statblockHydrationConfidence`

It also records profile provenance under:

```text
flags.swse.import.damageProfile
flags.swse.damageProfile
```

## Importer behavior changed

`NPCTemplateImporterEngine._parseWeapons()` is now async and calls `hydrateImportedStatblockWeapon()` for each melee/ranged weapon row.

`_addItemsToActor()` passes actor/template/statblock context into the parser so profile matching can use the original statblock name even if the player custom-renames the imported actor.

## Boundaries

NH-2 does **not**:

- rewrite compendium actors,
- change heroic or nonheroic source JSON,
- infer formulas for unmatched rows,
- parse attack bonuses into item attack bonuses,
- parse gear rows as attacks,
- implement token geometry,
- implement poison or rider execution,
- alter the damage mitigation pipeline.

## Why attack bonuses are not parsed here

Statblock attack bonuses are complete printed attack totals. Item `attackBonus` in the sheet/runtime can be interpreted as an item modifier on top of actor BAB/ability/proficiency math, so copying printed attack totals into that field risks double counting.

NH-2 therefore hydrates damage/profile metadata only. A future statblock-roll mode can decide how to represent printed attack totals without mixing them with regular character weapon math.

## Suggested smoke tests

In Foundry, import a matching profile-backed droid/statblock and inspect the embedded weapon item:

- matched verified rows should have `system.statblockHydrated === true`,
- matched verified rows should have `system.damage` and `system.damageType`,
- area rows should carry `system.attack` and `system.area`,
- rider rows should carry `system.riders`,
- unmatched rows should still be plain reference-only items,
- matched but non-verified/manualRequired rows should also remain reference-only.

Recommended examples once present in the import source:

- KM1 Mining Droid — Unarmed / Laser Cutter,
- Viper-Series Probe Droid — Pacify Hostile / Self-Destruct,
- Colicoid T4 Turret Droid — Blaster Cannon / Grenade Launcher / Cutting Laser,
- 11-17-Series Mining Droid — Heavy Plasma Jet should remain manual/reference-only until source page verification is recovered.

## Next phase recommendation

NH-3 should run the source-attribution audit and generated importer output against a real Foundry/local checkout, then use the resulting worklist to add the next book-specific profile dataset. Good candidates:

1. *Galaxy of Intrigue* statblock weapon rows, or
2. *Threats of the Galaxy* nonheroic/creature rows, or
3. *Unknown Regions* beasts and mounts if natural attack normalization is the priority.
