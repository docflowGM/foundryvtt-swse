# Store Module Wiring to StoreTransactionEngine

**Selective, intentional integration. Not everything uses it.**

---

## The Question

Should store.js wire to StoreTransactionEngine?

**Answer:** Yes — for domain transactions only. No — for read logic or single-actor operations.

---

## What SHOULD Use StoreTransactionEngine

These are **cross-actor, multi-step, financially sensitive** operations:

### ✅ Wire These:

```javascript
// 1. PURCHASE (buyer + seller)
StoreTransactionEngine.purchaseItem({
  buyer: playerActor,
  seller: storeActor,
  itemId,
  price
});

// 2. SELL (single actor, but delete + update = atomic concern)
StoreTransactionEngine.sellItem({
  seller: playerActor,
  itemId,
  price
});

// 3. TRADE (cross-actor, no currency)
StoreTransactionEngine.transferItem({
  from: actor1,
  to: actor2,
  itemId
});

// 4. BULK PURCHASE (multiple items, multi-step)
for (const item of itemsInCart) {
  await StoreTransactionEngine.purchaseItem({
    buyer,
    seller,
    itemId: item.id,
    price: item.price
  });
}

// 5. REWARD GRANT (NPC grants items + credits)
await StoreTransactionEngine.purchaseItem({
  buyer: playerActor,
  seller: null, // Virtual giver
  itemId,
  price: 0 // Free
});
```

---

## What Should NOT Use StoreTransactionEngine

These are **read logic, UI concerns, or single-step mutations**:

### ❌ Keep Direct:

```javascript
// 1. VIEWING INVENTORY (read-only, no mutations)
displayStoreInventory(store) {
  return store.items.map(item => ({
    id: item.id,
    name: item.name,
    price: item.system.price
  }));
}

// 2. FILTERING/SEARCHING (read-only)
filterByPrice(items, maxPrice) {
  return items.filter(i => i.system.price <= maxPrice);
}

// 3. PRICE CALCULATION (pure function)
calculateFinalCost(basePrice, discounts) {
  return basePrice * (1 - discounts.reduce((a,b) => a+b, 0));
}

// 4. CART PREVIEW (read-only calculation)
previewCartTotal(cart) {
  return cart.items.reduce((sum, item) => sum + item.price, 0);
}

// 5. TOOLTIP DISPLAY (read-only)
showItemTooltip(item) {
  ui.tooltip.show(`${item.name}: ${item.system.price} credits`);
}

// 6. SINGLE-ACTOR CREDIT ADJUSTMENT (outside store domain)
// Example: Earning credits from quest, not a store transaction
await ActorEngine.updateActor(actor, {
  'system.credits': actor.system.credits + rewardAmount
});

// 7. INITIATIVE SYSTEM MUTATIONS (unrelated to store)
// Do NOT route through StoreTransactionEngine
await ActorEngine.updateActor(actor, {
  'system.initiative': roll
});
```

---

## The Clean Separation

```
┌─────────────────────────────────────────┐
│  UI / Store Dialog / Templates          │
│  (store-checkout.js, store-review.js)   │
└──────────────────┬──────────────────────┘
                   │
         Read logic + UI concerns
         (filtering, display, calc)
                   │
       Domain transactions (cross-actor)
                   │
┌──────────────────▼──────────────────────┐
│  StoreTransactionEngine                 │
│  (Coordinates multi-step sequences)     │
│  (purchaseItem, sellItem, transferItem) │
└──────────────────┬──────────────────────┘
                   │
      Each mutation governed individually
                   │
┌──────────────────▼──────────────────────┐
│  ActorEngine                            │
│  (Mutation Authority)                   │
│  (updateActor, createEmbeddedDocuments) │
└──────────────────┬──────────────────────┘
                   │
       Each mutation validated individually
                   │
┌──────────────────▼──────────────────────┐
│  Sentinel (MutationIntegrityLayer)      │
│  (Constitutional Governance)            │
│  (Transaction START/END, invariants)    │
└─────────────────────────────────────────┘
```

---

## Wiring Locations in Store Code

### 1. Store Checkout (`scripts/apps/store/store-checkout.js`)

**BEFORE:**
```javascript
async function checkout(playerActor, cartItems, sellerActor) {
  // Direct mutations without coordination
  for (const item of cartItems) {
    await ActorEngine.updateActor(playerActor, {
      'system.credits': playerActor.system.credits - item.price
    });

    await ActorEngine.updateActor(sellerActor, {
      'system.credits': sellerActor.system.credits + item.price
    });

    await ActorEngine.deleteEmbeddedDocuments(sellerActor, 'Item', [item.id]);
    await ActorEngine.createEmbeddedDocuments(playerActor, 'Item', [item.toObject()]);
  }
}
```

**AFTER:**
```javascript
import { StoreTransactionEngine } from '../../engines/store/store-transaction-engine.js';

async function checkout(playerActor, cartItems, sellerActor) {
  // Use coordinated transactions
  for (const item of cartItems) {
    try {
      await StoreTransactionEngine.purchaseItem({
        buyer: playerActor,
        seller: sellerActor,
        itemId: item.id,
        price: item.price,
        metadata: { context: 'store_purchase', timestamp: Date.now() }
      });
    } catch (err) {
      ui.notifications.error(`Purchase of ${item.name} failed: ${err.message}`);
      // Rollback already attempted by StoreTransactionEngine
      break; // Stop processing remaining items
    }
  }
}
```

### 2. Item Selling System (`scripts/apps/item-selling-system.js`)

**BEFORE:**
```javascript
async function resolveSale(seller, item, salePrice) {
  // Item deleted outside transaction
  await item.delete();

  // Credits updated separately
  await ActorEngine.updateActor(seller, {
    'system.credits': seller.system.credits + salePrice
  });
}
```

**AFTER:**
```javascript
import { StoreTransactionEngine } from '../engines/store/store-transaction-engine.js';

async function resolveSale(seller, item, salePrice) {
  // Use coordinated transaction
  try {
    await StoreTransactionEngine.sellItem({
      seller,
      itemId: item.id,
      price: salePrice,
      metadata: { context: 'item_sale', buyer: 'merchant' }
    });
  } catch (err) {
    ui.notifications.error(`Sale failed: ${err.message}`);
    // Rollback already attempted
  }
}
```

### 3. Store Inventory Transfer (New Use Case)

```javascript
import { StoreTransactionEngine } from '../engines/store/store-transaction-engine.js';

// When merchant transfers item between storage/display
async function moveStoreInventory(sourceStorage, destStorage, itemId) {
  try {
    await StoreTransactionEngine.transferItem({
      from: sourceStorage,
      to: destStorage,
      itemId,
      metadata: { context: 'store_inventory_transfer' }
    });
  } catch (err) {
    ui.notifications.error(`Transfer failed: ${err.message}`);
  }
}
```

### 4. What Stays Direct (In store.js)

```javascript
// These remain simple read/calculate functions
function getAvailableItems(store) {
  return store.items.filter(i => i.system.available);
}

function calculateDiscount(basePrice, playerLevel) {
  return basePrice * Math.max(0, 1 - (playerLevel * 0.05));
}

// This remains a simple ActorEngine call (single actor, not a domain transaction)
async function givePlayerBonus(actor, bonusCredits) {
  await ActorEngine.updateActor(actor, {
    'system.credits': actor.system.credits + bonusCredits
  });
}

// This is UI logic, stays in store.js
function displayCart(cartItems) {
  return cartItems.map(item => ({
    name: item.name,
    price: item.system.price,
    discount: calculateDiscount(item.system.price, game.user.actor?.system.level)
  }));
}
```

---

## Import Pattern

Add to any file that needs transactional operations:

```javascript
import { StoreTransactionEngine } from '../../engines/store/store-transaction-engine.js';

// Then use:
await StoreTransactionEngine.purchaseItem({...});
```

---

## Error Handling Pattern

StoreTransactionEngine throws if anything fails. Handle at domain level:

```javascript
async function processPurchase(buyer, seller, itemId, price) {
  try {
    const result = await StoreTransactionEngine.purchaseItem({
      buyer,
      seller,
      itemId,
      price
    });

    // Success - show feedback
    ui.notifications.info(`Purchased ${result.itemName} for ${result.price} credits`);

    // Update UI
    refreshStoreDisplay();
    refreshPlayerInventory();

    return result;
  } catch (err) {
    // Failure - StoreTransactionEngine already attempted rollback
    ui.notifications.error(`Purchase failed: ${err.message}`);

    // Log for analysis
    console.error('[Store] Purchase failed:', {
      buyer: buyer.name,
      seller: seller.name,
      itemId,
      error: err.message
    });

    return null;
  }
}
```

---

## Metadata Pattern

Use metadata for analytics/logging without polluting transactions:

```javascript
await StoreTransactionEngine.purchaseItem({
  buyer,
  seller,
  itemId,
  price,
  metadata: {
    context: 'holiday_sale',
    sourceDialog: 'store-checkout-v2',
    sessionId: game.user.id,
    playerLevel: buyer.system.level,
    timestamp: Date.now()
  }
});
```

Metadata is logged but doesn't affect mutation governance.

---

## Rollback Behavior

**Important:** Rollback is best-effort, not guaranteed.

StoreTransactionEngine:
- ✅ Snapshots actor state **before** mutations
- ✅ Attempts to restore if any step fails
- ✅ Logs rollback failures
- ⚠️ Cannot guarantee consistency if rollback itself fails

**This is acceptable because:**
- Foundry has no cross-actor transaction support
- Store transactions happen sequentially (not concurrent)
- Rollback failures are rare (and logged)
- User receives error message + can retry

---

## Test Pattern

After wiring, test that transactional operations work:

```javascript
// In test scenario
const result = await StoreTransactionEngine.purchaseItem({
  buyer: testBuyer,
  seller: testSeller,
  itemId: 'test-item-1',
  price: 100
});

// Verify state
expect(testBuyer.system.credits).toBe(expectedBuyerBalance);
expect(testSeller.system.credits).toBe(expectedSellerBalance);
expect(testBuyer.items.has('test-item-1')).toBe(true);
expect(testSeller.items.has('test-item-1')).toBe(false);
```

---

## Summary: What Changes, What Doesn't

### Changes:
- Multi-step store operations → StoreTransactionEngine
- Checkout flow → uses purchaseItem()
- Item selling → uses sellItem()
- Inventory transfers → uses transferItem()

### Stays the Same:
- UI filtering and display
- Price calculations
- Cart preview logic
- Single-actor credit adjustments
- Non-store mutations (initiative, status effects, etc.)

### Result:
```
Store logic becomes declarative.
Transactional semantics become explicit.
Rollback becomes standard.
Sentinel continues to govern all mutations.
Atomicity becomes manageable.
```

---

## Implementation Sequence

1. **Commit:** StoreTransactionEngine (✅ Done)
2. **Test:** BATCH 4 validation (Pending)
3. **Wire:** Store modules to StoreTransactionEngine (After tests)
4. **Verify:** All store operations still work (Post-wiring)
5. **Apply:** Same pattern to other domains if needed (Optional)

**Do not wire until tests confirm the pattern works.**

---

**Current Status:** Ready to wire. Waiting for BATCH 4 test results.

**Next Step:** Run BATCH4Tests.runAllTests() to confirm atomicity patterns.
