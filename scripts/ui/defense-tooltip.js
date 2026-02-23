/**
 * Defense Breakdown Tooltip System
 *
 * Displays comprehensive modifier breakdown for defense values on hover.
 * Shows all sources contributing to final defense calculation:
 * - Base calculation (10 + abilities + class + misc)
 * - Armor modifiers
 * - Encumbrance penalties
 * - Condition modifiers
 * - Talent bonuses
 * - Special effects (dex loss, etc.)
 */

import { SWSELogger as swseLogger } from '../utils/logging.js';

export class DefenseTooltip {
  /**
   * Initialize defense tooltips on character sheet
   * @param {Actor} actor - Character actor
   * @param {HTMLElement} container - Container with defense elements
   */
  static initTooltips(actor, container) {
    if (!container) return;

    // Find all defense value elements
    const defenseElements = container.querySelectorAll('[data-defense-breakdown]');

    defenseElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        this.showTooltip(actor, element);
      });

      element.addEventListener('mouseleave', () => {
        this.hideTooltip(element);
      });

      // Click to toggle tooltip on mobile
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const tooltip = element.querySelector('.defense-breakdown-tooltip');
        if (tooltip?.classList.contains('show')) {
          this.hideTooltip(element);
        } else {
          this.showTooltip(actor, element);
        }
      });
    });
  }

  /**
   * Show defense breakdown tooltip
   * @private
   */
  static showTooltip(actor, element) {
    if (!actor) return;

    const defenseKey = element.dataset.defenseBreakdown;
    if (!defenseKey) return;

    // Get existing tooltip or create new one
    let tooltip = element.querySelector('.defense-breakdown-tooltip');
    if (!tooltip) {
      const data = this.getDefenseBreakdown(actor, defenseKey);
      tooltip = this.createTooltipElement(data, defenseKey);
      element.appendChild(tooltip);
    }

    tooltip.classList.add('show');
    this.positionTooltip(tooltip, element);
  }

  /**
   * Hide defense breakdown tooltip
   * @private
   */
  static hideTooltip(element) {
    const tooltip = element.querySelector('.defense-breakdown-tooltip');
    if (tooltip) {
      tooltip.classList.remove('show');
    }
  }

  /**
   * Create tooltip HTML element with breakdown data
   * @private
   */
  static createTooltipElement(data, defenseKey) {
    const div = document.createElement('div');
    div.className = `defense-breakdown-tooltip ${defenseKey}-breakdown show`;
    div.dataset.defense = defenseKey;
    div.innerHTML = this.generateTooltipHTML(data, defenseKey);
    return div;
  }

  /**
   * Generate tooltip HTML from breakdown data
   * @private
   */
  static generateTooltipHTML(data, defenseKey) {
    let html = `
      <div class="tooltip-header">
        <h4>${data.label} Defense Breakdown</h4>
        <span class="total-value">Total: ${data.totalValue}</span>
      </div>

      <div class="breakdown-section base-calculation">
        <h5 class="section-title">Base Calculation</h5>
        <div class="calc-item">
          <span class="item-source">Base</span>
          <span class="item-value">10</span>
        </div>
    `;

    if (data.halfLevel) {
      html += `
        <div class="calc-item">
          <span class="item-source">½ Level</span>
          <span class="item-value">+${data.halfLevel}</span>
        </div>
      `;
    }

    if (data.abilityMod) {
      html += `
        <div class="calc-item">
          <span class="item-source">Ability Mod</span>
          <span class="item-value">${data.abilityMod > 0 ? '+' : ''}${data.abilityMod}</span>
        </div>
      `;
    }

    if (data.classBonus) {
      html += `
        <div class="calc-item">
          <span class="item-source">Class Bonus</span>
          <span class="item-value">+${data.classBonus}</span>
        </div>
      `;
    }

    if (data.miscMod) {
      html += `
        <div class="calc-item">
          <span class="item-source">Miscellaneous</span>
          <span class="item-value">${data.miscMod > 0 ? '+' : ''}${data.miscMod}</span>
        </div>
      `;
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
          <h5 class="section-title">Active Modifiers (${data.modifiers.length})</h5>
      `;

      data.modifiers.forEach(mod => {
        const valueClass = mod.value > 0 ? 'positive' : mod.value < 0 ? 'negative' : 'neutral';
        html += `
          <div class="modifier-item ${mod.source} ${mod.type}">
            <span class="modifier-source" title="${mod.sourceName}">${mod.sourceName}</span>
            <span class="modifier-value ${valueClass}">${mod.value > 0 ? '+' : ''}${mod.value}</span>
            ${mod.description ? `<span class="modifier-description">${mod.description}</span>` : ''}
          </div>
        `;
      });

      html += `</div>`;
    }

    // Special effects section
    if (data.specialEffects && data.specialEffects.length > 0) {
      html += `
        <div class="breakdown-section special-effects">
          <h5 class="section-title">Special Effects</h5>
      `;

      data.specialEffects.forEach(effect => {
        html += `
          <div class="effect-item ${effect.type}">
            <span class="effect-name">${effect.name}</span>
            ${effect.description ? `<span class="effect-description">${effect.description}</span>` : ''}
          </div>
        `;
      });

      html += `</div>`;
    }

    // Final total
    html += `
      <div class="breakdown-section final-total">
        <div class="total-calculation">
          <span class="label">Final Defense Value:</span>
          <span class="value">${data.totalValue}</span>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Get defense breakdown data from actor
   * @private
   */
  static getDefenseBreakdown(actor, defenseKey) {
    const system = actor.system;
    const defenseMap = {
      'reflex': { key: 'ref', label: 'Reflex', abilityKey: 'dex' },
      'fort': { key: 'fort', label: 'Fortitude', abilityKey: 'str' },
      'will': { key: 'will', label: 'Will', abilityKey: 'wis' }
    };

    const defenseInfo = defenseMap[defenseKey];
    if (!defenseInfo) return null;

    const defense = system.defenses?.[defenseInfo.key] || {};
    const abilityMod = system.attributes?.[defenseInfo.abilityKey]?.mod || 0;
    const halfLevel = Math.floor((system.level || 1) / 2);
    const classBonus = defense.classBonus || 0;
    const miscMod = defense.miscMod || 0;

    // Calculate subtotal
    const subtotal = 10 + halfLevel + abilityMod + classBonus + miscMod;

    // Get modifiers from ModifierEngine
    const modifierTarget = `defense.${defenseInfo.key}`;
    const modifiers = this.getModifiersForTarget(actor, modifierTarget);

    // Get total including modifiers
    const totalValue = defense.total || subtotal;

    return {
      label: defenseInfo.label,
      key: defenseInfo.key,
      halfLevel,
      abilityMod,
      classBonus,
      miscMod,
      subtotal,
      modifiers,
      totalValue,
      specialEffects: this.getSpecialEffects(actor, defenseKey)
    };
  }

  /**
   * Get all modifiers affecting a specific defense target
   * @private
   */
  static getModifiersForTarget(actor, target) {
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
   * Get special effects affecting defense (e.g., dex loss from encumbrance)
   * @private
   */
  static getSpecialEffects(actor, defenseKey) {
    const effects = [];

    // Check for encumbrance dex loss
    if (actor.system.derived?.encumbrance?.removeDexToReflex && defenseKey === 'reflex') {
      effects.push({
        type: 'penalty',
        name: 'Dex Loss (Encumbrance)',
        description: 'Heavy load or overencumbered removes Dex bonus to Reflex'
      });
    }

    // Check for condition track penalties
    if (actor.system.conditionTrack?.penalty > 0) {
      effects.push({
        type: 'penalty',
        name: 'Condition Track',
        description: `−${actor.system.conditionTrack.penalty} all defenses`
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

export default DefenseTooltip;
