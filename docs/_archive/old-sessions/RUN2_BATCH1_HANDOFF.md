# Run 2, Batch 1: Small Apps Conversion (Partial)

**Date:** 2026-02-11
**Status:** ✅ **COMPLETE** (2 of 7 small apps converted)
**Focus:** Run2.1 (ApplicationV2 manual lifecycle → template-based)

## Changes Made

### Files Modified

1. **scripts/apps/character-import-wizard.js**
   - Removed `_renderHTML()` (lines 23-120)
   - Removed `_replaceHTML()` (lines 122-125)
   - Removed embedded `<style>` block (lines 77-117) — moved to templates, CSS extraction deferred to Run2.3
   - Converted to `static PARTS` + template pattern
   - Added `_prepareContext()` for context data
   - Kept `activateListeners()` for event handlers
   - ✅ Syntax validated

2. **scripts/apps/destiny-spending-dialog.js**
   - Removed `_renderHTML()` (lines 49-94) with dynamic effect iteration
   - Removed `_replaceHTML()` (lines 96-99)
   - Converted to `static PARTS` + template pattern using Handlebars `{{#each}}`
   - Added `_prepareContext()` to pass `instantEffects` and `timedEffects` as context
   - Kept `activateListeners()` for effect-option click handlers
   - ✅ Syntax validated

### Files Created

1. **templates/apps/character-import-wizard.hbs**
   - Extracted from inline `_renderHTML()` string
   - Preserves all form fields, sections, button structure
   - Ready for CSS extraction in Run2.3

2. **templates/apps/destiny-spending-dialog.hbs**
   - Uses Handlebars `{{#each}}` for effect iteration
   - Handles both instant and timed effects sections
   - Ready for CSS extraction in Run2.3

## Test Checklist

- ✅ JS syntax validation passed (both files)
- ⏳ Boot test: deferred (requires full Foundry environment)
- ⏳ Chargen open: deferred (requires full Foundry environment)
- ⏳ Dialog open/close: deferred (requires full Foundry environment)

## Remaining Run2.1 Tasks

**Still pending (defer to next batch):**
1. `scripts/apps/mentor/mentor-suggestion-dialog.js:75`
2. `scripts/apps/chargen/chargen-languages.js:517,543`
3. `scripts/apps/chargen/chargen-droid.js:1171,1209`
4. `scripts/apps/chargen/chargen-templates.js:790,794`
5. `scripts/apps/chargen/chargen-feats-talents.js:992,1011`

**Defer to Phase 3 (large stateful apps):**
1. `scripts/apps/chargen/chargen-backgrounds.js:658,685`
2. `scripts/apps/chargen/chargen-main.js:3526,3533,3580,3597`

## Next Steps

1. **Batch 2** (continuation of Run2.1): Convert remaining 5 small apps (mentor-suggestion, chargen-languages, chargen-droid, chargen-templates, chargen-feats-talents)
2. **Run2.3**: Extract all embedded `<style>` blocks from templates to CSS
3. **Run2.4**: Replace FormApplication usage
4. **Run2.5**: Remove prototype patching
5. **Run2.final**: Fix V1 sheet issues (currently clean)

## Gates Status (after batch 1)

- `manual_appv2_lifecycle`: 9 remaining (2 converted)
- `inline_style_templates`: Still pending Run2.3
- `legacy_formapplication`: Not yet addressed
- `prototype_patching`: Not yet addressed
- `v1_sheet_registration`: ✅ Clean
- `v1_sheet_baseclass`: ✅ Clean

---

**Ready to proceed to Batch 2 (continuation of Run2.1).**
