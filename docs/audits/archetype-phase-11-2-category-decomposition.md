# Phase 11-2B3 — `category_*` decomposition

Status: **OWNER_DESIGN_PASS**. No production mutation.

All 14 legacy `category_*` labels are removed from the intended ontology. None is a final semantic/mechanical tag. Each remains useful as evidence for the mechanics it was trying to bundle.

| Category | Decompose toward |
|---|---|
| `category_force_adept` | `force`, `use_the_force`, `force_training`, `force_capacity` |
| `category_sith_apprentice` | `force`, `dark_side`, `force_offense`, `force_training` |
| `category_imperial_knight` | `force`, `lightsaber`, `defense`, `armor`, `leadership`, `ally_support` |
| `category_improviser` | `tech`, `crafting`, `jury_rig`, `mechanics`, `equipment` |
| `category_pathfinder` | `exploration`, `survival`, `recon`, `mobility`, `cover`, `perception` |
| `category_shaper` | `biotech`, `crafting`, `healing`, `ability_enhancement`, `implant`, `equipment` |
| `category_assassin` | `stealth`, `precision_damage`, `ambush`, `pursuit`, `targeting` |
| `category_medic` | `healing`, `medical`, `treat_injury`, `support`, `teamwork`, `survivability` |
| `category_outlaw` | `mobility`, `reaction`, `survivability`, `pursuit`, `action_economy` |
| `category_vanguard` | `cover`, `ranged`, `support`, `recon`, `targeting`, `teamwork`, `defense` |
| `category_corporate_agent` | `social`, `deception`, `persuasion`, `leadership`, `control` |
| `category_enforcer` | `control`, `nonlethal`, `pursuit`, `ranged`, `vehicle`, `pilot` |
| `category_independent_droid` | `droid`, `durability`, `self_repair`, `tech`, `mechanics` |
| `category_charlatan` | `deception`, `social`, `control`, `stealth`, `action_economy` |

These are **not** automatic replacement maps. A Talent receives only the concepts its canonical rule actually supports.
