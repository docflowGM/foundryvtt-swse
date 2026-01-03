/**
 * Ride Skill Uses System
 * Implements all Star Wars Saga Edition Ride skill applications
 * from the core rulebook
 *
 * Ride Mount Checks:
 * 1. Guide with Knees - Use both hands while riding
 * 2. Stay in Saddle - React to mount rearing, bolting, or damage
 * 3. Use Mount as Cover - Drop and use mount for cover
 * 4. Soft Fall - Avoid damage when falling from mount
 * 5. Leap - Get mount to jump obstacles
 * 6. Control Mount in Battle - Control mount during combat
 * 7. Fast Mount or Dismount - Mount/dismount as swift action
 */

import { SWSELogger } from '../utils/logger.js';

export class RideUses {

  /**
   * GUIDE WITH KNEES - Reaction to use both hands in combat
   * Swift Action (check at start of turn)
   * DC 10
   * Failure: Can only use one hand (need other for mount)
   * Can Take 10, cannot Take 20
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
      flavor: `<strong>Guide with Knees</strong> - Free Up Hands<br>` +
              `Mount: ${mountName}<br>` +
              `DC: ${dc}<br>` +
              `Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Swift Action`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} guided mount with knees: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} guides ${mountName} with knees! Both hands free!`
        : `${actor.name} needs one hand to control ${mountName}.`
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
   * STAY IN SADDLE - React to mount rearing, bolting, or when taking damage
   * Reaction
   * DC 10
   * Failure: Fall from mount
   * Can Take 10, cannot Take 20
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
      flavor: `<strong>Stay in Saddle</strong> - Maintain Control<br>` +
              `Circumstance: ${circumstance}<br>` +
              `DC: ${dc}<br>` +
              `Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Reaction`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} stayed in saddle: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} stays in the saddle!`
        : `${actor.name} falls from the mount!`
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
   * Reaction to attack against you
   * DC 15
   * Success: Mount provides one-half Cover
   * Failure: No cover benefit
   * Can Take 10, cannot Take 20
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
      flavor: `<strong>Use Mount as Cover</strong> - Seek Protection<br>` +
              `Mount: ${mountName}<br>` +
              `DC: ${dc}<br>` +
              `Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Reaction`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} used mount as cover: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} uses ${mountName} as one-half Cover!`
        : `${actor.name} fails to get behind ${mountName}.`
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
   * Reaction when mount is killed or falls
   * DC 15
   * Failure: Takes 1d6 falling damage
   * Can Take 10, cannot Take 20
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

    // Damage roll if fail
    let damageRoll = null;
    let damageTotal = 0;
    if (!success) {
      damageRoll = await new Roll('1d6').evaluate({ async: true });
      damageTotal = damageRoll.total;
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Soft Fall</strong> - Avoid Falling Damage<br>` +
              `Mount: ${mountName}<br>` +
              `DC: ${dc}<br>` +
              `Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Reaction` +
              (!success ? `<br>Damage Taken: ${damageTotal} (1d6)` : '')
    });

    SWSELogger.log(
      `RideUses | ${actor.name} attempted soft fall: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure (${damageTotal}dmg)'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} falls gracefully, takes no damage!`
        : `${actor.name} takes ${damageTotal} damage from the fall!`
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
   * DC 15
   * Use lower of Ride skill or Mount's Jump skill
   * Success: Mount leaps obstacle
   * Failure: Fall if taking damage during leap
   * Can Take 10, cannot Take 20
   */
  static async leap(actor, mountName = 'mount', mountJumpBonus = 0, obstacle = 'obstacle') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const rideBonus = actor.system.skills?.ride?.total || 0;

    // Use lower of Ride or Mount's Jump
    const effectiveBonus = Math.min(rideBonus, mountJumpBonus);

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + effectiveBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Leap</strong> - Jump Obstacle<br>` +
              `Mount: ${mountName}<br>` +
              `Obstacle: ${obstacle}<br>` +
              `Ride/Jump Bonus: ${effectiveBonus}<br>` +
              `DC: ${dc}<br>` +
              `Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} leaped obstacle: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name}'s ${mountName} leaps the ${obstacle}!`
        : `${actor.name}'s ${mountName} fails to clear the ${obstacle}!`
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
   * Move Action
   * DC 20
   * Failure: Can do nothing else that round
   * Not needed for battle-trained mounts
   * Can Take 10, cannot Take 20
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
      flavor: `<strong>Control Mount in Battle</strong> - Combat Control<br>` +
              `Mount: ${mountName}<br>` +
              `DC: ${dc}<br>` +
              `Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Move Action`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} controlled mount in battle: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} maintains control of ${mountName}!`
        : `${actor.name} cannot control ${mountName} this round!`
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
   * Swift Action (with DC 20 check)
   * Armor Check Penalty applies
   * Failure: Mount/dismount as Move Action instead
   * Prerequisite: Could Mount/Dismount as Move Action this round
   * Can Take 10, cannot Take 20
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
      flavor: `<strong>Fast ${action.charAt(0).toUpperCase() + action.slice(1)}</strong> - Quick Action<br>` +
              `DC: ${dc}<br>` +
              `${armorCheckPenalty !== 0 ? `Armor Penalty: ${armorCheckPenalty}<br>` : ''}` +
              `Ride Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: ${success ? 'Swift Action' : 'Move Action'}`
    });

    SWSELogger.log(
      `RideUses | ${actor.name} ${action}ed quickly: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Swift Action' : 'Move Action'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} ${action}s as a Swift Action!`
        : `${actor.name} ${action}s as a Move Action.`
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

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get Ride bonus
   */
  static getRideBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.ride?.total || 0;
  }

  /**
   * Get armor check penalty
   */
  static getArmorCheckPenalty(actor) {
    if (!actor) return 0;
    return actor.system.skills?.ride?.armor || 0;
  }
}

export default RideUses;
