/**
 * Dark Side Powers - Unified Initialization
 * Registers all Dark Side talent mechanics and macros
 * Uses the consolidated DarkSidePowers module
 */

import DarkSidePowers from './DarkSidePowers.js';
import { SWSELogger } from '../utils/logger.js';

/**
 * Initialize Dark Side Powers systems when the world loads
 */
Hooks.once('ready', () => {
  SWSELogger.log('SWSE System | Initializing Dark Side Powers');

  // Expose Dark Side Powers to global scope
  window.SWSE = window.SWSE || {};
  window.SWSE.talents = window.SWSE.talents || {};
  window.SWSE.talents.darkSidePowers = DarkSidePowers;

  // Register macro functions
  window.SWSE.macros = window.SWSE.macros || {};

  // Dark Side Talents (Swift Power, Savant, Wrath)
  window.SWSE.macros.swiftPower = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const forcePowers = actor.items.filter(item => item.type === 'forcepower');
    if (forcePowers.length === 0) {
      ui.notifications.warn('No Force Powers available');
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
            <i class="fas fa-info-circle"></i>
            This can be used once per day. It allows using a Force Power that normally takes a Standard or Move action as a Swift Action instead.
          </p>
        </div>
      `,
      buttons: {
        use: {
          label: 'Use as Swift Action',
          callback: async (html) => {
            const powerId = html.find('#power-select').val();
            const power = actor.items.get(powerId);
            const success = await DarkSidePowers.triggerSwiftPower(actor, power);
            if (success) {
              await ChatMessage.create({
                speaker: { actor: actor },
                content: `<h3><img src="icons/svg/item-bag.svg" style="width: 20px; height: 20px;"> Swift Power</h3>
                          <p><strong>${actor.name}</strong> uses ${power.name} as a <strong>Swift Action</strong> instead of a Standard or Move Action!</p>`,
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
  };

  window.SWSE.macros.darkSideSavant = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    Hooks.callAll('darkSideSavantTriggered', actor);
  };

  // Dark Side Devotee Talents (Channel Aggression, Channel Anger, Crippling, Talisman)
  window.SWSE.macros.channelAggression = async () => {
    const actor = game.user.character;
    const targetToken = canvas.tokens.controlled[0];

    if (!actor || !targetToken) {
      ui.notifications.error('Please select a character and target token');
      return;
    }

    const result = await DarkSidePowers.triggerChannelAggression(
      actor,
      targetToken,
      actor.system.level || 1
    );

    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  };

  window.SWSE.macros.channelAnger = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const result = await DarkSidePowers.triggerChannelAnger(actor);
    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  };

  window.SWSE.macros.endChannelAnger = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const result = await DarkSidePowers.endChannelAnger(actor);
    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  };

  window.SWSE.macros.cripplingStrike = async () => {
    const actor = game.user.character;
    const targetToken = canvas.tokens.controlled[0];

    if (!actor || !targetToken) {
      ui.notifications.error('Please select a character and target token');
      return;
    }

    const confirmDialog = new Dialog({
      title: 'Crippling Strike - Confirm Critical Hit',
      content: `
        <p>Confirm that you scored a <strong>Critical Hit</strong> against ${targetToken.actor.name}.</p>
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
            const result = await DarkSidePowers.triggerCripplingStrike(actor, targetToken);
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
  };

  window.SWSE.macros.createDarkSideTalisman = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!DarkSidePowers.canCreateNewTalisman(actor)) {
      ui.notifications.warn('Cannot create a new talisman yet. Must wait 24 hours after destruction.');
      return;
    }

    const isGreater = DarkSidePowers.hasGreaterDarkSideTalisman(actor);

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
              const result = await DarkSidePowers.createDarkSideTalisman(actor, defense);
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
      const result = await DarkSidePowers.createDarkSideTalisman(actor, 'all');
      if (!result.success) {
        ui.notifications.warn(result.message);
      }
    }
  };

  window.SWSE.macros.destroyDarkSideTalisman = async () => {
    const actor = game.user.character;
    if (!actor) {
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
            const result = await DarkSidePowers.destroyDarkSideTalisman(actor);
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
  };

  // Status check macros
  window.SWSE.macros.checkChannelAngerStatus = () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const isRaging = DarkSidePowers.isCurrentlyRaging(actor);
    if (isRaging) {
      const rageInfo = actor.getFlag('swse', 'isChannelAngerRaging');
      ui.notifications.info(
        `${actor.name} is Raging! Rage ends at the beginning of round ${rageInfo.endRound}. Current bonuses: +2 melee attacks/damage`
      );
    } else {
      ui.notifications.info(`${actor.name} is not currently Raging.`);
    }
  };

  window.SWSE.macros.checkTalismanStatus = () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const talisman = DarkSidePowers.getActiveTalisman(actor);
    if (talisman) {
      const defenseText = talisman.isGreater ? 'all Defenses' : talisman.defense;
      ui.notifications.info(
        `${actor.name} is carrying an active ${talisman.isGreater ? 'Greater ' : ''}Dark Side Talisman! +2 Force bonus to ${defenseText} against Light Side Force Powers.`
      );
    } else {
      const canCreate = DarkSidePowers.canCreateNewTalisman(actor);
      if (!canCreate) {
        ui.notifications.info(`${actor.name} does not have an active talisman and must wait 24 hours before creating a new one.`);
      } else {
        ui.notifications.info(`${actor.name} does not have an active talisman.`);
      }
    }
  };

  // Sith Talents (Dark Healing, Wicked Strike, Sith Alchemy, etc.)
  window.SWSE.macros.darkHealing = async () => {
    const actor = game.user.character;
    const targetToken = canvas.tokens.controlled[0];

    if (!actor || !targetToken) {
      ui.notifications.error('Please select a character and target token');
      return;
    }

    const result = await DarkSidePowers.triggerDarkHealing(actor, targetToken);
    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  };

  window.SWSE.macros.improvedDarkHealing = async () => {
    const actor = game.user.character;
    const targetToken = canvas.tokens.controlled[0];

    if (!actor || !targetToken) {
      ui.notifications.error('Please select a character and target token');
      return;
    }

    const result = await DarkSidePowers.triggerImprovedDarkHealing(actor, targetToken);
    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  };

  window.SWSE.macros.wickedStrike = async () => {
    const actor = game.user.character;
    const targetToken = canvas.tokens.controlled[0];

    if (!actor || !targetToken) {
      ui.notifications.error('Please select a character and target token');
      return;
    }

    const confirmDialog = new Dialog({
      title: 'Wicked Strike - Confirm Critical Hit',
      content: `
        <p>Confirm that you scored a <strong>Critical Hit</strong> with a lightsaber against ${targetToken.actor.name}.</p>
        <p>Wicked Strike will:</p>
        <ul>
          <li>Cost 1 Force Point</li>
          <li>Move target -2 steps along Condition Track</li>
        </ul>
      `,
      buttons: {
        apply: {
          label: 'Apply Wicked Strike',
          callback: async () => {
            const result = await DarkSidePowers.triggerWickedStrike(actor, targetToken);
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
  };

  window.SWSE.macros.drainForce = async () => {
    const actor = game.user.character;
    const targetToken = canvas.tokens.controlled[0];

    if (!actor || !targetToken) {
      ui.notifications.error('Please select a character and target token');
      return;
    }

    const result = await DarkSidePowers.triggerDrainForce(actor, targetToken);
    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  };

  window.SWSE.macros.createSithTalisman = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!DarkSidePowers.canCreateNewSithTalisman(actor)) {
      ui.notifications.warn('Cannot create a new talisman yet. Must wait 24 hours after destruction.');
      return;
    }

    const result = await DarkSidePowers.createSithTalisman(actor);
    if (!result.success) {
      ui.notifications.warn(result.message);
    }
  };

  window.SWSE.macros.destroySithTalisman = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const confirmDialog = new Dialog({
      title: 'Destroy Sith Talisman',
      content: `
        <p>This will destroy the active Sith Talisman and trigger a 24-hour cooldown before you can create a new one.</p>
      `,
      buttons: {
        destroy: {
          label: 'Destroy Talisman',
          callback: async () => {
            const result = await DarkSidePowers.destroySithTalisman(actor);
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
  };

  window.SWSE.macros.checkSithTalismanStatus = () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    const talisman = DarkSidePowers.getActiveSithTalisman(actor);
    if (talisman) {
      ui.notifications.info(
        `${actor.name} is carrying an active Sith Talisman! +1d6 to Force Power and Lightsaber damage.`
      );
    } else {
      const canCreate = DarkSidePowers.canCreateNewSithTalisman(actor);
      if (!canCreate) {
        ui.notifications.info(`${actor.name} does not have an active talisman and must wait 24 hours before creating a new one.`);
      } else {
        ui.notifications.info(`${actor.name} does not have an active talisman.`);
      }
    }
  };

  SWSELogger.log('SWSE System | Dark Side Powers loaded successfully');
  console.log('Dark Side Powers available at: window.SWSE.talents.darkSidePowers');
  console.log('Available Macros:', {
    // Dark Side Talents
    swiftPower: 'game.swse.macros.swiftPower()',
    darkSideSavant: 'game.swse.macros.darkSideSavant()',
    // Dark Side Devotee
    channelAggression: 'game.swse.macros.channelAggression()',
    channelAnger: 'game.swse.macros.channelAnger()',
    endChannelAnger: 'game.swse.macros.endChannelAnger()',
    cripplingStrike: 'game.swse.macros.cripplingStrike()',
    createDarkSideTalisman: 'game.swse.macros.createDarkSideTalisman()',
    destroyDarkSideTalisman: 'game.swse.macros.destroyDarkSideTalisman()',
    checkChannelAngerStatus: 'game.swse.macros.checkChannelAngerStatus()',
    checkTalismanStatus: 'game.swse.macros.checkTalismanStatus()',
    // Sith Talents
    darkHealing: 'game.swse.macros.darkHealing()',
    improvedDarkHealing: 'game.swse.macros.improvedDarkHealing()',
    wickedStrike: 'game.swse.macros.wickedStrike()',
    drainForce: 'game.swse.macros.drainForce()',
    createSithTalisman: 'game.swse.macros.createSithTalisman()',
    destroySithTalisman: 'game.swse.macros.destroySithTalisman()',
    checkSithTalismanStatus: 'game.swse.macros.checkSithTalismanStatus()'
  });
});

export default DarkSidePowers;
