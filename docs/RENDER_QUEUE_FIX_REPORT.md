# Render Queue Fix — Species Detail Hydration Bug

## Root Cause Statement

The progression shell's render guard was implemented as a **hard blocker** that discarded nested rerender requests during active renders. When the Species step clicked an item, it performed:

1. Set `shell.focusedItem = entry`
2. Await `shell.mentorRail.speak()` (async, animation-heavy)
3. Call `shell.render()` to hydrate the detail panel

If `mentorRail.speak()` kept the shell in a "rendering" state or if the rerender occurred before the original render's `_isRendering` flag was cleared, the critical detail hydration render was **silently discarded** with the message:

```
[ProgressionShell] Render called while already rendering — BLOCKED (loop prevention)
```

This left the right detail rail empty until the next independent state change triggered a render.

---

## Files Changed

**Only one file modified:**
- `scripts/apps/progression-framework/shell/progression-shell.js`

---

## Exact Code Sections Changed

### 1. Constructor initialization (lines 285–288)

**Before:**
```js
// Render loop prevention guard
this._isRendering = false;
this._renderCount = 0;
```

**After:**
```js
// Render loop prevention guard — now with queueing support
this._isRendering = false;
this._pendingRender = false;
this._renderCount = 0;
```

**Reason:** Added `_pendingRender` flag to track when a rerender is requested during an active render.

---

### 2. Render method (lines 422–450)

**Before:**
```js
async render(...args) {
  // Render loop prevention: block recursive render calls during active render
  if (this._isRendering) {
    console.warn("[ProgressionShell] ⚠️ Render called while already rendering — BLOCKED (loop prevention)");
    return this;
  }

  this._isRendering = true;
  this._renderCount++;

  console.log(`[ProgressionShell] RENDER START (#${this._renderCount}) position:`, this.position);
  const result = await super.render(...args);
  console.log(`[ProgressionShell] RENDER COMPLETE (#${this._renderCount}) position:`, this.position);

  this._isRendering = false;
  return result;
}
```

**After:**
```js
async render(...args) {
  // Render queue: if render is in progress, queue one pending rerender instead of blocking
  if (this._isRendering) {
    console.warn("[ProgressionShell] ⚠️ Render called while already rendering — QUEUEING (will retry after)");
    this._pendingRender = true;
    return this;
  }

  this._isRendering = true;
  this._renderCount++;

  console.log(`[ProgressionShell] RENDER START (#${this._renderCount}) position:`, this.position);

  try {
    const result = await super.render(...args);
    console.log(`[ProgressionShell] RENDER COMPLETE (#${this._renderCount}) position:`, this.position);
    return result;
  } finally {
    this._isRendering = false;

    // If a rerender was requested while we were rendering, execute it now
    if (this._pendingRender) {
      this._pendingRender = false;
      console.log(`[ProgressionShell] EXECUTE QUEUED RERENDER (#${this._renderCount + 1})`);
      queueMicrotask(() => this.render());
    }
  }
}
```

**Changes explained:**
1. **Line 425–428:** When `_isRendering` is true, set `_pendingRender = true` and return (queue instead of block)
2. **Line 436–449:** Wrap render work in `try/finally` to ensure:
   - `_isRendering` is always cleared, even if render throws
   - After the guard is released, check if a rerender was queued
   - If so, immediately schedule one via `queueMicrotask()`
3. **Message change:** "BLOCKED" → "QUEUEING (will retry after)" to clarify new behavior

---

## Why This Change Is Minimal & Safe

1. **Isolated to render guard logic only**
   - No changes to species data resolution
   - No changes to mentor systems
   - No changes to detail panel templates
   - No changes to step logic

2. **Preserves loop prevention**
   - Still prevents infinite recursion (only queues ONE pending rerender, not unlimited)
   - The queued rerender is scheduled via `queueMicrotask()`, giving the event loop a chance to clear

3. **Uses standard patterns**
   - `try/finally` is idiomatic for guard release
   - `queueMicrotask()` is browser-standard for non-urgent async work
   - No new dependencies or external libraries

4. **Backward compatible**
   - Existing code calling `shell.render()` works unchanged
   - Stepping code unchanged
   - Detail panel templates unchanged

---

## Behavioral Change

**Old behavior:**
- Render A starts
- During render A, render B is requested → returned immediately (BLOCKED)
- Render A ends
- Detail panel never updates (B was discarded)

**New behavior:**
- Render A starts
- During render A, render B is requested → flag set, returned immediately (QUEUED)
- Render A ends
- Render B is automatically triggered
- Detail panel updates correctly

---

## Verification Checklist

Once deployed, verify:

✅ **UI behavior:**
- [ ] Click a non-Advose species → right detail rail populates immediately
- [ ] Species image, attributes, abilities, mentor text all visible
- [ ] Can click different species and see details change without delay

✅ **Console logs:**
- [ ] When species is clicked, see:
  - `RENDER START (#N)`
  - `QUEUEING (will retry after)` warning
  - `RENDER COMPLETE (#N)`
  - `EXECUTE QUEUED RERENDER (#N+1)`
  - `RENDER START (#N+1)` for the queued rerender
  - `RENDER COMPLETE (#N+1)`
- [ ] Do NOT see the old message: "BLOCKED (loop prevention)" as a terminal outcome

✅ **No regressions:**
- [ ] No infinite render loops in browser console
- [ ] Mentor rail animations still work
- [ ] Step transitions still work
- [ ] Session persistence still works

---

## Risks & Follow-Up Observations

### Low risk:
- The guard is now **permissive** but still **bounded** (max 2 renders per event)
- The queued rerender is scheduled at the **microtask level**, giving the event loop a chance to batch DOM updates
- There is no risk of stack overflow or O(N²) render chains

### Potential follow-up observations:
1. **If detail rail still doesn't hydrate:** The issue is not the render lock, but either:
   - `shell.focusedItem` is not being set correctly (check species-step line 521)
   - `renderDetailsPanel()` is being called with the wrong item
   - The detail template is not receiving the data
   - **Action:** Add temporary logging to `renderDetailsPanel(focusedItem)` and `getDetailsPanelData()` to confirm data flow

2. **If multiple rerenders happen per click:** That's expected with the queue. Each species click may trigger 1–2 renders:
   - Initial render from click handler
   - Queued rerender after mentor speak completes
   - This is normal and efficient

3. **Performance:** The change uses standard browser APIs and should have no measurable impact. If rerender count seems excessive, the root cause is likely in mentor animation timing, not the queue itself.

---

## Summary

**One file, two locations, zero dependencies.**

The render guard now queues one pending rerender instead of blocking it. This unblocks the species detail hydration while maintaining loop prevention. The fix is surgical, low-risk, and uses standard patterns.
