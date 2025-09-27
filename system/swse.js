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
