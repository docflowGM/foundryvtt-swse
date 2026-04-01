# Batch 4 Migration Mapping

**Objective:** Replace all 51 authoritative mutations with MutationAdapter methods

**Status:** Ready for systematic refactoring

---

## Quick Reference

| Violation Type | Replace This | With This | Count |
|---|---|---|---|
| `actor.update(...)` | Direct mutation | `MutationAdapter.updateActorFields(...)` | 15+ |
| `item.update(...)` | Direct mutation | `MutationAdapter.updateItems(...)` | 10+ |
| `actor.createEmbeddedDocuments('Item', ...)` | Direct mutation | `MutationAdapter.createItems(...)` | 8+ |
| `actor.deleteEmbeddedDocuments('Item', ...)` | Direct mutation | `MutationAdapter.deleteItems(...)` | 8+ |
| `actor.updateEmbeddedDocuments('Item', ...)` | Direct mutation | `MutationAdapter.updateItems(...)` | 8+ |
| Other mutations | Direct mutation | Case-by-case | 2+ |

---

## Pattern 1: actor.update() → updateActorFields()

### Before
```javascript
// ❌ WRONG: Direct mutation
await actor.update({
  'system.hp.value': 50,
  'system.xp.total': 2000
});
```

### After
```javascript
// ✅ CORRECT: Via adapter
import { MutationAdapter } from '.../mutation-adapter.js';

await MutationAdapter.updateActorFields(actor, {
  'system.hp.value': 50,
  'system.xp.total': 2000
});
```

### With options
```javascript
await MutationAdapter.updateActorFields(actor, 
  { 'system.hp.value': 50 },
  { source: 'damage-engine' }
);
```

---

## Pattern 2: item.update() → updateItems()

### Before
```javascript
// ❌ WRONG: Direct item mutation
const item = actor.items.get('itemId');
await item.update({ 'system.quantity': 5 });
```

### After
```javascript
// ✅ CORRECT: Via adapter
import { MutationAdapter } from '.../mutation-adapter.js';

await MutationAdapter.updateItems(actor, {
  _id: 'itemId',
  'system.quantity': 5
});
```

### Or with direct reference
```javascript
const item = actor.items.get('itemId');
await MutationAdapter.updateItems(actor, {
  _id: item.id,
  'system.quantity': 5
});
```

### Or use convenience wrapper
```javascript
await MutationAdapter.updateSingleItem(actor, 'itemId', {
  'system.quantity': 5
});
```

---

## Pattern 3: actor.createEmbeddedDocuments('Item', ...) → createItems()

### Before
```javascript
// ❌ WRONG: Direct creation
await actor.createEmbeddedDocuments('Item', [
  {
    name: 'Blaster Pistol',
    type: 'weapon',
    system: { ... }
  }
]);
```

### After
```javascript
// ✅ CORRECT: Via adapter
import { MutationAdapter } from '.../mutation-adapter.js';

await MutationAdapter.createItems(actor, {
  name: 'Blaster Pistol',
  type: 'weapon',
  system: { ... }
});
```

### Multiple items
```javascript
await MutationAdapter.createItems(actor, [
  { name: 'Item 1', type: 'weapon', system: { ... } },
  { name: 'Item 2', type: 'armor', system: { ... } }
]);
```

---

## Pattern 4: actor.deleteEmbeddedDocuments('Item', ...) → deleteItems()

### Before
```javascript
// ❌ WRONG: Direct deletion
await actor.deleteEmbeddedDocuments('Item', ['itemId1', 'itemId2']);
```

### After
```javascript
// ✅ CORRECT: Via adapter
import { MutationAdapter } from '.../mutation-adapter.js';

await MutationAdapter.deleteItems(actor, ['itemId1', 'itemId2']);
```

### Single item
```javascript
await MutationAdapter.deleteItems(actor, 'itemId');
// or
await MutationAdapter.deleteSingleItem(actor, 'itemId');
```

---

## Pattern 5: actor.updateEmbeddedDocuments('Item', ...) → updateItems()

### Before
```javascript
// ❌ WRONG: Direct update
await actor.updateEmbeddedDocuments('Item', [
  { _id: 'item1', 'system.quantity': 3 },
  { _id: 'item2', 'system.equipped': true }
]);
```

### After
```javascript
// ✅ CORRECT: Via adapter
import { MutationAdapter } from '.../mutation-adapter.js';

await MutationAdapter.updateItems(actor, [
  { _id: 'item1', 'system.quantity': 3 },
  { _id: 'item2', 'system.equipped': true }
]);
```

---

## Advanced Patterns

### Pattern 6: Find and Update
```javascript
// Find items matching criteria and update them
const weapons = actor.items.filter(i => i.type === 'weapon');
const updates = weapons.map(w => ({
  _id: w.id,
  'system.bonus': 2
}));

await MutationAdapter.updateItems(actor, updates);
```

### Pattern 7: Conditional Update via upsertSingleItem
```javascript
// Update if exists, return null if not
const result = await MutationAdapter.upsertSingleItem(
  actor,
  item => item.name === 'Credits' && item.type === 'currency',
  { 'system.quantity': newQuantity }
);

if (!result) {
  console.log('Credits not found');
}
```

### Pattern 8: Item Replacement
```javascript
// Delete old item, create new one
await MutationAdapter.replaceItems(actor, {
  deleteIds: ['oldItemId'],
  createItems: [{
    name: 'New Item',
    type: 'weapon',
    system: { ... }
  }]
});
```

### Pattern 9: Item Transfer Between Actors
```javascript
// Move items from one actor to another
const result = await MutationAdapter.moveItems(
  sourceActor,
  targetActor,
  ['itemId1', 'itemId2']
);

console.log(`Moved ${result.created.length} items`);
```

### Pattern 10: Effect Creation
```javascript
// Create active effects
await MutationAdapter.createEffects(actor, {
  label: 'Buffs',
  icon: 'icons/...',
  changes: [...]
});
```

### Pattern 11: Effect Removal
```javascript
// Delete active effects
await MutationAdapter.deleteEffects(actor, ['effectId1', 'effectId2']);
```

### Pattern 12: Metadata Flags (Non-Gameplay State Only)
```javascript
// ✅ CORRECT: UI state
await MutationAdapter.setMetadataFlag(
  actor,
  'foundryvtt-swse',
  'uiExpanded',
  true
);

// ❌ WRONG: Never use for gameplay state
// await MutationAdapter.setMetadataFlag(actor, 'foundryvtt-swse', 'hp', 50);
```

---

## Batch 4 Refactoring Workflow

### Phase 1: Group by Pattern
1. Find all `actor.update()` calls (15+)
2. Find all `item.update()` calls (10+)
3. Find all `createEmbeddedDocuments()` calls (8+)
4. Find all `deleteEmbeddedDocuments()` calls (8+)
5. Find all other mutations (2+)

### Phase 2: Refactor by Group

#### Group 4A: actor.update() → updateActorFields()
- [ ] scripts/governance/sentinel/layers/combat-layer.js:131
- [ ] scripts/governance/sentinel/layers/utility-layer.js:173
- [ ] scripts/governance/sentinel/layers/utility-layer.js:177
- [ ] scripts/governance/sentinel/layers/utility-layer.js:223
- [ ] scripts/governance/sentinel/mutation-interceptor-lock.js:64
- [ ] scripts/governance/sentinel/mutation-interceptor-lock.js:70
- [ ] scripts/governance/sentinel/sentinel-categories.js:98
- [ ] scripts/governance/sentinel/sovereignty-enforcement.js:176
- [ ] scripts/governance/sentinel/v2-comprehensive-audit.js:169
- [ ] scripts/governance/sentinel/v2-comprehensive-audit.js:420
- [ ] (+ 5 more)

#### Group 4B: item.update() → updateItems()
- [ ] scripts/actors/base/swse-actor-base.js:185
- [ ] scripts/apps/upgrade-app.js:164
- [ ] scripts/apps/upgrade-app.js:204
- [ ] scripts/governance/mutation/batch-1-validation.js:91
- [ ] scripts/governance/mutation/batch-1-validation.js:104
- [ ] scripts/governance/mutation/batch-1-validation.js:108
- [ ] scripts/governance/mutation/batch-1-validation.js:111
- [ ] scripts/items/swse-item-sheet.js:151
- [ ] scripts/items/swse-item-sheet.js:181
- [ ] scripts/items/swse-item-sheet.js:204
- [ ] (+ more)

#### Group 4C: createEmbeddedDocuments() → createItems()
- [ ] scripts/engine/import/npc-template-importer-engine.js:311
- [ ] scripts/governance/sentinel/layers/utility-layer.js:183
- [ ] scripts/governance/sentinel/sovereignty-enforcement.js:176
- [ ] (+ 5 more)

#### Group 4D: deleteEmbeddedDocuments() → deleteItems()
- [ ] scripts/governance/sentinel/layers/utility-layer.js:193
- [ ] (+ 7 more)

### Phase 3: Verify with Lint
```bash
npm run lint:mutation
```

Expected output after Batch 4:
```
Total violations: 66 (was 117)
- Authoritative mutations: 0 (was 51)
- Suspicious metadata: 9 (unchanged)
- Unknown metadata: 57 (unchanged)
```

---

## Testing Your Refactoring

### Before Each Change
1. Read the surrounding code to understand intent
2. Identify the exact mutation operation
3. Determine which adapter method to use

### After Each Change
1. Verify the adapter call is correct
2. Test that the mutation still works
3. Check that no new errors appear in console

### Lint Verification
```bash
# Run lint after each file to track progress
npm run lint:mutation
```

---

## Common Gotchas

### Gotcha 1: Forgetting to Import
```javascript
// ❌ WRONG
await MutationAdapter.updateActorFields(actor, {...});

// ✅ CORRECT
import { MutationAdapter } from '.../mutation-adapter.js';
await MutationAdapter.updateActorFields(actor, {...});
```

### Gotcha 2: Missing _id in Updates
```javascript
// ❌ WRONG
await MutationAdapter.updateItems(actor, { 'system.quantity': 5 });

// ✅ CORRECT
await MutationAdapter.updateItems(actor, { _id: itemId, 'system.quantity': 5 });
```

### Gotcha 3: Stripping _id in Creates
```javascript
// ❌ WRONG (passing _id)
const itemData = { _id: 'oldId', name: 'Item', ... };
await MutationAdapter.createItems(actor, itemData); // Adapter strips it

// ✅ CORRECT (let adapter handle it)
const itemData = { name: 'Item', ... };
await MutationAdapter.createItems(actor, itemData);
```

### Gotcha 4: Using Flags for Gameplay State
```javascript
// ❌ WRONG: Never use for gameplay state
await MutationAdapter.setMetadataFlag(actor, 'foundryvtt-swse', 'hp', 50);

// ✅ CORRECT: Only for UI/session state
await MutationAdapter.setMetadataFlag(actor, 'foundryvtt-swse', 'uiState', 'expanded');
```

---

## Migration Path Recommendation

**Order of refactoring (priority):**

1. **Governance layers** (utility-layer.js, combat-layer.js, etc)
   - Easy to understand
   - High visibility
   - Good test coverage

2. **Item sheets** (swse-item-sheet.js, upgrade-app.js)
   - Clear, localized changes
   - High user-facing impact

3. **Import/template engines** (npc-importer, etc)
   - More complex logic
   - Careful with batch operations

4. **Sentinel/audit systems** (v2-comprehensive-audit.js, etc)
   - Understand the purpose first
   - May have special requirements

5. **Scattered violations** (remaining)
   - Handle case-by-case
   - Follow existing patterns

---

## Success Criteria

This batch is complete when:

- ✅ All 51 authoritative mutations refactored
- ✅ All calls use MutationAdapter methods
- ✅ No direct actor/item mutations remain
- ✅ `npm run lint:mutation` shows 0 authoritative violations
- ✅ All tests pass
- ✅ No new console errors

---

## One-Line Truth

**Batch 4: Replace every direct mutation with the appropriate MutationAdapter method. When done, your system is permanently governed.**

