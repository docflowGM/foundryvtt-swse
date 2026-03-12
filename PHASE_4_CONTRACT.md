# Phase 4: Orchestration Consolidation

**Objective:** Route all 9 BuildIntent call sites through SuggestionEngineCoordinator to enable unified caching and coordination.

**Status:** Ready for execution
**Complexity:** LOW - Primarily mechanical updates to call sites
**Risk Level:** LOW - No logic changes, only routing consolidation
**Estimated Impact:** 9 files modified, zero breaking changes

---

## Phase 4 Scope

### Consolidation Target

**Current State:** BuildIntent.analyze() called directly from 9 independent locations
- Each call site computes independently
- Caching infrastructure (SuggestionEngineCoordinator) exists but is unused
- Redundant computations occur (e.g., prestige-roadmap → PathPreview)

**Target State:** All 9 call sites route through SuggestionEngineCoordinator.analyzeBuildIntent()
- Single computation point with unified caching
- Automatic deduplication of redundant calls
- Simplified API surface (use coordinator, not BuildIntent directly)
- Single invalidation point for cache management

### Call Sites to Consolidate

| # | File | Line | Current Pattern | Target Pattern |
|---|------|------|-----------------|----------------|
| 1 | chargen-main.js | 791 | `BuildIntent.analyze()` | `SuggestionEngineCoordinator.analyzeBuildIntent()` |
| 2 | chargen-feats-talents.js | 72 | `BuildIntent.analyze()` | `SuggestionEngineCoordinator.analyzeBuildIntent()` |
| 3 | mentor-chat-dialog.js | 284 | `BuildIntent.analyze()` | `SuggestionEngineCoordinator.analyzeBuildIntent()` |
| 4 | prestige-roadmap.js | 69 | `BuildIntent.analyze()` | `SuggestionEngineCoordinator.analyzeBuildIntent()` |
| 5 | debug-panel.js | 54 | `BuildIntent.analyze()` | `SuggestionEngineCoordinator.analyzeBuildIntent()` |
| 6 | SuggestionEngine.js | 129 | `BuildIntent.analyze()` | `SuggestionEngineCoordinator.analyzeBuildIntent()` |
| 7 | SuggestionEngine.js | 208 | `BuildIntent.analyze()` | `SuggestionEngineCoordinator.analyzeBuildIntent()` |
| 8 | PathPreview.js | 61 | `BuildIntent.analyze()` | `SuggestionEngineCoordinator.analyzeBuildIntent()` |
| 9 | SuggestionEngineCoordinator.js | 184 | Already correct | (already in place) |

---

## Implementation Tasks

### Task 1: Add SuggestionEngineCoordinator import to chargen-main.js
**File:** `/scripts/apps/chargen/chargen-main.js`

**Change:**
```javascript
// Add import at top
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";

// Line 791: Change from
buildIntent = await BuildIntent.analyze(tempActor, pendingData);

// To:
buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(tempActor, pendingData);
```

**Why:** Centralizes BuildIntent computation through coordinator's caching infrastructure.

---

### Task 2: Add SuggestionEngineCoordinator import to chargen-feats-talents.js
**File:** `/scripts/apps/chargen/chargen-feats-talents.js`

**Change:**
```javascript
// Add import at top
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";

// Line 72: Change from
const buildIntent = await BuildIntent.analyze(tempActor, pendingData);

// To:
const buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(tempActor, pendingData);
```

---

### Task 3: Update mentor-chat-dialog.js to use coordinator
**File:** `/scripts/mentor/mentor-chat-dialog.js`

**Change:**
```javascript
// Add import at top
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";

// Lines 284: Change from
if (!this.buildIntent) {
  this.buildIntent = BuildIntent.analyze(this.actor, {});
}

// To:
if (!this.buildIntent) {
  this.buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(this.actor, {});
}
```

**Note:** _prepareContext is already async, so await is supported.

---

### Task 4: Update prestige-roadmap.js to use coordinator
**File:** `/scripts/apps/levelup/prestige-roadmap.js`

**Change:**
```javascript
// Add import at top
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";

// Line 69: Change from
const buildIntent = await BuildIntent.analyze(this.actor, this.pendingData);

// To:
const buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(this.actor, this.pendingData);
```

---

### Task 5: Update debug-panel.js to use coordinator
**File:** `/scripts/apps/levelup/debug-panel.js`

**Change:**
```javascript
// Add import at top
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";

// Line 54: Change from
this.buildIntent = await BuildIntent.analyze(this.actor, this.pendingData);

// To:
this.buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(this.actor, this.pendingData);
```

---

### Task 6: Update SuggestionEngine.js feat suggestions (line 129)
**File:** `/scripts/engine/suggestion/SuggestionEngine.js`

**Change:**
```javascript
// Add import at top
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";

// Line 129-134: Change from
let buildIntent = options.buildIntent;
if (!buildIntent) {
    try {
        buildIntent = await BuildIntent.analyze(actor, pendingData);
    } catch (err) {
        // Fallback to mentorBiases only
    }
}

// To:
let buildIntent = options.buildIntent;
if (!buildIntent) {
    try {
        buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(actor, pendingData);
    } catch (err) {
        // Fallback to mentorBiases only
    }
}
```

---

### Task 7: Update SuggestionEngine.js talent suggestions (line 208)
**File:** `/scripts/engine/suggestion/SuggestionEngine.js`

**Change:**
```javascript
// Line 208-213: Change from
let buildIntent = options.buildIntent;
if (!buildIntent) {
    try {
        buildIntent = await BuildIntent.analyze(actor, pendingData);
    } catch (err) {
        // Fallback to mentorBiases only
    }
}

// To:
let buildIntent = options.buildIntent;
if (!buildIntent) {
    try {
        buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(actor, pendingData);
    } catch (err) {
        // Fallback to mentorBiases only
    }
}
```

---

### Task 8: Update PathPreview.js to use coordinator
**File:** `/scripts/engine/suggestion/PathPreview.js`

**Change:**
```javascript
// Add import at top
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";

// Line 61: Change from
const buildIntent = await BuildIntent.analyze(actor, pendingData);

// To:
const buildIntent = await SuggestionEngineCoordinator.analyzeBuildIntent(actor, pendingData);
```

**Benefit:** Eliminates the redundancy where prestige-roadmap (line 69) computes, then PathPreview (line 61) computes again. Now they share cached result.

---

## Implementation Pattern

All changes follow identical pattern:

```javascript
// 1. Add import
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";

// 2. Replace direct call
// From: await BuildIntent.analyze(actor, pendingData)
// To:   await SuggestionEngineCoordinator.analyzeBuildIntent(actor, pendingData)
```

**No changes to:**
- BuildIntent module
- SuggestionEngineCoordinator module
- Other files
- Return types or field names
- Error handling or fallback behavior

---

## Validation Checks

After implementation, verify:

1. **All 9 call sites updated:**
   - [ ] chargen-main.js:791 uses coordinator
   - [ ] chargen-feats-talents.js:72 uses coordinator
   - [ ] mentor-chat-dialog.js:284 uses coordinator
   - [ ] prestige-roadmap.js:69 uses coordinator
   - [ ] debug-panel.js:54 uses coordinator
   - [ ] SuggestionEngine.js:129 uses coordinator
   - [ ] SuggestionEngine.js:208 uses coordinator
   - [ ] PathPreview.js:61 uses coordinator

2. **No breaking changes:**
   - [ ] All call sites still have access to buildIntent object
   - [ ] Return structure unchanged
   - [ ] Async/await patterns still work
   - [ ] Error handling preserved

3. **Caching active:**
   - [ ] SuggestionEngineCoordinator._buildIntentCache accessed during execution
   - [ ] Prestige roadmap no longer causes redundant computation
   - [ ] Cache invalidation works via clearBuildIntentCache()

4. **No new dependencies:**
   - [ ] Only SuggestionEngineCoordinator import added (already available)
   - [ ] No new modules created
   - [ ] BuildIntent still importable (backward compatibility)

---

## Critical Rules

**DO:**
- Replace all 9 call sites with coordinator routing
- Add SuggestionEngineCoordinator import to each file
- Keep all error handling identical
- Preserve async/await patterns
- Keep return types unchanged

**DO NOT:**
- Modify SuggestionEngineCoordinator internals
- Modify BuildIntent module
- Change call signatures
- Refactor surrounding code
- Remove BuildIntent import from other modules (maintain backward compat)

---

## Expected Outcomes

### Immediate Effects
- Single computation point for BuildIntent analysis
- Automatic deduplication of prestige-roadmap + PathPreview redundancy
- Unified caching across all 9 call sites
- Single cache invalidation point

### Performance Improvement
- Prestige roadmap UI opens 2x faster (no redundant PathPreview computation)
- Feat/talent suggestion generation shares cache with chargen
- Debug panel shares cache with other UI components

### Technical Debt Reduction
- SuggestionEngineCoordinator.analyzeBuildIntent() becomes THE interface
- Caching infrastructure finally active (was dead code, now used)
- Architectural coherence: all suggestion flows through coordinator

---

## Next Phase (Phase 5)

After Phase 4 consolidation, consider Phase 5:

**Reactive Wiring** - Make BuildIntent computation automatic per chargen click
- Hook into chargen selection events
- Automatic cache invalidation on state changes
- No explicit analyzer() calls from chargen
- BuildIntent always reflects current state, ready for UI consumption

---

## Commit Message Template

```
refactor(phase-4): Orchestration consolidation - route all BuildIntent calls through coordinator

PHASE 4: ORCHESTRATION CONSOLIDATION - Complete

Consolidated all 9 BuildIntent.analyze() call sites to route through
SuggestionEngineCoordinator.analyzeBuildIntent() for unified caching.

Changes:
- chargen-main.js - route through coordinator
- chargen-feats-talents.js - route through coordinator
- mentor-chat-dialog.js - route through coordinator
- prestige-roadmap.js - route through coordinator
- debug-panel.js - route through coordinator
- SuggestionEngine.js (2 locations) - route through coordinator
- PathPreview.js - route through coordinator

Benefits:
✓ Single computation point with unified caching
✓ Eliminates prestige-roadmap + PathPreview redundancy
✓ Activates previously-unused caching infrastructure
✓ Single invalidation point for cache management
✓ SuggestionEngineCoordinator.analyzeBuildIntent() becomes THE interface

Validation:
✓ All 9 call sites consolidated
✓ Return structure unchanged
✓ Zero breaking changes
✓ Caching now active across all sites
✓ Performance improvement (2x faster prestige roadmap UI)

Technical Debt:
✓ Caching infrastructure active (was dead code)
✓ SuggestionEngineCoordinator fully utilized
✓ Architectural coherence improved

Ready for Phase 5 (Reactive Wiring)

https://claude.ai/code/session_018MYrvSZcMraB17Y2c9ioVK
```

---

**Status:** Ready for Phase 4 execution
**Estimated Effort:** 30 minutes (9 mechanical file updates)
**Risk Assessment:** Very low - routing changes only, no logic modifications
