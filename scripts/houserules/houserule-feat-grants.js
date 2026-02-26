/**
 * House Rule Feat/Talent Grants System
 *
 * Automatically grants feats and talents to characters when house rule settings
 * enable them. Handles duplicates by offering replacement feat selection.
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

/**
 * Mapping of house rule settings to feats/talents they grant
 */
const GRANT_MAPPINGS = {
  // Setting: [{ type, name, id }]
  armoredDefenseForAll: [
    { type: 'talent', name: 'Armored Defense', id: '4c236343b01ea763' }
  ],
  weaponFinesseDefault: [
    { type: 'feat', name: 'Weapon Finesse', id: '252b67d6e31c377e' }
  ],
  pointBlankShotDefault: [
    { type: 'feat', name: 'Point Blank Shot', id: 'c301a0f533f15ce4' }
  ],
  powerAttackDefault: [
    { type: 'feat', name: 'Power Attack', id: '3f76464c43c73f84' }
  ],
  preciseShotDefault: [
    { type: 'feat', name: 'Precise Shot', id: 'c180eee7d3bc29b2' }
  ],
  dodgeDefault: [
    { type: 'feat', name: 'Dodge', id: '45366d4f3a5e443d' }
  ]
};

export class HouseRuleFeatGrants {
  /**
   * Initialize the feat grant system
   */
  static initialize() {
    SWSELogger.info('HouseRuleFeatGrants | Initializing…');

    // Monitor setting changes
    Hooks.on('updateSetting', (setting, value, options) => {
      if (setting.key.startsWith('foundryvtt-swse.')) {
        this._onSettingChanged(setting, value, options);
      }
    });

    // Grant feats to newly created actors
    Hooks.on('createActor', (actor, options, userId) => {
      if (game.user.id === userId) {
        this._grantFeatsToActor(actor);
      }
    });

    SWSELogger.info('HouseRuleFeatGrants | Ready.');
  }

  /**
   * Called when a house rule setting changes
   */
  static async _onSettingChanged(setting, value, options) {
    const settingName = setting.key.split('.').pop();

    // Only process if it's a setting that grants feats
    if (!GRANT_MAPPINGS[settingName]) {return;}

    // If setting is being disabled, don't process
    if (!value || value === false) {return;}

    // Grant to all actors
    for (const actor of game.actors) {
      await this._grantFeatsToActor(actor, settingName);
    }
  }

  /**
   * Grant applicable feats to an actor
   */
  static async _grantFeatsToActor(actor, specificSetting = null) {
    try {
      // Skip non-character actors
      if (!actor.isToken && actor.type !== 'character') {return;}

      const grantsToProcess = specificSetting
        ? { [specificSetting]: GRANT_MAPPINGS[specificSetting] }
        : GRANT_MAPPINGS;

      for (const [settingName, grants] of Object.entries(grantsToProcess)) {
        // Check if this setting is enabled
        const isEnabled = game.settings.get('foundryvtt-swse', settingName);
        if (!isEnabled) {continue;}

        for (const grant of grants) {
          await this._grantFeatToActor(actor, grant, settingName);
        }
      }
    } catch (err) {
      SWSELogger.error(`Error granting feats to actor ${actor.name}`, err);
    }
  }

  /**
   * Grant a specific feat/talent to an actor
   */
  static async _grantFeatToActor(actor, grant, settingName) {
    try {
      const { type, name, id } = grant;

      // Check if actor already has this feat/talent
      const existing = actor.items.find(
        (i) =>
          i.type === type &&
          i.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        // Actor already has it, offer replacement
        await this._offerReplacement(actor, type, name, settingName);
        return;
      }

      // Grant the feat/talent
      await this._createFeatItem(actor, grant);

      SWSELogger.info(
        `Granted ${type} "${name}" to ${actor.name} (${settingName})`
      );
    } catch (err) {
      SWSELogger.error(
        `Error granting ${grant.type} to ${actor.name}`,
        err
      );
    }
  }

  /**
   * Create a feat/talent item on the actor
   */
  static async _createFeatItem(actor, grant) {
    const { type, name, id } = grant;

    // Try to load from compendium for complete data
    let itemData = {
      name,
      type,
      img: 'icons/svg/upgrade.svg'
    };

    try {
      const packName =
        type === 'feat'
          ? 'foundryvtt-swse.feats'
          : 'foundryvtt-swse.talents';
      const pack = game.packs.get(packName);

      if (pack) {
        const doc = await pack.getDocument(id);
        if (doc) {
          itemData = doc.toObject();
        }
      }
    } catch (err) {
      SWSELogger.warn(`Could not load ${type} from compendium, using basic data`);
    }

    // PHASE 7: Create through ActorEngine
    await ActorEngine.createEmbeddedDocuments(actor, 'Item', [itemData]);
  }

  /**
   * Offer player a replacement feat/talent for one they already have
   */
  static async _offerReplacement(actor, type, name, settingName) {
    return new Promise((resolve) => {
      const typeLabel = type === 'feat' ? 'feat' : 'talent';
      const dialog = new SWSEDialogV2(
        {
          title: `${settingName} Granted: ${name}`,
          content: `
            <div style="padding: 1rem;">
              <p>
                Your Game Master has granted you the <strong>${typeLabel}</strong>
                <em>${name}</em> through a house rule change, but you already possess it.
              </p>
              <p style="margin-top: 1rem; margin-bottom: 1rem;">
                Would you like to select a replacement ${typeLabel} instead?
              </p>
              <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 4px; font-size: 0.9em; color: #aaa;">
                Your GM has made this ${typeLabel} available to all characters. Since you already have it,
                you can choose a different ${typeLabel} to add to your character.
              </div>
            </div>
          `,
          buttons: {
            yes: {
              label: 'Yes, Choose Replacement',
              callback: () => {
                this._openReplacementDialog(actor, type, name);
                resolve();
              }
            },
            no: {
              label: 'No, Keep My Choices',
              callback: () => {
                SWSELogger.info(
                  `${actor.name} declined replacement for ${name}`
                );
                resolve();
              }
            }
          },
          default: 'yes'
        },
        { top: 400, left: 400 }
      );

      dialog.render(true);
    });
  }

  /**
   * Open a dialog for selecting a replacement feat/talent
   */
  static async _openReplacementDialog(actor, type, rejectedName) {
    try {
      const packName =
        type === 'feat'
          ? 'foundryvtt-swse.feats'
          : 'foundryvtt-swse.talents';
      const pack = game.packs.get(packName);

      if (!pack) {
        ui.notifications.error(
          `Could not find ${type} compendium`
        );
        return;
      }

      // Get all available items of this type
      const allItems = await pack.getDocuments();
      const available = allItems.filter(
        (item) =>
          // Exclude the feat that was already offered
          item.name.toLowerCase() !== rejectedName.toLowerCase() &&
          // Check if actor already has it
          !actor.items.some(
            (i) =>
              i.type === type &&
              i.name.toLowerCase() === item.name.toLowerCase()
          )
      );

      // Create dialog for selection
      this._showReplacementSelectionDialog(
        actor,
        type,
        available,
        rejectedName
      );
    } catch (err) {
      SWSELogger.error(`Error opening replacement dialog`, err);
      ui.notifications.error(
        `Could not open ${type} selection dialog`
      );
    }
  }

  /**
   * Show the actual replacement selection dialog with list of feats
   */
  static _showReplacementSelectionDialog(actor, type, availableItems, rejectedName) {
    const typeLabel = type === 'feat' ? 'Feat' : 'Talent';

    // Create HTML for selection
    let content = `
      <div style="padding: 1rem;">
        <p style="margin-bottom: 1rem;">
          Select a replacement ${type} to add to your character:
        </p>
        <div style="max-height: 400px; overflow-y: auto;">
    `;

    availableItems.slice(0, 50).forEach((item) => {
      content += `
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label style="display: flex; align-items: center; cursor: pointer; padding: 0.5rem; border-radius: 4px; background: rgba(0,0,0,0.1);">
            <input type="radio" name="replacement-feat" value="${item._id}" style="margin-right: 0.5rem;"/>
            <span>${item.name}</span>
          </label>
        </div>
      `;
    });

    if (availableItems.length > 50) {
      content += `<p style="color: #888; font-size: 0.9em;">And ${availableItems.length - 50} more...</p>`;
    }

    content += `
        </div>
      </div>
    `;

    const dialog = new SWSEDialogV2(
      {
        title: `Select Replacement ${typeLabel}`,
        content,
        buttons: {
          apply: {
            label: `Apply Replacement`,
            callback: (html) => {
              const selectedId = html.querySelector("input[name='replacement-feat']:checked")?.value;

              if (!selectedId) {
                ui.notifications.warn('Please select a replacement');
                return;
              }

              // Grant the replacement
              this._grantReplacementFeat(actor, type, selectedId);
            }
          },
          cancel: {
            label: 'Cancel',
            callback: () => {
              SWSELogger.info(
                `${actor.name} cancelled replacement selection`
              );
            }
          }
        },
        default: 'apply'
      },
      { width: 500, height: 600, top: 300, left: 400 }
    );

    dialog.render(true);
  }

  /**
   * Grant the replacement feat/talent to the actor
   */
  static async _grantReplacementFeat(actor, type, itemId) {
    try {
      const packName =
        type === 'feat'
          ? 'foundryvtt-swse.feats'
          : 'foundryvtt-swse.talents';
      const pack = game.packs.get(packName);

      if (!pack) {
        ui.notifications.error(`Could not find ${type} compendium`);
        return;
      }

      const item = await pack.getDocument(itemId);
      if (!item) {
        ui.notifications.error(`Could not find ${type}`);
        return;
      }

      const itemData = item.toObject();
      // PHASE 7: Create through ActorEngine
    await ActorEngine.createEmbeddedDocuments(actor, 'Item', [itemData]);

      ui.notifications.info(
        `Granted ${type} "${item.name}" to ${actor.name}`
      );
      SWSELogger.info(
        `Granted replacement ${type} "${item.name}" to ${actor.name}`
      );
    } catch (err) {
      SWSELogger.error(`Error granting replacement ${type}`, err);
      ui.notifications.error(`Could not grant replacement ${type}`);
    }
  }
}
