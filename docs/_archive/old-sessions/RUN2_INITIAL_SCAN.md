# Run 2 Initial Scan Results

**Date:** 2026-02-11
**Scope:** Rendering contract modernization (AppV2 lifecycle, inline styles, legacy FormApplication, prototype patching, V1 sheet vestiges)

## Category Counts & Files

### Run2.1: manual_appv2_lifecycle (ApplicationV2 subclasses with manual _renderHTML/_replaceHTML)

**Status:** ❌ **11 FOUND** (1 base class + 9 small apps + 1 large subsystem)

**Base Class (intentional):**
1. `scripts/apps/base/swse-application.js:66,79` - SWSEApplicationV2 (provides foundation)

**Small Apps (to convert to mixin + templates):**
1. `scripts/apps/character-import-wizard.js:23,122` - Simple 2-step wizard
2. `scripts/apps/destiny-spending-dialog.js:49,96` - Dialog with button choice
3. `scripts/apps/mentor/mentor-suggestion-dialog.js:75` - Read-only dialog
4. `scripts/apps/chargen/chargen-languages.js:517,543` - Medium dialog
5. `scripts/apps/chargen/chargen-droid.js:1171,1209` - Form dialog
6. `scripts/apps/chargen/chargen-templates.js:790,794` - Medium dialog
7. `scripts/apps/chargen/chargen-feats-talents.js:992,1011` - Medium dialog

**Large Apps (defer to Phase 3):**
1. `scripts/apps/chargen/chargen-backgrounds.js:658,685` - Complex with state
2. `scripts/apps/chargen/chargen-main.js:3526,3533,3580,3597` - Multi-step chargen
3. `scripts/apps/chargen/chargen-languages.js` - (overlaps above)

---

### Run2.2: inline_style_scripts (style tags in JS strings)

**Status:** ✅ **CLEAN** (0 found)

No embedded `<style>` blocks in JavaScript files.

---

### Run2.3: inline_style_templates (style blocks in HBS files)

**Status:** ❌ **21 FOUND**

**Actor Templates (4):**
1. `templates/actors/character/tabs/import-export-tab.hbs:71`
2. `templates/actors/character/tabs/starship-maneuvers-tab.hbs:158`
3. `templates/actors/droid/v2/partials/droid-build-history.hbs:51`
4. `templates/actors/droid/v2/partials/droid-systems-panel.hbs:103`

**App Templates (11):**
1. `templates/apps/chargen.hbs:2236`
2. `templates/apps/droid-builder.hbs:332`
3. `templates/apps/gm-debug-panel.hbs:268`
4. `templates/apps/gm-droid-approval-dashboard.hbs:95`
5. `templates/apps/homebrew-manager.hbs:160`
6. `templates/apps/houserules/character-restrictions.hbs:52`
7. `templates/apps/houserules/houserules-config.hbs:11`
8. `templates/apps/levelup.hbs:1074`
9. `templates/apps/mentor-chat-dialog.hbs:152`
10. `templates/apps/mentor-reflective-dialog.hbs:147`
11. `templates/apps/meta-tuning-config.hbs:384`
12. `templates/apps/nonheroic-units-browser.hbs:80`
13. `templates/apps/npc-levelup-entry.hbs:52`
14. `templates/apps/prestige-roadmap.hbs:217`

**Chat/Partial Templates (2):**
1. `templates/chat/level-up-summary.hbs:67`
2. `templates/chat/progression-session-summary.hbs:126`
3. `templates/partials/starship-maneuvers-panel.hbs:95`

---

### Run2.4: legacy_formapplication (FormApplication inheritance)

**Status:** ❌ **4 FOUND**

1. `scripts/apps/base/swse-form-application.js:8` - SWSEFormApplication (base using FormApplication)
2. `scripts/houserules/houserules-config.js:18` - HouserulesConfig extends SWSEFormApplication
3. `scripts/apps/prerequisite-builder-dialog.js:10` - PrerequisiteBuilderDialog extends SWSEFormApplication
4. `scripts/gm-tools/homebrew-manager.js:8+` - HomebrewManagerApp extends SWSEFormApplication

---

### Run2.5: prototype_patching (Runtime patching of prototypes)

**Status:** ❌ **1 FOUND**

1. `scripts/apps/store/review-thread-assembler.js:33+` - Prototype operations on ReviewThreadAssembler

---

### Run2.final: V1 sheet vestiges

**v1_sheet_registration (Actors.registerSheet / Items.registerSheet):**
- Status: ✅ **CLEAN** (0 found)

**v1_sheet_baseclass (extends ActorSheet/ItemSheet not V2):**
- Status: ✅ **CLEAN** (0 found)

---

## Prioritization for Run 2

### MICRO-BATCH 1: Run2.3 (inline_style_templates) — LOWEST RISK
- Extract all 21 `<style>` blocks from HBS → `styles/apps/dialogs.css` and `styles/apps/apps.css`
- Add scoped CSS classes (`.swse-...`)
- No markup changes, no logic changes

### MICRO-BATCH 2: Run2.1 (small apps only, NOT chargen main/backgrounds)
- Character import wizard
- Destiny spending dialog
- Mentor suggestion dialog
- Chargen: languages, droid, templates, feats-talents
- Convert to HandlebarsApplicationMixin(ApplicationV2) + templates

### MICRO-BATCH 3: Run2.4 (legacy FormApplication)
- Convert SWSEFormApplication base to AppV2 mixin
- Update all 3 subclasses to use AppV2 instead

### MICRO-BATCH 4: Run2.5 (prototype patching)
- Isolate/remove prototype patching in review-thread-assembler.js

### DEFERRED (Phase 3):
- Chargen main/backgrounds (large stateful apps)

---

## Test Checklist (per batch)

After each batch:
1. ✓ Boot: no console errors, no offsetWidth null
2. ✓ Open NPC sheet
3. ✓ Open Vehicle sheet
4. ✓ Open chargen (don't run full flow, just ensure not broken)
5. ✓ Open/close any dialogs affected by batch

---

## Next: Batch 1 Execution
