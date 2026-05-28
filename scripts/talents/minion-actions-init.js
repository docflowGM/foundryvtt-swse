/**
 * Minion Actions Init
 * Exposes a macro menu for Crime Lord / Privateer minion talents.
 */

import MinionActionsMechanics from "/systems/foundryvtt-swse/scripts/engine/talent/minion-actions-mechanics.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { MinionCreator } from "/systems/foundryvtt-swse/scripts/apps/minion-creator.js";

Hooks.once('ready', () => {
  SWSELogger.log('SWSE System | Initializing Minion Actions');

  window.SWSE = window.SWSE || {};
  window.SWSE.talents = window.SWSE.talents || {};
  window.SWSE.talents.minionActions = { mechanics: MinionActionsMechanics };

  window.SWSE.macros = window.SWSE.macros || {};
  window.SWSE.macros.minionActions = async (actor = null) => {
    const selectedActor = actor || game.user.character;
    if (!selectedActor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!MinionActionsMechanics.hasAnyMinionTalent(selectedActor)) {
      ui.notifications.warn(`${selectedActor.name} does not have a minion tactical talent.`);
      return;
    }

    const minions = MinionCreator.getMinions(selectedActor);
    const buttons = {};

    if (MinionActionsMechanics.hasTalent(selectedActor, 'Bodyguard I')) {
      buttons.bodyguard = { label: 'Bodyguard', callback: async () => MinionActionsMechanics.bodyguard(selectedActor, minions) };
    }
    if (MinionActionsMechanics.hasTalent(selectedActor, 'Shelter')) {
      buttons.shelter = { label: 'Shelter', callback: async () => MinionActionsMechanics.shelter(selectedActor, minions) };
    }
    if (MinionActionsMechanics.hasTalent(selectedActor, 'Wealth of Allies')) {
      buttons.wealth = { label: 'Wealth of Allies', callback: async () => MinionActionsMechanics.wealthOfAllies(selectedActor, minions) };
    }
    if (MinionActionsMechanics.hasTalent(selectedActor, 'Shared Notoriety')) {
      buttons.shared = { label: 'Shared Notoriety', callback: async () => MinionActionsMechanics.sharedNotoriety(selectedActor, minions) };
    }
    if (MinionActionsMechanics.hasTalent(selectedActor, 'Frighten')) {
      buttons.frighten = { label: 'Frighten', callback: async () => MinionActionsMechanics.frighten(selectedActor, minions) };
    }
    if (MinionActionsMechanics.hasTalent(selectedActor, 'Fear Me')) {
      buttons.fearMe = { label: 'Fear Me', callback: async () => MinionActionsMechanics.fearMe(selectedActor, minions) };
    }
    buttons.cancel = { label: 'Cancel' };

    const dialog = new SWSEDialogV2({
      title: 'Minion Actions',
      content: `
        <p>Select a minion talent action card.</p>
        <p><em>Adjacency, target legality, and once-per-encounter/turn usage are not automated.</em></p>
      `,
      buttons
    });

    dialog.render(true);
  };
});
