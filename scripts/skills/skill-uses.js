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
    const targetIntModifier = target.system.abilities?.int?.modifier || 0;

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

export default {
  JumpUses,
  KnowledgeUses,
  MechanicsUses,
  PerceptionUses,
  PersuasionUses,
  PilotUses,
  RideUses
};
