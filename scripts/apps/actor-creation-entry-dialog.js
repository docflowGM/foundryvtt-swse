// scripts/apps/actor-creation-entry-dialog.js
/**
 * Actor Creation Entry Dialog
 * First choice presented when creating a new actor:
 * - Begin New Character (progression/chargen)
 * - Access Galactic Records (template browser)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { GalacticRecordsBrowser } from "/systems/foundryvtt-swse/scripts/apps/galactic-records-browser.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/actor-creation-entry.hbs';

export class ActorCreationEntryDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.callback = options.callback || null;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(ApplicationV2.DEFAULT_OPTIONS ?? {}),
    {
      classes: ['swse', 'actor-creation-entry', 'swse-app'],
      width: 600,
      height: 400,
      title: 'Create Actor',
      window: { resizable: false }
    }
  );

  static PARTS = {
    content: {
      template: TEMPLATE_PATH
    }
  };

  async _prepareContext(options) {
    return {
      // No dynamic context needed - static choices
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Begin New Character button
    const newCharBtn = root.querySelector('[data-action="new-character"]');
    if (newCharBtn) {
      newCharBtn.addEventListener('click', () => this._onNewCharacter());
    }

    // Access Galactic Records button
    const galacticBtn = root.querySelector('[data-action="galactic-records"]');
    if (galacticBtn) {
      galacticBtn.addEventListener('click', () => this._onAccessGalacticRecords());
    }
  }

  /**
   * User chose to begin a new character via progression
   */
  async _onNewCharacter() {
    SWSELogger.log('[ActorCreationEntryDialog] User selected: Begin New Character');
    await this.close();

    // Call parent callback which triggers chargen-init flow
    if (this.callback && typeof this.callback === 'function') {
      this.callback('new-character');
    }
  }

  /**
   * User chose to access template records
   */
  async _onAccessGalacticRecords() {
    SWSELogger.log('[ActorCreationEntryDialog] User selected: Access Galactic Records');
    await this.close();

    // Open Galactic Records browser
    GalacticRecordsBrowser.create();
  }

  /**
   * Static factory
   */
  static create(options = {}) {
    const dialog = new ActorCreationEntryDialog(options);
    dialog.render(true);
    return dialog;
  }
}

export default ActorCreationEntryDialog;
