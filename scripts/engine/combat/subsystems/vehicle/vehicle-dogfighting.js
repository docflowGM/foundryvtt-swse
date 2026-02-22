/**
 * SWSE Vehicle Dogfighting System (Engine Domain)
 *
 * PHASE 2c MIGRATION: Dogfighting mechanics moved from legacy domain
 *
 * Implements RAW opposed Pilot checks:
 *  - Enter Dogfight
 *  - Opposed Maneuver Check
 *  - Establish "Tailing" state
 *  - Break Free
 *
 * Integrated with:
 *  - RollEngine (dice rolls)
 *  - ActorEngine (mutations via Active Effects)
 *  - Vehicle calculations (dogfighting modifiers)
 *  - Chat messaging
 */

import { RollEngine } from '../../roll-engine.js';
import { computeDogfightingModifier } from '../../vehicles/utils/vehicle-calculations.js';
import { measureSquares } from '../../vehicles/utils/vehicle-shared.js';
import { ActorEngine } from '../../../actors/engine/actor-engine.js';
import { createChatMessage } from '../../../core/document-api-v13.js';

export class VehicleDogfighting {

  /* -------------------------------------------- */
  /* DOGFIGHT INITIATION                          */
  /* -------------------------------------------- */

  /**
   * Initiate a dogfight between two vehicles.
   * Both must be within 6 squares and vehicle type.
   *
   * @param {Actor} attacker - Initiating vehicle
   * @param {Actor} target - Target vehicle
   * @returns {Promise<Object>} Dogfight result or null if invalid
   */
  static async initiateDogfight(attacker, target) {
    const attackerToken = attacker.getActiveTokens()[0];
    const targetToken = target.getActiveTokens()[0];

    if (!attackerToken || !targetToken) {
      ui.notifications.warn('Both attacker and target must be present on canvas.');
      return null;
    }

    const dist = measureSquares(attackerToken, targetToken);
    if (dist > 6) {
      ui.notifications.warn('Vehicles must be within 6 squares to enter dogfight range.');
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

  /* -------------------------------------------- */
  /* BREAK FREE FROM DOGFIGHT                     */
  /* -------------------------------------------- */

  /**
   * Attempt to break free from a dogfight.
   * Opposed Pilot check against opponent.
   *
   * @param {Actor} attacker - Vehicle attempting to break free
   * @param {Actor} defender - Opponent vehicle
   * @returns {Promise<Object>} Break free result
   */
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

  /* -------------------------------------------- */
  /* OPPOSED PILOT CHECK                          */
  /* -------------------------------------------- */

  /**
   * Resolve opposed Pilot check for dogfighting.
   * Accounts for facing, feats, and situational modifiers.
   *
   * @param {Actor} attacker - First vehicle
   * @param {Actor} defender - Second vehicle
   * @param {Object} opts - Context (initiating, breakingFree)
   * @returns {Promise<Object>} Check result
   */
  static async _opposedPilotCheck(attacker, defender, opts = {}) {
    const atkTok = attacker.getActiveTokens()[0];
    const defTok = defender.getActiveTokens()[0];

    const atkBonus = computeDogfightingModifier(attacker, defender, atkTok, defTok);
    const defBonus = computeDogfightingModifier(defender, attacker, defTok, atkTok);

    const atkRoll = await RollEngine.safeRoll(`1d20 + ${atkBonus}`).evaluate({ async: true });
    const defRoll = await RollEngine.safeRoll(`1d20 + ${defBonus}`).evaluate({ async: true });

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

  /* -------------------------------------------- */
  /* TAILING MECHANICS                            */
  /* -------------------------------------------- */

  /**
   * Apply tailing effect (Active Effects).
   * Tailer gets +2 attack bonus.
   * Tailed gets -2 reflex defense penalty.
   *
   * MUTATION: Creates Active Effects via ActorEngine
   *
   * @param {Actor} tailer - Vehicle gaining tailing advantage
   * @param {Actor} tailed - Vehicle being tailed
   */
  static async _applyTailingEffect(tailer, tailed) {
    await this._clearTailingEffect(tailer);
    await this._clearTailingEffect(tailed);

    const aeTailer = {
      label: 'Tailing',
      icon: 'icons/svg/arrow-right.svg',
      origin: tailed.uuid,
      changes: [
        { key: 'system.attackBonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 }
      ],
      flags: { swse: { vehicleDogfight: 'tailing', target: tailed.id } }
    };

    const aeTailed = {
      label: 'Being Tailed',
      icon: 'icons/svg/arrow-left.svg',
      origin: tailer.uuid,
      changes: [
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 }
      ],
      flags: { swse: { vehicleDogfight: 'tailed', source: tailer.id } }
    };

    await ActorEngine.createEmbeddedDocuments(tailer, 'ActiveEffect', [aeTailer]);
    await ActorEngine.createEmbeddedDocuments(tailed, 'ActiveEffect', [aeTailed]);
  }

  /**
   * Remove tailing effects from vehicle.
   *
   * MUTATION: Deletes Active Effects via ActorEngine
   *
   * @param {Actor} actor - Vehicle to clear effects from
   */
  static async _clearTailingEffect(actor) {
    const effects = actor.effects.filter(e => e.flags?.swse?.vehicleDogfight);
    if (effects.length) {
      await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', effects.map(e => e.id));
    }
  }

  /* -------------------------------------------- */
  /* CHAT MESSAGING                               */
  /* -------------------------------------------- */

  /**
   * Post dogfight result to chat.
   * Shows opposed rolls and winner.
   *
   * @param {Object} result - Dogfight check result
   */
  static async _createDogfightMessage(result) {
    const { attacker, defender, atkTotal, defTotal, atkRoll, defRoll, attackerWins, isTie, initiating, breakingFree } = result;

    const verb = initiating ? 'Initiates Dogfight' : breakingFree ? 'Attempts Break Free' : 'Dogfight Maneuver';

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
      html += `<div class="result ${attackerWins ? 'success' : 'failure'}">
        ${attackerWins ? attacker.name + ' Wins the Maneuver!' : defender.name + ' Prevails!'}
      </div>`;
    }

    html += `</div>`;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html
    });
  }
}
