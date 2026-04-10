# P0 CHARACTER SHEET RESIZING - SECOND PASS AUDIT
## Investigating Live Resize Mechanics

**Date:** 2026-04-09  
**Status:** AUDIT IN PROGRESS  
**Previous Fix:** Removed forced `width`/`height` from `setPosition()` call

---

## AUDIT SCOPE

The user reported that despite the first fix, the character sheet is **STILL NOT RESIZABLE in practice**. This second pass investigates whether the actual resize handle exists and functions, rather than just default/persistence behavior.

---

## VERIFIED CORRECT COMPONENTS

### 1. ApplicationV2 Configuration ✅
**File:** `scripts/sheets/v2/character-sheet.js` (lines 250-254)

```javascript
window: {
  resizable: true,   // ✅ Set to true
  draggable: true,   // ✅ Set to true  
  frame: true        // ✅ Set to true
}
```

**Base class conversion** (`scripts/apps/base/swse-application-v2.js`, lines 29-31):
```javascript
if (o.window?.resizable !== undefined) {o.resizable = o.window.resizable;}
if (o.window?.draggable !== undefined) {o.draggable = o.window.draggable;}
if (o.window?.frame !== undefined) {o.popOut = o.window.frame;}
```

✅ **Config is correctly set up** for V13 ApplicationV2 resizability.

---

### 2. Flexbox Layout Chain ✅
**File:** `styles/sheets/character-sheet.css` (lines 162-204)

Complete chain verified:
- `.window-content`: `display: flex`, `flex-direction: column`, `min-height: 0`
- `form.swse-character-sheet-form`: `flex: 1 1 auto`, `min-height: 0`, `min-width: 0`
- `.sheet-body`: `flex: 1 1 auto`, `min-height: 0`, `min-width: 0`
- `.tab`: `flex: 1 1 auto`, `min-height: 0`, `overflow-y: auto`

✅ **Layout chain is V2-compliant** with all critical `min-height: 0` constraints present.

---

### 3. CSS Anti-Patterns: NONE FOUND ✅

Checked for common resize blockers:
- ❌ No fixed pixel heights on structural containers
- ❌ No `max-height` locking the sheet
- ❌ No `max-width` constraints on main elements
- ❌ No `position: absolute` on form/body elements
- ❌ No `pointer-events: none` on window/frame elements
- ❌ No competing `overflow` rules

✅ **No CSS anti-patterns found that would prevent resize.**

---

### 4. Code Interference: NONE FOUND ✅

Checked for custom resize handling:
- ❌ No `_onChangeWindowPosition()` method
- ❌ No `_onResizeWindow()` method  
- ❌ No `handleResize()` method
- ❌ No `mousedown`/`mousemove`/`mouseup` handlers capturing resize
- ❌ No custom drag-resize logic

✅ **No custom code interfering with ApplicationV2 resize.**

---

## POTENTIAL ISSUES IDENTIFIED

### Issue 1: First Fix Only Addressed Persistence, Not Live Resize

**What the first fix changed:**
- Removed `width: 900, height: 950` from `setPosition()` call
- This allows persistence system to save/restore user dimensions
- This DOES NOT necessarily enable drag-to-resize functionality

**Why this matters:**
- Removing forced dimensions ≠ enabling the resize handle
- The handle is an ApplicationV2 frame feature, not part of layout
- If the handle wasn't working before, it still won't be working

---

### Issue 2: Potential ApplicationV2 Frame Issue

In Foundry V13 ApplicationV2, the resize handle is managed by the framework itself, not by custom code. The following must be true for resizing to work:

1. ✅ `resizable: true` is set (VERIFIED)
2. ✅ `frame: true` is set (VERIFIED)
3. ❓ ApplicationV2 is properly rendering the frame DOM
4. ❓ The resize handle element exists in the DOM
5. ❓ The handle is visible and accessible

**Status:** Items 3-5 UNVERIFIED - require DOM inspection

---

### Issue 3: Possible Window-Content Sizing Issue

The `.window-content` element must be properly sized relative to the outer frame for the frame to be resizable. 

Currently observed:
- `.window-content` has `display: flex`, `flex-direction: column`, `min-height: 0`
- No explicit `height: 100%` or `width: 100%`

**Question:** Does the `.window-content` properly fill the frame's available space (excluding title bar and frame borders)?

**Status:** UNVERIFIED - requires DOM inspection

---

## WHAT NEEDS TO BE TESTED

To determine if the sheet is actually resizable:

### Test 1: Visual Inspection
1. Open a character sheet
2. Look for a resize handle (typically a small square in bottom-right corner)
3. Report whether handle is visible
4. If visible, is it clickable/draggable?

### Test 2: DOM Inspection
1. Open character sheet
2. Open browser DevTools (F12)
3. Inspect the outer `.application` element
4. Look for:
   - `data-application-part="resizeHandle"` or similar attribute
   - A visible resize handle element
   - CSS `cursor: nwse-resize` or similar on the handle
5. Report findings

### Test 3: Try Dragging
1. Open character sheet  
2. Click and drag the bottom-right corner of the window
3. Does the window resize?
4. If it doesn't, what happens?

---

## HYPOTHESIS

**Most Likely Issue:** The ApplicationV2 frame is not being rendered with a visible resize handle, OR the handle exists but is blocked by the content overlay.

**Second Most Likely:** Something about the `.window-content` sizing is preventing ApplicationV2 from enabling the frame resize functionality.

**Least Likely:** The layout won't expand even if resize works.

---

## NEXT STEPS REQUIRED

### High Priority
1. Determine if resize handle exists in the DOM
2. Determine if resize handle is visible
3. Try actually dragging to resize and report what happens

### If Handle Exists But Doesn't Work
1. Check if `.window-content` has proper height/width inheritance
2. Verify ApplicationV2 is in correct state (rendered, not in a dialog/modal)

### If Handle Doesn't Exist
1. Check why ApplicationV2 isn't creating the frame handle
2. Verify `frame: true` is actually being applied
3. Check if there's a condition that disables the handle

---

## CURRENT STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| Config | ✅ CORRECT | `resizable: true`, `frame: true` set |
| Layout | ✅ CORRECT | Proper flexbox chain with `min-height: 0` |
| CSS | ✅ CLEAN | No blocking rules found |
| Code | ✅ CLEAN | No custom resize interference |
| **Resize Handle** | ❓ UNKNOWN | DOM structure not inspected |
| **Live Resize** | ❓ UNKNOWN | Functionality not tested |

---

## IMPORTANT CLARIFICATION

The first fix (removing forced dimensions) was correct for persistence and expansion behavior. However, it was NOT sufficient to enable live resize if the ApplicationV2 frame wasn't creating the resize handle in the first place.

The second pass must determine whether the handle exists and works, not just whether dimensions are being clamped.

---

## REQUIRED USER VALIDATION

To proceed, need confirmation on:

1. **Does the resize handle exist?** 
   - Can you see a small square in the bottom-right corner of the sheet window?

2. **Can you drag it?**
   - If you click and drag that corner, does the window resize?

3. **If it doesn't work, what happens?**
   - Does nothing happen when you drag?
   - Does the window refuse to resize?
   - Does something else occur?

Without this information, the root cause cannot be definitively identified.

---

**This audit is incomplete pending user testing and DOM inspection.**
