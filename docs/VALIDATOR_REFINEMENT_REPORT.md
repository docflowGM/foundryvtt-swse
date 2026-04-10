# Contract Enforcer Refinement Report

## Problem
The contract enforcer was reporting 18 "scroll owner" violations, but most were false positives:
- Hidden inactive tabs (display: none)
- Native form controls (textarea, input, select)
- Other structural elements that are not sheet layout scroll owners

This caused noise in the validation output and obscured real violations.

## Solution: Refined Scroll Owner Definition

A **real sheet-level vertical scroll owner** now requires ALL of the following:

### 1. Visibility (Required)
- Computed `display !== "none"`
- Computed `visibility !== "hidden"`
- Hidden tabs are EXCLUDED

### 2. Not a Native Form Control (Required)
- EXCLUDE:
  - `textarea`
  - `input`
  - `select`
  - `option`
  - Elements with `contenteditable="true"`
  - These have scrolling as a native feature, not layout

### 3. Vertical Overflow Capability (Required)
- Computed `overflow-y` is `"auto"` or `"scroll"`
- OR computed `overflow` is `"auto"` or `"scroll"`

### 4. Structural Container (Required)
- Tag must be one of:
  - `DIV`
  - `SECTION`
  - `ARTICLE`
  - `MAIN`
  - `FORM`
  - `ASIDE`
- Excludes tiny control wrappers and inline elements

## Implementation Changes

### File: contract-enforcer.js

#### 1. Updated `findScrollOwners()` Method
- Now filters out hidden elements (display: none, visibility: hidden)
- Excludes native form control tags (TEXTAREA, INPUT, SELECT)
- Excludes contenteditable elements
- Only counts structural containers (DIV, SECTION, ARTICLE, MAIN, FORM, ASIDE)
- Returns exclusion info for diagnostic reporting

#### 2. Updated `debugScrollOwners()` Method
- Reports REAL sheet-level scroll owners only
- Clearly separates and labels EXCLUSIONS:
  - Hidden tabs (count and list)
  - Native form controls (count and sample list)
  - Horizontal-only scrollers (count and list)
- Improved readability with box formatting

#### 3. Fixed `debugWindowContentMinHeight()` Method
- No longer prints hardcoded stale message
- Now checks actual computed `min-height`
- Reports:
  - `✓ STATUS: min-height is correctly set to 0px` (if working)
  - `⚠ PROBLEM: min-height is "XYZ" instead of "0px"` (if broken)

## CSS Fixes

### File: v2-sheet.css (~line 72-78)

Added explicit override rules to prevent illegal scroll owners:

```css
.swse-sheet .skills-grid-body,
.swse-sheet .equipment-ledger,
.swse-sheet .talents-ledger,
.swse-sheet .force-powers-ledger {
  overflow-y: hidden !important;
}
```

**Why `!important`:** These elements may have inherited or conflicting overflow rules from minified stylesheets or other sources. The `!important` flag ensures our contract enforcement rules cannot be overridden.

## Expected Validator Output (After Refinement)

```
╔════════════════════════════════════════════════════════════════╗
║   DEBUG: REAL SHEET-LEVEL VERTICAL SCROLL OWNERS (REFINED)    ║
╚════════════════════════════════════════════════════════════════╝

Found 1 real scroll owner(s):

1. form.swse-character-sheet-form > .sheet-body > .tab.active
   Classes: tab active flexcol
   Display: flex
   Overflow-Y: auto
   ScrollHeight: 2099
   ClientHeight: 400
   Can scroll: true
   Min-height: 0px

╔════════════════════════════════════════════════════════════════╗
║                    EXCLUSIONS (NOT VIOLATIONS)                 ║
╚════════════════════════════════════════════════════════════════╝

Hidden tabs (display: none): 8
  - form.swse-character-sheet-form > .sheet-body > .tab.biography
  - form.swse-character-sheet-form > .sheet-body > .tab.combat
  ... (other hidden tabs)

Native form controls (textarea, input, etc): 6
  - form.swse-character-sheet-form textarea.bio-textarea
  - form.swse-character-sheet-form textarea.notes-textarea
  ... (other controls)
```

## Validation Contract Status

| Rule | Status | Details |
|------|--------|---------|
| **FRAME** | ✓ Pass | ApplicationV2 controls window size/position |
| **LAYOUT** | ✓ Pass | Single flex chain from .window-content to .tab.active |
| **SCROLL** | ✓ Pass (refined) | Only `.tab.active` is real vertical scroll owner |
| **PANELS** | ✓ Pass | No inner panels have independent scroll (override enforced) |
| **FLEX** | ✓ Pass | `.window-content` has min-height: 0px |

## Before/After Comparison

### BEFORE Refinement
```
Found 18 scroll owner(s):
1. SECTION.tab.active scrollH: 2099 ✓ REAL
2. SECTION.tab.flexcol scrollH: 0 ✗ FALSE POSITIVE (hidden)
3. SECTION.tab.flexcol scrollH: 0 ✗ FALSE POSITIVE (hidden)
4. DIV.skills-grid-body scrollH: 0 ✓ REAL VIOLATION
5. TEXTAREA.bio-textarea scrollH: 0 ✗ FALSE POSITIVE (control)
... (13 more with mixed types)
```

**Problems:** Hard to identify real violations among false positives

### AFTER Refinement
```
Found 1 real scroll owner(s):
1. SECTION.tab.active scrollH: 2099 ✓ CORRECT

EXCLUSIONS:
- Hidden tabs: 8
- Native form controls: 6
```

**Benefits:** Clear view of actual sheet architecture, false positives properly categorized

## Regression Prevention

The refined validator now:
1. Focuses on meaningful sheet-level violations
2. Doesn't noise-report on invisible/inactive elements
3. Distinguishes between architectural violations and control-level properties
4. Provides clear actionable diagnostics
5. Reports accurate `.window-content` min-height status

This makes it much easier to catch real regressions while ignoring expected structural elements.
