# Implementation Prompt: Phase 3 Galaxy of Intrigue and Skill Challenge Feasibility

You are working in the SWSE Foundry VTT v13/v2 migration repository.

## Non-Negotiable Behavior

1. **Think Before Coding**: inspect the current repo structure and existing feat metadata before editing.
2. **Simplicity First**: add the smallest useful audit/design layer; do not build a full Skill Challenge runtime in this pass.
3. **Surgical Changes**: limit edits to the Phase 3 manifest, audit script, generated report, and design documentation unless the user explicitly asks for runtime implementation.
4. **Goal-Driven Execution**: the goal is Galaxy of Intrigue feat parity plus a concrete Skill Challenge architecture fit, not broad refactoring.

## Task

Apply the Phase 3 files and run:

```bash
node --check scripts/dev/audit-galaxy-intrigue-feat-parity.mjs
node scripts/dev/audit-galaxy-intrigue-feat-parity.mjs --strict
```

Review the generated report:

```text
docs/audits/generated/galaxy-intrigue-feat-parity-report.md
```

## Required interpretation

- Skill Challenge feats are **metadata-only until a dedicated Skill Challenge subsystem exists**.
- Do not push Skill Challenge feat effects into actor static skill math.
- The future subsystem should slot into `scripts/engine/skill-challenges`, `scripts/apps/skill-challenges`, and `scripts/chat`, with optional GM datapad integration later.
- `Forceful Recovery` is source-review only. Do not rewrite its sourcebook automatically.

## Future runtime implementation boundary

Only begin runtime implementation if asked. The first runtime PR should build a pure `SkillChallengeEngine` and test fixture model before any UI work.
