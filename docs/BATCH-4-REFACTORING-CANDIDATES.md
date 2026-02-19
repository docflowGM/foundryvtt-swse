# BATCH 4 Refactoring Candidates

**Status:** READY TO IMPLEMENT (waiting for test confirmation)

These are high-confidence atomicity issues identified by code inspection. Implementation will proceed only if tests confirm the semantic break.

---

## Candidate 1: Rule Element Batching

### Issue
```javascript
// scripts/engine/RuleElement.js - applyAllRules()
async applyAllRules() {
  for (const item of items) {
    for (const ruleData of item.system.rules) {
      const rule = RuleElement.create(ruleData, item);
      if (rule && rule.test(this.actor)) {
        await rule.apply(this.actor);  // ← Each call = separate transaction
      }
    }
  }
}
```

**Problem:** Applying one feat with 3 rules = 3 separate transactions + 3 recalcs

**Test that confirms:** Test 4 (Feat with multiple rules) + Test 7 (Talent tree batch)

**Refactoring Strategy:**

Create new ActorEngine operation: `applyRules`
```javascript
// In ActorEngine.js
static async applyRules(actor, rules) {
  // Collect all mutations into single batch
  const batchUpdates = {
    'system.bonuses': actor.system.bonuses || {},
    'system.conditionalBonuses': actor.system.conditionalBonuses || [],
    'system.abilities': actor.system.abilities || [],
    'system.progression.trainedSkills': actor.system.progression?.trainedSkills || []
  };

  // Apply rules and collect changes (don't mutate yet)
  for (const rule of rules) {
    if (rule.test(actor)) {
      await rule.collectUpdates(actor, batchUpdates);
    }
  }

  // Single transaction: apply all mutations at once
  return this.updateActor(actor, batchUpdates, {
    operation: 'applyRules',
    blockNestedMutations: true
  });
}
```

**New Rule Element Methods:**
```javascript
// In each RuleElement subclass, replace apply() with:
async collectUpdates(actor, updates) {
  // Add to batch instead of calling updateActor
  // Example for StatBonusRule:
  const bonuses = updates['system.bonuses'] || {};
  bonuses[this.data.stat] = bonuses[this.data.stat] || [];
  bonuses[this.data.stat].push({ key: this.key, value: this.data.value });
  updates['system.bonuses'] = bonuses;
}
```

**Change Sites:**
- `scripts/engine/RuleElement.js` - RuleEngine.applyAllRules()
- `scripts/engine/RuleElement.js` - All rule classes (implement collectUpdates)
- `scripts/actors/engine/actor-engine.js` - Add ActorEngine.applyRules()

**Priority:** HIGH - Most likely to fragment

---

## Candidate 2: Chargen Finalization Batching

### Issue
```javascript
// scripts/apps/chargen/chargen-main.js
async levelup() {
  // ... build items ...
  await this.actor.createEmbeddedDocuments('Item', feats);    // 1st
  await this.actor.createEmbeddedDocuments('Item', talents);  // 2nd
  await this.actor.createEmbeddedDocuments('Item', powers);   // 3rd
}
```

**Problem:** Chargen finalization = 3-5 separate transactions for what should be atomic character creation

**Test that confirms:** Test 1 (Character creation)

**Refactoring Strategy:**

Create new ActorEngine operation: `finalizeCharacter`
```javascript
// In ActorEngine.js
static async finalizeCharacter(actor, chargenData) {
  // Single transaction for entire finalization
  const updates = {
    'system.abilities': chargenData.abilities,
    'system.hp': chargenData.hp,
    'system.resources': chargenData.resources,
    'system.finalized': true
  };

  // Apply all updates + create all items in one batch
  return this.updateActor(actor, updates, {
    operation: 'finalizeCharacter',
    embeddedDocumentsToCreate: {
      'Item': [...chargenData.feats, ...chargenData.talents, ...chargenData.powers]
    },
    blockNestedMutations: true
  });
}
```

**Change Sites:**
- `scripts/apps/chargen/chargen-main.js` - levelup() method
- `scripts/apps/chargen-improved.js` - _applyHouseruleBonuses()
- `scripts/actors/engine/actor-engine.js` - Add finalizeCharacter()

**Priority:** MEDIUM-HIGH - Chargen is critical path, but currently passing policy

---

## Candidate 3: Item Selling Atomicity

### Issue
```javascript
// scripts/apps/item-selling-system.js
await item.delete();                                          // ← NOT in transaction
await ActorEngine.updateActor(actor, { 'system.credits': creditsAfter });  // ← In transaction
```

**Problem:** Item deletion happens outside ActorEngine; if updateActor fails, item is gone but credits not added

**Test that confirms:** Test 3 (Item selling)

**Refactoring Strategy:**

Route item deletion through ActorEngine:
```javascript
// In ActorEngine.js - add method
static async deleteEmbeddedDocuments(actor, type, ids) {
  return this.startTransaction({ operation: 'deleteEmbeddedDocuments' })
    .then(() => actor.deleteEmbeddedDocuments(type, ids))
    .finally(() => this.endTransaction());
}

// In item-selling-system.js, replace:
await item.delete();
await ActorEngine.updateActor(actor, { 'system.credits': ... });

// With:
await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', [item.id]);
await ActorEngine.updateActor(actor, { 'system.credits': ... });

// Or better, batch them:
await ActorEngine.sellItem(actor, item, salePrice);  // Single operation
```

**Change Sites:**
- `scripts/apps/item-selling-system.js` - resolveSale() function
- `scripts/actors/engine/actor-engine.js` - Add deleteEmbeddedDocuments() and/or sellItem()

**Priority:** MEDIUM - Potential data inconsistency

---

## Candidate 4: Store Cross-Actor Transactions

### Issue
```javascript
// store-checkout.js
await ActorEngine.updateActor(buyerActor, { 'system.credits': buyerCredits - cost });
// Somewhere else:
// await ActorEngine.updateActor(sellerActor, { 'system.credits': sellerCredits + cost });
```

**Problem:** Two separate transactions for one conceptual "transfer"

**Assessment:** This may be acceptable. Cross-actor atomicity is not typically enforced in Foundry. If tests show this is fine, leave as-is.

**Refactoring Strategy (if needed):**

Create cross-actor operation (lowest priority - likely not needed):
```javascript
// In ActorEngine.js
static async transferCredits(fromActor, toActor, amount) {
  // Two separate transactions (each actor independent)
  // This is semantically correct - no batching needed
  await this.updateActor(fromActor, { 'system.credits': fromActor.system.credits - amount });
  await this.updateActor(toActor, { 'system.credits': toActor.system.credits + amount });
}
```

**Priority:** LOW - Likely acceptable as-is

---

## Candidate 5: Mount Assignment Atomicity

### Issue
```javascript
// scripts/engine/mount/mount-engine.js
await actor.update({
  'system.mounted.isMounted': false,
  'system.mounted.mountId': null
});
// Elsewhere:
await actor.update({
  'system.mount.riderIds': validIds
});
```

**Problem:** Bidirectional relationship split across 2 transactions

**Assessment:** Acceptable. Two actors, two independent updates. No semantic violation.

**Priority:** LOW - Likely fine as-is

---

## Implementation Order (Post-Test)

**If Test Results Show:**

### HIGH FRAGMENTATION (5+ transactions for 1 action)
1. Implement Candidate 1 (Rule Element Batching) - immediately
2. Re-test to confirm fix
3. Implement Candidate 2 (Chargen Finalization) if also high
4. Re-test

### MEDIUM FRAGMENTATION (3-4 transactions for 1 action)
1. Implement Candidate 1 (Rule Elements) - first
2. Implement Candidate 3 (Item Selling) - if failure risk exists
3. Leave Candidates 2, 4, 5 as-is (acceptable fragmentation)

### LOW FRAGMENTATION (2-3 transactions, all PASS)
1. No changes needed
2. Document as "multi-operation workflow, acceptable"
3. Move to BATCH 5

---

## Testing Refactored Code

After each refactoring:

```javascript
// Test 1: Direct usage
const result = await ActorEngine.applyRules(actor, rules);
expect(result.transactionCount).toBe(1);
expect(result.derivedRecalcs).toBe(1);

// Test 2: Via real workflow (chargen, feat application, etc.)
// Rerun full workflow tests and verify:
// - Mutation count decreased
// - Recalc count stayed same
// - PASS status maintained
// - No nested mutation violations
```

---

## Policy Updates Needed

If Candidates 1 or 2 are implemented, update MutationIntegrityLayer:

```javascript
_getOperationPolicy(operation) {
  return {
    'applyProgression': { maxMutations: 3, exactDerivedRecalcs: 1 },
    'applyRules': { maxMutations: 3, exactDerivedRecalcs: 1 },      // ← NEW
    'finalizeCharacter': { maxMutations: 5, exactDerivedRecalcs: 1 }, // ← NEW
    'updateActor': { maxMutations: 1, exactDerivedRecalcs: 1 },
    // ...
  }[operation];
}
```

---

## Rollback Plan

If refactoring breaks things:

1. Revert changes
2. Document why original fragmentation was necessary
3. Add comment explaining semantic constraint
4. Proceed with remaining BATCH candidates

---

**Status:** READY FOR IMPLEMENTATION
**Waiting On:** Test results confirming which candidates actually break semantics
**Last Updated:** [Date]
