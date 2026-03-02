/**
 * Dark Side Talents Initialization
 * Registers Dark Side talent mechanics and macros with the system
 */

import DarkSideTalentMechanics from "/systems/foundryvtt-swse/scripts/engine/talent/dark-side-talent-mechanics.js";
import DarkSideTalentMacros from "/systems/foundryvtt-swse/scripts/talents/dark-side-talent-macros.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Initialize Dark Side talent systems when the world loads
 */
Hooks.once('ready', () => {
  SWSELogger.log('SWSE System | Initializing Dark Side Talent Mechanics');

  // Expose mechanics and macros to global scope
  window.SWSE = window.SWSE || {};
  window.SWSE.talents = window.SWSE.talents || {};
  window.SWSE.talents.darkSide = {
    mechanics: DarkSideTalentMechanics,
    macros: DarkSideTalentMacros
  };

  // Register macro functions
  window.SWSE.macros = window.SWSE.macros || {};
  window.SWSE.macros.swiftPower = (...args) => DarkSideTalentMacros.triggerSwiftPowerMacro(...args);
  window.SWSE.macros.darkSideSavant = (...args) => DarkSideTalentMacros.triggerDarkSideSavantMacro(...args);
  window.SWSE.macros.wrathDamage = (...args) => DarkSideTalentMacros.applyWrathOfDarkSideMacro(...args);

  SWSELogger.log('SWSE System | Dark Side Talent Mechanics loaded successfully');
  console.log('Dark Side Talents available at:', window.SWSE.talents.darkSide);
  console.log('Macros available:', {
    swiftPower: 'game.swse.macros.swiftPower()',
    darkSideSavant: 'game.swse.macros.darkSideSavant()',
    wrathDamage: 'game.swse.macros.wrathDamage()'
  });
});

export { DarkSideTalentMechanics, DarkSideTalentMacros };
