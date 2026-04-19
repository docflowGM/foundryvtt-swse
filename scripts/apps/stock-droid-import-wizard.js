/**
 * Stock Droid Import Wizard
 * Multi-step wizard for importing stock droids from compendium.
 *
 * Steps:
 * 1. Select Stock Droid - Browse and select from available stock droids
 * 2. Preview Stock Droid - Review selected droid details and statblock
 * 3. Choose Import Mode - Select statblock or conversion mode
 * 4. Review and Apply - Final confirmation and import
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { GalacticRecordsBrowser } from "/systems/foundryvtt-swse/scripts/apps/galactic-records-browser.js";
import { DroidTemplateImporterEngine } from "/systems/foundryvtt-swse/scripts/engine/import/droid-template-importer-engine.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/stock-droid-import-wizard.hbs';

export class StockDroidImportWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.callback = options.callback || null;
    this.droidActor = options.droidActor || null;

    // Wizard state
    this.currentStep = 1;
    this.selectedDroid = null;
    this.selectedMode = 'statblock';  // 'statblock' or 'convert'
    this.importError = null;
    this.isImporting = false;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    ApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      classes: ['swse', 'stock-droid-import-wizard', 'swse-app'],
      width: 1000,
      height: 780,
      title: 'Import Stock Droid',
      window: { resizable: true }
    }
  );

  static PARTS = {
    content: {
      template: TEMPLATE_PATH
    }
  };

  get title() {
    const titles = {
      1: 'Import Stock Droid — Select',
      2: 'Import Stock Droid — Preview',
      3: 'Import Stock Droid — Mode',
      4: 'Import Stock Droid — Review'
    };
    return titles[this.currentStep] || 'Import Stock Droid';
  }

  async _prepareContext(options) {
    const context = {
      currentStep: this.currentStep,
      selectedDroid: this.selectedDroid,
      selectedMode: this.selectedMode,
      importError: this.importError,
      isImporting: this.isImporting,

      // Step indicators
      steps: [
        { num: 1, label: 'Select', meta: 'Choose a stock droid' },
        { num: 2, label: 'Preview', meta: 'Review droid details' },
        { num: 3, label: 'Mode', meta: 'Choose import mode' },
        { num: 4, label: 'Review', meta: 'Final confirmation' }
      ],

      // Navigation state
      canGoBack: this.currentStep > 1,
      canGoNext: this._canAdvanceStep(),
      canApply: this.currentStep === 4 && this.selectedDroid && !this.isImporting,

      // Placeholder for future droid data loading
      availableDroids: await this._loadAvailableDroids()
    };

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Navigation buttons
    const backBtn = root.querySelector('[data-action="back"]');
    if (backBtn) {
      backBtn.addEventListener('click', () => this._previousStep());
    }

    const nextBtn = root.querySelector('[data-action="next"]');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this._nextStep());
    }

    const applyBtn = root.querySelector('[data-action="apply"]');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this._applyImport());
    }

    const cancelBtn = root.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // Step-specific listeners
    switch (this.currentStep) {
      case 1:
        this._wireSelectStep(root);
        break;
      case 2:
        this._wirePreviewStep(root);
        break;
      case 3:
        this._wireModeStep(root);
        break;
      case 4:
        this._wireReviewStep(root);
        break;
    }
  }

  /**
   * Wire listeners for Step 1: Select Stock Droid
   */
  _wireSelectStep(root) {
    const searchInput = root.querySelector('[data-field="search"]');
    const degreeFilter = root.querySelector('[data-field="degree"]');
    const sizeFilter = root.querySelector('[data-field="size"]');
    const droidCards = root.querySelectorAll('[data-droid-id]');

    // Search filtering
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        droidCards.forEach(card => {
          const name = card.querySelector('[data-droid-name]')?.textContent.toLowerCase() || '';
          const visible = name.includes(query);
          card.style.display = visible ? '' : 'none';
        });
      });
    }

    // Droid selection
    droidCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const droidId = card.dataset.droidId;
        const droidName = card.querySelector('[data-droid-name]')?.textContent || 'Unknown';
        const droidImg = card.querySelector('img')?.src || '';

        this.selectedDroid = {
          id: droidId,
          name: droidName,
          img: droidImg
        };

        // Update selection UI
        droidCards.forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');

        SWSELogger.log(`[StockDroidImportWizard] Selected droid: ${droidId}`);
      });
    });
  }

  /**
   * Wire listeners for Step 2: Preview Stock Droid
   */
  _wirePreviewStep(root) {
    // Preview is read-only, no wiring needed
  }

  /**
   * Wire listeners for Step 3: Choose Import Mode
   */
  _wireModeStep(root) {
    const modeCards = root.querySelectorAll('[data-mode]');

    modeCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = card.dataset.mode;

        this.selectedMode = mode;

        // Update selection UI
        modeCards.forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');

        SWSELogger.log(`[StockDroidImportWizard] Selected mode: ${mode}`);
        this.render(false);  // Re-render to update description
      });
    });
  }

  /**
   * Wire listeners for Step 4: Review and Apply
   */
  _wireReviewStep(root) {
    // Review is read-only, no wiring needed
  }

  /**
   * Check if current step allows advancing to next
   */
  _canAdvanceStep() {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedDroid;  // Need a droid selected
      case 2:
      case 3:
        return true;  // Can always advance from preview or mode
      default:
        return false;
    }
  }

  /**
   * Advance to next step
   */
  async _nextStep() {
    if (this.currentStep < 4) {
      this.currentStep++;
      await this.render(false);
    }
  }

  /**
   * Go back to previous step
   */
  async _previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      await this.render(false);
    }
  }

  /**
   * Apply the import
   */
  async _applyImport() {
    if (!this.selectedDroid) {
      ui.notifications.error('No droid selected');
      return;
    }

    this.isImporting = true;
    await this.render(false);

    try {
      SWSELogger.log(`[StockDroidImportWizard] Importing droid: ${this.selectedDroid.id} (mode: ${this.selectedMode})`);

      // For now, just use the standard import which defaults to statblock mode
      // In the future, this could handle different modes
      const actor = await DroidTemplateImporterEngine.importDroidTemplate(
        this.selectedDroid.id,
        null  // No custom data at import time
      );

      if (actor) {
        ui.notifications.info(`Droid "${actor.name}" imported successfully!`);
        SWSELogger.log(`[StockDroidImportWizard] Import successful: ${actor.id}`);

        // Call parent callback
        if (this.callback && typeof this.callback === 'function') {
          this.callback({
            choice: 'droid-import',
            actor: actor,
            mode: this.selectedMode
          });
        }

        await this.close();
      } else {
        this.importError = 'Failed to import droid. Check console for details.';
        await this.render(false);
      }
    } catch (err) {
      SWSELogger.error('[StockDroidImportWizard] Import error:', err);
      this.importError = `Import failed: ${err.message}`;
      await this.render(false);
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Load available stock droids from compendium
   * Returns placeholder data for now; will connect to actual compendium
   */
  async _loadAvailableDroids() {
    // TODO: Load from packs/droids.db compendium
    // For now, return empty array - UI will show "no droids available"
    return [];
  }

  /**
   * Static factory
   */
  static create(options = {}) {
    const wizard = new StockDroidImportWizard(options);
    wizard.render(true);
    return wizard;
  }
}

export default StockDroidImportWizard;
