# Template Audit

Date: 2026-06-30

## Purpose

Inventory all Handlebars template references in JavaScript source files, confirm
each referenced template exists on disk, document stale preload entries removed,
and flag missing templates that require developer attention before the affected
features can render.

---

## 1. Scan Methodology

- Source patterns searched: `renderTemplate(`, `template:`, `templatePath`, `loadTemplates(`,
  `Handlebars.registerPartial(`, `.hbs`, `.html` string literals across all `.js` files
  in `scripts/` and `index.js`
- Template existence confirmed via filesystem check against the repo root
- 471 unique template paths collected; 447 existed; 24 were missing

---

## 2. Stale Preload Entries Removed

The following entries were removed from `scripts/load-templates.js` and
`scripts/core/load-templates.js` because the template files no longer exist
(moved, renamed, or superseded by v2 equivalents).

### scripts/load-templates.js — removed

| Removed entry | Reason |
|---|---|
| `templates/actors/character/v2/character-sheet.hbs` | Superseded by `v2-concept/` sheet |
| `templates/actors/vehicle/v2/vehicle-sheet.hbs` | Superseded by v2 partials |
| `templates/actors/npc/npc-image.hbs` | Legacy NPC partial, no longer used |
| `templates/apps/chargen.hbs` | Replaced by progression-framework shell |
| `templates/apps/levelup.hbs` | Replaced by progression-framework shell |
| `templates/apps/levelup-engine-ui.hbs` | Replaced by progression-framework shell |
| `templates/apps/chargen/ability-rolling.hbs` | Replaced by progression-framework steps |
| `templates/apps/progression/attribute-method.hbs` | Legacy progression, removed |
| `templates/apps/progression/sidebar.hbs` | Legacy progression, removed |
| `templates/actors/npc/npc-core-stats.hbs` | Legacy NPC block, superseded by v2 |
| `templates/actors/npc/npc-diagnostics-block.hbs` | Legacy NPC block, superseded by v2 |
| `templates/actors/npc/npc-specials-block.hbs` | Legacy NPC block, superseded by v2 |
| `templates/actors/npc/npc-talent-block.hbs` | Legacy NPC block, superseded by v2 |
| `templates/actors/npc/npc-weapon-block.hbs` | Legacy NPC block, superseded by v2 |
| `templates/actors/vehicle/vehicle-callouts.hbs` | Legacy vehicle partial, removed |
| `templates/actors/vehicle/vehicle-image.hbs` | Legacy vehicle partial, removed |

### scripts/core/load-templates.js — removed

| Removed entry | Reason |
|---|---|
| `templates/actors/npc/npc-summary-hud.hbs` | Legacy NPC HUD, superseded by v2 |

---

## 3. Panel Registry Path Fixes

`scripts/sheets/v2/npc/PANEL_REGISTRY.js` had three panels pointing at
`v2/character/panels/` paths that do not exist. The correct files exist under
`v2/npc/panels/`.

| Panel | Wrong path | Correct path |
|---|---|---|
| `portraitPanel` | `templates/v2/character/panels/portrait-panel.hbs` | `templates/v2/npc/panels/portrait-panel.hbs` |
| `healthPanel` | `templates/v2/character/panels/health-panel.hbs` | `templates/v2/npc/panels/health-panel.hbs` |
| `defensePanel` | `templates/v2/character/panels/defense-panel.hbs` | `templates/v2/npc/panels/defense-panel.hbs` |

---

## 4. Missing Template Resolutions (PR 12)

All 4 missing templates from the initial audit have been resolved.

### 4.1 maneuvers-panel.hbs — CREATED

| Field | Value |
|---|---|
| Template path | `templates/actors/character/v2/partials/maneuvers-panel.hbs` |
| Referenced by | `scripts/sheets/v2/context/PANEL_REGISTRY.js:485` (metadata field) |
| Runtime impact | The `template` field in PANEL_REGISTRY is documentation-only metadata; no `renderTemplate()` call uses it at runtime. However, all 14 sibling panels in the same PANEL_REGISTRY have corresponding real files in `templates/actors/character/v2/partials/`. This was the only gap. |
| Resolution | Created minimal stub template matching the panel context contract (`maneuverPanel.{entries, hasEntries, totalCount, emptyMessage}`, row shape: `id/name/source/summary`, rootSelector: `.maneuvers-panel`). |

### 4.2 sentinel-dashboard.hbs — DEFERRED (caller is dead code)

| Field | Value |
|---|---|
| Template path | `templates/apps/sentinel-dashboard.hbs` |
| Referenced by | `scripts/governance/sentinel/sentinel-dashboard.js:27` |
| Caller status | `SentinelDashboard` class has zero callers outside its own file. No dynamic import, no `game.swse.*`, no `window.*`, no `globalThis.*`, no `Hooks.on` self-registration. The class is exported but never imported. It is dead code. |
| Resolution | No template created. Template path cannot be reached at runtime. Intentionally deferred — if `SentinelDashboard` is wired into the system in a future PR, the template should be created then. |

### 4.3 droid-degree-step.hbs — DEFERRED (caller is deprecated/orphaned)

| Field | Value |
|---|---|
| Template path | `templates/apps/progression-framework/steps/droid-degree-step.hbs` |
| Referenced by | `scripts/apps/progression-framework/steps/droid-degree-step.js:143` |
| Caller status | File is labeled **DEPRECATED / ORPHANED** at line 1 of its source: "Droid first-time construction now runs through DroidBuilder/Garage Construction Mode … this standalone step is intentionally not wired into the progression spine." Zero static imports from any other file. |
| Resolution | No template created. Template path cannot be reached at runtime. Intentionally deferred pending decision on whether the deprecated file should be deleted. |

### 4.4 droid-model-step.hbs — DEFERRED (caller is deprecated/orphaned)

| Field | Value |
|---|---|
| Template path | `templates/apps/progression-framework/steps/droid-model-step.hbs` |
| Referenced by | `scripts/apps/progression-framework/steps/droid-model-step.js:186` |
| Caller status | File is labeled **DEPRECATED / ORPHANED** at line 1 of its source, same note as droid-degree-step.js. Zero static imports from any other file. |
| Resolution | No template created. Template path cannot be reached at runtime. Intentionally deferred pending decision on whether the deprecated file should be deleted. |

---

## 5. Future Unreferenced Template Scan

Approximately 80 template files on disk were not referenced by any JS string
literal found during this scan. These are candidates for deletion but require
additional validation:

- Partials used via `{{> partial-name}}` inside `.hbs` files (cross-template includes)
  were not traced — this scanner only processed JS source files
- Some templates may be referenced via computed paths (variable string concatenation)
- A full Handlebars partial include scan across all `.hbs` files is needed before
  any template deletion

This work is deferred to a future audit pass.
