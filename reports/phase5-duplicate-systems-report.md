# Phase 5 — Duplicate Systems Report
**Date:** 2026-05-05
**Branch:** claude/audit-swse-dead-code-6hib5

---

## Summary

Phase 5 audited the mentor system, customization workbench system, all 403 HBS templates, and all 201 CSS files for duplicates and unregistered assets. Two duplicate clusters were quarantined. Template and CSS audits are report-only pending runtime validation.

---

## A. Mentor System

### Canonical Paths

| Layer | Canonical Location |
|---|---|
| UI dialogs, survey, suggestion, voice | `scripts/mentor/` |
| Engine (dialogues data, memory, orchestrator, judgment) | `scripts/engine/mentor/` |
| App-layer pickers (live) | `scripts/apps/mentor/mentor-suggestion-picker-dialog.js`, `scripts/apps/mentor/mentor-survey.js` |
| Notes app | `scripts/apps/mentor-notes/mentor-notes-app.js` |
| Dialogue data (live, top-level) | `scripts/apps/mentor-dialogues.data.js` |

### Duplicates — Quarantined

#### `scripts/scripts/mentor/` → `_deprecated/scripts/scripts/mentor/` (31 files)
- Near-exact copy of `scripts/mentor/` with one functional divergence:
  - `mentor-survey/engine.js`: `scripts/scripts/mentor/` uses the simpler `backgroundBias` array approach; `scripts/mentor/` uses the newer `backgroundBiasWeights` weighted-map approach.
- **Zero live callers** — confirmed by exhaustive grep; all live imports target `scripts/mentor/`.
- Action: **QUARANTINED**

#### `scripts/apps/mentor/mentor-suggestion-dialog.js` → `_deprecated/scripts/apps/mentor/` (1 file)
- Duplicate of `scripts/mentor/mentor-suggestion-dialog.js`. Zero external callers.
- Action: **QUARANTINED**

#### `scripts/apps/mentor/mentor-dialogues.data.js` → `_deprecated/scripts/apps/mentor/` (1 file)
- Diverges from `scripts/apps/mentor-dialogues.data.js` (the live version) — different mentor content.
- Zero external callers.
- Action: **QUARANTINED**

### Active (Not Quarantined)

| File | Status | Reason |
|---|---|---|
| `scripts/apps/mentor/mentor-suggestion-picker-dialog.js` | **LIVE** | Imported by `progression-framework/steps/mentor-step-integration.js` |
| `scripts/apps/mentor/mentor-survey.js` | **LIVE** | Dynamically imported by `scripts/apps/chargen/chargen-class.js` |
| `scripts/apps/mentor-dialogues.data.js` | **LIVE** | Imported by `scripts/mentor/mentor-survey/definition-builder.js` |

---

## B. Customization Workbench System

### Canonical Path
`scripts/apps/customization/item-customization-workbench.js` (V2 canonical)
Launched via `scripts/apps/customization/item-customization-router.js` → `openItemCustomization()`.

### Duplicates — Quarantined

All 4 files are self-labeled "DEPRECATED COMPATIBILITY WRAPPER" with zero external callers:

| File | → Deprecated location |
|---|---|
| `scripts/apps/customization/raw-customization-workbench-app.js` | `_deprecated/scripts/apps/customization/` |
| `scripts/apps/customization/unified-customization-workbench.js` | `_deprecated/scripts/apps/customization/` |
| `scripts/apps/customization/unified-workbench-integration.js` | `_deprecated/scripts/apps/customization/` |
| `scripts/apps/customization/customization-workbench-app.js` | `_deprecated/scripts/apps/customization/` |

Note: `scripts/apps/customization/index.js` re-exports these 4 files for "legacy imports" but has zero external callers itself. It was left in place as a safe dead-end rather than quarantined.

### Active (Not Quarantined)

| File | Status |
|---|---|
| `customization-bay-app.js` | **LIVE** — imported by vehicle and droid customization apps |
| `item-customization-workbench.js` | **LIVE** — the V2 canonical workbench |
| `item-customization-router.js` | **LIVE** — the launch router |
| `customization-workbench-setup.js` | **LIVE** — imports from workbench |
| `customization-router.js` | Needs separate verification |
| `adapters/` subdirectory | Needs separate verification |

---

## C. Templates — Unregistered (Report Only)

See `reports/phase5-unregistered-template-audit.md` for full classification.

**Summary:**
- 403 total HBS files
- 159 registered in `SWSE_TEMPLATES`
- 88 unregistered but dynamically referenced (do not remove)
- 156 unregistered with zero references

**Top Phase 6 candidates:**
- `templates/actors/character/v2-concept/` subtree (~55 files) — design prototypes
- `templates/items/base/item-sheet-old.hbs` — self-named legacy
- `templates/actors/npc/` v1 templates (~16 files) — likely superseded by v2

---

## D. CSS — Unregistered (Report Only)

See `reports/phase5-unregistered-css-audit.md` for full classification.

**Summary:**
- 201 total CSS files
- 103 registered in `system.json`
- 0 @imported
- 6 dynamically injected
- 97 unregistered with zero references

**Top Phase 6 candidates:**
- `styles/apps/unified-customization-workbench.css` — companion to quarantined JS
- `styles/customization-workbench.css` — legacy workbench
- `styles/apps/chargen/chargen-talent-tree.css` and `chargen-templates.css` — old chargen

---

## E. Blocked Items (Unchanged from Phase 4)

| Target | Blocker |
|---|---|
| `scripts/apps/progression/` | Dynamic `import()` in `suite-reselection-engine.js`, `starship-maneuver-engine.js`; static import in `progression-framework/steps/force-power-step.js` |
| `templates/v2/npc/` | 12 template paths in `PANEL_REGISTRY.js` + `NPCSheet.js` |
| `scripts/actors/vehicle/` | `store-checkout.js` → `SWSEVehicleHandler`; `holonet/init.js` → `vehicle-precreate-hooks.js` |
| `scripts/core/init.js` | Registers `{{add}}`, `{{range}}`, `{{mul}}`, `{{roundPercent}}` used in live templates |

---

## F. Exact Commands Used

```bash
# Mentor: find all files
find scripts -path "*mentor*" -type f | sort

# Mentor: find all live import paths
grep -rn "from.*mentor/" scripts --include="*.js" | grep "import\|require" | grep -v "node_modules"

# Mentor: diff the two copies
diff -qr scripts/mentor scripts/scripts/mentor

# Customization: find external callers of each wrapper file
grep -rn "raw-customization-workbench-app|unified-customization-workbench|unified-workbench-integration" \
  scripts templates --include="*.js" --include="*.hbs" | grep "import|require" | grep -v "scripts/apps/customization/"

# Template audit (Python) — see phase5-unregistered-template-audit.md
# CSS audit (Python) — see phase5-unregistered-css-audit.md

# Quarantine moves
git mv scripts/scripts/mentor _deprecated/scripts/scripts/mentor
git mv scripts/apps/mentor/mentor-suggestion-dialog.js _deprecated/scripts/apps/mentor/
git mv scripts/apps/mentor/mentor-dialogues.data.js _deprecated/scripts/apps/mentor/
git mv scripts/apps/customization/raw-customization-workbench-app.js _deprecated/scripts/apps/customization/
git mv scripts/apps/customization/unified-customization-workbench.js _deprecated/scripts/apps/customization/
git mv scripts/apps/customization/unified-workbench-integration.js _deprecated/scripts/apps/customization/
git mv scripts/apps/customization/customization-workbench-app.js _deprecated/scripts/apps/customization/
```

---

## G. Recommended Phase 6 Targets

1. **Wire `scripts/core/init.js`** — Handlebars helpers (`{{add}}` etc.) are orphaned. Highest runtime risk.
2. **`templates/actors/character/v2-concept/` (~55 files)** — Design prototypes, zero references.
3. **`styles/apps/unified-customization-workbench.css` + companion CSS** — Companions to quarantined JS.
4. **Audit `scripts/apps/customization/index.js`** — Re-exports only deprecated items; could be removed after confirming no macro/global references.
5. **`scripts/scripts/` remaining dirs** — `macros/`, `maintenance/`, `sheets/`, `ui/` under `scripts/scripts/` were not touched in Phase 1. Same misplaced-copy pattern; verify against canonical paths.
6. **`templates/actors/npc/` v1 templates** — 16 files with no references; confirm v2 NPC sheet is fully operational first.
