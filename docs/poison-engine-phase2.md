# Poison Engine Phase 2

This phase expands the poison foundation from passive resolution into usable runtime workflows.

## Added

- Poison items can now be used from actor actions through `PoisonEngine.usePoisonItem`.
- A poison use dialog supports:
  - Apply to selected target.
  - Expose selected target.
  - Coat a weapon when the poison supports contact delivery.
- Coated weapons store a stable poison payload on `flags.swse.appliedPoison`.
- `CombatEngine.resolveAttack` now invokes both natural-weapon poison riders and weapon-coating poison riders after damage is applied.
- Weapon coatings clear after their configured trigger count is consumed.
- Malkite Techniques can now be granted from the Special Abilities compendium.
- Malkite Techniques applies a synthetic poison to a qualifying non-energy slashing/piercing weapon and requires the later attack roll to exceed the target's Fortitude Defense before the poison takes hold.
- Treatment can now be resolved by `PoisonEngine.treatPoisonWithSkill`, which rolls the healer's Treat Injury or the poison's configured treatment skill.
- Sith Poison now supports its special recurrence shape more accurately:
  - Initial attack remains Fortitude.
  - Recurrence uses Will.
  - Failed recurrence attacks accumulate toward automatic neutralization instead of always clearing immediately.
  - Dark Side Score increase is treated as the recurrence effect rather than a normal initial poison side effect.
- Atmosphere/while-exposed poisons can be marked no-longer-exposed through `PoisonEngine.endPoisonExposure`.

## Remaining later hooks

- A dedicated poison management UI/panel for active poisons on an actor.
- Full dose inventory consumption and pricing.
- A combat prompt that offers poison coating immediately after qualifying inventory use instead of through the generic item-use dialog.
- A stronger encounter-use reset workflow for Malkite Techniques when encounter tracking is finalized.
