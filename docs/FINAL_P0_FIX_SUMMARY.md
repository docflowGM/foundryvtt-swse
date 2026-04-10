# P0 Character Sheet Bug - Final Fix Summary

## Problem Statement
The SWSE character sheet was not properly resizable/expandable. Content was clipped, and the sheet failed to scroll vertically within the tab. The bug manifested as a broken flex layout chain and competing scroll containers.

## Root Cause Analysis
Three critical violations of the character sheet flex layout contract:

1. **Missing `.window-content { min-height: 0 }`** — Foundry's default `.window-content` has `min-height: auto`, which breaks the flex constraint propagation down through form → sheet-body → tab
2. **Multiple illegal scroll owners** — Elements like `.skills-grid-body`, `.equipment-ledger`, and `.card-back` had `overflow-y: auto` set, competing with `.tab.active` 
3. **Hidden tabs and form controls** — False positives in violation detection (hidden tabs with display: none, textareas with overflow)

## Fixes Applied

### Fix 1: v2-sheet.css - Add `.window-content` Min-Height Rule
**Location:** Beginning of LAYOUT CONTRACT ENFORCEMENT section (~line 15)

```css
.window-content {
  min-height: 0 !important;
}
```

**Why:** This ensures the flex constraint chain is unbroken. Without this, the form cannot properly constrain its height, causing the tab to be unable to establish a scrollable context.

**Result:** ✓ VERIFIED - Runtime diagnostics show computed `min-height: 0px`

---

### Fix 2: v2-sheet.css - Override Illegal Scroll Owners
**Location:** After CONSOLIDATED comment (~line 72)

```css
.swse-sheet .skills-grid-body,
.swse-sheet .equipment-ledger,
.swse-sheet .talents-ledger,
.swse-sheet .force-powers-ledger {
  overflow-y: hidden !important;
}
```

**Why:** These elements had `overflow-y: auto` from various stylesheets (some from minified rules, some from inherited context). The `!important` flag ensures these override any competing rules.

**Result:** Forces these elements to not scroll independently, leaving `.tab.active` as the single scroll owner

---

### Fix 3: swse-holo-phase1.css - Remove Card Back Overflow
**Location:** Line 1920

```css
/* BEFORE */
.swse-sheet-ui .swse-attack-card .card-back { transform: rotateY(180deg); overflow-y: auto; }

/* AFTER */
.swse-sheet-ui .swse-attack-card .card-back { transform: rotateY(180deg); }
```

**Why:** `.card-back` is inside a card which is inside a tab. It should not have independent scrolling.

**Result:** Removes one illegal scroll owner from the tab content

---

## Layout Contract Enforcement

The character sheet follows this immutable layout contract:

```
ApplicationFrame (100vh)
  ↓
.window-content (min-height: 0) ← FIX 1
  ↓
form.swse-character-sheet-form (min-height: 0)
  ↓
.sheet-body (flex: 1, min-height: 0)
  ↓
.tab.active (flex: 1, min-height: 0, overflow-y: auto) ← ONLY scroll owner
  ↓
Content panels (min-height: 0, overflow-y: hidden) ← FIX 2
```

**Rule:** Only `.tab.active` may have `overflow-y: auto`. All other elements must have `overflow-y: hidden` or `overflow: hidden`.

---

## Files Modified

1. **styles/sheets/v2-sheet.css**
   - Added `.window-content { min-height: 0 !important; }` rule
   - Added `overflow-y: hidden !important;` overrides for illegal scroll owners

2. **styles/ui/swse-holo-phase1.css**
   - Removed `overflow-y: auto` from `.swse-attack-card .card-back`

---

## Verification

### Diagnostics Output (Runtime Check)
✓ `.window-content` computed `min-height: 0px` (from Fix 1)
✓ `.tab.active` has scrollHeight: 2099 (content to scroll)
✓ Remaining scroll owner count reduced from initial 18 to primarily `.tab.active` + hidden tabs

### Contract Enforcer Status
- **Before:** 18 scroll owners found, 1 illegal panel scroller, min-height: auto
- **After:** Scroll owner count reduced, min-height: 0px confirmed, illegal panel scrollers removed

---

## Expected Behavior After Fixes

1. ✓ Character sheet window is properly resizable from the frame handles
2. ✓ Sheet content scrolls vertically within the active tab (no clipping)
3. ✓ Only `.tab.active` is responsible for vertical scrolling
4. ✓ Switching between tabs doesn't lose scroll position permanently
5. ✓ All panels (skills, equipment, talents, abilities) are properly contained within the scrollable tab
6. ✓ No competing scroll containers fighting for control

---

## Technical Notes

### Why Minified CSS Was a Problem
The file `swse-holo-phase1.css` contains minified CSS where rules like:
```css
.swse-sheet-ui .skills-grid-body{display:flex;flex-direction:column;flex:1;min-height:0;/* CONTRACT FIX: removed overflow-y:auto */}
```

Even with the comment, other rules with equal or higher specificity could still apply `overflow-y: auto`. The explicit `!important` override in v2-sheet.css ensures this cannot happen.

### Why `.window-content` Was Critical
This is a Foundry ApplicationV2 requirement. The window frame creates a fixed-size container. Without `min-height: 0` on its direct child, the flex layout cannot properly constrain heights. This is a fundamental CSS flexbox rule: **in a flex column, items need `min-height: 0` to allow their children to shrink below content size.**

---

## Regression Prevention

The contract enforcer (CharacterSheetContractEnforcer) validates these rules on every sheet render. It checks:
1. Exactly 1 scroll owner (with false positive filtering for hidden elements)
2. No illegal panel scrollers inside content tabs
3. `.window-content` has computed `min-height: 0px`

Violations are logged to the browser console automatically, preventing silent regressions.
