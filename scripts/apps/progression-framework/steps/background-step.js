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
import { LanguageRegistry } from '/systems/foundryvtt-swse/scripts/registries/language-registry.js';
import { CustomPlanetBackgroundDialog } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/dialogs/custom-planet-background-dialog.js';

const CATEGORY_LABELS = {
  event: 'Event',
  occupation: 'Occupation',
  planet: 'Planet',
};

const CATEGORY_DESCRIPTIONS = {
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
    this._sortBy = 'alpha';
    this._customBackgrounds = [];

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
    const houseSetting = game?.settings?.get('foundryvtt-swse', 'backgroundSelectionCount');
    this._maxBackgrounds = houseSetting ?? 1;

    await this._restoreCustomBackgrounds(shell);

    // Group backgrounds by category
    this._groupBackgrounds();

    // Phase 5: Get suggested backgrounds from SuggestionService
    await this._getSuggestedBackgrounds(shell.actor, shell);

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
    if (['event', 'occupation', 'planet'].includes(filterId)) {
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
    const filtered = this._getFilteredBackgrounds();
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedBackgrounds);
    return {
      categories: this._getCategoryChips(),
      backgroundsByCategory: this._formatCategoryGroups(filtered, suggestedIds, confidenceMap),
      activeCategory: this._activeCategory,
      focusedBackgroundId: this._focusedBackgroundId,
      committedBackgroundIds: this._committedBackgroundIds,
      selectionMode: this._maxBackgrounds > 1 ? 'multi' : 'single',
      maxBackgrounds: this._maxBackgrounds,
      selectionCount: this._committedBackgroundIds.length,
      searchQuery: this._searchQuery,
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

  renderDetailsPanel(focusedItem) {
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
        relevantSkills: this._buildRelevantSkillDisplay(background),
        bonusLanguage: background.bonusLanguage || '',
        source: background.source || 'Unknown',
        mechanicalBonuses: this._extractMechanicalBonuses(background),
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

    // Single mode: replace selection
    if (this._maxBackgrounds === 1) {
      this._committedBackgroundIds = [id];
    } else {
      // Multi mode: toggle or add
      const idx = this._committedBackgroundIds.indexOf(id);
      if (idx >= 0) {
        // Remove
        this._committedBackgroundIds.splice(idx, 1);
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
        label: 'No background selected',
        count: this._maxBackgrounds,
        isWarning: true,
      }];
    }

    if (this._maxBackgrounds === 1) {
      return [{ label: `✓ ${this._getCommittedNames()}`, count: 0, isWarning: false }];
    }

    return [{
      label: `${count} of ${this._maxBackgrounds} backgrounds selected`,
      count: this._maxBackgrounds - count,
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
    filters: [
      { id: 'event', label: 'Event', defaultOn: this._activeCategory === 'event' },
      { id: 'occupation', label: 'Occupation', defaultOn: this._activeCategory === 'occupation' },
      { id: 'planet', label: 'Homeworld', defaultOn: this._activeCategory === 'planet' },
    ],
    sorts: [
      { id: 'alpha', label: 'Sort: A–Z' },
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



  async onAction(action, event, shell) {
    if (action === 'create-custom-planet') {
      await this._openCustomPlanetDialog(shell);
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
    const customGuidance = getStepGuidance(shell.actor, 'background');
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

      // Store top suggestions
      this._suggestedBackgrounds = (suggested || []).slice(0, 3);
    } catch (err) {
      console.warn('[BackgroundStep] Suggestion service error:', err);
      this._suggestedBackgrounds = [];
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


_getFilteredBackgrounds() {
  let filtered = this._allBackgrounds.filter((bg) => this._activeCategory === 'all' || (bg.category || 'event') === this._activeCategory);

  if (this._searchQuery) {
    const q = this._searchQuery.toLowerCase().trim();
    filtered = filtered.filter((bg) => {
      const haystack = [
        bg.name,
        bg.narrativeDescription,
        bg.description,
        bg.specialAbility,
        bg.bonusLanguage,
        bg.source,
        ...(bg.trainedSkills || []),
        ...(bg.relevantSkills || []),
        bg.mechanicalEffect?.description,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  if (this._sortBy === 'source') {
    filtered = filtered.slice().sort((a, b) => String(a.source || '').localeCompare(String(b.source || '')) || String(a.name || '').localeCompare(String(b.name || '')));
  } else {
    filtered = filtered.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }

  return filtered;
}


  _buildRelevantSkillDisplay(background, shell) {
    const rawSkills = [
      ...(background?.relevantSkills || []),
      ...(background?.trainedSkills || []),
    ].filter(Boolean);

    const selectedClass = resolveSelectedClassFromShell(shell);
    const classSkillRefs = selectedClass ? getClassSkills(selectedClass) : [];
    const classSkillKeys = new Set(classSkillRefs.map(ref => String(ref).toLowerCase().replace(/[^a-z0-9]/g, '')));

    return rawSkills.map(skill => {
      const label = String(skill);
      const key = label.toLowerCase().replace(/[^a-z0-9]/g, '');
      return { label, isClassSkill: classSkillKeys.has(key) };
    });
  }

_extractMechanicalBonuses(background) {
  const bonuses = [];
  if (!background) return bonuses;
  if (background.mechanicalEffect?.description) bonuses.push(background.mechanicalEffect.description);
  if (background.specialAbility) bonuses.push(background.specialAbility);
  if (background.skillChoiceCount && (background.relevantSkills || []).length) {
    bonuses.push(`Choose ${background.skillChoiceCount} skill${background.skillChoiceCount === 1 ? '' : 's'} from: ${(background.relevantSkills || []).join(', ')}`);
  }
  if (background.bonusLanguage) bonuses.push(`Bonus language: ${background.bonusLanguage}`);
  return bonuses;
}

_getCategoryChips() {
    return ['event', 'occupation', 'planet'].map(category => ({
      id: category,
      label: CATEGORY_LABELS[category],
      isActive: category === this._activeCategory,
      count: this._groupedBackgrounds[category]?.length || 0,
    }));
  }

  _formatCategoryGroups(filtered, suggestedIds = new Set(), confidenceMap = new Map()) {
    const result = {};
    for (const category of ['event', 'occupation', 'planet']) {
      if (this._activeCategory !== 'all' && category !== this._activeCategory) continue;
      const backgrounds = (this._groupedBackgrounds[category] || [])
        .filter(bg => filtered.includes(bg))
        .map(bg => {
          const isCommitted = this._committedBackgroundIds.includes(bg.id);
          const isFocused = bg.id === this._focusedBackgroundId;
          const isSuggested = this.isSuggestedItem(bg.id, suggestedIds);
          const confidenceData = confidenceMap.get ? confidenceMap.get(bg.id) : confidenceMap[bg.id];
          return {
            id: bg.id,
            name: bg.name,
            category,
            categoryLabel: CATEGORY_LABELS[category],
            shortDesc: (bg.narrativeDescription || bg.description || '').slice(0, 120),
            trainedSkills: (bg.trainedSkills || []).slice(0, 3),
            hasMore: (bg.trainedSkills || []).length > 3,
            isFocused,
            isCommitted,
            isSuggested,
            badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
            badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
            confidenceLevel: confidenceData?.confidenceLevel || null,
          };
        });

      if (backgrounds.length > 0) {
        result[category] = {
          label: CATEGORY_LABELS[category],
          description: CATEGORY_DESCRIPTIONS[category],
          backgrounds,
        };
      }
    }

    return result;
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

}
