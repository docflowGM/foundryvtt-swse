# SWSE Store ID Diagnostics

## Overview

The SWSE Store includes diagnostic utilities to identify and fix items or actors with missing or invalid IDs that could cause the "Invalid item selection" error.

## Symptoms of Invalid IDs

- Clicking "Add to Cart" shows "Invalid item selection" error
- Console warnings about items without IDs
- Items appear in store but can't be added to cart

## Diagnostic Commands

### Quick Diagnosis

Run this command in the browser console (F12) to scan for invalid IDs:

```javascript
await SWSEStore.diagnoseIds()
```

This will display a colored report showing:
- ✓ All items have valid IDs (green) - no issues found
- ⚠ Items with invalid IDs (orange) - lists problematic items
- Instructions for automatic repair

### Detailed Scan

For a detailed report object you can inspect:

```javascript
const report = await SWSEStore.scanForInvalidIds()
console.log(report)
```

This returns an object with:
```javascript
{
  items: [
    { source: 'swse.weapons', name: 'Blaster Pistol', type: 'weapon', uuid: '...' },
    // ... more items
  ],
  actors: [
    { source: 'swse.droids', name: 'Protocol Droid', type: 'droid', uuid: '...' }
    // ... more actors
  ],
  timestamp: '2025-01-28T12:34:56.789Z'
}
```

### Automatic Repair (GM Only)

To attempt automatic repair of invalid IDs:

```javascript
const report = await SWSEStore.scanForInvalidIds()
const results = await SWSEStore.fixInvalidIds(report)
console.log(results)
```

This will:
1. For **world items/actors**: Delete and recreate them with new valid IDs
2. For **compendium items/actors**: Report that the compendium pack needs rebuilding (cannot auto-fix)

Results object:
```javascript
{
  itemsFixed: 3,
  actorsFixed: 1,
  errors: [
    { item: 'Corrupted Blaster', error: 'Compendium pack swse.weapons contains corrupted item. Pack needs to be rebuilt.' }
  ]
}
```

## Understanding Results

### World Items/Actors
These can be automatically fixed by the repair utility. They will be deleted and recreated with proper IDs.

### Compendium Items/Actors
If items in compendium packs have invalid IDs, this indicates pack corruption. Options:
1. **Re-import the pack** from the original source
2. **Rebuild the pack** using Foundry's compendium tools
3. **Contact the system maintainer** for a fixed pack

## Prevention

The store now includes automatic filtering to prevent items without valid IDs from appearing:

1. **store-inventory.js** - Filters out invalid items before loading
2. **store-pricing.js** - Generates fallback IDs with warnings
3. **store-checkout.js** - Enhanced error messages for debugging

Items without valid IDs will:
- Show console warning: `"SWSE Store | Excluding item without ID: [Item Name]"`
- Not appear in the store interface
- Not cause "Invalid item selection" errors

## Workflow

1. User reports "Invalid item selection" error
2. GM runs `await SWSEStore.diagnoseIds()` in console
3. If issues found, GM runs auto-repair:
   ```javascript
   const report = await SWSEStore.scanForInvalidIds()
   await SWSEStore.fixInvalidIds(report)
   ```
4. For compendium pack errors, GM rebuilds or re-imports the pack
5. Refresh store and verify items appear correctly

## Technical Details

### What is a Valid ID?

Foundry Documents (Items, Actors) should have either:
- `id` property (16-character alphanumeric string)
- `_id` property (legacy format)

Example valid ID: `"a1b2c3d4e5f6g7h8"`

### Why Do IDs Go Missing?

Common causes:
- Compendium pack corruption
- Manual JSON editing without proper ID generation
- Migration errors between Foundry versions
- Improper import/export processes
- Module conflicts modifying item data

### Fallback IDs

If an item somehow makes it through without an ID, a fallback is generated:
- Format: `fallback-{item-name-slug}-{timestamp}`
- Example: `fallback-blaster-pistol-1706445678901`
- These items will display but cannot be purchased
- Prevents application crashes

## Support

If automatic repair fails or you encounter persistent ID issues:
1. Check console for detailed error messages
2. Verify compendium pack integrity
3. Report issue with diagnostic output to system maintainer
4. Include browser console output (F12)
