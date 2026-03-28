# Navigation Model — Comprehensive Verification Checklist

## PHASE 1: Navigation Helpers ✅

### New Methods Implemented

- [x] `getNextActiveStepId(stepId)` — Returns next step ID or null
- [x] `getPreviousActiveStepId(stepId)` — Returns previous step ID or null
- [x] `canNavigateForward(stepId)` — Blocks only on error, allows caution
- [x] `canNavigateBackward(stepId)` — Always true (no validation blocking)
- [x] `getCurrentStepId()` — Get current step ID
- [x] `getStepIndex(stepId)` — Look up index by ID
- [x] `_repairCurrentStep()` — Robust recovery when current step removed

### Repair Logic Behavior

- [x] When current step still exists → no repair needed
- [x] When current step removed → try next step
- [x] If no next step → try previous step
- [x] If no previous step → use first active step
- [x] Logs repair events for debugging
- [x] Ensures currentStepIndex always valid

---

## PHASE 2: Downstream Invalidation ✅

### Invalidation Tracking

- [x] `_trackDownstreamInvalidation(stepId)` implemented
- [x] Maps step ID to node ID from registry
- [x] Uses `ActiveStepComputer.getInvalidatedNodes()` to get affected downstream steps
- [x] For each downstream node:
  - [x] If visited && behavior=DIRTY → adds to `invalidatedStepIds`
  - [x] If behavior=PURGE → removes from `committedSelections`
- [x] Unvisited steps remain neutral (no stale marking)

### Invalidation Behavior

- [x] Visited downstream steps become 'caution' status on next render
- [x] Unvisited downstream steps stay 'neutral'
- [x] Stale marking persists across renders (until step is revisited)
- [x] Only visited steps can become 'caution' (important rule!)

### Step Status Precedence

- [x] error > caution > complete > in_progress > neutral
- [x] Stale status triggers 'caution' (via isStale flag in _evaluateStepStatus)
- [x] Warning + visited = 'caution'
- [x] Error + visited = 'error'
- [x] Complete (visited, no choices, no errors, not stale) = 'complete'

---

## PHASE 3: Dynamic Rail Rebuilding ✅

### Active Step Recomputation

- [x] `_recomputeActiveStepsIfNeeded()` fully implemented
- [x] Rebuilds step list from fresh active node IDs
- [x] Rebuilds step plugins for new/changed steps
- [x] Calls `_repairCurrentStep()` if needed
- [x] Logs added/removed steps

### Rail Consistency

- [x] Rail renders from `this.steps` (filtered active list only)
- [x] `stepProgress` computed from `this.steps` only
- [x] Chevron count should be `activeSteps.length - 1`
- [x] No ghost DOM elements (all steps in array are active)
- [x] Template uses `stepProgress` for rendering

### Status Reflection in Rail

- [x] CSS classes applied: `prog-step--error`, `--caution`, `--complete`, `--in-progress`, `--neutral`
- [x] Icons: ✔ (complete), ⚠ (error), ! (caution)
- [x] `data-step-status` attribute for precise targeting

---

## PHASE 4: Current Step Recovery ✅

### Repair Scenarios

- [x] Step becomes non-applicable (mid-session lock)
  - [x] Repair function called
  - [x] Move to next active step
  - [x] If none → previous active step
  - [x] If none → first active step

- [x] Step becomes applicable (mid-session unlock)
  - [x] Inserted in canonical order
  - [x] Repair not needed (current step still valid)
  - [x] Player can navigate to new step naturally

- [x] Restore from saved session
  - [x] `_recomputeActiveStepsIfNeeded()` rebuilds from scratch
  - [x] Current step repaired if session was stale
  - [x] No reliance on saved indices

---

## Navigation Flow Verification

### Forward Navigation

- [x] Check `canNavigateForward(currentStepId)` before next
- [x] Blocks only on error-level issues
- [x] Allows caution/warnings to pass
- [x] Calls `getNextActiveStepId()` to find next step
- [x] Calls `onStepExit()` on current step
- [x] Calls `onStepEnter()` on next step
- [x] Marks next step as visited

### Backward Navigation

- [x] Check `canNavigateBackward(currentStepId)`
- [x] Always allowed (returns true unless at start)
- [x] Calls `getPreviousActiveStepId()` to find previous
- [x] Calls `onStepExit()` on current step
- [x] Calls `onStepEnter()` on previous step
- [x] Visited state persists (step not re-marked as unvisited)

### Rail Click Navigation

- [x] Only allows clicking visited previous steps
- [x] Uses step ID from click target
- [x] Routes through `navigateToStep()` which enforces backward-only
- [x] Current step always clickable

---

## Visited State Enforcement

### When a Step Becomes Visited

- [x] Player navigates via Next → `onStepEnter()` called → add to `visitedStepIds`
- [x] Player navigates via Back → `onStepEnter()` called → step already in list
- [x] Player clicks rail chip → `onStepEnter()` called → step already in list
- [x] First step initialization → `onStepEnter()` called → add to `visitedStepIds`

### Visited State Persistence

- [x] Back-navigation does NOT unmark as visited
- [x] Visited steps can become stale but stay visited
- [x] Only unvisited unrelated steps can be affected by upstream changes

### Status Computation Rules

- [x] Cannot be 'complete' unless visited === true
- [x] Cannot be 'caution' unless visited === true
- [x] Cannot be 'error' unless visited === true
- [x] Can be 'in_progress' only if visited === true
- [x] Can be 'neutral' only if visited === false

---

## Downstream Invalidation Behavior

### When Upstream Changes

1. Player commits selection in species step
2. `commitSelection()` called
3. `_trackDownstreamInvalidation()` checks registry
4. For each downstream node (background, class, skills, feats, talents, etc.):
   - [x] If node has been visited → mark as stale
   - [x] If node is unvisited → leave neutral
   - [x] If invalidation behavior = PURGE → remove selection

### Result on Render

- [x] Visited stale step shows 'caution' status (yellow !)
- [x] Unvisited unchanged steps stay 'neutral'
- [x] Player sees which steps were affected by upstream change
- [x] Player can revisit caution steps to validate

### Example Scenario

Before:
```
Species:       complete (green ✔)
Attributes:    complete (green ✔)
Class:         complete (green ✔)
Background:    complete (green ✔)
Skills:        complete (green ✔)
```

Player goes back, changes Species to something with different class restrictions.

After:
```
Species:       complete (green ✔)   [just changed]
Attributes:    caution (yellow !)   [visited, but upstream affected]
Class:         caution (yellow !)   [visited, but now may be invalid]
Background:    caution (yellow !)   [visited, but prerequisites changed]
Skills:        caution (yellow !)   [visited, but class restriction changed]
```

---

## Acceptance Criteria

### Navigation ✅

- [x] Navigation uses active step list only
- [x] Hidden steps are never traversable
- [x] No step appears complete before being visited
- [x] Forward navigation blocks only on errors
- [x] Backward navigation always allowed
- [x] Current step always valid after recomputation

### Rail ✅

- [x] Renders only active steps
- [x] No ghost DOM elements
- [x] Chevron count matches active steps
- [x] Status classes reflect canonical state

### Mid-Session Changes ✅

- [x] New step unlocked → inserted in canonical order
- [x] New step is unvisited → neutral status
- [x] Upstream change → downstream visited steps → caution
- [x] Current step removed → auto-repair to next/previous
- [x] Rail rebuilds cleanly without stale elements

### Status ✅

- [x] Visited requirement enforced
- [x] No false completions before visiting
- [x] Upstream changes reflected as caution
- [x] Errors block navigation and show red
- [x] Warnings allow progress but show yellow

### Restore ✅

- [x] Rebuild from scratch, not stale indices
- [x] Current step repaired if session invalid
- [x] Visited state persists across restore
- [x] Invalidation state recomputed fresh

---

## Known Limitations & Future Work

- [ ] **Phase 3**: Summary as diagnostic hub (step-status matrix, back-links)
  - [ ] Show all step statuses on summary page
  - [ ] Provide navigation back to caution/error steps
  - [ ] Display what changed due to upstream edits

- [ ] **Chevron color-coding** (optional visual enhancement)
  - [ ] Color chevrons by step status
  - [ ] Reflect upstream status in chevron chain

- [ ] **Newly-unlocked step indicator** (optional UX)
  - [ ] Highlight newly-unlocked steps
  - [ ] Show "new" badge on step chip

---

## Test Matrix

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Player at intro → click Next | Move to species | ✅ |
| Player at last step → click Next | Proceed to confirmation | ✅ |
| Player at species → click Back | Move to intro | ✅ |
| Player at intro → click Back | No movement (blocked) | ✅ |
| Player changes species → all downstream visited | Mark as caution | ✅ |
| Player changes species → all downstream unvisited | Remain neutral | ✅ |
| Player completes step → revisit → status same | Persist completion | ✅ |
| New step unlocks mid-session | Insert in canonical order | ✅ |
| New step unlocked → not visited | Show neutral | ✅ |
| Current step removed from active → auto-move next | Repair triggered | ✅ |
| Rail shrinks mid-session → current removed → move up | Repair to previous | ✅ |
| Restore from saved session → old rail structure → recompute | Rebuild fresh | ✅ |

---

## Summary

✅ **Phase 1 (Navigation Helpers)**: Implemented ID-based navigation methods, repair logic
✅ **Phase 2 (Downstream Invalidation)**: Track and mark visited steps as caution when upstream changes
✅ **Phase 3 (Rail Rebuilding)**: Fully rebuild step list on active-step changes
✅ **Phase 4 (Current Step Recovery)**: Robust repair when current step becomes invalid

**Result**: Robust, predictable navigation model that responds to player choices and upstream changes, with strong visited-state enforcement and no false completions.
