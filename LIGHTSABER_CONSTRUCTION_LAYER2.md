# Lightsaber Construction Engine - Layer 2 Complete: Eligibility Gating

**Status**: ✅ Eligibility gating layer added and tested
**Latest Commit**: `059ea99` - Eligibility gating with proper level authority

---

## 🎯 What Changed

### The Critical Fix
**Before**: Suggested checking `actor.system.level` directly
**After**: Uses proper level authorities via `level-split.js`
- ✅ `getHeroicLevel(actor)` - for heroic level calculation
- ✅ `getClassLevel(actor, "jedi")` - for Jedi class level
- ✅ `game.settings.get("swse", "lightsaberConstructionMode")` - for mode

**Why This Matters**: Avoids drift from centralized level authority. One source of truth.

---

## 📋 Eligibility Validation Engine

### New Private Method: `#validateEligibility(actor)`

**Purpose**: Check actor eligibility BEFORE any expensive operations (DC calc, roll, mutation)

**Returns**:
```javascript
{ eligible: true }  // Pass

{ eligible: false, reason: "insufficient_heroic_level", details: { heroicLevel: 5, required: 7 } }
{ eligible: false, reason: "insufficient_jedi_level", details: { jediLevel: 0, required: 1 } }
{ eligible: false, reason: "missing_force_sensitivity" }
{ eligible: false, reason: "missing_lightsaber_proficiency" }
```

### Eligibility Checks (In Order)

#### 1. Level Gating (Based on Construction Mode Setting)

```javascript
// game.settings.get("swse", "lightsaberConstructionMode")

"raw" (default):
  ✓ Heroic Level ≥ 7

"heroicAndJedi":
  ✓ Heroic Level ≥ 7
  ✓ Jedi Level ≥ 1

"jediOnly":
  ✓ Jedi Level ≥ 7
```

#### 2. Force Sensitivity

Checks:
- `actor.system.forceSensitive === true` (primary)
- OR feat with name containing "Force Sensitivity" (fallback)
- OR feat with `system.id === "force-sensitivity"` (structured)

#### 3. Lightsaber Proficiency

Checks for feat with:
- Name containing "Lightsaber"
- OR name containing "Weapon Proficiency" AND "Lightsaber"
- OR `system.id === "weapon-proficiency-lightsaber"`

---

## ⚡ Execution Order (Fail-Fast)

```
attemptConstruction()
  │
  ├─→ Step 1: Input validation
  │   └─→ Actor exists? Config has chassis ID?
  │
  ├─→ Step 1.5: ELIGIBILITY CHECK ✨ (NEW)
  │   ├─→ Level gating (mode-dependent)
  │   ├─→ Force Sensitivity
  │   ├─→ Lightsaber Proficiency
  │   └─→ IF FAIL: Return early, NO MUTATION
  │
  ├─→ Step 2: Resolve items
  ├─→ Step 3: Validate compatibility
  ├─→ Step 4: Calculate DC
  ├─→ Step 5: Calculate cost
  ├─→ Step 6: Check credits
  ├─→ Step 7: Execute roll
  │
  └─→ Step 8: Atomic mutation (only on success)
```

**Key**: Eligibility checked BEFORE item resolution, DC calculation, and roll. Fail fast.

---

## 🧪 Test Coverage

### Phase 3.5: Eligibility Gating (NEW)

Tests that:
- Low-level actor (3) is rejected
- No roll is triggered on eligibility failure
- No mutation is attempted
- Proper reason code returned

```javascript
await LightsaberConstructionEngineConsoleTests.runAll()
// Now includes Phase 3.5: Eligibility Gating
```

---

## ✨ Result Examples

### ❌ Failure: Insufficient Level
```javascript
{
  success: false,
  reason: "insufficient_heroic_level",
  details: {
    heroicLevel: 5,
    required: 7
  }
}
```

### ❌ Failure: Missing Force Sensitivity
```javascript
{
  success: false,
  reason: "missing_force_sensitivity"
}
```

### ❌ Failure: Missing Lightsaber Proficiency
```javascript
{
  success: false,
  reason: "missing_lightsaber_proficiency"
}
```

**Important**: All failures return BEFORE roll execution and BEFORE any mutation.

---

## 🔒 Architecture Guarantees

### Level Authority (No Bypass)
```javascript
// ❌ WRONG (what we had):
const level = actor.system.level;

// ✅ CORRECT (what we now do):
import { getHeroicLevel, getClassLevel } from "../../actors/derived/level-split.js";
const heroic = getHeroicLevel(actor);
const jedi = getClassLevel(actor, "jedi");
```

### Roll Pipeline (Using System Skills)
```javascript
// ✅ CORRECT:
const modifier = actor.system.skills.useTheForce.total;
// This ALREADY includes all ModifierEngine bonuses
// Applied by DerivedCalculator.applyAll()

const formula = `1d20 + ${modifier}`;
const roll = await RollEngine.safeRoll(formula);
```

### Atomicity (No Mutation Before Success)
```javascript
// Check eligibility FIRST
const eligibility = this.#validateEligibility(actor);
if (!eligibility.eligible) {
  return { success: false, reason: eligibility.reason };
  // ^ NO ROLL, NO MUTATION
}

// Resolve items, calculate, validate funds...
// Then only AFTER successful roll:
await ActorEngine.applyMutationPlan(actor, creditPlan);
await ActorEngine.createEmbeddedDocuments(actor, 'Item', [newWeapon]);
```

---

## 📊 Current Engine State

| Layer | Status | Details |
|-------|--------|---------|
| Skeleton | ✅ Complete | Core transaction mechanics |
| Eligibility Gating | ✅ Complete | Level checks + feat validation |
| Attunement | ⏳ Next | Post-construction attuning |
| Settings Integration | ⏳ Future | Inventory mode, GM approval |

---

## 🎯 Example Scenarios

### Scenario 1: Heroic 6 Jedi
```
Mode: "raw" (heroic ≥ 7)
Actor: Heroic 6, Jedi 5
Force Sensitive: YES
Lightsaber Proficiency: YES

Result: ❌ insufficient_heroic_level
  Reason: Heroic 6 < 7 required
  No roll triggered
  No mutation
```

### Scenario 2: Heroic 7, No Force Sensitivity
```
Mode: "raw"
Actor: Heroic 7, Jedi 5
Force Sensitive: NO
Lightsaber Proficiency: YES

Result: ❌ missing_force_sensitivity
  No roll triggered
  No mutation
```

### Scenario 3: Heroic 7, All Feats, "heroicAndJedi" Mode
```
Mode: "heroicAndJedi"
Actor: Heroic 7, Jedi 0
Force Sensitive: YES
Lightsaber Proficiency: YES

Result: ❌ insufficient_jedi_level
  Jedi 0 < 1 required in this mode
  No roll triggered
  No mutation
```

### Scenario 4: Heroic 7, Jedi 1, All Feats, "heroicAndJedi" Mode
```
Mode: "heroicAndJedi"
Actor: Heroic 7, Jedi 1
Force Sensitive: YES
Lightsaber Proficiency: YES

Result: ✅ Continue to DC/cost/roll
  All eligibility checks passed
```

---

## 🔍 Code Review Points

### ✅ Proper Authority Usage
- Level check uses `getHeroicLevel()` and `getClassLevel()` ✓
- No raw `actor.system.level` access ✓
- Settings accessed via `game.settings.get()` ✓

### ✅ Atomic Transactions
- Eligibility checked FIRST (fail-fast) ✓
- No mutation on eligibility failure ✓
- No roll wasted on ineligible actor ✓

### ✅ Skill Modifier Pipeline
- Uses `actor.system.skills.useTheForce.total` (includes ModifierEngine) ✓
- Not bypassing centralized roll system ✓
- Formula only: `1d20 + modifier` ✓

### ✅ Feat Checking
- Primary: `system.id` (structured)
- Fallback: name matching
- Handles both feat-based and flag-based (forceSensitive)

---

## 📝 Integration Notes

### For Future Layers

**When adding Attunement**:
```javascript
// After construction succeeds:
const attunementResult = await AttunementEngine.attemptAttunement(actor, newWeapon);
if (attunementResult.success) {
  newWeapon.flags.swse.attunedBy = actor.id;
  // Update weapon with new flags
}
```

**When adding Inventory Mode Checking**:
```javascript
// In #validateEligibility():
const inventoryMode = actor.system.inventoryMode || "standard";
if (inventoryMode !== "construction") {
  return { eligible: false, reason: "not_in_construction_mode" };
}
```

**When adding GM Approval**:
```javascript
// After roll success, before mutation:
const gmApproval = await GMApprovalEngine.requestApproval(actor, newWeapon);
if (!gmApproval.approved) {
  return { success: false, reason: "gm_approval_denied" };
}
```

---

## ✅ Testing Checklist

- [x] Syntax validation (node -c)
- [x] Import validation (level-split.js functions)
- [x] Phase 3.5 test suite added
- [x] Eligibility failure scenarios covered
- [x] Early exit (no roll, no mutation) verified
- [x] Proper level authority used
- [x] Proper settings access used

---

## 🚀 Ready for Next Layer

The engine is now:
1. ✅ **Mechanically sound** (skeleton tested)
2. ✅ **Authority-correct** (uses level-split.js, not raw fields)
3. ✅ **Gated properly** (eligibility checks before expensive ops)
4. ✅ **Fail-safe** (early exit, no mutation on failure)

Next step: **Attunement System**

This will be contained entirely in a new WeaponsEngine domain, keeping it separate from the core construction transaction.

---

**Last Updated**: 2026-03-02
**Version**: 0.2.0 (Eligibility Gating Layer)
**Files Modified**: 2 (engine + tests)
**Lines Added**: 180
