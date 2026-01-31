/**
 * SWSE Vehicle Dogfighting System (Starfighters & similar-scale vehicles)
 *
 * Implements RAW opposed Pilot checks:
 *  - Enter Dogfight
 *  - Opposed Maneuver Check
 *  - Establish "Tailing" state
 *  - Break Free
 *
 * Integrated with:
 *  - SWSERoll.rollSkill()
 *  - combat-utils
 *  - vehicle-shared (distance/angle)
 *  - vehicle-calculations (dogfighting modifiers)
 */

import { SWSERoll } from "../../rolls/enhanced-rolls.js";
import { computeDogfightingModifier } from "./vehicle-calculations.js";
import { measureSquares, facingTowards } from "./vehicle-shared.js";

export class SWSEDogfighting {

  static getSelectedVehicles() {
    return [...canvas.tokens.controlled]
      .map(t => t.actor)
      .filter(a => a?.type === "vehicle");
  }

  // ---------------------------------------------------------------------------
  // Begin Dogfight
  // ---------------------------------------------------------------------------

  static async initiateDogfight(attacker, target) {
    const attackerToken = attacker.getActiveTokens()[0];
    const targetToken = target.getActiveTokens()[0];

    if (!attackerToken || !targetToken) {
      ui.notifications.warn("Both attacker and target must be present on canvas.");
      return null;
    }

    const dist = measureSquares(attackerToken, targetToken);
    if (dist > 6) {
      ui.notifications.warn("Vehicles must be within 6 squares to enter dogfight range.");
      return null;
    }

    const result = await this._opposedPilotCheck(attacker, target, { initiating: true });

    if (result.attackerWins) {
      await this._applyTailingEffect(attacker, target);
      ui.notifications.info(`${attacker.name} gains TAILING position on ${target.name}!`);
    } else {
      ui.notifications.info(`${target.name} evades the dogfight attempt by ${attacker.name}.`);
    }

    await this._createDogfightMessage(result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Opposed Pilot Check for dogfighting / break-free
  // ---------------------------------------------------------------------------

  static async _opposedPilotCheck(attacker, defender, opts = {}) {
    const atkTok = attacker.getActiveTokens()[0];
    const defTok = defender.getActiveTokens()[0];

    const atkBonus = computeDogfightingModifier(attacker, defender, atkTok, defTok);
    const defBonus = computeDogfightingModifier(defender, attacker, defTok, atkTok);

    const atkRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${atkBonus}`).evaluate({ async: true });
    const defRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${defBonus}`).evaluate({ async: true });

    const attackerWins = atkRoll.total > defRoll.total;

    return {
      attacker,
      defender,
      atkRoll,
      defRoll,
      atkTotal: atkRoll.total,
      defTotal: defRoll.total,
      attackerWins,
      isTie: atkRoll.total === defRoll.total,
      initiating: opts.initiating ?? false,
      breakingFree: opts.breakingFree ?? false
    };
  }

  // ---------------------------------------------------------------------------
  // Break Free from dogfight
  // ---------------------------------------------------------------------------

  static async breakFree(attacker, defender) {
    const result = await this._opposedPilotCheck(attacker, defender, { breakingFree: true });

    if (result.attackerWins) {
      await this._clearTailingEffect(attacker);
      await this._clearTailingEffect(defender);
      ui.notifications.info(`${attacker.name} successfully breaks free from ${defender.name}!`);
    } else {
      ui.notifications.info(`${defender.name} keeps ${attacker.name} locked in dogfight.`);
    }

    await this._createDogfightMessage(result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Active Effects
  // ---------------------------------------------------------------------------

  static async _applyTailingEffect(tailer, tailed) {
    await this._clearTailingEffect(tailer);
    await this._clearTailingEffect(tailed);

    const aeTailer = {
      label: "Tailing",
      icon: "icons/svg/arrow-right.svg",
      origin: tailed.uuid,
      changes: [
        { key: "system.attackBonus", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 }
      ],
      flags: { swse: { vehicleDogfight: "tailing", target: tailed.id } }
    };

    const aeTailed = {
      label: "Being Tailed",
      icon: "icons/svg/arrow-left.svg",
      origin: tailer.uuid,
      changes: [
        { key: "system.defenses.reflex.bonus", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 }
      ],
      flags: { swse: { vehicleDogfight: "tailed", source: tailer.id } }
    };

    await tailer.createEmbeddedDocuments("ActiveEffect", [aeTailer]);
    await tailed.createEmbeddedDocuments("ActiveEffect", [aeTailed]);
  }

  static async _clearTailingEffect(actor) {
    const effects = actor.effects.filter(e => e.flags?.swse?.vehicleDogfight);
    if (effects.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
    }
  }

  // ---------------------------------------------------------------------------
  // Chat UI
  // ---------------------------------------------------------------------------

  static async _createDogfightMessage(result) {
    const { attacker, defender, atkTotal, defTotal, atkRoll, defRoll, attackerWins, isTie, initiating, breakingFree } = result;

    const verb = initiating ? "Initiates Dogfight" : breakingFree ? "Attempts Break Free" : "Dogfight Maneuver";

    let html = `
      <div class="swse-dogfight-card">
        <h3>${attacker.name} ${verb} vs ${defender.name}</h3>
        <div class="rolls">
          <div><strong>${attacker.name}:</strong> ${atkTotal} (d20=${atkRoll.dice[0].results[0].result})</div>
          <div><strong>${defender.name}:</strong> ${defTotal} (d20=${defRoll.dice[0].results[0].result})</div>
        </div>
    `;

    if (isTie) {
      html += `<div class="tie-result">Tie — No Change in Position.</div>`;
    } else {
      html += `<div class="result ${attackerWins ? "success" : "failure"}">
        ${attackerWins ? attacker.name + " Wins the Maneuver!" : defender.name + " Prevails!"}
      </div>`;
    }

    html += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html
    });
  }
}

window.SWSEDogfighting = SWSEDogfighting;

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
    style: CONST.CHAT_MESSAGE_STYLES.OTHER
  });
}
