import { ProgressionEngine } from "../progression/engine/progression-engine.js";
/**
 * Combat Action Quick Bar Component
 * Provides quick access to common combat actions
 */

import { SWSEActiveEffectsManager } from '../combat/active-effects-manager.js';
import { SWSECombat } from '../combat/systems/enhanced-combat-system.js';

export class CombatActionBar {

  /**
   * Get the HTML template for the combat action bar
   * @param {Actor} actor - The actor this bar is for
   * @returns {string} HTML template
   */
  static getTemplate(actor) {
    const inCombat = game.combat?.combatants.find(c => c.actor?.id === actor.id);
    const actionEconomy = actor.system.actionEconomy || {};

    // Check active effects
    const hasFightingDefensively = actor.effects.find(e =>
      e.flags?.swse?.combatAction === 'fighting-defensively'
    );
    const hasTotalDefense = actor.effects.find(e =>
      e.flags?.swse?.combatAction === 'total-defense'
    );

    return `
      <div class="swse-combat-action-bar">
        <div class="action-bar-header">
          <h3><i class="fas fa-swords"></i> Combat Actions</h3>
          ${inCombat ? '<span class="in-combat-badge">In Combat</span>' : ''}
        </div>

        <div class="action-economy">
          <div class="action-indicator ${actionEconomy.swift ? 'available' : 'used'}" data-tooltip="Swift Action">
            <i class="fas fa-bolt"></i>
            <span>Swift</span>
          </div>
          <div class="action-indicator ${actionEconomy.move ? 'available' : 'used'}" data-tooltip="Move Action">
            <i class="fas fa-running"></i>
            <span>Move</span>
          </div>
          <div class="action-indicator ${actionEconomy.standard ? 'available' : 'used'}" data-tooltip="Standard Action">
            <i class="fas fa-hand-fist"></i>
            <span>Standard</span>
          </div>
          <div class="action-indicator ${actionEconomy.fullRound ? 'available' : 'used'}" data-tooltip="Full-Round Action">
            <i class="fas fa-circle-notch"></i>
            <span>Full</span>
          </div>
          <div class="action-indicator ${actionEconomy.reaction ? 'available' : 'used'}" data-tooltip="Reaction">
            <i class="fas fa-shield"></i>
            <span>Reaction</span>
          </div>
        </div>

        <div class="quick-actions">
          <div class="action-group">
            <h4>Attack Actions</h4>
            <button class="action-btn" data-action="attack" ${!actionEconomy.standard ? 'disabled' : ''}>
              <i class="fas fa-sword"></i>
              <span>Attack</span>
              <small>(Standard)</small>
            </button>
            <button class="action-btn" data-action="full-attack" ${!actionEconomy.fullRound ? 'disabled' : ''}>
              <i class="fas fa-swords"></i>
              <span>Full Attack</span>
              <small>(Full-Round)</small>
            </button>
          </div>

          <div class="action-group">
            <h4>Defensive Actions</h4>
            <button class="action-btn ${hasFightingDefensively ? 'active' : ''}"
                    data-action="fighting-defensively">
              <i class="fas fa-shield-halved"></i>
              <span>Fight Defensively</span>
              <small>(-5 attack, +2 Reflex)</small>
            </button>
            <button class="action-btn ${hasTotalDefense ? 'active' : ''}"
                    data-action="total-defense"
                    ${!actionEconomy.standard ? 'disabled' : ''}>
              <i class="fas fa-shield"></i>
              <span>Total Defense</span>
              <small>(Standard, +5 all defenses)</small>
            </button>
          </div>

          <div class="action-group">
            <h4>Movement</h4>
            <button class="action-btn" data-action="move" ${!actionEconomy.move ? 'disabled' : ''}>
              <i class="fas fa-person-running"></i>
              <span>Move</span>
              <small>(Move, up to speed)</small>
            </button>
            <button class="action-btn" data-action="charge" ${!actionEconomy.fullRound ? 'disabled' : ''}>
              <i class="fas fa-horse-head"></i>
              <span>Charge</span>
              <small>(Full-Round, +2 attack)</small>
            </button>
          </div>

          <div class="action-group">
            <h4>Other Actions</h4>
            <button class="action-btn" data-action="aid-another" ${!actionEconomy.standard ? 'disabled' : ''}>
              <i class="fas fa-handshake-angle"></i>
              <span>Aid Another</span>
              <small>(Standard, +2 bonus)</small>
            </button>
            <button class="action-btn" data-action="second-wind"
                    ${actor.system.secondWind?.uses < 1 || !actionEconomy.swift ? 'disabled' : ''}>
              <i class="fas fa-heart-pulse"></i>
              <span>Second Wind</span>
              <small>(Swift, ${actor.system.secondWind?.uses || 0}/1)</small>
            </button>
          </div>
        </div>

        ${inCombat ? `
          <div class="end-turn-section">
            <button class="action-btn end-turn-btn" data-action="end-turn">
              <i class="fas fa-circle-chevron-right"></i>
              <span>End Turn</span>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Activate event listeners for the combat action bar
   * @param {HTMLElement} html - The HTML element containing the action bar
   * @param {Actor} actor - The actor this bar is for
   */
  static activateListeners(html, actor) {
    html.find('.action-btn[data-action]').click(async (event) => {
      event.preventDefault();
      const button = event.currentTarget;
      const action = button.dataset.action;

      await this.handleAction(actor, action);
    });

    // Refresh the bar when active effects change
    Hooks.on('updateActor', (updatedActor, changes) => {
      if (updatedActor.id === actor.id) {
        this.refresh(html, actor);
      }
    });
  }

  /**
   * Handle a combat action
   * @param {Actor} actor - The actor performing the action
   * @param {string} action - The action being performed
   */
  static async handleAction(actor, action) {
    switch (action) {
      case 'attack':
        await this._handleAttack(actor);
        break;

      case 'full-attack':
        await this._handleFullAttack(actor);
        break;

      case 'fighting-defensively':
        await SWSEActiveEffectsManager.toggleCombatActionEffect(actor, 'fighting-defensively');
        break;

      case 'total-defense':
        await this._handleTotalDefense(actor);
        break;

      case 'move':
        await this._handleMove(actor);
        break;

      case 'charge':
        await this._handleCharge(actor);
        break;

      case 'aid-another':
        await this._handleAidAnother(actor);
        break;

      case 'second-wind':
        await this._handleSecondWind(actor);
        break;

      case 'end-turn':
        await this._handleEndTurn(actor);
        break;

      default:
        ui.notifications.warn(`Action "${action}" not implemented`);
    }
  }

  /**
   * Handle standard attack action
   * @private
   */
  static async _handleAttack(actor) {
    // Show weapon selection dialog
    const weapons = actor.items.filter(i => i.type === 'weapon');

    if (weapons.length === 0) {
      ui.notifications.warn(`${actor.name} has no weapons`);
      return;
    }

    let weapon;
    if (weapons.length === 1) {
      weapon = weapons[0];
    } else {
      // Show selection dialog
      const weaponOptions = weapons.map(w =>
        `<option value="${w.id}">${w.name}</option>`
      ).join('');

      const content = `
        <form>
          <div class="form-group">
            <label>Select Weapon:</label>
            <select name="weapon-id">${weaponOptions}</select>
          </div>
        </form>
      `;

      const weaponId = await Dialog.prompt({
        title: 'Select Weapon',
        content,
        callback: (html) => html.find('[name="weapon-id"]').val()
      });

      weapon = actor.items.get(weaponId);
    }

    if (weapon) {
      // Get target
      const targets = Array.from(game.user.targets);
      const target = targets.length > 0 ? targets[0].actor : null;

      await SWSECombat.rollAttack(actor, weapon, target);

      // Mark standard action as used
      const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id);
      if (combatant) {
        await combatant.useAction('standard');
      }
    }
  }

  /**
   * Handle full attack action
   * @private
   */
  static async _handleFullAttack(actor) {
    const weapons = actor.items.filter(i => i.type === 'weapon');

    if (weapons.length === 0) {
      ui.notifications.warn(`${actor.name} has no weapons`);
      return;
    }

    const weapon = weapons[0]; // Use first weapon for now
    const targets = Array.from(game.user.targets);
    const target = targets.length > 0 ? targets[0].actor : null;

    await SWSECombat.rollFullAttack(actor, weapon, target);

    // Mark full-round action as used
    const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id);
    if (combatant) {
      await combatant.useAction('fullRound');
    }
  }

  /**
   * Handle total defense action
   * @private
   */
  static async _handleTotalDefense(actor) {
    await SWSEActiveEffectsManager.applyCombatActionEffect(actor, 'total-defense');

    // Mark standard action as used
    const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id);
    if (combatant) {
      await combatant.useAction('standard');
    }
  }

  /**
   * Handle move action
   * @private
   */
  static async _handleMove(actor) {
    ui.notifications.info(`${actor.name} uses a move action (manually move token)`);

    // Mark move action as used
    const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id);
    if (combatant) {
      await combatant.useAction('move');
    }
  }

  /**
   * Handle charge action
   * @private
   */
  static async _handleCharge(actor) {
    ui.notifications.info(`${actor.name} charges! (+2 to attack, -2 to Reflex Defense until next turn)`);

    // Apply charge bonus (temporary)
    await SWSEActiveEffectsManager.createCustomEffect(actor, {
      name: 'Charging',
      icon: 'icons/svg/combat.svg',
      duration: { turns: 1 },
      changes: [
        { key: 'system.attackBonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 2 },
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 }
      ]
    });

    // Mark full-round action as used
    const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id);
    if (combatant) {
      await combatant.useAction('fullRound');
    }
  }

  /**
   * Handle aid another action
   * @private
   */
  static async _handleAidAnother(actor) {
    ui.notifications.info(`${actor.name} aids another! (Select ally to grant +2 bonus)`);

    // Mark standard action as used
    const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id);
    if (combatant) {
      await combatant.useAction('standard');
    }
  }

  /**
   * Handle second wind action
   * @private
   */
  static async _handleSecondWind(actor) {
    if (actor.system.secondWind?.uses < 1) {
      ui.notifications.warn(`${actor.name} has no Second Wind uses remaining`);
      return;
    }

    // Calculate healing
    const level = actor.system.level || 1;
    const healAmount = Math.floor(level / 4) * 5 + 5; // 5 + (1/4 level × 5)

    // Apply healing
    const currentHP = actor.system.hp.value;
    const maxHP = actor.system.hp.max;
    const newHP = Math.min(currentHP + healAmount, maxHP);

    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.hp.value': newHP,
      'system.secondWind.uses': actor.system.secondWind.uses - 1



    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor}),
      content: `<div class="swse-second-wind">
        <h3><i class="fas fa-heart-pulse"></i> Second Wind</h3>
        <p>${actor.name} regains ${healAmount} HP!</p>
        <p>HP: ${currentHP} → ${newHP}</p>
      </div>`
    });

    // Mark swift action as used
    const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id);
    if (combatant) {
      await combatant.useAction('swift');
    }
  }

  /**
   * Handle end turn action
   * @private
   */
  static async _handleEndTurn(actor) {
    if (game.combat) {
      await game.combat.nextTurn();
    }
  }

  /**
   * Refresh the combat action bar
   * @param {HTMLElement} html - The HTML element containing the action bar
   * @param {Actor} actor - The actor this bar is for
   */
  static refresh(html, actor) {
    const container = html.find('.swse-combat-action-bar').parent();
    if (container.length > 0) {
      container.html(this.getTemplate(actor));
      this.activateListeners(container, actor);
    }
  }
}
