# Feat Source Parity Phase 2: Starships of the Galaxy

## Purpose

Phase 2 audits the current feat catalog against the Starships of the Galaxy feat surface. It is deliberately conservative: it verifies source coverage, prerequisite text, selected-choice metadata, and implementation boundaries without attempting to build a starship construction or full starship maneuver automation layer.

## Current repo baseline

The uploaded current repo contains populated feat data in both `packs/feats.db` and `data/feat-catalog.json`. Phase 2 therefore updates real feat metadata where the classification was too vague, instead of treating the feat pack as missing.

The Phase 2 audit script is:

```bash
node scripts/dev/audit-starships-feat-parity.mjs
```

For CI-style enforcement:

```bash
node scripts/dev/audit-starships-feat-parity.mjs --strict
```

Generated reports are written to:

- `docs/audits/generated/starships-feat-parity-report.json`
- `docs/audits/generated/starships-feat-parity-report.md`

## Starship Designer decision

`Starship Designer` is intentionally classified as metadata-only, not as postponed automation.

GM/player note:

> Starship Designer is intentionally metadata-only. For ship design, rebuilds, and custom modifications, consult Starships of the Galaxy with your GM.

Reasoning: the feat relies on open-ended ship design, long-form construction time/cost adjudication, GM benchmarking, custom modification stacking, and campaign-economy assumptions. Implementing it as hard automation would create false precision and a brittle parallel starship design subsystem.

Expected metadata:

- `implementationStatus`: `metadata_only_consult_sotg`
- `mechanicsMode`: `metadata_only`
- `applicationScope`: `gm_player_starship_design_reference`
- `staticSheetPolicy`: `exclude`

## Starships feat categories

Phase 2 treats the Starships of the Galaxy feat surface as three categories:

1. New Starships feats
   - `Starship Designer`
   - `Starship Tactics`
   - `Tactical Genius`

2. Required/cross-source prerequisite support
   - `Tech Specialist`

3. Core feats with Starships of the Galaxy vehicle/starship notes
   - `Burst Fire`
   - `Coordinated Attack`
   - `Deadeye`
   - `Dodge`
   - `Dual Weapon Mastery I`
   - `Dual Weapon Mastery II`
   - `Dual Weapon Mastery III`
   - `Far Shot`
   - `Improved Defenses`
   - `Rapid Shot`
   - `Triple Attack`

## Implementation boundary

This phase does not implement:

- A starship design workbench.
- A complete starship construction economy.
- Automatic custom modification stacking.
- Automatic ship blueprint generation.
- Full vehicle/starship combat automation beyond metadata hooks already present.

This phase does verify that feats are represented honestly, with no misleading static bonuses and no backlog language for intentionally manual rules.
