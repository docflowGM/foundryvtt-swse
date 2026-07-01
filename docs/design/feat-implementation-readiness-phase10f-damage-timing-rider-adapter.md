# Feat Implementation Readiness Phase 10F: Damage Timing Rider Adapter

Phase 10F implements the third P0 adapter contract from Phase 10C: `damage-timing-rider-adapter`.

The repo already had the damage authority:

- `ActorEngine.applyDamage()` is the legal combat damage mutation boundary.
- `DamageResolutionEngine` owns mitigation, threshold checks, condition-track impact, and death/destroy outcomes.
- `ThresholdEngine` owns damage threshold evaluation.

Phase 10F adds the pre-damage packet adapter that modifies declarative damage packets before they enter that canonical pipeline.

## New runtime home

```text
scripts/engine/combat/damage-timing-rider-adapter.js
```

## What the adapter does

`DamageTimingRiderAdapter`:

1. Collects damage rider metadata from owned feat/talent `abilityMeta`.
2. Supports `damageTimingRules`, `damageRiders`, `damageRules`, `targetDamageRules`, and generic `abilityMeta.rules` entries.
3. Builds a modified damage packet before `ActorEngine.applyDamage()` runs.
4. Stores applied rider audit information in `damagePacket.options.damageTimingRiders`.
5. Exposes `targetHasActedThisEncounter()` for timing predicates.
6. Provides a built-in compatibility rule for `Advantageous Attack`.

## Supported rule family

Phase 10F recognizes:

```text
damage-rider
damage-bonus
successful-hit-damage-rider
post-hit-damage-rider
pre-damage-rider
advantageous-attack
target-not-acted-damage-rider
```

Supported predicates include:

```text
requiresHit
requiresCritical
requiresTargetNotActed
requiresTargetActed
requiresDamageType
excludedDamageTypes
```

## Advantageous Attack

This phase gives `Advantageous Attack` the correct implementation shape at the adapter layer:

```text
hit + target has not acted yet -> add one-half actor level to damage
```

That is intentionally not an attack bonus.

However, do not promote it all the way to `implemented_correct` until the damage workflow or UI calls the adapter before `ActorEngine.applyDamage()`, and any wrong-shape attack-option metadata is quarantined or removed.

## What this does not do yet

Phase 10F does not automatically wire every damage application path.

It also does not implement:

- post-resolution target effects
- reaction damage prevention
- movement effects
- arbitrary active-effect creation
- direct HP mutation

Those remain separate adapter or handler work.

## Promotion guidance

After Phase 10F:

- Damage-rider feats can move from no-consumer/metadata-only to `implemented_partial` if they can be represented as supported pre-damage packet rules.
- `Advantageous Attack` can move from `implemented_incorrect` only after the damage workflow calls the adapter and wrong-shape attack metadata is no longer active.
- Feats requiring damage prevention, delayed damage, or reaction prompts still need dedicated reaction/damage workflow handlers.
