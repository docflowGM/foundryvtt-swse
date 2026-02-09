# DEEP AUDIT REPORT: SWSE CharGen & Progression System
## State Integrity and Data Flow Analysis

Generated: 2026-02-01
Repository: /home/user/foundryvtt-swse
Branch: claude/fix-chargen-bugs-6jTH8

---

## EXECUTIVE SUMMARY

**CRITICAL FINDINGS: 6**
**HIGH SEVERITY: 4**
**MEDIUM SEVERITY: 3**

The character generation system has significant state integrity vulnerabilities that can result in:
- Invalid character data (class-dependent feats/talents persisting after class change)
- Partial actor creation on failure without guaranteed rollback
- BuildIntent working with live, accumulating data instead of snapshots
- Feat/talent slot miscalculations when user navigates back/forth
- No progression engine integration despite it being available

---

## 1. STATE LIFECYCLE ANALYSIS

### 1.1 CharacterData Initialization ✓ CORRECT

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
**Lines:** 45-123

CharacterData is properly initialized as a single object in the constructor with comprehensive default values. This establishes a single authoritative source of truth.

**Status:** ✓ GOOD

---

### 1.2 Back Button State Persistence ❌ CRITICAL ISSUE

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
**Lines:** 1930-1959 (_onPrevStep)

When user clicks back, characterData is NOT reset or rolled back - it persists unchanged. This creates orphaned selections when user navigates back and changes class.

**Example Scenario:**
1. Select Soldier class (Talent Trees: Soldier-specific)
2. Select "Gun Slinger" talent (requires Soldier tree)
3. Click Back → class step
4. Change to Scoundrel (different talent trees)
5. Click Next → feats step
6. **BUG:** "Gun Slinger" talent still exists in characterData.talents despite being invalid for Scoundrel

---

### 1.3 Class-Dependent Data Reset ❌ MISSING

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-class.js`
**Lines:** 153-157

Class selection ONLY clears the classes array, does NOT clear:
- ❌ this.characterData.feats
- ❌ this.characterData.talents
- ❌ this.characterData.talentsRequired
- ❌ Talent tree selections

**CRITICAL:** When changing from Soldier to Scoundrel, any Soldier-specific talents remain in the character data and could be saved to the actor.

---

### 1.4 CharGen Reconstruction from Actor Data ❌ DATA LOSS

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
**Lines:** 228-229

```javascript
this.characterData.feats = actor.items.filter(item => item.type === 'feat')
  .map(f => f.name);  // ← Lost full item data!
this.characterData.talents = actor.items.filter(item => item.type === 'talent')
  .map(t => t.name);  // ← Lost full item data!
```

When reopening chargen, loads only feat/talent names (strings), not full objects. Later code expects objects with `._id` and `.name` properties, causing errors in feat removal operations.

---

## 2. PARTIAL COMMIT RISK

### 2.1 Feat Selection Accumulation ⚠️ CONFIRMED

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-feats-talents.js`
**Lines:** 214, 632

When user navigates back and changes class, old feats/talents remain in characterData with no validation or removal.

**Test Case:**
1. Select 2 feats on "feats" step (valid for initial class)
2. Click Back to "class"
3. Change class
4. Click Next through to "feats" again
5. **RESULT:** Old 2 feats still in characterData
6. Character created with invalid feats for new class

---

### 2.2 Feat Removal Filter Logic ⚠️ FRAGILE

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-feats-talents.js`
**Lines:** 418

Filter breaks if feat objects become strings (which they do from _loadFromActor).

---

## 3. ACTOR UPDATE RACE CONDITIONS

### 3.1 Re-entry Guard Potentially Problematic

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
**Lines:** 1894-1907

Re-entry guard is set before validation completes. While the finally block protects against most issues, the design is fragile and could improve.

### 3.2 Partial Actor Creation Rollback ⚠️ INCOMPLETE

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
**Lines:** 2676-2833

**Issues:**
1. If background application fails (lines 2783-2790), actor is created but background not applied. User sees success message but character is broken.
2. If setting chargen data flag fails (lines 2793-2798), actor exists but critical metadata missing.
3. Success notification fires even if background/flags silently failed

---

## 4. BUILDINTENT SNAPSHOT vs LIVE DATA ⚠️ RISKY COUPLING

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-feats-talents.js`
**Lines:** 34-42

BuildIntent receives references to live characterData arrays. If BuildIntent mutates these references, characterData is modified directly. While current code likely doesn't mutate, the coupling is fragile.

```javascript
const pendingData = {
  selectedFeats: chargenContext.characterData.feats || [],  // ← LIVE REFERENCE
  selectedTalents: chargenContext.characterData.talents || [],  // ← LIVE REFERENCE
  // ...
};
```

---

## 5. PROGRESSION ENGINE INTEGRATION ❌ MISSING

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
**Lines:** 2557-2834

CharGen does NOT call SWSEProgressionEngine. Instead:
1. chargen-main.js builds actor data manually (line 2678)
2. Items created directly (line 2765)
3. Background applied directly (line 2784)
4. Hook fired but not waited on (line 2810)

**No atomic transaction guarantee.** Any step can partially fail.

Progression engine available at `/home/user/foundryvtt-swse/scripts/progression/engine/progression-engine.js` but unused.

---

## 6. STATE INVARIANT VIOLATIONS

### 6.1 featsRequired Never Updated on Class Change

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
**Lines:** 102, 2296-2301

featsRequired is:
- Set to 1 at initialization
- NEVER updated when class changes
- Validation passes with just 1 feat even if class requires more

---

### 6.2 talentsRequired Calculated But Not Persisted

**File:** `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
**Lines:** 1057, 2306

talentsRequired calculated in getData (context only) but:
- NOT stored to this.characterData.talentsRequired
- Not persistent across navigations
- Validation uses hardcoded `1` instead of checking characterData

---

## STATE INTEGRITY SCORECARD

| Criterion | Status | Severity |
|-----------|--------|----------|
| Single source of truth | ✓ PASS | - |
| State reset on back | ❌ FAIL | CRITICAL |
| Class change cleanup | ❌ FAIL | CRITICAL |
| Partial commit protection | ⚠️ PARTIAL | HIGH |
| BuildIntent isolation | ⚠️ RISKY | MEDIUM |
| Progression engine integration | ❌ MISSING | MEDIUM |
| featsRequired invariant | ❌ FAIL | HIGH |
| talentsRequired invariant | ⚠️ PARTIAL | MEDIUM |
| Actor loading integrity | ❌ FAIL | HIGH |

**Overall Score: 3/10 - Significant state integrity issues**

---

## CRITICAL CODE PATHS AFFECTED

### Path 1: Class Change Leaves Orphaned Data
```
User selects Feat A for Soldier
→ Changes to Scoundrel (incompatible)
→ Feat A persists in characterData
→ Character created with invalid feat
```

### Path 2: Back Navigation Accumulates Selections
```
Select Feats (2 selected)
→ Back to Class
→ Change Class
→ Forward to Feats
→ Old selections remain, new selections add to array
→ User can end up with too many feats
```

### Path 3: Reopening CharGen on Actor Loses Data
```
Create character with feats
→ Reopen CharGen for level-up
→ _loadFromActor converts feat objects to strings
→ Try to remove feat
→ Filter fails because comparing strings
```

### Path 4: Actor Creation Partial Failure
```
Items created successfully
→ Background application fails (continues)
→ Flag save fails (continues)
→ Success notification shown
→ Actor is broken but user thinks it worked
```

---

## FILE-BY-FILE ISSUES SUMMARY

### `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js`
- **Line 228-229:** _loadFromActor loses object data, keeps only strings
- **Line 1956:** _onPrevStep should validate selections before going back
- **Line 2296:** featsRequired never updated from default
- **Line 2306:** talentsRequired hardcoded instead of using characterData
- **Line 2783-2798:** Non-fatal background/flag errors don't prevent success
- **Line 2810:** Hook called without error handling

### `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-class.js`
- **Line 153-157:** Class change doesn't clear/validate feats and talents
- **Line 310+:** Missing featsRequired recalculation
- **Line 322+:** Missing talentsRequired persistence

### `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-feats-talents.js`
- **Line 34-42:** BuildIntent uses live references instead of snapshots
- **Line 214:** No validation when feat selected
- **Line 418:** Removal filter fragile, breaks with string data
- **Line 512, 569:** Talent array initialization doesn't validate class

---

## RECOMMENDED FIXES (Priority Order)

### P0 - Critical
1. Clear feats/talents when class changes (chargen-class.js)
2. Fix _loadFromActor to preserve objects (chargen-main.js)
3. Atomically create actor with rollback guarantee (chargen-main.js)

### P1 - High
4. Update featsRequired on class change
5. Update talentsRequired properly
6. Validate back button navigation

### P2 - Medium
7. Use progression engine for consistency
8. Make BuildIntent use snapshot data

---

## CONCLUSION

The character generation system has a foundational state integrity problem: **class changes do not invalidate dependent selections**. Combined with back-button state persistence and partial actor creation, this creates multiple pathways to broken characters.

Immediate action required on P0 items to prevent invalid characters from being created. P1 items should be completed before next release.
