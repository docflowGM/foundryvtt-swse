/**
 * Dark Side Talent Macros
 * Provides macro-callable functions for Dark Side talent mechanics
 * Register these in macro-functions.js to make them available in hotbars
 */

import DarkSideTalentMechanics from './dark-side-talent-mechanics.js';
import { SWSELogger } from '../utils/logger.js';
import { createChatMessage } from '../core/document-api-v13.js';

export class DarkSideTalentMacros {

  /**
   * Macro: Trigger Swift Power for current Force Power
   * Usage: game.swse.macros.triggerSwiftPowerMacro(actor)
   */
  static async triggerSwiftPowerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Swift Power');
      return;
    }

    if (!DarkSideTalentMechanics.hasSwiftPower(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Swift Power talent`);
      return;
    }

    // Show dialog to select which Force Power to use as swift action
    const forcePowers = selectedActor.items.filter(item => item.type === 'forcepower');

    if (forcePowers.length === 0) {
      ui.notifications.warn(`${selectedActor.name} has no Force Powers`);
      return;
    }

    const powerOptions = forcePowers
      .map(p => `<option value="${p.id}">${p.name}${p.system?.spent ? ' (Spent)' : ' (Ready)'}</option>`)
      .join('');

    const dialog = new Dialog({
      title: 'Swift Power - Select Force Power',
      content: `
        <div class="form-group">
          <label>Select a Force Power to use as a Swift Action:</label>
          <select id="power-select" style="width: 100%;">
            ${powerOptions}
          </select>
          <p class="hint-text" style="margin-top: 10px;">
            <i class="fas fa-circle-info"></i>
            This can be used once per day. It allows using a Force Power that normally takes a Standard or Move action as a Swift Action instead.
          </p>
        </div>
      `,
      buttons: {
        use: {
          label: 'Use as Swift Action',
          callback: async (html) => {
            const powerId = (html?.[0] ?? html)?.querySelector('#power-select')?.value;
            const power = selectedActor.items.get(powerId);

            const success = await DarkSideTalentMechanics.triggerSwiftPower(selectedActor, power);
            if (success) {
              await createChatMessage({
                speaker: { actor: selectedActor },
                content: `<h3><img src="icons/svg/item-bag.svg" style="width: 20px; height: 20px;"> Swift Power</h3>
                          <p><strong>${selectedActor.name}</strong> uses ${power.name} as a <strong>Swift Action</strong> instead of a Standard or Move Action!</p>`,
                flavor: 'Swift Power - Talent Effect'
              });
            }
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    });

    dialog.render(true);
  }

  /**
   * Macro: Trigger Dark Side Savant
   * Usage: game.swse.macros.triggerDarkSideSavantMacro(actor)
   */
  static async triggerDarkSideSavantMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Dark Side Savant');
      return;
    }

    Hooks.callAll('darkSideSavantTriggered', selectedActor);
  }

  /**
   * Macro: Apply Wrath of the Dark Side damage
   * Call at start of damaged character's turn
   * Usage: game.swse.macros.applyWrathOfDarkSideMacro(token)
   */
  static async applyWrathOfDarkSideMacro(token = null) {
    const selectedToken = token || canvas.tokens.controlled[0];

    if (!selectedToken) {
      ui.notifications.error('Please select a token to check for Wrath damage');
      return;
    }

    await DarkSideTalentMechanics.applyWrathDamageAtTurnStart(selectedToken);
  }

  /**
   * Helper: Show Dark Side Savant power selection dialog
   * Called when Wrath of the Dark Side should trigger during Force Power use
   */
  static async showDarkSideSavantDialog(actor, powers) {
    return new Promise((resolve) => {
      const powerOptions = powers
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join('');

      const dialog = new Dialog({
        title: 'Dark Side Savant - Select Power',
        content: `
          <div class="form-group">
            <label>Choose a Dark Side Force Power to return (no Force Point cost):</label>
            <select id="power-select" style="width: 100%;">
              ${powerOptions}
            </select>
          </div>
        `,
        buttons: {
          select: {
            label: 'Return to Suite',
            callback: (html) => {
              resolve((html?.[0] ?? html)?.querySelector('#power-select')?.value);
            }
          },
          cancel: {
            label: 'Cancel',
            callback: () => {
              resolve(null);
            }
          }
        },
        default: 'select'
      });

      dialog.render(true);
    });
  }
}

// ============================================================================
// EXPORT FOR GLOBAL ACCESS
// ============================================================================

window.SWSE = window.SWSE || {};
window.SWSE.macros = window.SWSE.macros || {};
window.SWSE.macros.triggerSwiftPowerMacro = DarkSideTalentMacros.triggerSwiftPowerMacro.bind(DarkSideTalentMacros);
window.SWSE.macros.triggerDarkSideSavantMacro = DarkSideTalentMacros.triggerDarkSideSavantMacro.bind(DarkSideTalentMacros);
window.SWSE.macros.applyWrathOfDarkSideMacro = DarkSideTalentMacros.applyWrathOfDarkSideMacro.bind(DarkSideTalentMacros);

export default DarkSideTalentMacros;
