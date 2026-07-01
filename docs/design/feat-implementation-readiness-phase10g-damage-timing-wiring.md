# Feat Implementation Readiness Phase 10G: Damage Timing Rider Wiring

Phase 10G wires the Phase 10F `DamageTimingRiderAdapter` into the existing damage callpath.

The selected wiring point is intentionally small:

```text
scripts/engine/combat/damage-engine.js
```

`DamageEngine.applyDamage()` already routes final mutation through `ActorEngine.applyDamage()`, which delegates to `DamageResolutionEngine`. Phase 10G keeps that authority intact and only inserts a pre-resolution packet adapter.

## What changed

`DamageEngine.applyDamage()` now:

1. Builds a declarative base damage packet.
2. Preserves `sourceActor` / `attacker` and `targetActor` context when supplied.
3. Calls `DamageTimingRiderAdapter.applyToDamagePacket()`.
4. Sends the rider-mutated packet to `ActorEngine.applyDamage()`.
5. Returns rider audit fields:
   - `damageTimingRiders`
   - `damageBeforeRiders`
   - `damageAfterRiders`

## Why this wiring point

This avoids editing `ActorEngine` internals and avoids creating a circular authority problem.

The final mutation path is still:

```text
DamageEngine.applyDamage()
  -> DamageTimingRiderAdapter.applyToDamagePacket()
  -> ActorEngine.applyDamage()
  -> DamageResolutionEngine.resolveDamage()
```

## Advantageous Attack

After Phase 10F, `Advantageous Attack` had the correct adapter-layer shape but was not wired into a damage path.

After Phase 10G, `DamageEngine` callers can trigger that rider when they supply attacker/sourceActor and target context:

```text
hit + target has not acted yet -> add one-half actor level to damage
```

This is still not enough to mark it `implemented_correct` by itself. Remaining work:

1. Audit all damage callsites and pass attacker/sourceActor where available.
2. Add exact acted-this-encounter flags instead of relying on conservative turn-order inference.
3. Quarantine or remove any old wrong-shape attack-option metadata.
4. Add focused tests proving it modifies damage, not attack.

## Safety boundaries

Phase 10G does not:

- mutate HP directly
- call `DamageResolutionEngine` directly
- edit `ActorEngine` internals
- auto-promote feats to correct
- implement reaction damage prevention or delayed damage

## Promotion guidance

After Phase 10G:

- Damage rider feats can be reviewed as `implemented_partial` when they use supported `DamageTimingRiderAdapter` metadata and route through `DamageEngine`.
- `Advantageous Attack` can move out of pure wrong-shape territory only after old attack metadata is quarantined and tests prove the damage workflow sends correct context.
