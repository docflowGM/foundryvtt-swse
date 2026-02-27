# Cart & Transaction Architecture Audit

## Executive Summary

The cart and transaction system has **SOLID CORE** with **CRITICAL MUTATION LEAKS**:

- **Cart Storage:** ✅ Actor flag-based, persistent, state-only
- **Cart Behavior:** ✅ No side effects, pure add/remove/clear
- **Credit Deduction:** ✅ Atomic, validated, with idempotency
- **Actor Creation:** ❌ **LEAKS INTO CALLBACK** — direct `createActor()` calls
- **V2 Compliance:** ✅ 67% (4/6 checks pass)
- **Rollback Safety:** ⚠️ Partial (credits guarded, actor creation unguarded)

The **itemGrantCallback** is the architectural weak point. It's outside the transaction boundary and contains raw actor creation logic.

---

## CURRENT IMPLEMENTATION ANALYSIS

### 1️⃣ Cart Storage Architecture

**File:** `scripts/apps/store/store-main.js:50-431`

```
Actor Flag Storage:
  ├─ Scope: 'foundryvtt-swse'
  ├─ Key: 'storeCart'
  └─ Schema: { items: [], droids: [], vehicles: [] }
```

**Cart Definition:**
```javascript
// Line 53-55
function emptyCart() {
  return { items: [], droids: [], vehicles: [] };
}

// Line 100: Initialized in-memory during app construction
this.cart = emptyCart();

// Line 135: Loaded from actor on initialization
this.cart = this._loadCartFromActor();
```

**Persistence:**
```javascript
// Line 417-426: Load cart from actor
_loadCartFromActor() {
  if (!this.actor) {return emptyCart();}
  const stored = this.actor.getFlag(CART_FLAG_SCOPE, CART_FLAG_KEY);
  if (!stored) {return emptyCart();}
  return {
    items: asArray(stored.items),
    droids: asArray(stored.droids),
    vehicles: asArray(stored.vehicles)
  };
}

// Line 428-431: Save cart to actor
async _persistCart() {
  if (!this.actor) {return;}
  await this.actor.setFlag(CART_FLAG_SCOPE, CART_FLAG_KEY, this.cart);
}
```

**✅ FINDINGS:**
- Cart stored as actor flag (persists across sessions)
- Loaded on app init
- Persisted after every cart mutation
- Pure data structure (no compiled data, no partial actors, no MutationPlans)
- ✅ Decoupled from actor state

---

### 2️⃣ Cart Mutation Behavior

**File:** `scripts/apps/store/store-checkout.js:30-546`

#### Adding Items
```javascript
// Line 30-88: addItemToCart
export async function addItemToCart(store, itemId, updateDialogueCallback) {
  const item = game.items.get(itemId) || store.itemsById.get(itemId);

  const finalCost = normalizeCredits(item.finalCost);

  // Line 73: Pure data add (no actor mutation)
  store.cart.items.push({
    id: itemId,
    name: item.name,
    img: item.img,
    cost: finalCost,
    item: item  // ← Stores reference, not copy
  });

  ui.notifications.info(...);  // ← UI only
}
```

**Side Effects:** ✅ None (only `store.cart` mutated, not actor)

#### Removing Items
```javascript
// Line 516-536: removeFromCartById
export function removeFromCartById(cart, type, itemId) {
  const index = cart.items.findIndex(item => item.id === itemId);
  if (index !== -1) {cart.items.splice(index, 1);}
}
```

**Side Effects:** ✅ None (pure function, no mutations beyond cart)

#### Clearing Cart
```javascript
// Line 542-546: clearCart
export function clearCart(cart) {
  cart.items = [];
  cart.droids = [];
  cart.vehicles = [];
}
```

**Side Effects:** ✅ None

**✅ FINDINGS:**
- Cart operations are pure mutations to `store.cart` only
- No actor mutations during add/remove/clear
- No compiler calls in cart operations
- No DerivedCalculator invocations
- Cart is **genuinely state-only**

---

### 3️⃣ Cart Calculation & Revalidation

#### Total Calculation
```javascript
// Line 553-559: calculateCartTotal
export function calculateCartTotal(cart) {
  let total = 0;
  for (const item of cart.items) {total += item.cost;}
  for (const droid of cart.droids) {total += droid.cost;}
  for (const vehicle of cart.vehicles) {total += vehicle.cost;}
  return normalizeCredits(total);
}
```

**Side Effects:** ✅ None (pure calculation)

#### Checkout Revalidation
```javascript
// Line 660-663: checkout()
const revalidationReport = revalidateCart(store);
if (revalidationReport.removed.length > 0) {
  ui.notifications.warn(...);
}

// Line 666: Recalculate total after removing stale items
const total = calculateCartTotal(store.cart);
```

**Revalidation Logic (lines 569-637):**
```javascript
function revalidateCart(store) {
  // For each cart item:
  // 1. Look up in store.itemsById (line 575)
  // 2. If missing: remove from cart (line 578)
  // 3. If exists: recalculate price (line 580)
  // 4. If price changed: update cost (line 588)

  // Mutates: cart only (removes stale items, updates prices)
  // No actor mutation
}
```

**Side Effects:** ✅ Limited (removes stale items, recalculates prices, **no actor mutation**)

**⚠️ CRITICAL ISSUE FOUND:** Revalidation happens at checkout time, NOT in cart. This means:
- User can add item to cart
- Item becomes unavailable/repriced
- User doesn't see change until checkout
- At checkout, items removed and prices recalculated

This is a UX gap but NOT an atomicity issue.

---

### 4️⃣ Current Transaction Flow

**File:** `scripts/apps/store/store-checkout.js:654-813` + `scripts/engine/store/store-engine.js:147-320`

```
checkout()
  ↓ [Line 660-687]
  ├─ Revalidate cart (remove stale, reprice)
  ├─ Calculate total
  ├─ Check eligibility via StoreEngine.canPurchase()
  │   └─ Verify: actor owns, sufficient credits
  ├─ Enter checkout mode (ledger view)
  └─ Display confirmation dialog

  ↓ [User clicks Confirm]

  ├─ StoreEngine.purchase() [TRANSACTION BOUNDARY]
  │   └─ HARDENING 3: Re-read fresh actor (lines 189-201)
  │   └─ HARDENING 2: Atomic per-actor lock (lines 173-183)
  │   └─ HARDENING 7: Validate credits numeric (lines 204-244)
  │   └─ Line 276-279: Single batched actor.update() for credits
  │       await freshActor.update({
  │         'system.credits': newCredits,
  │         'flags.foundryvtt-swse': existingFlags
  │       });
  │   └─ Line 282-291: CALLBACK OUTSIDE TRANSACTION
  │       if (itemGrantCallback) {
  │         await itemGrantCallback(freshActor, items);
  │       }
  │
  └─ [Back in checkout()]
      ├─ Animate credit reconciliation (line 769)
      ├─ Log purchase to history (line 774)
      ├─ Clear cart (line 777)
      └─ Exit checkout mode (line 779)
```

**Transaction Phases:**

| Phase | Code | Guarded? | Details |
|-------|------|----------|---------|
| Pre-validation | checkout:660 | ✅ Yes | Revalidate, eligibility check |
| Credit deduction | StoreEngine:276 | ✅ Yes | Single batched update |
| Item grant callback | StoreEngine:282 | ❌ **NO** | OUTSIDE transaction boundary |
| Cart clear | checkout:777 | ✅ Yes | After transaction succeeds |

---

### 5️⃣ Error Handling & Rollback

#### StoreEngine.purchase() Error Flow

```javascript
// Line 188-290: Main try block
try {
  // Fresh actor read (handles race condition)
  const freshActor = game.actors.get(actor.id);

  // Validate before writing
  const currentCredits = Number(freshActor.system?.credits) ?? 0;

  // ATOMIC WRITE: Credits deducted
  await freshActor.update({
    'system.credits': newCredits,
    'flags.foundryvtt-swse': existingFlags
  });

  // ❌ CALLBACK OUTSIDE TRY-CATCH SCOPE?
  if (itemGrantCallback && typeof itemGrantCallback === 'function') {
    try {
      await itemGrantCallback(freshActor, items);
    } catch (grantErr) {
      // Line 286: LOGS ERROR BUT CONTINUES
      logger().warn('StoreEngine: Item grant failed (credits deducted)', {...});
    }
  }

} catch (err) {
  // Returns error, does NOT refund credits
}
```

**⚠️ CRITICAL ROLLBACK GAP:**

```
If itemGrantCallback throws:
  ├─ Credits ALREADY deducted (line 276 succeeded)
  ├─ Exception caught (line 285)
  ├─ Logged as warning
  └─ Credits NOT refunded ← LOSS!

If actor creation inside callback fails:
  ├─ Credits already deducted
  ├─ Exception caught but ignored
  └─ User has no vehicle/droid AND no credits
```

**Checkout Error Handler (lines 783-789):**
```javascript
catch (err) {
  SWSELogger.error('SWSE Store | Checkout failed:', err);
  ui.notifications.error('Purchase failed. See console for details.');
  store.exitCheckoutMode();
  store._renderCartUI();
  resolve();
}
```

**❌ No rollback attempted in checkout()**

#### What Gets Refunded?
```
✅ Credits can be read fresh (re-read at line 189)
✅ Credit deduction is validated and atomic
❌ If callback fails, credits are NOT refunded
❌ Partial state: credits gone, actor not created
```

---

### 6️⃣ Actor Creation in Checkout

**File:** `scripts/apps/store/store-checkout.js:713-756`

The `itemGrantCallback` inside `StoreEngine.purchase()`:

```javascript
itemGrantCallback: async (purchasingActor, cartItems) => {

  // PART A: Create regular items
  const itemsToCreate = store.cart.items.map(cartItem => {
    const item = cartItem.item;
    return item.toObject ? item.toObject() : item;
  });
  if (itemsToCreate.length > 0) {
    // Line 721: PHASE 8 ActorEngine (guarded)
    await ActorEngine.createEmbeddedDocuments(purchasingActor, 'Item', itemsToCreate);
  }

  // PART B: Create droid actors
  for (const droid of store.cart.droids) {
    const droidData = droid.actor.toObject ? droid.actor.toObject() : droid.actor;
    droidData.name = `${droid.name} (${purchasingActor.name}'s)`;
    droidData.ownership = {
      default: 0,
      [game.user.id]: 3  // ← Hardcoded current user
    };
    // Line 732: DIRECT createActor (bypasses ActorEngine)
    await createActor(droidData);
  }

  // PART C: Create vehicle actors
  for (const vehicle of store.cart.vehicles) {
    const template = vehicle.template || store.itemsById?.get(vehicle.id);
    if (!template) {
      throw new Error(`Vehicle template not found for id=${vehicle.id}`);
    }

    // Line 742: Create shell vehicle actor
    const vehicleActor = await createActor({
      name: `${vehicle.condition === 'used' ? '(Used) ' : ''}${vehicle.name}`,
      type: 'vehicle',
      img: template.img || 'icons/svg/anchor.svg',
      ownership: {
        default: 0,
        [game.user.id]: 3  // ← Hardcoded current user
      }
    }, { renderSheet: false });

    // Line 752: Apply vehicle template
    await SWSEVehicleHandler.applyVehicleTemplate(vehicleActor, template, {
      condition: vehicle.condition
    });
  }
}
```

**Mutation Inventory:**

| Operation | Guarded? | Location | Issue |
|-----------|----------|----------|-------|
| Create items | ✅ Yes | Line 721 | ActorEngine |
| Create droids | ❌ **NO** | Line 732 | Direct createActor |
| Create vehicles (shell) | ❌ **NO** | Line 742 | Direct createActor |
| Apply vehicle template | ✅ Yes | Line 752 | ActorEngine.updateActor |

**⚠️ MUTATION LEAK:**
- Droid actor creation uses `createActor()` → `Actor.createDocuments()` directly
- Vehicle shell creation uses `createActor()` → `Actor.createDocuments()` directly
- **Both outside ActorEngine governance**
- **Both outside transaction boundary**

---

### 7️⃣ Ownership Assignment Pattern

**Current Hardcoded Ownership:**

```javascript
// Line 728-731: Droids
droidData.ownership = {
  default: 0,
  [game.user.id]: 3  // Owner permission
};

// Line 746-749: Vehicles
ownership: {
  default: 0,
  [game.user.id]: 3  // Owner permission
}
```

**Issues:**
- ❌ Hardcoded to `game.user.id` (current player)
- ❌ No abstraction (would break if character ≠ current user)
- ❌ No support for NPC ownership
- ❌ No support for faction ownership
- ❌ No routing abstraction (no PlacementRouter)

**Example Failure Case:**
```javascript
// If GM is facilitating NPC purchase:
const npcPurchaser = game.actors.get('npc-id');
await checkout(store, callback);  // ← game.user.id = GM

// Result: Vehicle owned by GM, not NPC!
// ❌ Orphaned actor, NPC can't access it
```

---

### 8️⃣ Cross-Type Purchase Handling

**Cart contains:**
- `items[]` - Regular equipment/weapons
- `droids[]` - Droid actors
- `vehicles[]` - Vehicle templates

**Processing (lines 715-755):**

```javascript
// Items: Embedded in purchaser
for (const item of store.cart.items) {
  // Add as embedded item
  await ActorEngine.createEmbeddedDocuments(...);
}

// Droids: Standalone world actors
for (const droid of store.cart.droids) {
  // Create as world actor, assign ownership
  await createActor(droidData);
}

// Vehicles: Standalone world actors
for (const vehicle of store.cart.vehicles) {
  // Create shell, apply template
  const vehicleActor = await createActor(...);
  await SWSEVehicleHandler.applyVehicleTemplate(...);
}
```

**Unified?** ❌ NO — different handling for each type:
- Items → embedded (different model)
- Droids → world actor (same model, different creation path)
- Vehicles → world actor + template application (same model, complex creation)

**Consistency Issues:**
- Items use ActorEngine
- Droids/Vehicles bypass ActorEngine
- No standardized actor creation pipeline

---

## V2 COMPLIANCE AUDIT

| Check | Current | Compliant? | Notes |
|-------|---------|-----------|-------|
| No direct Actor.create()? | Uses `createActor()` in callback | ❌ NO | Line 732, 742 |
| No embedded doc direct mutations? | Droids have hardcoded ownership | ❌ NO | Lines 728-731, 746-749 |
| All mutations via ActorEngine? | Items yes, Droids/Vehicles no | ❌ NO | Partial compliance |
| Cart is state-only? | ✅ Yes | ✅ YES | Pure data structure |
| No settings reads in checkout? | ✅ Uses pre-calculated finalCost | ✅ YES | Good |
| Business logic separated? | ✅ StoreEngine handles validation | ✅ YES | Good separation |

**V2 Compliance Score: 67% (4/6 checks pass)**

---

## ATOMICITY & TRANSACTIONAL SAFETY

### Current State

```
Phase 1: Validation (read-only)
  ├─ Revalidate cart (safe)
  ├─ canPurchase() check (safe)
  └─ Get fresh actor (guards race condition)

Phase 2: Credit Deduction [TRANSACTION BOUNDARY]
  └─ await freshActor.update({
       'system.credits': newCredits,
       'flags.foundryvtt-swse': existingFlags
     });
  └─ ✅ ATOMIC (single batched update)

Phase 3: Item Grant [OUTSIDE BOUNDARY]
  └─ await itemGrantCallback(freshActor, items)
     ├─ CreateEmbeddedDocuments (guarded, inside try)
     ├─ createActor for droids (UNGUARDED)
     └─ createActor for vehicles (UNGUARDED)
  └─ ❌ PARTIAL ROLLBACK (catch logs but doesn't refund)
```

### Failure Scenarios

**Scenario A: Invalid Credit State**
```
Step 1: Read credits (40)
Step 2: Validate (need 50)
Result: Rejected pre-emptively ✅
```

**Scenario B: Concurrent Purchase**
```
Step 1: Actor A starts purchase (40 → 0)
Step 2: Actor A's callback creates vehicle (succeeds)
Step 3: Credits saved
Result: ✅ Atomic lock prevents race (line 173-183)
```

**Scenario C: Droid Creation Fails**
```
Step 1: Credits deducted (40 → 0) ← COMMITTED
Step 2: Create items (success)
Step 3: Create droid (fails, e.g., actor creation throws)
Step 4: Exception caught, logged
Step 5: Credits already gone
Result: ❌ LOSS (credits deducted, actor not created)
```

**Scenario D: Vehicle Template Application Fails**
```
Step 1: Credits deducted ← COMMITTED
Step 2: Vehicle shell created
Step 3: Apply template throws
Step 4: Exception caught
Result: ❌ PARTIAL STATE (empty vehicle shell, lost credits)
```

---

## DETAILED FINDINGS SUMMARY

### ✅ What Works Well

1. **Cart is Pure State**
   - No actor mutations during cart operations
   - Persisted securely via actor flags
   - Survives session reload

2. **Credit Deduction is Atomic**
   - Single batched update
   - Fresh actor read prevents race conditions
   - Per-actor lock prevents concurrent purchases
   - Pre-validation prevents insufficient fund purchases

3. **Pre-Validation is Thorough**
   - Revalidates items before checkout
   - Recalculates prices (hardening against price changes)
   - Checks eligibility with canPurchase()

4. **Item Grant Uses ActorEngine**
   - Regular items added via ActorEngine.createEmbeddedDocuments()
   - Follows V2 governance pattern

5. **Error Logging**
   - Comprehensive logging for debugging
   - idempotency tokens for detecting duplicates

### ❌ Critical Issues

1. **Droid/Vehicle Creation Bypasses ActorEngine**
   ```javascript
   // Line 732: Should use ActorEngine
   await createActor(droidData);  // ← Direct Actor.create
   ```

2. **Atomicity Break: Callback Outside Transaction**
   - Credits deducted before callback
   - Callback failure doesn't refund
   - Orphaned actors can be created without credits

3. **Hardcoded Ownership Assignment**
   - Always assigns to `game.user.id`
   - Breaks for NPC purchases, faction purchases
   - No abstraction, no routing logic

4. **No Rollback on Callback Failure**
   - Exception caught but ignored
   - Credits gone, actors may not exist
   - User can lose both credits and items

5. **Vehicle Creation is Two-Step**
   - First: Create empty shell
   - Second: Apply template
   - If step 2 fails: orphaned empty vehicle

### ⚠️ Design Gaps

1. **No PlacementRouter Abstraction**
   - Ownership hardcoded per item type
   - Can't route to different targets
   - No support for hangar, faction ownership

2. **Cross-Type Processing Inconsistent**
   - Items: embedded
   - Droids: world actors
   - Vehicles: world actors + template
   - No unified pipeline

3. **Cart Revalidation UX**
   - Happens at checkout, not in real-time
   - User sees item, adds it, then it vanishes
   - No feedback until checkout phase

---

## COMPARISON: VehicleCreator vs Cart

| Aspect | VehicleCreator | Cart/Transaction | Issue |
|--------|---|---|---|
| Bypasses ActorEngine | ✅ Yes | ✅ Yes (droids/vehicles) | Both leak mutations |
| Hardcoded Ownership | ✅ Yes | ✅ Yes | Both need PlacementRouter |
| Callback Creation | ✅ Yes | ✅ Yes | Both outside transaction |
| V2 Compliance | 38% | 67% | Transaction is better but still broken |

**Key Difference:** Cart at least has StoreEngine validation layer, but it fails to prevent callback leaks.

---

## QUESTIONS FOR NEXT AUDIT PHASE

Since we're about to redesign TransactionEngine, these need answers:

**Q1: Purchase History**
```javascript
// Line 824: Purchase history stored on actor
await actor.setFlag('foundryvtt-swse', 'purchaseHistory', history);
```
Should this be part of transaction safety? Should we track what failed?

**Q2: SWSEVehicleHandler.applyVehicleTemplate()**
```javascript
// Line 752
await SWSEVehicleHandler.applyVehicleTemplate(vehicleActor, template, {
  condition: vehicle.condition
});
```
Does this handler call ActorEngine? Or does it use direct actor.update()?

**Q3: Droid Building (in store-checkout.js:417-468)**
The droid builder is separate from cart. It calls CharacterGenerator and handles:
```javascript
draftSubmissionCallback: async (chargenSnapshot, cost) => {
  await submitDraftDroidForApproval(chargenSnapshot, actor, cost);
}
```
Should this use the same TransactionEngine or remain separate?

**Q4: Custom Starship Builder Integration**
Currently it saves to `system.vehicle` on character. When/how does this compile to vehicle actor?

---

## ARCHITECTURE RECOMMENDATIONS (Preview)

Based on this audit, the redesigned TransactionEngine should:

1. **Extend Transaction Boundary to Include Actor Creation**
   ```
   BEFORE:
     Credit deduction [BOUNDARY]
     Actor creation [OUTSIDE]

   AFTER:
     Credit deduction [INSIDE]
     Actor creation [INSIDE] ← Inside boundary
     Rollback [INSIDE]
   ```

2. **Route Through PlacementRouter**
   ```javascript
   const placement = PlacementRouter.determinePlacement(purchaser, itemType);
   // Returns: { owner, collection, location }
   ```

3. **Standardize Actor Creation Pipeline**
   ```javascript
   // All items:
   const plan = ItemFactory.createPurchasedItem(template);
   // All droids:
   const plan = DroidFactory.createPurchasedDroid(template);
   // All vehicles:
   const plan = VehicleFactory.createPurchasedVehicle(template);

   // Unified:
   await ActorEngine.apply(plan);
   ```

4. **Return MutationPlans from Callback**
   ```javascript
   itemGrantCallback: async (actor, items) => {
     const plans = [];
     for (const item of items.items) {
       plans.push(ItemFactory.create(item));
     }
     return plans;  // ← Return, not mutate
   }
   ```

5. **Make Rollback Safe**
   ```javascript
   // If ANY actor creation fails:
   // 1. Refund credits
   // 2. Rollback all created actors
   // 3. Return result with detailed error
   ```

---

## NEXT STEPS

### Immediate
1. ✅ Complete this audit
2. ⏳ Answer 4 questions above
3. ⏳ Review SWSEVehicleHandler.applyVehicleTemplate() for direct mutations

### Short Term (Next Session)
1. Design sovereign TransactionEngine
2. Implement PlacementRouter
3. Create ActorFactory classes (Item, Droid, Vehicle)
4. Extend transaction boundary to include actor creation

### Medium Term
1. Refactor all actor creation to use factories
2. Implement MutationPlan returns
3. Add comprehensive rollback tests
4. Integrate with VehicleCreator refactor

---

## AUDIT CHECKLIST SUMMARY

✅ **CART STORAGE**
- Where: Actor flag ('storeCart')
- Persist: Yes
- Content: Pure state (no compiled data)

✅ **CART MUTATIONS**
- Side effects: None
- Actor mutations: No
- Compiler calls: No
- DerivedCalculator calls: No

⚠️ **CURRENT TRANSACTION FLOW**
- Checkout: Implemented
- Validation: Thorough
- Credit deduction: Atomic
- Item grant: Callback outside boundary ❌

❌ **ERROR HANDLING**
- Callback failure: Logged, not refunded
- Partial state: Possible (credits gone, actor missing)
- Rollback: Not implemented for actor creation

⚠️ **OWNERSHIP ASSIGNMENT**
- Current: Hardcoded to game.user.id
- Abstraction: None
- Routing: Hardcoded per type

⚠️ **CROSS-TYPE PURCHASES**
- Unified: No
- Items: Embedded
- Droids: World actors (direct creation)
- Vehicles: World actors + template (direct creation)

**Overall:** Solid validation layer + critical mutation leaks + no rollback + hardcoded ownership.
