# Combat Phase 1E — Workflow Context Preservation

Runtime files changed in this phase. This is still road-building, not a Burst Fire/Autofire/Grapple/Stun/Ion rules correction pass.

## Purpose

Phase 1B/1C introduced the thin Combat Workflow Registry and routed major combat actions through it. Phase 1E makes the next critical seam safer: the combat context now survives from the action workflow into attack rolls, chat cards, and damage buttons.

## What this phase adds

- A lightweight combat context transport helper:
  - `summarizeCombatWorkflowContext()`
  - `encodeCombatWorkflowContext()`
  - `decodeCombatWorkflowContext()`
  - `mergeCombatWorkflowContextIntoRollOptions()`
- Attack rolls now normalize workflow context before calling `CombatOptionResolver`.
- The context mapper aligns workflow flags with resolver-facing keys:
  - `isAiming` -> `aim`
  - `isCharging` -> `charge`
  - `isAutofire` -> `autofire`
  - `isArea` -> `areaAttack` / `isAreaAttack`
  - `mode` -> `attackMode`
  - `maneuver` -> `maneuver`
- Attack chat cards now carry a transport-safe workflow context summary in flags/render context.
- Holo damage buttons now include encoded workflow context.
- Full Attack combined-card damage buttons now include encoded workflow context.
- Chat damage button handlers now decode context and pass it into `SWSERoll.rollDamage()`.
- Damage rolls now preserve workflow context into their own chat cards.

## What this intentionally does not fix yet

- Burst Fire legality, ammo cost, and no-half-on-miss behavior.
- Autofire hit/miss area damage and Evasion behavior.
- Natural 1 automatic miss handling.
- Stun/Ion packet behavior.
- Sonic/Deflect packet behavior.
- Grapple state-machine rules.
- Healing/repair packet rules.

Those later fixes now have a safer context road to travel on.

## Files touched

- `scripts/engine/combat/workflow/combat-context-serializer.js`
- `scripts/combat/rolls/attacks.js`
- `scripts/combat/rolls/damage.js`
- `scripts/engine/rolls/swse-roll-engine.js`
- `scripts/ui/chat/chat-interaction-bridge.js`
- `scripts/engine/combat/full-attack-executor.js`
- `templates/chat/holo-roll.hbs`
