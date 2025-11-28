# Store Implementation - Bugs and Issues Found

## Critical Bugs

### 1. ❌ **Cart Checkout Failure - Item Creation**
**Location:** `scripts/apps/store/store-checkout.js:419`

**Issue:**
```javascript
const itemsToCreate = store.cart.items.map(cartItem => cartItem.item.toObject());
```

The cart stores the actual `item` object (line 52), but when items are loaded from inventory, they go through `addFinalCost()` which converts them to plain objects using `.toObject()`. When checkout tries to call `.toObject()` again, it will fail because plain objects don't have this method.

**Impact:** Checkout will crash with "TypeError: cartItem.item.toObject is not a function" when trying to purchase items.

**Fix Needed:**
```javascript
const itemsToCreate = store.cart.items.map(cartItem => {
    // Handle both Foundry Documents and plain objects
    return cartItem.item.toObject ? cartItem.item.toObject() : cartItem.item;
});
```

---

### 2. ❌ **Inconsistent Item Storage in Cart**
**Location:** `scripts/apps/store/store-checkout.js:47-52`

**Issue:**
```javascript
store.cart.items.push({
    id: itemId,
    name: item.name,
    img: item.img,
    cost: finalCost,
    item: item  // Stores the item reference
});
```

The problem is that `item` might be:
- A Foundry Document (from `game.items.get()`)
- A plain object from `store.itemsById` (which was converted by `addFinalCost()`)

This inconsistency causes issues downstream in checkout.

**Impact:** Cart items may not be properly created during checkout.

**Fix Needed:** Store the item data in a consistent format, preferably storing enough data to recreate the item without needing the original reference.

---

### 3. ❌ **Missing Item Retrieval from Compendium Packs**
**Location:** `scripts/apps/store/store-checkout.js:25-29`

**Issue:**
```javascript
let item = game.items.get(itemId);
if (!item) {
    item = store.itemsById.get(itemId);
}
```

The `itemsById` map contains items that have been converted to plain objects by `addFinalCost()`. These plain objects don't have the `.toObject()` method or proper Item class methods.

When items come from compendium packs, they're not in `game.items`, so they come from `itemsById` as plain objects. Later, checkout tries to call `.toObject()` on them.

**Impact:** Items from compendium packs cannot be properly added to cart or purchased.

**Fix Needed:** Either store the original Item document references in itemsById, or fetch the original Item from the compendium when adding to cart.

---

### 4. ⚠️ **Droid/Vehicle Cart Not Implemented**
**Location:** `scripts/apps/store/store-checkout.js:109, 180`

**Issue:**
The `buyDroid()` and `buyVehicle()` functions create actors immediately instead of adding them to the cart. This is inconsistent with how items work.

**Impact:**
- Users can't add droids/vehicles to cart to review before purchase
- Cart total doesn't include droids/vehicles
- The cart UI shows counters for droids and vehicles, but they're never used

**Fix Needed:** Implement proper cart functionality for droids and vehicles, or remove the cart references for these items.

---

### 5. ❌ **Potential Race Condition in Checkout**
**Location:** `scripts/apps/store/store-checkout.js:419-447`

**Issue:**
```javascript
const itemsToCreate = store.cart.items.map(cartItem => cartItem.item.toObject());
if (itemsToCreate.length > 0) {
    await actor.createEmbeddedDocuments("Item", itemsToCreate);
}

// Create droid actors
for (const droid of store.cart.droids) {
    // ...
    await Actor.create(droidData);
}

// Create vehicle actors
for (const vehicle of store.cart.vehicles) {
    // ...
    await Actor.create(vehicleData);
}
```

If any of these operations fail (network error, permission issue, etc.), the user has already paid credits but won't receive all items. There's no transaction rollback.

**Impact:** Users could lose credits without receiving items if the operation fails partway through.

**Fix Needed:** Wrap all creation operations in a try-catch that refunds credits if anything fails, or create all items first and only deduct credits if everything succeeds.

---

## Medium Priority Issues

### 6. ⚠️ **Cart Item Removal Doesn't Update Display**
**Location:** `scripts/apps/store/store-main.js:479-500`

**Issue:**
The `_onRemoveFromCart` function updates cart data but the display update might not show the updated total immediately due to array index shifting when items are removed.

**Impact:** Cart display might show incorrect items after removal if indexes shift.

**Fix Needed:** Use item IDs instead of array indexes for removal.

---

### 7. ⚠️ **No Validation for Store Settings**
**Location:** `scripts/apps/store/store-main.js:543-561`

**Issue:**
```javascript
const markup = parseInt(this.element.find("input[name='markup']").val()) || 0;
const discount = parseInt(this.element.find("input[name='discount']").val()) || 0;

if (markup < -100 || markup > 1000) {
    ui.notifications.warn("Markup must be between -100% and 1000%.");
    return;
}
```

The validation exists but uses `parseInt` which can parse invalid inputs like "100abc" as "100".

**Impact:** Invalid input could be accepted.

**Fix Needed:** Use stricter validation or `Number()` with proper validation.

---

### 8. ⚠️ **Inconsistent Subcategory Handling**
**Location:** `scripts/apps/store/store-shared.js:534-546`

**Issue:**
```javascript
const subcategory = weapon.system?.subcategory || 'other';

if (category === 'melee') {
    if (categorized.melee[subcategory]) {
        categorized.melee[subcategory].push(weapon);
    }
} else {
    if (categorized.ranged[subcategory]) {
        categorized.ranged[subcategory].push(weapon);
    }
}
```

Weapons with invalid subcategories (not in the predefined list) are silently dropped from the store. No warning is logged.

**Impact:** Weapons with typos or incorrect subcategories won't appear in the store, and admins won't know why.

**Fix Needed:** Log a warning when a weapon has an unrecognized subcategory.

---

## Low Priority Issues

### 9. ℹ️ **Hardcoded Pack Names**
**Location:** Multiple locations

**Issue:**
Pack names like `'swse.weapons'`, `'swse.droids'`, `'swse.vehicles'` are hardcoded.

**Impact:** Module cannot be renamed without breaking the store.

**Fix Needed:** Make pack names configurable through settings or constants.

---

### 10. ℹ️ **No Loading Indicators**
**Issue:** When loading large compendium packs, there's no loading indicator for users.

**Impact:** Users may think the store is frozen during initial load.

**Fix Needed:** Add loading spinners or progress indicators.

---

### 11. ℹ️ **Memory Leak Potential**
**Location:** `scripts/apps/store/store-main.js:46-63`

**Issue:**
The `itemsById` Map stores all items from world and compendiums. If the store is opened and closed multiple times, this could accumulate memory.

**Impact:** Minor memory usage increase over long sessions.

**Fix Needed:** Clear the map in the `close()` method.

---

### 12. ⚠️ **Availability Filter Case Sensitivity**
**Location:** `scripts/apps/store/store-filters.js:48-56`

**Issue:**
```javascript
const availabilityLower = availability.toLowerCase();
const filterLower = filterValue.toLowerCase();

if (availabilityLower.includes(filterLower)) {
    item.style.display = '';
}
```

This is good, but the filter options in the template have specific capitalization:
```html
<option value="Standard">Standard</option>
<option value="Licensed">Licensed</option>
```

If weapon data uses different casing (e.g., "standard" vs "Standard"), the filter might not work correctly.

**Impact:** Filters might miss items with different casing.

**Fix Needed:** Ensure consistent casing in weapon data, or normalize filter values.

---

### 13. ℹ️ **Search Performance on Large Inventories**
**Location:** `scripts/apps/store/store-filters.js:91-136`

**Issue:**
Search queries all visible items on every keystroke without debouncing.

**Impact:** Performance issues with hundreds of items.

**Fix Needed:** Add debouncing to search input (e.g., 300ms delay).

---

## Template Issues

### 14. ✅ **Grenades in Two Tabs (Not a Bug - By Design)**
**Location:** `templates/apps/store/store.hbs:354-386`

**Note:**
Grenades appear in BOTH tabs, but they are DIFFERENT items:
- **Weapons Tab:** Throwable grenades (Frag, Stun, Thermal Detonator, etc.) - 12 items
- **Grenades Tab:** Demolition equipment (Explosive Charges, Detonite, Timers, etc.) - 8 items

This is intentional and correct. Users shopping for "grenades to throw" go to Weapons, while users shopping for "demolition supplies" go to the Grenades/Equipment tab.

**Recommendation:** Consider renaming "Grenades" tab to "Explosives & Demolitions" to make the distinction clearer.

---

### 15. ℹ️ **No Empty State for Weapon Subcategories**
**Location:** `templates/apps/store/store.hbs` (Weapons section)

**Issue:**
Each weapon subcategory uses `{{#if categories.weapons.melee.simple.length}}` to hide empty sections, but there's no message when ALL weapons are missing.

**Impact:** If there are no weapons at all, the entire Weapons tab appears blank with no explanation.

**Fix Needed:** Add an empty message for when no weapons exist in any category.

---

## Summary

**Critical (Must Fix):** 5 bugs
1. Cart checkout item creation failure (`.toObject()` call on plain object)
2. Inconsistent item storage in cart
3. Missing compendium item retrieval
4. Droid/Vehicle cart not implemented
5. No transaction rollback on failure

**Medium Priority:** 5 issues
1. Cart removal by index
2. Settings validation
3. Silent weapon dropping
4. Availability filter casing
5. Empty weapon state

**Low Priority:** 4 issues
1. Hardcoded pack names
2. No loading indicators
3. Memory leak potential
4. Search performance

**By Design (Not Bugs):** 1
1. Grenades in two tabs (Weapons = throwable, Equipment = demolitions)

**Total Issues:** 14 (5 critical, 5 medium, 4 low)

---

## Recommended Fix Priority

### Phase 1 - Critical Fixes (Required for Store to Function)
1. Fix cart checkout `.toObject()` error
2. Fix item storage consistency
3. Add transaction rollback for checkout failures

### Phase 2 - User Experience Improvements
1. Implement droid/vehicle cart functionality (or remove cart UI for them)
2. Add logging for weapons with invalid subcategories
3. Fix cart removal by ID instead of index

### Phase 3 - Polish and Performance
1. Add loading indicators
2. Add search debouncing
3. Clarify "Grenades" tab name to "Explosives & Demolitions"
4. Add empty state messages
