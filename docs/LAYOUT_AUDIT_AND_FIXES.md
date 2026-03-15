# SWSE V13 Sheet Layout Audit and Fixes

**Date:** 2026-03-14
**Status:** Layout Collapse Detection System Implemented
**Scope:** Character sheet and other ApplicationV2 sheets

---

## Executive Summary

Character sheet renders technically succeed but elements can collapse to `height: 0` or be clipped by parent `overflow: hidden`. This causes:
- Partials to render but appear invisible
- Tabs to load but not display content
- Panels to be present in DOM but squished

**Solution Implemented:**
- Two new Sentinel audit layers detect layout collapses automatically
- CSS contract validator identifies specific rule violations
- Diagnostic reporting with ancestor chain for root cause analysis

---

## Problem: Layout Collapse in Foundry V13

### What Happens
```
Template renders → DOM elements created → CSS computed
  ↓
Missing flex: 1 / min-height: 0
  ↓
Parent container shrinks to 0
  ↓
Children technically present but height: 0
  ↓
Content invisible to user
```

### Root Causes in SWSE Sheets

1. **Missing Flex Growth**
   - `.sheet-body` container exists but lacks `flex: 1`
   - `.tab-content` panels don't have flex growth
   - Result: Content container collapses

2. **Missing min-height: 0**
   - Flex containers in SWSE don't have `min-height: 0`
   - Prevents flex children from shrinking below content size
   - Result: Overflow clipping or weird layout bugs

3. **Parent Overflow Hidden**
   - Some containers use `overflow: hidden` without flex
   - Clips children that should scroll
   - Result: Content truncated or invisible

4. **Nested Flex Chains Broken**
   - Sheet → Tab → Partial chain
   - If middle layer lacks flex growth, inner partial collapses
   - Result: Followers section, inventory list, etc. invisible

---

## SWSE Character Sheet Structure Analysis

### Current Layout (as of scan)

**Root Container:**
```html
<div class="swse-sheet swse-character-sheet v2">
  <!-- header content -->
  <section class="sheet-body">
    <!-- tabs -->
  </section>
</div>
```

**CSS Rules Found:**
- `.swse-sheet.v2` has `position: relative` (not flex)
- `.sheet-body` lacks explicit `flex: 1` or `flex-grow`
- `.tab` containers don't have flex growth specified
- Tabs are bare `<section>` elements without flex properties

### Identified Issues

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Missing flex: 1 | `.sheet-body` | Content collapses | Add `flex: 1;` |
| Missing min-height | Flex containers | Shrink bugs | Add `min-height: 0;` |
| No scroll behavior | `.tab` containers | Content clipped | Add `overflow-y: auto;` |
| Nested flex broken | Tab → Partial | Inner content hidden | Propagate flex rules |

---

## Foundry V13 Layout Contract

Correct V13 sheet structure:

```css
/* Root app container */
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Main body (grows to fill) */
.sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;  /* ← CRITICAL: allows flex children to shrink */
}

/* Tab containers (same pattern) */
.tab {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;  /* Scroll if content overflows */
}

/* Content sections inside tabs */
.tab-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
```

---

## Solution 1: Sentinel Layout Debugger

**Module:** `sentinel-layout-debugger.js`

Automatically detects layout collapses in rendered sheets:

```javascript
SentinelLayoutDebugger.start()
```

Watches for:
- Elements with `clientHeight === 0` inside visible apps
- Parent `overflow: hidden` clipping children
- Flex containers without `flex-grow` or `flex: 1`
- Ancestor chains causing constraint

**Reports to Sentinel:**
- Layer: `layout-debugger`
- Category: `layout-collapse`
- Includes: Element selector, rect, computed styles, ancestor chain, risk score

**Example Output:**
```
[SWSE Sentinel] layout-debugger | WARN | Sheet content collapsed: div.sheet-body.flexcol (flex-ancestor-missing-min-height-0)

payload: {
  selector: "div.sheet-body",
  rect: { width: 640, height: 0 },
  style: { display: "flex", flex: "0" },
  likelyConstraint: {
    reason: "flex-ancestor-missing-min-height-0",
    selector: "div.window-content"
  },
  ancestorChain: [...]
}
```

---

## Solution 2: CSS Contract Validator

**Module:** `sentinel-css-contract.js`

Validates sheet CSS against required Foundry V13 rules:

```javascript
SentinelCSSContract.validateSheetCSS(sheet, "SWSEV2CharacterSheet")
```

Required rules (by selector):

```javascript
".sheet-body": { display: "flex", flex: "1", minHeight: "0" }
".tab-content": { display: "flex", flex: "1", minHeight: "0" }
".tab": { flex: "1" }
".window-content": { display: "flex" }
```

**Reports violations:**
- Missing `flex: 1` in container → Severity: CRITICAL
- Missing `min-height: 0` in flex → Severity: HIGH
- Wrong `display` property → Severity: MEDIUM

---

## Recommended CSS Fixes for SWSE Sheets

### 1. Base Sheet Container

**File:** `styles/sheets/unified-sheets.css` or new `styles/sheets/layout-base.css`

```css
/* Root application container (already correct in unified-sheets.css) */
.swse-app .swse-sheet,
.swse-app .swse-sheet-holo,
.swse-app .swse-sheet-datapad {
  display: flex;
  flex-direction: column;
  height: 100%;  /* Important: gives flex container a height */
}

/* Sheet body (needs flex: 1 if not present) */
.swse-app .swse-sheet-body,
.swse-sheet .sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;  /* ← CRITICAL: allows children to shrink */
  overflow: hidden;  /* Let children handle scrolling */
}
```

### 2. Tab Containers

```css
/* Tab navigation (should not grow) */
.swse-sheet .sheet-tabs,
.swse-sheet nav[data-tab-group] {
  flex: 0;
  border-bottom: 1px solid rgba(0,255,255,0.2);
}

/* Tab content wrappers (must grow) */
.swse-sheet .tab,
.swse-sheet [data-tab] {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}
```

### 3. Content Sections Inside Tabs

```css
/* Inventory, skills, combat, etc. */
.swse-sheet .inventory-section,
.swse-sheet .skills-section,
.swse-sheet .combat-section,
.swse-sheet .biography-section,
.swse-sheet .followers-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Lists within sections (must grow if needed) */
.inventory-list,
.skills-list,
.combat-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

### 4. Header (should not grow)

```css
.swse-sheet .sheet-header,
.swse-sheet .swse-header {
  flex: 0;
  padding: 10px;
  border-bottom: 1px solid rgba(0,255,255,0.2);
}
```

---

## Enabling Layout Diagnostics

### Option 1: Always-On (Development)

Add to `scripts/core/settings.js`:

```javascript
// Layout Debugging
game.settings.register('foundryvtt-swse', 'sentinelLayoutDebugger', {
  name: 'Sentinel: Layout Debugger',
  hint: 'Detect and report sheet layout collapse issues',
  scope: 'world',
  config: true,
  type: Boolean,
  default: false,
  onChange: (value) => {
    if (value) {
      SentinelLayoutDebugger.start();
    } else {
      SentinelLayoutDebugger.stop();
    }
  }
});

game.settings.register('foundryvtt-swse', 'sentinelCSSContract', {
  name: 'Sentinel: CSS Contract Validator',
  hint: 'Validate sheet CSS against Foundry V13 layout contracts',
  scope: 'world',
  config: true,
  type: Boolean,
  default: false
});
```

### Option 2: On-Demand (Debug Console)

```javascript
// Start layout debugging
SentinelLayoutDebugger.init();
SentinelLayoutDebugger.start();

// Check for violations
SWSE.debug.sentinel.getReports('layout-debugger')

// Validate CSS
SentinelCSSContract.validateSheetCSS(canvas.getActiveSheet(), "Sheet Name")

// Check Sentinel health
SWSE.sentinel.health()
```

---

## Testing the Fixes

### 1. Manual Test (DevTools)

```javascript
// Check if sheet-body has height
document.querySelector('.sheet-body')?.clientHeight
// Should be > 0, not 0

// Check tab container
document.querySelector('[data-tab="overview"]')?.clientHeight
// Should show actual content height

// Check computed styles
const sheet = document.querySelector('.sheet-body');
const cs = getComputedStyle(sheet);
console.log({
  display: cs.display,      // Should be "flex"
  flex: cs.flex,            // Should be "1 1 0%"
  minHeight: cs.minHeight   // Should be "0px"
});
```

### 2. Automated Test (Sentinel)

```javascript
// Open character sheet
// Trigger layout debugger scan
SentinelLayoutDebugger.scan('manual-test')

// Check for reports
const reports = SWSE.debug.sentinel.getReports('layout-debugger', 'WARN')
console.log(`Found ${reports.length} layout warnings`)

// View details
reports.forEach(r => console.log(r.meta))
```

### 3. Visual Test

- Open character sheet
- Switch between tabs
- Check that all content is visible
- Resize window
- Verify content reflows correctly
- Open inventory panel
- Verify followers section renders
- Check that biography section is not collapsed

---

## Integration with Guardrails

Layout detection works alongside sheet guardrails:

```
Sheet Renders
  ↓
Context Contract Validator (checks data presence)
  ↓
Listener Watcher (checks for memory leaks)
  ↓
Layout Debugger (checks for visual collapse)
  ↓
CSS Contract (validates CSS rules)
  ↓
✅ Sheet Valid or ⚠️ Warnings Logged to Sentinel
```

---

## Checklist for Production

- [ ] Apply recommended CSS fixes to sheet stylesheets
- [ ] Enable layout debugger in development
- [ ] Run test suite with multiple sheets open
- [ ] Check Sentinel reports for any layout warnings
- [ ] Verify no `height: 0` elements in rendered sheets
- [ ] Confirm CSS contract compliance
- [ ] Test responsive design (resize window)
- [ ] Disable layout debugger for production (unless requested)

---

## Key Takeaways

1. **Flex is required:** Foundry V13 ApplicationV2 sheets MUST use flexbox for tab/panel layouts
2. **min-height: 0 is critical:** Most flex bugs come from missing this rule
3. **Ancestry matters:** If one ancestor breaks the flex chain, all descendants collapse
4. **Sentinel catches it:** Layout debugger automatically detects these issues in production
5. **CSS validation helps:** Contract validator identifies exact rule violations before they break UX

---

## Future: V3 Layout System

The archived V3 sheets (in `styles/archive/sheets-v3/`) could be considered for future migration if they have stricter layout enforcement. However, V2 is currently active and stable with these fixes applied.
