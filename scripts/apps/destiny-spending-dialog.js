/**
 * Destiny Points Spending Dialog
 * Allows characters to select and spend Destiny Points on various effects
 */

import { DestinyEffects } from '../utils/destiny-effects.js';
import { SWSELogger } from '../utils/logger.js';

export class DestinySpendingDialog extends Dialog {

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

    const allEffects = DestinyEffects.getAllEffects();
    const html = this._buildEffectsList(allEffects);

    return new DestinySpendingDialog({
      title: `Spend Destiny Point - ${actor.name}`,
      content: html,
      actor,
      allEffects,
      buttons: {
        cancel: { label: 'Cancel' }
      },
      render: (html) => this._setupEventListeners(html, actor, allEffects)
    }).render(true);
  }

  /**
   * Build HTML for effects list
   */
  static _buildEffectsList(allEffects) {
    let html = '<div class="destiny-spending-dialog">';

    // Instant Effects Section
    html += '<div class="effects-section">';
    html += '<h3><i class="fas fa-bolt"></i> Instant Effects</h3>';
    html += '<div class="effects-list">';

    for (const [key, effect] of Object.entries(allEffects.instant)) {
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

    for (const [key, effect] of Object.entries(allEffects.timed)) {
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

  /**
   * Setup event listeners for effect selection
   */
  static _setupEventListeners(htmlElement, actor, allEffects) {
    const root = htmlElement[0];

    root.querySelectorAll('.effect-option').forEach(option => {
      option.addEventListener('click', async (evt) => {
        const effectKey = option.dataset.effectKey;
        await this._spendDestinyPoint(actor, effectKey, allEffects);

        // Close dialog
        const dialog = option.closest('.dialog');
        const cancelBtn = dialog?.querySelector('button[data-button="cancel"]');
        if (cancelBtn) {cancelBtn.click();}
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
  static async _spendDestinyPoint(actor, effectKey, allEffects) {
    // Use the actor's spendDestinyPoint method
    const success = await actor.spendDestinyPoint(effectKey, {
      effectLabel: this._getEffectLabel(effectKey, allEffects),
      reason: `spent a Destiny Point on ${this._getEffectLabel(effectKey, allEffects)}`
    });

    if (!success) {return;}

    // Trigger the effect
    try {
      await DestinyEffects.triggerEffect(actor, effectKey);
    } catch (err) {
      SWSELogger.error('Error triggering destiny effect:', err);
      ui.notifications.error('Error applying destiny effect.');
    }
  }

  /**
   * Get effect label for display
   */
  static _getEffectLabel(effectKey, allEffects) {
    return (
      allEffects.instant[effectKey]?.name ||
      allEffects.timed[effectKey]?.name ||
      effectKey
    );
  }
}

window.DestinySpendingDialog = DestinySpendingDialog;
