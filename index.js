// SWSE System Initialization
import { SWSEActorBase } from './scripts/actors/base/swse-actor-base.js';
import { SWSECharacterSheet } from './scripts/actors/character/swse-character-sheet.js';
import { SWSEDroidSheet } from './scripts/actors/droid/swse-droid.js';
import { SWSENPCSheet } from './scripts/actors/npc/swse-npc.js';
import { SWSEVehicleSheet } from './scripts/actors/vehicle/swse-vehicle.js';
import { SWSEItemSheet } from './scripts/items/swse-item-sheet.js';

// Data Models
import { SWSEActorDataModel } from './scripts/data-models/actor-data-model.js';
import { SWSECharacterDataModel } from './scripts/data-models/character-data-model.js';
import { SWSEVehicleDataModel } from './scripts/data-models/vehicle-data-model.js';

// Core Systems
import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { preloadHandlebarsTemplates } from './scripts/core/load-templates.js';
import { registerSystemSettings } from './scripts/core/settings.js';
import { SWSERoll } from './scripts/rolls/swse-roll.js';
import { SWSECombatAutomation } from './scripts/automation/combat-automation.js';

/* -------------------------------------------- */
/*  System Initialization                      */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log("SWSE | Initializing Star Wars Saga Edition System");

  // Create namespace
  game.swse = {
    SWSEActorBase,
    SWSERoll,
    config: CONFIG.SWSE
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = SWSEActorBase;

  // Register Data Models
  CONFIG.Actor.systemDataModels = {
    character: SWSECharacterDataModel,
    npc: SWSECharacterDataModel,
    droid: SWSECharacterDataModel,
    vehicle: SWSEVehicleDataModel
  };

  // Unregister core sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // Register Actor sheets
  Actors.registerSheet("swse", SWSECharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Character"
  });

  Actors.registerSheet("swse", SWSENPCSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "SWSE.SheetLabels.NPC"
  });

  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["droid"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Droid"
  });

  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Vehicle"
  });

  // Register Item sheets
  Items.registerSheet("swse", SWSEItemSheet, {
    types: ["weapon", "armor", "equipment", "feat", "talent", "forcepower", "class", "species"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Item"
  });

  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Register system settings
  registerSystemSettings();

  // Preload templates
  await preloadHandlebarsTemplates();

  // Configure dice
  CONFIG.Dice.terms["d"] = Die;

  console.log("SWSE | System Initialized");
});

/* -------------------------------------------- */
/*  System Ready                                */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  console.log("SWSE | System Ready");

  // Initialize combat automation
  if (game.settings.get('swse', 'enableAutomation')) {
    SWSECombatAutomation.init();
  }

  // Show welcome message
  if (game.user.isGM && !game.settings.get('swse', 'welcomeShown')) {
    ui.notifications.info("SWSE System Loaded - May the Force be with you!");
    await game.settings.set('swse', 'welcomeShown', true);
  }
});

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

// Handle item drops on actor sheets
Hooks.on("dropActorSheetData", async (actor, sheet, data) => {
  if (data.type === "Item") {
    return actor._onDropItem(data);
  }
});

// Add chat message listeners
Hooks.on("renderChatMessage", (message, html, data) => {
  html.find('.apply-damage').click(async ev => {
    const damage = parseInt(ev.currentTarget.dataset.damage);
    const targets = game.user.targets;

    for (let target of targets) {
      await target.actor.applyDamage(damage, {checkThreshold: true});
    }
  });

  html.find('.roll-damage').click(async ev => {
    const itemId = ev.currentTarget.dataset.itemId;
    const actor = game.actors.get(message.speaker.actor);
    const item = actor?.items.get(itemId);

    if (item) {
      await SWSERoll.rollDamage(actor, item);
    }
  });
});

// Export for debugging
window.SWSE = game.swse;
