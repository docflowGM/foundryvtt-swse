/**
 * Light Side Talents Initialization
 * Registers Light Side (Jedi) talent mechanics and macros with the system
 */

import LightSideTalentMechanics from "/systems/foundryvtt-swse/scripts/engine/talent/light-side-talent-mechanics.js";
import LightSideTalentMacros from "/systems/foundryvtt-swse/scripts/talents/light-side-talent-macros.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Initialize Light Side talent systems when the world loads
 */
Hooks.once('ready', () => {
  SWSELogger.log('SWSE System | Initializing Light Side Talent Mechanics');

  // Expose mechanics and macros to global scope
  window.SWSE = window.SWSE || {};
  window.SWSE.talents = window.SWSE.talents || {};
  window.SWSE.talents.lightSide = {
    mechanics: LightSideTalentMechanics,
    macros: LightSideTalentMacros
  };

  // Register macro functions
  window.SWSE.macros = window.SWSE.macros || {};
  window.SWSE.macros.direct = (...args) => LightSideTalentMacros.triggerDirectMacro(...args);
  window.SWSE.macros.consularsWisdom = (...args) => LightSideTalentMacros.triggerConsularsWisdomMacro(...args);
  window.SWSE.macros.exposingStrike = (...args) => LightSideTalentMacros.triggerExposingStrikeMacro(...args);
  window.SWSE.macros.darkRetaliation = (...args) => LightSideTalentMacros.triggerDarkRetaliationMacro(...args);
  window.SWSE.macros.skilledAdvisor = (...args) => LightSideTalentMacros.triggerSkilledAdvisorMacro(...args);
  window.SWSE.macros.apprenticeBoon = (...args) => LightSideTalentMacros.triggerApprenticeBoonMacro(...args);
  window.SWSE.macros.renewVision = (...args) => LightSideTalentMacros.triggerRenewVisionMacro(...args);
  window.SWSE.macros.shareForceSecret = (...args) => LightSideTalentMacros.triggerShareForceSecretMacro(...args);
  window.SWSE.macros.canRerollKnowledge = (...args) => LightSideTalentMacros.canRerollKnowledgeMacro(...args);

  SWSELogger.log('SWSE System | Light Side Talent Mechanics loaded successfully');
  console.log('Light Side Talents available at:', window.SWSE.talents.lightSide);
  console.log('Macros available:', {
    direct: 'game.swse.macros.direct()',
    consularsWisdom: 'game.swse.macros.consularsWisdom()',
    exposingStrike: 'game.swse.macros.exposingStrike()',
    darkRetaliation: 'game.swse.macros.darkRetaliation()',
    skilledAdvisor: 'game.swse.macros.skilledAdvisor()',
    apprenticeBoon: 'game.swse.macros.apprenticeBoon()',
    renewVision: 'game.swse.macros.renewVision()',
    shareForceSecret: 'game.swse.macros.shareForceSecret()',
    canRerollKnowledge: 'game.swse.macros.canRerollKnowledge()',
    applyDarkSideScourge: 'game.swse.macros.applyDarkSideScourge(actor, target, baseDamage)',
    shouldApplyDarkSideScourge: 'game.swse.macros.shouldApplyDarkSideScourge(actor, target)'
  });
});

export { LightSideTalentMechanics, LightSideTalentMacros };
