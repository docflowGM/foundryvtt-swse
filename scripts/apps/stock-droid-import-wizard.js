/**
 * Stock Droid Import Wizard
 * Multi-step wizard for importing stock droids from compendium.
 *
 * Steps:
 * 1. Select Stock Droid - Browse, search, and filter available stock droids
 * 2. Preview - Review selected droid's published statblock data
 * 3. Import Mode - Choose between statblock import or playable conversion
 * 4. Review - Final confirmation before applying import
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { DroidTemplateImporterEngine } from "/systems/foundryvtt-swse/scripts/engine/import/droid-template-importer-engine.js";
import { DroidTemplateDataLoader } from "/systems/foundryvtt-swse/scripts/core/droid-template-data-loader.js";
import { StockDroidNormalizer } from "/systems/foundryvtt-swse/scripts/domain/droids/stock-droid-normalizer.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/stock-droid-import-wizard.hbs';

const DEFAULT_STEPS = [
  { key: 'select', index: 1, label: 'Select', subtitle: 'Choose a stock droid' },
  { key: 'preview', index: 2, label: 'Preview', subtitle: 'Review statblock data' },
  { key: 'mode', index: 3, label: 'Import Mode', subtitle: 'Choose how to apply it' },
  { key: 'review', index: 4, label: 'Review', subtitle: 'Confirm and import' }
];

const STEP_ORDER = DEFAULT_STEPS.map(s => s.key);

export class StockDroidImportWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    ApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      classes: ['swse', 'stock-droid-import-wizard', 'swse-app'],
      width: 1080,
      height: 820,
      title: 'Import Stock Droid',
      window: { resizable: true }
    }
  );

  static PARTS = {
    content: {
      template: TEMPLATE_PATH
    }
  };

  constructor(options = {}) {
    super(options);
    this.callback = options.callback || null;
    this.actor = options.actor || null;
    this.stockDroidService = options.stockDroidService || null;
    this.importer = options.importer || DroidTemplateImporterEngine;
    this.converter = options.converter || null;

    // Wizard state
    this.state = {
      step: 'select',
      query: '',
      filters: {
        degree: '',
        size: '',
        source: '',
        tag: ''
      },
      results: [],
      selectedDroidId: null,
      selectedDroid: null,
      importMode: 'statblock',  // 'statblock' or 'convert'
      preserve: {
        name: true,
        image: true,
        biography: true
      },
      preview: null,
      review: {
        warnings: [],
        confidence: 'medium'
      },
      isImporting: false,
      importError: null
    };
  }

  get title() {
    const titles = {
      'select': 'Import Stock Droid — Select',
      'preview': 'Import Stock Droid — Preview',
      'mode': 'Import Stock Droid — Mode',
      'review': 'Import Stock Droid — Review'
    };
    return titles[this.state.step] || 'Import Stock Droid';
  }

  async _prepareContext(options) {
    await this.#ensureResults();
    const selectedDroid = this.state.selectedDroid || this.#getSelectedResult();
    const preview = this.#buildPreview(selectedDroid);
    const review = this.#buildReview(selectedDroid, preview);

    return {
      step: this.state.step,
      currentStep: STEP_ORDER.indexOf(this.state.step) + 1,
      steps: this.#buildSteps(),
      query: this.state.query,
      filters: foundry.utils.deepClone(this.state.filters),
      filterOptions: this.#buildFilterOptions(),
      availableDroids: this.#buildResultCards(),
      selectedDroid,
      preview,
      selectedMode: this.state.importMode,
      preserve: foundry.utils.deepClone(this.state.preserve),
      review,
      canGoBack: this.#canGoBack(),
      canGoNext: this.#canGoNext(),
      canApply: this.#canApply(),
      importError: this.state.importError
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;
    this.#activateUiListeners(root);
  }

  #activateUiListeners(root) {
    // Action handlers (buttons)
    root.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', this.#onActionClick.bind(this));
    });

    // Droid card selection
    root.querySelectorAll('[data-droid-id]').forEach(card => {
      card.addEventListener('click', (event) => {
        const droidId = card.dataset.droidId;
        if (droidId) this.#handleSelectDroid(droidId);
      });
    });

    // Mode card selection
    root.querySelectorAll('[data-mode]').forEach(card => {
      card.addEventListener('click', (event) => {
        const mode = card.dataset.mode;
        if (mode) this.#handleChooseMode(mode);
      });
    });

    // Search input
    const queryInput = root.querySelector('input[data-field="search"]');
    queryInput?.addEventListener('input', (event) => {
      this.state.query = event.currentTarget.value || '';
      this.#refreshSelectStep();
    });

    // Filter selects
    root.querySelectorAll('select[data-field]').forEach(select => {
      const field = select.dataset.field;
      if (field && field !== 'search' && field in this.state.filters) {
        select.addEventListener('change', (event) => {
          const value = event.currentTarget.value || '';
          this.state.filters[field] = value;
          this.#refreshSelectStep();
        });
      }
    });

    // Preserve checkboxes
    root.querySelectorAll('input[name^="preserve."]').forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
        const name = event.currentTarget.name;
        const checked = !!event.currentTarget.checked;
        const [, key] = name.split('.');
        if (key in this.state.preserve) {
          this.state.preserve[key] = checked;
          this.render();
        }
      });
    });
  }

  async #onActionClick(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    if (!action) return;

    switch (action) {
      case 'next':
        return this.#goToNextStep();
      case 'back':
        return this.#goToPreviousStep();
      case 'cancel':
        return this.close();
      case 'apply':
        return this.#applyImport();
      default:
        return;
    }
  }

  async #ensureResults() {
    if (this.state.results.length) return;
    const rawResults = await this.#loadStockDroids();
    this.state.results = rawResults.map(entry => this.#normalizeResult(entry));
  }

  async #loadStockDroids() {
    const templates = await DroidTemplateDataLoader.loadDroidTemplates();
    const results = [];

    for (const template of templates) {
      const rawRecord = await DroidTemplateDataLoader.getDroidActorDocument(template.id);
      if (!rawRecord) continue;

      const normalized = StockDroidNormalizer.normalizeStockDroidRecord(rawRecord);

      results.push({
        id: template.id,
        name: template.name,
        img: template.portrait,
        degree: normalized.identity?.degree || '',
        size: normalized.identity?.size || '',
        source: normalized.source?.sourceBook || '',
        category: normalized.identity?.category || 'stock-droid',
        tags: normalized.identity?.tags || [],
        summary: normalized.identity?.summary || template.name,
        raw: normalized
      });
    }

    return results;
  }

  #normalizeResult(entry) {
    return {
      id: entry.id || entry._id || foundry.utils.randomID(),
      name: entry.name || 'Unnamed Droid',
      img: entry.img || 'icons/svg/robot.svg',
      degree: entry.degree || entry.identity?.degree || '',
      size: entry.size || entry.identity?.size || '',
      source: entry.source || entry.identity?.source || entry.sourceBook || '',
      category: entry.category || entry.identity?.category || '',
      tags: Array.isArray(entry.tags) ? entry.tags : (Array.isArray(entry.identity?.tags) ? entry.identity.tags : []),
      summary: entry.summary || entry.identity?.summary || '',
      raw: entry
    };
  }

  #buildSteps() {
    const currentIndex = STEP_ORDER.indexOf(this.state.step);
    return DEFAULT_STEPS.map((step, idx) => ({
      ...step,
      num: step.index,
      meta: step.subtitle,
      active: step.key === this.state.step,
      complete: idx < currentIndex
    }));
  }

  #buildFilterOptions() {
    const filteredSource = this.state.results;
    return {
      degree: this.#toOptions(this.#collectDistinct(filteredSource, 'degree'), this.state.filters.degree),
      size: this.#toOptions(this.#collectDistinct(filteredSource, 'size'), this.state.filters.size),
      source: this.#toOptions(this.#collectDistinct(filteredSource, 'source'), this.state.filters.source),
      tag: this.#toOptions(this.#collectDistinctTags(filteredSource), this.state.filters.tag)
    };
  }

  #collectDistinct(results, key) {
    return [...new Set(results.map(r => r[key]).filter(Boolean))].sort((a, b) => `${a}`.localeCompare(`${b}`));
  }

  #collectDistinctTags(results) {
    const tags = new Set();
    for (const result of results) {
      for (const tag of result.tags || []) {
        if (tag) tags.add(tag);
      }
    }
    return [...tags].sort((a, b) => `${a}`.localeCompare(`${b}`));
  }

  #toOptions(values, selectedValue) {
    return values.map(value => ({
      value,
      label: value,
      selected: value === selectedValue
    }));
  }

  #buildResultCards() {
    const query = this.state.query.trim().toLowerCase();
    const filters = this.state.filters;
    const selectedId = this.state.selectedDroidId;

    return this.state.results
      .filter(result => {
        if (query) {
          const haystack = [
            result.name,
            result.degree,
            result.size,
            result.source,
            result.category,
            result.summary,
            ...(result.tags || [])
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (filters.degree && result.degree !== filters.degree) return false;
        if (filters.size && result.size !== filters.size) return false;
        if (filters.source && result.source !== filters.source) return false;
        if (filters.tag && !(result.tags || []).includes(filters.tag)) return false;
        return true;
      })
      .map(result => ({
        ...result,
        selected: result.id === selectedId
      }));
  }

  #getSelectedResult() {
    if (!this.state.selectedDroidId) return null;
    return this.state.results.find(r => r.id === this.state.selectedDroidId) || null;
  }

  async #handleSelectDroid(droidId) {
    this.state.selectedDroidId = droidId;
    this.state.selectedDroid = this.#getSelectedResult();
    this.state.preview = null;
    this.render();
  }

  async #handleChooseMode(mode) {
    if (mode === 'convert' && !this.#isPlayableConversionAvailable()) return;
    if (!['statblock', 'convert'].includes(mode)) return;
    this.state.importMode = mode;
    this.render();
  }

  async #goToNextStep() {
    if (!this.#canGoNext()) return;
    const currentIndex = STEP_ORDER.indexOf(this.state.step);
    if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) return;

    if (this.state.step === 'select') {
      this.state.selectedDroid = this.#getSelectedResult();
      this.state.preview = this.#buildPreview(this.state.selectedDroid);
    }

    this.state.step = STEP_ORDER[currentIndex + 1];
    this.render();
  }

  async #goToPreviousStep() {
    if (!this.#canGoBack()) return;
    const currentIndex = STEP_ORDER.indexOf(this.state.step);
    if (currentIndex <= 0) return;
    this.state.step = STEP_ORDER[currentIndex - 1];
    this.render();
  }

  #canGoBack() {
    return STEP_ORDER.indexOf(this.state.step) > 0;
  }

  #canGoNext() {
    switch (this.state.step) {
      case 'select':
        return !!this.state.selectedDroidId;
      case 'preview':
        return !!this.state.selectedDroid;
      case 'mode':
        if (this.state.importMode === 'convert' && !this.#isPlayableConversionAvailable()) return false;
        return !!this.state.importMode;
      default:
        return false;
    }
  }

  #canApply() {
    return this.state.step === 'review' && !!this.state.selectedDroid && !!this.state.importMode && !this.state.isImporting;
  }

  #isPlayableConversionAvailable() {
    return !!this.converter?.convertStockDroidToBuilderSeed;
  }

  #buildPreview(selectedDroid) {
    if (!selectedDroid) {
      return {
        identity: {},
        publishedTotals: {
          abilities: {},
          defenses: {},
          attacks: {}
        },
        skillSummary: [],
        attackSummary: [],
        warnings: []
      };
    }

    const raw = selectedDroid.raw || {};
    const published = raw.publishedTotals || raw.preview?.publishedTotals || {};

    return {
      identity: {
        id: selectedDroid.id,
        name: selectedDroid.name,
        img: selectedDroid.img,
        degree: selectedDroid.degree,
        size: selectedDroid.size,
        category: selectedDroid.category,
        source: selectedDroid.source,
        sourceBook: raw.source?.sourceBook || raw.identity?.sourceBook || selectedDroid.source || '',
        page: raw.source?.page || raw.identity?.page || '',
        costDisplay: raw.identity?.costDisplay || raw.costDisplay || raw.costNumeric || '',
        summary: selectedDroid.summary
      },
      publishedTotals: {
        hp: published.hp || raw.hp || raw.system?.HP || '',
        threshold: published.threshold || raw.threshold || raw.system?.damageThreshold || '',
        speed: published.speed || raw.speed || raw.system?.speed || '',
        initiative: published.initiative || raw.initiative || raw.system?.initiative || '',
        grapple: published.grapple || raw.grapple || raw.system?.grapple || '',
        defenses: {
          reflex: published.defenses?.reflex || raw.defenses?.reflex || raw.system?.reflexDefense || '',
          fortitude: published.defenses?.fortitude || raw.defenses?.fortitude || raw.system?.fortitudeDefense || '',
          will: published.defenses?.will || raw.defenses?.will || raw.system?.willDefense || ''
        },
        abilities: {
          str: published.abilities?.str || raw.abilities?.str || raw.system?.baseStats?.abilities?.str?.total || '',
          dex: published.abilities?.dex || raw.abilities?.dex || raw.system?.baseStats?.abilities?.dex?.total || '',
          con: published.abilities?.con || raw.abilities?.con || raw.system?.baseStats?.abilities?.con?.total || '',
          int: published.abilities?.int || raw.abilities?.int || raw.system?.baseStats?.abilities?.int?.total || '',
          wis: published.abilities?.wis || raw.abilities?.wis || raw.system?.baseStats?.abilities?.wis?.total || '',
          cha: published.abilities?.cha || raw.abilities?.cha || raw.system?.baseStats?.abilities?.cha?.total || ''
        },
        attacks: {
          melee: published.attacks?.melee || raw.attacks?.melee || raw.system?.attacks?.melee || '',
          ranged: published.attacks?.ranged || raw.attacks?.ranged || raw.system?.attacks?.ranged || ''
        }
      },
      skillSummary: this.#buildSkillSummary(raw),
      attackSummary: this.#buildAttackSummary(raw),
      warnings: raw.warnings || raw.preview?.warnings || []
    };
  }

  #buildSkillSummary(raw) {
    const summary = raw.skillSummary || raw.preview?.skillSummary;
    if (Array.isArray(summary) && summary.length) return summary;

    const skills = raw.publishedTotals?.skills || raw.skills || raw.system?.skills || {};
    return Object.entries(skills)
      .slice(0, 8)
      .map(([key, value]) => ({
        label: this.#humanizeKey(key),
        value: typeof value === 'object' ? (value.total || value.value || '') : value
      }));
  }

  #buildAttackSummary(raw) {
    const summary = raw.attackSummary || raw.preview?.attackSummary;
    if (Array.isArray(summary) && summary.length) return summary;

    const melee = raw.publishedTotals?.attacks?.melee || raw.system?.attacks?.melee || raw.attacks?.melee;
    const ranged = raw.publishedTotals?.attacks?.ranged || raw.system?.attacks?.ranged || raw.attacks?.ranged;
    return [
      { label: 'Melee', value: melee || '—' },
      { label: 'Ranged', value: ranged || '—' }
    ];
  }

  #buildReview(selectedDroid, preview) {
    const warnings = [...(preview?.warnings || [])];
    const preserveSummary = Object.entries(this.state.preserve)
      .filter(([, enabled]) => enabled)
      .map(([key]) => this.#humanizeKey(key));

    return {
      selectedName: selectedDroid?.name || 'No droid selected',
      mode: this.state.importMode,
      modeLabel: this.state.importMode === 'convert'
        ? 'Convert to Custom'
        : 'Stock Droid Statblock',
      degree: selectedDroid?.degree || '—',
      size: selectedDroid?.size || '—',
      source: selectedDroid?.source || '—',
      confidence: selectedDroid?.raw?.confidence || 'medium',
      warnings,
      preserveSummary,
      applyLabel: this.state.importMode === 'convert'
        ? 'Begin Conversion'
        : 'Import Stock Droid'
    };
  }

  #humanizeKey(key) {
    return `${key}`
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, m => m.toUpperCase());
  }

  async #refreshSelectStep() {
    this.render();
  }

  async #applyImport() {
    const selectedDroid = this.state.selectedDroid || this.#getSelectedResult();
    if (!selectedDroid) {
      ui.notifications.error('No droid selected');
      return;
    }

    this.state.isImporting = true;
    await this.render(false);

    try {
      SWSELogger.log(`[StockDroidImportWizard] Importing droid: ${selectedDroid.id} (mode: ${this.state.importMode})`);

      if (this.state.importMode === 'convert') {
        if (!this.converter?.convertStockDroidToBuilderSeed) {
          ui.notifications.warn('Conversion is not available yet.');
          this.state.isImporting = false;
          await this.render(false);
          return;
        }

        const result = await this.converter.convertStockDroidToBuilderSeed(selectedDroid.raw, {
          actor: this.actor,
          preserve: foundry.utils.deepClone(this.state.preserve)
        });

        if (this.callback && typeof this.callback === 'function') {
          this.callback({
            choice: 'droid-import',
            actor: this.actor,
            mode: this.state.importMode,
            result
          });
        }

        await this.close();
        return;
      }

      // Standard statblock import
      const actor = await this.importer.importDroidTemplate(selectedDroid.id, null);

      if (actor) {
        ui.notifications.info(`Droid "${actor.name}" imported successfully!`);
        SWSELogger.log(`[StockDroidImportWizard] Import successful: ${actor.id}`);

        if (this.callback && typeof this.callback === 'function') {
          this.callback({
            choice: 'droid-import',
            actor: actor,
            mode: this.state.importMode
          });
        }

        await this.close();
      } else {
        this.state.importError = 'Failed to import droid. Check console for details.';
        await this.render(false);
      }
    } catch (err) {
      SWSELogger.error('[StockDroidImportWizard] Import error:', err);
      this.state.importError = `Import failed: ${err.message}`;
      await this.render(false);
    } finally {
      this.state.isImporting = false;
    }
  }

  static create(options = {}) {
    const wizard = new StockDroidImportWizard(options);
    wizard.render(true);
    return wizard;
  }
}

export default StockDroidImportWizard;
