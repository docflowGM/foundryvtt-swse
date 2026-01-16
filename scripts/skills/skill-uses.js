/**
 * Consolidated Skill Uses System
 * Implements all Star Wars Saga Edition skill applications for:
 * - Jump, Knowledge, Mechanics, Perception, Persuasion, Pilot, Ride
 *
 * Each skill is implemented as its own class for modularity while keeping
 * everything in a single, organized file.
 */

import { SWSELogger } from '../utils/logger.js';

// ============================================================================
// JUMP SKILL (STR)
// ============================================================================

export class JumpUses {
  /**
   * LONG JUMP - Leap horizontally over pits, gaps, or obstacles
   * DC = distance (in meters) × 3
   * Running start required: At least 4 squares running start (DC doubled without)
   * Distance counts against maximum movement in round
   */
  static async longJump(actor, distance = 3, hasRunningStart = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const jumpBonus = actor.system.skills?.jump?.total || 0;
    const armorPenalty = actor.system.skills?.jump?.armor || 0;

    let dc = distance * 3;
    if (!hasRunningStart) {
      dc *= 2;
    }

    const totalBonus = jumpBonus + armorPenalty;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Long Jump</strong> - Horizontal Leap<br>Distance: ${distance} meter(s)<br>Running Start: ${hasRunningStart ? 'Yes' : 'No (DC doubled)'}<br>Base DC: ${distance * 3}<br>Final DC: ${dc}<br>Jump Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `JumpUses | ${actor.name} long jumped ${distance}m: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} clears the ${distance}m gap!` : `${actor.name} doesn't jump far enough!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      baseDC: distance * 3,
      distance: distance,
      hasRunningStart: hasRunningStart,
      armorPenalty: armorPenalty,
      movement: success ? `${distance} meter(s)` : 'Falls short',
      message: success ? `Clears ${distance}m gap` : `Falls short of ${distance}m gap`
    };
  }

  /**
   * HIGH JUMP - Leap vertically to reach ledges, platforms, or high areas
   * DC = distance (in meters) × 12
   * With pole vault: DC halved
   * Running start required: At least 4 squares running start (DC doubled without)
   */
  static async highJump(actor, distance = 1.5, hasRunningStart = true, hasPole = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const jumpBonus = actor.system.skills?.jump?.total || 0;
    const armorPenalty = actor.system.skills?.jump?.armor || 0;

    let dc = distance * 12;
    if (hasPole) {
      dc = Math.ceil(dc / 2);
    }
    if (!hasRunningStart) {
      dc *= 2;
    }

    const totalBonus = jumpBonus + armorPenalty;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>High Jump</strong> - Vertical Leap<br>Height: ${distance} meter(s)<br>Running Start: ${hasRunningStart ? 'Yes' : 'No (DC doubled)'}<br>Pole Vault: ${hasPole ? 'Yes (DC halved)' : 'No'}<br>Base DC: ${distance * 12}<br>Final DC: ${dc}<br>Jump Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `JumpUses | ${actor.name} high jumped ${distance}m: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} reaches the ${distance}m height!` : `${actor.name} can't reach the ${distance}m height!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      baseDC: distance * 12,
      distance: distance,
      hasRunningStart: hasRunningStart,
      hasPole: hasPole,
      height: success ? `${distance} meter(s)` : 'Falls short',
      message: success ? `Reaches ${distance}m height` : `Falls short of ${distance}m height`
    };
  }

  /**
   * JUMP DOWN - Reduce falling damage when intentionally jumping from height
   * DC 15 check reduces fall by 3 meters (2 squares)
   * Additional 3 meters reduction per 10 points over DC
   */
  static async jumpDown(actor, fallDistance = 30) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const jumpBonus = actor.system.skills?.jump?.total || 0;
    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + jumpBonus;
    const success = checkResult >= dc;

    let reducedDistance = 0;
    if (success) {
      reducedDistance = 3;
      const beatMargin = checkResult - dc;
      if (beatMargin >= 10) {
        reducedDistance += Math.floor(beatMargin / 10) * 3;
      }
    }

    const finalDistance = fallDistance - reducedDistance;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Jump Down</strong> - Reduce Falling Damage<br>Fall Distance: ${fallDistance} meters<br>DC: ${dc}<br>Jump Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Reduced Distance: ${reducedDistance} meters<br>Final Distance (for damage): ${finalDistance} meters${success && reducedDistance === fallDistance ? '<br>Lands on feet!' : ''}`
    });

    SWSELogger.log(
      `JumpUses | ${actor.name} jumped down ${fallDistance}m: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'} (reduced by ${reducedDistance}m)`
    );

    const statusMsg = success
      ? `${actor.name} reduces fall damage! Fall treated as ${finalDistance}m.${reducedDistance === fallDistance ? ' Lands on feet!' : ''}`
      : `${actor.name} takes full fall damage from ${fallDistance}m.`;

    ui.notifications.info(statusMsg);

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      originalDistance: fallDistance,
      reducedDistance: reducedDistance,
      finalDistance: finalDistance,
      landsOnFeet: success && reducedDistance === fallDistance,
      message: success
        ? `Fall damage reduced by ${reducedDistance}m (treat as ${finalDistance}m fall)`
        : `Takes full fall damage from ${fallDistance}m`
    };
  }

  static getMaxJumpDistance(checkResult, jumpType = 'long') {
    if (jumpType.toLowerCase() === 'long') {
      return Math.floor(checkResult / 3);
    } else if (jumpType.toLowerCase() === 'high') {
      return Math.floor(checkResult / 12);
    }
    return 0;
  }

  static getJumpBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.jump?.total || 0;
  }

  static getArmorPenalty(actor) {
    if (!actor) return 0;
    return actor.system.skills?.jump?.armor || 0;
  }
}

// ============================================================================
// KNOWLEDGE SKILL (INT)
// ============================================================================

export class KnowledgeUses {
  static KNOWLEDGE_FIELDS = [
    'bureaucracy', 'galactic-lore', 'life-sciences', 'physical-sciences',
    'social-sciences', 'tactics', 'technology'
  ];

  /**
   * COMMON KNOWLEDGE - Answer basic questions about field of study
   * DC 10 check for basic/common facts
   */
  static async commonKnowledge(actor, field = 'galactic-lore', question = '') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const skillKey = `knowledge-${field.toLowerCase()}`;
    const knowledgeBonus = actor.system.skills?.[skillKey]?.total || 0;
    const isTrained = actor.system.skills?.[skillKey]?.trained || false;

    const dc = 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + knowledgeBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Common Knowledge</strong> - ${this._formatField(field)}<br>Question: ${question || 'Basic fact'}<br>DC: ${dc}<br>Knowledge Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `KnowledgeUses | ${actor.name} answered common knowledge (${field}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} knows the answer!` : `${actor.name} doesn't know the answer.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      field: field,
      question: question,
      isTrained: isTrained,
      message: success ? 'Knows the answer' : 'Does not know the answer'
    };
  }

  /**
   * EXPERT KNOWLEDGE (Trained Only) - Answer complex questions within field
   * Swift Action, DC 15-25
   */
  static async expertKnowledge(actor, field = 'galactic-lore', questionDifficulty = 'moderate') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const skillKey = `knowledge-${field.toLowerCase()}`;
    const knowledgeBonus = actor.system.skills?.[skillKey]?.total || 0;
    const isTrained = actor.system.skills?.[skillKey]?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Knowledge to use Expert Knowledge',
        trained: false
      };
    }

    const dcByDifficulty = {
      'simple': 15,
      'moderate': 20,
      'tough': 25,
      'very-tough': 30
    };

    const dc = dcByDifficulty[questionDifficulty.toLowerCase()] || 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + knowledgeBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Expert Knowledge</strong> - ${this._formatField(field)}<br>Question Difficulty: ${questionDifficulty}<br>DC: ${dc}<br>Knowledge Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Swift Action`
    });

    SWSELogger.log(
      `KnowledgeUses | ${actor.name} used expert knowledge (${field}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} recalls the expert details!` : `${actor.name} cannot recall the details.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      field: field,
      questionDifficulty: questionDifficulty,
      trained: true,
      action: 'Swift Action',
      message: success ? 'Recalls expert information' : 'Cannot recall details'
    };
  }

  /**
   * ANTICIPATE ENEMY STRATEGY (Tactics, Trained Only - Clone Wars)
   * Move Action, DC = target's Will Defense or 10 + CL
   */
  static async anticipateEnemyStrategy(actor, target, targetWillDefense = null) {
    if (!actor || !target) {
      return { success: false, message: 'Invalid actor or target' };
    }

    const tacticsBonus = actor.system.skills?.['knowledge-tactics']?.total || 0;
    const isTrained = actor.system.skills?.['knowledge-tactics']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Knowledge (Tactics) to use Anticipate Enemy Strategy',
        trained: false
      };
    }

    let dc = targetWillDefense || (10 + (target.system.details?.level?.value || 1));
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + tacticsBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Anticipate Enemy Strategy</strong> - Tactics<br>Reference: Clone Wars Campaign Guide<br>Target: ${target.name}<br>DC: ${dc}<br>Knowledge (Tactics) Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Move Action`
    });

    SWSELogger.log(
      `KnowledgeUses | ${actor.name} anticipated ${target.name}'s strategy: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} anticipates ${target.name}'s next move!` : `${actor.name} cannot predict ${target.name}'s strategy.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      target: target.name,
      trained: true,
      action: 'Move Action',
      message: success ? 'Learns target\'s likely next actions' : 'Cannot anticipate strategy'
    };
  }

  /**
   * BATTLEFIELD TACTICS (Tactics, Trained Only - Clone Wars)
   * Grant extra Standard Actions to unit members
   */
  static async battlefieldTactics(actor, unitName = 'unit', activationRound = 1) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const tacticsBonus = actor.system.skills?.['knowledge-tactics']?.total || 0;
    const isTrained = actor.system.skills?.['knowledge-tactics']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Knowledge (Tactics) to use Battlefield Tactics',
        trained: false
      };
    }

    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + tacticsBonus;
    const success = checkResult >= dc;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Battlefield Tactics</strong> - Unit Command<br>Reference: Clone Wars Campaign Guide<br>Unit: ${unitName}<br>DC: ${dc}<br>Activation Round: ${activationRound} of 3<br>Knowledge (Tactics) Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Swift Action`
    });

    SWSELogger.log(
      `KnowledgeUses | ${actor.name} executed battlefield tactics (round ${activationRound}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    if (success && activationRound === 3) {
      ui.notifications.info(`${actor.name} grants extra Standard Action to all unit members!`);
    }

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      unitName: unitName,
      activationRound: activationRound,
      totalRoundsRequired: 3,
      trained: true,
      action: 'Swift Action',
      message: `Battlefield Tactics Round ${activationRound}/3${success && activationRound === 3 ? ' - ACTIVE!' : ''}`
    };
  }

  static _formatField(field) {
    const formatted = {
      'bureaucracy': 'Bureaucracy',
      'galactic-lore': 'Galactic Lore',
      'life-sciences': 'Life Sciences',
      'physical-sciences': 'Physical Sciences',
      'social-sciences': 'Social Sciences',
      'tactics': 'Tactics',
      'technology': 'Technology'
    };
    return formatted[field.toLowerCase()] || field;
  }

  static getKnowledgeBonus(actor, field) {
    if (!actor) return 0;
    const skillKey = `knowledge-${field.toLowerCase()}`;
    return actor.system.skills?.[skillKey]?.total || 0;
  }

  static isTrained(actor, field) {
    if (!actor) return false;
    const skillKey = `knowledge-${field.toLowerCase()}`;
    return actor.system.skills?.[skillKey]?.trained || false;
  }

  static getKnowledgeFields() {
    return this.KNOWLEDGE_FIELDS;
  }
}

// ============================================================================
// MECHANICS SKILL (INT, TRAINED ONLY)
// ============================================================================

export class MechanicsUses {
  /**
   * DISABLE DEVICE - Disarm traps, bypass locks, sabotage devices
   * Full-Round Action, DC 15-25
   */
  static async disableDevice(actor, deviceType = 'mechanical', complexity = 'simple', leaveNoTrace = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const mechanicsBonus = actor.system.skills?.mechanics?.total || 0;

    const dcByComplexity = {
      'simple': 15,
      'tricky': 20,
      'complex': 25
    };

    let dc = dcByComplexity[complexity.toLowerCase()] || 15;
    if (leaveNoTrace) {
      dc += 5;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + mechanicsBonus;
    const success = checkResult >= dc;
    const springsOrFails = (dc - checkResult) >= 5;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Disable Device</strong> - ${complexity} ${deviceType}<br>Base DC: ${dcByComplexity[complexity.toLowerCase()]}<br>${leaveNoTrace ? 'No Trace Modifier: +5<br>' : ''}Final DC: ${dc}<br>Mechanics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action<br>Required: Security Kit${springsOrFails ? '<br><strong style="color:red">TRAP SPRUNG/DEVICE FAILS!</strong>' : ''}`
    });

    SWSELogger.log(
      `MechanicsUses | ${actor.name} disabled device (${complexity}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}${springsOrFails ? ' (TRAP!)' : ''}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      deviceType: deviceType,
      complexity: complexity,
      leaveNoTrace: leaveNoTrace,
      action: 'Full-Round Action',
      required: 'Security Kit',
      springsOrFails: springsOrFails,
      message: success
        ? `Disables ${deviceType} device`
        : springsOrFails
          ? `${deviceType} device trap springs or failure obvious!`
          : `Cannot disable ${deviceType} device`
    };
  }

  /**
   * HANDLE EXPLOSIVES - Set detonators and place explosives
   * Connect detonator: DC 10, Full-Round Action
   */
  static async handleExplosives(actor, action = 'connect', explosivePower = '3d4', customDisarmDC = null) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const mechanicsBonus = actor.system.skills?.mechanics?.total || 0;

    let dc = 10;
    let actionName = '';

    if (action.toLowerCase() === 'connect') {
      dc = 10;
      actionName = 'Connect Detonator';
    } else if (action.toLowerCase() === 'disarm') {
      dc = customDisarmDC || 15;
      actionName = 'Disarm Explosive';
    } else if (action.toLowerCase() === 'booby-trap') {
      const damageCount = parseInt(explosivePower.match(/\d+/)[0]) || 1;
      dc = 15 + (damageCount * 5);
      actionName = `Booby Trap (${explosivePower} damage)`;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + mechanicsBonus;
    const success = checkResult >= dc;
    const failureMargin = dc - checkResult;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Handle Explosives</strong> - ${actionName}<br>DC: ${dc}<br>Mechanics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action${failureMargin >= 10 && action.toLowerCase() === 'connect' ? '<br><strong style="color:red">EXPLOSION!</strong>' : ''}${failureMargin >= 5 && action.toLowerCase() === 'disarm' ? '<br><strong style="color:red">DETONATES WHILE ADJACENT!</strong>' : ''}`
    });

    SWSELogger.log(
      `MechanicsUses | ${actor.name} ${action}ed explosive: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      action: action,
      actionName: actionName,
      explosion: action.toLowerCase() === 'connect' && failureMargin >= 10,
      detonates: action.toLowerCase() === 'disarm' && failureMargin >= 5,
      message: success ? `${actionName} successful` : `${actionName} failed`
    };
  }

  /**
   * JURY-RIG - Make temporary repairs to disabled devices
   * Full-Round Action, DC 25 (+5 with Tool Kit)
   */
  static async juryRig(actor, hasToolKit = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const mechanicsBonus = actor.system.skills?.mechanics?.total || 0;

    let dc = 25;
    let toolKitBonus = 0;

    if (hasToolKit) {
      toolKitBonus = 5;
      dc -= toolKitBonus;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + mechanicsBonus;
    const success = checkResult >= dc;

    const hpRoll = success ? await new Roll('1d8').evaluate({ async: true }) : null;
    const hpRestored = success ? hpRoll.total : 0;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Jury-Rig</strong> - Temporary Repairs<br>Base DC: 25<br>${hasToolKit ? 'Tool Kit Bonus: -5<br>' : ''}Final DC: ${dc}<br>Mechanics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action${success ? `<br>HP Restored: ${hpRestored}<br>Condition: +2 steps` : ''}`
    });

    SWSELogger.log(
      `MechanicsUses | ${actor.name} jury-rigged device: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} jury-rigs the device! Restores ${hpRestored} HP and +2 Condition.`
        : `${actor.name} fails to jury-rig the device.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      hasToolKit: hasToolKit,
      action: 'Full-Round Action',
      conditionMovement: success ? '+2 steps' : 'No change',
      hpRestored: hpRestored,
      duration: 'Until end of scene (then -5 steps, becomes Disabled)',
      message: success ? `Jury-rig successful (${hpRestored} HP, +2 Condition)` : 'Jury-rig failed'
    };
  }

  /**
   * REPAIR - Permanently repair damaged/disabled droids or objects
   * Requires at least 1 hour, then DC 20 check, requires Tool Kit
   */
  static async repair(actor, targetType = 'object', targetLevel = 1, isVehicle = false, vehicleConditionPenalty = 0) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const mechanicsBonus = actor.system.skills?.mechanics?.total || 0;
    const dc = 20;
    let penalty = 0;
    let hpRestored = 0;

    if (isVehicle) {
      penalty = vehicleConditionPenalty;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const totalBonus = mechanicsBonus + penalty;
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;

    if (success) {
      if (targetType.toLowerCase() === 'droid') {
        hpRestored = targetLevel;
      } else {
        const hpRoll = await new Roll('1d8').evaluate({ async: false });
        hpRestored = hpRoll.total;
      }
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Repair</strong> - ${targetType}<br>Time Required: 1 hour<br>DC: ${dc}<br>${penalty !== 0 ? `Penalty: ${penalty}<br>` : ''}Mechanics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Required: Tool Kit${success ? `<br>HP Restored: ${hpRestored}` : ''}`
    });

    SWSELogger.log(
      `MechanicsUses | ${actor.name} repaired ${targetType}: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      targetType: targetType,
      timeRequired: '1 hour',
      hpRestored: hpRestored,
      conditionsRemoved: success ? 'All Persistent' : 'None',
      required: 'Tool Kit',
      message: success
        ? `Repairs ${targetType}, restores ${hpRestored} HP, removes Persistent Conditions`
        : `Repair unsuccessful`
    };
  }

  static getMechanicsBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.mechanics?.total || 0;
  }

  static getPlacementDamageBonus(checkResult) {
    if (checkResult >= 35) return 3;
    if (checkResult >= 25) return 2;
    if (checkResult >= 15) return 1;
    return 0;
  }
}

// ============================================================================
// PERCEPTION SKILL (WIS)
// ============================================================================

export class PerceptionUses {
  /**
   * AVOID SURPRISE - Perception check at start of combat
   * Reaction, no specific DC (assumed 15 for typical ambush)
   */
  static async avoidSurprise(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;
    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Avoid Surprise</strong> - Initiative<br>DC: ${dc}<br>Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Reaction`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} avoided surprise: ${checkResult} vs DC ${dc} = ${success ? 'Not surprised' : 'Surprised'}`
    );

    ui.notifications.info(
      success ? `${actor.name} is not surprised!` : `${actor.name} is surprised!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      action: 'Reaction',
      condition: success ? 'Not Surprised' : 'Surprised (no actions first round)',
      message: success ? 'Avoids surprise' : 'Surprised'
    };
  }

  /**
   * EAVESDROP - Listen to conversations
   * Standard Action, DC 10-25 by noise level
   */
  static async eavesdrop(actor, noiseLevel = 'quiet') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;

    const dcByNoise = {
      'quiet': 10,
      'cantina': 15,
      'loud': 25,
      'factory': 25
    };

    const dc = dcByNoise[noiseLevel.toLowerCase()] || 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Eavesdrop</strong> - Listen to Conversation<br>Noise Level: ${noiseLevel}<br>DC: ${dc}<br>Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Standard Action`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} eavesdropped: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} hears the conversation!` : `${actor.name} cannot hear clearly.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      noiseLevel: noiseLevel,
      action: 'Standard Action',
      requirement: 'Must understand the language (-5 penalty if don\'t)',
      message: success ? 'Hears conversation' : 'Cannot hear clearly'
    };
  }

  /**
   * NOTICE TARGETS - See/hear targets or detect stealth
   * Reaction or Standard Action, distance and concealment penalties apply
   */
  static async noticeTargets(actor, targetSize = 'medium', distance = 0, hasConcealment = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;

    const dcBySize = {
      'colossal': -15, 'gargantuan': -10, 'huge': -5, 'large': 0,
      'medium': 5, 'small': 10, 'tiny': 15, 'diminutive': 20, 'fine': 25
    };

    let dc = dcBySize[targetSize.toLowerCase()] || 5;

    if (distance > 0) {
      dc -= Math.floor(distance / 10) * 5;
    }

    if (hasConcealment) {
      dc -= 5;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Notice Targets</strong> - Detect Presence<br>Target Size: ${targetSize}<br>Distance: ${distance} squares<br>${hasConcealment ? 'Concealment: -5<br>' : ''}DC: ${dc}<br>Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} noticed target: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      targetSize: targetSize,
      distance: distance,
      hasConcealment: hasConcealment,
      message: success ? 'Notices target' : 'Does not notice target'
    };
  }

  /**
   * SEARCH - Carefully examine an area for hidden items
   * Full-Round Action for 1-square area (DC 15)
   */
  static async search(actor, areaSize = '1-square', searchType = 'area') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;

    let dc = 15;
    let penalty = 0;

    if (areaSize === '5-square') {
      penalty = -10;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus + penalty;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Search</strong> - ${areaSize} area<br>Search Type: ${searchType}<br>DC: ${dc}<br>${penalty !== 0 ? `Penalty: ${penalty}<br>` : ''}Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} searched ${areaSize}: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      areaSize: areaSize,
      searchType: searchType,
      action: 'Full-Round Action',
      found: success ? 'Clues, compartments, doors, traps' : 'Nothing',
      message: success ? `Finds hidden items in ${areaSize}` : `Finds nothing`
    };
  }

  /**
   * SENSE DECEPTION - See through deceptive appearances
   * Reaction, opposed check against Deception check result
   */
  static async senseDeception(actor, deceptionCheckResult = 15) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus;
    const success = checkResult >= deceptionCheckResult;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Sense Deception</strong> - Detect Lies<br>Deception Result: ${deceptionCheckResult}<br>Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Reaction`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} sensed deception: ${checkResult} vs ${deceptionCheckResult} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      deceptionDC: deceptionCheckResult,
      action: 'Reaction',
      message: success ? 'Realizes deception' : 'Believes the deception'
    };
  }

  /**
   * SENSE INFLUENCE - Detect mind-affecting effects
   * Full-Round Action, DC 20
   */
  static async senseInfluence(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;

    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Sense Influence</strong> - Detect Mind Control<br>DC: ${dc}<br>Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} sensed influence: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      action: 'Full-Round Action',
      message: success ? 'Detects mind-affecting influence' : 'No influence detected'
    };
  }

  /**
   * LONG-RANGE SPOTTER (Trained Only, Clone Wars)
   * Aid Another on ally's attack roll with electrobinoculars (DC 10)
   */
  static async longRangeSpotter(actor, allyDistance = 50) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;
    const isTrained = actor.system.skills?.perception?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Perception to use Long-Range Spotter',
        trained: false
      };
    }

    const dc = 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Long-Range Spotter</strong> - Sight Assist<br>Reference: Clone Wars Campaign Guide<br>Distance: ${allyDistance} squares<br>DC: ${dc}<br>Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} used long-range spotter: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      source: 'Clone Wars Campaign Guide',
      required: 'Electrobinoculars',
      minimum_distance: '50 squares',
      effect: success ? '+2 on ally\'s attack roll' : 'No bonus',
      message: success ? 'Aids ally\'s attack' : 'Cannot aid attack'
    };
  }

  static getPerceptionBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.perception?.total || 0;
  }

  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.perception?.trained || false;
  }
}

// ============================================================================
// PERSUASION SKILL (CHA)
// ============================================================================

export class PersuasionUses {
  /**
   * CHANGE ATTITUDE - Adjust creature's attitude toward you
   * Full-Round Action, vs Will Defense, only once per encounter
   */
  static async changeAttitude(actor, target, currentAttitude = 'indifferent', desiredDirection = 'favorable') {
    if (!actor || !target) {
      return { success: false, message: 'Invalid actor or target' };
    }

    const persuasionBonus = actor.system.skills?.persuasion?.total || 0;

    const modifierByAttitude = {
      'hostile': -10, 'unfriendly': -5, 'indifferent': -2, 'friendly': 0, 'helpful': 0
    };

    const modifier = modifierByAttitude[currentAttitude.toLowerCase()] || 0;
    const dc = Math.max(10, (target.system.defenses?.will?.total || 10) + modifier);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + persuasionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Change Attitude</strong><br>Target: ${target.name}<br>Current Attitude: ${currentAttitude}<br>Attitude Modifier: ${modifier >= 0 ? '+' : ''}${modifier}<br>DC: ${dc}<br>Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action`
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} changed ${target.name}'s attitude: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} improves ${target.name}'s attitude!` : `${target.name}'s attitude doesn't change.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      target: target.name,
      currentAttitude: currentAttitude,
      newAttitude: success ? `One step toward ${desiredDirection}` : currentAttitude,
      action: 'Full-Round Action',
      restriction: 'Only once per encounter',
      message: success ? `${target.name}'s attitude improves one step` : 'Attitude does not change'
    };
  }

  /**
   * HAGGLE - Reduce cost of information or adjust item prices
   * Swift Action (with Gather Information) or Full-Round Action (item sale)
   */
  static async haggle(actor, targetAttitude = 'indifferent', transactionType = 'information', amount = 100) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const persuasionBonus = actor.system.skills?.persuasion?.total || 0;

    const dcByAttitude = {
      'unfriendly': 30, 'indifferent': 25, 'friendly': 20, 'helpful': 15
    };

    const dc = dcByAttitude[targetAttitude.toLowerCase()] || 25;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + persuasionBonus;
    const success = checkResult >= dc;

    const discountAmount = success ? Math.ceil(amount * 0.5) : 0;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Haggle</strong> - Negotiate Price<br>Transaction Type: ${transactionType}<br>Original Amount: ${amount} credits<br>Target Attitude: ${targetAttitude}<br>DC: ${dc}<br>Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: ${transactionType === 'information' ? 'Swift Action' : 'Full-Round Action'}`
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} haggled: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} negotiates successfully! Saves ${discountAmount} credits.`
        : `${actor.name} cannot negotiate the price.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      targetAttitude: targetAttitude,
      originalAmount: amount,
      discountAmount: discountAmount,
      finalAmount: amount - discountAmount,
      transactionType: transactionType,
      action: transactionType === 'information' ? 'Swift Action' : 'Full-Round Action',
      message: success
        ? `Reduces price by 50% (saves ${discountAmount} credits)`
        : 'Cannot negotiate'
    };
  }

  /**
   * INTIMIDATE - Force creature to back down or surrender
   * Full-Round Action, vs Will Defense
   */
  static async intimidate(actor, target, situationMod = 0) {
    if (!actor || !target) {
      return { success: false, message: 'Invalid actor or target' };
    }

    const persuasionBonus = actor.system.skills?.persuasion?.total || 0;

    const dc = target.system.defenses?.will?.total || 10;
    const totalBonus = persuasionBonus + situationMod;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Intimidate</strong><br>Target: ${target.name}<br>Will Defense: ${dc}<br>${situationMod !== 0 ? `Situation Modifier: ${situationMod >= 0 ? '+' : ''}${situationMod}<br>` : ''}Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action`
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} intimidated ${target.name}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} intimidates ${target.name}!` : `${target.name} resists intimidation.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      target: target.name,
      situationModifier: situationMod,
      action: 'Full-Round Action',
      effect: success ? 'Target backs down, surrenders item, reveals info, or flees' : 'No effect',
      consequence: 'Target becomes one step more Hostile after threat ends',
      message: success ? `${target.name} backs down or surrenders` : `${target.name} resists`
    };
  }

  /**
   * BRIBERY (Force Unleashed Campaign Guide)
   * DC depends on perceived risk if discovered
   */
  static async bribery(actor, requestType = 'within-duties', bribeAmount = 100, personalRisk = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const persuasionBonus = actor.system.skills?.persuasion?.total || 0;

    const dcByRequest = {
      'within-duties': 10,
      'outside-duties': 20,
      'not-easily-concealed': 30
    };

    let dc = dcByRequest[requestType.toLowerCase()] || 20;
    if (personalRisk) {
      dc += 15;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + persuasionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Bribery</strong> - Corrupt Official<br>Reference: Force Unleashed Campaign Guide<br>Request Type: ${requestType}<br>Bribe Amount: ${bribeAmount} credits<br>${personalRisk ? 'Personal Risk: +15 to DC<br>' : ''}DC: ${dc}<br>Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} bribed official: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} successfully bribes the official!` : `The official refuses the bribe.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      requestType: requestType,
      bribeAmount: bribeAmount,
      personalRisk: personalRisk,
      source: 'Force Unleashed Campaign Guide',
      message: success ? 'Official accepts bribe' : 'Official refuses bribe'
    };
  }

  /**
   * IMPROVISED COMMUNICATION (Force Unleashed Campaign Guide)
   * Move Action, DC = 20 - target's INT modifier
   */
  static async improvisedCommunication(actor, target, hasPreAgreedSignals = false) {
    if (!actor || !target) {
      return { success: false, message: 'Invalid actor or target' };
    }

    const persuasionBonus = actor.system.skills?.persuasion?.total || 0;
    const targetIntModifier = target.system.attributes?.int?.modifier || 0;

    let dc = 20 - targetIntModifier;
    if (hasPreAgreedSignals) {
      dc -= 5;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + persuasionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Improvised Communication</strong><br>Reference: Force Unleashed Campaign Guide<br>Target: ${target.name}<br>Base DC: 20<br>Target INT Modifier: ${targetIntModifier >= 0 ? '+' : ''}${targetIntModifier}<br>${hasPreAgreedSignals ? 'Pre-Agreed Signals: -5<br>' : ''}Final DC: ${dc}<br>Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Move Action`
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} communicated with ${target.name}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} communicates with ${target.name}!` : `${target.name} doesn't understand the communication.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      target: target.name,
      hasPreAgreedSignals: hasPreAgreedSignals,
      action: 'Move Action',
      source: 'Force Unleashed Campaign Guide',
      limitation: 'Simple concepts only',
      message: success ? 'Successfully communicates simple concept' : 'Communication fails'
    };
  }

  static getPersuasionBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.persuasion?.total || 0;
  }
}

// ============================================================================
// PILOT SKILL (DEX)
// ============================================================================

export class PilotUses {
  /**
   * ENGAGE THE ENEMY (Trained Only) - Use Pilot check instead of Initiative
   */
  static async engageTheEnemy(actor, vehicle = null, vehicleSizeModifier = 0) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const pilotBonus = actor.system.skills?.pilot?.total || 0;
    const isTrained = actor.system.skills?.pilot?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Pilot to use Engage the Enemy',
        trained: false
      };
    }

    const totalBonus = pilotBonus + vehicleSizeModifier;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const initiativeResult = roll.total + totalBonus;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Engage the Enemy</strong> - Vehicle Initiative<br>Reference: Trained Only<br>Vehicle Size Modifier: ${vehicleSizeModifier}<br>Pilot Check: ${initiativeResult}<br>Action: Replaces Initiative check`
    });

    SWSELogger.log(
      `PilotUses | ${actor.name} engaged enemy: Initiative result ${initiativeResult}`
    );

    ui.notifications.info(`${actor.name} rolls initiative: ${initiativeResult}`);

    return {
      success: true,
      initiativeResult: initiativeResult,
      pilotBonus: pilotBonus,
      vehicleSizeModifier: vehicleSizeModifier,
      trained: true,
      action: 'Replaces Initiative check',
      message: `Initiative result: ${initiativeResult}`
    };
  }

  /**
   * INCREASE VEHICLE SPEED (Trained Only)
   * Swift Action, DC 20 (cannot Take 10)
   */
  static async increaseVehicleSpeed(actor, vehicleSize = 'medium') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const pilotBonus = actor.system.skills?.pilot?.total || 0;
    const isTrained = actor.system.skills?.pilot?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Pilot to use Increase Vehicle Speed',
        trained: false
      };
    }

    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + pilotBonus;
    const success = checkResult >= dc;

    let speedBonus = 0;
    if (success) {
      speedBonus = 1 + Math.floor((checkResult - dc) / 5);
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Increase Vehicle Speed</strong> - Boost Speed<br>Vehicle Size: ${vehicleSize}<br>DC: ${dc}<br>Pilot Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Swift Action${success ? `<br>Speed Increase: +${speedBonus} squares` : '<br>Speed does not increase'}`
    });

    SWSELogger.log(
      `PilotUses | ${actor.name} increased vehicle speed: ` +
      `${checkResult} vs DC ${dc} = ${success ? `Success (+${speedBonus}sq)` : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} boosts vehicle speed! +${speedBonus} squares!`
        : `${actor.name} fails to increase speed. Vehicle becomes stressed!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      speedBonus: speedBonus,
      trained: true,
      action: 'Swift Action',
      cannotTake10: true,
      duration: 'Until start of next turn',
      failure: 'Vehicle moves -1 Condition',
      message: success ? `Speed increases +${speedBonus} squares` : 'Speed does not increase (-1 Condition)'
    };
  }

  /**
   * FLY CASUAL (Trained Only, Scum and Villainy)
   * Substitute Pilot check for Deception check
   */
  static async flyCasual(actor, deceptionDC = 15) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const pilotBonus = actor.system.skills?.pilot?.total || 0;
    const isTrained = actor.system.skills?.pilot?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Pilot to use Fly Casual',
        trained: false
      };
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + pilotBonus;
    const success = checkResult >= deceptionDC;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Fly Casual</strong> - Deceptive Piloting<br>Reference: Scum and Villainy - Trained Only<br>Deception DC: ${deceptionDC}<br>Pilot Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `PilotUses | ${actor.name} flew casual: ${checkResult} vs DC ${deceptionDC} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} averts suspicion with casual piloting!` : `${actor.name} arouses suspicion!`
    );

    return {
      success: success,
      checkResult: checkResult,
      deceptionDC: deceptionDC,
      trained: true,
      source: 'Scum and Villainy',
      message: success ? 'Averts suspicion' : 'Arouses suspicion'
    };
  }

  /**
   * STARSHIP STEALTH - Use Stealth in starship
   * Add Vehicle Size Modifier + DEX modifier to Stealth check
   */
  static async starshipStealth(actor, vehicleSize = 'large', dexModifier = 0, hasConcealment = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const pilotBonus = actor.system.skills?.pilot?.total || 0;
    const stealthBonus = actor.system.skills?.stealth?.total || 0;
    const isTrained = actor.system.skills?.pilot?.trained || false;

    const sizeModifierBySize = {
      'large': -5, 'huge': -10, 'gargantuan': -15, 'colossal': -20
    };

    const sizeModifier = sizeModifierBySize[vehicleSize.toLowerCase()] || 0;

    let bonus = stealthBonus + sizeModifier + dexModifier;
    if (!isTrained) {
      bonus -= 5;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + bonus;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Starship Stealth</strong> - Hide Starship<br>Reference: Starships of the Galaxy<br>Vehicle Size: ${vehicleSize}<br>Size Modifier: ${sizeModifier}<br>DEX Modifier: ${dexModifier}<br>${!isTrained ? 'Untrained Pilot: -5<br>' : ''}Stealth Check Result: ${checkResult}<br>DC for Use Computer (sensors): ${checkResult}<br>DC for Perception: ${checkResult}`
    });

    SWSELogger.log(
      `PilotUses | ${actor.name} performed starship stealth: Result ${checkResult}`
    );

    ui.notifications.info(`${actor.name} hides starship! DC ${checkResult} to detect.`);

    return {
      success: true,
      checkResult: checkResult,
      vehicleSize: vehicleSize,
      sizeModifier: sizeModifier,
      trained: isTrained,
      requirement: hasConcealment ? 'Has Concealment/Cover' : 'Can attempt without cover',
      source: 'Starships of the Galaxy',
      detectionDC: checkResult,
      message: `Starship hidden (detection DC ${checkResult})`
    };
  }

  static getPilotBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.pilot?.total || 0;
  }

  static getVehicleSizeModifier(vehicleSize) {
    const modifiers = {
      'colossal-station': -10, 'colossal-cruiser': -10, 'colossal-frigate': -10,
      'colossal': -10, 'gargantuan': -5, 'huge': -2, 'large': -1, 'medium': 0
    };
    return modifiers[vehicleSize.toLowerCase()] || 0;
  }

  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.pilot?.trained || false;
  }
}

// ============================================================================
// RIDE SKILL (DEX)
// ============================================================================

export class RideUses {
  /**
   * GUIDE WITH KNEES - Use both hands while riding
   * Swift Action, DC 10
   */
  static async guideWithKnees(actor, mountName = 'mount') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const rideBonus = actor.system.skills?.ride?.total || 0;

    const dc = 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + rideBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Guide with Knees</strong> - Free Up Hands<br>Mount: ${mountName}<br>DC: ${dc}<br>Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Swift Action`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} guided mount with knees: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} guides ${mountName} with knees! Both hands free!` : `${actor.name} needs one hand to control ${mountName}.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      mountName: mountName,
      action: 'Swift Action',
      effect: success ? 'Both hands free' : 'Only one hand free',
      message: success ? 'Both hands free' : 'Only one hand free'
    };
  }

  /**
   * STAY IN SADDLE - React to mount rearing, bolting, or damage
   * Reaction, DC 10
   */
  static async stayInSaddle(actor, circumstance = 'normal') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const rideBonus = actor.system.skills?.ride?.total || 0;

    const dc = 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + rideBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Stay in Saddle</strong> - Maintain Control<br>Circumstance: ${circumstance}<br>DC: ${dc}<br>Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Reaction`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} stayed in saddle: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} stays in the saddle!` : `${actor.name} falls from the mount!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      circumstance: circumstance,
      action: 'Reaction',
      effect: success ? 'Remains mounted' : 'Falls from mount',
      message: success ? 'Stays in saddle' : 'Falls from mount'
    };
  }

  /**
   * USE MOUNT AS COVER - Drop down and use mount for cover
   * Reaction, DC 15
   */
  static async useMountAsCover(actor, mountName = 'mount') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const rideBonus = actor.system.skills?.ride?.total || 0;

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + rideBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Use Mount as Cover</strong> - Seek Protection<br>Mount: ${mountName}<br>DC: ${dc}<br>Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Reaction`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} used mount as cover: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} uses ${mountName} as one-half Cover!` : `${actor.name} fails to get behind ${mountName}.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      mountName: mountName,
      action: 'Reaction',
      cover: success ? 'One-half Cover' : 'None',
      coverBonus: success ? '+4 Reflex Defense' : '0',
      message: success ? 'Uses mount for one-half Cover' : 'No cover benefit'
    };
  }

  /**
   * SOFT FALL - Avoid damage when falling from mount
   * Reaction, DC 15
   */
  static async softFall(actor, mountName = 'mount') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const rideBonus = actor.system.skills?.ride?.total || 0;

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + rideBonus;
    const success = checkResult >= dc;

    let damageRoll = null;
    let damageTotal = 0;
    if (!success) {
      damageRoll = await new Roll('1d6').evaluate({ async: true });
      damageTotal = damageRoll.total;
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Soft Fall</strong> - Avoid Falling Damage<br>Mount: ${mountName}<br>DC: ${dc}<br>Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Reaction${!success ? `<br>Damage Taken: ${damageTotal} (1d6)` : ''}`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} attempted soft fall: ${checkResult} vs DC ${dc} = ${success ? 'Success' : `Failure (${damageTotal}dmg)`}`
    );

    ui.notifications.info(
      success ? `${actor.name} falls gracefully, takes no damage!` : `${actor.name} takes ${damageTotal} damage from the fall!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      mountName: mountName,
      action: 'Reaction',
      damage: success ? 'No damage' : `${damageTotal} (1d6)`,
      message: success ? 'Avoids falling damage' : `Takes ${damageTotal} damage`
    };
  }

  /**
   * LEAP - Get mount to jump obstacles
   * DC 15, use lower of Ride or Mount's Jump skill
   */
  static async leap(actor, mountName = 'mount', mountJumpBonus = 0, obstacle = 'obstacle') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const rideBonus = actor.system.skills?.ride?.total || 0;

    const effectiveBonus = Math.min(rideBonus, mountJumpBonus);

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + effectiveBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Leap</strong> - Jump Obstacle<br>Mount: ${mountName}<br>Obstacle: ${obstacle}<br>Ride/Jump Bonus: ${effectiveBonus}<br>DC: ${dc}<br>Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} leaped obstacle: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name}'s ${mountName} leaps the ${obstacle}!` : `${actor.name}'s ${mountName} fails to clear the ${obstacle}!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      mountName: mountName,
      obstacle: obstacle,
      action: 'Part of movement',
      message: success ? `Leaps ${obstacle}` : `Fails to leap ${obstacle}`
    };
  }

  /**
   * CONTROL MOUNT IN BATTLE - Control mount during combat
   * Move Action, DC 20 (not needed for battle-trained mounts)
   */
  static async controlMountInBattle(actor, mountName = 'mount', isTrainedForBattle = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    if (isTrainedForBattle) {
      return {
        success: true,
        message: `${mountName} is battle-trained, no check required`,
        checkRequired: false
      };
    }

    const rideBonus = actor.system.skills?.ride?.total || 0;

    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + rideBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Control Mount in Battle</strong> - Combat Control<br>Mount: ${mountName}<br>DC: ${dc}<br>Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Move Action`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} controlled mount in battle: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} maintains control of ${mountName}!` : `${actor.name} cannot control ${mountName} this round!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      mountName: mountName,
      action: 'Move Action',
      failure: 'Can do nothing else that round',
      message: success ? 'Controls mount' : 'Cannot act this round'
    };
  }

  /**
   * FAST MOUNT OR DISMOUNT - Mount or dismount as swift action
   * Swift Action, DC 20 (armor check penalty applies)
   */
  static async fastMountOrDismount(actor, action = 'mount', armorCheckPenalty = 0) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const rideBonus = actor.system.skills?.ride?.total || 0;

    const dc = 20;
    const totalBonus = rideBonus + armorCheckPenalty;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Fast ${action.charAt(0).toUpperCase() + action.slice(1)}</strong> - Quick Action<br>DC: ${dc}<br>${armorCheckPenalty !== 0 ? `Armor Penalty: ${armorCheckPenalty}<br>` : ''}Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: ${success ? 'Swift Action' : 'Move Action'}`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} ${action}ed quickly: ${checkResult} vs DC ${dc} = ${success ? 'Swift Action' : 'Move Action'}`
    );

    ui.notifications.info(
      success ? `${actor.name} ${action}s as a Swift Action!` : `${actor.name} ${action}s as a Move Action.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      action: action,
      swiftAction: success,
      moveAction: !success,
      message: success ? `Fast ${action}` : `Standard ${action}`
    };
  }

  static getRideBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.ride?.total || 0;
  }

  static getArmorCheckPenalty(actor) {
    if (!actor) return 0;
    return actor.system.skills?.ride?.armor || 0;
  }
}

// ============================================================================
// SURVIVAL SKILL (WIS)
// ============================================================================

export class SurvivalUses {
  /**
   * BASIC SURVIVAL - Avoid natural hazards and sustain self in wilderness
   * Once per day, DC 15, provides food/water for one additional person per 2 points over 10
   */
  static async basicSurvival(actor, additionalPeople = 0) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const survivalBonus = actor.system.skills?.survival?.total || 0;
    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + survivalBonus;
    const success = checkResult >= dc;

    let supportedPeople = 1; // Always supports self
    if (success) {
      const beatMargin = checkResult - 10;
      if (beatMargin > 0) {
        supportedPeople += Math.floor(beatMargin / 2);
      }
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Basic Survival</strong> - Hunt and Forage<br>DC: ${dc}<br>Survival Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Duration: 24 hours${success ? `<br>Supports: ${supportedPeople} people` : ''}<br>Frequency: Once per day`
    });

    SWSELogger.log(
      `SurvivalUses | ${actor.name} used basic survival: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} finds food and water for ${supportedPeople} people!`
        : `${actor.name} cannot find adequate food or water.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      supportedPeople: supportedPeople,
      frequency: 'Once per day',
      duration: '24 hours',
      message: success
        ? `Sustains ${supportedPeople} people for 24 hours`
        : 'Cannot find food/water'
    };
  }

  /**
   * ENDURE EXTREME TEMPERATURES (Requires Field Kit)
   * Once per day, DC 20, ignore extreme cold or heat for 24 hours
   */
  static async endureExtremeTemperatures(actor, temperatureType = 'heat', hasFieldKit = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const survivalBonus = actor.system.skills?.survival?.total || 0;
    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + survivalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Endure Extreme Temperatures</strong><br>Temperature Type: ${temperatureType}<br>DC: ${dc}<br>Survival Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Duration: 24 hours${hasFieldKit ? '' : '<br><strong style="color:orange">No Field Kit</strong>'}<br>Frequency: Once per day`
    });

    SWSELogger.log(
      `SurvivalUses | ${actor.name} endured extreme temperatures: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} ignores extreme ${temperatureType} for 24 hours!`
        : `${actor.name} cannot resist the extreme ${temperatureType}.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      temperatureType: temperatureType,
      hasFieldKit: hasFieldKit,
      duration: success ? '24 hours' : 'None',
      frequency: 'Once per day',
      required: 'Field Kit',
      message: success
        ? `Ignores extreme ${temperatureType} for 24 hours`
        : `Cannot endure extreme ${temperatureType}`
    };
  }

  /**
   * KNOW DIRECTION - Ascertain which direction is north
   * Full-Round Action, DC 10
   */
  static async knowDirection(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const survivalBonus = actor.system.skills?.survival?.total || 0;
    const dc = 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + survivalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Know Direction</strong> - Find North<br>DC: ${dc}<br>Survival Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action`
    });

    SWSELogger.log(
      `SurvivalUses | ${actor.name} determined direction: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success ? `${actor.name} finds north!` : `${actor.name} cannot determine direction.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      action: 'Full-Round Action',
      message: success ? 'Ascertains direction to north' : 'Cannot determine direction'
    };
  }

  /**
   * TRACK (Trained Only) - Follow creature's trail
   * Full-Round Action to find/follow tracks
   * DC varies by surface and circumstances
   */
  static async track(actor, surface = 'firm', distance = 1) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const survivalBonus = actor.system.skills?.survival?.total || 0;
    const isTrained = actor.system.skills?.survival?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Survival to use Track',
        trained: false
      };
    }

    const dcBySurface = {
      'soft': 10,
      'firm': 20,
      'hard': 30
    };

    const baseDC = dcBySurface[surface.toLowerCase()] || 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + survivalBonus;
    const success = checkResult >= baseDC;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Track</strong> - Follow Trail<br>Reference: Trained Only<br>Surface: ${surface}<br>Base DC: ${baseDC}<br>Survival Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action<br>Movement: Half speed while tracking`
    });

    SWSELogger.log(
      `SurvivalUses | ${actor.name} tracked creature: ${checkResult} vs DC ${baseDC} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: baseDC,
      surface: surface,
      trained: true,
      action: 'Full-Round Action',
      speedModifier: 'Half speed while tracking',
      message: success ? `Tracks trail on ${surface} ground` : `Loses track on ${surface} ground`
    };
  }

  /**
   * CREATE DEFENSIVE POSITION (Trained Only, Clone Wars)
   * 10 minutes to prepare, DC 20, grants defensive bonuses
   */
  static async createDefensivePosition(actor, areaSize = '20x20') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const survivalBonus = actor.system.skills?.survival?.total || 0;
    const isTrained = actor.system.skills?.survival?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Survival to create Defensive Position',
        trained: false
      };
    }

    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + survivalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Create Defensive Position</strong> - Fortified Camp<br>Reference: Clone Wars Campaign Guide<br>Area: ${areaSize} squares<br>Preparation Time: 10 minutes<br>DC: ${dc}<br>Survival Check: ${checkResult}${success ? ' ✓' : ' ✗'}${success ? '<br>Benefits: No Perception penalty, -5 to enemy Stealth, +2 Reflex Defense' : ''}`
    });

    SWSELogger.log(
      `SurvivalUses | ${actor.name} created defensive position: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      areaSize: areaSize,
      prepTime: '10 minutes',
      trained: true,
      source: 'Clone Wars Campaign Guide',
      noPenalty: success ? true : false,
      enemyStealthPenalty: success ? -5 : 0,
      reflexDefenseBonus: success ? 2 : 0,
      message: success
        ? `Fortifies ${areaSize} sq area (no Perception penalty, -5 enemy Stealth, +2 Reflex Defense)`
        : 'Cannot create defensive position'
    };
  }

  /**
   * EXTENDED SURVIVAL (Trained Only, Force Unleashed)
   * Find suitable shelter for extended wilderness survival
   */
  static async extendedSurvival(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const survivalBonus = actor.system.skills?.survival?.total || 0;
    const isTrained = actor.system.skills?.survival?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Survival for Extended Survival',
        trained: false
      };
    }

    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + survivalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Extended Survival</strong> - Long-Term Shelter<br>Reference: Force Unleashed Campaign Guide<br>Duration: For extended wilderness periods (48+ hours)<br>DC: ${dc}<br>Survival Check: ${checkResult}${success ? ' ✓' : ' ✗'}${success ? '<br>Effect: Reduces Basic Survival DC by 5' : ''}`
    });

    SWSELogger.log(
      `SurvivalUses | ${actor.name} established extended survival: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      source: 'Force Unleashed Campaign Guide',
      basicSurvivalDCReduction: success ? 5 : 0,
      message: success
        ? 'Finds suitable shelter (Basic Survival DC reduced by 5)'
        : 'Cannot find suitable shelter'
    };
  }

  static getSurvivalBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.survival?.total || 0;
  }

  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.survival?.trained || false;
  }
}

// ============================================================================
// SWIM SKILL (STR)
// ============================================================================

export class SwimUses {
  /**
   * SWIM - Move through water
   * Move Action (1/4 speed) or Full-Round Action (1/2 speed)
   * DC depends on water conditions
   */
  static async swim(actor, waterCondition = 'calm', distance = 3, actionType = 'move') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const swimBonus = actor.system.skills?.swim?.total || 0;
    const armorPenalty = actor.system.skills?.swim?.armor || 0;

    const dcByCondition = {
      'calm': 10,
      'rough': 15,
      'stormy': 20
    };

    const dc = dcByCondition[waterCondition.toLowerCase()] || 10;
    const totalBonus = swimBonus + armorPenalty;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;

    let speedMultiplier = 0.25;
    if (actionType.toLowerCase() === 'full-round') {
      speedMultiplier = 0.5;
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Swim</strong> - Move Through Water<br>Water Condition: ${waterCondition}<br>DC: ${dc}<br>Swim Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: ${actionType === 'full-round' ? 'Full-Round Action (1/2 speed)' : 'Move Action (1/4 speed)'}${!success && checkResult < dc - 5 ? '<br><strong style="color:red">GOING UNDERWATER - Hold Breath!</strong>' : ''}`
    });

    SWSELogger.log(
      `SwimUses | ${actor.name} swam in ${waterCondition} water: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      waterCondition: waterCondition,
      action: actionType,
      speedMultiplier: speedMultiplier,
      armorPenalty: armorPenalty,
      underwater: !success && checkResult < dc - 5,
      message: success
        ? `Swims ${distance * speedMultiplier} meters`
        : !success && checkResult < dc - 5
          ? 'Goes underwater - must hold breath'
          : 'Makes no progress'
    };
  }

  /**
   * HOLD BREATH - Underwater endurance
   * Once submerged, make Endurance check to continue holding breath
   */
  static async holdBreach(actor, roundsHeld = 1) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const enduranceBonus = actor.system.skills?.endurance?.total || 0;
    const constitutionModifier = actor.system.attributes?.con?.modifier || 0;

    const maxRounds = constitutionModifier * roundsHeld;
    const dc = 10 + (5 * Math.max(0, roundsHeld - constitutionModifier));
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Hold Breath</strong> - Underwater<br>Rounds Held: ${roundsHeld}<br>CON Modifier: ${constitutionModifier}<br>DC: ${dc}<br>Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `SwimUses | ${actor.name} held breath: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      roundsHeld: roundsHeld,
      constitutionModifier: constitutionModifier,
      message: success ? `Continues holding breath (round ${roundsHeld})` : 'Starts drowning'
    };
  }

  static getSwimBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.swim?.total || 0;
  }

  static getArmorCheckPenalty(actor) {
    if (!actor) return 0;
    return actor.system.skills?.swim?.armor || 0;
  }
}

// ============================================================================
// TREAT INJURY SKILL (WIS)
// ============================================================================

export class TreatInjuryUses {
  /**
   * FIRST AID (Requires Medpac)
   * Full-Round Action, DC 15, restores HP equal to target's level + margin above DC
   */
  static async firstAid(actor, target, hasMedpac = true) {
    if (!actor || !target) {
      return { success: false, message: 'Invalid actor or target' };
    }

    const treatInjuryBonus = actor.system.skills?.['treat-injury']?.total || 0;
    const targetLevel = target.system.details?.level?.value || 1;
    const dc = 15;

    let equipmentBonus = 0;
    if (hasMedpac) {
      equipmentBonus = 2;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + treatInjuryBonus + equipmentBonus;
    const success = checkResult >= dc;

    let hpRestored = 0;
    if (success) {
      hpRestored = targetLevel + Math.max(0, checkResult - dc);
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>First Aid</strong> - Emergency Treatment<br>Target: ${target.name}<br>DC: ${dc}<br>${hasMedpac ? 'Medpac Bonus: +2<br>' : ''}Treat Injury Check: ${checkResult}${success ? ' ✓' : ' ✗'}${success ? `<br>HP Restored: ${hpRestored}` : ''}<br>Action: Full-Round Action<br>Cooldown: 24 hours per target`
    });

    SWSELogger.log(
      `TreatInjuryUses | ${actor.name} gave first aid to ${target.name}: ` +
      `${checkResult} vs DC ${dc} = ${success ? `Success (${hpRestored}HP)` : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} restores ${hpRestored} HP to ${target.name}!`
        : `${actor.name}'s first aid attempt fails.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      target: target.name,
      hpRestored: hpRestored,
      hasMedpac: hasMedpac,
      equipmentBonus: equipmentBonus,
      action: 'Full-Round Action',
      cooldown: '24 hours per target',
      message: success
        ? `Restores ${hpRestored} HP to ${target.name}`
        : 'First aid fails'
    };
  }

  /**
   * LONG-TERM CARE - Tend to creature for 8 hours
   * Restores HP equal to target's level (in addition to natural healing)
   */
  static async longTermCare(actor, targets = [], hasTraining = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const maxTargets = hasTraining ? 6 : 1;
    const numTargets = Math.min(targets.length, maxTargets);

    return {
      success: true,
      numTargets: numTargets,
      maxTargets: maxTargets,
      timeRequired: '8 consecutive hours',
      hpRestoredPerTarget: 'Target\'s Character Level',
      frequency: 'Once per 24 hours per target',
      trained: hasTraining,
      message: `Provides long-term care to ${numTargets}/${maxTargets} targets for 8 hours`
    };
  }

  /**
   * PERFORM SURGERY (Trained Only, Requires Surgery Kit)
   * 1 hour of uninterrupted work, DC 20
   */
  static async performSurgery(actor, targetLevel = 1, surgeryType = 'heal', hasSurgeryKit = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const treatInjuryBonus = actor.system.skills?.['treat-injury']?.total || 0;
    const isTrained = actor.system.skills?.['treat-injury']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Treat Injury to perform Surgery',
        trained: false
      };
    }

    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + treatInjuryBonus;
    const success = checkResult >= dc;

    const constitutionModifier = actor.system.attributes?.con?.modifier || 0;
    const hpHealed = success ? Math.max(1, constitutionModifier * targetLevel) : 0;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Perform Surgery</strong> - ${surgeryType === 'heal' ? 'Heal Damage' : 'Remove Condition/Install Prosthesis'}<br>Time: 1 hour uninterrupted<br>DC: ${dc}<br>Treat Injury Check: ${checkResult}${success ? ' ✓' : ' ✗'}${success ? `<br>HP Healed: ${hpHealed}` : `<br><strong style="color:red">Target takes Damage Threshold damage!</strong>`}<br>Required: Surgery Kit`
    });

    SWSELogger.log(
      `TreatInjuryUses | ${actor.name} performed surgery: ` +
      `${checkResult} vs DC ${dc} = ${success ? `Success (${hpHealed}HP)` : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      surgeryType: surgeryType,
      timeRequired: '1 hour uninterrupted',
      hpHealed: hpHealed,
      trained: true,
      required: 'Surgery Kit',
      message: success
        ? `Surgery successful (${hpHealed} HP, removes Persistent Conditions)`
        : 'Surgery fails (target takes Damage Threshold damage)'
    };
  }

  /**
   * REVIVIFY (Trained Only, Requires Medical Kit)
   * Full-Round Action within 1 round of death, DC 25
   */
  static async revivify(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const treatInjuryBonus = actor.system.skills?.['treat-injury']?.total || 0;
    const isTrained = actor.system.skills?.['treat-injury']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Treat Injury to Revivify',
        trained: false
      };
    }

    const dc = 25;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + treatInjuryBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Revivify</strong> - Bring Back From Death<br>Time Limit: Within 1 round of death<br>DC: ${dc}<br>Treat Injury Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action<br>Required: Medical Kit`
    });

    SWSELogger.log(
      `TreatInjuryUses | ${actor.name} revivified creature: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      timeLimit: '1 round of death',
      trained: true,
      required: 'Medical Kit',
      effect: success ? 'Target becomes Unconscious instead of dead' : 'Cannot revive',
      message: success
        ? 'Revives target (becomes Unconscious)'
        : 'Cannot revive target'
    };
  }

  /**
   * TREAT DISEASE (Trained Only, Requires Medical Kit)
   * 8 hours of treatment, Treat Injury check vs disease DC
   */
  static async treatDisease(actor, diseaseType = 'standard', hasmedKit = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const treatInjuryBonus = actor.system.skills?.['treat-injury']?.total || 0;
    const isTrained = actor.system.skills?.['treat-injury']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Treat Injury to treat Disease',
        trained: false
      };
    }

    return {
      success: null,
      checkRequired: true,
      timeRequired: '8 hours',
      trained: true,
      required: 'Medical Kit',
      instruction: 'Make Treat Injury check vs disease DC after 8 hours',
      message: 'Treat Disease requires Disease DC specification'
    };
  }

  /**
   * TREAT POISON (Trained Only, Requires Medical Kit)
   * Full-Round Action, Treat Injury check vs poison DC
   */
  static async treatPoison(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const treatInjuryBonus = actor.system.skills?.['treat-injury']?.total || 0;
    const isTrained = actor.system.skills?.['treat-injury']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Treat Injury to treat Poison',
        trained: false
      };
    }

    return {
      success: null,
      checkRequired: true,
      action: 'Full-Round Action',
      trained: true,
      required: 'Medical Kit',
      instruction: 'Make Treat Injury check vs poison DC',
      message: 'Treat Poison requires Poison DC specification'
    };
  }

  static getTreatInjuryBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.['treat-injury']?.total || 0;
  }

  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.['treat-injury']?.trained || false;
  }
}

// ============================================================================
// USE COMPUTER SKILL (INT)
// ============================================================================

export class UseComputerUses {
  /**
   * ACCESS INFORMATION - Find data on computer or network
   * Time and DC depend on information type and access method
   */
  static async accessInformation(actor, informationType = 'general', computerAttitude = 'indifferent') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useComputerBonus = actor.system.skills?.['use-computer']?.total || 0;

    const dcByType = {
      'general': 15,
      'specific': 20,
      'private': 25,
      'secret': 30
    };

    const timeByType = {
      'general': '1 minute',
      'specific': '10 minutes',
      'private': '1 hour',
      'secret': '1 day'
    };

    const attitudeModifiers = {
      'hostile': -10, 'unfriendly': -5, 'indifferent': -2,
      'friendly': 0, 'helpful': 'auto-access'
    };

    const modifier = attitudeModifiers[computerAttitude.toLowerCase()] || 0;
    const baseDC = dcByType[informationType.toLowerCase()] || 15;
    const dc = modifier === 'auto-access' ? -1 : baseDC + (typeof modifier === 'number' ? modifier : 0);

    const roll = modifier === 'auto-access' ? null : await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll ? roll.total + useComputerBonus : 999;
    const success = modifier === 'auto-access' || checkResult >= dc;

    if (roll) {
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: `<strong>Access Information</strong> - Retrieve Data<br>Information Type: ${informationType}<br>Computer Attitude: ${computerAttitude}<br>Base DC: ${baseDC}<br>Attitude Modifier: ${typeof modifier === 'number' ? (modifier >= 0 ? '+' : '') + modifier : 'Auto-access'}<br>Time Required: ${timeByType[informationType.toLowerCase()]}<br>Use Computer Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
      });
    }

    SWSELogger.log(
      `UseComputerUses | ${actor.name} accessed information (${informationType}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      informationType: informationType,
      computerAttitude: computerAttitude,
      timeRequired: timeByType[informationType.toLowerCase()],
      automaticAccess: modifier === 'auto-access',
      message: success
        ? `Finds ${informationType} information`
        : `Cannot access ${informationType} information`
    };
  }

  /**
   * IMPROVE ACCESS - Change computer's attitude toward user
   * Full-Round Action, DC varies by current attitude
   */
  static async improveAccess(actor, computerAttitude = 'indifferent', targetAttitude = 'friendly') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useComputerBonus = actor.system.skills?.['use-computer']?.total || 0;
    const isTrained = actor.system.skills?.['use-computer']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Use Computer to Improve Access',
        trained: false
      };
    }

    const attitudeModifiers = {
      'hostile': -10, 'unfriendly': -5, 'indifferent': -2, 'friendly': 0
    };

    const modifier = attitudeModifiers[computerAttitude.toLowerCase()] || 0;
    const baseWillDefense = 10;
    const dc = baseWillDefense + modifier;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useComputerBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Improve Access</strong> - Adjust Attitude<br>Current Attitude: ${computerAttitude}<br>Target Attitude: ${targetAttitude}<br>Base Will Defense: ${baseWillDefense}<br>Attitude Modifier: ${modifier >= 0 ? '+' : ''}${modifier}<br>DC: ${dc}<br>Use Computer Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action`
    });

    SWSELogger.log(
      `UseComputerUses | ${actor.name} improved computer access: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      currentAttitude: computerAttitude,
      newAttitude: success ? `One step toward ${targetAttitude}` : computerAttitude,
      trained: true,
      action: 'Full-Round Action',
      message: success
        ? `Computer's attitude improves one step`
        : 'Attitude does not change'
    };
  }

  /**
   * ISSUE ROUTINE COMMAND - Control Friendly/Helpful computer
   * Standard Action, typically automatic
   */
  static async issueRoutineCommand(actor, computerAttitude = 'friendly', commandType = 'routine') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useComputerBonus = actor.system.skills?.['use-computer']?.total || 0;

    if (!['friendly', 'helpful'].includes(computerAttitude.toLowerCase())) {
      return {
        success: false,
        message: 'Computer must be Friendly or Helpful to Issue Routine Commands'
      };
    }

    return {
      success: true,
      computerAttitude: computerAttitude,
      commandType: commandType,
      action: 'Standard Action',
      examples: 'Turn on/off, view/edit documents, print, open/close doors',
      requiresCheck: 'Only if another character issues contradictory command',
      message: `Issues ${commandType} command to ${computerAttitude} computer`
    };
  }

  /**
   * BACKTRAIL (Trained Only, Scum and Villainy)
   * DC 25, reveals last user and information sought
   */
  static async backtrail(actor, computerAttitude = 'indifferent') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useComputerBonus = actor.system.skills?.['use-computer']?.total || 0;
    const isTrained = actor.system.skills?.['use-computer']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Use Computer to Backtrail',
        trained: false
      };
    }

    const attitudeModifiers = {
      'hostile': -10, 'unfriendly': -5, 'indifferent': -2, 'friendly': 0
    };

    const modifier = attitudeModifiers[computerAttitude.toLowerCase()] || 0;
    const baseDC = 25;
    const dc = baseDC + modifier;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useComputerBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Backtrail</strong> - Trace Previous Access<br>Reference: Scum and Villainy - Trained Only<br>Computer Attitude: ${computerAttitude}<br>Base DC: ${baseDC}<br>Attitude Modifier: ${modifier >= 0 ? '+' : ''}${modifier}<br>Final DC: ${dc}<br>Use Computer Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `UseComputerUses | ${actor.name} backtrailed computer: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      source: 'Scum and Villainy',
      reveals: success ? 'Last user identity and information sought' : 'Nothing',
      message: success
        ? 'Identifies last user and their purpose'
        : 'Cannot trace previous access'
    };
  }

  static getUseComputerBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.['use-computer']?.total || 0;
  }

  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.['use-computer']?.trained || false;
  }
}

// ============================================================================
// USE THE FORCE SKILL (CHA) - Expanded Implementation
// ============================================================================

export class UseTheForceUses {
  /**
   * FORCE TRANCE (Trained Only)
   * Full-Round Action, DC 10, regain HP equal to level per hour
   */
  static async forceTrance(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useForceBonus = actor.system.skills?.['use-the-force']?.total || 0;
    const isTrained = actor.system.skills?.['use-the-force']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Use the Force to enter Force Trance',
        trained: false
      };
    }

    const dc = 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useForceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Force Trance</strong> - Meditative Healing<br>DC: ${dc}<br>Use the Force Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action<br>Effect: Regain HP equal to Character Level per hour<br>Duration: 4 hours for full rest`
    });

    SWSELogger.log(
      `UseTheForceUses | ${actor.name} entered force trance: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      action: 'Full-Round Action',
      trained: true,
      hpPerHour: 'Character Level',
      fullRestTime: '4 consecutive hours',
      breathing: '10x normal without air',
      message: success ? 'Enters Force Trance' : 'Cannot enter Force Trance'
    };
  }

  /**
   * MOVE LIGHT OBJECT (Trained Only)
   * Move Action (telekinesis), Standard Action (projectile)
   * DC 10 for light object, DC 15 for projectile weapon
   */
  static async moveLightObject(actor, weight = 5, distance = 6, asProjectile = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useForceBonus = actor.system.skills?.['use-the-force']?.total || 0;
    const isTrained = actor.system.skills?.['use-the-force']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Use the Force to Move Light Object',
        trained: false
      };
    }

    const dc = asProjectile ? 15 : 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useForceBonus;
    const success = checkResult >= dc;

    let damageRoll = null;
    let damageTotal = 0;
    if (success && asProjectile) {
      damageRoll = await new Roll('1d6').evaluate({ async: true });
      damageTotal = damageRoll.total;
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Move Light Object</strong> - Telekinesis${asProjectile ? ' (Projectile)' : ''}<br>Object Weight: ${weight} kg<br>Distance: ${distance} squares<br>DC: ${dc}<br>Use the Force Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: ${asProjectile ? 'Standard Action' : 'Move Action'}${success && asProjectile ? `<br>Damage: ${damageTotal}d6 bludgeoning` : ''}<br>Max Weight: 5 kg`
    });

    SWSELogger.log(
      `UseTheForceUses | ${actor.name} moved light object: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      weight: weight,
      distance: distance,
      asProjectile: asProjectile,
      trained: true,
      maxWeight: '5 kg',
      damage: asProjectile && success ? `${damageTotal}d6` : 'None',
      message: success
        ? `Moves ${weight}kg object ${distance} squares${asProjectile ? ` (${damageTotal}d6 damage)` : ''}`
        : 'Cannot move object'
    };
  }

  /**
   * SEARCH YOUR FEELINGS - Determine if action has immediate consequences
   * Full-Round Action, DC 15, 10-minute window
   */
  static async searchYourFeelings(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useForceBonus = actor.system.skills?.['use-the-force']?.total || 0;

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useForceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Search Your Feelings</strong> - Sense Consequences<br>DC: ${dc}<br>Use the Force Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action<br>Window: Next 10 minutes<br>Effect: Detects immediate consequences only`
    });

    SWSELogger.log(
      `UseTheForceUses | ${actor.name} searched feelings: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      timeWindow: '10 minutes',
      action: 'Full-Round Action',
      scope: 'Immediate consequences only',
      message: success
        ? 'Senses immediate consequences of action'
        : 'Cannot sense consequences'
    };
  }

  /**
   * SENSE FORCE (Trained Only)
   * Automatic sensing of disturbances, can actively search
   * Full-Round Action to determine distance/direction, DC 15
   */
  static async senseForce(actor, searchType = 'passive', searchRange = 100) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useForceBonus = actor.system.skills?.['use-the-force']?.total || 0;
    const isTrained = actor.system.skills?.['use-the-force']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Use the Force to Sense Force',
        trained: false
      };
    }

    if (searchType === 'passive') {
      return {
        success: true,
        automatic: true,
        ranges: {
          darkSide: '1 km',
          closeCompanion: '10,000 light years',
          greatDisturbance: 'Entire galaxy'
        },
        trained: true,
        message: 'Automatically senses major Force disturbances'
      };
    }

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useForceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Sense Force</strong> - Active Search<br>Search Type: ${searchType}<br>Search Range: ${searchRange} km<br>DC: ${dc}<br>Use the Force Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action`
    });

    SWSELogger.log(
      `UseTheForceUses | ${actor.name} sensed Force: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      searchType: searchType,
      searchRange: searchRange,
      trained: true,
      action: 'Full-Round Action',
      reveals: success ? 'Number, distance, direction of Force-users in range' : 'Nothing',
      message: success
        ? `Senses ${searchType} Force activity within ${searchRange} km`
        : `Cannot sense Force activity`
    };
  }

  /**
   * SENSE SURROUNDINGS - Ignore cover/concealment for Perception
   * Swift Action, DC 15 (DC 30 against Yuuzhan Vong)
   */
  static async senseSurroundings(actor, againstYuuzhanVong = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useForceBonus = actor.system.skills?.['use-the-force']?.total || 0;
    const isTrained = actor.system.skills?.['use-the-force']?.trained || false;

    const dc = againstYuuzhanVong ? 30 : 15;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useForceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Sense Surroundings</strong> - Ignore Cover/Concealment<br>DC: ${dc}${againstYuuzhanVong ? ' (vs Yuuzhan Vong)' : ''}<br>Use the Force Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Swift Action<br>Duration: Until start of next turn`
    });

    SWSELogger.log(
      `UseTheForceUses | ${actor.name} sensed surroundings: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      againstYuuzhanVong: againstYuuzhanVong,
      action: 'Swift Action',
      duration: 'Until start of next turn',
      effect: success ? 'Ignores cover/concealment for Perception' : 'None',
      trainedRequired: againstYuuzhanVong ? true : false,
      message: success
        ? 'Ignores cover/concealment for Perception'
        : 'Cannot sense through cover'
    };
  }

  /**
   * TELEPATHY - Establish telepathic link with distant creature
   * Standard Action, DC varies by distance
   */
  static async telepathy(actor, target, distance = 'same-planet', messageContent = 'communication') {
    if (!actor || !target) {
      return { success: false, message: 'Invalid actor or target' };
    }

    const useForceBonus = actor.system.skills?.['use-the-force']?.total || 0;
    const targetWillDefense = target.system.defenses?.will?.total || 10;

    const dcByDistance = {
      'same-planet': 15,
      'same-system': 20,
      'same-region': 25,
      'different-region': 30
    };

    const dc = Math.max(dcByDistance[distance.toLowerCase()] || 15, targetWillDefense);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useForceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Telepathy</strong> - Mental Communication<br>Target: ${target.name}<br>Distance: ${distance}<br>Base DC: ${dcByDistance[distance.toLowerCase()]}<br>Target Will Defense: ${targetWillDefense}<br>Final DC: ${dc}<br>Use the Force Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Standard Action<br>Limit: Single thought or emotion`
    });

    SWSELogger.log(
      `UseTheForceUses | ${actor.name} established telepathic link with ${target.name}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      target: target.name,
      distance: distance,
      action: 'Standard Action',
      content: success ? 'Single thought/emotion' : 'None',
      cooldown: 'Cannot retry for 24 hours if failed (unless target becomes willing)',
      message: success
        ? `Establishes telepathic link with ${target.name}`
        : `Cannot establish link with ${target.name}`
    };
  }

  /**
   * PLACE OTHER IN FORCE TRANCE (Trained Only, Clone Wars)
   * Full-Round Action, DC 15, adjacent willing ally
   */
  static async placeOtherInForceTrance(actor, target) {
    if (!actor || !target) {
      return { success: false, message: 'Invalid actor or target' };
    }

    const useForceBonus = actor.system.skills?.['use-the-force']?.total || 0;
    const isTrained = actor.system.skills?.['use-the-force']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Use the Force to Place Other in Force Trance',
        trained: false
      };
    }

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useForceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Place Other in Force Trance</strong> - Deep Rest<br>Reference: Clone Wars Campaign Guide<br>Target: ${target.name}<br>DC: ${dc}<br>Use the Force Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Action: Full-Round Action<br>Requirement: Adjacent, willing ally`
    });

    SWSELogger.log(
      `UseTheForceUses | ${actor.name} placed ${target.name} in force trance: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      target: target.name,
      trained: true,
      source: 'Clone Wars Campaign Guide',
      action: 'Full-Round Action',
      hpPerHour: 'Character Level',
      fullRestTime: '4 consecutive hours',
      breathing: '10x normal without air',
      message: success
        ? `Places ${target.name} in Force Trance`
        : `Cannot place ${target.name} in Force Trance`
    };
  }

  /**
   * BREATH CONTROL (Trained Only, Knights of the Old Republic)
   * Full-Round Action, DC 15, hold breath for 2x Constitution score rounds
   */
  static async breathControl(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const useForceBonus = actor.system.skills?.['use-the-force']?.total || 0;
    const isTrained = actor.system.skills?.['use-the-force']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Use the Force for Breath Control',
        trained: false
      };
    }

    const constitutionScore = actor.system.attributes?.con?.value || 10;
    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + useForceBonus;
    const success = checkResult >= dc;

    const roundsCanHold = success ? 2 * constitutionScore : constitutionScore;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Breath Control</strong> - Extended Breath Holding<br>Reference: Knights of the Old Republic Campaign Guide<br>CON Score: ${constitutionScore}<br>DC: ${dc}<br>Use the Force Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>Rounds Can Hold Breath: ${roundsCanHold}<br>Action: Full-Round Action`
    });

    SWSELogger.log(
      `UseTheForceUses | ${actor.name} used breath control: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      source: 'Knights of the Old Republic Campaign Guide',
      action: 'Full-Round Action',
      roundsCanHold: roundsCanHold,
      message: success
        ? `Can hold breath for ${roundsCanHold} rounds`
        : `Can hold breath for ${constitutionScore} rounds (normal)`
    };
  }

  static getUseTheForceBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.['use-the-force']?.total || 0;
  }

  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.['use-the-force']?.trained || false;
  }

  static hasForceStensitivity(actor) {
    if (!actor) return false;
    return actor.items?.some(item => item.name === 'Force Sensitivity') || false;
  }
}

// ============================================================================
// ACROBATICS SKILL (DEX)
// ============================================================================

export class AcrobaticsUses {
  static async balance(actor, surfaceWidth = 'medium', isSlippery = false) {
    if (!actor) return { success: false, message: 'Invalid actor' };
    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const dcByWidth = { 'wide': 10, 'medium': 15, 'narrow': 20, 'very-narrow': 25 };
    let dc = dcByWidth[surfaceWidth.toLowerCase()] || 15;
    if (isSlippery) dc += 5;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Balance</strong> - Narrow Surface<br>Surface: ${surfaceWidth}${isSlippery ? ' (Slippery)' : ''}<br>DC: ${dc}<br>Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });
    SWSELogger.log(`AcrobaticsUses | ${actor.name} balanced: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`);
    return { success, checkResult, dc, surfaceWidth, isSlippery };
  }

  static async tumble(actor, squaresMoved = 1) {
    if (!actor) return { success: false, message: 'Invalid actor' };
    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;
    if (!isTrained) return { success: false, message: 'Must be Trained in Acrobatics', trained: false };
    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Tumble</strong><br>Squares: ${squaresMoved}<br>DC: ${dc}<br>Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });
    SWSELogger.log(`AcrobaticsUses | ${actor.name} tumbled: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`);
    return { success, checkResult, dc, squaresMoved, trained: true };
  }

  static getAcrobaticsBonus(actor) {
    return actor ? actor.system.skills?.acrobatics?.total || 0 : 0;
  }

  static isTrained(actor) {
    return actor ? actor.system.skills?.acrobatics?.trained || false : false;
  }
}

// ============================================================================
// CLIMB SKILL (STR)
// ============================================================================

export class ClimbUses {
  static async climbSurface(actor, surfaceType = 'rough-wall', distance = 30, isAccelerated = false) {
    if (!actor) return { success: false, message: 'Invalid actor' };
    const climbBonus = actor.system.skills?.climb?.total || 0;
    const dcBySurface = {
      'slope': 0, 'knotted-rope-with-wall': 0, 'rope-or-knotted-rope': 5, 'rough-wall': 10,
      'natural-rock': 15, 'unknotted-rope': 15, 'narrow-handholds': 20, 'rough-surface': 25, 'overhanging': 25
    };
    let dc = dcBySurface[surfaceType.toLowerCase()] || 15;
    const penalty = isAccelerated ? -5 : 0;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + climbBonus + penalty;
    const success = checkResult >= dc;
    const falls = (dc - checkResult) >= 5;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Climb Surface</strong> - ${surfaceType}<br>Distance: ${distance}ft<br>DC: ${dc}<br>Climb Check: ${checkResult}${success ? ' ✓' : ' ✗'}${falls ? '<br><strong style="color:red">FALLS!</strong>' : ''}`
    });
    SWSELogger.log(`ClimbUses | ${actor.name} climbed: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}${falls ? ' (FALLS)' : ''}`);
    return { success, checkResult, dc, surfaceType, distance, falls };
  }

  static getClimbBonus(actor) {
    return actor ? actor.system.skills?.climb?.total || 0 : 0;
  }

  static getSurfaceDC(surfaceType) {
    const dcBySurface = {
      'slope': 0, 'knotted-rope-with-wall': 0, 'rope-or-knotted-rope': 5, 'rough-wall': 10,
      'natural-rock': 15, 'unknotted-rope': 15, 'narrow-handholds': 20, 'rough-surface': 25, 'overhanging': 25
    };
    return dcBySurface[surfaceType.toLowerCase()] ?? 15;
  }
}

// ============================================================================
// DECEPTION SKILL (CHA)
// ============================================================================

export class DeceptionUses {
  static async makeDeceptionCheck(actor, target, difficulty = 'moderate') {
    if (!actor || !target) return { success: false, message: 'Invalid actor or target' };
    const deceptionBonus = actor.system.skills?.deception?.total || 0;
    const difficultyMod = this._getDifficultyModifier(difficulty);
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + deceptionBonus + difficultyMod;
    const targetWillDefense = target.system.defenses?.will?.total || 10;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Deceive</strong><br>Difficulty: ${difficulty}<br>Total: ${checkResult} vs ${targetWillDefense}`
    });
    const success = checkResult >= targetWillDefense;
    SWSELogger.log(`DeceptionUses | ${actor.name} deceived ${target.name}: ${checkResult} vs ${targetWillDefense} = ${success ? 'Success' : 'Failure'}`);
    return { success, checkResult, targetDefense: targetWillDefense };
  }

  static _getDifficultyModifier(difficulty) {
    const modifiers = { 'simple': 5, 'moderate': 0, 'difficult': -5, 'incredible': -10, 'outrageous': -20 };
    return modifiers[difficulty.toLowerCase()] ?? 0;
  }
}

// ============================================================================
// ENDURANCE SKILL (CON)
// ============================================================================

export class EnduranceUses {
  static async forcedMarch(actor, hoursMarched = 1) {
    if (!actor) return { success: false, message: 'Invalid actor' };
    const enduranceBonus = actor.system.skills?.endurance?.total || 0;
    const dc = 10 + (Math.max(0, hoursMarched - 1) * 2);
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Forced March</strong><br>Hours Beyond 8: ${hoursMarched}<br>DC: ${dc}<br>Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });
    SWSELogger.log(`EnduranceUses | ${actor.name} forced march: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`);
    return { success, checkResult, dc, hoursMarched };
  }

  static async holdBreathe(actor, roundsHolding = null) {
    if (!actor) return { success: false, message: 'Invalid actor' };
    const conScore = actor.system.attributes?.con?.score || 10;
    const enduranceBonus = actor.system.skills?.endurance?.total || 0;
    if (roundsHolding === null) {
      return { success: true, conScore, roundsWithoutCheck: conScore };
    }
    if (roundsHolding <= conScore) {
      return { success: true, conScore, roundsHolding, roundsRemaining: conScore - roundsHolding };
    }
    const extraRounds = roundsHolding - conScore;
    const dc = 10 + (extraRounds * 2);
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Hold Breath</strong><br>CON: ${conScore}<br>Rounds: ${roundsHolding}<br>DC: ${dc}<br>Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });
    return { success, checkResult, dc, conScore, roundsHolding };
  }

  static getEnduranceBonus(actor) {
    return actor ? actor.system.skills?.endurance?.total || 0 : 0;
  }

  static getConScore(actor) {
    return actor ? actor.system.attributes?.con?.score || 10 : 10;
  }
}

// ============================================================================
// GATHER INFORMATION SKILL (WIS)
// ============================================================================

export class GatherInformationUses {
  static async learnNewsAndRumors(actor, difficulty = 'basic', useQuickIntel = false) {
    if (!actor) return { success: false, message: 'Invalid actor' };
    const gatherBonus = actor.system.skills?.['gather-information']?.total || 0;
    const isTrained = actor.system.skills?.['gather-information']?.trained || false;
    let dc = difficulty.toLowerCase() === 'detailed' ? 20 : 10;
    const baseCost = difficulty.toLowerCase() === 'detailed' ? 50 : 0;
    if (useQuickIntel && !isTrained) {
      return { success: false, message: 'Must be Trained for Quick Intel', trained: false };
    }
    if (useQuickIntel) dc += 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + gatherBonus;
    const success = checkResult >= dc;
    const timeRoll = await new Roll('1d6').evaluate({ async: true });
    const timeInHours = useQuickIntel ? Math.ceil(timeRoll.total / 2) : timeRoll.total;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Learn News and Rumors</strong><br>Difficulty: ${difficulty}<br>DC: ${dc}<br>Gather Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });
    SWSELogger.log(`GatherInformationUses | ${actor.name} learned ${difficulty}: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`);
    return { success, checkResult, dc, difficulty, timeInHours, cost: baseCost };
  }

  static async locateIndividual(actor, targetName = 'unknown', isWellKnown = true) {
    if (!actor) return { success: false, message: 'Invalid actor' };
    const gatherBonus = actor.system.skills?.['gather-information']?.total || 0;
    const dc = isWellKnown ? 15 : 25;
    const cost = isWellKnown ? 0 : 500;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + gatherBonus;
    const success = checkResult >= dc;
    const timeRoll = await new Roll('1d6').evaluate({ async: true });
    const timeInHours = timeRoll.total;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Locate Individual</strong><br>Target: ${targetName}<br>DC: ${dc}<br>Gather Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });
    SWSELogger.log(`GatherInformationUses | ${actor.name} located ${targetName}: ${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`);
    return { success, checkResult, dc, targetName, isWellKnown, timeInHours, cost };
  }

  static getGatherInformationBonus(actor) {
    return actor ? actor.system.skills?.['gather-information']?.total || 0 : 0;
  }

  static isTrained(actor) {
    return actor ? actor.system.skills?.['gather-information']?.trained || false : false;
  }
}

export default {
  JumpUses,
  KnowledgeUses,
  MechanicsUses,
  PerceptionUses,
  PersuasionUses,
  PilotUses,
  RideUses,
  SurvivalUses,
  SwimUses,
  TreatInjuryUses,
  UseComputerUses,
  UseTheForceUses,
  AcrobaticsUses,
  ClimbUses,
  DeceptionUses,
  EnduranceUses,
  GatherInformationUses
};
