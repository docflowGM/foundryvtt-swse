/**
 * Scout Talent Macros
 * Provides macro-callable functions for Scout talent mechanics
 * Register these in macro-functions.js to make them available in hotbars
 */

import ScoutTalentMechanics from './scout-talent-mechanics.js';
import { SWSELogger } from '../utils/logger.js';

export class ScoutTalentMacros {

  /**
   * Macro: Trigger Quick on Your Feet talent
   * Usage: game.swse.macros.triggerQuickOnYourFeetMacro(actor)
   */
  static async triggerQuickOnYourFeetMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Quick on Your Feet');
      return;
    }

    if (!ScoutTalentMechanics.hasQuickOnYourFeet(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Quick on Your Feet talent`);
      return;
    }

    Hooks.callAll('quickOnYourFeetTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Surge talent
   * Usage: game.swse.macros.triggerSurgeMacro(actor)
   */
  static async triggerSurgeMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Surge');
      return;
    }

    if (!ScoutTalentMechanics.hasSurge(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Surge talent`);
      return;
    }

    Hooks.callAll('surgeTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Sprint talent
   * Usage: game.swse.macros.triggerSprintMacro(actor)
   */
  static async triggerSprintMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Sprint');
      return;
    }

    if (!ScoutTalentMechanics.hasSprint(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Sprint talent`);
      return;
    }

    const result = await ScoutTalentMechanics.triggerSprint(selectedActor);
    if (result.success) {
      ui.notifications.info(`${selectedActor.name} can move up to ${result.sprintDistance} feet!`);
    }
  }

  /**
   * Macro: Trigger Weak Point talent
   * Usage: game.swse.macros.triggerWeakPointMacro(actor, targetToken)
   */
  static async triggerWeakPointMacro(actor = null, targetToken = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Weak Point');
      return;
    }

    if (!ScoutTalentMechanics.hasWeakPoint(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Weak Point talent`);
      return;
    }

    // If no target provided, use currently targeted token
    const target = targetToken || game.user.targets.values().next().value;

    Hooks.callAll('weakPointTriggered', selectedActor, target);
  }

  /**
   * Macro: Trigger Guidance talent
   * Usage: game.swse.macros.triggerGuidanceMacro(actor)
   */
  static async triggerGuidanceMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Guidance');
      return;
    }

    if (!ScoutTalentMechanics.hasGuidance(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Guidance talent`);
      return;
    }

    Hooks.callAll('guidanceTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Get Into Position talent
   * Usage: game.swse.macros.triggerGetIntoPositionMacro(actor)
   */
  static async triggerGetIntoPositionMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Get Into Position');
      return;
    }

    if (!ScoutTalentMechanics.hasGetIntoPosition(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Get Into Position talent`);
      return;
    }

    Hooks.callAll('getIntoPosTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Ready and Willing talent
   * Usage: game.swse.macros.triggerReadyAndWillingMacro(actor)
   */
  static async triggerReadyAndWillingMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Ready and Willing');
      return;
    }

    if (!ScoutTalentMechanics.hasReadyAndWilling(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Ready and Willing talent`);
      return;
    }

    const result = await ScoutTalentMechanics.triggerReadyAndWilling(selectedActor);
    if (result.success) {
      ui.notifications.info(result.message);
    }
  }

  /**
   * Macro: Trigger Aggressive Surge talent
   * Usage: game.swse.macros.triggerAggressiveSurgeMacro(actor)
   * This is typically triggered automatically when Second Wind is used
   */
  static async triggerAggressiveSurgeMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Aggressive Surge');
      return;
    }

    if (!ScoutTalentMechanics.hasAggressiveSurge(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Aggressive Surge talent`);
      return;
    }

    const result = await ScoutTalentMechanics.triggerAggressiveSurge(selectedActor);
    if (result.success) {
      ui.notifications.info(result.message);
    } else {
      ui.notifications.warn(result.message);
    }
  }

  /**
   * Macro: Check Surefooted passive
   * Usage: game.swse.macros.checkSurefootedMacro(actor)
   */
  static async checkSurefootedMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoutTalentMechanics.hasSurefooted(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Surefooted talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name}'s movement is not reduced by difficult terrain!`);
  }

  /**
   * Macro: Check Advanced Intel passive
   * Usage: game.swse.macros.checkAdvancedIntelMacro(actor)
   */
  static async checkAdvancedIntelMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoutTalentMechanics.hasAdvancedIntel(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Advanced Intel talent`);
      return;
    }

    const hasEffect = ScoutTalentMechanics.hasAdvancedIntelEffect(selectedActor);
    const message = hasEffect
      ? `${selectedActor.name} can use Spotter in the surprise round!`
      : `${selectedActor.name} is surprised and cannot use Spotter.`;

    ui.notifications.info(message);
  }

  /**
   * Macro: Check follower talents
   * Usage: game.swse.macros.checkFollowerTalentsMacro(actor)
   */
  static async checkFollowerTalentsMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const hasCCA = ScoutTalentMechanics.hasCloseCombatAssault(selectedActor);
    const hasGIP = ScoutTalentMechanics.hasGetIntoPosition(selectedActor);
    const hasRecon = ScoutTalentMechanics.hasReconnaissanceActions(selectedActor);
    const hasRTL = ScoutTalentMechanics.hasReconnaissanceTeamLeader(selectedActor);

    const talents = [
      hasCCA ? '✓ Close-Combat Assault' : '',
      hasGIP ? '✓ Get Into Position' : '',
      hasRecon ? '✓ Reconnaissance Actions' : '',
      hasRTL ? '✓ Reconnaissance Team Leader' : ''
    ].filter(t => t);

    if (talents.length === 0) {
      ui.notifications.warn(`${selectedActor.name} does not have any follower enhancement talents`);
    } else {
      const message = `${selectedActor.name} has the following follower talents:\n${talents.join('\n')}`;
      ui.notifications.info(message);
    }
  }

  // ============================================================================
  // SHADOW STRIKER ABILITY MACROS
  // ============================================================================

  /**
   * Macro: Trigger Blinding Strike ability
   * Usage: game.swse.macros.triggerBlindingStrikeMacro(actor, targetToken)
   */
  static async triggerBlindingStrikeMacro(actor = null, targetToken = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Blinding Strike');
      return;
    }

    if (!ScoutTalentMechanics.hasShadowStriker(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Shadow Striker talent`);
      return;
    }

    // If no target provided, use currently targeted token
    const target = targetToken || game.user.targets.values().next().value;

    Hooks.callAll('blindingStrikeTriggered', selectedActor, target);
  }

  /**
   * Macro: Trigger Confusing Strike ability
   * Usage: game.swse.macros.triggerConfusingStrikeMacro(actor, targetToken)
   */
  static async triggerConfusingStrikeMacro(actor = null, targetToken = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Confusing Strike');
      return;
    }

    if (!ScoutTalentMechanics.hasShadowStriker(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Shadow Striker talent`);
      return;
    }

    // If no target provided, use currently targeted token
    const target = targetToken || game.user.targets.values().next().value;

    Hooks.callAll('confusingStrikeTriggered', selectedActor, target);
  }

  /**
   * Macro: Trigger Unexpected Attack ability
   * Usage: game.swse.macros.triggerUnexpectedAttackMacro(actor, targetToken)
   */
  static async triggerUnexpectedAttackMacro(actor = null, targetToken = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Unexpected Attack');
      return;
    }

    if (!ScoutTalentMechanics.hasShadowStriker(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Shadow Striker talent`);
      return;
    }

    // If no target provided, use currently targeted token
    const target = targetToken || game.user.targets.values().next().value;

    Hooks.callAll('unexpectedAttackTriggered', selectedActor, target);
  }

  /**
   * Macro: Check Shadow Striker abilities
   * Usage: game.swse.macros.checkShadowStrikerMacro(actor)
   */
  static async checkShadowStrikerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoutTalentMechanics.hasShadowStriker(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Shadow Striker talent`);
      return;
    }

    const message = `
      <strong>${selectedActor.name} - Shadow Striker Abilities:</strong>
      <br><br>
      <strong>Blinding Strike:</strong> Standard action, once per encounter
      Make a melee or ranged attack. If you hit, gain Total Concealment against the target until your next turn.
      <br><br>
      <strong>Confusing Strike:</strong> Standard action, once per encounter
      Make a melee or ranged attack. Requires: target denied Dex OR you have concealment.
      If you hit, target can only take a Swift Action on their next turn.
      <br><br>
      <strong>Unexpected Attack:</strong> Standard action, once per encounter
      Make a melee or ranged attack from concealment. Requires: you have concealment from target.
      Gain +2 bonus if you have concealment, or +5 if you have Total Concealment.
    `;

    ui.notifications.info(message);
  }

  // ============================================================================
  // SWIFT STRIDER ABILITY MACROS
  // ============================================================================

  /**
   * Macro: Trigger Blurring Burst ability
   * Usage: game.swse.macros.triggerBlurringBurstMacro(actor)
   */
  static async triggerBlurringBurstMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Blurring Burst');
      return;
    }

    if (!ScoutTalentMechanics.hasSwiftStrider(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Swift Strider talent`);
      return;
    }

    Hooks.callAll('blurringBurstTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Sudden Assault ability
   * Usage: game.swse.macros.triggerSuddenAssaultMacro(actor, targetToken)
   */
  static async triggerSuddenAssaultMacro(actor = null, targetToken = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Sudden Assault');
      return;
    }

    if (!ScoutTalentMechanics.hasSwiftStrider(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Swift Strider talent`);
      return;
    }

    // If no target provided, use currently targeted token
    const target = targetToken || game.user.targets.values().next().value;

    Hooks.callAll('suddenAssaultTriggered', selectedActor, target);
  }

  /**
   * Macro: Trigger Weaving Stride ability
   * Usage: game.swse.macros.triggerWeavingStrideMacro(actor)
   */
  static async triggerWeavingStrideMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Weaving Stride');
      return;
    }

    if (!ScoutTalentMechanics.hasSwiftStrider(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Swift Strider talent`);
      return;
    }

    Hooks.callAll('weavingStrideTriggered', selectedActor);
  }

  /**
   * Macro: Check Swift Strider abilities
   * Usage: game.swse.macros.checkSwiftStriderMacro(actor)
   */
  static async checkSwiftStriderMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoutTalentMechanics.hasSwiftStrider(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Swift Strider talent`);
      return;
    }

    const message = `
      <strong>${selectedActor.name} - Swift Strider Abilities:</strong>
      <br><br>
      <strong>Blurring Burst:</strong> Move action, once per encounter
      Move up to your speed and gain +2 to Reflex Defense until the end of the encounter.
      <br><br>
      <strong>Sudden Assault:</strong> Standard action, once per encounter
      Make a Charge attack against an enemy within range. You take no penalty to your Reflex Defense for this attack.
      <br><br>
      <strong>Weaving Stride:</strong> Move action, once per encounter
      Move up to your speed. You gain a cumulative +2 dodge bonus to Reflex Defense for each Attack of Opportunity made against you during this movement (lasts until start of next turn).
    `;

    ui.notifications.info(message);
  }
}

export default ScoutTalentMacros;
