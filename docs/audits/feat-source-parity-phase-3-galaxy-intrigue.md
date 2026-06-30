# Feat Source Parity Phase 3: Galaxy of Intrigue

## Scope

Phase 3 covers the feat list surfaced from *Galaxy of Intrigue* Chapter 1 and the design impact of Chapter 2's optional Skill Challenge subsystem.

This phase does **not** implement a Skill Challenge runtime. It adds a parity manifest, an audit script, and a subsystem design reference so future work can be built against the current repo shape without pretending Skill Challenge feats are static character math.

## Why Skill Challenge feats stay metadata-only for now

The uploaded source scan describes Chapter 2 as an optional mechanic using multiple skill checks to involve the whole group in overcoming obstacles. The examples use challenge level, complexity, success targets, failure limits, primary skills, DCs, challenge effects, success outcomes, and failure outcomes. That structure is party/encounter state, not an actor-local modifier.

The three named Skill Challenge feats should therefore remain out of static sheet math until the system has a first-class challenge workflow:

- `Skill Challenge: Catastrophic Avoidance`
- `Skill Challenge: Last Resort`
- `Skill Challenge: Recovery`

Current repo state already has these feats marked as manual/table-managed. Phase 3 preserves that direction and documents how to eventually automate them correctly.

## Added files

- `data/feat-source-parity/galaxy-intrigue-feat-parity-manifest.json`
- `data/skill-challenges/skill-challenge-system-model.json`
- `scripts/dev/audit-galaxy-intrigue-feat-parity.mjs`
- `docs/design/skill-challenge-system-fit.md`
- `docs/audits/feat-source-parity-phase-3-implementation-prompt.md`

The audit script writes generated reports to:

- `docs/audits/generated/galaxy-intrigue-feat-parity-report.json`
- `docs/audits/generated/galaxy-intrigue-feat-parity-report.md`

## Run commands

```bash
node --check scripts/dev/audit-galaxy-intrigue-feat-parity.mjs
node scripts/dev/audit-galaxy-intrigue-feat-parity.mjs --strict
```

`--strict` fails only on hard errors, not warnings. Source-review warnings are intentional when a feat name appears in the source scan but the current catalog source points elsewhere.

## Current expected behavior

The audit should verify that the Galaxy of Intrigue feat family exists in both `data/feat-catalog.json` and `packs/feats.db`, that Skill Challenge feats are not treated as static modifiers, and that persistent-choice feats such as `Recurring Success` remain marked as choice/context dependent.

## Skill Challenge implementation boundary

A future Skill Challenge implementation should be a GM-facing scene/encounter workflow:

- source of truth: `SkillChallengeEngine`, not actor skill math;
- UI: a dedicated Skill Challenge app/card, not the character sheet;
- rolls: consume existing skill roll totals instead of recalculating skill math;
- feats: read participant feat metadata and expose app-level options only while a challenge is running;
- chat: emit progress cards and GM controls;
- GM datapad: optional launcher/monitor only, not the state authority.

## Notable review item

`Forceful Recovery` is intentionally marked as `source_review_required` in the manifest. The current catalog entry is sourced to *The Force Unleashed Campaign Guide*, while the Galaxy of Intrigue source scan surfaced the name in the feat listing/index area. Do not move or rewrite this feat automatically without a manual source check.
