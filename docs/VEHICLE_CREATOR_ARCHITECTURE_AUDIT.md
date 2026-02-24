# Vehicle Creator Architecture Audit

## Executive Summary

The vehicle creation system currently has **THREE SEPARATE PATHS** with inconsistent patterns:

1. **Standard Vehicle Purchase** (`buyVehicle`) - Creates standalone vehicle actor
2. **Custom Starship Builder** (`createCustomStarship`) - Saves config to character, **does NOT create actor**
3. **Droid Purchase** (`buyDroid`) - Creates standalone droid actor (parallel logic)

**Critical Finding:** Each path bypasses ActorEngine, uses direct Actor.create/Actor.update, and lacks proper routing abstraction.

---

## CURRENT IMPLEMENTATION ANALYSIS

### Path 1: Standard Vehicle Purchase

**File:** `scripts/apps/store/store-checkout.js:319-410`

```
buyVehicle(store, vehicleId, condition)
  ↓
StoreEngine.purchase() [credit deduction + validation]
  ↓ (in itemGrantCallback)
createActor(vehicleData) [DIRECT Actor.createDocuments call]
  ↓
Vehicle actor created in world
```

**Code Path:**
```javascript
// Line 377: Call StoreEngine.purchase
const result = await StoreEngine.purchase({
  actor: store.actor,
  items: [vehicleTemplate],
  totalCost: finalCost,
  itemGrantCallback: async (actor, items) => {
    const vehicleData = vehicleTemplate.toObject();
    // Line 395: BYPASS ActorEngine — direct createActor
    const newVehicle = await createActor(vehicleData);
  }
});
```

**Issues Identified:**
- ❌ Calls `createActor()` → `Actor.createDocuments()` directly (bypasses ActorEngine)
- ❌ Ownership set directly in callback (lines 385-388)
- ❌ No validation that vehicle has required system.category field
- ❌ No MutationPlan returned (direct mutation)
- ❌ Vehicle creation NOT part of transaction (if it fails after credit deduction, credits are lost)

**Current Ownership Logic:**
```javascript
vehicleData.ownership = {
  default: 0,
  [game.user.id]: 3  // Owner permission
};
```

This assigns vehicle to current player. **No routing abstraction** — hardcoded logic.

---

### Path 2: Custom Starship Builder

**File:** `scripts/apps/vehicle-modification-app.js:709-767`

```
createCustomStarship(actor)
  ↓
VehicleModificationApp.render()
  [User builds starship with Marl Skindar UI]
  ↓
_onFinalizeShip()
  ↓
ActorEngine.updateActor() [saves config to system.vehicle]
  ↓
Vehicle config saved to CHARACTER (not created as actor)
```

**Code Path:**
```javascript
// Line 749-754
const updateData = {
  'system.vehicle': {
    stockShip: this.stockShip,
    modifications: this.modifications,
    totalCost: totalCost
  }
};

// Line 763: Save config to character
await globalThis.SWSE.ActorEngine.updateActor(this.actor, updateData);
```

**Issues Identified:**
- ❌ Creates vehicle CONFIG on character, not a vehicle actor
- ❌ No separate vehicle actor is ever created
- ❌ Unclear what happens when character wants to USE the configured starship
- ❌ Vehicle never gets its own system.category field
- ❌ Vehicle never gets placed anywhere (character just has a config blob)

**Critical Question:** How is this starship config compiled into an actual vehicle actor?
- Is there a separate "deploy starship" action?
- Does the character sheet invoke a compiler?
- **THIS IS MISSING FROM THE AUDIT**

---

### Path 3: Droid Purchase (Parallel Logic)

**File:** `scripts/apps/store/store-checkout.js:242-311`

```
buyDroid(store, actorId)
  ↓
StoreEngine.purchase()
  ↓ (in itemGrantCallback)
createActor(droidData) [DIRECT Actor.createDocuments call]
  ↓
Droid actor created in world
```

**Same Issues as Path 1:**
- ❌ Bypasses ActorEngine
- ❌ Hardcoded ownership assignment
- ❌ No routing abstraction
- ❌ Not transactional

---

## TRANSACTION SAFETY AUDIT

### Current Transaction Model

**File:** `scripts/engines/store/store-transaction-engine.js:43-157`

```
Phase 1: Pre-validation (read-only)
  - Check buyer credits
  - Check item exists
  - Create snapshot for rollback

Phase 2: Coordinated Mutations
  Step 1: Deduct buyer credits ← ActorEngine.updateActor()
  Step 2: Add seller credits ← ActorEngine.updateActor()
  Step 3: Delete item from seller ← ActorEngine.deleteEmbeddedDocuments()
  Step 4: Create item on buyer ← ActorEngine.createEmbeddedDocuments()

Phase 3: Rollback (if any step fails)
```

**Critical Gap:**
```
┌─────────────────────────────┐
│ StoreTransactionEngine      │  ← Coordinates items
│ (credit transfer, etc)      │
└────────────┬────────────────┘
             │
             ├─→ ActorEngine (steps 1-4 guarded)
             │
             ├─→ [Vehicle Creation Callback]
             │   (OUTSIDE transaction boundary)
             │   ├─ createActor() called
             │   └─ Bypasses ActorEngine
             │
             └─ If vehicle creation fails:
                Credits already deducted ← LOSS
```

**The Problem:**
- Vehicle creation is in `itemGrantCallback` (afterCreditsDeducted)
- If `createActor()` throws, credits are already gone
- Rollback cannot recover vehicle creation failure
- **Atomicity is broken**

---

## V2 COMPLIANCE AUDIT

### Current State vs Requirements

| Requirement | Current | Compliant? |
|-------------|---------|-----------|
| Creator returns MutationPlan | Returns void; direct mutation | ❌ NO |
| ActorEngine applies result | Direct Actor.create/update | ❌ NO |
| No actor.update() direct calls | `Actor.createDocuments()` called | ❌ NO |
| No embedded doc direct mutations | Ownership set directly | ❌ NO |
| Routing abstracted | Hardcoded in callback | ❌ NO |
| No settings reads | ✓ Uses pre-calculated finalCost | ✅ YES |
| No derived calculations | ✓ Config only (no derived fields computed) | ✅ YES |
| No business logic in HBS | ✓ Store use cases separated | ✅ YES |

**Compliance Score: 3/8 (38%)**

---

## SCHEMA MAPPING AUDIT

### Vehicle Data Contract

**Required System Fields:**
```javascript
system: {
  category: 'starfighter' | 'transport' | 'capitalShip' | 'spaceStation',
  domain: 'starship' | 'planetary',
  hull: { value, max },
  shields: { value, max },
  size: string,
  crew: number,

  // Derived fields (populated by DerivedCalculator)
  reflexDefense: number,
  fortitudeDefense: number,
  baseAttackBonus: number,
  // ... other derived fields
}
```

### Current Vehicle Creation Data Path

**In buyVehicle (line 383):**
```javascript
const vehicleData = vehicleTemplate.toObject();
// ← Does this include system.category?
// ← Does DerivedCalculator run after creation?
```

**What We Don't Know:**
- ❓ Does vehicleTemplate in compendium have system.category set?
- ❓ Does createActor trigger DerivedCalculator?
- ❓ Are derived fields populated before/after?
- ❓ Does the newly created vehicle have all required fields?

**Audit Gap:** No verification that vehicle creation populates all required schema fields.

---

## PLACEMENT ROUTING AUDIT

### Current Routing Logic

**Path 1 (buyVehicle):**
```javascript
// Hardcoded in itemGrantCallback
vehicleData.ownership = {
  default: 0,
  [game.user.id]: 3  // Owner permission
};
await createActor(vehicleData);
// Result: Vehicle is a world actor, owned by purchaser
```

**Path 2 (createCustomStarship):**
```javascript
// Config saved to character's system.vehicle
await ActorEngine.updateActor(this.actor, updateData);
// Result: Config is nested in character's system, not a separate actor
```

**Path 3 (buyDroid):**
```javascript
// Hardcoded in itemGrantCallback (same as buyVehicle)
droidData.ownership = {
  default: 0,
  [game.user.id]: 3  // Owner permission
};
await createActor(droidData);
// Result: Droid is a world actor, owned by purchaser
```

### Current Problem

Routing is **HARDCODED** based on item type, not abstracted:

```javascript
if (itemType === 'vehicle') {
  // Hardcoded: create world actor, assign to player
}
if (itemType === 'droid') {
  // Hardcoded: create world actor, assign to player
}
if (itemType === 'customStarship') {
  // Hardcoded: save config to character
}
```

**This breaks when we add:**
- Vehicle purchases by NPCs (should go to NPC possessions)
- Vehicle purchases by other vehicles (should go to hangar)
- Vehicle purchases by faction leaders (should go to faction inventory)
- Vehicle purchases with custom placement rules

---

## HANGAR INTEGRATION AUDIT

**Status: NOT YET AUDITED**

The user mentioned:
> "If a vehicle initiates purchase: New vehicle must go into hangar collection"

**Questions:**
- ❓ Do vehicles support embedded vehicle references?
- ❓ Is there a hangar collection field on vehicle actors?
- ❓ How does vehicle-to-vehicle placement differ from character-to-vehicle?
- ❓ Is there routing logic for determining target (character vs vehicle)?

**This audit phase requires code review of:**
- Vehicle actor data model
- Hangar collection definition
- Vehicle possession logic

---

## SUMMARY TABLE: AUDIT CHECKLIST

### Phase 1 — Construction
| Check | Status | Finding |
|-------|--------|---------|
| Vehicle created with factory pattern? | ❌ | Direct Actor.create |
| Factory returns MutationPlan? | ❌ | Returns void |
| system.category set? | ❓ | Unknown (see schema audit) |
| system.domain derived? | ❓ | Unknown |
| Derived fields populated? | ❓ | Unclear when DerivedCalculator runs |
| Legacy V1 fields removed? | ✓ | Assumed (uses template.toObject) |
| Direct actor.update bypassed? | ❌ | Uses Actor.createDocuments directly |

### Phase 2 — Transaction Boundary
| Check | Status | Finding |
|-------|--------|---------|
| Credit deduction before creation? | ✓ | StoreEngine.purchase handles this |
| Creation failure rolls back credits? | ❌ | Callback outside transaction |
| Transaction is atomic? | ❌ | Vehicle creation outside boundary |
| Rollback tested? | ? | Unknown test coverage |

### Phase 3 — Placement Routing
| Check | Status | Finding |
|-------|--------|---------|
| Routing is abstracted? | ❌ | Hardcoded in callback |
| Routing handles character? | ✓ | Via [game.user.id] ownership |
| Routing handles droid? | ✓ | Same as character |
| Routing handles NPC? | ❌ | No NPC routing |
| Routing handles vehicle? | ❌ | No vehicle-to-vehicle |
| Routing returns MutationPlan? | ❌ | Direct mutation |
| Router is centralized? | ❌ | Logic in three places |

### Phase 4 — V2 Compliance
| Check | Status | Finding |
|-------|--------|---------|
| No direct Actor.create/update? | ❌ | Uses both |
| No embedded doc direct mutations? | ❌ | Ownership set directly |
| All via ActorEngine? | ❌ | Vehicle creation bypasses |
| Business logic separated from UI? | ✓ | StoreEngine is separate |
| Settings not read in UI? | ✓ | Uses pre-calculated costs |
| Derived calculations not in creator? | ✓ | Config-only, not calculation |

---

## ROOT CAUSES

### Why This Architecture Exists

1. **Pre-V2 Legacy:** Store predates ActorEngine, uses old patterns
2. **Callback Convenience:** itemGrantCallback makes it easy to create after transaction
3. **Actor.createDocuments is Simpler:** Faster than MutationPlan abstraction
4. **No Routing Abstraction:** Was never needed when only characters bought things

### Why It's Problematic Now

1. **Custom Starship Builder Breaks Model** — Doesn't create actor, saves config only
2. **Vehicle-to-Vehicle Purchases Are Needed** — Routing becomes essential
3. **Atomicity Matters** — Vehicle creation outside transaction loses credits on failure
4. **Hangar Integration** — Requires sophisticated routing, not hardcoded logic
5. **Audit Trail** — V2 requires clear MutationPlan for governance

---

## WHAT NEEDS FIXING

### Priority 1: Routing Abstraction
**Before vehicle logic spreads**, extract PlacementRouter:
```javascript
class PlacementRouter {
  static determinePlacement(initiator, targetType) {
    // Returns: { targetActor, collectionName, placement: 'world' | 'embedded' | 'hangar' }
  }
}
```

### Priority 2: Transaction Boundary
**Vehicle creation must be inside transaction or after confirmation:**
```javascript
// Option A: Move creation inside StoreTransactionEngine
StoreTransactionEngine.purchaseWithVehicleCreation()

// Option B: Return MutationPlan and apply after transaction
const plan = VehicleFactory.createVehicle(template);
await transaction.execute();
await ActorEngine.apply(plan);
```

### Priority 3: Custom Starship Builder
**Clarify deployment model:**
- ❓ Does config compile to vehicle actor on-demand?
- ❓ Or is it a persistent character loadout?
- ❓ When is vehicle created?

### Priority 4: Schema Validation
**Verify vehicle creation populates all required fields:**
```javascript
const created = await ActorEngine.createActor(vehicleData);
assert(created.system.category !== undefined);
assert(created.system.domain !== undefined);
assert(created.system.hull !== undefined);
// ... all required fields
```

### Priority 5: Hangar Support
**Design hangar collection and vehicle-to-vehicle logic**

---

## NEXT STEPS

### Immediate (This Session)
1. ✅ Document current state (this audit)
2. ⏳ Answer critical questions:
   - Does vehicleTemplate have system.category?
   - When does DerivedCalculator run?
   - How does custom starship get deployed?
   - Is hangar collection ready?

### Short Term (Next Session)
3. Build PlacementRouter abstraction
4. Move vehicle creation inside ActorEngine
5. Integrate with MutationPlan pattern

### Medium Term
6. Refactor StoreTransactionEngine to handle vehicle creation atomically
7. Implement vehicle-to-vehicle routing
8. Test all placement paths

---

## AUDIT QUESTIONS FOR USER

Please answer these to unblock the full audit:

**Q1: Vehicle Template Schema**
```javascript
// Does vehicleTemplate from compendium have this?
vehicleTemplate.system.category  // ← ?
vehicleTemplate.system.domain    // ← ?
```

**Q2: Vehicle Creation Lifecycle**
When `createActor(vehicleData)` completes:
- Does DerivedCalculator run automatically?
- Are derived fields (reflexDefense, etc) populated?
- Or does the sheet compute them on render?

**Q3: Custom Starship Deployment**
When user finishes building starship with Marl:
- Does character's system.vehicle get compiled to vehicle actor?
- How does player USE the starship (what triggers creation)?
- Or is it a persistent config, not an actor?

**Q4: Hangar Support**
- Do vehicle actors have embedded vehicle collection field?
- Is PlacementRouter routing needed for vehicles?
- Are you planning vehicle-to-vehicle purchases?

**Q5: Test Coverage**
- Is there test coverage for vehicle purchase failure → rollback?
- Are there tests for custom starship deployment?
- Are there tests for NPC vehicle purchases?
