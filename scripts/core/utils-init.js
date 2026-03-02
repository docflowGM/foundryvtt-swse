// ============================================
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
// FILE: utils-init.js
// Initialize SWSE utility functions
// ============================================

import * as MathUtils from "/systems/foundryvtt-swse/scripts/utils/math-utils.js";
import * as StringUtils from "/systems/foundryvtt-swse/scripts/utils/string-utils.js";
import * as CombatUtils from "/systems/foundryvtt-swse/scripts/combat/utils/combat-utils.js";
import * as CharacterUtils from "/systems/foundryvtt-swse/scripts/utils/character-utils.js";
import * as DataUtils from "/systems/foundryvtt-swse/scripts/utils/data-utils.js";
import * as UIUtils from "/systems/foundryvtt-swse/scripts/utils/ui-utils.js";
import * as ValidationUtils from "/systems/foundryvtt-swse/scripts/utils/validation-utils.js";
import * as DiceUtils from "/systems/foundryvtt-swse/scripts/utils/dice-utils.js";
import * as DebugTools from "/systems/foundryvtt-swse/scripts/debug/debug-tools.js";

/**
 * Initialize utilities and expose them on game.swse.utils
 */
export function initializeUtils() {
  SWSELogger.log('SWSE | Initializing utilities...');

  if (!game.swse) {game.swse = {};}

  game.swse.utils = {
    math: MathUtils,
    string: StringUtils,
    combat: CombatUtils,
    character: CharacterUtils,
    data: DataUtils,
    ui: UIUtils,
    validation: ValidationUtils,
    dice: DiceUtils
  };

  // Dev helpers (macros / smoke tests / toggles)
  game.swse.debug = DebugTools;

  SWSELogger.log('SWSE | ✓ Utils initialized:', Object.keys(game.swse.utils));
}
