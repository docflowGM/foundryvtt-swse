// scripts/apps/npc-import-customization-wizard.js
/**
 * NPC Import Customization Wizard
 * Lightweight post-import customization for name, portrait, and notes
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/npc-import-customization-wizard.hbs';

export class NPCImportCustomizationWizard extends foundry.applications.api.DialogV2 {
  constructor(template, options = {}) {
    super(options);
    this.template = template;
    this.customData = {
      name: template.name,
      portrait: template.portrait,
      notes: '',
      biography: ''
    };
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(foundry.applications.api.DialogV2.DEFAULT_OPTIONS ?? {}),
    {
      classes: ['swse', 'npc-import-wizard', 'swse-app'],
      width: 600,
      height: 700,
      title: 'Customize NPC Import',
      window: {
        resizable: true
      }
    }
  );

  static PARTS = {
    content: {
      template: TEMPLATE_PATH
    }
  };

  async _prepareContext() {
    return {
      template: this.template,
      customData: this.customData,
      portraitPreview: this.customData.portrait || this.template.portrait
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Name field
    const nameInput = root.querySelector('input[name="name"]');
    if (nameInput) {
      nameInput.addEventListener('change', (e) => {
        this.customData.name = e.target.value;
      });
      nameInput.addEventListener('input', (e) => {
        this.customData.name = e.target.value;
      });
    }

    // Portrait field
    const portraitInput = root.querySelector('input[name="portrait"]');
    if (portraitInput) {
      portraitInput.addEventListener('change', (e) => {
        this.customData.portrait = e.target.value;
        this._updatePortraitPreview();
      });
    }

    // Portrait picker button
    const portraitBtn = root.querySelector('.portrait-picker-btn');
    if (portraitBtn) {
      portraitBtn.addEventListener('click', () => this._onPickPortrait());
    }

    // Notes field
    const notesInput = root.querySelector('textarea[name="notes"]');
    if (notesInput) {
      notesInput.addEventListener('change', (e) => {
        this.customData.notes = e.target.value;
      });
    }

    // Biography field
    const bioInput = root.querySelector('textarea[name="biography"]');
    if (bioInput) {
      bioInput.addEventListener('change', (e) => {
        this.customData.biography = e.target.value;
      });
    }

    // Confirm button
    const confirmBtn = root.querySelector('.confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this._onConfirm());
    }

    // Cancel button
    const cancelBtn = root.querySelector('.cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }
  }

  /**
   * Update portrait preview
   */
  async _updatePortraitPreview() {
    const preview = this.element.querySelector('.portrait-preview img');
    if (preview) {
      preview.src = this.customData.portrait || this.template.portrait;
    }
  }

  /**
   * Open portrait picker dialog
   */
  async _onPickPortrait() {
    const filePicker = new FilePicker({
      type: 'image',
      callback: (path) => {
        const portraitInput = this.element.querySelector('input[name="portrait"]');
        if (portraitInput) {
          portraitInput.value = path;
          this.customData.portrait = path;
          this._updatePortraitPreview();
        }
      }
    });
    filePicker.browse();
  }

  /**
   * Confirm customization and trigger import with custom data
   */
  async _onConfirm() {
    if (!this.customData.name || !this.customData.name.trim()) {
      ui?.notifications?.warn?.('Please enter a name for the NPC');
      return;
    }

    this.customData.name = this.customData.name.trim();

    SWSELogger.log(`[NPCImportCustomizationWizard] Customization confirmed: ${this.customData.name}`);

    // Close wizard and trigger parent callback
    if (this.options.onConfirm) {
      await this.close();
      await this.options.onConfirm(this.customData);
    } else {
      this.close();
    }
  }

  /**
   * Static factory method
   */
  static create(template, onConfirm) {
    const wizard = new NPCImportCustomizationWizard(template, {
      onConfirm
    });
    wizard.render(true);
    return wizard;
  }
}

export default NPCImportCustomizationWizard;
