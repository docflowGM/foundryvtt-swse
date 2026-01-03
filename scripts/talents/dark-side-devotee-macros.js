/**
 * Dark Side Devotee Talent Macros
 * User-callable macro functions for Dark Side Devotee talents
 */

import DarkSideDevoteeMechanics from './dark-side-devotee-mechanics.js';
import { SWSELogger } from '../utils/logger.js';

export class DarkSideDevoteeMacros {

  /**
   * Macro: Activate Channel Aggression bonus damage
   * Usage: game.swse.macros.channelAggression()
   */
  static async channelAggressionMacro(actor = null, targetToken = null) {
    const selectedActor = actor || game.user.character;
    const selectedTarget = targetToken || canvas.tokens.controlled[0];

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Channel Aggression');
      return;
    }

    if (!selectedTarget) {
      ui.notifications.error('Please select a target token for Channel Aggression');
      return;
    }

    const result = await DarkSideDevoteeMechanics.triggerChannelAggression(
      selectedActor,
      selectedTarget,
      selectedActor.system.level || 1
    );

    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  }

  /**
   * Macro: Activate Channel Anger rage
   * Usage: game.swse.macros.channelAnger()
   */
  static async channelAngerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character to use Channel Anger');
      return;
    }

    const result = await DarkSideDevoteeMechanics.triggerChannelAnger(selectedActor);

    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  }

  /**
   * Macro: End Channel Anger rage early
   * Usage: game.swse.macros.endChannelAnger()
   */
  static async endChannelAngerMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const result = await DarkSideDevoteeMechanics.endChannelAnger(selectedActor);

    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  }

  /**
   * Macro: Apply Crippling Strike after critical hit
   * Usage: game.swse.macros.cripplingStrike()
   */
  static async cripplingStrikeMacro(actor = null, targetToken = null) {
    const selectedActor = actor || game.user.character;
    const selectedTarget = targetToken || canvas.tokens.controlled[0];

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!selectedTarget) {
      ui.notifications.error('Please select a target token');
      return;
    }

    // Confirm this was a critical hit
    const confirmDialog = new Dialog({
      title: 'Crippling Strike - Confirm Critical Hit',
      content: `
        <p>Confirm that you scored a <strong>Critical Hit</strong> against ${selectedTarget.actor.name}.</p>
        <p>Crippling Strike will:</p>
        <ul>
          <li>Cost 1 Force Point</li>
          <li>Reduce target's speed by half</li>
          <li>Effect lasts until target is fully healed</li>
        </ul>
      `,
      buttons: {
        apply: {
          label: 'Apply Crippling Strike',
          callback: async () => {
            const result = await DarkSideDevoteeMechanics.triggerCripplingStrike(
              selectedActor,
              selectedTarget
            );

            if (!result.success) {
              ui.notifications.warn(result.message);
            }
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    });

    confirmDialog.render(true);
  }

  /**
   * Macro: Create Dark Side Talisman
   * Usage: game.swse.macros.createDarkSideTalisman()
   */
  static async createDarkSideTalismanMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const isGreater = DarkSideDevoteeMechanics.hasGreaterDarkSideTalisman(selectedActor);

    // Check cooldown
    if (!DarkSideDevoteeMechanics.canCreateNewTalisman(selectedActor)) {
      ui.notifications.warn('Cannot create a new talisman yet. Must wait 24 hours after destruction.');
      return;
    }

    // For standard talisman, show defense selection
    if (!isGreater) {
      const defenseOptions = ['Reflex', 'Fortitude', 'Will']
        .map(d => `<option value="${d}">${d}</option>`)
        .join('');

      const dialog = new Dialog({
        title: 'Dark Side Talisman - Select Defense',
        content: `
          <div class="form-group">
            <label>Choose which Defense to protect:</label>
            <select id="defense-select" style="width: 100%;">
              ${defenseOptions}
            </select>
            <p class="hint-text" style="margin-top: 10px;">
              This talisman grants +2 Force bonus to the selected Defense against Light Side Force Powers.
            </p>
          </div>
        `,
        buttons: {
          create: {
            label: 'Create Talisman (Full-Round Action, 1 FP)',
            callback: async (html) => {
              const defense = html.find('#defense-select').val();
              const result = await DarkSideDevoteeMechanics.createDarkSideTalisman(
                selectedActor,
                defense
              );

              if (!result.success) {
                ui.notifications.warn(result.message);
              }
            }
          },
          cancel: {
            label: 'Cancel'
          }
        }
      });

      dialog.render(true);
    } else {
      // Greater talisman protects all defenses
      const result = await DarkSideDevoteeMechanics.createDarkSideTalisman(
        selectedActor,
        'all'
      );

      if (!result.success) {
        ui.notifications.warn(result.message);
      }
    }
  }

  /**
   * Macro: Destroy Dark Side Talisman and trigger cooldown
   * Usage: game.swse.macros.destroyDarkSideTalisman()
   */
  static async destroyDarkSideTalismanMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const confirmDialog = new Dialog({
      title: 'Destroy Dark Side Talisman',
      content: `
        <p>This will destroy the active Dark Side Talisman and trigger a 24-hour cooldown before you can create a new one.</p>
      `,
      buttons: {
        destroy: {
          label: 'Destroy Talisman',
          callback: async () => {
            const result = await DarkSideDevoteeMechanics.destroyDarkSideTalisman(selectedActor);

            if (!result.success) {
              ui.notifications.warn(result.message);
            }
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    });

    confirmDialog.render(true);
  }

  /**
   * Macro: Check Channel Anger status
   * Usage: game.swse.macros.checkChannelAngerStatus()
   */
  static checkChannelAngerStatusMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const isRaging = DarkSideDevoteeMechanics.isCurrentlyRaging(selectedActor);

    if (isRaging) {
      const rageInfo = selectedActor.getFlag('swse', 'isChannelAngerRaging');
      ui.notifications.info(
        `${selectedActor.name} is Raging! ` +
        `Rage ends at the beginning of round ${rageInfo.endRound}. ` +
        `Current bonuses: +2 melee attacks/damage`
      );
    } else {
      ui.notifications.info(`${selectedActor.name} is not currently Raging.`);
    }
  }

  /**
   * Macro: Check Crippling Strike status on target
   * Usage: game.swse.macros.checkCripplingStrikeStatus()
   */
  static checkCripplingStrikeStatusMacro(targetToken = null) {
    const selectedTarget = targetToken || canvas.tokens.controlled[0];

    if (!selectedTarget) {
      ui.notifications.error('Please select a target token');
      return;
    }

    const crippledInfo = selectedTarget.actor.getFlag('swse', 'isCrippled');

    if (crippledInfo) {
      const hpRemaining = crippledInfo.maxHpWhenCrippled - selectedTarget.actor.system.hp.value;
      ui.notifications.info(
        `${selectedTarget.actor.name} is Crippled by ${crippledInfo.sourceName}! ` +
        `Speed: ${crippledInfo.crippledSpeed} squares. ` +
        `${hpRemaining} HP until fully healed.`
      );
    } else {
      ui.notifications.info(`${selectedTarget.actor.name} is not currently crippled.`);
    }
  }

  /**
   * Macro: Check Dark Side Talisman status
   * Usage: game.swse.macros.checkTalismanStatus()
   */
  static checkTalismanStatusMacro(actor = null) {
    const selectedActor = actor || game.user.character;

    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const talisman = DarkSideDevoteeMechanics.getActiveTalisman(selectedActor);

    if (talisman) {
      const defenseText = talisman.isGreater ? 'all Defenses' : talisman.defense;
      ui.notifications.info(
        `${selectedActor.name} is carrying an active ` +
        `${talisman.isGreater ? 'Greater ' : ''}Dark Side Talisman! ` +
        `+2 Force bonus to ${defenseText} against Light Side Force Powers.`
      );
    } else {
      const canCreate = DarkSideDevoteeMechanics.canCreateNewTalisman(selectedActor);
      if (!canCreate) {
        ui.notifications.info(
          `${selectedActor.name} does not have an active talisman and must wait 24 hours before creating a new one.`
        );
      } else {
        ui.notifications.info(`${selectedActor.name} does not have an active talisman.`);
      }
    }
  }
}

// ============================================================================
// EXPORT FOR GLOBAL ACCESS
// ============================================================================

window.SWSE = window.SWSE || {};
window.SWSE.macros = window.SWSE.macros || {};

// Channel Aggression
window.SWSE.macros.channelAggression = DarkSideDevoteeMacros.channelAggressionMacro.bind(DarkSideDevoteeMacros);

// Channel Anger
window.SWSE.macros.channelAnger = DarkSideDevoteeMacros.channelAngerMacro.bind(DarkSideDevoteeMacros);
window.SWSE.macros.endChannelAnger = DarkSideDevoteeMacros.endChannelAngerMacro.bind(DarkSideDevoteeMacros);
window.SWSE.macros.checkChannelAngerStatus = DarkSideDevoteeMacros.checkChannelAngerStatusMacro.bind(DarkSideDevoteeMacros);

// Crippling Strike
window.SWSE.macros.cripplingStrike = DarkSideDevoteeMacros.cripplingStrikeMacro.bind(DarkSideDevoteeMacros);
window.SWSE.macros.checkCripplingStrikeStatus = DarkSideDevoteeMacros.checkCripplingStrikeStatusMacro.bind(DarkSideDevoteeMacros);

// Dark Side Talisman
window.SWSE.macros.createDarkSideTalisman = DarkSideDevoteeMacros.createDarkSideTalismanMacro.bind(DarkSideDevoteeMacros);
window.SWSE.macros.destroyDarkSideTalisman = DarkSideDevoteeMacros.destroyDarkSideTalismanMacro.bind(DarkSideDevoteeMacros);
window.SWSE.macros.checkTalismanStatus = DarkSideDevoteeMacros.checkTalismanStatusMacro.bind(DarkSideDevoteeMacros);

export default DarkSideDevoteeMacros;
