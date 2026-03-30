# PHASE 5: CONTRIBUTOR GUARDRAILS FOR MUTATION GOVERNANCE

**Purpose:** Clear, actionable rules for contributors writing helpers, wrappers, and mutation logic

---

## GOLDEN RULE

**ALL mutations to owned actor/item data MUST route through ActorEngine.**

If you're writing code that changes `actor.system.*` or owned `item.system.*`, use ActorEngine. There are no exceptions in normal gameplay.

---

## HELPER/WRAPPER PATTERN (REQUIRED)

### 1. For New Actor Mutation Helpers

**Pattern:**
```javascript
/**
 * Human-readable description of what this helper does.
 *
 * ⚠️ GOVERNANCE: This helper MUST route through ActorEngine to ensure:
 * - MutationInterceptor authorization checking
 * - Recomputation of derived values (HP, defenses, etc.)
 * - Post-mutation integrity validation
 *
 * Fail-fast on errors: no silent fallback to direct mutation.
 *
 * @param {Actor} actor - The actor to mutate
 * @param {object} changes - Changes to apply (dot-notation)
 * @param {object} [options={}] - ActorEngine options
 * @returns {Promise<Actor>} Updated actor
 * @throws {Error} If ActorEngine unavailable (indicates module load failure)
 *
 * @governance ACTOR_FIELD_MUTATION
 * @internal - Only call this from UI/hooks that handle errors properly
 */
async function updateActorHelper(actor, changes, options = {}) {
  // PHASE 5 REQUIREMENT: Always verify ActorEngine is available
  const ActorEngine = await import(
    "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js"
  ).then(m => m.ActorEngine);

  // No try/catch fallback. If import fails, that's an error we need to see.
  await ActorEngine.updateActor(actor, changes, options);

  return actor;
}
```

**Checklist:**
- [ ] JSDoc includes @governance tag
- [ ] Comments explain why ActorEngine is required
- [ ] Import is NOT wrapped in try/catch (fail-fast)
- [ ] @throws documents import failure as critical
- [ ] Returns promise (async required)

---

### 2. For New Embedded Document Helpers (Items/Effects)

**Pattern:**
```javascript
/**
 * Create items in an actor.
 *
 * ⚠️ GOVERNANCE: This helper MUST route through ActorEngine to ensure:
 * - Proper item ownership establishment
 * - Actor recomputation post-creation
 * - Integrity validation
 *
 * @param {Actor} actor
 * @param {object[]} itemDatas - Array of item data objects
 * @param {object} [options={}]
 * @returns {Promise<Item[]>}
 * @throws {Error} If ActorEngine unavailable
 *
 * @governance ITEM_CREATION
 */
async function createItemsHelper(actor, itemDatas, options = {}) {
  const ActorEngine = await import("actor-engine.js").then(m => m.ActorEngine);

  // ActorEngine handles all routing and recomputation
  const items = await ActorEngine.createEmbeddedDocuments(
    actor,
    'Item',
    itemDatas,
    options
  );

  return items;
}
```

---

### 3. For Conditional Routing (doc-api style)

**Pattern:**
```javascript
/**
 * Update a document with conditional routing based on ownership.
 *
 * ⚠️ GOVERNANCE ROUTING LOGIC:
 * - If actor field mutation: route through ActorEngine
 * - If owned item mutation: route through ActorEngine
 * - If world item (unowned): update directly (no recompute needed)
 *
 * See PHASE-5-GOVERNANCE-SURFACE-MAP.md for complete routing matrix.
 *
 * @param {Document} doc - Document to update
 * @param {object} changes - Changes
 * @returns {Promise}
 * @governance CONDITIONAL_ROUTING
 */
async function patchDocument(doc, changes) {
  // OWNERSHIP CHECK: Is this an owned item?
  if (doc instanceof Item && doc.isOwned && doc.parent?.id) {
    // Owned item: must route through ActorEngine
    const ActorEngine = await import("actor-engine.js").then(m => m.ActorEngine);
    const itemUpdates = [{_id: doc.id, ...changes}];
    await ActorEngine.updateOwnedItems(doc.parent, itemUpdates);
  } else if (doc instanceof Actor) {
    // Actor field: route through ActorEngine
    const ActorEngine = await import("actor-engine.js").then(m => m.ActorEngine);
    await ActorEngine.updateActor(doc, changes);
  } else {
    // World item (unowned): direct update is OK
    await doc.update(changes);
  }
}
```

---

## WHAT NOT TO DO (ANTI-PATTERNS)

### ❌ ANTI-PATTERN 1: Try/Catch Fallback

```javascript
// ❌ WRONG: Falls back to direct mutation
async function spendForcePoints(actor, amount) {
  try {
    const ActorEngine = await import("actor-engine.js").then(m => m.ActorEngine);
    await ActorEngine.updateActor(actor, {'system.forcePoints.value': amount});
  } catch (err) {
    // THIS IS A BYPASS: Silent mutation ignores governance
    await actor.update({'system.forcePoints.value': amount});
  }
}

// ✅ CORRECT: Fail clearly, don't bypass
async function spendForcePoints(actor, amount) {
  const ActorEngine = await import("actor-engine.js").then(m => m.ActorEngine);
  // No try/catch. If import fails, the error is visible and must be fixed.
  await ActorEngine.updateActor(actor, {'system.forcePoints.value': amount});
}
```

**Why?** Silent fallbacks bypass governance. If ActorEngine fails to load, that's a critical issue that must be fixed, not hidden.

---

### ❌ ANTI-PATTERN 2: Checking ENFORCEMENT_LEVEL

```javascript
// ❌ WRONG: Checking enforcement level to decide whether to enforce
if (MutationInterceptor.getEnforcementLevel() !== 'SILENT') {
  // Apply mutations
} else {
  // Skip mutations
}

// ✅ CORRECT: Always apply mutations; let MutationInterceptor handle enforcement
// Your helper doesn't need to know about enforcement levels
await ActorEngine.updateActor(actor, changes);
```

**Why?** Enforcement is MutationInterceptor's responsibility. Your helper routes the mutation; enforcement happens automatically.

---

### ❌ ANTI-PATTERN 3: Conditional ActorEngine Use

```javascript
// ❌ WRONG: Only using ActorEngine sometimes
async function updateItem(item, changes) {
  if (item.isOwned) {
    const ActorEngine = await import("actor-engine.js").then(m => m.ActorEngine);
    await ActorEngine.updateOwnedItems(item.parent, [{_id: item.id, ...changes}]);
  } else {
    // Seems OK, but creates two paths
    await item.update(changes);
  }
}

// ✅ CORRECT: Clear comment explaining the routing decision
async function updateItem(item, changes) {
  if (item.isOwned && item.parent instanceof Actor) {
    // Owned items MUST route through ActorEngine for recomputation
    const ActorEngine = await import("actor-engine.js").then(m => m.ActorEngine);
    await ActorEngine.updateOwnedItems(item.parent, [{_id: item.id, ...changes}]);
  } else {
    // World items can update directly (no actor recomputation needed)
    await item.update(changes);
  }
}
```

---

### ❌ ANTI-PATTERN 4: Mutating Inside Loop Without Aggregation

```javascript
// ❌ SLOW & DANGEROUS: Triggers recompute N times
for (const item of actor.items) {
  await ActorEngine.updateOwnedItems(actor, [{_id: item.id, ...changes}]);
}

// ✅ CORRECT: Batch updates
const updates = actor.items.map(item => ({_id: item.id, ...changes}));
await ActorEngine.updateOwnedItems(actor, updates);  // Single recompute
```

---

## ENFORCEMENT MODE TESTING

### Testing in STRICT Mode (Dev/Test)

Use `@governance` annotation to document which mode each test covers:

```javascript
/**
 * Test resource spending helper enforcement.
 *
 * @governance STRICT_MODE_ENFORCEMENT
 */
describe('spendForcePoints helper', () => {
  it('should throw in STRICT mode if ActorEngine unavailable', async () => {
    // Setup: make ActorEngine load fail
    const actor = createMockActor({forcePoints: {value: 10, max: 20}});

    // In STRICT mode, missing authority should throw
    // If fallback exists, this test catches the bypass
    await expect(spendForcePoints(actor, 1)).rejects.toThrow();
  });

  it('should route through ActorEngine in all cases', async () => {
    const spy = jest.spyOn(ActorEngine, 'updateActor');
    await spendForcePoints(actor, 1);
    expect(spy).toHaveBeenCalledWith(actor, expect.any(Object));
  });
});
```

### Testing Default Behavior

```javascript
/**
 * Test helper routing in default (NORMAL) mode.
 *
 * @governance NORMAL_MODE_OPERATION
 */
describe('updateActor helper', () => {
  it('should allow authorized mutations in NORMAL mode', async () => {
    const result = await updateActorHelper(actor, {system: {notes: 'test'}});
    expect(result.system.notes).toBe('test');
  });

  it('should recompute after mutation', async () => {
    const spy = jest.spyOn(actor, 'recalcAll');
    await updateActorHelper(actor, {system: {level: 5}});
    // ActorEngine should trigger recalc
    expect(spy).toHaveBeenCalled();
  });
});
```

---

## CODE REVIEW CHECKLIST

When reviewing helper/wrapper code:

### Mutation Routing
- [ ] Does the code route through ActorEngine?
- [ ] Is the routing decision documented?
- [ ] Are edge cases (ownership, world items) handled?

### Error Handling
- [ ] No try/catch fallback to direct update?
- [ ] ImportErrors are explicitly thrown (not hidden)?
- [ ] Does @throws document the error condition?

### Governance Annotations
- [ ] Does JSDoc include @governance tag?
- [ ] Is the governance requirement explained in comments?
- [ ] Is the mutation type clear (ACTOR, ITEM, etc.)?

### Testing
- [ ] Is there a test for STRICT mode enforcement?
- [ ] Is there a test for normal operation?
- [ ] Do tests verify routing through ActorEngine?
- [ ] Do tests verify recomputation is triggered?

### Documentation
- [ ] Can a new contributor understand the governance requirement?
- [ ] Is the relationship to MutationInterceptor clear?
- [ ] Are there links to PHASE-5-GOVERNANCE-SURFACE-MAP.md if needed?

---

## GOVERNANCE TAG REFERENCE

Use these tags in @governance JSDoc annotations:

```
@governance ACTOR_FIELD_MUTATION
  → mutation of actor's system.* fields
  → must route through ActorEngine.updateActor()
  → triggers full recomputation

@governance OWNED_ITEM_MUTATION
  → mutation of items owned by an actor
  → must route through ActorEngine.updateOwnedItems()
  → triggers actor recomputation

@governance ITEM_CREATION
  → creating new embedded items
  → must route through ActorEngine.createEmbeddedDocuments()
  → triggers actor recomputation

@governance ITEM_DELETION
  → deleting embedded items
  → must route through ActorEngine.deleteEmbeddedDocuments()
  → triggers actor recomputation

@governance RESOURCE_SPENDING
  → spending Force Points, Destiny Points, etc.
  → mutation + business logic combined
  → must route through ActorEngine
  → FAIL-FAST on import error (no fallback)

@governance CONDITIONAL_ROUTING
  → routing decision based on document type/ownership
  → clear logic explaining when ActorEngine is required
  → document ownership checks

@governance MIGRATION_OPERATION
  → one-time upgrade/repair operation
  → reserved for future ActorEngine.updateActorForMigration()
  → not for normal gameplay
```

---

## EXAMPLES FROM CODEBASE

### ✅ COMPLIANT EXAMPLE: updateOwnedItem (swse-actor-base.js:180)

```javascript
/**
 * Update an owned Item through ActorEngine.
 *
 * ⚠️ Owned items MUST route through ActorEngine to ensure:
 * - MutationInterceptor authorization
 * - Proper recomputation
 * - Integrity checks
 *
 * Unowned items (world items) can update directly.
 *
 * @param {Item} item
 * @param {object} changes
 * @returns {Promise<Item|null>}
 * @throws {Error} If ActorEngine is unavailable
 * @governance OWNED_ITEM_MUTATION
 */
async updateOwnedItem(item, changes, options = {}) {
  if (!item) {return null;}

  if (!item.isOwned || item.parent?.id !== this.id) {
    // Unowned items update normally
    return item.update(changes, options);
  }

  // Owned items: ActorEngine required
  const ActorEngine = await import(...).then(m => m.ActorEngine);
  const [updated] = await ActorEngine.updateOwnedItems(this, [{_id: item.id, ...changes}], options);
  return updated ?? null;
}
```

**Why Compliant:**
- ✅ Routes through ActorEngine for owned items
- ✅ Clear JSDoc with @governance tag
- ✅ No try/catch fallback
- ✅ Explicit ownership check
- ✅ @throws documents error condition

---

### ✅ COMPLIANT EXAMPLE: patchDocument (document-api-v13.js:285)

```javascript
/**
 * Apply a patch to any document with intelligent routing.
 *
 * ⚠️ GOVERNANCE ROUTING:
 * - Actor mutations: ActorEngine.updateActor()
 * - Owned item mutations: ActorEngine.updateOwnedItems()
 * - World items: direct update (no recompute needed)
 *
 * @governance CONDITIONAL_ROUTING
 */
async patchDocument(doc, changes) {
  const ActorEngine = await import(...).then(m => m.ActorEngine);

  if (doc instanceof Actor) {
    // Actor field mutation
    await ActorEngine.updateActor(doc, changes);
  } else if (doc instanceof Item && doc.isOwned && doc.parent?.id) {
    // Owned item mutation
    const updates = [{_id: doc.id, ...changes}];
    await ActorEngine.updateOwnedItems(doc.parent, updates);
  } else {
    // World item (unowned) — can update directly
    await doc.update(changes);
  }
}
```

**Why Compliant:**
- ✅ Routes correctly based on document type
- ✅ All ActorEngine paths used
- ✅ Ownership check explicit
- ✅ Clear comments explain routing logic
- ✅ No fallback patterns

---

## QUICK START

### Creating a New Mutation Helper

1. **Ask:** "What data am I mutating?"
   - Actor fields? → ActorEngine.updateActor()
   - Owned items? → ActorEngine.updateOwnedItems()
   - World items? → Direct update OK

2. **Import ActorEngine:**
   ```javascript
   const ActorEngine = await import(...).then(m => m.ActorEngine);
   ```

3. **No try/catch fallback:**
   ```javascript
   // ✓ DON'T do this:
   // try { ActorEngine... } catch { actor.update... }
   ```

4. **Add JSDoc:**
   ```javascript
   /**
    * Do the thing.
    *
    * ⚠️ GOVERNANCE: Routes through ActorEngine.
    *
    * @governance ACTOR_FIELD_MUTATION
    */
   ```

5. **Test in STRICT mode:**
   ```javascript
   it('should enforce through ActorEngine', async () => {
     // Import failure should throw, not fallback
   });
   ```

---

## ASKING FOR HELP

**Q: Should I route my mutation through ActorEngine?**

A: If it's changing actor or owned item data, yes. Always.

**Q: What if ActorEngine isn't available?**

A: That's an error. Let it throw so it can be fixed. Don't silently fallback.

**Q: Can I update world items directly?**

A: Yes, they don't trigger actor recomputation.

**Q: What if the change is temporary/cosmetic?**

A: If it goes through actor.update() or item.update(), it goes through ActorEngine. Governance doesn't have "cosmetic" exceptions.

**Q: How do I test enforcement?**

A: Run in STRICT mode (dev/test default). If ActorEngine is unavailable, the mutation should throw.

---

## SUMMARY

| Do This | Don't Do This |
|---------|---|
| Route through ActorEngine | Direct actor.update() |
| Fail-fast on import error | Try/catch fallback to direct update |
| Document with @governance | Leave governance implicit |
| Test in STRICT mode | Only test happy path |
| Check ownership before routing | Assume all updates are the same |
| Clear comments on routing logic | Bury routing decisions in conditionals |

---

**These guardrails ensure:**
- New mutations fit into the established governance model
- Enforcement is consistent and observable
- Future contributors understand the patterns
- Regressions (like fallback bypasses) can't reappear

**Questions?** See PHASE-5-GOVERNANCE-SURFACE-MAP.md for complete reference.
