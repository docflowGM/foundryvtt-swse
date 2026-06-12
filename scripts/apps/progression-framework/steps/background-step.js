/**
 * BackgroundStep plugin
 *
 * Handles background selection with support for:
 * - single background mode (standard)
 * - multi-background mode (house-rule driven)
 * - category organization (Event, Occupation, Planet)
 * - Suggested backgrounds from SuggestionService (Phase 10)
 *
 * Integrates with BackgroundRegistry and backgroundSelectionCount house rule.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { BackgroundRegistry } from '/systems/foundryvtt-swse/scripts/registries/background-registry.js';
import { normalizeBackground } from './step-normalizers.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions, handleAskMentorWithPicker } from './mentor-step-integration.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { resolveSelectedClassFromShell, getClassSkills } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';
import { buildPendingBackgroundContext } from '/systems/foundryvtt-swse/scripts/engine/progression/backgrounds/background-pending-context-builder.js';
import SkillRegistry from '/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js';
import { buildClassSkillKeySet, buildSkillDisplay, buildSkillDisplays, normalizeSkillKey } from '../utils/skill-display.js';
import { LanguageRegistry } from '/systems/foundryvtt-swse/scripts/registries/language-registry.js';
import { CustomPlanetBackgroundDialog } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/dialogs/custom-planet-background-dialog.js';
import { BackgroundChoiceDialog } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/dialogs/background-choice-dialog.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';

const CATEGORY_LABELS = {
  recommended: 'Recommended',
  event: 'Event',
  occupation: 'Profession',
  planet: 'Planet',
};

const CATEGORY_DESCRIPTIONS = {
  recommended: 'Curated backgrounds for this build',
  event: 'A pivotal moment that shaped you',
  occupation: 'Your profession or trade',
  planet: 'Your homeworld or origin',
};

export class BackgroundStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // State
    this._allBackgrounds = [];       // All backgrounds from registry
    this._groupedBackgrounds = {};   // Backgrounds grouped by category
    this._suggestedBackgrounds = []; // Suggested backgrounds from SuggestionService
    this._focusedBackgroundId = null;
    this._committedBackgroundIds = [];  // May contain 1+ based on house rule
    this._searchQuery = '';
    this._activeCategory = 'all';  // which category tab is active
    this._categorySidebarCollapsed = false;
    this._showOnlyNewSkillBackgrounds = false;
    this._sortBy = 'alpha';
    this._customBackgrounds = [];
    this._backgroundSkillChoices = {};
    this._backgroundLanguageChoices = {};

    // House rule state
    this._maxBackgrounds = 1;        // from backgroundSelectionCount setting

    // Event listener cleanup
    this._renderAbort = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Load backgrounds from registry
    await BackgroundRegistry.ensureLoaded();
    this._allBackgrounds = typeof BackgroundRegistry.getAll === 'function'
      ? (await BackgroundRegistry.getAll()) || []
      : (await BackgroundRegistry.all?.()) || [];

    // Load house rule: max background selections
    this._maxBackgrounds = Math.max(1, HouseRuleService.getNumber('backgroundSelectionCount', 1));

    await this._restoreCustomBackgrounds(shell);

    // Group backgrounds by category
    this._groupBackgrounds();

    // Phase 5: Get suggested backgrounds from SuggestionService
    await this._getSuggestedBackgrounds(shell.actor, shell);

    // HYDRATION: Restore the canonical draft selection when navigating back.
    // Normalized backgrounds store `id` plus `backgroundIds`; older payloads used
    // `backgroundId`. Accept all known shapes so Back preserves the locked answer.
    const draftBackground = shell?.progressionSession?.draftSelections?.background;
    if (draftBackground) {
      const toBackgroundId = (bg) => bg?.backgroundId || bg?.id || bg?.sourceId || bg?.name || bg;
      if (Array.isArray(draftBackground)) {
        this._committedBackgroundIds = draftBackground.map(toBackgroundId).filter(Boolean);
      } else if (Array.isArray(draftBackground.backgroundIds) && draftBackground.backgroundIds.length) {
        this._committedBackgroundIds = draftBackground.backgroundIds.map(toBackgroundId).filter(Boolean);
      } else {
        const id = toBackgroundId(draftBackground);
        this._committedBackgroundIds = id ? [id] : [];
      }
      if (this._committedBackgroundIds.length > 0) {
        const pendingContext = shell?.progressionSession?.draftSelections?.pendingBackgroundContext
          || shell?.progressionSession?.currentPendingBackgroundContext
          || draftBackground?.pendingContext
          || null;
        const pendingChoices = pendingContext?.pendingChoices || [];
        for (const choice of pendingChoices) {
          const bgId = choice?.sourceBackgroundId || choice?.backgroundId || choice?.id;
          if (bgId && Array.isArray(choice?.resolved)) this._backgroundSkillChoices[bgId] = [...choice.resolved];
        }
        console.log('[BackgroundStep] Hydrated draft background selection:', {
          count: this._committedBackgroundIds.length,
          ids: this._committedBackgroundIds,
        });
      }
    }

    // Enable Ask Mentor
    shell.mentor.askMentorEnabled = true;
  }


async onDataReady(shell) {
  if (!shell.element) return;

  this._renderAbort?.abort();
  this._renderAbort = new AbortController();
  const { signal } = this._renderAbort;

  const onSearch = (e) => {
    this._searchQuery = String(e.detail?.query || '');
    shell.render();
  };

  const onFilter = (e) => {
    const { filterId, value } = e.detail || {};
    if (!filterId || !value) return;
    if (['recommended', 'event', 'occupation', 'planet'].includes(filterId)) {
      this._activeCategory = value ? filterId : 'all';
      if (shell.utilityBar?._filterState) {
        shell.utilityBar._filterState.event = value && filterId === 'event';
        shell.utilityBar._filterState.occupation = value && filterId === 'occupation';
        shell.utilityBar._filterState.planet = value && filterId === 'planet';
      }
      shell.render();
    }
  };

  const onSort = (e) => {
    this._sortBy = e.detail?.sortId || 'alpha';
    shell.render();
  };

  shell.element.addEventListener('prog:utility:search', onSearch, { signal });
  shell.element.addEventListener('prog:utility:filter', onFilter, { signal });
  shell.element.addEventListener('prog:utility:sort', onSort, { signal });
}

async onStepExit(shell) {
    // Cleanup if needed
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    const filtered = this._getFilteredBackgrounds(context?.shell);
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedBackgrounds);
    const hasSearchQuery = !!String(this._searchQuery || '').trim();
    return {
      categories: this._getCategoryChips(context?.shell),
      backgroundsByCategory: this._formatCategoryGroups(filtered, suggestedIds, confidenceMap, context?.shell),
      searchResults: hasSearchQuery ? filtered.map(bg => this._formatBackgroundCard(bg, suggestedIds, confidenceMap, context?.shell)) : [],
      activeCategory: this._activeCategory,
      focusedBackgroundId: this._focusedBackgroundId,
      committedBackgroundIds: this._committedBackgroundIds,
      selectionMode: this._maxBackgrounds > 1 ? 'multi' : 'single',
      maxBackgrounds: this._maxBackgrounds,
      selectionCount: this._committedBackgroundIds.length,
      searchQuery: this._searchQuery,
      searchQueryLabel: String(this._searchQuery || '').trim(),
      hasSearchQuery,
      categorySidebarCollapsed: this._categorySidebarCollapsed,
      showOnlyNewSkillBackgrounds: this._showOnlyNewSkillBackgrounds,
      hasSuggestions,
      suggestedBackgroundIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  getSelection() {
    const isComplete = this._committedBackgroundIds.length > 0 &&
                      this._committedBackgroundIds.length <= this._maxBackgrounds;
    return {
      selected: this._committedBackgroundIds,
      count: this._committedBackgroundIds.length,
      isComplete,
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/background-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem, shell = null) {
    if (!this._focusedBackgroundId) {
      return this.renderDetailsPanelEmptyState();
    }

    const background = this._allBackgrounds.find(b => b.id === this._focusedBackgroundId);
    if (!background) {
      return this.renderDetailsPanelEmptyState();
    }

    const isCommitted = this._committedBackgroundIds.includes(this._focusedBackgroundId);

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(background, 'background');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/background-details.hbs',
      data: {
        background,
        category: CATEGORY_LABELS[background.category] || background.category,
        description: background.narrativeDescription || background.description || '',
        trainedSkills: background.trainedSkills || background.relevantSkills || [],
        relevantSkills: this._buildRelevantSkillDisplay(background, shell),
        bonusLanguage: background.bonusLanguage || '',
        source: background.source || 'Unknown',
        mechanicalBonuses: this._extractMechanicalBonuses(background, shell),
        skillChoiceCount: Number(background.skillChoiceCount || 0),
        specialAbility: background.specialAbility || '',
        isCommitted,
        selectionMode: this._maxBackgrounds > 1 ? 'multi' : 'single',
        canAddMore: this._maxBackgrounds > 1 && this._committedBackgroundIds.length < this._maxBackgrounds,
        selectionStatus: this._getSelectionStatusText(),
        buttonLabel: isCommitted
          ? 'Remove Selection'
          : (this._committedBackgroundIds.length >= this._maxBackgrounds && this._maxBackgrounds > 1)
            ? 'Remove and Add This'
            : 'Choose This Background',
        // Add normalized fields for enhanced detail rail
        canonicalDescription: normalized.description,
        metadataTags: normalized.metadataTags,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  async onItemFocused(id, shell) {
    const background = this._allBackgrounds.find(b => b.id === id);
    if (!background) return;

    this._focusedBackgroundId = id;
    shell.render();

    // Mentor reaction on focus should not block right-rail detail hydration.
    const flavorText = this._getMentorFlavorForBackground(background);
    if (flavorText) {
      void shell.mentorRail.speak(flavorText, 'neutral').catch(error => {
        console.error('[BackgroundStep] Non-blocking mentor speak failed:', error);
      });
    }
  }

  async onItemCommitted(id, shell) {
    const background = this._allBackgrounds.find(b => b.id === id);
    if (!background) return;

    const requiredSkillChoices = Number(background.skillChoiceCount || background.mechanicalEffect?.count || 0) || 0;
    const skillOptions = Array.isArray(background.relevantSkills) ? background.relevantSkills.filter(Boolean) : [];
    if (requiredSkillChoices > 0 && skillOptions.length > requiredSkillChoices) {
      const chosenSkills = await this._promptForBackgroundSkillChoices(background, requiredSkillChoices, skillOptions);
      if (!chosenSkills) return;
      this._backgroundSkillChoices[id] = chosenSkills;
    } else if (requiredSkillChoices > 0) {
      this._backgroundSkillChoices[id] = skillOptions.slice(0, requiredSkillChoices);
    }

    const languageOptions = this._extractBackgroundLanguageChoiceOptions(background);
    if (languageOptions.length > 1) {
      const chosenLanguage = await this._promptForBackgroundLanguageChoice(background, languageOptions);
      if (!chosenLanguage) return;
      this._backgroundLanguageChoices[id] = [chosenLanguage];
    } else if (languageOptions.length === 1) {
      this._backgroundLanguageChoices[id] = [languageOptions[0]];
    }

    // Single mode: replace selection
    if (this._maxBackgrounds === 1) {
      for (const previousId of this._committedBackgroundIds) {
        if (previousId !== id) {
          delete this._backgroundSkillChoices[previousId];
          delete this._backgroundLanguageChoices[previousId];
        }
      }
      this._committedBackgroundIds = [id];
    } else {
      // Multi mode: toggle or add
      const idx = this._committedBackgroundIds.indexOf(id);
      if (idx >= 0) {
        // Remove
        this._committedBackgroundIds.splice(idx, 1);
        delete this._backgroundSkillChoices[id];
        delete this._backgroundLanguageChoices[id];
      } else if (this._committedBackgroundIds.length < this._maxBackgrounds) {
        // Add
        this._committedBackgroundIds.push(id);
      } else {
        // Limit reached — replace first with new
        this._committedBackgroundIds[0] = id;
      }
    }

    // PHASE 2: Build canonical Background Grant Ledger for all selected backgrounds
    // This replaces the Phase 1 single-background normalization with full multi-background support
    const pendingBackgroundRefs = this._committedBackgroundIds.map((bgId) => this._allBackgrounds.find((b) => b.id === bgId) || bgId);
    const pendingBackgroundContext = await buildPendingBackgroundContext(
      pendingBackgroundRefs,
      { multiMode: this._maxBackgrounds > 1 }
    );

    this._applyBackgroundSkillChoiceResolution(pendingBackgroundContext);

    const normalizedBackground = normalizeBackground({
      id: background.id,
      name: background.name,
      category: background.category,
      source: background.source,
      backgroundIds: [...this._committedBackgroundIds],
      backgrounds: this._committedBackgroundIds
        .map(bgId => this._allBackgrounds.find(b => b.id === bgId))
        .filter(Boolean),
      ledger: pendingBackgroundContext?.ledger || null,
      pendingContext: pendingBackgroundContext || null,
      skills: background.relevantSkills || background.skills || [],
      languages: background.languages || [],
      feats: background.feats || [],
      traits: background.traits || [],
    });

    if (normalizedBackground) {
      await this._commitNormalized(shell, 'background', normalizedBackground);
    }

    if (pendingBackgroundContext && pendingBackgroundContext.ledger) {
      // Commit the full Background Grant Ledger to canonical session
      // This becomes the authoritative source for all background-derived grants
      await this._commitNormalized(shell, 'backgroundLedger', pendingBackgroundContext.ledger);

      // Commit the pending background context for Phase 3 materialization
      // This includes class skills, languages, bonuses, passive effects ready for actor state
      await this._commitNormalized(shell, 'pendingBackgroundContext', pendingBackgroundContext);

      // Also store the pending context in session for convenience access by downstream steps
      // (Skills step, Languages step need this for UI/resolution)
      if (shell.progressionSession) {
        shell.progressionSession.currentPendingBackgroundContext = pendingBackgroundContext;
      }
    }

    // Update committedSelections for backward compatibility
    // Maintains the bridge for legacy code paths
    shell.committedSelections.set('background', {
      backgroundIds: [...this._committedBackgroundIds],
      backgrounds: this._committedBackgroundIds
        .map(bgId => this._allBackgrounds.find(b => b.id === bgId))
        .filter(Boolean),
      ledger: pendingBackgroundContext?.ledger,
      pendingContext: pendingBackgroundContext
    });

    shell.render();
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const count = this._committedBackgroundIds.length;
    const isValid = count > 0 && count <= this._maxBackgrounds;

    return {
      isValid,
      errors: isValid ? [] : ['Select a background to continue'],
      warnings: [],
    };
  }

  getBlockingIssues() {
    const count = this._committedBackgroundIds.length;
    if (count === 0) {
      return ['Select a background to continue'];
    }
    if (count > this._maxBackgrounds) {
      return [`Too many backgrounds selected (${count} > ${this._maxBackgrounds})`];
    }
    return [];
  }

  getRemainingPicks() {
    const count = this._committedBackgroundIds.length;
    if (count === 0) {
      return [{
        label: 'Background',
        count: this._maxBackgrounds,
        total: this._maxBackgrounds,
        selected: 0,
        isWarning: true,
      }];
    }

    if (this._maxBackgrounds === 1) {
      return [{ label: `✓ ${this._getCommittedNames()}`, count: 0, total: 1, selected: 1, isWarning: false }];
    }

    return [{
      label: 'Backgrounds',
      count: this._maxBackgrounds - count,
      total: this._maxBackgrounds,
      selected: count,
      isWarning: count < this._maxBackgrounds,
    }];
  }

  // ---------------------------------------------------------------------------
  // Utility Bar Config
  // ---------------------------------------------------------------------------


getUtilityBarConfig() {
  return {
    mode: 'rich',
    search: {
      enabled: true,
      placeholder: 'Search backgrounds…',
    },
    filters: [],
    sorts: [
      { id: 'alpha', label: 'Sort: A-Z' },
      { id: 'source', label: 'Sort: Source' },
    ],
    customControls: [
      {
        id: 'mode-indicator',
        label: `Mode: ${this._maxBackgrounds > 1 ? `Multi (${this._maxBackgrounds} max)` : 'Single'}`,
        type: 'label',
      },
      {
        id: 'custom-planet',
        label: 'Create Custom Planet',
        type: 'button',
        action: 'create-custom-planet'
      },
    ],
  };
}



  async handleAction(action, event, target, shell) {
    if (action === 'create-custom-planet') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      await this._openCustomPlanetDialog(shell);
      return true;
    }

    if (action === 'select-background-category') {
      event?.preventDefault?.();
      const category = String(target?.dataset?.category || 'all').toLowerCase();
      this._activeCategory = ['all', 'recommended', 'event', 'occupation', 'planet'].includes(category) ? category : 'all';
      shell?.render?.();
      return true;
    }

    if (action === 'toggle-background-category-sidebar') {
      event?.preventDefault?.();
      this._categorySidebarCollapsed = !this._categorySidebarCollapsed;
      shell?.render?.();
      return true;
    }

    if (action === 'toggle-background-new-skills-filter') {
      event?.preventDefault?.();
      this._showOnlyNewSkillBackgrounds = !this._showOnlyNewSkillBackgrounds;
      shell?.render?.();
      return true;
    }

    if (action === 'reset-background-browser') {
      event?.preventDefault?.();
      this._searchQuery = '';
      this._activeCategory = 'all';
      this._showOnlyNewSkillBackgrounds = false;
      if (shell?.utilityBar?._searchQuery !== undefined) shell.utilityBar._searchQuery = '';
      shell?.render?.();
      return true;
    }

    return false;
  }

// ---------------------------------------------------------------------------
// Mentor
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedBackgrounds && this._suggestedBackgrounds.length > 0) {
      await handleAskMentorWithPicker(shell.actor, 'background', this._suggestedBackgrounds, shell, {
        domain: 'backgrounds',
        archetype: 'your background',
        stepLabel: 'backgrounds'
      }, async (selected) => {
        const id = selected?.id || selected?._id || selected?.backgroundId;
        if (!id) return;
        await this.onItemCommitted(id, shell);
        shell.render();
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'background', shell);
    }
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'background', shell);
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance (background is primarily chargen)
    if (this.isChargen(shell)) {
      return `Your background shapes who you are. ${
        this._maxBackgrounds > 1
          ? `You may choose up to ${this._maxBackgrounds} backgrounds.`
          : 'Choose the defining moment of your past.'
      }`;
    }

    // Fallback for any levelup usage
    return `Your past defines you. ${
      this._maxBackgrounds > 1
        ? `You may reflect on up to ${this._maxBackgrounds} formative moments.`
        : 'Remember the defining moment of your journey.'
    }`;
  }

  getMentorMode() {
    return 'interactive';
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  _groupBackgrounds() {
    this._groupedBackgrounds = {
      event: [],
      occupation: [],
      planet: [],
    };

    for (const bg of this._allBackgrounds) {
      const category = bg.category || 'event';
      if (this._groupedBackgrounds[category]) {
        this._groupedBackgrounds[category].push(bg);
      }
    }

    // Sort each category alphabetically
    for (const category in this._groupedBackgrounds) {
      this._groupedBackgrounds[category].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );
    }
  }

  /**
   * Phase 5: Get suggested backgrounds from SuggestionService
   * Recommendations based on species, class, and other selections
   * @private
   */
  async _getSuggestedBackgrounds(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'backgrounds',
        available: this._allBackgrounds,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store one best recommendation per background family so the mentor
      // does not over-weight planetary entries just because there are more of them.
      this._suggestedBackgrounds = this._selectBestBackgroundSuggestionByCategory(suggested || []);
    } catch (err) {
      console.warn('[BackgroundStep] Suggestion service error:', err);
      this._suggestedBackgrounds = [];
    }
  }

  _selectBestBackgroundSuggestionByCategory(suggestions = []) {
    const sorted = SuggestionService.sortBySuggestion?.(suggestions || []) || [...(suggestions || [])];
    const wantedOrder = ['event', 'occupation', 'planet'];
    const selected = [];
    const used = new Set();

    // Keep the first pass diverse across Event / Profession / Planet.
    for (const category of wantedOrder) {
      const match = sorted.find(background => String(background?.category || background?.system?.category || 'event').toLowerCase() === category);
      const key = String(match?.id || match?._id || match?.name || '');
      if (match && key && !used.has(key)) {
        selected.push(match);
        used.add(key);
      }
    }

    // Fill to five from the remaining suggestion score order.
    for (const background of sorted) {
      const key = String(background?.id || background?._id || background?.name || '');
      if (!key || used.has(key)) continue;
      selected.push(background);
      used.add(key);
      if (selected.length >= 5) break;
    }

    // Fallback if the suggestion service is sparse.
    for (const background of this._sortBackgrounds(this._allBackgrounds || [])) {
      const key = String(background?.id || background?._id || background?.name || '');
      if (!key || used.has(key)) continue;
      selected.push(background);
      used.add(key);
      if (selected.length >= 5) break;
    }

    return selected.slice(0, 5);
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


_getFilteredBackgrounds(shell = null) {
  const hasSearchQuery = !!String(this._searchQuery || '').trim();
  let filtered = [...this._allBackgrounds];

  if (!hasSearchQuery && this._activeCategory !== 'all' && this._activeCategory !== 'recommended') {
    filtered = filtered.filter((bg) => (bg.category || 'event') === this._activeCategory);
  }

  if (this._showOnlyNewSkillBackgrounds) {
    filtered = filtered.filter((bg) => this._backgroundHasNewSkillOptions(bg, shell));
  }

  if (hasSearchQuery) {
    const q = String(this._searchQuery || '').toLowerCase().trim();
    filtered = filtered.filter((bg) => {
      const haystack = [
        bg.name,
        bg.narrativeDescription,
        bg.description,
        bg.specialAbility,
        bg.bonusLanguage,
        bg.source,
        CATEGORY_LABELS[bg.category] || bg.category,
        ...(bg.trainedSkills || []),
        ...(bg.relevantSkills || []),
        bg.mechanicalEffect?.description,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  return this._sortBackgrounds(filtered);
}

  _sortBackgrounds(backgrounds = []) {
    const ordered = [...backgrounds];
    if (this._sortBy === 'source') {
      ordered.sort((a, b) => this._compareSources(a.source, b.source) || String(a.name || '').localeCompare(String(b.name || '')));
    } else {
      ordered.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    return ordered;
  }

  _compareSources(aSource, bSource) {
    const normalize = (value) => String(value || 'Unknown').trim().toLowerCase();
    const sourceOrder = {
      core: 0,
      'core rulebook': 0,
      cr: 0,
      'saga edition core rulebook': 0,
    };
    const aOrder = sourceOrder[normalize(aSource)] ?? 10;
    const bOrder = sourceOrder[normalize(bSource)] ?? 10;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(aSource || 'Unknown').localeCompare(String(bSource || 'Unknown'));
  }

  _getClassSkillKeys(shell) {
    return this._getClassSkillCoverage(shell).classSkillKeys;
  }

  _buildRelevantSkillDisplay(background, shell) {
    return this._buildBackgroundSkillDisplays(background, shell);
  }

_extractMechanicalBonuses(background, shell = null) {
  const bonuses = [];
  if (!background) return bonuses;
  const classSkillKeys = this._getClassSkillKeys(shell);
  const rawMechanicalDescription = String(background.mechanicalEffect?.description || '').trim();
  const describesSkillChoice = rawMechanicalDescription && /choose\s+\d+\s+skill/i.test(rawMechanicalDescription);
  if (rawMechanicalDescription && !describesSkillChoice) bonuses.push({ text: rawMechanicalDescription });
  if (background.specialAbility) bonuses.push({ text: background.specialAbility });
  if (background.skillChoiceCount && (background.relevantSkills || []).length) {
    bonuses.push({
      text: `Choose ${background.skillChoiceCount} skill${background.skillChoiceCount === 1 ? '' : 's'} from:`,
      skillDisplays: buildSkillDisplays(background.relevantSkills || [], { classSkillKeys })
    });
  }
  if (background.bonusLanguage) bonuses.push({ text: `Bonus language: ${background.bonusLanguage}` });
  return bonuses;
}


  _getBackgroundSkillRefs(background) {
    return Array.from(new Set([
      ...(background?.relevantSkills || []),
      ...(background?.trainedSkills || []),
    ].filter(Boolean).map(skill => String(skill).trim()).filter(Boolean)));
  }

  _getClassSkillCoverage(shell) {
    const selectedClass = resolveSelectedClassFromShell(shell);
    const classSkillRefs = selectedClass ? getClassSkills(selectedClass) : [];
    const classSkillKeys = buildClassSkillKeySet(classSkillRefs);
    const className = String(selectedClass?.name || selectedClass?.className || '').trim().toLowerCase();
    const isSoldier = className === 'soldier';
    const hasAnyKnowledge = Array.from(classSkillKeys).some(key => this._isKnowledgeSkillKey(key));
    return {
      selectedClass,
      classSkillKeys,
      hasBroadKnowledge: hasAnyKnowledge && !isSoldier,
    };
  }

  _isKnowledgeSkillKey(key) {
    return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '').startsWith('knowledge');
  }

  _skillIsCoveredByClass(skill, coverage = null) {
    const info = coverage || this._getClassSkillCoverage(null);
    const key = normalizeSkillKey(skill);
    if (!key) return false;
    if (info.classSkillKeys?.has?.(key)) return true;
    return info.hasBroadKnowledge && this._isKnowledgeSkillKey(key);
  }

  _buildBackgroundSkillDisplays(background, shell, { limit = null, newFirst = false } = {}) {
    const coverage = this._getClassSkillCoverage(shell);
    let displays = buildSkillDisplays(this._getBackgroundSkillRefs(background), { classSkillKeys: coverage.classSkillKeys })
      .map(entry => {
        const covered = this._skillIsCoveredByClass(entry.key, coverage);
        return {
          ...entry,
          isClassSkill: covered,
          statusClass: covered ? 'prog-skill-token--covered' : 'prog-skill-token--novel',
          statusLabel: covered ? 'Already a class skill' : 'New class skill option',
        };
      });

    if (newFirst) {
      displays = displays.sort((a, b) => Number(a.isClassSkill) - Number(b.isClassSkill) || String(a.label || '').localeCompare(String(b.label || '')));
    }

    return Number.isFinite(limit) ? displays.slice(0, limit) : displays;
  }

  _backgroundHasNewSkillOptions(background, shell) {
    const coverage = this._getClassSkillCoverage(shell);
    return this._getBackgroundSkillRefs(background).some(skill => !this._skillIsCoveredByClass(skill, coverage));
  }

_getCategoryChips(shell = null) {
    const baseFiltered = this._showOnlyNewSkillBackgrounds
      ? this._allBackgrounds.filter(bg => this._backgroundHasNewSkillOptions(bg, shell))
      : [...this._allBackgrounds];
    const counts = baseFiltered.reduce((acc, bg) => {
      const key = bg.category || 'event';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const total = baseFiltered.length;
    const recommendedCount = this._getRecommendedBackgrounds(baseFiltered).length;
    return [
      { id: 'all', label: 'All', isActive: this._activeCategory === 'all', count: total, icon: 'fa-layer-group' },
      ...(recommendedCount ? [{ id: 'recommended', label: 'Recommended', isActive: this._activeCategory === 'recommended', count: recommendedCount, icon: 'fa-star' }] : []),
      ...['event', 'occupation', 'planet'].map(category => ({
        id: category,
        label: CATEGORY_LABELS[category],
        isActive: category === this._activeCategory,
        count: counts[category] || 0,
        icon: category === 'event' ? 'fa-bolt' : category === 'occupation' ? 'fa-briefcase' : 'fa-globe',
      })),
    ];
  }

  _getBackgroundKeys(background) {
    return [background?._id, background?.id, background?.name]
      .filter(Boolean)
      .map(value => String(value));
  }

  _getRecommendedBackgrounds(candidateBackgrounds = null) {
    const suggestions = Array.isArray(this._suggestedBackgrounds) ? this._suggestedBackgrounds.slice(0, 5) : [];
    if (!suggestions.length) return [];

    const source = Array.isArray(candidateBackgrounds) ? candidateBackgrounds : this._allBackgrounds;
    const byKey = new Map();
    for (const background of source || []) {
      this._getBackgroundKeys(background).forEach(key => byKey.set(key, background));
    }

    const recommended = [];
    const used = new Set();
    for (const suggestion of suggestions) {
      const background = this._getBackgroundKeys(suggestion)
        .map(key => byKey.get(key))
        .find(Boolean);
      const key = background ? String(background.id || background._id || background.name || '') : '';
      if (!background || !key || used.has(key)) continue;
      recommended.push(background);
      used.add(key);
      if (recommended.length >= 5) break;
    }
    return recommended;
  }

  _formatBackgroundCard(bg, suggestedIds = new Set(), confidenceMap = new Map(), shell = null) {
    const category = bg.category || 'event';
    const isCommitted = this._committedBackgroundIds.includes(bg.id);
    const isFocused = bg.id === this._focusedBackgroundId;
    const isSuggested = this.isSuggestedItem(bg.id, suggestedIds);
    const confidenceData = confidenceMap.get ? confidenceMap.get(bg.id) : confidenceMap[bg.id];
    const allSkillDisplays = this._buildBackgroundSkillDisplays(bg, shell, { newFirst: true });
    const compactSkills = allSkillDisplays.slice(0, 3);
    return {
      id: bg.id,
      name: bg.name,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      compactSkills,
      trainedSkills: compactSkills,
      hasMore: allSkillDisplays.length > compactSkills.length,
      extraSkillCount: Math.max(0, allSkillDisplays.length - compactSkills.length),
      hasNewSkillOptions: allSkillDisplays.some(skill => !skill.isClassSkill),
      isFocused,
      isCommitted,
      isSuggested,
      badgeLabel: isSuggested ? 'Recommended' : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
    };
  }

  _formatCategoryGroups(filtered, suggestedIds = new Set(), confidenceMap = new Map(), shell = null) {
    const result = {};
    const filteredKeys = new Set((filtered || []).map(bg => String(bg?.id || bg?._id || bg?.name || '')));

    if (this._activeCategory === 'all' || this._activeCategory === 'recommended') {
      const recommended = this._getRecommendedBackgrounds(this._allBackgrounds)
        .filter(bg => filteredKeys.has(String(bg?.id || bg?._id || bg?.name || '')))
        .map(bg => this._formatBackgroundCard(bg, suggestedIds, confidenceMap, shell));

      if (recommended.length > 0) {
        result.recommended = {
          id: 'recommended',
          label: CATEGORY_LABELS.recommended,
          description: 'Curated recommendations. These backgrounds also remain in their normal categories.',
          backgrounds: recommended,
          isRecommended: true,
        };
      }

      if (this._activeCategory === 'recommended') return result;
    }

    for (const category of ['event', 'occupation', 'planet']) {
      if (this._activeCategory !== 'all' && category !== this._activeCategory) continue;
      const backgrounds = this._sortBackgrounds((this._groupedBackgrounds[category] || []).filter(bg => filtered.includes(bg)))
        .map(bg => this._formatBackgroundCard(bg, suggestedIds, confidenceMap, shell));

      if (backgrounds.length > 0) {
        result[category] = {
          id: category,
          label: CATEGORY_LABELS[category],
          description: CATEGORY_DESCRIPTIONS[category],
          backgrounds,
        };
      }
    }

    return result;
  }

  _applyBackgroundSkillChoiceResolution(pendingContext) {
    if (!pendingContext) return pendingContext;
    const resolvedClassSkills = new Set([
      ...(Array.isArray(pendingContext.classSkills) ? pendingContext.classSkills : []),
      ...(Array.isArray(pendingContext.ledger?.classSkills?.granted) ? pendingContext.ledger.classSkills.granted : []),
    ]);
    const resolvedOptions = [];

    for (const choice of pendingContext.pendingChoices || []) {
      const bgId = choice?.sourceBackgroundId || choice?.backgroundId;
      const chosen = Array.isArray(this._backgroundSkillChoices[bgId]) ? this._backgroundSkillChoices[bgId] : [];
      if (chosen.length) {
        choice.resolved = [...chosen];
        choice.isResolved = true;
      }
      const granted = Array.isArray(choice.resolved) ? choice.resolved : [];
      granted.forEach(skill => {
        if (skill) {
          resolvedClassSkills.add(skill);
          resolvedOptions.push(skill);
        }
      });
    }

    const fixedLanguages = new Set([
      ...(Array.isArray(pendingContext.languages?.fixed) ? pendingContext.languages.fixed : []),
      ...(Array.isArray(pendingContext.ledger?.languages?.fixed) ? pendingContext.ledger.languages.fixed : []),
    ]);
    for (const entitlement of pendingContext.languages?.entitlements || []) {
      const bgId = entitlement?.sourceBackgroundId || entitlement?.backgroundId;
      const chosen = Array.isArray(this._backgroundLanguageChoices[bgId]) ? this._backgroundLanguageChoices[bgId] : [];
      if (chosen.length) {
        entitlement.resolved = [...chosen];
        entitlement.isResolved = true;
        chosen.forEach(lang => lang && fixedLanguages.add(lang));
      }
    }

    pendingContext.classSkills = Array.from(resolvedClassSkills);
    pendingContext.backgroundSkillOptions = Array.from(new Set(resolvedOptions));
    pendingContext.backgroundSkillOptionsResolved = true;
    pendingContext.languages = pendingContext.languages || { fixed: [], entitlements: [] };
    pendingContext.languages.fixed = Array.from(fixedLanguages).sort();
    if (pendingContext.ledger?.classSkills) {
      pendingContext.ledger.classSkills.granted = pendingContext.classSkills;
      pendingContext.ledger.classSkills.resolvedChoices = { ...this._backgroundSkillChoices };
    }
    if (pendingContext.ledger?.languages) {
      pendingContext.ledger.languages.fixed = pendingContext.languages.fixed;
      pendingContext.ledger.languages.resolvedChoices = { ...this._backgroundLanguageChoices };
    }
    return pendingContext;
  }


  async _promptForBackgroundSkillChoices(background, count, options) {
    const requiredCount = Math.max(1, Number(count || 1));
    const inputType = requiredCount === 1 ? 'radio' : 'checkbox';
    const choices = (Array.isArray(options) ? options : [])
      .map((skill, index) => {
        const display = buildSkillDisplay(skill);
        const label = display.label || String(skill || '').trim();
        if (!label) return null;
        return {
          value: label,
          label,
          ability: display.ability,
          abilityLabel: display.abilityLabel,
          abilityClass: display.abilityClass,
          checked: inputType === 'radio' ? index === 0 : index < requiredCount
        };
      })
      .filter(Boolean);

    const result = await BackgroundChoiceDialog.prompt({
      title: `Pick ${requiredCount} Background Skill${requiredCount === 1 ? '' : 's'}`,
      backgroundName: String(background?.name || 'Background'),
      prompt: `grants class-skill training access.`,
      choices,
      requiredCount,
      inputType,
      fieldName: 'backgroundSkill',
      confirmLabel: 'Confirm Skills',
      cancelLabel: 'Cancel'
    });

    return Array.isArray(result) ? result : null;
  }

  _extractBackgroundLanguageChoiceOptions(background) {
    const raw = [background?.bonusLanguage, background?.mechanicalEffect?.description, background?.specialAbility]
      .filter(Boolean)
      .join(' ');
    const explicit = raw.match(/\bgain\s+(.+?)\s+language\b/i) || raw.match(/\bbonus language:\s*(.+?)(?:\.|$)/i);
    const source = explicit?.[1] || background?.bonusLanguage || '';
    const options = String(source || '')
      .replace(/\blanguage\b/gi, '')
      .replace(/\blanguages\b/gi, '')
      .split(/\s+or\s+|,|;/i)
      .map(value => value.replace(/^and\s+/i, '').trim())
      .filter(Boolean);
    return Array.from(new Set(options));
  }

  async _promptForBackgroundLanguageChoice(background, options) {
    const choices = (Array.isArray(options) ? options : [])
      .map((language, index) => {
        const label = String(language || '').trim();
        if (!label) return null;
        return {
          value: label,
          label,
          checked: index === 0
        };
      })
      .filter(Boolean);

    const result = await BackgroundChoiceDialog.prompt({
      title: 'Pick Background Language',
      backgroundName: String(background?.name || 'Background'),
      prompt: 'grants a background language.',
      choices,
      requiredCount: 1,
      inputType: 'radio',
      fieldName: 'backgroundLanguage',
      confirmLabel: 'Confirm Language',
      cancelLabel: 'Cancel'
    });

    return Array.isArray(result) ? (result[0] || null) : null;
  }

  _getMentorFlavorForBackground(background) {
    const category = background.category || 'event';
    const flavors = {
      event: `${background.name}... A defining moment indeed.`,
      occupation: `A ${background.name}. That shapes your perspective.`,
      planet: `From ${background.name}. Your home shaped you.`,
    };
    return flavors[category] || `${background.name} — an interesting path.`;
  }

  _getSelectionStatusText() {
    const count = this._committedBackgroundIds.length;
    if (this._maxBackgrounds === 1) {
      return count === 0 ? 'No background selected' : 'Single-background mode';
    }

    return `${count} of ${this._maxBackgrounds} selected`;
  }

  _getCommittedNames() {
    return this._committedBackgroundIds
      .map(id => this._allBackgrounds.find(b => b.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }

  async _restoreCustomBackgrounds(shell) {
    const restored = [];
    const pending = shell?.progressionSession?.currentPendingBackgroundContext;
    const selected = Array.isArray(pending?.selectedBackgrounds) ? pending.selectedBackgrounds : [];
    for (const bg of selected) {
      if (!bg || bg.category !== 'planet') continue;
      const id = bg.id || bg.slug;
      if (!id || !String(id).startsWith('custom-planet-')) continue;
      if (this._allBackgrounds.some((entry) => entry.id === id)) continue;
      restored.push(bg);
    }
    this._customBackgrounds = restored;
    if (restored.length) {
      this._allBackgrounds = [...this._allBackgrounds, ...restored];
    }
  }

  async _openCustomPlanetDialog(shell) {
    try {
      if (!SkillRegistry.isBuilt) await SkillRegistry.build?.();
      await LanguageRegistry.ensureLoaded();

      const allowUTF = Boolean(game?.settings?.get('foundryvtt-swse', 'allowCustomPlanetUTF'));
      const rawSkills = SkillRegistry.list?.() || [];
      const skills = rawSkills
        .filter((skill) => allowUTF || String(skill.name || '').toLowerCase() !== 'use the force')
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      const languages = (await LanguageRegistry.all?.() || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

      const dialog = new CustomPlanetBackgroundDialog({
        skills,
        languages,
        allowUTF,
        onSubmit: async (payload) => {
          await this._createCustomPlanetBackground(payload, shell);
        }
      });

      await dialog.render(true);
    } catch (error) {
      console.error('[BackgroundStep] Failed to open custom planet dialog:', error);
      ui.notifications?.error('Could not open the custom planet builder.');
    }
  }

  async _createCustomPlanetBackground(payload, shell) {
    const planetName = String(payload?.planetName || '').trim();
    const relevantSkills = Array.isArray(payload?.relevantSkills) ? payload.relevantSkills.map((entry) => String(entry).trim()).filter(Boolean) : [];
    const bonusLanguage = String(payload?.bonusLanguage || '').trim();
    if (!planetName || relevantSkills.length !== 3 || !bonusLanguage) return;

    const idBase = planetName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom-planet';
    const id = `custom-planet-${idBase}`;

    const background = {
      id,
      slug: id,
      name: planetName,
      category: 'planet',
      source: 'Custom Planetary Background',
      description: `Custom homeworld background for ${planetName}.`,
      narrativeDescription: `${planetName} shaped your early life and perspective.`,
      relevantSkills,
      skillChoiceCount: 2,
      bonusLanguage,
      mechanicalEffect: {
        type: 'class_skills',
        count: 2,
        description: `Choose 2 class skills from ${relevantSkills.join(', ')}.`,
        skills: []
      },
      metadata: {
        isCustomPlanet: true
      }
    };

    this._allBackgrounds = this._allBackgrounds.filter((entry) => entry.id !== id);
    this._customBackgrounds = this._customBackgrounds.filter((entry) => entry.id !== id);
    this._allBackgrounds.push(background);
    this._customBackgrounds.push(background);
    this._groupBackgrounds();
    this._focusedBackgroundId = id;

    await this.onItemCommitted(id, shell);

    const flavorText = `A custom homeworld then: ${planetName}. That gives you 2 class skills from ${relevantSkills.join(', ')} and ${bonusLanguage} as its language.`;
    void shell.mentorRail?.speak?.(flavorText, 'neutral');
  }

  getAutoAdvanceConfig(shell) {
    return {
      enabled: true,
      delayMs: 700,
      requireNoRemainingPicks: true,
    };
  }

}
