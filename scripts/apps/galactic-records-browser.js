// scripts/apps/galactic-records-browser.js
/**
 * Galactic Records Browser
 * Multi-type template browser for creating actors from compendium records
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { NPCTemplateDataLoader } from "/systems/foundryvtt-swse/scripts/core/npc-template-data-loader.js";
import { DroidTemplateDataLoader } from "/systems/foundryvtt-swse/scripts/core/droid-template-data-loader.js";
import { NPCTemplateImporterEngine } from "/systems/foundryvtt-swse/scripts/engine/import/npc-template-importer-engine.js";
import { DroidTemplateImporterEngine } from "/systems/foundryvtt-swse/scripts/engine/import/droid-template-importer-engine.js";
import { GalacticRecordsCategoryRegistry } from "/systems/foundryvtt-swse/scripts/core/galactic-records-category-registry.js";
import { NPCImportCustomizationWizard } from "/systems/foundryvtt-swse/scripts/apps/npc-import-customization-wizard.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/galactic-records-browser.hbs';

export class GalacticRecordsBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.selectedCategory = null;
    this.selectedTemplate = null;
    this.templates = {};
    this.isLoading = false;

    // Optional: Pre-select category and set import callback
    this.preSelectCategory = options.preSelectCategory || null;
    this.importCallback = options.importCallback || null;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(ApplicationV2.DEFAULT_OPTIONS ?? {}),
    {
      classes: ['swse', 'galactic-records-browser', 'swse-app'],
      width: 1000,
      height: 750,
      title: 'Access Galactic Records',
      window: { resizable: true }
    }
  );

  static PARTS = {
    content: {
      template: TEMPLATE_PATH,
      scrollable: ['.templates-list']
    }
  };

  async _prepareContext(options) {
    const categories = GalacticRecordsCategoryRegistry.getCategories();

    return {
      categories,
      selectedCategory: this.selectedCategory,
      selectedTemplate: this.selectedTemplate,
      templates: this.templates[this.selectedCategory] || [],
      isLoading: this.isLoading,
      categoryInfo: this.selectedCategory ? GalacticRecordsCategoryRegistry.getCategory(this.selectedCategory) : null
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

    // Import buttons
    const importNowBtn = root.querySelector('.import-now-btn');
    if (importNowBtn) {
      importNowBtn.addEventListener('click', () => this._onImportNow());
    }

    const importCustomizeBtn = root.querySelector('.import-customize-btn');
    if (importCustomizeBtn) {
      importCustomizeBtn.addEventListener('click', () => this._onImportAndCustomize());
    }

    // Close button
    const closeBtn = root.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Auto-select pre-selected category if provided
    if (this.preSelectCategory && !this.selectedCategory) {
      await this._autoSelectCategory(this.preSelectCategory);
    }
  }

  /**
   * Auto-select a category (used for pre-selection)
   * @private
   */
  async _autoSelectCategory(categoryId) {
    const category = GalacticRecordsCategoryRegistry.getCategory(categoryId);
    if (!category || !category.supported) {
      SWSELogger.warn(`[GalacticRecordsBrowser] Cannot auto-select unsupported category: ${categoryId}`);
      return;
    }

    this.selectedCategory = categoryId;
    this.selectedTemplate = null;

    // Load templates if not cached
    if (!this.templates[categoryId]) {
      this.isLoading = true;
      await this.render();

      try {
        const loaderName = category.dataLoader;
        let templates;

        // Use appropriate loader based on category type
        if (categoryId === 'droid') {
          templates = await DroidTemplateDataLoader[loaderName]();
        } else {
          templates = await NPCTemplateDataLoader[loaderName]();
        }

        this.templates[categoryId] = templates;
        SWSELogger.log(`[GalacticRecordsBrowser] Auto-loaded ${templates.length} templates for ${categoryId}`);
      } catch (err) {
        SWSELogger.error('[GalacticRecordsBrowser] Error auto-loading templates:', err);
        this.templates[categoryId] = [];
      } finally {
        this.isLoading = false;
        await this.render();
      }
    }
  }

  /**
   * Category selection
   */
  async _onSelectCategory(event) {
    const categoryId = event.currentTarget.dataset.category;
    const category = GalacticRecordsCategoryRegistry.getCategory(categoryId);

    if (!category.supported) {
      SWSELogger.log(`[GalacticRecordsBrowser] Category not supported: ${categoryId}`);
      this.selectedCategory = categoryId;
      this.selectedTemplate = null;
      await this.render();
      return;
    }

    this.selectedCategory = categoryId;
    this.selectedTemplate = null;

    // Load templates if not cached
    if (!this.templates[categoryId]) {
      this.isLoading = true;
      await this.render();

      try {
        const loaderName = category.dataLoader;
        let templates;

        // Use appropriate loader based on category type
        if (categoryId === 'droid') {
          templates = await DroidTemplateDataLoader[loaderName]();
        } else {
          templates = await NPCTemplateDataLoader[loaderName]();
        }

        this.templates[categoryId] = templates;
        SWSELogger.log(`[GalacticRecordsBrowser] Loaded ${templates.length} templates for ${categoryId}`);
      } catch (err) {
        SWSELogger.error('[GalacticRecordsBrowser] Error loading templates:', err);
        ui?.notifications?.error?.(`Failed to load ${category.label} records`);
        this.templates[categoryId] = [];
      } finally {
        this.isLoading = false;
      }
    }

    await this.render();
  }

  /**
   * Template selection
   */
  async _onSelectTemplate(event) {
    const templateId = event.currentTarget.dataset.templateId;
    const templates = this.templates[this.selectedCategory] || [];
    this.selectedTemplate = templates.find(t => t.id === templateId);

    await this.render();
  }

  /**
   * Import without customization
   */
  async _onImportNow() {
    if (!this.selectedCategory || !this.selectedTemplate) {
      ui?.notifications?.warn?.('Please select a record to import');
      return;
    }

    await this._executeImport(this.selectedTemplate, null);
  }

  /**
   * Import with customization wizard
   */
  async _onImportAndCustomize() {
    if (!this.selectedCategory || !this.selectedTemplate) {
      ui?.notifications?.warn?.('Please select a record to import');
      return;
    }

    const template = this.selectedTemplate;
    NPCImportCustomizationWizard.create(template, async (customData) => {
      await this._executeImport(template, customData);
    });
  }

  /**
   * Execute import
   */
  async _executeImport(template, customData = null) {
    const importerName = GalacticRecordsCategoryRegistry.getImporterName(this.selectedCategory);

    if (!importerName) {
      ui?.notifications?.error?.('Import pipeline not available for this category');
      return;
    }

    SWSELogger.log(`[GalacticRecordsBrowser] Importing ${this.selectedCategory} template: ${template.name}`);

    try {
      let actor;

      if (this.selectedCategory === 'heroic') {
        actor = await NPCTemplateImporterEngine.importHeroicTemplate(template, customData);
      } else if (this.selectedCategory === 'nonheroic') {
        actor = await NPCTemplateImporterEngine.importNonheroicTemplate(template, customData);
      } else if (this.selectedCategory === 'beast') {
        actor = await NPCTemplateImporterEngine.importBeastTemplate(template.id, customData);
      } else if (this.selectedCategory === 'droid') {
        actor = await DroidTemplateImporterEngine.importDroidTemplate(template.id, customData);
      }

      if (actor) {
        ui?.notifications?.info?.(`Record "${actor.name}" imported successfully!`);
        SWSELogger.log(`[GalacticRecordsBrowser] Import successful: ${actor.name}`);

        // If importCallback provided, call it instead of opening sheet
        if (this.importCallback && typeof this.importCallback === 'function') {
          await this.close();
          this.importCallback(actor);
        } else {
          await this.close();
          actor.sheet.render(true);
        }
      } else {
        ui?.notifications?.error?.('Failed to import record');
      }
    } catch (err) {
      SWSELogger.error('[GalacticRecordsBrowser] Error during import:', err);
      ui?.notifications?.error?.(`Import failed: ${err.message}`);
    }
  }

  /**
   * Static factory
   */
  static create(options = {}) {
    const browser = new GalacticRecordsBrowser(options);
    browser.render(true);
    return browser;
  }
}

export default GalacticRecordsBrowser;
