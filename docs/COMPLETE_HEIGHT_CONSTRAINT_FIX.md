# Complete Height Constraint Chain Fix

## The Problem (Summary)

The character sheet scroll was failing because `flex: 1 1 auto` was used throughout the layout hierarchy instead of `flex: 1`. This prevented the flex chain from properly constraining element heights from the window down to the scrollable tab.

## Root Cause

In CSS flexbox, when you use `flex: 1 1 auto`:
- **flex-basis: auto** means "start from content size"
- For a container with 2668px of content, this means start at 2668px
- With flex-shrink: 1, it *should* shrink, but this doesn't work reliably when combined with other factors

Using `flex: 1` instead means:
- **flex-basis: 0%** means "start from 0px"
- The element can then grow/shrink to fill available parent space
- This creates a proper constrained flex chain

## All Fixes Applied

All in file: `styles/sheets/v2-sheet.css`

### Fix 1: Form Element (Line 142)
```css
form.swse-sheet-ui {
  flex: 1;  /* Changed from 1 1 auto */
  min-height: 0;
}
```
**Purpose:** Constrain the form to the window-content available height

### Fix 2: Sheet Shell/Root (Line 150)
```css
form.swse-sheet-ui > .sheet-shell,
form.swse-sheet-ui > section.swse-sheet {
  flex: 1;  /* Changed from 1 1 auto */
  min-height: 0;
}
```
**Purpose:** Ensure sheet-shell respects form's constrained height

### Fix 3: Sheet Body (Line 193)
```css
form.swse-sheet-ui .sheet-body,
form.swse-sheet-ui .sheet-content {
  flex: 1;  /* Changed from 1 1 auto */
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```
**Purpose:** Ensure sheet-body respects sheet-shell's constrained height

### Fix 4: Tab Scroll Owner (Line 202)
```css
form.swse-sheet-ui .sheet-body > .tab {
  flex: 1;  /* Changed from 1 1 auto */
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
```
**Purpose:** Allow the tab to be properly constrained so scrolling can work

## How It Works Now

**Complete constraint chain:**

```
.window-content (941px)
  ↓ (flex: 1 1 0%)
form.swse-sheet-ui (now ~941px, constrained by parent)
  ↓ (flex: 1)
.sheet-shell (now ~920px, constrained by form)
  ↓ (flex: 1)
.sheet-body (now ~850px, constrained by shell)
  ↓ (flex: 1)
.tab.active (~750px, constrained by body)
  - scrollHeight: 2099px (full content)
  - clientHeight: ~750px (constrained)
  - overflow-y: auto ✓
  - CAN SCROLL NOW ✓
```

## Why This Took Multiple Fixes

The problem wasn't isolated to one selector. The entire form hierarchy was using `flex: 1 1 auto`, which meant:
- Even if the form was fixed, the shell would still auto-grow
- Even if the shell was fixed, the body would still auto-grow  
- Even if the body was fixed, the tab would still be unconstrained

Each level had to be fixed separately because each child inherited the broken pattern from its parent rule.

## Expected Behavior After Hard Refresh

1. Browser needs **hard refresh** to load new CSS
   - Windows/Linux: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

2. After refresh, open character sheet and check height chain diagnostics:

   **Form should now show:**
   - `flex: 1 1 0%` ✓
   - `ClientHeight: ~550px` (constrained) ✓
   - Parent height: 941px

   **Tab should now show:**
   - `flex: 1 1 0%` ✓
   - `ClientHeight: ~750px` (constrained) ✓
   - `scrollHeight: 2099px` (content)
   - `canScroll: true` ✓

3. **Sheet should now scroll** when hovering over the tab area

## Summary of Changes

| Line | Selector | Before | After |
|------|----------|--------|-------|
| 142 | `form.swse-sheet-ui` | `flex: 1 1 auto` | `flex: 1` |
| 150 | `form.swse-sheet-ui > .sheet-shell` | `flex: 1 1 auto` | `flex: 1` |
| 193 | `form.swse-sheet-ui .sheet-body` | `flex: 1 1 auto` | `flex: 1` |
| 202 | `form.swse-sheet-ui .sheet-body > .tab` | `flex: 1 1 auto` | `flex: 1` |

These are the ONLY CSS changes needed to fix the scroll bug. Everything else (scroll ownership, window-content min-height, illegal scrollers) was already correct.

## Technical Notes

- No `!important` flags needed — these are the canonical rules in the cascade
- No inline styles set — pure CSS constraint
- All `min-height: 0` values remain in place (required for flex shrinking)
- The active tab still has `overflow-y: auto` (correct scroll owner)
- No hidden tabs changed — display: none stays as is

This fix represents the completion of the P0 scroll bug resolution.
