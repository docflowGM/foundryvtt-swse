import { SWSELogger } from '../utils/logger.js';
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
    game.settings.register('swse', 'allowHomebrew', {
      name: 'Allow Homebrew Content',
      hint: 'Enable GM to create custom content',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register('swse', 'homebrewContent', {
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

    game.settings.register('swse', 'houseRules', {
      name: 'House Rules',
      hint: 'Custom rule modifications',
      scope: 'world',
      config: false,
      type: Object,
      default: {}
    });
  }

  static async createCustomFeat(data) {
    const homebrew = game.settings.get('swse', 'homebrewContent');
    homebrew.feats.push({
      id: foundry.utils.randomID(),
      ...data,
      isHomebrew: true
    });
    await game.settings.set('swse', 'homebrewContent', homebrew);
    ui.notifications.info(`Created homebrew feat: ${data.name}`);
  }

  static async createCustomTalent(data) {
    const homebrew = game.settings.get('swse', 'homebrewContent');
    homebrew.talents.push({
      id: foundry.utils.randomID(),
      ...data,
      isHomebrew: true
    });
    await game.settings.set('swse', 'homebrewContent', homebrew);
    ui.notifications.info(`Created homebrew talent: ${data.name}`);
  }

  static async createCustomForcePower(data) {
    const homebrew = game.settings.get('swse', 'homebrewContent');
    homebrew.forcePowers.push({
      id: foundry.utils.randomID(),
      ...data,
      isHomebrew: true
    });
    await game.settings.set('swse', 'homebrewContent', homebrew);
    ui.notifications.info(`Created homebrew Force power: ${data.name}`);
  }

  static async exportHomebrew() {
    const homebrew = game.settings.get('swse', 'homebrewContent');
    const json = JSON.stringify(homebrew, null, 2);

    const blob = new Blob([json], {type: 'application/json'});
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

      const current = game.settings.get('swse', 'homebrewContent');
      const merged = {
        feats: [...current.feats, ...(imported.feats || [])],
        talents: [...current.talents, ...(imported.talents || [])],
        forcePowers: [...current.forcePowers, ...(imported.forcePowers || [])],
        species: [...current.species, ...(imported.species || [])],
        classes: [...current.classes, ...(imported.classes || [])]
      };

      await game.settings.set('swse', 'homebrewContent', merged);
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
class HomebrewManagerApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'homebrew-manager',
      title: 'SWSE Homebrew Manager',
      template: 'systems/foundryvtt-swse/templates/apps/homebrew-manager.hbs',
      width: 720,
      height: 600,
      tabs: [{navSelector: '.tabs', contentSelector: '.content', initial: 'feats'}],
      closeOnSubmit: false,
      submitOnChange: false
    });
  }

  getData() {
    const homebrew = game.settings.get('swse', 'homebrewContent');
    return {
      homebrew,
      allowHomebrew: game.settings.get('swse', 'allowHomebrew')
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Create buttons
    html.find('[data-action="createFeat"]').click(() => this._createFeat());
    html.find('[data-action="createTalent"]').click(() => this._createTalent());
    html.find('[data-action="createForcePower"]').click(() => this._createForcePower());

    // Delete buttons
    html.find('[data-action="delete"]').click((ev) => this._deleteItem(ev));

    // Import/Export
    html.find('[data-action="export"]').click(() => SWSEHomebrewManager.exportHomebrew());
    html.find('[data-action="import"]').click(() => this._importDialog());
  }

  async _createFeat() {
    const name = await this._promptName('Feat');
    if (!name) return;

    await SWSEHomebrewManager.createCustomFeat({
      name,
      description: 'Custom feat description',
      prerequisite: null
    });
    this.render();
  }

  async _createTalent() {
    const name = await this._promptName('Talent');
    if (!name) return;

    await SWSEHomebrewManager.createCustomTalent({
      name,
      description: 'Custom talent description',
      tree: 'Custom'
    });
    this.render();
  }

  async _createForcePower() {
    const name = await this._promptName('Force Power');
    if (!name) return;

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
      new Dialog({
        title: `Create ${type}`,
        content: `<div class="form-group"><label>Name:</label><input type="text" name="name" autofocus/></div>`,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Create',
            callback: (html) => resolve(html.find('[name="name"]').val())
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

    const confirmed = await Dialog.confirm({
      title: 'Delete Homebrew Item',
      content: '<p>Are you sure you want to delete this item?</p>'
    });

    if (!confirmed) return;

    const homebrew = game.settings.get('swse', 'homebrewContent');
    homebrew[type] = homebrew[type].filter(item => item.id !== id);
    await game.settings.set('swse', 'homebrewContent', homebrew);
    this.render();
  }

  async _importDialog() {
    new Dialog({
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
            const file = html.find('[name="import"]')[0].files[0];
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
