// ============================================
// FILE: utils-init.js
// Initialize SWSE utility functions
// ============================================

import * as MathUtils from "../utils/math-utils.js";
import * as StringUtils from "../utils/string-utils.js";
import * as CombatUtils from "../utils/combat-utils.js";
import * as CharacterUtils from "../utils/character-utils.js";
import * as DataUtils from "../utils/data-utils.js";
import * as UIUtils from "../utils/ui-utils.js";
import * as ValidationUtils from "../utils/validation-utils.js";
import * as DiceUtils from "../utils/dice-utils.js";

/**
 * Initialize utilities and expose them on game.swse.utils
 */
export function initializeUtils() {
  console.log("SWSE | Initializing utilities...");
  
  if (!game.swse) game.swse = {};
  
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
  
  console.log("SWSE | ✓ Utils initialized:", Object.keys(game.swse.utils));
}
