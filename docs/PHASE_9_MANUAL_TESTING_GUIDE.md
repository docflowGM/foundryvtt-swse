# Phase 9: Manual Testing Guide

## Overview

After Phases 1-8, the commerce system is architecturally complete but requires live Foundry testing to verify end-to-end functionality. This guide provides step-by-step manual tests to validate:

- Store functionality (load, pricing, availability)
- Purchase flow (all actor types: items, droids, vehicles)
- Atomicity guarantees (no partial state)
- Error handling (graceful failures)
- Placement routing (correct ownership assignment)
- Multi-item transactions (diversity and scale)

---

## Prerequisites

- Foundry VTT instance running SWSE system
- Game world with test characters
- Store inventory loaded (items, droids, vehicles)
- Browser developer console open (F12)
- Sufficient credits for test purchases

---

## Test Suite 1: Store Initialization & Inventory

### Test 1.1: Store Loads Without Errors

**Setup:**
1. Open any character actor sheet
2. Click "Store" tab

**Expected Behavior:**
- Store interface loads
- No console errors
- Inventory visible and categorized
- Cart is empty
- Checkout disabled (no items)

**Pass Criteria:**
- [ ] Store UI renders
- [ ] No error messages in console
- [ ] Inventory displays (items, droids, vehicles)
- [ ] Cart is empty
- [ ] Checkout button disabled

**Notes:**
Store loading tests the complete inventory pipeline:
```
buildStoreIndex() → load compendiums
  ↓
normalizeData() → V2-compliant format
  ↓
applyPricing() → add finalCost fields
  ↓
categorize() → organize by type
  ↓
UI renders
```

---

### Test 1.2: Inventory Pricing Correct

**Setup:**
1. Store is open and loaded
2. Inspect any item with known cost

**Expected Behavior:**
- Item shows correct purchase price
- Price includes all modifiers
- "Used" vehicles show different price than "new"
- Prices are normalized integers (no decimals)

**Pass Criteria:**
- [ ] Item prices are correct
- [ ] Droid prices are correct
- [ ] Vehicle "new" price ≠ Vehicle "used" price
- [ ] All prices are integers
- [ ] No NaN or undefined prices

**Notes:**
Pricing validation ensures LedgerService can calculate accurate totals:
- Items: Simple cost
- Droids: Template cost + customization
- Vehicles: Template cost × condition modifier

---

## Test Suite 2: Single Item Purchases

### Test 2.1: Purchase Single Item (Blaster, Shield, etc.)

**Setup:**
1. Character has 500+ credits
2. Store is open
3. Select any single item

**Steps:**
1. Click item "Buy" button
2. Confirm dialog appears
3. Click "Confirm" button
4. Wait for purchase to complete

**Expected Behavior:**
- Confirmation dialog shows item name and price
- Credits deducted from actor
- Item appears in character's items
- Chat message logged (optional)
- No console errors
- Cart cleared after purchase

**Pass Criteria:**
- [ ] Confirmation dialog shown
- [ ] Credits before = Credits after + Item cost
- [ ] Item appears in character sheet
- [ ] No partial state (credits deducted AND item created)
- [ ] Cart is empty
- [ ] No error messages

**Atomic Test:**
If purchase fails midway, verify:
- [ ] Credits NOT deducted if item creation failed
- [ ] Item NOT created if credit deduction failed
- [ ] Error message explains what went wrong

---

### Test 2.2: Purchase Vehicle (New Condition)

**Setup:**
1. Character has 5000+ credits
2. Store is open
3. Select any vehicle from store

**Steps:**
1. Click vehicle "Buy" button
2. Ensure "New" condition is selected
3. Confirm dialog
4. Click "Confirm"

**Expected Behavior:**
- Vehicle actor created
- Vehicle marked as "(New)" in name
- Vehicle added to character's hangar
- Credits deducted (full price)
- No console errors

**Pass Criteria:**
- [ ] Vehicle dialog shows "New" condition
- [ ] Vehicle created with correct name format
- [ ] Vehicle appears in hangar section
- [ ] Credits deducted (full price, no discount)
- [ ] Vehicle stats correct (hull, shields, speed)

---

### Test 2.3: Purchase Vehicle (Used Condition)

**Setup:**
1. Character has 3000+ credits
2. Store is open
3. Same vehicle as Test 2.2

**Steps:**
1. Click vehicle "Buy" button
2. Select "Used" condition
3. Confirm dialog
4. Click "Confirm"

**Expected Behavior:**
- Vehicle actor created
- Vehicle marked as "(Used)" in name
- Credits deducted (reduced price ~75% of new)
- Vehicle stats at reduced capacity (hull damage)
- No console errors

**Pass Criteria:**
- [ ] Vehicle dialog shows "Used" condition
- [ ] Vehicle name starts with "(Used)"
- [ ] Credits deducted < full vehicle price
- [ ] Vehicle stats reflect used condition
- [ ] Hangar updated with used vehicle

**Verification:**
Compare Test 2.2 and Test 2.3:
```
New vehicle cost: X credits
Used vehicle cost: ~0.75X credits
Savings = 0.25X credits
```

---

### Test 2.4: Purchase Droid

**Setup:**
1. Character has 2000+ credits
2. Store is open
3. Select droid from inventory

**Steps:**
1. Click droid "Buy" button
2. Confirm dialog
3. Click "Confirm"

**Expected Behavior:**
- Droid actor created
- Droid added to character's possessions
- Credits deducted
- Droid sheet opens (optional)
- No console errors

**Pass Criteria:**
- [ ] Droid dialog shows name and price
- [ ] Droid actor created
- [ ] Droid appears in character possessions
- [ ] Credits deducted correctly
- [ ] Droid stats loaded correctly

---

## Test Suite 3: Multi-Item Purchases (Checkout)

### Test 3.1: Purchase 1 Item + 1 Droid + 1 Vehicle

**Setup:**
1. Character has 8000+ credits
2. Store is open
3. Clear any existing cart

**Steps:**
1. Add 1 item to cart
2. Add 1 droid to cart
3. Add 1 vehicle to cart
4. Open checkout
5. Review cart (3 items total)
6. Click "Confirm Trade"

**Expected Behavior:**
- Cart shows all 3 items
- Total cost = item + droid + vehicle prices
- All 3 actors created atomically
- All 3 appear in character sheet
- Credits deducted once (single transaction)
- No partial state

**Pass Criteria:**
- [ ] Cart shows 3 items
- [ ] Total cost calculated correctly
- [ ] All 3 actors created
- [ ] All 3 visible in character sheet
- [ ] Credits deducted = total cost
- [ ] Transaction atomic (all or nothing)

**Atomic Verification:**
Monitor character sheet before/after:
1. Before: Note credits, item count
2. Purchase: Start transaction
3. After: Verify all 3 created, credits correct
4. Repeat multiple times (no race conditions)

---

### Test 3.2: Add/Remove Items from Cart (Edge Cases)

**Setup:**
1. Store open
2. Empty cart

**Steps:**
1. Add item to cart
2. Add droid to cart
3. Remove item from cart
4. Add different vehicle to cart
5. Verify cart shows only droid + vehicle
6. Checkout

**Expected Behavior:**
- Cart updates correctly when items added/removed
- Total recalculated
- Only remaining items purchased
- No lingering references to removed items

**Pass Criteria:**
- [ ] Cart shows correct items after removals
- [ ] Total updated correctly
- [ ] Only 2 actors created (droid + vehicle)
- [ ] Removed item NOT created
- [ ] No console errors

---

### Test 3.3: Checkout with Large Quantity (5+ Items)

**Setup:**
1. Character has 10000+ credits
2. Store open
3. Add multiple items until cart total ~8000

**Steps:**
1. Add diverse items: weapons, armor, equipment
2. Add 2 droids
3. Add 1 vehicle
4. Review checkout cart
5. Click "Confirm Trade"
6. Wait for completion

**Expected Behavior:**
- Cart displays all items
- Total calculated correctly
- All actors created (no failures)
- Performance acceptable (< 5 seconds)
- Character sheet updated with all items
- No partial state

**Pass Criteria:**
- [ ] Cart displays all items
- [ ] Checkout completes without errors
- [ ] All items in character possessions/hangar
- [ ] Credits deducted exactly once
- [ ] Transaction time < 5 seconds
- [ ] No duplicate items created

---

## Test Suite 4: Error Handling & Edge Cases

### Test 4.1: Purchase with Insufficient Credits

**Setup:**
1. Character has 100 credits
2. Store open
3. Select item costing 500+

**Steps:**
1. Click "Buy"
2. Confirmation dialog appears
3. (Note: Dialog still shows, even though validation should catch this)
4. Click "Confirm"

**Expected Behavior:**
- Purchase rejected gracefully
- Error message: "Insufficient credits"
- Credits NOT deducted
- Actor NOT created
- Character unchanged

**Pass Criteria:**
- [ ] Error message shown in UI
- [ ] No error thrown to console
- [ ] Credits unchanged
- [ ] No partial state
- [ ] Retry with sufficient credits succeeds

---

### Test 4.2: Rapid Consecutive Purchases (Race Condition Test)

**Setup:**
1. Character has 5000 credits
2. Store open
3. Two test items available

**Steps:**
1. Rapidly click "Buy" on item 1
2. Rapidly click "Buy" on item 2 (before item 1 completes)
3. Monitor what happens

**Expected Behavior:**
- First purchase completes
- Second purchase waits (StoreEngine._purchasingActors prevents concurrent execution)
- OR both queue correctly and complete in order
- No race conditions
- No double-deductions
- No duplicate items

**Pass Criteria:**
- [ ] Only one purchase executes at a time
- [ ] Credits deducted exactly once per purchase
- [ ] Items created in order
- [ ] No errors or warnings
- [ ] StoreEngine lock prevents concurrency

**Implementation Check:**
```javascript
// In StoreEngine.purchase():
if (this._purchasingActors.has(actor.id)) {
  return { success: false, error: 'Purchase already in progress' };
}
// This prevents the race condition
```

---

### Test 4.3: Purchase After Insufficient Funds (Boundary Test)

**Setup:**
1. Character has exactly 500 credits
2. Store open

**Steps:**
1. Try to purchase 600-credit item (should fail)
2. Give character 200 more credits (now 700)
3. Try to purchase 600-credit item again (should succeed)
4. Verify credit state

**Expected Behavior:**
- First attempt rejected
- Second attempt accepted
- Credits = 700 - 600 = 100 after successful purchase
- No partial state either time

**Pass Criteria:**
- [ ] First purchase rejected gracefully
- [ ] Second purchase succeeds
- [ ] Final credits = 100
- [ ] No errors

---

### Test 4.4: Checkout Cancellation

**Setup:**
1. Store open
2. Items in cart (3+ items)

**Steps:**
1. Click "Checkout"
2. Sidebar expands showing cart summary
3. Click "Cancel Checkout"
4. Verify cart unchanged

**Expected Behavior:**
- Checkout sidebar collapses
- Cart items preserved
- No mutations occurred
- Can checkout again

**Pass Criteria:**
- [ ] Cart sidebar collapsed
- [ ] Cart items still present
- [ ] Credits unchanged
- [ ] No actors created

---

## Test Suite 5: Placement Routing

### Test 5.1: Items Route to Possessions (Character)

**Setup:**
1. Purchase item via store
2. Character actor has possessions folder/list

**Expected Behavior:**
- Item appears in character's possessions (main inventory)
- Item NOT in hangar
- Item is directly owned by character

**Pass Criteria:**
- [ ] Item in character.system.possessions or equivalent
- [ ] Item visible in character sheet items tab
- [ ] Item accessible via drop-down menus
- [ ] Item NOT listed separately

---

### Test 5.2: Droids Route to Possessions (Character)

**Setup:**
1. Purchase droid via store
2. Character actor has possessions list

**Expected Behavior:**
- Droid appears in character's possessions
- Droid referenced correctly
- Droid stats accessible from character sheet

**Pass Criteria:**
- [ ] Droid in character possessions
- [ ] Can reference droid actions from character
- [ ] Droid sheet opens correctly
- [ ] No errors in reference chain

---

### Test 5.3: Vehicles Route to Hangar (Character)

**Setup:**
1. Purchase vehicle via store
2. Character has hangar section/field

**Expected Behavior:**
- Vehicle appears in character's hangar (separate from possessions)
- Vehicle NOT in general possessions
- Vehicle accessible via hangar-specific UI

**Pass Criteria:**
- [ ] Vehicle in character.system.hangar or equivalent
- [ ] Vehicle separated from possessions
- [ ] Hangar displays all owned vehicles
- [ ] Vehicle selection affects character stats

---

### Test 5.4: Vehicle Purchasing Vehicle (Nesting)

**Setup:**
1. Create test scenario: Vehicle 1 has funds
2. Use store to have Vehicle 1 purchase items/vehicles

**Expected Behavior:**
- Items route to Vehicle 1's possessions (cargo)
- Sub-vehicles route to Vehicle 1's hangar
- Nested ownership works correctly

**Pass Criteria:**
- [ ] Items in vehicle possessions
- [ ] Vehicles in vehicle hangar
- [ ] No ownership confusion
- [ ] Nested references resolve correctly

---

## Test Suite 6: Atomicity & State Verification

### Test 6.1: Verify No Partial State After Successful Purchase

**Setup:**
1. Character with known credit state
2. Purchase single item

**Steps:**
1. Record before state:
   - Credits: X
   - Item count: Y
2. Execute purchase
3. Record after state:
   - Credits: X'
   - Item count: Y'

**Verification:**
- Credits deducted: X - X' = item cost ✓
- Item created: Y' = Y + 1 ✓
- BOTH conditions satisfied (atomic) ✓

**Pass Criteria:**
- [ ] Credits changed
- [ ] Item created
- [ ] No partial state (never had credit deduction without item, or vice versa)

---

### Test 6.2: Verify No Partial State After Failed Purchase

**Setup:**
1. Character with insufficient credits
2. Attempt purchase

**Steps:**
1. Record before state
2. Attempt purchase (fails)
3. Record after state

**Verification:**
- Credits unchanged: X' = X ✓
- Item NOT created: Y' = Y ✓
- NO mutations occurred ✓

**Pass Criteria:**
- [ ] Credits unchanged
- [ ] Item NOT created
- [ ] No partial state (nothing changed)

---

### Test 6.3: Verify Transaction Atomicity with 3+ Items

**Setup:**
1. Multi-item cart (item + droid + vehicle)
2. All actors have templates available
3. Character has exact cost in credits

**Monitoring:**
Open console and watch:
```javascript
// Before transaction
const before = {
  credits: actor.system.credits,
  items: actor.items.size,
  possessions: actor.system.possessions?.length || 0,
  hangar: actor.system.hangar?.length || 0
};

// Execute checkout

// After transaction
const after = {
  credits: actor.system.credits,
  items: actor.items.size,
  possessions: actor.system.possessions?.length || 0,
  hangar: actor.system.hangar?.length || 0
};

// Verify atomic:
// - EITHER all changes happened
// - OR no changes happened
// - NEVER partial changes
```

**Pass Criteria:**
- [ ] All 3 actors created
- [ ] Credits deducted exactly once
- [ ] All 3 visible in character sheet
- [ ] No partial state observable
- [ ] No ghost items or actors

---

## Test Suite 7: Logging & Audit Trail

### Test 7.1: Store Transaction Logged

**Setup:**
1. Make any purchase
2. Check world flags/settings

**Expected Behavior:**
- Transaction ID recorded
- Metadata stored:
  - Actor ID
  - Items purchased
  - Cost deducted
  - Timestamp

**Pass Criteria:**
- [ ] Transaction logged
- [ ] Metadata accurate
- [ ] Can retrieve transaction history
- [ ] Logs helpful for debugging

**Check:**
```javascript
// In console:
game.user.getFlag('foundryvtt-swse', 'sessionPurchaseIds')
// Should show array of recent transaction IDs
```

---

### Test 7.2: No Console Warnings/Errors

**Setup:**
1. Open browser console (F12)
2. Execute full test suite 1-5
3. Monitor console throughout

**Expected Behavior:**
- No errors logged
- No warnings about mutations
- No deprecation warnings
- Occasional info logs OK

**Pass Criteria:**
- [ ] Zero errors in console
- [ ] Zero warnings about mutations
- [ ] Info logs only (normal operation)
- [ ] No permission errors

---

## Test Suite 8: Performance Baseline

### Test 8.1: Single Item Purchase Performance

**Measurement:**
1. Time store load
2. Time single item purchase
3. Time actor sheet update

**Expected:**
- Store load: < 2 seconds
- Item purchase: < 3 seconds
- Sheet update: < 1 second
- Total: < 6 seconds

**Pass Criteria:**
- [ ] Store loads in < 2s
- [ ] Purchase completes in < 3s
- [ ] Performance acceptable

---

### Test 8.2: Multi-Item Purchase Performance

**Measurement:**
1. Create cart with 10 diverse items
2. Time checkout process
3. Time all actors created and visible

**Expected:**
- Checkout: < 5 seconds
- All items visible immediately
- No lag in UI

**Pass Criteria:**
- [ ] Checkout < 5 seconds
- [ ] All items appear simultaneously
- [ ] No UI lag

---

## Final Validation Checklist

### ✓ Basic Functionality
- [ ] Store loads without errors
- [ ] Inventory displays correctly
- [ ] Prices are accurate
- [ ] Item purchase works
- [ ] Droid purchase works
- [ ] Vehicle purchase works (new and used)

### ✓ Atomicity
- [ ] Credits deducted only when item created
- [ ] Item created only when credits deducted
- [ ] No partial state observable
- [ ] Multi-item purchases complete atomically

### ✓ Error Handling
- [ ] Insufficient funds handled gracefully
- [ ] Factory errors caught and reported
- [ ] Race conditions prevented
- [ ] Cancellations preserve state

### ✓ Placement
- [ ] Items in possessions
- [ ] Droids in possessions
- [ ] Vehicles in hangar
- [ ] Nesting works (vehicle purchases items)

### ✓ Performance
- [ ] Store loads < 2 seconds
- [ ] Single purchase < 3 seconds
- [ ] Multi-item < 5 seconds
- [ ] No noticeable UI lag

### ✓ Logging
- [ ] Transactions recorded
- [ ] Metadata complete
- [ ] Console clean (no errors)
- [ ] Debug info available

---

## Sign-Off

When all tests pass:

- [ ] Date: ________________
- [ ] Tester: ________________
- [ ] Foundry Version: ________________
- [ ] System Version: ________________
- [ ] Notes: ________________________________________

**Phase 9 Integration Testing: PASSED ✓**

Proceed to **Phase 10: UI Hardening**
