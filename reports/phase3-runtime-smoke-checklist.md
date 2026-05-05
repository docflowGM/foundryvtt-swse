# Phase 3 Runtime Smoke Checklist
**Date:** 2026-05-05
**Scope:** Post-Phase-2 quarantine validation — confirm no runtime regressions

Phase 2 quarantined:
- `scripts/apps/chargen/` cluster (27 JS files) → `_deprecated/scripts/apps/`
- `styles/core/swse-base.css`, `styles/swse-system.css`, `styles/themes/holo.css` → `_deprecated/styles/`

---

## Environment Setup

- [ ] Launch Foundry VTT with the SWSE system active
- [ ] Open browser DevTools (F12) → Console tab
- [ ] Open browser DevTools → Network tab, filter by **404**

---

## 1. Loading Chain

- [ ] Console shows no 404 errors for any `.js` or `.css` file under `systems/foundryvtt-swse/`
- [ ] Console shows no `"Cannot find module"` or `"Failed to fetch"` errors
- [ ] Console shows no Handlebars partial-not-found errors (`Could not find partial`)
- [ ] Console shows no Handlebars helper-not-found errors (`Missing helper: "add"`, `"range"`, `"mul"`, `"roundPercent"`)
- [ ] `Hooks.once('init')` fires — look for SWSE init log messages in console
- [ ] `Hooks.once('ready')` fires — look for SWSE ready log messages in console

---

## 2. Actor Creation

- [ ] Click **Create Actor** → select type **Character**
- [ ] Sheet opens without errors
- [ ] No 404 for any `templates/actors/` path
- [ ] No missing CSS (sheet renders with correct layout/styling)

---

## 3. Progression / Chargen Shell

- [ ] Open an existing Character actor sheet
- [ ] Trigger level-up or progression (button visible on sheet)
- [ ] Progression shell (`ChargenShell` from `progression-framework`) opens
- [ ] No `scripts/apps/chargen` 404s (the old chargen cluster is quarantined — the **progression-framework** version must serve this flow now)
- [ ] Template path `templates/apps/chargen.hbs` resolves (still on disk in `templates/apps/`)
- [ ] No errors in console during progression step navigation

---

## 4. NPC Sheet

- [ ] Open an existing NPC actor (or create one with type **NPC**)
- [ ] NPC sheet opens without errors
- [ ] Templates `templates/v2/npc/npc-sheet-header.hbs`, `npc-sheet-tabs.hbs`, `npc-sheet-body.hbs` resolve (these were **NOT quarantined** — still live)
- [ ] NPC panel templates in `templates/v2/npc/panels/` resolve
- [ ] No missing Handlebars partials in NPC sheet

---

## 5. Vehicle Sheet

- [ ] Open an existing Vehicle actor (or create one with type **Vehicle**)
- [ ] Vehicle sheet opens without errors
- [ ] Template `templates/actors/vehicle/v2/vehicle-sheet.hbs` resolves
- [ ] No 404 for `scripts/actors/vehicle/swse-vehicle-handler.js` (this file was **NOT quarantined** — still live at `scripts/actors/vehicle/`)
- [ ] No CSS errors related to `.swse-vehicle-sheet`

---

## 6. Store / Checkout Flow

- [ ] Open Store (if accessible from sidebar or actor sheet)
- [ ] `store-checkout.js` loads without error
- [ ] `SWSEVehicleHandler` import resolves (from `scripts/actors/vehicle/swse-vehicle-handler.js`)
- [ ] No 404 for vehicle handler module

---

## 7. CSS Visual Spot-Check

- [ ] Character sheet renders with correct layout (no broken grid/flex from missing base CSS)
- [ ] NPC sheet renders correctly
- [ ] Vehicle sheet renders correctly
- [ ] `styles/swse-holo.css` (still registered in system.json) loads — check for 404
- [ ] No visible styling regressions compared to pre-Phase-2 state

---

## 8. Handlebars Helpers (Critical — `scripts/core/init.js` is orphaned)

> **Warning:** `scripts/core/init.js` is orphaned from the loading chain but registers `{{add}}`, `{{range}}`, `{{mul}}`, `{{roundPercent}}` helpers used in live templates. If these helpers are not registered via another path, templates will fail.

- [ ] Navigate to levelup template — confirm no `Missing helper: "add"` error
- [ ] Navigate to progression-shell — confirm no `Missing helper: "add"` error
- [ ] Navigate to l1-survey-work-surface — confirm no `Missing helper: "add"` error
- [ ] If any helper error appears → **restore `scripts/core/init.js` from `_deprecated/` is NOT applicable** (it was never quarantined). Instead, find the live caller for `scripts/core/init.js` and wire it in.

---

## 9. Expected Clean State

If all checks pass:
- No files need restoration from `_deprecated/`
- Phase 2 quarantine is confirmed safe at runtime
- Proceed to **Phase 4**: permanent deletion of `_deprecated/` contents after a soak period

---

## 10. Restoration Triggers

Restore from `_deprecated/` only if:
- A 404 appears for a path that points into `_deprecated/scripts/apps/chargen/` or `_deprecated/styles/`
- A Handlebars partial/template fails that traces back to a quarantined HBS file

**Note:** No HBS template files were quarantined in Phase 2 — only JS controllers and dead CSS. A chargen-related 404 at runtime would indicate a dynamic `import()` or template render path that static analysis missed.
