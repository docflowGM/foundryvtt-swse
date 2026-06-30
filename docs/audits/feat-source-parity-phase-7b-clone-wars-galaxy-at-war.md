# Phase 7B: Clone Wars + Galaxy at War Feat Parity

This phase audits feat data sourced to:

- `Clone Wars Campaign Guide`
- `Galaxy at War`

The pass is intentionally conservative. It does not implement new runtime hooks and it does not rewrite feat effects unless a clear source/data mismatch is proven. Its job is to verify source coverage, preserve correct metadata taxonomy, and prevent keyword-driven misclassification before the next implementation phase.

## Scope

Phase 7B checks that all expected Clone Wars and Galaxy at War feats are present in both canonical feat data locations:

- `data/feat-catalog.json`
- `packs/feats.db`

It also reviews implementation-fit metadata so future automation can route feats to the correct subsystem.

## Taxonomy policy

Feat taxonomy must not be inferred from title keywords alone.

Examples reviewed in this phase:

- `Destructive Force` is a general/vehicle-context feat, not a Force feat.
- `Force of Personality` is an ability/defense-context feat, not a Force feat.
- `Pall of the Dark Side` is Force-adjacent/dark-side context, but it remains a general feat unless source prerequisites and mechanics require true Force-feat taxonomy.
- `Jedi Familiarity` is Force-adjacent resource metadata, not a blanket static Use the Force modifier.

If a feat is 50/50 by metadata alone, mark it for source review rather than guessing.

## Current result

The generated report for the uploaded repo baseline shows:

- 67 expected feats present
- 20 Clone Wars feats matched
- 47 Galaxy at War feats matched
- 0 warnings
- 0 errors

## Running the audit

```bash
node scripts/dev/audit-clone-wars-galaxy-at-war-feat-parity.mjs --strict
```

Reports are written to:

- `docs/audits/generated/clone-wars-galaxy-at-war-feat-parity-report.json`
- `docs/audits/generated/clone-wars-galaxy-at-war-feat-parity-report.md`
