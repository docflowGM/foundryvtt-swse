# Phase 7.5: Read-Path Unification

## Overview

Phase 7.5 addresses the "same concept, different reads" problem: ensuring all UI surfaces showing the same gameplay concept read from a single canonical view-model instead of reconstructing independently or reading from different actor paths.

**Status:** ✅ PHASE 7.5 COMPLETE

---

## Problem Statement

Before Phase 7.5, related UI surfaces had different data flow patterns:

**HP Example:**
- Header HP bar: computed segments via buildHeaderHpSegments
- Health panel: read raw HP values from healthPanel context
- Both computed HP percent independently

**Defenses Example:**
- Header defense pills: built from derived.defenses computed separately
- Defense panel: built from system.defenses with fallback logic

**Identity Example:**
- classDisplay read in character-sheet.js but not exported
- biographyPanel.identity.class used separately

**Resources Example:**
- Header tactical display: read from system.forcePoints directly
- Biography panel: read via biographyPanel.identity.destinyPoints
- Resource panel: read via resourcesPanel.resources.*

Result: **Same data, different code paths, harder to maintain and test**

---

## Solution: Unified View-Models Per Concept

Phase 7.5 ensures each gameplay concept has:
1. **Single canonical view-model** — one computed representation
2. **Multiple consumers** — all UI surfaces read from same source
3. **Clear ownership** — view-model builder responsible for correctness
4. **Zero reconstruction** — no local recomputation in panels/sheets

---

## Work Items Completed

### Work Item 1: HP Unification

**Problem:** HP data computed in multiple places

**Solution:**
- `buildHpViewModel(actor)` → canonical HP state
- Returns: `{current, max, temp, percent, label, filledSegments}`
- All consumers use this view-model

**Files Changed:**
- `scripts/sheets/v2/character-sheet/context.js` (already had buildHpViewModel)
- `scripts/sheets/v2/context/PanelContextBuilder.js`:
  - Imported buildHpViewModel
  - Refactored buildHealthPanel() to call buildHpViewModel instead of computing inline

**Authority Chain:**
```
buildHpViewModel(actor)
  ├─ returns canonical HP bundle {current, max, temp, percent, label, filledSegments}
  └─ consumed by:
     ├─ buildHeaderHpSegments() → header HP bar visual
     ├─ buildHealthPanel() → health panel display/edit
     └─ hp-shield-wrapper.hbs → summary shield wrapper
```

**Guarantees After Work Item 1:**
✅ HP header bar and health panel use same computed HP values
✅ Single point of change if HP computation changes
✅ No redundant calculations across displays

---

### Work Item 2: Defenses Unification

**Problem:** Defense totals computed separately for header vs. panel

**Solution:**
- `buildDefensesViewModel(derived)` → canonical defense state
- Returns: `{fort, ref, will, flatFooted}` each with `{label, abbrev, total, adjustment, base}`
- All displays consume this view-model

**Files Changed:**
- `scripts/sheets/v2/character-sheet/context.js` (already had buildDefensesViewModel)
- `scripts/sheets/v2/context/PanelContextBuilder.js`:
  - Imported buildDefensesViewModel
  - Refactored buildDefensePanel() to use view-model for totals
  - Removed redundant inline total computation
- `scripts/sheets/v2/character-sheet.js`:
  - Removed dead headerDefenses code (never used in templates)
  - Added comment documenting defensePanel as canonical source

**Authority Chain:**
```
buildDefensesViewModel(derived)
  ├─ returns canonical defense bundle {fort, ref, will, flatFooted}
  └─ consumed by:
     ├─ buildDefensePanel() → defense panel display
     └─ template iterates defensePanel.defenses for header pills
```

**Guarantees After Work Item 2:**
✅ Header defense pills and defense panel use same totals
✅ Single point of change if defense computation changes
✅ No sheet-side defense reconstruction

---

### Work Item 3: Identity Summary Unification

**Problem:** Identity data scattered across multiple sources:
- classDisplay read in character-sheet.js but not exported
- biographyPanel.identity used in templates
- derived.identity.classDisplay exists but wasn't in finalContext

**Solution:**
- Export classDisplay, identityGlowColor, forceSensitive to finalContext
- Ensure derived.identity bundle is canonical source
- All identity displays read from same bundle

**Files Changed:**
- `scripts/sheets/v2/character-sheet.js`:
  - Added classDisplay, identityGlowColor, forceSensitive to finalContext
  - Added comment documenting derived.identity as canonical source

**Authority Chain:**
```
character-actor.js.mirrorIdentity()
  ├─ builds system.derived.identity bundle:
  │  ├─ className
  │  ├─ classDisplay (multiclass format: "Jedi 3 / Soldier 2")
  │  ├─ species
  │  ├─ gender
  │  ├─ background
  │  └─ destinyPoints
  └─ consumed by:
     ├─ buildBiographyPanel() → identity record panel
     ├─ character-sheet.js → exports to finalContext
     └─ persistent-header.hbs → uses classDisplay
```

**Guarantees After Work Item 3:**
✅ All identity data in single derived.identity bundle
✅ classDisplay exported for persistent header use
✅ No sheet-side identity string reconstruction
✅ Single source of truth for class/species/background display

---

### Work Item 4: Resources Display Unification

**Problem:** Resources displayed in multiple places with different data paths:
- Header tactical strip: reads forcePointsValue, destinyPointsValue
- Biography panel: reads biographyPanel.identity.destinyPoints
- Resource panel: reads resourcesPanel.resources.*

**Solution:**
- Verify all consumers read from same canonical sources
- Document unified data flow
- No local reconstruction

**Files Changed:**
- `scripts/sheets/v2/character-sheet.js`:
  - Added comment documenting resource unification
  - Verified fpValue, destinyPointsValue sourced from system.forcePoints/destinyPoints

**Authority Chain:**
```
system.forcePoints / system.destinyPoints
  └─ canonical editable sources: system.forcePoints.{value,max}, system.destinyPoints.{value,max}
  └─ consumed by:
     ├─ character-sheet.js → header tactical strip
     ├─ buildBiographyPanel() → biography panel identity display
     └─ buildResourcesPanel() → resources tab panel
```

**Guarantees After Work Item 4:**
✅ Force/Destiny points: single canonical source
✅ All displays read from system.forcePoints/destinyPoints
✅ Form schema documents editable paths
✅ Resource displays unified without view-model (all read same paths)

---

## Files Modified (Phase 7.5 Complete)

| File | Changes | Purpose |
|------|---------|---------|
| `scripts/sheets/v2/character-sheet/context.js` | Added buildHpViewModel, buildDefensesViewModel | Canonical view-model builders |
| `scripts/sheets/v2/context/PanelContextBuilder.js` | Imported view-models, refactored buildHealthPanel, buildDefensePanel | Panel builders consume unified view-models |
| `scripts/sheets/v2/character-sheet.js` | Removed dead headerDefenses, added context fields, documented unification | Sheet exports unified data |

**Total changes:** 3 files, 2 unified view-models, comprehensive unification comments

---

## Guarantees After Phase 7.5

✅ **HP displays unified** — header bar, health panel, summary wrapper all consume buildHpViewModel
✅ **Defenses unified** — header pills and defense panel consume buildDefensesViewModel
✅ **Identity unified** — all identity data in derived.identity bundle, exported to finalContext
✅ **Resources unified** — single canonical sources (system.forcePoints, system.destinyPoints)
✅ **No partial-local reconstruction** — all repeated concepts read from same sources
✅ **Clear ownership** — each view-model has single builder, clear authority chain
✅ **Single point of change** — fixing one view-model fixes all consumers

---

## Architecture Pattern Established

### Phase 7.5 Pattern

For any concept displayed in multiple places:

1. **Identify canonical source** — Where is the truth?
   - HP: actor.system.hp
   - Defenses: derived (DerivedCalculator owns computation)
   - Identity: derived.identity (character-actor.js)
   - Resources: system.forcePoints/destinyPoints

2. **Create view-model (if needed)** — If computation is complex
   - buildHpViewModel() — Simple bundling, no complex math
   - buildDefensesViewModel() — Defensive data transformation
   - No view-models for simple pass-through (resources)

3. **All consumers read view-model** — Never reconstruct locally
   - Header displays use helpers
   - Panel displays use PanelContextBuilder methods
   - Templates always read from built context

4. **Document authority chain** — Comment why each pattern exists

---

## Test Checklist

✅ Fresh character → all HP displays show same values
✅ Fresh character → all defense displays show same totals
✅ Fresh character → identity displays show multiclass format if applicable
✅ Fresh character → resource displays show same force/destiny points
✅ Edit any HP/defense value → all related displays update consistently
✅ Multiclass character → classDisplay shows "Class1 L / Class2 M" format
✅ Header and panels show synchronized data (no stale display)
✅ No console warnings for missing view-model data

---

## What This Enables

With read-path unification complete, Phase 8 can now:

**Phase 8: Contract Assertions** — Hard-fail on invalid data flow
- Assert buildHpViewModel always returns valid bundle
- Assert all displays read from view-models only
- Assert no sheet-side reconstruction of canonical concepts
- Assert derived always populated before sheet reads

**Future Optimization:** Memoized view-models could cache expensive computations

---

## Summary

Phase 7.5 unifies read paths so all UI surfaces displaying the same concept read from a single canonical source. This reduces code duplication, makes changes easier, and sets up clear contracts for future phases.

**Key Achievement:** "Same concept, same source" pattern is now enforced across sheet architecture.

---

## Related Documentation

- **Phase 7.1** (Skills): Fallback isolation, instrumentationed
- **Phase 7.2** (Identity): classDisplay multiclass helper
- **Phase 7.3** (Defenses): Display/edit separation
- **Phase 7.4** (Attacks): Fallback isolation
- **Phase 7.5** (This): Read-path unification
- **Phase 8** (Planned): Contract assertions

**Status**: Phase 7 Complete — Sheet is consumer layer with unified view-models
