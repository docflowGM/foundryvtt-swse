# Character Sheet Flex Class Verification and Fixes

**Date:** 2026-03-14
**Issue:** Character sheet (V2) is NOT using Foundry flexcol/flexrow utility classes
**Impact:** Layout containers relying on CSS rules instead of utility classes (less robust)

---

## Current State: Missing Flex Classes

### Character Sheet V2 Template Structure

**Current (WITHOUT flex utilities):**
```html
<div class="swse-sheet swse-character-sheet v2">
  <div class="sheet-inner">
    <section class="swse-header"><!-- header --></section>
    <nav class="sheet-tabs tabs"><!-- tabs --></nav>
    <section class="sheet-body">  <!-- No flexcol! -->
      <section class="tab active"><!-- No flexcol! -->
        <div class="swse-v2-sheet-grid"><!-- Uses grid, OK -->
          <div class="swse-v2-left"><!-- No flexcol! -->
```

**Expected (WITH Foundry flex utilities):**
```html
<div class="swse-sheet swse-character-sheet v2 flexcol">
  <div class="sheet-inner flexcol">
    <section class="swse-header"><!-- header, flex: 0 --></section>
    <nav class="sheet-tabs tabs"><!-- tabs, flex: 0 --></nav>
    <section class="sheet-body flexcol">  <!-- ← Add flexcol -->
      <section class="tab active flexcol"><!-- ← Add flexcol -->
        <div class="swse-v2-sheet-grid"><!-- grid, can be in flexcol -->
          <div class="swse-v2-left flexcol"><!-- ← Add flexcol -->
```

---

## Why This Matters

### Foundry's flexcol Class
```css
/* In Foundry core */
.flexcol {
  display: flex;
  flex-direction: column;
}

.flexrow {
  display: flex;
  flex-direction: row;
}
```

These utility classes are:
- **Universally understood** in Foundry ecosystem
- **Guaranteed** to render flex layouts
- **Safer** than relying on custom CSS
- **Easier to maintain** across sheet versions

### What SWSE Does Instead
```css
/* Custom approach (less ideal) */
.swse-sheet.v2 .sheet-body {
  display: flex;
  flex-direction: column;
  /* ... custom rules ... */
}
```

**Problem:**
- If CSS file loads after template
- Or if style scoping breaks
- Flex layout silently fails
- Utility classes work because they're inline-safe

---

## Character Sheet V2: Required Changes

### Change 1: Root Sheet Container

**File:** `templates/actors/character/v2/character-sheet.hbs` (Line 1)

**Before:**
```html
<div class="swse-sheet swse-character-sheet v2">
```

**After:**
```html
<div class="swse-sheet swse-character-sheet v2 flexcol">
```

### Change 2: Sheet Inner Wrapper

**Line:** ~2

**Before:**
```html
<div class="sheet-inner">
```

**After:**
```html
<div class="sheet-inner flexcol">
```

### Change 3: Sheet Body (CRITICAL)

**Line:** ~140

**Before:**
```html
<section class="sheet-body">
```

**After:**
```html
<section class="sheet-body flexcol">
```

### Change 4: Tab Containers (ALL OF THEM)

**Lines:** ~141, ~158, ~197, ~212, ~228, ~240, ~466, ~574, ~656

**Before (each tab):**
```html
<section class="tab active" data-tab-group="primary" data-tab="overview">
<section class="tab" data-tab-group="primary" data-tab="combat">
<section class="tab" data-tab-group="primary" data-tab="skills">
<!-- ... etc ... -->
```

**After (each tab):**
```html
<section class="tab active flexcol" data-tab-group="primary" data-tab="overview">
<section class="tab flexcol" data-tab-group="primary" data-tab="combat">
<section class="tab flexcol" data-tab-group="primary" data-tab="skills">
<!-- ... etc ... -->
```

### Change 5: Left/Right Grid Columns

**Lines:** ~143, ~149 (and other grid columns)

**Before:**
```html
<div class="swse-v2-left">
<div class="swse-v2-right">
```

**After:**
```html
<div class="swse-v2-left flexcol">
<div class="swse-v2-right flexcol">
```

---

## Other Sheets to Verify

### Vehicle Sheet (v2)
**Status:** ✅ USES flexcol/flexrow correctly
```html
<div class="flexrow" style="align-items:center; gap:12px;">
  <div class="flexcol" style="gap:4px;">
```

### Droid Sheet (v2)
**Status:** Needs verification
- Check if uses flexcol/flexrow on main containers

### NPC Sheet
**Status:** Needs verification
- Check if uses flexcol/flexrow on tab containers

---

## CSS-Level Backup (For Safety)

Even with flex classes, add CSS rules as backup in `styles/sheets/v2-sheet.css`:

```css
/* Ensure flex classes work properly even if not applied */
.swse-sheet .sheet-body.flexcol,
.swse-sheet .sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.swse-sheet .tab.flexcol,
.swse-sheet .tab {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.swse-sheet .swse-v2-left.flexcol,
.swse-sheet .swse-v2-right.flexcol {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
```

This way:
- flexcol class works if applied
- CSS rules work if class missing
- Double protection = never collapse

---

## Why Foundry Uses Utility Classes

Foundry V13 moved to utility classes (flexcol, flexrow, flex, etc.) because:

1. **Certainty:** No CSS cascade issues
2. **Speed:** Rendered immediately
3. **Portability:** Works in any context
4. **Consistency:** All sheets follow same pattern
5. **Debuggability:** DevTools shows class, not guessing CSS origin

---

## Testing the Fix

### Before (Broken)
```javascript
const sheet = document.querySelector('.sheet-body');
const cs = getComputedStyle(sheet);
console.log(cs.display);  // May be "block" if CSS hasn't loaded
```

### After (Robust)
```javascript
const sheet = document.querySelector('.sheet-body');
const cs = getComputedStyle(sheet);
console.log(cs.display);  // Always "flex" because of class
```

---

## Implementation Order

1. Add flexcol to root `.swse-sheet` container
2. Add flexcol to `.sheet-body`
3. Add flexcol to all `.tab` elements
4. Add flexcol to grid column divs (`.swse-v2-left`, `.swse-v2-right`)
5. Verify all other ApplicationV2 sheets
6. Test in browser (check DevTools)
7. Run layout debugger to confirm no collapse

---

## Summary

**Problem:** Character sheet V2 template missing Foundry's standard flex utility classes

**Impact:** Layout vulnerable to CSS loading issues, less robust than Foundry standard

**Solution:** Add `flexcol` class to all flex containers in template

**Timeline:** 5 minutes to apply, immediate benefit to robustness

**Companion:** CSS rules in stylesheet as safety net

---

## File Changes Summary

| File | Change | Lines |
|------|--------|-------|
| `templates/actors/character/v2/character-sheet.hbs` | Add flexcol to containers | Multiple |
| `styles/sheets/v2-sheet.css` | Add backup CSS rules | New block |
| All other v2 sheets | Audit + add flexcol | As found |

**Total effort:** ~15 minutes
**Risk:** None (only adding classes, no structural changes)
**Benefit:** Guaranteed layout stability
