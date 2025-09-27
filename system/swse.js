// systems/swse/swse.js

//────────────────────────────────────────────
// Initialization
//────────────────────────────────────────────
Hooks.once("init", () => {
  console.log("SWSE | Initializing system");

  // Register actor types
  CONFIG.Actor.documentClass = Actor;

  // Use Foundry's default ActorSheet for now
  Actors.registerSheet("swse", ActorSheet, {
    types: ["character", "npc", "vehicle", "droid"],
    makeDefault: true
  });

  // Use Foundry's default ItemSheet for now
  Items.registerSheet("swse", ItemSheet, {
    makeDefault: true
  });
});

//────────────────────────────────────────────────────────────
// Fallback: Ensure all new actors have a type
//────────────────────────────────────────────────────────────
Hooks.on("preCreateActor", (actor, data, options, userId) => {
  if (!data.type) {
    console.warn("[SWSE] Actor created without type, defaulting to 'character'");
    actor.updateSource({ type: "character" });
  }
});
async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return await response.json();
}

Hooks.once("init", async function() {
  console.log("SWSE | Initializing system");

  // Example: Load all your data files
  CONFIG.SWSE = {};
  CONFIG.SWSE.attributes = await loadJSON("systems/swse/data/attributes.json");
  CONFIG.SWSE.skills = await loadJSON("systems/swse/data/skills.json");
  CONFIG.SWSE.classes = await loadJSON("systems/swse/data/classes.json");
  CONFIG.SWSE.feats = await loadJSON("systems/swse/data/feats.json");
  CONFIG.SWSE.talents = await loadJSON("systems/swse/data/talents.json");
  CONFIG.SWSE.weapons = await loadJSON("systems/swse/data/weapons.json");
  CONFIG.SWSE.armor = await loadJSON("systems/swse/data/armor.json");
  CONFIG.SWSE.equipment = await loadJSON("systems/swse/data/equipment.json");
  CONFIG.SWSE.vehicles = await loadJSON("systems/swse/data/vehicles.json");
  CONFIG.SWSE.droids = await loadJSON("systems/swse/data/droids.json");
  CONFIG.SWSE.forcePowers = await loadJSON("systems/swse/data/forcepowers.json");
  CONFIG.SWSE.conditions = await loadJSON("systems/swse/data/conditions.json");
  CONFIG.SWSE.combatActions = await loadJSON("systems/swse/data/combat-actions.json");
  CONFIG.SWSE.specialCombatConditions = await loadJSON("systems/swse/data/special-combat-condition.json");
  CONFIG.SWSE.extraSkillUses = await loadJSON("systems/swse/data/extraskilluses.json");
});
