# Species Phase 3 Runtime Rules

This pass wires the cleaned canonical species data into chargen runtime behavior instead of only storing it in `packs/species.db`.

## Implemented

### Variant profile selection

Species with alternate profiles remain a single browse row in the species step. The details rail now exposes a Default option plus variant cards. Selecting a variant overlays its profile before the species pending context is built, so ability modifiers, movement, languages, and canonical traits come from the selected profile without duplicating the species in the list.

### Primitive proficiency suppression

Species marked with the `Primitive` canonical trait now carry a structured rule:

- `system.primitive = true`
- `system.suppressedClassProficiencies = [Weapon Proficiency (Heavy Weapons), Weapon Proficiency (Pistols), Weapon Proficiency (Rifles)]`

The class grant ledger reads the pending species context and suppresses those class-granted proficiencies during chargen. Suppressed grants are kept in `suppressedClassGrants`/`flags.swse.suppressedClassAutoGrants` for debugging and future UI explanation.

### Shard and Replica Droid builder hooks

Shard and Replica Droid species records now include `system.droidBuilder` constraints. Selecting either species makes the Droid Builder step applicable for a normal character progression session.

Shard constraints currently allow a droid shell-style build with Shard-appropriate system categories and preserve Constitution. Replica Droid constraints use a constrained 4th-degree chassis, no Constitution score, Small/Medium size, and two free species bonus equipment choices from the allowed HRD equipment list.

### Species rule materialization

The actor materialization helper now persists selected variant metadata, primitive suppression flags, no-Constitution rules, retained-Constitution droid-shell rules, and droid-builder species flags.

## Needs runtime confirmation

- The Droid Builder already has several pre-existing cost/budget assumptions. This pass fixes double-counting in the touched purchase path and makes Replica Droid bonus equipment cost 0 for the first two valid choices, but a full droid-builder economy review is still separate.
- Shard droid-shell behavior is wired as a constrained builder path. It still needs table testing to confirm every allowed/blocked system matches the intended Shard shell rules.
- Primitive suppression is wired through the class grant ledger and finalizer. Runtime should confirm that Soldier/Scout/Noble primitive characters do not receive Pistol/Rifle/Heavy Weapon proficiencies but still receive allowed grants such as Simple Weapons or armor.

## Still separate follow-up phases

- Arkanian Offshoot Strength-or-Dexterity ability choice UI.
- Republic Clone fixed ability array plus one +2 creation choice.
- More granular UI explanations for suppressed class proficiencies in the summary rail.
