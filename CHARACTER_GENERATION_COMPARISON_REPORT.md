# Character Generation Step Comparison Report

## Overview

This report analyzes the differences between the **droid progression engine** and the **normal progression engine** character generation steps, identifying missing steps and potential issues.

---

## 1. Step Sequences Comparison

### Normal Character (Living Being) Progression

**Legacy CharacterGenerator (chargen-main.js: _getSteps() lines 451-488)**
```
1. name               (Character name input)
2. type              (Living vs Droid selection)
3. species           (Species selection for living beings)
4. abilities         (Ability score generation)
5. class             (Class selection)
6. background        (Event/Occupation/Planet background)
7. skills            (Skill training selection)
8. feats             (Feat selection)
9. talents           (Talent selection)
10. force-powers     (IF force-sensitive)
11. summary          (Character review)
12. shop             (Equipment shopping)
```

**Unified Progression Engine (progression.js: _initializeSteps() lines 38-87)**
```
1. species           (Species selection)
2. background        (Background selection)
3. attributes        (Ability scores)
4. class             (Class selection)
5. skills            (Skill training)
6. feats             (Feat selection)
7. talents           (Talent selection)
8. finalize          (Review and confirm)
```

### Droid Character Progression

**Legacy CharacterGenerator (chargen-main.js: _getSteps() lines 460-483)**
```
1. name              (Character name input)
2. type              (Living vs Droid selection)
3. degree            (Droid degree: 1st-5th degree selection)
4. size              (Droid size: tiny to colossal)
5. droid-builder     (Systems selection: locomotion, processor, appendages, accessories)
6. abilities         (Ability scores - no CON for droids)
7. class             (Class selection)
8. background        (Event/Occupation/Planet background)
9. skills            (Skill training)
10. feats            (Feat selection)
11. talents          (Talent selection)
12. force-powers     (IF force-sensitive)
13. droid-final      (Final droid customization with class/background credits)
14. summary          (Character review)
15. shop             (Equipment shopping)
```

**Unified Progression Engine (progression.js: _initializeSteps())**
```
[DROID SUPPORT IS NOT IMPLEMENTED]
- Uses the same steps as normal character progression
- No droid-specific steps defined
```

---

## 2. Key Differences & Issues

### Issue 1: Different Step Ordering

**Problem:** The legacy CharacterGenerator and the unified ProgressionEngine have different step ordering:

| Aspect | Legacy CharGen | Progression Engine |
|--------|---|---|
| Name input | ✓ (Step 1) | ✗ (Missing) |
| Type selection | ✓ (Step 2) | ✗ (Missing) |
| Species selection | ✓ (Step 3) | ✓ (Step 1) |
| Attributes | ✓ (Step 4) | ✓ (Step 3) |
| Class selection | ✓ (Step 5) | ✓ (Step 4) |
| Background | ✓ (Step 6) | ✓ (Step 2) |
| Skills | ✓ (Step 7) | ✓ (Step 5) |
| Feats | ✓ (Step 8) | ✓ (Step 6) |
| Talents | ✓ (Step 9) | ✓ (Step 7) |

**Consequence:** The progression ordering differs:
- **Legacy:** Name → Type → Species → Abilities → Class → Background → Skills → Feats → Talents
- **Progression Engine:** Species → Background → Attributes → Class → Skills → Feats → Talents

The progression engine skips name/type selection and reorders background to occur before class.

---

### Issue 2: Missing Steps in Progression Engine

The unified ProgressionEngine (progression.js) is **missing several steps** from the complete chargen flow:

#### Missing: Name Selection
- **Legacy CharGen:** Has explicit "name" step (line 457)
- **Progression Engine:** No name step defined
- **Status:** ⚠️ **CRITICAL** - Character name is required before class/feature selection

#### Missing: Type Selection (Living vs Droid)
- **Legacy CharGen:** Has explicit "type" step (line 457)
- **Progression Engine:** Not present
- **Status:** ⚠️ **CRITICAL** - Cannot determine if character is living or droid

#### Missing: Languages Step
- **Legacy CharGen:** Has "languages" step with auto-skip logic (lines 513-524)
- **Progression Engine:** Not defined in chargen steps
- **Status:** ⚠️ **IMPORTANT** - Languages are skipped entirely in progression engine

#### Missing: Force Powers Step
- **Legacy CharGen:** Conditionally includes "force-powers" (lines 475-477)
- **Progression Engine:** Not defined in chargen steps
- **Status:** ⚠️ **IMPORTANT** - Force-sensitive characters cannot select powers

#### Missing: Equipment/Shop Step
- **Legacy CharGen:** Includes "shop" step at end (line 485)
- **Progression Engine:** No equipment/shop step
- **Status:** ⚠️ **CRITICAL** - Characters have no way to purchase equipment

---

### Issue 3: Complete Droid Support Missing from Progression Engine

The unified ProgressionEngine has **zero support for droid progression**:

#### Missing Droid-Specific Steps:
1. **Degree Selection** (1st-5th degree) - determines ability modifiers
   - Not present in progression.js
   - Critical for droid character creation

2. **Size Selection** (tiny to colossal) - affects abilities and costs
   - Not present in progression.js
   - Required before droid builder

3. **Droid Builder** (systems selection)
   - Not present in progression.js
   - Required for: locomotion, processor, appendages, accessories
   - Impacts droid costs and weight

4. **Droid Final Customization** (after class/background)
   - Not present in progression.js
   - Recalculates final credits with class/background bonuses
   - Allows final droid system adjustments

#### Missing Droid-Specific Logic:
- No handling of droid degree bonuses (see chargen-droid.js:_getDroidDegreeBonuses() lines 78-87)
- No handling of droid size modifiers (see chargen-droid.js:_onSelectSize() lines 50-73)
- No droid credit calculations
- No special handling of droid abilities (droids have no CON)

**Status:** ⚠️ **CRITICAL** - Droid characters cannot be created via progression engine

---

## 3. Step Availability & Dependencies

### CharacterGenerator Flow (Working)
```
name → type → [species OR degree/size/droid-builder] → abilities → class → background → skills → feats → talents → [force-powers] → [droid-final] → summary → shop
```

### Progression Engine Chargen Flow (Incomplete)
```
species → background → attributes → class → skills → feats → talents → finalize
```

### What Gets Skipped in Progression Engine:
1. ✗ Name input (characters default to unnamed)
2. ✗ Type selection (living vs droid)
3. ✗ Droid degree selection
4. ✗ Droid size selection
5. ✗ Droid builder/systems
6. ✗ Droid final step
7. ✗ Language selection
8. ✗ Force powers selection
9. ✗ Equipment/shop
10. ✗ Character summary/review

---

## 4. Detailed Analysis by Character Type

### Normal Living Character

#### Steps That Are Implemented:
✓ Species selection
✓ Background selection (in different order)
✓ Ability scores
✓ Class selection
✓ Skill training
✓ Feat selection
✓ Talent selection

#### Steps That Are Missing:
✗ Name input
✗ Type selection
✗ Language selection
✗ Force power selection (for force-sensitive characters)
✗ Equipment/shop
✗ Character summary/review

### Droid Character

#### Steps That Are Implemented:
✗ **NONE** - Droid support is completely missing from progression engine

#### Steps That Are Missing:
✗ Name input
✗ Type selection
✗ Degree selection
✗ Size selection
✗ Droid builder (systems selection)
✗ Droid final customization
✗ Ability scores (with droid-specific handling)
✗ Class selection
✗ Background selection
✗ Skill training
✗ Feat selection
✗ Talent selection
✗ Force power selection
✗ Equipment/shop
✗ Character summary/review

---

## 5. Root Cause Analysis

### Why Steps Are Missing

1. **Progression Engine vs CharacterGenerator Mismatch**
   - The CharacterGenerator (chargen-main.js) is the legacy implementation with full functionality
   - The SWSEProgressionEngine (progression.js) is a newer unified engine designed for both chargen AND level-up
   - They were not fully integrated; the progression engine was built for a simplified flow
   - The progression engine defines only the "core" progression steps, not UI steps

2. **Legacy vs Modern Architecture**
   - `chargen-main.js` contains the complete, working character creation flow
   - `progression.js` contains a bare-bones progression system
   - These systems coexist but don't fully align

3. **Droid Support Not Ported**
   - Droid support exists only in CharacterGenerator
   - When ProgressionEngine was created, droid support was not ported over
   - Droid-specific logic in chargen-droid.js is not referenced by progression.js

---

## 6. Recommendations

### High Priority
1. **Add missing core steps to progression engine:**
   - Implement name selection
   - Implement type selection (living vs droid)
   - Implement language selection
   - Implement force power selection
   - Implement equipment/shop step
   - Implement summary/review step

2. **Implement full droid support:**
   - Add degree selection logic
   - Add size selection logic
   - Integrate droid builder systems selection
   - Add droid final customization step
   - Implement special droid handling (no CON, cost calculations, etc.)

3. **Unify step ordering:**
   - Decide on single authoritative step sequence
   - Ensure both legacy and new engines follow same order
   - Or clearly document why ordering differs

### Medium Priority
1. **Document which engine is authoritative:**
   - Is progression.js the future?
   - Should CharacterGenerator be deprecated?
   - Clear migration path needed

2. **Ensure consistency in step dependencies:**
   - Both engines should enforce same prerequisites
   - Availability locks should match

### Low Priority
1. Review other progression systems (ForceProgression, LanguageEngine) for integration
2. Consider performance implications of having two parallel systems

---

## 7. Summary Table

| Feature | CharacterGenerator | ProgressionEngine |
|---------|---|---|
| **Name Selection** | ✓ | ✗ |
| **Type Selection** | ✓ | ✗ |
| **Species/Droid Degree** | ✓ | Partial (species only) |
| **Ability Scores** | ✓ | ✓ |
| **Class Selection** | ✓ | ✓ |
| **Background** | ✓ | ✓ (different order) |
| **Skills** | ✓ | ✓ |
| **Feats** | ✓ | ✓ |
| **Talents** | ✓ | ✓ |
| **Languages** | ✓ | ✗ |
| **Force Powers** | ✓ | ✗ |
| **Droid Builder** | ✓ | ✗ |
| **Droid Final** | ✓ | ✗ |
| **Summary/Review** | ✓ | ✗ |
| **Equipment/Shop** | ✓ | ✗ |
| **Droid Support** | ✓ Complete | ✗ None |

---

## 8. File References

- **Legacy CharGen:** `/scripts/apps/chargen/chargen-main.js`
  - Complete implementation with all steps
  - Includes droid support via chargen-droid.js

- **Unified Progression Engine:** `/scripts/engine/progression.js`
  - Simplified step sequence (missing key steps)
  - No droid support
  - Used for both chargen and level-up

- **Droid-Specific Logic:** `/scripts/apps/chargen/chargen-droid.js`
  - Droid degree, size, builder logic
  - Not integrated with progression.js

- **Data & Config:**
  - `/scripts/progression/data/progression-data.js` - Rule definitions
  - `/data/droid-systems.js` - Droid system definitions
