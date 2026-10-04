# Archetype Phase 12B — Scout Semantic Curation, Tranche 1

**Status:** PARTIAL CURATION COMPLETE  
**Base:** Phase 12A runtime SSOT at `ef7c9685ace3f53c8288909cfa24022a96ae351a`  
**Ontology:** frozen 190-tag Talent/Feat semantic ontology  
**Scope:** first 10 parent archetypes whose first foundation route is Scout  
**Production SSOT changed:** no  
**Live scorer changed:** no

## Why this phase exists

Phase 12A produced a structurally valid 297-record archetype SSOT, but after removal of the obsolete Phase-11 vocabulary the archetypes retained only a relatively small 42-tag shared profile. Before shadow scoring begins, the archetypes need deliberate semantic curation against the frozen 190-tag ontology.

Phase 12B therefore curates archetype identity tags manually in reviewable tranches.

Class is only a batching aid. Scout does **not** own these identities.

## Curation policy

- **Primary tags** are defining identity signals. A strong match to the archetype should normally express several of them.
- **Supporting tags** are strongly characteristic secondary signals.
- Exact canonical identity remains stronger than tag inference.
- Class routes do not automatically contribute semantic tags.
- Recommended Talent/Feat tags are evidence, not an automatic union.
- Narrative authority and curated Phase 0–11 mechanics are both considered.
- No numeric weights are authored here.
- Only tags in the frozen 190-tag ontology are legal.
- Optional Force access does not automatically make `force`, `force_power`, or `force_training` archetype tags.

## Tranche 1

| Archetype | Primary tags | Supporting tags |
|---|---|---|
| **Fringer** | `exploration`, `perception`, `survival`, `survivability`, `resilience` | `endurance`, `mechanics`, `repair`, `jury_rig`, `mobility`, `pilot`, `tech`, `vehicle` |
| **Scavenger** | `mechanics`, `equipment`, `crafting`, `modification`, `tech` | `jury_rig`, `perception`, `repair`, `survival`, `use_computer`, `knowledge`, `survivability` |
| **Bounty Hunter** | `tracking`, `pursuit`, `investigation`, `perception`, `survival` | `gather_information`, `use_computer`, `ranged`, `precision`, `targeting`, `stealth`, `initiative` |
| **Sector Ranger** | `investigation`, `pursuit`, `perception`, `survival` | `tracking`, `pilot`, `vehicle`, `initiative`, `knowledge`, `control`, `targeting` |
| **Frontier Marshal** | `leadership`, `persuasion`, `perception`, `support`, `ally_support` | `investigation`, `gather_information`, `survival`, `initiative`, `tactics`, `teamwork`, `control`, `social` |
| **Force Hunter** | `anti-force`, `tracking`, `perception`, `survival`, `targeting` | `pursuit`, `investigation`, `stealth`, `ranged`, `precision`, `knowledge`, `resilience`, `force_defense` |
| **Sniper** | `sniper`, `precision`, `ranged`, `perception`, `stealth` | `targeting`, `setup`, `ambush`, `initiative`, `survival`, `concealment`, `critical_hit` |
| **Saboteur** | `mechanics`, `stealth`, `tech`, `infiltration`, `trap`, `crafting` | `use_computer`, `equipment`, `control`, `burst_damage`, `setup`, `reliability`, `perception`, `defense` |
| **Partisan** | `stealth`, `survival`, `ambush`, `infiltration`, `control` | `deception`, `perception`, `initiative`, `social`, `persuasion`, `support`, `teamwork`, `evasion`, `battlefield_control` |
| **Pilot** | `pilot`, `vehicle`, `space`, `pursuit`, `mobility` | `evasion`, `initiative`, `mechanics`, `perception`, `tactics`, `teamwork`, `movement`, `support` |

## Important adjudications

### Force Hunter

This tranche corrects a meaningful Phase-11 semantic problem.

The archetype's Force access is **optional**, and the narrative identity explicitly allows mundane Force-user hunters. Therefore these are not defining archetype tags:

- `force`
- `force_power`
- `force_training`

The defining Force relationship is instead:

- `anti-force`

with supporting:

- `force_defense`
- `resilience`

This preserves the distinction between **using the Force** and **specializing in fighting Force-users**.

### Bounty Hunter

The parent identity is intentionally not locked to pistols or one combat style. The new profile centers on finding and pursuing quarry:

- tracking
- pursuit
- investigation
- perception
- survival

Ranged precision remains supporting rather than defining.

### Sniper

The old profile overemphasized weapon-category tags and underrepresented the actual sniper method. The new profile centers:

- sniper
- precision
- ranged
- perception
- stealth

with setup, targeting, ambush and concealment as supporting evidence.

### Saboteur

The curated Skilled Demolitionist authority directly supports:

- `trap`
- `burst_damage`
- `reliability`
- `equipment`
- `crafting`
- `setup`
- `mechanics`

These are now reflected in the archetype instead of leaving Saboteur as only generic tech/stealth.

### Pilot

`space`, `pursuit`, and `mobility` distinguish a Pilot from someone who merely possesses vehicle-related mechanics. Wingman and Squadron material justify `teamwork`, `tactics`, and `support` as supporting signals.

## Validation

Tranche 1:

- 10 / 10 records curated
- all assigned tags exist in the frozen 190-tag ontology
- 0 primary/supporting collisions
- no new vocabulary created
- no class-route tag inheritance
- no numeric tag weights
- no runtime scoring changes
- production `data/archetypes.json` not mutated yet

The machine-readable curation authority is:

`data/audits/archetype-phase-12b-scout-tranche-1.json`

## Next Scout tranche

There are 25 Scout-first parent archetypes total.

After this first 10, the remaining 15 are:

- Astrogator
- Racer
- Disaster Responder
- Explorer
- Pathfinder
- Survivalist
- Search-and-Rescue Specialist
- First-Contact Specialist
- Galactic Archaeologist
- Prospector
- Naturalist
- Colony Pioneer
- Beast Hunter
- Beast Handler
- Beast Rider

After the Scout-first parents are curated, specialized expressions can be reviewed against their parent without automatic inheritance.
