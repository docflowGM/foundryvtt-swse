// scripts/apps/npc-template-importer.js
/**
 * NPC Template Importer Dialog
 * Allows users to browse and import Beast, Nonheroic, and Heroic NPC templates
 * With optional post-import customization wizard
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { NPCTemplateDataLoader } from "/systems/foundryvtt-swse/scripts/core/npc-template-data-loader.js";
import { NPCTemplateImporterEngine } from "/systems/foundryvtt-swse/scripts/engine/import/npc-template-importer-engine.js";
import { NPCImportCustomizationWizard } from "/systems/foundryvtt-swse/scripts/apps/npc-import-customization-wizard.js";

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/npc-template-importer.hbs';

export class NPCTemplateImporter extends foundry.applications.api.DialogV2 {
  constructor(options = {}) {
    super(options);
    this.selectedCategory = null;
    this.selectedTemplate = null;
    this.templates = {};
    this.isLoading = false;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(foundry.applications.api.DialogV2.DEFAULT_OPTIONS ?? {}),
    {
      classes: ['swse', 'npc-template-importer', 'swse-app'],
      width: 900,
      height: 700,
      title: 'Import NPC Template',
      window: {
        resizable: true
      }
    }
  );

  static PARTS = {
    content: {
      template: TEMPLATE_PATH,
      scrollable: ['.templates-list']
    }
  };

  /**
   * Render the app
   */
  async _prepareContext() {
    return {
      selectedCategory: this.selectedCategory,
      selectedTemplate: this.selectedTemplate,
      templates: this.templates[this.selectedCategory] || [],
      isLoading: this.isLoading,
      categories: [
        { id: 'beast', label: 'Beasts & Mounts', icon: 'fa-dragon' },
        { id: 'nonheroic', label: 'Nonheroic NPCs', icon: 'fa-users' },
        { id: 'heroic', label: 'Heroic NPCs', icon: 'fa-crown' }
      ]
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Category buttons
    root.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this._onSelectCategory(e));
    });

    // Template items
    root.querySelectorAll('.template-item').forEach(item => {
      item.addEventListener('click', (e) => this._onSelectTemplate(e));
    });

    // Import Now button
    const importNowBtn = root.querySelector('.import-now-btn');
    if (importNowBtn) {
      importNowBtn.addEventListener('click', () => this._onImportNow());
    }

    // Import and Customize button
    const importCustomizeBtn = root.querySelector('.import-customize-btn');
    if (importCustomizeBtn) {
      importCustomizeBtn.addEventListener('click', () => this._onImportAndCustomize());
    }

    // Cancel button
    const cancelBtn = root.querySelector('.cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }
  }

  /**
   * Handle category selection
   */
  async _onSelectCategory(event) {
    const categoryId = event.currentTarget.dataset.category;
    this.selectedCategory = categoryId;
    this.selectedTemplate = null;

    // Load templates if not already loaded
    if (!this.templates[categoryId]) {
      this.isLoading = true;
      await this.render();

      try {
        const templates = await NPCTemplateDataLoader.loadTemplatesByCategory(categoryId);
        this.templates[categoryId] = templates;
        SWSELogger.log(`[NPCTemplateImporter] Loaded ${templates.length} templates for ${categoryId}`);
      } catch (err) {
        SWSELogger.error('[NPCTemplateImporter] Error loading templates:', err);
        ui?.notifications?.error?.(`Failed to load ${categoryId} templates`);
      } finally {
        this.isLoading = false;
      }
    }

    await this.render();
  }

  /**
   * Handle template selection
   */
  async _onSelectTemplate(event) {
    const templateId = event.currentTarget.dataset.templateId;
    const templates = this.templates[this.selectedCategory] || [];
    this.selectedTemplate = templates.find(t => t.id === templateId);

    await this.render();
  }

  /**
   * Handle direct import (no customization)
   */
  async _onImportNow() {
    if (!this.selectedCategory || !this.selectedTemplate) {
      ui?.notifications?.warn?.('Please select a template to import');
      return;
    }

    await this._executeImport(this.selectedTemplate, null);
  }

  /**
   * Handle import with customization
   */
  async _onImportAndCustomize() {
    if (!this.selectedCategory || !this.selectedTemplate) {
      ui?.notifications?.warn?.('Please select a template to import');
      return;
    }

    const template = this.selectedTemplate;

    // Open customization wizard
    NPCImportCustomizationWizard.create(template, async (customData) => {
      // Execute import with custom data
      await this._executeImport(template, customData);
    });
  }

  /**
   * Execute the actual import
   * @param {Object} template - Template to import
   * @param {Object|null} customData - Optional custom data from wizard (name, portrait, notes, etc.)
   */
  async _executeImport(template, customData = null) {
    const templateName = template.name;
    SWSELogger.log(`[NPCTemplateImporter] Importing template: ${templateName}`);

    try {
      let actor;

      if (this.selectedCategory === 'beast') {
        actor = await NPCTemplateImporterEngine.importBeastTemplate(template.id, customData);
      } else if (this.selectedCategory === 'nonheroic') {
        actor = await NPCTemplateImporterEngine.importNonheroicTemplate(template, customData);
      } else if (this.selectedCategory === 'heroic') {
        actor = await NPCTemplateImporterEngine.importHeroicTemplate(template, customData);
      }

      if (actor) {
        ui?.notifications?.info?.(`NPC "${actor.name}" imported successfully!`);
        SWSELogger.log(`[NPCTemplateImporter] Import successful: ${actor.name}`);

        // Close dialog and open the actor sheet
        await this.close();
        actor.sheet.render(true);
      } else {
        ui?.notifications?.error?.('Failed to import NPC template');
      }
    } catch (err) {
      SWSELogger.error('[NPCTemplateImporter] Error during import:', err);
      ui?.notifications?.error?.(`Import failed: ${err.message}`);
    }
  }

  /**
   * Static method to create and render the importer
   */
  static create(options = {}) {
    const importer = new NPCTemplateImporter(options);
    importer.render(true);
    return importer;
  }
}

export default NPCTemplateImporter;
