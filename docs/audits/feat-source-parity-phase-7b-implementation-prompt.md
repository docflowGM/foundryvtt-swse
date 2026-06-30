# Implementation Prompt: Phase 7B Clone Wars + Galaxy at War Feat Parity

You are working in the SWSE Foundry VTT v13/v2 migration codebase.

## Non-Negotiable Behavior

1. Think Before Coding.
2. Simplicity First.
3. Surgical Changes.
4. Goal-Driven Execution.

## Goal

Use the Phase 7B manifest and audit to preserve source parity and implementation-fit metadata for Clone Wars Campaign Guide and Galaxy at War feats.

## Required checks

Run:

```bash
node scripts/dev/audit-clone-wars-galaxy-at-war-feat-parity.mjs --strict
```

Before making any automation changes, read:

- `data/feat-source-parity/clone-wars-galaxy-at-war-feat-parity-manifest.json`
- `docs/design/clone-wars-galaxy-at-war-feat-implementation-fit.md`

## Classification rules

Do not classify feats by name keywords alone.

Use these instead:

- prerequisites
- benefit/effect text
- current ability metadata
- runtime context
- source book context

If a classification is ambiguous, add a source-review entry instead of guessing.

## Known reviewed cases

- `Destructive Force` is not a Force feat.
- `Force of Personality` is not a Force feat.
- `Pall of the Dark Side` is Force-adjacent/dark-side context but should not become a global static Force modifier.
- `Jedi Familiarity` is Force-adjacent resource metadata and should remain runtime-contextual.

## Automation guidance

Implement later feats through the narrowest subsystem that matches the rule:

- combat options and riders through attack workflow options
- condition-track movement through condition/actor mutation paths
- vehicle/gunnery feats through vehicle/starship roll logic
- skill rerolls through skill roll metadata
- healing/repair feats through Treat Injury/Mechanics action contexts
- source/manual feats as metadata only

Do not add unconditional static modifiers for conditional feat benefits.
