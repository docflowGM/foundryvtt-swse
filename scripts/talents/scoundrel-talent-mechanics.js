/**
 * Scoundrel Talent Mechanics
 * Implements complex game mechanics for Scoundrel talents:
 * - Knack: Reroll ability check once per encounter
 * - Fool's Luck: Automatic success or fail condition
 * - Fortune's Favor: Gain bonuses to attack/defense
 * - Lucky Shot: Improved critical range
 * - Dumb Luck: Avoid disaster once per day
 * - Sneak Attack: Extra damage when attacking unaware
 * - Dastardly Strike: Disarm or trip on attack
 * - Skirmisher: Move and attack with penalties
 * - Cunning Strategist: Grant bonuses to allies
 * - Master Slicer: Advanced computer skills
 * - Electronic Sabotage: Disable electronics
 * - Trace: Track targets
 */

import { SWSELogger } from '../utils/logger.js';
import { createEffectOnActor } from '../core/document-api-v13.js';

export class ScoundrelTalentMechanics {

  /**
   * Check if actor has Knack talent
   */
  static hasKnack(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Knack'
    );
  }

  /**
   * Check if actor has Fool's Luck talent
   */
  static hasFoolsLuck(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === "Fool's Luck"
    );
  }

  /**
   * Check if actor has Fortune's Favor talent
   */
  static hasFortuneFavor(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === "Fortune's Favor"
    );
  }

  /**
   * Check if actor has Lucky Shot talent
   */
  static hasLuckyShot(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Lucky Shot'
    );
  }

  /**
   * Check if actor has Dumb Luck talent
   */
  static hasDumbLuck(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dumb Luck'
    );
  }

  /**
   * Check if actor has Sneak Attack talent
   */
  static hasSneakAttack(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Sneak Attack'
    );
  }

  /**
   * Check if actor has Dastardly Strike talent
   */
  static hasDastardlyStrike(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dastardly Strike'
    );
  }

  /**
   * Check if actor has Skirmisher talent
   */
  static hasSkirmisher(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Skirmisher'
    );
  }

  /**
   * Check if actor has Cunning Strategist talent
   */
  static hasCunningStrategist(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Cunning Strategist'
    );
  }

  /**
   * Check if actor has Master Slicer talent
   */
  static hasMasterSlicer(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Master Slicer'
    );
  }

  /**
   * Check if actor has Electronic Sabotage talent
   */
  static hasElectronicSabotage(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Electronic Sabotage'
    );
  }

  /**
   * Check if actor has Trace talent
   */
  static hasTrace(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Trace'
    );
  }

  // ============================================================================
  // KNACK - Reroll ability check once per encounter
  // ============================================================================

  /**
   * KNACK - Reroll an ability check
   * Immediate action, once per encounter
   */
  static async triggerKnack(actor) {
    if (!this.hasKnack(actor)) {
      return { success: false, message: 'Actor does not have Knack talent' };
    }

    // Check if already used this day
    const usageFlag = `knack_dayUsed`;
    const alreadyUsed = actor.getFlag('foundryvtt-swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Knack has already been used today.'
      };
    }

    return {
      success: true,
      message: 'You may reroll an ability check. Use the new result!'
    };
  }

  /**
   * Mark Knack as used
   */
  static async completeKnack(actor) {
    await actor.setFlag('foundryvtt-swse', 'knack_dayUsed', true);

    SWSELogger.log(`SWSE Talents | ${actor.name} used Knack to reroll an ability check`);
    ui.notifications.info(`${actor.name} uses Knack to reroll the check!`);

    return { success: true };
  }

  // ============================================================================
  // SNEAK ATTACK - Extra damage when attacking unaware
  // ============================================================================

  /**
   * SNEAK ATTACK - Extra damage on attack against unaware target
   * Passive talent (triggered on successful attack)
   */
  static async triggerSneakAttack(actor, targetToken) {
    if (!this.hasSneakAttack(actor)) {
      return { success: false, message: 'Actor does not have Sneak Attack talent' };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target for Sneak Attack'
      };
    }

    const targetActor = targetToken.actor;
    if (!targetActor) {
      return { success: false, message: 'Target is not valid' };
    }

    // Check if target is unaware (flat-footed)
    const isUnaware = targetActor.system?.condition?.flatFooted || false;

    if (!isUnaware) {
      return {
        success: false,
        message: 'Target is not unaware or flat-footed'
      };
    }

    // Calculate extra damage (typically 1d6 per 4 levels, minimum 1d6)
    const level = actor.system.attributes?.level || 1;
    const extraDice = Math.max(1, Math.ceil(level / 4));

    return {
      success: true,
      targetActor: targetActor,
      extraDamage: `${extraDice}d6`
    };
  }

  /**
   * Complete Sneak Attack - Apply extra damage
   */
  static async completeSneakAttack(actor, targetActor, extraDamage) {
    SWSELogger.log(`SWSE Talents | ${actor.name} used Sneak Attack on ${targetActor.name} for ${extraDamage} extra damage`);
    ui.notifications.info(`${actor.name} strikes ${targetActor.name} with a sneak attack! Add ${extraDamage} to the damage roll!`);

    return { success: true };
  }

  // ============================================================================
  // DASTARDLY STRIKE - Disarm or trip on attack
  // ============================================================================

  /**
   * DASTARDLY STRIKE - Attempt to disarm or trip on attack
   * Standard action, once per encounter
   */
  static async triggerDastardlyStrike(actor, targetToken, strikeType = 'disarm') {
    if (!this.hasDastardlyStrike(actor)) {
      return { success: false, message: 'Actor does not have Dastardly Strike talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Dastardly Strike can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `dastardlyStrike_${combatId}`;
    const alreadyUsed = actor.getFlag('foundryvtt-swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Dastardly Strike has already been used this encounter.'
      };
    }

    if (!targetToken) {
      return {
        success: false,
        message: 'Please select a target for Dastardly Strike'
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
      strikeType: strikeType,
      combatId: combatId,
      usageFlag: usageFlag
    };
  }

  /**
   * Complete Dastardly Strike - Apply effect if successful
   */
  static async completeDastardlyStrike(actor, targetActor, strikeType, success, combatId, usageFlag) {
    await actor.setFlag('foundryvtt-swse', usageFlag, true);

    if (!success) {
      SWSELogger.log(`SWSE Talents | ${actor.name} attempted Dastardly Strike on ${targetActor.name} but failed`);
      return { success: true, hit: false };
    }

    const effectName = strikeType === 'trip'
      ? 'Dastardly Strike - Knocked Prone'
      : 'Dastardly Strike - Disarmed';

    const changeKey = strikeType === 'trip'
      ? 'system.condition.prone'
      : 'system.condition.disarmed';

    await createEffectOnActor(targetActor, {
      name: effectName,
      icon: strikeType === 'trip' ? 'icons/svg/daze.svg' : 'icons/svg/target.svg',
      changes: [{
        key: changeKey,
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
          sourceId: 'dastardly-strike',
          sourceActorId: actor.id
        }
      }
    });

    const message = strikeType === 'trip'
      ? `${targetActor.name} has been knocked prone!`
      : `${targetActor.name} has been disarmed!`;

    SWSELogger.log(`SWSE Talents | ${actor.name} used Dastardly Strike on ${targetActor.name}`);
    ui.notifications.info(message);

    return { success: true, hit: true };
  }

  // ============================================================================
  // SKIRMISHER - Move and attack with penalties
  // ============================================================================

  /**
   * SKIRMISHER - Move before or after attack without AoO
   * Passive talent
   */
  static applySkirmisher(actor) {
    if (!this.hasSkirmisher(actor)) {
      return false;
    }

    // This talent allows free movement during attacks
    return true;
  }

  // ============================================================================
  // CUNNING STRATEGIST - Grant bonuses to allies
  // ============================================================================

  /**
   * CUNNING STRATEGIST - Grant ally +2 bonus to next attack
   * Standard action, once per encounter
   */
  static async triggerCunningStrategist(actor) {
    if (!this.hasCunningStrategist(actor)) {
      return { success: false, message: 'Actor does not have Cunning Strategist talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Cunning Strategist can only be used during an encounter'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const usageFlag = `cunningStrategist_${combatId}`;
    const alreadyUsed = actor.getFlag('foundryvtt-swse', usageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Cunning Strategist has already been used this encounter.'
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
   * Complete Cunning Strategist selection
   */
  static async completeCunningStrategist(actor, allyId, combatId, usageFlag) {
    const ally = game.actors.get(allyId);
    if (!ally) {
      ui.notifications.error('Ally not found');
      return false;
    }

    await actor.setFlag('foundryvtt-swse', usageFlag, true);

    // Apply bonus to next attack
    await createEffectOnActor(ally, {
      name: 'Cunning Strategist - Attack Bonus',
      icon: 'icons/svg/aura.svg',
      changes: [{
        key: 'system.skills.attack.bonus',
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
          sourceId: 'cunning-strategist',
          sourceActorId: actor.id
        }
      }
    });

    SWSELogger.log(`SWSE Talents | ${actor.name} used Cunning Strategist on ${ally.name}`);
    ui.notifications.info(`${ally.name} gains +2 to their next attack roll!`);

    return true;
  }

  // ============================================================================
  // FORTUNE'S FAVOR - Gain bonuses
  // ============================================================================

  /**
   * FORTUNE'S FAVOR - Passive bonus to defense
   */
  static applyFortuneFavor(actor) {
    if (!this.hasFortuneFavor(actor)) {
      return false;
    }

    // Typically grants +1 to a defense
    return true;
  }

  // ============================================================================
  // LUCKY SHOT - Improved critical range
  // ============================================================================

  /**
   * LUCKY SHOT - Expand critical range on weapon
   * Passive talent
   */
  static applyLuckyShot(actor) {
    if (!this.hasLuckyShot(actor)) {
      return false;
    }

    // Expands critical range (e.g., 19-20 instead of 20)
    return true;
  }

  // ============================================================================
  // MASTER SLICER - Advanced computer skills
  // ============================================================================

  /**
   * MASTER SLICER - Bonus to computer use checks
   * Passive talent
   */
  static applyMasterSlicer(actor) {
    if (!this.hasMasterSlicer(actor)) {
      return false;
    }

    // Grants +5 bonus to Computers skill
    return true;
  }

  // ============================================================================
  // ELECTRONIC SABOTAGE - Disable electronics
  // ============================================================================

  /**
   * ELECTRONIC SABOTAGE - Disable electronic device
   * Standard action
   */
  static async triggerElectronicSabotage(actor, targetDevice = null) {
    if (!this.hasElectronicSabotage(actor)) {
      return { success: false, message: 'Actor does not have Electronic Sabotage talent' };
    }

    return {
      success: true,
      requiresRoll: true,
      targetDevice: targetDevice,
      message: 'Make a Computers check to sabotage the device'
    };
  }

  // ============================================================================
  // TRACE - Track targets
  // ============================================================================

  /**
   * TRACE - Track a target
   * Standard action
   */
  static async triggerTrace(actor, targetActor = null) {
    if (!this.hasTrace(actor)) {
      return { success: false, message: 'Actor does not have Trace talent' };
    }

    return {
      success: true,
      targetActor: targetActor,
      message: 'You can track this target through communications or movement'
    };
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
// HOOKS - Auto-trigger Scoundrel talent dialogs
// ============================================================================

/**
 * Hook: When user initiates Cunning Strategist
 */
Hooks.on('cunningStrategistTriggered', async (actor) => {
  const result = await ScoundrelTalentMechanics.triggerCunningStrategist(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection) {
    const allyOptions = result.allies
      .map(t => `<option value="${t.actor.id}">${t.actor.name}</option>`)
      .join('');

    const dialog = new SWSEDialogV2({
      title: 'Cunning Strategist - Select Ally',
      content: `
        <div class="form-group">
          <label>Choose an ally to grant +2 to next attack:</label>
          <select id="ally-select" style="width: 100%;">
            ${allyOptions}
          </select>
        </div>
      `,
      buttons: {
        strategize: {
          label: 'Grant Bonus',
          callback: async (html) => {
            const allyId = (html?.[0] ?? html)?.querySelector('#ally-select')?.value;
            await ScoundrelTalentMechanics.completeCunningStrategist(actor, allyId, result.combatId, result.usageFlag);
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
 * Hook: When user initiates Knack
 */
Hooks.on('knackTriggered', async (actor) => {
  const result = await ScoundrelTalentMechanics.triggerKnack(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  await ScoundrelTalentMechanics.completeKnack(actor);
});

export default ScoundrelTalentMechanics;
