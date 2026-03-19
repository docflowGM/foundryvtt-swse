# Level-Up System Fixes Summary
**Date**: March 15, 2026
**Version**: Comprehensive Repair Phase

## Overview
This document describes all fixes applied to the Level-Up progression system to resolve the "NPC Level Up" window appearing and other context preparation failures.

## Critical Bugs Fixed

### 1. SuggestionService Parameter Destructuring Bug (P0)
**File**: `/scripts/engine/suggestion/SuggestionService.js` (Line 482)
**Symptom**: `ReferenceError: options is not defined` when enriching class suggestions
**Root Cause**: Function signature only destructured `{ trace }` but code referenced `options.epicAdvisory` and `options.mentorProfile`

**Before**:
```javascript
static async _enrichSuggestions(actor, suggestions, { trace } = {}) {
```

**After**:
```javascript
static async _enrichSuggestions(actor, suggestions, options = {}) {
```

**Impact**: Allows suggestions to be properly enriched with mentor profiles and epic advisory flags

---

### 2. Mentor Guidance Undefined Check (P0)
**File**: `/scripts/engine/mentor/mentor-dialogues.js` (Lines 59-65)
**Symptom**: `TypeError: Cannot read properties of undefined (reading 'name')` during context prepare
**Root Cause**: `getMentorGuidance()` was called with undefined mentor

**Fix**:
```javascript
export function getMentorGuidance(mentor, choiceType) {
    // Guard: if mentor is not available, return empty string
    if (!mentor || !mentor.name) {
      return '';
    }
    // ... rest of method
}
```

**Impact**: Prevents fatal error when mentor system is not fully initialized

---

### 3. Mentor Guidance Non-Fatal Handler (P1)
**File**: `/scripts/apps/levelup/levelup-main.js` (Lines 493-497)
**Symptom**: Context prepare crash if mentor not initialized
**Root Cause**: `_getMentorGuidanceForCurrentStep()` didn't check if `this.mentor` was null

**Fix**:
```javascript
_getMentorGuidanceForCurrentStep() {
    // Guard: if mentor is not available, don't crash
    if (!this.mentor) {
      return '';
    }
    // ... rest of method
}
```

**Impact**: Ensures level-up window can render even if mentor initialization fails

---

### 4. Import Path Inconsistency (P1)
**File**: `/scripts/apps/levelup/npc-levelup-entry.js` (Line 7)
**Symptom**: NPC level-up flow was using simplified/older SWSELevelUpEnhanced class
**Root Cause**: Import was from `levelup-enhanced.js` instead of the shim `swse-levelup-enhanced.js`

**Before**:
```javascript
import { SWSELevelUpEnhanced } from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-enhanced.js";
```

**After**:
```javascript
import { SWSELevelUpEnhanced } from "/systems/foundryvtt-swse/scripts/apps/swse-levelup-enhanced.js";
```

**Impact**: Ensures all code paths use the full-featured version of SWSELevelUpEnhanced

---

## Hardening Enhancements

### 5. Entry Point Error Handling
**File**: `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` (Lines 21-47)
**Enhancement**: Added try/catch blocks around dialog instantiation for both character and NPC paths

**Benefit**: Provides user feedback if level-up initialization fails, logs errors for debugging

---

### 6. Mentor Initialization Resilience
**File**: `/scripts/apps/levelup/levelup-main.js` (Lines 246-260)
**Enhancement**: Wrapped mentor initialization in try/catch, defaults to null mentor on failure

**Benefit**: Level-up window can open even if mentor system fails, preventing complete failure cascade

---

### 7. Progression Engine Initialization Resilience
**File**: `/scripts/apps/levelup/levelup-main.js` (Lines 236-252)
**Enhancement**: Wrapped progression engine initialization with fallback creation

**Benefit**: Progression engine errors don't completely block level-up opening

---

### 8. Diagnostic Logging Enhancement
**File**: `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` (Lines 50-71)
**Enhancement**: Added detailed logging at hook registration and button addition

**Benefit**: Makes it easier to diagnose why level-up button might not appear or incorrect actor type detected

---

## Architecture Issues Identified

### Class Skill Registry Drift (P2) ✅ ENHANCED
**Location**: Multiple class documents (Scoundrel, Noble, Scout, etc.)
**Issue**: Classes reference skill IDs/names that don't exist in current registry
**Example**: `"Knowledge(all skills, taken individually)"` doesn't resolve

**Solution Implemented**:
Created `/scripts/engine/progression/skills/skill-resolver.js` with robust matching:
- Exact name match (primary strategy)
- Case-insensitive match (handles capitalization drift)
- Partial/fuzzy match (handles minor naming variations)
- Clear logging of unresolved skills

**Updated Validation** in `levelup-class.js`:
- Replaced simple `includes()` check with `SkillResolver.validateClassSkills()`
- Returns both valid and invalid skills separately
- Logs resolved skills for debugging
- Only warns GM about truly unresolvable skills

**Current State**: Logged as warnings, doesn't prevent level-up
**Impact**: System is now much more resilient to skill naming variations

### Duplicate SWSELevelUpEnhanced Classes
**Location**:
- `/scripts/apps/levelup/levelup-enhanced.js` (older/simplified version)
- `/scripts/apps/levelup/levelup-main.js` (full version)

**Status**: Fixed by ensuring all imports use shim that exports from levelup-main.js
**Recommendation**: Archive or remove levelup-enhanced.js if it's not used elsewhere

---

## Testing Checklist

- [ ] Level-up button appears on character sheet
- [ ] Clicking level-up on character opens SWSELevelUpEnhanced (with "Level Up — [name]" title)
- [ ] Clicking level-up on NPC opens SWSENpcLevelUpEntry (with "NPC Level Up" title, GM only)
- [ ] No console errors on level-up window open
- [ ] Mentor greeting displays correctly
- [ ] Mentor guidance displays for current step
- [ ] Context prepare completes without fatal errors
- [ ] Window can handle mentor initialization failure gracefully
- [ ] Window can handle progression engine failure gracefully

---

## Files Modified

1. `/scripts/engine/suggestion/SuggestionService.js` - Fixed parameter destructuring
2. `/scripts/engine/mentor/mentor-dialogues.js` - Added mentor undefined guard
3. `/scripts/apps/levelup/levelup-main.js` - Added defensive guards + error handling
4. `/scripts/apps/levelup/npc-levelup-entry.js` - Fixed import path
5. `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` - Added error handling + logging
6. `/scripts/apps/levelup/levelup-class.js` - Updated to use SkillResolver

## Files Created

1. `/scripts/engine/progression/skills/skill-resolver.js` - New SkillResolver utility for robust skill matching

---

## Next Steps

1. **Verify Fixes**: Test level-up opening with character actor to confirm all fixes work
2. **Monitor Console**: Check browser console for diagnostic logs confirming proper flow
3. **Class Skill Mapping**: Schedule compendium audit to fix skill registry drift
4. **Archive Old Files**: Consider removing `levelup-enhanced.js` if confirmed unused
5. **Performance Check**: Monitor for any performance issues with new error handling

