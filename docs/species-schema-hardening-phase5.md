# Species Schema Hardening Phase 5

## What changed

- Collapsed `Elomite (Variant)` into `Elom.system.variants[]` and removed the duplicate species row.
- Normalized every species row to a six-key `system.abilityMods` map (`str`, `dex`, `con`, `int`, `wis`, `cha`).
- Re-applied canonical ability score adjustments from `data/species-canonical-stats.json` where a canonical species match exists.
- Normalized every species row to a structured `system.movement` object while preserving `system.speed` as a legacy walk-speed mirror.
- Mirrored nested droid species rules to top-level `system.speciesActsAsDroid` for Shard/Replica Droid and any future species-droid profile.
- Treated `canonicalTraits` as the structured trait source of truth and `special` as the legacy/display trait-name summary.
- Expanded the species item template to include schema-backed description, canonical names, movement/trait buckets, bonus feat/skill counters, and a documented variant profile shape.

## Ability modifier SSOT

Species racial modifiers are now present in DB rows as `system.abilityMods` with all six keys. Runtime materialization should apply these into `system.abilities.<ability>.racial`, not `system.attributes`. This keeps species adjustments aligned with the actor data model and derived-stat pipeline.

## Supplemental / needs provenance

The following species still do not have a direct entry in the uploaded canonical text source. They were preserved and shape-normalized, but their stats should be treated as supplemental until a source pass confirms them:

- Aing-Tii
- Anomid
- Anx
- Bardottan
- Besalisk
- Chevin
- Chiss
- Drall
- Dressellian
- Elom
- Gree
- Gundark
- Hapan
- Hiss'sssi
- Jenet
- Kal-Dexar
- Kessurian
- Kiffar
- Koorivar
- Kubaz
- Mandalorian (Human Variant)
- Mirialan
- Mustafarian
- Muun
- Near-Human
- Nerf (Uplifted)
- Ortolan
- Quermian
- Sith (Pureblood)
- Theelin
- Vaathkree

## Follow-up seams

- Remove remaining direct readers of legacy `system.attributes.<ability>.racial` in chargen/import code where possible.
- Continue moving UI/details to `canonicalTraits` first and `special` only as a fallback.
- Consider adding source/provenance fields for the supplemental species above.
