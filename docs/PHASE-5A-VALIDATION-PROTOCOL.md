# Phase 5A Validation Protocol

**Purpose:** Prove runtime mutation integrity before scaling to all 65+ talents

**Scope:** Steps 1-4, executed sequentially, with detailed logging

---

## Step 1: Run Automated Tests + Collect Logs

### 1A: Console Commands (Exact Order)

```javascript
// 1. Enable Sentinel DEV mode
game.settings.set('swse', 'sentinelMode', 'DEV');

// 2. Clear console
console.clear();

// 3. Set marker
console.log('=== PHASE 5A VALIDATION START ===');

// 4. Run test suite
Phase5ATests.runAllTests();

// 5. Results will appear in console with [Sentinel] logs
```

### 1B: What to Collect

**From console output:**
- ✅ Test 1 status: Plan Building
- ✅ Test 2 status: Execution
- ✅ Test 3 status: Full Flow
- ✅ Test 4 status: Sentinel Logging

**From Sentinel logs (search for `[Sentinel]`):**
- Transaction START/END messages
- Mutation count per transaction
- Derived recalc count per transaction
- Any warnings or violations

**Example format:**
```
[Sentinel] Transaction START: applyTalentEffect
[Sentinel] Mutation 1/2: update sourceActor.system.forcePoints
[Sentinel] Recalc 1/1: sourceActor derived recalculation
[Sentinel] Mutation 2/2: update targetActor.system.hp
[Sentinel] Recalc 1/1: targetActor derived recalculation
[Sentinel] Transaction END: applyTalentEffect (2 mutations, 2 recalcs)
```

### 1C: Success Criteria

All of these must be true:
- [ ] Test 1 (Plan Building): PASS
- [ ] Test 2 (Execution): PASS
- [ ] Test 3 (Full Flow): PASS
- [ ] Test 4 (Sentinel Logging): Confirms DEV mode active
- [ ] Sentinel logs show clean transaction boundaries
- [ ] No "nested mutation violation" messages
- [ ] No "duplicate recalc" warnings
- [ ] Each actor mutation: exactly 1 recalc

---

## Step 2: Manual Combat Validation

### 2A: Setup Test Scenario

**In Foundry:**
1. Create test combat encounter
2. Add player character with Channel Aggression talent
3. Add 2+ enemies (flanked scenario)
4. Ensure player has 3+ Force Points

### 2B: Test Cases (Run Each, Collect Logs)

**Test Case 2.1: Single Target, Normal FP Balance**
```
Scenario: Player vs flanked enemy, FP = 3
Action: Use Channel Aggression
Expected:
  - FP: 3 → 2
  - Enemy HP: reduced by roll
  - Chat message appears
  - Sentinel shows 2 mutations, 2 recalcs
```

**Test Case 2.2: Low Force Points**
```
Scenario: Player FP = 1
Action: Use Channel Aggression
Expected:
  - FP: 1 → 0
  - Damage applies
  - Sentinel shows 2 mutations
```

**Test Case 2.3: Zero Force Points**
```
Scenario: Player FP = 0, spendFP = true
Action: Use Channel Aggression
Expected:
  - Action fails immediately
  - No mutations applied
  - Error message shown
  - Sentinel shows 0 mutations
```

**Test Case 2.4: With spendFP = false**
```
Scenario: Player FP = 1, spendFP = false
Action: Use Channel Aggression
Expected:
  - FP: remains 1
  - Damage applies
  - Sentinel shows 1 mutation (damage only)
```

**Test Case 2.5: During Initiative Shift**
```
Scenario: Player's turn starts, another effect fires
Action: Use Channel Aggression while hooks may be firing
Expected:
  - No nested mutation violation
  - Talent effect completes
  - No extra recalcs
  - Transaction remains isolated
```

### 2C: Log Collection for Each Test

**For each test case, record:**
- Before state: Player FP, Enemy HP, Condition
- Action taken: Channel Aggression with params
- After state: Player FP, Enemy HP, Condition
- Sentinel transaction log
- Mutation count
- Recalc count
- Any warnings or errors

**Format:**
```
Test Case 2.1: Single Target, Normal FP
  Before: Player FP=3, Enemy HP=45
  Action: triggerChannelAggression(player, enemy, level=5, spendFP=true)
  After: Player FP=2, Enemy HP=28
  Damage Taken: 17
  Mutations: 2 (FP spend, HP damage)
  Recalcs: 2 (one per actor)
  Sentinel Warnings: None
  Status: PASS ✅
```

### 2D: Success Criteria

All test cases must:
- [ ] Apply expected state changes
- [ ] Show 2 mutations (or fewer if applicable)
- [ ] Show 1 recalc per actor
- [ ] Show zero nested mutation violations
- [ ] Show zero duplicate recalcs
- [ ] Close transactions cleanly

---

## Step 3: Refactor One Complex Talent

### 3A: Candidate Selection

Choose ONE of these:
- **Dark Healing** (2254 lines in DarkSidePowers.js)
  - Mutations: HP increase (self) + HP decrease (target) + effect creation
  - Complexity: 3 mutations, 2 actors, 1 effect

- **Crippling Strike** (already partially structured)
  - Mutations: FP spend + flag set + speed update
  - Complexity: 3 mutations, 2 actors, 1 state change

- **Channel Anger** (from dark-side-devotee-mechanics.js)
  - Mutations: FP spend + flag set
  - Complexity: 2 mutations, 1 actor, state management

**Recommended:** Dark Healing (most complex of available)

### 3B: Refactoring Steps

1. **Read existing implementation**
   - Identify all mutations (should be 3+)
   - Extract inline math (damage calc, healing calc, etc.)
   - List all state changes

2. **Create buildDarkHealingPlan() in TalentEffectEngine**
   - Pure computation (zero mutations)
   - Validate resources, talent existence
   - Calculate healing amount, damage amount
   - Build mutation array
   - Return plan

3. **Verify TalentEffectEngine invariant**
   - Zero `actor.update()` calls
   - Zero `ActorEngine` imports
   - Zero embedded document operations
   - Only `return { plan }`

4. **Update mechanics file to use new pattern**
   - Call `TalentEffectEngine.buildDarkHealingPlan()`
   - Call `ActorEngine.applyTalentEffect(plan)`
   - Create chat message after success

5. **Test in Foundry**
   - Run test scenario
   - Collect Sentinel logs
   - Verify mutation count matches plan

### 3C: Success Criteria

- [ ] TalentEffectEngine has zero mutation operations
- [ ] TalentEffectEngine has zero ActorEngine imports
- [ ] Plan is built correctly
- [ ] ActorEngine executes all mutations
- [ ] Each actor gets exactly 1 recalc
- [ ] Sentinel logs show clean transaction
- [ ] Chat message appears after mutations
- [ ] No nested mutation violations

---

## Step 4: Validate Sentinel Policy Behavior

### 4A: Policy Configuration

Verify in Sentinel config that `applyTalentEffect` is defined:

```javascript
applyTalentEffect: {
  exactDerivedRecalcs: 1,      // ONE recalc per actor
  // Do NOT set maxMutations — each actor is independent
  // Do NOT set blockNestedMutations — hooks may fire
}
```

### 4B: Policy Validation Tests

**Test 4.1: Verify exactDerivedRecalcs: 1**
```
Scenario: Apply talent effect with 2 mutations on 1 actor
Expected:
  - Exactly 1 derived recalculation fires
  - Not 0, not 2, exactly 1
Sentinel log should show: "[DERIVED] Count: 1/1"
```

**Test 4.2: Verify No Global Mutation Ceiling**
```
Scenario: Apply talent effect with 5 mutations (1 source, 4 target)
Expected:
  - All 5 mutations execute
  - No "exceeds maxMutations" error
  - Each actor still gets 1 recalc
```

**Test 4.3: Verify Nested Mutation Behavior**
```
Scenario: Talent effect triggers hook, hook applies additional state change
Expected:
  - Nested mutation is allowed (blockNestedMutations = false)
  - Original transaction completes
  - Nested transaction is separate
  - No violation error
```

### 4C: Success Criteria

- [ ] Policy allows 1 recalc per actor
- [ ] Policy does NOT enforce global mutation ceiling
- [ ] Policy allows nested mutations (hooks can fire)
- [ ] Sentinel respects policy settings
- [ ] No unexpected false positives
- [ ] All three policy behaviors confirmed

---

## Validation Report Template

When complete, provide:

```markdown
# Phase 5A Validation Report

## Step 1: Automated Tests
- [ ] Test 1 (Plan Building): PASS/FAIL
- [ ] Test 2 (Execution): PASS/FAIL
- [ ] Test 3 (Full Flow): PASS/FAIL
- [ ] Test 4 (Sentinel): PASS/FAIL

Sentinel Log Excerpt:
[Paste key transaction logs here]

## Step 2: Manual Combat Tests
| Test Case | Status | Mutations | Recalcs | Notes |
|-----------|--------|-----------|---------|-------|
| 2.1 Single Target | PASS | 2 | 2 | Normal FP balance |
| 2.2 Low FP | PASS | 2 | 2 | FP = 1 |
| 2.3 No FP | PASS | 0 | 0 | Correctly failed |
| 2.4 No Spend | PASS | 1 | 1 | Damage only |
| 2.5 Initiative | PASS | 2 | 2 | No nested violations |

## Step 3: Complex Talent Refactor
- Talent Chosen: [Dark Healing / Crippling Strike / Channel Anger]
- Mutations in Plan: [number]
- TalentEffectEngine invariant: PASS
- Test Status: PASS/FAIL
- Sentinel Log: [key transaction]

## Step 4: Sentinel Policy Validation
- exactDerivedRecalcs: 1 confirmed
- No global mutation ceiling: confirmed
- Nested mutations allowed: confirmed

## Overall Verdict
Phase 5A runtime mutation integrity: STABLE / NEEDS HARDENING

## Issues Found (if any)
[List any mutations not going through ActorEngine, recalc leaks, etc.]

## Approval to Scale?
YES / NO

If YES: Ready to refactor all 65+ talents in Phase 5B
If NO: [Describe what needs fixing]
```

---

## Execution Checklist

- [ ] Step 1A: Run console commands
- [ ] Step 1B-1C: Collect automated test logs
- [ ] Step 2A-2B: Set up manual combat scenario
- [ ] Step 2C-2D: Run all 5 manual test cases
- [ ] Step 3A-3C: Refactor one complex talent
- [ ] Step 4A-4C: Validate Sentinel policy
- [ ] Final: Complete validation report

---

## Timeline

| Step | Est. Time | Status |
|------|-----------|--------|
| 1: Automated Tests | 5-10 min | Ready |
| 2: Manual Combat | 15-20 min | Ready |
| 3: Complex Refactor | 30-45 min | Ready |
| 4: Policy Validation | 10-15 min | Ready |
| **Total** | **70-90 min** | **Ready to Execute** |

---

## Do Not Deviate

- ❌ Do not skip manual tests
- ❌ Do not refactor multiple talents
- ❌ Do not optimize before validation
- ❌ Do not extract inline math
- ❌ Do not scale to all talents yet
- ❌ Do not change policy settings

---

**When complete, return validation report with full Sentinel logs and test results.**

**Upon approval of validation, proceed to Phase 5B (scale across all 65+ talents).**
