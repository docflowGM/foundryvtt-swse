/**
 * Combat Panel Manager — Attack Card Management & Weapon Integration
 *
 * Manages combat tab attack cards with:
 * - Flip card animation for breakdowns
 * - Weapon system integration
 * - Attack/damage tooltips from WeaponsEngine
 * - Roll action handling
 */

import { SWSELogger as swseLogger } from '../utils/logging.js';
import WeaponTooltip from './weapon-tooltip.js';

export class CombatPanelManager {
  /**
   * Initialize combat panel on character sheet
   * @param {Actor} actor - Character actor
   * @param {HTMLElement} container - Combat panel container
   */
  static initCombatPanel(actor, container) {
    if (!container) return;

    // Setup attack card handlers
    const attackCards = container.querySelectorAll('.swse-attack-card');
    attackCards.forEach(card => {
      this._setupAttackCard(actor, card);
    });

    // Initialize weapon tooltips in combat panel
    WeaponTooltip.initTooltips(actor, container);

    swseLogger.debug(`[CombatPanelManager] Initialized ${attackCards.length} attack cards`);
  }

  /**
   * Setup individual attack card handlers
   * @private
   */
  static _setupAttackCard(actor, card) {
    const attackId = card.dataset.attackId;

    // Flip animation on card click
    const cardInner = card.querySelector('.card-inner');
    if (cardInner) {
      cardInner.addEventListener('click', (e) => {
        // Don't flip if clicking button
        if (e.target.closest('button')) return;

        card.classList.toggle('flipped');
      });
    }

    // Roll button handler
    const rollBtn = card.querySelector('.attack-roll-btn');
    if (rollBtn) {
      rollBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._rollAttack(actor, attackId, card);
      });
    }

    // Attack bonus tooltip (click for breakdown)
    const attackBonusEl = card.querySelector('[data-attack-breakdown]');
    if (attackBonusEl) {
      attackBonusEl.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.add('flipped');
      });
    }

    // Damage tooltip (click for breakdown)
    const damageEl = card.querySelector('[data-damage-breakdown]');
    if (damageEl) {
      damageEl.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.add('flipped');
      });
    }
  }

  /**
   * Handle attack roll
   * @private
   */
  static async _rollAttack(actor, attackId, card) {
    try {
      // Extract attack info from card for roll
      const attackBonus = card.querySelector('.attack-bonus');
      const bonusValue = attackBonus?.textContent || '0';

      const damageEl = card.querySelector('.attack-damage');
      const damageValue = damageEl?.textContent || '1d4';

      const attackName = card.querySelector('.attack-name')?.textContent || 'Attack';
      const weaponName = card.querySelector('.weapon-name')?.textContent || 'Unarmed';

      // Get weapon ID if available
      const weaponId = damageEl?.dataset.weaponId;
      const weapon = weaponId ? actor.items.get(weaponId) : null;

      // Create roll flavor
      const flavor = `<b>${attackName}</b> with ${weaponName}`;

      // Roll attack
      const attackRoll = new Roll(`d20 + ${bonusValue}`, actor.getRollData());
      const attackResult = await attackRoll.evaluate({ async: true });

      // Roll damage
      const damageRoll = new Roll(damageValue, actor.getRollData());
      const damageResult = await damageRoll.evaluate({ async: true });

      // Display attack roll
      attackResult.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `${flavor} — <b>Attack Roll</b>`
      });

      // Display damage roll (if attack hit on natural 20 or after confirmation)
      if (attackResult.total >= 20) {
        damageResult.toMessage({
          speaker: ChatMessage.getSpeaker({ actor }),
          flavor: `${flavor} — <b>Damage</b>`
        });
      }

      swseLogger.info(`[CombatPanelManager] Rolled attack: ${attackName} (${attackResult.total})`);
    } catch (err) {
      swseLogger.error(`[CombatPanelManager] Error rolling attack:`, err);
      ui.notifications.error(`Failed to roll attack: ${err.message}`);
    }
  }

  /**
   * Update attack cards with weapon data
   * Called when weapons are equipped/unequipped
   * @param {Actor} actor - Character actor
   * @param {HTMLElement} container - Combat panel container
   */
  static updateAttackCardsWithWeapons(actor, container) {
    if (!container) return;

    const attackCards = container.querySelectorAll('.swse-attack-card');

    attackCards.forEach(card => {
      const weaponId = card.querySelector('[data-weapon-id]')?.dataset.weaponId;
      if (!weaponId) return;

      const weapon = actor.items.get(weaponId);
      if (!weapon || weapon.type !== 'weapon') return;

      // Update weapon info
      const weaponNameEl = card.querySelector('.weapon-name');
      if (weaponNameEl) {
        weaponNameEl.textContent = weapon.name;
      }

      const weaponTypeEl = card.querySelector('.weapon-type');
      if (weaponTypeEl) {
        weaponTypeEl.textContent = `(${weapon.system?.meleeOrRanged || 'melee'})`;
      }

      // Update weapon properties
      const propertiesContainer = card.querySelector('.attack-tags');
      if (propertiesContainer) {
        // Remove old property tags
        propertiesContainer.querySelectorAll('.property-tag').forEach(tag => tag.remove());

        // Add new property tags from weapon
        const props = weapon.system?.weaponProperties || {};
        const propertyEntries = [
          ['flaming', 'Flaming'],
          ['frost', 'Frost'],
          ['shock', 'Shock'],
          ['vorpal', 'Vorpal']
        ];

        for (const [key, label] of propertyEntries) {
          if (props[key] === true) {
            const tag = document.createElement('span');
            tag.className = 'tag property-tag';
            tag.textContent = label;
            propertiesContainer.appendChild(tag);
          }
        }
      }

      swseLogger.debug(`[CombatPanelManager] Updated attack card with weapon: ${weapon.name}`);
    });
  }

  /**
   * Get attack card for a weapon
   * Finds the attack card that uses a specific weapon
   * @param {string} weaponId - Weapon item ID
   * @param {HTMLElement} container - Combat panel container
   * @returns {HTMLElement|null}
   */
  static getAttackCardForWeapon(weaponId, container) {
    if (!container) return null;

    const cards = container.querySelectorAll('[data-weapon-id]');
    for (const card of cards) {
      if (card.dataset.weaponId === weaponId) {
        return card.closest('.swse-attack-card');
      }
    }

    return null;
  }
}

export default CombatPanelManager;
