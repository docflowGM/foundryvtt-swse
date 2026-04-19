/**
 * Stock Droid Conversion Dialog
 * Presents inferred conversion values and confidence to user before builder handoff.
 * Bridges gap between stock statblock import and builder-native customization.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { DroidBuilderApp } from "/systems/foundryvtt-swse/scripts/apps/droid-builder-app.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/stock-droid-conversion-dialog.hbs';

export class StockDroidConversionDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Open conversion dialog with inferred seed and confidence data
   * @param {Object} converterOutput - Output from StockDroidConverter.convertStockDroidToBuilderSeed()
   * @param {Actor} actor - The stock droid actor being converted
   * @param {Object} options - Dialog options
   */
  static async openConversionFlow(converterOutput, actor, options = {}) {
    const dialog = new this({
      converterOutput,
      actor,
      ...options
    });

    return dialog.render({ force: true });
  }

  constructor(options = {}) {
    super(options);
    this.converterOutput = options.converterOutput || {};
    this.actor = options.actor || null;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    ApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      classes: ['swse', 'stock-droid-conversion-dialog', 'swse-app'],
      width: 700,
      height: 'auto',
      title: 'Convert Stock Droid',
      window: { resizable: true }
    }
  );

  static PARTS = {
    content: {
      template: TEMPLATE_PATH
    }
  };

  get title() {
    if (this.actor) {
      return `Convert ${this.actor.name} to Custom Droid`;
    }
    return 'Convert Stock Droid to Custom';
  }

  async _prepareContext(options) {
    const output = this.converterOutput;

    return {
      source: output.source || {},
      inferredSeed: output.inferredSeed || {},
      unresolved: output.unresolved || {},
      conversionMeta: output.conversionMeta || {},
      assumptions: output.conversionMeta?.assumptions || [],
      warnings: output.conversionMeta?.warnings || []
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Wire button actions
    const cancelBtn = root.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    const proceedBtn = root.querySelector('[data-action="proceed"]');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => this._proceedToBuilder());
    }
  }

  /**
   * User confirmed conversion; open builder with seeded data
   */
  async _proceedToBuilder() {
    if (!this.actor) {
      ui.notifications.error('No actor to convert');
      return;
    }

    try {
      SWSELogger.log('[StockDroidConversionDialog] Opening builder with seeded conversion data');

      // Open builder in CONVERT_FROM_STATBLOCK mode with converter output
      const builderApp = new DroidBuilderApp(this.actor, {
        mode: 'CONVERT_FROM_STATBLOCK',
        sourceActor: this.actor,  // Reference to stock droid for later tracking
        conversionSeed: this.converterOutput  // Pass full converter output to builder
      });

      await builderApp.render({ force: true });

      // Close this dialog after builder opens
      await this.close();
    } catch (err) {
      SWSELogger.error('[StockDroidConversionDialog] Error opening builder:', err);
      ui.notifications.error('Failed to open droid builder');
    }
  }
}

export default StockDroidConversionDialog;
