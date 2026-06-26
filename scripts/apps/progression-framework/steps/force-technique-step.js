/**
 * force-technique-step.js
 *
 * Force Technique selection step plugin — same stacking model as Force Powers.
 * CONDITIONAL — unlocked by engine-defined rules.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ForceRegistry } from '../../../engine/registries/force-registry.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions, handleAskMentorWithPicker } from './mentor-step-integration.js';
import { swseLogger } from '../../../utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { collectKnownForceTechniques } from '/systems/foundryvtt-swse/scripts/utils/force-knowledge.js';



const FORCE_POWER_MASTERY_SLUG = 'force-power-mastery';
const FORCE_POWER_MASTERY_SETTING = 'forcePowerMasteryIncludesLightsaberForms';

function normalizeForceChoiceSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value = '') {
  return foundry?.utils?.escapeHTML?.(String(value ?? ''))
    ?? String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function readSwseSetting(key, fallback = false) {
  try {
    return game?.settings?.get?.('foundryvtt-swse', key) ?? fallback;
  } catch (_err) {
    try {
      return game?.settings?.get?.('swse', key) ?? fallback;
    } catch (_ignored) {
      return fallback;
    }
  }
}

function itemTypeMatches(item, ...types) {
  const type = String(item?.type ?? '').trim().toLowerCase();
  return types.some(t => type === String(t).trim().toLowerCase());
}

function isForcePowerMasteryTechniqueDoc(technique) {
  return normalizeForceChoiceSlug(technique?.name || technique?.system?.name || technique?.label) === FORCE_POWER_MASTERY_SLUG;
}

function isLightsaberFormPowerDoc(power) {
  const system = power?.system || {};
  const values = [
    power?.type,
    power?.pack,
    power?.category,
    system.category,
    system.subcategory,
    system.discipline,
    system.sourcePack,
    system.pack,
    system.powerType,
    ...(Array.isArray(power?.tags) ? power.tags : []),
    ...(Array.isArray(system.tags) ? system.tags : []),
    ...(Array.isArray(system.descriptors) ? system.descriptors : []),
  ].map(v => String(v ?? '').toLowerCase()).join(' ');
  return /lightsaber[-_\s]?form|form[-_\s]?power|lightsaberformpowers/.test(values);
}

function getForcePowerMasteryChoiceFromEntry(entry) {
  const candidates = [
    entry?.forcePowerMasteryChoice,
    entry?.system?.forcePowerMastery,
    entry?.system?.choice,
    entry?.system?.selectedChoice,
    entry?.flags?.swse?.forcePowerMastery,
    entry?.flags?.swse?.progression?.forcePowerMastery,
    entry?.flags?.['foundryvtt-swse']?.forcePowerMastery,
  ].filter(Boolean);
  for (const candidate of candidates) {
    const slug = normalizeForceChoiceSlug(candidate?.slug || candidate?.powerSlug || candidate?.targetSlug || candidate?.id || candidate?.name || candidate?.label || candidate?.value);
    if (!slug) continue;
    return {
      slug,
      label: String(candidate?.label || candidate?.name || candidate?.powerName || candidate?.targetName || slug).trim() || slug,
      powerId: candidate?.powerId || candidate?.id || candidate?.targetId || null,
      powerName: candidate?.powerName || candidate?.name || candidate?.targetName || candidate?.label || slug,
      isLightsaberFormPower: candidate?.isLightsaberFormPower === true,
    };
  }
  const name = String(entry?.name || '').trim();
  const match = name.match(/Force\s+Power\s+Mastery\s*\(([^)]+)\)/i);
  if (match?.[1]) {
    const slug = normalizeForceChoiceSlug(match[1]);
    if (slug) return { slug, label: match[1].trim(), powerId: null, powerName: match[1].trim(), isLightsaberFormPower: false };
  }
  return null;
}

const TECHNIQUE_RECOMMENDED_NAMES = new Set([
  'Force Point Recovery',
  'Force Power Mastery',
  'Improved Rebuke',
  'Improved Vital Transfer',
  'Improved Battle Strike',
]);

const TECHNIQUE_CATEGORY_DEFS = [
  { key: 'recommended', label: 'Recommended', icon: 'fa-lightbulb', isMajor: true },
  { key: 'related-powers', label: 'Related Force Power', icon: 'fa-hand-sparkles', isMajor: true },
  { key: 'light-side', label: 'Light Side', icon: 'fa-sun', isSubcategory: true },
  { key: 'dark-side', label: 'Dark Side', icon: 'fa-moon', isSubcategory: true },
  { key: 'telekinesis', label: 'Telekinesis', icon: 'fa-wind', isSubcategory: true },
  { key: 'mind-affecting', label: 'Mind Affecting', icon: 'fa-brain', isSubcategory: true },
  { key: 'vital-healing', label: 'Vital / Healing', icon: 'fa-kit-medical', isSubcategory: true },
  { key: 'protection', label: 'Protection', icon: 'fa-shield-halved', isSubcategory: true },
  { key: 'other-power-upgrades', label: 'Other Power Upgrades', icon: 'fa-wand-magic-sparkles', isSubcategory: true },
  { key: 'utf-applications', label: 'Use the Force Applications', icon: 'fa-circle-nodes', isMajor: true },
  { key: 'telepathy', label: 'Telepathy', icon: 'fa-comments', isSubcategory: true },
  { key: 'sense-force', label: 'Sense Force', icon: 'fa-radar', isSubcategory: true },
  { key: 'sense-surroundings', label: 'Sense Surroundings', icon: 'fa-eye', isSubcategory: true },
  { key: 'force-point-economy', label: 'Force Point Economy', icon: 'fa-coins', isMajor: true },
  { key: 'general-mastery', label: 'General Force Power Mastery', icon: 'fa-star', isMajor: true },
  { key: 'unavailable', label: 'Unavailable / Missing Power', icon: 'fa-lock', isMajor: true },
];

const TECHNIQUE_CATEGORY_BY_NAME = Object.freeze({
  'improved force light': ['light-side'],
  'improved enlighten': ['light-side', 'mind-affecting'],
  'improved malacia': ['light-side', 'mind-affecting', 'vital-healing'],
  'improved valor': ['light-side', 'protection'],

  'improved dark rage': ['dark-side'],
  'improved force lightning': ['dark-side'],
  'improved force storm': ['dark-side'],
  'improved lightning burst': ['dark-side'],
  'improved thought bomb': ['dark-side', 'mind-affecting'],
  'improved crucitorn': ['dark-side', 'protection'],
  'improved rend': ['dark-side'],
  'improved dark transfer': ['dark-side', 'vital-healing'],

  'extended blind': ['telekinesis'],
  'extended force disarm': ['telekinesis'],
  'extended force thrust': ['telekinesis'],
  'extended move object': ['telekinesis'],
  'improved ballistakinesis': ['telekinesis'],
  'improved battle strike': ['telekinesis'],
  'improved detonate': ['telekinesis'],
  'improved fold space': ['telekinesis'],
  'improved force disarm': ['telekinesis'],
  'improved force slam': ['telekinesis'],
  'improved force thrust': ['telekinesis'],
  'improved ionize': ['telekinesis'],
  'improved kinetic combat': ['telekinesis'],
  'improved levitate': ['telekinesis'],
  'improved repulse': ['telekinesis'],
  'improved stagger': ['telekinesis'],
  'improved force shield': ['telekinesis', 'protection'],
  'improved phase': ['telekinesis', 'protection'],

  'dominate mind': ['mind-affecting'],
  'improved force stun': ['mind-affecting'],
  'improved mind trick': ['mind-affecting'],
  'improved obscure': ['mind-affecting'],
  'improved rebuke': ['mind-affecting'],
  'improved technometry': ['mind-affecting'],

  'advanced vital transfer': ['vital-healing'],
  'cure disease': ['vital-healing'],
  'detoxify poison': ['vital-healing'],
  'improved force trance': ['vital-healing'],
  'improved vital transfer': ['vital-healing'],

  'improved energy resistance': ['protection'],
  'improved resist force': ['protection'],

  'extended force grip': ['other-power-upgrades'],
  'improved cloak': ['other-power-upgrades'],
  'improved convection': ['other-power-upgrades'],
  'improved cryokinesis': ['other-power-upgrades'],
  'improved force grip': ['other-power-upgrades'],
  'improved move light object': ['other-power-upgrades'],
  'improved plant surge': ['other-power-upgrades'],
  'improved shatterpoint': ['other-power-upgrades'],

  'improved telepathy': ['utf-applications', 'telepathy'],
  'language absorption': ['utf-applications', 'telepathy'],
  'improved sense force': ['utf-applications', 'sense-force'],
  'improved sense surroundings': ['utf-applications', 'sense-surroundings'],

  'force point recovery': ['force-point-economy'],
  'force power mastery': ['general-mastery'],
});

export class ForceTechniqueStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._allTechniques = [];
    this._legalTechniques = [];
    this._filteredTechniques = [];
    this._techniqueAvailability = new Map();
    this._showAllTechniques = false;
    this._searchQuery = '';
    this._focusedTechniqueId = null;
    this._activeCategory = 'recommended';
    this._categorySidebarCollapsed = false;
    this._committedTechniqueCounts = new Map();
    this._committedTechniqueEntries = new Map();
    this._ownedTechniqueIds = new Set();
    this._remainingPicks = 0;
    this._suggestedTechniques = [];  // Suggested force techniques
    this._renderAbort = null;
    this._utilityUnlisteners = [];
  }

  get descriptor() { return this._descriptor; }

  async onStepEnter(shell) {
    try {
      if (!ForceRegistry._initialized) {
        await ForceRegistry.init();
      }

      this._allTechniques = ForceRegistry.byType('technique') || [];
      this._hydrateCommittedFromSession(shell);
      this._hydrateOwnedTechniques(shell?.actor);
      // PHASE 3: Resolve from class progression features + engine choice budget
      const entitlements = await this._resolveTechniqueEntitlements(shell);
      this._remainingPicks = entitlements.remaining;

      // PHASE 3.1: Pass shell to access pending class grants
      await this._computeLegalTechniques(shell.actor, shell);
      this._applyFilters();

      // Get suggested force techniques
      await this._getSuggestedTechniques(shell.actor, shell);

      shell.mentor.askMentorEnabled = true;

      swseLogger.debug(`[ForceTechniqueStep] Entered: ${this._allTechniques.length} total`);
    } catch (e) {
      swseLogger.error('[ForceTechniqueStep.onStepEnter]', e);
      this._allTechniques = [];
    }
  }

  _hydrateCommittedFromSession(shell) {
    this._committedTechniqueCounts.clear();
    this._committedTechniqueEntries.clear();
    const values = shell?.progressionSession?.draftSelections?.forceTechniques || [];
    if (!Array.isArray(values)) return;
    for (const entry of values) {
      const rawId = entry?.id || entry?._id || entry?.techniqueId || entry?.baseTechniqueId || entry?.name || entry;
      const choice = getForcePowerMasteryChoiceFromEntry(entry);
      const id = choice?.slug
        ? (entry?.selectionId || `${entry?.techniqueId || entry?.baseTechniqueId || rawId}::${choice.slug}`)
        : rawId;
      const count = Math.max(0, Number(entry?.count ?? 1) || 0);
      if (!id || count <= 0) continue;
      this._committedTechniqueCounts.set(id, count);
      if (choice) {
        this._committedTechniqueEntries.set(String(id), {
          ...entry,
          id: entry?.id || entry?.techniqueId || entry?.baseTechniqueId || rawId,
          selectionId: String(id),
          forcePowerMasteryChoice: choice,
          count,
        });
      }
    }
  }

  async onStepExit(shell) {
    this._utilityUnlisteners.forEach(fn => fn());
    this._utilityUnlisteners = [];
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const onSearch = e => {
      if (e?.detail?.handledByStepHook) return;
      this._searchQuery = e?.detail?.query || '';
      this._categorySidebarCollapsed = Boolean(this._searchQuery);
      this._applyFilters();
      shell?.requestRender?.({ preserveScroll: true, reason: 'force-technique-search' }) ?? shell?.render?.();
    };
    const onFilter = e => {
      if (e?.detail?.handledByStepHook) return;
      this._applyFilters();
      shell?.requestRender?.({ preserveScroll: true, reason: 'force-technique-filter' }) ?? shell?.render?.();
    };
    const onSort = e => {
      if (e?.detail?.handledByStepHook) return;
      this._applyFilters();
      shell?.requestRender?.({ preserveScroll: true, reason: 'force-technique-sort' }) ?? shell?.render?.();
    };

    shell.element.addEventListener('prog:utility:search', onSearch, { signal });
    shell.element.addEventListener('prog:utility:filter', onFilter, { signal });
    shell.element.addEventListener('prog:utility:sort', onSort, { signal });

    this._utilityUnlisteners = [
      () => shell.element?.removeEventListener('prog:utility:search', onSearch),
      () => shell.element?.removeEventListener('prog:utility:filter', onFilter),
      () => shell.element?.removeEventListener('prog:utility:sort', onSort),
    ];
  }


  async onUtilityChange({ type, detail = {}, shell } = {}) {
    if (type === 'search') {
      this._searchQuery = detail?.query || '';
      this._categorySidebarCollapsed = Boolean(this._searchQuery);
      this._applyFilters();
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'force-technique-search' }) ?? shell?.render?.());
      return true;
    }

    if (type === 'filter' || type === 'sort') {
      this._applyFilters();
      await (shell?.requestRender?.({ preserveScroll: true, reason: `force-technique-${type}` }) ?? shell?.render?.());
      return true;
    }

    return false;
  }

  async getStepData(context) {
    const committedSummary = this._buildCommittedTechniqueList().map((entry) => {
      const id = entry?.id || entry?.techniqueId || entry?.selectionId || entry;
      const technique = this._allTechniques.find(t => t.id === id) || this._allTechniques.find(t => t.id === entry?.techniqueId || t.id === entry?.baseTechniqueId);
      return { id: entry?.selectionId || id, name: entry?.name || technique?.name || id, count: Math.max(0, Number(entry?.count ?? 1) || 0) };
    });

    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedTechniques);
    const techniques = this._filteredTechniques.map(t => this._formatTechniqueCard(t, suggestedIds, confidenceMap));
    const browserModel = this._buildBrowserModel(techniques, suggestedIds, confidenceMap);

    return {
      techniques,
      focusedTechniqueId: this._focusedTechniqueId,
      committedCounts: Object.fromEntries(this._committedTechniqueCounts),
      committedSummary,
      remainingPicks: this._remainingPicks,
      showAllTechniques: this._showAllTechniques,
      legalTechniqueCount: this._legalTechniques.length,
      totalTechniqueCount: this._allTechniques.length,
      hasSuggestions,
      suggestedTechniqueIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
      ...browserModel,
    };
  }

  getSelection() {
    const totalSelected = Array.from(this._committedTechniqueCounts.values()).reduce((sum, c) => sum + c, 0);
    return {
      selected: Array.from(this._committedTechniqueCounts.keys()),
      count: totalSelected,
      isComplete: totalSelected >= this._remainingPicks,
    };
  }

  async onItemFocused(techniqueId, shell) {
    const technique = this._allTechniques.find(t => t.id === techniqueId);
    if (!technique) return;

    this._focusedTechniqueId = techniqueId;
    shell.focusedItem = technique;
    await handleAskMentor(shell.actor, 'force-techniques', shell);
    shell.render();
  }

  async onItemHovered(techniqueId, shell) {}

  async onItemCommitted(techniqueId, shell) {
    const technique = this._allTechniques.find(t => t.id === techniqueId);
    if (!technique) return;

    const availability = this._getTechniqueAvailabilityMeta(technique);
    if (!availability.selectable) {
      this._focusedTechniqueId = techniqueId;
      shell.focusedItem = technique;
      ui?.notifications?.warn?.(availability.reason || 'This Force Technique requires a Force Power that is not in your suite.');
      shell.render();
      return;
    }

    const totalSelected = Array.from(this._committedTechniqueCounts.values()).reduce((sum, c) => sum + c, 0);
    if (totalSelected >= this._remainingPicks) {
      this._focusedTechniqueId = techniqueId;
      shell.focusedItem = technique;
      shell.render();
      return;
    }

    if (isForcePowerMasteryTechniqueDoc(technique)) {
      const choice = await this._promptForcePowerMasteryChoice(technique, shell);
      if (!choice) return;
      const selectionId = `${techniqueId}::${choice.slug}`;
      if (this._committedTechniqueCounts.has(selectionId)) {
        ui?.notifications?.warn?.(`Force Power Mastery is already assigned to ${choice.slug}. Choose a different Force Power.`);
        return;
      }
      this._committedTechniqueCounts.set(selectionId, 1);
      this._committedTechniqueEntries.set(selectionId, this._buildForcePowerMasteryEntry(technique, choice, selectionId));
    } else {
      const currentCount = this._committedTechniqueCounts.get(techniqueId) ?? 0;
      this._committedTechniqueCounts.set(techniqueId, currentCount + 1);
    }

    const techniquesList = this._buildCommittedTechniqueList();

    await this._commitNormalized(shell, 'forceTechniques', techniquesList);

    // Update observable build intent (Phase 6 solution)
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, 'forceTechniques', techniquesList);
    }

    this._focusedTechniqueId = techniqueId;
    shell.focusedItem = technique;
    shell.render();
  }


  async handleAction(action, event, target, shell) {
    if (action === 'select-force-technique-category') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const category = target?.dataset?.category || target?.closest?.('[data-category]')?.dataset?.category;
      if (!category) return true;
      this._activeCategory = category;
      this._searchQuery = '';
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'force-technique-category' }) ?? shell?.render?.());
      return true;
    }

    if (action === 'toggle-force-technique-category-sidebar') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      this._categorySidebarCollapsed = !this._categorySidebarCollapsed;
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'force-technique-category-sidebar' }) ?? shell?.render?.());
      return true;
    }

    if (action === 'toggle-force-technique-show-all') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      this._showAllTechniques = !this._showAllTechniques;
      this._applyFilters();
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'force-technique-show-all-toggle' }) ?? shell?.render?.());
      return true;
    }

    if (action === 'reset-force-technique-browser') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      this._searchQuery = '';
      this._activeCategory = 'recommended';
      this._categorySidebarCollapsed = false;
      this._showAllTechniques = false;
      this._applyFilters();
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'force-technique-browser-reset' }) ?? shell?.render?.());
      return true;
    }

    return false;
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/force-technique-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!focusedItem) {
      return this.renderDetailsPanelEmptyState();
    }

    const isForcePowerMastery = isForcePowerMasteryTechniqueDoc(focusedItem);
    const masterySelections = isForcePowerMastery ? this._getCommittedForcePowerMasteryChoices(focusedItem.id) : [];
    const currentCount = isForcePowerMastery
      ? masterySelections.reduce((sum, entry) => sum + Math.max(0, Number(entry?.count ?? 1) || 0), 0)
      : (this._committedTechniqueCounts.get(focusedItem.id) ?? 0);
    const totalSelected = Array.from(this._committedTechniqueCounts.values()).reduce((sum, c) => sum + c, 0);
    const canAddMore = totalSelected < this._remainingPicks;

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(focusedItem, 'force_technique');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/force-technique-details.hbs',
      data: {
        technique: focusedItem,
        description: focusedItem.description || focusedItem.system?.description || '',
        selectedCount: currentCount,
        selectedCountLabel: `${currentCount} time${currentCount === 1 ? '' : 's'}`,
        canAddMore,
        buttonLabel: currentCount > 0 ? 'Choose This Technique Again' : 'Choose This Technique',
        isForcePowerMastery,
        forcePowerMasteryChoices: masterySelections.map(entry => entry?.forcePowerMasteryChoice || entry).filter(Boolean),
        // Add normalized fields for enhanced detail rail
        canonicalDescription: normalized.description,
        metadataTags: normalized.metadataTags,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
      },
    };
  }

  renderDetailsPanelEmptyState() {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: {
        icon: 'fa-book-sparkles',
        message: 'Select a Force Technique to master new methods.',
      },
    };
  }

  validate() {
    const totalSelected = Array.from(this._committedTechniqueCounts.values()).reduce((sum, c) => sum + c, 0);
    const isValid = totalSelected >= this._remainingPicks;
    const errors = isValid ? [] : [`Select ${this._remainingPicks - totalSelected} more Technique(s).`];
    return { isValid, errors, warnings: [] };
  }

  getBlockingIssues() {
    const totalSelected = Array.from(this._committedTechniqueCounts.values()).reduce((sum, c) => sum + c, 0);
    const remaining = this._remainingPicks - totalSelected;
    if (remaining <= 0) return [];
    return [`${remaining} Technique(s) remaining`];
  }

  getWarnings() { return []; }

  getRemainingPicks() {
    const totalSelected = Array.from(this._committedTechniqueCounts.values()).reduce((sum, c) => sum + c, 0);
    const remaining = this._remainingPicks - totalSelected;

    if (remaining <= 0) {
      const summaryParts = this._buildCommittedTechniqueList().map((entry) => {
        const id = entry?.id || entry?.techniqueId || entry?.selectionId || entry;
        const technique = this._allTechniques.find(t => t.id === id) || this._allTechniques.find(t => t.id === entry?.techniqueId || t.id === entry?.baseTechniqueId);
        const name = entry?.name || technique?.name || id;
        const count = Math.max(0, Number(entry?.count ?? 1) || 0);
        return count > 1 ? `${name} ×${count}` : name;
      });
      const label = summaryParts.length > 0
        ? `✓ ${summaryParts.join(', ')}`
        : `✓ ${totalSelected} Selected`;
      return [{ label, count: 0, total: Math.max(0, Number(this._remainingPicks || 0)), selected: Math.max(0, totalSelected), isWarning: false }];
    }

    return [{ label: 'Technique(s)', count: Math.max(0, remaining), total: Math.max(0, Number(this._remainingPicks || 0)), selected: Math.max(0, totalSelected), isWarning: true }];
  }

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: { enabled: true, placeholder: 'Search Techniques…' },
      filters: [],
      sorts: [{ id: 'name', label: 'Alphabetical' }],
    };
  }

  getUtilityBarMode() { return 'rich'; }

  getMentorContext(shell) {
    // PHASE 3: Guard against undefined mentor helpers
    // Use standard guidance helper instead of custom mentor resolution
    return getStepGuidance(shell.actor, 'force-techniques', shell)
      || 'Master these techniques with patience and practice.';
  }

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedTechniques && this._suggestedTechniques.length > 0) {
      await handleAskMentorWithPicker(shell.actor, 'force-techniques', this._suggestedTechniques, shell, {
        domain: 'force-techniques',
        archetype: 'your force technique choice',
        stepLabel: 'Force techniques'
      }, async (selected) => {
        const id = selected?.id || selected?._id || selected?.techniqueId;
        if (!id) return;
        await this.onItemFocused(id, shell);
        await this.onItemCommitted(id, shell);
        shell.render();
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'force-techniques', shell);
    }
  }

  getMentorMode() { return 'interactive'; }

  // Private

  /**
   * PHASE 3: Resolve Force Technique entitlements from class progression features
   * Primary source: class level progression features (force_technique_choice)
   * Secondary: engine choice budget from feature dispatcher
   * Fallback: actor state for compatibility
   */
  async _resolveTechniqueEntitlements(shell) {
    const { resolveForceTechniqueEntitlements } = await import(
      '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js'
    );

    // Note: engine data not available in this context, so pass null
    const entitlements = resolveForceTechniqueEntitlements(shell, null, shell?.actor);

    if (entitlements.isBlocked) {
      swseLogger.log(
        `[ForceTechniqueStep] Force Techniques blocked — no class grant resolved`,
        { reasons: entitlements.reasons }
      );
    } else if (entitlements.isEmpty && entitlements.total > 0) {
      swseLogger.debug(
        `[ForceTechniqueStep] Force Techniques available but not yet selected`,
        { total: entitlements.total, reasons: entitlements.reasons }
      );
    }

    return entitlements;
  }

  async _computeLegalTechniques(actor, shell = null) {
    this._legalTechniques = [];
    this._techniqueAvailability.clear();

    // Build pending state including class-granted features
    const pending = this._buildPendingStateWithClassGrants(actor, shell);

    // PHASE 3.1: Pass pending state so prerequisites see class-granted features
    for (const technique of this._allTechniques) {
      const availability = this._assessTechniqueAvailability(technique, actor, shell);
      this._techniqueAvailability.set(String(technique?.id || technique?._id || this._normalizeLookupKey(technique?.name)), availability);
      if (!availability.selectable) continue;

      const candidate = this._asForceTechniqueCandidate(technique);
      const assessment = AbilityEngine.evaluateAcquisition(actor, candidate, pending);

      if (assessment.legal) {
        this._legalTechniques.push(technique);
      }
    }

    swseLogger.debug(`[ForceTechniqueStep] Legal techniques: ${this._legalTechniques.length} of ${this._allTechniques.length}`, {
      showAll: this._showAllTechniques,
      gated: this._allTechniques.length - this._legalTechniques.length,
    });
  }

  /**
   * Build pending state with class-granted features for prerequisite evaluation.
   * @private
   */
  _buildPendingStateWithClassGrants(actor, shell = null) {
    const basePending = {
      selectedClass: shell?.committedSelections?.get?.('class') || null,
      selectedFeats: [],
      selectedTalents: [],
      selectedSkills: [],
      skillRanks: {},
      grantedFeats: [],
    };

    // Derive class-granted features
    const selectedClass = basePending.selectedClass;
    if (selectedClass && actor) {
      const ledger = buildClassGrantLedger(actor, selectedClass, basePending);
      return mergeLedgerIntoPending(basePending, ledger);
    }

    return basePending;
  }

  _applyFilters() {
    let filtered = this._showAllTechniques ? [...this._allTechniques] : [...this._legalTechniques];
    if (this._searchQuery) {
      const q = this._normalizeSearchText(this._searchQuery);
      filtered = filtered.filter(t => this._techniqueSearchText(t).includes(q));
    }
    filtered.sort((a, b) => this._compareTechniques(a, b));
    this._filteredTechniques = filtered;
  }

  _getMentorObject(actor) {
    const className = actor.system?.class?.primary?.name;
    return getMentorForClass(className) || MENTORS.Scoundrel || Object.values(MENTORS)[0];
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested force techniques from SuggestionService
   * Recommendations based on class, feats, and other selections
   * @private
   */
  async _getSuggestedTechniques(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, (shell?.mode || shell?.progressionSession?.mode || 'chargen'), {
        domain: 'force-techniques',
        available: this._legalTechniques.filter(t => this._getTechniqueAvailabilityMeta(t).selectable),
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedTechniques = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[ForceTechniqueStep] Suggestion service error:', err);
      this._suggestedTechniques = [];
    }
  }

  /**
   * Extract character data from shell for suggestion engine
   * Allows suggestions to understand what choices have been made so far
   * @private
   */
  _buildCharacterDataFromShell(shell) {
    if (!shell?.buildIntent) {
      return {};
    }

    return shell.buildIntent.toCharacterData();
  }

  _isTechniqueSelected(techniqueId) {
    const id = String(techniqueId || '');
    if (!id) return false;
    if (this._committedTechniqueCounts.has(id)) return true;
    for (const entry of this._committedTechniqueEntries.values()) {
      if (String(entry?.id || entry?.techniqueId || entry?.baseTechniqueId || '') === id) return true;
    }
    return false;
  }

  _hydrateOwnedTechniques(actor) {
    this._ownedTechniqueIds.clear();

    const addKey = (value) => {
      const raw = String(value ?? '').trim();
      if (!raw) return;
      this._ownedTechniqueIds.add(raw);
      const normalized = this._normalizeLookupKey(raw);
      if (normalized) this._ownedTechniqueIds.add(normalized);
    };

    const addEntry = (entry) => {
      if (!entry) return;
      addKey(entry?.id);
      addKey(entry?._id);
      addKey(entry?.techniqueId);
      addKey(entry?.baseTechniqueId);
      addKey(entry?.selectionId);
      addKey(entry?.name);
      addKey(entry?.label);
      addKey(entry?.system?.slug);
      addKey(entry?.system?.name);
      addKey(entry?.flags?.swse?.id);

      const choice = getForcePowerMasteryChoiceFromEntry(entry);
      if (choice?.slug) {
        const base = String(entry?.techniqueId || entry?.baseTechniqueId || entry?.id || entry?._id || '').trim();
        if (base) addKey(`${base}::${choice.slug}`);
        addKey(`${entry?.name || 'Force Power Mastery'} (${choice.slug})`);
        addKey(choice.slug);
      }
    };

    for (const known of collectKnownForceTechniques(actor)) {
      addEntry(known.entry || known);
      addKey(known.name);
      addKey(known.id);
      for (const identity of Array.from(known.identities || [])) addKey(identity);
    }
  }

  _isTechniqueOwned(techniqueId, technique = null) {
    const candidates = [
      techniqueId,
      technique?.id,
      technique?._id,
      technique?.techniqueId,
      technique?.baseTechniqueId,
      technique?.selectionId,
      technique?.name,
      technique?.label,
      technique?.system?.slug,
      technique?.system?.name,
      technique?.flags?.swse?.id,
    ];

    const choice = getForcePowerMasteryChoiceFromEntry(technique);
    if (choice?.slug) {
      const base = String(technique?.techniqueId || technique?.baseTechniqueId || technique?.id || technique?._id || techniqueId || '').trim();
      if (base) candidates.push(`${base}::${choice.slug}`);
      candidates.push(choice.slug, `${technique?.name || 'Force Power Mastery'} (${choice.slug})`);
    }

    return candidates.some((candidate) => {
      const raw = String(candidate ?? '').trim();
      if (!raw) return false;
      return this._ownedTechniqueIds.has(raw) || this._ownedTechniqueIds.has(this._normalizeLookupKey(raw));
    });
  }

  _getCommittedForcePowerMasteryChoices(techniqueId = null) {
    const targetTechniqueId = String(techniqueId || '');
    return Array.from(this._committedTechniqueEntries.entries())
      .filter(([selectionId, entry]) => {
        const choice = entry?.forcePowerMasteryChoice || getForcePowerMasteryChoiceFromEntry(entry);
        if (!choice) return false;
        const baseId = String(entry?.id || entry?.techniqueId || entry?.baseTechniqueId || selectionId.split('::')[0] || '');
        return !targetTechniqueId || baseId === targetTechniqueId;
      })
      .map(([selectionId, entry]) => ({ selectionId, count: this._committedTechniqueCounts.get(selectionId) ?? entry?.count ?? 1, ...entry }));
  }

  _buildCommittedTechniqueList() {
    return Array.from(this._committedTechniqueCounts.entries())
      .filter(([_, count]) => count > 0)
      .map(([techniqueId, count]) => {
        const entry = this._committedTechniqueEntries.get(String(techniqueId));
        if (entry) return { ...entry, count };
        const technique = this._allTechniques.find(t => String(t?.id || t?._id) === String(techniqueId));
        return {
          id: techniqueId,
          techniqueId,
          name: technique?.name || String(techniqueId),
          type: 'force-technique',
          count,
        };
      });
  }

  _buildForcePowerMasteryEntry(technique, choice, selectionId) {
    return {
      id: technique?.id,
      techniqueId: technique?.id,
      baseTechniqueId: technique?.id,
      selectionId,
      name: `${technique?.name || 'Force Power Mastery'} (${choice.slug})`,
      count: 1,
      forcePowerMasteryChoice: choice,
      system: {
        repeatable: true,
        choice: choice,
        forcePowerMastery: choice,
      },
      flags: {
        swse: {
          forcePowerMastery: choice,
          progression: {
            forcePowerMastery: choice,
          },
        },
      },
    };
  }

  _getKnownForcePowerMasterySlugs(shell = null) {
    const slugs = new Set();
    const add = (entry) => {
      const choice = getForcePowerMasteryChoiceFromEntry(entry);
      if (choice?.slug) slugs.add(choice.slug);
    };
    for (const entry of this._committedTechniqueEntries.values()) add(entry);
    const draftEntries = shell?.progressionSession?.draftSelections?.forceTechniques || [];
    if (Array.isArray(draftEntries)) draftEntries.forEach(add);
    for (const item of Array.from(shell?.actor?.items ?? [])) {
      if (itemTypeMatches(item, 'forcetechnique', 'force-technique', 'feat') && isForcePowerMasteryTechniqueDoc(item)) add(item);
    }
    return slugs;
  }

  _buildForcePowerMasteryChoices(shell = null) {
    const includeLightsaberForms = readSwseSetting(FORCE_POWER_MASTERY_SETTING, false) === true;
    const actor = shell?.actor;
    const choicesBySlug = new Map();
    const addPower = (power, source = 'suite') => {
      if (!power) return;
      const slug = normalizeForceChoiceSlug(power?.system?.slug || power?.slug || power?.name || power?.id || power?._id);
      if (!slug) return;
      const isLightsaberFormPower = isLightsaberFormPowerDoc(power);
      if (isLightsaberFormPower && !includeLightsaberForms) return;
      if (!choicesBySlug.has(slug)) {
        choicesBySlug.set(slug, {
          slug,
          label: slug,
          powerId: power?.id || power?._id || power?.powerId || null,
          powerName: power?.name || power?.label || slug,
          source,
          isLightsaberFormPower,
        });
      }
    };

    for (const item of Array.from(actor?.items ?? [])) {
      if (itemTypeMatches(item, 'force-power')) addPower(item, 'owned');
    }

    const pendingPowerRefs = [];
    const draftPowers = shell?.progressionSession?.draftSelections?.forcePowers;
    if (Array.isArray(draftPowers)) pendingPowerRefs.push(...draftPowers);
    const committedPowers = shell?.committedSelections?.get?.('forcePowers');
    if (Array.isArray(committedPowers)) pendingPowerRefs.push(...committedPowers);
    const selectedPowers = shell?.getSelection?.('forcePowers')?.selected;
    if (Array.isArray(selectedPowers)) pendingPowerRefs.push(...selectedPowers);

    const registryPowers = ForceRegistry.byType?.('power') || [];
    const findRegistryPower = (ref) => {
      const id = typeof ref === 'string' ? ref : (ref?.id || ref?._id || ref?.powerId || ref?.name || ref?.label);
      const name = typeof ref === 'string' ? ref : (ref?.name || ref?.label || ref?.powerName);
      const idString = String(id || '').trim();
      const nameString = String(name || '').trim();
      return registryPowers.find(power => String(power?.id || power?._id || '') === idString)
        || registryPowers.find(power => String(power?.name || '').toLowerCase() === nameString.toLowerCase())
        || (typeof ref === 'object' ? ref : null);
    };
    for (const ref of pendingPowerRefs) addPower(findRegistryPower(ref), 'pending');

    const alreadyMastered = this._getKnownForcePowerMasterySlugs(shell);
    return Array.from(choicesBySlug.values())
      .filter(choice => !alreadyMastered.has(choice.slug))
      .sort((a, b) => a.slug.localeCompare(b.slug));
  }

  async _promptForcePowerMasteryChoice(technique, shell) {
    const choices = this._buildForcePowerMasteryChoices(shell);
    if (!choices.length) {
      ui?.notifications?.warn?.('Force Power Mastery requires at least one unmastered Force Power in your Force suite.');
      return null;
    }

    const optionHtml = choices.map((choice, index) => `
      <label class="swse-fpm-choice ${choice.isLightsaberFormPower ? 'swse-fpm-choice--form-power' : ''}">
        <input type="radio" name="forcePowerMasteryTarget" value="${escapeHtml(choice.slug)}" ${index === 0 ? 'checked' : ''}>
        <span class="swse-fpm-choice__slug">${escapeHtml(choice.slug)}</span>
        <span class="swse-fpm-choice__name">${escapeHtml(choice.powerName || choice.slug)}${choice.isLightsaberFormPower ? ' · Lightsaber Form Power' : ''}</span>
      </label>`).join('');

    const content = `<form class="swse-force-power-mastery-picker">
      <p>Choose the Force Power this Force Technique masters. The stored target uses the power slug so future rolls can match reliably.</p>
      <div class="swse-fpm-choice-list">${optionHtml}</div>
    </form>`;

    return SWSEDialogV2.prompt({
      title: technique?.name || 'Force Power Mastery',
      content,
      label: 'Master Selected Power',
      callback: (html) => {
        const root = html?.[0] ?? html;
        const slug = String(root?.querySelector?.('[name="forcePowerMasteryTarget"]:checked')?.value || '').trim();
        return choices.find(choice => choice.slug === slug) || null;
      },
      options: {
        id: 'swse-force-power-mastery-picker',
        classes: ['swse-force-power-mastery-dialog'],
        width: 560,
        height: 'auto',
        resizable: true,
      },
    });
  }

  _formatTechniqueCard(technique, suggestedIds = new Set(), confidenceMap = new Map()) {
    const id = String(technique?.id || technique?._id || this._normalizeLookupKey(technique?.name));
    const isSuggested = this.isSuggestedItem(id, suggestedIds) || this.isSuggestedItem(technique?.id, suggestedIds);
    const confidenceData = confidenceMap.get ? (confidenceMap.get(id) || confidenceMap.get(technique?.id)) : (confidenceMap[id] || confidenceMap[technique?.id]);
    const availability = this._getTechniqueAvailabilityMeta(technique);
    const relatedPower = availability.relatedPower || this._getTechniqueRelatedPower(technique);
    const categoryKeys = this._getTechniqueCategoryKeys(technique);
    const primaryCategory = TECHNIQUE_CATEGORY_DEFS.find(category => categoryKeys.includes(category.key) && !category.isMajor)
      || TECHNIQUE_CATEGORY_DEFS.find(category => categoryKeys.includes(category.key))
      || TECHNIQUE_CATEGORY_DEFS[0];
    return {
      ...technique,
      id,
      _id: technique?._id || id,
      relatedPower,
      categoryKeys,
      searchCategoryLabel: relatedPower || primaryCategory?.label || 'Force Technique',
      isSuggested,
      isFocused: this._focusedTechniqueId && String(id) === String(this._focusedTechniqueId),
      isSelected: this._isTechniqueSelected(id),
      isOwned: this._isTechniqueOwned(id, technique),
      isUnavailable: !availability.selectable,
      availabilityLabel: availability.label || null,
      missingRelatedPower: availability.missingRelatedPower || null,
      unavailableReason: availability.reason || null,
      shortSummary: this._stripHtml(technique?.description || technique?.system?.description || technique?.system?.benefit || ''),
      badgeLabel: isSuggested ? 'Recommended' : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
    };
  }

  _normalizeSearchText(value) {
    return String(value || '').trim().toLowerCase();
  }

  _normalizeLookupKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  _stripHtml(value) {
    return String(value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _getTechniqueRelatedPower(technique) {
    const system = technique?.system || {};
    const explicit = system.relatedPower || system.related_power || system.power || technique?.relatedPower;
    if (explicit) return String(explicit).trim();

    const prereqId = String(system.prerequisite_id || system.prerequisiteId || '').trim();
    if (prereqId) {
      const powerEntry = ForceRegistry.resolveEntry?.(prereqId, 'power') || ForceRegistry.getById?.(prereqId);
      if (powerEntry?.type === 'power' && powerEntry?.name) return String(powerEntry.name).trim();
    }

    const prereq = String(system.prerequisite || system.prerequisites || technique?.prerequisites?.raw || '').trim();
    const bracketMatch = prereq.match(/^\[([^\]]+)\]$/);
    if (bracketMatch?.[1]) {
      const powerEntry = ForceRegistry.resolveEntry?.(bracketMatch[1], 'power') || ForceRegistry.getById?.(bracketMatch[1]);
      if (powerEntry?.type === 'power' && powerEntry?.name) return String(powerEntry.name).trim();
    }
    if (prereq && !/^at least|force training|use the force|utf|force point/i.test(prereq) && !/^\[[^\]]+\]$/.test(prereq)) return prereq;
    const name = String(technique?.name || '').trim();
    const match = name.match(/^(?:Improved|Extended|Advanced)\s+(.+)$/i);
    if (match) return match[1].trim();
    return '';
  }

  _asForceTechniqueCandidate(technique) {
    return {
      ...technique,
      type: 'force-technique',
      system: {
        ...(technique?.system || {}),
        tags: Array.from(new Set([...(technique?.system?.tags || []), 'force_technique'])),
      },
    };
  }

  _getTechniqueAvailabilityMeta(technique) {
    const id = String(technique?.id || technique?._id || this._normalizeLookupKey(technique?.name));
    return this._techniqueAvailability.get(id) || {
      selectable: true,
      bucket: 'general',
      label: 'General Technique',
      reason: '',
      relatedPower: this._getTechniqueRelatedPower(technique),
    };
  }

  _assessTechniqueAvailability(technique, actor = null, shell = null) {
    const relatedPower = this._getTechniqueRelatedPower(technique);
    const name = String(technique?.name || '').trim();

    if (isForcePowerMasteryTechniqueDoc(technique)) {
      const choices = this._buildForcePowerMasteryChoices(shell);
      return choices.length
        ? { selectable: true, bucket: 'general-mastery', label: 'General Mastery', relatedPower: '', reason: '' }
        : { selectable: false, bucket: 'unavailable', label: 'Needs a Force Power', relatedPower: '', reason: 'Force Power Mastery requires at least one unmastered Force Power in your suite.' };
    }

    const isUseTheForceApplication = this._isUseTheForceTechnique(technique)
      && (!relatedPower || this._isUseTheForceApplicationName(relatedPower));
    if (!relatedPower || isUseTheForceApplication || this._isGeneralForceTechnique(technique)) {
      return { selectable: true, bucket: isUseTheForceApplication ? 'use-the-force' : 'general', label: isUseTheForceApplication ? 'Use the Force Technique' : 'General Technique', relatedPower, reason: '' };
    }

    const knownPowerKeys = this._getKnownForcePowerKeys(actor, shell);
    const relatedKey = this._normalizeLookupKey(relatedPower);
    const prereqId = String(technique?.system?.prerequisite_id || technique?.system?.prerequisiteId || '').trim();
    const matched = knownPowerKeys.has(relatedKey) || (prereqId && knownPowerKeys.has(prereqId));
    if (matched) {
      return { selectable: true, bucket: 'owned-power', label: 'Owned Power Technique', relatedPower, reason: '' };
    }

    return {
      selectable: false,
      bucket: 'unavailable',
      label: 'Unavailable',
      relatedPower,
      reason: `${name || 'This Force Technique'} requires ${relatedPower} in your Force Power suite.`,
      missingRelatedPower: relatedPower,
    };
  }

  _getKnownForcePowerKeys(actor = null, shell = null) {
    const keys = new Set();
    const add = (entry) => {
      if (!entry) return;
      const id = String(entry?.id || entry?._id || entry?.powerId || entry?.uuid || '').trim();
      const name = String(entry?.name || entry?.label || entry?.powerName || '').trim();
      if (id) keys.add(id);
      if (name) keys.add(this._normalizeLookupKey(name));
    };

    for (const item of Array.from(actor?.items ?? [])) {
      if (itemTypeMatches(item, 'force-power')) add(item);
    }

    const refs = [];
    const draftPowers = shell?.progressionSession?.draftSelections?.forcePowers;
    if (Array.isArray(draftPowers)) refs.push(...draftPowers);
    const committedPowers = shell?.committedSelections?.get?.('forcePowers');
    if (Array.isArray(committedPowers)) refs.push(...committedPowers);
    const selectedPowers = shell?.getSelection?.('forcePowers')?.selected;
    if (Array.isArray(selectedPowers)) refs.push(...selectedPowers);

    const registryPowers = ForceRegistry.byType?.('power') || [];
    for (const ref of refs) {
      if (typeof ref === 'string') {
        const resolved = registryPowers.find(power => String(power?.id || power?._id || '') === ref)
          || registryPowers.find(power => this._normalizeLookupKey(power?.name) === this._normalizeLookupKey(ref));
        add(resolved || { id: ref, name: ref });
      } else {
        const refId = String(ref?.id || ref?._id || ref?.powerId || '').trim();
        const refName = String(ref?.name || ref?.label || ref?.powerName || '').trim();
        const resolved = registryPowers.find(power => String(power?.id || power?._id || '') === refId)
          || registryPowers.find(power => this._normalizeLookupKey(power?.name) === this._normalizeLookupKey(refName));
        add(resolved || ref);
      }
    }

    return keys;
  }

  _isGeneralForceTechnique(technique = {}) {
    const name = String(technique?.name || '').toLowerCase();
    const tags = [
      ...(Array.isArray(technique?.tags) ? technique.tags : []),
      ...(Array.isArray(technique?.system?.tags) ? technique.system.tags : []),
    ].map(tag => String(tag || '').toLowerCase());
    return name === 'force point recovery'
      || name === 'force power mastery'
      || tags.includes('force_point_recovery')
      || tags.includes('force_power_reuse')
      || tags.includes('signature_power');
  }

  _isUseTheForceApplicationName(value = '') {
    const key = this._normalizeLookupKey(value);
    return new Set([
      'force-trance',
      'move-light-object',
      'sense-force',
      'sense-surroundings',
      'telepathy',
      'use-the-force',
      'utf',
    ]).has(key);
  }

  _isUseTheForceTechnique(technique = {}) {
    const benefit = String(technique.system?.benefit || technique.system?.description || technique.description || '').toLowerCase();
    const name = String(technique.name || '').toLowerCase();
    const prerequisite = String(technique.system?.prerequisite || '').toLowerCase();
    return benefit.includes('use the force')
      || benefit.includes('telepathy ability')
      || benefit.includes('sense surroundings')
      || benefit.includes('sense force')
      || benefit.includes('move light object')
      || benefit.includes('force trance')
      || name.includes('sense surroundings')
      || name.includes('sense force')
      || name.includes('telepathy')
      || name.includes('move light object')
      || name.includes('force trance')
      || this._isUseTheForceApplicationName(prerequisite);
  }

  _techniqueSearchText(technique) {
    const system = technique?.system || {};
    return this._normalizeSearchText([
      technique?.name,
      technique?.description,
      system.description,
      system.benefit,
      system.prerequisite,
      system.prerequisites,
      system.relatedPower,
      ...(Array.isArray(technique?.tags) ? technique.tags : []),
      ...(Array.isArray(system.tags) ? system.tags : []),
      this._getTechniqueCategoryKeys(technique).join(' '),
    ].filter(Boolean).join(' '));
  }

  _getTechniqueCategoryKeys(technique) {
    const name = String(technique?.name || '').trim();
    const normalizedName = this._normalizeSearchText(name);
    const keys = new Set();
    if (TECHNIQUE_RECOMMENDED_NAMES.has(name)) keys.add('recommended');

    const mapped = TECHNIQUE_CATEGORY_BY_NAME[normalizedName] || [];
    for (const key of mapped) keys.add(key);

    const availability = this._getTechniqueAvailabilityMeta(technique);
    if (availability.bucket === 'owned-power') keys.add('related-powers');
    if (availability.bucket === 'use-the-force') keys.add('utf-applications');
    if (availability.bucket === 'general' || availability.bucket === 'general-mastery') keys.add('general-mastery');
    if (availability.bucket === 'unavailable') keys.add('unavailable');

    const relatedPower = availability.relatedPower || this._getTechniqueRelatedPower(technique);
    if (relatedPower && !['Force Point Recovery', 'Force Power Mastery'].includes(name)) keys.add('related-powers');

    if (keys.size === 0) keys.add('other-power-upgrades');
    return Array.from(keys);
  }

  _compareTechniques(a, b) {
    const relatedA = this._getTechniqueRelatedPower(a) || '';
    const relatedB = this._getTechniqueRelatedPower(b) || '';
    const byRelated = relatedA.localeCompare(relatedB);
    if (byRelated !== 0) return byRelated;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  }

  _makeCategoryOption(def, techniques) {
    const matching = techniques.filter((technique) => this._getTechniqueCategoryKeys(technique).includes(def.key));
    return {
      ...def,
      totalCount: matching.length,
      isActive: this._activeCategory === def.key,
    };
  }

  _buildBrowserModel(formattedTechniques, suggestedIds = new Set(), confidenceMap = new Map()) {
    const allTechniques = Array.isArray(formattedTechniques) ? formattedTechniques : [];
    const categorySource = this._showAllTechniques ? (this._allTechniques || []) : (this._legalTechniques || []);
    const allLegalFormatted = categorySource.map((technique) => this._formatTechniqueCard(technique, suggestedIds, confidenceMap));
    const categoryOptions = TECHNIQUE_CATEGORY_DEFS.map(def => this._makeCategoryOption(def, allLegalFormatted));
    const hasSearchQuery = Boolean(this._searchQuery);
    const activeCategory = categoryOptions.find(category => category.key === this._activeCategory)
      || categoryOptions.find(category => category.key === 'recommended')
      || categoryOptions[0]
      || null;
    if (activeCategory && this._activeCategory !== activeCategory.key) this._activeCategory = activeCategory.key;

    const activeCategoryTechniques = hasSearchQuery
      ? []
      : allTechniques.filter(technique => this._getTechniqueCategoryKeys(technique).includes(this._activeCategory));
    const searchResults = hasSearchQuery ? allTechniques : [];

    return {
      hasSearchQuery,
      searchQueryLabel: this._searchQuery,
      categorySidebarCollapsed: this._categorySidebarCollapsed,
      categoryOptions,
      activeCategoryLabel: activeCategory?.label || 'Recommended',
      activeCategoryIcon: activeCategory?.icon || 'fa-lightbulb',
      activeCategoryCount: activeCategoryTechniques.length,
      activeCategoryTechniques,
      searchResults,
      searchResultCount: searchResults.length,
      totalLegalTechniqueCount: allLegalFormatted.length,
    };
  }
  getAutoAdvanceConfig(shell) {
    return {
      enabled: true,
      delayMs: 700,
      requireNoRemainingPicks: true,
    };
  }

}
