// ============================================
// FILE: scripts/load-templates.js
// ============================================
export async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/swse/templates/actor/character-sheet.hbs",
    "systems/swse/templates/actor/droid-sheet.hbs",
    "systems/swse/templates/actor/vehicle-sheet.hbs",
    "systems/swse/templates/item/item-sheet.hbs"
  ];
  return loadTemplates(templatePaths);
}
