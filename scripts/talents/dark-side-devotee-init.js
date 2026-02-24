/**
 * Dark Side Devotee Talents Initialization
 * Registers Dark Side Devotee talent mechanics and macros with the system
 */

import DarkSideDevoteeMechanics from '../engines/talent/dark-side-devotee-mechanics.js';
import DarkSideDevoteeMacros from './dark-side-devotee-macros.js';
import { SWSELogger } from '../utils/logger.js';

/**
 * Initialize Dark Side Devotee talent systems when the world loads
 */
Hooks.once('ready', () => {
  SWSELogger.log('SWSE System | Initializing Dark Side Devotee Talent Mechanics');

  // Expose mechanics and macros to global scope
  window.SWSE = window.SWSE || {};
  window.SWSE.talents = window.SWSE.talents || {};
  window.SWSE.talents.darkSideDevotee = {
    mechanics: DarkSideDevoteeMechanics,
    macros: DarkSideDevoteeMacros
  };

  // Register macro functions
  window.SWSE.macros = window.SWSE.macros || {};

  // Channel Aggression
  window.SWSE.macros.channelAggression = (...args) => DarkSideDevoteeMacros.channelAggressionMacro(...args);

  // Channel Anger
  window.SWSE.macros.channelAnger = (...args) => DarkSideDevoteeMacros.channelAngerMacro(...args);
  window.SWSE.macros.endChannelAnger = (...args) => DarkSideDevoteeMacros.endChannelAngerMacro(...args);
  window.SWSE.macros.checkChannelAngerStatus = (...args) => DarkSideDevoteeMacros.checkChannelAngerStatusMacro(...args);

  // Crippling Strike
  window.SWSE.macros.cripplingStrike = (...args) => DarkSideDevoteeMacros.cripplingStrikeMacro(...args);
  window.SWSE.macros.checkCripplingStrikeStatus = (...args) => DarkSideDevoteeMacros.checkCripplingStrikeStatusMacro(...args);

  // Dark Side Talisman
  window.SWSE.macros.createDarkSideTalisman = (...args) => DarkSideDevoteeMacros.createDarkSideTalismanMacro(...args);
  window.SWSE.macros.destroyDarkSideTalisman = (...args) => DarkSideDevoteeMacros.destroyDarkSideTalismanMacro(...args);
  window.SWSE.macros.checkTalismanStatus = (...args) => DarkSideDevoteeMacros.checkTalismanStatusMacro(...args);

  SWSELogger.log('SWSE System | Dark Side Devotee Talent Mechanics loaded successfully');
  console.log('Dark Side Devotee Talents available at:', window.SWSE.talents.darkSideDevotee);
  console.log('Macros available:', {
    channelAggression: 'game.swse.macros.channelAggression()',
    channelAnger: 'game.swse.macros.channelAnger()',
    endChannelAnger: 'game.swse.macros.endChannelAnger()',
    cripplingStrike: 'game.swse.macros.cripplingStrike()',
    createDarkSideTalisman: 'game.swse.macros.createDarkSideTalisman()',
    destroyDarkSideTalisman: 'game.swse.macros.destroyDarkSideTalisman()'
  });
});

export { DarkSideDevoteeMechanics, DarkSideDevoteeMacros };
