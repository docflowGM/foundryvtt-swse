# PHASE 2.1 TREE AUTHORITY CLOSURE & LIFECYCLE SEAL - AUDIT REPORT

**Status**: Complete Audit
**Date**: 2026-02-27
**Model**: Analysis of codebase to identify Phase 2.1 closure requirements

---

## EXECUTIVE SUMMARY

Phase 2.1 aims to elevate the talent system from 9/10 to 10/10 by implementing strict authority closure. Current audit reveals:

- **PART A (SuggestionEngine)**: ✗ CRITICAL GAP - Suggestions are NOT filtered by derived authority
- **PART B (Level-Up)**: ✓ PARTIALLY ALIGNED - Validation exists but not unified with chargen
- **PART C (Manual Sheet Operations)**: ✗ CRITICAL GAP - Direct talent drop creates bypass
- **PART D (Removal/Backtracking)**: ⚠ UNTESTED - Code paths exist but safety unverified
- **PART E (Authority Matrix)**: INCOMPLETE - Multiple validation paths detected

---

## PART A: SUGGESTION ENGINE AUTHORITY ALIGNMENT

### Current State Analysis

**Problem**: SuggestionEngine suggests talents WITHOUT filtering through `getAllowedTalentTrees()`

**Evidence**:

1. **File**: `/home/user/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngine.js` (line 153-202)
   - `suggestTalents()` method accepts ANY talent array
   - Performs scoring/tier evaluation WITHOUT tree access check
   - No call to `getAllowedTalentTrees()` before or during scoring

2. **File**: `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-talents.js` (line 252-264)
   - Loads talents from compendium: `await talentPack.getDocuments()`
   - Passes to `SuggestionService.getSuggestions()` WITHOUT filtering
   - `PrerequisiteChecker` is called but it checks prerequisites, NOT tree authority

3. **File**: `/home/user/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js` (line 180)
   - Calls `SuggestionEngineCoordinator.suggestTalents(options.available ?? [])`
   - `options.available` comes from caller - no authority filtering here
   - Example: levelup-talents.js line 255-256 passes RAW talent list

### Call Chain (Unfiltered):

```
levelup-talents.js:loadTalentData()
  → talentPack.getDocuments() [ALL talents]
  → PrerequisiteChecker.checkTalentPrerequisites() [prerequisite only, NOT tree authority]
  → SuggestionService.getSuggestions(actor, 'levelup', {domain: 'talents', available: talentObjects})
    → SuggestionEngineCoordinator.suggestTalents(talents, actor, ...)
      → SuggestionEngine.suggestTalents(talents, actor, ...)
        ✗ NO FILTERING BY getAllowedTalentTrees()
```

### Leakage Examples

If actor has NOT unlocked Force domain:
- Force Sensitivity talent is NOT in `getAllowedTalentTrees()` heroic slots
- BUT SuggestionEngine.suggestTalents() will score it as TIER 1+ (CLASS_SYNERGY)
- Suggestion appears even though talent is inaccessible

If actor is Soldier with no Force Sensitivity:
- Dark Side talent tree is restricted
- SuggestionEngine will still produce tier 1+ suggestion for Dark Side talents
- UI might show "Recommended" even though selection would FAIL validation

### Required Changes (PART A)

**Location**: `/home/user/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngine.js`

**Method**: Modify `suggestTalents()` to filter candidates BEFORE scoring:

```javascript
// CURRENT (lines 153-202):
static async suggestTalents(talents, actor, pendingData = {}, options = {}) {
    // ... build intent setup ...
    return talents.map(talent => {
        // Scores talent directly WITHOUT tree authority check
        const suggestion = this._evaluateTalent(talent, actorState, buildIntent, actor, pendingData);
        return { ...talent, suggestion, isSuggested: suggestion.tier > 0 };
    });
}

// REQUIRED:
import { getAllowedTalentTrees } from '/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js';

static async suggestTalents(talents, actor, pendingData = {}, options = {}) {
    const actorState = this._buildActorState(actor, pendingData);
    let buildIntent = options.buildIntent;
    if (!buildIntent) {
        try {
            buildIntent = await BuildIntent.analyze(actor, pendingData);
        } catch (err) {
            SWSELogger.warn('SuggestionEngine | Failed to analyze build intent:', err);
            const mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};
            buildIntent = mentorBiases && Object.keys(mentorBiases).length > 0
                ? { mentorBiases }
                : null;
        }
    }

    // ========== NEW: FILTER BY DERIVED AUTHORITY ==========
    // Heroic slot is default for suggestions
    const heroicSlot = { slotType: 'heroic' };
    const allowedTrees = getAllowedTalentTrees(actor, heroicSlot);

    // Filter candidate pool BEFORE scoring
    const accessibleTalents = talents.filter(talent => {
        const treeId = talent.system?.talent_tree || talent.system?.talentTree || talent.system?.tree;
        if (!treeId) return true;  // No tree specified = always accessible
        return allowedTrees.includes(treeId);
    });

    SWSELogger.log(
        `[SuggestionEngine.suggestTalents] Filtering: ${talents.length} total → ${accessibleTalents.length} accessible ` +
        `(allowed trees: ${allowedTrees.join(', ')})`
    );
    // ========================================================

    return accessibleTalents.map(talent => {
        // Only suggest for qualified talents
        if (talent.isQualified === false) {
            if (options.includeFutureAvailability) {
                const futureScore = this._scoreFutureAvailability(
                    talent, actor, actorState, buildIntent, pendingData
                );
                return {
                    ...talent,
                    suggestion: futureScore,
                    isSuggested: futureScore && futureScore.tier > 0,
                    currentlyUnavailable: true,
                    futureAvailable: !!futureScore
                };
            }
            return {
                ...talent,
                suggestion: null,
                isSuggested: false
            };
        }

        const suggestion = this._evaluateTalent(talent, actorState, buildIntent, actor, pendingData);
        return {
            ...talent,
            suggestion,
            isSuggested: suggestion.tier > 0
        };
    });
}
```

**Impact**: After this change, SuggestionEngine will NEVER suggest talents outside allowed trees.

---

## PART B: LEVEL-UP ENFORCEMENT AUDIT

### Current State Analysis

**Status**: PARTIALLY ALIGNED

**Key Finding**: Level-up has NO talent slot validation integration. Unlike chargen which uses `TalentSlotValidator.validateTalentForSlot()`, level-up:

1. Checks prerequisites via `PrerequisiteChecker.checkTalentPrerequisites()`
2. BUT does NOT call `TalentSlotValidator.validateTalentForSlot()`
3. Checks occur in `levelup-validation.js` but validator is NOT imported

**Evidence**:

**File**: `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-talents.js` (line 559-572)

```javascript
export function selectTalent(talentName, talentData, actor, pendingData) {
  const talent = talentData.find(t => t.name === talentName);
  if (!talent) {return null;}

  // Check prerequisites
  const check = checkTalentPrerequisites(talent, actor, pendingData);
  if (!check.valid) {
    ui.notifications.warn(`Cannot select ${talentName}: ${check.reasons.join(', ')}`);
    return null;
  }

  SWSELogger.log(`SWSE LevelUp | Selected talent: ${talentName}`);
  return talent;
}
```

**MISSING**: No call to `TalentSlotValidator.validateTalentForSlot()` to verify tree authority!

**File**: `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-feats-talents.js` (line 668-700)

```javascript
// Chargen DOES validate via PrerequisiteChecker which checks talents
// But slot validation happens at line 561-565:
const validation = TalentSlotValidator.validateTotalSlots(
  [...this.characterData.talents, ...talentsToAdd],
  talentSlots
);
```

**Discrepancy**: Chargen uses `TalentSlotValidator` for slot counting, but:
- Level-up has `checkTalentPrerequisites()` which is SIMILAR but NOT IDENTICAL
- Level-up does NOT validate tree authority (getAllowedTalentTrees)
- No unified path exists

### Required Changes (PART B)

**Step 1**: Import TalentSlotValidator in levelup-talents.js

```javascript
import { TalentSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/slot-validator.js";
import { getAllowedTalentTrees } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js";
```

**Step 2**: Modify `selectTalent()` to use unified validator

```javascript
export function selectTalent(talentName, talentData, actor, pendingData) {
  const talent = talentData.find(t => t.name === talentName);
  if (!talent) {return null;}

  // ========== NEW: UNIFIED VALIDATION ==========
  // Determine slot type based on level context
  // For level-up, we need to know if this is class or heroic talent
  // This requires context from the calling function
  // For now, assume heroic (safer, broader restrictions)
  const slotType = pendingData?.slotType || 'heroic';
  const slot = { slotType, classId: pendingData?.classId };

  const validation = TalentSlotValidator.validateTalentForSlot(
    talent,
    slot,
    [],  // unlockedTrees (derived from actor state in validator)
    { _actor: actor, ...pendingData }
  );

  if (!validation.valid) {
    ui.notifications.warn(`Cannot select ${talentName}: ${validation.message}`);
    return null;
  }
  // ============================================

  // Also check prerequisites (existing logic)
  const check = checkTalentPrerequisites(talent, actor, pendingData);
  if (!check.valid) {
    ui.notifications.warn(`Cannot select ${talentName}: ${check.reasons.join(', ')}`);
    return null;
  }

  SWSELogger.log(`SWSE LevelUp | Selected talent: ${talentName}`);
  return talent;
}
```

---

## PART C: MANUAL SHEET OPERATION AUDIT

### Current State Analysis

**CRITICAL BYPASS FOUND**: Drag-drop talent application BYPASSES all validation!

**Evidence**:

**File**: `/home/user/foundryvtt-swse/scripts/drag-drop/drop-handler.js` (line 470-490)

```javascript
static async handleTalentDrop(actor, talent) {
    // Check if already has talent
    const existingTalent = actor.items.find(i =>
      i.type === 'talent' && i.name === talent.name
    );

    if (existingTalent) {
      ui.notifications.warn(`${actor.name} already has ${talent.name}`);
      return false;
    }

    // PHASE 8: Use ActorEngine for atomic creation
    // ✗ NO VALIDATION OF TREE AUTHORITY
    // ✗ NO SLOT VALIDATION
    // ✗ NO PREREQUISITE CHECK
    await ActorEngine.createEmbeddedDocuments(actor, 'Item', [talent.toObject()]);
    ui.notifications.info(`${actor.name} gained talent: ${talent.name}`);
    return true;
  }
```

### All Manual Talent Application Paths

| Path | File | Line | Validation | Status |
|------|------|------|-----------|--------|
| Drag-drop talent | drop-handler.js | 470-490 | NONE | ✗ BYPASS |
| NPC Template talents | drop-handler.js | 167-182 | NONE | ✗ BYPASS |
| Chargen "Add Talent" direct | chargen-feats-talents.js | 708-720 | Partial | ⚠ WEAK |
| Default drop handler | drop-handler.js | 492-503 | NONE | ✗ BYPASS |

### Critical Issues

1. **Drop Handler**: No tree authority check for talents
2. **NPC Templates**: Create talents without validation
3. **No Governance**: ActorEngine.createEmbeddedDocuments() doesn't validate talent type
4. **Duplicate Check Only**: Only checks if talent already exists, not if accessible

### Required Changes (PART C)

**Location**: `/home/user/foundryvtt-swse/scripts/drag-drop/drop-handler.js` (line 470)

**Option 1 - Redirect through validator (RECOMMENDED)**:

```javascript
static async handleTalentDrop(actor, talent) {
    // Check if already has talent
    const existingTalent = actor.items.find(i =>
      i.type === 'talent' && i.name === talent.name
    );

    if (existingTalent) {
      ui.notifications.warn(`${actor.name} already has ${talent.name}`);
      return false;
    }

    // ========== NEW: VALIDATE THROUGH AUTHORITY ==========
    import { TalentSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/slot-validator.js";
    import { getAllowedTalentTrees } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js";

    // Manual drop = heroic-equivalent access (broadest restrictions)
    const slot = { slotType: 'heroic' };
    const validation = TalentSlotValidator.validateTalentForSlot(
      talent,
      slot,
      [],
      { _actor: actor }
    );

    if (!validation.valid) {
      ui.notifications.error(
        `Cannot add ${talent.name} to ${actor.name}: ${validation.message}`
      );
      return false;
    }

    // Also verify prerequisites
    const PrerequisiteChecker = await import('/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js');
    const prereqCheck = PrerequisiteChecker.checkTalentPrerequisites(actor, talent, {});
    if (!prereqCheck.met) {
      ui.notifications.error(
        `Cannot add ${talent.name}: ${prereqCheck.missing.join(', ')}`
      );
      return false;
    }
    // =====================================================

    await ActorEngine.createEmbeddedDocuments(actor, 'Item', [talent.toObject()]);
    ui.notifications.info(`${actor.name} gained talent: ${talent.name}`);
    return true;
  }
```

**Option 2 - Remove manual talent drop entirely**:
- If manual drag-drop talents are not essential, remove `case 'talent'` from handleItemDrop()
- Force users to add talents through chargen/levelup

---

## PART D: REMOVAL / BACKTRACKING SAFETY

### Scenario 1: Remove Force Sensitivity

**Setup**:
```javascript
actor.system.progression.unlockedDomains = ["force"]
actor has Force Sensitivity feat
actor has Force talent selected
```

**Removal Path** (Not fully implemented in audit):
1. User removes Force Sensitivity feat from character sheet
2. Actor.items gets updated
3. getAllowedTalentTrees() is called in validator
4. Should reflect change immediately

**Code Path to Trace**:
- `/home/user/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js` line 60-75
  - Checks `actor.system.progression.unlockedDomains`
  - If domain removed, Force trees NOT included

**Verification Required**:
1. When Force Sensitivity deleted:
   - Who updates `unlockedDomains`?
   - Is it immediate or deferred?
   - Does it cascade to talent validation?

**File Analysis**:
- Chargen: `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-finalizer.js` line 143-150
  - Stores unlockedDomains during finalization
  - No dynamic update hook found for runtime removals

**FINDING**: No code found to REMOVE from unlockedDomains when feat removed!

### Scenario 2: Class Removal (If Possible)

**Setup**:
```javascript
actor has Soldier class
actor has Soldier-only talent
```

**Finding**:
- Chargen doesn't allow class removal
- Level-up might allow it (unclear)
- If removed: `getAllowedTalentTrees()` would recalculate based on remaining classes

**Verification**: Multiclass logic in levelup:
- `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-dual-talent-progression.js`
- Gets trees from ALL character classes
- If class removed: next validation would exclude its trees

### Scenario 3: Chargen Backtrack

**Setup**:
```javascript
Chargen: Select Force Sensitivity
Chargen: Select Force talent (allowed because domain unlocked)
```

**Backtrack Action**:
```javascript
Remove Force Sensitivity BEFORE chargen finalization
```

**Path Analysis**:
- Chargen stores `characterData.unlockedDomains`
- Not persisted until finalization
- If feat removed, unlockedDomains should be recalculated
- Force talent validation SHOULD fail

**Code Location**: `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-feats-talents.js` line 252-254
```javascript
this.characterData.unlockedDomains = this.characterData.unlockedDomains || [];
if (!this.characterData.unlockedDomains.includes('force')) {
  this.characterData.unlockedDomains.push('force');
}
```

**ISSUE FOUND**: When removing Force Sensitivity feat, code does NOT remove it from `unlockedDomains`!

### Required Changes (PART D)

**Location 1**: `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-feats-talents.js` (line 411-456 - _onRemoveFeat)

Add domain cleanup when removing feats:

```javascript
export async function _onRemoveFeat(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.featid;

  // Find the feat being removed
  const removedFeat = this.characterData.feats.find(f => f._id === id || f.name === id);

  // ========== NEW: DOMAIN CLEANUP ==========
  if (removedFeat) {
    // Check if this feat unlocked any domains
    if (removedFeat.name.toLowerCase().includes('force sensitivity')) {
      // Remove force domain
      if (this.characterData.unlockedDomains) {
        this.characterData.unlockedDomains = this.characterData.unlockedDomains.filter(d => d !== 'force');

        // Also remove any Force talents that are selected
        this.characterData.talents = this.characterData.talents.filter(t => {
          const treeId = t.system?.talent_tree || t.system?.talentTree;
          return treeId !== 'Force' && treeId !== 'Force Sensitivity';
        });

        SWSELogger.log('[CHARGEN-FEATS-TALENTS] Removed Force domain and Force talents due to Force Sensitivity removal');
      }
    }
  }
  // ========================================

  // ... rest of removal logic ...
}
```

**Location 2**: Implement runtime domain update (for live actor removals)

Create new method in tree-unlock-manager.js:

```javascript
static removeDomainsForRemovedFeat(actor, featName) {
  if (featName.toLowerCase().includes('force sensitivity')) {
    const domains = actor.system?.progression?.unlockedDomains || [];
    const updated = domains.filter(d => d !== 'force');

    if (updated.length < domains.length) {
      return { 'system.progression.unlockedDomains': updated };
    }
  }
  return null;
}
```

---

## PART E: SINGLE AUTHORITY CONFIRMATION MATRIX

### Current State of All Talent Selection Paths

| System | Validation Path | Function Called | Tree Authority | Status |
|--------|-----------------|-----------------|-----------------|--------|
| **Chargen - Class Slot** | chargen-feats-talents.js:_onSelectTalent() | PrerequisiteChecker.checkTalentPrerequisites() | ✗ NOT CHECKED | ⚠ INCOMPLETE |
| **Chargen - Heroic Slot** | chargen-feats-talents.js:_onSelectTalent() | PrerequisiteChecker.checkTalentPrerequisites() | ✗ NOT CHECKED | ⚠ INCOMPLETE |
| **Level-Up - Class Slot** | levelup-talents.js:selectTalent() | checkTalentPrerequisites() | ✗ NOT CHECKED | ⚠ INCOMPLETE |
| **Level-Up - Heroic Slot** | levelup-talents.js:selectTalent() | checkTalentPrerequisites() | ✗ NOT CHECKED | ⚠ INCOMPLETE |
| **Manual Sheet - Drag-Drop** | drop-handler.js:handleTalentDrop() | NONE | ✗ NONE | ✗ BYPASS |
| **Manual Sheet - NPC Template** | drop-handler.js:handleNPCTemplateDrop() | NONE | ✗ NONE | ✗ BYPASS |
| **SuggestionEngine** | SuggestionEngine.js:suggestTalents() | _evaluateTalent() | ✗ NOT CHECKED | ✗ LEAKAGE |

### Missing Confirmations

Current state CANNOT confirm:
1. ✗ "All talent selection paths call validateSlotSelection()"
2. ✗ "All candidate filtering calls getAllowedTalentTrees()"
3. ✗ "No UI-only filtering remains"
4. ? "No duplicate unlock logic exists" (chargen vs TreeUnlockManager)
5. ? "No static unlocked tree storage exists"
6. ✗ "No branch logic on source exists"
7. ✗ "Tree authority is purely derived"

---

## SUMMARY OF GAPS

### Critical Gaps (Phase 2.1 Blockers)

1. **SuggestionEngine**: No tree authority filtering before scoring
2. **Drag-Drop Handler**: Complete bypass of all validation
3. **Level-Up**: Missing tree authority checks (only prerequisite checks)
4. **Removal Logic**: No domain cleanup on feat removal
5. **No Unified Slot Validator**: chargen uses TalentSlotValidator but level-up doesn't

### Architecture Issues

1. **Parallel Validation Paths**:
   - PrerequisiteChecker.checkTalentPrerequisites() (level-up)
   - TalentSlotValidator.validateTalentForSlot() (chargen)
   - No tree authority check in either

2. **No Validator Enforcement**:
   - ActorEngine.createEmbeddedDocuments() has NO validation
   - drop-handler.js calls it directly
   - No governance layer

3. **Suggestion Leakage**:
   - SuggestionEngine.suggestTalents() accepts unfiltered list
   - Should filter by getAllowedTalentTrees() FIRST

---

## PHASE 2.1 EXECUTION ROADMAP

### Stage 1: Seal SuggestionEngine (PART A)
- [ ] Import getAllowedTalentTrees in SuggestionEngine.js
- [ ] Add filtering before scoring in suggestTalents()
- [ ] Test that inaccessible talents get 0 suggestions

### Stage 2: Unify Level-Up Validation (PART B)
- [ ] Import TalentSlotValidator in levelup-talents.js
- [ ] Modify selectTalent() to call validateTalentForSlot()
- [ ] Pass slot context (heroic vs class) through pendingData

### Stage 3: Close Manual Bypasses (PART C)
- [ ] Add tree authority validation to handleTalentDrop()
- [ ] Add prerequisite check to handleTalentDrop()
- [ ] Or: Remove manual talent drops entirely

### Stage 4: Implement Removal Safety (PART D)
- [ ] Add domain cleanup to _onRemoveFeat() in chargen
- [ ] Create removeDomainsForRemovedFeat() in TreeUnlockManager
- [ ] Hook into feat removal on live actor (via ActorEngine hooks)

### Stage 5: Verify Authority Matrix (PART E)
- [ ] Test all 7 paths with tree restrictions
- [ ] Confirm no leakage possible
- [ ] Document single authority path

---

## REQUIRED CODE CHANGES SUMMARY

### Files to Modify

1. **SuggestionEngine.js** (lines 153-202)
   - Add tree authority filtering before scoring

2. **levelup-talents.js** (lines 559-572)
   - Import TalentSlotValidator
   - Add slot validation before selection

3. **drop-handler.js** (lines 470-490)
   - Add tree authority and prerequisite validation
   - OR remove manual talent drops

4. **chargen-feats-talents.js** (lines 411-456)
   - Add domain cleanup in _onRemoveFeat()

5. **tree-unlock-manager.js** (new method)
   - Add removeDomainsForRemovedFeat() static method

---

## SUCCESS CRITERIA FOR PHASE 2.1

Upon completion:
- ✓ SuggestionEngine cannot suggest inaccessible trees
- ✓ Level-Up uses tree authority + prereq validation
- ✓ Manual sheet edits validated through unified path
- ✓ Removal updates authority state immediately
- ✓ No parallel validation logic
- ✓ No bypass paths remain
- ✓ Tree authority purely derived, never persisted directly

