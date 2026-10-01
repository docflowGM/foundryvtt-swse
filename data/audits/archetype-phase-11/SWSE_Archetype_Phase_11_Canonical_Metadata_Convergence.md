# SWSE Archetype Phase 11 — Canonical Metadata Convergence

## Status

Phase 11 closes the Phase 0–11 archetype design/data-mapping roadmap.

This companion report is deterministically generated from the final Phase 11 canonical dataset. It introduces no new archetypes, tags, mappings, or weights.

## Final corpus

- Archetypes: **297**
- Shared canonical semantic tags used: **57**
- Validation errors: **0**
- Final record count: **297**

## Authority order

1. Exact canonical references
2. Primary semantic tags
3. Supporting semantic tags
4. Class-route context
5. Narrative taxonomy, organizational only

Exact mechanics remain authoritative. Semantic metadata helps recognition; it does not replace exact identity.

## Phase 11 rules

- Exact references are authority: **true**
- Tags are semantic signals only: **true**
- Manual per-archetype numeric tag weights: **false**
- Canonical tag style: `lower_snake_case`
- Class routes are separate from semantic tags: **true**
- Tertiary abilities generate semantic tags: **false**
- Organizational taxonomy scores directly: **false**
- Legacy playstyle/tier metadata is compatibility-only: **true**
- Intended repository SSOT: `data/archetypes.json`

## Canonical vocabulary

Exactly **57** shared semantic tags:

- `ability_cha`
- `ability_con`
- `ability_dex`
- `ability_int`
- `ability_str`
- `ability_wis`
- `accuracy`
- `advanced_melee`
- `ally_support`
- `area_damage`
- `climb`
- `control`
- `damage`
- `dark_side`
- `deception`
- `defense`
- `droid`
- `endurance`
- `equipment`
- `fieldcraft`
- `finesse`
- `force`
- `force_power`
- `force_training`
- `gather_information`
- `hacking`
- `healing`
- `heavy_weapon`
- `initiative`
- `jump`
- `knowledge`
- `leadership`
- `lightsaber`
- `lightsaber_form`
- `mechanics`
- `medical`
- `melee`
- `mobility`
- `perception`
- `persuasion`
- `pilot`
- `pistol`
- `ranged`
- `ride`
- `rifle`
- `sniper`
- `social`
- `starship`
- `stealth`
- `support`
- `survivability`
- `survival`
- `swim`
- `tech`
- `use_computer`
- `use_the_force`
- `vehicle`

No archetype-specific replacement tags are introduced.

## Exact-reference totals

- Foundation classes: **587**
- Prestige classes: **542**
- Apex classes: **59**
- Signature skills: **574**
- Supporting skills: **842**
- Signature Talent Trees: **699**
- Supporting Talent Trees: **511**
- Signature Talents: **666**
- Supporting Talents: **478**
- Signature Feats: **468**
- Supporting Feats: **656**
- Signature Force Powers: **198**
- Supporting Force Powers: **186**

## Semantic separation

Archetype relationship strength lives under:

- `metadata.tags.primary`
- `metadata.tags.supporting`
- `metadata.tags.all`

Class-route implications live separately under `metadata.routes`.

Tertiary abilities remain preserved under `mechanics.abilities.tertiary` but do not generate semantic identity tags.

There are no independently authored per-archetype numeric semantic weights. Any future runtime weighting belongs in one centralized scoring policy.

## Runtime target

The final artifact declares `data/archetypes.json` as the intended repository SSOT and identifies `data/class-archetypes.json` as the legacy runtime authority to replace during later integration.

## Source-artifact chain

- `SWSE_Archetype_Narrative_Authority.md`
- `SWSE_Archetype_Phase_0_Mechanical_Extension_Schema.md`
- `SWSE_Archetypes_Phase_1_Classes.json`
- `SWSE_Archetypes_Phase_2_Abilities.json`
- `SWSE_Archetypes_Phase_3_Skills.json`
- `SWSE_Archetypes_Phase_4_Talent_Trees.json`
- `SWSE_Archetypes_Phase_5_Talents.json`
- `SWSE_Archetypes_Phase_6_Feats_v2.json`
- `SWSE_Archetypes_Phase_7_Force_Material.json`
- `SWSE_Archetypes_Phase_8_Species.json`
- `SWSE_Archetypes_Phase_9_Backgrounds.json`
- `SWSE_Archetypes_Phase_10_Mechanical_Identity_Signals.json`
- `SWSE_Archetypes_Phase_11_Canonical_Metadata.json`

## Talent Phase 3H guardrail

Use Phase 11 as the canonical vocabulary and archetype QA authority.

Direction of authority:

`published Talent rule -> canonical Talent meaning -> canonical semantic tags -> archetype/suggestion consumption`

Do not assign a Talent tag merely because an archetype recommends that Talent. Archetype recommendations may be used only as downstream QA evidence after the Talent's own semantic meaning is established from the published rule.
