# Phase 2 HIGH: Mentor System Consolidation Analysis

**Date:** 2026-01-26
**Total Mentor Code:** 11,092 lines across 19 files
**Consolidation Potential:** 1,000+ lines safe deletion

---

## Architecture Overview

The mentor system has three parallel implementations running simultaneously:

### 1. **V1 Mentor System (ACTIVE - PRIMARY)**
**File:** `scripts/apps/mentor-dialogues.js` (2,411 lines)
**Status:** CANONICAL - used everywhere
**Used by:**
- `chargen-main.js`: Gets MENTORS, mentor selection
- `levelup-main.js`: Gets mentor greetings, guidance
- `chargen-class.js`: Mentor selection
- `chargen-backgrounds.js`: Mentor selection

**Exports:**
- `MENTORS` - Master mentor definitions
- `getMentorForClass()`
- `getMentorGreeting()`
- `getMentorGuidance()`
- `getLevel1Class()` / `setLevel1Class()`

---

### 2. **V2 Mentor System / Reflective (ACTIVE - SECONDARY)**
**Files:**
- `scripts/apps/mentor-suggestion-dialogues.js` (3,053 lines)
- `scripts/apps/mentor-reflective-dialogue.js` (580 lines)
- `scripts/apps/mentor-reflective-dialog.js` (295 lines)

**Status:** SECONDARY - initialized separately, used for reflective dialogue
**Used by:**
- `mentor-reflective-dialog.js`: Generates reflective dialogue
- `mentor-reflective-dialogue.js`: Core logic
- Initialized via `mentor-reflective-init.js`

**Exports:**
- `MENTOR_PERSONALITIES` (duplicate of v1)
- `SUGGESTION_CONTEXTS` (v2 specific)
- `DIALOGUE_PHASES` (v2 specific)
- Suggestion engines (tier-based)

---

### 3. **DEAD CODE - mentor-dialogue-integration.js**
**File:** `scripts/apps/mentor-dialogue-integration.js` (379 lines)
**Status:** DEAD - 0 imports, never used
**Imports from:** `mentor-suggestion-dialogues.js`
**Action:** Safe to delete

---

## Detailed Component Breakdown

| File | Lines | Status | Used By | Action |
|------|-------|--------|---------|--------|
| mentor-dialogues.js | 2,411 | ACTIVE ✅ | chargen, levelup, survey | KEEP |
| mentor-suggestion-dialogues.js | 3,053 | ACTIVE ✅ | reflective-dialogue | KEEP |
| mentor-reflective-dialogue.js | 580 | ACTIVE ✅ | reflective-dialog | KEEP |
| mentor-reflective-dialog.js | 295 | ACTIVE ✅ | reflective-init | KEEP |
| mentor-survey.js | 1,219 | ACTIVE ✅ | chargen, levelup | KEEP |
| mentor-chat-dialog.js | 727 | ACTIVE ✅ | sheet interactions | KEEP |
| mentor-suggestion-voice.js | 466 | ACTIVE ✅ | levelup | KEEP |
| mentor-voice-filter.js | 394 | ACTIVE ✅ | ? (check) | REVIEW |
| mentor-voice-filter-v2.js | 94 | ? | ? | REVIEW |
| mentor-inheritance.js | 312 | ? | ? | REVIEW |
| mentor-resolver.js | 247 | ACTIVE ✅ | chargen-narrative | KEEP |
| mentor-dialogue-integration.js | 379 | DEAD ❌ | NONE | DELETE |
| mentor-dialogue-v2-integration.js | 149 | ACTIVE ✅ | mentor-chat-dialog | KEEP |
| mentor-suggestion-dialog.js | 166 | ACTIVE ✅ | chargen, levelup | KEEP |
| mentor-help-strings.js | 218 | ? | ? | REVIEW |
| mentor-guidance.js | ? | ACTIVE ✅ | loaded in index.js | KEEP |
| mentor-selector.js | ? | ACTIVE ✅ | loaded in index.js | KEEP |
| mentor-suggestion-voice.js | 466 | ACTIVE ✅ | levelup-main | KEEP |
| mentor-transitions.js | ? | ? | ? | REVIEW |
| **TOTAL** | **11,092** | - | - | - |

---

## Consolidation Opportunities

### IMMEDIATE: Safe Deletions (0 risk)

#### 1. mentor-dialogue-integration.js (379 lines) ❌ DEAD CODE
- **Status:** 0 imports
- **Imports from:** mentor-suggestion-dialogues.js
- **Function:** Appears to be duplicate/abandoned v2 integration attempt
- **Risk:** NONE - completely unused
- **Action:** DELETE immediately

---

### SHORT-TERM: Code Review Needed

#### 2. mentor-voice-filter.js vs mentor-voice-filter-v2.js
**Files:**
- `mentor-voice-filter.js` (394 lines)
- `mentor-voice-filter-v2.js` (94 lines)

**Status:** POSSIBLY DUPLICATE
- Need to check: which is actually used? Are both needed?
- If v2 is newer and supersedes v1: delete v1 (394 lines)
- If v1 is used: delete v2 (94 lines)

**Action:** Check imports and consolidate

#### 3. mentor-inheritance.js (312 lines)
**Status:** UNCLEAR
- Function: Appears to provide archetype/class inheritance for mentors
- Need to verify: is this used by both v1 and v2 systems, or only one?
- If only used by dead v2 system: consider consolidating

**Action:** Trace usage

---

### LONGER-TERM: Architectural Consideration

#### 4. Two Parallel Mentor Systems
**Current:** V1 and V2/Reflective running simultaneously
**Total:** 5,743 lines for two parallel implementations

**Question for User:**
- Should the system have one canonical mentor system?
- OR are V1 and V2 intentionally serving different purposes?

**If consolidating to one system:**
- Keep V1 (2,411 lines) - more widely used
- Merge V2 suggestion/reflection features into V1
- Potential savings: 3,000+ lines

**If keeping both:**
- Clear separation needed
- Document why both are needed
- Audit for feature duplication

---

## Recommended Action Plan

### Phase 2A: Immediate (Safe, 0 risk)
**Time:** 30 minutes
**Savings:** 379 lines

1. ✅ Delete `mentor-dialogue-integration.js` (completely dead)
2. ✅ Verify no other files reference it
3. ✅ Commit

### Phase 2B: Short-term (Medium confidence)
**Time:** 2-3 hours
**Savings:** 94-394 lines

1. Trace voice-filter.js vs voice-filter-v2.js usage
2. Keep newer/used version, delete old version
3. Verify inheritance.js usage
4. Commit consolidation

### Phase 2C: Long-term (Requires design decision)
**Time:** 8-16 hours
**Savings:** 1,000+ lines

1. User decision: One mentor system or two?
2. If consolidating: merge v2 features into v1
3. If keeping both: document separation and audit duplication
4. Systematic refactoring and testing

---

## Detailed Analysis Questions

**For mentor-voice-filter.js duplication:**
```bash
# Which mentor files import voice-filter?
grep -r "mentor-voice-filter" scripts/ --include="*.js" | grep import
```

**For mentor-inheritance.js:**
```bash
# Is mentor-inheritance used by v1 or v2 or both?
grep -r "mentor-inheritance" scripts/ --include="*.js"
```

**For other unknown-status files:**
```bash
# Check all mentor files for actual usage
grep -r "mentor-guidance\|mentor-selector\|mentor-transitions\|mentor-help-strings" scripts/ --include="*.js" | grep import
```

---

## Recommendation

**Start with Phase 2A (Immediate):** Delete `mentor-dialogue-integration.js` - pure dead code, zero risk

**Then Phase 2B (Short-term):** Consolidate voice-filter versions and verify inheritance usage

**Then Phase 2C decision:** Ask user if they want one canonical mentor system or two parallel systems

This allows immediate progress (379 lines) while building toward larger consolidation (1,000+ lines).

---

## Files to Review Next

1. ✅ mentor-dialogue-integration.js - DELETE (dead code)
2. ⚠️ mentor-voice-filter.js / mentor-voice-filter-v2.js - CONSOLIDATE
3. ⚠️ mentor-inheritance.js - VERIFY USAGE
4. ❓ mentor-guidance.js - CHECK ROLE
5. ❓ mentor-help-strings.js - CHECK ROLE
6. ❓ mentor-transitions.js - CHECK ROLE
7. ❓ mentor-selector.js - CHECK ROLE

---

## Next Step

Should I proceed with:
- **Option A:** Delete dead code immediately (mentor-dialogue-integration.js)
- **Option B:** Full audit first (check all status questions above)
- **Option C:** Ask user for design decision on V1 vs V2

**Recommendation:** A → B → C (incremental progress)
