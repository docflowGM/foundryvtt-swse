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

    // Check which Dark Healing variants the actor has
    const hasImproved = DarkSidePowers.hasImprovedDarkHealing(actor);
    const hasField = DarkSidePowers.hasDarkHealingField(actor);

    // If they have enhanced versions, show a dialog to choose
    if (hasImproved || hasField) {
      const buttons = {
        basic: {
          label: 'Dark Healing (Basic)',
          callback: async () => {
            const result = await DarkSidePowers.triggerDarkHealing(actor, targetToken);
            if (!result.success) {
              ui.notifications.warn(result.message);
            }
          }
        }
      };

      if (hasImproved) {
        buttons.improved = {
          label: 'Improved Dark Healing',
          callback: async () => {
            const result = await DarkSidePowers.triggerImprovedDarkHealing(actor, targetToken);
            if (!result.success) {
              ui.notifications.warn(result.message);
            }
          }
        };
      }

      if (hasField) {
        buttons.field = {
          label: 'Dark Healing Field (Multi-target)',
          callback: async () => {
            const targetTokens = canvas.tokens.controlled;
            const result = await DarkSidePowers.triggerDarkHealingField(actor, targetTokens);
            if (!result.success) {
              ui.notifications.warn(result.message);
            }
          }
        };
      }

      buttons.cancel = {
        label: 'Cancel'
      };

      const dialog = new Dialog({
        title: 'Dark Healing - Select Variant',
        content: `
          <div class="form-group">
            <p>You have multiple Dark Healing variants available. Choose one:</p>
          </div>
        `,
        buttons: buttons
      });

      dialog.render(true);
    } else {
      // Only basic version available
      const result = await DarkSidePowers.triggerDarkHealing(actor, targetToken);
      if (!result.success) {
        ui.notifications.warn(result.message);
      }
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

  window.SWSE.macros.darkHealingField = async () => {
    const actor = game.user.character;
    const targetTokens = canvas.tokens.controlled;

    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (targetTokens.length === 0) {
      ui.notifications.error('Please select up to 3 target tokens');
      return;
    }

    const result = await DarkSidePowers.triggerDarkHealingField(actor, targetTokens);
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

  // Sith Alchemical Weapon macros
  window.SWSE.macros.createSithAlchemicalWeapon = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    // Get all melee weapons
    const meleeWeapons = actor.items.filter(item =>
      item.type === 'weapon' &&
      (item.system?.weaponType === 'advanced-melee' || item.system?.weaponType === 'simple-melee')
    );

    if (meleeWeapons.length === 0) {
      ui.notifications.warn('No melee weapons available. Sith Alchemical Weapons require a melee weapon to enhance.');
      return;
    }

    const weaponOptions = meleeWeapons
      .map(w => `<option value="${w.id}">${w.name}</option>`)
      .join('');

    const dialog = new Dialog({
      title: 'Create Sith Alchemical Weapon',
      content: `
        <div class="form-group">
          <label>Select a melee weapon to enhance with Sith Alchemy:</label>
          <select id="weapon-select" style="width: 100%;">
            ${weaponOptions}
          </select>
          <p class="hint-text" style="margin-top: 10px;">
            <i class="fas fa-info-circle"></i>
            Cost: 20% of weapon cost or 2,000 credits (whichever is higher). The enhanced weapon gains Sith Alchemical properties and a special Swift Action ability.
          </p>
        </div>
      `,
      buttons: {
        create: {
          label: 'Create Sith Alchemical Weapon (Full-Round Action)',
          callback: async (html) => {
            const weaponId = html.find('#weapon-select').val();
            const weapon = actor.items.get(weaponId);
            const result = await DarkSidePowers.createSithAlchemicalWeapon(actor, weapon);
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
  };

  window.SWSE.macros.activateSithAlchemicalBonus = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    // Get all Sith Alchemical Weapons
    const alchemicalWeapons = actor.items.filter(item =>
      item.type === 'weapon' && DarkSidePowers.isSithAlchemicalWeapon(item)
    );

    if (alchemicalWeapons.length === 0) {
      ui.notifications.warn('No Sith Alchemical Weapons available. You must first create one using Sith Alchemy.');
      return;
    }

    if (alchemicalWeapons.length === 1) {
      // Only one weapon, activate it directly
      const result = await DarkSidePowers.activateSithAlchemicalBonus(actor, alchemicalWeapons[0]);
      if (!result.success) {
        ui.notifications.warn(result.message);
      }
    } else {
      // Multiple weapons, show selection dialog
      const weaponOptions = alchemicalWeapons
        .map(w => `<option value="${w.id}">${w.name}</option>`)
        .join('');

      const dialog = new Dialog({
        title: 'Activate Sith Alchemical Weapon Bonus',
        content: `
          <div class="form-group">
            <label>Select which Sith Alchemical Weapon to activate:</label>
            <select id="weapon-select" style="width: 100%;">
              ${weaponOptions}
            </select>
            <p class="hint-text" style="margin-top: 10px;">
              <i class="fas fa-info-circle"></i>
              This is a Swift Action. Spend 1 Force Point to gain a bonus to damage equal to your Dark Side Score on your next attack (increases your DSP by 1).
            </p>
          </div>
        `,
        buttons: {
          activate: {
            label: 'Activate Bonus (Swift Action, 1 FP)',
            callback: async (html) => {
              const weaponId = html.find('#weapon-select').val();
              const weapon = actor.items.get(weaponId);
              const result = await DarkSidePowers.activateSithAlchemicalBonus(actor, weapon);
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
    }
  };

  // Stolen Form - Select and copy a Lightsaber Form or Force Technique
  window.SWSE.macros.stolenForm = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!DarkSidePowers.hasStolenForm(actor)) {
      ui.notifications.error('You do not have the Stolen Form talent');
      return;
    }

    // Get all available Lightsaber Forms
    const lightsaberForms = game.items.filter(item =>
      item.type === 'talent' &&
      item.system?.talent_tree === 'Lightsaber Forms'
    );

    // Get Force Techniques - these come from multiple trees related to Force powers
    // Including: Sense, Control, Alter, Force Adept, and combat techniques like Block, Deflect
    const forceTrees = ['Sense', 'Control', 'Alter', 'Force Adept'];
    const forceTechniques = game.items.filter(item =>
      item.type === 'talent' &&
      (forceTrees.includes(item.system?.talent_tree) ||
       ['Block', 'Deflect', 'Redirect Shot', 'Force Sensitive', 'Force Technique'].includes(item.name))
    );

    // Combine and sort available options
    const availableOptions = [...lightsaberForms, ...forceTechniques]
      .filter(item => item && item.name) // Filter out any invalid items
      .sort((a, b) => a.name.localeCompare(b.name));

    if (availableOptions.length === 0) {
      ui.notifications.warn('No Lightsaber Forms or Force Techniques available');
      return;
    }

    // Build options HTML
    const optionsHTML = availableOptions
      .map(t => `<option value="${t.name}">${t.name}</option>`)
      .join('');

    const dialog = new Dialog({
      title: 'Stolen Form - Select Form or Technique',
      content: `
        <div class="form-group">
          <label>Choose a Lightsaber Form or Force Technique to steal and add to your usable options:</label>
          <select id="form-select" style="width: 100%; margin-top: 10px;">
            ${optionsHTML}
          </select>
          <p class="hint-text" style="margin-top: 15px;">
            <i class="fas fa-info-circle"></i>
            <strong>Note:</strong> You gain all the benefits of this talent, but still must meet any prerequisites.
          </p>
        </div>
      `,
      buttons: {
        steal: {
          label: 'Steal This Form/Technique',
          callback: async (html) => {
            const formName = html.find('#form-select').val();
            const selectedForm = availableOptions.find(t => t.name === formName);

            if (selectedForm) {
              await DarkSidePowers.setStolenFormTalent(actor, selectedForm.name);
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

  // Sith Alchemy (create) - Unified macro for creating talismans or weapons
  window.SWSE.macros.sithAlchemyCreate = async () => {
    const actor = game.user.character;
    if (!actor) {
      ui.notifications.error('Please select a character');
      return;
    }

    if (!DarkSidePowers.hasSithAlchemy(actor)) {
      ui.notifications.error('You do not have Sith Alchemy talent');
      return;
    }

    // Check if cooldown applies for talisman
    const hasTalismanCooldown = !DarkSidePowers.canCreateNewSithTalisman(actor);
    const hasActiveTalisman = DarkSidePowers.getActiveSithTalisman(actor);

    // Check available melee weapons
    const meleeWeapons = actor.items.filter(item =>
      item.type === 'weapon' &&
      (item.system?.weaponType === 'advanced-melee' || item.system?.weaponType === 'simple-melee')
    );

    const buttons = {};

    // Add talisman option if available
    if (!hasActiveTalisman && !hasTalismanCooldown) {
      buttons.talisman = {
        label: 'Create Sith Talisman (Full-Round Action, 1 FP)',
        callback: async () => {
          const result = await DarkSidePowers.createSithTalisman(actor);
          if (!result.success) {
            ui.notifications.warn(result.message);
          }
        }
      };
    }

    // Add weapon option if weapons available
    if (meleeWeapons.length > 0) {
      buttons.weapon = {
        label: 'Create Sith Alchemical Weapon (Full-Round Action)',
        callback: async () => {
          if (meleeWeapons.length === 1) {
            // Only one weapon, enhance it directly
            const result = await DarkSidePowers.createSithAlchemicalWeapon(actor, meleeWeapons[0]);
            if (!result.success) {
              ui.notifications.warn(result.message);
            }
          } else {
            // Multiple weapons, show selection dialog
            const weaponOptions = meleeWeapons
              .map(w => `<option value="${w.id}">${w.name}</option>`)
              .join('');

            const weaponDialog = new Dialog({
              title: 'Select Weapon to Enhance',
              content: `
                <div class="form-group">
                  <label>Choose a melee weapon to enhance with Sith Alchemy:</label>
                  <select id="weapon-select" style="width: 100%;">
                    ${weaponOptions}
                  </select>
                </div>
              `,
              buttons: {
                enhance: {
                  label: 'Create Sith Alchemical Weapon',
                  callback: async (html) => {
                    const weaponId = html.find('#weapon-select').val();
                    const weapon = actor.items.get(weaponId);
                    const result = await DarkSidePowers.createSithAlchemicalWeapon(actor, weapon);
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

            weaponDialog.render(true);
          }
        }
      };
    }

    buttons.cancel = {
      label: 'Cancel'
    };

    // Build status message
    let statusMessage = '<p>What would you like to create?</p>';
    if (hasActiveTalisman) {
      statusMessage += '<p class="warning-text"><strong>⚠ You already have an active Sith Talisman.</strong> You cannot create another until this one is destroyed.</p>';
    }
    if (hasTalismanCooldown) {
      statusMessage += '<p class="warning-text"><strong>⚠ Sith Talisman on cooldown.</strong> You must wait 24 hours after destroying one to create another.</p>';
    }
    if (meleeWeapons.length === 0) {
      statusMessage += '<p class="warning-text"><strong>⚠ No melee weapons available.</strong> Sith Alchemical Weapons require a melee weapon to enhance.</p>';
    }

    const dialog = new Dialog({
      title: 'Sith Alchemy (create) - Choose Creation Type',
      content: `
        <div class="form-group">
          ${statusMessage}
        </div>
      `,
      buttons: buttons
    });

    dialog.render(true);
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
    darkHealingField: 'game.swse.macros.darkHealingField()',
    wickedStrike: 'game.swse.macros.wickedStrike()',
    drainForce: 'game.swse.macros.drainForce()',
    createSithTalisman: 'game.swse.macros.createSithTalisman()',
    destroySithTalisman: 'game.swse.macros.destroySithTalisman()',
    checkSithTalismanStatus: 'game.swse.macros.checkSithTalismanStatus()',
    stolenForm: 'game.swse.macros.stolenForm()',
    // Sith Alchemy (create) - Unified macro
    sithAlchemyCreate: 'game.swse.macros.sithAlchemyCreate()',
    // Sith Alchemical Weapons (individual macros for manual use)
    createSithAlchemicalWeapon: 'game.swse.macros.createSithAlchemicalWeapon()',
    activateSithAlchemicalBonus: 'game.swse.macros.activateSithAlchemicalBonus()'
  });
});

export default DarkSidePowers;
