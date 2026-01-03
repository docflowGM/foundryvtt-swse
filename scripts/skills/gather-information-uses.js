/**
 * Gather Information Skill Uses System
 * Implements all Star Wars Saga Edition Gather Information skill applications
 * from the core rulebook and supplemental reference books
 *
 * Core Gather Information Uses:
 * 1. Learn News and Rumors - Learn major news stories (DC 10 or 20)
 * 2. Learn Secret Information - Learn classified info (DC 25+)
 * 3. Locate Individual - Find a specific person (DC 15 or 25)
 *
 * Extra Gather Information Uses (Supplemental Books):
 * 4. Analysis - Analyze gathered information (Trained, Force Unleashed)
 * 5. Find a Good Score - Find profitable work (Trained, Scum and Villainy)
 * 6. Identify - Identify unknown items or artifacts (Scum and Villainy)
 *
 * Time: Each check = 1d6 hours by default
 * Quick Intel (Trained): Halve time by increasing DC by 10
 */

import { SWSELogger } from '../utils/logger.js';

export class GatherInformationUses {

  /**
   * LEARN NEWS AND RUMORS - Learn major news stories and local rumors
   * DC 10: Major news stories and popular rumors
   * DC 20: Detailed/unclassified facts, verify rumor accuracy
   * Time: 1d6 hours (can use Quick Intel if trained)
   * Cost: None for basic (DC 10), 50 credits for detailed (DC 20)
   */
  static async learnNewsAndRumors(actor, difficulty = 'basic', useQuickIntel = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const gatherBonus = actor.system.skills?.['gather-information']?.total || 0;
    const isTrained = actor.system.skills?.['gather-information']?.trained || false;

    // Base DCs
    let dc = difficulty.toLowerCase() === 'detailed' ? 20 : 10;
    let baseCost = difficulty.toLowerCase() === 'detailed' ? 50 : 0;

    // Quick Intel (Trained only)
    if (useQuickIntel && !isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Gather Information to use Quick Intel',
        trained: false
      };
    }

    if (useQuickIntel) {
      dc += 10; // DC penalty for Quick Intel
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + gatherBonus;
    const success = checkResult >= dc;

    // Time (1d6 hours by default, halved with Quick Intel)
    const timeRoll = await new Roll('1d6').evaluate({ async: true });
    const timeInHours = useQuickIntel ? Math.ceil(timeRoll.total / 2) : timeRoll.total;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Learn News and Rumors</strong><br>` +
              `Difficulty: ${difficulty}<br>` +
              `DC: ${dc}${useQuickIntel ? ' (with Quick Intel +10)' : ''}<br>` +
              `Gather Information Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Time Required: ${timeInHours} hour(s)<br>` +
              `Cost: ${baseCost} credits`
    });

    SWSELogger.log(
      `GatherInformationUses | ${actor.name} learned news/rumors (${difficulty}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} learns the information in ${timeInHours} hour(s) for ${baseCost} credits!`
        : `${actor.name} fails to find the information.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      difficulty: difficulty,
      timeInHours: timeInHours,
      cost: baseCost,
      useQuickIntel: useQuickIntel,
      message: success
        ? `Learns ${difficulty} information (${timeInHours}h, ${baseCost} credits)`
        : 'Fails to find information',
      information: success ? {
        basic: 'Major news stories and popular rumors',
        detailed: 'Detailed facts and verified rumor accuracy'
      }[difficulty.toLowerCase()] : null
    };
  }

  /**
   * LEARN SECRET INFORMATION - Learn classified, hidden, or restricted info
   * DC 25: Typical secret information
   * DC 30+: Especially difficult secrets (Death Star plans, etc.)
   * Cost: 5,000 credits typical, 50,000+ for extremely difficult
   * Risk: Failed by 5+: Someone notices your inquiries and investigates
   * Time: 1d6 hours (Quick Intel available if Trained)
   */
  static async learnSecretInformation(actor, secretDifficulty = 'typical', useQuickIntel = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const gatherBonus = actor.system.skills?.['gather-information']?.total || 0;
    const isTrained = actor.system.skills?.['gather-information']?.trained || false;

    // DC and costs by difficulty
    const difficultyData = {
      'typical': { dc: 25, cost: 5000, example: 'Classified report, hidden location, military blueprints' },
      'difficult': { dc: 28, cost: 10000, example: 'Complex classified systems, major installations' },
      'very-difficult': { dc: 30, cost: 50000, example: 'Death Star plans, ultimate weapons' }
    };

    const data = difficultyData[secretDifficulty.toLowerCase()] || difficultyData['typical'];
    let dc = data.dc;

    // Quick Intel (Trained only)
    if (useQuickIntel && !isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Gather Information to use Quick Intel',
        trained: false
      };
    }

    if (useQuickIntel) {
      dc += 10;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + gatherBonus;
    const success = checkResult >= dc;
    const failureMargin = dc - checkResult;
    const detected = failureMargin >= 5;

    // Time
    const timeRoll = await new Roll('1d6').evaluate({ async: true });
    const timeInHours = useQuickIntel ? Math.ceil(timeRoll.total / 2) : timeRoll.total;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Learn Secret Information</strong><br>` +
              `Difficulty: ${secretDifficulty}<br>` +
              `Example: ${data.example}<br>` +
              `DC: ${dc}${useQuickIntel ? ' (with Quick Intel +10)' : ''}<br>` +
              `Gather Information Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Time Required: ${timeInHours} hour(s)<br>` +
              `Cost: ${data.cost} credits` +
              (detected ? '<br><strong style="color:red">DETECTED! Someone notices!</strong>' : '')
    });

    SWSELogger.log(
      `GatherInformationUses | ${actor.name} sought secret info (${secretDifficulty}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}` +
      (detected ? ' (DETECTED!)' : '')
    );

    const statusMsg = success
      ? `${actor.name} obtains the secret information!`
      : detected
        ? `${actor.name} fails and is DETECTED! Someone comes to investigate!`
        : `${actor.name} fails to obtain the information.`;

    ui.notifications.info(statusMsg);

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      secretDifficulty: secretDifficulty,
      timeInHours: timeInHours,
      cost: data.cost,
      detected: detected,
      useQuickIntel: useQuickIntel,
      message: success
        ? `Obtains secret information (${timeInHours}h, ${data.cost} credits)`
        : `Fails to obtain information${detected ? ' and is DETECTED!' : ''}`,
      failureConsequence: detected ? 'Someone notices and investigates/arrests/silences you' : 'No immediate consequence'
    };
  }

  /**
   * LOCATE INDIVIDUAL - Find a specific person
   * DC 15: Well-known target, easy to find
   * DC 25: Obscure target or someone hiding (costs 500 credits)
   * Time: 1d6 hours
   */
  static async locateIndividual(actor, targetName = 'unknown', isWellKnown = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const gatherBonus = actor.system.skills?.['gather-information']?.total || 0;

    const dc = isWellKnown ? 15 : 25;
    const cost = isWellKnown ? 0 : 500;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + gatherBonus;
    const success = checkResult >= dc;

    // Time
    const timeRoll = await new Roll('1d6').evaluate({ async: true });
    const timeInHours = timeRoll.total;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Locate Individual</strong><br>` +
              `Target: ${targetName}<br>` +
              `Target Type: ${isWellKnown ? 'Well-known' : 'Obscure/Hiding'}<br>` +
              `DC: ${dc}<br>` +
              `Gather Information Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Time Required: ${timeInHours} hour(s)<br>` +
              `Cost: ${cost} credits`
    });

    SWSELogger.log(
      `GatherInformationUses | ${actor.name} located ${targetName}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} successfully locates ${targetName}!`
        : `${actor.name} cannot find ${targetName}.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      targetName: targetName,
      isWellKnown: isWellKnown,
      timeInHours: timeInHours,
      cost: cost,
      message: success
        ? `Locates ${targetName} (${timeInHours}h, ${cost} credits)`
        : `Cannot locate ${targetName}`,
      targetDifficulty: isWellKnown ? 'Well-known, easy to find' : 'Obscure or hiding'
    };
  }

  /**
   * ANALYSIS (Force Unleashed Campaign Guide - Trained Only)
   * Analyze information obtained from previous Gather Information checks
   * Can do once per day
   * Base DC 15, modified by source reliability
   * Favorable source: +10 bonus
   * Questionable source: -5 to -10 penalty
   * Success: Adds +10 to original checks, revealing additional info at higher DC
   */
  static async analyzeGatheredInfo(actor, sourceReliability = 'moderate', originalCheckResults = []) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const gatherBonus = actor.system.skills?.['gather-information']?.total || 0;
    const isTrained = actor.system.skills?.['gather-information']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Gather Information to use Analysis',
        trained: false
      };
    }

    // Base DC
    let dc = 15;

    // Modifier by source reliability
    const modifierByReliability = {
      'excellent': 10,     // Particularly complete data from reliable source
      'good': 5,           // Complete, reliable data
      'moderate': 0,       // Average data
      'questionable': -5,  // Incomplete or questionable data
      'poor': -10          // Very incomplete or unreliable data
    };

    const modifier = modifierByReliability[sourceReliability.toLowerCase()] || 0;
    dc = Math.max(10, dc + modifier);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + gatherBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Analysis</strong> - Analyze Gathered Information<br>` +
              `Reference: Force Unleashed Campaign Guide - Trained Only<br>` +
              `Source Reliability: ${sourceReliability}<br>` +
              `Base DC: 15<br>` +
              `Modifier: ${modifier >= 0 ? '+' : ''}${modifier}<br>` +
              `Final DC: ${dc}<br>` +
              `Number of Checks to Analyze: ${originalCheckResults.length}<br>` +
              `Gather Information Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `GatherInformationUses | ${actor.name} analyzed information: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} successfully analyzes the information, revealing additional details!`
        : `${actor.name}'s analysis doesn't yield new insights.`
    );

    return {
      success: success,
      checkResult: checkResult,
      baseDC: 15,
      modifier: modifier,
      finalDC: dc,
      sourceReliability: sourceReliability,
      analyzed: originalCheckResults.length,
      boost: success ? '+10 to all analyzed checks' : 'No improvement',
      trained: true,
      source: 'Force Unleashed Campaign Guide',
      limitation: 'Once per day',
      message: success
        ? `Adds +10 to ${originalCheckResults.length} original check(s), revealing additional info`
        : 'Analysis yields no new insights'
    };
  }

  /**
   * FIND A GOOD SCORE (Scum and Villainy - Trained Only)
   * Find profitable work or lucrative jobs
   * DC = 10 + Character Level
   * Time: 1 hour
   * Success: Find profitable work, gain 110% of normal payout
   * Failure by 1-5: Find work at normal rate (100%)
   * Failure by 6-10: Find work at reduced rate (90%)
   * Failure by 10+: Cannot find any work
   */
  static async findAGoodScore(actor, characterLevel = 1) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const gatherBonus = actor.system.skills?.['gather-information']?.total || 0;
    const isTrained = actor.system.skills?.['gather-information']?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Gather Information to Find a Good Score',
        trained: false
      };
    }

    const dc = 10 + characterLevel;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + gatherBonus;
    const margin = checkResult - dc;

    let outcome = '';
    let payoutMultiplier = 1.0;

    if (margin >= 0) {
      outcome = 'Finds profitable work';
      payoutMultiplier = 1.1;
    } else if (margin >= -5) {
      outcome = 'Finds work at normal rate';
      payoutMultiplier = 1.0;
    } else if (margin >= -10) {
      outcome = 'Finds work at reduced rate';
      payoutMultiplier = 0.9;
    } else {
      outcome = 'Cannot find any work';
      payoutMultiplier = 0;
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Find a Good Score</strong> - Seek Profitable Work<br>` +
              `Reference: Scum and Villainy - Trained Only<br>` +
              `Character Level: ${characterLevel}<br>` +
              `DC: ${dc}<br>` +
              `Gather Information Check: ${checkResult}<br>` +
              `Margin: ${margin >= 0 ? '+' : ''}${margin}<br>` +
              `Outcome: ${outcome}<br>` +
              `Payout Multiplier: ${(payoutMultiplier * 100).toFixed(0)}%`
    });

    SWSELogger.log(
      `GatherInformationUses | ${actor.name} sought good score: ` +
      `${checkResult} vs DC ${dc} = ${outcome}`
    );

    ui.notifications.info(
      `${actor.name}: ${outcome}! Payout: ${(payoutMultiplier * 100).toFixed(0)}%`
    );

    return {
      success: margin >= 0,
      checkResult: checkResult,
      dc: dc,
      characterLevel: characterLevel,
      margin: margin,
      outcome: outcome,
      payoutMultiplier: payoutMultiplier,
      payoutPercentage: `${(payoutMultiplier * 100).toFixed(0)}%`,
      timeRequired: '1 hour',
      trained: true,
      source: 'Scum and Villainy',
      message: outcome
    };
  }

  /**
   * IDENTIFY (Scum and Villainy)
   * Identify mysterious items, artifacts, weapons, relics
   * DC 20: Identify function (Commonly known facts)
   * +5 DC per additional fact needed
   * For every 5 points beaten, learn one additional fact
   * Time: 1d6 hours
   */
  static async identifyItem(actor, itemName = 'unknown item', itemType = 'artifact') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const gatherBonus = actor.system.skills?.['gather-information']?.total || 0;

    const dc = 20; // Basic identification DC

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + gatherBonus;
    const success = checkResult >= dc;
    const margin = checkResult - dc;

    // Additional facts learned (1 per 5 points over DC)
    const additionalFacts = Math.max(0, Math.floor(margin / 5));

    // Time
    const timeRoll = await new Roll('1d6').evaluate({ async: true });
    const timeInHours = timeRoll.total;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Identify</strong> - Identify Unknown Item<br>` +
              `Reference: Scum and Villainy<br>` +
              `Item: ${itemName} (${itemType})<br>` +
              `DC: ${dc}<br>` +
              `Gather Information Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Additional Facts: ${additionalFacts}<br>` +
              `Time Required: ${timeInHours} hour(s)<br>` +
              `${success ? `<strong>Identified!</strong>` : 'Cannot identify item'}`
    });

    SWSELogger.log(
      `GatherInformationUses | ${actor.name} identified ${itemName}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'} ` +
      `(+${additionalFacts} facts)`
    );

    const statusMsg = success
      ? `${actor.name} identifies ${itemName}! (+${additionalFacts} additional facts learned)`
      : `${actor.name} cannot identify ${itemName}.`;

    ui.notifications.info(statusMsg);

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      itemName: itemName,
      itemType: itemType,
      timeInHours: timeInHours,
      margin: margin,
      additionalFacts: additionalFacts,
      factsLearned: {
        basic: success ? 'Item function and common facts' : null,
        additional: additionalFacts
      },
      source: 'Scum and Villainy',
      message: success
        ? `Identifies ${itemName} (+${additionalFacts} facts)`
        : `Cannot identify ${itemName}`
    };
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get Gather Information bonus
   */
  static getGatherInformationBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.['gather-information']?.total || 0;
  }

  /**
   * Check if trained
   */
  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.['gather-information']?.trained || false;
  }

  /**
   * Get time estimate (1d6)
   */
  static getTimeEstimate() {
    const roll = new Roll('1d6');
    return `${roll.terms[0].number}-6 hours`;
  }
}

export default GatherInformationUses;
