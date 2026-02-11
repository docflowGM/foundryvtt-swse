# Run 2 Pass 4: FormApplication → ApplicationV2 Audit

**Date:** 2026-02-11
**Status:** AUDIT COMPLETE - Ready for conversion
**Total Classes:** 17 SWSEFormApplication classes requiring conversion
**Already V2 Compliant:** 4 classes already extend SWSEFormApplicationV2

---

## Executive Summary

All 17 FormApplication classes follow the SAME PATTERN:
1. ✅ Static `DEFAULT_OPTIONS` with proper structure
2. ✅ Static `get defaultOptions()` bridge (AppV2 contract)
3. ✅ `async _prepareContext(options)` method
4. ✅ `async _onRender(context, options)` with native DOM (no jQuery)
5. ✅ `async _updateObject(event, formData)` where applicable
6. ✅ No inline `<style>` blocks (already extracted in Pass 3)
7. ✅ No jQuery dependencies in event binding

### Conversion Strategy

**MECHANICAL CONVERSION:**
```
extends SWSEFormApplication  →  extends SWSEFormApplicationV2
```

**Why This Works:**
- SWSEFormApplicationV2 extends SWSEApplicationV2 (proper V2 base)
- Already has form handler: `form.handler = SWSEFormApplicationV2.#onSubmit`
- Bridges to legacy `_updateObject(event, expandedData)` for backward compat
- All existing _prepareContext, _onRender code continues to work

---

## Classes Requiring Conversion

### Group 1: Picker UI Classes (4 classes - LOW DIFFICULTY)

**Characteristics:**
- Simple, stateless pickers
- No form submission (select via Promise resolution)
- Constructor accepts data array + options
- _onRender handles card click events
- Pattern: static select() helper → new instance → render(true)

| File | Class | Complexity | Conversion Effort |
|------|-------|-----------|-------------------|
| scripts/progression/ui/force-power-picker.js | ForcePowerPicker | 🟢 Low | Trivial |
| scripts/progression/ui/force-secret-picker.js | ForceSecretPicker | 🟢 Low | Trivial |
| scripts/progression/ui/force-technique-picker.js | ForceTechniquePicker | 🟢 Low | Trivial |
| scripts/progression/ui/starship-maneuver-picker.js | StarshipManeuverPicker | 🟢 Low | Trivial |

**Notes:**
- Template paths: `scripts/progression/ui/templates/[picker-type]-picker.hbs`
- All use `this.selectedSet` for multi-select state
- _onRender: querySelectorAll().forEach() pattern (already native)
- No special initialization needed

---

### Group 2: Configuration Dialogs (5 classes - LOW DIFFICULTY)

**Characteristics:**
- Standard form-based config dialogs
- _prepareContext returns data structure
- _updateObject persists settings
- No complex initialization

| File | Class | Complexity | Conversion Effort |
|------|-------|-----------|-------------------|
| scripts/apps/prerequisite-builder-dialog.js | PrerequisiteBuilderDialog | 🟢 Low | Trivial |
| scripts/apps/template-character-creator.js | TemplateCharacterCreator | 🟢 Low | Trivial |
| scripts/engine/MetaTuning.js | MetaTuningConfig | 🟢 Low | Trivial |
| scripts/gm-tools/homebrew-manager.js | HomebrewManagerApp | 🟢 Low | Trivial |
| scripts/houserules/houserules-config.js | HouserulesConfig | 🟢 Low | Trivial |

**Notes:**
- Template paths: Mix of .hbs and .html
- _updateObject handles form data persistence
- Tab system already compatible with V2
- No special event binding beyond V2 form handler

---

### Group 3: House Rules Menus (8 classes - LOW DIFFICULTY)

**Characteristics:**
- Multiple related config dialogs in single file
- Tab navigation between menu types
- _prepareContext queries settings via safeGet()
- _updateObject persists via safeSet()
- Consistent naming pattern

| File | Class | Template | Complexity |
|------|-------|----------|-----------|
| scripts/houserules/houserule-menus.js | CharacterCreationMenu | character-creation.hbs | 🟢 Low |
| scripts/houserules/houserule-menus.js | AdvancementMenu | advancement.hbs | 🟢 Low |
| scripts/houserules/houserule-menus.js | CombatMenu | combat.hbs | 🟢 Low |
| scripts/houserules/houserule-menus.js | ForceMenu | force.hbs | 🟢 Low |
| scripts/houserules/houserule-menus.js | PresetsMenu | presets.hbs | 🟢 Low |
| scripts/houserules/houserule-menus.js | SkillsFeatsMenu | skills-feats.hbs | 🟢 Low |
| scripts/houserules/houserule-menus.js | SpaceCombatMenu | space-combat.hbs | 🟢 Low |
| scripts/houserules/houserule-menus.js | CharacterRestrictionsMenu | character-restrictions.hbs | 🟢 Low |

**Notes:**
- All in single file: scripts/houserules/houserule-menus.js
- Template path: `systems/foundryvtt-swse/templates/apps/houserules/[menu-name].hbs`
- _updateObject delegates to safeSet() helper
- Can batch convert all 8 in single file edit

---

## Conversion Pattern Analysis

### Current Pattern (SWSEFormApplication)
```javascript
export class TemplateCharacterCreator extends SWSEFormApplication {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplication.DEFAULT_OPTIONS ?? {},
    {
      id: 'template-character-creator',
      template: 'systems/foundryvtt-swse/templates/apps/template-creator.hbs',
      position: { width: 1000, height: 700 },
      // ... other options
    }
  );

  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

  async _prepareContext(options) {
    // ... data preparation
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}
    // ... native DOM event binding with addEventListener
  }

  async _updateObject(event, formData) {
    // ... form submission handling
  }
}
```

### Target Pattern (SWSEFormApplicationV2)
```javascript
import SWSEFormApplicationV2 from '../../apps/base/swse-form-application-v2.js';

export class TemplateCharacterCreator extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'template-character-creator',
      template: 'systems/foundryvtt-swse/templates/apps/template-creator.hbs',
      position: { width: 1000, height: 700 },
      // ... other options
    }
  );

  // DEFAULT_OPTIONS bridge can stay (SWSEFormApplicationV2 respects it)
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

  async _prepareContext(options) {
    // ... data preparation (NO CHANGES)
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}
    // ... native DOM event binding (NO CHANGES)
  }

  async _updateObject(event, formData) {
    // ... form submission handling (NO CHANGES)
    // SWSEFormApplicationV2.#onSubmit bridges form event to this method
  }
}
```

### Key Insight
**ONLY change needed:** Update parent class + import statement
All internal methods remain UNCHANGED because:
- _prepareContext() already returns plain object (V2 compatible)
- _onRender() already uses native DOM (no jQuery)
- _updateObject() already receives expandedObject (SWSEFormApplicationV2 handles expansion)

---

## Conversion Validation Checklist

Before conversion of each class:
- [ ] Has `DEFAULT_OPTIONS` static property
- [ ] Has `defaultOptions` getter bridge
- [ ] Has `_prepareContext()` returning object
- [ ] Has `_onRender()` with native DOM methods
- [ ] Uses `addEventListener()` not `.on()`
- [ ] Uses `querySelector()`/`querySelectorAll()` not `.find()`
- [ ] No inline `<style>` blocks (Pass 3 should have removed these)

After conversion of each class:
- [ ] Updated import to SWSEFormApplicationV2
- [ ] Changed extends clause to SWSEFormApplicationV2
- [ ] All _prepareContext, _onRender, _updateObject unchanged
- [ ] Class still exports properly
- [ ] No breaking changes to template paths

---

## Execution Order (Recommended)

1. **Phase 1: Picker Classes** (4 files, 10 minutes)
   - All simple, no dependencies between them
   - Can batch convert all 4 at once

2. **Phase 2: Config Dialogs** (5 files, 10 minutes)
   - Straightforward mechanical changes
   - No cross-dependencies

3. **Phase 3: House Rules Menus** (1 file, 8 classes, 5 minutes)
   - All in one file → single edit operation
   - Batch update all 8 classes together

4. **Gate Validation** (1 minute)
   ```bash
   grep -r "extends SWSE" scripts/ --include="*.js" | wc -l
   # Target: 4 (only SWSEFormApplicationV2 instances remain)
   ```

**Total Estimated Time:** ~30 minutes

---

## Non-Conversion Classes (Already V2 Compliant)

These classes ALREADY extend SWSEFormApplicationV2 and need NO changes:

| File | Class |
|------|-------|
| scripts/apps/levelup/levelup-enhanced.js | SWSELevelUpEnhanced |
| scripts/apps/levelup/levelup-main.js | SWSELevelUpEnhanced (duplicate/alternate) |
| scripts/mentor/mentor-chat-dialog.js | MentorChatDialog |
| scripts/mentor/mentor-reflective-dialog.js | MentorReflectiveDialog |

These are already properly modernized. No changes needed.

---

## Summary

**✅ Audit Status:** COMPLETE
**✅ All Classes Evaluated:** 17 classes (SWSEFormApplication) + 4 already V2
**✅ Conversion Difficulty:** ALL LOW - purely mechanical inheritance change
**✅ Breaking Changes Risk:** MINIMAL - all methods already V2 compatible
**✅ Code Pattern Consistency:** 100% aligned

**Ready for conversion:** YES

Next: Execute Phase 1-3 conversions in order, validate with grep, move to Pass 5.
