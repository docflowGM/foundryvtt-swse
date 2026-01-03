/**
 * Perception Skill Uses System
 * Implements all Star Wars Saga Edition Perception skill applications
 * from the core rulebook and supplemental reference books
 *
 * Core Perception Uses:
 * 1. Avoid Surprise - Perception check at start of battle (Reaction)
 * 2. Eavesdrop - Listen to conversations (DC 10-25)
 * 3. Notice Targets - See/hear targets or detect stealth
 * 4. Search - Carefully examine areas for hidden items
 * 5. Sense Deception - See through deceptive appearances
 * 6. Sense Influence - Detect mind-affecting effects
 *
 * Extra Perception Uses (Supplemental):
 * 7. Long-Range Spotter - Use electrobinoculars to aid attacks (Clone Wars)
 */

import { SWSELogger } from '../utils/logger.js';

export class PerceptionUses {

  /**
   * AVOID SURPRISE - Perception check at start of combat
   * Reaction
   * Can Take 10 or Take 20
   * Success: Not surprised
   * Failure: Surprised for first round
   */
  static async avoidSurprise(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;

    // No specific DC, just beats opponent's Stealth
    // Assuming DC of 15 for typical ambush
    const dc = 15;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Avoid Surprise</strong> - Initiative<br>` +
              `DC: ${dc}<br>` +
              `Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Reaction`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} avoided surprise: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Not surprised' : 'Surprised'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} is not surprised!`
        : `${actor.name} is surprised!`
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
   * Standard Action
   * DC 10: Quiet area
   * DC 15: Noisy area (cantina)
   * DC 25: Loud area (droid factory)
   * Cannot understand if language not known: -5 penalty
   * Can Take 10 or Take 20
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
      flavor: `<strong>Eavesdrop</strong> - Listen to Conversation<br>` +
              `Noise Level: ${noiseLevel}<br>` +
              `DC: ${dc}<br>` +
              `Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Standard Action`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} eavesdropped: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} hears the conversation!`
        : `${actor.name} cannot hear clearly.`
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
   * Reaction to see target enter line of sight
   * Standard Action to actively search
   * Distance penalty: -5 per 10 squares
   * Concealment: -5 penalty, Total Concealment: -10 penalty
   * Target Stealth opposed check if hiding
   * Size modifiers: Colossal -15 to Fine +25
   * Can Take 10 or Take 20
   */
  static async noticeTargets(actor, targetSize = 'medium', distance = 0, hasConcealment = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;

    const dcBySize = {
      'colossal': -15,
      'gargantuan': -10,
      'huge': -5,
      'large': 0,
      'medium': 5,
      'small': 10,
      'tiny': 15,
      'diminutive': 20,
      'fine': 25
    };

    let dc = dcBySize[targetSize.toLowerCase()] || 5;

    // Distance penalty: -5 per 10 squares
    if (distance > 0) {
      dc -= Math.floor(distance / 10) * 5;
    }

    // Concealment penalty
    if (hasConcealment) {
      dc -= 5;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Notice Targets</strong> - Detect Presence<br>` +
              `Target Size: ${targetSize}<br>` +
              `Distance: ${distance} squares<br>` +
              `${hasConcealment ? 'Concealment: -5<br>' : ''}` +
              `DC: ${dc}<br>` +
              `Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} noticed target: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
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
   * Full-Round Action for 1-square area (1 cubic meter)
   * Can search at -10 penalty for 5-square area as Full-Round
   * DC 15: Find clues, hidden compartments, secret doors, traps
   * Can search character: Opposed Stealth check, +10 bonus if physically touch
   * Can Take 10 or Take 20
   */
  static async search(actor, areaSize = '1-square', searchType = 'area') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const perceptionBonus = actor.system.skills?.perception?.total || 0;

    let dc = 15;
    let penalty = 0;
    let timeRequired = 'Full-Round Action';

    if (areaSize === '5-square') {
      penalty = -10;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + perceptionBonus + penalty;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Search</strong> - ${areaSize} area<br>` +
              `Search Type: ${searchType}<br>` +
              `DC: ${dc}<br>` +
              `${penalty !== 0 ? `Penalty: ${penalty}<br>` : ''}` +
              `Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Full-Round Action`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} searched ${areaSize}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
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
   * Reaction
   * Opposed check against Deception check result
   * Success: Realize you're being deceived
   * Can Take 10 or Take 20
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
      flavor: `<strong>Sense Deception</strong> - Detect Lies<br>` +
              `Deception Result: ${deceptionCheckResult}<br>` +
              `Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Reaction`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} sensed deception: ` +
      `${checkResult} vs ${deceptionCheckResult} = ${success ? 'Success' : 'Failure'}`
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
   * Full-Round Action
   * DC 20
   * Success: Determine if someone is under mind-affecting effect
   * Can Take 10 or Take 20
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
      flavor: `<strong>Sense Influence</strong> - Detect Mind Control<br>` +
              `DC: ${dc}<br>` +
              `Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Full-Round Action`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} sensed influence: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
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
   * Aid Another on ally's attack roll
   * Requires Electrobinoculars
   * DC 10 Perception check instead of attack roll
   * Target must be at least 50 squares away from both you and ally
   * Ally must hear and understand you
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
      flavor: `<strong>Long-Range Spotter</strong> - Sight Assist<br>` +
              `Reference: Clone Wars Campaign Guide - Trained Only<br>` +
              `Distance: ${allyDistance} squares<br>` +
              `DC: ${dc}<br>` +
              `Perception Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `PerceptionUses | ${actor.name} used long-range spotter: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
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

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get Perception bonus
   */
  static getPerceptionBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.perception?.total || 0;
  }

  /**
   * Check if trained
   */
  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.perception?.trained || false;
  }
}

export default PerceptionUses;
