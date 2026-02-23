/**
 * Weapon Damage Breakdown Tooltip System
 *
 * Displays comprehensive modifier breakdown for weapon damage/attack values on hover.
 * Shows all sources contributing to final calculations:
 * - Base damage calculation (dice + type)
 * - Attack bonus components (BAB, half level, ability, enhancement, proficiency)
 * - Damage bonus components (half level, ability, enhancement, two-handed, talents)
 * - All registered modifiers
 * - Weapon property effects
 */

import { SWSELogger as swseLogger } from '../utils/logging.js';
import WeaponsEngine from '../engines/combat/weapons-engine.js';

export class WeaponTooltip {
  /**
   * Initialize weapon tooltips on character sheet
   * @param {Actor} actor - Character actor
   * @param {HTMLElement} container - Container with weapon elements
   */
  static initTooltips(actor, container) {
    if (!container) return;

    // Find all weapon card elements
    const weaponCards = container.querySelectorAll('[data-weapon-id]');

    weaponCards.forEach(card => {
      const damageElements = card.querySelectorAll('[data-damage-breakdown]');
      const attackElements = card.querySelectorAll('[data-attack-breakdown]');

      damageElements.forEach(element => {
        this._setupTooltipListeners(actor, element, 'damage');
      });

      attackElements.forEach(element => {
        this._setupTooltipListeners(actor, element, 'attack');
      });
    });
  }

  /**
   * Setup hover/click listeners for tooltip
   * @private
   */
  static _setupTooltipListeners(actor, element, type) {
    element.addEventListener('mouseenter', () => {
      this.showTooltip(actor, element, type);
    });

    element.addEventListener('mouseleave', () => {
      this.hideTooltip(element);
    });

    // Click to toggle on mobile
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      const tooltip = element.querySelector('.weapon-breakdown-tooltip');
      if (tooltip?.classList.contains('show')) {
        this.hideTooltip(element);
      } else {
        this.showTooltip(actor, element, type);
      }
    });
  }

  /**
   * Show weapon breakdown tooltip
   * @param {Actor} actor - Actor wielding weapon
   * @param {HTMLElement} element - Trigger element
   * @param {string} type - 'damage' or 'attack'
   */
  static showTooltip(actor, element, type) {
    if (!actor) return;

    const weaponId = element.dataset.weaponId;
    if (!weaponId) return;

    const weapon = actor.items.get(weaponId);
    if (!weapon || weapon.type !== 'weapon') return;

    // Get existing tooltip or create new one
    let tooltip = element.querySelector('.weapon-breakdown-tooltip');
    if (!tooltip) {
      const data = type === 'damage'
        ? this.getDamageBreakdown(actor, weapon)
        : this.getAttackBreakdown(actor, weapon);

      tooltip = this.createTooltipElement(data, type);
      element.appendChild(tooltip);
    }

    tooltip.classList.add('show');
    this.positionTooltip(tooltip, element);
  }

  /**
   * Hide weapon breakdown tooltip
   * @param {HTMLElement} element - Trigger element
   */
  static hideTooltip(element) {
    const tooltip = element.querySelector('.weapon-breakdown-tooltip');
    if (tooltip) {
      tooltip.classList.remove('show');
    }
  }

  /**
   * Create tooltip HTML element
   * @private
   */
  static createTooltipElement(data, type) {
    const div = document.createElement('div');
    div.className = `weapon-breakdown-tooltip ${type}-breakdown show`;
    div.dataset.breakdown = type;
    div.innerHTML = this.generateTooltipHTML(data, type);
    return div;
  }

  /**
   * Generate tooltip HTML from breakdown data
   * @private
   */
  static generateTooltipHTML(data, type) {
    let html = `
      <div class="tooltip-header">
        <h4>${data.weaponName} — ${type === 'damage' ? 'Damage' : 'Attack'} Breakdown</h4>
        <span class="total-value">Total: ${data.total}</span>
      </div>

      <div class="breakdown-section base-calculation">
        <h5 class="section-title">Base Components</h5>
    `;

    // Base components
    for (const [source, value] of Object.entries(data.components)) {
      if (value !== 0) {
        const valueClass = value > 0 ? 'positive' : 'negative';
        html += `
          <div class="calc-item">
            <span class="item-source">${source}</span>
            <span class="item-value ${valueClass}">${value > 0 ? '+' : ''}${value}</span>
          </div>
        `;
      }
    }

    html += `
        <div class="calc-divider"></div>
        <div class="calc-item total">
          <span class="item-source">Subtotal</span>
          <span class="item-value">${data.subtotal}</span>
        </div>
      </div>
    `;

    // Modifiers section
    if (data.modifiers && data.modifiers.length > 0) {
      html += `
        <div class="breakdown-section modifier-breakdown">
          <h5 class="section-title">Modifiers (${data.modifiers.length})</h5>
      `;

      for (const mod of data.modifiers) {
        const valueClass = mod.value > 0 ? 'positive' : mod.value < 0 ? 'negative' : 'neutral';
        html += `
          <div class="modifier-item ${mod.source} ${mod.type}">
            <span class="modifier-source">${mod.sourceName}</span>
            <span class="modifier-value ${valueClass}">${mod.value > 0 ? '+' : ''}${mod.value}</span>
          </div>
        `;
      }

      html += `</div>`;
    }

    // Special properties section
    if (data.properties && data.properties.length > 0) {
      html += `
        <div class="breakdown-section properties">
          <h5 class="section-title">Properties</h5>
      `;

      for (const prop of data.properties) {
        html += `
          <div class="property-item">
            <span class="property-name">${prop.name}</span>
            <span class="property-effect">${prop.effect}</span>
          </div>
        `;
      }

      html += `</div>`;
    }

    // Final total
    html += `
      <div class="breakdown-section final-total">
        <div class="total-calculation">
          <span class="label">Final ${type === 'damage' ? 'Damage' : 'Attack'} Bonus:</span>
          <span class="value">${data.total}</span>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Get damage bonus breakdown
   */
  static getDamageBreakdown(actor, weapon) {
    const breakdown = WeaponsEngine.getDamageBonusBreakdown(actor, weapon);

    // Get modifiers from ModifierEngine
    const modifiers = this._getModifiersForTarget(actor, 'damage.melee');

    // Get weapon properties effects
    const properties = this._getWeaponPropertyEffects(weapon);

    return {
      weaponName: weapon.name,
      baseDamage: WeaponsEngine.getBaseDamage(weapon),
      components: breakdown.components,
      subtotal: breakdown.total,
      total: breakdown.total + (modifiers.reduce((sum, m) => sum + m.value, 0)),
      modifiers: modifiers,
      properties: properties
    };
  }

  /**
   * Get attack bonus breakdown
   */
  static getAttackBreakdown(actor, weapon) {
    const breakdown = WeaponsEngine.getAttackBonusBreakdown(actor, weapon);

    // Get modifiers from ModifierEngine
    const modifiers = this._getModifiersForTarget(actor, 'attack.bonus');

    return {
      weaponName: weapon.name,
      components: breakdown.components,
      subtotal: breakdown.total,
      total: breakdown.total + (modifiers.reduce((sum, m) => sum + m.value, 0)),
      modifiers: modifiers,
      properties: []
    };
  }

  /**
   * Get modifiers for a specific target
   * @private
   */
  static _getModifiersForTarget(actor, target) {
    // Try to get modifiers from derived data if available
    const breakdown = actor.system.derived?.modifiers?.[target];
    if (breakdown && breakdown.modifiers) {
      return breakdown.modifiers.map(mod => ({
        sourceName: mod.description || mod.source,
        source: mod.source,
        type: mod.type,
        value: mod.value,
        description: mod.description
      }));
    }

    return [];
  }

  /**
   * Get weapon property effects
   * @private
   */
  static _getWeaponPropertyEffects(weapon) {
    const effects = [];
    const props = weapon.system?.weaponProperties || {};

    if (props.keen === true) {
      effects.push({
        name: 'Keen',
        effect: 'Crit range expanded by 1'
      });
    }

    if (props.flaming === true) {
      effects.push({
        name: 'Flaming',
        effect: '+1d6 fire damage'
      });
    }

    if (props.frost === true) {
      effects.push({
        name: 'Frost',
        effect: '+1d6 cold damage'
      });
    }

    if (props.shock === true) {
      effects.push({
        name: 'Shock',
        effect: '+1d6 sonic damage'
      });
    }

    if (props.vorpal === true) {
      effects.push({
        name: 'Vorpal',
        effect: 'On 20: instant kill'
      });
    }

    return effects;
  }

  /**
   * Position tooltip relative to trigger element
   * @private
   */
  static positionTooltip(tooltip, element) {
    const rect = element.getBoundingClientRect();

    // Default: bottom-left
    tooltip.style.top = `${rect.height + 4}px`;
    tooltip.style.left = '0';

    // Adjust if tooltip would go off-screen
    const tooltipRect = tooltip.getBoundingClientRect();

    if (tooltipRect.right > window.innerWidth) {
      tooltip.style.right = '0';
      tooltip.style.left = 'auto';
    }

    if (tooltipRect.bottom > window.innerHeight) {
      tooltip.style.top = 'auto';
      tooltip.style.bottom = `${rect.height + 4}px`;
    }
  }
}

export default WeaponTooltip;
