# Phase 10H Damage Context Callsites Report

OK: true
Errors: 0
Warnings: 4

## Errors

- None

## Warnings

- CombatEngine.resolveAttack still appears to call DamageEngine.applyDamage without full attacker/target/weapon/hit context. Phase 10I should patch this first.
- DamageApp manual damage does not explicitly pass skipDamageTimingRiders: true. Phase 10I should add this guard.
- RecurringDamageEngine does not explicitly skip damage timing riders; recurring ticks should not retrigger on-hit riders by default.
- VehicleCollisions.ram does not explicitly skip damage timing riders; collision damage should not trigger weapon-hit riders by default.
