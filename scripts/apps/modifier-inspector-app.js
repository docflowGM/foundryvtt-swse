/**
 * ModifierInspectorApp — ApplicationV2 Migration
 * System-wide modifier transparency and debugging
 */
import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/engine/effects/modifiers/ModifierEngine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class ModifierInspectorApp extends BaseSWSEAppV2 {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.filterSource = null;
    this.sortBy = 'target';
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'modifier-inspector',
      title: 'Modifier Inspector',
      template: 'modules/foundryvtt-swse/templates/apps/modifier-inspector.hbs',
      position: {
        width: 600,
        height: 500
      },
      window: {
        resizable: true
      },
      classes: ['modifier-inspector']
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const allModifiers = await ModifierEngine.getAllModifiers(this.actor);
    const aggregated = await ModifierEngine.aggregateAll(this.actor);

    // Filter by source if set
    let filtered = allModifiers;
    if (this.filterSource) {
      filtered = allModifiers.filter(m => m.source === this.filterSource);
    }

    // Sort
    filtered.sort((a, b) => {
      if (this.sortBy === 'source') {
        return (a.sourceName || '').localeCompare(b.sourceName || '');
      }
      return (a.target || '').localeCompare(b.target || '');
    });

    // Get unique sources for filter dropdown
    const sources = [...new Set(allModifiers.map(m => m.source))];

    // Get target summary
    const targetSummary = {};
    for (const [target, total] of Object.entries(aggregated)) {
      targetSummary[target] = { total, modCount: allModifiers.filter(m => m.target === target).length };
    }

    return foundry.utils.mergeObject(context, {
      actor: this.actor,
      allModifiers: filtered,
      aggregated,
      targetSummary,
      sources,
      filterSource: this.filterSource,
      sortBy: this.sortBy,
      totalModifiers: allModifiers.length,
      totalTargets: Object.keys(targetSummary).length
    });
  }

  wireEvents() {
    const root = this.element;

    const filterSelect = root.querySelector('select[name="filter"]');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterSource = e.currentTarget.value || null;
        this.render();
      });
    }

    const sortSelect = root.querySelector('select[name="sort"]');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.currentTarget.value;
        this.render();
      });
    }

    root.querySelectorAll('[data-action="toggle-modifier"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modId = e.currentTarget.dataset.modId;
        this._toggleModifier(modId);
      });
    });

    const copyBtn = root.querySelector('[data-action="copy-json"]');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        const json = JSON.stringify(this.actor.system.derived?.modifiers, null, 2);
        navigator.clipboard.writeText(json);
        ui.notifications.info('Modifier data copied to clipboard');
      });
    }
  }

  async _toggleModifier(modId) {
    const allMods = await ModifierEngine.getAllModifiers(this.actor);
    const mod = allMods.find(m => m.id === modId);

    if (!mod || mod.source !== 'custom') {
      ui.notifications.warn('Can only toggle custom modifiers');
      return;
    }

    const customMods = this.actor.system.customModifiers || [];
    const updated = customMods.map(m => {
      if (m.id === modId) {
        return { ...m, enabled: m.enabled !== false ? false : true };
      }
      return m;
    });

    await ActorEngine.updateActor(this.actor, { 'system.customModifiers': updated });
    this.render();
  }
}
