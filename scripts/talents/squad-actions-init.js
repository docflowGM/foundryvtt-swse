/**
 * Squad Actions Init
 * Exposes a macro menu for Squad Actions talent (followers).
 */

import SquadActionsMechanics from "/systems/foundryvtt-swse/scripts/engine/talent/squad-actions-mechanics.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

Hooks.once('ready', () => {
  SWSELogger.log('SWSE System | Initializing Squad Actions (Followers)');

  window.SWSE = window.SWSE || {};
  window.SWSE.talents = window.SWSE.talents || {};
  window.SWSE.talents.squadActions = { mechanics: SquadActionsMechanics };

  window.SWSE.macros = window.SWSE.macros || {};
  window.SWSE.macros.squadActions = async (actor = null) => {
    const selectedActor = actor || game.user.character;
    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!SquadActionsMechanics.hasSquadActions(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have the Squad Actions talent`);
      return;
    }

    const dialog = new SWSEDialogV2({
      title: 'Squad Actions',
      content: `
        <p>Select a Squad Action to post a rules card with computed follower counts.</p>
        <p><em>Line of sight is not automated; apply modifiers manually.</em></p>
      `,
      buttons: {
        autofire: {
          label: 'Autofire Barrage',
          callback: async () => SquadActionsMechanics.autofireBarrage(selectedActor)
        },
        openFire: {
          label: 'Open Fire',
          callback: async () => SquadActionsMechanics.openFire(selectedActor)
        },
        painted: {
          label: 'Painted Target',
          callback: async () => SquadActionsMechanics.paintedTarget(selectedActor)
        },
        cancel: { label: 'Cancel' }
      }
    });

    dialog.render(true);
  };
});
