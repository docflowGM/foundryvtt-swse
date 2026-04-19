/**
 * Stock Droid Comparison Dialog
 * Displays comparison between original stock statblock and current actor state.
 * Helps users understand what changed and how conversions were approximate.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { StockDroidComparisonUtility } from "/systems/foundryvtt-swse/scripts/domain/droids/stock-droid-comparison-utility.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/stock-droid-comparison-dialog.hbs';

export class StockDroidComparisonDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Open comparison dialog for a stock droid
   * @param {Actor} actor - The actor to compare
   * @param {Object} conversionReport - Stored conversion report from flags
   * @param {Object} options - Dialog options
   */
  static async openComparison(actor, conversionReport, options = {}) {
    const dialog = new this({
      actor,
      conversionReport,
      ...options
    });

    return dialog.render({ force: true });
  }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor || null;
    this.conversionReport = options.conversionReport || {};
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    ApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      classes: ['swse', 'stock-droid-comparison-dialog', 'swse-app'],
      width: 900,
      height: 750,
      title: 'Stock Droid Comparison',
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
      return `Compare: ${this.actor.name}`;
    }
    return 'Stock Droid Comparison';
  }

  async _prepareContext(options) {
    const actor = this.actor;
    const report = this.conversionReport;

    // Get published snapshot from report or extract from flags
    const publishedSnapshot = report.publishedTotals ||
                            actor?.flags?.swse?.stockDroidImport?.publishedTotals ||
                            {};

    // Run comparison
    const comparison = StockDroidComparisonUtility.compareStockVsCurrent(publishedSnapshot, actor);
    const summary = StockDroidComparisonUtility.getSummary(comparison);

    // Format categories for template
    const categoriesForTemplate = this._formatCategoriesForTemplate(comparison);

    return {
      actor: actor,
      sourceName: report.sourceName || actor?.flags?.swse?.stockDroidImport?.sourceName || 'Unknown',
      isConverted: !!actor?.flags?.swse?.stockDroidConversion,
      conversionDate: actor?.flags?.swse?.stockDroidConversion?.conversionTimestamp,
      comparison,
      categoriesForTemplate,
      summary
    };
  }

  /**
   * Format comparison categories for easy template iteration
   */
  _formatCategoriesForTemplate(comparison) {
    const categories = [];

    if (comparison.categories.identity?.fields) {
      categories.push({
        name: 'Identity',
        icon: 'fa-robot',
        fields: this._formatFields(comparison.categories.identity.fields)
      });
    }

    if (comparison.categories.abilities?.fields) {
      categories.push({
        name: 'Abilities',
        icon: 'fa-star',
        fields: this._formatFields(comparison.categories.abilities.fields)
      });
    }

    if (comparison.categories.defenses?.fields) {
      categories.push({
        name: 'Defenses',
        icon: 'fa-shield',
        fields: this._formatFields(comparison.categories.defenses.fields)
      });
    }

    if (comparison.categories.hp?.fields) {
      categories.push({
        name: 'Health & Threshold',
        icon: 'fa-heart',
        fields: this._formatFields(comparison.categories.hp.fields)
      });
    }

    if (comparison.categories.speed?.fields) {
      categories.push({
        name: 'Speed',
        icon: 'fa-gauge',
        fields: this._formatFields(comparison.categories.speed.fields)
      });
    }

    if (comparison.categories.attacks?.summary) {
      categories.push({
        name: 'Attacks',
        icon: 'fa-gun',
        summary: comparison.categories.attacks.summary
      });
    }

    if (comparison.categories.skills?.summary) {
      categories.push({
        name: 'Skills',
        icon: 'fa-dices',
        summary: comparison.categories.skills.summary
      });
    }

    if (comparison.categories.systems?.hasCustomSystems) {
      categories.push({
        name: 'Droid Systems (Custom)',
        icon: 'fa-cogs',
        fields: this._formatSystemFields(comparison.categories.systems.fields)
      });
    }

    return categories;
  }

  /**
   * Format field comparisons for template
   */
  _formatFields(fields) {
    const formatted = [];

    for (const [fieldName, fieldData] of Object.entries(fields)) {
      formatted.push({
        name: this._labelField(fieldName),
        published: fieldData.published,
        current: fieldData.current,
        status: fieldData.status,
        statusLabel: this._statusLabel(fieldData.status)
      });
    }

    return formatted;
  }

  /**
   * Format system fields for template
   */
  _formatSystemFields(fields) {
    const formatted = [];

    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      formatted.push({
        name: this._labelField(fieldName),
        value: fieldValue,
        status: 'configured'
      });
    }

    return formatted;
  }

  /**
   * Convert field name to display label
   */
  _labelField(fieldName) {
    const labels = {
      'str': 'Strength',
      'dex': 'Dexterity',
      'con': 'Constitution',
      'int': 'Intelligence',
      'wis': 'Wisdom',
      'cha': 'Charisma',
      'fortitude': 'Fortitude',
      'reflex': 'Reflex',
      'will': 'Will',
      'flatFooted': 'Flat-Footed',
      'hp': 'Hit Points',
      'threshold': 'Damage Threshold',
      'speed': 'Speed (squares)',
      'publishedCount': 'Published Attacks',
      'currentCount': 'Current Attacks',
      'publishedTrainedCount': 'Published Trained Skills',
      'currentTrainedCount': 'Current Trained Skills',
      'degree': 'Degree',
      'size': 'Size',
      'locomotion': 'Locomotion',
      'processor': 'Processor',
      'armor': 'Armor',
      'appendages': 'Appendages',
      'sensors': 'Sensors',
      'weapons': 'Integrated Weapons',
      'accessories': 'Accessories'
    };

    return labels[fieldName] || fieldName;
  }

  /**
   * Convert status to display label
   */
  _statusLabel(status) {
    const labels = {
      'same': '✓ Same',
      'changed': '⚠ Changed',
      'reference-only': '◦ Reference',
      'configured': '● Configured',
      'unknown': '? Unknown'
    };

    return labels[status] || status;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Close button
    const closeBtn = root.querySelector('[data-action="close"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }
}

export default StockDroidComparisonDialog;
