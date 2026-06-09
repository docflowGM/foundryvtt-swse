# SWSE Combat Phase 1D - Action Economy Hardening

Runtime implementation phase. This pass keeps the Phase 1 workflow-road focus and hardens the canonical action economy before later combat rule fixes are added.

## Scope

This phase does not implement Burst Fire, Autofire, Stun/Ion, Grapple, healing, or ammo rules. It only aligns action economy behavior and workflow UI availability with the existing action-economy authorities.

## What changed

### RAW substitution direction

`ActionEngine` now treats action substitution in the correct direction:

- Standard actions cannot be paid with Move or Swift actions.
- Move actions can be paid with Move, or by sacrificing Standard.
- Swift actions can be paid with Swift, then by sacrificing Move or Standard.
- Multiple Swift costs can be paid by sacrificing higher actions in sequence.

This replaces the earlier reversed/upward substitution behavior.

### Full-Round actions

Full-Round actions now require and consume the actor's Standard, Move, and Swift economy. A Full-Round action is unavailable once any of those core action pools has already been spent.

This repairs the previously audited seam where Full-Round left Swift available.

### Pure engine hardening

`ActionEngine` now exposes:

- `normalizeActionType()`
- `costForActionType()`
- safer state normalization
- safer cost normalization
- non-mutating failure behavior that returns the original state instead of a partially spent clone
- clearer visual/tooltip output for Full-Round availability and action substitution

### Sheet economy application

`SWSEV2CharacterSheet._applyActionEconomy()` now:

- asks the canonical V2 `ActionEngine` for costs and consumption;
- applies the policy controller to the engine result instead of calling policy before a result exists;
- commits legal consumption through `ActionEconomyPersistence.commitConsumption()` when available;
- handles Reaction spending through the reaction path instead of the Standard/Move/Swift engine;
- allows loose/no-enforcement over-spends without corrupting tracked turn state;
- surfaces policy warnings through notifications.

### Combat action availability preview

Combat action rows now get lightweight economy preview metadata while rendering:

- `economyAvailable`
- `availabilityLabel`
- `economyViolations`
- `disabled` in Strict enforcement only

Combat action groups also show an availability count such as `3/5 available` when action economy is being tracked.

## What this phase deliberately did not fix

- Fight Defensively RAW bonus/action mode
- Aim/Brace/Charge state lifecycles
- Burst Fire/Autofire/ammo/stun UI
- Damage context preservation beyond the Phase 1C handoff
- Grapple state machine
- Healing/repair packets
- Feat/talent metadata activation

## Validation

Static validation performed:

```text
node --check scripts/engine/combat/action/action-engine-v2.js
node --check scripts/engine/combat/action/action-engine.js
node --check scripts/engine/combat/action/action-policy-controller.js
node --check scripts/sheets/v2/character-sheet.js
```

A small Node module sanity check was also run against `ActionEngine` to confirm baseline Standard, Move, Swift, Full-Round, two-Swift, and Full-after-Swift behavior.

## Next recommended phase

Phase 1E should preserve workflow context into the next high-risk handoff: chat damage buttons and damage resolution. That should happen before implementing individual damage rules like Burst Fire, Autofire, Stun, Ion, Sonic, or Evasion.
