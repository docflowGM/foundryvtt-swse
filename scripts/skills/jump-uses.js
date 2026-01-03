/**
 * Jump Skill Uses System
 * Implements all Star Wars Saga Edition Jump skill applications
 * from the core rulebook
 *
 * Core Jump Uses:
 * 1. Long Jump - Leap horizontally (DC = distance × 3)
 * 2. High Jump - Leap vertically (DC = distance × 12)
 * 3. Jump Down - Reduce falling damage from intentional jumps
 */

import { SWSELogger } from '../utils/logger.js';

export class JumpUses {

  /**
   * LONG JUMP - Leap horizontally over pits, gaps, or obstacles
   * DC = distance (in meters) × 3
   * Running start required: At least 4 squares running start (DC doubled without)
   * Distance counts against maximum movement in round
   * Can Take 10 when making Jump check
   * Can Take 20 if no danger associated with falling
   */
  static async longJump(actor, distance = 3, hasRunningStart = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const jumpBonus = actor.system.skills?.jump?.total || 0;
    const armorPenalty = actor.system.skills?.jump?.armor || 0;

    // DC = distance × 3
    let dc = distance * 3;

    // Double DC if less than 4-square running start
    if (!hasRunningStart) {
      dc *= 2;
    }

    const totalBonus = jumpBonus + armorPenalty;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Long Jump</strong> - Horizontal Leap<br>` +
              `Distance: ${distance} meter(s)<br>` +
              `Running Start: ${hasRunningStart ? 'Yes' : 'No (DC doubled)'}<br>` +
              `Base DC: ${distance * 3}<br>` +
              `Final DC: ${dc}<br>` +
              `Jump Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `JumpUses | ${actor.name} long jumped ${distance}m: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} clears the ${distance}m gap!`
        : `${actor.name} doesn't jump far enough!`
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
      movementCost: `Counts against maximum movement in round`,
      message: success ? `Clears ${distance}m gap` : `Falls short of ${distance}m gap`
    };
  }

  /**
   * HIGH JUMP - Leap vertically to reach ledges, platforms, or high areas
   * DC = distance (in meters) × 12
   * With pole vault: DC halved
   * Running start required: At least 4 squares running start (DC doubled without)
   * Can Take 10 when making Jump check
   * Can Take 20 if no danger associated with falling
   */
  static async highJump(actor, distance = 1.5, hasRunningStart = true, hasPole = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const jumpBonus = actor.system.skills?.jump?.total || 0;
    const armorPenalty = actor.system.skills?.jump?.armor || 0;

    // DC = distance × 12
    let dc = distance * 12;

    // Halve DC if using pole
    if (hasPole) {
      dc = Math.ceil(dc / 2);
    }

    // Double DC if less than 4-square running start
    if (!hasRunningStart) {
      dc *= 2;
    }

    const totalBonus = jumpBonus + armorPenalty;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>High Jump</strong> - Vertical Leap<br>` +
              `Height: ${distance} meter(s)<br>` +
              `Running Start: ${hasRunningStart ? 'Yes' : 'No (DC doubled)'}<br>` +
              `Pole Vault: ${hasPole ? 'Yes (DC halved)' : 'No'}<br>` +
              `Base DC: ${distance * 12}<br>` +
              `Final DC: ${dc}<br>` +
              `Jump Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `JumpUses | ${actor.name} high jumped ${distance}m: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} reaches the ${distance}m height!`
        : `${actor.name} can't reach the ${distance}m height!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      baseDC: distance * 12,
      distance: distance,
      hasRunningStart: hasRunningStart,
      hasPole: hasPole,
      armorPenalty: armorPenalty,
      height: success ? `${distance} meter(s)` : 'Falls short',
      movementCost: `Counts against maximum movement in round`,
      message: success ? `Reaches ${distance}m height` : `Falls short of ${distance}m height`
    };
  }

  /**
   * JUMP DOWN - Reduce falling damage when intentionally jumping from height
   * DC 15 check reduces fall by 3 meters (2 squares)
   * Additional 3 meters reduction per 10 points over DC
   * If succeeds and takes no damage, lands on feet
   * Distance does NOT count against movement
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
      // Base reduction of 3 meters (2 squares)
      reducedDistance = 3;

      // Additional reduction for beating DC by 10+
      const beatMargin = checkResult - dc;
      if (beatMargin >= 10) {
        reducedDistance += Math.floor(beatMargin / 10) * 3;
      }
    }

    const finalDistance = fallDistance - reducedDistance;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Jump Down</strong> - Reduce Falling Damage<br>` +
              `Fall Distance: ${fallDistance} meters<br>` +
              `DC: ${dc}<br>` +
              `Jump Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Reduced Distance: ${reducedDistance} meters<br>` +
              `Final Distance (for damage): ${finalDistance} meters` +
              (success && reducedDistance === fallDistance ? '<br>Lands on feet!' : '')
    });

    SWSELogger.log(
      `JumpUses | ${actor.name} jumped down ${fallDistance}m: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'} ` +
      `(reduced by ${reducedDistance}m)`
    );

    const statusMsg = success
      ? `${actor.name} reduces fall damage! Fall treated as ${finalDistance}m.` +
        (reducedDistance === fallDistance ? ' Lands on feet!' : '')
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
      noMovementCost: true,
      message: success
        ? `Fall damage reduced by ${reducedDistance}m (treat as ${finalDistance}m fall)`
        : `Takes full fall damage from ${fallDistance}m`
    };
  }

  /**
   * Calculate maximum jump distance based on Jump check result
   * Used for determining if a Long Jump or High Jump is successful
   */
  static getMaxJumpDistance(checkResult, jumpType = 'long') {
    if (jumpType.toLowerCase() === 'long') {
      // Long Jump: distance = DC / 3
      return Math.floor(checkResult / 3);
    } else if (jumpType.toLowerCase() === 'high') {
      // High Jump: distance = DC / 12
      return Math.floor(checkResult / 12);
    }
    return 0;
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get Jump bonus
   */
  static getJumpBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.jump?.total || 0;
  }

  /**
   * Get armor penalty
   */
  static getArmorPenalty(actor) {
    if (!actor) return 0;
    return actor.system.skills?.jump?.armor || 0;
  }

  /**
   * Calculate falling damage
   * 1d6 per 10 feet (roughly 3 meters)
   */
  static calculateFallingDamage(distance) {
    const dice = Math.ceil(distance / 3);
    return `${dice}d6`;
  }
}

export default JumpUses;
