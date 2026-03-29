# Foundry Coupling Risks & Compatibility Register

**Last Updated:** 2026-03-29
**Foundry Target:** V13+
**System:** Star Wars Saga Edition

## Purpose

This document identifies the places where the SWSE V2 character sheet makes assumptions about Foundry internals that could break with future Foundry versions or edge cases.

For each risk:
- **What could break:** The assumption being made
- **How it would present:** Symptoms when broken
- **How to check:** Test procedures for future maintenance
- **Mitigation:** What we're doing about it

---

## Risk 1: ApplicationV2 Root Element Assumptions

**Severity:** MEDIUM | **Status:** DOCUMENTED | **Mitigation:** GUARD IN PLACE

### What Could Break
ApplicationV2 doesn't guarantee `this.element` is a form or even the sheet content root. Current code assumes it can find a FORM element in the DOM hierarchy.

**File:** `character-sheet.js` lines 310-333
**Assumption:** `this.element` or `this.element[0]` will lead to or be the form

### How It Would Present
- Event listeners don't wire up (no activateListeners execution)
- Form submission doesn't work
- Button clicks don't trigger actions
- Console error: "No root element found"

### How to Check
1. Open character sheet and verify buttons work
2. Edit a field and confirm autosave triggers
3. Click action buttons (add talent, etc.)
4. Check browser console for "No root element found" error

### Mitigation
We have defensive code that tries multiple strategies for finding the form element. If Foundry V14+ changes ApplicationV2 element hierarchy, add compatibility guard accordingly.

---

## Risk 2: Form Submission Lifecycle

**Severity:** MEDIUM | **Status:** DOCUMENTED | **Mitigation:** GUARD IN PLACE

### What Could Break
The sheet uses Foundry's form submission pipeline with specific expectations about how data flows and is coerced. Type coercion depends on Foundry not stripping/modifying data unexpectedly.

**File:** `character-sheet.js` lines 46-100, 1300+

### How It Would Present
- Debounced updates don't apply (keystroke spam updates)
- Form fields get wrong values (type coercion breaks)
- Autosave doesn't work or triggers too frequently
- Number fields lose precision

### How to Check
1. Edit number fields (HP, XP, level) - verify values update correctly
2. Type rapidly in notes field - verify autosave debounces
3. Undo recent edits - verify history is correct
4. Check console for form submission warnings

### Mitigation
Explicit type coercion instead of relying on form machinery, plus manual debouncing to batch changes.

---

## Risk 3: Panel Registry/Template Coupling

**Severity:** LOW | **Status:** DOCUMENTED | **Mitigation:** REGISTRY-DRIVEN

### What Could Break
Templates include panels that are defined in PANEL_REGISTRY. If names don't match or registry changes, templates won't find data.

**File:** `character-sheet.hbs` and `PANEL_REGISTRY.js`

### How It Would Present
- Panel displays "undefined" or empty
- Console errors about missing context variables
- Specific panels work, others don't (inconsistent failures)

### How to Check
1. Verify all 18 panels render correctly
2. Check browser console for "undefined" errors
3. Run verify-panel-alignment.js and confirm 0 issues
4. Test on fresh actor creation

### Mitigation
PANEL_REGISTRY is single source of truth. Registry defines names, builders, validators match pattern `build<PanelName>` and `validate<PanelName>`.

---

## Risk 4: SVG Geometry Assumptions

**Severity:** LOW | **Status:** DOCUMENTED | **Mitigation:** CSS VARIABLES

### What Could Break
Panel layout relies on SVG backgrounds and CSS geometry variables. If SVG assets move or CSS variables conflict, layout breaks.

**File:** `styles/core/svg-geometry.css`

### How It Would Present
- SVG backgrounds don't load (404 errors)
- Positioned elements appear in wrong locations
- Text overlaps SVG graphics
- CSS specificity conflicts

### How to Check
1. Load character sheet - verify SVG backgrounds load
2. Check Network tab - no 404s for SVG files
3. Inspect elements - verify geometry variables apply
4. Test different window sizes

### Mitigation
CSS custom properties instead of hardcoded values. Only CSS needs updating if SVG assets move.

---

## Risk 5: Post-Render DOM Structure Assumptions

**Severity:** MEDIUM | **Status:** DOCUMENTED | **Mitigation:** SELECTOR-BASED

### What Could Break
PostRenderAssertions check for specific DOM elements. If templates change HTML structure, selectors fail.

**File:** `scripts/sheets/v2/context/PostRenderAssertions.js`

### How It Would Present
- Post-render checks fail silently
- Structure issues don't get caught in normal mode
- Template change breaks assertion without obvious error

### How to Check
1. Open sheet in strict mode - verify no assertion errors
2. Inspect DOM for expected panels
3. Verify `.swse-panel` elements have correct IDs
4. Check `.ledger-row` elements have `data-item-id`

### Mitigation
Registry-driven selectors that can be updated in one place within PANEL_REGISTRY definitions.

---

## Risk 6: Lazy Panel Building Invalidation

**Severity:** MEDIUM | **Status:** DOCUMENTED | **Mitigation:** TYPE-BASED INVALIDATION

### What Could Break
PanelVisibilityManager decides when panels are stale. If invalidation rules are incomplete, stale data could be served to users.

**File:** `scripts/sheets/v2/PanelVisibilityManager.js`

### How It Would Present
- User adds item, switches tabs, old list shown
- User adds talent, count doesn't update
- Cache gets out of sync with data
- Changes don't appear until forced rerender

### How to Check
1. Add item, immediately switch tabs - verify appears
2. Add talent, switch tabs - verify count updates
3. Edit armor, switch tabs - verify changes show
4. Test rapid tab switching

### Mitigation
Track which panel types depend on which data types. When data changes, invalidate dependent panels automatically.

---

## Risk 7: Actor Update Timing

**Severity:** LOW | **Status:** DOCUMENTED | **Mitigation:** CONSERVATIVE APPROACH

### What Could Break
Sheet rerenders when actor changes. If async updates occur out of order, derived data could be stale.

**File:** `character-sheet.js`

### How It Would Present
- Inconsistent derived values
- Defensive numbers don't add up
- Flickering between intermediate states
- Occasionally stale data briefly visible

### How to Check
1. Perform complex edits - verify no intermediate renders
2. Use autosave - verify values stay consistent
3. Undo/redo - verify no stale renders
4. Test batch updates

### Mitigation
Use actor.system as source of truth directly, not local caches. All builders access system fresh.

---

## Risk 8: Render Loop Prevention

**Severity:** HIGH | **Status:** DOCUMENTED | **Mitigation:** GUARD IN PLACE

### What Could Break
Sheet blocks render() if called recursively. If legitimate nested renders get blocked, data could lag.

**File:** `character-sheet.js` lines 234-237

### How It Would Present
- "Render called while already rendering — BLOCKED" messages in console
- Data seems frozen during bulk operations
- Sheet unresponsive to changes
- Users see blocke messages

### How to Check
1. Perform bulk edits - verify no "BLOCKED" messages
2. Check console during normal use
3. Test batch updates
4. Use update dialogs

### Mitigation
Conservative guard with debounced form submission to batch changes and prevent loops.

---

## Risk 9: Conditional Panel Visibility

**Severity:** LOW | **Status:** DOCUMENTED | **Mitigation:** CONDITION-BASED

### What Could Break
Conditional panels (force powers for non-force-sensitive) won't build. If conditions are incomplete, wrong panels show.

**File:** `PanelVisibilityManager.js`

### How It Would Present
- Force panel shows for non-force-sensitive character
- Starship maneuvers appear for non-vehicles
- After type change, old panels still visible

### How to Check
1. Load non-force-sensitive character - no force panel
2. Set forceSensitive = true - panel appears on rerender
3. Load vehicle actor - starship maneuvers visible
4. Load non-vehicle - panel hidden

### Mitigation
Conditions re-evaluated on every render based on current actor state.

---

## Risk 10: CSS/Layout Brittleness

**Severity:** LOW | **Status:** MITIGATED | **Mitigation:** CSS VARIABLES

### What Could Break
Hard-coded pixel values or layout assumptions could break with Foundry changes. Inline styles create specificity issues.

**File:** Various CSS and template files

### How It Would Present
- Elements overlap unexpectedly
- Scroll areas don't work
- Responsive design breaks
- CSS conflicts

### How to Check
1. Open on 800x600 - verify readable
2. Open on ultrawide - verify centered
3. Test with custom CSS
4. Inspect for inline styles

### Mitigation
Use CSS custom properties for geometry, avoid inline styles, use modern layout (Grid/Flexbox).

---

## Maintenance Checklist

**Before Foundry V14 Upgrade:**
- [ ] Test with V14 beta
- [ ] Check for "BLOCKED" render messages
- [ ] Verify form submission works
- [ ] Check console for warnings
- [ ] Test element discovery code
- [ ] Run full test suite

**Quarterly Maintenance:**
- [ ] Review panel diagnostics
- [ ] Check performance
- [ ] Verify cache invalidation
- [ ] Test fresh actor creation
- [ ] Run extension examples

**On Template Changes:**
- [ ] Verify PostRenderAssertions pass
- [ ] Check panel selectors match DOM
- [ ] Test visibility conditions
- [ ] Update CSS if needed

---

## Resources

- **SWSE Character Sheet Architecture:** See SHEET_MANIFEST.md
- **Panel Contracts:** See PanelTypeDefinitions.js and PANEL_REGISTRY.js
- **Performance Tracking:** See PanelDiagnostics.js
- **Phase 6 Audit:** See PHASE_6_AUDIT.md

