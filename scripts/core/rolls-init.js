// ============================================
// FILE: rolls-init.js
// Initialize SWSE roll functions (V2)
// ============================================

import { SWSELogger } from '../utils/logger.js';

import * as Attacks from '../combat/rolls/attacks.js';
import * as Damage from '../combat/rolls/damage.js';
import * as Defenses from '../rolls/defenses.js';
import * as Dice from '../rolls/dice.js';
import * as Saves from '../rolls/saves.js';
import * as Skills from '../rolls/skills.js';
import * as ForcePowers from '../rolls/force-powers.js';

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