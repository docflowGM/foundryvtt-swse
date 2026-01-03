/**
 * Deception Skill Uses System
 * Implements all Star Wars Saga Edition Deception skill applications
 * from the core rulebook and supplemental reference books
 *
 * Deception Skill Uses:
 * 1. Deceive - Make someone believe something untrue
 * 2. Deceptive Appearance - Disguise/forge documents vs Perception
 * 3. Deceptive Information - Lies vs Will Defense
 * 4. Create a Diversion to Hide - Help hide yourself
 * 5. Create a Diversion to Hide an Item - Hide item while observed
 * 6. Feint - Combat feint (handled in feint-mechanics.js)
 * 7. Alternative Story - Avert suspicion after failed check (Trained)
 * 8. Cheat - Gambling deception (Trained)
 * 9. Feign Haywire - Droid haywire simulation (Droid only)
 * 10. Innuendo - Secret messages to trained Deception users (Trained)
 */

import { SWSELogger } from '../utils/logger.js';

export class DeceptionUses {

  /**
   * DECEIVE - Make someone believe something untrue
   * Opposition: Will Defense
   * Time: Minimum Standard Action (longer for elaborate deceptions)
   * Retry: Generally no (unless GM allows)
   */
  static async makeDeceptionCheck(actor, target, difficulty = 'moderate') {
    if (!actor || !target) {
      return {
        success: false,
        message: 'Invalid actor or target'
      };
    }

    // Get Deception skill bonus
    const deceptionBonus = actor.system.skills?.deception?.total || 0;

    // Apply difficulty modifier
    const difficultyMod = this._getDifficultyModifier(difficulty);
    const totalBonus = deceptionBonus + difficultyMod;

    // Roll the check
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const targetWillDefense = target.system.defenses?.will?.total || 10;

    // Post to chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Deceive</strong> - Deception Check vs Will Defense<br>` +
              `Difficulty: ${difficulty} (${difficultyMod >= 0 ? '+' : ''}${difficultyMod})<br>` +
              `Total: ${checkResult} vs ${targetWillDefense}`
    });

    const success = checkResult >= targetWillDefense;

    SWSELogger.log(
      `DeceptionUses | ${actor.name} attempted to deceive ${target.name}: ` +
      `${checkResult} vs ${targetWillDefense} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      targetDefense: targetWillDefense,
      margin: checkResult - targetWillDefense,
      actor: actor.name,
      target: target.name
    };
  }

  /**
   * DECEPTIVE APPEARANCE - Disguise or forge documents
   * Opposition: Perception check
   * Can be visual inspection or electronic security
   */
  static async createDeceptiveAppearance(actor, appearanceType = 'disguise', difficulty = 'moderate') {
    const deceptionBonus = actor.system.skills?.deception?.total || 0;
    const difficultyMod = this._getDifficultyModifier(difficulty);
    const totalBonus = deceptionBonus + difficultyMod;

    // Prepare time required
    const timeRequired = this._getApperanceCreationTime(difficulty);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Deceptive Appearance</strong> - ${appearanceType}<br>` +
              `Difficulty: ${difficulty}<br>` +
              `Time Required: ${timeRequired}<br>` +
              `Deception DC: ${checkResult}`
    });

    SWSELogger.log(
      `DeceptionUses | ${actor.name} created a deceptive ${appearanceType} ` +
      `(DC ${checkResult}, ${difficulty} difficulty)`
    );

    return {
      success: true,
      appearanceType: appearanceType,
      difficulty: difficulty,
      deceptionDC: checkResult,
      timeRequired: timeRequired,
      checkResult: checkResult,
      message: `Deceptive ${appearanceType} created with DC ${checkResult}`
    };
  }

  /**
   * CREATE A DIVERSION TO HIDE - Use Deception to create moment to hide
   * Opposition: Target's Will Defense
   * Effect: Allows Stealth check while target is aware
   */
  static async diversionsToHide(actor, target) {
    const deceptionBonus = actor.system.skills?.deception?.total || 0;
    const willDefense = target.system.defenses?.will?.total || 10;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + deceptionBonus;
    const success = checkResult >= willDefense;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Create a Diversion to Hide</strong><br>` +
              `${actor.name} tries to distract ${target.name}<br>` +
              `Deception: ${checkResult} vs Will Defense: ${willDefense}`
    });

    SWSELogger.log(
      `DeceptionUses | ${actor.name} created a diversion to hide ` +
      `(${checkResult} vs ${willDefense} = ${success ? 'success' : 'failure'})`
    );

    ui.notifications.info(
      success
        ? `${actor.name} distracts ${target.name}! You may now attempt a Stealth check while they are aware of you.`
        : `${target.name} sees through the distraction!`
    );

    return {
      success: success,
      checkResult: checkResult,
      targetDefense: willDefense,
      actor: actor.name,
      target: target.name
    };
  }

  /**
   * CREATE A DIVERSION TO HIDE AN ITEM (Force Unleashed Campaign Guide)
   * Opposition: Target's Will Defense
   * Effect: Allows hiding item on person while being observed
   * Time: Same as Stealth check
   */
  static async diversionToHideItem(actor, target) {
    const deceptionBonus = actor.system.skills?.deception?.total || 0;
    const willDefense = target.system.defenses?.will?.total || 10;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + deceptionBonus;
    const success = checkResult >= willDefense;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Create a Diversion to Hide an Item</strong><br>` +
              `${actor.name} tries to create moment to hide item<br>` +
              `Deception: ${checkResult} vs Will Defense: ${willDefense}`
    });

    SWSELogger.log(
      `DeceptionUses | ${actor.name} created diversion to hide item ` +
      `(${checkResult} vs ${willDefense})`
    );

    ui.notifications.info(
      success
        ? `${actor.name} creates a diversion! You may now hide an item on your person with a Stealth check.`
        : `${target.name} is too alert to be distracted!`
    );

    return {
      success: success,
      checkResult: checkResult,
      targetDefense: willDefense,
      action: 'hide-item'
    };
  }

  /**
   * ALTERNATIVE STORY (Scum and Villainy - Trained Only)
   * When Deception fails, attempt to avert suspicion
   * Penalty: -10 on the alternative check
   * Only usable if trained in Deception
   */
  static async alternativeStory(actor, target, originalFailMargin) {
    if (!actor.system.skills?.deception?.trained) {
      return {
        success: false,
        message: 'Must be trained in Deception to use Alternative Story'
      };
    }

    const deceptionBonus = actor.system.skills.deception.total || 0;
    const alternativeBonus = deceptionBonus - 10; // -10 penalty
    const willDefense = target.system.defenses?.will?.total || 10;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + alternativeBonus;
    const success = checkResult >= willDefense;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Alternative Story</strong> - Avert Suspicion<br>` +
              `Original failure margin: ${originalFailMargin}<br>` +
              `Recovery attempt: ${checkResult} vs Will Defense: ${willDefense}<br>` +
              `Penalty: -10`
    });

    SWSELogger.log(
      `DeceptionUses | ${actor.name} attempted Alternative Story ` +
      `(${checkResult} vs ${willDefense})`
    );

    ui.notifications.info(
      success
        ? `${actor.name} successfully spins an alternative story to avert suspicion!`
        : `${target.name} remains suspicious despite the alternative story.`
    );

    return {
      success: success,
      checkResult: checkResult,
      targetDefense: willDefense,
      penalty: -10,
      trained: true
    };
  }

  /**
   * CHEAT (Scum and Villainy - Trained Only)
   * Use Deception when Gambling
   * Opposition: Opponent's Perception check
   * House security: DC 15-35 depending on location quality
   */
  static async cheat(actor, againstHouse = false, locationQuality = 'common') {
    if (!actor.system.skills?.deception?.trained) {
      return {
        success: false,
        message: 'Must be trained in Deception to Cheat'
      };
    }

    const deceptionBonus = actor.system.skills.deception.total || 0;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + deceptionBonus;

    let success = false;
    let opposition = '';
    let opponentRoll = 0;

    if (againstHouse) {
      // Against house security
      const houseDC = this._getHouseDC(locationQuality);
      success = checkResult >= houseDC;
      opposition = `House Security DC: ${houseDC}`;
    } else {
      // Against other players' Perception checks
      opposition = `Waiting for opponent Perception check`;
      success = null; // Requires opposed roll
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Cheat</strong> - Gambling Deception<br>` +
              `Location Quality: ${locationQuality}<br>` +
              `${opposition}<br>` +
              `Deception Check: ${checkResult}`
    });

    SWSELogger.log(
      `DeceptionUses | ${actor.name} attempted to cheat at gambling ` +
      `(${checkResult}, ${againstHouse ? 'vs house' : 'vs opponent'})`
    );

    return {
      success: success,
      checkResult: checkResult,
      locationQuality: locationQuality,
      againstHouse: againstHouse,
      trained: true,
      message: 'Cheating check rolled - waiting for opposition'
    };
  }

  /**
   * FEIGN HAYWIRE (Force Unleashed Campaign Guide - Droids Only)
   * Droid simulates malfunction to make enemies flat-footed
   * Opposition: Will Defense of all targets in line of sight
   * Duration: Until droid takes an Action
   */
  static async feignHaywire(actor) {
    if (actor.type !== 'character' || !actor.system.isDroid) {
      return {
        success: false,
        message: 'Only droids can use Feign Haywire'
      };
    }

    const deceptionBonus = actor.system.skills?.deception?.total || 0;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + deceptionBonus;

    // Post to chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Feign Haywire</strong> - Droid Malfunction Simulation<br>` +
              `Deception Check: ${checkResult}<br>` +
              `Targets must match or beat this with Will Defense to see through it`
    });

    SWSELogger.log(
      `DeceptionUses | Droid ${actor.name} feigned haywire ` +
      `(DC ${checkResult})`
    );

    ui.notifications.info(
      `${actor.name} simulates a system malfunction! All targets in line of sight ` +
      `must beat ${checkResult} with Will Defense or be flat-footed.`
    );

    return {
      success: true,
      checkResult: checkResult,
      droidName: actor.name,
      effect: 'flat-footed',
      message: `Feign Haywire activated - DC ${checkResult}`,
      duration: 'Until droid takes an action'
    };
  }

  /**
   * INNUENDO (Scum and Villainy - Trained Only)
   * Transmit secret message to another Deception-trained character
   * Opposition: Perception check of anyone who sees/hears transmission
   */
  static async innuendo(actor, recipient, messageComplexity = 'simple') {
    if (!actor.system.skills?.deception?.trained) {
      return {
        success: false,
        message: 'Must be trained in Deception to use Innuendo'
      };
    }

    if (recipient && !recipient.system.skills?.deception?.trained) {
      return {
        success: false,
        message: `${recipient.name} must be trained in Deception to receive Innuendo`
      };
    }

    const deceptionBonus = actor.system.skills.deception.total || 0;
    const messageDC = this._getInuendoDC(messageComplexity);
    const totalBonus = deceptionBonus; // No penalty/bonus for transmission itself

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= messageDC;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Innuendo</strong> - Secret Message Transmission<br>` +
              `Recipient: ${recipient?.name || 'Unknown'}<br>` +
              `Message Complexity: ${messageComplexity}<br>` +
              `DC to Understand: ${messageDC}<br>` +
              `Deception Check: ${checkResult} (vs Perception DC: ${messageDC})`
    });

    SWSELogger.log(
      `DeceptionUses | ${actor.name} transmitted innuendo to ` +
      `${recipient?.name || 'recipient'} (DC ${messageDC}, check ${checkResult})`
    );

    ui.notifications.info(
      success
        ? `${actor.name} successfully transmits subtle message via innuendo!`
        : `The message is too subtle or unclear for clear comprehension.`
    );

    return {
      success: success,
      checkResult: checkResult,
      messageDC: messageDC,
      complexity: messageComplexity,
      recipient: recipient?.name || 'unknown',
      trained: true
    };
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  static _getDifficultyModifier(difficulty) {
    const modifiers = {
      'simple': 5,
      'moderate': 0,
      'difficult': -5,
      'incredible': -10,
      'outrageous': -20
    };
    return modifiers[difficulty.toLowerCase()] ?? 0;
  }

  static _getDifficultyDescription(difficulty) {
    const descriptions = {
      'simple': 'Simple - Works in target\'s favor or matches expectations',
      'moderate': 'Moderate - Believable, doesn\'t affect target much',
      'difficult': 'Difficult - A bit hard to believe, puts target at risk',
      'incredible': 'Incredible - Hard to believe, presents sizable risk',
      'outrageous': 'Outrageous - Almost too unlikely to consider'
    };
    return descriptions[difficulty.toLowerCase()] ?? 'Unknown difficulty';
  }

  static _getApperanceCreationTime(difficulty) {
    const times = {
      'simple': '1 minute (10 rounds)',
      'moderate': '10 minutes',
      'difficult': '1 hour',
      'incredible': '1 day',
      'outrageous': '2 weeks (10 days)'
    };
    return times[difficulty.toLowerCase()] ?? 'Variable';
  }

  static _getHouseDC(quality) {
    const dcs = {
      'common': 15,
      'good': 25,
      'best': 35
    };
    return dcs[quality.toLowerCase()] ?? 15;
  }

  static _getInuendoDC(complexity) {
    const dcs = {
      'simple': 10,
      'moderate': 15,
      'complex': 20,
      'very-complex': 25
    };
    return dcs[complexity.toLowerCase()] ?? 10;
  }
}

export default DeceptionUses;
