# Phase 6O — Shared typed effect ingress for Fearless / Indomitable

**Source:** Core Rulebook pp. 215 (Force Disciple Indomitable), 220 (Jedi Master Fearless) and 224 (Sith Lord Fearless / suspension).  
**Branch:** `feat/class-force-6o-typed-effect-ingress`, stacked on Phase 6N.  
**Status:** targeted mutation ingress, **not** all-effect or live Foundry v13 certified.

## Why this exists
Earlier Phases 6H/6I/6K suppressed explicit Fear / Mind-Affecting effects at two known Force-power/talent consumers. Other typed ActiveEffects could still reach ActorEngine without checking the recipient's immunity. Phase 6O narrows this hole at the **existing central mutation owners**, without inventing a new effect engine.

## Implementation
- New `force-class-effect-ingress.js` recognizes only **explicit** effect metadata: descriptors/tags and boolean `fearEffect` / `mindAffecting`, read from the declared effect payload and its normal `flags.swse` / `flags['foundryvtt-swse']` descriptors.
- Exact Jedi Master / Sith Lord Fearless class ownership and DSP >= Wisdom suspension are evaluated using `resolveApexFearImmunity`. Actual Force Disciple class ownership is checked using `resolveForceDiscipleIndomitable`.
- `ActorEngine.createActiveEffects` and `ActorEngine.createEmbeddedDocuments('ActiveEffect')` filter typed-immune entries **before** creating documents; mixed batches preserve unaffected effects.
- `ConditionEngine.applyConditionStep` rejects **explicitly annotated** Fear/Mind-Affecting condition mutations, before invoking `ActorEngine.setConditionStep`. An ordinary untyped condition change, non-fear mind-affecting theme, or unannotated skill cannot be inferred as blocked.
- All normal ActorEngine mutation guards and recalculation remain authoritative.
- Regression: `tests/class-phase-6o-typed-effect-ingress.test.mjs`.

## Limits
This is not a proof that every source supplies correct descriptor metadata. Some feat/talent/skill consumers apply direct condition track or actor fields without an explicit effect descriptor, so the engine cannot safely infer immunity. They require source-first audits and typed descriptors, not speculative name matching. Force-based Yuuzhan Vong immunity remains separately governed by `targetSuppressesForceEffect` and was not applied to unrelated physical ActiveEffects.

**Required:** exact-head CI, actual Foundry 13 scene tests, validation of rolled Force powers, talent and feat effects, synthetic actors, multiple effects in one batch, loss/restoration of Sith DSP threshold, and verification that all typed mutation routes pass through these canonical ingress points.
