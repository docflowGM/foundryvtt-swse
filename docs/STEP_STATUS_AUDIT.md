# SWSE Progression Engine — Step Status Model Audit & Implementation

## Executive Summary

**Problem**: Steps were being marked as "completed" before players reached them, causing false positive completion indicators and confusing UI state.

**Root Cause**: Completion status was derived solely from `committedSelections.has(stepId)`, with no tracking of whether the step was actually visited or whether completion requirements were met.

**Solution**: Implemented canonical step-status evaluator with explicit visited-state tracking and proper completion criteria.

---

## Previous Incorrect Behavior

### What Was Broken

| Symptom | Cause |
|---------|-------|
| Future unvisited steps showed as "complete" | Only checked if `committedSelections.has(stepId)` |
| No distinction between "reached but incomplete" and "not reached yet" | No visited-state tracking |
| Steps with projected/default data falsely completed | Data presence alone triggered "complete" |
| Upstream changes didn't downgrade completed steps to "review needed" | No staleness tracking |
| No validation errors reflected in step status | Validation state ignored |
| Warning/caution states couldn't be displayed | No warning tracking |

### Example Scenario (Before)

1. Species step is completed (visited, selection made) ✅
2. Class step gets projected class data from species choice
3. commitSelection() fires for species
4. Class step now has `committedSelections.has('class')` = true
5. **Class step renders as "complete"** even though player never visited it ❌

---

## Canonical Step-Status Model

### Five Logical States (in precedence order)

**Error > Caution > Complete > In Progress > Neutral**

```
error ────────────────────────────────────────────────────────────
├─ Visited AND has blocking validation errors
├─ OR has blocking issues from plugin.getBlockingIssues()
└─ Styling: Red, warning icon, blocked indicator

caution ──────────────────────────────────────────────────────────
├─ Visited AND (has warnings OR is stale due to upstream changes)
├─ Validation warnings exist
├─ OR step was previously completed but upstream choice invalidated assumptions
└─ Styling: Yellow, exclamation icon, "review needed" indicator

complete ────────────────────────────────────────────────────────
├─ Visited AND
├─ Has committed selection AND
├─ NO remaining required choices AND
├─ NO blocking errors AND
├─ NOT stale
└─ Styling: Green, checkmark, clear indicator

in_progress ─────────────────────────────────────────────────────
├─ Visited AND
├─ Still has remaining required choices
├─ AND no blocking errors
└─ Styling: Blue, active/highlighted

neutral ─────────────────────────────────────────────────────────
├─ Visible AND
├─ NOT yet visited
├─ (May have projected data, but player hasn't reached step)
└─ Styling: Gray, unmarked
```

### State Evaluation Logic

```javascript
if (visible && visited && errors.length > 0) {
  return 'error';
}

if (visible && visited && (warnings.length > 0 || isStale)) {
  return 'caution';
}

if (visible && visited && selection && !remainingChoices && !errors) {
  return 'complete';
}

if (visible && visited && remainingChoices.length > 0 && !errors) {
  return 'in_progress';
}

if (visible && !visited) {
  return 'neutral';
}
```

### Key Rule

**A step can NEVER show as complete/caution/error unless `visited === true`**

This prevents the scenario where unvisited future steps appear completed due to data presence.

---

## Implementation Details

### 1. Visited-State Tracking

**File**: `progression-session.js`

Added to ProgressionSession:
```javascript
this.visitedStepIds = [];  // Steps player has entered
```

Updated when step is entered (in `_initializeSteps`, `_onNextStep`, `_onPreviousStep`):
```javascript
if (!this.progressionSession.visitedStepIds.includes(stepId)) {
  this.progressionSession.visitedStepIds.push(stepId);
}
```

**What counts as "visited"**:
- Step plugin's `onStepEnter()` is called
- Player has seen the step UI and step data rendered
- Back-navigation to a step counts as re-visit (doesn't clear visited state)

### 2. Canonical Status Evaluator

**File**: `progression-shell.js`

New method `_evaluateStepStatus(stepId, stepIndex)`:

```javascript
_evaluateStepStatus(stepId, stepIndex) {
  // Check: visible, visited
  // Get: validation errors, warnings, remaining choices, staleness
  // Evaluate: error > caution > complete > in_progress > neutral
  // Return: {canonical, errors[], warnings[], remainingChoices[], isStale, ...}
}
```

Calls to step plugin methods:
- `plugin.validate()` — validation errors/warnings
- `plugin.getBlockingIssues()` — hard blocks
- `plugin.getWarnings()` — soft warnings
- `plugin.getRemainingPicks()` — required choices remaining

### 3. Step Progress Computation

**File**: `progression-shell.js`, `_prepareContext()`

Changed from:
```javascript
isComplete: this.committedSelections.has(descriptor.stepId),
```

To:
```javascript
const status = this._evaluateStepStatus(descriptor.stepId, idx);
return {
  status: status.canonical,
  isComplete: status.canonical === 'complete',
  isError: status.canonical === 'error',
  isCaution: status.canonical === 'caution',
  isInProgress: status.canonical === 'in_progress',
  isNeutral: status.canonical === 'neutral',
  isVisited: status.isVisited,
  errors: status.errors || [],
  warnings: status.warnings || [],
  remainingChoices: status.remainingChoices || [],
};
```

### 4. Template Updates

**File**: `progress-rail.hbs`

Added CSS classes:
- `prog-step--error` (red)
- `prog-step--caution` (yellow)
- `prog-step--in-progress` (blue)
- `prog-step--neutral` (gray/default)
- `prog-step--complete` (green)

Added `data-step-status` attribute for precise state targeting.

Added status icons:
- ✔ for complete
- ⚠ for error
- ! for caution

---

## Behavior Examples

### Example 1: Normal Flow (Before Fixes)

**Before**:
1. Player at Species step ➜ Select human species ➜ Commit
2. Game projects class data (default Fighter)
3. Class step now shows `committedSelections.has('class')` = true
4. **Class step renders as COMPLETE** ❌ (never visited!)
5. Player clicks Next, confused why class is marked done

**After**:
1. Player at Species step ➜ Select human species ➜ Commit
2. Game projects class data internally
3. Class step:
   - `visitedStepIds.includes('class')` = false
   - Status = 'neutral' ✅
   - Renders as gray/unmarked (not visited yet)
4. Player clicks Next, Class step is treated as fresh/unstarted

### Example 2: Upstream Invalidation (After Fixes)

**Scenario**: Player is at Skills step (completed). Decides to go back and change Class (which affects skill list).

1. Player back-navs to Class, marks as visited again
2. Selects Scoundrel (different class, different skills)
3. commitSelection() triggers for class
4. Skills step becomes invalidated (`invalidatedStepIds` updated)
5. _recomputeActiveStepsIfNeeded() runs
6. _evaluateStepStatus('skills', ...) checks:
   - `isStale = invalidatedStepIds.includes('skills')` = true
   - `visited = true` ✅
   - `errors = []` (skill list still valid, just different)
   - `warnings = ['Skill list changed; review your selections']`
7. Skills step status = 'caution' ➜ renders yellow with ! icon
8. Player knows: "Something upstream changed; review this step"

### Example 3: Mid-Progression Unlocking

**Scenario**: Languages becomes relevant mid-progression.

1. Player completes Attributes, Class, Background
2. Background includes language grant
3. _recomputeActiveStepsIfNeeded() runs
4. languages step becomes applicable (was hidden before)
5. languages step is inserted in canonical order
6. New step has:
   - `visited = false`
   - `visitedStepIds.includes('languages')` = false
   - Status = 'neutral'
   - Renders as gray (fresh, unstarted)
7. Next step takes player to languages
8. onStepEnter called, step added to visitedStepIds
9. Player can now interact with languages step

---

## Step Status Precedence & Decision Tree

```
Is step visible?
  NO  ➜ absent (no rendering, no status)
  YES ➜ Continue

Is step visited?
  NO  ➜ neutral (gray, unmarked)
  YES ➜ Continue

Does step have blocking errors?
  YES ➜ error (red, ⚠, blocked)
  NO  ➜ Continue

Does step have warnings OR is it stale?
  YES ➜ caution (yellow, !, "review needed")
  NO  ➜ Continue

Does step have committed selection?
  NO  ➜ in_progress (blue, incomplete)
  YES ➜ Continue

Does step have remaining required choices?
  YES ➜ in_progress (blue, incomplete)
  NO  ➜ complete (green, ✔)
```

---

## CSS Class Mapping

| State | CSS Class | Color | Icon | Interaction |
|-------|-----------|-------|------|-------------|
| neutral | `prog-step--neutral` | Gray | (none) | Can navigate to if previous complete |
| in_progress | `prog-step--in-progress` | Blue | (none) | Can navigate to, active |
| complete | `prog-step--complete` | Green | ✔ | Can navigate back to |
| caution | `prog-step--caution` | Yellow | ! | Can navigate to; shows warnings |
| error | `prog-step--error` | Red | ⚠ | Blocked; cannot finalize |
| current | `prog-step--active` | (overlay) | (none) | Current step (layers on top) |

---

## Architectural Rules Enforced

✅ **Visited-state is mandatory for completion**
- A step cannot be marked complete/error/caution if not visited

✅ **Status is derived from authoritative source**
- Computed fresh from `_evaluateStepStatus()` on each render
- Not cached or stored (re-evaluated each _prepareContext)

✅ **No CSS-only visibility magic**
- Status classes are applied based on canonical state
- Not inferred from DOM position or index

✅ **Upstream changes affect downstream status**
- Invalidated steps marked as 'caution'
- Previously-complete steps can become 'in_progress' if requirements change

✅ **Summary/final step remains stable**
- Summary is the terminal step
- Always reachable as long as errors don't exist

---

## Verification Checklist

- [x] No step renders as complete before being visited
- [x] No future unvisited steps show error/caution/complete styling
- [x] Visited state persists across back-navigation
- [x] Upstream changes downgrade previously-complete steps to caution
- [x] Validation errors prevent finalization
- [x] Validation warnings display as caution
- [x] Neutral state applies only to visible, unvisited steps
- [x] Current step can have underlying status (e.g., "current + in_progress")
- [x] Hidden/inactive steps have no rendered status
- [x] Rail and chevrons derived from canonical status only

---

## Deliverables

✅ **Code changes**:
- `progression-session.js` — Added visitedStepIds tracking
- `progression-shell.js` — New _evaluateStepStatus() method, updated status computation
- `progress-rail.hbs` — Updated template with canonical status CSS classes

✅ **This audit document** — Complete model specification and examples

---

## Future Enhancements

- [ ] Display remaining choice counts in UI ("2 of 3 feats selected")
- [ ] Show error/warning details in tooltip on caution/error steps
- [ ] Persist visited-state across sessions for resume
- [ ] Add animation when step status changes (e.g., complete → caution)
- [ ] Color-code chevrons to reflect upstream step status
