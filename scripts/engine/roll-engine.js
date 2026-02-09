// scripts/engine/roll-engine.js
import { swseLogger } from '../utils/logger.js';
import { createChatMessage } from '../core/document-api-v13.js';

export const RollEngine = {
  /**
   * Rolls a formula and evaluates it (async safe)
   * @param {string} formula - Roll formula, e.g., "1d20+3"
   * @param {object} data - Data context for the roll
   * @returns {Promise<Roll|null>} Evaluated Roll or null if error
   */
  async safeRoll(formula, data = {}) {
    try {
      const roll = new Roll(formula, data);
      await roll.evaluate(); // ✅ v13-compatible, async evaluation
      return roll;
    } catch (err) {
      swseLogger.error('RollEngine.safeRoll failed', formula, err);
      ui.notifications?.error?.('A roll failed; check console.');
      return null;
    }
  },

  /**
   * Sends a roll to chat
   * @param {Roll} roll - The evaluated roll
   * @param {object} chatData - Optional chat message data
   * @returns {Promise<ChatMessage|null>}
   */
  async rollToChat(roll, chatData = {}) {
    if (!roll) {return null;}
    try {
      const content = await roll.render();
      const message = foundry.utils.mergeObject(
        {
          user: game.user?.id,
          speaker: chatData.speaker || ChatMessage.getSpeaker(),
          content,
          flavor: chatData.flavor || '',
          flags: { swse: { roll: true } }
        },
        chatData,
        { inplace: false }
      );
      return createChatMessage(message);
    } catch (err) {
      swseLogger.error('RollEngine.rollToChat failed', err);
      return null;
    }
  },

  /**
   * Rolls an attack and sends to chat
   * @param {Actor} actor
   * @param {Item} item
   * @param {object} data
   */
  async rollAttack(actor, item, data = {}) {
    const formula = item?.system?.attack?.formula || data.formula || '1d20';
    const roll = await this.safeRoll(formula, data);
    if (roll) {
      await this.rollToChat(roll, {
        speaker: ChatMessage.getSpeaker({ actor: actor?.id }),
        flavor: `Attack: ${item?.name || ''}`
      });
    }
    return roll;
  },

  /**
   * Rolls a skill and sends to chat
   * @param {Actor} actor
   * @param {string} skillKey
   * @param {object} data
   */
  async rollSkill(actor, skillKey, data = {}) {
    const formula = data.formula || '1d20';
    const roll = await this.safeRoll(formula, data);
    if (roll) {
      await this.rollToChat(roll, {
        speaker: ChatMessage.getSpeaker({ actor: actor?.id }),
        flavor: `Skill: ${skillKey}`
      });
    }
    return roll;
  },

  /**
   * Enhanced Skill Check (full breakdown, metadata, DC compare)
   * actor: Actor
   * skillKey: string
   * options: {
   *    dc: number|string|null,
   *    abilityMod: number,
   *    breakdown: object,
   *    action: object (optional)
   * }
   */
  async skillCheck(actor, skillKey, options = {}) {
    try {
      const sys = actor.system.skills?.[skillKey];
      if (!sys) {
        ui.notifications.warn(`Skill '${skillKey}' not found on actor.`);
        return;
      }

      const ability = options.abilityMod ?? sys.abilityMod ?? 0;
      const trained = sys.trained ? 5 : 0;
      const focus = sys.focused ? 5 : 0;
      const misc = sys.miscMod ?? 0;
      const halfLevel = actor.system.halfLevel ?? 0;

      const totalMod = ability + trained + focus + misc + halfLevel;

      const roll = await this.safeRoll('1d20 + ' + totalMod, {});

      if (!roll) {return;}

      const breakdown = {
        '1d20': roll.results?.[0]?.result ?? roll.total,
        'Ability': ability,
        'Half Level': halfLevel,
        'Trained': trained,
        'Focus': focus,
        'Misc': misc,
        'Total Mod': totalMod,
        '_rawFormula': '1d20 + ' + totalMod
      };

      const dcResult = this.compareDC(roll.total, options.dc);

      const card = await this.createHoloChatCard({
        title: `Skill Check: ${skillKey}`,
        actor,
        roll,
        breakdown,
        dc: options.dc ?? null,
        dcResult,
        action: options.action ?? null
      });

      createChatMessage({
        user: game.user?.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: card,
        flavor: `Skill Check: ${skillKey}`
      });

      return roll;

    } catch (err) {
      swseLogger.error('Enhanced skillCheck failed', err);
    }
  },

  /**
   * Compare roll vs DC
   * Returns:
   *   { success: boolean, margin: number, dc: number|null }
   */
  compareDC(total, dc) {
    if (!dc || typeof dc === 'string') {return { success: null, margin: null, dc };}
    const margin = total - dc;
    return { success: margin >= 0, margin, dc };
  },

  /**
   * Creates a compact SWSE holo chat card
   */
  async createHoloChatCard({ title, actor, roll, breakdown, dc, dcResult, action }) {

    const breakdownHtml = Object.entries(breakdown)
      .filter(([k]) => !k.startsWith('_'))
      .map(([label, val]) =>
        `<tr><td>${label}</td><td>${val}</td></tr>`
      )
      .join('');

    const dcHtml = dc
      ? `<tr><td>DC</td><td>${dc}</td></tr>`
      : '';

    const resultHtml = dcResult && dcResult.success != null
      ? `<tr><td>Result</td><td>${dcResult.success ? 'Success' : 'Failure'}
           ${dcResult.margin != null ? `(Δ ${dcResult.margin})` : ''}
         </td></tr>`
      : '';

    const actionHtml = action
      ? `<div class="swse-holo-action-meta">
           <strong>Action:</strong> ${action.name}<br>
           ${action.time ? `<strong>Time:</strong> ${action.time}<br>` : ''}
           ${action.effect ? `<strong>Effect:</strong> ${action.effect}` : ''}
         </div>`
      : '';

    return `
    <div class="swse-holo-card">
      <div class="swse-holo-header">
        <i class="fas fa-dice-d20"></i> ${title}
      </div>

      ${actionHtml}

      <table class="swse-holo-breakdown">
        <tbody>
          ${breakdownHtml}
          ${dcHtml}
          ${resultHtml}
        </tbody>
      </table>

      <div class="swse-holo-total">
        Total: ${roll.total}
      </div>
    </div>`;
  },

  /**
   * Opposed Rolls
   */
  async rollOpposed(actor, skillKey, opponent, oppSkillKey) {
    const myRoll = await this.skillCheck(actor, skillKey, {});
    const oppRoll = await this.skillCheck(opponent, oppSkillKey, {});

    if (!myRoll || !oppRoll) {return null;}

    const result = myRoll.total - oppRoll.total;

    createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="swse-holo-card">
          <div class="swse-holo-header">
            Opposed Check: ${skillKey} vs ${oppSkillKey}
          </div>
          <table class="swse-holo-breakdown">
            <tr><td>Your Roll</td><td>${myRoll.total}</td></tr>
            <tr><td>Opponent Roll</td><td>${oppRoll.total}</td></tr>
            <tr><td>Outcome</td><td>${result >= 0 ?
              `Success (+${result})` : `Failure (${result})`}</td></tr>
          </table>
        </div>
      `
    });

    return { myRoll, oppRoll, result };
  }
};
