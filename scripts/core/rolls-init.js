// ============================================
// FILE: rolls-init.js
// Initialize SWSE roll functions (V2)
// ============================================

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

import * as Attacks from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import * as Damage from "/systems/foundryvtt-swse/scripts/combat/rolls/damage.js";
import * as Defenses from "/systems/foundryvtt-swse/scripts/rolls/defenses.js";
import * as Dice from "/systems/foundryvtt-swse/scripts/rolls/dice.js";
import * as Saves from "/systems/foundryvtt-swse/scripts/rolls/saves.js";
import * as Skills from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import * as ForcePowers from "/systems/foundryvtt-swse/scripts/rolls/force-powers.js";

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