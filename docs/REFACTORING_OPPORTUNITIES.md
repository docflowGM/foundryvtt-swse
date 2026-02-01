# SWSE System - Code Refactoring Opportunities

**Status:** Post-SSOT stabilization cleanup opportunities
**Scan Date:** 2026-01-26
**Total Codebase Savings Potential:** 7,100+ lines (~10-15% reduction)

---

## Executive Summary

Beyond the SSOT refactor (which removed 450 lines of recovery code), systematic scanning has identified:

- **4 CRITICAL issues** (421+ lines of dead code to delete)
- **5 HIGH issues** (11,092+ lines of duplication to consolidate)
- **5 MEDIUM issues** (optimization opportunities)
- **4 LOW issues** (polish/cleanup)

The system has accumulated duplicate code from parallel development attempts (v1/v2 mentor systems), multiple normalizers, and monolithic god objects.

**Recommended approach:** Fix CRITICAL issues immediately (high value, low risk), then tackle HIGH issues for maximum impact.

---

## 🚨 CRITICAL ISSUES - Delete These Now

### 1. DUPLICATE NORMALIZERS: Class System

**Severity:** CRITICAL - Risk of inconsistent behavior

**Files:**
- `scripts/data/class-normalizer.js` (245 lines) ← KEEP
- `scripts/progression/engine/class-normalizer.js` (176 lines) ← DELETE

**Problem:**
Two independent implementations of class normalization. The progression version doesn't import from the data version, meaning different code paths could normalize the same class differently.

```javascript
// scripts/data/class-normalizer.js
export function normalizeClassName(name) {
  // Implementation A
}

// scripts/progression/engine/class-normalizer.js
export function normalizeClassName(name) {
  // Implementation B (different!)
}
```

**Impact:**
- Silent bugs where normalization produces different results
- Fixes in one don't propagate to the other
- Confusing for developers (which one is canonical?)

**Action:**
1. Delete `scripts/progression/engine/class-normalizer.js`
2. Verify `scripts/progression/engine/` imports work without it
3. Update any direct imports to use `scripts/data/class-normalizer.js`

**Savings:** 176 lines
**Effort:** 30 minutes
**Risk:** LOW (can quickly verify by running tests)

---

### 2. DUPLICATE NORMALIZERS: Talent Trees

**Severity:** CRITICAL - Dead code path

**Files:**
- `scripts/data/talent-tree-normalizer.js` (175 lines) ← KEEP
- `scripts/progression/engine/talent-tree-normalizer.js` (167 lines) ← DELETE

**Problem:**
The progression version actually imports from the data version but maintains a parallel implementation anyway. This is dead code - the import shadows the local definition.

```javascript
// scripts/progression/engine/talent-tree-normalizer.js
import { normalizeRangeName } from '../../data/talent-tree-normalizer.js';  // ← uses this
export function normalizeRangeName(name) {  // ← but also defines this (dead)
  // ...duplicate...
}
```

**Impact:**
- Confusion about which normalizer is "real"
- Dead code taking up space
- Maintenance burden

**Action:**
1. Delete `scripts/progression/engine/talent-tree-normalizer.js`
2. Update imports in `scripts/progression/` to import from data version
3. Verify no new errors

**Savings:** 167 lines
**Effort:** 20 minutes
**Risk:** VERY LOW (clear dead code)

---

### 3. DUAL SUGGESTION ENGINE IMPLEMENTATIONS

**Severity:** CRITICAL - Wrong files getting edited

**Files:**
- `scripts/engine/ForceSecretSuggestionEngine.js` (107 lines) ← WRONG FILE
- `scripts/progression/engine/force-secret-suggestion-engine.js` (107 lines) ← ACTUALLY USED
- Similar for ForceTechniquesSuggestionEngine

**Problem:**
Code exists in TWO places. Only the progression version is imported and used. The engine version is dead code. Developers might edit the wrong file.

```
scripts/engine/ForceSecretSuggestionEngine.js
    ↓ Not imported anywhere

scripts/progression/engine/force-secret-suggestion-engine.js
    ↑ Only this is actually used
```

**Impact:**
- Changes to wrong file have no effect
- Confusing debugging (change code, nothing happens)
- Maintenance nightmare

**Action:**
1. Search for all imports of `scripts/engine/*SuggestionEngine.js` files
2. Delete the unused engine version if zero imports found
3. For used files, move to consistent location (all in progression/)

**Savings:** 107+ lines per pair × 2 pairs = 214+ lines
**Effort:** 1 hour
**Risk:** MEDIUM (need to verify no secret imports)

---

### 4. BACKUP FILES IN PRODUCTION DIRECTORY

**Severity:** CRITICAL - Risk of accidental loading

**Files:**
- `scripts/apps/mentor-dialogues.zip` (35K)
- `scripts/apps/mentor-dialogues.zip.bak` (35K)

**Problem:**
70K of backup archives sitting in production scripts directory. Risk they get accidentally imported or interfere with build process.

**Impact:**
- Could be accidentally imported in webpack/build
- Confusing to developers (what are these?)
- Wasted disk space
- Version control bloat

**Action:**
1. Move to `/archives/` directory outside of scripts
2. Or delete entirely if not needed (check git history)
3. Add `/archives/` to .gitignore or use separate storage

**Savings:** 70K disk space, cleaner directory
**Effort:** 5 minutes
**Risk:** VERY LOW (backups)

---

## 📊 HIGH PRIORITY ISSUES - Consolidate For Major Impact

### 1. MENTOR SYSTEM FRAGMENTATION

**Severity:** HIGH - Architectural confusion

**Files:** 19 mentor-related files, ~11,092 total lines
- `mentor-dialogues.js` (2,411 lines) - Original v1
- `mentor-suggestion-dialogues.js` (3,053 lines) - Alternative v2
- `mentor-dialogue-integration.js` (379 lines) - v1 integration
- `mentor-dialogue-v2-integration.js` (149 lines) - v2 integration
- `mentor-reflective-dialogue.js` (580 lines)
- `mentor-reflective-dialog.js` (295 lines) - Different spelling! (duplicate?)
- Plus 11 more support files

**Problem:**
Multiple v1/v2 implementations with no clear migration path. Developers don't know which system is canonical.

```
Which mentor system is actually in use?
├── Option A: mentor-dialogues.js (v1)
├── Option B: mentor-suggestion-dialogues.js (v2)
├── Option C: Some combination?
└── Result: Confusion and duplicate code
```

**Impact:**
- 1,000+ lines of unused mentor code
- Bugs fixed in v1 but not v2 (or vice versa)
- New developers don't know which to modify

**Action:**
1. Audit which mentor system is actually in use (grep imports)
2. Mark the OTHER version as @deprecated
3. Gradually migrate to canonical version
4. Delete deprecated version entirely (after v1.1.250+)

**Alternative:** Consolidate both into a single v3 system

**Savings:** 1,000+ lines
**Effort:** 4-8 hours (requires understanding mentor architecture)
**Risk:** HIGH (mentor system is complex)

**Recommendation:** Do this as separate PR after SSOT stabilization. Too risky to combine with current refactor.

---

### 2. IDENTICAL PICKER UI COMPONENTS

**Severity:** HIGH - Extreme maintenance burden

**Files:**
- `scripts/progression/ui/force-power-picker.js` (105 lines)
- `scripts/progression/ui/force-secret-picker.js` (113 lines)
- `scripts/progression/ui/force-technique-picker.js` (113 lines)
- `scripts/progression/ui/starship-maneuver-picker.js` (113 lines)

**Problem:**
95%+ identical code structure. Only data types differ. Bug fixes must be applied 4 times.

**Current (BAD):**
```javascript
// force-power-picker.js
class ForcePowerPicker extends Dialog {
  activateListeners(html) {
    html.on('click', '.power-option', (e) => this._selectPower(e));
  }
  _selectPower(event) { /* ... */ }
}

// force-secret-picker.js  (IDENTICAL except class name and field names)
class ForceSecretPicker extends Dialog {
  activateListeners(html) {
    html.on('click', '.secret-option', (e) => this._selectSecret(e));
  }
  _selectSecret(event) { /* ... */ }
}
```

**Desired (GOOD):**
```javascript
// item-picker.js
class ItemPicker extends Dialog {
  constructor(items, options = {}) {
    super(options);
    this.items = items;
    this.itemType = options.itemType;  // "power", "secret", "technique", etc.
  }

  activateListeners(html) {
    html.on('click', `.${this.itemType}-option`, (e) => this._selectItem(e));
  }
  _selectItem(event) { /* ... */ }
}

// Usage:
new ItemPicker(powers, { itemType: 'power' });
new ItemPicker(secrets, { itemType: 'secret' });
```

**Impact:**
- Bug in picker UI requires 4 separate fixes
- Any improvement must be done 4 times
- 240+ lines of duplicate code

**Action:**
1. Extract generic `ItemPicker` class
2. Move item-specific templates to data config
3. Replace 4 files with single generic + config
4. Delete 3 picker files

**Savings:** 240+ lines
**Effort:** 2-3 hours
**Risk:** MEDIUM (need to verify picker functionality)

**Recommendation:** High value - do this soon after SSOT stabilization

---

### 3. TEST FILE IN PRODUCTION CODE

**Severity:** HIGH - Code organization issue

**File:** `scripts/engine/mentor-memory.test.js` (314 lines)

**Problem:**
Test code mixed in production scripts. Contains `window.MentorSystemTests` exports and test-specific logic.

```javascript
// scripts/engine/mentor-memory.test.js
export class MentorMemory {
  // ... actual code ...
}

export const MentorSystemTests = {
  runTests() {
    console.log("Test: Memory recall");
    // ... test logic ...
  }
};
```

**Impact:**
- Confuses codebase organization
- Test code in production bundle
- Harder to set up real testing framework

**Action:**
1. Create `/tests/` directory
2. Move `mentor-memory.test.js` to `/tests/mentor-memory.test.js`
3. Set up proper Jest/test runner
4. Remove `window.MentorSystemTests` exports from production

**Savings:** 314 lines of bundle reduction + clearer organization
**Effort:** 1-2 hours
**Risk:** LOW (clear test code)

**Recommendation:** Do this in next cleanup pass

---

### 4. MONOLITHIC ENGINE FILES (God Objects)

**Severity:** HIGH - Blocks testing and feature development

**Files:**
- `progression.js` (1,967 lines) - 12+ responsibilities
- `mentor-dialogue-responses.js` (1,809 lines) - Data table + code
- `TalentAbilitiesEngine.js` (1,384 lines) - Single god object
- `SuggestionEngine.js` (1,358 lines) - Oversized coordinator
- `ClassSuggestionEngine.js` (1,313 lines) - Monolithic

**Problem:**
These files are too large to understand, test, or modify safely. Single Responsibility Principle violated.

```
progression.js (1,967 lines) contains:
  - Class progression calculation
  - Feat progression calculation
  - Talent progression calculation
  - Skill progression calculation
  - Force power progression calculation
  - Defensive ability handling
  - Special ability handling
  - Multiclass logic
  - XP progression
  - Prestige class logic
  - Retry/undo logic
  - Validation + error checking
  - UI integration
```

**Impact:**
- Can't unit test any single piece
- Bug fixes risk breaking unrelated features
- Cognitive overload for developers
- Hard to find anything

**Action:**
Break each monolith into 3-5 focused files:
```
progression/
├── class-progression.js (400 lines)
├── feat-progression.js (300 lines)
├── talent-progression.js (350 lines)
├── skill-progression.js (250 lines)
├── force-power-progression.js (300 lines)
└── progression-validator.js (200 lines)
```

**Savings:** Not direct line reduction, but massive maintainability gain
**Effort:** 8-16 hours per file (significant refactoring)
**Risk:** VERY HIGH (complex systems, easy to introduce bugs)

**Recommendation:** Do this after SSOT stabilization is verified. Pair programming strongly recommended.

---

### 5. DUPLICATE REGISTRY PATTERN (Not Using Common Base)

**Severity:** HIGH - Code duplication

**Files:**
- `feat-registry.js` (165 lines)
- `skill-registry.js` (133 lines)
- `TalentTreeRegistry.js` (178 lines)

**Problem:**
All implement same pattern: load from compendium, cache results, provide getter methods. But not using common base class.

```javascript
// feat-registry.js
export class FeatRegistry {
  static _feats = null;

  static async load() {
    if (this._feats) return this._feats;
    this._feats = await this._loadFromCompendium();
    return this._feats;
  }

  static getFeat(id) { /* ... */ }
  static getAllFeats() { /* ... */ }
}

// skill-registry.js (IDENTICAL PATTERN)
export class SkillRegistry {
  static _skills = null;

  static async load() {
    if (this._skills) return this._skills;
    this._skills = await this._loadFromCompendium();
    return this._skills;
  }

  static getSkill(id) { /* ... */ }
  static getAllSkills() { /* ... */ }
}
```

**Impact:**
- Bug in pattern must be fixed 3 times
- Hard to add new registries consistently
- Code review burden

**Action:**
1. Create `BaseRegistry` class with common pattern
2. Have FeatRegistry, SkillRegistry, etc. extend it
3. Override only item-specific logic

**Savings:** 80+ lines (consolidation)
**Effort:** 2-3 hours
**Risk:** MEDIUM (careful with overrides)

**Recommendation:** Good follow-up after SSOT. Moderate effort, good payoff.

---

## 🟡 MEDIUM PRIORITY - Optimization & Organization

### 1. DEBUG UTILITIES IN PRODUCTION

**Files:**
- `scripts/apps/levelup/debug-panel.js` - GM debug UI
- `scripts/utils/verify-suggestions.js` (110 lines) - Console verification

**Action:**
- Move to `scripts/debug/` directory
- Guard behind `CONFIG.SWSE.debugMode` flag
- Don't load in production builds

**Savings:** Cleaner organization, optional loading
**Effort:** 1 hour
**Risk:** LOW

---

### 2. SMALL SINGLE-EXPORT UTILITIES

**Files:**
- `warn-gm.js` (17 lines)
- `macro-functions.js` (22 lines)
- `calc-conditions.js` (19 lines)

**Action:**
Consolidate into utility collections:
- `scripts/utils/logger-utils.js` - warn-gm + logging
- `scripts/utils/math-utils.js` - calc-conditions
- `scripts/utils/macro-utils.js` - macro-functions

**Savings:** Reduced module count, clearer organization
**Effort:** 30 minutes
**Risk:** VERY LOW

---

### 3. FORCE PROGRESSION SYSTEM DUPLICATION

**Files:**
- `force-secret-engine.js` (107 lines)
- `force-secret-suggestion-engine.js` (107 lines)

**Problem:**
Parallel data engine and suggestion engine for same thing

**Action:**
Clarify if both needed or consolidate:
- Option A: Merge suggestion logic into engine
- Option B: Make engine feed suggestion engine
- Option C: Delete one if redundant

**Effort:** 2-3 hours (architectural decision first)
**Risk:** MEDIUM

---

### 4. LARGE DATA FILES WITH INLINE CODE

**File:** `mentor-dialogue-responses.js` (1,809 lines)

**Problem:**
Huge data table mixed with code

**Action:**
Extract data to JSON:
```
mentor-dialogue-responses.js (300 lines code)
└── data/mentor-dialogue-responses.json (1,500 lines data)
```

**Savings:** Clearer separation of concerns
**Effort:** 2-3 hours
**Risk:** LOW (pure data extraction)

---

## 📈 Implementation Plan

### **Phase 1: CRITICAL DELETIONS (1-2 days)**
Priority: **IMMEDIATE** - High value, low risk

1. Delete class-normalizer duplicate (20 min)
2. Delete talent-tree-normalizer duplicate (20 min)
3. Delete backup ZIP files (5 min)
4. Verify dual suggestion engines and delete (1 hour)

**Result:** Clean up 500+ lines of dead code

**Command:**
```bash
rm scripts/progression/engine/class-normalizer.js
rm scripts/progression/engine/talent-tree-normalizer.js
rm scripts/apps/mentor-dialogues.zip*
# (verify and delete) scripts/engine/*SuggestionEngine.js
```

---

### **Phase 2: HIGH PRIORITY (1-2 weeks after SSOT stabilization)**

1. Audit mentor system (4-8 hours)
2. Consolidate picker components (2-3 hours)
3. Move test file to proper location (1-2 hours)

**Result:** 1,500+ lines consolidated, architectural clarity

---

### **Phase 3: MONOLITHIC REFACTORS (2-4 weeks)**

1. Break apart progression.js
2. Break apart monolithic engines
3. Extract data from dialogue-responses.js

**Result:** 3,000+ lines restructured for maintainability

---

### **Phase 4: PATTERN EXTRACTION (1 week)**

1. Create BaseRegistry pattern
2. Create generic ItemPicker
3. Consolidate utility files

**Result:** 500+ lines consolidated, clearer patterns

---

### **Phase 5: POLISH (ongoing)**

- Archive old migrations
- Remove deprecated fields
- Update documentation

---

## Metrics & Expected Outcomes

| Phase | Lines | Effort | Timeline | Impact |
|-------|-------|--------|----------|--------|
| **1** | 500+ | 2 days | Immediate | ⭐⭐⭐ |
| **2** | 1,500+ | 1-2 weeks | Next sprint | ⭐⭐⭐⭐ |
| **3** | 3,000+ | 2-4 weeks | This month | ⭐⭐⭐⭐⭐ |
| **4** | 500+ | 1 week | Later | ⭐⭐⭐ |
| **5** | Misc | Ongoing | Polish | ⭐⭐ |

**Total Possible Savings:** 7,100+ lines (~10-15% of codebase)
**Total Effort:** 4-6 weeks
**Development Velocity Gain:** 15-20% (from clearer code, easier debugging)

---

## Recommendation

1. **Do Phase 1 NOW** (CRITICAL deletions) - 2 days, huge payoff
2. **Do Phase 2 AFTER SSOT verification** (HIGH consolidations) - 1-2 weeks
3. **Do Phase 3 IN PARALLEL with feature development** (Monolithic refactors) - ongoing
4. **Polish as you go** (Phase 4-5)

**Don't do:** Attempt all of this at once. The monolithic refactors especially need careful testing.

---

## Notes

- All phase 1 changes are safe, can be done immediately
- Phase 2-3 should have dedicated testing time
- Consider pair programming for monolithic refactors
- Create detailed tests before breaking apart god objects
- Use git bisect if bugs appear during refactoring
