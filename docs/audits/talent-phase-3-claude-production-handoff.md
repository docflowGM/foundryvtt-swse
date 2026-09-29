# Phase 3 Claude Talent Repair Handoff

## Operating rule

Phase 3C executes certified Phase 3B manifests. It does not re-audit the books or reinterpret identity.

A talent identity is `canonicalTreeKey + talent name`. Talent name alone is never sufficient.

## Completed execution packets

| Book | Owned identities | Manifest | Checker |
|---|---:|---|---|
| Saga Edition Core Rulebook | 198 | `data/audits/talent-phase-3b-core-rulebook-manifest.json` | `node tools/build-talent-phase-3b-core-manifest.mjs --check` |
| Galaxy at War | 56 | `data/audits/talent-phase-3b-galaxy-at-war-manifest.json` | `node tools/build-talent-phase-3b-galaxy-at-war-manifest.mjs --check` |
| Galaxy of Intrigue | 43 | `data/audits/talent-phase-3b-galaxy-of-intrigue-manifest.json` | `node tools/build-talent-phase-3b-galaxy-of-intrigue-manifest.mjs --check` |
| Starships of the Galaxy | 23 | `data/audits/talent-phase-3b-starships-of-the-galaxy-manifest.json` | `node tools/build-talent-phase-3b-starships-manifest.mjs --check` |
| Scavenger's Guide to Droids | 31 | `data/audits/talent-phase-3b-scavengers-guide-to-droids-manifest.json` | `node tools/build-talent-phase-3b-scavengers-manifest.mjs --check` |
| Threats of the Galaxy | 11 | `data/audits/talent-phase-3b-threats-of-the-galaxy-manifest.json` | `node tools/build-talent-phase-3b-threats-manifest.mjs --check` |

The shared implementation is `tools/build-talent-phase-3b-manifest.mjs`.

## Production authorities

- Canonical content and provenance: `data/canonical/talents.json`
- Effective talent inventory: `packs/talents.db`
- Talent-tree membership: `packs/talent_trees.db`
- Canonical tree registry: `data/audits/talent-canonical-tree-registry.json`

Do not treat historical fixed/generated JSON files as production authority.

## Ownership rule

Only the Phase 3A primary-publication owner emits a production mutation. A talent reprinted or referenced by a later book is recorded as reference-only in that later book's manifest.

## Mutation contract

For existing identities:

- preserve `_id`;
- write only fields named in `mutationFields`;
- preserve runtime metadata and unrelated document fields;
- preserve description storage shape:
  - existing object → `system.description.value`;
  - existing string → `system.description`;
  - new record → `system.description.value`.

For `CORRECT_TREE`, update both `system.treeId` and tree-pack membership. Remove the old membership and add the same ID to the target tree.

For `CREATE` and `IDENTITY_SPLIT`, use the exact `createRecordId` and `createTemplate`. Do not invent automation metadata.

For `REMOVE_CONTAMINATION`, replace only the certified player-facing fields and preserve runtime metadata.

For `UPDATE_NAME`, synchronize the talent document and the name stored in its tree membership.

## Review-only extras

`productionExtras` are not Phase 3C deletion instructions. Records classified `REVIEW_EXTRA_DUPLICATE_CANONICAL_ALIAS` remain untouched until Phase 3D confirms references and selects a safe survivor.

Current review-only extras:

- Core: `a7d8c4da96eacad4` — duplicate Infamy `Notorious` candidate
- Threats: `222327492c484b4a` — duplicate Master of Teräs Käsi `Teräs Käsi Basics` candidate

## Required preflight

```bash
node tools/build-talent-canonical-authority.mjs --check
node tools/build-talent-phase-3b-core-manifest.mjs --check
node tools/build-talent-phase-3b-galaxy-at-war-manifest.mjs --check
node tools/build-talent-phase-3b-galaxy-of-intrigue-manifest.mjs --check
node tools/build-talent-phase-3b-starships-manifest.mjs --check
node tools/build-talent-phase-3b-scavengers-manifest.mjs --check
node tools/build-talent-phase-3b-threats-manifest.mjs --check
```

If any check fails, stop and regenerate/re-certify the affected manifest against the current authorities.

## Prohibited shortcuts

- No name-only matching.
- No CREATE inferred solely from a Phase 2 missing flag.
- No same-name overwrite across trees.
- No deletion of review-only extras in Phase 3C.
- No flattening every description into one schema shape.
- No erasing ability metadata, structured prerequisites, tags, effects, flags, images, ownership, folders, or sorting unless explicitly targeted.

## Missing-tree execution rule

When a book manifest contains `treeCreates`, create those talent-tree documents before their talents. Then apply every listed `classAccessMutation` to `packs/classes.db`. Never create talents with an unresolved or nonexistent parent tree.
