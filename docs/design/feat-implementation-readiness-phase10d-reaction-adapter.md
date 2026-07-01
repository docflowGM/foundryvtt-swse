# Feat Implementation Readiness Phase 10D: Reaction Rule Adapter

Phase 10D implements the first Phase 10 adapter slice: `reaction-registry-feat-adapter`.

The important architectural decision from Phase 10A remains binding: the system already has a real `ReactionEngine` and `ReactionRegistry`. Phase 10D therefore adds a metadata adapter that feeds those existing systems instead of creating a parallel reaction runtime.

## What changed

### New adapter

```text
scripts/engine/combat/reactions/reaction-rule-adapter.js
```

`ReactionRuleAdapter` reads owned item `system.abilityMeta.reactionRules` and generic `abilityMeta.rules` entries with `type: "REACTION"`, normalizes them into `ReactionRegistry` definitions, and registers them through `ReactionRegistry.registerReaction()`.

### ReactionEngine integration

`ReactionEngine.getAvailableReactions()` should ask the adapter to register metadata-backed reaction rules for the defender, then include adapter-provided keys alongside existing derived/owned reaction keys.

`ReactionEngine.resolveReaction()` should also ask the adapter to register defender metadata before registry lookup. That lets a metadata-backed reaction resolve through the existing `ReactionRegistry` and `ActivationLimitEngine` flow.

## What this unlocks

This does not fully automate every reaction feat yet. It creates the missing latch point so `reactionRules` metadata no longer silently disappears once the integration point is present.

Phase 9 families now have a runtime entry point for:

- Conditioning
- Republic Military Training
- Sith Military Training
- Acrobatic Dodge
- Grab Back
- Mounted Defense
- Stay Up
- Dive for Cover
- Duck and Cover
- Opportunistic Retreat
- Tactical Advantage

## Safety boundaries

The adapter does **not**:

- mutate actor data directly
- create a second reaction engine
- bypass `ReactionRegistry`
- bypass `ActivationLimitEngine`
- fully implement movement-grid or damage-mutating reactions

Unsupported or manual reaction effects are surfaced through a metadata-backed handler result. Dedicated handlers can be added later for reactions that need movement, damage mutation, target state, or condition-track changes.

## Promotion guidance

After this phase, a feat with `reactionRules` may be promoted from `missing_runtime` to `implemented_partial` if the only missing piece was the runtime latch.

Do **not** promote a feat to `implemented_correct` unless its actual effect is supported by either:

- a dedicated `ReactionRegistry` handler, or
- a metadata-backed handler that fully matches the feat rule shape.
