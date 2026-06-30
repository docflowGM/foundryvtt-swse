# Phase 9F design — Force Unleashed feat implementation readiness

## Purpose

The Force Unleashed feat set is context-heavy: Force power activation bonuses, Force Point riders, rage-state rules, autofire/cover/positioning rules, and Unleashed capability metadata.

## Implementation homes

- Scoped Forceful activation bonuses: Force power activation context bridge.
- Forceful Strike / Forceful Telekinesis: Force power result + Force Point spend prompt.
- Forceful Recovery: second wind + Force suite recovery choice.
- Rage feats: rage-state service, not static sheet math.
- Cover/autofire/soft-cover/positioning feats: combat option/result hooks.
- Unleashed: metadata until a Destiny Point / Unleashed Ability subsystem exists.

## Key finding

**Advantageous Attack** demonstrates why this phase checks correctness rather than presence. Existing metadata is wrong-shape: it describes an attack bonus keyed to speed, while the source behavior is a damage rider against enemies who have not acted.

## Next coding recommendation

Implement in this order:

1. Correct wrong-shape Advantageous Attack metadata and add a damage-result timing hook.
2. Add Force power activation context bridge for Forceful Grip/Saber Throw/Slam/Stun/Throw/Weapon.
3. Add Force Point result-rider prompts for Forceful Strike and Forceful Telekinesis.
4. Add second-wind Force-suite recovery for Forceful Recovery.
5. Add rage-state support for Controlled/Focused/Powerful Rage.
6. Add combat option/result hooks for Angled Throw, Crossfire, Strafe, Swarm, and related combat feats.
