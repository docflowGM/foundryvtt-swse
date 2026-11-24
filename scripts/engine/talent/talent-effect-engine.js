/**
 * TalentEffectEngine
 *
 * Pure computation layer for talent effects.
 * No mutations occur here. Only planning.
 *
 * Purpose: Separate calculation from execution, enable deterministic testing,
 * prevent partial state visibility.
 */


export class TalentEffectEngine {

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
        changes: [],
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
          changes: [],
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

}
