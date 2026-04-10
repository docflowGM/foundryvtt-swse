# Character Sheet Resize/Scroll Diagnostics Guide

## Overview

A temporary diagnostic layer has been added to the character sheet to identify why it cannot properly resize or scroll. This captures runtime state of the DOM, styles, and frame/content layout at multiple points in the render lifecycle.

## Quick Start

### One-Time Inspection

Open the browser console (F12) while the character sheet is open, then:

```javascript
SWSE_SHEET_DIAG.inspectCharacterSheet()
```

This will log:
- Class hierarchy and base classes
- All runtime options (width, height, resizable, draggable, frame, scrollY, etc.)
- Complete DOM layout chain with computed styles for:
  - Bounding rectangles
  - Overflow metrics
  - Display/position properties
  - Flex properties
  - Pointer-events
- Which elements have overflowing content
- Resize affordances and frame configuration

### Continuous Monitoring

To watch for runtime changes:

```javascript
SWSE_SHEET_DIAG.watchCharacterSheet()
```

This will:
- Attach a ResizeObserver to detect dimension changes
- Attach a MutationObserver to detect class/style changes
- Take periodic snapshots at +250ms, +500ms, +1000ms, +2000ms after render
- Log all observer events to console

Stop watching:

```javascript
SWSE_SHEET_DIAG.stopWatching()
```

### View Stored Snapshots

Print the last inspection report:

```javascript
SWSE_SHEET_DIAG.printLastReport()
```

Get all snapshots taken:

```javascript
SWSE_SHEET_DIAG.getSnapshots()
```

## What to Look For

### Resize Issues

**Check for:**
1. **Frame element exists?** Look in "RESIZE AFFORDANCES" → `hasFrameElement`
2. **Frame marked as resizable?** Check `appResizable` and `frameHasResizeClass`
3. **Outer window dimensions changing?** Run `watchCharacterSheet()` and try dragging a corner
4. **ResizeObserver logs showing size changes?** Confirms the outer element is resizing
5. **Inner element responding?** Check if `.window-content` or `.swse-character-sheet-form` dimensions change

**Interpretation:**
- If outer window resizes but inner elements don't respond → CSS constraint blocking growth
- If outer window doesn't resize at all → Frame configuration issue or size clamping

### Scroll Issues

**Check for:**
1. **Scroll regions detected?** Look at "SCROLL REGIONS" section
2. **Elements with `overflow: auto|scroll`?** Should show in scroll regions
3. **Elements where `scrollHeight > clientHeight`?** Indicates content larger than container
4. **Active tab content?** Find `.sheet-content > .tab.active` in DOM layout chain

**Interpretation:**
- If no scroll regions detected → scrollY configuration missing or CSS prevents overflow
- If scroll regions exist but `.sheet-body` has `overflow: hidden` → Content is being clipped
- If multiple nested scroll containers → Check which one has the actual overflowing content

## Common Findings

### Expected (Working) State

```
✓ Frame element exists
✓ appResizable = true
✓ .window-content has flex: 1 1 auto and overflow: hidden
✓ .swse-character-sheet-form has flex: 1 1 auto and min-height: 0
✓ One clear scroll region identified (usually .sheet-body or .sheet-content)
✓ Active tab shows scrollHeight > clientHeight
✓ ResizeObserver logs size changes when window is dragged
```

### Problem Indicators

```
✗ appResizable = false (not in options)
✗ No frame element or frame not properly configured
✗ Double flex-wrapping (both wrapper and form have flex constraints)
✗ .window-content has overflow: auto (should be hidden, let content handle scroll)
✗ .swse-character-sheet-form missing min-height: 0 (breaks flex grow)
✗ No scroll regions detected (scrollY not configured, no overflow: auto)
✗ scrollHeight === clientHeight on all elements (content being clipped)
✗ ResizeObserver shows no size changes (window not truly resizing)
```

## Debug Mode Auto-Report

If you enable debug mode in Foundry settings:

```
Settings → System Settings → Debug Mode (SWSE) = ON
```

Then every time the character sheet renders, it will automatically print a full inspection report to console.

Disable with:

```
Settings → System Settings → Debug Mode (SWSE) = OFF
```

## Interpreting Computed Styles

Key properties to understand:

| Property | What It Means |
|----------|---------------|
| `display: flex` | Element uses flexbox layout |
| `flex: 1 1 auto` | Element grows/shrinks to fill space |
| `flex: 0 0 auto` | Element is rigid, doesn't grow/shrink |
| `min-height: 0` | Allows flex items to shrink below content size |
| `overflow: hidden` | Content is clipped, no scroll |
| `overflow: auto` | Shows scroll if content > container |
| `overflow: scroll` | Always shows scroll bars |
| `pointer-events: none` | Element doesn't receive mouse events |
| `position: absolute/fixed` | Element taken out of normal flow |

## Examples

### Find the Scroll Container

```javascript
// Get all elements with overflowing content
SWSE_SHEET_DIAG.inspectCharacterSheet()
// Look at "SCROLL REGIONS" section
// Will show which element has excess height
```

### Check if Window Resizes

```javascript
SWSE_SHEET_DIAG.watchCharacterSheet()
// Now try dragging a corner of the character sheet window
// Look at console logs from ResizeObserver
// Should show size changes if working correctly
```

### Verify Config Options

```javascript
const snap = SWSE_SHEET_DIAG.snapshot()
console.log('Runtime options:', snap.runtimeOptions.options)
// Check if resizable, draggable, frame, and scrollY are set
```

## Next Steps

After gathering diagnostic data:

1. **If resize is broken:** Check if outer window frame even exists and is configured as resizable
2. **If scroll is broken:** Check if scrollY is configured and which element should be the scroll region
3. **If both are broken:** Compare against NPC sheet (known working) or chargen (known working)
4. **Share findings:** Include relevant console output when reporting issues

## Files Modified

- `scripts/sheets/v2/character-sheet-diagnostics.js` (new)
- `scripts/sheets/v2/character-sheet.js` (added import + diagnostic snapshots)

## Cleanup

This is temporary instrumentation. Once the resize/scroll issue is identified and fixed, remove:

1. Import line from character-sheet.js
2. Diagnostic snapshot calls from _onRender
3. Auto-report conditional at end of _onRender
4. Delete character-sheet-diagnostics.js file
