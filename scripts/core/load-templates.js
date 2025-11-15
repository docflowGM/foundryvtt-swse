/**
 * Optimized template loading with lazy loading support
 * Critical templates load immediately, others load on demand
 */
export async function preloadHandlebarsTemplates() {
  // ============================================
  // CRITICAL TEMPLATES - Load Immediately
  // These are needed for initial sheet render
  // ============================================
  const criticalTemplates = [
    // Main sheet templates
    "systems/swse/templates/actors/character/character-sheet.hbs",
    "systems/swse/templates/actors/droid/droid-sheet.hbs",
    "systems/swse/templates/actors/npc/npc-sheet.hbs",
    "systems/swse/templates/actors/vehicle/vehicle-sheet.hbs",

    // Summary tab (always shown first)
    "systems/swse/templates/actors/character/tabs/summary-tab.hbs",

    // Critical partials
    "systems/swse/templates/partials/actor/persistent-header.hbs",
    "systems/swse/templates/partials/ui/condition-track.hbs",
    "systems/swse/templates/partials/skill-row-static.hbs"
  ];

  // ============================================
  // LAZY TEMPLATES - Load on Demand
  // These load when their tab is opened
  // ============================================
  const lazyTemplates = [
    // Character tabs (loaded when clicked)
    "systems/swse/templates/actors/character/tabs/abilities-tab.hbs",
    "systems/swse/templates/actors/character/tabs/skills-tab.hbs",
    "systems/swse/templates/actors/character/tabs/combat-tab.hbs",
    "systems/swse/templates/actors/character/tabs/force-tab.hbs",
    "systems/swse/templates/actors/character/tabs/talents-tab.hbs",
    "systems/swse/templates/actors/character/tabs/inventory-tab.hbs",
    "systems/swse/templates/actors/character/tabs/biography-tab.hbs",

    // Item sheets
    "systems/swse/templates/items/base/item-sheet.hbs",

    // Less common partials
    "systems/swse/templates/partials/ability-block.hbs",
    "systems/swse/templates/partials/ability-scores.hbs",
    "systems/swse/templates/partials/defenses.hbs",
    "systems/swse/templates/partials/skill-row.hbs",
    "systems/swse/templates/partials/ship-combat-actions-panel.hbs",
    "systems/swse/templates/partials/tab-navigation.hbs",
    "systems/swse/templates/partials/item-controls.hbs",

    // Canvas UI
    "systems/swse/templates/canvas-ui/toolbar.hbs"
  ];

  console.log(`SWSE | Preloading ${criticalTemplates.length} critical templates...`);

  try {
    // Load critical templates immediately
    await foundry.applications.handlebars.loadTemplates(criticalTemplates);
    console.log(`SWSE | Critical templates loaded (${criticalTemplates.length})`);

    // Register lazy templates with lazy loader if available
    if (window.SWSE?.lazyLoader) {
      for (const path of lazyTemplates) {
        const name = path.split('/').pop().replace('.hbs', '');
        window.SWSE.lazyLoader.registerTemplate(name, path);
      }
      console.log(`SWSE | Registered ${lazyTemplates.length} templates for lazy loading`);
    } else {
      // Fallback: load all templates in background
      setTimeout(async () => {
        await foundry.applications.handlebars.loadTemplates(lazyTemplates);
        console.log(`SWSE | Background templates loaded (${lazyTemplates.length})`);
      }, 1000);
    }

    return true;
  } catch (err) {
    console.error("SWSE | Error loading templates:", err);
    return false;
  }
}

/**
 * Get all template paths for reference
 * @returns {Object} Object with critical and lazy template arrays
 */
export function getTemplatePaths() {
  return {
    critical: [
      "systems/swse/templates/actors/character/character-sheet.hbs",
      "systems/swse/templates/actors/droid/droid-sheet.hbs",
      "systems/swse/templates/actors/npc/npc-sheet.hbs",
      "systems/swse/templates/actors/vehicle/vehicle-sheet.hbs",
      "systems/swse/templates/actors/character/tabs/summary-tab.hbs",
      "systems/swse/templates/partials/actor/persistent-header.hbs",
      "systems/swse/templates/partials/ui/condition-track.hbs",
      "systems/swse/templates/partials/skill-row-static.hbs"
    ],
    lazy: [
      "systems/swse/templates/actors/character/tabs/abilities-tab.hbs",
      "systems/swse/templates/actors/character/tabs/skills-tab.hbs",
      "systems/swse/templates/actors/character/tabs/combat-tab.hbs",
      "systems/swse/templates/actors/character/tabs/force-tab.hbs",
      "systems/swse/templates/actors/character/tabs/talents-tab.hbs",
      "systems/swse/templates/actors/character/tabs/inventory-tab.hbs",
      "systems/swse/templates/actors/character/tabs/biography-tab.hbs",
      "systems/swse/templates/items/base/item-sheet.hbs",
      "systems/swse/templates/partials/ability-block.hbs",
      "systems/swse/templates/partials/ability-scores.hbs",
      "systems/swse/templates/partials/defenses.hbs",
      "systems/swse/templates/partials/skill-row.hbs",
      "systems/swse/templates/partials/ship-combat-actions-panel.hbs",
      "systems/swse/templates/partials/tab-navigation.hbs",
      "systems/swse/templates/partials/item-controls.hbs",
      "systems/swse/templates/canvas-ui/toolbar.hbs"
    ]
  };
}
