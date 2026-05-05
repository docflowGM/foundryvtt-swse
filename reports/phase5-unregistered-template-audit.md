# Phase 5 — Unregistered Template Audit
**Date:** 2026-05-05
**Total HBS files on disk:** 403
**Registered in `scripts/load-templates.js`:** 159
**Unregistered:** 244
**Unregistered but dynamically referenced in `scripts/`:** 88
**Unregistered with zero references:** 156

---

## Classification

### 1. Registered (159 files)
All paths listed in `SWSE_TEMPLATES` in `scripts/load-templates.js`. These are preloaded by Foundry at init — safe, no action needed.

### 2. Unregistered but Dynamically Referenced (88 files)
Not in `SWSE_TEMPLATES` but referenced as string literals in active JS files (e.g. `renderTemplate(...)`, `template: "..."`, `loadTemplates([...])`). These load on-demand. **Do not remove.** Examples include:
- `templates/apps/progression/attribute-method.hbs` (in `apps/progression/ability-method.js`)
- `templates/v2/npc/npc-sheet-header.hbs`, `npc-sheet-tabs.hbs`, `npc-sheet-body.hbs` (in `NPCSheet.js`)
- `templates/v2/npc/panels/*.hbs` (9 files in `PANEL_REGISTRY.js`)
- `templates/actors/vehicle/v2/vehicle-sheet.hbs` and partials (in `vehicle-sheet.js`)
- `templates/apps/customization/customization-bay.hbs` (in `customization-bay-app.js`)
- `templates/apps/customization/item-customization-workbench.hbs` (in `item-customization-workbench.js`)

### 3. Unregistered with Zero References (156 files — report only)

These files exist on disk but appear in neither `SWSE_TEMPLATES` nor any script string. They may be:
- **Prototype/WIP templates** (e.g. `v2-concept/` subtree)
- **Legacy v1 templates** superseded by v2 versions
- **Component sketches** never wired up

**No deletions in this phase.** Grouped by directory:

#### `templates/actors/character/` — 60 files
Notable subgroups:
- `tabs/starship-maneuvers-tab.hbs` — possibly superseded by v2 tab system
- `v2-concept/` subtree (55 files) — design prototypes, not wired to any sheet class

#### `templates/actors/droid/` — 5 files
- `droid-callouts-blueprint.hbs`, `droid-callouts-operational.hbs`
- `droid-diagnostic.hbs`, `droid-image-blueprint.hbs`, `droid-image-operational.hbs`

#### `templates/actors/npc/` — 16 files
- `npc-sheet.hbs`, `npc-core-stats.hbs`, etc. — v1 NPC templates; v2 is in `templates/v2/npc/` and `templates/actors/npc/v2/`

#### `templates/actors/vehicle/` — 19 files
- `v2/partials/` subtree with crew, cargo, maneuver panels not registered

#### `templates/apps/` — 11 individual files
- `damage-app.hbs`, `follower-inline-builder.hbs`, `mentor-suggestion-dialog.hbs`
- `meta-tuning-config.hbs`, `modifier-inspector.hbs`, `skill-modifier-breakdown.hbs`
- `store/` (6 files: cart-item-v2.hbs, product-card-v2.hbs, etc.)
- `unified-customization-workbench.hbs`, `weapons/melee-modification.hbs`

#### `templates/applications/` — 3 files
- `droid/droid-customization.hbs`, `lightsaber/lightsaber-construction.hbs`, `vehicle/vehicle-customization.hbs`

#### `templates/apps/blaster/` — 1 file
- `blaster-customization.hbs`

#### `templates/chat/` — 1 file
- `level-up-summary.hbs`

#### `templates/components/` — 10 files
- `accordion.hbs`, `button.hbs`, `hud.hbs`, `manifest.hbs`, `mod-breakdown.hbs`
- `narrator.hbs`, `panel.hbs`, `stepper.hbs`, `tabs.hbs`, `theme-control.hbs`

#### `templates/gm-tools/` — 1 file
- `homebrew-dialog.hbs`

#### `templates/icons/` — 4 files
- `attack-svg.hbs`, `customize-svg.hbs`, `damage-svg.hbs`, `menu-svg.hbs`

#### `templates/items/base/` — 1 file
- `item-sheet-old.hbs` — name suggests legacy

#### `templates/partials/` — 2 files
- `abilities-tab.hbs`, `droid-builder-budget.hbs`

#### `templates/sheets/` — 5 files
- `_sheet-skeleton.hbs` (leading underscore = draft), `components/attribute-block.hbs`
- `layouts/actor-sheet.hbs`, `partials/sheet-header.hbs`, `partials/sheet-tabs.hbs`

#### `templates/shell/` — 9 files
- `partials/` (8 files): `master-bezel-chrome.hbs`, `shell-drawer-layer.hbs`, `surface-chargen.hbs`, etc.
- `shell-surface.hbs`

#### `templates/ui/` — 1 file
- `weapon-damage-tooltip.hbs`

#### `templates/v2/npc/` — 4 files
- `npc-sheet.hbs`, `panels/defense-panel.hbs`, `panels/health-panel.hbs`, `panels/portrait-panel.hbs`
  (3 other `v2/npc/` panels are dynamically referenced by `PANEL_REGISTRY.js`)

---

## Safe Prune Candidates (Phase 6)

The following groups are highest confidence for removal after runtime validation:

| Group | Files | Confidence | Reason |
|---|---|---|---|
| `templates/actors/character/v2-concept/` | ~55 | High | Design prototypes, no references |
| `templates/items/base/item-sheet-old.hbs` | 1 | High | Self-named legacy |
| `templates/sheets/_sheet-skeleton.hbs` | 1 | Medium | Draft file (leading underscore) |
| `templates/actors/npc/` v1 templates | ~16 | Medium | Superseded by v2 NPC sheet |
| `templates/apps/blaster/blaster-customization.hbs` | 1 | Medium | Blaster app is now a compat wrapper |

---

## Commands Used

```bash
# Count
find templates -name "*.hbs" | wc -l
grep "systems/foundryvtt-swse/templates" scripts/load-templates.js | wc -l

# Full classification (Python)
# See scripts/governance/ or run inline python3 script
```
