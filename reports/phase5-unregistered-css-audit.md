# Phase 5 — Unregistered CSS Audit
**Date:** 2026-05-05
**Total CSS files on disk (excl. _deprecated):** 201
**Registered in `system.json` styles array:** 103
**@imported by another CSS file:** 0
**Dynamically injected via JS:** 6
**Unregistered, not @imported, not dyn-JS:** 97

---

## Classification

### 1. Registered in `system.json` (103 files)
Loaded at Foundry init via the styles array. Safe, no action needed.

### 2. Dynamically Injected via JS (6 files)
Referenced as string paths in active JS files (e.g. `link.href = ...`). Not loaded via system.json but valid. Do not remove.

### 3. Unregistered, Not Imported, Not Dynamic (97 files — report only)

No deletions in this phase. Full list grouped by directory:

#### `styles/actor-sheets/` — 1 file
- `action-economy-indicator.css`

#### `styles/actors/v2/summary/` — 3 files
- `damage-reduction.css`, `hp-shield-wrapper.css`, `shield-rating.css`

#### `styles/apps/` — 28 files
Notable:
- `armor-modification.css`, `blaster-customization.css`
- `chargen/chargen-talent-tree.css`, `chargen/chargen-templates.css`
- `force-power-picker.css`, `gear-modification.css`
- `item-customization-workbench.css`, `levelup.css`
- `melee-modification.css`, `modification-modal-shell.css`
- `progression-framework/dialogs/recovery-session-dialog.css`
- `skill-modifier-breakdown.css`, `store-cards.css`
- `swse-templates-consolidated.css`, `talent-tree-common.css`
- `talent-tree-visualizer.css`, `unified-customization-workbench.css`
- `upgrade-app.css`, `ux-polish.css`, `vehicle-modification.css`

#### `styles/chargen/` — 1 file
- `near-human.css`

#### `styles/chat/` — 1 file
- `damage-log.css`

#### `styles/combat/` — 5 files
- `combat-enhancements.css`, `enhanced-rolls.css`, `initiative.css`
- `multi-attack.css`, `vehicle-combat.css`

#### `styles/components/` — 10 files
- `assets-tab.css`, `buttons.css`, `discovery.css`, `forms.css`
- `item-action-bar.css`, `panels.css`, `suggestion-card.css`
- `tabs.css`, `talent-abilities.css`, `xp-bar.css`

#### `styles/core/` — 3 files
- `appv2-structural-safe.css`, `canvas-safety.css`, `first-run-experience.css`

#### `styles/` root — 3 files
- `core-overrides.css`, `customization-workbench.css`, `mentor.css`, `npc-level3.css`

#### `styles/dialogs/` — 1 file
- `holo-dialogs.css`

#### `styles/fixes/` — 1 file
- `canvas-viewport-fix.css`

#### `styles/gm/` — 1 file
- `suggestion-panel.css`

#### `styles/hooks/` — 1 file
- `follower.css`

#### `styles/progression/` — 2 files
- `ability-rolling.css`, `suggestion-engine.css`

#### `styles/progression-framework/` — 6 files
- `action-footer.css`, `mentor-rail.css`, `progress-rail.css`
- `progression-framework.css`, `progression-interiors-phase2.css`
- `progression-shell-placeholders.css`

#### `styles/rolls/` — 1 file
- `roll-config.css`

#### `styles/sheets/` — 10 files
- `abilities-tab.css`, `droid-sheet.css`, `feat-actions.css`
- `improved-contrast.css`, `inventory.css`, `lightsaber-item.css`
- `sheet-improvements.css`, `skill-actions.css`, `unified-sheets.css`
- `vehicle-sheet.css`

#### `styles/shell/` — 1 file
- `home-surface.css`

#### `styles/species/` — 1 file
- `species-traits.css`

#### `styles/system/` — 2 files
- `final-v2-hardening.css`, `master-bezel-chrome.css`

#### `styles/themes/` — 6 files
- `swse-theme-high-contrast.css`, `swse-theme-high-republic.css`
- `swse-theme-holo.css`, `swse-theme-jedi.css`
- `swse-theme-sand-people.css`, `swse-theme-starship.css`

#### `styles/ui/` — 5 files
- `action-economy-buttons.css`, `combat-action-economy.css`
- `directory-buttons.css`, `tab-pulse.css`, `wishlist.css`

#### `styles/utils/` — 3 files
- `force-enhancement.css`, `force-power-manager.css`, `starship-maneuver.css`

---

## Safe Prune Candidates (Phase 6)

| File | Confidence | Reason |
|---|---|---|
| `styles/apps/unified-customization-workbench.css` | High | Companion to quarantined `unified-customization-workbench.js` |
| `styles/customization-workbench.css` | High | Legacy workbench CSS, workbench app quarantined |
| `styles/apps/blaster-customization.css` | Medium | Blaster app is now a compat wrapper only |
| `styles/apps/chargen/chargen-talent-tree.css` | Medium | Old chargen (entry points deleted Phase 4) |
| `styles/apps/chargen/chargen-templates.css` | Medium | Old chargen (entry points deleted Phase 4) |
| `styles/themes/swse-theme-*.css` (6 files) | Low | Themes may be dynamically applied — verify first |

---

## Note on `styles/sheets/droid-sheet.css` and `vehicle-sheet.css`
These appear in `character-sheet-css-governance.allowlist.json` and were previously confirmed as intentionally kept. They remain in the unregistered list but should not be removed without updating the governance allowlist.

---

## Commands Used

```bash
# Count
find styles -name "*.css" | grep -v "_deprecated\|node_modules" | wc -l
python3 -c "import json; d=json.load(open('system.json')); print(len(d.get('styles',[])))"
```
