/**
 * Pilot Skill Uses System
 * Implements all Star Wars Saga Edition Pilot skill applications
 * from the core rulebook and supplemental reference books
 *
 * Core Pilot Uses:
 * 1. Engage the Enemy - Use Pilot check instead of Initiative (Trained)
 * 2. Increase Vehicle Speed - Boost speed temporarily (Trained)
 *
 * Extra Pilot Uses (Supplemental):
 * 3. Fly Casual - Substitute Pilot for Deception check (Trained, Scum and Villainy)
 * 4. Starship Stealth - Use Stealth in starship (Starships of the Galaxy)
 */

import { SWSELogger } from '../utils/logger.js';

export class PilotUses {

  /**
   * ENGAGE THE ENEMY (Trained Only) - Use Pilot check instead of Initiative
   * Trained in Pilot can make Pilot check instead of Initiative check
   * Benefits from vehicle bonuses
   * Determine initiative order
   * Can Take 10, cannot Take 20
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

    // Roll using Pilot bonus + vehicle size modifier
    const totalBonus = pilotBonus + vehicleSizeModifier;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const initiativeResult = roll.total + totalBonus;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Engage the Enemy</strong> - Vehicle Initiative<br>` +
              `Reference: Trained Only<br>` +
              `Vehicle Size Modifier: ${vehicleSizeModifier}<br>` +
              `Pilot Check: ${initiativeResult}<br>` +
              `Action: Replaces Initiative check`
    });

    SWSELogger.log(
      `PilotUses | ${actor.name} engaged enemy: ` +
      `Initiative result ${initiativeResult}`
    );

    ui.notifications.info(
      `${actor.name} rolls initiative: ${initiativeResult}`
    );

    return {
      success: true,
      initiativeResult: initiativeResult,
      pilotBonus: pilotBonus,
      vehicleSizeModifier: vehicleSizeModifier,
      trained: true,
      action: 'Replaces Initiative check',
      benefits: 'Uses Pilot skill instead of Initiative, gains vehicle bonuses',
      message: `Initiative result: ${initiativeResult}`
    };
  }

  /**
   * INCREASE VEHICLE SPEED (Trained Only)
   * Swift Action
   * DC 20 Pilot check (cannot Take 10)
   * Failure: Speed doesn't increase, vehicle moves -1 Condition
   * Success: Speed increases 1 square until next turn
   * For every 5 points over DC: +1 additional square
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
      flavor: `<strong>Increase Vehicle Speed</strong> - Boost Speed<br>` +
              `Vehicle Size: ${vehicleSize}<br>` +
              `DC: ${dc}<br>` +
              `Pilot Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Swift Action` +
              (success ? `<br>Speed Increase: +${speedBonus} squares` : '<br>Speed does not increase')
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
   * Give off deceptive appearance while piloting
   * Still may need proper documentation
   * Helps with old authorization codes
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
      flavor: `<strong>Fly Casual</strong> - Deceptive Piloting<br>` +
              `Reference: Scum and Villainy - Trained Only<br>` +
              `Deception DC: ${deceptionDC}<br>` +
              `Pilot Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `PilotUses | ${actor.name} flew casual: ` +
      `${checkResult} vs DC ${deceptionDC} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} averts suspicion with casual piloting!`
        : `${actor.name} arouses suspicion!`
    );

    return {
      success: success,
      checkResult: checkResult,
      deceptionDC: deceptionDC,
      trained: true,
      source: 'Scum and Villainy',
      benefits: 'Substitute Pilot for Deception, helps with authorization codes',
      message: success ? 'Averts suspicion' : 'Arouses suspicion'
    };
  }

  /**
   * STARSHIP STEALTH - Use Stealth in starship
   * Add Vehicle Size Modifier + DEX modifier to Stealth check
   * -5 penalty if not Trained in Pilot
   * Usually requires Concealment or Cover
   * Result sets DC for Use Computer sensors or Perception to notice
   */
  static async starshipStealth(actor, vehicleSize = 'large', dexModifier = 0, hasConcealment = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const pilotBonus = actor.system.skills?.pilot?.total || 0;
    const stealthBonus = actor.system.skills?.stealth?.total || 0;
    const isTrained = actor.system.skills?.pilot?.trained || false;

    const sizeModifierBySize = {
      'large': -5,
      'huge': -10,
      'gargantuan': -15,
      'colossal': -20
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
      flavor: `<strong>Starship Stealth</strong> - Hide Starship<br>` +
              `Reference: Starships of the Galaxy<br>` +
              `Vehicle Size: ${vehicleSize}<br>` +
              `Size Modifier: ${sizeModifier}<br>` +
              `DEX Modifier: ${dexModifier}<br>` +
              `${!isTrained ? 'Untrained Pilot: -5<br>' : ''}` +
              `Stealth Check Result: ${checkResult}<br>` +
              `DC for Use Computer (sensors): ${checkResult}<br>` +
              `DC for Perception: ${checkResult}`
    });

    SWSELogger.log(
      `PilotUses | ${actor.name} performed starship stealth: ` +
      `Result ${checkResult}`
    );

    ui.notifications.info(
      `${actor.name} hides starship! DC ${checkResult} to detect.`
    );

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

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get Pilot bonus
   */
  static getPilotBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.pilot?.total || 0;
  }

  /**
   * Get vehicle size modifier
   */
  static getVehicleSizeModifier(vehicleSize) {
    const modifiers = {
      'colossal-station': -10,
      'colossal-cruiser': -10,
      'colossal-frigate': -10,
      'colossal': -10,
      'gargantuan': -5,
      'huge': -2,
      'large': -1,
      'medium': 0
    };
    return modifiers[vehicleSize.toLowerCase()] || 0;
  }

  /**
   * Check if trained
   */
  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.pilot?.trained || false;
  }
}

export default PilotUses;
