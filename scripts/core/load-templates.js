/**
 * Preload Handlebars templates
 */
export async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/swse/templates/actors/character/character-sheet.hbs",
    "systems/swse/templates/actors/droid/droid-sheet.hbs",
    "systems/swse/templates/actors/vehicle/vehicle-sheet.hbs",
    "systems/swse/templates/actors/npc/npc-sheet.hbs",
    "systems/swse/templates/actors/item-sheet.hbs",
    "systems/swse/templates/actors/character/tabs/force-tab.hbs",
    "systems/swse/templates/actors/character/tabs/summary-tab.hbs",
    "systems/swse/templates/actors/character/tabs/talents-tab.hbs",
    "systems/swse/templates/partials/ability-block.hbs",
    "systems/swse/templates/partials/skill-row.hbs"
  ];

  console.log("SWSE | Preloading templates...");
  
  let loaded = 0;
  let failed = 0;
  
  for (const path of templatePaths) {
    try {
      await getTemplate(path);
      loaded++;
    } catch (err) {
      console.error(`SWSE | Failed to load: ${path}`, err);
      failed++;
    }
  }
  
  console.log(`SWSE | Loaded ${loaded}/${templatePaths.length} templates`);
  if (failed > 0) {
    console.warn(`SWSE | ${failed} template(s) failed to load`);
  }
}
