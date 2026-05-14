# SWSE Poison Engine Bundle

This bundle consolidates all poison-engine work from the current session into one drop-in changed-files package.

## Included subsystems

- PoisonEngine and PoisonRegistry.
- Structured poison definitions and `packs/poisons.db`.
- Poison item schema and actor poison-tracking schema.
- CombatEngine hooks for natural-weapon poison riders and weapon-coated poison riders.
- Poison item usage dialog support: apply/expose target and coat qualifying weapons.
- Treatment support through Treat Injury, including Natural Healing bypass notes for GM-approved natural substitutes.
- Malkite Poisoner hooks for Malkite Techniques, Modify Poison, Numbing Poison, Undetectable Poison, and Vicious Poison.
- Sith Alchemy hooks for Vile Weapon, Vile Natural Weapons, and Jagged Weapon recurring damage.
- Special ability entries related to poison, Sith alchemy, and Malkite talents.

## Poison definitions included

- Knockout Drugs
- Paralytic Poison
- Dioxis
- Sith Poison
- Obah
- Null Gas
- Trauger
- Bundar Root
- Quongoosh Essence
- Devaronian Blood-Poison
- Falsin's Rot
- Chuba Poison
- Irksh Poison
- Trihexalon
- Distilled Trihexalon
- Mantellian Savrip Natural Poison
- Malkite Techniques Poison

## Known later hooks

- A richer active-effects panel adapter can read `flags.swse.activePoisons`, `flags.swse.pendingRecurringDamage`, and poison-sourced condition-track flags.
- Full inventory dose tracking and poison economy/store UI are still separate inventory work.
- Sith Poison's Force Point recurrence has engine support but should be checked again when the Force Point spending flow is centralized.
