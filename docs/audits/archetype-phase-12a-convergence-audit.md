# Archetype Phase 12A Convergence Audit

**Repository:** `docflowGM/foundryvtt-swse`  
**Repository authority checked:** `main` at `a58f8c4fca20ba693804b61b0c9efc56800d1091`  
**Archetype input:** `archetypes_transport.json` — 297 class-independent records  
**Feat/Talent semantic authority:** Phase 3 final frozen ontology — 190 tags  
**Status:** `CONVERGENCE_AUDIT_COMPLETE_WITH_REQUIRED_NORMALIZATION`

## Executive result

The expensive archetype design work does **not** need to be rebuilt.

The 297-record Phase 11 archetype artifact is structurally sound and its exact mechanical references are overwhelmingly compatible with the current repository. The major seam is semantic-vocabulary drift: Phase 11 authored 57 archetype tags before the final Phase 3 ontology froze at 190 tags.

Of the 57 Phase 11 archetype tags:

- 42 are members of the final 190-tag ontology.
- 15 are not members of the final ontology.
- Removing those 15 from the runtime semantic-tag lane leaves all 297 archetypes with at least one canonical primary tag.
- No new Phase 3 tags are required merely to preserve the Phase 11 archetype design.

Do **not** reopen Phase 3 solely to preserve the 15 legacy archetype tags.

## Authority order

The runtime migration must preserve:

1. exact canonical reference
2. canonical primary semantic tags
3. canonical supporting semantic tags
4. class-route context
5. narrative taxonomy

Legality is separate from identity. Narrative parentage does not imply semantic inheritance.

## Vocabulary convergence

### Shared tags

42 of the Phase 11 tags already exist in the final Phase 3 ontology and can remain in `metadata.tags`.

### Phase-11-only tags

The following 15 strings must not remain in the canonical runtime semantic-tag lane:

| Legacy tag | Disposition | Reason |
|---|---|---|
| `ability_cha` | remove from semantic tags; preserve typed ability priority | `mechanics.abilities` already carries exact primary/secondary/tertiary evidence |
| `ability_con` | same | typed ability evidence is authoritative |
| `ability_dex` | same | typed ability evidence is authoritative |
| `ability_int` | same | typed ability evidence is authoritative |
| `ability_str` | same | typed ability evidence is authoritative |
| `ability_wis` | same | typed ability evidence is authoritative |
| `accuracy` | remove; no blind alias | no exact one-to-one Phase 3 concept; exact feat/talent refs retain the evidence |
| `advanced_melee` | remove; preserve exact scoped feat/equipment evidence | weapon-group shorthand is not a Phase 3 semantic tag |
| `area_damage` | remove; no blind alias | not equivalent to `damage`, `burst_damage`, or `battlefield_control` in all cases |
| `fieldcraft` | remove; preserve exact skills/content refs | broad archetype umbrella; not mechanically equivalent to `survival`, `recon`, `tracking`, etc. |
| `finesse` | remove; no blind alias | no exact canonical equivalent |
| `hacking` | remove; no blind alias | may mean `slicing`, `use_computer`, or broader tech depending on the mechanic |
| `lightsaber_form` | remove; preserve exact form-power/talent refs | form identity is already represented by exact Force/talent references |
| `rifle` | remove; preserve exact scoped feat/equipment evidence | final ontology does not define a rifle tag; do not infer from `ranged` |
| `starship` | remove; preserve exact route/equipment evidence | not exactly equivalent to `space`, `vehicle`, or `pilot` |

This is intentionally a **deletion from the semantic lane, not a semantic remap**. Broad legacy concepts must not be mechanically mapped to narrower canonical concepts without rules evidence.

### Impact of pruning

- 297 / 297 archetypes retain at least one canonical primary tag.
- 0 archetypes become semantically empty.
- Average remaining canonical tags per archetype: ~3.86 primary and ~4.15 supporting.

## Exact-reference compatibility

Validated against current `main` authorities:

| Reference domain | Artifact unique refs | Result |
|---|---:|---|
| Foundation classes | 5 | 5 / 5 resolve |
| Prestige/apex classes | 32 | 32 / 32 resolve |
| Skills | 25 | 25 / 25 resolve |
| Talent trees | 126 | 126 / 126 resolve |
| Individual talents | 292 | 292 / 292 resolve |
| Feats | 66 | 66 / 66 resolve |
| Species | 58 | 58 / 58 resolve |
| Background route refs | 80 | 80 / 80 resolve |
| Force-power refs | 63 | 51 resolve directly; 12 form-power IDs require deterministic correction |

Talent validation used the certified Phase 3B canonical identity manifests as the exact identity layer. Feat validation used the 353-record Phase 1A canonical identity authority. Class/species/background checks used the current packs/registries on `main`.

### Lightsaber Form Power ID correction

The Phase 11 artifact uses a synthetic prefix for 12 form powers, but `ForceRegistry` deliberately indexes form powers by the normalized power-name slug loaded from `data/lightsaber-form-powers.json`.

Correct these exact refs:

- `lightsaber-form-power-assured-strike` -> `assured-strike`
- `lightsaber-form-power-barrier-of-blades` -> `barrier-of-blades`
- `lightsaber-form-power-circle-of-shelter` -> `circle-of-shelter`
- `lightsaber-form-power-deflecting-slash` -> `deflecting-slash`
- `lightsaber-form-power-draw-closer` -> `draw-closer`
- `lightsaber-form-power-falling-avalanche` -> `falling-avalanche`
- `lightsaber-form-power-fluid-riposte` -> `fluid-riposte`
- `lightsaber-form-power-hawk-bat-swoop` -> `hawk-bat-swoop`
- `lightsaber-form-power-pass-the-blade` -> `pass-the-blade`
- `lightsaber-form-power-saber-swarm` -> `saber-swarm`
- `lightsaber-form-power-shien-deflection` -> `shien-deflection`
- `lightsaber-form-power-vornskr-s-ferocity` -> `vornskrs-ferocity`

The last spelling follows the existing `ForceRegistry` apostrophe-removal normalizer.

## Existing runtime systems that remain legacy-live

`data/class-archetypes.json` is still a live runtime dependency and cannot simply be deleted.

Direct consumers include:

- `scripts/engine/archetype/archetype-registry.js`
- `scripts/engine/suggestion/ArchetypeDefinitions.js`
- `scripts/engine/suggestion/ArchetypeAffinityEngine.js`
- `scripts/mentor/mentor-adapter.js`
- `scripts/mentor/mentor-archetype-paths.js`
- prestige/identity integration paths

Old numeric bias fields are also still live:

- `mechanicalBias`
- `roleBias`
- `attributeBias`
- `tagBias`

They are consumed by `SuggestionScorer`, `tag-signal-engine`, `identity-engine`, mentor logic, and related compatibility paths.

Disposition: **TRANSITIONAL_RUNTIME_DEPENDENCY**. Do not delete until the new SSOT has a compatibility adapter and shadow comparison proving consumers can move safely.

`data/metadata-assignments.json`, referenced in older planning, is not present on current `main` and has no current repository consumer found by search.

## Underlying authority defect to fix before live archetype scoring

`scripts/engine/progression/data/progression-data.js` still gives Jedi this stale class-skill list:

`Acrobatics, Climb, Endurance, Initiative, Jump, Knowledge (Galactic Lore), Perception, Persuasion, Pilot, Stealth, Swim, Use the Force`

This conflicts with the canonical class-skill authority used during Phase 9 and is especially dangerous for Jedi Shadow route-cost analysis because it makes Stealth look natively available.

Do not let the new archetype detector consume this stale list as class legality/cost authority.

## Minimal safe Phase 12A runtime migration

Phase 12A should establish the new SSOT and compatibility boundary **without changing live recommendation outcomes yet**.

1. Promote a normalized copy of the 297-record artifact to `data/archetypes.json`.
   - prune the 15 noncanonical semantic tags;
   - prune matching stale entries from `metadata.tagProvenance`;
   - repair the 12 Lightsaber Form Power refs;
   - preserve all typed mechanics, narrative taxonomy, routes, exact feat/talent refs, species/background data, and audit states.

2. Add/update schema validation for the 297-record class-independent model.
   - 297 records exactly;
   - stable ID uniqueness;
   - specialization parent integrity;
   - semantic tags must be members of the frozen 190 vocabulary;
   - no primary/supporting collision;
   - class/skill/species/background references resolve;
   - canonical exact references resolve without fuzzy matching.

3. Evolve `ArchetypeRegistry` behind a compatibility boundary.
   - new direct class-independent lookup by archetype ID;
   - new filtering by foundation/prestige/apex route;
   - retain old class-owned API shape temporarily for legacy consumers;
   - do not fabricate numeric biases for new records.

4. Add exact-reference resolvers/validators before scoring.
   - feats;
   - talents/tree identities;
   - Force powers and form powers;
   - species;
   - class routes.

5. Add a shadow detector/audit path.
   - compute new archetype evidence in parallel;
   - do not change SuggestionEngine ranking yet;
   - record old vs new primary archetype, confidence, and reasons;
   - deterministic repeated runs must match.

6. Fix the stale base-class skill authority before route-cost scoring is allowed to influence recommendations.

7. Only after shadow gates pass:
   - migrate `BuildIntent` to the new primary archetype identity;
   - migrate `SuggestionScorer` from embedded legacy numeric archetype biases to centralized exact/categorical scoring policy;
   - migrate mentor/UI explanation consumers;
   - retire legacy semantic authority one dependency at a time.

## Phase 12A acceptance gates

- [ ] `data/archetypes.json` contains exactly 297 records.
- [ ] 97 parents / 200 specializations.
- [ ] Every specialization has exactly one valid parent.
- [ ] All semantic tags belong to the frozen Phase 3 ontology.
- [ ] No legacy Phase 11-only tag is present in canonical runtime tags.
- [ ] All 12 form-power references use `ForceRegistry` exact IDs.
- [ ] Class, skill, feat, talent-tree, talent, Force, species, and background refs resolve.
- [ ] Canonical record resolution uses exact IDs/identity keys, not fuzzy name matching.
- [ ] Legacy `class-archetypes.json` remains available until its live consumers are migrated.
- [ ] No new scorer changes production recommendation order yet.
- [ ] Shadow output is deterministic.
- [ ] Existing unrelated progression tests remain green.

## Audit disposition

**Phase 12A may proceed after applying the deterministic normalization above.**

No Phase 3 ontology change is required. No archetype narrative redesign is required. The correct next implementation step is a new runtime SSOT plus compatibility/shadow infrastructure, not a rewrite of the Suggestion Engine.