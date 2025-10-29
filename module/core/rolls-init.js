// ============================================
// FILE: rolls-init.js
// Initialize SWSE roll functions
// ============================================

import * as Attacks from "../rolls/attacks.js";
import * as Damage from "../rolls/damage.js";
import * as Defenses from "../rolls/defenses.js";
import * as Dice from "../rolls/dice.js";
import * as Initiative from "../rolls/initiative.js";
import * as Saves from "../rolls/saves.js";
import * as Skills from "../rolls/skills.js";

/**
 * Initialize roll functions and expose them on game.swse.rolls
 */
export function initializeRolls() {
  console.log("SWSE | Initializing roll functions...");
  
  if (!game.swse) game.swse = {};
  
  game.swse.rolls = {
    attacks: Attacks,
    damage: Damage,
    defenses: Defenses,
    dice: Dice,
    initiative: Initiative,
    saves: Saves,
    skills: Skills
  };
  
  console.log("SWSE | ✓ Rolls initialized:", Object.keys(game.swse.rolls));
}
