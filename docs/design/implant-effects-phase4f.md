# Implant Effects Phase 4F

Phase 4F finishes the implant implementation by adding the actual effects for the known implant catalog while preserving the earlier cybernetics boundary.

## Runtime policy

Only explicitly tagged, installed, and active implant equipment can apply implant effects. Generic cybernetic prostheses, biotech references, droid systems, and Cybernetic Surgery remain outside these runtime rules unless an item is explicitly tagged as an implant by the GM.

Subelectronic Converter is intentionally special: it remains mostly metadata/manual, but it does apply its active -2 Will Defense penalty. Its droid/Force interaction is exposed as metadata and a GM-facing note rather than broad Force automation.

## Implemented effects

| Implant | Runtime effect |
|---|---|
| Bio-Stabilizer Implant | Immune to poison while installed and active |
| Cardio Implant | +5 maximum hit points while installed and active |
| Combat Implant | Eliminates weapon nonproficiency penalties while installed and active |
| Memory Implant | Adds Knowledge reroll chat metadata while installed and active |
| Nerve Reinforcement Implant | +5 Damage Threshold against stun damage while installed and active |
| Regenerative Implant | Doubles natural healing in the GM natural-healing workflow while installed and active |
| Sensory Implant | Exposes low-light vision and darkvision in derived implant state while installed and active |
| Subelectronic Converter | Metadata/manual except active -2 Will Defense; GM adjudicates droid-targeting Force use |

## Code slots

- `scripts/engine/implants/ImplantEffectRules.js` owns implant-specific effects.
- `scripts/engine/implants/ImplantRules.js` still owns generic implant drawbacks and active implant detection.
- `scripts/actors/derived/hp-calculator.js` consumes max HP implant bonuses.
- `scripts/engine/combat/combat-roll-math.js` consumes Combat Implant nonproficiency suppression.
- `scripts/engine/combat/threshold-engine.js` consumes Nerve Reinforcement stun DT.
- `scripts/holonet/subsystems/gm-healing-trigger.js` consumes Regenerative Implant natural healing multiplier.
- `scripts/rolls/skills.js` exposes Memory Implant Knowledge reroll metadata.
- Gear tab implant UI displays active effects.

## Boundaries

This phase does not automate Cybernetic Surgery, install/remove costs, surgery checks, Force power target legality, or broad cybernetic classification. Those remain GM/player adjudication and metadata unless deliberately implemented in a later dedicated subsystem.
