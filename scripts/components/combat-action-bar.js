import { SWSEActiveEffectsManager } from '../combat/active-effects-manager.js';
import { SWSECombat } from '../combat/systems/enhanced-combat-system.js';
import { escapeHTML } from '../utils/security-utils.js';
import { createChatMessage } from '../core/document-api-v13.js';

/**
 * Modernized Combat Action Bar
 * - Modular action definitions
 * - Clean template rendering using foundry.js utilities
 * - Centralized action economy and effect logic
 * - Refresh-safe (no hook stacking)
 * - UI separated into template + CSS
 */
export class CombatActionBar {

  /** ------------------------------
   * PUBLIC API
   * ------------------------------ */

  static render(actor, targetElement) {
    const html = this._renderTemplate(actor);
    targetElement.innerHTML = html;

    // Activate listeners
    this._activateListeners(targetElement, actor);
  }

  static refresh(actor, targetElement) {
    this.render(actor, targetElement);
  }

  /** ------------------------------
   * TEMPLATE RENDERING
   * ------------------------------ */

  static _renderTemplate(actor) {
    const econ = actor.system.actionEconomy ?? {};
    const inCombat = game.combat?.combatants.some(c => c.actor?.id === actor.id);

    const effects = {
      fightingDefensively: actor.effects.some(e => e.flags?.swse?.combatAction === 'fighting-defensively'),
      totalDefense: actor.effects.some(e => e.flags?.swse?.combatAction === 'total-defense')
    };

    return `
      <div class="swse-action-bar">
        ${this._headerHTML(actor, inCombat)}
        ${this._economyHTML(econ)}
        ${this._quickActionsHTML(actor, econ, effects)}
        ${inCombat ? this._endTurnHTML() : ''}
      </div>`;
  }

  static _headerHTML(actor, inCombat) {
    return `
      <header class="swse-bar-header">
        <h3><i class="fa-solid fa-swords"></i> ${escapeHTML(actor.name)} — Combat</h3>
        ${inCombat ? `<span class="in-combat">In Combat</span>` : ''}
      </header>`;
  }

  static _economyHTML(econ) {
    return `
      <section class="swse-economy">
        ${this._economyIndicator('swift', econ.swift)}
        ${this._economyIndicator('move', econ.move)}
        ${this._economyIndicator('standard', econ.standard)}
        ${this._economyIndicator('full', econ.fullRound)}
        ${this._economyIndicator('reaction', econ.reaction)}
      </section>`;
  }

  static _economyIndicator(label, available) {
    return `
      <div class="econ ${available ? 'ready' : 'used'}" data-tooltip="${label}">
        <span>${label}</span>
      </div>`;
  }

  /** ----------------------------------------
   * ACTION GROUPS: ATTACK / DEFENSE / MOVE
   * ---------------------------------------- */

  static _quickActionsHTML(actor, econ, eff) {

    const hasWeapon = actor.items.some(i => i.type === 'weapon');

    return `
      <section class="swse-groups">

        <!-- ATTACK -->
        <div class="group">
          <h4>Attack</h4>
          <button class="swse-btn" data-action="attack"
            ${!econ.standard || !hasWeapon ? 'disabled' : ''}>
            <i class="fa-solid fa-sword"></i> Attack
          </button>

          <button class="swse-btn" data-action="full-attack"
            ${!econ.fullRound || !hasWeapon ? 'disabled' : ''}>
            <i class="fa-solid fa-swords"></i> Full Attack
          </button>
        </div>

        <!-- DEFENSE -->
        <div class="group">
          <h4>Defense</h4>

          <button class="swse-btn ${eff.fightingDefensively ? 'active' : ''}"
            data-action="fighting-defensively">
            <i class="fa-solid fa-shield-halved"></i> Fight Defensively
          </button>

          <button class="swse-btn ${eff.totalDefense ? 'active' : ''}"
            data-action="total-defense"
            ${!econ.standard ? 'disabled' : ''}>
            <i class="fa-solid fa-shield"></i> Total Defense
          </button>
        </div>

        <!-- MOVEMENT -->
        <div class="group">
          <h4>Movement</h4>

          <button class="swse-btn" data-action="move"
            ${!econ.move ? 'disabled' : ''}>
            <i class="fa-solid fa-person-running"></i> Move
          </button>

          <button class="swse-btn" data-action="charge"
            ${!econ.fullRound ? 'disabled' : ''}>
            <i class="fa-solid fa-horse-head"></i> Charge
          </button>
        </div>

        <!-- OTHER -->
        <div class="group">
          <h4>Other</h4>

          <button class="swse-btn" data-action="aid-another"
            ${!econ.standard ? 'disabled' : ''}>
            <i class="fa-solid fa-handshake"></i> Aid Another
          </button>

          <button class="swse-btn" data-action="second-wind"
            ${actor.system.secondWind?.uses < 1 || !econ.swift ? 'disabled' : ''}>
            <i class="fa-solid fa-heart-pulse"></i> Second Wind (${actor.system.secondWind?.uses}/1)
          </button>
        </div>

      </section>`;
  }

  static _endTurnHTML() {
    return `
      <section class="swse-end-turn">
        <button class="swse-btn end-turn" data-action="end-turn">
          <i class="fa-solid fa-forward"></i> End Turn
        </button>
      </section>`;
  }

  /** ------------------------------
   * INTERACTION HANDLERS
   * ------------------------------ */

  static _activateListeners(html, actor) {
    const buttons = (html?.[0] ?? html).querySelectorAll('button[data-action]');
    buttons.forEach(button => {
      button.addEventListener('click', async event => {
        const action = event.currentTarget.dataset.action;
        await this._dispatchAction(actor, action);
      });
    });
  }

  /** ------------------------------
   * MODULARIZED ACTION DISPATCHER
   * ------------------------------ */

  static async _dispatchAction(actor, action) {

    const map = {
      'attack': () => this._doAttack(actor),
      'full-attack': () => this._doFullAttack(actor),
      'fighting-defensively': () => this._toggleEffect(actor, 'fighting-defensively'),
      'total-defense': () => this._doTotalDefense(actor),
      'move': () => this._doMove(actor),
      'charge': () => this._doCharge(actor),
      'aid-another': () => this._aidAnother(actor),
      'second-wind': () => this._secondWind(actor),
      'end-turn': () => game.combat?.nextTurn()
    };

    return map[action]?.() ?? ui.notifications.warn(`Unknown action: ${action}`);
  }

  /** ------------------------------
   * CLEAN, MODULAR ACTION FUNCTIONS
   * ------------------------------ */

  static async _doAttack(actor) {
    const weapons = actor.items.filter(i => i.type === 'weapon');
    if (!weapons.length) {return ui.notifications.warn(`${escapeHTML(actor.name)} has no weapons.`);}

    let weapon = weapons[0];
    if (weapons.length > 1) {weapon = await this._weaponDialog(weapons);}

    const target = this._getTarget();
    await SWSECombat.rollAttack(actor, weapon, target);

    this._useAction(actor, 'standard');
  }

  static async _doFullAttack(actor) {
    const weapons = actor.items.filter(i => i.type === 'weapon');
    if (!weapons.length) {return ui.notifications.warn(`${escapeHTML(actor.name)} has no weapons.`);}

    const weapon = await this._weaponDialog(weapons);
    const target = this._getTarget();

    await SWSECombat.rollFullAttack(actor, weapon, target);

    this._useAction(actor, 'fullRound');
  }

  static async _toggleEffect(actor, effect) {
    await SWSEActiveEffectsManager.toggleCombatActionEffect(actor, effect);
  }

  static async _doTotalDefense(actor) {
    await SWSEActiveEffectsManager.applyCombatActionEffect(actor, 'total-defense');
    this._useAction(actor, 'standard');
  }

  static async _doMove(actor) {
    ui.notifications.info(`Move your token manually.`);
    this._useAction(actor, 'move');
  }

  static async _doCharge(actor) {
    await SWSEActiveEffectsManager.createCustomEffect(actor, {
      name: 'Charging',
      duration: { turns: 1 },
      changes: [
        { key: 'system.attackBonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 },
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 }
      ]
    });
    this._useAction(actor, 'fullRound');
  }

  static async _aidAnother(actor) {
    ui.notifications.info('Select ally to aid.');
    this._useAction(actor, 'standard');
  }

  static async _secondWind(actor) {
    const uses = actor.system.secondWind?.uses ?? 0;
    if (uses < 1) {return ui.notifications.warn('No Second Wind available.');}

    const level = actor.system.level ?? 1;
    const heal = 5 + Math.floor(level / 4) * 5;

    const newHP = Math.min(actor.system.hp.value + heal, actor.system.hp.max);

    await actor.update({
      'system.hp.value': newHP,
      'system.secondWind.uses': uses - 1
    });

    createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<b>${escapeHTML(actor.name)}</b> regains <strong>${heal}</strong> HP!`
    });

    this._useAction(actor, 'swift');
  }

  /** ------------------------------
   * UTILITIES
   * ------------------------------ */

  static _getTarget() {
    return Array.from(game.user.targets)[0]?.actor ?? null;
  }

  static _useAction(actor, kind) {
    const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id);
    return combatant?.useAction(kind);
  }

  static async _weaponDialog(weapons) {
    return await SWSEDialogV2.prompt({
      title: 'Choose Weapon',
      content: `
        <select name="weapon">
          ${weapons.map(w => `<option value="${w.id}">${escapeHTML(w.name)}</option>`).join('')}
        </select>`,
      callback: html => weapons.find(w => w.id === (html?.[0] ?? html)?.querySelector('select')?.value)
    });
  }
}
