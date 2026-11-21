# Phase 11-2B1 — alias normalization decisions, set 1

Status: **OWNER_DESIGN_PASS**. No production mutation.

Canonical spelling style: `lower_snake_case`.

Important distinction: normalizing two spellings does **not** certify every historical assignment of that concept. Assignment cleanup is a later pass.

| Legacy | Canonical | Decision | Rationale |
|---|---|---|---|
| `action-economy` | `action_economy` | **KEEP** | Same mechanic; canonical lower_snake_case. 169+136 historical uses. |
| `light-side` | `light_side` | **KEEP** | Same semantic concept; canonical lower_snake_case. |
| `force-offense` | `force_offense` | **KEEP** | Same mechanical/semantic concept; canonical lower_snake_case. |
| `damage-reduction` | `damage_reduction` | **KEEP** | Same defensive mechanic; canonical lower_snake_case. |
| `force-control` | `force_control` | **KEEP** | Same Force-control concept; canonical lower_snake_case. |
| `condition-removal` | `condition_removal` | **KEEP** | Same recovery/condition mechanic; canonical lower_snake_case. |
| `force-defense` | `force_defense` | **KEEP** | Same Force-defense concept; canonical lower_snake_case. |
| `burst-damage` | `burst_damage` | **KEEP** | Same damage-profile concept; canonical lower_snake_case. |
| `dual-wield` | `dual_wield` | **KEEP** | Reusable weapon-style mechanic. Historical assignments are noisy, but the concept is valid; assignment cleanup is separate. |
| `precision-damage` | `precision_damage` | **KEEP** | Same precision-damage concept; canonical lower_snake_case. |
| `use-computer` | `use_computer` | **KEEP** | Canonical Phase 11 vocabulary term; normalize legacy hyphenated spelling. |
| `self-repair` | `self_repair` | **KEEP** | Same repair mechanic; canonical lower_snake_case. |
| `use-the-force` | `use_the_force` | **KEEP** | Canonical Phase 11 vocabulary term; normalize legacy hyphenated spelling. |
| `ally-support` | `ally_support` | **KEEP** | Canonical Phase 11 vocabulary term; normalize legacy hyphenated spelling. |
| `critical-success` | `critical_success` | **KEEP** | Broad mechanical concept distinct from critical_hit; after alias consolidation it is not a singleton. |
| `force-item` | `force_item` | **RECONSIDER** | Spelling is clearly equivalent, but current assignments are semantically inconsistent; normalize only for review, not ontology approval. |
| `swift-action` | `swift_action` | **KEEP** | Same action-economy concept; canonical lower_snake_case. |

## Result

- **16** aliases normalize into approved reusable concepts.
- **1** alias pair, `force-item` / `force_item`, is recognized as the same spelling concept but remains **RECONSIDER** because the current Talent assignments do not consistently support the meaning.
- `dual_wield` is promoted to **KEEP** as a concept. Its current historical assignment noise does not invalidate the concept itself.
- `critical_success` is promoted to **KEEP** as a broad mechanical concept distinct from `critical_hit`.

No Talent or Archetype records are changed by this artifact.
