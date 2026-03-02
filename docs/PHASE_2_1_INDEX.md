# PHASE 2.1: TREE AUTHORITY CLOSURE & LIFECYCLE SEAL
## Complete Documentation Index

**Status**: Ready for Implementation
**Generated**: February 27, 2026
**Scope**: 5 Code Changes, ~150 lines total
**Timeline**: ~90 minutes to implement and test

---

## DOCUMENTS GENERATED

### 1. PHASE_2_1_EXECUTIVE_SUMMARY.txt (12 KB) ⭐ START HERE
**Purpose**: Quick reference overview
**Audience**: Implementer, Project Manager
**Contains**:
- Critical findings summary
- Solution overview
- Implementation checklist
- Success criteria
- Risk assessment

**When to read**: First - gives 5-minute overview of everything

---

### 2. PHASE_2_1_AUDIT_REPORT.md (23 KB)
**Purpose**: Detailed analysis of all gaps and issues
**Audience**: Architect, Implementer, Reviewer
**Contains**:
- Executive summary
- Part A: Suggestion Engine analysis
- Part B: Level-Up enforcement audit
- Part C: Manual sheet operation audit
- Part D: Removal/backtracking safety analysis
- Part E: Authority matrix (current state)
- Summary of all gaps

**Sections**:
- Current state analysis for each gap
- Code evidence with file:line references
- Detailed problem descriptions
- Impact assessment (HIGH/MEDIUM/LOW)
- Example scenarios showing problems

**When to read**: Second - understand the problems deeply

---

### 3. PHASE_2_1_IMPLEMENTATION_SPECS.md (23 KB)
**Purpose**: Detailed implementation guide with exact line numbers
**Audience**: Implementer, Code Reviewer
**Contains**:
- Change 1: SuggestionEngine filtering (import + method)
- Change 2: Level-Up validation (imports + method)
- Change 3: Drop-handler validation (imports + method)
- Change 4: Chargen removal cleanup (method)
- Change 5: TreeUnlockManager methods (new methods)

**For each change**:
- File path
- Exact line numbers
- Current code snippet
- Full replacement code
- Verification steps

**Integration checklist** with test cases

**When to read**: Third - get detailed specs with line numbers

---

### 4. PHASE_2_1_CODE_READY.md (18 KB)
**Purpose**: Copy-paste ready code for immediate implementation
**Audience**: Implementer
**Contains**:
- Step-by-step implementation for each of 5 changes
- Import statements
- Full replacement code (ready to copy)
- No unnecessary explanation - just code

**Format**:
- Change 1: SuggestionEngine.js
  - Step 1: Add import (exact line)
  - Step 2: Replace method (exact lines)
- Change 2: levelup-talents.js
  - Step 1: Add imports
  - Step 2: Replace method
- (etc for all 5 changes)

**Quick reference table**: Files and line numbers for all 5 changes

**When to read**: Fourth - when actually implementing the code

---

### 5. PHASE_2_1_FINAL_SUMMARY.md (18 KB)
**Purpose**: Comprehensive strategic overview
**Audience**: Everyone - architects, implementers, reviewers
**Contains**:
- Executive summary (10/10 closure goal)
- Critical gaps identified (5 detailed)
- Required changes overview (5 changes)
- Code change locations (all 5)
- Success verification steps
- Phase 2.1 confirmation checklist
- Impact summary (before/after)
- Implementation order
- Files referenced section

**Sections**:
- Detailed description of each gap
- File paths and line numbers
- Code patterns that need fixing
- Authority matrix showing current state
- Architecture issues identified

**When to read**: Reference document during implementation

---

## READING PATH FOR DIFFERENT ROLES

### Project Manager / Stakeholder
1. Read: PHASE_2_1_EXECUTIVE_SUMMARY.txt (5 min)
2. Check: Success criteria & confirmation statements
3. Done - you understand the scope

### Architect / Technical Lead
1. Read: PHASE_2_1_EXECUTIVE_SUMMARY.txt (5 min)
2. Read: PHASE_2_1_AUDIT_REPORT.md (20 min)
3. Skim: PHASE_2_1_FINAL_SUMMARY.md (10 min)
4. Approve implementation plan

### Code Implementer
1. Read: PHASE_2_1_EXECUTIVE_SUMMARY.txt (5 min)
2. Read: PHASE_2_1_IMPLEMENTATION_SPECS.md (15 min)
3. Use: PHASE_2_1_CODE_READY.md for copy-paste
4. Reference: PHASE_2_1_FINAL_SUMMARY.md during work

### Code Reviewer
1. Read: PHASE_2_1_AUDIT_REPORT.md (20 min)
2. Review each of 5 changes in PHASE_2_1_CODE_READY.md
3. Check against PHASE_2_1_IMPLEMENTATION_SPECS.md
4. Verify test results match PHASE_2_1_FINAL_SUMMARY.md

---

## KEY FACTS

### Current State
- **Score**: 9/10 (multiple authority gaps)
- **Issues**: 5 critical gaps identified
- **Severity**: HIGH (suggestion leakage, manual bypass)

### Target State
- **Score**: 10/10 (complete closure)
- **Changes**: 5 files modified
- **Lines**: ~150 lines total

### Changes Required
1. SuggestionEngine.js - Filter by tree authority (LOW complexity)
2. levelup-talents.js - Unify validation with chargen (LOW)
3. drop-handler.js - Validate manual drops (MEDIUM)
4. chargen-feats-talents.js - Cleanup on removal (MEDIUM)
5. tree-unlock-manager.js - Runtime cleanup (LOW)

### Implementation
- **Time**: ~90 minutes total
- **Risk**: LOW (isolated changes)
- **Backward compat**: YES (no breaking changes)
- **Test coverage**: HIGH (clear test cases)

---

## CRITICAL GAPS SUMMARY

| Gap | Severity | Issue | File | Lines |
|-----|----------|-------|------|-------|
| 1 | HIGH | Suggestion leakage | SuggestionEngine.js | 153-202 |
| 2 | CRITICAL | Manual bypass | drop-handler.js | 470-490 |
| 3 | MEDIUM | Inconsistency | levelup-talents.js | 559-572 |
| 4 | HIGH | No removal safety | chargen-feats-talents.js | 411-456 |
| 5 | MEDIUM | No unified path | multiple files | multiple |

---

## SUCCESS CHECKLIST

Upon completion, all 7 confirmations must be true:

1. ✓ "All talent selection paths call validateSlotSelection()"
2. ✓ "All candidate filtering calls getAllowedTalentTrees()"
3. ✓ "No UI-only filtering remains"
4. ✓ "No duplicate unlock logic exists"
5. ✓ "No static unlocked tree storage exists"
6. ✓ "No branch logic on source exists"
7. ✓ "Tree authority is purely derived"

---

## FILES TO MODIFY

### File 1: SuggestionEngine.js
**Path**: `/home/user/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngine.js`
**Change**: Add import + modify suggestTalents() method
**Lines**: ~30 (import), 153-202 (method)
**Complexity**: LOW

### File 2: levelup-talents.js
**Path**: `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-talents.js`
**Change**: Add imports + modify selectTalent() method
**Lines**: ~25 (imports), 559-572 (method)
**Complexity**: LOW

### File 3: drop-handler.js
**Path**: `/home/user/foundryvtt-swse/scripts/drag-drop/drop-handler.js`
**Change**: Add imports + modify handleTalentDrop() method
**Lines**: ~10 (imports), 470-490 (method)
**Complexity**: MEDIUM

### File 4: chargen-feats-talents.js
**Path**: `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-feats-talents.js`
**Change**: Modify _onRemoveFeat() method
**Lines**: 411-456
**Complexity**: MEDIUM

### File 5: tree-unlock-manager.js
**Path**: `/home/user/foundryvtt-swse/scripts/engine/progression/talents/tree-unlock-manager.js`
**Change**: Add new methods at end of class
**Lines**: ~50 (end of file)
**Complexity**: LOW

---

## VERIFICATION STEPS

After implementing each change:

1. **Syntax Check**: File compiles without errors
2. **Import Check**: All new imports resolve
3. **Logic Check**: Code paths execute as expected
4. **Test Cases**:
   - Soldier doesn't get Force talent suggestions
   - Level-up rejects inaccessible talents
   - Drag-drop rejects inaccessible talents
   - Chargen cleanup works on Force Sensitivity removal
   - All paths use validateTalentForSlot()

---

## IMPLEMENTATION ORDER

Recommended implementation sequence:

1. **First**: Change 1 (SuggestionEngine)
   - Lowest risk
   - No other code depends on current behavior

2. **Second**: Change 4 (Chargen Removal)
   - Fixes chargen-only issue
   - Independent from other changes

3. **Third**: Changes 2 & 3 (Level-Up + Drop-Handler)
   - Both need TalentSlotValidator
   - Can be done in parallel

4. **Fourth**: Change 5 (TreeUnlockManager)
   - Enables runtime cleanup
   - Can be added last

5. **Finally**: Run verification checklist

---

## RELATED FILES (Reference Only)

These files are referenced but NOT modified:

- `/home/user/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js`
  - Used by: All validators
  - Function: getAllowedTalentTrees()

- `/home/user/foundryvtt-swse/scripts/engine/progression/talents/slot-validator.js`
  - Used by: Level-Up, Drop-Handler
  - Function: validateTalentForSlot()

- `/home/user/foundryvtt-swse/scripts/data/prerequisite-checker.js`
  - Used by: Drop-Handler
  - Function: checkTalentPrerequisites()

---

## TIMELINE ESTIMATE

```
Preparation:           15 minutes
  - Read executive summary
  - Review implementation specs

Change 1 (easy):        5 minutes
  - SuggestionEngine filtering
  - Compile + quick test

Change 2 (easy):        5 minutes
  - Level-Up validation
  - Compile + quick test

Change 3 (medium):     10 minutes
  - Drop-Handler validation
  - Compile + test

Change 4 (medium):     10 minutes
  - Chargen cleanup
  - Compile + test

Change 5 (easy):        5 minutes
  - TreeUnlockManager methods
  - Compile + test

Testing:               30 minutes
  - Verification checklist
  - All 7 confirmations
  - Edge case testing

Documentation:        10 minutes
  - Commit message
  - Mark Phase 2.1 COMPLETE

─────────────────────────────────
Total:                ~90 minutes (1.5 hours)
```

---

## PHASE 2.1 IMPACT

**Before Phase 2.1**:
- 9/10 completion
- Multiple authority gaps
- Suggestion leakage possible
- Manual bypass exists
- Removal creates stale state

**After Phase 2.1**:
- 10/10 completion
- Zero authority gaps
- No suggestion leakage
- No manual bypass
- Safe removal guaranteed

---

## CONTACT & SUPPORT

All analysis performed: February 27, 2026

Documents generated:
1. PHASE_2_1_EXECUTIVE_SUMMARY.txt
2. PHASE_2_1_AUDIT_REPORT.md
3. PHASE_2_1_IMPLEMENTATION_SPECS.md
4. PHASE_2_1_CODE_READY.md
5. PHASE_2_1_FINAL_SUMMARY.md
6. PHASE_2_1_INDEX.md (this file)

**Total documentation**: ~94 KB

---

## QUICK LINKS

| Document | Purpose | Start Page |
|----------|---------|------------|
| EXECUTIVE_SUMMARY.txt | Quick overview | Read this first |
| AUDIT_REPORT.md | Problem analysis | Understand the gaps |
| IMPLEMENTATION_SPECS.md | Implementation guide | Get detailed specs |
| CODE_READY.md | Copy-paste code | Implement the changes |
| FINAL_SUMMARY.md | Strategic overview | Reference during work |
| INDEX.md | Navigation guide | You are here |

---

**Status**: READY FOR IMPLEMENTATION
**All analysis complete. Code ready. Documentation complete.**

Phase 2.1 achieves 10/10 closure upon implementation of all 5 changes.

