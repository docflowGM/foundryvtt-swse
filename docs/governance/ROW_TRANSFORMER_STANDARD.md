# ROW TRANSFORMER STANDARD

**How to Write Idempotent, Reusable Row Transformers**

---

## QUICK REFERENCE

A row transformer converts raw actor data into a standardized "row" object suitable for display in ledger panels and row subpartials.

**Pattern:**
```javascript
function transform<SourceType>Row(sourceObject, actorContext) {
  return {
    id: sourceObject._id,
    uuid: sourceObject.uuid,
    name: sourceObject.name,
    img: sourceObject.img,
    type: sourceObject.type,
    cssClass: `row--${sourceObject.type}`,
    canEdit: true,
    canDelete: true,
    tags: [],
    display: {
      // Context-specific display fields
    }
  };
}
```

**Key Principles:**
1. **Idempotent**: Same input → Same output, always
2. **Stateless**: No side effects, no external state modification
3. **Defensive**: Handle undefined/missing properties gracefully
4. **Documented**: JSDoc with @example showing transformation
5. **Testable**: Can be tested independently of sheets/panels

---

## STANDARD ROW SHAPE

Every row transformer MUST produce this minimum shape:

```javascript
{
  // Identification (REQUIRED, always)
  id: string,           // Unique ID (e.g., item._id, talent.id)
  uuid: string,         // System UUID or Foundry UUID

  // Display (REQUIRED, always)
  name: string,         // Human-readable name
  img: string,          // Image path (fallback to 'icons/svg/mystery-man.svg')
  type: string,         // Item type, talent type, protocol type, etc.
  cssClass: string,     // CSS class for styling (e.g., 'row--weapon')

  // Permissions (REQUIRED, always)
  canEdit: boolean,     // Can user edit this row
  canDelete: boolean,   // Can user delete this row

  // Tags/Metadata (OPTIONAL, common)
  tags: string[],       // ['equipped', 'favorite', 'restricted']
  rarity: string,       // 'common', 'rare', 'legendary'

  // Display Values (REQUIRED for ledger, context-specific)
  display: {
    // Examples:
    qty: number,        // For inventory items
    weight: number,     // For inventory items
    cost: number,       // For inventory items
    bonus: string,      // For talents
    range: string,      // For weapons
    // Add context-specific fields as needed
  },

  // Developer Flags (OPTIONAL, for internal state)
  flags: {
    isNew: boolean,
    isDirty: boolean,
    isLocked: boolean
  }
}
```

---

## WRITING A ROW TRANSFORMER

### Step 1: Define the Contract

What type of object are you transforming? What fields does it have?

```javascript
/**
 * Transform inventory item to ledger row
 *
 * Source: actor.items of type 'equipment', 'weapon', 'armor', etc.
 * Output: Standardized row for inventory-ledger-panel
 *
 * @param {Item} item - Actor item object
 * @param {Actor} actor - Parent actor (optional context)
 * @returns {object} Standardized row
 *
 * @example
 * const item = {_id: '123', name: 'Blaster', type: 'weapon', quantity: 1, ...}
 * const row = transformInventoryItemRow(item)
 * // Returns:
 * // {id: '123', name: 'Blaster', type: 'weapon', qty: 1, canEdit: true, ...}
 */
```

### Step 2: Extract Required Fields

Always extract: id, uuid, name, img, type

```javascript
function transformInventoryItemRow(item, actor) {
  // Defensive: Use nullish coalescing and fallbacks
  const id = item._id ?? item.id ?? null;
  const uuid = item.uuid ?? null;
  const name = item.name ?? '[Unnamed]';
  const img = item.img ?? 'icons/svg/mystery-man.svg';
  const type = item.type ?? 'miscellaneous';

  // ... more fields ...
}
```

### Step 3: Build CSS Class

Use item type and tags to build CSS class:

```javascript
function transformInventoryItemRow(item, actor) {
  // ... fields ...

  // CSS class: row--<type> + tags
  const tags = item.getFlag('swse', 'tags') ?? [];
  const cssClass = [
    `row--${type}`,
    ...tags.map(tag => `row-status--${tag}`)
  ].join(' ');

  // ... more ...
}
```

### Step 4: Build Display Object

Context-specific fields go in display:

```javascript
function transformInventoryItemRow(item, actor) {
  // ... fields ...

  const display = {
    qty: item.system?.quantity ?? 1,
    weight: item.system?.weight ?? 0,
    cost: item.system?.cost ?? 0
  };

  // ... more ...
}
```

### Step 5: Determine Permissions

Can the user edit/delete this row?

```javascript
function transformInventoryItemRow(item, actor) {
  // ... fields ...

  // Permissions
  const canEdit = item.type !== 'equipped-armor'; // Equipped armor can't be edited inline
  const canDelete = item.type !== 'equipped-armor'; // Same rule

  // ... more ...
}
```

### Step 6: Return Standardized Row

Use helper to ensure consistent shape:

```javascript
import { createStandardRow } from './RowTransformerHelpers.js';

function transformInventoryItemRow(item, actor) {
  return createStandardRow(item, {
    id: item._id,
    uuid: item.uuid,
    name: item.name,
    img: item.img,
    type: item.type,
    cssClass: `row--${item.type}`,
    canEdit: item.type !== 'equipped-armor',
    canDelete: item.type !== 'equipped-armor',
    tags: item.getFlag('swse', 'tags') ?? [],
    rarity: item.getFlag('swse', 'rarity'),
    display: {
      qty: item.system?.quantity ?? 1,
      weight: item.system?.weight ?? 0,
      cost: item.system?.cost ?? 0
    }
  });
}
```

---

## CRITICAL RULES

### Rule RT-1: Never Modify Source Object

```javascript
// ❌ WRONG
function transformInventoryItemRow(item) {
  item._displayQty = item.quantity; // Modifying source!
  return item;
}

// ✅ RIGHT
function transformInventoryItemRow(item) {
  return {
    ...standardFields,
    display: {qty: item.quantity}
  };
}
```

### Rule RT-2: Be Idempotent

Same input must always produce same output:

```javascript
// ❌ WRONG (Not idempotent)
function transformTalentRow(talent) {
  return {
    ...fields,
    createdAt: new Date() // Different on each call!
  };
}

// ✅ RIGHT (Idempotent)
function transformTalentRow(talent) {
  return {
    ...fields,
    uuid: talent.uuid, // Same value every time
    creatorsNotes: talent.getFlag('swse', 'notes')
  };
}
```

### Rule RT-3: Handle Undefined Gracefully

Never throw on missing properties:

```javascript
// ❌ WRONG (Throws if quantity missing)
function transformInventoryItemRow(item) {
  const qty = item.system.quantity; // What if undefined?
  return {...};
}

// ✅ RIGHT (Safe fallback)
function transformInventoryItemRow(item) {
  const qty = item.system?.quantity ?? 1;
  return {...};
}
```

### Rule RT-4: Don't Copy Unfiltered Data

Only include fields your ledger actually needs:

```javascript
// ❌ WRONG (Copies entire item)
function transformInventoryItemRow(item) {
  return item; // Too much data!
}

// ✅ RIGHT (Only needed fields)
function transformInventoryItemRow(item) {
  return {
    id: item._id,
    name: item.name,
    display: {qty: item.system.quantity}
    // Only fields needed for display
  };
}
```

### Rule RT-5: Use Transformer for Business Logic

Calculations go in transformer, not template:

```javascript
// ❌ WRONG (Logic in template)
// Template: <span>{{item.qty * item.unitWeight}}</span>

// ✅ RIGHT (Logic in transformer)
function transformInventoryItemRow(item) {
  return {
    ...fields,
    display: {
      qty: item.system.quantity,
      weight: item.system.weight,
      totalWeight: item.system.quantity * item.system.weight // Calculated here
    }
  };
}
```

### Rule RT-6: Consistent Type Names

Row types should match source type or be clearly mapped:

```javascript
// Examples
function transformInventoryItemRow(item) {
  // Item type is 'weapon', 'armor', 'equipment'
  // Row type should be same or documented mapping
  return {type: item.type}; // Clear mapping
}

function transformTalentRow(talent) {
  // Talent doesn't have .type, so map it
  return {type: 'talent'}; // Explicit mapping
}

function transformDroidProtocolRow(protocol) {
  // Protocol is a custom object, map to 'protocol'
  return {type: 'protocol'}; // Explicit mapping
}
```

---

## TESTING ROW TRANSFORMERS

### Test 1: Idempotence

```javascript
function testIdempotence(transformer, sampleData) {
  const run1 = transformer(sampleData);
  const run2 = transformer(sampleData);

  if (JSON.stringify(run1) !== JSON.stringify(run2)) {
    console.error('Transformer is not idempotent!');
  }
}

// Test it
const sampleItem = actor.items[0];
testIdempotence(transformInventoryItemRow, sampleItem);
```

### Test 2: Edge Cases

```javascript
// Test with minimal/missing data
const minimalItem = {
  _id: '123',
  name: 'Item',
  // Missing everything else
};

const row = transformInventoryItemRow(minimalItem);
// Should not throw, should have fallback values

console.assert(row.id === '123');
console.assert(row.name === 'Item');
console.assert(row.img === 'icons/svg/mystery-man.svg'); // Fallback
```

### Test 3: Output Shape

```javascript
// Test that output matches expected shape
const row = transformInventoryItemRow(item);

// Required fields present
console.assert('id' in row);
console.assert('name' in row);
console.assert('display' in row);
console.assert(typeof row.canEdit === 'boolean');

// Display has expected fields
console.assert('qty' in row.display);
console.assert('weight' in row.display);
```

---

## REUSING ROW TRANSFORMERS

If two sheets need the same transformation, reuse the transformer:

```javascript
// In a shared location (shared/transformers.js or similar)
export function transformInventoryItemRow(item, actor) {
  return {...};
}

// In character sheet
import {transformInventoryItemRow} from '../shared/transformers.js';

function buildInventoryPanel(actor) {
  const entries = actor.items.map(item => transformInventoryItemRow(item, actor));
  return {entries, hasEntries: entries.length > 0};
}

// In NPC sheet (reuses same transformer)
import {transformInventoryItemRow} from '../shared/transformers.js';

function buildInventoryPanel(actor) {
  const entries = actor.items.map(item => transformInventoryItemRow(item, actor));
  return {entries, hasEntries: entries.length > 0};
}

// In droid sheet (reuses same transformer)
import {transformInventoryItemRow} from '../shared/transformers.js';

function buildInventoryPanel(actor) {
  const entries = actor.items.map(item => transformInventoryItemRow(item, actor));
  return {entries, hasEntries: entries.length > 0};
}
```

---

## HELPERS

Use these helpers from `RowTransformerHelpers.js`:

```javascript
import {
  createStandardRow,
  createRowCssClass,
  safeGet,
  validateTransformerIdempotence,
  transformBatch
} from '../shared/RowTransformerHelpers.js';

// Create row with helpers
const row = createStandardRow(item, {
  id: item._id,
  name: item.name,
  // ... config ...
});

// Generate CSS class
const cssClass = createRowCssClass(row, {
  baseClass: 'inventory-row',
  includeType: true,
  includeStatus: true
});

// Safe property access
const qty = safeGet(item, 'system.quantity', 1);

// Validate idempotence during development
validateTransformerIdempotence(transformInventoryItemRow, testItem, actor);

// Batch transform with error handling
const {rows, errors} = transformBatch(
  actor.items,
  transformInventoryItemRow,
  {actor},
  false // Don't throw on errors
);
```

---

## SUMMARY CHECKLIST

When writing a row transformer, verify:

```
✅ Function named transformXxxRow()
✅ Takes source object + optional actor context
✅ Returns standardized row shape (id, uuid, name, img, type, cssClass, canEdit, canDelete, display)
✅ Never modifies source object
✅ Idempotent (same input → same output always)
✅ Handles undefined properties gracefully (uses ?? fallbacks)
✅ All required fields present (no undefined values for required fields)
✅ Display object has all needed fields documented
✅ CSS class generated from type + tags
✅ Permissions (canEdit/canDelete) set correctly
✅ JSDoc includes @param, @returns, @example
✅ No template-level business logic (calculations in transformer, not template)
✅ Tested with edge cases (missing properties)
✅ Tested for idempotence
✅ Optionally tested with PartialValidator.validateRow()
```

---

**Version:** 1.0
**Last Updated:** 2026-03-29
