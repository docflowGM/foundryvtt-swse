# Comprehensive Instrumentation Report — All Chargen Steps

## Overview

Expanded instrumentation now covers the **render queue fix verification across ALL chargen steps**, not just Species. This report documents all instrumentation points added to prove the render queue is:

1. Being requested by all steps
2. Being queued when render is active
3. Being flushed after the active render completes
4. Resulting in successful detail hydration across all chargen workflows

---

## Instrumentation Strategy

### Level 1: Shell-Wide (All Steps Auto-Covered)
**File:** `scripts/apps/progression-framework/shell/progression-shell.js`

The render() method now logs for ANY step that calls shell.render():
- render() call entry state
- When render is queued vs. executed
- When active render completes
- When queued rerender is flushed

### Level 2: Common Hooks (All Steps Auto-Covered)
**File:** `scripts/apps/progression-framework/steps/step-plugin-base.js`

These base class hooks are inherited by all step plugins:
- `onItemFocused()` — logs every item focus across any step
- `renderDetailsPanel()` — logs detail panel hydration entry for any step
- `afterRender()` — logs render completion for any step

### Level 3: Per-Step Instrumentation (Key Steps)
**Files:**
- `scripts/apps/progression-framework/steps/species-step.js`
- `scripts/apps/progression-framework/steps/class-step.js`
- `scripts/apps/progression-framework/steps/background-step.js`

These three major chargen flows add detailed logs around:
- When item is selected
- When mentor rail speak() completes
- When rerender is requested

---

## Detailed Instrumentation Points

### A. Shell-Level (progression-shell.js)

**4 instrumentation points in render() method:**

1. **Line 427** — When render is queued:
   ```
   [SWSE Render Queue Debug] Queuing rerender | focusedItem: {id} | _pendingRender before: {bool}
   ```

2. **Line 435** — On render() entry:
   ```
   [SWSE Render Queue Debug] render() called | isRendering: {bool} | pendingRender: {bool} | focusedItem: {id} | step: {id}
   ```

3. **Line 441** — After render completes:
   ```
   [SWSE Render Queue Debug] Render complete | willFlushPending: {bool}
   ```

4. **Line 451** — When queued rerender is flushed:
   ```
   [SWSE Render Queue Debug] Flushing queued rerender | focusedItem: {id}
   ```

**Error handling (Line 443):**
   ```
   [SWSE Render Queue Debug] Render threw error before cleanup: {error}
   ```

### B. Common Hooks (step-plugin-base.js)

**3 instrumentation points inherited by all step plugins:**

1. **Line 111** — onItemFocused() entry:
   ```
   [SWSE Chargen Hydration Debug] onItemFocused hook entry | step: {id} | itemId: {id}
   ```

2. **Line 225** — renderDetailsPanel() entry:
   ```
   [SWSE Chargen Hydration Debug] renderDetailsPanel hook entry | step: {id} | focusedItem: {id}
   ```

3. **Line 326** — afterRender() completion:
   ```
   [SWSE Chargen Hydration Debug] afterRender hook completed | step: {id} | focusedItem: {id}
   ```

### C. Per-Step: Species Step (species-step.js)

**2 instrumentation points in onItemFocused():**

1. **Line 576** — Before rerender request:
   ```
   [SWSE Species Hydration Debug] [Click #N] Requesting rerender for species hydration | selected: {name} ({id}) | focusedItem: {id}
   ```

2. **Line 578** — After rerender request:
   ```
   [SWSE Species Hydration Debug] [Click #N] Rerender requested | focusedItem: {id}
   ```

3. **Line 315** — In renderDetailsPanel():
   ```
   [SWSE Species Hydration Debug] renderDetailsPanel() entry | focusedItem: {id} ({name})
   ```

### D. Per-Step: Class Step (class-step.js)

**2 instrumentation points in onItemFocused():**

1. **Line 190** — Before mentor rail speak:
   ```
   [SWSE Chargen Hydration Debug] [ClassStep] Requesting rerender for class selection | selected: {name} ({id}) | focusedItem before: {id}
   ```

2. **Line 197** — Before rerender request:
   ```
   [SWSE Chargen Hydration Debug] [ClassStep] Calling shell.render() | focusedItem: {id}
   ```

### E. Per-Step: Background Step (background-step.js)

**2 instrumentation points in onItemFocused():**

1. **Line 204** — Before mentor rail speak:
   ```
   [SWSE Chargen Hydration Debug] [BackgroundStep] Requesting rerender for background selection | selected: {name} ({id})
   ```

2. **Line 213** — Before rerender request:
   ```
   [SWSE Chargen Hydration Debug] [BackgroundStep] Calling shell.render() | focusedBackgroundId: {id}
   ```

---

## Steps Covered by Common Hooks

The following chargen steps automatically inherit the common hook instrumentation from step-plugin-base.js and will emit logs whenever users interact with them:

**Attribute/Ability Steps:**
- attribute-step.js
- language-step.js
- skill-step.js (implied)

**Selection Steps:**
- class-step.js
- background-step.js
- species-step.js
- talent-step.js
- feat-step.js
- force-power-step.js
- force-secret-step.js
- force-technique-step.js

**Builder/Flow Steps:**
- intro-step.js
- name-step.js
- droid-builder-step.js
- final-droid-configuration-step.js
- summary-step.js
- confirm-step.js

**Follower Steps:**
- follower-species-step.js (and other follower-steps)

---

## Expected Log Sequence for Normal Chargen Interaction

### Scenario 1: Species Selection

**User Action:** Click on a species card (e.g., Cathar)

```
[SWSE Chargen Hydration Debug] onItemFocused hook entry | step: species | itemId: cathar-kotor
[SWSE Species Hydration Debug] [Click #1] Requesting rerender for species hydration | selected: Cathar (cathar-kotor) | focusedItem: cathar-kotor
[SWSE Render Queue Debug] render() called | isRendering: true | pendingRender: false | focusedItem: cathar-kotor | step: species
[SWSE Render Queue Debug] Queuing rerender | focusedItem: cathar-kotor | _pendingRender before: false
[SWSE Species Hydration Debug] [Click #1] Rerender requested | focusedItem: cathar-kotor
[ProgressionShell] RENDER START (#N)
[ProgressionShell] RENDER COMPLETE (#N)
[SWSE Render Queue Debug] Render complete | willFlushPending: true
[ProgressionShell] EXECUTE QUEUED RERENDER (#N+1)
[SWSE Render Queue Debug] Flushing queued rerender | focusedItem: cathar-kotor
[SWSE Render Queue Debug] render() called | isRendering: false | pendingRender: false | focusedItem: cathar-kotor | step: species
[ProgressionShell] RENDER START (#N+1)
[SWSE Species Hydration Debug] renderDetailsPanel() entry | focusedItem: cathar-kotor (Cathar)
[SWSE Chargen Hydration Debug] renderDetailsPanel hook entry | step: species | focusedItem: cathar-kotor
[ProgressionShell] RENDER COMPLETE (#N+1)
[SWSE Chargen Hydration Debug] afterRender hook completed | step: species | focusedItem: cathar-kotor
```

### Scenario 2: Class Selection

**User Action:** Click on a class card (e.g., Soldier)

```
[SWSE Chargen Hydration Debug] onItemFocused hook entry | step: class | itemId: soldier
[SWSE Chargen Hydration Debug] [ClassStep] Requesting rerender for class selection | selected: Soldier (soldier) | focusedItem before: (null)
[SWSE Render Queue Debug] render() called | isRendering: true | pendingRender: false | focusedItem: soldier | step: class
[SWSE Render Queue Debug] Queuing rerender | focusedItem: soldier | _pendingRender before: false
[SWSE Chargen Hydration Debug] [ClassStep] Calling shell.render() | focusedItem: soldier
[ProgressionShell] RENDER START (#N)
[ProgressionShell] RENDER COMPLETE (#N)
[SWSE Render Queue Debug] Render complete | willFlushPending: true
[ProgressionShell] EXECUTE QUEUED RERENDER (#N+1)
[SWSE Render Queue Debug] Flushing queued rerender | focusedItem: soldier
[SWSE Render Queue Debug] render() called | isRendering: false | pendingRender: false | focusedItem: soldier | step: class
[ProgressionShell] RENDER START (#N+1)
[SWSE Chargen Hydration Debug] renderDetailsPanel hook entry | step: class | focusedItem: soldier
[ProgressionShell] RENDER COMPLETE (#N+1)
[SWSE Chargen Hydration Debug] afterRender hook completed | step: class | focusedItem: soldier
```

### Scenario 3: Background Selection

**User Action:** Click on a background card (e.g., Soldier)

```
[SWSE Chargen Hydration Debug] onItemFocused hook entry | step: background | itemId: soldier
[SWSE Chargen Hydration Debug] [BackgroundStep] Requesting rerender for background selection | selected: Soldier (soldier)
[SWSE Render Queue Debug] render() called | isRendering: true | pendingRender: false | focusedItem: (null) | step: background
[SWSE Render Queue Debug] Queuing rerender | focusedItem: (null) | _pendingRender before: false
[SWSE Chargen Hydration Debug] [BackgroundStep] Calling shell.render() | focusedBackgroundId: soldier
[ProgressionShell] RENDER START (#N)
[ProgressionShell] RENDER COMPLETE (#N)
[SWSE Render Queue Debug] Render complete | willFlushPending: true
[ProgressionShell] EXECUTE QUEUED RERENDER (#N+1)
[SWSE Render Queue Debug] Flushing queued rerender | focusedItem: (null)
[SWSE Render Queue Debug] render() called | isRendering: false | pendingRender: false | focusedItem: (null) | step: background
[ProgressionShell] RENDER START (#N+1)
[SWSE Chargen Hydration Debug] renderDetailsPanel hook entry | step: background | focusedItem: (null)
[ProgressionShell] RENDER COMPLETE (#N+1)
[SWSE Chargen Hydration Debug] afterRender hook completed | step: background | focusedItem: (null)
```

---

## Verification Checklist

✅ **Shell-Level Proof:**
- [ ] Render queue logic working for ANY step that calls shell.render()
- [ ] Logs show "QUEUEING" when render is active
- [ ] Logs show "EXECUTE QUEUED RERENDER" after active render completes
- [ ] No "BLOCKED" messages as terminal outcome

✅ **Common Hook Proof:**
- [ ] Every step with detail panels shows onItemFocused logs
- [ ] Every detail panel render shows renderDetailsPanel hook logs
- [ ] Every render completion shows afterRender hook logs

✅ **Per-Step Proof (Sample 3 Steps):**
- [ ] Species: Click species → logs show rerender request → detail rail hydrates
- [ ] Class: Click class → logs show rerender request → detail rail hydrates
- [ ] Background: Click background → logs show rerender request → detail rail hydrates

✅ **Cross-Step Consistency:**
- [ ] All three steps follow the same queueing pattern
- [ ] All three steps reach detail hydration after requeue
- [ ] No render loops or blocking in any step

---

## Console Filtering Guide

### View only render queue logs:
```
Filter: [SWSE Render Queue Debug]
```

### View only hydration logs:
```
Filter: [SWSE Chargen Hydration Debug]
```

### View all chargen instrumentation:
```
Filter: SWSE Chargen Hydration Debug|SWSE Render Queue Debug|SWSE Species Hydration Debug
```

### View specific step:
```
Filter: [ClassStep]|[BackgroundStep]|[SpeciesStep]
```

---

## Cleanup Instructions

After verification is complete, remove ALL instrumentation by searching for and deleting:

**In progression-shell.js:**
- 5 `[SWSE Render Queue Debug]` logs
- 1 error logging

**In step-plugin-base.js:**
- 3 `[SWSE Chargen Hydration Debug]` logs

**In species-step.js:**
- 2 `[SWSE Species Hydration Debug]` logs
- 1 `[SWSE Chargen Hydration Debug]` log (in renderDetailsPanel)

**In class-step.js:**
- 2 `[SWSE Chargen Hydration Debug]` logs

**In background-step.js:**
- 2 `[SWSE Chargen Hydration Debug]` logs

**Total logs to remove:** 16 debug statements

---

## Summary

**Files Instrumented:** 5
**Total Instrumentation Points:** 16
**Coverage:** All chargen steps via common hooks + detailed per-step examples
**Business Logic Changes:** None
**Temporary Nature:** Yes — all use console.debug() for easy identification
**Performance Impact:** Negligible

This instrumentation provides complete visibility into the render queue fix across the entire chargen flow.
