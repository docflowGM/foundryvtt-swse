# Implementation Prompt — Phase 7A KOTOR + Jedi Academy Feat Parity

You are working in the SWSE Foundry VTT v13/v2 migration repository.

## Non-Negotiable Behavior

1. **Think Before Coding** — inspect the current implementation and identify the smallest safe integration point before editing.
2. **Simplicity First** — prefer metadata and existing engine hooks over new subsystems unless the feat truly requires one.
3. **Surgical Changes** — edit only files required for the specific feat/rule behavior being implemented.
4. **Goal-Driven Execution** — every change must map to a feat rule, audit finding, or documented implementation gap.

## Scope

Use the Phase 7A manifest:

```text
data/feat-source-parity/kotor-jedi-academy-feat-parity-manifest.json
```

The audit command is:

```bash
node scripts/dev/audit-kotor-jedi-academy-feat-parity.mjs --strict
```

## Rules

- Do not classify feats from name keywords alone.
- If classification is 50/50, mark source review instead of guessing.
- Do not turn reaction/rider feats into unconditional static bonuses.
- Do not make `Fast Surge` a Force feat.
- Do not expand `Force Regimen Mastery` beyond picker/entitlement metadata until Force Regimen source data is reviewed.

## Good first implementation candidates

1. Poison Resistance via poison defense/damage hook.
2. Logic Upgrade action-card support for droid actors.
3. Critical Strike/Improved Rapid Strike attack-option UI hardening.
4. Conditioning reaction Fortitude bonus and skill reroll integration.
