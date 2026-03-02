/**
 * Scoundrel Talent Macros
 * Provides macro-callable functions for Scoundrel talent mechanics
 * Register these in macro-functions.js to make them available in hotbars
 */

import ScoundrelTalentMechanics from "/systems/foundryvtt-swse/scripts/engine/talent/scoundrel-talent-mechanics.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ScoundrelTalentMacros {

  /**
   * Macro: Trigger Knack talent
   * Usage: game.swse.macros.triggerKnackMacro(actor)
   */
  static async triggerKnackMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Knack');
      return;
    }

    if (!ScoundrelTalentMechanics.hasKnack(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Knack talent`);
      return;
    }

    Hooks.callAll('knackTriggered', selectedActor);
  }

  /**
   * Macro: Trigger Cunning Strategist talent
   * Usage: game.swse.macros.triggerCunningStrategistMacro(actor)
   */
  static async triggerCunningStrategistMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Cunning Strategist');
      return;
    }

    if (!ScoundrelTalentMechanics.hasCunningStrategist(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Cunning Strategist talent`);
      return;
    }

    Hooks.callAll('cunningStrategistTriggered', selectedActor);
  }

  /**
   * Macro: Check Sneak Attack passive
   * Usage: game.swse.macros.checkSneakAttackMacro(actor, targetToken)
   */
  static async checkSneakAttackMacro(actor = null, targetToken = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoundrelTalentMechanics.hasSneakAttack(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Sneak Attack talent`);
      return;
    }

    const target = targetToken || game.user.targets.values().next().value;

    if (!target) {
      ui.notifications.warn('Please target an enemy for Sneak Attack');
      return;
    }

    const result = await ScoundrelTalentMechanics.triggerSneakAttack(selectedActor, target);

    if (result.success) {
      ui.notifications.info(`${selectedActor.name} can make a Sneak Attack! Add ${result.extraDamage} extra damage!`);
    } else {
      ui.notifications.warn(result.message);
    }
  }

  /**
   * Macro: Check Skirmisher passive
   * Usage: game.swse.macros.checkSkirmisherMacro(actor)
   */
  static async checkSkirmisherMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoundrelTalentMechanics.hasSkirmisher(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Skirmisher talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} is a skirmisher! Can move before or after attacking without provoking AoO!`);
  }

  /**
   * Macro: Check Lucky Shot passive
   * Usage: game.swse.macros.checkLuckyShotMacro(actor)
   */
  static async checkLuckyShotMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoundrelTalentMechanics.hasLuckyShot(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Lucky Shot talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has Lucky Shot! Critical hit range is expanded to 19-20!`);
  }

  /**
   * Macro: Check Master Slicer passive
   * Usage: game.swse.macros.checkMasterSlicerMacro(actor)
   */
  static async checkMasterSlicerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoundrelTalentMechanics.hasMasterSlicer(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Master Slicer talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} is a Master Slicer! Gains +5 bonus to Computers checks!`);
  }

  /**
   * Macro: Check Fortune's Favor passive
   * Usage: game.swse.macros.checkFortuneFavorMacro(actor)
   */
  static async checkFortuneFavorMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoundrelTalentMechanics.hasFortuneFavor(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Fortune's Favor talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has Fortune's Favor! Gains +1 bonus to one defense!`);
  }

  /**
   * Macro: Check Fool's Luck passive
   * Usage: game.swse.macros.checkFoolsLuckMacro(actor)
   */
  static async checkFoolsLuckMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoundrelTalentMechanics.hasFoolsLuck(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Fool's Luck talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has Fool's Luck! Can automatically succeed or fail on a check once per encounter!`);
  }

  /**
   * Macro: Check Dumb Luck passive
   * Usage: game.swse.macros.checkDumbLuckMacro(actor)
   */
  static async checkDumbLuckMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!ScoundrelTalentMechanics.hasDumbLuck(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Dumb Luck talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has Dumb Luck! Can avoid a disaster once per day!`);
  }

  /**
   * Macro: Check all scoundrel talents
   * Usage: game.swse.macros.checkScoundrelTalentsMacro(actor)
   */
  static async checkScoundrelTalentsMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const hasKnack = ScoundrelTalentMechanics.hasKnack(selectedActor);
    const hasFoolsLuck = ScoundrelTalentMechanics.hasFoolsLuck(selectedActor);
    const hasFortune = ScoundrelTalentMechanics.hasFortuneFavor(selectedActor);
    const hasLucky = ScoundrelTalentMechanics.hasLuckyShot(selectedActor);
    const hasDumb = ScoundrelTalentMechanics.hasDumbLuck(selectedActor);
    const hasSneak = ScoundrelTalentMechanics.hasSneakAttack(selectedActor);
    const hasDastardly = ScoundrelTalentMechanics.hasDastardlyStrike(selectedActor);
    const hasSkirmish = ScoundrelTalentMechanics.hasSkirmisher(selectedActor);
    const hasCunning = ScoundrelTalentMechanics.hasCunningStrategist(selectedActor);
    const hasSlicer = ScoundrelTalentMechanics.hasMasterSlicer(selectedActor);
    const hasSabotage = ScoundrelTalentMechanics.hasElectronicSabotage(selectedActor);
    const hasTrace = ScoundrelTalentMechanics.hasTrace(selectedActor);

    const talents = [
      hasKnack ? '✓ Knack' : '',
      hasFoolsLuck ? "✓ Fool's Luck" : '',
      hasFortune ? "✓ Fortune's Favor" : '',
      hasLucky ? '✓ Lucky Shot' : '',
      hasDumb ? '✓ Dumb Luck' : '',
      hasSneak ? '✓ Sneak Attack' : '',
      hasDastardly ? '✓ Dastardly Strike' : '',
      hasSkirmish ? '✓ Skirmisher' : '',
      hasCunning ? '✓ Cunning Strategist' : '',
      hasSlicer ? '✓ Master Slicer' : '',
      hasSabotage ? '✓ Electronic Sabotage' : '',
      hasTrace ? '✓ Trace' : ''
    ].filter(t => t);

    if (talents.length === 0) {
      ui.notifications.warn(`${selectedActor.name} does not have any scoundrel talents`);
    } else {
      const message = `${selectedActor.name} has the following scoundrel talents:\n${talents.join('\n')}`;
      ui.notifications.info(message);
    }
  }
}

export default ScoundrelTalentMacros;
