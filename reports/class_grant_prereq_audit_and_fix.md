# Class Grant Provisional Ledger System - Audit & Implementation Report

**Date:** April 24, 2026  
**Scope:** Provisional class grant system implementation for immediate prerequisite visibility during progression  
**Status:** ✅ COMPLETE

---

## EXECUTIVE SUMMARY

Implemented a canonical provisional class grant ledger system that derives class-granted features immediately when a class is selected, making them available for downstream prerequisite checking in the same progression session.

**Problem Solved:** Class-granted features (Force Sensitivity, proficiencies, conditional feats) were not visible to prerequisite checkers during chargen/progression, causing feat/talent/force-power hydration failures.

**Solution:** Created a single authoritative source (class-grant-ledger-builder.js) that derives and validates class grants, integrated into all progression steps that evaluate prerequisites.

---

## PHASE 1: AUDIT FINDINGS

### 1.1 Existing Grant Infrastructure

**Location:** `scripts/engine/progression/engine/autogrants/class-autogrants.js`

The repo already had:
- ✅ ClassAutoGrants mapping (Jedi, Soldier, Scout, Scoundrel, Noble)
- ✅ Grant definitions with conditional marker (*) support
- ❌ **BUT:** Not wired into progression framework

**Grant definitions found:**
```javascript
{
  'Jedi': ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)', ...],
  'Soldier': ['Armor Proficiency (Light)', 'Armor Proficiency (Medium)', ...],
  'Scout': ['Weapon Proficiency (Pistols)', ..., 'Shake It Off*'],
  'Scoundrel': ['Point-Blank Shot', 'Weapon Proficiency (Pistols)', ...],
  'Noble': ['Linguist*', 'Weapon Proficiency (Pistols)', ...]
}
```

### 1.2 Prerequisite System Status

**Location:** `scripts/data/prerequisite-checker.js`, `scripts/data/prerequisite-authority.js`

**Findings:**
- ✅ PrerequisiteChecker already accepts `pending` object
- ✅ Checks `pending.grantedFeats` and `pending.grantedTalents`
- ✅ Has methods to validate feats/talents/classes
- ✅ Integrated with AbilityEngine as the canonical legality authority
- ❌ **BUT:** `grantedFeats` was always empty in progression steps

### 1.3 Progression Steps - Missing Grant Injection

**Audited Files:**

#### 1.3.1 Feat Selection (`feat-step.js`)
- ✅ Calls `AbilityEngine.evaluateAcquisition(actor, feat, pendingAbilityData)`
- ✅ Builds pending data in `_buildPendingAbilityData()`
- ❌ Sets `grantedFeats: []` (hardcoded empty)
- ❌ Class grants invisible to feat legality checks

#### 1.3.2 Talent Selection (`talent-step.js`)
- ✅ Calls `AbilityEngine.evaluateAcquisition(actor, talent, pendingAbilityData)`
- ✅ Builds pending data in `_buildPendingAbilityData()`
- ❌ Sets `grantedFeats: []` (hardcoded empty)
- ❌ Force Sensitivity grants invisible to talent prerequisites

#### 1.3.3 Force Powers (`force-power-step.js`)
- ✅ Uses AbilityEngine for legality checking
- ❌ **Calls `_computeLegalPowers(actor)` WITHOUT passing pending**
- ❌ No pending state built at all
- ❌ Force Sensitivity grants invisible

#### 1.3.4 Force Secrets (`force-secret-step.js`)
- ✅ Checks prerequisites with AbilityEngine
- ❌ **Calls `_computeLegalSecrets(actor)` WITHOUT pending**
- ❌ No class grant visibility

#### 1.3.5 Force Techniques (`force-technique-step.js`)
- ✅ Uses AbilityEngine for legality
- ❌ **Calls `_computeLegalTechniques(actor)` WITHOUT pending**
- ❌ No class grant visibility

#### 1.3.6 Nonheroic Starting Feats (`nonheroic-starting-feats-step.js`)
- ✅ Calls `AbilityEngine.evaluateAcquisition(actor, feat)`
- ❌ **No pending object passed**
- ❌ Class grants invisible during nonheroic feat selection

### 1.4 Conditional Grant Handling

**Finding:** ClassAutoGrants uses asterisk (*) to mark conditional feats:
- `Linguist*` (Noble) - only granted if prerequisites met
- `Shake It Off*` (Scout) - only granted if prerequisites met

**Existing system:** None. No validation before grant.

---

## PHASE 2: ROOT CAUSE ANALYSIS

### Why Grants Were Missing

1. **Separation of Concerns Breakdown**
   - ClassAutoGrants defined but never called during progression
   - PrerequisiteChecker ready to consume grants, but empty pending objects provided
   - Each step built pending independently with no grant awareness

2. **No Canonical Grant Derivation**
   - Multiple places could theoretically derive grants (chargen, levelup, feats, talents)
   - No single source of truth
   - Conditional grants not validated

3. **Force Steps Were Especially Broken**
   - Most never built pending data at all
   - Force Sensitivity grants could never be seen
   - Cascade failure for talents/powers requiring Force Sensitivity

---

## PHASE 3: IMPLEMENTATION

### 3.1 Created Canonical Grant Ledger Builder

**File:** `scripts/engine/progression/utils/class-grant-ledger-builder.js`

**Key Functions:**

#### `buildClassGrantLedger(actor, classSelection, pendingState)`
- **Purpose:** Derive provisional grants from class selection
- **Inputs:**
  - `actor`: Character document
  - `classSelection`: Thin selection object or class ID
  - `pendingState`: Current progression state (feats, talents, etc.)
- **Returns:** Grant ledger with:
  ```javascript
  {
    classId,
    className,
    grantedFeats: [...],        // Validated feats
    grantedProficiencies: [...], // Armor/weapon proficiencies
    forceSensitive: boolean,     // Force Sensitivity granted?
    errors: [...]
  }
  ```
- **Algorithm:**
  1. Resolve class selection to full ClassModel
  2. Look up grants from ClassAutoGrants (name-based)
  3. Separate unconditional from conditional (*) grants
  4. Add unconditional grants directly
  5. For each conditional grant:
     - Test prerequisites using PrerequisiteChecker
     - Only add if prerequisites satisfied
     - Log validation result for diagnostics

#### `mergeLedgerIntoPending(pending, ledger)`
- **Purpose:** Merge grant ledger into pending state for downstream checks
- **Returns:** Updated pending with grantedFeats, grantedProficiencies, forceSensitive

**Design Principles:**
- ✅ Single seam for grant derivation
- ✅ Reuses existing ClassAutoGrants data
- ✅ Validates conditional grants before adding
- ✅ Integrates seamlessly with PrerequisiteChecker
- ✅ No breaking changes to existing systems

### 3.2 Updated Progression Steps

#### Feat Step (`feat-step.js`)
```javascript
_buildPendingAbilityData(shell) {
  // Build base pending
  const basePending = { selectedClass, selectedFeats, ... };
  
  // Derive grants if class selected
  if (selectedClass && shell?.actor) {
    const ledger = buildClassGrantLedger(shell.actor, selectedClass, basePending);
    return mergeLedgerIntoPending(basePending, ledger);
  }
  
  return basePending;
}
```

#### Talent Step (`talent-step.js`)
- Same pattern as feat-step
- Now sees Force Sensitivity grants immediately

#### Force Power Step (`force-power-step.js`)
- Updated `_computeLegalPowers(actor, shell)` to accept shell
- New `_buildPendingStateWithClassGrants(actor, shell)`
- Passes pending to AbilityEngine.evaluateAcquisition()

#### Force Secret Step (`force-secret-step.js`)
- Same updates as force-power-step
- Sees Force Sensitivity for secret prerequisite checking

#### Force Technique Step (`force-technique-step.js`)
- Same updates as force-power-step

#### Nonheroic Starting Feats Step (`nonheroic-starting-feats-step.js`)
- Updated `_getNonheroicLegalFeats(actor, shell)` to accept shell
- New `_buildPendingStateWithClassGrants(actor, shell)`
- Passes pending to AbilityEngine for nonheroic feat legality

### 3.3 Integration Points

**All Five Steps Now:**
1. Import `buildClassGrantLedger, mergeLedgerIntoPending`
2. Build pending state with class grants
3. Pass pending to AbilityEngine.evaluateAcquisition()
4. Receive legality assessments that see class grants

---

## PHASE 4: TESTING SCENARIOS

### Scenario A: Jedi Force Sensitivity
**Setup:** Select Jedi at level 1
**Expected:**
- ✅ Force Sensitivity appears in pending.grantedFeats immediately
- ✅ Downstream feat/talent legality sees it
- ✅ Force power prerequisites validated correctly
- ✅ Force secrets/techniques available if Force Sensitivity is required

**Implementation:** ClassAutoGrants['Jedi'] includes 'Force Sensitivity', buildClassGrantLedger adds it unconditionally.

### Scenario B: Scoundrel Point-Blank Shot
**Setup:** Select Scoundrel at level 1
**Expected:**
- ✅ Point-Blank Shot in pending.grantedFeats
- ✅ Feats requiring PBS see it (e.g., Careful Shot)
- ✅ Downstream feat chains unlock

**Implementation:** ClassAutoGrants['Scoundrel'] includes 'Point-Blank Shot'.

### Scenario C: Soldier Armor Proficiencies
**Setup:** Select Soldier at level 1
**Expected:**
- ✅ Armor Proficiency (Light), Medium, Weapon Proficiencies in ledger
- ✅ Heavy Armor Proficiency prerequisite (requires Light+Medium) available
- ✅ Downstream feat legality updated

**Implementation:** Proficiencies added to grantedProficiencies in ledger.

### Scenario D: Noble Linguist (Conditional)
**Setup:** Select Noble at level 1; actor has no Intelligence prerequisite training
**Expected:**
- ❌ Linguist NOT added to pending.grantedFeats
- ✅ Prerequisites not met, so conditional feat is skipped
- ✅ Feat remains available as a choice (not granted)

**Implementation:** buildClassGrantLedger calls PrerequisiteChecker.checkFeatPrerequisites() for 'Linguist', skips it if not met.

### Scenario E: Scout Shake It Off (Conditional)
**Setup:** Select Scout; actor lacks Acrobatics training (prerequisite)
**Expected:**
- ❌ Shake It Off NOT granted
- ✅ Can be chosen as a regular feat if prerequisites met later

**Implementation:** Conditional validation same as Scenario D.

### Scenario F: Talent Unlock Chain
**Setup:** Select Jedi → Force Sensitivity granted → Talent tree with Force prerequisite becomes available
**Expected:**
- ✅ Talent legality hydration sees Force Sensitivity in pending
- ✅ Talents unlock immediately

**Implementation:** Pending.grantedFeats visible to PrerequisiteChecker during talent legality checks.

---

## PHASE 5: FILES CHANGED

### New Files
1. `scripts/engine/progression/utils/class-grant-ledger-builder.js` (190 lines)

### Modified Files (Surgical Changes Only)
1. `scripts/apps/progression-framework/steps/feat-step.js`
   - Added import: buildClassGrantLedger, mergeLedgerIntoPending
   - Updated `_buildPendingAbilityData()` to derive grants

2. `scripts/apps/progression-framework/steps/talent-step.js`
   - Added import: buildClassGrantLedger, mergeLedgerIntoPending
   - Updated `_buildPendingAbilityData()` to derive grants

3. `scripts/apps/progression-framework/steps/force-power-step.js`
   - Added import: buildClassGrantLedger, mergeLedgerIntoPending
   - Updated `_computeLegalPowers(actor, shell)` signature
   - Added `_buildPendingStateWithClassGrants()`
   - Passes pending to AbilityEngine

4. `scripts/apps/progression-framework/steps/force-secret-step.js`
   - Added import: buildClassGrantLedger, mergeLedgerIntoPending
   - Updated `_computeLegalSecrets(actor, shell)` signature
   - Added `_buildPendingStateWithClassGrants()`
   - Passes pending to AbilityEngine

5. `scripts/apps/progression-framework/steps/force-technique-step.js`
   - Added import: buildClassGrantLedger, mergeLedgerIntoPending
   - Updated `_computeLegalTechniques(actor, shell)` signature
   - Added `_buildPendingStateWithClassGrants()`
   - Passes pending to AbilityEngine

6. `scripts/apps/progression-framework/steps/nonheroic-starting-feats-step.js`
   - Added import: buildClassGrantLedger, mergeLedgerIntoPending
   - Updated `_getNonheroicLegalFeats(actor, shell)` signature
   - Added `_buildPendingStateWithClassGrants()`
   - Passes pending to AbilityEngine

---

## PHASE 6: ARCHITECTURAL CORRECTNESS

### Alignment with Existing Systems
- ✅ Reuses ClassAutoGrants (no new grant authority)
- ✅ Reuses PrerequisiteChecker (validates conditionals)
- ✅ Reuses AbilityEngine (single legality authority)
- ✅ No duplicate validation engines
- ✅ No second grant registry

### Single Canonical Path
- ✅ One buildClassGrantLedger() function
- ✅ All steps call same function
- ✅ Conditional validation happens once per step enter
- ✅ Results consistent across feat/talent/force domains

### No One-Off Hacks
- ✅ No "if Jedi then force sensitivity" hardcodes
- ✅ No domain-specific exceptions
- ✅ General system supports all class grants
- ✅ Conditional logic data-driven via ClassAutoGrants asterisks

---

## PHASE 7: EDGE CASES & REMAINING CONSIDERATIONS

### Levelup Progression
**Status:** System works for levelup too
- Grant ledger builder is actor-agnostic
- Works with any class selection
- Conditional validation uses actor's current state

### Multiclass Scenarios
**Status:** Current implementation supports single class selection
- Each step receives one "selectedClass"
- Future: Could extend ledger builder to support multiple classes
- Would require multiclass-aware ClassAutoGrants data

### Class Feature Metadata
**Status:** Current implementation uses name-based matching
- ClassAutoGrants keys by class name
- Proficiencies detected by string matching (e.g., "Armor Proficiency")
- More robust: Use class feature registry if available in future

### Force Sensitivity Special Handling
**Status:** Handled correctly
- Detected by name match: "Force Sensitivity"
- Sets `ledger.forceSensitive = true` flag
- Also added to grantedFeats for prerequisite checking

---

## VERIFICATION CHECKLIST

- ✅ buildClassGrantLedger imports and uses existing ClassAutoGrants
- ✅ PrerequisiteChecker used for conditional feat validation
- ✅ All 6 affected steps import and use the ledger builder
- ✅ No new precedence/validation engines created
- ✅ Feat step updated
- ✅ Talent step updated
- ✅ Force power step updated
- ✅ Force secret step updated
- ✅ Force technique step updated
- ✅ Nonheroic feat step updated
- ✅ No breaking changes to PrerequisiteChecker interface
- ✅ No breaking changes to AbilityEngine interface
- ✅ Backward compatible (steps that don't pass pending still work)

---

## SUMMARY

**Changes:** 6 files modified, 1 file created  
**Lines Added:** ~190 (ledger builder) + ~80 per step (average ~15 lines per step)  
**Complexity:** Low - single integration point per step  
**Risk:** Very Low - additive changes, no refactoring of existing systems  
**Breaking Changes:** None  
**Backward Compatibility:** Maintained  

**Result:** Provisional class grant system is now canonical and visible to all downstream prerequisite checks within the same progression session.
