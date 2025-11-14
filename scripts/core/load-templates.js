export async function preloadHandlebarsTemplates() {
  const templatePaths = [
    // Actor sheets
    "systems/swse/templates/actors/character/character-sheet.hbs",
    "systems/swse/templates/actors/droid/droid-sheet.hbs",
    "systems/swse/templates/actors/npc/npc-sheet.hbs",
    "systems/swse/templates/actors/vehicle/vehicle-sheet.hbs",
    "systems/swse/templates/items/base/item-sheet.hbs",

    // Character tabs
    "systems/swse/templates/actors/character/tabs/summary-tab.hbs",
    "systems/swse/templates/actors/character/tabs/abilities-tab.hbs",
    "systems/swse/templates/actors/character/tabs/skills-tab.hbs",
    "systems/swse/templates/actors/character/tabs/combat-tab.hbs",
    "systems/swse/templates/actors/character/tabs/force-tab.hbs",
    "systems/swse/templates/actors/character/tabs/talents-tab.hbs",
    "systems/swse/templates/actors/character/tabs/inventory-tab.hbs",
    "systems/swse/templates/actors/character/tabs/biography-tab.hbs",

    // Partials
    "systems/swse/templates/partials/actor/persistent-header.hbs",
    "systems/swse/templates/partials/ui/condition-track.hbs",
    "systems/swse/templates/partials/ability-block.hbs",
    "systems/swse/templates/partials/ability-scores.hbs",
    "systems/swse/templates/partials/defenses.hbs",
    "systems/swse/templates/partials/skill-row.hbs",
    "systems/swse/templates/partials/skill-row-static.hbs",
    "systems/swse/templates/partials/ship-combat-actions-panel.hbs",
    "systems/swse/templates/partials/tab-navigation.hbs",
    "systems/swse/templates/partials/item-controls.hbs"
  ];

  console.log("SWSE | Preloading templates...");

  try {
    await foundry.applications.handlebars.loadTemplates(templatePaths);
    console.log(`SWSE | Successfully loaded ${templatePaths.length} templates`);
    return true;
  } catch (err) {
    console.error("SWSE | Error loading templates:", err);
    return false;
  }
}
