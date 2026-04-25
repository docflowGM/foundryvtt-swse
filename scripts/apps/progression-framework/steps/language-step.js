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
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire search input
    const searchInput = shell.element.querySelector('.lang-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._searchQuery = e.target.value;
        shell.render();
      }, { signal });
    }

    // Wire clear search button
    const clearBtn = shell.element.querySelector('.lang-clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._searchQuery = '';
        if (searchInput) searchInput.value = '';
        shell.render();
      }, { signal });
    }

    // Wire add/remove buttons in work surface
    const addBtns = shell.element.querySelectorAll('[data-action="add-language"]');
    addBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const langId = btn.dataset.languageId;
        this._selectLanguage(langId, shell);
      }, { signal });
    });

    const removeBtns = shell.element.querySelectorAll('[data-action="remove-language"]');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const langId = btn.dataset.languageId;
        this._deselectLanguage(langId, shell);
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

  /**
   * Compute known/granted languages from species, background, class sources
   * FIX 3: Read from pending selection state, not just committed actor state
   */
  async _getKnownLanguages(actor, shell) {
    if (!actor) return [];

    const known = new Set();

    // Species languages: Read from pending selection first, fall back to committed actor
    let speciesName = shell?.draftSelections?.get('species')?.[0];
    if (!speciesName) {
      speciesName = actor.system?.species?.primary?.name || actor.system?.species;
    }
    if (speciesName) {
      const speciesDoc = await ProgressionContentAuthority.getSpeciesDocument(speciesName);
      if (speciesDoc?.system?.languages) {
        speciesDoc.system.languages.forEach(lang => known.add(lang));
      }
    }

    // Background languages: Read from pending selection first, fall back to committed
    let bgIds = shell?.draftSelections?.get('background');
    if (!bgIds) {
      bgIds = shell?.committedSelections?.get('background') || [];
    }
    if (Array.isArray(bgIds) && bgIds.length > 0) {
      for (const bgId of bgIds) {
        const bgDoc = await ProgressionContentAuthority.getBackgroundDocument(bgId);
        if (bgDoc?.system?.languages) {
          bgDoc.system.languages.forEach(lang => known.add(lang));
        }
      }
    }

    // Class feature languages (if class provides any)
    const classIds = shell?.draftSelections?.get('class') || shell?.committedSelections?.get('class') || [];
    if (Array.isArray(classIds) && classIds.length > 0) {
      for (const classId of classIds) {
        // Check if class grants languages (if implemented)
        // Placeholder for future class language grants
      }
    }

    return Array.from(known);
  }

  /**
   * FIX 4: Calculate bonus languages including pending selections
   * PHASE 7: Dynamic Linguist compatibility (not hardcoded)
   * Accounts for: INT modifier, Linguist feat, class features, other pending grants
   */
  async _calculateBonusLanguagesAvailable(actor, shell) {
    // Start with actor-committed bonus languages (INT modifier + committed features)
    let count = LanguageEngine.calculateBonusLanguagesAvailable(actor);

    // PHASE 7: Check for pending Linguist feat selection (dynamic, not hardcoded)
    const pendingFeats = shell?.draftSelections?.get('feats') || [];
    let linguistCount = 0;

    if (Array.isArray(pendingFeats)) {
      for (const feat of pendingFeats) {
        // Check if Linguist feat is selected
        const featName = typeof feat === 'string' ? feat : feat.name || feat.id;
        if (featName?.toLowerCase().includes('linguist')) {
          // PHASE 7: Dynamic bonus per Linguist feat
          // Standard: 1 bonus language per Linguist feat
          // Could be customized via LanguageEngine if needed
          linguistCount += 1;
        }
      }
    }

    // Also check committed Linguist (backward compat)
    if (linguistCount === 0) {
      const committedLinguist = actor?.items?.some(item =>
        item.type === 'feat' && item.name?.toLowerCase().includes('linguist')
      );
      if (committedLinguist) {
        linguistCount = 1;
      }
    }

    count += linguistCount;

    // TODO: Check for other pending language-granting feats/features
    // (placeholder for future generalized entitlement framework)

    return count;
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
    const available = this._getAvailableLanguages();

    if (!this._searchQuery) return available;

    const q = this._searchQuery.toLowerCase();
    return available.filter(lang =>
      lang.name.toLowerCase().includes(q) ||
      lang.category.toLowerCase().includes(q)
    );
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
  _selectLanguage(langId, shell) {
    if (this._selectedBonusLanguages.length >= this._bonusLanguagesAvailable) {
      return; // Already at max
    }

    const lang = this._getLanguage(langId);
    if (!lang || this._knownLanguages.includes(lang.name) || this._selectedBonusLanguages.includes(lang.name)) {
      return; // Already selected or known
    }

    this._selectedBonusLanguages.push(lang.name);
    shell.render();
  }

  /**
   * Deselect a bonus language
   */
  _deselectLanguage(langId, shell) {
    const lang = this._getLanguage(langId);
    if (!lang) return;

    this._selectedBonusLanguages = this._selectedBonusLanguages.filter(
      name => name !== lang.name
    );
    shell.render();
  }

  // ---------------------------------------------------------------------------
  // Step Plugin Methods
  // ---------------------------------------------------------------------------

  async getStepData(context) {
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
          canSelect: true,
          isSuggested,
          badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
          badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
          confidenceLevel: confidenceData?.confidenceLevel || null,
        };
      }),

      bonusLanguagesAvailable: this._bonusLanguagesAvailable,
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

    // PHASE 1: Normalize and commit to canonical session
    // Normalize selected bonus languages for canonical storage
    const normalizedLanguages = normalizeLanguages(
      this._selectedBonusLanguages.map(name => ({ id: name, source: 'selected' }))
    );

    if (normalizedLanguages && shell) {
      // Commit to canonical session (also updates buildIntent for backward compat)
      await this._commitNormalized(shell, 'languages', normalizedLanguages);
    }

    // Also maintain legacy buildIntent for backward compat
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(
        this.descriptor.stepId,
        'languages',
        {
          knownLanguages: [...this._knownLanguages],
          bonusLanguages: [...this._selectedBonusLanguages],
        }
      );
    }
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
    return 'context-only';
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
      mode: 'compact',
      controls: ['search', 'summary'],
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
