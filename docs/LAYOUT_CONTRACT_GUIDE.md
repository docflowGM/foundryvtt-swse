# SWSE Layout Contract Validator Guide

**Date:** 2026-03-14
**Status:** Layout contract system fully implemented and ready to use

---

## Overview

The layout contract system is a machine-readable specification of CSS layout invariants for Foundry V13 sheets. Instead of saying "something is wrong," Sentinel now says exactly which rule is violated and why.

**Three-module system:**

1. **sentinel-layout-contract.js** — Machine-readable contract definition
2. **sentinel-layout-evaluator.js** — Runtime rule validator
3. **sentinel-css-contract.js** (existing) — CSS property verification

---

## What The Contract Does

The contract defines 12 layout rules that every SWSE app/sheet MUST follow:

| Rule ID | Rule | Severity | Checks |
|---------|------|----------|--------|
| `LAYOUT_ROOT_FLEX_COLUMN` | Root is flex column | High | `display: flex; flex-direction: column` |
| `LAYOUT_WINDOW_CONTENT_FLEX` | Window content supports growth | High | Flex column + `min-height: 0` |
| `LAYOUT_SHEET_BODY_GROWS` | Sheet body expands | **Critical** | `flex: 1; min-height: 0; min-width: 0` |
| `LAYOUT_TABS_NAV_FIXED` | Tabs don't consume space | Medium | `flex: 0 0 auto` |
| `LAYOUT_TAB_CONTENT_EXPANDS` | Tab wrapper expands | **Critical** | `flex: 1; min-height: 0` |
| `LAYOUT_TAB_PANEL_SCROLLABLE` | Tabs can scroll | **Critical** | `flex: 1; overflow-y: auto` |
| `LAYOUT_PARTIAL_SELF_STABLE` | Partials self-contained | Medium | `display: flex/grid` |
| `LAYOUT_DYNAMIC_SECTION_VISIBLE` | Inventory/followers visible | **Critical** | `flex: 1; min-height: 0` |
| `LAYOUT_ANCESTOR_OVERFLOW_CLIPS` | No clipping overflow | High | No `overflow: hidden` |
| `LAYOUT_FIXED_HEIGHT_STRUCTURAL` | No arbitrary heights | Medium | No `height: Xpx` |
| `LAYOUT_ABSOLUTE_STRUCTURAL_NODE` | No absolute positioning | **Critical** | `position: static` |
| `LAYOUT_MIN_WIDTH_ZERO_REQUIRED` | Horizontal shrink allowed | Medium | `min-width: 0` |

---

## Using the Contract System

### Enable Contract Validation

Add to game settings:

```javascript
game.settings.register('foundryvtt-swse', 'sentinelLayoutEvaluator', {
  name: 'Sentinel: CSS Layout Contract Validator',
  hint: 'Validate rendered sheets against Foundry V13 layout invariants',
  scope: 'world',
  config: true,
  type: Boolean,
  default: false
});
```

Then enable in-game or via:

```javascript
// In console
SentinelLayoutEvaluator.init();

// Or at game ready:
Hooks.on('renderApplicationV2', (app) => {
  if (app.constructor.name.includes('Sheet')) {
    SentinelLayoutEvaluator.validateSheet(app, app.constructor.name);
  }
});
```

### Manual Validation

```javascript
// Validate a specific sheet
const violations = SentinelLayoutEvaluator.validateSheet(
  canvas.getActiveSheet(),
  "SWSEV2CharacterSheet"
);

// Query results from Sentinel
SWSE.debug.sentinel.getReports('layout-evaluator')

// Inspect contract rules
const contract = SentinelLayoutEvaluator.getContract();
console.log(contract.rules); // All 12 rules

// Get specific rule
const rule = SentinelLayoutEvaluator.getRule('LAYOUT_SHEET_BODY_GROWS');
console.log(rule.likelyFix);
```

---

## Understanding Violation Reports

When Sentinel reports a layout violation, the payload looks like:

```javascript
{
  ruleId: "LAYOUT_TAB_PANEL_SCROLLABLE",
  ruleDescription: "Active tab panels must be able to scroll when content overflows",
  ruleCategory: "content",
  severity: "critical",
  selector: "section.tab.inventory",
  rect: { width: 612, height: 0 },
  computed: {
    display: "block",
    flexGrow: "0",
    minHeight: "auto",
    overflowY: "hidden"
  },
  violations: [
    {
      prop: "flex-grow",
      expected: ">= 1",
      actual: 0,
      severity: "high"
    },
    {
      prop: "overflowY",
      expected: ["auto", "scroll"],
      actual: "hidden",
      severity: "high"
    }
  ],
  likelyFix: {
    flex: "1",
    minHeight: "0",
    minWidth: "0",
    overflowY: "auto"
  },
  childCount: 15,
  textLength: 2847,
  app: "div.app.swse-character-sheet"
}
```

**What this tells you:**

- **Rule violated:** `LAYOUT_TAB_PANEL_SCROLLABLE`
- **Why:** Element has `flex-grow: 0` and `overflow-y: hidden`
- **Visual proof:** `height: 0` despite having 15 children
- **Fix:** Apply the `likelyFix` properties to the element

---

## Contract Evaluation Logic

When evaluating an element:

1. **Get selector** — `div.sheet-body.tab`
2. **Find matching rules** — Which rules apply to this selector?
3. **Check required properties** — Does computed style have required values?
4. **Check forbidden properties** — Does it avoid forbidden styles?
5. **Check ancestor chain** — Do parents clip with `overflow: hidden`?
6. **Escalate severity** — If `height: 0` despite children, escalate to CRITICAL

---

## Accessing the Contract Programmatically

```javascript
// Get all rules
const rules = SentinelLayoutEvaluator.getContract().rules;

// Get rules by selector
const rule = rules.filter(r =>
  r.selectors.includes('.sheet-body')
);

// Get rule details
const sheetBodyRule = SentinelLayoutEvaluator.getRule('LAYOUT_SHEET_BODY_GROWS');
console.log(sheetBodyRule.require);      // Required properties
console.log(sheetBodyRule.likelyFix);   // Suggested CSS fix

// Get base CSS that satisfies contract
const css = require('./sentinel-layout-contract.js').getBaseCSS();
console.log(css); // Print CSS to use as template
```

---

## Recommended Setup

### 1. Add Contract Setting

File: `scripts/core/settings.js`

```javascript
game.settings.register('foundryvtt-swse', 'sentinelLayoutEvaluator', {
  name: 'Sentinel: CSS Layout Contract Validator',
  hint: 'Validate sheets against Foundry V13 layout invariants',
  scope: 'world',
  config: true,
  type: Boolean,
  default: false  // Disabled by default, opt-in
});
```

### 2. Auto-Enable in Dev Mode

File: `scripts/governance/sentinel/sentinel-init.js`

```javascript
// After SentinelEngine.bootstrap():
if (game.settings.get('foundryvtt-swse', 'sentinelLayoutEvaluator') ?? false) {
  SentinelLayoutEvaluator.init();
  console.log('[SWSE Sentinel] Layout contract validator active');
}
```

### 3. Hook Into Renders

File: `scripts/sheets/v2/character-sheet.js`

```javascript
async _onRender(context, options) {
  await super._onRender(context, options);

  // Validate against contract
  if (game.settings.get?.('foundryvtt-swse', 'sentinelLayoutEvaluator') ?? false) {
    SentinelLayoutEvaluator.validateSheet(this, 'SWSEV2CharacterSheet');
  }

  // ... rest of render logic
}
```

---

## Testing the Contract

### Test Case 1: Valid Sheet (No Violations)

```html
<section class="sheet-body flexcol">  <!-- ✓ flex column -->
  <nav class="sheet-tabs">            <!-- ✓ flex: 0 -->
  <section class="tab active flexcol"> <!-- ✓ flex: 1, overflow-y: auto -->
```

**Expected:** Zero violations

### Test Case 2: Missing flex: 1

```html
<section class="sheet-body">           <!-- ✗ Missing flex: 1 -->
  <nav class="sheet-tabs">
  <section class="tab">                <!-- ✗ Missing flex: 1 -->
```

**Expected:** Two CRITICAL violations
- `LAYOUT_SHEET_BODY_GROWS`
- `LAYOUT_TAB_PANEL_SCROLLABLE`

### Test Case 3: Ancestor Overflow Clips

```html
<div style="overflow: hidden;">        <!-- ✗ Clipping -->
  <section class="tab active">
```

**Expected:** HIGH violation
- `LAYOUT_ANCESTOR_OVERFLOW_CLIPS`

### Test Case 4: Absolute Positioning

```html
<section class="sheet-body" style="position: absolute;">  <!-- ✗ Breaks layout -->
```

**Expected:** CRITICAL violation
- `LAYOUT_ABSOLUTE_STRUCTURAL_NODE`

---

## Production Checklist

- [ ] Contract setting registered
- [ ] Contract validator initializes on game ready
- [ ] Character sheet validates without violations
- [ ] All 8 tabs validate without violations
- [ ] Inventory section validates without violations
- [ ] Followers section validates without violations
- [ ] Contract disabled in production (or enable only if needed)
- [ ] Staff briefed on contract rule IDs

---

## Contract Rule Reference

### LAYOUT_ROOT_FLEX_COLUMN

**When violated:** Root app/sheet container isn't a flex column

**Impact:** All descendants can't reliably expand

**Fix:**
```css
.swse-sheet {
  display: flex;
  flex-direction: column;
  height: 100%;
}
```

### LAYOUT_SHEET_BODY_GROWS

**When violated:** Sheet body doesn't expand

**Impact:** Content area collapses, tabs invisible

**Fix:**
```css
.sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
}
```

### LAYOUT_TAB_PANEL_SCROLLABLE

**When violated:** Tab panels can't grow or scroll

**Impact:** Tab content height 0, completely invisible

**Fix:**
```css
.tab {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

### LAYOUT_DYNAMIC_SECTION_VISIBLE

**When violated:** Inventory/followers collapse

**Impact:** Lists don't render, section appears empty

**Fix:**
```css
.inventory-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
```

---

## Severity Escalation

Rules have base severity, which can escalate:

- **Low** → No escalation
- **Medium** → Escalates if element has `height: 0` despite children
- **High** → Escalates if element is invisible to user
- **Critical** → Always elevated, immediate action required

Example:
```
LAYOUT_SHEET_BODY_GROWS (high severity)
  → Element has height: 0 and 50 child elements
  → Escalates to CRITICAL (must be fixed)
```

---

## Monitoring in Production

If contract validator is enabled in production:

```javascript
// Check system health
SWSE.sentinel.health()

// Get all contract violations
SWSE.debug.sentinel.getReports('layout-evaluator')

// Get only critical violations
SWSE.debug.sentinel.getReports('layout-evaluator', 'CRITICAL')

// Export report
SWSE.debug.reporting.getFullReport()
```

---

## Next Steps

1. **Enable the setting** in your game world
2. **Open a character sheet** and trigger a render
3. **Check Sentinel reports** — should see zero violations
4. **If violations appear**, apply the `likelyFix` to CSS
5. **Re-render** to confirm violations gone
6. **Disable setting** when satisfied (or keep on for monitoring)

---

## Questions?

All contract rules are defined in `sentinel-layout-contract.js`.
All evaluation logic is in `sentinel-layout-evaluator.js`.

Both are heavily commented for customization.
