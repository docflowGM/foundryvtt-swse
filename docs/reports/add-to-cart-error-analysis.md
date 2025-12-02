# "Add to Cart" Error - Root Cause Analysis

## The Problem

When clicking "Add to Cart" on weapons from compendium packs, you likely see one of these errors:
1. **Error: "Item not found: weapon-blaster-pistol"**
2. **TypeError: Cannot read property 'name' of undefined**
3. **No error but nothing happens** (silent failure)

## Root Cause: ID Mismatch Between Template and Store Cache

### The Bug Flow

#### Step 1: Loading Inventory (`store-inventory.js:14-49`)
```javascript
// Load items from compendium
const pack = game.packs.get('swse.weapons');
const documents = await pack.getDocuments();  // Foundry Documents
packItems.push(...documents);

const allItems = [...worldItems, ...packItems];

// Store ORIGINAL Foundry Documents in itemsById
validItems.forEach(item => {
    itemsById.set(item.id, item);  // ← Stores Foundry Document
});

// But categories get TRANSFORMED plain objects
const categories = {
    weapons: sortWeapons(
        validItems
            .filter(i => i.type === "weapon")
            .map(addFinalCost)  // ← Transforms to plain object
    )
};
```

#### Step 2: Plain Object Transformation (`store-pricing.js:22-48`)
```javascript
export function addFinalCost(item) {
    const baseCost = Number(item.system?.cost) || 0;

    // Convert Foundry Document to plain object
    const plainItem = item.toObject ? item.toObject() : item;

    // Determine the ID
    const itemId = item.id || item._id || plainItem.id || plainItem._id;

    return {
        ...plainItem,      // ← This is the plain object data
        id: itemId,        // ← ID from Document
        _id: itemId,
        finalCost: calculateFinalCost(baseCost)
    };
}
```

**The Problem:** When `item.toObject()` is called on a Foundry Item Document, it returns the **database representation** which has:
- `_id`: The compendium ID (e.g., "weapon-blaster-pistol")
- `name`, `type`, `img`, `system`, etc.
- **BUT NOT `id`** - that's only on the Document object!

So:
- **Document has:** `item.id = "weapon-blaster-pistol"` (runtime property)
- **Plain object has:** `plainItem._id = "weapon-blaster-pistol"` (database field)

#### Step 3: Setting the ID
```javascript
const itemId = item.id || item._id || plainItem.id || plainItem._id;
```

This logic tries to get the ID, but it's getting it from `item.id` (the Document). Then it creates:
```javascript
return {
    ...plainItem,  // Has _id but NOT id
    id: itemId,    // Sets id from Document
    _id: itemId
};
```

**This should work!** The plain object now has both `id` and `_id`.

#### Step 4: Template Rendering
```handlebars
<button data-item-id="{{this.id}}">
```

The template uses `{{this.id}}`, which should be the ID we just set. **This should work too!**

#### Step 5: Add to Cart Click (`store-checkout.js:18-41`)
```javascript
export async function addItemToCart(store, itemId, updateDialogueCallback) {
    // Try to get from world items first
    let item = game.items.get(itemId);  // ← Won't find compendium items

    if (!item) {
        item = store.itemsById.get(itemId);  // ← Should find it here
    }

    if (!item) {
        ui.notifications.error(`Item not found: ${itemId}`);
        return;  // ← ERROR HAPPENS HERE
    }
}
```

**The itemsById map was populated with:**
```javascript
itemsById.set(item.id, item);  // Using Document's item.id as key
```

## The Actual Bug

**There are actually TWO potential issues:**

### Issue A: Compendium Documents vs World Documents
When items come from compendium packs and you call `pack.getDocuments()`, they are **compendium index entries**, not full Documents. They might not have the full `item.id` property populated the same way world items do.

### Issue B: The Real Culprit - Weapon Categorization Processing
Looking at `store-inventory.js:103`:
```javascript
weapons: sortWeapons(validItems.filter(i => i.type === "weapon").map(addFinalCost))
```

The weapons go through:
1. `filter()` - returns Foundry Documents
2. `map(addFinalCost)` - transforms to plain objects
3. `sortWeapons()` - categorizes and sorts

In `sortWeapons()` (`store-shared.js:516-557`):
```javascript
export function sortWeapons(weapons) {
    // weapons parameter is already plain objects from addFinalCost
    const categorized = { melee: {...}, ranged: {...} };

    for (const weapon of weapons) {
        const subcategory = weapon.system?.subcategory || 'other';
        // ...
        if (categorized.melee[subcategory]) {
            categorized.melee[subcategory].push(weapon);  // ← Plain object
        }
    }
    return categorized;
}
```

**So the template receives plain objects, NOT Documents!**

But `itemsById` still has the **original** Foundry Documents, stored with:
```javascript
itemsById.set(item.id, item);  // Document with item.id
```

### The ID Mismatch

**If** the Foundry Document's `item.id` property is different from what's in the plain object's `id` field, you get a mismatch:

**itemsById Map:**
```javascript
Map {
  "some-runtime-id-12345" => Document { id: "some-runtime-id-12345", _id: "weapon-blaster-pistol", ... }
}
```

**Template:**
```handlebars
<button data-item-id="weapon-blaster-pistol">  <!-- Using plainItem.id which came from _id -->
```

**Add to Cart:**
```javascript
item = store.itemsById.get("weapon-blaster-pistol");  // ← NOT FOUND!
```

## Testing the Theory

To confirm this is the issue, check the browser console when clicking "Add to Cart":

1. **If you see:** `"Item not found: weapon-blaster-pistol"`
   - The ID in the template doesn't match the key in itemsById

2. **If you see:** `TypeError: Cannot read property 'name' of undefined`
   - The item lookup succeeded but returned undefined

3. **If you see:** No error but cart count doesn't update
   - The item is being added but there's a rendering issue

## The Fix

The fix is to ensure `itemsById` uses the **same ID** that ends up in the template. Since the template gets plain objects with `id` set from the Document, we need to update how itemsById is populated.

**Option 1: Store plain objects in itemsById**
```javascript
const itemsWithCost = validItems.map(addFinalCost);
itemsWithCost.forEach(item => {
    itemsById.set(item.id, item);  // Plain object with consistent ID
});
```

But this breaks checkout because checkout needs the original Document to call `.toObject()`.

**Option 2: Store both the Document AND keep track of the transformed ID**
This is complex and error-prone.

**Option 3 (RECOMMENDED): Keep original Documents in itemsById, but ensure ID consistency**
```javascript
// When adding to cart, retrieve by both id and _id
let item = game.items.get(itemId);
if (!item) {
    item = store.itemsById.get(itemId);
}
// If still not found, try searching by _id
if (!item) {
    for (const [key, value] of store.itemsById.entries()) {
        if (value._id === itemId || value.id === itemId) {
            item = value;
            break;
        }
    }
}
```

This is the safest fix that doesn't break existing functionality.
