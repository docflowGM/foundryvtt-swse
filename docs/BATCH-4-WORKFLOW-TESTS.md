# BATCH 4 Atomicity Validation Plan

**Objective:** Verify that BATCH 4 mutation routing preserves semantic atomic boundaries

**Method:** Run real gameplay workflows in DEV mode, observe Sentinel transaction logs

---

## Test Execution Instructions

### 1. Enable DEV Mode
```javascript
// In browser console:
game.settings.set('swse', 'sentinelMode', 'DEV');
```

### 2. Clear Console and Run Test
- Open browser console (F12)
- Clear logs
- Execute workflow
- Collect `[Sentinel]` log entries

### 3. Analyze Transaction Patterns
Look for:
- **Transaction START/END** pairs
- **Mutation count** per transaction
- **Derived recalcs** per transaction
- **PASS/FAIL** status
- **Duration**

Expected pattern for atomic single-operation:
```
[Sentinel] Transaction START: updateActor ...
[Sentinel] Transaction END: ✅ PASS { mutations: 1, derivedRecalcs: 1 }
```

Expected pattern for fragmented operation (potential issue):
```
[Sentinel] Transaction START: updateActor ...
[Sentinel] Transaction END: ✅ PASS { mutations: 1, derivedRecalcs: 1 }
[Sentinel] Transaction START: updateActor ...
[Sentinel] Transaction END: ✅ PASS { mutations: 1, derivedRecalcs: 1 }
[Sentinel] Transaction START: updateActor ...
[Sentinel] Transaction END: ✅ PASS { mutations: 1, derivedRecalcs: 1 }
```

---

## Test Workflows

### Test 1: Character Creation (Full Flow)
**What:** Create character from scratch through completion

**Steps:**
1. Open Character Generator
2. Select species
3. Select class
4. Roll/buy ability scores
5. Select feats
6. Select talents
7. Click "Finalize"
8. Character sheet opens

**Expected Transactions:**
- Chargen should ideally be **1-2 transactions** for entire finalization
- If see 5+ transactions, atomicity is fragmented

**Watch For:**
- Multiple `createEmbeddedDocuments` calls in sequence (feats, talents, powers separately?)
- Ability score updates separate from item creation
- Resource initialization calls

---

### Test 2: Item Purchase (Store)
**What:** Buy item from store

**Steps:**
1. Open Store
2. Add item to cart
3. Confirm purchase
4. Watch transaction logs

**Expected Transactions:**
- **1 transaction per item** = `updateActor` (deduct credits from buyer)
- Seller update (if any) = separate transaction (acceptable)
- Item creation (if spawned) = separate transaction (acceptable)

**Watch For:**
- If buyer AND seller are updated in same transaction → acceptable
- If item delete + credit update are separate → potential issue
- If multiple items in same order = multiple transactions → acceptable (each item independent)

---

### Test 3: Item Selling (Reverse)
**What:** Sell item back to merchant

**Steps:**
1. Open character inventory
2. Right-click item → "Offer to Merchant"
3. Confirm sale
4. Watch transaction logs

**Expected Transactions:**
- **2 operations total:**
  - Item delete
  - UpdateActor (add credits)
- If these are separate transactions → may be acceptable
- If delete fails, credit still added → atomic violation

**Watch For:**
- Does item.delete() route through ActorEngine? (Currently does NOT)
- Are item deletion and credit update atomic or separate?

---

### Test 4: Feat Application with Multiple Rules
**What:** Apply feat that has multiple rule elements

**Setup:**
1. Create test feat with:
   - StatBonus rule (+2 to attack)
   - GrantAbility rule (action)
   - SkillTraining rule (Persuasion)

**Steps:**
1. Add feat to character
2. Watch transaction logs as feat is applied

**Expected Transactions:**
- **Best case:** 1 transaction applying all 3 rules
- **Current case:** 3 separate transactions (one per rule.apply() call)

**Watch For:**
- 3 separate updateActor calls for one feat?
- 3 separate derived recalcs?
- If yes → rule element application needs batching

---

### Test 5: Level-Up Flow
**What:** Complete level-up process

**Steps:**
1. Open Level-Up dialog
2. Select new class/features
3. Confirm level-up
4. Watch transaction logs

**Expected Transactions:**
- Feature creation = `createEmbeddedDocuments` (1 tx)
- Class item creation = `createEmbeddedDocuments` (1 tx)
- HP/stat updates = `updateActor` (1 tx)
- **Total: 3 transactions** (acceptable if this is the design)
- **Ideal: 1 transaction** (if chargen was designed atomically)

**Watch For:**
- 5+ transactions for one level-up click → fragmentation
- Class item created separately from features → acceptable

---

### Test 6: Applying Active Effect
**What:** Apply condition or combat effect

**Steps:**
1. Trigger effect creation (e.g., apply Dazed condition)
2. Watch transaction logs

**Expected Transactions:**
- **1 transaction** = `createEmbeddedDocuments('ActiveEffect', [effect])`

**Watch For:**
- Single transaction only
- Nested mutations if effect triggers hooks?

---

### Test 7: Rule Element Batch Application
**What:** Apply talent tree with multiple talents

**Setup:**
1. Character with talent tree awaiting selection
2. Each talent has 2-3 rule elements

**Steps:**
1. Apply entire talent tree (5 talents with 3 rules each = 15 rules)
2. Watch transaction logs

**Expected Pattern:**
- **Current (Fragmented):** 15 separate transactions
- **Ideal (Atomic):** 1 transaction

**Watch For:**
- If 15 transactions → confirms rule element batching needed
- If 5 transactions → talents are batched but rules aren't
- If 1 transaction → already optimal

---

### Test 8: Mount Assignment
**What:** Assign rider to mount

**Steps:**
1. Open mount assignment dialog
2. Select mount
3. Confirm assignment
4. Watch transaction logs

**Expected Transactions:**
- Rider update = `updateActor` (1 tx)
- Mount update = `updateActor` (1 tx)
- **Total: 2 transactions** (separate actors, so acceptable)

**Watch For:**
- Single transaction for both? (Not possible without cross-actor batching)
- If either fails, is relationship left in inconsistent state?

---

### Test 9: NPC Levelup
**What:** Level up NPC through progression

**Steps:**
1. Trigger NPC level-up flow
2. Select ability increase
3. Confirm
4. Watch transaction logs

**Expected Transactions:**
- Should be 1-2 transactions
- If see 5+ → potential fragmentation

---

### Test 10: Spell/Power Application
**What:** Grant and apply spell with effects

**Steps:**
1. Grant power from talent
2. Apply power in combat
3. Watch transaction logs for power grant
4. Watch transaction logs for power use

**Expected Transactions:**
- Power grant = `createEmbeddedDocuments` (1 tx)
- Power use = effect creation (1 tx per effect)

---

## Data Collection Template

For each test, record:

```markdown
## Test: [Name]

### Workflow
[Steps taken]

### Transactions Observed
```
[Sentinel console output - paste transaction logs]
```

### Analysis
- Total transactions in workflow: [X]
- Expected: [Y]
- Verdict: ✅ PASS / ⚠️ MARGINAL / ❌ FAIL
- Notes: [Any unexpected patterns]
```

---

## Pass/Fail Criteria

### ✅ PASS
- Single conceptual action = 1 transaction
- Multiple mutations in 1 transaction all within policy
- All derived recalcs match policy
- No nested mutation blocks
- No violations

### ⚠️ MARGINAL
- Single action fragmented into 2-3 transactions
- But each transaction individually PASS
- Recalc count is N×(expected), but no failures
- Acceptable if design explicitly allows multi-step

### ❌ FAIL
- Transaction invariant violations
- Unexpected nested mutations blocked
- Recalc count exceeds policy
- FAIL status in any transaction
- Intermediate inconsistent state possible

---

## Known Risk Areas (Pre-Test Hypothesis)

1. **Rule Elements** → Likely fragmented (HIGH RISK)
   - Each rule.apply() = separate transaction
   - Hypothesis: Will see 3+ transactions per feat

2. **Chargen Finalization** → Possibly fragmented (MEDIUM RISK)
   - Item creation, ability scores, resources as separate calls
   - Hypothesis: Will see 3-5 transactions per finalization

3. **Store** → Likely acceptable (LOW RISK)
   - Cross-actor operations already separate
   - Hypothesis: Will see 2 transactions (buyer + seller) per purchase

4. **Item Selling** → Potential inconsistency (MEDIUM RISK)
   - Item.delete() not routed through ActorEngine
   - Hypothesis: Will see item delete outside transaction

5. **Mount Assignment** → Likely acceptable (LOW RISK)
   - Two independent actors
   - Hypothesis: Will see 2 transactions (rider + mount)

---

## Next Steps After Testing

1. **Collect data** for all 10 workflows
2. **Analyze patterns** against hypotheses
3. **Identify confirmed issues** (HIGH/MEDIUM risk verified)
4. **Refactor only confirmed issues:**
   - Rule elements → create `ActorEngine.applyRules()`
   - Chargen → batch item/stat/resource updates
   - Item selling → route item.delete() through engine
5. **Re-test** after refactors
6. **Lock in governance** once all workflows PASS

---

## Debug Mode: Deeper Inspection

If a transaction FAILS, enable deeper logging:

```javascript
// In ActorEngine.updateActor():
console.log('[DEBUG] updateActor called with:', {
  operation: context.operation,
  updates: updates,
  stack: new Error().stack.split('\n').slice(0, 5).join('\n')
});
```

This reveals:
- What updates each mutation applies
- Where mutations are called from
- Whether intermediate updates are needed

---

## Timeline

- **Phase A (Today):** Run workflows 1-5, collect data
- **Phase B (Next):** Analyze patterns, identify confirmed issues
- **Phase C (Following):** Targeted refactoring of confirmed issues
- **Phase D (Final):** Re-test refactored systems

---

**Owner:** BATCH 4 Semantics Validation
**Status:** Ready for execution
**Last Updated:** [Date]
