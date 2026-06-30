# Phase 7D Implementation Prompt

Use this prompt when converting the Phase 7D audit results into actual feat automation.

## Non-Negotiable Behavior

- Think Before Coding: inspect the current implementation path before editing.
- Simplicity First: prefer metadata/action hooks over new subsystems unless the rules truly require one.
- Surgical Changes: touch only the files required for the specific feat batch.
- Goal-Driven Execution: each change must map to a feat rule, an audit finding, or a UI/engine requirement.

## Task

Implement Phase 7D feats from Scum and Villainy, Threats of the Galaxy, and The Unknown Regions according to `data/feat-source-parity/scum-threats-unknown-feat-parity-manifest.json`.

## Rules

- Do not implement title-keyword taxonomy.
- Do not turn contextual feat text into unconditional static modifiers.
- If a feat depends on target state, movement path, mounted state, grapple state, surprise round, social state, environment, or GM interpretation, represent it as runtime metadata/action options first.
- If the rule needs source confirmation and confidence is 50/50, mark `sourceReviewRequired` and do not guess.
- Keep expanded bucket migration separate from runtime feat implementation unless explicitly requested.

## Validation

Run:

```bash
node scripts/dev/audit-scum-threats-unknown-feat-parity.mjs --strict
```
