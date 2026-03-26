/**
 * ClassStep plugin
 *
 * Handles class selection for chargen.
 * Implements focus/commit interaction model.
 * Triggers mentor swap on class commit (not on focus).
 * Manages utility bar search/filter/sort.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ClassesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js';
import { getStepMentorObject, getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { getMentorGuidance } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';

export class ClassStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    this._allClasses = [];            // ClassesRegistry entries
    this._filteredClasses = [];       // after search + filter + sort applied
    this._searchQuery = '';
    this._filters = { type: null };   // type: 'base' | 'prestige' | null
    this._sortBy = 'source';          // 'source' | 'alpha'

    // Event listener cleanup
    this._renderAbort = null;
    this._utilityUnlisteners = [];

    // Committed selection tracking
    this._committedClassId = null;
    this._committedClassName = null;

    // Suggestions
    this._suggestedClasses = [];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Load all classes from registry
    this._allClasses = ClassesRegistry.getAll() || [];

    // Get suggested classes
    await this._getSuggestedClasses(shell.actor, shell);

    // Initial filter
    this._applyFilters();

    // Enable Ask Mentor for this step
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const onSearch = e => {
      this._searchQuery = e.detail.query;
      this._applyFilters();
      shell.render();
    };
    const onFilter = e => {
      const { filterId, value } = e.detail;
      this._filters[filterId] = value;
      this._applyFilters();
      shell.render();
    };
    const onSort = e => {
      this._sortBy = e.detail.sortId;
      this._applyFilters();
      shell.render();
    };

    shell.element.addEventListener('prog:utility:search', onSearch, { signal });
    shell.element.addEventListener('prog:utility:filter', onFilter, { signal });
    shell.element.addEventListener('prog:utility:sort', onSort, { signal });

    this._utilityUnlisteners = [
      () => shell.element.removeEventListener('prog:utility:search', onSearch),
      () => shell.element.removeEventListener('prog:utility:filter', onFilter),
      () => shell.element.removeEventListener('prog:utility:sort', onSort),
    ];
  }

  async onStepExit(shell) {
    this._cleanupUtilityListeners();
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    const suggestedIds = new Set(this._suggestedClasses.map(s => s.id || s));
    return {
      classes: this._filteredClasses.map(c => this._formatClassCard(c, suggestedIds)),
      focusedClassId: context.focusedItem?.id ?? null,
      committedClassId: context.committedSelections?.get('class')?.classId ?? null,
      suggestedClassIds: Array.from(suggestedIds),
      suggestedClasses: this._suggestedClasses,
      hasSuggestions: this._suggestedClasses.length > 0,
    };
  }

  getSelection() {
    const committed = this._committedClassId ?? null;
    return {
      selected: committed ? [committed] : [],
      count: committed ? 1 : 0,
      isComplete: !!committed,
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/class-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!focusedItem) return this.renderDetailsPanelEmptyState();

    const classData = this._allClasses.find(c => c.id === focusedItem.id);
    if (!classData) return this.renderDetailsPanelEmptyState();

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/class-details.hbs',
      data: {
        class: classData,
        type: classData.prestige ? 'Prestige' : 'Base',
        bab: classData.bab ?? '+0',
        hitDie: classData.hitDie ?? 'd10',
        defenseBonus: classData.defenseBonus ?? '+0',
        startingAbilities: (classData.startingAbilities ?? []).map(a => ({ name: a })),
        trainedSkills: (classData.trainedSkills ?? []).map(s => ({ name: s })),
        classSkills: (classData.classSkills ?? []).map(s => ({ name: s })),
        mentorName: classData.mentorName ?? 'Unknown Guide',
        fantasy: classData.fantasy ?? classData.description ?? '',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Interaction: Focus vs Commit
  // ---------------------------------------------------------------------------

  async onItemFocused(id, shell) {
    const entry = this._allClasses.find(c => c.id === id);
    if (!entry) return;

    shell.focusedItem = entry;

    // Speak class flavor text on focus (but do NOT swap mentor yet)
    const flavorText = entry.fantasy || entry.description || `${entry.name} is a powerful choice.`;
    if (flavorText) {
      await shell.mentorRail.speak(flavorText, 'encouraging');
    }

    shell.render();
  }

  async onItemCommitted(id, shell) {
    const entry = this._allClasses.find(c => c.id === id);
    if (!entry) return;

    // Load full class data from ClassesRegistry
    const classData = ClassesRegistry.getById(id);
    if (!classData) {
      console.warn(`[ClassStep] Failed to load class data for ${entry.name}`);
      return;
    }

    // Record the committed selection
    shell.committedSelections.set('class', {
      classId: id,
      className: entry.name,
      classData,
    });

    // Update observable build intent (Phase 6 solution)
    if (shell.buildIntent) {
      shell.buildIntent.commitSelection('class-step', 'class', id);
    }

    this._committedClassId = id;
    this._committedClassName = entry.name;

    // *** MENTOR SWAP HAPPENS HERE, NOT ON FOCUS ***
    // Switch to class-specific mentor
    const mentorName = classData.mentorName || entry.name;
    const mentorGreeting = `Welcome, young ${entry.name}. I am ${mentorName}, and I will guide you through your path.`;

    shell.mentor.currentDialogue = mentorGreeting;
    shell.mentor.mood = 'encouraging';
    shell.mentor.mentorId = classData.mentorId || id;  // Store mentor ID for persistence
    // Note: full mentor swap (history, state, dialogue bank) happens in mentor-rail.js integration

    shell.focusedItem = null;
    shell.render();
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    return {
      isValid: !!this._committedClassId,
      errors: this._committedClassId ? [] : ['Select a class to continue'],
      warnings: [],
    };
  }

  getBlockingIssues() {
    return this._committedClassId ? [] : ['Select a class to continue'];
  }

  getRemainingPicks() {
    if (!this._committedClassId) {
      return [{ label: 'No class selected', count: 0, isWarning: true }];
    }

    return [{ label: `✓ ${this._committedClassName}`, count: 0, isWarning: false }];
  }

  // ---------------------------------------------------------------------------
  // Utility Bar Config
  // ---------------------------------------------------------------------------

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: { enabled: true, placeholder: 'Search classes…' },
      filters: [
        { id: 'base', label: 'Base Class', defaultOn: false },
        { id: 'prestige', label: 'Prestige Class', defaultOn: false },
      ],
      sorts: [
        { id: 'source', label: 'Source' },
        { id: 'alpha', label: 'A–Z' },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Mentor
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedClasses && this._suggestedClasses.length > 0) {
      await handleAskMentorWithSuggestions(shell.actor, 'class', this._suggestedClasses, shell, {
        domain: 'classes',
        archetype: 'your class choice'
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'class', shell);
    }
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'class');
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance
    if (this.isChargen(shell)) {
      return 'Choose your class carefully — it defines your role and abilities. Each path leads to a different destiny.';
    } else if (this.isLevelup(shell)) {
      return 'As you advance, you may embrace a new calling. Consider what new abilities would serve you well.';
    }

    return 'Choose your path wisely.';
  }

  getMentorMode() {
    return 'context-only';
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  _cleanupUtilityListeners() {
    this._utilityUnlisteners?.forEach(fn => fn());
    this._utilityUnlisteners = [];
  }

  _applyFilters() {
    let filtered = [...this._allClasses];

    // Search by name (case-insensitive substring)
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.name?.toLowerCase().includes(q));
    }

    // Type filter
    if (this._filters.type) {
      filtered = filtered.filter(c => {
        if (this._filters.type === 'base') return !c.prestige;
        if (this._filters.type === 'prestige') return c.prestige;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (this._sortBy === 'alpha') {
        return a.name?.localeCompare(b.name) ?? 0;
      }

      // Default: 'source' — priority classes first, then alpha
      const sourceOrder = { 'Jedi': 0, 'Sith': 1, 'Soldier': 2, 'Scoundrel': 3 };
      const aOrder = sourceOrder[a.name] ?? 4;
      const bOrder = sourceOrder[b.name] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;

      return a.name?.localeCompare(b.name) ?? 0;
    });

    this._filteredClasses = filtered;
  }

  _formatClassCard(classData, suggestedIds = new Set()) {
    const isSuggested = suggestedIds.has(classData.id);
    return {
      id: classData.id,
      name: classData.name,
      type: classData.prestige ? 'Prestige' : 'Base',
      bab: classData.bab ?? '+0',
      hitDie: classData.hitDie ?? 'd10',
      defenseBonus: classData.defenseBonus ?? '+0',
      description: classData.fantasy ?? classData.description ?? '',
      mentorName: classData.mentorName ?? 'Unknown Guide',
      isSuggested,
      metaChips: [
        { label: classData.prestige ? 'Prestige' : 'Base' },
        isSuggested && { label: 'Recommended', cssClass: 'prog-meta-chip--suggested' },
        classData.source && { label: classData.source },
      ].filter(Boolean),
      stats: [
        { label: 'BAB', value: classData.bab ?? '+0' },
        { label: 'Hit Die', value: classData.hitDie ?? 'd10' },
        { label: 'Def Bonus', value: classData.defenseBonus ?? '+0' },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested classes from SuggestionService
   * Recommendations based on species selection and roleplay preferences
   * @private
   */
  async _getSuggestedClasses(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'classes',
        available: this._allClasses,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedClasses = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[ClassStep] Suggestion service error:', err);
      this._suggestedClasses = [];
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
