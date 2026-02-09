/**
 * Soldier Talent Mechanics
 * Implements complex game mechanics for Soldier talents:
 * - Melee Smash: Extra damage on melee attacks
 * - Stunning Strike: Stun target on attack
 * - Unbalancing Attack: Trip or knock down target
 * - Experienced Brawler: Bonus to unarmed attacks
 * - Expert Grappler: Improved grapple mechanics
 * - Draw Fire: Enemy must attack you instead of allies
 * - Keep Them at Bay: Prevent enemies from approaching
 * - Cover Fire: Grant ally defense bonus
 * - Battle Analysis: Identify enemy weaknesses
 * - Weapon Specialization: Bonus damage with weapon
 * - Greater Weapon Specialization: Even more bonus damage
 * - Devastating Attack: Massive damage once per encounter
 * - Penetrating Attack: Bypass armor/DR
 */

import { SWSELogger } from '../utils/logger.js';

export class SoldierTalentMechanics {

  /**
   * Check if actor has Melee Smash talent
   */
  static hasMeleeSmash(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Melee Smash'
    );
  }

  /**
   * Check if actor has Stunning Strike talent
   */
  static hasStunningStrike(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Stunning Strike'
    );
  }

  /**
   * Check if actor has Unbalancing Attack talent
   */
  static hasUnbalancingAttack(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Unbalancing Attack'
    );
  }

  /**
   * Check if actor has Experienced Brawler talent
   */
  static hasExperiencedBrawler(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Experienced Brawler'
    );
  }

  /**
   * Check if actor has Expert Grappler talent
   */
  static hasExpertGrappler(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Expert Grappler'
    );
  }

  /**
   * Check if actor has Draw Fire talent
   */
  static hasDrawFire(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Draw Fire'
    );
  }

  /**
   * Check if actor has Keep Them at Bay talent
   */
  static hasKeepThemAtBay(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Keep Them at Bay'
    );
  }

  /**
   * Check if actor has Cover Fire talent
   */
  static hasCoverFire(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Cover Fire'
    );
  }

  /**
   * Check if actor has Battle Analysis talent
   */
  static hasBattleAnalysis(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Battle Analysis'
    );
  }

  /**
   * Check if actor has Weapon Specialization talent
   */
  static hasWeaponSpecialization(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Weapon Specialization'
    );
  }

  /**
   * Check if actor has Greater Weapon Specialization talent
   */
  static hasGreaterWeaponSpecialization(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Greater Weapon Specialization'
    );
  }

  /**
   * Check if actor has Devastating Attack talent
   */
  static hasDevastatingAttack(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Devastating Attack'
    );
  }

  /**
   * Check if actor has Penetrating Attack talent
   */
  static hasPenetratingAttack(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Penetrating Attack'
    );
  }

  // ============================================================================
  // MELEE SMASH - Extra damage on melee attacks
  // ============================================================================

  /**
   * MELEE SMASH - Extra damage on melee attack
   * Passive talent
   */
  static applyMeleeSmash(actor) {
    if (!this.hasMeleeSmash(actor)) {
      return false;
    }

    // Adds extra 1d6 damage to melee attacks
    return true;
  }

  // ============================================================================
  // STUNNING STRIKE - Stun target on attack
  // ============================================================================

  /**
   * STUNNING STRIKE - Attempt to stun target on melee attack
   * Standard action, once per encounter
   */
  static async triggerStunningStrike(actor, targetToken) {
    if (!this.hasStunningStrike(actor)) {
      return { success: false, message: 'Actor does not have Stunning Strike talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Stunning Strike can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `stunningStrike_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Stunning Strike has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target for Stunning Strike'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    return {
      success: true,
      requiresRoll: true,
      targetActor: targetActor,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Stunning Strike - Apply stun effect
   */
  static async completeStunningStrike(actor, targetActor, success, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    if (!success) {
      SWSELogger.log(`SWSE Talents | ${actor.name} attempted Stunning Strike on ${targetActor.name} but failed`);
      return { success: true, hit: false };
    }

    // Apply stun effect until start of next turn
    await targetActor.createEmbeddedDocuments('ActiveEffect', [{
      name: 'Stunning Strike - Stunned',
      icon: 'icons/svg/daze.svg',
      changes: [{
        key: 'system.condition.stunned',
        mode: 5, // OVERRIDE
        value: 'true',
        priority: 50
      }],
      duration: {
        rounds: 1,
        startRound: game.combat?.round,
        startTurn: game.combat?.turn
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'stunning-strike',
          sourceActorId: actor.id
        }
      }
    }]);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Stunning Strike on ${targetActor.name}`);
    ui.notifications.info(`${targetActor.name} is stunned and can only take a swift action on their next turn!`);

    return { success: true, hit: true };
  }

  // ============================================================================
  // DRAW FIRE - Enemy must attack you instead of allies
  // ============================================================================

  /**
   * DRAW FIRE - Enemy must attack you instead of allies
   * Immediate action, once per encounter
   */
  static async triggerDrawFire(actor, targetToken) {
    if (!this.hasDrawFire(actor)) {
      return { success: false, message: 'Actor does not have Draw Fire talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Draw Fire can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `drawFire_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Draw Fire has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select an enemy to draw fire from'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    return {
      success: true,
      targetActor: targetActor,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Draw Fire - Apply effect
   */
  static async completeDrawFire(actor, targetActor, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Draw Fire on ${targetActor.name}`);
    ui.notifications.info(`${targetActor.name} must attack ${actor.name} or another opponent of ${actor.name}'s choosing on their next turn!`);

    return { success: true };
  }

  // ============================================================================
  // COVER FIRE - Grant ally defense bonus
  // ============================================================================

  /**
   * COVER FIRE - Grant ally defense bonus
   * Standard action, once per encounter
   */
  static async triggerCoverFire(actor) {
    if (!this.hasCoverFire(actor)) {
      return { success: false, message: 'Actor does not have Cover Fire talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Cover Fire can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `coverFire_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Cover Fire has already been used this encounter.'
      };
    }

    // Get all allies
    const allies = this.getAllAllies(actor);

    if (allies.length === 0) {
      return {
        success: false,
        message: 'No allies available'
      };
    }

    return {
      success: true,
      requiresSelection: true,
      allies: allies,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Cover Fire selection
   */
  static async completeCoverFire(actor, allyId, combatId, usageFlag) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    await actor.setFlag('swse', usageFlag, true);

    // Apply defense bonus
    await ally.createEmbeddedDocuments('ActiveEffect', [{
      name: 'Cover Fire - Defense Bonus',
      icon: 'icons/svg/shield.svg',
      changes: [{
        key: 'system.defenses.reflex.bonus',
        mode: 2, // ADD
        value: 4,
        priority: 20
      }],
      duration: {
        rounds: 1,
        startRound: game.combat?.round,
        startTurn: game.combat?.turn
      },
      flags: {
        swse: {
          source: 'talent',
          sourceId: 'cover-fire',
          sourceActorId: actor.id
        }
      }
    }]);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Cover Fire on ${ally.name}`);
    ui.notifications.info(`${ally.name} gains +4 to Reflex Defense thanks to ${actor.name}'s cover fire!`);

    return true;
  }

  // ============================================================================
  // DEVASTATING ATTACK - Massive damage once per encounter
  // ============================================================================

  /**
   * DEVASTATING ATTACK - Make devastating attack
   * Standard action, once per encounter
   */
  static async triggerDevastatingAttack(actor, targetToken) {
    if (!this.hasDevastatingAttack(actor)) {
      return { success: false, message: 'Actor does not have Devastating Attack talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Devastating Attack can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `devastatingAttack_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Devastating Attack has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target for Devastating Attack'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    return {
      success: true,
      requiresRoll: true,
      targetActor: targetActor,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Devastating Attack - Mark as used
   */
  static async completeDevastatingAttack(actor, targetActor, success, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    if (!success) {
      SWSELogger.log(`SWSE Talents | ${actor.name} attempted Devastating Attack on ${targetActor.name} but missed`);
      return { success: true, hit: false };
    }

    SWSELogger.log(`SWSE Talents | ${actor.name} used Devastating Attack on ${targetActor.name}`);
    ui.notifications.info(`${actor.name} unleashes a Devastating Attack! Double the damage!`);

    return { success: true, hit: true };
  }

  // ============================================================================
  // PENETRATING ATTACK - Bypass armor/DR
  // ============================================================================

  /**
   * PENETRATING ATTACK - Ignore damage reduction
   * Standard action, once per encounter
   */
  static async triggerPenetratingAttack(actor, targetToken) {
    if (!this.hasPenetratingAttack(actor)) {
      return { success: false, message: 'Actor does not have Penetrating Attack talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Penetrating Attack can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `penetratingAttack_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Penetrating Attack has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target for Penetrating Attack'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    return {
      success: true,
      requiresRoll: true,
      targetActor: targetActor,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Penetrating Attack
   */
  static async completePenetratingAttack(actor, targetActor, success, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    if (!success) {
      SWSELogger.log(`SWSE Talents | ${actor.name} attempted Penetrating Attack on ${targetActor.name} but missed`);
      return { success: true, hit: false };
    }

    SWSELogger.log(`SWSE Talents | ${actor.name} used Penetrating Attack on ${targetActor.name}`);
    ui.notifications.info(`${actor.name} makes a Penetrating Attack! Ignore the target's Damage Reduction!`);

    return { success: true, hit: true };
  }

  // ============================================================================
  // UNBALANCING ATTACK - Trip or knock down
  // ============================================================================

  /**
   * UNBALANCING ATTACK - Trip or knockdown
   * Passive talent
   */
  static applyUnbalancingAttack(actor) {
    if (!this.hasUnbalancingAttack(actor)) {
      return false;
    }

    // Allows trip/knockdown attempts on attacks
    return true;
  }

  // ============================================================================
  // EXPERIENCED BRAWLER - Bonus to unarmed attacks
  // ============================================================================

  /**
   * EXPERIENCED BRAWLER - Bonus to unarmed attacks
   * Passive talent
   */
  static applyExperiencedBrawler(actor) {
    if (!this.hasExperiencedBrawler(actor)) {
      return false;
    }

    // Grants +1 to unarmed attacks
    return true;
  }

  // ============================================================================
  // EXPERT GRAPPLER - Improved grapple mechanics
  // ============================================================================

  /**
   * EXPERT GRAPPLER - Improved grapple
   * Passive talent
   */
  static applyExpertGrappler(actor) {
    if (!this.hasExpertGrappler(actor)) {
      return false;
    }

    // Grants +2 to grapple checks
    return true;
  }

  // ============================================================================
  // KEEP THEM AT BAY - Prevent enemies from approaching
  // ============================================================================

  /**
   * KEEP THEM AT BAY - Prevent enemies from approaching
   * Passive talent
   */
  static applyKeepThemAtBay(actor) {
    if (!this.hasKeepThemAtBay(actor)) {
      return false;
    }

    // Prevents enemies from moving closer
    return true;
  }

  // ============================================================================
  // BATTLE ANALYSIS - Identify enemy weaknesses
  // ============================================================================

  /**
   * BATTLE ANALYSIS - Identify weakness
   * Swift action, once per encounter
   */
  static async triggerBattleAnalysis(actor, targetToken) {
    if (!this.hasBattleAnalysis(actor)) {
      return { success: false, message: 'Actor does not have Battle Analysis talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Battle Analysis can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `battleAnalysis_${combatId}`;
    const alreadyUsed = actor.getFlag('swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Battle Analysis has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target to analyze'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    return {
      success: true,
      targetActor: targetActor,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Battle Analysis
   */
  static async completeBattleAnalysis(actor, targetActor, combatId, usageFlag) {
    await actor.setFlag('swse', usageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} analyzed ${targetActor.name}'s weaknesses`);
    ui.notifications.info(`${actor.name} analyzes ${targetActor.name} and discovers a weakness! Gain +2 to attack rolls against this target!`);

    return { success: true };
  }

  // ============================================================================
  // WEAPON SPECIALIZATION - Bonus damage
  // ============================================================================

  /**
   * WEAPON SPECIALIZATION - Bonus damage with weapon
   * Passive talent
   */
  static applyWeaponSpecialization(actor) {
    if (!this.hasWeaponSpecialization(actor)) {
      return false;
    }

    // Grants +2 damage with specialized weapon
    return true;
  }

  // ============================================================================
  // GREATER WEAPON SPECIALIZATION - More bonus damage
  // ============================================================================

  /**
   * GREATER WEAPON SPECIALIZATION - More bonus damage
   * Passive talent
   */
  static applyGreaterWeaponSpecialization(actor) {
    if (!this.hasGreaterWeaponSpecialization(actor)) {
      return false;
    }

    // Grants +4 damage with specialized weapon
    return true;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get all allies
   */
  static getAllAllies(actor) {
    if (!canvas.tokens) {
      return [];
    }

    const actorToken = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
    if (!actorToken) {
      return [];
    }

    return canvas.tokens.placeables.filter(token => {
      if (!token.actor || token.actor.id === actor.id) {return false;}
      return token.document.disposition === actorToken.document.disposition;
    });
  }
}

// ============================================================================
// HOOKS - Auto-trigger Soldier talent dialogs
// ============================================================================

/**
 * Hook: When user initiates Cover Fire
 */
Hooks.on('coverFireTriggered', async (actor) => {
  const result = await SoldierTalentMechanics.triggerCoverFire(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection) {
    const allyOptions = result.allies
      .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
      .join('');

    const dialog = new Dialog({
      title: 'Cover Fire - Select Ally',
      content: `
        <div class="form-group">
          <label>Choose an ally to provide cover for:</label>
          <select id="ally-select" style="width: 100%;">
            ${allyOptions}
          </select>
        </div>
      `,
      buttons: {
        cover: {
          label: 'Provide Cover',
          callback: async (html) => {
            const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
            await SoldierTalentMechanics.completeCoverFire(actor, allyId, result.combatId, result.usageFlag);
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    });

    dialog.render(true);
  }
});

export default SoldierTalentMechanics;
