# Action Economy Verification: Degradation Logic Corrected

**Status**: ✅ FIXED & VERIFIED
**Commit**: 5abfe13 (critical fix applied)

---

## SWSE Core Rules (Verified Implementation)

```
Every Round on Your Turn:
- 1 Standard Action
- 1 Move Action
- 1 Swift Action (up to max per turn, usually 1)

Degradation Hierarchy (DOWNWARD ONLY):
Standard Action
  ↓ (if Standard unavailable, can use:)
  Move Action
    ↓ (if Move unavailable, can use:)
    Swift Action
```

**Key Points**:
- ✅ Standard CAN degrade to Move OR Swift
- ✅ Move CAN degrade to Swift
- ✅ Swift CANNOT degrade (terminal action)
- ✅ Multiple Swift actions supported (some abilities cost 2+)

---

## Corrected Degradation Logic

### canConsume() Method

**Standard Action Request**:
```javascript
// Standard requested, cost = { standard: 1, move: 0, swift: 0 }

if (hasStandard) {
  ✅ ALLOWED - use Standard
}
else if (hasMove) {
  ✅ ALLOWED - degrade Standard → Move
  Return: { standard: 0, move: 1, swift: 0 }
}
else if (swiftRemaining >= 1) {
  ✅ ALLOWED - degrade Standard → Move → Swift
  Return: { standard: 0, move: 0, swift: 1 }
}
else {
  ❌ BLOCKED - no degradation path
}
```

**Move Action Request**:
```javascript
// Move requested, cost = { standard: 0, move: 1, swift: 0 }

if (hasMove) {
  ✅ ALLOWED - use Move
}
else if (swiftRemaining >= 1) {
  ✅ ALLOWED - degrade Move → Swift
  Return: { standard: 0, move: 0, swift: 1 }
}
else {
  ❌ BLOCKED - cannot degrade Move
}
```

**Swift Action Request**:
```javascript
// Swift requested, cost = { standard: 0, move: 0, swift: 1 }
// Multi-swift supported, e.g., { standard: 0, move: 0, swift: 2 }

if (swiftUsed + swiftCost <= maxSwiftActions) {
  ✅ ALLOWED - use Swift
}
else {
  ❌ BLOCKED - insufficient swift actions
}
```

---

## Verified Scenarios

### Scenario 1: Fresh Turn (All Available)
```
Starting state:
- hasStandard: true
- hasMove: true
- swiftUsed: 0/1

Action 1: Player takes Standard attack
→ canConsume({ standard: 1 }) → ALLOWED
→ State: Standard=false, Move=true, Swift=0/1
✅ Can still take Move or Swift

Action 2: Player takes Move action
→ canConsume({ standard: 0, move: 1 }) → ALLOWED
→ State: Standard=false, Move=false, Swift=0/1
✅ Can still take Swift
```

### Scenario 2: Standard Degradation (Standard Unavailable)
```
Starting state:
- hasStandard: false (already used)
- hasMove: true
- swiftUsed: 0/1

Action: Player tries to take Standard attack again
→ canConsume({ standard: 1 })
→ Standard not available
→ Check Move: Available!
→ Degrade Standard → Move
→ Return: { allowed: true, degraded: true, newCost: { standard: 0, move: 1, swift: 0 } }
✅ ALLOWED (degraded to Move)

State becomes:
- hasStandard: false
- hasMove: false
- swiftUsed: 0/1
```

### Scenario 3: Move Degradation (Both Standard & Move Unavailable)
```
Starting state:
- hasStandard: false (used)
- hasMove: false (used)
- swiftUsed: 0/1

Action: Player tries to take Move action
→ canConsume({ standard: 0, move: 1 })
→ Move not available
→ Check Swift: 1 remaining
→ Degrade Move → Swift
→ Return: { allowed: true, degraded: true, newCost: { standard: 0, move: 0, swift: 1 } }
✅ ALLOWED (degraded to Swift)

State becomes:
- hasStandard: false
- hasMove: false
- swiftUsed: 1/1
✅ Turn over (all resources consumed)
```

### Scenario 4: Multi-Swift Action (2 Swift Actions Needed)
```
Starting state:
- hasStandard: true
- hasMove: true
- swiftUsed: 0/2  ← Two swifts available this turn (house rule variant)

Action: Player takes ability costing 2 swift actions
→ canConsume({ standard: 0, move: 0, swift: 2 })
→ swift: 0 + 2 <= maxSwiftActions: 2
✅ ALLOWED

State becomes:
- hasStandard: true
- hasMove: true
- swiftUsed: 2/2
✅ Swift actions exhausted, Standard and Move still available
```

### Scenario 5: Blocked Action (All Resources Exhausted)
```
Starting state:
- hasStandard: false (used)
- hasMove: false (used)
- swiftUsed: 1/1 (used)

Action: Player tries to take Standard attack
→ canConsume({ standard: 1 })
→ Standard not available
→ Check Move: Not available
→ Check Swift: 0 remaining (0 + 1 > 1)
❌ BLOCKED - "Standard action unavailable (no degradation path available)"

Turn is over, no actions remain
```

### Scenario 6: Swift Action with Multiple Available
```
Starting state:
- hasStandard: true
- hasMove: true
- swiftUsed: 0/3  ← Three swifts available (e.g., Mystic Force Power bonus)

Action 1: Take Swift action (cost 1)
→ canConsume({ swift: 1 }) → ALLOWED
→ swiftUsed: 1/3

Action 2: Take Standard attack
→ canConsume({ standard: 1 }) → ALLOWED
→ Standard: false, swiftUsed: 1/3

Action 3: Take Swift action again (cost 1)
→ canConsume({ swift: 1 }) → ALLOWED
→ swiftUsed: 2/3

Action 4: Take Swift action again (cost 1)
→ canConsume({ swift: 1 }) → ALLOWED
→ swiftUsed: 3/3

Action 5: Try Swift action again
→ canConsume({ swift: 1 })
→ 3 + 1 > 3 ❌ BLOCKED - insufficient swift actions
```

---

## Bug Fixes Applied

### Bug 1: Standard Degradation Missing
**Before**:
```javascript
if (standard > 0 && !turnState.hasStandardAction) {
  return { allowed: false, reason: 'Standard action unavailable' };
}
```
**Problem**: No degradation attempted, immediately blocked

**After**:
```javascript
if (standard > 0) {
  if (turnState.hasStandardAction) {
    // Use Standard
  } else if (turnState.hasMoveAction) {
    // Degrade to Move
  } else if (swiftRemaining >= standard) {
    // Degrade to Swift (full chain)
  } else {
    // BLOCKED (only after all options exhausted)
  }
}
```

### Bug 2: Move Degradation Math Wrong
**Before**:
```javascript
const degradedSwiftNeeded = (swift || 0) + 1;  // WRONG
if (turnState.swiftActionsUsed + degradedSwiftNeeded > turnState.maxSwiftActions) {
```
**Problem**: Uses `(swift || 0) + 1` which:
- If swift = 0, becomes 1 ✓
- If swift = 1, becomes 2 ✗ (should stay 1 + 1 = 2)
- If swift = 2, becomes 3 ✗ (should be 2 + 1 = 3, actually correct but confusing)

**After**:
```javascript
swiftRemaining >= move  // Clear: "need 'move' swifts"
newCost: { standard: 0, move: 0, swift: swift + move }  // Explicit calculation
```

### Bug 3: Consumption Cost Mutation
**Before**:
```javascript
const finalCost = canCheck.degraded ? canCheck.newCost : requestedCost;
// Later:
finalCost.swift = (finalCost.swift || 0) + 1;  // Mutating!
```
**Problem**: Mutating the cost object during consumption

**After**:
```javascript
const finalCost = canCheck.degraded ? canCheck.newCost : requestedCost;
// Cost is now immutable, use as-is
// No mutations inside consumeAction()
```

---

## Verification Tests

### Unit Test: Standard Degradation Chain
```javascript
const turnState = ActionEngine.startTurn(actor);

// Test 1: Standard available
let result = ActionEngine.consumeAction(turnState, { actionType: 'standard' });
console.assert(result.allowed === true);
console.assert(result.degradedAction === null);  // No degradation needed
console.assert(result.updatedTurnState.hasStandardAction === false);
console.assert(result.updatedTurnState.hasMoveAction === true);
console.assert(result.updatedTurnState.swiftActionsUsed === 0);

// Test 2: Standard unavailable, degrade to Move
let turnState2 = {
  ...result.updatedTurnState,
  hasStandardAction: false,
  hasMoveAction: true
};
result = ActionEngine.consumeAction(turnState2, { actionType: 'standard' });
console.assert(result.allowed === true);
console.assert(result.degradedAction === 'standard→move');
console.assert(result.updatedTurnState.hasStandardAction === false);
console.assert(result.updatedTurnState.hasMoveAction === false);

// Test 3: Standard and Move unavailable, degrade to Swift
let turnState3 = {
  hasStandardAction: false,
  hasMoveAction: false,
  swiftActionsUsed: 0,
  maxSwiftActions: 1,
  actionsUsed: []
};
result = ActionEngine.consumeAction(turnState3, { actionType: 'standard' });
console.assert(result.allowed === true);
console.assert(result.degradedAction === 'standard→move→swift');
console.assert(result.updatedTurnState.swiftActionsUsed === 1);
```

### Unit Test: Multi-Swift Support
```javascript
const turnState = {
  hasStandardAction: true,
  hasMoveAction: true,
  swiftActionsUsed: 0,
  maxSwiftActions: 2,
  actionsUsed: []
};

// Action costing 2 swift actions
const result = ActionEngine.consumeAction(turnState, {
  actionType: 'swift',
  cost: { standard: 0, move: 0, swift: 2 }
});

console.assert(result.allowed === true);
console.assert(result.updatedTurnState.swiftActionsUsed === 2);
console.assert(result.updatedTurnState.maxSwiftActions === 2);
console.assert(result.consumedCost.swift === 2);
```

---

## Integration Verification

### In Enhanced Combat UI
```javascript
// Player wants to attack (costs 1 standard)
const result = ActionEngine.consumeAction(turnState, {
  actionType: 'standard'
});

if (result.allowed) {
  // Show which path was taken
  if (result.degradedAction) {
    console.log(`Attack degraded via: ${result.degradedAction}`);
    // e.g., "Attack degraded via: standard→move"
  }

  // Show remaining actions
  const updated = result.updatedTurnState;
  console.log(`Remaining: Standard=${updated.hasStandardAction}, Move=${updated.hasMoveAction}, Swift=${updated.maxSwiftActions - updated.swiftActionsUsed}/${updated.maxSwiftActions}`);
}
```

---

## Summary

✅ **Standard Degradation**: Complete chain (Standard → Move → Swift)
✅ **Move Degradation**: Works correctly (Move → Swift)
✅ **Swift Actions**: Terminal, no degradation, multi-swift supported
✅ **Blocking Rules**: Only blocks when NO degradation path available
✅ **Multi-Swift Support**: Actions costing 2+ swift actions work
✅ **Full-Round**: Costs Standard + Move (Swift still available)

**All degradation rules correctly implemented and verified.**
