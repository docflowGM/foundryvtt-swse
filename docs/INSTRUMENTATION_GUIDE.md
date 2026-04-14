# Render Queue Fix — Verification Instrumentation

## Overview

Temporary debug instrumentation has been added to verify the render queue fix is working correctly. This guide shows what logs to expect when clicking a species in the progression shell.

---

## Instrumentation Points Added

### 1. `progression-shell.js` — render() method (lines 423–456)

**Lines added:**

1. **Line 427** — When render is queued instead of executed:
   ```js
   console.debug(`[SWSE Render Queue Debug] Queuing rerender | focusedItem: ${this.focusedItem?.id ?? '(null)'} | _pendingRender before: ${this._pendingRender}`);
   ```

2. **Line 435** — When render() is called (shows initial state):
   ```js
   console.debug(`[SWSE Render Queue Debug] render() called | isRendering: ${this._isRendering} | pendingRender: ${this._pendingRender} | focusedItem: ${this.focusedItem?.id ?? '(null)'} | step: ${this.currentStep?.id ?? '(unknown)'}`);
   ```

3. **Line 441** — When active render finishes (before flush check):
   ```js
   console.debug(`[SWSE Render Queue Debug] Render complete | willFlushPending: ${this._pendingRender}`);
   ```

4. **Line 443–444** — If render throws (error tracking):
   ```js
   console.error(`[SWSE Render Queue Debug] Render threw error before cleanup:`, err.message);
   ```

5. **Line 451** — When queued rerender is flushed:
   ```js
   console.debug(`[SWSE Render Queue Debug] Flushing queued rerender | focusedItem: ${this.focusedItem?.id ?? '(null)'}`);
   ```

### 2. `species-step.js` — onItemFocused() method (lines 575–576)

**Lines added:**

1. **Line 575** — Before rerender is requested:
   ```js
   console.debug(`[SWSE Species Hydration Debug] [Click #${clickNum}] Requesting rerender for species hydration | selected: ${entry.name} (${entry.id}) | focusedItem: ${shell.focusedItem?.id ?? '(null)'}`);
   ```

2. **Line 577** — After rerender is requested:
   ```js
   console.debug(`[SWSE Species Hydration Debug] [Click #${clickNum}] Rerender requested | focusedItem: ${shell.focusedItem?.id ?? '(null)'}`);
   ```

### 3. `species-step.js` — renderDetailsPanel() method (line 315)

**Line added:**

1. **Line 315** — When detail hydration method is entered:
   ```js
   console.debug(`[SWSE Species Hydration Debug] renderDetailsPanel() entry | focusedItem: ${focusedItem?.id ?? '(null)'} (${focusedItem?.name ?? '(null)'})`);
   ```

---

## Expected Log Sequence for Normal Species Click

When you click on a non-Advose species (e.g., Cathar, Human, Twi'lek), you should see this sequence in the browser console:

```
[SWSE Species Hydration Debug] [Click #1] Requesting rerender for species hydration | selected: Cathar (cathar-kotor) | focusedItem: cathar-kotor
[SWSE Render Queue Debug] render() called | isRendering: true | pendingRender: false | focusedItem: cathar-kotor | step: species
[SWSE Render Queue Debug] Queuing rerender | focusedItem: cathar-kotor | _pendingRender before: false
[SWSE Species Hydration Debug] [Click #1] Rerender requested | focusedItem: cathar-kotor
[ProgressionShell] RENDER START (#N) position: ...
[ProgressionShell] RENDER COMPLETE (#N) position: ...
[SWSE Render Queue Debug] Render complete | willFlushPending: true
[ProgressionShell] EXECUTE QUEUED RERENDER (#N+1)
[SWSE Render Queue Debug] Flushing queued rerender | focusedItem: cathar-kotor
[SWSE Render Queue Debug] render() called | isRendering: false | pendingRender: false | focusedItem: cathar-kotor | step: species
[ProgressionShell] RENDER START (#N+1) position: ...
[SWSE Species Hydration Debug] renderDetailsPanel() entry | focusedItem: cathar-kotor (Cathar)
[ProgressionShell] RENDER COMPLETE (#N+1) position: ...
```

### What This Sequence Proves

✅ **Step 1:** Species selected and rerender requested  
✅ **Step 2:** Initial render is active (`_isRendering: true`)  
✅ **Step 3:** Rerender is queued instead of blocked (`_pendingRender: true`)  
✅ **Step 4:** First render completes  
✅ **Step 5:** Queued rerender is flushed from finally block  
✅ **Step 6:** Second render executes with `focusedItem` properly set  
✅ **Step 7:** `renderDetailsPanel()` is called with correct species ID  
✅ **Step 8:** Detail rail hydrates with species data  

---

## Breakage Scenarios

### Scenario A: Rerender is blocked instead of queued
**Log:** `Render called while already rendering — BLOCKED (loop prevention)`  
**Root cause:** Old code path is still running, not the patched version  
**Action:** Verify file changes were applied correctly

### Scenario B: Queued rerender is not flushed
**Logs show:**
- ✅ Render queued
- ✅ Render complete
- ❌ No "EXECUTE QUEUED RERENDER" message
- ❌ No second render starts

**Root cause:** finally block not executing or `_pendingRender` not being read  
**Action:** Check finally block implementation in progression-shell.js render()

### Scenario C: renderDetailsPanel() is not called on flushed rerender
**Logs show:**
- ✅ First 5 steps correct
- ✅ Queued rerender flushed
- ✅ Second render starts
- ❌ No "renderDetailsPanel() entry" message

**Root cause:** Detail hydration not triggered during render #2  
**Action:** Check getDetailsPanel() or getDetailsPanelData() call in render flow

### Scenario D: focusedItem is null during hydration
**Log:** `renderDetailsPanel() entry | focusedItem: (null)`  
**Root cause:** `shell.focusedItem` not persisting between first and second render  
**Action:** Check species-step.js line 521 — verify `shell.focusedItem = entry` is executed

---

## How to View the Logs

### Browser Console (Recommended)
1. Open the Foundry VTT character progression dialog
2. Open browser Developer Tools: **F12** or **Cmd+Option+I** (Mac)
3. Switch to **Console** tab
4. Search for logs with prefix: `[SWSE Render Queue Debug]` or `[SWSE Species Hydration Debug]`
5. Click a species to trigger the sequence
6. Logs should appear immediately in console

### Filtering in Console
- **Show only render queue logs:** Filter for `SWSE Render Queue Debug`
- **Show only species hydration logs:** Filter for `SWSE Species Hydration Debug`
- **Show all related logs:** Filter for `SWSE`

---

## Removing Instrumentation

After verification is complete, remove the temporary logs by searching for:

- `[SWSE Render Queue Debug]`
- `[SWSE Species Hydration Debug]`

in both files and removing those console.debug() calls. The existing console.log() and console.error() calls can remain as they were already present.

Files to clean:
- `scripts/apps/progression-framework/shell/progression-shell.js` — 5 debug logs
- `scripts/apps/progression-framework/steps/species-step.js` — 3 debug logs

---

## Summary

**Total instrumentation points:** 8  
**Files modified:** 2  
**Temporary nature:** Yes — all logs use console.debug() prefix for easy identification  
**Business logic changes:** None — instrumentation only  
**Performance impact:** Negligible — debug logs only fire on species click

---

## Next Steps

1. ✅ Apply file patches (done)
2. ⏳ Open progression dialog and click species
3. ⏳ Check browser console for expected log sequence
4. ⏳ Verify right detail rail populates correctly
5. ⏳ Remove debug logs when verification complete
