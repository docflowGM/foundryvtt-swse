# BuildIntent Lifecycle Audit

**Date**: March 12, 2026
**Scope**: Complete analysis of BuildIntent instantiation, use, recalculation, and caching across chargen and level-up flows
**Auditor**: Architecture Review

---

## Executive Summary

BuildIntent is instantiated in **9 distinct locations** across the codebase with **inconsistent lifecycle patterns**. The module exhibits the following critical behaviors:

1. **Late Computation**: BuildIntent is NOT computed during chargen species/class/abilities steps (only during feat/talent step)
2. **Multiple Recomputation Sites**: BuildIntent is recomputed independently in 8+ locations, each with different timing/context
3. **Partial Caching**: SuggestionEngineCoordinator implements caching, but it's not used by most call sites
4. **No Invalidation Strategy**: No mechanism to invalidate BuildIntent when actor state changes during chargen progression
5. **Stale PendingData Flow**: `pendingData` parameter creates temporal inconsistency - same BuildIntent object used with outdated selections

---

## BuildIntent.analyze() Call Sites (Complete Inventory)

### Call Site 1: Chargen - Feats/Talents Step
**File**: `/scripts/apps/chargen/chargen-main.js`
**Line**: 791
**Context**: Feat/talent suggestions during character creation
**Timing**: ONLY when rendering feat/talent step
**Frequency**: Once per feat/talent step entry
**PendingData**: ✓ Includes current chargen selections

```javascript
buildIntent = await BuildIntent.analyze(tempActor, pendingData);
```

**Key Pattern**:
- Called AFTER class selection completes
- Does NOT recalculate when species/abilities/class changed earlier
- BuildIntent reflects ONLY feat/talent selections at this point
- Used to scope feat/talent suggestions

---

### Call Site 2: Chargen - Alternative Feat/Talent Path
**File**: `/scripts/apps/chargen/chargen-feats-talents.js`
**Line**: 72
**Context**: Feat/talent suggestions (alternative chargen module)
**Timing**: During feat/talent step rendering
**Frequency**: Once per step
**PendingData**: ✓ Includes chargen selections

```javascript
const buildIntent = await BuildIntent.analyze(tempActor, pendingData);
```

**Key Pattern**:
- Parallel implementation to chargen-main.js
- Same late-timing issue
- Used to scope feat/talent suggestions with includeFutureAvailability option

---

### Call Site 3: Mentor Chat Dialog (Post-Chargen)
**File**: `/scripts/mentor/mentor-chat-dialog.js`
**Line**: 284
**Context**: Mentor chat interface after chargen
**Timing**: Lazy - only computed once if accessed
**Frequency**: Once per dialog open (cached in `this.buildIntent`)
**PendingData**: ✗ EMPTY (no pending data)

```javascript
if (!this.buildIntent) {
  this.buildIntent = BuildIntent.analyze(this.actor, {});
}
```

**Key Pattern**:
- Post-chargen context (actor is fully saved)
- No pendingData flow
- Singleton per dialog instance
- BuildIntent reflects final character state only

---

### Call Site 4: Level-Up - Prestige Roadmap UI
**File**: `/scripts/apps/levelup/prestige-roadmap.js`
**Line**: 69
**Context**: Visual prestige class roadmap during level-up
**Timing**: On-demand when UI renders
**Frequency**: Once per UI render
**PendingData**: ✓ Optional, includes pending selections

```javascript
const buildIntent = await BuildIntent.analyze(this.actor, this.pendingData);
```

**Key Pattern**:
- Uses current actor state (saved to DB) + optional pendingData
- UI recalculates on each render
- No caching - fresh computation every time

---

### Call Site 5: Level-Up - GM Debug Panel
**File**: `/scripts/apps/levelup/debug-panel.js`
**Line**: 54
**Context**: GM-only debug interface
**Timing**: On-demand when panel renders
**Frequency**: Once per render (can be refreshed manually)
**PendingData**: ✓ Optional

```javascript
this.buildIntent = await BuildIntent.analyze(this.actor, this.pendingData);
```

**Key Pattern**:
- Debug/observability only
- Calls BuildIntent.analyze() directly
- No caching or coordination

---

### Call Site 6: SuggestionEngine - Feat Suggestions
**File**: `/scripts/engine/suggestion/SuggestionEngine.js`
**Line**: 129
**Context**: Feat suggestion generation
**Timing**: On-demand if NOT pre-provided
**Frequency**: Once per suggestFeats() call (or zero if buildIntent passed in)
**PendingData**: ✓ Passed through

```javascript
let buildIntent = options.buildIntent;
if (!buildIntent) {
    try {
        buildIntent = await BuildIntent.analyze(actor, pendingData);
    } catch (err) {
        // Fallback to mentorBiases only
    }
}
```

**Key Pattern**:
- Optional parameter allows pre-computation
- Fallback on error: uses mentorBiases only (degraded suggestion mode)
- Compute-on-demand pattern - not coordinated with other call sites

---

### Call Site 7: SuggestionEngine - Talent Suggestions
**File**: `/scripts/engine/suggestion/SuggestionEngine.js`
**Line**: 208
**Context**: Talent suggestion generation
**Timing**: On-demand if NOT pre-provided
**Frequency**: Once per suggestTalents() call (or zero if buildIntent passed in)
**PendingData**: ✓ Passed through

```javascript
let buildIntent = options.buildIntent;
if (!buildIntent) {
    try {
        buildIntent = await BuildIntent.analyze(actor, pendingData);
    } catch (err) {
        // Fallback to mentorBiases only
    }
}
```

**Key Pattern**:
- Identical pattern to feat suggestions
- Compute-on-demand, optional optimization

---

### Call Site 8: PathPreview - Level-Up Path Generation
**File**: `/scripts/engine/suggestion/PathPreview.js`
**Line**: 61
**Context**: Generate prestige class path preview recommendations
**Timing**: On-demand during level-up UI
**Frequency**: Once per generatePreviews() call
**PendingData**: ✓ Passed through

```javascript
const buildIntent = await BuildIntent.analyze(actor, pendingData);
```

**Key Pattern**:
- Always computes fresh (no option to pass pre-computed)
- Used to determine top prestige targets
- Calls directly - not coordinated with coordinator

---

### Call Site 9: SuggestionEngineCoordinator - Cached Access
**File**: `/scripts/engine/suggestion/SuggestionEngineCoordinator.js`
**Line**: 184
**Context**: Suggestion coordination hub with caching
**Timing**: On-demand with cache check
**Frequency**: Once per unique (actorId, pendingData) pair
**PendingData**: ✓ Passed through
**Caching**: ✓ YES - static cache with key `{actorId}:{pendingDataHash}`

```javascript
if (this._buildIntentCache.has(cacheKey)) {
    return this._buildIntentCache.get(cacheKey);
}

const buildIntent = await BuildIntent.analyze(actor, pendingData);
this._buildIntentCache.set(cacheKey, buildIntent);
return buildIntent;
```

**Key Pattern**:
- **ONLY place with caching mechanism**
- Cache invalidation: `clearBuildIntentCache(actorId)`
- Call sites 6-8 (SuggestionEngine, PathPreview) do NOT use this coordinator

---

## Lifecycle Pattern Analysis

### Pattern A: Chargen Flow (Species → Class → Abilities → Feats/Talents)

```
Step 1: Species Selection → NO BuildIntent computation
Step 2: Abilities → NO BuildIntent computation
Step 3: Class Selection → NO BuildIntent computation
Step 4: Feats/Talents → BuildIntent.analyze() FIRST CALL
         └─ PendingData includes: species, abilities, class, but ONLY
            feats/talents that are already selected (not the current candidate)
```

**Issue**: BuildIntent computed AFTER class selection but BEFORE all class-dependent features resolve. Species-specific bonuses, class chassis biases already selected but not reflected in build analysis until this point.

---

### Pattern B: Level-Up Flow (Prestige Roadmap / Feat Suggestions)

```
Opening Prestige Roadmap:
  ├─ prestige-roadmap.js:69 → BuildIntent.analyze() [fresh compute]
  ├─ Used to calculate prestige affinities
  └─ CACHED? No - PathPreview.generatePreviews() at line 70 does ANOTHER compute
       └─ PathPreview:61 → BuildIntent.analyze() [fresh compute, REDUNDANT]

Suggestion Generation (uncoordinated):
  ├─ SuggestionEngine.suggestFeats() → BuildIntent.analyze() [IF not pre-provided]
  ├─ SuggestionEngine.suggestTalents() → BuildIntent.analyze() [IF not pre-provided]
  └─ These do NOT check coordinator cache
```

**Issue**: Prestige roadmap causes 2x BuildIntent computations in quick succession without sharing results.

---

### Pattern C: Caching Non-Adoption

```
SuggestionEngineCoordinator implements caching (lines 177-188):
  ✓ Cache hit/miss logging
  ✓ Cache invalidation method
  ✗ NO call sites use it:
    - SuggestionEngine.js:129,208 → computes directly
    - PathPreview.js:61 → computes directly
    - prestige-roadmap.js:69 → computes directly
    - chargen-feats-talents.js:72 → computes directly
```

**Issue**: Caching infrastructure exists but is unused. Suggests incomplete refactoring or misaligned architecture.

---

## PendingData Flow Analysis

### Chargen Context (pendingData is transient)

```javascript
// chargen-main.js:780-785
const pendingData = {
  selectedClass: this.characterData.classes?.[0],
  selectedSkills: Object.keys(this.characterData.skills || {}),
  selectedTalents: this.characterData.talents || [],
  selectedFeats: this.characterData.feats || []  // ONLY already-selected feats
};
```

**Critical Issue**: When rendering the "Select Feat" step, `pendingData.selectedFeats` contains ONLY feats already picked. The current feat being evaluated is NOT in pendingData - it's only evaluated in-stream by SuggestionScorer.

**Consequence**: BuildIntent computed at feat step does NOT include the current feat being scored. This is actually correct for avoiding circular dependency, but creates temporal inconsistency:
- BuildIntent reflects state BEFORE current choice
- Suggestion scoring applies current choice AFTER BuildIntent computed
- If a feat changes themes, BuildIntent doesn't know about it

---

### Level-Up Context (pendingData may be stale)

```javascript
// prestige-roadmap.js:38
this.pendingData = options.pendingData || {};
```

Prestige Roadmap accepts optional pendingData but:
1. If not provided, BuildIntent analyzes with EMPTY pendingData
2. If provided (from level-up intermediate state), may not include recent changes
3. Actor is already saved to DB, so actor state is authoritative

---

## Recalculation Analysis

### When BuildIntent is Recomputed
- **Chargen feat/talent step**: When entering feat/talent selection UI
- **Level-up prestige roadmap open**: When UI renders
- **PathPreview access**: On every prestige roadmap render (redundant with above)
- **On-demand suggestion generation**: When SuggestionEngine methods called
- **Debug panel**: When GM clicks refresh button

### When BuildIntent is NOT Recomputed (Gaps)
- ✗ Species selection → class selection
- ✗ Ability score changes
- ✗ Class changes during chargen
- ✗ Feat/talent/skill selection until feat/talent step
- ✗ During mentor survey response (biases applied AFTER BuildIntent computed)

---

## Caching Strategy Issues

### Current Caching
- **Location**: SuggestionEngineCoordinator only
- **Key**: `{actorId}:{pendingDataHash}`
- **TTL**: Session-only (static field)
- **Invalidation**: Manual via `clearBuildIntentCache(actorId)`
- **Usage**: 0% - no call sites use it

### Problems
1. **Non-adoption**: Caching implemented but not used
2. **Incomplete Key**: pendingDataHash may change without invalidation
3. **No Auto-Invalidation**: chargen progress doesn't clear cache
4. **Session-Only**: Cache lost on page reload (acceptable for now)
5. **Stale Data Risk**: pendingData can change while cached BuildIntent is used

---

## Identity Authority Issues (Related to Root Diagnosis)

BuildIntent is supposed to synthesize identity from actor state, but:

1. **Late Computation**: Chargen doesn't compute BuildIntent until feat/talent step
   - Species-specific biases applied before BuildIntent exists
   - Class chassis biases selected before BuildIntent exists
   - Survey biases added AFTER BuildIntent computed

2. **Post-Hoc Identity**: BuildIntent is computed AFTER most decisions made
   - Used only for suggestion ordering, not for decision validation
   - IdentityEngine.computeTotalBias() called INSIDE BuildIntent (line 211)
   - Identity exists as transient object, not driving force during chargen

3. **No Feedback Loop**: BuildIntent → Identity → Bias, but:
   - BuildIntent doesn't FEED character construction decisions
   - Only used for suggestion ordering
   - Player can ignore suggestions and build inconsistent character

---

## Implementation Recommendations

### Short Term (Clarify Current Behavior)
1. Document BuildIntent caching strategy: keep it or remove SuggestionEngineCoordinator cache?
2. Decide: Should PathPreview reuse PrestigeRoadmap's BuildIntent or compute fresh?
3. Decide: Should chargen pre-compute BuildIntent on species/class selection (informational only)?

### Medium Term (Consistency)
1. **Consolidate Computation**: Route all BuildIntent requests through SuggestionEngineCoordinator
   - Update all 9 call sites to use coordinator's `analyzeBuildIntent()` method
   - Replace direct `BuildIntent.analyze()` calls with `SuggestionEngineCoordinator.analyzeBuildIntent()`
   - Benefit: Unified caching, consistent timing, single invalidation point

2. **Invalidation Strategy**: Define cache invalidation triggers
   - Clear cache when: actor level changes, class added, species changed, talents changed
   - Cache should be cleared at chargen step boundaries
   - Level-up UI should clear cache on session start

3. **PendingData Normalization**: Ensure pendingData is complete at all times
   - Include actor state (level, BAB, etc.)
   - Include all pending selections (not just already-selected items)
   - Use stable key for caching

### Long Term (Identity Authority Refactor)
This audit supports the user's strategic diagnosis: BuildIntent must become authoritative DURING chargen, not post-hoc. Detailed in separate refactoring contract.

---

## Risk Assessment

### Low Risk Items (Cosmetic)
- Multiple independent recomputation sites
- Caching non-adoption (incorrect optimization, not functional bug)

### Medium Risk Items (Correctness)
- BuildIntent computed with stale pendingData (could miss current feat context)
- Chargen flow has late computation (identity decisions made before analysis)

### High Risk Items (Architectural)
- BuildIntent is post-hoc, not causal (root diagnosis confirmed)
- Identity not authoritative during character construction (enables inconsistent builds)

---

## Call Site Summary Table

| # | File | Line | Context | Timing | PendingData | Caching | Issue |
|---|------|------|---------|--------|------------|---------|-------|
| 1 | chargen-main.js | 791 | Feat/talent suggestions | Late | ✓ | ✗ | Chargen-only, late |
| 2 | chargen-feats-talents.js | 72 | Feat/talent suggestions | Late | ✓ | ✗ | Parallel code path |
| 3 | mentor-chat-dialog.js | 284 | Mentor chat | Lazy | ✗ | ✓ (per-dialog) | No data flow |
| 4 | prestige-roadmap.js | 69 | Level-up UI | On-demand | ✓ | ✗ | Recomputes at next call |
| 5 | debug-panel.js | 54 | Debug UI | On-demand | ✓ | ✗ | GM only, debug |
| 6 | SuggestionEngine.js | 129 | Feat suggestions | On-demand | ✓ | ✗ | Optional param |
| 7 | SuggestionEngine.js | 208 | Talent suggestions | On-demand | ✓ | ✗ | Optional param |
| 8 | PathPreview.js | 61 | Path generation | On-demand | ✓ | ✗ | Unused by roadmap |
| 9 | SuggestionEngineCoordinator.js | 184 | Coordination hub | On-demand | ✓ | ✓ | Unused by others |

---

## Appendix: Code References

### BuildIntent Structure (from BuildIntent.js:156-180)
```javascript
const intent = {
    themes: {},                    // { [themeName]: score }
    primaryThemes: [],             // Top 2 by confidence
    prestigeAffinities: [],        // { className, confidence, matches }
    combatStyle: null,             // 'lightsaber'|'ranged'|'melee'|'mixed'
    forceFocus: false,
    signals: { feats, talents, skills, classes },
    priorityPrereqs: [],           // Missing prerequisites for prestige
    appliedTemplate: null,
    identity: null                 // Result of IdentityEngine.computeTotalBias()
};
```

### PendingData Examples

**Chargen** (chargen-main.js:770-785):
```javascript
{
    selectedClass: this.characterData.classes?.[0],
    selectedSkills: [...trained skill keys...],
    selectedTalents: this.characterData.talents || [],
    selectedFeats: this.characterData.feats || []
}
```

**Level-Up** (prestige-roadmap.js:38):
```javascript
{
    // Empty by default, optional intermediate selections
}
```

---

**Audit Complete**
**Status**: Ready for Identity Authority Refactor planning phase
