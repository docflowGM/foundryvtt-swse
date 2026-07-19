# Force Power Phase 6 — Direct Damage

Phase 6 introduces a dedicated direct-damage resolver for the first source-reviewed Force powers.

## Force Lightning

Force Lightning preserves the existing tier progression:

- DC 15: 2d6
- DC 20: 4d6
- DC 25: 6d6
- DC 30: 8d6

The correction is the damage type: every tier is `force` damage. The resolver does not infer electricity damage from the power name.

Force Lightning requires one explicit target actor and applies its damage through `DamageSystem.applyPacketToActor()` so the canonical mitigation pipeline remains authoritative.

## Force Slam

Force Slam is represented as a 6-square cone affecting all supplied target actors.

- roll damage once for the power
- base damage is 4d6 Force damage
- the Force Point option increases the roll to 6d6
- compare the Use the Force result against each target's Fortitude Defense
- a hit takes full damage and becomes prone
- a miss takes half damage and does not become prone

Each target receives its own finalized damage packet so mitigation and target-specific defenses remain isolated.

## Condition handling

Prone is created through `ActorEngine.createActiveEffects()` with condition provenance. Existing prone effects are detected to avoid duplicates.

## Executor context

Force Lightning expects:

```js
{ target: targetActor }
```

Force Slam expects:

```js
{
  targets: actorsInTheSixSquareCone,
  forcePointOption: false
}
```

Target selection and cone geometry remain UI responsibilities. The resolver refuses to execute without explicit targets instead of applying damage to arbitrary selected actors.

## Scope limits

This phase does not implement the later condition-track and sustained-power families. It also does not infer Force damage for other Force powers; each power requires source verification and an explicit damage type.
