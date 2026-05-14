# PoisonEngine Phase 4 - Poison Talents and Recurring Damage

This pass extends the poison foundation with two practical runtime pieces:

- `Modify Poison` is now represented in the Special Abilities pack and recognized by `PoisonEngine`. Actors with the talent can select Contact/Ingested/Inhaled delivery methods for poison use, with a Knowledge (Life Sciences) check against the poison's treatment DC.
- Malkite support now has explicit reusable talent entries for Modify Poison, Numbing Poison, Undetectable Poison, and Vicious Poison.
- `Jagged Weapon` is now automated as a queued start-of-turn recurring damage rider. When a Jagged Sith weapon damages a living creature, the target receives a one-shot pending recurring damage instance for 1d4 damage at the start of its next turn.

The recurring damage queue currently lives under `flags.swse.pendingRecurringDamage` and is intentionally generic enough to be reused later for other start-of-turn damage effects.

## Later seams

- A fuller hazard-area manager can drive atmospheric poison exposure start/end events.
- A dedicated treatment UI can list all active poisons on a target rather than requiring macro/API use.
- Jagged Weapon currently applies as simple damage and does not yet carry a typed wound/bleed category beyond its `slashing` damage metadata.
