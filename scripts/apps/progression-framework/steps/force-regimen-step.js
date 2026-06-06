/**
 * force-regimen-step.js
 *
 * Force Regimen selection step plugin. Unlocked by Force Regimen Mastery.
 * This mirrors Force Power/Secret selection patterns but does not use icons:
 * cards are category-colored and sorted Force Training first, Lightsaber
 * Training second, with Vo'ren's cadences ordered I-V.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ForceRegistry } from '../../../engine/registries/force-registry.js';
import { FeatGrantEntitlementResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { swseLogger } from '../../../utils/logger.js';

const CATEGORY_ORDER = Object.freeze({
  'force-training': 10,
  'lightsaber-training': 20,
});

const VOREN_ORDER = Object.freeze({
  "vo'ren's first cadence": 1,
  "vo'ren's second cadence": 2,
  "vo'ren's third cadence": 3,
  "vo'ren's fourth cadence": 4,
  "vo'ren's fifth cadence": 5,
});

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']+/g, ' ').replace(/\s+/g, ' ').trim();
}

function sumCounts(map) {
  return Array.from(map.values()).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export class ForceRegimenStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._allRegimens = [];
    this._filteredRegimens = [];
    this._searchQuery = '';
    this._focusedRegimenId = null;
    this._committedRegimenCounts = new Map();
    this._remainingPicks = 0;
    this._totalBudget = 0;
    this._renderAbort = null;
    this._utilityUnlisteners = [];
  }

  get descriptor() { return this._descriptor; }

  async onStepEnter(shell) {
    try {
      if (!ForceRegistry._initialized) await ForceRegistry.init();
      this._allRegimens = (ForceRegistry.byType('regimen') || []).map((entry) => this._normalizeRegimen(entry));
      this._hydrateCommittedFromSession(shell);
      this._totalBudget = this._computeTotalEntitlements(shell.actor, shell);
      this._remainingPicks = Math.max(0, this._totalBudget - sumCounts(this._committedRegimenCounts));
      this._applyFilters();
      shell.mentor.askMentorEnabled = true;
      swseLogger.debug(`[ForceRegimenStep] Entered: ${this._allRegimens.length} regimens, ${this._totalBudget} budget, ${this._remainingPicks} remaining`);
    } catch (err) {
      swseLogger.error('[ForceRegimenStep.onStepEnter]', err);
      this._allRegimens = [];
      this._filteredRegimens = [];
      this._remainingPicks = 0;
      this._totalBudget = 0;
    }
  }

  async onStepExit(shell) {
    this._utilityUnlisteners.forEach(fn => fn());
    this._utilityUnlisteners = [];
  }

  async onDataReady(shell) {
    if (!shell.element) return;
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const onSearch = e => {
      this._searchQuery = e.detail.query;
      this._applyFilters();
      shell.render();
    };
    const onFilter = () => { this._applyFilters(); shell.render(); };
    const onSort = () => { this._applyFilters(); shell.render(); };

    shell.element.addEventListener('prog:utility:search', onSearch, { signal });
    shell.element.addEventListener('prog:utility:filter', onFilter, { signal });
    shell.element.addEventListener('prog:utility:sort', onSort, { signal });

    this._utilityUnlisteners = [
      () => shell.element?.removeEventListener('prog:utility:search', onSearch),
      () => shell.element?.removeEventListener('prog:utility:filter', onFilter),
      () => shell.element?.removeEventListener('prog:utility:sort', onSort),
    ];
  }

  async getStepData(context) {
    const totalSelected = sumCounts(this._committedRegimenCounts);
    const remaining = Math.max(0, this._totalBudget - totalSelected);
    const committedSummary = Array.from(this._committedRegimenCounts.entries()).map(([id, count]) => {
      const regimen = this._resolveRegimen(id);
      return { id, name: regimen?.name || id, count };
    });

    return {
      regimens: this._filteredRegimens,
      committedCounts: Object.fromEntries(this._committedRegimenCounts),
      committedSummary,
      focusedRegimenId: this._focusedRegimenId,
      selectedCount: totalSelected,
      selectionBudget: this._totalBudget,
      remainingPicks: remaining,
      hasSelectionBudget: this._totalBudget > 0,
      categoryGroups: this._buildCategoryGroups(this._filteredRegimens),
    };
  }

  getSelection() {
    const totalSelected = sumCounts(this._committedRegimenCounts);
    return {
      selected: Array.from(this._committedRegimenCounts.keys()),
      count: totalSelected,
      isComplete: totalSelected >= this._totalBudget,
    };
  }

  async onItemFocused(regimenId, shell) {
    const regimen = this._resolveRegimen(regimenId);
    if (!regimen) return;
    this._focusedRegimenId = regimenId;
    shell.focusedItem = regimen;
    shell.render();
  }

  async onItemCommitted(regimenId, shell) {
    const regimen = this._resolveRegimen(regimenId);
    if (!regimen) return;
    const current = this._committedRegimenCounts.get(regimenId) ?? 0;
    const selected = sumCounts(this._committedRegimenCounts);
    if (selected < this._totalBudget) {
      this._committedRegimenCounts.set(regimenId, current + 1);
    }
    const regimensList = Array.from(this._committedRegimenCounts.entries())
      .filter(([_id, count]) => count > 0)
      .map(([id, count]) => ({ id, count }));
    await this._commitNormalized(shell, 'forceRegimens', regimensList);
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, 'forceRegimens', regimensList);
    }
    this._focusedRegimenId = regimenId;
    shell.focusedItem = regimen;
    shell.render();
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/force-regimen-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!focusedItem) return this.renderDetailsPanelEmptyState();
    const currentCount = this._committedRegimenCounts.get(focusedItem.id) ?? 0;
    const selected = sumCounts(this._committedRegimenCounts);
    const canAddMore = selected < this._totalBudget;
    const normalized = normalizeDetailPanelData(focusedItem, 'force_regimen');
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/force-regimen-details.hbs',
      data: {
        regimen: focusedItem,
        selectedCount: currentCount,
        canAddMore,
        buttonLabel: currentCount > 0 ? 'Learn This Regimen Again' : 'Learn This Regimen',
        canonicalDescription: normalized.description || focusedItem.description || focusedItem.summary || '',
        metadataTags: normalized.metadataTags,
        hasMentorProse: normalized.fallbacks?.hasMentorProse,
      },
    };
  }

  renderDetailsPanelEmptyState() {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: {
        icon: 'fa-person-praying',
        message: 'Select a Force Regimen to review its training requirements and DC results.',
      },
    };
  }

  validate() {
    const selected = sumCounts(this._committedRegimenCounts);
    const remaining = Math.max(0, this._totalBudget - selected);
    return {
      isValid: remaining <= 0,
      errors: remaining <= 0 ? [] : [`Select ${remaining} more Force Regimen(s).`],
      warnings: [],
    };
  }

  getBlockingIssues() {
    const remaining = Math.max(0, this._totalBudget - sumCounts(this._committedRegimenCounts));
    return remaining <= 0 ? [] : [`${remaining} Force Regimen(s) remaining`];
  }

  getWarnings() { return []; }

  getRemainingPicks() {
    const selected = sumCounts(this._committedRegimenCounts);
    const remaining = Math.max(0, this._totalBudget - selected);
    if (remaining <= 0) {
      const summary = Array.from(this._committedRegimenCounts.entries()).map(([id, count]) => {
        const regimen = this._resolveRegimen(id);
        const name = regimen?.name || id;
        return count > 1 ? `${name} ×${count}` : name;
      });
      return [{ label: summary.length ? `✓ ${summary.join(', ')}` : `✓ ${selected} Selected`, count: 0, total: this._totalBudget, selected, isWarning: false }];
    }
    return [{ label: 'Force Regimen(s)', count: remaining, total: this._totalBudget, selected, isWarning: true }];
  }

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: { enabled: true, placeholder: 'Search Force Regimens…' },
      filters: [],
      sorts: [{ id: 'category', label: 'Category' }, { id: 'name', label: 'Alphabetical' }],
    };
  }

  getUtilityBarMode() { return 'rich'; }

  getMentorContext() {
    return 'Force Regimens are downtime training techniques. Choose the routines this character has learned through Force Regimen Mastery.';
  }

  getMentorMode() { return 'standard'; }

  _hydrateCommittedFromSession(shell) {
    this._committedRegimenCounts.clear();
    const values = shell?.progressionSession?.draftSelections?.forceRegimens || [];
    if (!Array.isArray(values)) return;
    for (const entry of values) {
      const id = entry?.id || entry?._id || entry?.regimenId || entry?.name || entry;
      const count = Math.max(0, Number(entry?.count ?? 1) || 0);
      if (id && count > 0) this._committedRegimenCounts.set(id, count);
    }
  }

  _computeTotalEntitlements(actor, shell = null) {
    const total = FeatGrantEntitlementResolver.totalForGrantType(actor, 'forceRegimenSlots', { shell, includePending: true });
    const owned = Array.from(actor?.items ?? []).filter((item) => String(item?.type || '') === 'force-regimen').length;
    return Math.max(0, total - owned + sumCounts(this._committedRegimenCounts));
  }

  _normalizeRegimen(entry) {
    const system = entry?.system || {};
    const category = String(system.category || entry.category || '').trim() || 'force-training';
    const nameKey = normalizeKey(entry?.name);
    const romanOrder = VOREN_ORDER[nameKey] || null;
    const group = category === 'lightsaber-training' ? 'Lightsaber Training Regimens' : 'Force Training Regimens';
    return {
      ...entry,
      id: entry.id || entry._id || system.slug || entry.name,
      category,
      group: system.group || entry.group || group,
      categoryLabel: category === 'lightsaber-training' ? 'Lightsaber' : 'Force',
      categoryCss: category === 'lightsaber-training' ? 'lightsaber' : 'force',
      romanOrder,
      time: system.time || '',
      targets: system.targets || '',
      requirements: system.requirements || '',
      dcTiers: Array.isArray(system.dcTiers) ? system.dcTiers : [],
      summary: system.summary || entry.summary || '',
      description: system.descriptionText || system.description?.value || system.description || entry.description || '',
      effect: system.effect || '',
      system,
      sortKey: `${CATEGORY_ORDER[category] || 99}:${romanOrder || 99}:${String(entry.name || '')}`,
    };
  }

  _buildCategoryGroups(regimens) {
    const groups = new Map();
    for (const regimen of regimens) {
      const key = regimen.category || 'force-training';
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          label: key === 'lightsaber-training' ? 'Lightsaber Regimens' : 'Force Regimens',
          css: key === 'lightsaber-training' ? 'lightsaber' : 'force',
          regimens: [],
        });
      }
      groups.get(key).regimens.push(regimen);
    }
    return Array.from(groups.values()).sort((a, b) => (CATEGORY_ORDER[a.id] || 99) - (CATEGORY_ORDER[b.id] || 99));
  }

  _resolveRegimen(regimenId) {
    return this._allRegimens.find((regimen) => String(regimen.id) === String(regimenId) || String(regimen.name) === String(regimenId));
  }

  _applyFilters() {
    let filtered = [...this._allRegimens];
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter((regimen) => [regimen.name, regimen.summary, regimen.description, regimen.group, regimen.categoryLabel].join(' ').toLowerCase().includes(q));
    }
    filtered.sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
    this._filteredRegimens = filtered;
  }
}
