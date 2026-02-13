# Progression Engine Structural Correction Plan

**Status**: Critical blockers identified. Surgical fixes required before Phase 1+2 deployment.

---

## Executive Summary

The audit identified **3 structural integrity failures** and **2 critical bugs** that must be fixed before the system is mathematically correct:

### 🔴 Blockers (Must Fix)
1. **Dual Source of Truth**: Class levels tracked in both `system.progression.classLevels` AND `actor.items` without synchronization
2. **Prestige Class BAB Skip**: If prestige class data missing, BAB silently ignores levels (incorrect math)
3. **Dual BAB Implementations**: Legacy flooring pattern that could corrupt math if called

### 🟡 High Priority (Must Fix)
1. **Droid CON Usage**: Ensure consistently removed across all formulas
2. **Fractional BAB Flooring**: Must accumulate before flooring, not per-level

### ✅ Already Correct
- Validation-before-mutation pattern exists for prestige classes
- Modern BAB calculator is sound (sums all BAB correctly)
- Droid Fortitude calculation correctly excludes CON
- Droid HP calculation correctly excludes CON

---

## Architecture Decision: Canonical Class-Level Source

### Decision: `system.progression.classLevels` is AUTHORITATIVE

**Why this choice:**
- Already validated before mutation
- Used by all derived calculations (BAB, HP, Defense)
- Single actor update operation (atomic)
- Prerequisite checking already operates on this source

**Implementation:**
```
Items → Presentation/Verification layer only
System.progression.classLevels → Source of Truth for:
  - BAB calculation
  - HP calculation
  - Defense bonuses
  - Skill point allocation
  - Feature gating
```

**Migration Path:**
- Class items remain for UI/sheets to display
- But calculations NEVER read from items
- Items become "reflection" of progression state
- Clear ownership: progression owns math, items own presentation

---

## Fix 1: Eliminate Dual BAB Implementation

### Current State
- **Modern BAB** (`/scripts/actors/derived/bab-calculator.js`): ✅ Correct
  - Loads class data from compendium
  - Sums fractional BAB across all levels
  - Handles prestige classes properly
  - **This is the ONLY BAB path used in production**

- **Legacy BAB** (`/scripts/progression/engine/derived-calculator.js`): ⚠️ Dead code
  - Uses hardcoded BAB rates
  - Floors total (wrong for fractional)
  - Unused in v2 pipeline
  - **MUST BE DELETED**

### Action Items

#### A. Delete Legacy DerivedCalculator
- **File**: `/scripts/progression/engine/derived-calculator.js`
- **Lines**: All (entire file is dead code)
- **Rationale**: Modern DerivedCalculator in `/scripts/actors/derived/derived-calculator.js` is the authoritative one
- **Verification**: Search codebase for imports of `/progression/engine/derived-calculator.js` — should find none outside of backward-compat

#### B. Verify Modern BAB Path
- **File**: `/scripts/actors/derived/bab-calculator.js` (lines 20-49)
- **Current behavior**:
  ```javascript
  for (const classLevel of classLevels) {
    const classData = await getClassData(classLevel.class);
    const levelsInClass = classLevel.level || 1;
    if (levelsInClass > 0 && levelsInClass <= levelProgression.length) {
      const finalLevelData = levelProgression[levelsInClass - 1];
      totalBAB += finalLevelData.bab || 0;  // ← Correct: adds fractional BAB
    }
  }
  return totalBAB;  // ← No flooring: correct
  ```
- **Status**: ✅ Already correct
- **Action**: Add comment documenting fractional BAB handling

#### C. Audit Class Data Loader
- **File**: `/scripts/progression/utils/class-data-loader.js`
- **Action**: Verify `getClassData()` loads prestige classes from compendium
- **Critical check**: When called with prestige class ID, does it return valid data?
- **If fails**: Implement fallback to hardcoded prestige data

---

## Fix 2: Guarantee Prestige Class BAB Data

### Problem
If a prestige class is not in the compendium or class data, the BAB calculator silently skips it (line 34-35, warning logged but no error):

```javascript
if (!classData) {
  swseLogger.warn(`BABCalculator: Unknown class "${classLevel.class}", skipping`);
  continue;  // ← Silent skip!
}
```

This is dangerous because:
- Prestige class levels contribute 0 BAB
- Character appears weaker than correct
- Rules violation

### Action Items

#### A. Verify All Prestige Classes in Compendium
- **Search**: All prestige class names from `/scripts/progression/data/prestige-prerequisites.js`
- **Action**: Ensure each prestige class has corresponding compendium entry or hardcoded fallback
- **Files to check**:
  - Prestige class definitions: `/scripts/progression/data/prestige-prerequisites.js` (lines 35-200+)
  - Compendium modules: any `.json` packs containing classes
  - Hardcoded fallback: `/scripts/progression/data/progression-data.js` (lines 6-150+)

#### B. Add Prestige Classes to Hardcoded Fallback
- **File**: `/scripts/progression/data/progression-data.js`
- **Action**: If prestige class not in compendium, must have hardcoded level progression
- **Requirements**:
  - Each prestige class must have `level_progression` array with `bab` field for each level
  - Example:
    ```javascript
    'Bounty Hunter': {
      level_progression: [
        { level: 1, bab: 1, features: [...] },
        { level: 1, bab: 1, features: [...] },
        ...
      ]
    }
    ```

#### C. Convert Warning to Error (if missing)
- **File**: `/scripts/actors/derived/bab-calculator.js` (line 34)
- **Change**: Convert to throw error instead of silently skipping
- **Rationale**: If class data is missing, it's a configuration error that must be caught immediately
- **Implementation**:
  ```javascript
  if (!classData) {
    throw new Error(`BABCalculator: Unknown class "${classLevel.class}". Verify class exists in compendium or hardcoded data.`);
  }
  ```

---

## Fix 3: Enforce Validation-Before-Mutation Pattern

### Current State
- ✅ **Prestige class entry**: Validates prerequisites BEFORE mutation (lines 1224-1266)
- ⚠️ **Skill selection**: Minimal validation (relies on UI constraints)
- ⚠️ **Feat selection**: Validates prerequisites but no count limits

### Action Items

#### A. Prestige Class Validation (Already Correct)
- **File**: `/scripts/engine/progression.js` (lines 1224-1266)
- **Current pattern**:
  ```javascript
  // BEFORE mutation
  if (!isFreeModeBuild) {
    const prereqCheck = PrerequisiteChecker.checkPrestigeClassPrerequisites(...);
    if (!prereqCheck.met) {
      throw new Error(...);
    }
  }

  // THEN mutation
  classLevels.push({...});
  await applyActorUpdateAtomic(...);
  ```
- **Status**: ✅ Correct
- **Action**: Document this pattern as the standard

#### B. Skill Selection Validation
- **File**: `/scripts/engine/progression.js` (skill selection action)
- **Current issue**: Only validates against max count, not availability per-class
- **Action**: Add validation:
  - Total selected skills ≤ allocated trainings
  - Each skill must be in class skill list or universal
  - Throw error before mutation

#### C. Feat Selection Validation
- **File**: `/scripts/engine/progression.js` (feat selection action)
- **Current**: Validates prerequisites for each feat
- **Action**: Add validation:
  - Total feats ≤ allocated feat budget
  - Check feat interactions (can't take feat A and feat B together)
  - Throw error before mutation

---

## Fix 4: Consolidate Validator Classes

### Problem
Multiple prerequisite validation paths could become out-of-sync:

- **PrerequisiteChecker** (`/scripts/data/prerequisite-checker.js`)
- Possibly others in `/scripts/data/` or `/scripts/engine/`

### Action Items

#### A. Audit All Validators
- **Search**: Find all classes/functions named `*Validator`, `*Checker`, `*Prerequisite*`
- **Consolidate**: Should all route through **ONE** PrerequisiteChecker
- **Location**: `/scripts/data/prerequisite-checker.js` (is this the canonical one?)

#### B. Canonical Validator Contract
- **File**: `/scripts/data/prerequisite-checker.js`
- **Public API** (must be the ONLY validation interface):
  ```javascript
  // For prestige classes
  checkPrestigeClassPrerequisites(className, actor, snapshot)
    → { met: boolean, unmet: string[] }

  // For feats
  checkFeatPrerequisites(feat, actor, snapshot)
    → { met: boolean, unmet: string[] }

  // For talents
  checkTalentPrerequisites(talent, actor, snapshot)
    → { met: boolean, unmet: string[] }

  // For skills
  checkSkillPrerequisites(skillId, actor, snapshot)
    → { met: boolean, unmet: string[] }
  ```

#### C. All Mutation Callsites Must Call Validator
- **File**: `/scripts/engine/progression.js`
- **Audit**: Each `_action_*` method must call appropriate validator
- **Pattern**:
  ```javascript
  const prereqCheck = PrerequisiteChecker.check*(item, actor);
  if (!prereqCheck.met) {
    throw new Error(`Prerequisite unmet: ${prereqCheck.unmet.join(', ')}`);
  }
  // THEN mutate
  ```

---

## Fix 5: Droid CON Exclusion (Verify Complete)

### Current State
- ✅ **HP Calculator**: `isDroid ? 0 : conMod` (lines 30-31)
- ✅ **Fortitude**: `isDroidActor ? strMod : Math.max(strMod, conMod)` (lines 36-38)
- ⚠️ **Ability Score Increases**: Need to verify droids can't raise CON

### Action Items

#### A. HP Calculator (Already Correct)
- **File**: `/scripts/actors/derived/hp-calculator.js` (lines 30-31)
- **Status**: ✅ Correct
- **Action**: Add comment explaining droid exclusion

#### B. Fortitude Defense (Already Correct)
- **File**: `/scripts/actors/derived/defense-calculator.js` (lines 36-38)
- **Status**: ✅ Correct
- **Action**: Add comment

#### C. Ability Score Increases
- **File**: `/scripts/engine/progression.js` (ability score selection)
- **Action**: Verify droids cannot apply CON increases
- **Implementation**: If droid, filter out CON from ability choice list

#### D. Audit for Other CON Dependencies
- **Search**: `con\.mod|conMod` in all calculation files
- **Verify**: Any other formula using CON mod:
  - Must check isDroid flag
  - Must skip CON for droids

---

## Fix 6: Fractional BAB Flooring (Already Correct)

### Current State
- **Modern BAB Calculator** (`/scripts/actors/derived/bab-calculator.js`):
  - Sums fractional BAB: `totalBAB += finalLevelData.bab || 0`
  - No flooring: `return totalBAB`
  - ✅ Correct

### Verification
- Example: Bounty Hunter (slow BAB 0.75/level) × 3 levels
  - Calculates: 0.75 + 0.75 + 0.75 = 2.25
  - Returns: 2.25 (not 2)
  - Correct ✅

### Action
- Add test case documenting expected behavior
- Example test:
  ```javascript
  const classLevels = [
    { class: 'Bounty Hunter', level: 3 }
  ];
  const bab = await BABCalculator.calculate(classLevels);
  expect(bab).toBe(2.25);
  ```

---

## Implementation Sequence

### Phase 1: Code Cleanup (No Behavioral Change)
1. **Delete legacy DerivedCalculator**
   - File: `/scripts/progression/engine/derived-calculator.js`
   - Verify: No imports or references remain
   - Commit: "Remove dead code: legacy DerivedCalculator"

2. **Add documentation comments**
   - BAB Calculator: Explain fractional BAB accumulation
   - Droid HP/Fort: Explain CON exclusion
   - Validation pattern: Document validation-before-mutation contract
   - Commit: "Document progression engine correctness guarantees"

### Phase 2: Validation Hardening
1. **Prestige class BAB verification**
   - Audit all prestige classes in compendium
   - Add hardcoded fallback if missing
   - Convert warning to error in BAB calculator
   - Commit: "Guarantee prestige class BAB data availability"

2. **Strengthen prestige prerequisite checker**
   - Verify BAB check correctly reads `actor.system.derived.bab`
   - Verify level check correctly reads `actor.system.level`
   - Add test cases for prestige eligibility
   - Commit: "Harden prestige class prerequisite validation"

3. **Consolidate validators**
   - Remove any dead validator classes
   - Ensure single PrerequisiteChecker is canonical
   - Update all callsites to use it
   - Commit: "Consolidate prerequisite validation to single authority"

### Phase 3: Safety Hardening (Mutation Guards)
1. **Skill selection validation**
   - Add skill availability check (class vs universal)
   - Add total skill count check
   - Throw error before mutation
   - Commit: "Add skill selection validation before mutation"

2. **Feat selection validation**
   - Add total feat count check
   - Add feat interaction checks
   - Throw error before mutation
   - Commit: "Add feat selection validation before mutation"

3. **Ability score increase guard**
   - Filter CON for droids
   - Prevent invalid ability scores
   - Commit: "Guard ability score selection for droids"

### Phase 4: Verification & Testing
1. **Unit tests**
   - Fractional BAB with mixed-BAB classes
   - Prestige class BAB inclusion
   - Droid CON exclusion
   - Validation-before-mutation patterns

2. **Integration tests**
   - Create test character with mixed progression
   - Create test droid, verify no CON
   - Add prestige class, verify BAB correct
   - Attempt invalid prerequisite → reject

3. **Commit**: "Add progression engine unit tests"

---

## Risk Assessment

### Low Risk (Safe to Deploy)
- Deleting legacy DerivedCalculator (dead code)
- Adding documentation comments
- Adding error messages for debugging

### Medium Risk (Requires Testing)
- Strengthening validators (may reject previously-accepted inputs)
- Adding validation to skill/feat selection
- Droid CON filtering (but logic already present, just enforcing)

### High Risk (None Identified)
- Canonical source-of-truth decision: already in place and working correctly

---

## Deployment Checklist

- [ ] All legacy code deleted
- [ ] All validators consolidated
- [ ] All mutation points have validation-before-mutation
- [ ] All droid CON exclusions verified
- [ ] Prestige class BAB data guaranteed available
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code review of progression engine complete
- [ ] Ready for Phase 1+2 deployment

---

## Files Modified

**Deletions:**
- `/scripts/progression/engine/derived-calculator.js` (entire file)

**Modifications:**
- `/scripts/actors/derived/bab-calculator.js` (add documentation + error handling)
- `/scripts/actors/derived/hp-calculator.js` (add documentation)
- `/scripts/actors/derived/defense-calculator.js` (add documentation)
- `/scripts/data/prerequisite-checker.js` (consolidation + documentation)
- `/scripts/engine/progression.js` (add skill/feat validation + droid CON guard)
- `/scripts/progression/data/progression-data.js` (add missing prestige class data if needed)

**New Files:**
- `/tests/progression-engine.test.js` (test suite)

---

**Plan Status**: Ready for implementation approval
