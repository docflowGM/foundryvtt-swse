# Species Step Fix — Root Cause Analysis

**Status:** Restoring functional stability (not a redesign)
**Date:** April 6, 2026

## Critical Issues Found

### 1. **Visual Breakage: Large SVG Frame Overlays Row Content**
**File:** `styles/progression-framework/steps/species-step.css`
**Lines:** 55, 83, 89, 96, 104
**Severity:** CRITICAL — Makes rows unreadable

**Root Cause:**
Species rows use `.prog-species-row` with the large angled option frame SVG:
- `swse-angled-option-frame.svg` (960×220 nominal viewBox)
- This is a full-size card frame meant for expanded layouts
- Applied directly to compact 64px rows with padding of only 12px 32px
- SVG chrome overlays and obscures: name, stats, source, thumbnail

**Evidence:**
```css
.prog-species-row {
  min-height: 64px;                    /* compact row height */
  background-image: url('/systems/foundryvtt-swse/assets/ui/chargen/swse-angled-option-frame.svg');
  padding: 12px 32px;                  /* insufficient for oversized SVG */
}
```

**Solution:**
Migrate to shared `.swse-option-card` pattern with `.swse-option-card--compact` variant which:
- Uses `swse-angled-option-frame-compact.svg` (optimized for dense layouts)
- Proper padding: 12px 16px
- Content properly positioned with `z-index: 1` on child elements

---

### 2. **Asset Path 404 Errors**
**Files:**
- `styles/progression-framework/steps/species-step.css` (lines 55, 83, 89, 96, 104)
- `styles/progression-framework/utility-bar.css` (lines 59, 85)

**Severity:** HIGH — Prevents SVG assets from loading

**Root Cause:**
Absolute paths starting with `/systems/foundryvtt-swse/...` are incorrect for:
- FoundryVTT dev/test environments where system path prefix is different
- Relative paths are more portable

**Current (Broken):**
```css
/* From species-step.css */
background-image: url('/systems/foundryvtt-swse/assets/ui/chargen/swse-angled-option-frame.svg');

/* From utility-bar.css */
background-image: url('../../../assets/ui/chargen/search-box.svg');  /* goes UP TOO FAR */
```

**Directory Structure:**
```
/foundryvtt-swse/
  /assets/ui/chargen/
  /styles/
    /progression-framework/
      /steps/
        species-step.css
      utility-bar.css
```

**Correct Relative Paths:**
- From `styles/progression-framework/steps/species-step.css` → `../../assets/ui/chargen/`
- From `styles/progression-framework/utility-bar.css` → `../../assets/ui/chargen/`

**Note:** This will be fixed as part of migration to shared card styling (species-step.css will use class selectors instead of direct URLs).

---

### 3. **Focus Logic Cannot Find Parent Row**
**File:** `scripts/apps/progression-framework/shell/progression-shell.js`
**Line:** 1631
**Severity:** CRITICAL — Details panel won't hydrate if user clicks child elements

**Root Cause:**
```javascript
async _onFocusItem(event, target) {
  const plugin = this.stepPlugins.get(this.steps[this.currentStepIndex]?.stepId);
  if (plugin) {
    await plugin.onItemFocused(target.dataset.itemId, this);  // ← BROKEN
  }
}
```

If user clicks on:
- Species name (`.prog-species-row__name`)
- Stats line (`.prog-species-row__stats`)
- Thumbnail (`.prog-species-row__thumb`)
- Source badge (`.prog-species-row__source`)

Then `target` is the clicked child element, NOT the row container. The child has no `[data-item-id]`, so `target.dataset.itemId` is `undefined`.

**Solution:**
Find closest parent with `[data-item-id]`:
```javascript
const row = target.closest('[data-item-id]');
const itemId = row?.dataset.itemId;
```

---

### 4. **Search Logic Too Strict (Wildcard Support Missing)**
**File:** `scripts/apps/progression-framework/steps/species-step.js`
**Line:** 651
**Severity:** MEDIUM — Search works for substring but no wildcard support

**Root Cause:**
Current implementation only does literal substring matching:
```javascript
filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
```

Requirements state:
- Wildcard mode **only when `*` is present** in query
- Otherwise use case-insensitive substring search

**Solution:**
Enhance to support both modes:
```javascript
if (this._searchQuery.includes('*')) {
  // Wildcard regex mode
  const pattern = this._searchQuery.replace(/\*/g, '.*');
  const regex = new RegExp(`^${pattern}$`, 'i');
  filtered = filtered.filter(s => regex.test(s.name));
} else {
  // Substring mode
  filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
}
```

---

### 5. **Dropdown State Lost on Rerender**
**File:** `scripts/apps/progression-framework/shell/utility-bar.js`
**Lines:** 67–83 (afterRender method)
**Severity:** MEDIUM — Sort and stat dropdowns reset after filter applied

**Root Cause:**
`afterRender()` restores filter chips and search input but NOT:
1. Sort dropdown value
2. Stat dropdowns (bonus-stat, penalty-stat)

```javascript
afterRender(regionEl) {
  if (!regionEl) return;
  this._cleanup();
  this._wireEvents(regionEl);

  // Restores filter chips ✓
  // Restores search input ✓
  // Does NOT restore sort dropdown ✗
  // Does NOT restore stat dropdowns ✗
}
```

When user changes a dropdown, the search fires and shell re-renders. UtilityBar.afterRender() is called but the dropdown element has been recreated in the DOM with no value set.

**Solution:**
Add restoration code:
```javascript
// Restore sort dropdown
const sortEl = regionEl.querySelector('[data-utility-sort]');
if (sortEl && this._sortValue) sortEl.value = this._sortValue;

// Restore stat dropdowns
regionEl.querySelectorAll('[data-utility-select]').forEach(dropdown => {
  const id = dropdown.dataset.utilitySelect;
  const value = this._filterState[id];
  if (value) dropdown.value = value;
});
```

---

## Impact Map

| Issue | Species Rows | Details Panel | Search/Filter | User Experience |
|-------|---|---|---|---|
| SVG Overlay | BROKEN | Can't see row to click | N/A | Rows unreadable |
| Asset 404s | BROKEN | N/A | Some controls missing SVG | Visual degradation |
| Focus logic | Indirect | BROKEN | N/A | Can't preview after clicking child |
| Search wildcard | N/A | N/A | Partial | Can't use regex patterns |
| Dropdown state | N/A | N/A | Broken UX | Filters reset after each search |

---

## Fix Sequence (Dependency Order)

1. **Migrate species-step.css to shared card styling**
   - Removes broken SVG overlay
   - Automatically fixes asset paths (uses shared stylesheet)
   - Enables readable rows

2. **Fix utility-bar.css asset paths**
   - Ensures search/filter controls display correctly

3. **Harden focus logic**
   - Enables details panel hydration on child element clicks

4. **Add wildcard search support**
   - Enables advanced search patterns

5. **Restore dropdown state**
   - Stabilizes filter UX across rerenders

---

## Shared Card Pattern Reference

The existing `option-cards.css` defines `.swse-option-card` and `.swse-option-card--compact`:
- Compact variant: 80px min-height, 12px 16px padding
- Uses compact SVG frame asset
- Content enforced with `z-index: 1`
- Proper state management (focused, selected, locked, recommended)

This pattern is already in use in other steps and is proven stable.
