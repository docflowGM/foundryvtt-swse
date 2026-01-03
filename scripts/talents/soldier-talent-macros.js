/**
 * Soldier Talent Macros
 * Provides macro-callable functions for Soldier talent mechanics
 * Register these in macro-functions.js to make them available in hotbars
 */

import SoldierTalentMechanics from './soldier-talent-mechanics.js';
import { SWSELogger } from '../utils/logger.js';

export class SoldierTalentMacros {

  /**
   * Macro: Trigger Cover Fire talent
   * Usage: game.swse.macros.triggerCoverFireMacro(actor)
   */
  static async triggerCoverFireMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Cover Fire');
      return;
    }

    if (!SoldierTalentMechanics.hasCoverFire(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Cover Fire talent`);
      return;
    }

    Hooks.callAll('coverFireTriggered', selectedActor);
  }

  /**
   * Macro: Check Melee Smash passive
   * Usage: game.swse.macros.checkMeleeSmashMacro(actor)
   */
  static async checkMeleeSmashMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!SoldierTalentMechanics.hasMeleeSmash(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Melee Smash talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has Melee Smash! Add 1d6 extra damage to melee attacks!`);
  }

  /**
   * Macro: Check Experienced Brawler passive
   * Usage: game.swse.macros.checkExperiencedBrawlerMacro(actor)
   */
  static async checkExperiencedBrawlerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!SoldierTalentMechanics.hasExperiencedBrawler(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Experienced Brawler talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} is an Experienced Brawler! Gains +1 to unarmed attack rolls!`);
  }

  /**
   * Macro: Check Expert Grappler passive
   * Usage: game.swse.macros.checkExpertGrapplerMacro(actor)
   */
  static async checkExpertGrapplerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!SoldierTalentMechanics.hasExpertGrappler(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Expert Grappler talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} is an Expert Grappler! Gains +2 to grapple checks!`);
  }

  /**
   * Macro: Check Unbalancing Attack passive
   * Usage: game.swse.macros.checkUnbalancingAttackMacro(actor)
   */
  static async checkUnbalancingAttackMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!SoldierTalentMechanics.hasUnbalancingAttack(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Unbalancing Attack talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} can trip or knock down enemies with attacks!`);
  }

  /**
   * Macro: Check Keep Them at Bay passive
   * Usage: game.swse.macros.checkKeepThemAtBayMacro(actor)
   */
  static async checkKeepThemAtBayMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!SoldierTalentMechanics.hasKeepThemAtBay(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Keep Them at Bay talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} can prevent enemies from moving closer!`);
  }

  /**
   * Macro: Check Weapon Specialization passive
   * Usage: game.swse.macros.checkWeaponSpecializationMacro(actor)
   */
  static async checkWeaponSpecializationMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!SoldierTalentMechanics.hasWeaponSpecialization(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Weapon Specialization talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has Weapon Specialization! Gains +2 damage with specialized weapon!`);
  }

  /**
   * Macro: Check Greater Weapon Specialization passive
   * Usage: game.swse.macros.checkGreaterWeaponSpecializationMacro(actor)
   */
  static async checkGreaterWeaponSpecializationMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!SoldierTalentMechanics.hasGreaterWeaponSpecialization(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Greater Weapon Specialization talent`);
      return;
    }

    ui.notifications.info(`${selectedActor.name} has Greater Weapon Specialization! Gains +4 damage with specialized weapon!`);
  }

  /**
   * Macro: Check all soldier talents
   * Usage: game.swse.macros.checkSoldierTalentsMacro(actor)
   */
  static async checkSoldierTalentsMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const hasSmash = SoldierTalentMechanics.hasMeleeSmash(selectedActor);
    const hasStun = SoldierTalentMechanics.hasStunningStrike(selectedActor);
    const hasUnbal = SoldierTalentMechanics.hasUnbalancingAttack(selectedActor);
    const hasExp = SoldierTalentMechanics.hasExperiencedBrawler(selectedActor);
    const hasGrapple = SoldierTalentMechanics.hasExpertGrappler(selectedActor);
    const hasDraw = SoldierTalentMechanics.hasDrawFire(selectedActor);
    const hasKeep = SoldierTalentMechanics.hasKeepThemAtBay(selectedActor);
    const hasCover = SoldierTalentMechanics.hasCoverFire(selectedActor);
    const hasBattle = SoldierTalentMechanics.hasBattleAnalysis(selectedActor);
    const hasWeapon = SoldierTalentMechanics.hasWeaponSpecialization(selectedActor);
    const hasGreater = SoldierTalentMechanics.hasGreaterWeaponSpecialization(selectedActor);
    const hasDevast = SoldierTalentMechanics.hasDevastatingAttack(selectedActor);
    const hasPenet = SoldierTalentMechanics.hasPenetratingAttack(selectedActor);

    const talents = [
      hasSmash ? '✓ Melee Smash' : '',
      hasStun ? '✓ Stunning Strike' : '',
      hasUnbal ? '✓ Unbalancing Attack' : '',
      hasExp ? '✓ Experienced Brawler' : '',
      hasGrapple ? '✓ Expert Grappler' : '',
      hasDraw ? '✓ Draw Fire' : '',
      hasKeep ? '✓ Keep Them at Bay' : '',
      hasCover ? '✓ Cover Fire' : '',
      hasBattle ? '✓ Battle Analysis' : '',
      hasWeapon ? '✓ Weapon Specialization' : '',
      hasGreater ? '✓ Greater Weapon Specialization' : '',
      hasDevast ? '✓ Devastating Attack' : '',
      hasPenet ? '✓ Penetrating Attack' : ''
    ].filter(t => t);

    if (talents.length === 0) {
      ui.notifications.warn(`${selectedActor.name} does not have any soldier talents`);
    } else {
      const message = `${selectedActor.name} has the following soldier talents:\n${talents.join('\n')}`;
      ui.notifications.info(message);
    }
  }
}

export default SoldierTalentMacros;
