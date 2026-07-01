# Feat Implementation Readiness Phase 10E: Combat Target Effect Adapter

Phase 10E implements the next P0 adapter contract from Phase 10C: `combat-target-effect-adapter`.

The repo already had the upstream pieces:

- `CombatOptionResolver` collects target-effect payloads from feat metadata.
- `rollAttack()` carries `targetEffectsOnHit` and `targetEffectsOnCritical` in chat flags, chat context, and the returned attack result.
- `ActorEngine` owns target mutation.
- `ConditionTrackRules` owns the condition-track cap.

Phase 10E adds the missing consumer module.

## New runtime home

```text
scripts/engine/combat/combat-target-effect-adapter.js
```

## What the adapter does

`CombatTargetEffectAdapter`:

1. Reads `targetEffectsOnHit` when an attack result is a hit.
2. Reads `targetEffectsOnCritical` when an attack result is a critical.
3. Normalizes supported target-effect metadata into explicit application plans.
4. Applies supported condition-track target effects through `ActorEngine.setConditionStep()`.
5. Applies persistent condition flags through `ActorEngine.setConditionPersistent()`.
6. Converts unsupported effects into visible `manualNotes` instead of silently dropping them.

## Supported effect family in this slice

Phase 10E supports target condition-track movement effects:

```text
condition-track-shift
condition-track-move
condition-track-step
target-condition-track-shift
target-condition-track-move
move-target-ct
ct-shift
ct-step
move-condition-track
move-target-condition-track
```

This intentionally starts with the safest useful target mutation family.

## What this unlocks

This gives the following feat families a real consumer path once their metadata is normalized to supported effect types:

- Wounding Strike
- Staggering Attack
- Triple Crit Specialist
- Crush
- Forceful Strike
- Forceful Telekinesis
- other hit/critical condition-track riders

## What this does not do yet

This phase does **not** automatically apply every effect from the chat card. It provides the safe target-effect plan/apply API.

This phase also does not yet implement:

- prone
- flat-footed
- movement interruption
- attack penalties
- skill penalties
- custom Active Effect target riders
- target HP or damage mutation

Those need dedicated target-effect handlers or should be routed through the damage-timing adapter where appropriate.

## Promotion guidance

After Phase 10E, a feat with target condition-track metadata may move from `implemented_partial` metadata-only to implementation-review-ready if:

1. its effect metadata uses a supported target-effect type,
2. the attack result includes a target actor,
3. the effect should trigger on hit or critical, and
4. the result is allowed to apply through `ActorEngine`.

Do not promote a feat to `implemented_correct` for unsupported target effects until a dedicated handler exists.
