# Phase 7D: Scum and Villainy + Threats of the Galaxy + Unknown Regions Feat Parity

Phase 7D is the remaining three-book source-parity sweep before the project moves into global feat implementation backlog work.

## Scope

Reviewed sourcebooks:

- Scum and Villainy
- Threats of the Galaxy
- The Unknown Regions

Current expected feat coverage from the repository catalog:

- Scum and Villainy: 23 feats
- Threats of the Galaxy: 4 feats
- The Unknown Regions: 20 feats
- Total: 47 feats

## Policy

This phase does not change feat metadata. It only adds a manifest, audit script, generated report, and implementation-fit notes.

Rules enforced by the audit:

- Every expected feat must be present in `data/feat-catalog.json`.
- Every expected feat must be present in `packs/feats.db`.
- Sourcebook attribution must match the expected sourcebook.
- Feats that depend on targets, positioning, movement, social state, mounted context, gear state, or once-per-encounter timing must not be treated as unconditional static sheet math.
- Feat taxonomy must not be inferred from title keywords alone.
- Ambiguous classifications should be marked `sourceReviewRequired` instead of guessed.

## Important classification notes

The three books in this phase lean heavily toward contextual play:

- Scum and Villainy has many scoundrel-facing combat, social, gear, and mobility feats.
- Threats of the Galaxy has a small combat/mounted/vehicle-adjacent feat set.
- The Unknown Regions has exploration, mounted, survival, social/intimidation, vehicle, and species-context feats.

This means most Phase 7D feats should be implemented through runtime hooks, action options, reaction metadata, roll-context prompts, or GM-confirmed workflows rather than static actor modifiers.

## Validation

Run:

```bash
node scripts/dev/audit-scum-threats-unknown-feat-parity.mjs --strict
```

Expected result for the current repository baseline:

```text
47/47 expected feats present
0 warnings, 0 errors
```
