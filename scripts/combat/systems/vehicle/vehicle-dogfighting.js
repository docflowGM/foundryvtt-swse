/**
 * Dogfight system for starfighters and airspeeders
 * Implements dogfight initiation, attacks, and disengagement
 */

import { isStarfighter, getDefaultPilot, getPilotBonus } from './vehicle-shared.js';

/**
 * Initiate dogfight between two starfighters/airspeeders
 * @param {Actor} initiator - The initiating vehicle
 * @param {Actor} target - The target vehicle
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Dogfight result
 */
export async function initiateDogfight(initiator, target, options = {}) {
  // Both must be airspeeders or starfighters
  if (!isStarfighter(initiator) || !isStarfighter(target)) {
    ui.notifications.warn('Dogfights can only occur between Airspeeders or Starfighters!');
    return null;
  }

  const initiatorPilot = getDefaultPilot(initiator);
  const targetPilot = getDefaultPilot(target);

  // Make opposed Pilot checks (initiator has -5 penalty)
  const initiatorBonus = getPilotBonus(initiator, initiatorPilot) - 5;
  const targetBonus = getPilotBonus(target, targetPilot);

  const initiatorRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${initiatorBonus}`).evaluate({async: true});
  const targetRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${targetBonus}`).evaluate({async: true});

  const result = {
    initiator,
    target,
    initiatorPilot,
    targetPilot,
    initiatorRoll,
    targetRoll,
    initiatorTotal: initiatorRoll.total,
    targetTotal: targetRoll.total,
    success: initiatorRoll.total > targetRoll.total,
    dogfightEngaged: false
  };

  if (result.success) {
    // Dogfight engaged - both vehicles are now in dogfight
    result.dogfightEngaged = true;
    await setDogfightState(initiator, target, true);
    ui.notifications.info(`${initiator.name} engages ${target.name} in a dogfight!`);
  } else {
    ui.notifications.info(`${initiator.name} fails to engage ${target.name} in dogfight.`);
  }

  // Create chat message
  await createDogfightMessage(result);

  return result;
}

/**
 * Attack within a dogfight (requires opposed Pilot check first)
 * @param {Actor} attacker - The attacking vehicle in dogfight
 * @param {Actor} defender - The defending vehicle in dogfight
 * @param {Object} weapon - The weapon to use
 * @param {Function} rollAttack - Attack roll function from main combat system
 * @returns {Promise<Object>} Dogfight attack result
 */
export async function attackInDogfight(attacker, defender, weapon, rollAttack) {
  const attackerPilot = getDefaultPilot(attacker);
  const defenderPilot = getDefaultPilot(defender);

  // Make opposed Pilot check
  const attackerBonus = getPilotBonus(attacker, attackerPilot);
  const defenderBonus = getPilotBonus(defender, defenderPilot);

  const attackerRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${attackerBonus}`).evaluate({async: true});
  const defenderRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${defenderBonus}`).evaluate({async: true});

  const success = attackerRoll.total > defenderRoll.total;

  const result = {
    attacker,
    defender,
    attackerRoll,
    defenderRoll,
    success,
    weaponAttack: null
  };

  if (success) {
    // Can make a single weapon attack as swift action
    const weaponAttack = await rollAttack(attacker, weapon, defender, {
      gunner: attackerPilot
    });
    result.weaponAttack = weaponAttack;
  } else {
    ui.notifications.info(`${attacker.name}'s gunners take -5 penalty on attacks until next turn.`);
  }

  return result;
}

/**
 * Disengage from dogfight
 * @param {Actor} vehicle - The vehicle attempting to disengage
 * @param {Actor} opponent - The opponent in the dogfight
 * @returns {Promise<boolean>} Success status
 */
export async function disengageFromDogfight(vehicle, opponent) {
  const vehiclePilot = getDefaultPilot(vehicle);
  const opponentPilot = getDefaultPilot(opponent);

  const vehicleBonus = getPilotBonus(vehicle, vehiclePilot);
  const opponentBonus = getPilotBonus(opponent, opponentPilot);

  const vehicleRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${vehicleBonus}`).evaluate({async: true});
  const opponentRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${opponentBonus}`).evaluate({async: true});

  const success = vehicleRoll.total > opponentRoll.total;

  if (success) {
    await setDogfightState(vehicle, opponent, false);
    ui.notifications.info(`${vehicle.name} disengages from the dogfight!`);
    return true;
  } else {
    ui.notifications.info(`${vehicle.name} fails to disengage! Gunners take -5 penalty.`);
    return false;
  }
}

/**
 * Set dogfight state for two vehicles
 * @param {Actor} vehicle1 - First vehicle
 * @param {Actor} vehicle2 - Second vehicle
 * @param {boolean} engaged - Whether dogfight is engaged
 * @private
 */
export async function setDogfightState(vehicle1, vehicle2, engaged) {
  // Store dogfight state in flags
  if (engaged) {
    await vehicle1.setFlag('swse', 'dogfight', { opponent: vehicle2.id });
    await vehicle2.setFlag('swse', 'dogfight', { opponent: vehicle1.id });
  } else {
    await vehicle1.unsetFlag('swse', 'dogfight');
    await vehicle2.unsetFlag('swse', 'dogfight');
  }
}

/**
 * Create dogfight chat message
 * @param {Object} result - Dogfight result
 * @private
 */
export async function createDogfightMessage(result) {
  const { initiator, target, initiatorRoll, targetRoll, success } = result;

  const content = `
    <div class="swse-dogfight-roll">
      <div class="dogfight-header">
        <h3><i class="fas fa-fighter-jet"></i> Dogfight!</h3>
      </div>
      <div class="opposed-rolls">
        <div class="initiator-roll">
          <strong>${initiator.name}:</strong>
          <div class="dice-total ${success ? 'winner' : ''}">${initiatorRoll.total}</div>
        </div>
        <div class="vs">VS</div>
        <div class="defender-roll">
          <strong>${target.name}:</strong>
          <div class="dice-total ${!success ? 'winner' : ''}">${targetRoll.total}</div>
        </div>
      </div>
      <div class="dogfight-result">
        ${success ? `${initiator.name} successfully engages in dogfight!` : `${initiator.name} fails to engage.`}
      </div>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor: initiator}),
    content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  });
}
