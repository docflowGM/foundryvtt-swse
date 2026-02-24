# Phase 1: Mutation Boundary Stabilization — Implementation Plan

## Phase 1 Objective

**Stop mutation leaks from `itemGrantCallback`.**

After Phase 1:
- ✅ No `await createActor()` in callback
- ✅ No `actor.update()` in callback
- ✅ All actor creation routed through ActorEngine
- ✅ Callback returns MutationPlans only
- ✅ Store behavior unchanged (from user perspective)

---

## Critical Constraint

**⚠️ Do NOT yet fix atomicity.**

Credit deduction still happens BEFORE callback in Phase 1. Atomicity repair is Phase 4.

This is intentional:
- Phase 1 stabilizes mutation boundary
- Phase 2 adds ActorEngine.create support
- Phase 3 extracts LedgerService
- Phase 4 moves credit inside boundary

---

## Implementation Steps

### Step 1: Change itemGrantCallback Signature

**File:** `scripts/apps/store/store-checkout.js`

**Current (broken):**
```javascript
itemGrantCallback: async (purchasingActor, cartItems) => {
  // Performs mutations here
  await ActorEngine.createEmbeddedDocuments(...);
  await createActor(droidData);  // ← MUTATION
  await SWSEVehicleHandler.applyVehicleTemplate(...);  // ← MUTATION
}
```

**New (sovereign):**
```javascript
itemGrantCallback: async (purchasingActor, cartItems) => {
  const plans = [];

  // Collect plans instead of mutating
  plans.push(...createItemPlans(cartItems));
  plans.push(...createDroidPlans(cartItems));
  plans.push(...createVehiclePlans(cartItems));

  return plans;  // ← RETURN PLANS, DON'T MUTATE
}
```

**Effect:** Callback no longer performs any mutations; it returns plans only.

---

### Step 2: Add Helper Functions to Build MutationPlans

**File:** `scripts/apps/store/store-checkout.js`

Add three new functions that compile MutationPlans (instead of mutating directly):

```javascript
/**
 * Compile regular items into MutationPlan
 * @param {Array} cartItems - Items from cart
 * @returns {Array<MutationPlan>}
 */
function createItemPlans(cartItems) {
  if (!cartItems || cartItems.length === 0) return [];

  const itemsToCreate = cartItems.map(cartItem => {
    const item = cartItem.item;
    return item.toObject ? item.toObject() : item;
  });

  // Return MutationPlan, don't apply it
  return [{
    add: {
      items: itemsToCreate
    }
  }];
}

/**
 * Compile droids into MutationPlans
 * @param {Array} cartDroids - Droids from cart
 * @returns {Array<MutationPlan>}
 */
function createDroidPlans(cartDroids) {
  const plans = [];

  for (const droid of cartDroids) {
    const droidData = droid.actor.toObject ? droid.actor.toObject() : droid.actor;
    droidData.name = `${droid.name}`;  // Keep it simple, no owner suffix yet (PlacementRouter will handle ownership)
    droidData.type = 'droid';

    // Don't set ownership here (Phase 6: PlacementRouter will do this)

    // Return MutationPlan, don't apply it
    plans.push({
      create: {
        actors: [{
          type: 'droid',
          temporaryId: `temp_droid_${droid.id}`,  // Temporary ID for reference
          data: droidData
        }]
      }
    });
  }

  return plans;
}

/**
 * Compile vehicles into MutationPlans
 * @param {Array} cartVehicles - Vehicles from cart
 * @param {Map} itemsById - Store inventory map
 * @returns {Array<MutationPlan>}
 */
function createVehiclePlans(cartVehicles, itemsById) {
  const plans = [];

  for (const vehicle of cartVehicles) {
    const template = vehicle.template || itemsById?.get(vehicle.id);
    if (!template) {
      throw new Error(`Vehicle template not found for id=${vehicle.id}`);
    }

    // Create shell vehicle actor
    const vehicleData = {
      type: 'vehicle',
      name: `${vehicle.condition === 'used' ? '(Used) ' : ''}${vehicle.name}`,
      img: template.img || 'icons/svg/anchor.svg'
    };

    // Don't set ownership here (Phase 6: PlacementRouter will do this)

    // Return MutationPlan, don't apply it
    plans.push({
      create: {
        actors: [{
          type: 'vehicle',
          temporaryId: `temp_vehicle_${vehicle.id}`,  // Temporary ID for reference
          data: vehicleData
        }]
      },
      // After actor is created, apply template
      // (This will be handled by SWSEVehicleHandler in Phase 5 via MutationPlan)
      meta: {
        vehicleTemplate: template,
        condition: vehicle.condition
      }
    });
  }

  return plans;
}
```

---

### Step 3: Update StoreEngine.purchase() to Apply Plans

**File:** `scripts/engines/store/store-engine.js`

**Current (callback mutates):**
```javascript
// Line 282-291
if (itemGrantCallback && typeof itemGrantCallback === 'function') {
  try {
    await itemGrantCallback(freshActor, items);
  } catch (grantErr) {
    logger().warn('StoreEngine: Item grant failed (credits deducted)', {...});
  }
}
```

**New (callback returns plans, engine applies them):**
```javascript
// Collect MutationPlans from callback
let grantPlans = [];
if (itemGrantCallback && typeof itemGrantCallback === 'function') {
  try {
    grantPlans = await itemGrantCallback(freshActor, items) || [];
    if (!Array.isArray(grantPlans)) {
      grantPlans = [];
    }
  } catch (grantErr) {
    logger().error('StoreEngine: Item grant failed to compile plans', {
      transactionId,
      error: grantErr.message
    });
    throw grantErr;  // Let caller handle
  }
}

// TEMPORARY ADAPTER (Phase 1 only):
// Apply plans sequentially via ActorEngine
// (Phase 4 will merge these and apply atomically)
for (const plan of grantPlans) {
  try {
    await ActorEngine.applyMutationPlan(freshActor, plan);
  } catch (applyErr) {
    logger().error('StoreEngine: Failed to apply grant plan', {
      transactionId,
      error: applyErr.message
    });
    throw applyErr;  // Let caller handle
  }
}
```

**Effect:**
- Callback returns plans
- Engine applies them via ActorEngine
- No direct mutations in callback
- Atomicity still broken (Phase 4 fixes this), but boundary is now sovereign

---

### Step 4: Update checkout() Function to Handle Plan Returns

**File:** `scripts/apps/store/store-checkout.js`

**Update the itemGrantCallback call in checkout():**

```javascript
// Line 713: Change callback to use new signature
itemGrantCallback: async (purchasingActor, cartItems) => {
  // Pass itemsById to helpers so they can access it
  const itemPlans = createItemPlans(cartItems.items);
  const droidPlans = createDroidPlans(cartItems.droids);
  const vehiclePlans = createVehiclePlans(cartItems.vehicles, store.itemsById);

  return [...itemPlans, ...droidPlans, ...vehiclePlans];
}
```

**Effect:**
- checkout() passes the right data to helpers
- Callback returns plans
- StoreEngine applies them

---

### Step 5: Remove Direct createActor Calls

**File:** `scripts/apps/store/store-checkout.js`

**In `buyVehicle()` function (currently line 319-410):**

Delete this callback:
```javascript
itemGrantCallback: async (actor, items) => {
  const vehicleData = vehicleTemplate.toObject();
  vehicleData.ownership = { ... };
  const newVehicle = await createActor(vehicleData);  // ← DELETE THIS
}
```

Replace with:
```javascript
itemGrantCallback: async (actor, items) => {
  return createVehiclePlans([{
    id: templateId,
    name: vehicleTemplate.name,
    template: vehicleTemplate,
    condition: condition
  }], store.itemsById);
}
```

**In `buyDroid()` function (currently line 242-311):**

Delete this callback:
```javascript
itemGrantCallback: async (actor, items) => {
  const droidData = droidTemplate.toObject();
  droidData.ownership = { ... };
  await createActor(droidData);  // ← DELETE THIS
}
```

Replace with:
```javascript
itemGrantCallback: async (actor, items) => {
  return createDroidPlans([{
    id: actorId,
    name: droidTemplate.name,
    actor: droidTemplate
  }]);
}
```

**Effect:**
- No more `createActor()` calls in commerce layer
- All actor creation routed through ActorEngine

---

### Step 6: Remove Hardcoded Ownership (Prepare for Phase 6)

**File:** `scripts/apps/store/store-checkout.js`

In the helper functions created in Step 2, do NOT set ownership:

```javascript
// ❌ REMOVE THIS:
droidData.ownership = {
  default: 0,
  [game.user.id]: 3
};

// ❌ REMOVE THIS:
vehicleData.ownership = {
  default: 0,
  [game.user.id]: 3
};

// ✅ Instead, ownership will be handled by PlacementRouter in Phase 6
```

**Effect:**
- No hardcoded ownership in commerce layer
- Paves way for PlacementRouter abstraction (Phase 6)
- For now, actors will use default Foundry ownership semantics
- (In Phase 6, PlacementRouter will set ownership based on purchaser type)

---

### Step 7: Update Error Handling

**File:** `scripts/apps/store/store-checkout.js`

In the checkout() function's catch block (line 783-789):

```javascript
catch (err) {
  SWSELogger.error('SWSE Store | Checkout failed:', err);
  ui.notifications.error(`Purchase failed: ${err.message}`);
  store.exitCheckoutMode();
  store._renderCartUI();
  resolve();
}
```

**Note:** Phase 1 does NOT implement refund. Credits are already gone if we reach this error.
- Phase 4 will implement refund inside atomicity boundary.
- For now, log clearly and notify user.

---

### Step 8: Test Plan Compilation (Add Comments)

**File:** `scripts/apps/store/store-checkout.js`

Add comments to clarify that we're only building plans, not applying them:

```javascript
/**
 * PHASE 1: Compile MutationPlans for actor creation
 *
 * This function returns MutationPlans instead of mutating directly.
 * Plans will be applied by StoreEngine.purchase() via ActorEngine.
 *
 * This is foundation stabilization (Phase 1).
 * Phase 2 adds ActorEngine.create support.
 * Phase 4 makes the entire transaction atomic.
 */
function createVehiclePlans(cartVehicles, itemsById) {
  // ... implementation
}
```

---

## Files to Modify

| File | Changes | Scope |
|------|---------|-------|
| `scripts/engines/store/store-engine.js` | Update `purchase()` to apply returned plans via ActorEngine | Core |
| `scripts/apps/store/store-checkout.js` | Add helper functions, update callbacks, remove direct mutations | Critical |

---

## Files NOT to Modify (Phase 1)

| File | Why |
|------|-----|
| `scripts/governance/actor-engine/actor-engine.js` | Phase 2 adds create support |
| `scripts/engines/store/transaction-engine.js` | Phase 4 introduces this |
| `scripts/engines/store/ledger-service.js` | Phase 3 introduces this |
| `scripts/engines/vehicles/vehicle-factory.js` | Phase 5 introduces this |
| `scripts/engines/store/placement-router.js` | Phase 6 introduces this |

---

## Verification Checklist

After Phase 1, verify:

- [ ] **No direct `createActor()` calls in store layer**
- [ ] **All actor creation returns MutationPlans**
- [ ] **Store checkout still works** (items, droids, vehicles)
- [ ] **Cart still persists** across sessions
- [ ] **Credits still deducted** before callback
- [ ] **Errors are logged clearly**
- [ ] **No console errors** or warnings
- [ ] **Droid purchase workflow works**
- [ ] **Vehicle purchase workflow works**
- [ ] **Multi-item checkout works**
- [ ] **Cart validation still works**
- [ ] **No permission errors** on owned actors

---

## Rollback Instructions (If Needed)

If Phase 1 breaks store functionality:

1. `git revert` the Phase 1 commit
2. Restore original `store-engine.js` and `store-checkout.js`
3. Store will return to pre-Phase 1 state (mutations still leak, but working)

---

## Next Phase (Phase 2)

Once Phase 1 is verified:

Phase 2 extends ActorEngine to support `create.actors` bucket in MutationPlans:
```javascript
{
  create: {
    actors: [
      {
        type: 'vehicle',
        temporaryId: 'temp_1',
        data: { ... }
      }
    ]
  }
}
```

This is a prerequisite for Phase 4 (atomicity).

---

## Important Notes

**Atomicity is NOT fixed in Phase 1.**
- Credits still deducted before callback
- If callback fails, credits are lost
- This is intentional (Phase 4 fixes this)
- Don't try to "fix it quickly" — wait for Phase 4

**Ownership is NOT abstracted in Phase 1.**
- Removed hardcoding, but no routing yet
- Actors will use Foundry defaults
- Phase 6 (PlacementRouter) will handle routing
- Don't add routing logic in Phase 1 — it will be replaced

**This is stabilization, not completion.**
- Phase 1 removes mutation leaks
- Later phases add atomicity, routing, factories
- Each phase builds on previous
- Do not skip ahead

---

## Success Criteria

Phase 1 is complete when:
- ✅ Store checkout works without errors
- ✅ No direct `Actor.create()` or `actor.update()` in commerce
- ✅ All mutations routed through ActorEngine
- ✅ `itemGrantCallback` returns MutationPlans
- ✅ No test failures
- ✅ Behavior unchanged from user perspective
