/**
 * Noble Talent Macros
 * Provides macro-callable functions for Noble talent mechanics
 * Register these in macro-functions.js to make them available in hotbars
 */

import NobleTalentMechanics from '../engines/talent/noble-talent-mechanics.js';
import { SWSELogger } from '../utils/logger.js';

export class NobleTalentMacros {

  /**
   * Macro: Trigger Inspire Confidence talent
   * Usage: game.swse.macros.triggerInspireConfidenceMacro(actor)
   */
  static async triggerInspireConfidenceMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Inspire Confidence');
      return;
    }

    if (!NobleTalentMechanics.hasInspireConfidence(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Inspire Confidence talent`);
      return;
    }

    Hooks.callAll('inspireConfidenceTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Bolster Ally talent
   * Usage: game.swse.macros.triggerBolsterAllyMacro(actor)
   */
  static async triggerBolsterAllyMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Bolster Ally');
      return;
    }

    if (!NobleTalentMechanics.hasBolsterAlly(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Bolster Ally talent`);
      return;
    }

    Hooks.callAll('bolsterAllyTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Ignite Fervor talent
   * Usage: game.swse.macros.triggerIgniteFervorMacro(actor)
   */
  static async triggerIgniteFervorMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Ignite Fervor');
      return;
    }

    if (!NobleTalentMechanics.hasIgniteFervor(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Ignite Fervor talent`);
      return;
    }

    Hooks.callAll('igniteFervorTriggered', selectedActor);
  }

  /**
   * Macro: Check Presence passive
   * Usage: game.swse.macros.checkPresenceMacro(actor)
   */
  static async checkPresenceMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!NobleTalentMechanics.hasPresence(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Presence talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has an air of authority! +2 bonus to Persuasion and Deception checks.`);
  }

  /**
   * Macro: Check Willpower passive
   * Usage: game.swse.macros.checkWillpowerMacro(actor)
   */
  static async checkWillpowerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!NobleTalentMechanics.hasWillpower(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Willpower talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has an iron will! Can reroll Will Defense saves once per encounter.`);
  }

  /**
   * Macro: Check Connections passive
   * Usage: game.swse.macros.checkConnectionsMacro(actor)
   */
  static async checkConnectionsMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!NobleTalentMechanics.hasConnections(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Connections talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has powerful connections! Gain a follower or useful contact.`);
  }

  /**
   * Macro: Check all noble talents
   * Usage: game.swse.macros.checkNobleTalentsMacro(actor)
   */
  static async checkNobleTalentsMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const hasInspire = NobleTalentMechanics.hasInspireConfidence(selectedActor);
    const hasBolster = NobleTalentMechanics.hasBolsterAlly(selectedActor);
    const hasIgnite = NobleTalentMechanics.hasIgniteFervor(selectedActor);
    const hasWill = NobleTalentMechanics.hasWillpower(selectedActor);
    const hasPresence = NobleTalentMechanics.hasPresence(selectedActor);
    const hasProtect = NobleTalentMechanics.hasProtectiveStance(selectedActor);
    const hasCoord = NobleTalentMechanics.hasCoordinatedAttack(selectedActor);
    const hasBarter = NobleTalentMechanics.hasBarter(selectedActor);
    const hasDemand = NobleTalentMechanics.hasDemandSurrender(selectedActor);
    const hasWeaken = NobleTalentMechanics.hasWeakenResolve(selectedActor);
    const hasConn = NobleTalentMechanics.hasConnections(selectedActor);
    const hasTwoFace = NobleTalentMechanics.hasTwoFaced(selectedActor);

    const talents = [
      hasInspire ? '✓ Inspire Confidence' : '',
      hasBolster ? '✓ Bolster Ally' : '',
      hasIgnite ? '✓ Ignite Fervor' : '',
      hasWill ? '✓ Willpower' : '',
      hasPresence ? '✓ Presence' : '',
      hasProtect ? '✓ Protective Stance' : '',
      hasCoord ? '✓ Coordinated Attack' : '',
      hasBarter ? '✓ Barter' : '',
      hasDemand ? '✓ Demand Surrender' : '',
      hasWeaken ? '✓ Weaken Resolve' : '',
      hasConn ? '✓ Connections' : '',
      hasTwoFace ? '✓ Two-Faced' : ''
    ].filter(t => t);

    if (talents.length === 0) {
      ui.notifications.warn(`${selectedActor.name} does not have any noble talents`);
    } else {
      const message = `${selectedActor.name} has the following noble talents:\n${talents.join('\n')}`;
      ui.notifications.info(message);
    }
  }
}

export default NobleTalentMacros;
