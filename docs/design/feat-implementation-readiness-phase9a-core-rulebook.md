# Phase 9A: Core Rulebook Feat Implementation Accuracy

This phase starts the global feat implementation backlog book-by-book, beginning with the Saga Edition Core Rulebook.

The goal is accuracy, not speed. A feat is not considered implemented merely because it exists in `data/feat-catalog.json`, has an image, has prerequisites, or has a generic metadata status. The audit asks whether the implementation shape matches the rules text.

## Accuracy principle

If a feat grants a new attack action option, reaction, reroll, resource use, or special timing rule, it must be implemented through that workflow. It should not be marked complete if the current code only grants a flat passive bonus.

Examples:

- Power Attack is an attack option: it needs a user-selected penalty/damage tradeoff at roll time.
- Rapid Shot and Rapid Strike are attack options: they need roll-time toggles and damage dice logic.
- Cleave and Great Cleave are reaction/extra-attack riders: they need a post-drop trigger or GM/player prompt, not a passive bonus.
- Cybernetic Surgery and Tech Specialist are procedure/workbench rules: metadata/manual is correct until a dedicated workflow exists.

## Implementation accuracy statuses

- `implemented_correct`: current implementation shape appears to match the expected rules shape.
- `implemented_partial`: some support exists, but scope, UI, targeting, prompts, or breakdown parity is not fully proven.
- `implemented_incorrect`: an implementation exists but appears to apply the wrong kind of mechanic.
- `not_implemented`: no reliable runtime support was detected.
- `metadata_correct`: metadata/manual handling is the correct boundary for now.
- `source_review_required`: exact source timing/targeting should be verified before coding.

## Why this is book-by-book

The previous source-parity phases found several misleading name-based classifications. Phase 9 therefore uses source book context and descriptions before assigning implementation modes. This prevents feats with words such as “Force,” “Droid,” or “Vehicle” from being routed to the wrong engine.

## Outputs

- `data/feat-implementation/core-rulebook-feat-implementation-backlog.json`
- `data/feat-implementation/core-rulebook-feat-implementation-review-list.json`
- `scripts/dev/audit-core-rulebook-feat-implementation-readiness.mjs`
- generated audit reports under `docs/audits/generated/`

No feat mechanics are implemented in this phase. This is a correctness audit and implementation backlog phase.
