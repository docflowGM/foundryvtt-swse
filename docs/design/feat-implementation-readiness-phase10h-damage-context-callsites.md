# Feat Implementation Readiness Phase 10H: Damage Context Callsites

Phase 10H audits the damage callsites after Phase 10G wired `DamageTimingRiderAdapter` into `DamageEngine`.

The goal is to avoid the next common failure mode: applying feat damage riders to damage that is not actually a successful attack from the actor who owns the feat.

## Key finding

Only one reviewed callsite is immediately safe for default feat damage rider context:

```text
scripts/engine/combat/CombatEngine.js
CombatEngine.resolveAttack -> DamageEngine.applyDamage(target, damage)
```

That path has real attack context:

```text
attacker
target
weapon
hit result
damage type
critical context when available
```

This is the correct first path for `Advantageous Attack` and other successful-hit damage riders.

## Manual and subsystem damage should not trigger hit riders by default

The following paths should preserve source metadata where useful, but should explicitly avoid default on-hit feat damage riders:

```text
scripts/apps/damage-app.js
scripts/engine/poison/poison-engine.js
scripts/engine/combat/recurring-damage-engine.js
scripts/engine/combat/subsystems/vehicle/vehicle-collisions.js
```

Reason: these calls are manual damage, subsystem damage, recurring damage, poison damage, or collision damage. Some have a source actor, but they are not normal weapon hit damage events.

## Phase 10H classifications

### Safe to wire attack context

```text
CombatEngine.resolveAttack
```

Recommended options for the next patch:

```js
{
  sourceActor: attacker,
  attacker,
  targetActor: target,
  weapon,
  hit: true,
  isHit: true,
  critical: Boolean(context.critical),
  isCritical: Boolean(context.critical),
  damageType: weapon.system.combat?.damageType || 'kinetic'
}
```

### Manual damage, no attacker

```text
DamageApp._applyDamage
```

Recommended options:

```js
{
  bypassDT: this.bypassDT,
  source: 'manual-damage',
  targetActor: this.actor,
  manualDamage: true,
  skipDamageTimingRiders: true
}
```

### Recurring/subsystem damage

```text
RecurringDamageEngine.tickRecurringDamage
VehicleCollisions.ram
PoisonEngine poison damage paths
```

Recommended default:

```js
{
  sourceActor,
  targetActor,
  skipDamageTimingRiders: true
}
```

A future subsystem-specific feat can opt in explicitly, but the default must be no on-hit rider.

## Advantageous Attack status after 10H

`Advantageous Attack` is still not ready for `implemented_correct`.

After 10H, we know the exact path that must be patched first:

```text
CombatEngine.resolveAttack
```

Remaining before promotion:

1. Patch `CombatEngine.resolveAttack` to pass attack context into `DamageEngine.applyDamage`.
2. Patch manual/subsystem damage calls to pass `skipDamageTimingRiders: true`.
3. Add a skip guard to `DamageTimingRiderAdapter` if not already present.
4. Quarantine or remove old wrong-shape attack metadata.
5. Add focused tests proving `Advantageous Attack` adds damage, not attack.

## Next recommended phase

Phase 10I should be a small code patch:

- wire `CombatEngine.resolveAttack` with truthful attack context
- add explicit skip flags to manual/subsystem damage
- add an audit that `Advantageous Attack` cannot trigger without attack context
