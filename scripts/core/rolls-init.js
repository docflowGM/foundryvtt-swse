// ============================================
// FILE: rolls-init.js
// Initialize SWSE roll functions (V2)
// ============================================

import { SWSELogger } from "/scripts/utils/logger.js";

import * as Attacks from "/scripts/combat/rolls/attacks.js";
import * as Damage from "/scripts/combat/rolls/damage.js";
import * as Defenses from "/scripts/rolls/defenses.js";
import * as Dice from "/scripts/rolls/dice.js";
import * as Saves from "/scripts/rolls/saves.js";
import * as Skills from "/scripts/rolls/skills.js";
import * as ForcePowers from "/scripts/rolls/force-powers.js";

/**
 * Initialize roll functions and expose them on game.swse.rolls
 */
export function initializeRolls() {
  SWSELogger.log('SWSE | Initializing roll functions...');

  if (!game.swse) game.swse = {};

  game.swse.rolls = {
    attacks: Attacks,
    damage: Damage,
    defenses: Defenses,
    dice: Dice,
    saves: Saves,
    skills: Skills,
    rollForcePower: ForcePowers.rollForcePower
    // Initiative removed — use CombatEngine.rollInitiative()
  };

  SWSELogger.log('SWSE | ✓ Rolls initialized:', Object.keys(game.swse.rolls));
}