# PoisonEngine Phase 3: Natural Healing and Sith Alchemy Hooks

This pass extends the PoisonEngine foundation without creating a parallel poison/talent system.

## Natural Healing

`Natural Healing` is represented as a reusable talent/special-ability entry in `packs/special-abilities.db`.

When a healer has Natural Healing, PoisonEngine treatment chat now notes that Treat Poison can be attempted without a Medical Kit if the GM determines appropriate natural substitutes are available. This intentionally stays advisory because the rule depends on GM approval of the available environment/substitutes.

## Vile Weapon

`Vile Weapon` is represented as a Sith alchemy passive trait. Weapons with any of the following are treated as intrinsically laced with Sith Poison:

- `flags.swse.vileWeapon = true`
- `flags.swse.sithAlchemy.vileWeapon = true`
- `flags.swse.sithAlchemy.trait = "Vile Weapon"`
- matching Sith alchemy trait text/name on the weapon

Unlike normal applied weapon coatings, intrinsic Vile Weapon poison is not consumed after triggering.

## Vile Natural Weapons

Actors with a `Vile Natural Weapons` ability/trait cause their natural weapon hits to trigger Sith Poison through the same PoisonEngine weapon-rider path.

## Jagged Weapon

`Jagged Weapon` has been added as a reusable Sith alchemy trait entry for GM grants/data consistency, but the automatic start-of-next-turn 1d4 damage tick is intentionally marked as a later recurring-effect pass. It should share the same turn-tick infrastructure used by poison/hazard recurrence rather than being implemented as a one-off macro.

## Still deferred

- Sith armor traits such as Cortosis Weave, Dark Side Energy, Dark Side Stealth, Imposing Form.
- Jagged Weapon automatic recurring damage.
- Store/workbench UI for applying Sith alchemy traits directly to items.
