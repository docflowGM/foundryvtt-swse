# Force Power Phase 5 — Healing and Mitigation

Phase 5 separates healing and mitigation outcomes from generic damage and modifier ActiveEffects.

## Vital Transfer

Vital Transfer now uses a source-verified transaction model:

- DC 15: heal `2 × target level`
- DC 20: heal `3 × target level`
- DC 25: heal `4 × target level`
- the caster loses HP equal to half of the actual HP restored
- the Force Point option prevents that caster cost
- the Destiny Point option moves the target up to 5 steps toward normal on the condition track

The transaction clamps healing to the target's missing HP before calculating the caster cost. It also rejects self-targeting.

All HP and condition-track writes route through `ActorEngine.updateActor()`.

## Executor integration

Phase 5 wraps `ForceExecutor.executeForcePower()` for Vital Transfer only.

Required execution context:

```js
{
  target: targetActor,
  forcePointOption: false,
  destinyPointOption: false
}
```

The ordinary `useForce` option still means spending a Force Point to modify the Use the Force roll. It is intentionally separate from `forcePointOption`, which activates Vital Transfer's printed special option.

Vital Transfer refuses to execute without a target rather than healing an arbitrary or implicit actor.

## Shared mitigation outcome shape

`buildMitigationEffectData()` creates typed mitigation payloads for:

- mitigation
- resistance
- shield rating
- damage negation

These payloads contain no raw `system.derived.*` writes. They store source-verified typed metadata for the canonical mitigation pipeline to consume in later source-specific implementations.

## Scope limits

This phase fully models and applies Vital Transfer's HP transaction. It does not yet source-reconcile or activate every shield, resistance, or negation power. The shared mitigation payload is infrastructure for those later reviewed powers and does not make unreviewed mitigation powers automation-ready.
