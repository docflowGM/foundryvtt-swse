# PROGRESSION Execution Model - Schema Documentation

## Overview

The PROGRESSION execution model handles lifecycle-triggered ability effects such as wealth grants, item grants, and other progression-dependent actions.

**Status: Phase 1-3 Infrastructure Complete, Phase 4 Wealth Implemented**

- ✅ Schema defined
- ✅ Contract validation implemented
- ✅ Event routing implemented
- ✅ Idempotency guard with persistence (actor.flags.swse.progressionHistory)
- ✅ Effect processing (Phase 4: GRANT_CREDITS with LINEAGE_LEVEL_MULTIPLIER)
- ✅ Currency mutation via ActorEngine
- ⏳ Formula evaluation (Phase 5+, NOT IMPLEMENTED)
- ⏳ GRANT_XP effect (Phase 5+, NOT IMPLEMENTED)
- ⏳ GRANT_ITEM effect (Phase 5+, NOT IMPLEMENTED)

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

### Example 1: Wealth (5000 credits per Lineage level)

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
        amount: {
          type: "LINEAGE_LEVEL_MULTIPLIER",
          multiplier: 5000
        },
        oncePerLineageLevel: true
      }
    }
  }
}
```

**Behavior (Phase 4 IMPLEMENTED):**
- Triggers every time actor gains a level in any class
- Computes total Lineage-eligible level = Noble levels + Corporate Agent levels
- Grants 5000 × Lineage-eligible level credits
- Idempotent: tracks granted levels in `actor.flags.swse.progressionHistory`
- Never double-grants on reload (persisted in flags)

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
- **Requires:** `amount` (Phase 4) OR legacy `formula` XOR `value`
- **Status:** Phase 4 IMPLEMENTED for LINEAGE_LEVEL_MULTIPLIER
- **Behavior:** Adds to `actor.system.credits` via ActorEngine

**Amount Types (Phase 4):**
- **LINEAGE_LEVEL_MULTIPLIER:** Grants `multiplier × Lineage-eligible level` credits
  - Lineage-eligible = Noble levels + Corporate Agent levels
  - Idempotent per level (tracked in `actor.flags.swse.progressionHistory`)
  - Example: Noble 3 + Corporate Agent 2 = 5 Lineage levels × 5000 credits = 25000 credits

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

### actor.flags.swse.progressionHistory Structure (Phase 4 IMPLEMENTED)

Each actor maintains a persisted progression history to prevent double-granting:

```javascript
actor.flags.swse.progressionHistory = {
  [abilityId]: {
    levelsGranted: [1, 2, 3, 5]  // Which Lineage levels have been granted
  }
}
```

**Status:** PHASE 4 IMPLEMENTED
- Structure persisted in actor flags (survives world reload)
- Checked on every effect processing
- Prevents duplicate grants across sessions

### oncePerLineageLevel Flag

When `effect.oncePerLineageLevel = true`:
- Ability grants once per Lineage-eligible level
- If actor gains new Lineage level, only that level is granted
- If actor reloads world, previously granted levels are skipped
- Tracked in `actor.flags.swse.progressionHistory[abilityId].levelsGranted`

**Status:** PHASE 4 IMPLEMENTED
- Enforced during effect processing
- Multi-level gains are idempotent
- Reload-safe persistence in flags

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

### Completed (Phases 1-3)
✅ Type definitions (progression-types.js)
✅ Contract validation (progression-contract.js)
✅ Event routing (progression-event-processor.js)
✅ Adapter registration (progression-adapter.js)
✅ Ability coordinator integration (ability-execution-coordinator.js)
✅ Progression engine hooking (progression-engine.js)
✅ Idempotency guard with persistence (actor.flags.swse.progressionHistory)

### Completed (Phase 4: Wealth Implementation)
✅ Effect processing (_processEffect)
✅ Currency mutation via ActorEngine
✅ LINEAGE_LEVEL_MULTIPLIER amount type
✅ Lineage-eligible level computation
✅ Per-level idempotent tracking
✅ Persisted progression history (survives reload)
✅ Contract validation for amount field

### NOT IMPLEMENTED (Phase 5+)
❌ Formula evaluation (dynamic formulas)
❌ GRANT_XP effect type
❌ GRANT_ITEM effect type with item cloning
❌ CLASS_LEVEL_GAIN trigger for class-specific effects
❌ FIRST_ACQUIRED trigger for one-time grants
❌ Custom effect handlers

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

## Next Steps (Phase 5+)

1. ✅ COMPLETED: Implement `ProgressionEventProcessor._processEffect()` (Phase 4)
2. ✅ COMPLETED: Add currency mutation for GRANT_CREDITS (Phase 4)
3. Implement GRANT_XP effect type (Phase 5)
4. Implement item cloning for GRANT_ITEM (Phase 5)
5. Add formula evaluation engine (Phase 5)
6. Implement CLASS_LEVEL_GAIN and FIRST_ACQUIRED triggers (Phase 5)
7. Add comprehensive test suite for all effect types (Phases 5+)
8. Create compendium Wealth feat with correct schema (Phase 4 closing)
