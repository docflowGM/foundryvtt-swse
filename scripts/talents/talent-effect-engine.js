/**
 * TalentEffectEngine
 *
 * Pure computation layer for talent effects.
 * No mutations occur here. Only planning.
 *
 * Purpose: Separate calculation from execution, enable deterministic testing,
 * prevent partial state visibility.
 */

import { RollEngine } from '../engine/roll-engine.js';
import { SWSELogger } from '../utils/logger.js';

export class TalentEffectEngine {

  /**
   * Build Channel Aggression effect plan
   *
   * Compute phase only. No mutations.
   * Returns plan object with all computed values and mutations to apply.
   *
   * @param {Actor} sourceActor - Actor using Channel Aggression
   * @param {Actor} targetActor - Actor being damaged
   * @param {number} characterLevel - Source actor's level
   * @param {boolean} spendFP - Whether to spend Force Points
   * @returns {Promise<Object>} Plan object with success, roll, damageAmount, mutations
   */
  static async buildChannelAggressionPlan({
    sourceActor,
    targetActor,
    characterLevel,
    spendFP = true
  }) {
    // --- Validation (read-only) ---
    const currentFP = sourceActor.system.forcePoints?.value ?? 0;
    if (spendFP && currentFP < 1) {
      return {
        success: false,
        reason: "Insufficient Force Points"
      };
    }

    if (!targetActor) {
      return {
        success: false,
        reason: "Invalid target actor"
      };
    }

    // --- Compute damage dice ---
    const damageDice = Math.min(characterLevel, 10);

    // --- Roll damage ---
    const roll = await RollEngine.safeRoll(`${damageDice}d6`);
    if (!roll) {
      return {
        success: false,
        reason: "Damage roll failed"
      };
    }
    const damageAmount = roll.total;

    // --- Compute target HP after damage ---
    const targetHp = targetActor.system.hp.value ?? 0;
    const newHp = Math.max(0, targetHp - damageAmount);

    // --- Build mutation plan ---
    const mutations = [];

    // Mutation 1: Source spends Force Point
    if (spendFP) {
      mutations.push({
        actor: sourceActor,
        actorId: sourceActor.id,
        type: "update",
        data: {
          "system.forcePoints.value": currentFP - 1
        }
      });
    }

    // Mutation 2: Target takes damage
    mutations.push({
      actor: targetActor,
      actorId: targetActor.id,
      type: "update",
      data: {
        "system.hp.value": newHp
      }
    });

    // --- Return plan (not executed) ---
    return {
      success: true,
      effect: "channelAggression",
      sourceActor: sourceActor,
      targetActor: targetActor,
      damageDice,
      damageAmount,
      roll,
      newHp,
      currentFp: currentFP,
      mutations
    };
  }

  /**
   * Build Channel Anger activation plan
   *
   * @param {Actor} sourceActor - Actor activating rage
   * @param {boolean} spendFP - Whether to spend Force Points
   * @returns {Promise<Object>} Plan object
   */
  static async buildChannelAngerPlan({
    sourceActor,
    spendFP = true
  }) {
    // --- Validation ---
    const isRaging = sourceActor.getFlag('foundryvtt-swse', 'isChannelAngerRaging');
    if (isRaging) {
      return {
        success: false,
        reason: `Already raging until round ${isRaging.endRound}`
      };
    }

    const currentFP = sourceActor.system.forcePoints?.value ?? 0;
    if (spendFP && currentFP < 1) {
      return {
        success: false,
        reason: "Insufficient Force Points"
      };
    }

    // --- Compute duration ---
    const conModifier = sourceActor.system.attributes.con?.mod ?? 0;
    const durationRounds = 5 + conModifier;
    const currentRound = game.combat?.round ?? 0;
    const endRound = currentRound + durationRounds;

    // --- Build flag data ---
    const rageInfo = {
      startRound: currentRound,
      endRound: endRound,
      durationRounds: durationRounds,
      conModifier: conModifier
    };

    // --- Build mutations ---
    const mutations = [];

    if (spendFP) {
      mutations.push({
        actor: sourceActor,
        actorId: sourceActor.id,
        type: "update",
        data: {
          "system.forcePoints.value": currentFP - 1
        }
      });
    }

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "isChannelAngerRaging",
      value: rageInfo
    });

    return {
      success: true,
      effect: "channelAnger",
      sourceActor: sourceActor,
      durationRounds,
      endRound,
      rageBonus: 2,
      mutations
    };
  }

  /**
   * Build Crippling Strike effect plan
   *
   * @param {Actor} sourceActor - Actor using crippling strike
   * @param {Actor} targetActor - Actor being crippled
   * @param {boolean} spendFP - Whether to spend Force Points
   * @returns {Promise<Object>} Plan object
   */
  static async buildCripplingStrikePlan({
    sourceActor,
    targetActor,
    spendFP = true
  }) {
    // --- Validation ---
    const currentFP = sourceActor.system.forcePoints?.value ?? 0;
    if (spendFP && currentFP < 1) {
      return {
        success: false,
        reason: "Insufficient Force Points"
      };
    }

    if (!targetActor) {
      return {
        success: false,
        reason: "Invalid target actor"
      };
    }

    // --- Compute speed reduction ---
    const originalSpeed = targetActor.system.speed?.base ?? 6;
    const crippledSpeed = Math.ceil(originalSpeed / 2);

    // --- Build flag data ---
    const crippledInfo = {
      sourceActor: sourceActor.id,
      sourceName: sourceActor.name,
      originalSpeed: originalSpeed,
      crippledSpeed: crippledSpeed,
      maxHpWhenCrippled: targetActor.system.hp.max
    };

    // --- Build mutations ---
    const mutations = [];

    if (spendFP) {
      mutations.push({
        actor: sourceActor,
        actorId: sourceActor.id,
        type: "update",
        data: {
          "system.forcePoints.value": currentFP - 1
        }
      });
    }

    mutations.push({
      actor: targetActor,
      actorId: targetActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "isCrippled",
      value: crippledInfo
    });

    mutations.push({
      actor: targetActor,
      actorId: targetActor.id,
      type: "update",
      data: {
        "system.speed.current": crippledSpeed
      }
    });

    return {
      success: true,
      effect: "cripplingStrike",
      sourceActor: sourceActor,
      targetActor: targetActor,
      originalSpeed,
      crippledSpeed,
      mutations
    };
  }

  /**
   * Build Dark Side Talisman creation plan
   *
   * @param {Actor} sourceActor - Actor creating talisman
   * @param {string} selectedDefense - Defense being protected
   * @param {boolean} spendFP - Whether to spend Force Points
   * @returns {Promise<Object>} Plan object
   */
  static async buildDarkSideTalismanPlan({
    sourceActor,
    selectedDefense,
    spendFP = true
  }) {
    // --- Validation ---
    const activeTalisman = sourceActor.getFlag('foundryvtt-swse', 'activeDarkSideTalisman');
    if (activeTalisman) {
      return {
        success: false,
        reason: "Already has active talisman"
      };
    }

    const currentFP = sourceActor.system.forcePoints?.value ?? 0;
    if (spendFP && currentFP < 1) {
      return {
        success: false,
        reason: "Insufficient Force Points"
      };
    }

    // --- Determine talisman type ---
    const hasGreater = sourceActor.items?.some(item =>
      item.type === 'talent' && item.name === 'Greater Dark Side Talisman'
    );

    // --- Build talisman info ---
    const talismantInfo = {
      isGreater: hasGreater,
      defense: hasGreater ? 'all' : selectedDefense,
      createdAt: new Date().toISOString(),
      createdRound: game.combat?.round ?? 0
    };

    // --- Build mutations ---
    const mutations = [];

    if (spendFP) {
      mutations.push({
        actor: sourceActor,
        actorId: sourceActor.id,
        type: "update",
        data: {
          "system.forcePoints.value": currentFP - 1
        }
      });
    }

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "activeDarkSideTalisman",
      value: talismantInfo
    });

    return {
      success: true,
      effect: "darkSideTalisman",
      sourceActor: sourceActor,
      isGreater: hasGreater,
      defense: hasGreater ? 'all' : selectedDefense,
      mutations
    };
  }

  /**
   * Build End Channel Anger plan
   *
   * @param {Actor} sourceActor - Actor ending rage
   * @returns {Promise<Object>} Plan object
   */
  static async buildEndChannelAngerPlan({
    sourceActor
  }) {
    // --- Validation ---
    const rageInfo = sourceActor.getFlag('foundryvtt-swse', 'isChannelAngerRaging');
    if (!rageInfo) {
      return {
        success: false,
        reason: "Not currently raging"
      };
    }

    // --- Compute condition change ---
    const currentCondition = sourceActor.system.conditionTrack?.value ?? 0;
    const newCondition = Math.max(0, currentCondition - 1);

    // --- Build mutations ---
    const mutations = [];

    // Unset flag (via direct call in applyTalentEffect, not update)
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "unsetFlag",
      scope: "foundryvtt-swse",
      key: "isChannelAngerRaging"
    });

    // Update condition track
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "update",
      data: {
        "system.conditionTrack.value": newCondition
      }
    });

    return {
      success: true,
      effect: "endChannelAnger",
      sourceActor: sourceActor,
      newCondition: newCondition,
      mutations
    };
  }

  /**
   * Build Swift Power activation plan
   *
   * @param {Actor} sourceActor - Actor using Swift Power
   * @param {Object} forcePower - Force Power item being used
   * @returns {Promise<Object>} Plan object
   */
  static async buildSwiftPowerPlan({
    sourceActor,
    forcePower
  }) {
    // --- Validation ---
    const lastUsed = sourceActor.getFlag('foundryvtt-swse', 'swiftPowerUsedToday');
    const today = new Date().toDateString();

    if (lastUsed === today) {
      return {
        success: false,
        reason: "Swift Power has already been used today. It refreshes at the next dawn."
      };
    }

    if (!forcePower) {
      return {
        success: false,
        reason: "Invalid Force Power"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "swiftPowerUsedToday",
      value: today
    });

    return {
      success: true,
      effect: "swiftPower",
      sourceActor: sourceActor,
      forcePowerName: forcePower.name,
      mutations
    };
  }

  /**
   * Build Dark Side Savant activation plan
   *
   * @param {Actor} sourceActor - Actor using Dark Side Savant
   * @param {Object} power - The Force Power being returned
   * @param {string} combatId - Current combat ID
   * @param {string} savantUsageFlag - Flag key for tracking usage
   * @returns {Promise<Object>} Plan object
   */
  static async buildDarkSideSavantPlan({
    sourceActor,
    power,
    combatId,
    savantUsageFlag
  }) {
    // --- Validation ---
    if (!power) {
      return {
        success: false,
        reason: "Invalid Force Power"
      };
    }

    if (power.system?.spent !== true) {
      return {
        success: false,
        reason: "Power is not spent"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    // Return power to suite (mark as not spent)
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "updateOwnedItems",
      items: [{
        _id: power.id,
        "system.spent": false
      }]
    });

    // Mark as used this encounter
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: savantUsageFlag,
      value: true
    });

    return {
      success: true,
      effect: "darkSideSavant",
      sourceActor: sourceActor,
      powerName: power.name,
      mutations
    };
  }

  /**
   * Build Wrath of the Dark Side plan
   *
   * @param {Actor} sourceActor - Actor triggering Wrath
   * @param {Actor} targetActor - Actor receiving delayed damage
   * @param {number} damageDealt - Original damage dealt
   * @returns {Promise<Object>} Plan object
   */
  static async buildWrathOfDarkSidePlan({
    sourceActor,
    targetActor,
    damageDealt
  }) {
    // --- Validation ---
    if (!targetActor) {
      return {
        success: false,
        reason: "Invalid target actor"
      };
    }

    if (!damageDealt || damageDealt <= 0) {
      return {
        success: false,
        reason: "No damage to apply"
      };
    }

    // --- Compute half damage ---
    const halfDamage = Math.floor(damageDealt / 2);
    const wrathFlagId = `wrath_${Date.now()}_${targetActor.id}`;

    // --- Prepare existing wrath flags ---
    const wrathFlags = targetActor.getFlag('foundryvtt-swse', 'wrathDamage') || [];
    const newWrathEntry = {
      id: wrathFlagId,
      damage: halfDamage,
      sourceName: sourceActor.name,
      sourceId: sourceActor.id,
      triggerRound: game.combat?.round,
      triggeredAt: new Date().toISOString()
    };

    const updatedFlags = [...wrathFlags, newWrathEntry];

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: targetActor,
      actorId: targetActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "wrathDamage",
      value: updatedFlags
    });

    return {
      success: true,
      effect: "wrathOfDarkSide",
      sourceActor: sourceActor,
      targetActor: targetActor,
      halfDamage: halfDamage,
      mutations
    };
  }
}
