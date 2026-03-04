# PROGRESSION Execution Model - Schema Documentation

## Overview

The PROGRESSION execution model handles lifecycle-triggered ability effects such as wealth grants, item grants, and other progression-dependent actions.

**Status: INFRASTRUCTURE ONLY - Phase 1-6 Complete**

- ✅ Schema defined
- ✅ Contract validation implemented
- ✅ Event routing scaffolded
- ✅ Idempotency guard structure initialized
- ⏳ Effect processing (Phase 4+, NOT IMPLEMENTED)
- ⏳ Currency mutation (Phase 4+, NOT IMPLEMENTED)
- ⏳ Formula evaluation (Phase 4+, NOT IMPLEMENTED)

## System.abilityMeta Schema

```javascript
{
  executionModel: "PROGRESSION",
  abilityMeta: {
    // Required: Lifecycle event that triggers this ability
    trigger: "LEVEL_UP" | "CLASS_LEVEL_GAIN" | "FIRST_ACQUIRED",

    // Required: Effect definition
    effect: {
      // Required: Type of effect to apply
      type: "GRANT_CREDITS" | "GRANT_XP" | "GRANT_ITEM" | "CUSTOM",

      // For GRANT_CREDITS / GRANT_XP:
      // Option 1: Formula (evaluated per level)
      formula?: "500 * CLASS_LEVEL",

      // Option 2: Fixed value
      value?: 5000,

      // For GRANT_ITEM:
      // Item UUID from compendium or actor items
      itemUuid?: "Compendium.foundryvtt-swse.equipment.Item.xxx",

      // Optional: Only grant once per level up
      oncePerLevel?: true,

      // Optional: Additional metadata
      metadata?: {}
    }
  }
}
```

## Examples

### Example 1: Wealth (500 credits per level)

```javascript
{
  name: "Wealth",
  type: "feat",
  system: {
    executionModel: "PROGRESSION",
    abilityMeta: {
      trigger: "LEVEL_UP",
      effect: {
        type: "GRANT_CREDITS",
        formula: "500 * CLASS_LEVEL"
      }
    }
  }
}
```

**Behavior:**
- Triggers every time actor levels up (in any class)
- Formula `500 * CLASS_LEVEL` is evaluated
- Result granted as credits (NOT YET IMPLEMENTED)
- Will prevent double-grant via `oncePerLevel: true` when enabled

### Example 2: Starting Equipment (One-time grant)

```javascript
{
  name: "Starting Equipment",
  type: "feat",
  system: {
    executionModel: "PROGRESSION",
    abilityMeta: {
      trigger: "FIRST_ACQUIRED",
      effect: {
        type: "GRANT_ITEM",
        itemUuid: "Compendium.foundryvtt-swse.equipment.Item.backpack"
      }
    }
  }
}
```

**Behavior:**
- Triggers once when ability is acquired
- Grants specified item to actor (NOT YET IMPLEMENTED)

### Example 3: Bonus XP per Level

```javascript
{
  name: "Bonus Experience",
  type: "feat",
  system: {
    executionModel: "PROGRESSION",
    abilityMeta: {
      trigger: "LEVEL_UP",
      effect: {
        type: "GRANT_XP",
        value: 1000,
        oncePerLevel: true
      }
    }
  }
}
```

**Behavior:**
- Triggers on each level up
- Grants 1000 XP (NOT YET IMPLEMENTED)
- Respects `oncePerLevel` guard (NOT YET IMPLEMENTED)

## Trigger Types

### LEVEL_UP
Fired when an actor gains any level in any class.
**Context:** `{ classLevel: number, classId: string }`

### CLASS_LEVEL_GAIN
Fired when an actor gains a level in a specific class.
**Context:** `{ classLevel: number, classId: string }`

### FIRST_ACQUIRED
Fired the first time the ability is added to an actor.
**Context:** `{}`

## Effect Types

### GRANT_CREDITS
Grants wealth/credits to actor.
- **Requires:** `formula` XOR `value`
- **Status:** NOT IMPLEMENTED
- **Future behavior:** Will add to actor.system.currency.credits

### GRANT_XP
Grants experience points to actor.
- **Requires:** `formula` XOR `value`
- **Status:** NOT IMPLEMENTED
- **Future behavior:** Will add to actor.system.xp.value

### GRANT_ITEM
Grants an item by UUID to actor.
- **Requires:** `itemUuid`
- **Status:** NOT IMPLEMENTED
- **Future behavior:** Will clone item and add to actor

### CUSTOM
Custom effect handler (for future extensibility).
- **Requires:** Effect implementation
- **Status:** NOT IMPLEMENTED

## Idempotency & Duplicate Prevention

### _progressionHistory Structure

Each actor maintains a progression history to prevent double-granting:

```javascript
actor._progressionHistory = {
  [abilityId]: {
    levelsTriggered: [3, 4, 5],  // Which levels triggered this ability
    lastTriggeredAt: timestamp    // For time-based duplicate detection
  }
}
```

**Status:** SCAFFOLDING ONLY
- Structure is initialized but not used for duplicate detection
- Will be used in Phase 4+ when effect processing is implemented

### oncePerLevel Flag

When `effect.oncePerLevel = true`:
- Ability will only grant once per character level
- If actor re-levels or sheet reloads, grant is not duplicated
- Tracked in `_progressionHistory[abilityId].levelsTriggered`

**Status:** NOT IMPLEMENTED
- Flag is validated but not enforced
- Will be enforced in Phase 4+

## Contract Validation

All PROGRESSION abilities must pass `ProgressionContractValidator.validate()`:

✅ **Validates:**
- `executionModel === "PROGRESSION"`
- `abilityMeta` exists
- `abilityMeta.trigger` is valid
- `abilityMeta.effect` exists and has valid type
- Effect-specific fields are present (formula/value for credits, itemUuid for items)

❌ **Throws if:**
- Any required field is missing
- Trigger type is not recognized
- Effect type is not recognized
- Effect-specific requirements are not met

## Implementation Status

### Completed (Phases 1-6)
✅ Type definitions (progression-types.js)
✅ Contract validation (progression-contract.js)
✅ Event routing scaffolding (progression-event-processor.js)
✅ Adapter registration (progression-adapter.js)
✅ Ability coordinator integration (ability-execution-coordinator.js)
✅ Progression engine hooking (progression-engine.js)
✅ Idempotency guard scaffolding (actor._progressionHistory)

### NOT IMPLEMENTED (Phase 4+)
❌ Effect processing (_processEffect)
❌ Currency mutation (credits, XP)
❌ Formula evaluation (500 * CLASS_LEVEL)
❌ Item cloning and granting
❌ Duplicate prevention logic
❌ oncePerLevel enforcement

## Key Safety Guarantees

1. **No Currency Mutation**
   - GRANT_CREDITS does not add credits
   - GRANT_XP does not add XP
   - All writes deferred to Phase 4+

2. **No Automatic Granting**
   - Abilities are registered and validated
   - Events are processed but effects are logged only
   - No actor state changes until Phase 4+

3. **Deterministic Behavior**
   - Event processing happens in consistent order
   - Idempotency tracking is initialized for future use
   - No side effects during infrastructure phase

4. **Non-Invasive Integration**
   - Runs after progression finalization
   - No changes to existing progression logic
   - Easy rollback if needed

## Next Steps (Phase 4+)

1. Implement `ProgressionEventProcessor._processEffect()`
2. Add currency mutation for GRANT_CREDITS
3. Add XP mutation for GRANT_XP
4. Implement item cloning for GRANT_ITEM
5. Enforce oncePerLevel duplicate prevention
6. Add comprehensive testing suite
7. Document formula evaluation context
