/**
 * TalentEffectEngine
 *
 * Pure computation layer for talent effects.
 * No mutations occur here. Only planning.
 *
 * Purpose: Separate calculation from execution, enable deterministic testing,
 * prevent partial state visibility.
 */

import { RollEngine } from '../../engine/roll-engine.js';
import { SWSELogger } from '../../utils/logger.js';

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

  /**
   * Build Direct plan - Return ally's Force Power to suite
   */
  static async buildDirectPlan({
    sourceActor,
    allyActor,
    power,
    directUsageFlag
  }) {
    if (!allyActor || !power) {
      return { success: false, reason: "Invalid ally or power" };
    }

    const mutations = [];
    mutations.push({
      actor: allyActor,
      actorId: allyActor.id,
      type: "updateOwnedItems",
      items: [{ _id: power.id, "system.spent": false }]
    });
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: directUsageFlag,
      value: true
    });

    return {
      success: true,
      effect: "direct",
      sourceActor: sourceActor,
      allyActor: allyActor,
      powerName: power.name,
      mutations
    };
  }

  /**
   * Build Consular's Wisdom plan
   */
  static async buildConsularsWisdomPlan({
    sourceActor,
    allyActor,
    wisdomBonus,
    wisdomUsageFlag
  }) {
    if (!allyActor) {
      return { success: false, reason: "Invalid ally" };
    }

    const mutations = [];
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: wisdomUsageFlag,
      value: true
    });

    return {
      success: true,
      effect: "consularsWisdom",
      sourceActor: sourceActor,
      allyActor: allyActor,
      wisdomBonus: wisdomBonus,
      mutations
    };
  }

  /**
   * Build Exposing Strike plan - Spend FP to make target flat-footed
   */
  static async buildExposingStrikePlan({
    sourceActor,
    targetActor
  }) {
    const forcePoints = sourceActor.system.forcePoints?.value || 0;
    if (forcePoints < 1) {
      return { success: false, reason: "Insufficient Force Points" };
    }

    const mutations = [];
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "update",
      data: { "system.forcePoints.value": forcePoints - 1 }
    });

    return {
      success: true,
      effect: "exposingStrike",
      sourceActor: sourceActor,
      targetActor: targetActor,
      mutations
    };
  }

  /**
   * Build Dark Retaliation plan
   */
  static async buildDarkRetaliationPlan({
    sourceActor,
    retaliationUsageFlag
  }) {
    const forcePoints = sourceActor.system.forcePoints?.value || 0;
    if (forcePoints < 1) {
      return { success: false, reason: "Insufficient Force Points" };
    }

    const mutations = [];
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "update",
      data: { "system.forcePoints.value": forcePoints - 1 }
    });
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: retaliationUsageFlag,
      value: true
    });

    return {
      success: true,
      effect: "darkRetaliation",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Skilled Advisor plan - Spend FP to grant ally skill bonus
   */
  static async buildSkilledAdvisorPlan({
    sourceActor,
    useForcePoint = false
  }) {
    if (useForcePoint) {
      const forcePoints = sourceActor.system.forcePoints?.value || 0;
      if (forcePoints < 1) {
        return { success: false, reason: "Insufficient Force Points" };
      }
    }

    const mutations = [];
    if (useForcePoint) {
      const forcePoints = sourceActor.system.forcePoints?.value || 0;
      mutations.push({
        actor: sourceActor,
        actorId: sourceActor.id,
        type: "update",
        data: { "system.forcePoints.value": forcePoints - 1 }
      });
    }

    return {
      success: true,
      effect: "skilledAdvisor",
      sourceActor: sourceActor,
      useForcePoint: useForcePoint,
      mutations
    };
  }

  /**
   * Build Apprentice Boon plan - Spend FP for Force Point die bonus
   */
  static async buildApprenticeBoonPlan({
    sourceActor
  }) {
    const forcePoints = sourceActor.system.forcePoints?.value || 0;
    if (forcePoints < 1) {
      return { success: false, reason: "Insufficient Force Points" };
    }

    const mutations = [];
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "update",
      data: { "system.forcePoints.value": forcePoints - 1 }
    });

    return {
      success: true,
      effect: "apprenticeBoon",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Renew Vision plan - Regain Farseeing uses
   */
  static async buildRenewVisionPlan({
    sourceActor,
    farseeing,
    renewUsageFlag
  }) {
    if (!farseeing || !farseeing.system?.uses) {
      return { success: false, reason: "Farseeing not found or has no uses" };
    }

    const mutations = [];

    // Restore Farseeing uses
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "updateOwnedItems",
      items: [{
        _id: farseeing.id,
        "system.uses.current": farseeing.system.uses.max
      }]
    });

    // Mark as used this encounter
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: renewUsageFlag,
      value: true
    });

    return {
      success: true,
      effect: "renewVision",
      sourceActor: sourceActor,
      farseeingName: farseeing.name,
      mutations
    };
  }

  /**
   * Build Adept Negotiator plan - Persuasion check to move on Condition Track
   */
  static async buildAdeptNegotiatorPlan({
    sourceActor,
    targetActor,
    newConditionStep,
    conditionTrackKey
  }) {
    if (!targetActor) {
      return { success: false, reason: "Invalid target" };
    }

    const mutations = [];
    mutations.push({
      actor: targetActor,
      actorId: targetActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: conditionTrackKey,
      value: newConditionStep
    });

    return {
      success: true,
      effect: "adeptNegotiator",
      sourceActor: sourceActor,
      targetActor: targetActor,
      newConditionStep: newConditionStep,
      mutations
    };
  }

  /**
   * Build Inspire Confidence plan - Grant ally +2 morale bonus
   */
  static async buildInspireConfidencePlan({
    sourceActor,
    usageFlag
  }) {
    const mutations = [];
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "inspireConfidence",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Bolster Ally plan - Grant ally temporary HP
   */
  static async buildBolsterAllyPlan({
    sourceActor,
    allyActor,
    tempHP,
    usageFlag
  }) {
    if (!allyActor) {
      return { success: false, reason: "Invalid ally" };
    }

    const mutations = [];

    // Mark as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    // Apply temporary HP
    const currentTempHP = allyActor.system.attributes?.temporaryHP || 0;
    mutations.push({
      actor: allyActor,
      actorId: allyActor.id,
      type: "update",
      data: {
        "system.attributes.temporaryHP": currentTempHP + tempHP
      }
    });

    return {
      success: true,
      effect: "bolsterAlly",
      sourceActor: sourceActor,
      allyActor: allyActor,
      tempHP: tempHP,
      mutations
    };
  }

  /**
   * Build Ignite Fervor plan - Grant allies +1 attack and damage
   */
  static async buildIgniteFervorPlan({
    sourceActor,
    usageFlag
  }) {
    const mutations = [];

    // Mark as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "igniteFervor",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Protective Stance plan - Block damage for adjacent ally
   */
  static async buildProtectiveStancePlan({
    sourceActor,
    usageFlag
  }) {
    const mutations = [];

    // Mark as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "protectiveStance",
      sourceActor: sourceActor,
      mutations
    };
  }

  // ============================================================================
  // SCOUNDREL TALENTS
  // ============================================================================

  /**
   * Build Knack plan - Mark reroll ability check as used
   *
   * @param {Actor} sourceActor - Actor using Knack
   * @returns {Promise<Object>} Plan object
   */
  static async buildKnackPlan({
    sourceActor
  }) {
    const mutations = [];

    // Mark Knack as used today
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "knack_dayUsed",
      value: true
    });

    return {
      success: true,
      effect: "knack",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Dastardly Strike plan - Disarm or trip on attack
   *
   * @param {Actor} sourceActor - Actor using Dastardly Strike
   * @param {string} usageFlag - Combat-specific usage flag
   * @returns {Promise<Object>} Plan object
   */
  static async buildDastardlyStrikePlan({
    sourceActor,
    usageFlag
  }) {
    const mutations = [];

    // Mark Dastardly Strike as used this encounter
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "dastardlyStrike",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Cunning Strategist plan - Grant ally attack bonus
   *
   * @param {Actor} sourceActor - Actor using Cunning Strategist
   * @param {string} usageFlag - Combat-specific usage flag
   * @returns {Promise<Object>} Plan object
   */
  static async buildCunningStrategistPlan({
    sourceActor,
    usageFlag
  }) {
    const mutations = [];

    // Mark Cunning Strategist as used this encounter
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "cunningStrategist",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Stunning Strike usage flag plan
   *
   * @param {Actor} sourceActor - Actor using Stunning Strike
   * @param {string} combatId - Current combat ID
   * @param {string} usageFlag - Flag key for tracking usage
   * @returns {Promise<Object>} Plan object
   */
  static async buildStunningStrikePlan({
    sourceActor,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!combatId || !usageFlag) {
      return {
        success: false,
        reason: "Invalid combat ID or usage flag"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "stunningStrike",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Draw Fire usage flag plan
   *
   * @param {Actor} sourceActor - Actor using Draw Fire
   * @param {string} combatId - Current combat ID
   * @param {string} usageFlag - Flag key for tracking usage
   * @returns {Promise<Object>} Plan object
   */
  static async buildDrawFirePlan({
    sourceActor,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!combatId || !usageFlag) {
      return {
        success: false,
        reason: "Invalid combat ID or usage flag"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "drawFire",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Cover Fire usage flag plan
   *
   * @param {Actor} sourceActor - Actor using Cover Fire
   * @param {string} combatId - Current combat ID
   * @param {string} usageFlag - Flag key for tracking usage
   * @returns {Promise<Object>} Plan object
   */
  static async buildCoverFirePlan({
    sourceActor,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!combatId || !usageFlag) {
      return {
        success: false,
        reason: "Invalid combat ID or usage flag"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "coverFire",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Devastating Attack usage flag plan
   *
   * @param {Actor} sourceActor - Actor using Devastating Attack
   * @param {string} combatId - Current combat ID
   * @param {string} usageFlag - Flag key for tracking usage
   * @returns {Promise<Object>} Plan object
   */
  static async buildDevastatingAttackPlan({
    sourceActor,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!combatId || !usageFlag) {
      return {
        success: false,
        reason: "Invalid combat ID or usage flag"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "devastatingAttack",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Penetrating Attack usage flag plan
   *
   * @param {Actor} sourceActor - Actor using Penetrating Attack
   * @param {string} combatId - Current combat ID
   * @param {string} usageFlag - Flag key for tracking usage
   * @returns {Promise<Object>} Plan object
   */
  static async buildPenetratingAttackPlan({
    sourceActor,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!combatId || !usageFlag) {
      return {
        success: false,
        reason: "Invalid combat ID or usage flag"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "penetratingAttack",
      sourceActor: sourceActor,
      mutations
    };
  }

  /**
   * Build Battle Analysis usage flag plan
   *
   * @param {Actor} sourceActor - Actor using Battle Analysis
   * @param {string} combatId - Current combat ID
   * @param {string} usageFlag - Flag key for tracking usage
   * @returns {Promise<Object>} Plan object
   */
  static async buildBattleAnalysisPlan({
    sourceActor,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!combatId || !usageFlag) {
      return {
        success: false,
        reason: "Invalid combat ID or usage flag"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "battleAnalysis",
      sourceActor: sourceActor,
      mutations
    };
  }

  // ============================================================================
  // SCOUT TALENTS
  // ============================================================================

  /**
   * Build Blinding Strike effect plan
   *
   * Shadow Striker talent - Mark ability as used and prepare effect for target
   * Total Concealment effect until start of next turn
   */
  static async buildBlindingStrikePlan({
    sourceActor,
    targetActor,
    attackHit,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!targetActor) {
      return {
        success: false,
        reason: "Invalid target actor"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    // Mutation 1: Mark ability as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    // Mutation 2: Apply effect only if attack hit
    if (attackHit) {
      mutations.push({
        actor: targetActor,
        actorId: targetActor.id,
        type: "createEmbedded",
        embeddedName: "ActiveEffect",
        data: [{
          name: 'Blinding Strike - Total Concealment',
          icon: 'icons/svg/blind.svg',
          changes: [{
            key: 'system.concealment.total',
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
              sourceId: 'blinding-strike',
              sourceActorId: sourceActor.id
            }
          }
        }]
      });
    }

    return {
      success: true,
      effect: "blindingStrike",
      sourceActor: sourceActor,
      targetActor: targetActor,
      attackHit: attackHit,
      mutations
    };
  }

  /**
   * Build Confusing Strike effect plan
   *
   * Shadow Striker talent - Mark ability as used and apply effect if hit
   * Target limited to Swift Action only on next turn
   */
  static async buildConfusingStrikePlan({
    sourceActor,
    targetActor,
    attackHit,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!targetActor) {
      return {
        success: false,
        reason: "Invalid target actor"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    // Mutation 1: Mark ability as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    // Mutation 2: Apply effect only if attack hit
    if (attackHit) {
      mutations.push({
        actor: targetActor,
        actorId: targetActor.id,
        type: "createEmbedded",
        embeddedName: "ActiveEffect",
        data: [{
          name: 'Confusing Strike - Swift Action Only',
          icon: 'icons/svg/daze.svg',
          changes: [{
            key: 'system.action.limitedToSwiftAction',
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
              sourceId: 'confusing-strike',
              sourceActorId: sourceActor.id
            }
          }
        }]
      });
    }

    return {
      success: true,
      effect: "confusingStrike",
      sourceActor: sourceActor,
      targetActor: targetActor,
      attackHit: attackHit,
      mutations
    };
  }

  /**
   * Build Unexpected Attack plan
   *
   * Shadow Striker talent - Mark ability as used
   */
  static async buildUnexpectedAttackPlan({
    sourceActor,
    targetActor,
    attackBonus,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!targetActor) {
      return {
        success: false,
        reason: "Invalid target actor"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    // Mark ability as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "unexpectedAttack",
      sourceActor: sourceActor,
      targetActor: targetActor,
      bonus: attackBonus,
      mutations
    };
  }

  /**
   * Build Blurring Burst effect plan
   *
   * Swift Strider talent - Mark ability as used and apply Reflex bonus
   * +2 Reflex Defense until end of encounter
   */
  static async buildBlurringBurstPlan({
    sourceActor,
    combatId,
    usageFlag
  }) {
    // --- Build mutations ---
    const mutations = [];

    // Mutation 1: Mark ability as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    // Mutation 2: Apply +2 Reflex Defense bonus until end of encounter
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "createEmbedded",
      embeddedName: "ActiveEffect",
      data: [{
        name: 'Blurring Burst - Reflex Bonus',
        icon: 'icons/svg/aura.svg',
        changes: [{
          key: 'system.defenses.reflex.bonus',
          mode: 2, // ADD
          value: 2,
          priority: 20
        }],
        duration: {
          combat: combatId
        },
        flags: {
          swse: {
            source: 'talent',
            sourceId: 'blurring-burst',
            sourceActorId: sourceActor.id
          }
        }
      }]
    });

    const movementSpeed = sourceActor.system.movement?.groundSpeed || 30;

    return {
      success: true,
      effect: "blurringBurst",
      sourceActor: sourceActor,
      movementSpeed: movementSpeed,
      mutations
    };
  }

  /**
   * Build Sudden Assault plan
   *
   * Swift Strider talent - Mark ability as used
   */
  static async buildSuddenAssaultPlan({
    sourceActor,
    targetActor,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!targetActor) {
      return {
        success: false,
        reason: "Invalid target actor"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    // Mark ability as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "suddenAssault",
      sourceActor: sourceActor,
      targetActor: targetActor,
      mutations
    };
  }

  /**
   * Build Weaving Stride effect plan
   *
   * Swift Strider talent - Mark ability as used and apply dodge bonus if AoOs occurred
   */
  static async buildWeavingStridePlan({
    sourceActor,
    aooCount,
    combatId,
    usageFlag
  }) {
    // --- Build mutations ---
    const mutations = [];

    // Mutation 1: Mark ability as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    // Mutation 2: Apply dodge bonus if there were AoOs
    if (aooCount > 0) {
      const dodgeBonus = aooCount * 2;
      mutations.push({
        actor: sourceActor,
        actorId: sourceActor.id,
        type: "createEmbedded",
        embeddedName: "ActiveEffect",
        data: [{
          name: `Weaving Stride - Dodge Bonus (${dodgeBonus})`,
          icon: 'icons/svg/daze.svg',
          changes: [{
            key: 'system.defenses.reflex.bonus',
            mode: 2, // ADD
            value: dodgeBonus,
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
              sourceId: 'weaving-stride',
              sourceActorId: sourceActor.id,
              aooCount: aooCount
            }
          }
        }]
      });
    }

    const movementSpeed = sourceActor.system.movement?.groundSpeed || 30;

    return {
      success: true,
      effect: "weavingStride",
      sourceActor: sourceActor,
      movementSpeed: movementSpeed,
      dodgeBonus: aooCount > 0 ? aooCount * 2 : 0,
      aooCount: aooCount,
      mutations
    };
  }

  /**
   * Build Quick on Your Feet effect plan
   *
   * Movement talent - Mark ability as used
   */
  static async buildQuickOnYourFeetPlan({
    sourceActor,
    combatId,
    usageFlag
  }) {
    // --- Build mutations ---
    const mutations = [];

    // Mark ability as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    const movementSpeed = sourceActor.system.movement?.groundSpeed || 30;

    return {
      success: true,
      effect: "quickOnYourFeet",
      sourceActor: sourceActor,
      movementSpeed: movementSpeed,
      mutations
    };
  }

  /**
   * Build Surge effect plan
   *
   * Movement talent - Mark ability as used
   */
  static async buildSurgePlan({
    sourceActor,
    combatId,
    usageFlag
  }) {
    // --- Build mutations ---
    const mutations = [];

    // Mark ability as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    const movementSpeed = sourceActor.system.movement?.groundSpeed || 30;

    return {
      success: true,
      effect: "surge",
      sourceActor: sourceActor,
      movementSpeed: movementSpeed,
      mutations
    };
  }

  /**
   * Build Weak Point effect plan
   *
   * Combat talent - Mark ability as used and apply DR ignore effect
   */
  static async buildWeakPointPlan({
    sourceActor,
    targetActor,
    combatId,
    usageFlag
  }) {
    // --- Validation ---
    if (!targetActor) {
      return {
        success: false,
        reason: "Invalid target actor"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    // Mutation 1: Apply effect that ignores DR until end of turn
    mutations.push({
      actor: targetActor,
      actorId: targetActor.id,
      type: "createEmbedded",
      embeddedName: "ActiveEffect",
      data: [{
        name: 'Weak Point - DR Ignored',
        icon: 'icons/svg/target.svg',
        changes: [{
          key: 'system.damageReduction.ignoreUntilEndOfTurn',
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
            sourceId: 'weak-point',
            sourceActorId: sourceActor.id
          }
        }
      }]
    });

    // Mutation 2: Mark ability as used
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: usageFlag,
      value: true
    });

    return {
      success: true,
      effect: "weakPoint",
      sourceActor: sourceActor,
      targetActor: targetActor,
      mutations
    };
  }

  /**
   * Build Guidance effect plan
   *
   * Utility talent - Apply ignore difficult terrain effect to ally
   */
  static async buildGuidancePlan({
    sourceActor,
    allyActor
  }) {
    // --- Validation ---
    if (!allyActor) {
      return {
        success: false,
        reason: "Invalid ally actor"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    // Create effect for ignoring difficult terrain
    mutations.push({
      actor: allyActor,
      actorId: allyActor.id,
      type: "createEmbedded",
      embeddedName: "ActiveEffect",
      data: [{
        name: 'Guidance - Ignore Difficult Terrain',
        icon: 'icons/svg/light.svg',
        changes: [{
          key: 'system.movement.ignoreDifficultTerrain',
          mode: 5, // OVERRIDE
          value: 'true',
          priority: 20
        }],
        duration: {
          rounds: 1
        },
        flags: {
          swse: {
            source: 'talent',
            sourceId: 'guidance',
            sourceActorId: sourceActor.id
          }
        }
      }]
    });

    return {
      success: true,
      effect: "guidance",
      sourceActor: sourceActor,
      allyActor: allyActor,
      mutations
    };
  }

  /**
   * Build Get Into Position effect plan
   *
   * Follower talent - Apply +2 speed bonus to follower
   */
  static async buildGetIntoPositionPlan({
    sourceActor,
    followerActor
  }) {
    // --- Validation ---
    if (!followerActor) {
      return {
        success: false,
        reason: "Invalid follower actor"
      };
    }

    // --- Compute new speed ---
    const currentSpeed = followerActor.system.movement?.groundSpeed || 30;
    const newSpeed = currentSpeed + 2;

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: followerActor,
      actorId: followerActor.id,
      type: "update",
      data: { 'system.movement.groundSpeed': newSpeed }
    });

    return {
      success: true,
      effect: "getIntoPosition",
      sourceActor: sourceActor,
      followerActor: followerActor,
      speedBonus: 2,
      newSpeed: newSpeed,
      mutations
    };
  }

  /**
   * Build Record Reconnaissance Team Member plan
   *
   * Follower talent - Increment reconnaissance team count
   */
  static async buildRecordReconnaissanceTeamMemberPlan({
    sourceActor
  }) {
    // --- Compute new count ---
    const currentCount = sourceActor.getFlag('foundryvtt-swse', 'reconnaissanceTeamCount') || 0;
    const newCount = currentCount + 1;

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "reconnaissanceTeamCount",
      value: newCount
    });

    return {
      success: true,
      effect: "recordReconnaissanceTeamMember",
      sourceActor: sourceActor,
      currentCount: currentCount,
      newCount: newCount,
      mutations
    };
  }

  // ============================================================================
  // DARK SIDE POWERS - Additional Methods for DarkSidePowers.js
  // ============================================================================

  /**
   * Build Dark Healing plan
   * Attack roll vs target Fortitude, damage on hit
   *
   * @param {Actor} sourceActor - Actor using Dark Healing
   * @param {Actor} targetActor - Target to drain
   * @param {number} damageAmount - Computed damage amount
   * @param {boolean} spendFP - Whether to spend Force Points
   * @returns {Promise<Object>} Plan object
   */
  static async buildDarkHealingPlan({
    sourceActor,
    targetActor,
    damageAmount,
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

    if (damageAmount <= 0) {
      return {
        success: false,
        reason: "Invalid damage amount"
      };
    }

    // --- Compute mutations ---
    const targetHp = targetActor.system.hp?.value ?? 0;
    const newTargetHp = Math.max(0, targetHp - damageAmount);

    const sourceHp = sourceActor.system.hp?.value ?? 0;
    const newSourceHp = Math.min(sourceActor.system.hp?.max ?? 0, sourceHp + damageAmount);

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
      type: "update",
      data: {
        "system.hp.value": newTargetHp
      }
    });

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "update",
      data: {
        "system.hp.value": newSourceHp
      }
    });

    return {
      success: true,
      effect: "darkHealing",
      sourceActor: sourceActor,
      targetActor: targetActor,
      damageAmount: damageAmount,
      sourceHealAmount: damageAmount,
      newTargetHp: newTargetHp,
      newSourceHp: newSourceHp,
      mutations
    };
  }

  /**
   * Build Improved Dark Healing plan
   * Always deals at least half damage, heals the amount dealt
   *
   * @param {Actor} sourceActor - Actor using Improved Dark Healing
   * @param {Actor} targetActor - Target to drain
   * @param {number} damageDealt - Computed damage amount
   * @param {number} healAmount - Computed heal amount
   * @param {boolean} spendFP - Whether to spend Force Points
   * @returns {Promise<Object>} Plan object
   */
  static async buildImprovedDarkHealingPlan({
    sourceActor,
    targetActor,
    damageDealt,
    healAmount,
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

    // --- Compute mutations ---
    const targetHp = targetActor.system.hp?.value ?? 0;
    const newTargetHp = Math.max(0, targetHp - damageDealt);

    const sourceHp = sourceActor.system.hp?.value ?? 0;
    const newSourceHp = Math.min(sourceActor.system.hp?.max ?? 0, sourceHp + healAmount);

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
      type: "update",
      data: {
        "system.hp.value": newTargetHp
      }
    });

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "update",
      data: {
        "system.hp.value": newSourceHp
      }
    });

    return {
      success: true,
      effect: "improvedDarkHealing",
      sourceActor: sourceActor,
      targetActor: targetActor,
      damageDealt: damageDealt,
      healAmount: healAmount,
      newTargetHp: newTargetHp,
      newSourceHp: newSourceHp,
      mutations
    };
  }

  /**
   * Build Dark Healing Field plan
   * Multi-target healing by draining
   *
   * @param {Actor} sourceActor - Actor using Dark Healing Field
   * @param {Array<Object>} targetDamages - Array of {targetActor, damageDealt}
   * @param {number} totalHealAmount - Total healing for source
   * @param {boolean} spendFP - Whether to spend Force Points
   * @returns {Promise<Object>} Plan object
   */
  static async buildDarkHealingFieldPlan({
    sourceActor,
    targetDamages,
    totalHealAmount,
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

    if (!targetDamages || targetDamages.length === 0) {
      return {
        success: false,
        reason: "No valid targets"
      };
    }

    // --- Compute source healing ---
    const sourceHp = sourceActor.system.hp?.value ?? 0;
    const newSourceHp = Math.min(sourceActor.system.hp?.max ?? 0, sourceHp + totalHealAmount);

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

    // Add damage mutations for each target
    for (const target of targetDamages) {
      const targetHp = target.targetActor.system.hp?.value ?? 0;
      const newTargetHp = Math.max(0, targetHp - target.damageDealt);

      mutations.push({
        actor: target.targetActor,
        actorId: target.targetActor.id,
        type: "update",
        data: {
          "system.hp.value": newTargetHp
        }
      });
    }

    // Source healing
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "update",
      data: {
        "system.hp.value": newSourceHp
      }
    });

    return {
      success: true,
      effect: "darkHealingField",
      sourceActor: sourceActor,
      targetCount: targetDamages.length,
      totalHealAmount: totalHealAmount,
      newSourceHp: newSourceHp,
      mutations
    };
  }

  /**
   * Build Wicked Strike plan
   * Critical strike with special mechanics
   *
   * @param {Actor} sourceActor - Actor using Wicked Strike
   * @param {Actor} targetActor - Target of strike
   * @param {number} damageAmount - Computed damage amount
   * @param {boolean} spendFP - Whether to spend Force Points
   * @returns {Promise<Object>} Plan object
   */
  static async buildWickedStrikePlan({
    sourceActor,
    targetActor,
    damageAmount,
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

    if (!targetActor || damageAmount <= 0) {
      return {
        success: false,
        reason: "Invalid target or damage"
      };
    }

    // --- Compute mutations ---
    const targetHp = targetActor.system.hp?.value ?? 0;
    const newTargetHp = Math.max(0, targetHp - damageAmount);

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
      type: "update",
      data: {
        "system.hp.value": newTargetHp
      }
    });

    return {
      success: true,
      effect: "wickedStrike",
      sourceActor: sourceActor,
      targetActor: targetActor,
      damageAmount: damageAmount,
      newTargetHp: newTargetHp,
      mutations
    };
  }

  /**
   * Build Drain Force plan
   * Force Power draining with attack roll
   *
   * @param {Actor} sourceActor - Actor using Drain Force
   * @param {Actor} targetActor - Target to drain
   * @param {number} forceDrained - Force Points to drain
   * @returns {Promise<Object>} Plan object
   */
  static async buildDrainForcePlan({
    sourceActor,
    targetActor,
    forceDrained
  }) {
    // --- Validation ---
    if (!targetActor || forceDrained <= 0) {
      return {
        success: false,
        reason: "Invalid target or drain amount"
      };
    }

    const targetFP = targetActor.system.forcePoints?.value ?? 0;
    const newTargetFP = Math.max(0, targetFP - forceDrained);

    const sourceFP = sourceActor.system.forcePoints?.value ?? 0;
    const newSourceFP = sourceFP + forceDrained;

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: targetActor,
      actorId: targetActor.id,
      type: "update",
      data: {
        "system.forcePoints.value": newTargetFP
      }
    });

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "update",
      data: {
        "system.forcePoints.value": newSourceFP
      }
    });

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: `drainForceUsed_${game.combat?.id || 'noUse'}`,
      value: true
    });

    return {
      success: true,
      effect: "drainForce",
      sourceActor: sourceActor,
      targetActor: targetActor,
      forceDrained: forceDrained,
      newTargetFP: newTargetFP,
      newSourceFP: newSourceFP,
      mutations
    };
  }

  /**
   * Build Remove Crippling Strike plan
   * Remove crippling effect from target
   *
   * @param {Actor} targetActor - Actor to remove crippling from
   * @returns {Promise<Object>} Plan object
   */
  static async buildRemoveCripplingStrikePlan({
    targetActor
  }) {
    // --- Validation ---
    const crippledInfo = targetActor.getFlag('foundryvtt-swse', 'isCrippled');
    if (!crippledInfo) {
      return {
        success: false,
        reason: "Target is not crippled"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: targetActor,
      actorId: targetActor.id,
      type: "update",
      data: {
        "system.speed.current": crippledInfo.originalSpeed
      }
    });

    mutations.push({
      actor: targetActor,
      actorId: targetActor.id,
      type: "unsetFlag",
      scope: "foundryvtt-swse",
      key: "isCrippled"
    });

    return {
      success: true,
      effect: "removeCripplingStrike",
      targetActor: targetActor,
      restoredSpeed: crippledInfo.originalSpeed,
      mutations
    };
  }

  /**
   * Build Destroy Dark Side Talisman plan
   * Remove active Dark Side Talisman and set cooldown
   *
   * @param {Actor} sourceActor - Actor destroying talisman
   * @returns {Promise<Object>} Plan object
   */
  static async buildDestroyDarkSideTalismanPlan({
    sourceActor
  }) {
    // --- Validation ---
    const talismantInfo = sourceActor.getFlag('foundryvtt-swse', 'activeDarkSideTalisman');
    if (!talismantInfo) {
      return {
        success: false,
        reason: "No active Dark Side Talisman"
      };
    }

    // --- Compute cooldown ---
    const cooldownUntil = new Date();
    cooldownUntil.setHours(cooldownUntil.getHours() + 24);

    // --- Build mutations ---
    const mutations = [];

    // Delete the item if it exists
    if (talismantInfo.itemId) {
      mutations.push({
        actor: sourceActor,
        actorId: sourceActor.id,
        type: "deleteItems",
        itemIds: [talismantInfo.itemId]
      });
    }

    // Unset flag
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "unsetFlag",
      scope: "foundryvtt-swse",
      key: "activeDarkSideTalisman"
    });

    // Set cooldown
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "darkSideTalismanCooldown",
      value: cooldownUntil.toISOString()
    });

    return {
      success: true,
      effect: "destroyDarkSideTalisman",
      sourceActor: sourceActor,
      talismantInfo: talismantInfo,
      cooldownHours: 24,
      mutations
    };
  }

  /**
   * Build Create Sith Talisman plan
   * Create and set active Sith Talisman
   *
   * @param {Actor} sourceActor - Actor creating talisman
   * @param {string} talismantItemId - ID of created talisman item
   * @param {boolean} spendFP - Whether to spend Force Points
   * @returns {Promise<Object>} Plan object
   */
  static async buildSithTalismanPlan({
    sourceActor,
    talismantItemId,
    spendFP = true
  }) {
    // --- Validation ---
    const activeTalisman = sourceActor.getFlag('foundryvtt-swse', 'activeSithTalisman');
    if (activeTalisman) {
      return {
        success: false,
        reason: "Already has active Sith Talisman"
      };
    }

    const currentFP = sourceActor.system.forcePoints?.value ?? 0;
    if (spendFP && currentFP < 1) {
      return {
        success: false,
        reason: "Insufficient Force Points"
      };
    }

    // --- Compute DSP change ---
    const currentDSP = sourceActor.system.darkSideScore ?? 0;
    const newDSP = currentDSP + 1;

    // --- Build talisman info ---
    const talismantInfo = {
      itemId: talismantItemId,
      createdAt: new Date().toISOString(),
      createdRound: game.combat?.round ?? 0,
      dspIncreaseApplied: true
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

    // Increase DSP by 1
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "update",
      data: {
        "system.darkSideScore": newDSP
      }
    });

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "activeSithTalisman",
      value: talismantInfo
    });

    return {
      success: true,
      effect: "sithTalisman",
      sourceActor: sourceActor,
      talismantInfo: talismantInfo,
      dspIncreased: 1,
      newDSP: newDSP,
      mutations
    };
  }

  /**
   * Build Destroy Sith Talisman plan
   * Remove active Sith Talisman and set cooldown
   *
   * @param {Actor} sourceActor - Actor destroying talisman
   * @returns {Promise<Object>} Plan object
   */
  static async buildDestroySithTalismanPlan({
    sourceActor
  }) {
    // --- Validation ---
    const talismantInfo = sourceActor.getFlag('foundryvtt-swse', 'activeSithTalisman');
    if (!talismantInfo) {
      return {
        success: false,
        reason: "No active Sith Talisman"
      };
    }

    // --- Compute cooldown ---
    const cooldownUntil = new Date();
    cooldownUntil.setHours(cooldownUntil.getHours() + 24);

    // --- Build mutations ---
    const mutations = [];

    // Delete the item if it exists
    if (talismantInfo.itemId) {
      mutations.push({
        actor: sourceActor,
        actorId: sourceActor.id,
        type: "deleteItems",
        itemIds: [talismantInfo.itemId]
      });
    }

    // Unset flag
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "unsetFlag",
      scope: "foundryvtt-swse",
      key: "activeSithTalisman"
    });

    // Set cooldown
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "sithTalismanCooldown",
      value: cooldownUntil.toISOString()
    });

    return {
      success: true,
      effect: "destroySithTalisman",
      sourceActor: sourceActor,
      talismantInfo: talismantInfo,
      cooldownHours: 24,
      mutations
    };
  }

  /**
   * Build Clear Sith Alchemical Bonus plan
   * Remove active Sith Alchemical Bonus from weapon
   *
   * @param {Actor} sourceActor - Actor clearing bonus
   * @returns {Promise<Object>} Plan object
   */
  static async buildClearSithAlchemicalBonusPlan({
    sourceActor
  }) {
    // --- Validation ---
    const bonusInfo = sourceActor.getFlag('foundryvtt-swse', 'sithAlchemicalBonus');
    if (!bonusInfo) {
      return {
        success: false,
        reason: "No active Sith Alchemical Bonus"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "unsetFlag",
      scope: "foundryvtt-swse",
      key: "sithAlchemicalBonus"
    });

    return {
      success: true,
      effect: "clearSithAlchemicalBonus",
      sourceActor: sourceActor,
      bonusInfo: bonusInfo,
      mutations
    };
  }

  /**
   * Build Set Stolen Form Talent plan
   * Record stolen Force Secret talent
   *
   * @param {Actor} sourceActor - Actor stealing talent
   * @param {string} talentName - Name of talent being stolen
   * @returns {Promise<Object>} Plan object
   */
  static async buildSetStolenFormTalentPlan({
    sourceActor,
    talentName
  }) {
    // --- Validation ---
    if (!talentName) {
      return {
        success: false,
        reason: "Invalid talent name"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "stolenFormTalent",
      value: talentName
    });

    return {
      success: true,
      effect: "stolenFormTalent",
      sourceActor: sourceActor,
      talentName: talentName,
      mutations
    };
  }

  /**
   * Build Create Sith Alchemical Weapon plan
   * Create and enhance weapon with Sith alchemy
   *
   * @param {Actor} sourceActor - Actor creating weapon
   * @param {Object} weaponItem - Base weapon item
   * @returns {Promise<Object>} Plan object
   */
  static async buildCreateSithAlchemicalWeaponPlan({
    sourceActor,
    weaponItem
  }) {
    // --- Validation ---
    if (!weaponItem) {
      return {
        success: false,
        reason: "Invalid weapon item"
      };
    }

    // --- Build mutations ---
    const mutations = [];

    // Update weapon with alchemical properties
    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "updateOwnedItems",
      items: [{
        _id: weaponItem.id,
        "system.alchemicalEnhancement": true,
        "system.description": `${weaponItem.system?.description || ''}\n\n**Sith Alchemy Enhancement**: This weapon has been enhanced with Sith alchemy.`
      }]
    });

    return {
      success: true,
      effect: "sithAlchemicalWeapon",
      sourceActor: sourceActor,
      weaponName: weaponItem.name,
      mutations
    };
  }

  /**
   * Build Activate Sith Alchemical Bonus plan
   * Activate bonus for Sith Alchemical Weapon
   *
   * @param {Actor} sourceActor - Actor activating bonus
   * @param {Object} weaponItem - The weapon being activated
   * @param {number} bonusAmount - Amount of bonus
   * @returns {Promise<Object>} Plan object
   */
  static async buildActivateSithAlchemicalBonusPlan({
    sourceActor,
    weaponItem,
    bonusAmount = 5
  }) {
    // --- Validation ---
    if (!weaponItem) {
      return {
        success: false,
        reason: "Invalid weapon item"
      };
    }

    const currentBonus = sourceActor.getFlag('foundryvtt-swse', 'sithAlchemicalBonus');
    if (currentBonus) {
      return {
        success: false,
        reason: "Bonus already active"
      };
    }

    // --- Build bonus info ---
    const bonusInfo = {
      weaponId: weaponItem.id,
      weaponName: weaponItem.name,
      bonusAmount: bonusAmount,
      activatedAt: new Date().toISOString(),
      activatedRound: game.combat?.round ?? 0
    };

    // --- Build mutations ---
    const mutations = [];

    mutations.push({
      actor: sourceActor,
      actorId: sourceActor.id,
      type: "setFlag",
      scope: "foundryvtt-swse",
      key: "sithAlchemicalBonus",
      value: bonusInfo
    });

    return {
      success: true,
      effect: "activateSithAlchemicalBonus",
      sourceActor: sourceActor,
      weaponName: weaponItem.name,
      bonusAmount: bonusAmount,
      mutations
    };
  }
}
