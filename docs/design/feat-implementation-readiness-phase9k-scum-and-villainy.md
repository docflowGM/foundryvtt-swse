# Phase 9K — Scum and Villainy Feat Implementation Readiness

This phase audits Scum and Villainy feats for implementation accuracy.

The audit distinguishes metadata presence from correct implementation. A feat that grants a new reaction, follow-up attack, movement option, or customization workflow is not fully implemented merely because it has a disabled modifier or metadata note.

## High-risk patterns

- Follow-up attacks that need target selection, once-per-turn tracking, and original damage carryover.
- Reactions that need incoming attack, area attack, or AoO interception.
- Movement feats that need grid/path validation.
- Tech Specialist derivatives that need customization UI, cost, DC, time, active trait, and rollback semantics.
- Shapeshift/identity feats that need source review and shapechange state.

## Correctness standard

`implemented_correct` requires a runtime consumer that matches the rule shape. Metadata-only representations are usually `implemented_partial` unless the feat is intentionally source-reference/manual.
