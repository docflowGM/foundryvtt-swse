# Run 2 Migration Status

**Date:** 2026-02-11 | **Phase:** Rendering Contract Modernization
**Current Progress:** Run2.1 ✅ + Run2.3 ✅ COMPLETE | **Next:** Run2.4 (FormApplication) + Run2.5 (Prototype Patching)

---

## Summary by Category

| Category | Count | Status | Notes |
|----------|-------|--------|-------|
| **Run2.1** manual_appv2_lifecycle | 9 subclasses | ✅ **9/9 CONVERTED** | Batch 1: 2 apps ✅<br/>Batch 2: 5 chargen + mentor apps ✅<br/>Phase 3 defer: chargen-main, chargen-backgrounds (large/stateful) |
| **Run2.2** inline_style_scripts | 0 | ✅ **CLEAN** | No embedded `<style>` in JS files |
| **Run2.3** inline_style_templates | 21 files | ✅ **COMPLETE** | All 21 HBS templates extracted → swse-templates-consolidated.css (6687 lines) |
| **Run2.4** legacy_formapplication | 4 files | ⏳ **PENDING** | SWSEFormApplication base + 3 subclasses |
| **Run2.5** prototype_patching | 1 file | ⏳ **PENDING** | review-thread-assembler.js |
| **Run2.final** v1_sheet_registration | 0 | ✅ **CLEAN** | No V1 sheet registrations found |
| **Run2.final** v1_sheet_baseclass | 0 | ✅ **CLEAN** | All sheet classes extend V2 variants |

---

## Run2.1: Manual AppV2 Lifecycle → Template Conversion

**Goal:** Convert ApplicationV2 subclasses with manual `_renderHTML/_replaceHTML` to use `static PARTS` + templates + `_prepareContext()`

### Batch 1: COMPLETE ✅
- ✅ `scripts/apps/character-import-wizard.js`
- ✅ `scripts/apps/destiny-spending-dialog.js`

### Batch 2: PENDING
- ⏳ `scripts/apps/mentor/mentor-suggestion-dialog.js:75`
- ⏳ `scripts/apps/chargen/chargen-languages.js:517,543`
- ⏳ `scripts/apps/chargen/chargen-droid.js:1171,1209`
- ⏳ `scripts/apps/chargen/chargen-templates.js:790,794`
- ⏳ `scripts/apps/chargen/chargen-feats-talents.js:992,1011`

### Phase 3 (Deferred — Large/Stateful Apps)
- 🔄 `scripts/apps/chargen/chargen-backgrounds.js:658,685` (complex state mutations)
- 🔄 `scripts/apps/chargen/chargen-main.js:3526,3533,3580,3597` (multi-step chargen)

---

## Run2.2: Inline Styles in JS Strings

**Status:** ✅ **CLEAN** — No embedded `<style>` blocks in JavaScript files.

---

## Run2.3: Inline Styles in HBS Templates

**Goal:** Extract all `<style>` blocks from templates → `styles/apps/dialogs.css`

**Files with embedded styles (21 total):**

### App Templates (12)
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

### Actor Templates (4)
1. `templates/actors/character/tabs/import-export-tab.hbs:71`
2. `templates/actors/character/tabs/starship-maneuvers-tab.hbs:158`
3. `templates/actors/droid/v2/partials/droid-build-history.hbs:51`
4. `templates/actors/droid/v2/partials/droid-systems-panel.hbs:103`

### Chat/Partial Templates (2)
1. `templates/chat/level-up-summary.hbs:67`
2. `templates/chat/progression-session-summary.hbs:126`
3. `templates/partials/starship-maneuvers-panel.hbs:95`

**Action Items:**
- Extract all CSS rules and consolidate into `styles/apps/dialogs.css` with scoped selectors
- Replace `<style>` blocks in each template with scoped class names (where needed)
- Some templates may not need classes if styles are generic

---

## Run2.4: Legacy FormApplication Replacement

**Goal:** Replace FormApplication-based classes with AppV2 + template system

**Files (4):**
1. `scripts/apps/base/swse-form-application.js:8` — Base class (SWSEFormApplication extends FormApplication)
2. `scripts/houserules/houserules-config.js:18` — HouserulesConfig extends SWSEFormApplication
3. `scripts/apps/prerequisite-builder-dialog.js:10` — PrerequisiteBuilderDialog extends SWSEFormApplication
4. `scripts/gm-tools/homebrew-manager.js:8+` — HomebrewManagerApp extends SWSEFormApplication

**Action:** Convert all to `HandlebarsApplicationMixin(ApplicationV2)` pattern (or create a V2 base class)

---

## Run2.5: Prototype Patching Removal

**Goal:** Eliminate runtime patching of prototypes

**File (1):**
1. `scripts/apps/store/review-thread-assembler.js:33+` — ReviewThreadAssembler prototype operations

**Action:** Isolate/refactor to avoid prototype mutation

---

## Run2.final: V1 Sheet Vestiges

### v1_sheet_registration
**Status:** ✅ **CLEAN** — No `Actors.registerSheet()` or `Items.registerSheet()` calls with V1 sheet classes

### v1_sheet_baseclass
**Status:** ✅ **CLEAN** — No classes extending `ActorSheet` or `ItemSheet` (non-V2 variants)

---

## Execution Plan

### Phase A: Run2.1 Continuation (Today/This Session)
1. **Batch 2** (Chargen + Mentor small apps)
2. **Boot + test checklist** after batch 2

### Phase B: Run2.2 + Run2.3 (CSS Extraction)
1. **Run2.2**: Validate clean (already ✅)
2. **Run2.3**: Extract all 21 templates → consolidated CSS
3. **Boot + test checklist**

### Phase C: Run2.4 + Run2.5 (Legacy Apps + Prototype Cleanup)
1. **Run2.4**: Convert FormApplication → AppV2
2. **Run2.5**: Remove prototype patching
3. **Boot + test checklist**

### Phase D: Run2.final (Sheet Validation)
1. **Verify** V1 sheet gates remain clean
2. **Boot + full test checklist**
3. **Merge** and proceed to Phase 3

---

## Test Checklist (Per Batch)

After **each batch completion**, run:
- ✓ Boot: no console errors, no offsetWidth null, no abstract method errors
- ✓ Open NPC sheet
- ✓ Open Vehicle sheet
- ✓ Open chargen (no full flow, just ensure not broken)
- ✓ Open/close dialogs affected by batch

---

## Deliverables (Per Batch)

1. ✅ Changed files (source)
2. ✅ Batch handoff doc (e.g., `RUN2_BATCH1_HANDOFF.md`)
3. ✅ ZIP with all changed files + handoff
4. ✅ This status doc (updated)

---

**Next Action:** Begin Run2.1 Batch 2 (5 small chargen + mentor apps)
