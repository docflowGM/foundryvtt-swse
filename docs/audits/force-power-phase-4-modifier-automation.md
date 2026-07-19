# Force Power Phase 4 — Modifier Automation

Phase 4 removes known incorrect or dead modifier behavior and replaces it with guarded, source-aligned handling.

## Battle Strike

Battle Strike now creates a dedicated next-attack payload instead of being confused with the unrelated `Force Strike` name handler.

The payload records:

- +1 Force bonus to the next qualifying attack
- tiered extra damage of 1d6, 2d6, or 3d6
- consume-on-next-qualifying-attack semantics
- source power identity

The current phase stores this payload on an ActiveEffect. Consumption by the canonical attack workflow is intentionally deferred until the attack pipeline gains a dedicated next-attack consumer. The effect is therefore marked pending rather than falsely declared fully automated.

## Battlemind

The prior implementation comment said defenses and damage, but the runtime applied defenses and attack.

Phase 4 corrects the runtime to apply:

- the verified defense bonus to Reflex, Fortitude, and Will
- the same bonus to damage

It no longer applies an attack bonus.

## Prescience and Force Weapon

The old handlers wrote to dead derived paths:

- `system.derived.insight`
- `system.derived.weaponBonus`

No canonical reader consumes those paths. Phase 4 suppresses those writes and leaves both powers assisted until their exact source-backed modifier targets are reconciled.

## Force Strike alias safety

The legacy `Force Strike` name handler is disabled so it cannot be mistaken for Battle Strike. No speculative aliasing is performed.

## Installation

The Phase 4 modifier layer is installed after Phase 3 during Force-power hook initialization. This preserves the Phase 3 corrections while allowing Phase 4 to take precedence for modifier-specific powers.

## Scope limits

This phase does not claim full Battle Strike automation because the attack pipeline does not yet consume and expire the next-attack payload. It also does not guess the rules for Prescience or Force Weapon.
