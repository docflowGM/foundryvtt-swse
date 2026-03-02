/**
 * SWSE Grappling System (R1 — Strict RAW)
 * Integrated with:
 * - SWSECombat (attack coordinator)
 * - SWSERoll (dice & FP system)
 * - DamageSystem (damage application)
 * - ActiveEffectsManager (states: Grabbed, Grappled, Pinned)
 * - combat-utils (size modifiers, bonuses)
 */

import { computeAttackBonus } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-utils.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { DamageSystem } from "/systems/foundryvtt-swse/scripts/combat/damage-system.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class SWSEGrappling {

  static init() {
    // Grappling system initialized (no additional setup required)
  }

  static getSelectedActor() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }

  // ---------------------------------------------------------------------------
  // RAW STEP 1: Attempt Grab (Attack vs Reflex Defense)
  // ---------------------------------------------------------------------------

  static async attemptGrab(attacker, target) {
    if (!attacker || !target) {return;}

    const weapon = this._getUnarmedAttack(attacker);
    const { roll, total } = await SWSERoll.rollAttack(attacker, weapon);

    // Hit resolution pipeline
    const reflex = target.system.defenses?.reflex?.total ?? 10;
    const hit = (total >= reflex) || roll.dice[0].results[0].result === 20;

    const result = { attacker, target, roll, total, reflex, hit };

    if (hit) {
      await this._applyState(target, 'grabbed', attacker);
      ui.notifications.info(`${attacker.name} grabs ${target.name}!`);
    }

    await this._createGrabMessage(result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // RAW STEP 2 (Next Round): Opposed Grapple Check
  // ---------------------------------------------------------------------------

  static async grappleCheck(attacker, defender, options = {}) {
    const atk = await this._rollGrappleBonus(attacker);
    const def = await this._rollGrappleBonus(defender);

    const atkRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${atk}`).evaluate({ async: true });
    const defRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${def}`).evaluate({ async: true });

    const attackerWins = atkRoll.total > defRoll.total;

    const result = {
      attacker,
      defender,
      attackerRoll: atkRoll,
      defenderRoll: defRoll,
      attackerWins,
      isTie: atkRoll.total === defRoll.total
    };

    await this._createGrappleCheckMessage(result);

    if (result.isTie) {return result;}

    if (attackerWins) {
      await this._applyState(attacker, 'grappled', defender);
      await this._applyState(defender, 'grappled', attacker);
      ui.notifications.info(`${attacker.name} has grappled ${defender.name}!`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Attempt Pin (requires Pin feat)
  // ---------------------------------------------------------------------------

  static async attemptPin(attacker, defender) {
    if (!this._hasFeat(attacker, 'Pin')) {
      ui.notifications.warn(`${attacker.name} lacks the Pin feat.`);
      return false;
    }

    if (!this._hasGrappledState(attacker) || !this._hasGrappledState(defender)) {
      ui.notifications.warn(`Both creatures must already be Grappled.`);
      return false;
    }

    const check = await this.grappleCheck(attacker, defender);

    if (check.attackerWins) {
      await this._applyState(defender, 'pinned', attacker);
      ui.notifications.info(`${attacker.name} pins ${defender.name}!`);
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Escape Grapple
  // ---------------------------------------------------------------------------

  static async escapeGrapple(escaper, grappler) {
    const result = await this.grappleCheck(escaper, grappler);

    if (result.attackerWins) {
      await this._clearState(escaper);
      await this._clearState(grappler);
      ui.notifications.info(`${escaper.name} escapes the grapple!`);
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  static async _rollGrappleBonus(actor) {
    const lvl = actor.system.level ?? 1;
    const bab = actor.system.bab ?? 0;
    const str = actor.system.attributes.str?.mod ?? 0;
    const sizeMod = this._sizeMod(actor.system.size);

    return bab + str + sizeMod;
  }

  static _sizeMod(size) {
    const table = {
      fine: -16, diminutive: -12, tiny: -8, small: -4,
      medium: 0, large: 4, huge: 8, gargantuan: 12, colossal: 16
    };
    return table[size?.toLowerCase()] ?? 0;
  }

  static _getUnarmedAttack(actor) {
    return {
      name: 'Unarmed Grab',
      img: 'icons/svg/punch.svg',
      system: { attackAttribute: 'str', damage: '1d4', ranged: false }
    };
  }

  static async _applyState(actor, state, sourceActor) {
    let effectData;

    switch (state) {
      case 'grabbed':
        effectData = {
          label: 'Grabbed',
          icon: 'icons/svg/net.svg',
          origin: sourceActor.uuid,
          changes: [],
          flags: { swse: { grapple: 'grabbed', source: sourceActor.id } }
        };
        break;

      case 'grappled':
        effectData = {
          label: 'Grappled',
          icon: 'icons/svg/anchor.svg',
          origin: sourceActor.uuid,
          changes: [],
          flags: { swse: { grapple: 'grappled', source: sourceActor.id } }
        };
        break;

      case 'pinned':
        effectData = {
          label: 'Pinned',
          icon: 'icons/svg/trap.svg',
          origin: sourceActor.uuid,
          changes: [],
          flags: { swse: { grapple: 'pinned', source: sourceActor.id } }
        };
        break;
    }

    await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effectData]);
  }

  static async _clearState(actor) {
    const effects = actor.effects.filter(e => e.flags?.swse?.grapple);
    await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', effects.map(e => e.id));
  }

  static _hasFeat(actor, name) {
    return actor.items.some(i => i.type === 'feat' && i.name.toLowerCase().includes(name.toLowerCase()));
  }

  static _hasGrappledState(actor) {
    return actor.effects.some(e => e.flags?.swse?.grapple === 'grappled');
  }

  // ---------------------------------------------------------------------------
  // Chat Messages
  // ---------------------------------------------------------------------------

  static async _createGrabMessage(data) {
    const { attacker, target, roll, total, reflex, hit } = data;

    const html = `
      <div class="swse-grab-card">
        <h3>${attacker.name} attempts to Grab ${target.name}</h3>
        <div>Attack Roll: ${total} (d20=${roll.dice[0].results[0].result})</div>
        <div>Target Reflex: ${reflex}</div>
        <div class="${hit ? 'success' : 'failure'}">${hit ? 'Grabbed!' : 'Miss!'}</div>
      </div>
    `;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      rolls: [roll]
    });
  }

  static async _createGrappleCheckMessage(result) {
    const { attacker, defender, attackerRoll, defenderRoll, attackerWins } = result;

    const html = `
      <div class="swse-grapple-check-card">
        <h3>${attacker.name} vs ${defender.name} — Grapple Check</h3>
        <div>${attacker.name}: ${attackerRoll.total}</div>
        <div>${defender.name}: ${defenderRoll.total}</div>
        <div class="${attackerWins ? 'success' : 'failure'}">
          ${attackerWins ? `${attacker.name} wins!` : `${defender.name} wins!`}
        </div>
      </div>
    `;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html
    });
  }
}

window.SWSEGrappling = SWSEGrappling;
