# Phase 6 — Consolidation Report
**Date:** 2026-05-05
**Branch:** claude/audit-swse-dead-code-6hib5

---

## Summary

Phase 6 executed consolidation of the mentor and customization duplicate systems, performed targeted safe template and CSS deletions, and permanently drained `_deprecated/`. No import rewrites were required — all live code already pointed to canonical paths.

---

## A. Mentor System Consolidation

### Canonical Path Confirmed
`scripts/mentor/` — all live imports already target this path. No rewrites required.

### Import Rewrites
**None.** Every live caller (`chargen-main.js`, `chargen-feats-talents.js`, `levelup-main.js`, `directory-hooks.js`, `suggestion-hooks.js`, `MentorSurfaceService.js`, etc.) already imported from `scripts/mentor/` or `scripts/engine/mentor/`. The duplicate at `scripts/scripts/mentor/` was never referenced.

### Permanently Deleted (from `_deprecated/`)
`_deprecated/scripts/scripts/mentor/` — 31 files (complete duplicate, zero callers, one divergent file where canonical `scripts/mentor/mentor-survey/engine.js` is the newer implementation):
- All survey definition files (L1 and PrC classes)
- All mentor dialogue, voice, judgment, and translation files
- All survey engine and registry files

`_deprecated/scripts/apps/mentor/mentor-suggestion-dialog.js` — 1 file (duplicate of `scripts/mentor/mentor-suggestion-dialog.js`, zero callers)

`_deprecated/scripts/apps/mentor/mentor-dialogues.data.js` — 1 file (diverges from live `scripts/apps/mentor-dialogues.data.js`, zero callers)

### Kept (Not Quarantined)
| File | Reason |
|---|---|
| `scripts/apps/mentor/mentor-suggestion-picker-dialog.js` | LIVE — imported by `mentor-step-integration.js` |
| `scripts/apps/mentor/mentor-survey.js` | LIVE — dynamically imported by `chargen-class.js` |
| `scripts/apps/mentor-dialogues.data.js` | LIVE — imported by `definition-builder.js` |

---

## B. Customization Workbench Consolidation

### Canonical Path Confirmed
`scripts/apps/customization/item-customization-workbench.js` (V2 canonical), launched via `item-customization-router.js` → `openItemCustomization()`.

### Import Rewrites
**None.** All callers already import from `item-customization-router.js` directly. No live code ever imported from the deprecated wrappers.

### Additionally Quarantined This Phase
| File | Reason |
|---|---|
| `scripts/apps/customization/customization-router.js` | Self-labeled "DEPRECATED COMPATIBILITY ROUTER", zero callers |
| `scripts/apps/customization/customization-workbench-setup.js` | Self-labeled "DEPRECATED CUSTOMIZATION WORKBENCH SETUP SHIM", zero callers |

### Permanently Deleted (from `_deprecated/`)
6 files — all self-labeled deprecated compatibility wrappers, zero external callers:
- `customization-workbench-app.js`
- `raw-customization-workbench-app.js`
- `unified-customization-workbench.js`
- `unified-workbench-integration.js`
- `customization-router.js`
- `customization-workbench-setup.js`

Note: `scripts/apps/customization/index.js` re-exports these deleted files and is itself dead (zero callers). Left in place for now; safe to delete in Phase 7.

### Active Customization Files (Not Touched)
| File | Status |
|---|---|
| `item-customization-workbench.js` | LIVE — V2 canonical workbench |
| `item-customization-router.js` | LIVE — canonical launcher (8+ external callers) |
| `customization-bay-app.js` | LIVE — vehicle/droid sheet entry |
| `adapters/` directory | LIVE — internal adapter layer |
| `customization-workbench-setup.js` (was staged) | NOW DELETED — shim with zero callers |

---

## C. Templates Deleted

| File | Reason |
|---|---|
| `templates/items/base/item-sheet-old.hbs` | Self-named legacy, zero references |
| `templates/sheets/_sheet-skeleton.hbs` | Self-named draft (leading underscore), zero external references (only contained a self-reference Handlebars partial call) |

### Templates NOT Deleted (Phase 5 classification corrected)
- `templates/actors/character/v2-concept/` — **NOT dead prototypes.** 16 entries registered in `SWSE_TEMPLATES` and referenced by `scripts/sheets/v2/character-sheet.js:304`. These are the **live V2 character sheet templates.** Phase 5 Python script had a classification error.

---

## D. CSS Deleted / Quarantined

| File | Action | Reason |
|---|---|---|
| `styles/customization-workbench.css` | **DELETED** | Not in `system.json`, not `@import`ed, companion JS deleted |

### CSS NOT Deleted (Blocker Found)
- `styles/apps/unified-customization-workbench.css` — `styles/swse-core.css` (registered in `system.json`) `@import`s this file. Cannot remove until `swse-core.css` is updated.
- `styles/apps/chargen/chargen-talent-tree.css`, `chargen-templates.css` — Left in place because `chargen-main.js` and `chargen-templates.js` are live; CSS may be needed for active chargen UI.
- `styles/sheets/droid-sheet.css`, `vehicle-sheet.css` — In `character-sheet-css-governance.allowlist.json`; intentionally kept.

---

## E. Final `_deprecated/` State

`_deprecated/` directory is **fully empty** — all quarantined items resolved.

---

## F. Validation Results

```
Active references to deprecated paths: NONE
scripts/scripts/mentor/ callers: NONE
apps/mentor/quarantined file callers: NONE
Customization wrapper callers: NONE
```

---

## G. Remaining Blockers

| Target | Blocker | Recommended Action |
|---|---|---|
| `scripts/apps/progression/` | Dynamic `import()` in `suite-reselection-engine.js`, `starship-maneuver-engine.js`; static import in `force-power-step.js` | Audit whether framework can supersede entirely |
| `templates/v2/npc/` | 12 template paths in `PANEL_REGISTRY.js` + `NPCSheet.js` | Confirm v2 NPC is canonical before touching |
| `scripts/actors/vehicle/` | `store-checkout.js` → `SWSEVehicleHandler`; `holonet/init.js` → `vehicle-precreate-hooks.js` | Vehicle system is active; not dead code |
| `scripts/core/init.js` | Registers `{{add}}`, `{{range}}`, `{{mul}}`, `{{roundPercent}}` used in 3+ templates | Wire into loading chain ASAP — highest runtime risk |
| `styles/apps/unified-customization-workbench.css` | `@import`ed by `swse-core.css` | Remove the `@import` from `swse-core.css` first |
| `scripts/apps/customization/index.js` | Re-exports only deleted files — is itself dead | Safe to delete in Phase 7 |

---

## H. Recommended Phase 7 Targets

1. **Wire `scripts/core/init.js`** — highest runtime risk, Handlebars helpers orphaned.
2. **Delete `scripts/apps/customization/index.js`** — re-exports only deleted files, zero callers.
3. **Update `swse-core.css`** — remove `@import url("apps/unified-customization-workbench.css")`, then delete the CSS file.
4. **`scripts/scripts/` remaining dirs** — `macros/`, `maintenance/`, `sheets/`, `ui/` still under `scripts/scripts/`; same misplaced-copy pattern from Phase 1 scope; verify canonical paths and quarantine.
5. **`templates/actors/npc/` v1 templates** — 16 unregistered zero-ref files; safe prune after confirming v2 NPC sheet is fully live.
6. **97 unregistered CSS files** — batch audit now that the three confirmed-dead Phase 2/5 files are gone; check for `@import` chains missed by the Phase 5 Python script (which also missed `swse-core.css`).
