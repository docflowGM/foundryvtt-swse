# Complete Sheet Layout Audit Report

**Date:** 2026-03-14
**Scope:** All ApplicationV2 sheets and supporting CSS
**Status:** Audit complete, fixes needed

---

## Sheet Inventory

| Sheet | Template | CSS File | V2? | Status |
|-------|----------|----------|-----|--------|
| Character | character/v2/character-sheet.hbs | v2-sheet.css | ✅ | ✅ FIXED |
| Droid | droid/v2/droid-sheet.hbs | droid-sheet.css | ✅ | ❌ NEEDS FIX |
| Vehicle | vehicle/v2/vehicle-sheet.hbs | vehicle-sheet.css | ✅ | ❌ NEEDS FIX |
| NPC | npc/v2/npc-sheet.hbs | (unified) | ✅ | ❌ NEEDS FIX |
| NPC Combat | npc/v2/npc-combat-sheet.hbs | (unified) | ✅ | ❌ NEEDS FIX |

---

## Layout Contract Requirements

Every sheet MUST have these flexcol classes on structural containers:

| Element | flexcol? | Why |
|---------|----------|-----|
| Root `.swse-sheet` | YES | Must be flex column root |
| `.sheet-inner` | YES | Flex column wrapper |
| `.sheet-body` | YES | Primary growing container |
| `.tab` | YES | Tab panels must scroll |
| `.swse-v2-left` | YES | Grid columns |
| `.swse-v2-right` | YES | Grid columns |

Every sheet MUST have CSS rules supporting these (as backup):

| Property | Location | Required |
|----------|----------|----------|
| `display: flex; flex-direction: column;` | Root, sheet-body, tabs | YES |
| `flex: 1;` | sheet-body, tabs | YES |
| `min-height: 0;` | All flex containers | YES |
| `min-width: 0;` | Grid columns | YES |
| `overflow-y: auto;` | Tabs | YES |

---

## Detailed Audit Results

### ✅ CHARACTER SHEET (FIXED)

**Template:** `templates/actors/character/v2/character-sheet.hbs`

- ✅ Root `.swse-sheet` + flexcol
- ✅ `.sheet-inner` + flexcol
- ✅ `.sheet-body` + flexcol
- ✅ All 8 tabs + flexcol
- ✅ Grid columns + flexcol

**CSS:** `styles/sheets/v2-sheet.css`

- ✅ 60+ lines of layout contract rules
- ✅ All structural containers covered
- ✅ Backup CSS for defensive stability

**Status:** ✅ PRODUCTION READY

---

### ❌ DROID SHEET (NEEDS FIX)

**Template:** `templates/actors/droid/v2/droid-sheet.hbs`

**Current issues:**

```
Line 1:  <div class="swse swse-sheet v2">           ← Missing flexcol
Line 30: <section class="sheet-body">               ← Missing flexcol
Line 31: <section class="tab active" ...>           ← Missing flexcol
Line 44: <section class="tab" ...>                  ← Missing flexcol
Line 56: <section class="tab" ...>                  ← Missing flexcol
Line 33: <div class="swse-v2-left">                ← Missing flexcol
Line 38: <div class="swse-v2-right">               ← Missing flexcol
```

**Tabs to fix:** overview, systems, combat, skills, abilities, talents, gear, relationships, notes

**CSS:** `styles/sheets/droid-sheet.css`

- Current size: 2934 bytes
- Needs: Layout contract enforcement rules
- Status: No flex rules for structural containers

---

### ❌ VEHICLE SHEET (NEEDS FIX)

**Template:** `templates/actors/vehicle/v2/vehicle-sheet.hbs`

**Current issues:**

```
Line 1:  <div class="swse-sheet swse-vehicle-sheet v2">    ← Missing flexcol
Line 2:  <div class="sheet-inner">                          ← Missing flexcol
Line 57: <section class="sheet-body">                       ← Missing flexcol
Line 58: <section class="tab active" ...>                   ← Missing flexcol
Line 73: <section class="tab" ...>                          ← Missing flexcol
Line 60: <div class="swse-v2-left">                         ← Missing flexcol
Line 65: <div class="swse-v2-right">                        ← Missing flexcol
```

**NOTE:** Vehicle sheet uses flexcol in header (lines 36, 38, 42) but NOT in structural layout. Needs consistency.

**Tabs to fix:** overview, weapons, crew, systems

**CSS:** `styles/sheets/vehicle-sheet.css`

- Current size: 42978 bytes (largest!)
- Needs: Layout contract enforcement rules
- Status: Has vehicle-specific styles but no flex layout rules

---

### ❌ NPC SHEET (NEEDS FIX)

**Template:** `templates/actors/npc/v2/npc-sheet.hbs`

**Current issues:**

```
Line 1:  Root .swse-sheet              ← Missing flexcol
Line N:  .sheet-body                   ← Missing flexcol
Line N:  .tab panels                   ← Missing flexcol
Line N:  Grid columns                  ← Missing flexcol
```

**CSS:** Uses `unified-sheets.css` (shared)

- Already has some flex rules (unified-sheets.css)
- Needs: NPC-specific backup rules
- Status: Partial (shared foundation only)

---

### ❌ NPC COMBAT SHEET (NEEDS FIX)

**Template:** `templates/actors/npc/v2/npc-combat-sheet.hbs`

**Current issues:**

Similar to NPC sheet - structural containers missing flexcol

**CSS:** Uses `unified-sheets.css` (shared)

**Status:** Partial (shared foundation only)

---

## Summary: What Needs to Be Fixed

### Template Fixes Required

| Sheet | Root | sheet-body | Tabs | Grid Cols |
|-------|------|-----------|------|-----------|
| Character | ✅ | ✅ | ✅ | ✅ |
| Droid | ❌ | ❌ | ❌ (9) | ❌ |
| Vehicle | ❌ | ❌ | ❌ (4) | ❌ |
| NPC | ❌ | ❌ | ❌ | ❌ |
| NPC Combat | ❌ | ❌ | ❌ | ❌ |

**Total changes needed:** ~35 template locations

### CSS Fixes Required

| Sheet | CSS File | Status | Work |
|-------|----------|--------|------|
| Character | v2-sheet.css | ✅ Done | — |
| Droid | droid-sheet.css | ❌ Missing | Add 60+ lines |
| Vehicle | vehicle-sheet.css | ❌ Missing | Add 60+ lines |
| NPC | unified-sheets.css | ⚠️ Partial | Add NPC rules |
| NPC Combat | unified-sheets.css | ⚠️ Partial | Add NPC rules |

---

## Fix Order (Recommended)

### Phase 1: Droid Sheet (Quickest - Similar to Character)
1. Add flexcol to template (10 lines)
2. Add CSS backup rules to droid-sheet.css (60 lines)
3. Test all 9 tabs
4. Verify with Sentinel

### Phase 2: Vehicle Sheet (Largest)
1. Add flexcol to template (8 lines)
2. Add CSS backup rules to vehicle-sheet.css (60 lines)
3. Test all 4 tabs
4. Verify with Sentinel

### Phase 3: NPC Sheets (Shared CSS)
1. Add flexcol to npc-sheet.hbs template
2. Add flexcol to npc-combat-sheet.hbs template
3. Add NPC-specific rules to unified-sheets.css
4. Test both sheets
5. Verify with Sentinel

### Phase 4: Unified Verification
1. Run layout evaluator on all 5 sheets
2. Verify zero violations
3. Verify all tabs render
4. Verify scrolling works

---

## Base CSS to Apply

Use this template for droid-sheet.css and vehicle-sheet.css:

```css
/* ============================================================
   LAYOUT CONTRACT ENFORCEMENT — FOUNDRY V13 INVARIANTS
   These rules ensure layouts don't collapse when flexcol
   utility classes are missing from templates.
   ============================================================ */

/* Root containers */
.swse-sheet.v2 {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* Sheet inner wrapper */
.swse-sheet.v2 .sheet-inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Sheet body (primary growing container) */
.swse-sheet.v2 .sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

/* Tab navigation (fixed space) */
.swse-sheet.v2 .sheet-tabs {
  flex: 0 0 auto;
}

/* Tab panels (scrollable) */
.swse-sheet.v2 .tab {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
}

/* Grid columns (vertical flex) */
.swse-sheet.v2 .swse-v2-left,
.swse-sheet.v2 .swse-v2-right {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* Sections and panels */
.swse-sheet.v2 .swse-section,
.swse-sheet.v2 .swse-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
```

---

## Validation Checklist

After fixes applied:

- [ ] Droid sheet flexcol applied (9 tab locations)
- [ ] Droid sheet CSS added (60+ lines)
- [ ] Vehicle sheet flexcol applied (4 tab locations)
- [ ] Vehicle sheet CSS added (60+ lines)
- [ ] NPC sheet flexcol applied
- [ ] NPC combat sheet flexcol applied
- [ ] Unified-sheets.css NPC rules added
- [ ] All 5 sheets tested with SentinelLayoutEvaluator
- [ ] Zero violations reported
- [ ] All tabs render without collapse
- [ ] Scrolling works on all content areas

---

## Expected Outcome

Once complete:
- ✅ All 5 V2 sheets follow layout contract
- ✅ All use Foundry V13 flexcol utility classes
- ✅ All have CSS backup rules
- ✅ Sentinel validators pass zero violations
- ✅ No layout collapse possible
- ✅ Production-grade sheet system

---

## Size Impact

| File | Current | Added | New Total |
|------|---------|-------|-----------|
| droid-sheet.css | 2934 | ~500 | ~3400 |
| vehicle-sheet.css | 42978 | ~500 | ~43400 |
| unified-sheets.css | 8628 | ~200 | ~8800 |
| v2-sheet.css | 14295 | (done) | 14295 |

**Total CSS additions:** ~1.2 KB (negligible)
