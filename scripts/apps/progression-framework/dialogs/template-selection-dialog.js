/**
 * Template Selection Dialog — Phase 5 Step 5
 *
 * Allows player to choose a character template at the start of chargen.
 * If user selects a template, it seeds the progression session and skips some early steps.
 * If user chooses "Create from Scratch", standard chargen proceeds.
 *
 * Design:
 * - Modal dialog (blocks chargen until choice is made)
 * - Shows templates by class for quick navigation
 * - Displays template name, archetype, description, ability preview
 * - "Create from Scratch" button for freeform chargen
 * - Returns template ID or null if freeform chosen
 *
 * Entry point:
 *   const templateId = await TemplateSelectionDialog.showChoiceDialog(actor);
 *   // If templateId is null, user chose freeform
 */

import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { TemplateRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-registry.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const { DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class TemplateSelectionDialog extends HandlebarsApplicationMixin(DialogV2) {
  static DEFAULT_OPTIONS = {
    ...DialogV2.DEFAULT_OPTIONS,
    window: {
      icon: 'fas fa-scroll',
      title: 'Character Template Selection',
      resizable: true,
    },
    position: {
      width: 900,
      height: 700,
    },
    template: 'systems/foundryvtt-swse/templates/apps/progression-framework/dialogs/template-selection.hbs',
    buttons: {
      freeform: {
        icon: 'fas fa-pencil-alt',
        label: 'Create from Scratch',
        callback: html => null,  // Return null for freeform
      },
      cancel: {
        icon: 'fas fa-ban',
        label: 'Cancel',
        callback: html => false,
      },
    },
  };

  constructor(options = {}) {
    super(options);
    this.selectedTemplate = null;
    this.templates = [];
    this.templatesByClass = {};
  }

  /**
   * Show template selection dialog and return chosen template ID (or null for freeform).
   * BLOCKING: Does not return until user makes a choice.
   *
   * @param {Actor} actor - The actor being created (for context)
   * @returns {Promise<string|null>} Template ID, or null if user chose freeform
   */
  static async showChoiceDialog(actor) {
    const templates = await TemplateRegistry.getAllTemplates();

    if (!templates || templates.length === 0) {
      swseLogger.warn('[TemplateSelectionDialog] No templates available; skipping dialog');
      return null;
    }

    return new Promise((resolve) => {
      const dialog = new this({
        ...this.DEFAULT_OPTIONS,
        actor,
        resolve,
      });

      dialog.render(true);
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Load templates
    this.templates = await TemplateRegistry.getAllTemplates();

    // Phase 2.6: Separate heroic and nonheroic templates
    const heroicTemplates = this.templates.filter(t => t.isNonheroic !== true);
    const nonheroicTemplates = this.templates.filter(t => t.isNonheroic === true);

    // Group heroic templates by class
    this.templatesByClass = {};
    for (const template of heroicTemplates) {
      const className = template.classId?.name || 'Other';
      if (!this.templatesByClass[className]) {
        this.templatesByClass[className] = [];
      }
      this.templatesByClass[className].push(template);
    }

    // Phase 2.6: Store nonheroic templates separately
    this.nonheroicTemplates = nonheroicTemplates;

    swseLogger.log('[TemplateSelectionDialog] Templates prepared', {
      heroicCount: heroicTemplates.length,
      nonheroicCount: nonheroicTemplates.length,
      totalCount: this.templates.length,
    });

    context.templatesByClass = this.templatesByClass;
    context.selectedTemplate = this.selectedTemplate;
    context.templates = this.templates;

    swseLogger.debug('[TemplateSelectionDialog] Context prepared', {
      totalTemplates: this.templates.length,
      classes: Object.keys(this.templatesByClass),
    });

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);

    // Wire up template selection clicks
    this.element.querySelectorAll('[data-template-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const templateId = btn.dataset.templateId;
        this._selectTemplate(templateId);
      });
    });
  }

  /**
   * Handle template selection.
   * Updates visual state and prepares for confirmation.
   *
   * @private
   */
  _selectTemplate(templateId) {
    this.selectedTemplate = templateId;
    const template = this.templates.find(t => t.id === templateId);

    swseLogger.debug('[TemplateSelectionDialog] Template selected', {
      templateId,
      templateName: template?.name,
    });

    // Update visual state
    this.element.querySelectorAll('[data-template-id]').forEach(btn => {
      btn.classList.remove('selected');
    });
    const selectedBtn = this.element.querySelector(`[data-template-id="${templateId}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('selected');
    }

    // Update confirm button state
    this._updateConfirmButton();
  }

  /**
   * Enable/disable the confirm button based on selection.
   * @private
   */
  _updateConfirmButton() {
    const confirmBtn = this.element.querySelector('[data-button="confirm"]');
    if (confirmBtn) {
      confirmBtn.disabled = !this.selectedTemplate;
    }
  }

  async _onButtonClick(event) {
    const button = event.target.closest('[data-button]');
    if (!button) return;

    const action = button.dataset.button;

    if (action === 'freeform') {
      // User chose freeform
      swseLogger.log('[TemplateSelectionDialog] User chose freeform chargen');
      this.close();
      this.options.resolve(null);
      return;
    }

    if (action === 'confirm' && this.selectedTemplate) {
      // User confirmed template choice
      swseLogger.log('[TemplateSelectionDialog] User chose template', {
        templateId: this.selectedTemplate,
      });
      this.close();
      this.options.resolve(this.selectedTemplate);
      return;
    }

    if (action === 'cancel') {
      // User cancelled
      swseLogger.log('[TemplateSelectionDialog] User cancelled');
      this.close();
      this.options.resolve(false);
      return;
    }

    await super._onButtonClick(event);
  }
}
