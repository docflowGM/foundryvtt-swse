# Unified Modification Pipeline Design

## Overview

This document describes the complete pipeline for all item customization and modification flows in the SWSE system. It ensures:

- **Single Authority**: ActorEngine is sole source of mutations
- **Atomic Operations**: Credits/tokens never deducted partially
- **Rule Enforcement**: All modifications validate before execution
- **Scalability**: New modals plug in via ModificationIntentBuilder

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UI LAYER                                     │
├─────────────────────────────────────────────────────────────────────┤
│ • LightsaberConstructionApp       → LightsaberConstructionEngine    │
│ • BlasterCustomizationApp         → BlasterCustomizationEngine      │
│ • ArmorCustomizationApp (future)  → ArmorCustomizationEngine (future) │
│ • GearCustomizationApp (future)   → GearCustomizationEngine (future)  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    INTENT LAYER (ADAPTER)                            │
├─────────────────────────────────────────────────────────────────────┤
│ ModificationIntentBuilder                                           │
│   • buildBlasterIntent()                                            │
│   • buildArmorIntent()                                              │
│   • buildGenericIntent()                                            │
│   • executeIntent()                                                 │
│   • executeIntentWithCost()                                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   ENGINE LAYER (AUTHORITY)                           │
├─────────────────────────────────────────────────────────────────────┤
│ • Modification Engine (Delta)                                       │
│ • LedgerService (Credit validation + delta)                         │
│ • MutationInterceptor (Sovereignty enforcement)                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   MUTATION PLAN (STANDARD FORMAT)                    │
├─────────────────────────────────────────────────────────────────────┤
│ {                                                                   │
│   set: { "flags.swse.boltColor": "red", ... },                    │
│   create: [...],                                                   │
│   delete: [...]                                                    │
│ }                                                                   │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ACTOR ENGINE (SOLE MUTATION AUTHORITY)                 │
├─────────────────────────────────────────────────────────────────────┤
│ ActorEngine.applyMutationPlan(actor, plan, item)                   │
│   • Sets context for mutation interception                          │
│   • Applies to actor + items atomically                             │
│   • Validates via MutationInterceptor                               │
│   • Clears context in finally block                                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   PERSISTENCE (FOUNDRY DB)                           │
├─────────────────────────────────────────────────────────────────────┤
│ • Actor document updated                                            │
│ • Item documents updated                                            │
│ • Triggers recalculation of derived data                            │
│ • FX hooks read updated flags                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Current Flow Examples

### Example 1: Blaster Customization (NO COST)

```
1. USER INTERACTION
   BlasterCustomizationApp._onRender()
   └─ User selects color + FX type
   └─ Click "Apply Configuration"

2. ENGINE CALL
   BlasterCustomizationApp.#applyChanges()
   └─ BlasterCustomizationEngine.apply(actor, item, { boltColor, fxType })

3. INTENT BUILDING (New pattern)
   BlasterCustomizationEngine.apply()
   └─ ModificationIntentBuilder.buildBlasterIntent(actor, item, config)
      └─ Returns ModificationIntent with changes to apply
   └─ ModificationIntentBuilder.executeIntent(actor, item, intent)

4. MUTATION PLAN
   ActorEngine.applyMutationPlan(actor, {
     set: {
       "flags.swse.boltColor": "red",
       "flags.swse.fxType": "heavy",
       "flags.swse.modifiedAt": timestamp,
       "flags.swse.modifiedBy": actor.id
     }
   }, item)

5. PERSISTENCE
   item.update() called by ActorEngine (within context)
   └─ Item saved to database
   └─ Hooks fire (but we don't modify here)

6. SUCCESS
   ui.notifications.info("⚡ Blaster reconfigured!")
   Modal closes
```

---

### Example 2: Lightsaber Construction (WITH COST + ROLL)

```
1. USER INTERACTION
   LightsaberConstructionApp.#attemptBuild()
   └─ User clicks "Construct Lightsaber"

2. VALIDATION
   LightsaberConstructionEngine.attemptConstruction()
   └─ Check: level 7+, Force Sensitivity, Lightsaber Proficiency
   └─ Check: chassis + crystal selected
   └─ Check: credits available (DC + cost calculation)
   └─ Roll: 1d20 + Use the Force modifier

3. PRE-MUTATION GATES
   LedgerService.validateFunds(actor, totalCost)
   └─ Returns boolean
   └─ If false: show error, exit

4. MUTATION PLAN (Atomic)
   creditPlan = LedgerService.buildCreditDelta(actor, totalCost)
   └─ Returns { set: { "system.credits": newAmount } }

   newWeapon = #createBuiltLightsaber(...)
   └─ Returns item template with flags.swse.bladeColor, etc.

   ActorEngine.applyMutationPlan(actor, creditPlan)
   └─ Deducts credits (if roll succeeded)
   └─ Creates weapon item
   └─ Both atomic: both succeed or both fail

5. POST-SUCCESS
   Check eligibility for attunement
   └─ Open MirajAttunementApp if eligible
   └─ Otherwise close and notify

6. ATTUNEMENT (Optional second flow)
   WeaponsEngine.attuneLightsaber(actor, weapon)
   └─ Deduct 1 Force Point via ActorEngine
   └─ Set attunedBy flag
   └─ Add +1 attack modifier
   └─ All atomic
```

---

### Example 3: Armor Upgrade (WITH TOKENS + COST)

```
1. USER INTERACTION
   ArmorUpgradeApp.#onInstallUpgrade()  [Future]
   └─ User clicks Install on upgrade

2. VALIDATION
   Check: item owned by actor
   Check: modification tokens available
   Check: upgrade compatibility

3. INTENT BUILDING
   ModificationIntentBuilder.buildArmorIntent(
     actor, armor, [upgrades], tokenCost
   )
   └─ Changes: installedUpgrades array + metadata
   └─ Token cost: tokens deducted from actor

4. EXECUTION WITH COST
   ModificationIntentBuilder.executeIntentWithCost(
     actor, item, intent, tokenCost
   )
   └─ Validates token availability
   └─ Builds mutation plan:
      ├─ Deduct tokens from actor.system.modifications.tokens
      └─ Update armor.system.installedUpgrades

5. PERSISTENCE
   ActorEngine.applyMutationPlan(actor, fullPlan, armor)
   └─ Actor tokens deducted
   └─ Armor upgrades installed
   └─ Modifiers recalculated
   └─ Both atomic

6. SUCCESS
   Armor modifiers now apply to derived data
```

---

## ModificationIntentBuilder API

### Intent Structure

```typescript
interface ModificationIntent {
  type: string;              // "blaster-customization", "armor-upgrade", etc.
  targetId: string;          // Item ID being modified
  changes: Array<{
    path: string;            // e.g., "flags.swse.boltColor"
    value: any;              // e.g., "red"
  }>;
  costContext?: {
    type: "credits" | "tokens";
    amount: number;
  };
  metadata?: {
    source: string;          // Modal name
    actor: string;           // Actor ID
    item: string;            // Item ID
    [key: string]: any;      // Custom tracking
  };
}
```

### Methods

#### buildBlasterIntent(actor, item, config)
- **Input**: actor, item, { boltColor, fxType }
- **Output**: Intent with changes for flags + metadata
- **Cost**: None (cosmetic)

#### buildArmorIntent(actor, armor, upgradeIds, tokenCost)
- **Input**: actor, armor, [upgrade IDs], token cost
- **Output**: Intent with changes for upgrades + token deduction
- **Cost**: tokens from actor.system.modifications.tokens

#### buildGenericIntent(actor, item, changes, costContext)
- **Input**: actor, item, custom changes, optional cost
- **Output**: Intent with custom changes
- **Cost**: Optional (credits or tokens)

#### executeIntent(actor, item, intent)
- **Use**: When NO cost involved
- **Flow**: Intent → MutationPlan → ActorEngine
- **Returns**: { success: boolean, reason?: string }

#### executeIntentWithCost(actor, item, intent, costAmount)
- **Use**: When cost (credits/tokens) is involved
- **Flow**: Validate → Intent → MutationPlan (with cost) → ActorEngine
- **Returns**: { success: boolean, reason?: string }

---

## Integration Checklist

### For Each New Modal

1. **Import ModificationIntentBuilder**
   ```javascript
   import { ModificationIntentBuilder } from ".../modification-intent-builder.js";
   ```

2. **In Engine.apply() method**
   ```javascript
   // OLD (direct):
   await item.update({ "flags.swse.prop": value });

   // NEW (via intent):
   const intent = ModificationIntentBuilder.buildBlasterIntent(actor, item, config);
   return await ModificationIntentBuilder.executeIntent(actor, item, intent);
   ```

3. **If cost is involved**
   ```javascript
   // Use executeIntentWithCost() instead
   return await ModificationIntentBuilder.executeIntentWithCost(
     actor, item, intent, costAmount
   );
   ```

4. **No direct item.update() calls**
   - ALL mutations must go through ModificationIntentBuilder
   - ALL must route through ActorEngine

---

## Safety Guarantees

### 1. Atomic Mutations
- Credits/tokens deducted only if item mutation succeeds
- No partial-failure scenarios possible
- MutationPlan is validated before execution

### 2. Singular Authority
- Only ActorEngine applies mutations
- MutationInterceptor enforces this
- Violations are caught and logged

### 3. Credit Safety
- All costs pre-validated before mutation
- Deduction is part of atomic mutation plan
- Cannot spend more than available

### 4. Mutation Sovereignty
- Protected paths in validation script
- Unauthorized mutations caught
- All modals route through approved pathway

---

## Future Extensions

### New Customization Modal (e.g., Armor)

```javascript
// 1. Build intent
const intent = ModificationIntentBuilder.buildArmorIntent(
  actor, armor, installedUpgrades, tokenCost
);

// 2. Execute with cost
const result = await ModificationIntentBuilder.executeIntentWithCost(
  actor, armor, intent, tokenCost
);

// 3. Success
if (result.success) {
  ui.notifications.info("Armor upgraded!");
  this.close();
}
```

### New Modification Engine

```javascript
// Pattern is identical
export class NewCustomizationEngine {
  static async apply(actor, item, config) {
    // Build intent
    const intent = ModificationIntentBuilder.buildNewIntent(actor, item, config);

    // Execute
    return await ModificationIntentBuilder.executeIntent(actor, item, intent);
  }
}
```

---

## Risk Mitigation

### Risk: Modal Developers Bypass System

**Mitigation:**
- MutationInterceptor catches direct item.update() calls
- Code review checklist: "Does this route through ModificationIntentBuilder?"
- Test: Verify no direct updates in modal code

### Risk: Unowned Items Break System

**Mitigation:**
- Unowned items (compendium) intentionally bypass ActorEngine (no actor parent)
- Documented in this design
- Protected by "if item.actor" conditional
- No credit implications for unowned items

### Risk: New Cost Type Not Implemented

**Mitigation:**
- If new cost type (e.g., "essence"), extend:
  - LedgerService.buildCostDelta()
  - ModificationIntentBuilder.executeIntent() cost handling
  - Validation in engine before mutation

### Risk: Conflicts With Progression System

**Mitigation:**
- ActorEngine.applyMutationPlan() is separate from progression
- Modifications use SET bucket, not progression deltas
- No conflict: progression → deltas, mods → mutations

---

## Testing Strategy

### Unit Tests

1. **Intent Building**
   - buildBlasterIntent() produces correct changes
   - buildArmorIntent() includes token deduction
   - buildGenericIntent() accepts custom changes

2. **Execution**
   - executeIntent() routes through ActorEngine
   - executeIntentWithCost() validates before mutation
   - Mutations are atomic

3. **Safety**
   - Direct item.update() raises MutationInterceptor violation
   - Insufficient credits fails validation
   - Insufficient tokens fails validation

### Integration Tests

1. **Full Blaster Flow**
   - Select color → apply → item updated → FX renders correctly

2. **Full Armor Flow**
   - Select upgrades → apply → tokens deducted → modifiers apply

3. **Credit Safety**
   - Insufficient credits → operation fails
   - Sufficient credits → credits deducted atomically

---

## Conclusion

This unified pipeline ensures:

✅ **All item modifications go through ActorEngine**
✅ **Credits and tokens are deducted atomically**
✅ **No modal can bypass the system**
✅ **New modals plug in consistently**
✅ **FX system reads correct persisted data**

The system is architecturally sound and ready for expansion.
