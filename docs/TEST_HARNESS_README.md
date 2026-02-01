# SWSE Progression Determinism Tests

## Overview

This test suite verifies that the progression engine is deterministic and produces consistent results. All tests are designed to catch regressions from the architectural issues documented in `PROGRESSION_COMPILER.md`.

## The 4 Tests

### Test 1: Idempotence
**Principle**: Running the same progression twice should produce identical results.

**What it checks**:
- No mutations that happen at the wrong time
- No order-dependent state changes
- No random number generation or timing issues

**Procedure**:
1. Create test actor
2. Run progression: Jedi L1 chargen
3. Snapshot the result
4. Reset actor to initial state
5. Run identical progression again
6. Compare snapshots (must be byte-identical)

---

### Test 2: Rebuild from History
**Principle**: Creating a character via progression history, then rebuilding from that history, should produce identical results.

**What it checks**:
- No state leakage between progressions
- No mutations that assume initial state
- All updates properly persisted
- True determinism across separate actors

**Procedure**:
1. Create actor A
2. Run progression on A
3. Snapshot A's final state
4. Create fresh actor B
5. Replay the EXACT SAME history onto B
6. Snapshot B's final state
7. Compare snapshots

---

### Test 3: Order Independence
**Principle**: The order in which selections are made should not affect the final result (for selections at the same level).

**What it checks**:
- State machines don't depend on execution order
- No mutation of shared state
- Selection order truly doesn't matter

**Procedure**:
1. Create actor A, select talents [Block, Lightsaber Combat]
2. Create actor B, select talents [Lightsaber Combat, Block]
3. Compare final states

---

### Test 4: Reload Determinism
**Principle**: After a level-up, saving and reloading the world should not change any actor state. All mutations should be persisted.

**What it checks**:
- No mutations on load/unload
- All data properly persisted
- `prepareDerivedData()` is truly deterministic
- No flag/metadata recomputed differently

**Procedure**:
1. Create actor and run progression
2. Snapshot state
3. Serialize to JSON (simulating save)
4. Call `prepareDerivedData()` (simulating reload)
5. Snapshot again
6. Compare critical fields (should be unchanged)

---

## Running the Tests

### In Browser Console (Recommended)

```javascript
// Run all 4 tests
import('./systems/foundryvtt-swse/tests/progression-determinism-tests.js')
  .then(m => m.runAllTests());

// Run a specific test
import('./systems/foundryvtt-swse/tests/progression-determinism-tests.js')
  .then(m => m.testIdempotence());

import('./systems/foundryvtt-swse/tests/progression-determinism-tests.js')
  .then(m => m.testRebuildFromHistory());

import('./systems/foundryvtt-swse/tests/progression-determinism-tests.js')
  .then(m => m.testOrderIndependence());

import('./systems/foundryvtt-swse/tests/progression-determinism-tests.js')
  .then(m => m.testReloadDeterminism());
```

### Configuration

Edit `TEST_CONFIG` in `progression-determinism-tests.js`:

```javascript
const TEST_CONFIG = {
  verbosity: 'full',        // 'silent', 'summary', 'full'
  timeout: 30000,           // max time per test in ms
  deepCompareThreshold: 100 // max properties to show in diff
};
```

---

## Interpreting Results

### ✅ All Tests Pass
Great! The progression engine is deterministic. Safe to merge changes.

### ❌ One Test Fails
Determinism bug found. Example:

```
❌ FAIL: Snapshots differ in 3 fields
  system.bab: "15" vs "12"
  system.defenses.fort.classBonus: "1" vs "2"
  system.progression.talentBudget: "12" vs "11"
```

**Action**: Trace which code changed state at the wrong time. Usually:
- Multiple mutation points in progression engine
- Data model overwriting progression values
- State not properly cleared between tests

---

## What These Tests Catch

| Bug Type | Test Caught By |
|----------|---|
| Idempotence violation | Test 1, 4 |
| State leakage between actors | Test 2 |
| Order-dependent mutations | Test 3, 1 |
| Forgotten persistence | Test 2, 4 |
| Derived data recalculation issues | Test 4 |
| BAB double-application | Test 1, 2, 4 |
| Defense classBonus not reset | Test 3 |
| Ability increase feats missed | Test 2 (if feat count differs) |
| Force power duplicates | Test 2 (if item count differs) |

---

## Known Issues (Before Fixes Applied)

When first run with current code, tests will have mixed results:

**Expected to PASS**:
- Test 1 (Idempotence) ✅ — BAB hotfix prevents double-write
- Test 3 (Order Independence) ✅ — Simple talent selection

**Expected to FAIL**:
- Test 2 (Rebuild) ❌ — Multiclass state leakage
- Test 4 (Reload) ⚠️ — Depends on complexity

**Will be fixed by**: Applying the 7 bugs listed in MULTICLASS_AUDIT.md

---

## Adding New Tests

To add a test for a specific bug:

1. Create a new function `async function testYourBugName() { ... }`
2. Use `_createTestActor()`, `_runProgression()`, `_createSnapshot()` helpers
3. Use `_deepCompare()` for comparison
4. Follow the same structure as the 4 main tests
5. Return `{ pass: boolean, time: number }`
6. Add to `runAllTests()`

---

## See Also

- `PROGRESSION_COMPILER.md` — Architecture spec
- `JEDI_1-2_AUDIT.md` — Simple case analysis
- `MULTICLASS_AUDIT.md` — Complex multiclass bugs (7 critical issues)

