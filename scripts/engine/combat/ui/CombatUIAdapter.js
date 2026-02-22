/**
 * Combat UI Adapter
 *
 * PHASE 1.5 CONSOLIDATION: UI-only behavioral logic
 *
 * This adapter handles:
 * - Chat card formatting and display
 * - Chat event listener registration
 * - UI flow control (damage rolling UI)
 * - Feat-driven multi-attack logic
 *
 * Does NOT handle:
 * - Attack resolution (CombatEngine)
 * - Damage application (DamageEngine)
 * - Threshold checking (ThresholdEngine)
 * - Actor mutations (ActorEngine)
 * - Initiative orchestration (CombatEngine)
 */

import { createChatMessage } from '../../core/document-api-v13.js';
import { DamageSystem } from '../damage-system.js';

export class CombatUIAdapter {

  /* -------------------------------------------- */
  /* ATTACK RESULT DISPLAY                        */
  /* -------------------------------------------- */

  /**
   * Handle post-resolution attack display and UI.
   * Called by CombatEngine after resolveAttack() completes.
   *
   * @param {Object} result - Attack resolution result from CombatEngine
   * @param {Actor} result.attacker
   * @param {Item} result.weapon
   * @param {Actor} result.target
   * @param {Roll} result.attackRoll
   * @param {boolean} result.hit
   * @param {Object} result.context - Hit resolution context
   * @param {Object} result.damageRoll
   * @param {number} result.damage
   * @param {Object} result.threshold
   */
  static async handleAttackResult(result) {
    /* Extract d20 for UI display */
    const d20 = result.attackRoll.dice?.[0]?.results?.[0]?.result ?? 0;

    /* Build result object for card formatter */
    const displayResult = {
      attacker: result.attacker,
      weapon: result.weapon,
      target: result.target,
      roll: result.attackRoll,
      d20,
      total: result.attackRoll.total,
      critThreat: d20 >= (result.weapon.system?.critRange || 20),
      natural20: d20 === 20,
      natural1: d20 === 1,
      hit: result.hit,
      hitContext: result.context,
      damageRoll: result.damageRoll,
      damage: result.damage,
      damageApplied: result.damageApplied,
      threshold: result.threshold
    };

    /* Create and post chat card */
    await this._createAttackCard(displayResult);
  }

  /* -------------------------------------------- */
  /* CHAT CARD CREATION                           */
  /* -------------------------------------------- */

  /**
   * Format and post an attack result card to chat.
   * Displays: attack roll, hit/miss, defense, critical threat, damage button.
   */
  static async _createAttackCard(result) {
    const { attacker, weapon, target, roll, total, hit, hitContext, d20, critThreat, blocked, reason } = result;

    let html = `
      <div class="swse-attack-card">
        <h3>${attacker.name} attacks with ${weapon.name}</h3>
    `;

    /* Show attack block reason if applicable */
    if (blocked && reason) {
      html += `<div class="attack-blocked"><strong>⛔ ${reason}</strong></div>`;
      html += `</div>`;
      await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor: attacker }),
        content: html,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        rolls: [roll]
      });
      return;
    }

    html += `<div class="roll-line">Attack Roll: ${total} (d20=${d20})</div>`;

    /* Show subsystem penalty if applicable */
    if (hitContext?.subsystemPenalty) {
      const penaltyDisplay = hitContext.subsystemPenalty > 0 ? `+${hitContext.subsystemPenalty}` : `${hitContext.subsystemPenalty}`;
      html += `<div class="subsystem-penalty-line"><em>Subsystem Penalty: ${penaltyDisplay}</em></div>`;
    }

    if (target) {
      html += `
        <div class="target-line">Target: ${target.name}</div>
        <div class="def-line">Defense: ${hitContext.defenseValue}</div>
        <div class="hit-line">${hit ? '✔ HIT' : '✘ MISS'}</div>
      `;
      if (critThreat && hit) {html += `<div class="crit-threat">⚠ Critical Threat!</div>`;}
      if (hit) {
        html += `
          <button class="swse-roll-damage-btn"
                  data-attacker="${attacker.id}"
                  data-weapon="${weapon.id}"
                  data-target="${target.id}">
            Roll Damage
          </button>
        `;
      }
    }

    html += `</div>`;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      rolls: [roll]
    });
  }

  /**
   * Format and post a damage roll card to chat.
   * Displays: damage total, apply button.
   */
  static async _createDamageCard(result) {
    const { attacker, target, weapon, roll, total } = result;

    let html = `
      <div class="swse-damage-card">
        <h3>${weapon.name} Damage</h3>
        <div class="roll-line">Damage: ${total}</div>
    `;

    if (target) {
      html += `
        <button class="swse-apply-damage-btn"
                data-attacker="${attacker.id}"
                data-target="${target.id}"
                data-weapon="${weapon.id}"
                data-amount="${total}">
          Apply Damage
        </button>
      `;
    }

    html += `</div>`;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      rolls: [roll]
    });
  }

  /* -------------------------------------------- */
  /* FEAT-DRIVEN MULTI-ATTACK LOGIC               */
  /* -------------------------------------------- */

  /**
   * Perform full attack with multi-attack feat penalties.
   * Checks for Double Attack and Triple Attack feats.
   *
   * @param {Function} rollAttackFn - Function to call for each attack
   * @param {Actor} attacker
   * @param {Item} weapon
   * @param {Actor} target
   * @param {Object} opts
   */
  static async performFullAttack(rollAttackFn, attacker, weapon, target, opts = {}) {
    const attacks = [];

    const doubleFeat = attacker.items.find(i =>
      i.type === 'feat' && i.name.toLowerCase().includes('double attack')
    );
    const tripleFeat = attacker.items.find(i =>
      i.type === 'feat' && i.name.toLowerCase().includes('triple attack')
    );

    let count = 1;
    let penalty = 0;

    if (doubleFeat) { count = 2; penalty = -5; }
    if (tripleFeat && doubleFeat) { count = 3; penalty = -10; }

    for (let i = 0; i < count; i++) {
      const r = await rollAttackFn(attacker, weapon, target, { ...opts, multipleAttackPenalty: penalty });
      attacks.push(r);
      if (i < count - 1) {await new Promise(r => setTimeout(r, 300));}
    }

    return { attacks, count, penalty };
  }

  /* -------------------------------------------- */
  /* DAMAGE ROLLING UI                            */
  /* -------------------------------------------- */

  /**
   * Roll damage separately (for manual damage rolling UI flow).
   * Used by chat buttons to roll damage after attack roll.
   * Note: CombatEngine.resolveAttack() already applies damage if hit.
   *
   * @param {Actor} attacker
   * @param {Item} weapon
   * @param {Actor} target
   * @param {Object} opts
   */
  static async rollDamageUI(attacker, weapon, target, opts = {}) {
    const { computeDamageBonus } = await import('../utils/combat-utils.js');
    const { RollEngine } = globalThis.SWSE;

    const dmgBonus = computeDamageBonus(attacker, weapon);
    const base = weapon.system?.damage ?? '1d6';
    const formula = `${base} + ${dmgBonus}`;
    const roll = await RollEngine.safeRoll(formula).evaluate({ async: true });

    const result = {
      attacker,
      weapon,
      target,
      roll,
      total: roll.total,
      formula,
      applied: false
    };

    await this._createDamageCard(result);
    return result;
  }

  /**
   * Apply damage from UI button.
   * Routes through DamageSystem which ensures proper mutation handling.
   *
   * @param {string} attackerId
   * @param {string} targetId
   * @param {string} weaponId
   * @param {number} amount
   */
  static async applyDamageUI(attackerId, targetId, weaponId, amount) {
    const attacker = game.actors.get(attackerId);
    const target = game.actors.get(targetId);
    if (!attacker || !target) {return;}

    if (!(game.user.isGM || attacker.isOwner)) {
      return ui.notifications.warn('You do not have permission to apply this damage.');
    }

    await DamageSystem.applyToSelected(amount, { checkThreshold: true });
  }

  /* -------------------------------------------- */
  /* CHAT EVENT INTEGRATION                       */
  /* -------------------------------------------- */

  /**
   * Register chat message button listeners.
   * Hooks into Foundry's renderChatMessageHTML to attach click handlers.
   */
  static registerChatListeners() {
    Hooks.on('renderChatMessageHTML', (msg, html, user) => {
      /* Roll Damage button */
      html.querySelector('.swse-roll-damage-btn')?.addEventListener('click', async ev => {
        const btn = ev.currentTarget;
        const attacker = game.actors.get(btn.dataset.attacker);
        const weapon = attacker?.items.get(btn.dataset.weapon);
        const target = game.actors.get(btn.dataset.target);
        if (attacker && weapon && target) {
          await CombatUIAdapter.rollDamageUI(attacker, weapon, target);
        }
      });

      /* Apply Damage button */
      html.querySelector('.swse-apply-damage-btn')?.addEventListener('click', async ev => {
        const btn = ev.currentTarget;
        await CombatUIAdapter.applyDamageUI(
          btn.dataset.attacker,
          btn.dataset.target,
          btn.dataset.weapon,
          parseInt(btn.dataset.amount, 10)
        );
      });
    });
  }
}
