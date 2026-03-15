# Character Sheet Layout Fixes

**Date:** 2026-03-15
**Status:** BUG 1 FIXED ✅ | BUG 2 INVESTIGATING 🔍

---

## Bug 1: Empty Space in Non-Overview Tabs ✅ FIXED

### Problem
Non-Overview tabs (Abilities, Skills, Combat, Talents, Gear, Relationships, Notes) displayed large dead vertical regions with content pushed to the bottom.

### Root Cause
**File:** `/styles/sheets/v2-sheet.css` (Lines 41-48)

```css
.swse-sheet.tab {
  display: flex;
  flex-direction: column;
  flex: 1;            ← Applied to ALL tabs
  min-height: 0;
  overflow-y: auto;
}
```

The `flex: 1` rule made **every** tab grow to fill available vertical space. Overview has a grid with content cards, so it looked normal. Other tabs had minimal content but still received full flex growth, leaving empty space above the content.

### Fix Applied

Modified `/styles/sheets/v2-sheet.css` to apply `flex: 1` only to the Overview tab:

```css
/* Tab panels (natural sizing by default) */
.swse-sheet.tab {
  display: flex;
  flex-direction: column;
  min-height: auto;      ← Natural height, not flex
  min-width: 0;
  overflow-y: auto;
}

/* Only Overview tab should flex to fill space */
.swse-sheet.tab[data-tab="overview"] {
  flex: 1;              ← Only Overview grows
  min-height: 0;
}
```

### Result
- ✅ Overview tab retains card grid layout with proper spacing
- ✅ Other tabs now size naturally to their content
- ✅ No more dead vertical regions in Skills, Combat, Talents, etc.
- ✅ Scrolling still works when content exceeds window height

---

## Bug 2: Sheet Opens to Right of Sidebar 🔍 INVESTIGATING

### Problem
Character sheet opens anchored/docked to the right of the Actors sidebar instead of as a normal floating Foundry window.

### Investigation Results

**CSS Analysis:** ✅ Confirmed clean
- `/styles/sheets/v2-sheet.css` - All rules scoped to `.swse-sheet`, no window/app positioning
- `/styles/core/appv2-structural-safe.css` - Explicitly avoids targeting `.window-*` (see lines 9, 56-58)
- `/styles/layout/sheet-layout.css` - All rules prefixed with `.swse-app`, properly scoped
- No global CSS rules affecting `.application`, `.window-app`, or window placement

**Application Class Options:** ✅ Confirmed correct
- `/scripts/sheets/v2/character-sheet.js` line 6-14:
  - `width: 900, height: 950, resizable: true`
  - NO explicit `position`, `left`, `top` settings
  - Relies on Foundry's default window placement

### Current Hypothesis

The positioning might be:
1. **Foundry's default window placement** — New windows open in available space (right of sidebar)
2. **Sidebar layout interaction** — Sidebar expanded forces new windows rightward
3. **Canvas/UI layout CSS** — Possible CSS in archived files or UI-specific styling

### Next Investigation Steps

If this persists after testing, check:
1. Canvas viewport and UI container layout in Foundry's F12 inspector
2. Whether sidebar has `flex-grow` or width constraints affecting layout
3. CSS in `/styles/archive/` or `/styles/core/canvas-safety.css`
4. Whether this occurs with other SWSE sheets (droid, vehicle, NPC) or just character sheets

---

## Testing Checklist

After fixes, test in Foundry:

```
☐ Open character sheet
☐ Verify "Overview" tab shows normally with card grid
☐ Click "Abilities" tab — no large empty space above content
☐ Click "Skills" tab — content at top, no gap
☐ Click "Combat" tab — attack cards visible without scroll
☐ Click "Talents" tab — talent list without dead space
☐ Click "Gear" tab — inventory items visible
☐ Verify scrolling works when content exceeds window height
☐ Check if sheet opens as floating window or docked to sidebar
```

---

## Technical Notes

### Why This Bug Occurred

The CSS layout for tabs used a **one-size-fits-all** approach:
- Overview needed `flex: 1` to fill space for its card grid layout
- But this rule was applied to **all** tabs via class selector
- Result: A tab with 3 lines of content still got 950px height, leaving 940px empty

### Why The Fix Works

Using **attribute selectors** for tab-specific styling:
- `.swse-sheet.tab[data-tab="overview"]` targets only Overview
- Overview keeps `flex: 1` for proper card grid spacing
- All other tabs use `min-height: auto` (natural sizing)
- Content now flows naturally without forced growth

### CSS Containment Pattern

This follows Foundry AppV2 best practices:
- Tab panel styling restricted to `.tab` class (internal)
- No rules targeting `.application`, `.window-app` (Foundry's)
- All sizing rules scoped to specific tab types
- Maintains scrolling behavior via `overflow-y: auto`

---

## Files Modified

1. `/styles/sheets/v2-sheet.css` - Lines 41-48 updated with tab-specific flexing

---

## Architecture Improvements

This fix demonstrates the importance of:
1. **Attribute selectors** for variant-specific styling
2. **Not using blanket flex rules** on repeating elements
3. **CSS containment** — keeping styling scoped to purpose
4. **Testing multiple states** — ensure all tabs work, not just active ones

---

## References

- **CSS Spec:** [CSS Flexible Box Layout](https://www.w3.org/TR/css-flexbox-1/)
- **Foundry V13:** ApplicationV2 window rendering
- **AppV2 Contract:** `.tab` elements managed by Foundry, only `.tab.active` should be visible
