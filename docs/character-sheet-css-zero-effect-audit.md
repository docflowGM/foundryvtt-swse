# Phase 5A — Zero-Effect Applicability Audit Report

**Date:** 2026-04-10  
**Branch:** `claude/audit-css-governance-LE4YE`  
**Status:** PENDING RUNTIME VERIFICATION

---

## Executive Summary

Phase 4 CSS repairs were applied to `styles/sheets/v2-sheet.css`, but the sheet showed **zero visible change at runtime**. This audit determines why the repaired rules are not affecting the live character sheet.

**Critical Question:** Are the Phase 4 CSS rules actually reaching and matching the live DOM?

---

## SECTION 1: Probe Results

### Magenta Outline Probe (Selector Matching Test)

**Probe Rule:**
```css
.application.swse-character-sheet > .window-content > form.swse-character-sheet-form {
  outline: 4px solid magenta !important;
  outline-offset: -2px;
}
```

**Action:** Add this to v2-sheet.css (line 157) and reload Foundry.

**Expected:** A bright magenta outline appears around the form area.

**Actual Result:** _(fill in after testing)_
- [ ] **Magenta outline VISIBLE** → File is loading, selector matches ✅
- [ ] **Magenta outline INVISIBLE** → Selector does not match OR file not loading ❌

**Evidence:** _(Attach screenshot if possible)_

---

### Cyan Shadow Probe (Sheet Body Test)

**Probe Rule:**
```css
form.swse-sheet-ui .sheet-body {
  box-shadow: inset 0 0 0 3px cyan !important;
}
```

**Expected:** Cyan inset border appears around the content area.

**Actual Result:**
- [ ] **Cyan shadow VISIBLE** → Selector matches ✅
- [ ] **Cyan shadow INVISIBLE** → Selector mismatch ❌

**Evidence:** _(Attach screenshot if possible)_

---

### Lime Outline Probe (Active Tab Test)

**Probe Rule:**
```css
form.swse-sheet-ui .sheet-body > .tab.active {
  outline: 3px dashed lime !important;
  outline-offset: -1px;
}
```

**Expected:** Lime dashed outline around active tab.

**Actual Result:**
- [ ] **Lime outline VISIBLE** → Selector matches ✅
- [ ] **Lime outline INVISIBLE** → Selector mismatch ❌

**Evidence:** _(Attach screenshot if possible)_

---

### Behavioral Probe (Height Forcing Test)

**Probe Rule:**
```css
form.swse-sheet-ui .sheet-body > .tab.active {
  min-height: 300px !important;
  background: rgba(0, 255, 0, 0.02) !important;
}
```

**Expected:** Active tab appears noticeably taller (min-height forces at least 300px height), light green background visible.

**Actual Result:**
- [ ] **Tab is taller** → CSS is applied ✅
- [ ] **Tab unchanged** → CSS not applied ❌

**Evidence:** _(Attach screenshot if possible)_

---

## SECTION 2: Live DOM Chain Verification

### Required DOM Elements (Verify Existence)

Use DevTools Inspector. For each element, record:
1. **Exists?** (Yes/No)
2. **Exact class list**
3. **Parent/child chain matches expected?**

| Element | Exists | Exact Classes | Parent | Notes |
|---------|--------|---------------|--------|-------|
| `.application.swse-character-sheet` | ☐ | __________ | (root) | |
| `.window-content` | ☐ | __________ | application | |
| `.swse-character-sheet-wrapper` | ☐ | __________ | window-content | |
| `form.swse-character-sheet-form` | ☐ | __________ | wrapper | |
| `section.sheet-shell` | ☐ | __________ | form | |
| `section.sheet-body` | ☐ | __________ | sheet-shell | |
| `section.tab.active` | ☐ | __________ | sheet-body | |

### Actual DOM Chain

Paste the actual chain from DevTools here:

```
(Fill in actual hierarchy)
```

### Discrepancies Found

- [ ] No discrepancies; chain matches expected structure
- [ ] **Discrepancy 1:** _(describe)_
- [ ] **Discrepancy 2:** _(describe)_

---

## SECTION 3: Loaded Stylesheet Verification

### CSS Files Loaded?

Use DevTools **Sources > Network > Filter CSS** or **Application > Stylesheets**.

| File | Loaded? | Contains Phase 4 Changes? | Last Loaded (approx) |
|------|---------|--------------------------|----------------------|
| `v2-sheet.css` | ☐ | ☐ | __________ |
| `character-sheet.css` | ☐ | N/A | __________ |
| `character-sheet-overflow-contract.css` | ☐ | ☐ | __________ |

### v2-sheet.css Content Verification

Run in DevTools console:

```javascript
// Check if v2-sheet.css is loaded
const sheets = document.styleSheets;
let v2Found = false;
for (let sheet of sheets) {
  if (sheet.href && sheet.href.includes('v2-sheet.css')) {
    v2Found = true;
    console.log('v2-sheet.css loaded:', sheet.href);
    // Try to read a rule (browsers block this for CORS, so this may fail)
    try {
      console.log('First 5 rules:', Array.from(sheet.cssRules).slice(0, 5));
    } catch (e) {
      console.log('Cannot read rules (CORS protected), but file is loaded');
    }
  }
}
console.log('v2-sheet.css found:', v2Found);
```

**Result:** _(Paste console output)_

---

### File Content Check

In DevTools **Sources tab**, navigate to the CSS file and verify it contains Phase 4 changes:

**Look for these lines:**
- `flex: 1 1 0%;` on `.form.swse-character-sheet-form`
- `height: 100%;` on the form selector
- `overflow: hidden;` on `.sheet-body`

**Screenshot of v2-sheet.css in Sources:** _(Attach)_

---

## SECTION 4: Winning Rule Capture

### Inspected Element Properties

Open DevTools Inspector. Click on each element and record the **computed value** and **winning rule**.

#### Element 1: form.swse-character-sheet-form

**Property:** `flex`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)
- Losing Rules: __________, __________

**Property:** `display`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

**Property:** `height`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

**Property:** `min-height`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

**Property:** `overflow`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

---

#### Element 2: .sheet-body

**Property:** `flex`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

**Property:** `display`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

**Property:** `overflow`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

---

#### Element 3: .tab.active

**Property:** `flex`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

**Property:** `overflow-y`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

**Property:** `overflow-x`
- Computed Value: __________
- Winning Rule: __________ (selector: __________, file: __________)

---

## SECTION 5: Sheet Runtime Identity

### Sheet Class Verification

Run in DevTools console:

```javascript
// Find the sheet application instance
const sheetApp = ui.windows[Object.keys(ui.windows)[0]];
console.log('Sheet class:', sheetApp?.constructor.name);
console.log('Sheet template:', sheetApp?.template);
console.log('Actor type:', sheetApp?.actor?.type);
console.log('Is character?', sheetApp?.actor?.type === 'character');

// Also check the DOM
const appRoot = document.querySelector('[class*="swse-character-sheet"]');
console.log('App element classes:', appRoot?.className);
console.log('Expected class found:', appRoot?.classList.contains('swse-character-sheet'));
```

**Result:** _(Paste console output)_

---

**Verified Details:**
- [ ] Sheet class is `SWSEV2CharacterSheet` (or similar expected class)
- [ ] Template is `/templates/actors/character/v2/character-sheet.hbs`
- [ ] Actor type is `character` (not `npc` or `droid`)
- [ ] App element has `swse-character-sheet` class

**Discrepancies:**
- [ ] None; sheet identity confirmed
- [ ] **Issue:** _(describe)_

---

## SECTION 6: Hard Reload / Cache Verification

### Cache Clearing Actions Taken

- [ ] Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- [ ] Closed browser DevTools and reopened
- [ ] Cleared site data (DevTools > Application > Clear site data)
- [ ] Reloaded Foundry page completely
- [ ] Restarted Foundry server

**After cache clear, re-run probe tests:** 
- [ ] Probes now visible (problem was cache)
- [ ] Probes still invisible (problem is not cache)

---

## SECTION 7: Final Diagnosis

### Choose ONE Diagnosis

Based on the evidence above, select the root cause:

- [ ] **NOT_LOADED**
  - Evidence: v2-sheet.css not found in network requests OR does not contain Phase 4 changes
  - Action: Verify file is in system.json and syntax is valid

- [ ] **SELECTOR_MISMATCH**
  - Evidence: Magenta/cyan/lime probes are invisible, but v2-sheet.css is loaded
  - Action: The actual DOM structure differs from selector assumptions
  - Specific mismatch: __________

- [ ] **OVERRIDDEN_AT_RUNTIME**
  - Evidence: Probes are visible BUT Phase 4 height rules still lose to another rule
  - Action: Find which rule is still winning (check "Styles" panel in DevTools)
  - Winning rule details: __________

- [ ] **WRONG_SHEET_PATH**
  - Evidence: Sheet class is not `SWSEV2CharacterSheet` OR actor type is not `character`
  - Action: Test with a different actor type
  - Actual sheet: __________

- [ ] **STALE_ASSET**
  - Evidence: Probes visible and properties show correct values after hard refresh
  - Action: Browser/Foundry cache was serving old file
  - Resolved: [ ] Yes [ ] No

- [ ] **MIXED_CAUSE**
  - Evidence: Multiple issues found
  - Details: __________

---

## SECTION 8: Next Action (If Failed)

If the diagnosis is **not PASS**, define the exact next repair target:

**Identified Problem:**
> _(Describe the single most likely cause in one sentence)_

**Exact Next Fix:**
> _(Describe the exact change needed: which selector, which property, which file, which line)_

**Why This Happened:**
> _(Explain why Phase 4 had zero effect)_

---

## Completion Checklist

- [ ] All 4 probes tested (magenta, cyan, lime, behavioral)
- [ ] Live DOM chain verified against template
- [ ] All 3 CSS files confirmed loaded (or intentionally not loaded)
- [ ] Winning rules captured on form, sheet-body, and active tab
- [ ] Sheet runtime identity confirmed (SWSEV2CharacterSheet + character type)
- [ ] Cache clearing attempted and results recorded
- [ ] One diagnosis selected and explained
- [ ] Next action defined (if failed)

---

## Appendix: DevTools Commands Reference

### Quick Probe Verification
```javascript
// Run after adding probes to v2-sheet.css
const form = document.querySelector('form.swse-character-sheet-form');
const body = document.querySelector('.sheet-body');
const tab = document.querySelector('.tab.active');

console.log('Form outline:', getComputedStyle(form).outline);
console.log('Body shadow:', getComputedStyle(body).boxShadow);
console.log('Tab outline:', getComputedStyle(tab).outline);
console.log('Tab flex:', getComputedStyle(tab).flex);
```

### DOM Chain Inspector
```javascript
// Trace the full chain
let el = document.querySelector('form.swse-character-sheet-form');
while (el) {
  console.log(el.tagName, el.className, {
    flex: getComputedStyle(el).flex,
    height: getComputedStyle(el).height,
    overflow: getComputedStyle(el).overflow
  });
  el = el.parentElement;
  if (!el || el === document.body) break;
}
```

### Scroll Owner Audit
```javascript
// Find all elements with scroll
const allElements = document.querySelectorAll('*');
const scrollers = [];
allElements.forEach(el => {
  const style = getComputedStyle(el);
  if ((style.overflow === 'auto' || style.overflow === 'scroll' ||
       style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight) {
    scrollers.push({
      element: el.className || el.tagName,
      overflow: style.overflow,
      overflowY: style.overflowY,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    });
  }
});
console.log('Scroll owners:', scrollers);
```

---

**End of Audit Report**
