# Class Phase 6F-8 — Master Saboteur reroll

**Date:** 2026-11-02
**Base:** merged main `62169f621e15409268ca8f91efd846a3a2c118d9`
**Branch:** `feat/class-phase-6f8-master-saboteur-reroll`
**Review:** separate draft PR; Foundry v13 runtime certification pending.

## Source and scope

*The Force Unleashed Campaign Guide*, **Saboteur — Master Saboteur**: at Saboteur class level 10, the character can reroll a Mechanics check made to **disable a device** or **handle explosives**, using the better result.

The rule is limited to these two Mechanics applications. It does not apply to jury-rigging, repairing objects, other Mechanics checks, or Use Computer.

## Implementation and choice

- `scripts/engine/combat/class-master-saboteur-reroll.js` provides a pure class-Item authority and an injected-die roll selector.
- Existing `MechanicsUses.disableDevice` and `MechanicsUses.handleExplosives` call the selector, using the existing `RollEngine.safeRoll('1d20')`. The selected higher roll determines the DC comparison and the printed consequence for missing a DC by 5 or 10.
- There is no consumption limit or downside to the permitted reroll, so these two in-system actions perform it automatically at class level 10; ties keep the first die. This is a convenience policy, not a new extra reroll resource.
- Chat shows the original roll, the reroll, and which value was kept; the return receipt retains these for a GM audit.
- Ordinary/earlier-level paths roll once.
- `tests/class-phase-6f8-master-saboteur-reroll.test.mjs` covers level threshold, correct application scope, better-of-two selection, ties, one-roll noneligible cases, malformed roll refusal, and source-level Mechanics integrations.

## Known boundaries

- This integrates the existing **Consolidated Skill Uses** implementations; other entry points that independently roll Mechanics without calling those methods need a separate audit. Do not certify universal reroll coverage from this PR.
- The full Foundry v13 flow, chat rendering, action types, effects of traps/detonations and any alternative Mechanics dialog need live verification.
- No class, talent, feat, weapon, item or compendium records were rewritten; no merge is authorized by this checkpoint alone.
