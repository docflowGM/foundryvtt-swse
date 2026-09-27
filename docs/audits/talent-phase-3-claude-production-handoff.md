# Phase 3 Claude Talent Repair Handoff

## Operating rule

Claude's job in Phase 3C is to execute certified manifests, not to re-audit SWSE talent rules.

For each completed book, use the corresponding `data/audits/talent-phase-3b-*-manifest.json` as the mutation plan and the canonical authority files as read-only evidence.

## Current completed execution packets

1. **Saga Edition Core Rulebook**
   - Manifest: `data/audits/talent-phase-3b-core-rulebook-manifest.json`
   - Builder/checker: `tools/build-talent-phase-3b-core-manifest.mjs`
   - Human checkpoint: `docs/audits/talent-phase-3b-core-rulebook.md`
   - Identities: 198

## Non-negotiable identity rule

A talent identity is:

`canonicalTreeKey + talent name`

Talent name alone is never sufficient.

## Production authorities

- Canonical repair/build authority: `data/canonical/talents.json`
- Effective shipped runtime inventory: `packs/talents.db`
- Production talent-tree membership: `packs/talent_trees.db`

Do not treat `data/fixes/talents.fixed.json` or `data/generated/talents.fixed.json` as production authority.

## Mutation behavior

For existing canonical identities:

- preserve the existing `_id`;
- update only fields listed by the book manifest;
- preserve runtime metadata not explicitly targeted.

For tree corrections:

- update both the talent record and `packs/talent_trees.db` membership;
- do not copy the talent and leave the old tree claim behind.

For CREATE:

- use the manifest's exact `createRecordId`;
- use its `createTemplate`;
- do not invent `abilityMeta`, tags, Active Effects, or automation.

For IDENTITY_SPLIT:

- preserve the existing same-name record in its own tree;
- create the new distinct identity exactly as specified.

For REMOVE_CONTAMINATION:

- replace only canonical player-facing fields with the manifest's target values;
- preserve unrelated runtime metadata.

## Required preflight

Before applying Core:

```bash
node tools/build-talent-canonical-authority.mjs --check
node tools/build-talent-phase-3b-core-manifest.mjs --check
```

As more books are completed, run the corresponding book checker too.

If a checker fails, do not improvise around it. The manifest must be regenerated/re-certified against the new repository state.

## Required post-write verification

At minimum:

```bash
node tools/audit-talent-tree-membership.mjs
```

Then run the book-specific Phase 3C verification once added.

## Explicitly prohibited shortcuts

- No global name-only matching.
- No "missing in Phase 2 = CREATE" assumption.
- No deletion of homebrew/noncanonical talents during canonical book repair.
- No replacement of stable existing IDs unless a manifest explicitly says CREATE/IDENTITY_SPLIT.
- No erasing `system.abilityMeta`, structured prerequisite metadata, tags, effects, or flags just to simplify the rewrite.
