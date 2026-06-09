# Combat Phase 2A — Damage Packet Handoff

## Purpose

Phase 1 built the combat workflow road and preserved attack context into chat. Phase 2A starts consuming that context at the next seam: damage application.

This is still a bridge phase, not a full damage-rules rewrite. The goal is to stop chat damage buttons from applying anonymous, selected-token-only damage with no knowledge of the attack that created the damage roll.

## Implemented

- Added `scripts/engine/combat/damage-packet-builder.js`.
- Damage rolls now build an apply-damage action on the damage chat card.
- Apply Damage buttons now carry:
  - attacker
  - target
  - weapon
  - raw rolled damage
  - adjusted damage amount
  - damage type
  - workflow id/action id
  - hit/miss state
  - natural 1/natural 20 state
  - area/Burst/Autofire tags
  - stun/ion flags
  - ammo cost metadata
  - encoded workflow context
- Apply Damage now prefers the explicit target from the workflow/chat button.
- If no explicit target can be resolved, Apply Damage falls back to selected tokens.
- Damage packet options are passed through `actor.applyDamage()`, which delegates to `ActorEngine.applyDamage()`.
- Normal misses no longer offer Roll Damage when the workflow context says the attack missed and has no damage-on-miss rule.
- Area/autofire-style misses with `halfDamageOnMiss` metadata can still offer damage and apply half damage.
- Stun and ion are now carried as packet damage types into the existing damage resolution path.

## Intentionally not implemented yet

- Full ion special handling: half HP damage while preserving original damage for DT.
- Ion target-category enforcement beyond packet metadata.
- Evasion / Improved Evasion automatic suppression of half area damage.
- Autofire multi-target area adjudication.
- Ammo spending/rollback.
- Stun selector UI for stun-capable weapons.
- Recurring hazard packet support for fire/acid.

## Next likely phase

Phase 2B should harden special damage modes:

1. Ion packets:
   - eligible targets only: droids, vehicles, electronic devices
   - half HP damage
   - original rolled damage for damage threshold measurement
2. Stun packets:
   - route stun damage cleanly through existing threshold/condition logic
   - prepare weapon-mode selector metadata
3. Area damage + Evasion:
   - use packet context to suppress or reduce half damage on miss where Evasion applies

