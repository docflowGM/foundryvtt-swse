# Render Queue Fix — Verification & Cleanup Guide

## Phase 1: Verify the Fix (3–5 minutes)

### Step 1: Open the Progression Dialog
1. In Foundry, create a new character or open an existing character sheet
2. Click "Progression" or equivalent button to open the chargen dialog
3. Ensure you're at the **Species** step (first step of chargen)

### Step 2: Open Browser Console
1. Press **F12** (Windows/Linux) or **Cmd+Option+I** (Mac)
2. Switch to the **Console** tab
3. You should see existing logs from the progression shell (search for `[ProgressionShell]`)

### Step 3: Test Species Selection (Primary Test)
1. Click on a **non-Advose** species (e.g., Cathar, Human, Twi'lek, Droid)
2. Watch the browser console for logs
3. **Expected sequence:**
   ```
   [SWSE Chargen Hydration Debug] onItemFocused hook entry | step: species | itemId: {species-id}
   [SWSE Render Queue Debug] Queuing rerender | focusedItem: {species-id} | _pendingRender before: false
   [ProgressionShell] EXECUTE QUEUED RERENDER
   [SWSE Chargen Hydration Debug] renderDetailsPanel hook entry | step: species | focusedItem: {species-id}
   [SWSE Chargen Hydration Debug] afterRender hook completed | step: species | focusedItem: {species-id}
   ```

4. **UI Check:**
   - Right detail rail should populate immediately
   - Species image should appear
   - Species attributes, abilities, languages should be visible
   - Mentor text (Ol' Salty dialogue) should appear

### Step 4: Test Another Step (Class)
1. Click "Next" to advance to the **Class** step
2. Click on a class card (e.g., Soldier, Scout)
3. **Expected behavior:**
   - Right detail rail populates immediately
   - Class description and features appear
   - Console shows similar queue pattern

4. **Expected logs:**
   ```
   [SWSE Chargen Hydration Debug] [ClassStep] Requesting rerender for class selection
   [SWSE Render Queue Debug] Queuing rerender
   [SWSE Chargen Hydration Debug] renderDetailsPanel hook entry | step: class
   ```

### Step 5: Test Background Step (Secondary Test)
1. Advance to **Background** step
2. Click on a background card
3. Verify detail rail hydration works immediately
4. Check console for hydration logs

### Step 6: Critical Console Checks
❌ **BAD - Shows fix is NOT working:**
- See `Render called while already rendering — BLOCKED` as the final log for a species click
- Detail rail remains empty after mentor rail animation
- No `EXECUTE QUEUED RERENDER` message

✅ **GOOD - Shows fix IS working:**
- See `QUEUEING (will retry after)` messages
- See `EXECUTE QUEUED RERENDER` messages after render completes
- Detail rail populates immediately after mentor animation
- afterRender logs confirm hydration completed

---

## Phase 2: Cleanup Instrumentation

Once verification is complete and you've confirmed the fix is working:

### Step 1: Remove Shell-Level Logs (progression-shell.js)
Find and delete these 5 debug lines in the `render()` method:

**Line 427:**
```js
console.debug(`[SWSE Render Queue Debug] Queuing rerender | focusedItem: ${this.focusedItem?.id ?? '(null)'} | _pendingRender before: ${this._pendingRender}`);
```

**Line 435:**
```js
console.debug(`[SWSE Render Queue Debug] render() called | isRendering: ${this._isRendering} | pendingRender: ${this._pendingRender} | focusedItem: ${this.focusedItem?.id ?? '(null)'} | step: ${this.currentStep?.id ?? '(unknown)'}`);
```

**Line 441:**
```js
console.debug(`[SWSE Render Queue Debug] Render complete | willFlushPending: ${this._pendingRender}`);
```

**Line 443:**
```js
console.error(`[SWSE Render Queue Debug] Render threw error before cleanup:`, err.message);
```

**Line 451:**
```js
console.debug(`[SWSE Render Queue Debug] Flushing queued rerender | focusedItem: ${this.focusedItem?.id ?? '(null)'}`);
```

### Step 2: Remove Common Hook Logs (step-plugin-base.js)
Find and delete these 3 debug lines at the start of each method:

**In onItemFocused() (Line 111):**
```js
console.debug(`[SWSE Chargen Hydration Debug] onItemFocused hook entry | step: ${this.descriptor?.id ?? '(unknown)'} | itemId: ${itemId ?? '(null)'}`);
```

**In renderDetailsPanel() (Line 225):**
```js
console.debug(`[SWSE Chargen Hydration Debug] renderDetailsPanel hook entry | step: ${this.descriptor?.id ?? '(unknown)'} | focusedItem: ${focusedItem?.id ?? '(null)'}`);
```

**In afterRender() (Line 326):**
```js
console.debug(`[SWSE Chargen Hydration Debug] afterRender hook completed | step: ${this.descriptor?.id ?? '(unknown)'} | focusedItem: ${shell.focusedItem?.id ?? '(null)'}`);
```

### Step 3: Remove Species Step Logs (species-step.js)
Find and delete these logs:

**Line 315 in renderDetailsPanel():**
```js
console.debug(`[SWSE Species Hydration Debug] renderDetailsPanel() entry | focusedItem: ${focusedItem?.id ?? '(null)'} (${focusedItem?.name ?? '(null)'})`);
```

**Line 576 before shell.render():**
```js
console.debug(`[SWSE Species Hydration Debug] [Click #${clickNum}] Requesting rerender for species hydration | selected: ${entry.name} (${entry.id}) | focusedItem: ${shell.focusedItem?.id ?? '(null)'}`);
```

**Line 578 after shell.render():**
```js
console.debug(`[SWSE Species Hydration Debug] [Click #${clickNum}] Rerender requested | focusedItem: ${shell.focusedItem?.id ?? '(null)'}`);
```

### Step 4: Remove Class Step Logs (class-step.js)
Find and delete these logs in onItemFocused():

**Before mentorRail.speak():**
```js
console.debug(`[SWSE Chargen Hydration Debug] [ClassStep] Requesting rerender for class selection | selected: ${entry.name} (${entry.id}) | focusedItem before: ${shell.focusedItem?.id ?? '(null)'}`);
```

**Before shell.render():**
```js
console.debug(`[SWSE Chargen Hydration Debug] [ClassStep] Calling shell.render() | focusedItem: ${shell.focusedItem?.id ?? '(null)'}`);
```

### Step 5: Remove Background Step Logs (background-step.js)
Find and delete these logs in onItemFocused():

**Before mentorRail.speak():**
```js
console.debug(`[SWSE Chargen Hydration Debug] [BackgroundStep] Requesting rerender for background selection | selected: ${background.name} (${background.id})`);
```

**Before shell.render():**
```js
console.debug(`[SWSE Chargen Hydration Debug] [BackgroundStep] Calling shell.render() | focusedBackgroundId: ${this._focusedBackgroundId}`);
```

### Step 6: Verify Cleanup
1. Search each file for remaining `console.debug` calls with `[SWSE` prefix
2. Ensure no `[SWSE Render Queue Debug]` or `[SWSE Chargen Hydration Debug]` logs remain
3. Existing `console.log` and `console.error` calls may remain (they were pre-existing)

---

## Summary of Changes

### Files Modified: 5

1. **progression-shell.js** (Core Fix)
   - Added `_pendingRender` flag in constructor
   - Implemented render queue logic with try/finally
   - Added 5 temporary debug logs

2. **step-plugin-base.js** (Common Hooks)
   - Added 3 temporary debug logs at hook entry points

3. **species-step.js** (Example Step)
   - Added 3 temporary debug logs in onItemFocused/renderDetailsPanel

4. **class-step.js** (Example Step)
   - Added 2 temporary debug logs in onItemFocused

5. **background-step.js** (Example Step)
   - Added 2 temporary debug logs in onItemFocused

### Permanent Changes: 2

1. **progression-shell.js**
   - Line 287: Add `this._pendingRender = false`
   - Lines 423–456: Implement render() with try/finally queue logic

2. **step-plugin-base.js**
   - (None — instrumentation only)

### Temporary Changes: 16
- All debug statements can be removed without affecting functionality
- No business logic changes beyond the render guard

---

## Risk Assessment

### Low Risk Items:
✓ Render queue is bounded (max 2 renders per user action)
✓ Queueing uses standard `queueMicrotask()` API
✓ Guard is always released via try/finally
✓ No infinite loops possible

### Testing Checklist:
- [ ] Detail rail hydrates for species click
- [ ] Detail rail hydrates for class click
- [ ] Detail rail hydrates for background click
- [ ] No console errors related to render/hydration
- [ ] No infinite render loops
- [ ] Mentor animations complete before hydration
- [ ] Step transitions work normally
- [ ] Summary step shows all accumulated selections

---

## If Fix is NOT Working

If the fix is not resolving the hydration issue:

1. **Check console for these signs:**
   - `Render called while already rendering — BLOCKED` (old code path)
   - `renderDetailsPanel hook entry` with `focusedItem: (null)` (data not passing)
   - No `EXECUTE QUEUED RERENDER` message (queue not flushing)

2. **Likely secondary blockers:**
   - `shell.focusedItem` not being set correctly in step
   - Detail template not receiving species/class/background object
   - Async mentor animation preventing render completion

3. **Action items:**
   - Add additional logging in `renderDetailsPanel()` to track data flow
   - Check `shell.focusedItem` assignment in each step's onItemFocused
   - Verify mentor animation doesn't prevent render from completing

---

## Questions?

Refer to:
- `FIX_SUMMARY.txt` — Root cause and fix details
- `INSTRUMENTATION_GUIDE.md` — How to read individual logs
- `COMPREHENSIVE_INSTRUMENTATION_REPORT.md` — Full coverage across all steps
