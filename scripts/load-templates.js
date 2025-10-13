// ============================================
// FILE: scripts/load-templates.js (UPDATED)
// ============================================
export async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/swse/templates/actor/character-sheet.hbs",
    "systems/swse/templates/actor/droid-sheet.hbs",
    "systems/swse/templates/actor/vehicle-sheet.hbs",
    "systems/swse/templates/actor/npc-sheet.hbs",
    "systems/swse/templates/item/item-sheet.hbs",
    // // // "systems/swse/templates/partials/defense-block.hbs" // Removed - does not exist, // Removed - does not exist // Removed - doesn't exist
    // // "systems/swse/templates/partials/item-entry.hbs" // Removed - does not exist, // Removed - does not exist
    "systems/swse/templates/apps/chargen.hbs"
  ];

  console.log("SWSE | Preloading Handlebars templates...");
  try {
    await loadTemplates(templatePaths);
    console.log(`SWSE | Successfully preloaded ${templatePaths.length} templates`);
  } catch (err) {
    console.error("SWSE | Error preloading templates:", err);
  }
  return true;
}
