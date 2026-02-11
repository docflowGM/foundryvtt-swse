# All Edited Files Since Migration Start

**Last Updated:** 2026-02-11
**Total Files Modified/Created:** 11 (3 JS edited + 4 HBS created + 1 pending JS + status docs)

---

## Run 1 (Complete — Dialog/jQuery Migration)

See `RUN1_HANDOFF.md` for full Run 1 changes.
**Summary:** Dialog invocation migration + jQuery removal (no rendering contract changes).

---

## Run 2 (In Progress — Rendering Contract Modernization)

### JS Files Edited

| # | File | Lines | Change | Status |
|---|------|-------|--------|--------|
| 1 | `scripts/apps/character-import-wizard.js` | 23,122 | Removed `_renderHTML()/_replaceHTML()` → `static PARTS` + `_prepareContext()` | ✅ Complete |
| 2 | `scripts/apps/destiny-spending-dialog.js` | 49,96 | Removed `_renderHTML()/_replaceHTML()` → `static PARTS` + `_prepareContext()` | ✅ Complete |
| 3 | `scripts/apps/mentor/mentor-suggestion-dialog.js` | 75 | Removed `_renderHTML()/_replaceHTML()` → `static PARTS` + `_prepareContext()` | ✅ Complete |
| 4 | `scripts/apps/chargen/chargen-languages.js` | 517,543 | Template created, JS conversion pending | ⏳ 50% |
| 5 | `scripts/apps/chargen/chargen-droid.js` | 1171,1209 | Pending | ⏳ 0% |
| 6 | `scripts/apps/chargen/chargen-templates.js` | 790,794 | Pending | ⏳ 0% |
| 7 | `scripts/apps/chargen/chargen-feats-talents.js` | 992,1011 | Pending | ⏳ 0% |

### HBS Templates Created

| # | File | Source | Status |
|---|------|--------|--------|
| 1 | `templates/apps/character-import-wizard.hbs` | Extracted from `character-import-wizard.js:_renderHTML()` | ✅ Complete |
| 2 | `templates/apps/destiny-spending-dialog.hbs` | Extracted from `destiny-spending-dialog.js:_renderHTML()` (with Handlebars `{{#each}}`) | ✅ Complete |
| 3 | `templates/apps/mentor-suggestion-dialog.hbs` | Extracted from `mentor-suggestion-dialog.js:_renderHTML()` | ✅ Complete |
| 4 | `templates/apps/chargen-custom-language.hbs` | Extracted from `chargen-languages.js:_renderHTML()` | ✅ Complete |

### Status/Handoff Documents

| # | File | Purpose |
|---|------|---------|
| 1 | `RUN2_INITIAL_SCAN.md` | Detailed scan of all 7 Run2 categories with file counts |
| 2 | `RUN2_STATUS.md` | Categorized status with execution plan |
| 3 | `RUN2_BATCH1_HANDOFF.md` | Batch 1 completion details (2 apps converted) |
| 4 | `RUN2_EXECUTION_SUMMARY.md` | Comprehensive summary + next steps |
| 5 | `ALL_EDITED_FILES_SINCE_START.md` | This file (running tally) |

---

## Deferred to Phase 3 (Large Stateful Apps)

| # | File | Issue | Lines | Status |
|---|------|-------|-------|--------|
| 1 | `scripts/apps/chargen/chargen-main.js` | Large multi-step app with complex state mutations | 3526,3533,3580,3597 | 🔄 Phase 3 |
| 2 | `scripts/apps/chargen/chargen-backgrounds.js` | Large app with mentor suggestion state mutations | 658,685 | 🔄 Phase 3 |

---

## Pending Run 2 Categories

### Run2.2: Inline Style in JS
**Status:** ✅ CLEAN (0 files) — No embedded `<style>` in JS

### Run2.3: Inline Styles in HBS (21 files pending)
**Status:** ⏳ PENDING
**Files:** 14 app templates + 4 actor templates + 3 chat/partial templates
**Action:** Extract all `<style>` blocks to `styles/apps/dialogs.css`

### Run2.4: Legacy FormApplication (4 files pending)
**Status:** ⏳ PENDING
1. `scripts/apps/base/swse-form-application.js:8`
2. `scripts/houserules/houserules-config.js:18`
3. `scripts/apps/prerequisite-builder-dialog.js:10`
4. `scripts/gm-tools/homebrew-manager.js:8+`

### Run2.5: Prototype Patching (1 file pending)
**Status:** ⏳ PENDING
1. `scripts/apps/store/review-thread-assembler.js:33+`

### Run2.final: V1 Sheet Validation
**Status:** ✅ CLEAN
- v1_sheet_registration: 0 found
- v1_sheet_baseclass: 0 found

---

## Summary Statistics

| Category | Files | Status |
|----------|-------|--------|
| **Complete** | 7 | 3 JS edited + 4 HBS created |
| **In Progress** | 1 | chargen-languages.js (50%) |
| **Pending Run2.1** | 4 | chargen-droid, templates, feats-talents, + 2 large (Phase 3) |
| **Pending Run2.2** | 0 | ✅ CLEAN |
| **Pending Run2.3** | 21 | HBS CSS extraction |
| **Pending Run2.4** | 4 | FormApplication → AppV2 |
| **Pending Run2.5** | 1 | Prototype patching |
| **Pending Run2.final** | 0 | ✅ CLEAN |
| **Status Docs** | 5 | Planning/tracking |

**Total In-Flight:** 36 files (excluding Phase 3 deferred)

---

## Commit History (Planned)

```
✅ Run1: Complete (previous session)
  - Dialog invocation migration + jQuery removal

⏳ Run2.1 Batch 1: (READY TO COMMIT)
  - character-import-wizard.js + template
  - destiny-spending-dialog.js + template

⏳ Run2.1 Batch 2: (IN PROGRESS)
  - mentor-suggestion-dialog.js + template
  - chargen-languages.js + template (pending JS edit)
  - chargen-droid.js + template (pending)
  - chargen-templates.js + template (pending)
  - chargen-feats-talents.js + template (pending)

⏳ Run2.3: (PENDING)
  - CSS extraction from 21 HBS templates

⏳ Run2.4: (PENDING)
  - FormApplication → AppV2 for 4 files

⏳ Run2.5: (PENDING)
  - Prototype patching removal

⏳ Run2.final: (PENDING)
  - V1 sheet validation gate pass

🔄 Phase 3: (DEFERRED)
  - chargen-main.js (large stateful)
  - chargen-backgrounds.js (large stateful)
```

---

## Next Actions

1. **Complete Run2.1 Batch 2** (finish 4 remaining small apps)
2. **Boot test** (all 9 apps converted)
3. **Run2.3** (CSS extraction from 21 HBS files)
4. **Run2.4** (FormApplication migration)
5. **Run2.5** (Prototype cleanup)
6. **Run2.final** (Gate validation)
7. **Phase 3** (Chargen main/backgrounds — large apps)

---

**Ready for continuation or handoff.**
