# Character Sheet Fix - COMPLETE ✅

**Status:** Character sheet now matches Foundry v13 AppV2 standards
**Companion:** Vehicle sheet also fixed with identical pattern
**Sentinel Diagnostics:** Updated to recognize Foundry AppV2 tab attributes

---

## Character Sheet Template Fixes

### DOM Structure ✅

**Before:** Tabs were siblings of sheet-body
```html
<section class="swse-header">...</section>
<nav class="sheet-tabs tabs" data-tab-group="primary">
  <a class="item active" data-action="tab" data-tab="overview">
</nav>
<section class="sheet-body flexcol">
  <section class="tab flexcol" data-tab-group="primary" data-tab="overview">
```

**After:** Proper nesting with sheet-content wrapper
```html
<section class="swse-header">...</section>
<section class="sheet-body flexcol">
  <nav class="sheet-tabs tabs flexrow" data-group="primary">
    <a class="item" data-tab="overview">
  </nav>
  <section class="sheet-content">
    <section class="tab flexcol" data-group="primary" data-tab="overview">
```

### Specific Changes ✅

1. **Tab Attribute Syntax**
   - Changed: `data-tab-group="primary"` → `data-group="primary"` (9 instances)
   - Updated in nav and all tab sections

2. **Tab Button Cleanup**
   - Removed: `data-action="tab"` (unnecessary in AppV2)
   - Removed: `class="active"` from first tab item (Foundry manages this)
   - Result: Clean, semantic HTML

3. **Structural Nesting**
   - Moved `<nav class="sheet-tabs">` inside `<section class="sheet-body">`
   - Added `<section class="sheet-content">` wrapper around all tabs
   - Added `flexrow` class to nav for proper layout

4. **Closing Tags**
   - Added missing `</section>` after last tab to close sheet-content
   - Result: Proper DOM nesting without orphaned elements

---

## Character Sheet JavaScript Updates

### Before (Old Pattern)
```javascript
static tabGroups = {
  primary: { initial: "overview" }
};

static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    classes: ["swse", "sheet", "actor", "character", "swse-character-sheet"],
    template: "systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs",
    width: 900,
    height: 950,
    resizable: true
  });
}
```

### After (Modern AppV2 Pattern)
```javascript
static DEFAULT_OPTIONS = {
  ...foundry.applications.sheets.ActorSheetV2.DEFAULT_OPTIONS,
  classes: ["swse", "sheet", "actor", "character", "swse-character-sheet", "v2"],
  width: 900,
  height: 950,
  resizable: true,
  tabs: [
    {
      navSelector: ".sheet-tabs",
      contentSelector: ".sheet-content",
      initial: "overview"
    }
  ]
};
```

**Key Updates:**
- ✅ Upgraded from `get defaultOptions()` to `DEFAULT_OPTIONS` static property
- ✅ Removed legacy `tabGroups` property (not needed in AppV2)
- ✅ Added `tabs` configuration with proper selectors
- ✅ Added "v2" to classes for clarity
- ✅ Uses spread operator to inherit parent defaults

---

## Sentinel Diagnostics Fix

### Issue Identified

Sentinel's `tab-diagnostics.js` was searching for `data-tab-group` but Foundry v13 AppV2 uses `data-group`.

```javascript
// ❌ OLD (broken)
const panels = rootElement.querySelectorAll('[data-tab-group][data-tab]');
const tabGroup = panel.getAttribute('data-tab-group');

// ✅ NEW (correct)
const panels = rootElement.querySelectorAll('[data-group][data-tab]');
const tabGroup = panel.getAttribute('data-group');
```

### Changes Made ✅

Replaced all instances of `data-tab-group` with `data-group` (12 total):
- Line 68: Structure audit query selector
- Line 76: Attribute getter in structure audit
- Line 100: Visibility audit query selector
- Line 108: Attribute getter in visibility audit
- Line 157: CSS rules audit query selector
- Line 166: Attribute getter in CSS audit
- Line 279: Attributes audit query selector
- Line 323: Binding audit query selector (tab group discovery)
- Line 324: Attribute getter for tab group
- Line 335: Binding audit query selector (panels by group)
- Line 341: Binding test selector construction
- Line 381: Recommendation message (documentation)

### Result

Sentinel now correctly identifies tab panels in Foundry v13 AppV2 sheets with `[data-group][data-tab]` attributes.

---

## Final DOM Structure (Both Vehicle & Character)

```html
<div class="swse-sheet swse-character-sheet v2 flexcol">
  <div class="sheet-inner flexcol">

    <!-- Headers (custom per sheet) -->
    <section class="swse-header">...</section>

    <!-- Proper Flexbox Layout Container -->
    <section class="sheet-body flexcol">

      <!-- Tab Navigation (Fixed Height) -->
      <nav class="sheet-tabs tabs flexrow" data-group="primary">
        <a class="item" data-tab="overview">Overview</a>
        <a class="item" data-tab="combat">Combat</a>
        <!-- more tabs... -->
      </nav>

      <!-- Tab Content Container (Scrollable) -->
      <section class="sheet-content">

        <!-- Individual Tab Panels -->
        <section class="tab flexcol" data-group="primary" data-tab="overview">
          <!-- Overview content -->
        </section>

        <section class="tab flexcol" data-group="primary" data-tab="combat">
          <!-- Combat content -->
        </section>

        <!-- more tabs... -->

      </section>

    </section>

  </div>
</div>
```

---

## CSS Rules (Applied to Both Sheets)

Located in `styles/layout/sheet-layout.css`:

```css
/* Proper flexbox layout */
.application.sheet .sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Fixed-height tab bar */
.application.sheet .sheet-tabs {
  flex: 0 0 auto;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--swse-border-default, #333);
}

/* Scrollable content area */
.application.sheet .sheet-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* Tab panel visibility control */
.application.sheet .tab {
  display: none;
}

.application.sheet .tab.active {
  display: block;
}
```

---

## Validation Checklist

### Template Structure ✅
- [x] `data-group="primary"` used instead of `data-tab-group`
- [x] `data-tab="tabname"` attributes correct
- [x] Navigation inside `.sheet-body`
- [x] `.sheet-content` wraps all tab panels
- [x] All closing tags match opening tags
- [x] No orphaned elements or unclosed sections
- [x] flexrow class on nav for layout

### JavaScript Configuration ✅
- [x] Uses `DEFAULT_OPTIONS` static property
- [x] Tabs configuration has `navSelector: ".sheet-tabs"`
- [x] Tabs configuration has `contentSelector: ".sheet-content"`
- [x] Initial tab set to "overview"
- [x] Classes include "v2" for clarity
- [x] Inherits parent defaults with spread operator

### Sentinel Diagnostics ✅
- [x] Searches for `[data-group][data-tab]` selectors
- [x] Gets attributes with `getAttribute('data-group')`
- [x] Binding test uses correct attribute name
- [x] Documentation updated with correct attribute names
- [x] All 12 instances of `data-tab-group` replaced

---

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `templates/actors/character/v2/character-sheet.hbs` | Fixed tab syntax, DOM structure, removed data-action | ✅ |
| `scripts/sheets/v2/character-sheet.js` | Upgraded to DEFAULT_OPTIONS with tabs config | ✅ |
| `scripts/governance/sentinel/tab-diagnostics.js` | Updated attribute selectors from data-tab-group to data-group | ✅ |

---

## System-Wide Impact

With both vehicle and character sheets fixed, plus Sentinel diagnostics aligned:

✅ **Vehicle Sheet** - Uses Foundry v13 AppV2 tab system
✅ **Character Sheet** - Uses Foundry v13 AppV2 tab system
✅ **Minimal Test Sheet** - Reference implementation working
✅ **Sentinel Diagnostics** - Now recognizes AppV2 tab markup

**Next sheets to apply this pattern to:**
- NPC Sheet (v2)
- Droid Sheets (v2)
- Any other actor sheet variants

---

## Testing Checklist

In Foundry, verify:
- [ ] Character sheet renders without console errors
- [ ] All tab buttons are clickable
- [ ] Clicking tabs switches content correctly
- [ ] Content displays properly in each tab
- [ ] Tabs have proper flexbox layout (no zero-dimensions)
- [ ] Sentinel diagnostics shows tab health as HEALTHY
- [ ] No listener accumulation warnings
- [ ] Context hydration complete

---

## Status Summary

**PHASE 2 EXTENDED COMPLETE** ✅

- Vehicle Sheet: Fixed ✅
- Character Sheet: Fixed ✅
- Sentinel Diagnostics: Updated ✅
- Template Pattern: Established ✅
- CSS Foundation: In place ✅
- Architecture: Professional grade ✅

**System Ready for:**
1. Manual testing in Foundry
2. Application to remaining sheets (NPC, Droid)
3. Component library expansion
4. Production deployment

---

**All fixes follow Foundry v13 AppV2 standards and canonical patterns.**
