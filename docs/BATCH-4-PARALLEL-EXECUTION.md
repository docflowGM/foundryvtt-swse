# BATCH 4: Parallel Execution Guide

**Two parallel streams. One validation process.**

---

## Overview

### Stream A: Workflow Validation (Testing)
- Run real gameplay scenarios in DEV mode
- Collect Sentinel transaction logs
- Identify actual atomicity breaks (not hypothetical)
- Data → feeds into Stream B decisions

### Stream B: Store Domain Coordinator (Architecture)
- Build multi-actor transaction pattern
- Use as reference for other domains
- No mutations until Stream A confirms what needs fixing
- Code ready, usage conditional on test results

**Both streams execute simultaneously.** Results from A inform refinements in B.

---

## Stream A: Running BATCH 4 Validation Tests

### Prerequisites

```javascript
// In Foundry console, set Sentinel to DEV mode:
game.settings.set('swse', 'sentinelMode', 'DEV');
```

### Execution

```javascript
// In Foundry console:
BATCH4Tests.runAllTests();
```

### What Happens

1. **Test harness runs 9 workflows:**
   - Character Creation (full flow)
   - Item Purchase
   - Item Selling
   - Feat with Multiple Rules
   - Level Up
   - Active Effect
   - Rule Element Batch (Talent tree)
   - Mount Assignment
   - NPC Level Up

2. **For each workflow:**
   - Creates test actors/items
   - Executes mutations
   - Prints observation points (`[Observation Point]`)
   - Returns control

3. **Console fills with logs:**
   ```
   [Sentinel] Transaction START: updateActor ...
   [Observation Point] Executing purchase transaction...
   [Sentinel] Transaction END: ✅ PASS { mutations: 1, derivedRecalcs: 1 }
   [Sentinel] Transaction START: updateActor ...
   [Sentinel] Transaction END: ✅ PASS { mutations: 1, derivedRecalcs: 1 }
   ```

### What to Collect

For each test, **record in `docs/BATCH-4-WORKFLOW-TESTS.md`:**

```markdown
## Test: [Name]

### Transactions Observed
```
[Paste [Sentinel] log lines here - find by searching "[Sentinel]" in console]
```

### Analysis
- **Total transactions:** [Count unique START/END pairs]
- **Expected:** [From test description]
- **Verdict:** ✅ PASS / ⚠️ MARGINAL / ❌ FAIL

### Notes
[Any unexpected patterns? Multiple recalcs? Violations?]
```

### Key Metrics to Watch

For each test, look for:

| Metric | Green ✅ | Yellow ⚠️ | Red ❌ |
|--------|----------|-----------|---------|
| **Transactions** | 1-2 per logical action | 3-4 per action | 5+ per action |
| **Derived Recalcs** | 1 per transaction | Multiple | Exceeds policy |
| **Status** | All PASS | Mixed PASS/MARGINAL | Any FAIL |
| **Violations** | None | None expected | Any violation |

---

## Stream B: StoreTransactionEngine Usage

### What's Ready

```javascript
// In scripts/engines/store/store-transaction-engine.js

StoreTransactionEngine.purchaseItem({
  buyer: buyerActor,
  seller: sellerActor,
  itemId: 'abc123',
  price: 500
});

StoreTransactionEngine.sellItem({
  seller: sellerActor,
  itemId: 'abc123',
  price: 250
});

StoreTransactionEngine.transferItem({
  from: fromActor,
  to: toActor,
  itemId: 'abc123'
});
```

### When to Use

**Only after Stream A confirms:**
- ✅ Store operations are fine as separate transactions, OR
- ❌ Store operations need coordination and rollback

### Current Store Code (Before Integration)

**In `scripts/apps/store/store-checkout.js`:**
```javascript
// Currently direct mutations:
await ActorEngine.updateActor(actor, { 'system.credits': newCredits });
```

**After integration (if needed):**
```javascript
// Use coordinated transaction:
const result = await StoreTransactionEngine.purchaseItem({
  buyer: playerActor,
  seller: storeActor,
  itemId: itemId,
  price: itemPrice
});
```

### Rollback Behavior

If any step fails, StoreTransactionEngine automatically:
1. Stops execution
2. Attempts to restore all actors to pre-transaction state
3. Throws error with both original + rollback errors (if rollback fails)

---

## Data Collection Template

### For Each Test:

```markdown
# Test: [Name]

## Workflow
[Steps: 1. X, 2. Y, 3. Z]

## Expected Pattern
[What should happen atomically]

## Actual Pattern (Console Logs)
[Paste Sentinel logs]

## Transaction Count
[Total START/END pairs]

## Mutation Count Per Transaction
[List: tx1=1, tx2=1, tx3=1 or tx1=3]

## Derived Recalc Count
[How many recalcs triggered]

## Analysis
- Matches expected? YES/NO
- Acceptable fragmentation? YES/NO
- Action needed? YES/NO

## Notes
[Any anomalies, concerns, or observations]
```

---

## Analysis Phase (After Tests)

### Step 1: Aggregate Results

Count patterns across all 9 tests:

| Test | Transactions | Pattern | Issue? |
|------|--------------|---------|--------|
| CharGen | 3-5 | createEmbeddedDocuments × 3, then update × 2 | HIGH RISK |
| Purchase | 2 | updateActor (buyer), updateActor (seller) | LOW RISK |
| Selling | 2 | deleteEmbeddedDocuments, updateActor | MEDIUM RISK |
| FeatRules | ? | ? | ? |
| LevelUp | 3-5 | ? | ? |
| Effect | 1 | createEmbeddedDocuments | LOW RISK |
| Batch | ? | ? | ? |
| Mount | 2 | updateActor × 2 | LOW RISK |
| NPC | 1 | updateActor | LOW RISK |

### Step 2: Identify Confirmed Issues

Based on test results, which candidates actually broke?

```
CANDIDATE 1 (Rule Elements)
- Hypothesis: 3 separate transactions for 1 feat
- Test 4 + 7 Result: [INSERT ACTUAL RESULT]
- Verdict: [CONFIRMED / NOT CONFIRMED]
- Action: [applyRules() needed / OK as-is]

CANDIDATE 2 (Chargen)
- Hypothesis: 3-5 transactions for finalization
- Test 1 Result: [INSERT ACTUAL RESULT]
- Verdict: [CONFIRMED / NOT CONFIRMED]
- Action: [finalizeCharacter() needed / OK as-is]

CANDIDATE 3 (Item Selling)
- Hypothesis: delete outside transaction
- Test 3 Result: [INSERT ACTUAL RESULT]
- Verdict: [CONFIRMED / NOT CONFIRMED]
- Action: [route delete() / OK as-is]
```

### Step 3: Decide on Refactoring

**Only refactor if:**
- Test confirms fragmentation breaks semantics, AND
- Multiple recalcs occur unnecessarily, AND
- No clear reason for separation

**Don't refactor if:**
- Each transaction independently PASS
- Design explicitly allows multi-step
- Fragmentation is acceptable for gameplay

---

## Execution Checklist

- [ ] Set Sentinel to DEV mode
- [ ] Clear console
- [ ] Run `BATCH4Tests.runAllTests()`
- [ ] Wait for "✅ Tests Complete" message
- [ ] Scroll through console, find all `[Sentinel]` logs
- [ ] Copy transaction logs for each test
- [ ] Record in BATCH-4-WORKFLOW-TESTS.md
- [ ] Analyze patterns
- [ ] Complete BATCH-4-REFACTORING-CANDIDATES.md with test results
- [ ] Decide which candidates to implement
- [ ] (Optional) Test StoreTransactionEngine in isolation if implementing store refactors

---

## Success Criteria

### ✅ Stream A Complete When
- All 9 tests executed
- Transaction logs collected
- Patterns analyzed
- Confirmed issues identified
- Data entered into documentation

### ✅ Stream B Complete When
- StoreTransactionEngine tests pass
- Rollback behavior verified
- Integration path documented
- Ready for use once Stream A results indicate need

### ✅ Both Streams Done When
- BATCH 4 atomicity validated
- Real breakage confirmed (not hypothetical)
- Only necessary refactoring applied
- All tests re-pass with refactored code

---

## Timeline Estimate

- **Stream A Testing:** 15-30 min (run tests, collect logs, analyze)
- **Stream B Validation:** 10-15 min (test StoreTransactionEngine in isolation)
- **Analysis & Decision:** 15-20 min (interpret results, decide on refactors)
- **Total:** ~45-60 min to reach decision point

---

## Questions to Answer

After both streams complete, you'll know:

1. **Which operations are truly fragmented?**
   - Rule elements? Chargen? Store?

2. **Do multiple transactions break semantics?**
   - Yes → refactor
   - No → document as acceptable

3. **Does StoreTransactionEngine pattern work?**
   - Yes → apply to other domains
   - No → iterate design

4. **What's the minimum refactoring needed?**
   - Nothing (if tests show acceptable fragmentation)
   - Candidate 1 (Rule elements batching)
   - Candidate 1 + 2 (Rule elements + Chargen)
   - Candidate 1 + 3 (Rule elements + Item selling)
   - All candidates

---

**Start here:** `game.settings.set('swse', 'sentinelMode', 'DEV');`

**Then:** `BATCH4Tests.runAllTests();`

**Then:** Analyze, document, decide.

Let governance speak.
