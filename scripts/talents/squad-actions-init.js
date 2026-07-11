/**
 * Squad Actions Init
 * Exposes a macro menu for Squad Actions talent (followers).
 */

import '/systems/foundryvtt-swse/scripts/patches/runtime-bugfix-hotfixes-init.js';
import '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer-force-knowledge-patch.js';
import '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/ability-score-finalizer-patch.js';
import '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/feat-talent-finalizer-patch.js';
import '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/force-finalizer-patch.js';
import '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/skills-languages-finalizer-patch.js';
import '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/species-background-finalizer-patch.js';
import '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/choice-resolution-finalization-patch.js';
import '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-and-superior-skills-hotfix.js';
import SquadActionsMechanics from "/systems/foundryvtt-swse/scripts/engine/talent/squad-actions-mechanics.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { FollowerCreator } from "/systems/foundryvtt-swse/scripts/apps/follower-creator.js";

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

    const followers = FollowerCreator.getFollowers(selectedActor);

    const dialog = new SWSEDialogV2({
      title: 'Squad Actions',
      content: `
        <p>Select a Squad Action to post a rules card with computed follower counts.</p>
        <p><em>Line of sight is not automated; apply modifiers manually.</em></p>
      `,
      buttons: {
        autofire: {
          label: 'Autofire Barrage',
          callback: async () => SquadActionsMechanics.autofireBarrage(selectedActor, followers)
        },
        openFire: {
          label: 'Open Fire',
          callback: async () => SquadActionsMechanics.openFire(selectedActor, followers)
        },
        painted: {
          label: 'Painted Target',
          callback: async () => SquadActionsMechanics.paintedTarget(selectedActor, followers)
        },
        cancel: { label: 'Cancel' }
      }
    });

    dialog.render(true);
  };
});