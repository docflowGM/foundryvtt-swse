# Species Phase 7: Rage reuse, advisory immunities, and Force-like species checks

## Rage

The repo already had `scripts/engine/species/rage-engine.js`; this phase reuses it instead of creating a parallel rage system.

Species traits named `Rage` now materialize as actor-owned `combat-action` items with `speciesAbilityId: rage`. Activating that action routes through `SpeciesActivatedAbilityEngine.useRage`, which delegates to `RageEngine.startRage`. The actor also receives `flags.swse.hasRage` and `flags.swse.rageUnlocked` during species finalization so rage-feat prerequisite logic has a stable hook.

`RageEngine.hasRageTrait` now recognizes the core rage species directly: Wookiee, Chistori, Mantellian Savrip, and Rakata. Feat modifications remain centralized in `RageEngine`, including Extra Rage, Dreadful Rage, Controlled Rage, Focused Rage, Powerful Rage, and Channel Rage-style rule primitives.

## Immunities

Immunities and resistances are now recorded as advisory system data rather than hard-blocking every edge case. The schema includes `system.immunities` on actors and `system.immunities` on species. Species finalization mirrors the ledger to:

- `system.immunities.species`
- `flags.swse.speciesImmunities`

This supports GM-facing display and future engine hooks for keys such as force, poison, drowning, radiation, vacuum, and noncorrosive atmospheric hazards.

## Force-like species checks

Species abilities that resemble Use the Force but are not normal Force-suite powers now use a shared resolver:

1. If `Use the Force` is trained/available on the actor, roll with that skill total.
2. Otherwise roll `1d20 + Charisma modifier + half character level`.

Felucian Force Blast now uses this resolver. Draethos Natural Telepath and Celegian Broadcast Telepath are materialized as species actions and use the same resolver, with Natural Telepath carrying its +5 species bonus.

## Environmental gear

Environmental penalties remain GM-adjudicated, but required support gear is now purchasable/tracked in the survival equipment store:

- Antiox Breath Mask
- Breathing Apparatus
- Transliterator
- Ultraviolet Visor
- Celegian Life-Support Chamber
- Ubese Environmental Suit

## Movement abilities note

The actor model can support movement toggles through ActiveEffects, as shown by Energy Surge and Metamorph. The next movement automation candidate is Lurmen Roller: it should be a swift-action toggle that adds +4 walk speed while limiting available actions to Move, Withdraw, Second Wind, Drop Item, Recover, and Run. Flight and heavy-load restrictions should stay advisory until encumbrance and movement action validation are centralized.
