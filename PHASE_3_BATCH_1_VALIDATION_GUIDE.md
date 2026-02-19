# PHASE 3 BATCH 1 VALIDATION GUIDE

**Status**: Batch 1 Hardening Complete
**Goal**: Verify mutation authority is truly sovereign before routing 79 files
**Decision Gate**: Pass validation → Proceed to Batch 2 (Combat)

---

## Quick Start

In browser console (in your game):

```javascript
// Run full validation suite
await swse.batch1.validate()

// Quick health check
swse.batch1.healthCheck()
```

---

## Four Critical Gates

### GATE 1: Embedded Item Mutations

**What it tests**: Does item.update() on owned items get caught?

**Why it matters**: Combat applies damage to items (ammo, wear). If item updates bypass ActorEngine, you have a mutation escape hatch.

**Test scenario**:
```javascript
// This SHOULD trigger violation detection:
const item = game.actors.contents[0].items.first();
await item.update({ 'system.quantity': 10 });  // ← Must be caught

// This IS the correct path:
const { ActorEngine } = game.systems.get('foundryvtt-swse');
await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [
  { _id: item.id, 'system.quantity': 10 }
]);
```

**Pass Criteria**:
- ✅ Direct item.update() causes violation in console
- ✅ ActorEngine.updateEmbeddedDocuments() works without violation

**If it fails**:
- Owned item mutations bypass interceptor
- Combat can mutate items directly
- **Block Batch 2** until fixed

---

### GATE 2: updateSource() Detection

**What it tests**: Are Foundry's internal mutation methods intercepted?

**Why it matters**: Foundry sometimes mutates via updateSource() or internal patching. If not caught, you have a hidden mutation channel.

**Test scenario**:
```javascript
// Check if updateSource exists and is wrapped
console.log(typeof game.actors.contents[0].updateSource);
// If function, it should have mutation interception logic
```

**Pass Criteria**:
- ✅ updateSource() is available AND wrapped, OR
- ✅ Foundry version doesn't use updateSource (acceptable)

**If it fails**:
- Internal Foundry mutations bypass enforcer
- Possible stale derived data
- **Review warnings** before Batch 2

---

### GATE 3: Single Recalc Verification

**What it tests**: Does exactly ONE derived calculation occur per mutation?

**Why it matters**: Double-recalcs cause:
- Race conditions
- Stale values
- Non-deterministic results
- Performance thrashing

**Test scenario**:
```javascript
// The validation test instruments DerivedCalculator.computeAll()
// and counts how many times it's called per mutation

await ActorEngine.updateActor(actor, { 'system.description': 'test' });
// Expected: DerivedCalculator.computeAll() called exactly 1 time
// If called 0 times: async issue
// If called 2+ times: DOUBLE-RECALC (architecture violation)
```

**Pass Criteria**:
- ✅ Exactly 1 call per mutation
- ⚠️ 0 calls: May be async delay issue
- ❌ 2+ calls: CRITICAL FAILURE

**If it fails**:
- You have double-recalc architecture
- Will cascade through all 79 files
- **Must fix before Batch 2**

---

### GATE 4: Error Handling & Context Cleanup

**What it tests**: Does MutationInterceptor.clearContext() execute even when mutations fail?

**Why it matters**: If context doesn't clear:
- Subsequent mutations are mistakenly authorized
- Hybrid mutation paths activate
- System becomes unsecured

**Test scenario**:
```javascript
// Try mutation that would fail
try {
  await ActorEngine.updateActor(actor, { 'invalid.path': 'value' });
} catch (e) {
  // Error is expected
}

// Now try direct actor.update()
// Should fail with violation (context was cleared)
```

**Pass Criteria**:
- ✅ Context is properly cleared after both success AND failure
- ✅ Direct mutations fail after failed ActorEngine call

**If it fails**:
- Context cleanup is broken
- Authorization state is leaked
- **Critical security issue — fix immediately**

---

## Running the Full Validation

### Method 1: Console (Recommended for quick testing)

```javascript
// In browser console
await swse.batch1.validate()
```

This runs all four gates and prints:
- ✅/❌ for each test
- Summary statistics
- Critical failures highlighted
- Ready/Not Ready verdict

### Method 2: Manual Testing

If you want to test specific gates:

```javascript
const actor = game.actors.contents[0]; // Your test character

// GATE 1: Owned items
const item = actor.items.first();
await item.update({ 'system.quantity': 5 }); // Should be caught

// GATE 3: Single recalc (you need to instrument DerivedCalculator)
const { DerivedCalculator } = game.systems.get('foundryvtt-swse');
let callCount = 0;
const orig = DerivedCalculator.computeAll;
DerivedCalculator.computeAll = async function(...args) {
  callCount++;
  return orig.apply(this, args);
};
await ActorEngine.updateActor(actor, { 'system.description': 'test' });
console.log(`Recalc calls: ${callCount}`); // Should be 1
```

---

## Expected Results

### All Four Gates Pass ✅

```
Tests Run: 4
✅ Passed: 4
❌ Failed: 0
Pass Rate: 100%

✅ BATCH 1 VALIDATION PASSED — Ready for Batch 2
```

**Action**: Proceed immediately to BATCH 2 (Combat Consolidation)

---

### Three Gates Pass, One Warning ⚠️

```
Tests Run: 4
✅ Passed: 3
⚠️  Warnings: 1
❌ Failed: 0
Pass Rate: 75%

⚠️ BATCH 1 VALIDATION CONDITIONAL — Review warnings before Batch 2
```

**Action**: Review warnings. If acceptable (e.g., updateSource() unavailable), proceed to Batch 2.

---

### Any Gate Fails ❌

```
Tests Run: 4
✅ Passed: 2
❌ Failed: 2
Pass Rate: 50%

❌ BATCH 1 VALIDATION FAILED — Fix errors before Batch 2
```

**Critical Failures Listed**:
- Gate 1: Embedded items bypass
- Gate 3: Double-recalc detected
- Gate 4: Context not clearing

**Action**: Do not proceed to Batch 2. Fix in this order:
1. Gate 4 (security issue)
2. Gate 3 (architecture issue)
3. Gate 1 (mutation escape hatch)

---

## Interpreting Violations

### Console Output Example

```
[MUTATION-VIOLATION] MUTATION VIOLATION:
combat-automation.js called actor.update() directly.
Must route through ActorEngine.updateActor(actor, data).
Caller: at async applyDamage (combat-automation.js:156:15)

Stack trace:
at async applyDamage (combat-automation.js:156:15)
at async processAttack (combat-automation.js:89:20)
...
```

**Interpretation**:
- `combat-automation.js` is calling actor.update() directly
- This must be changed to ActorEngine.updateActor()
- Location: line 156 in applyDamage()

### DEV vs STRICT Mode

**DEV Mode** (default):
- Logs violations to console
- Doesn't block mutations
- Shows full stack trace
- Use this for development

**STRICT Mode**:
- Throws error on violation
- Blocks mutation completely
- Use after Batch 2-5 routing complete

To toggle:
```javascript
// In Foundry settings: Systems → SWSE → Sentinel Mode
// or in console:
game.settings.set('foundryvtt-swse', 'sentinelMode', 'STRICT');
```

---

## Post-Validation Checklist

After passing validation:

- [ ] All four gates passed (or warnings are acceptable)
- [ ] No critical failures in violation log
- [ ] MutationIntegrityLayer.verify() returns PASS
- [ ] No double-recalc detected
- [ ] Owned item mutations are caught
- [ ] Context cleanup works under error conditions

---

## If Validation Fails: Debugging Steps

### Gate 1 Failure (Owned items bypass)

**Diagnostic**:
```javascript
// Check if Item.prototype.update is wrapped
const item = game.actors.contents[0].items.first();
console.log(item.update.toString());
// Should contain MutationInterceptor logic
```

**Fix**:
- MutationInterceptor._wrapItemUpdate() may not be initializing
- Check that MutationInterceptor.initialize() was called
- Verify in index.js init hook

---

### Gate 3 Failure (Double-recalc)

**Diagnostic**:
```javascript
// Instrument to see WHO is calling computeAll() twice
const { DerivedCalculator } = game.systems.get('foundryvtt-swse');
const orig = DerivedCalculator.computeAll;
DerivedCalculator.computeAll = async function(...args) {
  console.error(new Error('Called from:').stack);
  return orig.apply(this, args);
};
await ActorEngine.updateActor(actor, { 'system.description': 'test' });
// Look at stack traces — one should be from Foundry lifecycle,
// one from ActorEngine.recalcAll()
```

**Fix**:
- ActorEngine.updateActor() calls prepareDerivedData() manually AND
- Foundry lifecycle also calls it
- Solution: Remove manual call from ActorEngine

---

### Gate 4 Failure (Context not clearing)

**Diagnostic**:
```javascript
// Add console.log to finally block
// Verify clearContext() is being executed
```

**Fix**:
- Check that MutationInterceptor.clearContext() is in finally block
- Verify it's being called on both success AND error paths

---

## Next Steps After Passing

Once validation passes:

1. **Create BATCH 2 plan** — Combat system consolidation
2. **Identify all combat mutations** — damage, HP changes, conditions
3. **Create ActorEngine.applyDamage()** — domain-specific API
4. **Route combat.js → ActorEngine** — one file at a time
5. **Verify Sentinel shows zero violations** — proves zero hybrid paths

---

## Support

If validation reveals issues:

1. Check MutationInterceptor.js for initialization
2. Verify ActorEngine.updateActor() is in index.js init hook
3. Check browser console for import errors
4. Clear browser cache (F12 → Storage → Clear All)
5. Reload game

---

**Remember**: Batch 1 is about making mutation authority unbypassable.
If any gate fails, you have a bypass.
Do not route 79 files into a broken core.
Validation is non-negotiable.

