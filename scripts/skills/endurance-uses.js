/**
 * Endurance Skill Uses System
 * Implements all Star Wars Saga Edition Endurance skill applications
 * from the core rulebook
 *
 * Core Endurance Uses:
 * 1. Forced March - Walk beyond 8 hours
 * 2. Hold Breath - Hold breath for CON score rounds
 * 3. Ignore Hunger - Go without food based on CON modifier
 * 4. Ignore Thirst - Go without water based on CON score
 * 5. Run - Run as full-round action, maintain speed with checks
 * 6. Sleep in Armor - Sleep while wearing armor
 * 7. Swim/Tread Water - Maintain swimming endurance
 */

import { SWSELogger } from '../utils/logger.js';

export class EnduranceUses {

  /**
   * FORCED MARCH - Walk beyond the normal 8 hour limit
   * Each hour after 8 requires DC 10 + 2 per hour
   * Failure: Move -1 Persistent step on Condition Track
   * Recovery: Requires 8 hours of rest
   */
  static async forcedMarch(actor, hoursMarched = 1) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const enduranceBonus = actor.system.skills?.endurance?.total || 0;

    // DC starts at 10 for first hour beyond 8, +2 per additional hour
    const dc = 10 + (Math.max(0, hoursMarched - 1) * 2);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Forced March</strong> - Walking Extended Hours<br>` +
              `Hours Beyond 8: ${hoursMarched}<br>` +
              `DC: ${dc}<br>` +
              `Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `EnduranceUses | ${actor.name} forced march (${hoursMarched}h): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} continues marching without fatigue!`
        : `${actor.name} becomes fatigued and must rest!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      hoursMarched: hoursMarched,
      condition: success ? 'No fatigue' : '-1 Persistent Condition',
      recovery: '8 hours of rest required',
      message: success ? 'Continues marching without penalty' : 'Becomes fatigued (-1 Condition)'
    };
  }

  /**
   * HOLD BREATH - Hold breath for CON score rounds
   * After CON rounds, must make DC 10 Endurance check, +2 per additional round
   * Failure: Must breathe or move -1 on Condition Track
   * Unconscious at bottom of Condition Track, dies if still can't breathe next turn
   */
  static async holdBreathe(actor, roundsHolding = null) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const conScore = actor.system.abilities?.con?.score || 10;
    const enduranceBonus = actor.system.skills?.endurance?.total || 0;

    // If no rounds specified, use CON score as base
    if (roundsHolding === null) {
      return {
        success: true,
        conScore: conScore,
        roundsWithoutCheck: conScore,
        message: `Can hold breath for ${conScore} rounds without check`,
        nextPhase: `After ${conScore} rounds, must make DC 10 check, +2 per round`
      };
    }

    // Player has been holding breath for roundsHolding
    if (roundsHolding <= conScore) {
      return {
        success: true,
        conScore: conScore,
        roundsHolding: roundsHolding,
        roundsRemaining: conScore - roundsHolding,
        message: `Still holding breath (${roundsRemaining} rounds remaining before checks)`
      };
    }

    // Must make check now
    const extraRounds = roundsHolding - conScore;
    const dc = 10 + (extraRounds * 2);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Hold Breath</strong> - Extended Holding<br>` +
              `CON Score: ${conScore}<br>` +
              `Base Rounds: ${conScore}<br>` +
              `Total Rounds Held: ${roundsHolding}<br>` +
              `DC: ${dc} (10 + ${extraRounds * 2})<br>` +
              `Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `EnduranceUses | ${actor.name} held breath ${roundsHolding}r: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} continues holding breath!`
        : `${actor.name} must breathe or suffocate!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      conScore: conScore,
      roundsHolding: roundsHolding,
      message: success ? 'Continues holding breath' : 'Must breathe or move -1 Condition',
      consequence: success ? 'Can continue next round' : 'Unconscious if fails next check'
    };
  }

  /**
   * IGNORE HUNGER - Go without food
   * Can go without food for CON modifier days (minimum 1 day)
   * After that, must make Endurance check each day or move -1 Persistent Condition
   * Recovery: Eating a nutritious meal
   */
  static async ignoreHunger(actor, daysWithoutFood = 1) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const conModifier = actor.system.abilities?.con?.modifier || 0;
    const daysAllowed = Math.max(1, conModifier);
    const enduranceBonus = actor.system.skills?.endurance?.total || 0;

    // If within allowed days, no check needed
    if (daysWithoutFood <= daysAllowed) {
      return {
        success: true,
        conModifier: conModifier,
        daysAllowed: daysAllowed,
        daysWithoutFood: daysWithoutFood,
        daysRemaining: daysAllowed - daysWithoutFood,
        message: `Can go without food for ${daysAllowed} days (${daysRemaining} remaining)`,
        noCheckRequired: true
      };
    }

    // Must make check now
    const daysBeyondLimit = daysWithoutFood - daysAllowed;
    const dc = 10 + ((daysBeyondLimit - 1) * 2);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Ignore Hunger</strong> - Extended Fasting<br>` +
              `CON Modifier: ${conModifier}<br>` +
              `Days Allowed Without Check: ${daysAllowed}<br>` +
              `Days Without Food: ${daysWithoutFood}<br>` +
              `DC: ${dc}<br>` +
              `Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `EnduranceUses | ${actor.name} ignored hunger ${daysWithoutFood}d: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} resists hunger!`
        : `${actor.name} becomes hungry and fatigued!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      conModifier: conModifier,
      daysAllowed: daysAllowed,
      daysWithoutFood: daysWithoutFood,
      condition: success ? 'No fatigue' : '-1 Persistent Condition',
      recovery: 'Eating a nutritious meal',
      message: success ? 'Resists hunger' : 'Becomes hungry (-1 Condition)'
    };
  }

  /**
   * IGNORE THIRST - Go without water
   * Can go without water for 3 × CON score hours
   * After that, must make Endurance check each day or move -1 Persistent Condition
   * Recovery: Drinking at least 1 liter of water (adjust for creature size)
   */
  static async ignoreThirst(actor, hoursWithoutWater = 1) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const conScore = actor.system.abilities?.con?.score || 10;
    const hoursAllowed = 3 * conScore;
    const enduranceBonus = actor.system.skills?.endurance?.total || 0;

    // If within allowed hours, no check needed
    if (hoursWithoutWater <= hoursAllowed) {
      return {
        success: true,
        conScore: conScore,
        hoursAllowed: hoursAllowed,
        hoursWithoutWater: hoursWithoutWater,
        hoursRemaining: hoursAllowed - hoursWithoutWater,
        message: `Can go without water for ${hoursAllowed} hours (${hoursRemaining} remaining)`,
        noCheckRequired: true
      };
    }

    // Must make check now (per day)
    const daysWithoutWater = Math.ceil(hoursWithoutWater / 24);
    const dc = 10 + ((daysWithoutWater - 1) * 2);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Ignore Thirst</strong> - Extended Dehydration<br>` +
              `CON Score: ${conScore}<br>` +
              `Hours Allowed Without Check: ${hoursAllowed}<br>` +
              `Hours Without Water: ${hoursWithoutWater}<br>` +
              `Days Without Water: ${daysWithoutWater}<br>` +
              `DC: ${dc}<br>` +
              `Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `EnduranceUses | ${actor.name} ignored thirst ${hoursWithoutWater}h: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} resists thirst!`
        : `${actor.name} becomes dehydrated!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      conScore: conScore,
      hoursAllowed: hoursAllowed,
      hoursWithoutWater: hoursWithoutWater,
      daysWithoutWater: daysWithoutWater,
      condition: success ? 'No fatigue' : '-1 Persistent Condition',
      recovery: '1 liter of water (adjust for creature size)',
      message: success ? 'Resists thirst' : 'Becomes dehydrated (-1 Condition)'
    };
  }

  /**
   * RUN - Run as a full-round action
   * Movement: 4× Speed (or 3× Speed in Heavy Armor or Heavy Load)
   * Can run for CON score rounds without fatigue
   * After that, must succeed at DC 10 Endurance check, +1 per previous check
   * Failure: Move -1 Persistent Condition on Condition Track
   * Recovery: Rest for same length of time spent running (at normal speed only)
   */
  static async runAction(actor, roundsRunning = 1, isHeavyArmorOrLoad = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const conScore = actor.system.abilities?.con?.score || 10;
    const speed = actor.system.attributes?.speed?.value || 6; // Squares per round
    const enduranceBonus = actor.system.skills?.endurance?.total || 0;

    // Calculate movement
    const speedMultiplier = isHeavyArmorOrLoad ? 3 : 4;
    const movement = speed * speedMultiplier;

    // If within CON score rounds, no check needed
    if (roundsRunning <= conScore) {
      return {
        success: true,
        movement: `${movement} squares`,
        conScore: conScore,
        roundsRunning: roundsRunning,
        roundsRemaining: conScore - roundsRunning,
        noCheckRequired: true,
        defenseEffect: 'Lose DEX bonus to Reflex Defense while running',
        message: `Can run without fatigue check (${roundsRemaining} rounds remaining)`
      };
    }

    // Must make check for extended running
    const extraRounds = roundsRunning - conScore;
    const dc = 10 + (extraRounds - 1);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Run</strong> - Extended Running<br>` +
              `Speed: ${speed} squares<br>` +
              `Movement: ${movement} squares (${isHeavyArmorOrLoad ? '3×' : '4×'} Speed)<br>` +
              `CON Score: ${conScore}<br>` +
              `Total Rounds: ${roundsRunning}<br>` +
              `Fatigue Rounds: ${extraRounds}<br>` +
              `DC: ${dc}<br>` +
              `Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `EnduranceUses | ${actor.name} ran ${roundsRunning}r: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} continues running!`
        : `${actor.name} becomes fatigued!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      movement: `${movement} squares`,
      conScore: conScore,
      roundsRunning: roundsRunning,
      condition: success ? 'No fatigue' : '-1 Persistent Condition',
      recovery: `Rest for ${roundsRunning} rounds at normal speed`,
      defenseEffect: 'Lose DEX bonus to Reflex Defense while running',
      message: success ? 'Continues running' : 'Becomes fatigued (-1 Condition)'
    };
  }

  /**
   * SLEEP IN ARMOR - Sleep while wearing armor
   * Must succeed at Endurance check based on armor type
   * Failure: Don't sleep and move -1 Persistent Condition
   * Recovery: 8 hours of sleep
   */
  static async sleepInArmor(actor, armorType = 'light') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const enduranceBonus = actor.system.skills?.endurance?.total || 0;

    // DC by armor type
    const dcByArmor = {
      'light': 10,
      'medium': 15,
      'heavy': 20
    };

    const dc = dcByArmor[armorType.toLowerCase()] || 10;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Sleep in Armor</strong><br>` +
              `Armor Type: ${armorType}<br>` +
              `DC: ${dc}<br>` +
              `Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `EnduranceUses | ${actor.name} attempted sleep in armor (${armorType}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} manages to sleep in the ${armorType} armor!`
        : `${actor.name} cannot sleep comfortably in armor!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      armorType: armorType,
      slept: success,
      condition: success ? 'Rested' : '-1 Persistent Condition (no sleep)',
      recovery: '8 hours of proper sleep',
      message: success ? 'Sleeps in armor' : 'Cannot sleep in armor (-1 Condition)'
    };
  }

  /**
   * SWIM/TREAD WATER - Maintain swimming endurance
   * Each hour of swimming requires DC 15 Endurance check
   * +2 DC per consecutive hour
   * Treading water: Reduce DC by 5
   * Failure: Move -1 Persistent Condition
   * Recovery: Rest (non-swimming) for same time as swimming
   */
  static async swimEndurance(actor, hoursSwimming = 1, isTreadingWater = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const enduranceBonus = actor.system.skills?.endurance?.total || 0;

    // DC 15 base for swimming, +2 per consecutive hour
    let dc = 15 + ((hoursSwimming - 1) * 2);

    // Treading water reduces DC by 5
    if (isTreadingWater) {
      dc = Math.max(10, dc - 5);
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + enduranceBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Swim/Tread Water</strong> - Swimming Endurance<br>` +
              `Activity: ${isTreadingWater ? 'Treading Water' : 'Swimming'}<br>` +
              `Hours: ${hoursSwimming}<br>` +
              `Base DC: 15${isTreadingWater ? ' (-5 for treading)' : ''}<br>` +
              `DC: ${dc}<br>` +
              `Endurance Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `EnduranceUses | ${actor.name} swam ${hoursSwimming}h ${isTreadingWater ? '(treading)' : ''}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} continues swimming without fatigue!`
        : `${actor.name} becomes exhausted from swimming!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      hoursSwimming: hoursSwimming,
      isTreadingWater: isTreadingWater,
      condition: success ? 'No fatigue' : '-1 Persistent Condition',
      recovery: `Rest (non-swimming) for ${hoursSwimming} hour(s)`,
      message: success ? 'Continues swimming' : 'Becomes exhausted (-1 Condition)'
    };
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get Endurance bonus
   */
  static getEnduranceBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.endurance?.total || 0;
  }

  /**
   * Get CON score
   */
  static getConScore(actor) {
    if (!actor) return 10;
    return actor.system.abilities?.con?.score || 10;
  }

  /**
   * Get CON modifier
   */
  static getConModifier(actor) {
    if (!actor) return 0;
    return actor.system.abilities?.con?.modifier || 0;
  }
}

export default EnduranceUses;
