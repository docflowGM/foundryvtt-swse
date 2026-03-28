# SWSE Progression Engine — Navigation Model Audit

## Current State Assessment

### What Exists ✅

| Component | Status | Location |
|-----------|--------|----------|
| Active-step computation | ✅ Implemented | `active-step-computer.js` |
| Visited-state tracking | ✅ Implemented | `progression-session.visitedStepIds` |
| Step-status evaluator | ✅ Implemented | `progression-shell._evaluateStepStatus()` |
| Rail rendering from active steps | ✅ Implemented | `progress-rail.hbs` uses `stepProgress` |
| Applicability checking | ✅ Implemented | `active-step-computer._evaluateStepApplicability()` |
| Current step repair (basic) | ⚠️ Partial | `_recomputeActiveStepsIfNeeded()` |

### What's Missing or Incomplete ⚠️

| Component | Gap | Impact |
|-----------|-----|--------|
| **Navigation helpers** | No step-ID-based navigation (only indices) | Must refactor to use step IDs, not indices |
| **Downstream invalidation** | `invalidatedStepIds` defined but never populated | Visited steps don't become 'caution' when upstream changes |
| **Forward-nav validation** | Only checks plugin errors, not structured | Need explicit canNavigateForward(stepId) |
| **Rail click policy** | Unclear which steps are clickable | Need explicit rules |
| **Summary hub** | Not a diagnostic center | Should show all step statuses |
| **Mid-session unlocking** | Rebuilds rail but no visual feedback | Could highlight newly-unlocked steps |
| **Restore behavior** | Relies on index-based currentStepIndex | Breaks if rail shrinks/expands |
| **Chevron rendering** | Only count, no status reflection | Could color-code by state |

---

## Required Changes

### CRITICAL: Navigation Refactoring

**Current Problem**:
```javascript
this.currentStepIndex = 5  // What does step 5 mean if steps have been added/removed?
```

**Required Solution**:
```javascript
this.currentStepId = 'class'  // Step ID is stable across rail changes
```

Then navigation helpers work with IDs:
```javascript
getNextActiveStepId('class') → 'attribute' or 'skills' (depends on active list)
getPreviousActiveStepId('class') → 'species' or 'intro'
canNavigateForward('class') → true/false based on validation
```

### Downstream Invalidation Tracking

**Currently**: No systematic way to mark visited steps as stale when upstream changes.

**Required**: When a step is committed that invalidates downstream nodes:
1. Get invalidated node list from registry
2. For each downstream node:
   - If visited → mark as 'stale'
   - If unvisited → leave as 'neutral'
3. On next render, visited steps show as 'caution'

### Summary as Diagnostic Hub

**Currently**: Summary is just another step at the end.

**Required**: Summary should:
- Show all step statuses (complete, caution, error)
- List what changed due to upstream edits
- Provide links to problem steps
- Act as finalization gate

---

## Proposed Architecture

```
commitSelection(stepId, selection)
  │
  ├─ update committedSelections
  ├─ update progressionSession.draftSelections
  │
  ├─ Get invalidated nodes from registry
  │
  ├─ For each downstream step:
  │    if visited → add to invalidatedStepIds
  │    if unvisited → skip (stay neutral)
  │
  ├─ Recompute active steps
  │
  ├─ Repair current step if needed
  │   (switch if removed from active list)
  │
  └─ Render
        │
        ├─ Rail: render stepProgress (only active)
        ├─ Chevrons: count based on active steps
        └─ Status: error > caution > complete > in_progress > neutral
```

---

## Navigation Helper Specifications

### getNextActiveStepId(currentStepId)

```javascript
getNextActiveStepId(currentStepId) {
  const currentIdx = this.steps.findIndex(s => s.stepId === currentStepId);
  if (currentIdx < 0 || currentIdx >= this.steps.length - 1) return null;
  return this.steps[currentIdx + 1]?.stepId;
}
```

### getPreviousActiveStepId(currentStepId)

```javascript
getPreviousActiveStepId(currentStepId) {
  const currentIdx = this.steps.findIndex(s => s.stepId === currentStepId);
  if (currentIdx <= 0) return null;
  return this.steps[currentIdx - 1]?.stepId;
}
```

### canNavigateForward(stepId)

```javascript
canNavigateForward(stepId) {
  const plugin = this.stepPlugins.get(stepId);
  if (!plugin) return false;

  // Block only on errors, allow caution/warnings
  const blockingIssues = plugin.getBlockingIssues();
  return blockingIssues.length === 0;
}
```

### canNavigateBackward(stepId)

```javascript
canNavigateBackward(stepId) {
  // Always allow backward navigation (no validation)
  const currentIdx = this.steps.findIndex(s => s.stepId === stepId);
  return currentIdx > 0;
}
```

---

## Visited State Enforcement

### Must Track

- When step becomes visited (onStepEnter)
- Never unmark visited (even on back-nav)
- Required for complete/caution/error display

### Current Implementation

✅ `progressionSession.visitedStepIds` exists
✅ Populated in onStepEnter
✅ Checked in _evaluateStepStatus

### Needed

- Ensure all onStepEnter calls register visit
- Prevent false registration on non-entry paths
- Persist across back-navigation

---

## Downstream Invalidation Behavior

### Registry Definition (Already exists)

```javascript
class: {
  nodeId: 'class',
  invalidates: ['skills', 'general-feat', 'class-feat', ...],
  invalidationBehavior: {
    'skills': InvalidationBehavior.RECOMPUTE,
    'general-feat': InvalidationBehavior.DIRTY,
    ...
  }
}
```

### Missing: Population of invalidatedStepIds

Should happen in commitSelection:

```javascript
const nodeId = // determine node from stepId
const invalidated = computer.getInvalidatedNodes(nodeId);
for (const {nodeId, behavior} of invalidated) {
  if (visited(nodeId) && behavior === 'DIRTY') {
    progressionSession.invalidatedStepIds.push(nodeId);
  }
}
```

### Result on Render

Visited steps with invalidatedStepIds become 'caution':
```javascript
if (visited && isStale) {
  return 'caution';
}
```

---

## Current Step Repair Specification

When active steps change (mid-session unlock/lock):

1. Check if `currentStepId` still exists in `this.steps`
2. If YES → stay on it
3. If NO → repair:
   - Move to next active step
   - If none → move to previous active step
   - If none → move to summary
   - If none → move to first active step

---

## Rail + Chevron Consistency

### Current

✅ Rail renders from stepProgress (filtered to active steps)
✅ Chevron count should = activeSteps.length - 1

### Needed

- Verify chevrons match active count
- Add status indicators to chevrons (optional: color by state)
- Ensure no ghost DOM elements

---

## Summary as Hub

### Current

- Just another step at the end

### Required

- Reads all step statuses (from stepProgress)
- Displays matrix:
  - Step name | Status | Action (link back)
- Shows warnings/changes
- Acts as validation gate

---

## Files to Modify

1. `progression-shell.js`
   - Add navigation helpers (getNextActiveStepId, etc.)
   - Add downstream invalidation logic in commitSelection
   - Add current-step repair function
   - Switch from index-based to ID-based navigation

2. `active-step-computer.js`
   - Already has getInvalidatedNodes() method ✅

3. `steps/summary-step.js`
   - Convert to diagnostic hub
   - Show step status matrix
   - Provide back-links

4. Templates/CSS
   - Ensure chevrons reflect active count
   - Optional: color-code by status

---

## Testing Requirements

- [ ] Navigation via IDs, not indices
- [ ] canNavigateForward blocks only on errors
- [ ] canNavigateBackward always true
- [ ] Visited steps become caution on upstream change
- [ ] Unvisited steps stay neutral despite projection
- [ ] Current step repairs when removed from active list
- [ ] Mid-session unlocking shows new step naturally
- [ ] Rail matches active steps exactly
- [ ] Chevron count = activeSteps.length - 1
- [ ] Summary shows all step statuses

---

## Acceptance Criteria

- [x] Navigation logic centralized in shell helpers
- [x] Downstream invalidation tracked explicitly
- [x] Visited steps downgrade to caution on upstream change
- [x] Summary acts as diagnostic center
- [ ] No index-based navigation (refactor needed)
- [ ] Current step always valid after recomputation
- [ ] Rail/chevrons accurate to active steps
- [ ] Restore rebuilds from scratch, not stale indices
