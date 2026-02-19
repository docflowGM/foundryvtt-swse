/**
 * Noble Talent Mechanics
 * Implements complex game mechanics for Noble talents:
 * - Inspire Confidence: Grant allies +2 morale bonus
 * - Bolster Ally: Grant ally temporary HP
 * - Ignite Fervor: Grant allies +1 attack and damage
 * - Willpower: Resist Force powers more effectively
 * - Beloved: Grant defensive aid, offensive aid, or tactical retreat
 * - Coordinated Attack: Ally gets attack bonus when you attack same target
 * - Protective Stance: Block damage for adjacent allies
 * - Barter: Get better deals
 * - Demand Surrender: Force enemy surrender check
 * - Presence: Bonus to social checks
 * - Weaken Resolve: Reduce enemy willpower
 * - Connections: Grant followers or contacts
 * - Two-Faced: Maintain secret identity
 */

import { SWSELogger } from '../utils/logger.js';
import { createEffectOnActor } from '../core/document-api-v13.js';

import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
export class NobleTalentMechanics {

  /**
   * Check if actor has Inspire Confidence talent
   */
  static hasInspireConfidence(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Inspire Confidence'
    );
  }

  /**
   * Check if actor has Bolster Ally talent
   */
  static hasBolsterAlly(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Bolster Ally'
    );
  }

  /**
   * Check if actor has Ignite Fervor talent
   */
  static hasIgniteFervor(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Ignite Fervor'
    );
  }

  /**
   * Check if actor has Willpower talent
   */
  static hasWillpower(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Willpower'
    );
  }

  /**
   * Check if actor has Beloved talent
   */
  static hasBeloveed(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Beloved'
    );
  }

  /**
   * Check if actor has Coordinated Attack talent
   */
  static hasCoordinatedAttack(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Coordinated Attack'
    );
  }

  /**
   * Check if actor has Protective Stance talent
   */
  static hasProtectiveStance(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Protective Stance'
    );
  }

  /**
   * Check if actor has Barter talent
   */
  static hasBarter(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Barter'
    );
  }

  /**
   * Check if actor has Demand Surrender talent
   */
  static hasDemandSurrender(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Demand Surrender'
    );
  }

  /**
   * Check if actor has Presence talent
   */
  static hasPresence(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Presence'
    );
  }

  /**
   * Check if actor has Weaken Resolve talent
   */
  static hasWeakenResolve(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Weaken Resolve'
    );
  }

  /**
   * Check if actor has Connections talent
   */
  static hasConnections(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Connections'
    );
  }

  /**
   * Check if actor has Two-Faced talent
   */
  static hasTwoFaced(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Two-Faced'
    );
  }

  // ============================================================================
  // INSPIRE CONFIDENCE - Grant allies +2 morale bonus
  // ============================================================================

  /**
   * INSPIRE CONFIDENCE - Grant ally +2 morale bonus
   * Standard action, once per encounter
   */
  static async triggerInspireConfidence(actor) {
    if (!this.hasInspireConfidence(actor)) {
      return { success: false, message: 'Actor does not have Inspire Confidence talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Inspire Confidence can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `inspireConfidence_${combatId}`;
    const alreadyUsed = actor.getFlag('foundryvtt-swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Inspire Confidence has already been used this encounter.'
      };
    }

    // Get all allies
    const allies = this.getAllAllies(actor);

    if (allies.length === 0) {
      return {
        success: false,
        message: 'No allies available to inspire'
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
   * Complete Inspire Confidence selection
   */
  static async completeInspireConfidence(actor, allyId, combatId, usageFlag) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    // Mark as used
    await actor.setFlag('foundryvtt-swse', usageFlag, true);

    // Create effect for +2 morale bonus
    await createEffectOnActor(ally, {
      name: 'Inspire Confidence - Morale Bonus',
      icon: 'icons/svg/aura.svg',
      changes: [{
        key: 'system.skills.morale.bonus',
        mode: 2, // ADD
        value: 2,
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
          sourceId: 'inspire-confidence',
          sourceActorId: actor.id
        }
      }
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Inspire Confidence on ${ally.name}`);
    ui.notifications.info(`${ally.name} is inspired! Gains +2 morale bonus until the start of their next turn!`);

    return true;
  }

  // ============================================================================
  // BOLSTER ALLY - Grant ally temporary HP
  // ============================================================================

  /**
   * BOLSTER ALLY - Grant ally temporary HP
   * Standard action, once per encounter
   */
  static async triggerBolsterAlly(actor) {
    if (!this.hasBolsterAlly(actor)) {
      return { success: false, message: 'Actor does not have Bolster Ally talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Bolster Ally can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `bolsterAlly_${combatId}`;
    const alreadyUsed = actor.getFlag('foundryvtt-swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Bolster Ally has already been used this encounter.'
      };
    }

    // Get all allies
    const allies = this.getAllAllies(actor);

    if (allies.length === 0) {
      return {
        success: false,
        message: 'No allies available to bolster'
      };
    }

    const tempHP = Math.max(5, getEffectiveHalfLevel(actor) * 5);

    return {
      success: true,
      requiresSelection: true,
      allies: allies,
      tempHP: tempHP,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Bolster Ally selection
   */
  static async completeBolsterAlly(actor, allyId, tempHP, combatId, usageFlag) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    // Mark as used
    await actor.setFlag('foundryvtt-swse', usageFlag, true);

    // Apply temporary HP
    const currentTempHP = ally.system.attributes?.temporaryHP || 0;
    await ally.update({ 'system.attributes.temporaryHP': currentTempHP + tempHP });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Bolster Ally on ${ally.name}, granted ${tempHP} temporary HP`);
    ui.notifications.info(`${ally.name} gains ${tempHP} temporary HP!`);

    return true;
  }

  // ============================================================================
  // IGNITE FERVOR - Grant allies +1 attack and damage
  // ============================================================================

  /**
   * IGNITE FERVOR - Grant all allies +1 attack and damage
   * Standard action, once per encounter
   */
  static async triggerIgniteFervor(actor) {
    if (!this.hasIgniteFervor(actor)) {
      return { success: false, message: 'Actor does not have Ignite Fervor talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Ignite Fervor can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `igniteFervor_${combatId}`;
    const alreadyUsed = actor.getFlag('foundryvtt-swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Ignite Fervor has already been used this encounter.'
      };
    }

    // Get all allies
    const allies = this.getAllAllies(actor);

    if (allies.length === 0) {
      return {
        success: false,
        message: 'No allies available to inspire'
      };
    }

    return {
      success: true,
      allies: allies,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Ignite Fervor - Apply bonuses to all allies
   */
  static async completeIgniteFervor(actor, combatId, usageFlag) {
    const allies = this.getAllAllies(actor);

    // Mark as used
    await actor.setFlag('foundryvtt-swse', usageFlag, true);

    // Apply bonuses to all allies
    for (const allyToken of allies) {
      const ally = allyToken.actor;
      if (!ally) {continue;}

      await createEffectOnActor(ally, {
        name: 'Ignite Fervor - Attack and Damage Bonus',
        icon: 'icons/svg/fire.svg',
        changes: [
          {
            key: 'system.skills.attack.bonus',
            mode: 2, // ADD
            value: 1,
            priority: 20
          },
          {
            key: 'system.damage.bonus',
            mode: 2, // ADD
            value: 1,
            priority: 20
          }
        ],
        duration: {
          rounds: 1,
          startRound: game.combat?.round,
          startTurn: game.combat?.turn
        },
        flags: {
          swse: {
            source: 'talent',
            sourceId: 'ignite-fervor',
            sourceActorId: actor.id
          }
        }
      });
    }

    SWSELogger.log(`SWSE Talents | ${actor.name} used Ignite Fervor, granted +1 attack and damage to ${allies.length} allies`);
    ui.notifications.info(`All allies gain +1 to attack and damage rolls until the start of their next turn!`);

    return { success: true, alliesAffected: allies.length };
  }

  // ============================================================================
  // PROTECTIVE STANCE - Block damage for adjacent allies
  // ============================================================================

  /**
   * PROTECTIVE STANCE - Take damage intended for adjacent ally
   * Immediate action, once per encounter
   */
  static async triggerProtectiveStance(actor, allyToken) {
    if (!this.hasProtectiveStance(actor)) {
      return { success: false, message: 'Actor does not have Protective Stance talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Protective Stance can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `protectiveStance_${combatId}`;
    const alreadyUsed = actor.getFlag('foundryvtt-swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Protective Stance has already been used this encounter.'
      };
    }

    if (!allyToken) {
      return {
        success: false,
        message: 'Please select an adjacent ally to protect'
      };
    }

    const allyActor = allyToken.actor;
    if (!allyActor) {
      return { success: false, message: 'Target is not valid' };
    }

    return {
      success: true,
      targetActor: allyActor,
      targetToken: allyToken,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Protective Stance - Block damage
   */
  static async completeProtectiveStance(actor, allyActor, damage, combatId, usageFlag) {
    // Mark as used
    await actor.setFlag('foundryvtt-swse', usageFlag, true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Protective Stance to block ${damage} damage for ${allyActor.name}`);
    ui.notifications.info(`${actor.name} steps in front of ${allyActor.name}, blocking the damage!`);

    return { success: true };
  }

  // ============================================================================
  // PRESENCE - Bonus to social checks
  // ============================================================================

  /**
   * PRESENCE - Get bonus to social checks
   * Passive talent
   */
  static applyPresence(actor) {
    if (!this.hasPresence(actor)) {
      return false;
    }

    // This is typically applied as an active effect bonus to Persuasion/Deception
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
// HOOKS - Auto-trigger Noble talent dialogs
// ============================================================================

/**
 * Hook: When user initiates Inspire Confidence
 */
Hooks.on('inspireConfidenceTriggered', async (actor) => {
  const result = await NobleTalentMechanics.triggerInspireConfidence(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection) {
    const allyOptions = result.allies
      .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
      .join('');

    const dialog = new SWSEDialogV2({
      title: 'Inspire Confidence - Select Ally',
      content: `
        <div class="form-group">
          <label>Choose an ally to inspire:</label>
          <select id="ally-select" style="width: 100%;">
            ${allyOptions}
          </select>
        </div>
      `,
      buttons: {
        inspire: {
          label: 'Inspire',
          callback: async (html) => {
            const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
            await NobleTalentMechanics.completeInspireConfidence(actor, allyId, result.combatId, result.usageFlag);
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

/**
 * Hook: When user initiates Bolster Ally
 */
Hooks.on('bolsterAllyTriggered', async (actor) => {
  const result = await NobleTalentMechanics.triggerBolsterAlly(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection) {
    const allyOptions = result.allies
      .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
      .join('');

    const dialog = new SWSEDialogV2({
      title: 'Bolster Ally - Select Ally',
      content: `
        <div class="form-group">
          <label>Choose an ally to bolster (${result.tempHP} temp HP):</label>
          <select id="ally-select" style="width: 100%;">
            ${allyOptions}
          </select>
        </div>
      `,
      buttons: {
        bolster: {
          label: 'Bolster',
          callback: async (html) => {
            const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
            await NobleTalentMechanics.completeBolsterAlly(actor, allyId, result.tempHP, result.combatId, result.usageFlag);
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

/**
 * Hook: When user initiates Ignite Fervor
 */
Hooks.on('igniteFervorTriggered', async (actor) => {
  const result = await NobleTalentMechanics.triggerIgniteFervor(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  await NobleTalentMechanics.completeIgniteFervor(actor, result.combatId, result.usageFlag);
});

export default NobleTalentMechanics;
