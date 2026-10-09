# Phase 5C — Feat/Weapon Data Authority Classification

Every feat/weapon data file under `data/` and `packs/` is classified exactly once. `tools/verify-canonical-production.mjs` fails on any unclassified or re-classified file.

| Class | Files |
|---|---|
| CANONICAL_SSOT | 3 |
| GENERATED_PRODUCTION | 15 |
| GENERATED_RUNTIME_INDEX | 1 |
| GENERATED_COMPATIBILITY | 3 |
| MIGRATION_ALIAS_ONLY | 2 |
| HISTORICAL_AUDIT_EVIDENCE | 234 |
| DEAD_REMOVE | 0 |
| OTHER_DOMAIN_DATA | 11 |
| REFERENCE_BEARING_DOMAIN_DATA | 14 |

Dependency direction: audits (evidence) → canonical corpus → deterministic generators → Foundry packs, runtime registries, compatibility outputs. Nothing flows back.

The seven authority-role classes describe feat/weapon authority. Two further classes cover files OUTSIDE that ownership boundary (approved by the planner with guardrails):

* **OTHER_DOMAIN_DATA: a file owned by another domain that neither defines nor projects feat/weapon canonical authority.**
* **REFERENCE_BEARING_DOMAIN_DATA: an operational file owned by another domain that legitimately contains references to canonical feats/weapons (class feat lists, actor/NPC packs, archetypes, vehicle/domain records).**

Guardrail (enforced by `tools/verify-canonical-production.mjs`): neither class may be used for a file that defines canonical feat/weapon identity, rules or mechanics, overrides canonical identity, keeps another feat/weapon description/stat copy as truth, or exempts a parallel authority from the Phase 5C gate. A file that does so must be classified under a canonical/generated/migration/audit class or rejected.

## Files (excluding `data/audits/*` evidence)

| Path | Class | Source / note |
|---|---|---|
| `data/actor-weapon-ranges.json` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `data/canonical/feats.json` | CANONICAL_SSOT | The one operational authority for its domain. |
| `data/canonical/talents.json` | CANONICAL_SSOT | The one operational authority for its domain. |
| `data/canonical/weapons.json` | CANONICAL_SSOT | The one operational authority for its domain. |
| `data/combat/damage-profiles.vehicle-weapon.json` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `data/combat/damage-profiles.weapon.json` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `data/feat-buckets-and-subbuckets.json` | GENERATED_COMPATIBILITY | Picker bucket view derived from generated feat documents. |
| `data/feat-catalog.json` | GENERATED_COMPATIBILITY | Catalog projection of packs/feats.db documents; retire when every consumer reads the pack/registry (5G). |
| `data/feat-choice-options.json` | GENERATED_PRODUCTION | Feat companion data generated from the canonical feats corpus (companions + per-feat automation). |
| `data/feat-combat-actions.json` | GENERATED_PRODUCTION | Feat companion data generated from the canonical feats corpus (companions + per-feat automation). |
| `data/feat-effects.json` | GENERATED_PRODUCTION | Feat companion data generated from the canonical feats corpus (companions + per-feat automation). |
| `data/feat-implementation/clone-wars-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/clone-wars-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/core-rulebook-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/core-rulebook-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/force-unleashed-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/force-unleashed-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/galaxy-at-war-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/galaxy-at-war-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/galaxy-intrigue-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/galaxy-intrigue-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/jedi-academy-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/jedi-academy-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/kotor-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/kotor-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/phase10a-runtime-status-overrides.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/phase10b-engine-fit-matrix.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/phase10c-adapter-contracts.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/phase10d-reaction-adapter-implementation.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/phase10e-target-effect-adapter-implementation.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/phase10f-damage-timing-rider-adapter-implementation.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/phase10g-damage-timing-rider-wiring.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/phase10h-damage-context-callsite-audit.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/scavengers-droids-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/scavengers-droids-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/scum-and-villainy-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/scum-and-villainy-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/starships-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/starships-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/threats-of-the-galaxy-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/threats-of-the-galaxy-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/unknown-regions-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/unknown-regions-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/web-enhancement-feat-implementation-backlog.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-implementation/web-enhancement-feat-implementation-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-metadata.json` | GENERATED_PRODUCTION | Feat companion data generated from the canonical feats corpus (companions + per-feat automation). |
| `data/feat-source-parity/clone-wars-galaxy-at-war-feat-parity-manifest.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-source-parity/core-web-feat-parity-manifest.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-source-parity/force-unleashed-feat-parity-manifest.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-source-parity/galaxy-intrigue-feat-parity-manifest.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-source-parity/kotor-jedi-academy-feat-parity-manifest.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-source-parity/scavengers-droids-feat-parity-manifest.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-source-parity/scum-threats-unknown-feat-parity-manifest.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-source-parity/skill-challenge-feat-readiness-manifest.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-source-parity/starships-feat-parity-manifest.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-taxonomy/expanded-feat-bucket-taxonomy.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-taxonomy/feat-bucket-taxonomy-migration-template.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-taxonomy/feat-taxonomy-application-map.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-taxonomy/feat-taxonomy-source-review-list.json` | HISTORICAL_AUDIT_EVIDENCE | Developer audit inputs read only by scripts/dev audit tools. |
| `data/feat-validity-registry.json` | GENERATED_PRODUCTION | Feat companion data generated from the canonical feats corpus (companions + per-feat automation). |
| `data/generated/class-feat-list-bindings.json` | REFERENCE_BEARING_DOMAIN_DATA | Class-owned feat id lists (runtime); ids verified against the canonical corpus. |
| `data/migrations/feat-canonical-aliases.json` | MIGRATION_ALIAS_ONLY | Old id/name -> canonical mapping; defines nothing. |
| `data/migrations/weapon-canonical-aliases.json` | MIGRATION_ALIAS_ONLY | Old id/name -> canonical mapping; defines nothing. |
| `data/nonheroic/generated/nonheroic-weapon-damage-candidates.nonheroic.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/generated/nonheroic-weapon-damage-candidates.npc.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-1.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-2.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-3.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-4.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.bulk-lane-a-pass-5.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.nh1-droids.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.nh3-galaxy-of-intrigue.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions-beasts.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.nh4-unknown-regions.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.nh5-scavengers-guide-droids.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/nonheroic/nonheroic-weapon-damage-profiles.schema.json` | REFERENCE_BEARING_DOMAIN_DATA | Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs. |
| `data/prestige-layers/weapon-master.json` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `data/skill-challenges/skill-challenge-feat-hooks.json` | HISTORICAL_AUDIT_EVIDENCE | Read only by scripts/dev skill-challenge audits. |
| `data/store/weapon-store-descriptions.json` | GENERATED_COMPATIBILITY | Store card text projected from canonical player summaries. |
| `data/upgrades/weapon-upgrades.json` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `data/vehicle-modifications/weapon-systems.json` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `data/vehicle-weapon-ranges.json` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `data/vehicle-weapons.json` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `data/weapons/canonical-weapon-registry.json` | GENERATED_RUNTIME_INDEX | tools/build-weapon-runtime-registry.mjs from data/canonical/weapons.json |
| `packs/feats.db` | GENERATED_PRODUCTION | tools/build-feat-production.mjs from data/canonical/feats.json |
| `packs/feats.db.sha256` | GENERATED_PRODUCTION | tools/build-feat-production.mjs from data/canonical/feats.json |
| `packs/vehicle-weapon-ranges.db` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `packs/vehicle-weapons.db` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `packs/vehicles-weapon-emplacements.db` | OTHER_DOMAIN_DATA | Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus. |
| `packs/weapons-exotic.db` | GENERATED_PRODUCTION | tools/build-weapon-production.mjs from data/canonical/weapons.json |
| `packs/weapons-grenades.db` | GENERATED_PRODUCTION | tools/build-weapon-production.mjs from data/canonical/weapons.json |
| `packs/weapons-heavy.db` | GENERATED_PRODUCTION | tools/build-weapon-production.mjs from data/canonical/weapons.json |
| `packs/weapons-lightsabers.db` | GENERATED_PRODUCTION | tools/build-weapon-production.mjs from data/canonical/weapons.json |
| `packs/weapons-pistols.db` | GENERATED_PRODUCTION | tools/build-weapon-production.mjs from data/canonical/weapons.json |
| `packs/weapons-rifles.db` | GENERATED_PRODUCTION | tools/build-weapon-production.mjs from data/canonical/weapons.json |
| `packs/weapons-simple.db` | GENERATED_PRODUCTION | tools/build-weapon-production.mjs from data/canonical/weapons.json |
| `packs/weapons.db` | GENERATED_PRODUCTION | tools/build-weapon-production.mjs from data/canonical/weapons.json |

Audit evidence files under `data/audits/` (186) are all HISTORICAL_AUDIT_EVIDENCE; listed individually in the JSON.
