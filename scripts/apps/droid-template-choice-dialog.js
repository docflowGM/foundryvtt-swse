// scripts/apps/droid-template-choice-dialog.js
/**
 * Droid Template Choice Dialog
 *
 * When creating a droid player character, users can choose:
 * 1. Use Droid Template - Apply droid chassis/archetype template, then continue through chargen
 * 2. Use Class Template - Apply class-oriented template to seed chargen choices
 * 3. Build Custom Droid - No template, start from scratch
 *
 * Important: This is NOT actor import like NPC templates.
 * Templates seed/prefill chargen state, but the droid still goes through full progression.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { StockDroidImportWizard } from "/systems/foundryvtt-swse/scripts/apps/stock-droid-import-wizard.js";
import { TemplateCharacterCreator } from "/systems/foundryvtt-swse/scripts/apps/template-character-creator.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/droid-template-choice.hbs';

export class DroidTemplateChoiceDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.callback = options.callback || null;
    this.droidActor = options.droidActor || null; // Temporary actor to pass through
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    ApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      classes: ['swse', 'droid-template-choice', 'swse-app'],
      width: 700,
      height: 450,
      title: 'Create Droid',
      window: { resizable: false }
    }
  );

  static PARTS = {
    content: {
      template: TEMPLATE_PATH
    }
  };

  async _prepareContext(options) {
    return {};
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Droid Template button
    const droidTemplateBtn = root.querySelector('[data-action="droid-template"]');
    if (droidTemplateBtn) {
      droidTemplateBtn.addEventListener('click', () => this._onDroidTemplate());
    }

    // Class Template button
    const classTemplateBtn = root.querySelector('[data-action="class-template"]');
    if (classTemplateBtn) {
      classTemplateBtn.addEventListener('click', () => this._onClassTemplate());
    }

    // Build Custom button
    const customBtn = root.querySelector('[data-action="custom"]');
    if (customBtn) {
      customBtn.addEventListener('click', () => this._onCustom());
    }
  }

  /**
   * User chose to use a droid template
   * Opens Stock Droid Import Wizard for multi-step import
   */
  async _onDroidTemplate() {
    SWSELogger.log('[DroidTemplateChoiceDialog] User selected: Use Droid Template');
    await this.close();

    // Open Stock Droid Import Wizard
    StockDroidImportWizard.create({
      callback: async (result) => {
        // When droid is imported from wizard, call parent callback
        if (this.callback && typeof this.callback === 'function') {
          this.callback({
            choice: 'droid-template',
            actor: result.actor,
            mode: result.mode
          });
        }
      },
      actor: this.droidActor
    });
  }

  /**
   * User chose to use a class template
   * Opens template character creator, but with droid flag to filter out Force/Jedi
   */
  async _onClassTemplate() {
    SWSELogger.log('[DroidTemplateChoiceDialog] User selected: Use Class Template');
    await this.close();

    // Open template creator with droid-specific filtering
    TemplateCharacterCreator.create({
      isDroid: true,
      excludeForce: true, // Exclude Force/Jedi classes
      creationCallback: (template) => {
        if (this.callback && typeof this.callback === 'function') {
          this.callback({
            choice: 'class-template',
            template: template,
            isDroid: true
          });
        }
      }
    });
  }

  /**
   * User chose to build custom droid
   * Proceeds with normal droid progression/chargen
   */
  async _onCustom() {
    SWSELogger.log('[DroidTemplateChoiceDialog] User selected: Build Custom Droid');
    await this.close();

    // Call parent callback with custom choice
    if (this.callback && typeof this.callback === 'function') {
      this.callback({
        choice: 'custom',
        isDroid: true
      });
    }
  }

  /**
   * Static factory
   */
  static create(options = {}) {
    const dialog = new DroidTemplateChoiceDialog(options);
    dialog.render(true);
    return dialog;
  }
}

export default DroidTemplateChoiceDialog;
