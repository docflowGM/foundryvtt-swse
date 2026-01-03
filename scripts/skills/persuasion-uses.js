/**
 * Persuasion Skill Uses System
 * Implements all Star Wars Saga Edition Persuasion skill applications
 * from the core rulebook and supplemental reference books
 *
 * Core Persuasion Uses:
 * 1. Change Attitude - Shift creature's attitude toward you (vs Will Defense)
 * 2. Haggle - Reduce/increase prices or info costs
 * 3. Intimidate - Force creature to back down or surrender
 *
 * Extra Persuasion Uses (Supplemental Books):
 * 4. Bribery - Bribe officials (Force Unleashed)
 * 5. Improvised Communication - Communicate nonverbally (Force Unleashed)
 */

import { SWSELogger } from '../utils/logger.js';

export class PersuasionUses {

  /**
   * CHANGE ATTITUDE - Adjust creature's attitude toward you
   * Full-Round Action
   * vs Will Defense
   * Modifier based on current attitude
   * Creature must have INT 2+ and see you
   * Only attempt once per encounter
   * Can Take 10, cannot Take 20
   *
   * Attitudes: Hostile (-10), Unfriendly (-5), Indifferent (-2), Friendly (+0), Helpful (-)
   */
  static async changeAttitude(actor, target, currentAttitude = 'indifferent', desiredDirection = 'favorable') {
    if (!actor || !target) {
      return { success: false, message: 'Invalid actor or target' };
    }

    const persuasionBonus = actor.system.skills?.persuasion?.total || 0;

    const modifierByAttitude = {
      'hostile': -10,
      'unfriendly': -5,
      'indifferent': -2,
      'friendly': 0,
      'helpful': 0
    };

    const modifier = modifierByAttitude[currentAttitude.toLowerCase()] || 0;
    const dc = Math.max(10, (target.system.defenses?.will?.total || 10) + modifier);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + persuasionBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Change Attitude</strong><br>` +
              `Target: ${target.name}<br>` +
              `Current Attitude: ${currentAttitude}<br>` +
              `Attitude Modifier: ${modifier >= 0 ? '+' : ''}${modifier}<br>` +
              `DC: ${dc}<br>` +
              `Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Full-Round Action`
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} changed ${target.name}'s attitude: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} improves ${target.name}'s attitude!`
        : `${target.name}'s attitude doesn't change.`
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
      requirement: 'Target INT 2+, must see you',
      message: success ? `${target.name}'s attitude improves one step` : 'Attitude does not change'
    };
  }

  /**
   * HAGGLE - Reduce cost of information or adjust item prices
   * Swift Action (with Gather Information) or Full-Round Action (item sale)
   * Reduce info cost by 50% or change item price by 50%
   * DC depends on target's attitude (15-30)
   * Can't haggle with Hostile or INT 2 or lower creatures
   * Won't pay more if item available elsewhere at standard price
   */
  static async haggle(actor, targetAttitude = 'indifferent', transactionType = 'information', amount = 100) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const persuasionBonus = actor.system.skills?.persuasion?.total || 0;

    const dcByAttitude = {
      'unfriendly': 30,
      'indifferent': 25,
      'friendly': 20,
      'helpful': 15
    };

    const dc = dcByAttitude[targetAttitude.toLowerCase()] || 25;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + persuasionBonus;
    const success = checkResult >= dc;

    const discountAmount = success ? Math.ceil(amount * 0.5) : 0;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Haggle</strong> - Negotiate Price<br>` +
              `Transaction Type: ${transactionType}<br>` +
              `Original Amount: ${amount} credits<br>` +
              `Target Attitude: ${targetAttitude}<br>` +
              `DC: ${dc}<br>` +
              `Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              (transactionType === 'information' ? 'Action: Swift Action' : 'Action: Full-Round Action')
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} haggled: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
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
   * Full-Round Action
   * vs Will Defense
   * Can force: Back down, surrender possession, reveal secret, flee
   * Cannot force: Obey every command, self-endangering acts
   * Target becomes one step more Hostile after confrontation ends
   * Situation modifiers: -15 to +5
   * Target must INT 1+, must see you
   * Can Take 10, cannot Take 20
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
      flavor: `<strong>Intimidate</strong><br>` +
              `Target: ${target.name}<br>` +
              `Will Defense: ${dc}<br>` +
              `${situationMod !== 0 ? `Situation Modifier: ${situationMod >= 0 ? '+' : ''}${situationMod}<br>` : ''}` +
              `Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Full-Round Action`
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} intimidated ${target.name}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} intimidates ${target.name}!`
        : `${target.name} resists intimidation.`
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
      limitations: 'Cannot force self-endangering acts or complete obedience',
      message: success ? `${target.name} backs down or surrenders` : `${target.name} resists`
    };
  }

  /**
   * BRIBERY (Force Unleashed Campaign Guide)
   * Persuasion check to bribe officials or influential people
   * DC depends on perceived risk if discovered
   * Base DC: 10 (within duties), 20 (outside duties), 30 (not easily concealed)
   * Modifiers: +15 personally dangerous, -10/-15/-20 for bribe amount doubling
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
      flavor: `<strong>Bribery</strong> - Corrupt Official<br>` +
              `Reference: Force Unleashed Campaign Guide<br>` +
              `Request Type: ${requestType}<br>` +
              `Bribe Amount: ${bribeAmount} credits<br>` +
              `${personalRisk ? 'Personal Risk: +15 to DC<br>' : ''}` +
              `DC: ${dc}<br>` +
              `Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} bribed official: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} successfully bribes the official!`
        : `The official refuses the bribe.`
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
   * Communicate nonverbally or across language barriers
   * Move Action
   * DC = 20 - target's INT modifier
   * With pre-agreed signals: DC -5
   * Simple concepts only: "Be quiet," "Go," "Help," "Stop," etc.
   * Target must see you
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
      flavor: `<strong>Improvised Communication</strong><br>` +
              `Reference: Force Unleashed Campaign Guide<br>` +
              `Target: ${target.name}<br>` +
              `Base DC: 20<br>` +
              `Target INT Modifier: ${targetIntModifier >= 0 ? '+' : ''}${targetIntModifier}<br>` +
              `${hasPreAgreedSignals ? 'Pre-Agreed Signals: -5<br>' : ''}` +
              `Final DC: ${dc}<br>` +
              `Persuasion Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Move Action`
    });

    SWSELogger.log(
      `PersuasionUses | ${actor.name} communicated with ${target.name}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} communicates with ${target.name}!`
        : `${target.name} doesn't understand the communication.`
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
      concepts: ['Be quiet', 'Go', 'Hello', 'Help', 'I am hungry/thirsty', 'Pick this up', 'Put that down', 'Stay here', 'Stop', 'Thank you'],
      message: success ? 'Successfully communicates simple concept' : 'Communication fails'
    };
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get Persuasion bonus
   */
  static getPersuasionBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.persuasion?.total || 0;
  }
}

export default PersuasionUses;
