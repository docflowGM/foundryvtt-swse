# MutationAdapter Usage Guide

**Purpose:** Standard interface for all actor/item mutations  
**Location:** `scripts/governance/mutation-adapter.js`  
**Status:** Ready for Batch 4 refactoring

---

## Quick Reference

| Operation | Pattern | Example |
|-----------|---------|---------|
| Update actor fields | `MutationAdapter.updateActorFields(actor, {...})` | Update HP, XP, stats |
| Add items | `MutationAdapter.createItems(actor, {...})` | Grant weapons, armor |
| Modify items | `MutationAdapter.updateItems(actor, {...})` | Change quantity, equipped |
| Remove items | `MutationAdapter.deleteItems(actor, ids)` | Delete items |
| Transfer items | `MutationAdapter.moveItems(source, target, ids)` | Inventory transfer |

---

## Import

```javascript
import { MutationAdapter } from '/systems/foundryvtt-swse/scripts/governance/mutation-adapter.js';
```

---

## updateActorFields — Update Actor Data

**Purpose:** Modify actor system data  
**Routes to:** `ActorEngine.updateActor()`

### Basic Usage

```javascript
// ❌ OLD (direct mutation)
await actor.update({ 'system.hp.value': 50 });

// ✅ NEW (via adapter)
await MutationAdapter.updateActorFields(actor, {
  'system.hp.value': 50
});
```

### Multiple Fields

```javascript
await MutationAdapter.updateActorFields(actor, {
  'system.hp.value': 50,
  'system.hp.max': 75,
  'system.xp.total': 2000
});
```

### With Source Tracking

```javascript
await MutationAdapter.updateActorFields(actor, {
  'system.hp.value': 25
}, {
  source: 'damage-engine'
});
```

---

## createItems — Add Items to Actor

**Purpose:** Create/grant items to an actor  
**Routes to:** `ActorEngine.createEmbeddedDocuments()`

### Single Item

```javascript
// ❌ OLD (direct mutation)
await actor.createEmbeddedDocuments('Item', [{
  name: 'Blaster Pistol',
  type: 'weapon',
  system: { ... }
}]);

// ✅ NEW (via adapter)
await MutationAdapter.createItems(actor, {
  name: 'Blaster Pistol',
  type: 'weapon',
  system: { ... }
});
```

### Multiple Items

```javascript
await MutationAdapter.createItems(actor, [
  {
    name: 'Item 1',
    type: 'weapon',
    system: { ... }
  },
  {
    name: 'Item 2',
    type: 'armor',
    system: { ... }
  }
]);
```

### From Template or Clone

```javascript
// Clone an item and add to actor
const sourceItem = sourceActor.items.get('itemId');
const itemData = sourceItem.toObject();
delete itemData._id; // Let Foundry generate new ID

await MutationAdapter.createItems(actor, itemData);
```

---

## updateItems — Modify Items on Actor

**Purpose:** Update existing items  
**Routes to:** `ActorEngine.updateEmbeddedDocuments()`

### Single Item

```javascript
// ❌ OLD (direct mutation)
const item = actor.items.get('itemId');
await item.update({ 'system.quantity': 5 });

// ✅ NEW (via adapter)
await MutationAdapter.updateItems(actor, {
  _id: 'itemId',
  'system.quantity': 5
});
```

### Multiple Items

```javascript
await MutationAdapter.updateItems(actor, [
  {
    _id: 'itemId1',
    'system.quantity': 3
  },
  {
    _id: 'itemId2',
    'system.equipped': true
  }
]);
```

### Find and Update Pattern

```javascript
// Find items by criteria and update
const meleeWeapons = actor.items.filter(item => 
  item.type === 'weapon' && item.system.isMelee
);

const updates = meleeWeapons.map(item => ({
  _id: item.id,
  'system.bonus': 2
}));

await MutationAdapter.updateItems(actor, updates, {
  source: 'buff-engine'
});
```

---

## deleteItems — Remove Items from Actor

**Purpose:** Delete items from an actor  
**Routes to:** `ActorEngine.deleteEmbeddedDocuments()`

### Single Item

```javascript
// ❌ OLD (direct mutation)
await actor.deleteEmbeddedDocuments('Item', ['itemId']);

// ✅ NEW (via adapter)
await MutationAdapter.deleteItems(actor, 'itemId');
```

### Multiple Items

```javascript
await MutationAdapter.deleteItems(actor, [
  'itemId1',
  'itemId2',
  'itemId3'
]);
```

### Conditional Delete

```javascript
// Find and delete consumables
const consumables = actor.items.filter(item => item.system.isConsumable);
const ids = consumables.map(item => item.id);

await MutationAdapter.deleteItems(actor, ids, {
  source: 'consumption-engine'
});
```

---

## moveItems — Atomic Item Transfer

**Purpose:** Transfer items between actors  
**Routes to:** Delete from source + Create on target

### Basic Transfer

```javascript
// ❌ OLD (manual, error-prone)
const item = sourceActor.items.get('itemId');
const data = item.toObject();
delete data._id;
await sourceActor.deleteEmbeddedDocuments('Item', ['itemId']);
await targetActor.createEmbeddedDocuments('Item', [data]);

// ✅ NEW (atomic via adapter)
await MutationAdapter.moveItems(sourceActor, targetActor, 'itemId');
```

### Multiple Items

```javascript
await MutationAdapter.moveItems(sourceActor, targetActor, [
  'itemId1',
  'itemId2'
], {
  source: 'inventory-transfer'
});
```

### Result Handling

```javascript
const result = await MutationAdapter.moveItems(source, target, ids);
// result.deleted: Items removed from source
// result.created: Items created on target
// Use for confirmation messages, logging, etc.
```

---

## Common Patterns

### Pattern 1: Batch Operations

```javascript
// Granting multiple items (e.g., leveling up)
const newItems = [
  { name: 'Ability 1', type: 'feat', system: { ... } },
  { name: 'Ability 2', type: 'feat', system: { ... } }
];

await MutationAdapter.createItems(actor, newItems, {
  source: 'level-up-engine'
});
```

### Pattern 2: Quantity Management

```javascript
// Consume an item (reduce quantity by 1)
const item = actor.items.get('itemId');
const newQuantity = (item.system.quantity || 1) - 1;

if (newQuantity > 0) {
  await MutationAdapter.updateItems(actor, {
    _id: item.id,
    'system.quantity': newQuantity
  });
} else {
  await MutationAdapter.deleteItems(actor, item.id);
}
```

### Pattern 3: Item Replacement

```javascript
// Replace an item (delete old, create new)
const oldItemId = 'oldId';
const newItemData = { name: 'New Item', type: 'weapon', system: { ... } };

await MutationAdapter.deleteItems(actor, oldItemId);
await MutationAdapter.createItems(actor, newItemData);
```

### Pattern 4: Multi-Actor Update

```javascript
// Update multiple actors simultaneously
const updates = [
  { actor: actor1, changes: { 'system.hp.value': 50 } },
  { actor: actor2, changes: { 'system.hp.value': 75 } }
];

await Promise.all(
  updates.map(({ actor, changes }) =>
    MutationAdapter.updateActorFields(actor, changes)
  )
);
```

---

## Batch 4 Refactoring Checklist

When refactoring the 51 violations, use this checklist:

### For item.update() calls:
- [ ] Replace with `MutationAdapter.updateItems(actor, { _id: item.id, ... })`
- [ ] Ensure actor reference is available
- [ ] Test quantity and equipped state updates

### For actor.createEmbeddedDocuments() calls:
- [ ] Replace with `MutationAdapter.createItems(actor, [...])`
- [ ] Ensure _id is stripped from new items
- [ ] Validate item data structure

### For actor.deleteEmbeddedDocuments() calls:
- [ ] Replace with `MutationAdapter.deleteItems(actor, [...])`
- [ ] Ensure IDs are string array
- [ ] Test cascade behavior (if any)

### For actor.updateEmbeddedDocuments() calls:
- [ ] Replace with `MutationAdapter.updateEmbeddedDocuments(actor, [...])`
- [ ] Ensure all updates have _id
- [ ] Validate field updates

### For actor.update() calls:
- [ ] Replace with `MutationAdapter.updateActorFields(actor, {...})`
- [ ] Flatten nested updates to dot notation
- [ ] Preserve any options/metadata

---

## Testing Your Refactoring

### Unit Test Template

```javascript
// Test that mutation routes through adapter
async function testAdapterMutation(actor, testName) {
  const before = actor.system.hp.value;
  
  await MutationAdapter.updateActorFields(actor, {
    'system.hp.value': before + 10
  });
  
  const after = actor.system.hp.value;
  console.assert(after === before + 10, `${testName} failed`);
  console.log(`✅ ${testName}`);
}

// Usage:
testAdapterMutation(actor, 'HP update via adapter');
```

### Lint Verification

```bash
# After refactoring, run lint to verify no direct mutations remain
npm run lint:mutation

# Should show:
# Total violations: < 117 (was 117 before Batch 4)
# Authoritative mutations: 0 (was 51 before Batch 4)
```

---

## Migration Path (for Batch 4)

### Step 1: Group violations by type
- Group 1: item.update() calls (10+)
- Group 2: actor.update() calls (15+)
- Group 3: createEmbeddedDocuments() calls (8+)
- Group 4: Other mutations (18+)

### Step 2: Refactor by group using adapter
- Process Group 1 → All use `MutationAdapter.updateItems()`
- Process Group 2 → All use `MutationAdapter.updateActorFields()`
- Process Group 3 → All use `MutationAdapter.createItems()`
- Process Group 4 → Mixed, refactor individually

### Step 3: Verify with lint
```bash
npm run lint:mutation
```

Should show 0 authoritative violations.

---

## Summary

| Adapter Method | Replaces | Batch 4 Count |
|---|---|---|
| updateActorFields | actor.update() | 15+ |
| createItems | actor.createEmbeddedDocuments() | 8+ |
| updateItems | actor.updateEmbeddedDocuments(), item.update() | 18+ |
| deleteItems | actor.deleteEmbeddedDocuments() | 8+ |
| moveItems | (new pattern) | 2+ |

**Total violations fixed:** 51  
**Refactoring pattern:** 5 simple methods  
**Risk level:** Low (adapter just delegates to ActorEngine)

