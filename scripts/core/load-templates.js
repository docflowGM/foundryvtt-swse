/**
 * Optimized template loading with lazy loading support
 * Critical templates load immediately, others load on demand
 */
import { SWSELogger } from '../utils/logger.js';

// Track background template loading
let _backgroundTemplatePromise = null;

export async function preloadHandlebarsTemplates() {
  // ============================================
  // CRITICAL TEMPLATES - Load Immediately
  // These are needed for initial sheet render
  // ============================================
  const criticalTemplates = [
    // Main sheet templates
    "systems/foundryvtt-swse/templates/actors/character/character-sheet.hbs",
    "systems/foundryvtt-swse/templates/actors/droid/droid-sheet.hbs",
    "systems/foundryvtt-swse/templates/actors/npc/npc-sheet.hbs",
    "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-sheet.hbs",

    // Character tabs (all included in main template, must load immediately)
    "systems/foundryvtt-swse/templates/actors/character/tabs/summary-tab.hbs",
    "systems/foundryvtt-swse/templates/actors/character/tabs/abilities-tab.hbs",
    "systems/foundryvtt-swse/templates/actors/character/tabs/skills-tab.hbs",
    "systems/foundryvtt-swse/templates/actors/character/tabs/combat-tab.hbs",
    "systems/foundryvtt-swse/templates/actors/character/tabs/force-tab.hbs",
    "systems/foundryvtt-swse/templates/actors/character/tabs/talents-tab.hbs",
    "systems/foundryvtt-swse/templates/actors/character/tabs/inventory-tab.hbs",
    "systems/foundryvtt-swse/templates/actors/character/tabs/biography-tab.hbs",

    // Critical partials (used by critical templates above)
    "systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs",
    "systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs",
    "systems/foundryvtt-swse/templates/partials/skill-row-static.hbs",
    "systems/foundryvtt-swse/templates/partials/feat-actions-panel.hbs"
  ];

  // ============================================
  // LAZY TEMPLATES - Load on Demand
  // These load when needed (dialogs, apps, etc.)
  // ============================================
  const lazyTemplates = [
    // Item sheets
    "systems/foundryvtt-swse/templates/items/base/item-sheet.hbs",

    // Less common partials
    "systems/foundryvtt-swse/templates/partials/ability-block.hbs",
    "systems/foundryvtt-swse/templates/partials/ability-scores.hbs",
    "systems/foundryvtt-swse/templates/partials/defenses.hbs",
    "systems/foundryvtt-swse/templates/partials/skill-row.hbs",
    "systems/foundryvtt-swse/templates/partials/ship-combat-actions-panel.hbs",
    "systems/foundryvtt-swse/templates/partials/tab-navigation.hbs",
    "systems/foundryvtt-swse/templates/partials/item-controls.hbs",

    // Canvas UI
    "systems/foundryvtt-swse/templates/canvas-ui/toolbar.hbs"
  ];

  SWSELogger.log(`SWSE | Preloading ${criticalTemplates.length} critical templates...`);

  try {
    // Load critical templates immediately
    await foundry.applications.handlebars.loadTemplates(criticalTemplates);
    SWSELogger.log(`SWSE | Critical templates loaded (${criticalTemplates.length})`);

    // Register lazy templates with lazy loader if available
    if (window.SWSE?.lazyLoader) {
      for (const path of lazyTemplates) {
        const name = path.split('/').pop().replace('.hbs', '');
        window.SWSE.lazyLoader.registerTemplate(name, path);
      }
      SWSELogger.log(`SWSE | Registered ${lazyTemplates.length} templates for lazy loading`);
    } else {
      // Fallback: load all templates in background with promise tracking
      _backgroundTemplatePromise = new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await foundry.applications.handlebars.loadTemplates(lazyTemplates);
            SWSELogger.log(`SWSE | Background templates loaded (${lazyTemplates.length})`);
            resolve();
          } catch (error) {
            SWSELogger.error('SWSE | Error loading background templates:', error);
            resolve(); // Resolve anyway to prevent hanging
          }
        }, 1000);
      });
    }

    return true;
  } catch (err) {
    SWSELogger.error("SWSE | Error loading templates:", err);
    return false;
  }
}

/**
 * Wait for background templates to finish loading
 * @returns {Promise<void>}
 */
export async function waitForBackgroundTemplates() {
  if (_backgroundTemplatePromise) {
    await _backgroundTemplatePromise;
  }
}

/**
 * Get all template paths for reference
 * @returns {Object} Object with critical and lazy template arrays
 */
export function getTemplatePaths() {
  return {
    critical: [
      "systems/foundryvtt-swse/templates/actors/character/character-sheet.hbs",
      "systems/foundryvtt-swse/templates/actors/droid/droid-sheet.hbs",
      "systems/foundryvtt-swse/templates/actors/npc/npc-sheet.hbs",
      "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-sheet.hbs",
      "systems/foundryvtt-swse/templates/actors/character/tabs/summary-tab.hbs",
      "systems/foundryvtt-swse/templates/actors/character/tabs/abilities-tab.hbs",
      "systems/foundryvtt-swse/templates/actors/character/tabs/skills-tab.hbs",
      "systems/foundryvtt-swse/templates/actors/character/tabs/combat-tab.hbs",
      "systems/foundryvtt-swse/templates/actors/character/tabs/force-tab.hbs",
      "systems/foundryvtt-swse/templates/actors/character/tabs/talents-tab.hbs",
      "systems/foundryvtt-swse/templates/actors/character/tabs/inventory-tab.hbs",
      "systems/foundryvtt-swse/templates/actors/character/tabs/biography-tab.hbs",
      "systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs",
      "systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs",
      "systems/foundryvtt-swse/templates/partials/skill-row-static.hbs",
      "systems/foundryvtt-swse/templates/partials/feat-actions-panel.hbs"
    ],
    lazy: [
      "systems/foundryvtt-swse/templates/items/base/item-sheet.hbs",
      "systems/foundryvtt-swse/templates/partials/ability-block.hbs",
      "systems/foundryvtt-swse/templates/partials/ability-scores.hbs",
      "systems/foundryvtt-swse/templates/partials/defenses.hbs",
      "systems/foundryvtt-swse/templates/partials/skill-row.hbs",
      "systems/foundryvtt-swse/templates/partials/ship-combat-actions-panel.hbs",
      "systems/foundryvtt-swse/templates/partials/tab-navigation.hbs",
      "systems/foundryvtt-swse/templates/partials/item-controls.hbs",
      "systems/foundryvtt-swse/templates/canvas-ui/toolbar.hbs"
    ]
  };
}
