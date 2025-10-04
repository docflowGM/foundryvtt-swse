// system/index.js
// Master index for the SWSE FoundryVTT system

// Core system files
import * as System from "./swse.js";
import * as Init from "../scripts/init.js";
import * as SWSEData from "../scripts/swse-data.js";

// Actor-related scripts
import * as Actor from "../scripts/swse-actor.js";
import * as Droid from "../scripts/swse-droid.js";
import * as Vehicle from "../scripts/swse-vehicle.js";

// Item-related scripts
import * as Item from "../scripts/swse-item.js";

// Character building & progression
import * as LevelUp from "../scripts/swse-levelup.js";
import * as Races from "../scripts/races.js";
import * as CharGen from "../scripts/chargen.js";

// Dice + utilities
import * as DiceUtils from "../scripts/dice-utils.js";
import * as DiceRoller from "../scripts/diceroller.js";

// Template + data loaders
import * as LoadTemplates from "../scripts/load-templates.js";
import * as ImportData from "../scripts/import-data.js";

// Rolls subsystem
import * as Rolls from "./rolls/index.js";

// Export everything under a clean namespace
export {
  System,
  Init,
  SWSEData,
  Actor,
  Droid,
  Vehicle,
  Item,
  LevelUp,
  Races,
  CharGen,
  DiceUtils,
  DiceRoller,
  LoadTemplates,
  ImportData,
  Rolls
};
