# Phase 7A — KOTOR + Jedi Academy Feat Parity

This phase audits feat metadata and implementation fit for:

- `Knights of the Old Republic Campaign Guide`
- `Jedi Academy Training Manual`

The goal is source parity and implementation readiness, not broad runtime rewrites.

## Core rule

Do not classify feats from title keywords alone. Use:

1. prerequisites,
2. benefit/effect text,
3. runtime mechanic,
4. source context,
5. whether the feat needs a selected choice or encounter state.

If a feat is ambiguous, mark it for source review instead of guessing.

## Confirmed scope

The current catalog contains:

- 20 KOTOR feats
- 8 Jedi Academy feats

The phase manifest records all 28 expected feats and their intended implementation homes.

## Metadata correction

`Fast Surge` was previously classified as a Force feat because it appears in Jedi Academy material and contains the word `Surge`. Its actual mechanics are Second Wind action economy. This phase changes it to a general/resource feat and marks it as source-taxonomy reviewed.

## Out of scope

This phase does not implement:

- full Force Regimen effects,
- complete reaction/result engine behavior,
- complete selected weapon/group tactical enforcement,
- new attack option UI beyond existing metadata classification.

## Audit command

```bash
node scripts/dev/audit-kotor-jedi-academy-feat-parity.mjs --strict
```

Generated reports:

- `docs/audits/generated/kotor-jedi-academy-feat-parity-report.json`
- `docs/audits/generated/kotor-jedi-academy-feat-parity-report.md`
