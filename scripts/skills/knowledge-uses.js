/**
 * Knowledge Skill Uses System
 * Implements all Star Wars Saga Edition Knowledge skill applications
 * from the core rulebook and supplemental reference books
 *
 * Core Knowledge Applications (Choose one field at training):
 * - Bureaucracy: Business, Legal, Organizational structures
 * - Galactic Lore: Planets, History, The Force
 * - Life Sciences: Biology, Medicine, Archaeology
 * - Physical Sciences: Astronomy, Chemistry, Engineering
 * - Social Sciences: Sociology, Psychology, Philosophy
 * - Tactics: Battle strategies and maneuvering
 * - Technology: Technological devices and theories
 *
 * Core Uses:
 * 1. Common Knowledge - DC 10, basic questions
 * 2. Expert Knowledge - DC 15-25, swift action, trained only
 * 3. Anticipate Enemy Strategy - Tactics only, move action (Clone Wars)
 * 4. Battlefield Tactics - Tactics only, grant actions (Clone Wars)
 */

import { SWSELogger } from '../utils/logger.js';

export class KnowledgeUses {

  // Knowledge fields
  static KNOWLEDGE_FIELDS = [
    'bureaucracy',
    'galactic-lore',
    'life-sciences',
    'physical-sciences',
    'social-sciences',
    'tactics',
    'technology'
  ];

  /**
   * COMMON KNOWLEDGE - Answer basic questions about field of study
   * DC 10 check for basic/common facts
   * Can Take 10 when making Knowledge check
   * Cannot retry - roll represents what you know
   */
  static async commonKnowledge(actor, field = 'galactic-lore', question = '') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    // Get appropriate knowledge skill
    const skillKey = `knowledge-${field.toLowerCase()}`;
    const knowledgeBonus = actor.system.skills?.[skillKey]?.total || 0;
    const isTrained = actor.system.skills?.[skillKey]?.trained || false;

    const dc = 10;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + knowledgeBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Common Knowledge</strong> - ${this._formatField(field)}<br>` +
              `Question: ${question || 'Basic fact'}<br>` +
              `DC: ${dc}<br>` +
              `Knowledge Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `KnowledgeUses | ${actor.name} answered common knowledge (${field}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} knows the answer!`
        : `${actor.name} doesn't know the answer.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      field: field,
      question: question,
      isTrained: isTrained,
      action: 'Free/Immediate',
      canRetry: false,
      message: success ? 'Knows the answer' : 'Does not know the answer'
    };
  }

  /**
   * EXPERT KNOWLEDGE (Trained Only) - Answer complex questions within field
   * Swift Action
   * DC 15: Simple questions
   * DC 20: Moderate questions
   * DC 25: Tough questions
   * GM may adjust DC based on personal experience
   * Can Take 10, but cannot Take 20
   */
  static async expertKnowledge(actor, field = 'galactic-lore', questionDifficulty = 'moderate') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    // Get appropriate knowledge skill
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

    // DC by difficulty
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
      flavor: `<strong>Expert Knowledge</strong> - ${this._formatField(field)}<br>` +
              `Question Difficulty: ${questionDifficulty}<br>` +
              `DC: ${dc}<br>` +
              `Knowledge Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Swift Action`
    });

    SWSELogger.log(
      `KnowledgeUses | ${actor.name} used expert knowledge (${field}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} recalls the expert details!`
        : `${actor.name} cannot recall the details.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      field: field,
      questionDifficulty: questionDifficulty,
      trained: true,
      action: 'Swift Action',
      canTake10: true,
      canTake20: false,
      message: success ? 'Recalls expert information' : 'Cannot recall details'
    };
  }

  /**
   * ANTICIPATE ENEMY STRATEGY (Tactics, Trained Only - Clone Wars Campaign Guide)
   * Move Action
   * Designate target in line of sight
   * DC = Target's Will Defense or 10 + target's Character Level (if no Will Defense)
   * Success: Learn target's likely actions next turn
   * Information includes likely actions, targets, movement, special strategies (but typically not talents)
   */
  static async anticipateEnemyStrategy(actor, target, targetWillDefense = null) {
    if (!actor || !target) {
      return { success: false, message: 'Invalid actor or target' };
    }

    const tacticsBounusKey = 'knowledge-tactics';
    const tacticsBonus = actor.system.skills?.[tacticsBounusKey]?.total || 0;
    const isTrained = actor.system.skills?.[tacticsBounusKey]?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Knowledge (Tactics) to use Anticipate Enemy Strategy',
        trained: false
      };
    }

    // DC = target's Will Defense or 10 + CL if no Will Defense
    let dc = targetWillDefense || (10 + (target.system.details?.level?.value || 1));

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + tacticsBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Anticipate Enemy Strategy</strong> - Tactics<br>` +
              `Reference: Clone Wars Campaign Guide - Trained Only<br>` +
              `Target: ${target.name}<br>` +
              `DC: ${dc}<br>` +
              `Knowledge (Tactics) Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Move Action`
    });

    SWSELogger.log(
      `KnowledgeUses | ${actor.name} anticipated ${target.name}'s strategy: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} anticipates ${target.name}'s next move!`
        : `${actor.name} cannot predict ${target.name}'s strategy.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      target: target.name,
      trained: true,
      action: 'Move Action',
      source: 'Clone Wars Campaign Guide',
      information: success ? {
        likely_actions: 'What the target will likely do next turn',
        intended_targets: 'Who the target plans to attack',
        movement: 'Where the target might move',
        strategies: 'Special tactics or strategies (except Talents)',
        note: 'Assumptions change if circumstances change significantly'
      } : null,
      message: success ? 'Learns target\'s likely next actions' : 'Cannot anticipate strategy'
    };
  }

  /**
   * BATTLEFIELD TACTICS (Tactics, Trained Only - Clone Wars Campaign Guide)
   * Grant extra Standard Actions to unit members
   * Base DC: 20
   * Requires 3 Swift Actions on consecutive rounds to activate
   * Character must be unit commander
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
      flavor: `<strong>Battlefield Tactics</strong> - Unit Command<br>` +
              `Reference: Clone Wars Campaign Guide - Trained Only<br>` +
              `Unit: ${unitName}<br>` +
              `DC: ${dc}<br>` +
              `Activation Round: ${activationRound} of 3<br>` +
              `Knowledge (Tactics) Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Swift Action (Round ${activationRound} of 3 consecutive rounds)`
    });

    SWSELogger.log(
      `KnowledgeUses | ${actor.name} executed battlefield tactics (round ${activationRound}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    if (success && activationRound === 3) {
      ui.notifications.info(
        `${actor.name} grants extra Standard Action to all unit members!`
      );
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
      source: 'Clone Wars Campaign Guide',
      requirement: 'Must be unit Commander',
      activation: 'Requires 3 consecutive successful checks on 3 consecutive rounds',
      effect: success && activationRound === 3 ? 'Grant extra Standard Action to all unit members' : 'Round in progress',
      message: `Battlefield Tactics Round ${activationRound}/3` + (success && activationRound === 3 ? ' - ACTIVE!' : '')
    };
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Format field name for display
   */
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

  /**
   * Get Knowledge bonus for field
   */
  static getKnowledgeBonus(actor, field) {
    if (!actor) return 0;
    const skillKey = `knowledge-${field.toLowerCase()}`;
    return actor.system.skills?.[skillKey]?.total || 0;
  }

  /**
   * Check if trained in Knowledge field
   */
  static isTrained(actor, field) {
    if (!actor) return false;
    const skillKey = `knowledge-${field.toLowerCase()}`;
    return actor.system.skills?.[skillKey]?.trained || false;
  }

  /**
   * List all knowledge fields
   */
  static getKnowledgeFields() {
    return this.KNOWLEDGE_FIELDS;
  }
}

export default KnowledgeUses;
