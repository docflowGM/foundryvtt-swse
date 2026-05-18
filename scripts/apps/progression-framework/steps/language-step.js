/**
 * LanguageStep plugin
 *
 * Handles constrained multi-select language choice with:
 * - Species-granted languages (automatic, non-selectable)
 * - Background-granted languages (automatic if applicable, non-selectable)
 * - INT modifier bonus languages (selectable up to the count)
 * - Linguist feat bonus languages (selectable)
 * - Class feature languages if applicable (selectable)
 *
 * Key challenge: already-granted languages must not appear in the selectable pool.
 * Selection model:
 * - Known/Granted: from species, background, class/features
 * - Selected Bonus: player-chosen this step from available pool
 * - Available: valid choices not yet granted or selected
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { LanguageRegistry } from '/systems/foundryvtt-swse/scripts/registries/language-registry.js';
import { LanguageEngine } from '/systems/foundryvtt-swse/scripts/engine/progression/engine/language-engine.js';
import { normalizeLanguages } from './step-normalizers.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';
import { getPendingBackgroundLanguages } from '/systems/foundryvtt-swse/scripts/engine/progression/backgrounds/background-pending-context-builder.js';
import { FeatGrantEntitlementResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js';

export class LanguageStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // Data
    this._allLanguages = [];              // All languages from registry
    this._knownLanguages = [];            // Granted languages (species, background, class)
    this._bonusLanguagesAvailable = 0;    // Total bonus picks (INT + Linguist + class)
    this._selectedBonusLanguages = [];    // Bonus languages chosen this step
    this._focusedLanguageId = null;       // Currently focused language
    this._searchQuery = '';               // Search filter
    this._categoryFilters = {              // Utility rail category filters
      widelyUsed: false,
      localTrade: false,
    };
    this._sortMode = 'alpha';              // Languages default to A-Z

    // Categories from languages.json
    this._categories = {};
    this._categoryLabels = {
      'widelyUsed': 'Widely Used',
      'localTrade': 'Local & Trade',
    };

    // Suggestions
    this._suggestedLanguages = [];

    // Event listener cleanup
    this._renderAbort = null;
  }


  _captureStepScroll(shell) {
    const root = shell?.element;
    if (!(root instanceof HTMLElement)) return [];
    const nodes = [root, ...root.querySelectorAll('*')];
    return nodes
      .filter(el => el instanceof HTMLElement && (el.scrollTop > 0 || el.scrollLeft > 0))
      .map(el => {
        const scrollKey = el.dataset?.progScrollKey ? `scroll-key:${el.dataset.progScrollKey}` : null;
        const region = el.dataset?.region || el.closest?.('[data-region]')?.dataset?.region || '';
        const classes = Array.from(el.classList || []).filter(name => /^(prog|swse|language)-/.test(name)).slice(0, 3).join('.');
        return {
          key: scrollKey || (el.dataset?.region ? `region:${el.dataset.region}` : (region && classes ? `region:${region}:class:${classes}` : null)),
          path: (() => {
            const path = [];
            let node = el;
            while (node && node !== root) {
              const parent = node.parentElement;
              if (!parent) return null;
              path.unshift(Array.prototype.indexOf.call(parent.children, node));
              node = parent;
            }
            return node === root ? path : null;
          })(),
          top: el.scrollTop,
          left: el.scrollLeft,
        };
      })
      .filter(snap => snap.key || Array.isArray(snap.path));
  }

  _renderPreservingScroll(shell) {
    if (shell) {
      shell._pendingScrollSnapshots = this._captureStepScroll(shell);
      shell.render?.();
    }
  }

  _isActiveLanguageStep(shell) {
    const currentStepId = shell?.getCurrentStepId?.()
      || shell?.progressionSession?.currentStepId
      || shell?.steps?.[shell?.currentStepIndex]?.stepId
      || null;
    return currentStepId === this.descriptor?.stepId || currentStepId === 'languages';
  }

  _syncUtilityState(shell) {
    const utility = shell?.utilityBar;
    if (!utility) return;

    const searchQuery = utility.getSearchQuery?.();
    if (typeof searchQuery === 'string') this._searchQuery = searchQuery;

    const filterState = utility.getFilterState?.() || {};
    this._categoryFilters.widelyUsed = Boolean(filterState.widelyUsed);
    this._categoryFilters.localTrade = Boolean(filterState.localTrade);

    const sortValue = utility.getSortValue?.();
    if (sortValue === 'alpha' || sortValue === 'category') this._sortMode = sortValue;
  }

  _attachUtilityListeners(shell, signal) {
    const roots = [
      shell?._inlineElement,
      shell?.element,
      shell?.getRootElement?.(),
      document,
    ].filter((root, index, list) => root && list.indexOf(root) === index);

    const rerenderFromUtility = () => {
      this._syncUtilityState(shell);
      this._renderPreservingScroll(shell);
    };

    const claimUtilityEvent = (e, token) => {
      const key = `__swseLanguageUtilityHandled_${token}`;
      if (e?.[key]) return false;
      try { e[key] = true; } catch (_) {}
      return true;
    };

    const onUtilitySearch = (e) => {
      if (e?.detail?.handledByStepHook) return;
      if (!this._isActiveLanguageStep(shell) || !claimUtilityEvent(e, 'search')) return;
      this._searchQuery = String(e?.detail?.query || '');
      rerenderFromUtility();
    };
    const onUtilityFilter = (e) => {
      if (e?.detail?.handledByStepHook) return;
      if (!this._isActiveLanguageStep(shell) || !claimUtilityEvent(e, `filter_${e?.detail?.filterId || ''}`)) return;
      const filterId = String(e?.detail?.filterId || '');
      if (filterId === 'widelyUsed' || filterId === 'localTrade') {
        this._categoryFilters[filterId] = Boolean(e?.detail?.value);
        rerenderFromUtility();
      }
    };
    const onUtilitySort = (e) => {
      if (e?.detail?.handledByStepHook) return;
      if (!this._isActiveLanguageStep(shell) || !claimUtilityEvent(e, 'sort')) return;
      const sortId = String(e?.detail?.sortId || 'alpha');
      this._sortMode = sortId === 'category' ? 'category' : 'alpha';
      rerenderFromUtility();
    };

    roots.forEach(root => {
      root.addEventListener('prog:utility:search', onUtilitySearch, { signal });
      root.addEventListener('prog:utility:filter', onUtilityFilter, { signal });
      root.addEventListener('prog:utility:sort', onUtilitySort, { signal });
    });
  }


  _applyUtilityChange(type, detail = {}, shell) {
    if (!this._isActiveLanguageStep(shell)) return false;

    if (type === 'search') {
      this._searchQuery = String(detail.query || '');
      return true;
    }

    if (type === 'filter') {
      const filterId = String(detail.filterId || '');
      if (filterId !== 'widelyUsed' && filterId !== 'localTrade') return false;
      this._categoryFilters[filterId] = Boolean(detail.value);
      return true;
    }

    if (type === 'sort') {
      const sortId = String(detail.sortId || 'alpha');
      this._sortMode = sortId === 'category' ? 'category' : 'alpha';
      return true;
    }

    return false;
  }

  onUtilityChange({ type, detail, shell } = {}) {
    const didApply = this._applyUtilityChange(type, detail, shell);
    if (!didApply) return false;
    this._renderPreservingScroll(shell);
    return true;
  }

  async _commitLanguageSelection(shell) {
    const normalizedLanguages = normalizeLanguages(
      this._selectedBonusLanguages.map(name => ({ id: name, source: 'selected' }))
    );
    if (normalizedLanguages && shell) {
      await this._commitNormalized(shell, 'languages', normalizedLanguages);
    }
    // Do not commit the step-local {knownLanguages, bonusLanguages} object to
    // the canonical languages key. The session schema expects an array of bonus
    // language selections; granted species/background languages are re-derived
    // by ProjectionEngine/ProgressionFinalizer from the selected species and
    // background. Keep the richer view-only context out of canonical state so a
    // display payload cannot poison session recovery or final summary.
    if (shell?.committedSelections && this.descriptor?.stepId) {
      shell.committedSelections.set('languageContext', {
        knownLanguages: [...this._knownLanguages],
        bonusLanguages: [...this._selectedBonusLanguages],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Ensure registry loaded
    await LanguageRegistry.ensureLoaded();
    this._allLanguages = await this._getAllLanguages();

    // Compute known/granted languages from all sources
    this._knownLanguages = await this._getKnownLanguages(shell.actor, shell);

    // FIX 4: Compute available bonus language picks including pending selections
    this._bonusLanguagesAvailable = await this._calculateBonusLanguagesAvailable(shell.actor, shell);

    // Get suggested languages from SuggestionService
    await this._getSuggestedLanguages(shell.actor, shell);

    // Wire up mentor
    shell.mentor.askMentorEnabled = false;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire utility rail search/filter/sort controls. In embedded chargen the live
    // utility rail can sit outside shell.element, so listen on all possible roots
    // plus document and guard by active step.
    this._syncUtilityState(shell);
    this._attachUtilityListeners(shell, signal);

    // Legacy in-surface search input support, if older templates still render it.
    const searchInput = shell.element.querySelector('.lang-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._searchQuery = e.target.value;
        this._renderPreservingScroll(shell);
      }, { signal });
    }

    // Wire clear search button
    const clearBtn = shell.element.querySelector('.lang-clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._searchQuery = '';
        if (searchInput) searchInput.value = '';
        this._renderPreservingScroll(shell);
      }, { signal });
    }

    // Wire add/remove buttons in work surface
    const addBtns = shell.element.querySelectorAll('[data-action="select-language"], [data-action="add-language"]');
    addBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        const langId = btn.dataset.languageId;
        await this._selectLanguage(langId, shell);
      }, { signal });
    });

    const removeBtns = shell.element.querySelectorAll('[data-action="remove-language"], [data-action="remove-bonus-language"]');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        const langId = btn.dataset.languageId;
        await this._deselectLanguage(langId, shell);
      }, { signal });
    });
  }

  async onStepExit(shell) {
    // FIX 2: Do NOT mutate actor here - defer to finalization
    // Store selected languages in progression state only
    // All mutations happen in progression-finalizer, not during step lifecycle

    // Commit to canonical session state (buildIntent for backward compat)
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(
        this.descriptor.stepId,
        'languages',
        {
          knownLanguages: [...this._knownLanguages],
          selectedBonusLanguages: [...this._selectedBonusLanguages],
          bonusLanguagesAvailable: this._bonusLanguagesAvailable,
        }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Data Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Get all languages from registry
   * FIX 1: Use correct registry API (.all() not .getAll?.())
   */
  async _getAllLanguages() {
    const records = await LanguageRegistry.all();
    return records.map(r => ({
      id: r.id || r.slug,
      name: r.name,
      slug: r.slug,
      category: r.category || 'other',
      description: r.description || '',
    }));
  }

  _readDraftSelection(shell, key) {
    return shell?.progressionSession?.draftSelections?.[key]
      ?? shell?.draftSelections?.[key]
      ?? shell?.draftSelections?.get?.(key)
      ?? shell?.committedSelections?.get?.(key)
      ?? null;
  }

  _normalizeLanguageName(value) {
    if (!value) return null;
    if (typeof value === 'string') return value.trim() || null;
    return value.name || value.label || value.language || value.id || null;
  }

  _extractSpeciesLanguageNames(species) {
    const raw = [
      ...(Array.isArray(species?.languages) ? species.languages : []),
      ...(Array.isArray(species?.system?.languages) ? species.system.languages : []),
      ...(Array.isArray(species?.canonicalStats?.languages) ? species.canonicalStats.languages : []),
    ];
    return Array.from(new Set(raw.map(value => this._normalizeLanguageName(value)).filter(Boolean)));
  }

  /**
   * Compute known/granted languages from species, background, class sources
   * FIX 3: Read from pending selection state, not just committed actor state
   */
  async _getKnownLanguages(actor, shell) {
    if (!actor) return [];

    const known = new Set(['Basic']);

    // Species languages: read live chargen draft first, then committed actor.
    const speciesSelection = this._readDraftSelection(shell, 'species');
    const speciesCandidate = Array.isArray(speciesSelection) ? speciesSelection[0] : speciesSelection;
    let speciesRef = speciesCandidate?.name || speciesCandidate?.speciesName || speciesCandidate?.id || speciesCandidate;
    if (!speciesRef) {
      speciesRef = actor.system?.species?.primary?.name || actor.system?.species?.name || actor.system?.species;
    }
    if (speciesRef) {
      const speciesEntry = ProgressionContentAuthority.resolveSpecies?.(speciesRef) || null;
      const speciesDoc = await ProgressionContentAuthority.getSpeciesDocument(speciesRef);
      const speciesLanguages = this._extractSpeciesLanguageNames(speciesEntry).concat(this._extractSpeciesLanguageNames(speciesDoc));
      speciesLanguages.forEach(lang => { if (lang) known.add(lang); });
    }

    // Background languages from the Background Grant Ledger / pending context.
    const pendingBackground = shell?.progressionSession?.currentPendingBackgroundContext
      || this._readDraftSelection(shell, 'pendingBackgroundContext')
      || this._readDraftSelection(shell, 'background')?.pendingContext
      || {};
    const bgLanguages = getPendingBackgroundLanguages(pendingBackground);
    if (Array.isArray(bgLanguages) && bgLanguages.length > 0) {
      bgLanguages.forEach(lang => { if (lang) known.add(lang); });
    }

    return Array.from(known).filter(Boolean);
  }

  /**
   * Calculate bonus languages including pending selections.
   * SWSE Linguist rule: each Linguist feat instance grants 1 + INT modifier
   * additional languages, minimum 1, and updates dynamically when INT changes.
   */
  async _calculateBonusLanguagesAvailable(actor, shell) {
    return LanguageEngine.calculateBonusLanguagesAvailable(actor, { shell, includePending: true });
  }

  /**
   * Get available languages for selection
   * (all languages minus known/granted minus already selected)
   */
  _getAvailableLanguages() {
    const knownSet = new Set(this._knownLanguages);
    const selectedSet = new Set(this._selectedBonusLanguages);

    return this._allLanguages.filter(lang =>
      !knownSet.has(lang.name) && !selectedSet.has(lang.name)
    );
  }

  /**
   * Get filtered available languages based on search
   */
  _getFilteredAvailableLanguages() {
    const q = String(this._searchQuery || '').trim().toLowerCase();
    const activeCategories = Object.entries(this._categoryFilters || {})
      .filter(([, active]) => Boolean(active))
      .map(([category]) => category);

    const filtered = this._getAvailableLanguages().filter(lang => {
      const category = String(lang.category || 'other');
      const categoryLabel = this._categoryLabels[category] || category;
      const matchesCategory = activeCategories.length === 0 || activeCategories.includes(category);
      const matchesSearch = !q
        || String(lang.name || '').toLowerCase().includes(q)
        || category.toLowerCase().includes(q)
        || String(categoryLabel || '').toLowerCase().includes(q)
        || String(lang.description || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (this._sortMode === 'category') {
        const categoryCompare = String(this._categoryLabels[a.category] || a.category || '')
          .localeCompare(String(this._categoryLabels[b.category] || b.category || ''));
        if (categoryCompare !== 0) return categoryCompare;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  /**
   * Get language by ID/name
   */
  _getLanguage(id) {
    return this._allLanguages.find(l => l.id === id || l.name === id);
  }

  /**
   * Select a bonus language
   */
  async _selectLanguage(langId, shell) {
    if (this._selectedBonusLanguages.length >= this._bonusLanguagesAvailable) {
      return; // Already at max
    }

    const lang = this._getLanguage(langId);
    if (!lang || this._knownLanguages.includes(lang.name) || this._selectedBonusLanguages.includes(lang.name)) {
      return; // Already selected or known
    }

    this._selectedBonusLanguages.push(lang.name);
    this._focusedLanguageId = lang.id;
    await this._commitLanguageSelection(shell);
    this._renderPreservingScroll(shell);
  }

  /**
   * Deselect a bonus language
   */
  async _deselectLanguage(langId, shell) {
    const lang = this._getLanguage(langId);
    if (!lang) return;

    this._selectedBonusLanguages = this._selectedBonusLanguages.filter(
      name => name !== lang.name
    );
    this._focusedLanguageId = lang.id;
    await this._commitLanguageSelection(shell);
    this._renderPreservingScroll(shell);
  }

  _buildLanguageRuleBreakdown(shell) {
    const intMod = FeatGrantEntitlementResolver.getIntBonusLanguageCount(shell?.actor || null);
    const entitlements = FeatGrantEntitlementResolver.resolve(shell?.actor || null, { shell, includePending: true }) || [];
    const linguistEntries = entitlements.filter(entry => String(entry?.sourceName || '').toLowerCase() === 'linguist');
    const linguist = linguistEntries
      .filter(entry => entry.grantType === 'languageSlots')
      .reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
    return {
      nativeAndBasic: true,
      intModPicks: Math.max(0, intMod),
      linguistPicks: Math.max(0, linguist),
      totalSelectable: this._bonusLanguagesAvailable,
      linguistNote: linguistEntries.length
        ? 'Linguist was found and counted.'
        : "Conditional class grants such as Noble's Linguist only count when prerequisites are met."
    };
  }

  // ---------------------------------------------------------------------------
  // Step Plugin Methods
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    this._syncUtilityState(context?.shell);
    const available = this._getFilteredAvailableLanguages();
    const remainingPicks = this._bonusLanguagesAvailable - this._selectedBonusLanguages.length;
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedLanguages);

    return {
      knownLanguages: this._knownLanguages.map(name => ({
        name,
        language: this._getLanguage(name),
      })).filter(item => item.language),

      selectedBonusLanguages: this._selectedBonusLanguages.map(name => ({
        name,
        language: this._getLanguage(name),
      })).filter(item => item.language),

      availableLanguages: available.map(lang => {
        const isSuggested = this.isSuggestedItem(lang.id, suggestedIds);
        const confidenceData = confidenceMap.get ? confidenceMap.get(lang.id) : confidenceMap[lang.id];
        return {
          id: lang.id,
          name: lang.name,
          category: lang.category,
          categoryLabel: this._categoryLabels[lang.category] || lang.category,
          canSelect: true,
          isSuggested,
          badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
          badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
          confidenceLevel: confidenceData?.confidenceLevel || null,
        };
      }),

      bonusLanguagesAvailable: this._bonusLanguagesAvailable,
      languageRuleBreakdown: this._buildLanguageRuleBreakdown(context?.shell),
      remainingPicks,
      searchQuery: this._searchQuery,
      hasAvailableLanguages: available.length > 0,
      hasSuggestions,
      suggestedLanguageIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  getSelection() {
    // FIX 5: Allow completing even if not all picks spent
    // Player can choose fewer languages and still progress
    const isComplete = true;

    return {
      selected: this._selectedBonusLanguages,
      count: this._selectedBonusLanguages.length,
      isComplete,
      picksSpent: this._selectedBonusLanguages.length,
      picksAvailable: this._bonusLanguagesAvailable,
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/language-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!this._focusedLanguageId) {
      return this.renderDetailsPanelEmptyState();
    }

    const language = this._getLanguage(this._focusedLanguageId);
    if (!language) {
      return this.renderDetailsPanelEmptyState();
    }

    const isKnown = this._knownLanguages.includes(language.name);
    const isSelected = this._selectedBonusLanguages.includes(language.name);
    const canSelect = !isKnown && !isSelected && this._getAvailableLanguages().some(l => l.name === language.name);
    const remainingPicks = this._bonusLanguagesAvailable - this._selectedBonusLanguages.length;

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(language, 'language');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/language-details.hbs',
      data: {
        language,
        isKnown,
        isSelected,
        canSelect,
        remainingPicks,
        categoryLabel: this._categoryLabels[language.category] || language.category,
        // Add normalized fields for enhanced detail rail
        canonicalDescription: normalized.description,
        metadataTags: normalized.metadataTags,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Focus/Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(item) {
    this._focusedLanguageId = item?.id || item;
  }

  async onItemCommitted(item, shell) {
    if (!item) return;

    const lang = this._getLanguage(item.id || item);
    if (!lang) return;

    // If known, just focus it
    if (this._knownLanguages.includes(lang.name)) {
      this._focusedLanguageId = lang.id;
      return;
    }

    // If already selected, deselect
    if (this._selectedBonusLanguages.includes(lang.name)) {
      this._selectedBonusLanguages = this._selectedBonusLanguages.filter(
        name => name !== lang.name
      );
    } else if (this._selectedBonusLanguages.length < this._bonusLanguagesAvailable) {
      // Otherwise, select if room available
      this._selectedBonusLanguages.push(lang.name);
    }

    await this._commitLanguageSelection(shell);
  }


  async handleAction(action, event, target, shell) {
    if (action === 'select-language') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      await this._selectLanguage(target?.dataset?.languageId, shell);
      return true;
    }

    if (action === 'remove-bonus-language') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      await this._deselectLanguage(target?.dataset?.languageId, shell);
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Mentor Integration
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedLanguages && this._suggestedLanguages.length > 0) {
      await handleAskMentorWithSuggestions(shell.actor, 'languages', this._suggestedLanguages, shell, {
        domain: 'languages',
        archetype: 'your linguistic choices'
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'languages', shell);
    }
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'languages');
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance (languages is primarily chargen)
    if (this.isChargen(shell)) {
      return 'Language is more than words — it is connection. Choose wisely which voices you will carry with you.';
    }

    // Fallback for any levelup usage
    return 'Expand your voice. Learn new languages that open doors to new understanding.';
  }

  getMentorMode() {
    return 'interactive';
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const issues = this.getBlockingIssues();
    const warnings = this.getWarnings();

    return {
      isValid: issues.length === 0,
      errors: issues,
      warnings,
    };
  }

  getBlockingIssues() {
    const remainingPicks = Math.max(0, this._bonusLanguagesAvailable - this._selectedBonusLanguages.length);
    if (remainingPicks <= 0) {
      return [];
    }

    return [
      remainingPicks === 1
        ? 'Select 1 more bonus language to continue'
        : `Select ${remainingPicks} more bonus languages to continue`,
    ];
  }

  getWarnings() {
    const remainingPicks = Math.max(0, this._bonusLanguagesAvailable - this._selectedBonusLanguages.length);
    if (remainingPicks <= 0) {
      return [];
    }

    return [
      remainingPicks === 1
        ? '1 bonus language pick remains'
        : `${remainingPicks} bonus language picks remain`,
    ];
  }

  getRemainingPicks() {
    const remainingPicks = Math.max(0, this._bonusLanguagesAvailable - this._selectedBonusLanguages.length);

    if (this._bonusLanguagesAvailable <= 0) {
      return [{ label: 'No bonus languages', count: 0, isWarning: false }];
    }

    return [{
      label: 'Bonus languages',
      count: remainingPicks,
      isWarning: remainingPicks > 0,
    }];
  }

  getBlockerExplanation() {
    return this.getBlockingIssues()[0] || null;
  }

  // ---------------------------------------------------------------------------
  // Utility Bar
  // ---------------------------------------------------------------------------

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: {
        enabled: true,
        placeholder: 'Search languages...',
        supportsWildcards: false,
      },
      filters: [
        { id: 'widelyUsed', label: 'Widely Used', type: 'toggle', defaultOn: false },
        { id: 'localTrade', label: 'Local & Trade', type: 'toggle', defaultOn: false },
      ],
      sorts: [
        { id: 'alpha', label: 'A-Z', isDefault: true },
        { id: 'category', label: 'Category' },
      ],
      summaryText: `${this._selectedBonusLanguages.length}/${this._bonusLanguagesAvailable} picks`,
    };
  }

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  getFooterConfig() {
    const remainingPicks = this._bonusLanguagesAvailable - this._selectedBonusLanguages.length;
    const isComplete = remainingPicks === 0;

    let statusText = '';
    if (this._bonusLanguagesAvailable === 0) {
      statusText = 'No bonus language picks available';
    } else if (remainingPicks === 0) {
      statusText = 'All language picks assigned';
    } else if (remainingPicks === 1) {
      statusText = '1 language pick remaining';
    } else {
      statusText = `${remainingPicks} language picks remaining`;
    }

    return {
      mode: 'language-selection',
      statusText,
      isComplete,
      knownLanguagesCount: this._knownLanguages.length,
      selectedLanguagesCount: this._selectedBonusLanguages.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested languages from SuggestionService
   * Recommendations based on species, background, and other selections
   * @private
   */
  async _getSuggestedLanguages(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'languages',
        available: this._allLanguages,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedLanguages = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[LanguageStep] Suggestion service error:', err);
      this._suggestedLanguages = [];
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
}
