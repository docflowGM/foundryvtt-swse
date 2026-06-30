# Skill Challenge Feat Readiness - Phase 3.5A

## Verdict

The current catalog already treats the Galaxy of Intrigue Skill Challenge feats as table-managed/manual metadata, which is the correct current behavior while the system lacks a dedicated Skill Challenge subsystem.

Phase 3.5A preserves that policy and adds a future-ready skeleton so these feats have an obvious implementation target later.

## Feats covered

- Skill Challenge: Catastrophic Avoidance
- Skill Challenge: Last Resort
- Skill Challenge: Recovery

## Current policy

These feats should remain:

- Excluded from static actor skill math.
- Excluded from generic passive feat bonus aggregation.
- Excluded from CombatEngine.
- Marked as metadata/table context until the Skill Challenge subsystem exists.

## Future policy

Once a SkillChallengeEngine and GM surface exist, these feats should become challenge reactions or effect modifiers.

They should hook into challenge outcome resolution, not into the actor sheet.

## Phase 3.5A files

This phase adds only new files. It intentionally avoids registry wiring and runtime persistence changes.

Run the readiness audit with:

```bash
node scripts/dev/audit-skill-challenge-readiness.mjs --strict
```

Generated reports are written to:

```text
docs/audits/generated/skill-challenge-readiness-report.json
docs/audits/generated/skill-challenge-readiness-report.md
```
