# Feat Implementation Readiness Phase 10A: Runtime Overrides

Phase 10A is a surgical correction pass. It does not introduce a new feat runtime architecture. It records cases where current repo runtime inspection changes a Phase 9 readiness conclusion, and it keeps known wrong-shape implementations fail-closed.

## Reaction-engine correction

The repo does have a real reaction engine:

- `scripts/engine/combat/reactions/reaction-engine.js`
- `scripts/engine/combat/reactions/reaction-registry.js`

The reaction system already:

- collects reaction keys from `system.derived.reactions` and owned item `abilityMeta`
- resolves registry entries by trigger
- evaluates attack type, damage type, flat-footed, missed-attack, fighting-defensively, and weapon-text conditions
- validates per-round/per-encounter limits through `ActivationLimitEngine`
- validates Force Point cost
- executes registered handlers
- routes resource mutation through `ActorEngine`
- posts through `SWSEChat`
- updates chat event cards through `SWSEChatEventBridge`

So Phase 10 should not build a new generic reaction engine. Missing reaction work should be framed as adapters/registry entries for uncovered feat families, plus attack/damage event wiring where needed.

## Phase 10A status overrides

### Implant Training

Promote to `implemented_correct` for the current repo state.

Evidence in current runtime:

- `ImplantRules.hasImplantTraining()` recognizes the feat.
- `ImplantRules.getWillDefensePenalty()` suppresses the active implant Will penalty when Implant Training is present.
- `ImplantRules.getConditionTrackExtraStep()` returns zero for trained actors and is consumed by condition shifting.
- `DefenseCalculator` imports `ImplantRules` and includes the implant Will penalty in Will Defense calculation.
- `ActorEngine.applyConditionShift()` consults `ImplantRules.getConditionTrackExtraStep()` for downward condition movement.

This is no longer metadata-only.

### Advantageous Attack

Keep `implemented_incorrect`.

The source rule is a successful-hit damage rider against an enemy who has not acted yet in combat. It is not an attack option and not a speed-based attack modifier. Until the wrong-shape metadata is removed/replaced and a damage timing hook exists, this must remain blocked.

## Files in this pass

- `data/feat-implementation/phase10a-runtime-status-overrides.json`
- `scripts/dev/audit-kotor-feat-implementation-readiness.mjs`
- `scripts/dev/audit-force-unleashed-feat-implementation-readiness.mjs`
