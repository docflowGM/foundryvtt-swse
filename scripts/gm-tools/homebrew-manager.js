import { SWSELogger } from '../utils/logger.js';
import SWSEFormApplicationV2 from '../apps/base/swse-form-application-v2.js';
/**
 * GM Homebrew Management
 * Central system for custom rules and options
 */

export class SWSEHomebrewManager {

  static init() {
    // Register menu button in game settings
    game.settings.registerMenu('swse', 'homebrewManager', {
      name: 'Homebrew Content Manager',
      label: 'Manage Homebrew',
      hint: 'Create and manage custom content',
      icon: 'fas fa-flask',
      type: HomebrewManagerApp,
      restricted: true
    });
  }

  static registerSettings() {
    game.settings.register('foundryvtt-swse', 'allowHomebrew', {
      name: 'Allow Homebrew Content',
      hint: 'Enable GM to create custom content',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register('foundryvtt-swse', 'homebrewContent', {
      name: 'Homebrew Content',
      hint: 'Stored homebrew items',
      scope: 'world',
      config: false,
      type: Object,
      default: {
        feats: [],
        talents: [],
        forcePowers: [],
        species: [],
        classes: []
      }
    });

    game.settings.register('foundryvtt-swse', 'houseRules', {
      name: 'House Rules',
      hint: 'Custom rule modifications',
      scope: 'world',
      config: false,
      type: Object,
      default: {}
    });
  }

  static async createCustomFeat(data) {
    const homebrew = game.settings.get('foundryvtt-swse', 'homebrewContent');
    homebrew.feats.push({
      id: foundry.utils.randomID(),
      ...data,
      isHomebrew: true
    });
    await game.settings.set('foundryvtt-swse', 'homebrewContent', homebrew);
    ui.notifications.info(`Created homebrew feat: ${data.name}`);
  }

  static async createCustomTalent(data) {
    const homebrew = game.settings.get('foundryvtt-swse', 'homebrewContent');
    homebrew.talents.push({
      id: foundry.utils.randomID(),
      ...data,
      isHomebrew: true
    });
    await game.settings.set('foundryvtt-swse', 'homebrewContent', homebrew);
    ui.notifications.info(`Created homebrew talent: ${data.name}`);
  }

  static async createCustomForcePower(data) {
    const homebrew = game.settings.get('foundryvtt-swse', 'homebrewContent');
    homebrew.forcePowers.push({
      id: foundry.utils.randomID(),
      ...data,
      isHomebrew: true
    });
    await game.settings.set('foundryvtt-swse', 'homebrewContent', homebrew);
    ui.notifications.info(`Created homebrew Force power: ${data.name}`);
  }

  static async exportHomebrew() {
    const homebrew = game.settings.get('foundryvtt-swse', 'homebrewContent');
    const json = JSON.stringify(homebrew, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swse-homebrew-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    ui.notifications.info('Homebrew content exported');
  }

  static async importHomebrew(file) {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      const current = game.settings.get('foundryvtt-swse', 'homebrewContent');
      const merged = {
        feats: [...current.feats, ...(imported.feats || [])],
        talents: [...current.talents, ...(imported.talents || [])],
        forcePowers: [...current.forcePowers, ...(imported.forcePowers || [])],
        species: [...current.species, ...(imported.species || [])],
        classes: [...current.classes, ...(imported.classes || [])]
      };

      await game.settings.set('foundryvtt-swse', 'homebrewContent', merged);
      ui.notifications.info('Homebrew content imported successfully');
    } catch (err) {
      ui.notifications.error('Failed to import homebrew content');
      SWSELogger.error(err);
    }
  }
}

/**
 * Homebrew Manager Application
 */
class HomebrewManagerApp extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'homebrew-manager',
      title: 'SWSE Homebrew Manager',
      template: 'systems/foundryvtt-swse/templates/apps/homebrew-manager.hbs',
      position: { width: 720, height: 600 },
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'feats' }],
      closeOnSubmit: false,
      submitOnChange: false
    }
  );


  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }
async _prepareContext(options) {
    const homebrew = game.settings.get('foundryvtt-swse', 'homebrewContent');
    return {
      homebrew,
      allowHomebrew: game.settings.get('foundryvtt-swse', 'allowHomebrew')
    };
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    // Create buttons
    root.querySelectorAll('[data-action="createFeat"]').forEach(btn =>
      btn.addEventListener('click', () => this._createFeat())
    );
    root.querySelectorAll('[data-action="createTalent"]').forEach(btn =>
      btn.addEventListener('click', () => this._createTalent())
    );
    root.querySelectorAll('[data-action="createForcePower"]').forEach(btn =>
      btn.addEventListener('click', () => this._createForcePower())
    );

    // Delete buttons
    root.querySelectorAll('[data-action="delete"]').forEach(btn =>
      btn.addEventListener('click', (ev) => this._deleteItem(ev))
    );

    // Import/Export
    root.querySelectorAll('[data-action="export"]').forEach(btn =>
      btn.addEventListener('click', () => SWSEHomebrewManager.exportHomebrew())
    );
    root.querySelectorAll('[data-action="import"]').forEach(btn =>
      btn.addEventListener('click', () => this._importDialog())
    );
  }

  async _createFeat() {
    const name = await this._promptName('Feat');
    if (!name) {return;}

    await SWSEHomebrewManager.createCustomFeat({
      name,
      description: 'Custom feat description',
      prerequisite: null
    });
    this.render();
  }

  async _createTalent() {
    const name = await this._promptName('Talent');
    if (!name) {return;}

    await SWSEHomebrewManager.createCustomTalent({
      name,
      description: 'Custom talent description',
      tree: 'Custom'
    });
    this.render();
  }

  async _createForcePower() {
    const name = await this._promptName('Force Power');
    if (!name) {return;}

    await SWSEHomebrewManager.createCustomForcePower({
      name,
      description: 'Custom Force power description',
      action: 'Standard Action',
      checkType: 'Use the Force'
    });
    this.render();
  }

  async _promptName(type) {
    return new Promise((resolve) => {
      new SWSEDialogV2({
        title: `Create ${type}`,
        content: `<div class="form-group"><label>Name:</label><input type="text" name="name" autofocus/></div>`,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Create',
            callback: (html) => {
              const element = html instanceof HTMLElement ? html : html[0];
              const input = element.querySelector('[name="name"]');
              resolve(input?.value || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'create'
      }).render(true);
    });
  }

  async _deleteItem(event) {
    const type = event.currentTarget.dataset.type;
    const id = event.currentTarget.dataset.id;

    const confirmed = await SWSEDialogV2.confirm({
      title: 'Delete Homebrew Item',
      content: '<p>Are you sure you want to delete this item?</p>'
    });

    if (!confirmed) {return;}

    const homebrew = game.settings.get('foundryvtt-swse', 'homebrewContent');
    homebrew[type] = homebrew[type].filter(item => item.id !== id);
    await game.settings.set('foundryvtt-swse', 'homebrewContent', homebrew);
    this.render();
  }

  async _importDialog() {
    new SWSEDialogV2({
      title: 'Import Homebrew',
      content: `
        <div class="form-group">
          <label>Select JSON file:</label>
          <input type="file" name="import" accept=".json"/>
        </div>
      `,
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: 'Import',
          callback: async (html) => {
            const element = html instanceof HTMLElement ? html : html[0];
            const fileInput = element.querySelector('[name="import"]');
            const file = fileInput?.files?.[0];
            if (file) {
              await SWSEHomebrewManager.importHomebrew(file);
              this.render();
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel'
        }
      },
      default: 'import'
    }).render(true);
  }

  async _updateObject(event, formData) {
    // Handle form submission if needed
  }
}
