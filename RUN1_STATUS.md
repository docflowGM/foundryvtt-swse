# SWSE Run 1 Migration Status (2026-02-11)

This file lists repo-wide V1/V2 violations that were identified and whether they are fixed as of the end of Run 1.

## Gates

- **v1_dialog**: ✅ fixed (0 remaining)
- **jquery**: ✅ fixed (0 remaining)
- **browser_native_dialogs**: ✅ fixed (0 `window.alert/confirm/prompt` remaining; confirm/prompt wrappers remain by design)

## Identified surfaces (original scan)

- V1 Dialog usage files: **69** → **0**
- Browser-native dialog call sites: **10** → **0 window.* occurrences**
- Real jQuery invocations: **14** → **0**

### V1 Dialog usage (original)

| File | Status |
|---|---|
| `scripts/actors/vehicle/swse-vehicle-core.js` | ✅ fixed |
| `scripts/apps/chargen-improved.js` | ✅ fixed |
| `scripts/apps/chargen-init.js` | ✅ fixed |
| `scripts/apps/chargen-narrative.js` | ✅ fixed |
| `scripts/apps/custom-item-dialog.js` | ✅ fixed |
| `scripts/apps/droid-builder-app.js` | ✅ fixed |
| `scripts/apps/follower-creator.js` | ✅ fixed |
| `scripts/apps/gm-droid-approval-dashboard.js` | ✅ fixed |
| `scripts/apps/gm-store-dashboard.js` | ✅ fixed |
| `scripts/apps/item-selling-system.js` | ✅ fixed |
| `scripts/apps/levelup/diff-viewer.js` | ✅ fixed |
| `scripts/apps/levelup/levelup-class.js` | ✅ fixed |
| `scripts/apps/levelup/levelup-main.js` | ✅ fixed |
| `scripts/apps/levelup/levelup-talents.js` | ✅ fixed |
| `scripts/apps/levelup/npc-levelup-entry.js` | ✅ fixed |
| `scripts/apps/mentor/mentor-survey.js` | ✅ fixed |
| `scripts/apps/nonheroic-units-browser.js` | ✅ fixed |
| `scripts/apps/prerequisite-builder-dialog.js` | ✅ fixed |
| `scripts/apps/proficiency-selection-dialog.js` | ✅ fixed |
| `scripts/apps/progression/progression-preview.js` | ✅ fixed |
| `scripts/apps/store/store-checkout.js` | ✅ fixed |
| `scripts/apps/talent-tree-visualizer.js` | ✅ fixed |
| `scripts/apps/template-character-creator.js` | ✅ fixed |
| `scripts/apps/upgrade-app.js` | ✅ fixed |
| `scripts/apps/vehicle-modification-app.js` | ✅ fixed |
| `scripts/combat/combat-automation.js` | ✅ fixed |
| `scripts/combat/damage-system.js` | ✅ fixed |
| `scripts/combat/multi-attack.js` | ✅ fixed |
| `scripts/combat/rolls/enhanced-rolls.js` | ✅ fixed |
| `scripts/combat/saber-lock-mechanics.js` | ✅ fixed |
| `scripts/components/combat-action-bar.js` | ✅ fixed |
| `scripts/core/v1-api-scanner.js` | ✅ fixed |
| `scripts/core/world-data-loader.js` | ✅ fixed |
| `scripts/drag-drop/drop-handler.js` | ✅ fixed |
| `scripts/engine/MetaTuning.js` | ✅ fixed |
| `scripts/engine/TalentAbilitiesEngine.js` | ✅ fixed |
| `scripts/engine/npc-levelup.js` | ✅ fixed |
| `scripts/gm-tools/homebrew-manager.js` | ✅ fixed |
| `scripts/helpers/swse-dialog-helper.js` | ✅ fixed |
| `scripts/hooks/actor-hooks.js` | ✅ fixed |
| `scripts/hooks/combat-hooks.js` | ✅ fixed |
| `scripts/hooks/follower-hooks.js` | ✅ fixed |
| `scripts/houserules/houserule-feat-grants.js` | ✅ fixed |
| `scripts/houserules/houserule-healing-skill-integration.js` | ✅ fixed |
| `scripts/houserules/houserule-menus.js` | ✅ fixed |
| `scripts/mentor/mentor-guidance.js` | ✅ fixed |
| `scripts/mentor/mentor-selector.js` | ✅ fixed |
| `scripts/mentor/mentor-survey.js` | ✅ fixed |
| `scripts/mentor/mentor-translation-settings.js` | ✅ fixed |
| `scripts/progression/ui/progression-ui.js` | ✅ fixed |
| `scripts/rolls/roll-config.js` | ✅ fixed |
| `scripts/species/species-reroll-handler.js` | ✅ fixed |
| `scripts/talents/DarkSidePowers.js` | ✅ fixed |
| `scripts/talents/dark-side-devotee-macros.js` | ✅ fixed |
| `scripts/talents/dark-side-powers-init.js` | ✅ fixed |
| `scripts/talents/dark-side-talent-macros.js` | ✅ fixed |
| `scripts/talents/dark-side-talent-mechanics.js` | ✅ fixed |
| `scripts/talents/light-side-talent-macros.js` | ✅ fixed |
| `scripts/talents/light-side-talent-mechanics.js` | ✅ fixed |
| `scripts/talents/noble-talent-mechanics.js` | ✅ fixed |
| `scripts/talents/scoundrel-talent-mechanics.js` | ✅ fixed |
| `scripts/talents/scout-talent-mechanics.js` | ✅ fixed |
| `scripts/talents/soldier-talent-mechanics.js` | ✅ fixed |
| `scripts/ui/ArchetypeUIComponents.js` | ✅ fixed |
| `scripts/ui/action-palette/action-palette.js` | ✅ fixed |
| `scripts/utils/force-enhancement-dialog.js` | ✅ fixed |
| `scripts/utils/force-points.js` | ✅ fixed |
| `scripts/utils/force-power-manager.js` | ✅ fixed |
| `scripts/utils/starship-maneuver-manager.js` | ✅ fixed |

### Browser-native dialog call sites (original)

| File | Status |
|---|---|
| `scripts/apps/character-import-wizard.js` | ✅ fixed |
| `scripts/apps/chargen/ability-rolling.js` | ✅ fixed |
| `scripts/apps/chargen/chargen-class.js` | ✅ fixed |
| `scripts/apps/chargen/chargen-main.js` | ✅ fixed |
| `scripts/apps/chargen/chargen-species.js` | ✅ fixed |
| `scripts/apps/gm-store-dashboard.js` | ✅ fixed |
| `scripts/apps/item-selling-system.js` | ✅ fixed |
| `scripts/engine/phase3/BuildIdentityAnchor.js` | ✅ fixed |
| `scripts/helpers/swse-dialog-helper.js` | ✅ fixed |
| `scripts/utils/ui-utils.js` | ✅ fixed |

### Real jQuery invocations (original)

| File | Status |
|---|---|
| `scripts/apps/custom-item-dialog.js` | ✅ fixed |
| `scripts/apps/levelup/debug-panel.js` | ✅ fixed |
| `scripts/apps/levelup/prestige-roadmap.js` | ✅ fixed |
| `scripts/apps/talent-tree-visualizer.js` | ✅ fixed |
| `scripts/combat/combat-integration.js` | ✅ fixed |
| `scripts/components/combat-action-bar.js` | ✅ fixed |
| `scripts/components/condition-track.js` | ✅ fixed |
| `scripts/components/force-suite.js` | ✅ fixed |
| `scripts/core/keybindings.js` | ✅ fixed |
| `scripts/debug/v2-slippage-lint.js` | ✅ fixed |
| `scripts/hooks/actor-hooks.js` | ✅ fixed |
| `scripts/hooks/follower-hooks.js` | ✅ fixed |
| `scripts/progression/ui/progression-ui.js` | ✅ fixed |
| `scripts/ui/discovery/index.js` | ✅ fixed |

