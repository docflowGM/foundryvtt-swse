/**
 * Destiny Points Spending Dialog
 * Allows characters to select and spend Destiny Points on various effects
 * AppV2-based implementation
 */

import { DestinyEffects } from '../utils/destiny-effects.js';
import { SWSELogger } from '../utils/logger.js';

export class DestinySpendingDialog extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'destiny-spending-dialog',
    tag: 'div',
    window: { icon: 'fas fa-star', title: 'Spend Destiny Point' },
    position: { width: 500, height: 'auto' }
  };

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.allEffects = DestinyEffects.getAllEffects();
  }

  /**
   * Open the Destiny Points spending dialog for an actor
   */
  static async open(actor) {
    if (!actor.system.destiny?.hasDestiny) {
      ui.notifications.warn('This character does not have Destiny.');
      return;
    }

    if (actor.system.destiny.fulfilled) {
      ui.notifications.warn('This character\'s Destiny has been fulfilled.');
      return;
    }

    if (actor.system.destinyPoints.value <= 0) {
      ui.notifications.warn('No Destiny Points available.');
      return;
    }

    const dialog = new DestinySpendingDialog(actor, {
      window: { title: `Spend Destiny Point - ${actor.name}` }
    });
    dialog.render(true);
  }

  _renderHTML(context, options) {
    let html = '<div class="destiny-spending-dialog">';

    // Instant Effects Section
    html += '<div class="effects-section">';
    html += '<h3><i class="fas fa-bolt"></i> Instant Effects</h3>';
    html += '<div class="effects-list">';

    for (const [key, effect] of Object.entries(this.allEffects.instant)) {
      html += `
        <div class="effect-option" data-effect-key="${key}">
          <div class="effect-header">
            <i class="fas fa-circle"></i>
            <span class="effect-name">${effect.name}</span>
            <span class="effect-duration">${effect.duration}</span>
          </div>
          <p class="effect-description">${effect.description}</p>
        </div>
      `;
    }

    html += '</div></div>';

    // Timed Effects Section
    html += '<div class="effects-section">';
    html += '<h3><i class="fas fa-hourglass-end"></i> Timed Bonuses (24h)</h3>';
    html += '<div class="effects-list">';

    for (const [key, effect] of Object.entries(this.allEffects.timed)) {
      html += `
        <div class="effect-option" data-effect-key="${key}">
          <div class="effect-header">
            <i class="fas fa-star"></i>
            <span class="effect-name">${effect.name}</span>
            <span class="effect-duration">${effect.description.match(/\(24 hours?\)/i) || ''}</span>
          </div>
          <p class="effect-description">${effect.description}</p>
        </div>
      `;
    }

    html += '</div></div>';
    html += '</div>';

    return html;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.activateListeners();
  }

  /**
   * Setup event listeners for effect selection
   */
  activateListeners() {
    this.element?.querySelectorAll('.effect-option').forEach(option => {
      option.addEventListener('click', async (evt) => {
        const effectKey = option.dataset.effectKey;
        await this._spendDestinyPoint(effectKey);
        this.close();
      });

      // Visual feedback
      option.addEventListener('mouseenter', () => {
        option.classList.add('hover');
      });
      option.addEventListener('mouseleave', () => {
        option.classList.remove('hover');
      });
    });
  }

  /**
   * Spend a Destiny Point and trigger the selected effect
   */
  async _spendDestinyPoint(effectKey) {
    const effectLabel = this._getEffectLabel(effectKey);

    // Use the actor's spendDestinyPoint method
    const success = await this.actor.spendDestinyPoint(effectKey, {
      effectLabel,
      reason: `spent a Destiny Point on ${effectLabel}`
    });

    if (!success) {return;}

    // Trigger the effect
    try {
      await DestinyEffects.triggerEffect(this.actor, effectKey);
    } catch (err) {
      SWSELogger.error('Error triggering destiny effect:', err);
      ui.notifications.error('Error applying destiny effect.');
    }
  }

  /**
   * Get effect label for display
   */
  _getEffectLabel(effectKey) {
    return (
      this.allEffects.instant[effectKey]?.name ||
      this.allEffects.timed[effectKey]?.name ||
      effectKey
    );
  }
}

window.DestinySpendingDialog = DestinySpendingDialog;
