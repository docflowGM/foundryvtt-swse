# Species Phase 8: Special Abilities Compendium and GM Grants

This phase adds a reusable `Special Abilities` Item compendium so species-derived abilities are no longer locked to species selection.

## What changed

- Added `packs/special-abilities.db` and registered it in `system.json`.
- The pack includes drag-and-drop actor abilities for Rage, Bellow, Confusion, Pacifism, Pheromones, Startle, Shapeshift, Energy Surge, Force Blast, Natural Telepath, Broadcast Telepath, Roller, and Natural Weapon Poison.
- The pack also includes common natural weapon templates and reusable passive/reroll templates.
- Actor-owned `combat-action` items with `flags.swse.isActorAbility` or `system.executionModel = actor-special-ability` now route through the species activated ability runtime.
- The combat action sheet list now shows GM-granted special abilities as well as species-granted abilities.
- Reroll hooks now read actor-owned special ability items in addition to species flags.
- Derived skill totals now include passive skill bonuses carried by actor-owned special ability items.

## GM workflow

Drag an item from the `Special Abilities` compendium onto an actor. If it is an automated action, it appears in the combat action list and uses the same runtime handler as the species version. If it is a passive or reroll template, the actor engine/roll hooks read its flags.

## Current limits

- Natural Weapon Poison is available as a manual post-hit rider action. A fully automatic natural-weapon post-hit hook should be a later combat-pipeline pass.
- Passive templates are intentionally generic. For unusual cases, edit the item flags after dragging or create a specific copy in a world compendium.
