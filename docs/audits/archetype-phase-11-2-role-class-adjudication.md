# Phase 11-2B2 — role/class legacy tag adjudication

Status: **OWNER_DESIGN_PASS**. No production mutation.

## Decision rule

Keep only a label that describes a reusable semantic or mechanical concept **independent of a class, faction, tree, or archetype name**.

Legacy class/archetype labels are not preserved merely because many Talents carry them. The current census shows these were heavily over-applied (for example, `striker` on 491 Talents).

| Tag | Decision | Canonical / decomposition | Rationale |
|---|---|---|---|
| `striker` | **DELETE** | `damage`, `mobility`, `precision`, `single_target` | Legacy scoring role is too broad and over-applied to 491 Talents. Re-derive actual offensive mechanics from rules instead of preserving a role label. |
| `positioning` | **KEEP** | `positioning` | Reusable mechanical concept: movement, placement, adjacency, range-band, or battlefield-location manipulation. Independent of class/archetype identity. |
| `controller` | **NORMALIZE** | `control` | Role noun duplicates the existing reusable semantic/mechanical concept `control`. Historical assignments must still be revalidated; do not bulk-map blindly. |
| `defender` | **NORMALIZE** | `defense` | Role noun duplicates the broader reusable `defense` concept. Historical assignments require revalidation. |
| `skills` | **KEEP** | `skills` | Useful broad mechanical-domain tag for options whose identity is skill use, skill checks, skill access, or broad skill enhancement. |
| `jedi` | **DELETE** | `force`, `lightsaber`, `use_the_force`, `light_side` | Class/order identity belongs in route/narrative data. Mechanical meaning should be expressed by actual Force/lightsaber/etc. concepts. |
| `scout` | **DELETE** | `fieldcraft`, `survival`, `perception`, `mobility`, `recon` | Class label, not a mechanic. Re-express through actual fieldcraft/exploration mechanics. |
| `scoundrel` | **DELETE** | `social`, `deception`, `tech`, `mobility`, `ranged` | Class label is too broad. Mechanical identity varies and should be derived from the rule. |
| `soldier` | **DELETE** | `melee`, `ranged`, `armor`, `damage`, `defense` | Class label is not reusable mechanics; actual combat expression should carry the signal. |
| `leader` | **NORMALIZE** | `leadership` | Role noun maps cleanly to existing Phase 11 semantic concept `leadership`; individual Talent assignments still require evidence. |
| `noble` | **DELETE** | `social`, `leadership`, `support`, `persuasion`, `intrigue` | Class label, not mechanics. Preserve actual social/leadership mechanics instead. |
| `mystic` | **DELETE** | `force`, `use_the_force`, `force_training`, `telepathy`, `precognition` | Narrative/archetype identity rather than a discrete mechanic. Specific Force domains are more descriptive. |
| `hunter` | **DELETE** | `pursuit`, `tracking`, `targeting`, `perception`, `survival` | Broad role label. The useful mechanical identity is pursuit/tracking/target acquisition. |
| `bounty-hunter` | **DELETE** | `pursuit`, `targeting`, `tracking`, `fear`, `ranged` | Prestige/class-archetype label. Decompose into actual hunting/combat mechanics. |
| `duelist` | **DELETE** | `melee`, `reaction`, `melee_defense`, `mobility`, `precision` | Archetype/role label. Mechanical style is better represented by its component mechanics. |
| `opportunist` | **DELETE** | `reaction`, `ambush`, `precision`, `counterattack`, `positioning` | Role label is ambiguous. Actual trigger/reactive mechanics should be tagged directly. |
| `imperial` | **DELETE** | narrative/affiliation only | Faction/organization identity belongs in narrative/affiliation taxonomy, not shared mechanical ontology. |
| `force-hunter` | **DELETE** | `anti_force`, `pursuit`, `targeting`, `reaction` | Compound archetype label. The reusable mechanics are anti-Force interaction and pursuit/targeting. |
| `outlaw` | **DELETE** | `mobility`, `reaction`, `survivability`, `pursuit` | Archetype/tree label, not a reusable mechanic. Preserve actual play pattern instead. |
| `force-adept` | **DELETE** | `force`, `use_the_force`, `force_training` | Class/archetype identity belongs in route data; mechanics are represented by Force-domain concepts. |
| `inquisitor` | **DELETE** | `force`, `anti_force`, `intimidation`, `persuasion`, `targeting` | Archetype/organization identity; decompose to actual Force/hunting/social mechanics. |
| `veteran` | **DELETE** | `survivability`, `awareness`, `defense`, `action_economy` | Narrative experience label with no stable mechanical meaning; use the actual mechanics. |

## Totals

- KEEP: 2
- NORMALIZE: 3
- DELETE: 17

## Important

The decomposition columns are **guidance for later re-tagging**, not a mechanical replacement map. A Talent formerly tagged `soldier` does not automatically receive every listed combat tag. Its final tags must come from its own rule text.

Likewise, `controller → control`, `defender → defense`, and `leader → leadership` identify canonical concepts, but historical assignments still require source-supported validation.
