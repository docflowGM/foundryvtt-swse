# Phase 4 Final Prune Report
**Date:** 2026-05-05
**Branch:** claude/audit-swse-dead-code-6hib5

---

## Summary

Phase 4 completed the full Phases 1-4 dead-code audit cycle for the SWSE FoundryVTT system. This report documents what was permanently deleted, what was restored after a quarantine error was discovered, and what remains as a future cleanup target.

---

## A. Permanently Deleted

### Phase 1 Deletions (committed earlier)

| Category | Files Removed |
|---|---|
| `esmodules` fix | Restored `"index.js"` to `system.json` (was `[]`) |
| Backup/temp artifacts | `.pre_phase_b_*`, `.pre_holo_backup*`, `.napkin` files |
| Windows shortcut | `scripts/scripts/Documents - Shortcut.lnk` |
| Archive CSS | `styles/archive/sheets-v3/` (24 files) |
| Asset mockups | `assets/Concept/` directory, `assets/concepts/droid-shipyard-customization-concept.html` |
| `scripts/scripts/` duplicates | `scripts/scripts/core/` (3 files), `scripts/scripts/scene-controls/init.js`, `scripts/scripts/ui/action-palette/init.js`, `scripts/scripts/sheets/v2/npc/NPCSheet.js` |

### Phase 4 Final Deletions (this commit)

| File | Reason |
|---|---|
| `_deprecated/scripts/apps/chargen-init.js` | Orphaned entry point — no live callers. Imports only from chargen cluster. |
| `_deprecated/scripts/apps/chargen-improved.js` | Orphaned — no live callers outside the cluster. |
| `_deprecated/scripts/apps/chargen-narrative.js` | Orphaned — no live callers outside the cluster. |
| `_deprecated/scripts/apps/chargen.js` | Barrel re-export file — no live callers. |
| `_deprecated/styles/core/swse-base.css` | Not in `system.json` styles array. No `@import`. Comment refs only in live CSS (attribution). |
| `_deprecated/styles/swse-system.css` | Not in `system.json` styles array. No `@import`. Comment refs only in live CSS (attribution). |
| `_deprecated/styles/themes/holo.css` | Not in `system.json` styles array. No `@import`. Distinct from live `styles/swse-holo.css`. |

---

## B. Restored from `_deprecated/` (Recovery Rule Triggered)

**`scripts/apps/chargen/` — full directory (23 files)**

**Reason:** Phase 2 quarantine incorrectly classified the `chargen/` implementation directory as orphaned. Static import tracing missed 3 live callers:

| Caller | Import | Type |
|---|---|---|
| `scripts/infrastructure/hooks/directory-hooks.js:7` | `CharacterGenerator` from `scripts/apps/chargen/chargen-main.js` | Static |
| `scripts/core/swse-api.js:16` | `CharacterGenerator` from `scripts/apps/chargen/chargen-main.js` | Static |
| `scripts/apps/template-character-creator.js:14` | `CharacterTemplates` from `scripts/apps/chargen/chargen-templates.js` | Static |
| `scripts/apps/template-character-creator.js:317` | `chargen-main.js` | Dynamic `import()` |

**Root cause:** The Python import trace started from `index.js`. `directory-hooks.js` is reachable from `index.js` → `init-hooks.js` → `directory-hooks.js`, but the trace apparently did not follow this path. `swse-api.js` is also reachable and imports directly from `chargen-main.js`.

**Action taken:** `git mv _deprecated/scripts/apps/chargen scripts/apps/chargen` — all 23 files restored to original paths.

**What stays deleted:** The 4 top-level barrel files (`chargen-init.js`, `chargen-improved.js`, `chargen-narrative.js`, `chargen.js`) had zero live callers confirmed — these were the actual orphaned entry points. Only the `chargen/` implementation directory had live callers.

---

## C. Remaining Phase 2 Blocked Items (Unchanged)

These items remain in their original live locations — they were never quarantined because blockers were identified in Phase 2.

| Target | Blocker | Recommended Next Action |
|---|---|---|
| `scripts/apps/progression/` | Dynamic `import()` in `suite-reselection-engine.js` and `starship-maneuver-engine.js`; static import in `progression-framework/steps/force-power-step.js` | Audit whether `progression-framework` is fully superseding `apps/progression/`; unify callers first |
| `templates/v2/npc/` | 12 template paths in `PANEL_REGISTRY.js` + `NPCSheet.js` | Confirm NPC v2 sheet is the canonical sheet; if so, these templates are live and should not be quarantined |
| `scripts/actors/vehicle/` | `store-checkout.js` imports `SWSEVehicleHandler`; `holonet/scripts/core/init.js` imports `vehicle-precreate-hooks.js` | Vehicle system is actively used; not dead code |
| `scripts/core/init.js` | Registers `{{add}}`, `{{range}}`, `{{mul}}`, `{{roundPercent}}` Handlebars helpers used in 3 live templates | Wire into loading chain or migrate helper registration to a live file before removing |

---

## D. Pre-existing Issues (Not Caused by This Audit)

| File | Issue |
|---|---|
| `scripts/skills/skill-uses.js:600` | Pre-existing syntax error (template literal) — predates Phase 2 (PR #804) |
| `scripts/houserules/houserule-condition-track.js:60` | Pre-existing syntax error (`level or 0`) — predates Phase 2 |
| `scripts/governance/sentinel/sentinel-layout-debugger.js:379` | Pre-existing syntax error (nullish coalescing parsing) — predates Phase 2 |

---

## E. Recommended Manual Foundry Smoke Checks

See `reports/phase3-runtime-smoke-checklist.md` for the full checklist. Critical items:

1. **Loading chain:** Confirm `init` and `ready` hooks fire with no 404s
2. **Character creation:** Confirm `CharacterGenerator.open()` resolves via `directory-hooks.js` → `chargen-main.js`
3. **Template creator:** Confirm `template-character-creator.js` resolves `CharacterTemplates` from `chargen-templates.js`
4. **Handlebars helpers:** Confirm `{{add}}` works in levelup/progression templates — `scripts/core/init.js` must be wired in or helpers registered elsewhere

---

## F. Exact Commands Used (Phase 4)

```bash
# Reference scan
grep -rn "CharacterGenerator\|CharacterTemplates\|ChargenDataCache\|ChargenFinalizer" \
  scripts templates --include="*.js" --include="*.hbs" | grep -v "_deprecated"

# Trace imports in callers
grep -n "import.*CharacterGenerator" scripts/infrastructure/hooks/directory-hooks.js
grep -n "import.*CharacterGenerator" scripts/core/swse-api.js
grep -n "import.*CharacterTemplates\|CharacterGenerator" scripts/apps/template-character-creator.js

# Restore chargen/ to original path
git mv _deprecated/scripts/apps/chargen scripts/apps/chargen

# Permanent deletion — confirmed orphaned files
git rm _deprecated/scripts/apps/chargen-improved.js \
       _deprecated/scripts/apps/chargen-init.js \
       _deprecated/scripts/apps/chargen-narrative.js \
       _deprecated/scripts/apps/chargen.js

# Permanent deletion — confirmed dead CSS
git rm _deprecated/styles/core/swse-base.css \
       _deprecated/styles/swse-system.css \
       _deprecated/styles/themes/holo.css
```

---

## G. Next Recommended Cleanup Targets

Priority order for future sessions:

1. **Wire `scripts/core/init.js` into the loading chain** — highest risk item. The `{{add}}` helper is actively used in templates but the file registering it is orphaned. Either import it from `index.js` or migrate the helpers to a live file.

2. **Audit `scripts/apps/progression/` vs `progression-framework/`** — determine if `apps/progression/force-power-picker.js` and `starship-maneuver-picker.js` can be superseded by the framework. The framework already has `force-power-step.js` but still imports from `apps/progression/`.

3. **Audit `scripts/scripts/mentor/`** (30 files) — deferred from Phase 1 because `mentor/engine.js` differs from the canonical version. Requires a diff-and-reconcile pass.

4. **CSS audit** — 92 CSS files still not registered in `system.json` and not `@import`ed. Now that the 3 confirmed-dead files are gone, remaining 89 unregistered files warrant a systematic audit.

5. **HBS template audit** — 244 HBS files not registered in `SWSE_TEMPLATES`. Many may be legacy templates safe for removal.
