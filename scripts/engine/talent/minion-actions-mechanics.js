/**
 * Minion Actions Mechanics
 *
 * Rule-card helpers for Crime Lord / Privateer minion talents. These avoid
 * unsafe automation of targeting/adjacency while surfacing the correct rules,
 * linked minions, and computed class-level bonus.
 */

import { getHeroicLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

export default class MinionActionsMechanics {
  static TALENTS = [
    'Bodyguard I',
    'Bodyguard II',
    'Bodyguard III',
    'Shelter',
    'Wealth of Allies',
    'Shared Notoriety',
    'Frighten',
    'Fear Me'
  ];

  static hasAnyMinionTalent(actor) {
    return this.TALENTS.some(name => actor?.items?.some(i => i.type === 'talent' && i.name === name));
  }

  static hasTalent(actor, name) {
    return Boolean(actor?.items?.some(i => i.type === 'talent' && i.name === name));
  }

  static _classLevel(actor, className = 'Crime Lord') {
    const direct = Array.from(actor?.items || [])
      .filter(i => i.type === 'class' && String(i.name || '').toLowerCase() === className.toLowerCase())
      .reduce((sum, item) => sum + (Number(item.system?.level) || 0), 0);
    return direct || Number(getHeroicLevel(actor)) || Number(actor?.system?.level) || 1;
  }

  static _names(minions = []) {
    return minions.length
      ? `<details><summary>Linked minions (${minions.length})</summary><ul>${minions.map(m => `<li>${m.name}</li>`).join('')}</ul></details>`
      : '<p><em>No linked minions found.</em></p>';
  }

  static async _toChat(actor, title, bodyHtml) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="swse-minion-actions-card"><h3>${title}</h3>${bodyHtml}</div>`
    });
  }

  static async bodyguard(actor, minions = []) {
    const classLevel = this._classLevel(actor, 'Crime Lord');
    const hasII = this.hasTalent(actor, 'Bodyguard II');
    const hasIII = this.hasTalent(actor, 'Bodyguard III');
    const defenseBonus = hasIII ? classLevel : hasII ? Math.floor(classLevel / 2) : 0;
    await this._toChat(actor, 'Minion Talent: Bodyguard', `
      <p><strong>Trigger:</strong> Once per turn, when an attack would hit you and an attracted minion is adjacent.</p>
      <p><strong>Effect:</strong> Redirect the attack to the minion.</p>
      ${defenseBonus ? `<p><strong>Redirect defense bonus:</strong> +${defenseBonus} Reflex Defense for the minion against the redirected attack.</p>` : ''}
      ${hasIII ? '<p><strong>Bodyguard III:</strong> If the redirected attack hits, the minion may make a free attack against the attacker.</p>' : ''}
      <p><em>Manual:</em> Confirm adjacency, once-per-turn usage, and resolve the redirected attack.</p>
      ${this._names(minions)}
    `);
  }

  static async shelter(actor, minions = []) {
    await this._toChat(actor, 'Minion Talent: Shelter', `
      <p><strong>Effect:</strong> If you are adjacent to one of your minions, any cover bonus to your Reflex Defense increases by <strong>+2</strong>.</p>
      <p><em>Manual:</em> Confirm adjacency and cover, then apply the extra +2 Reflex bonus.</p>
      ${this._names(minions)}
    `);
  }

  static async wealthOfAllies(actor, minions = []) {
    await this._toChat(actor, 'Minion Talent: Wealth of Allies', `
      <p><strong>Effect:</strong> If one of your minions is killed, a replacement of the same level appears after <strong>24 hours</strong>.</p>
      <p><em>Manual:</em> Mark the lost minion and create/rename the replacement after the delay.</p>
      ${this._names(minions)}
    `);
  }

  static async sharedNotoriety(actor, minions = []) {
    await this._toChat(actor, 'Minion Talent: Shared Notoriety', `
      <p><strong>Effect:</strong> Your minions may reroll Persuasion checks made to intimidate, keeping the better result if your table uses that convention.</p>
      <p><em>Manual:</em> Apply this when a linked minion makes an Intimidate/Persuasion check.</p>
      ${this._names(minions)}
    `);
  }

  static async frighten(actor, minions = []) {
    await this._toChat(actor, 'Minion Talent: Frighten', `
      <p><strong>Use:</strong> Once per encounter.</p>
      <p><strong>Effect:</strong> Force all enemies to move 1 square away from one of your minions; this movement does not provoke attacks of opportunity.</p>
      <p><em>Manual:</em> Choose the minion origin, identify affected enemies, and move them 1 square.</p>
      ${this._names(minions)}
    `);
  }

  static async fearMe(actor, minions = []) {
    const heal = Number(getHeroicLevel(actor)) || Number(actor?.system?.level) || 1;
    await this._toChat(actor, 'Minion Talent: Fear Me', `
      <p><strong>Use:</strong> Once per encounter, when one of your minions moves down the condition track.</p>
      <p><strong>Effect:</strong> Reduce that minion by 1 additional step and restore <strong>${heal} hit points</strong>, unless the minion is at 0 hp.</p>
      <p><em>Manual:</em> Apply the condition-track change and healing to the chosen minion.</p>
      ${this._names(minions)}
    `);
  }
}
