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
import { getStepMentorObject, getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { getMentorGuidance } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';

export class ClassStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    this._allClasses = [];            // ClassesRegistry entries
    this._filteredClasses = [];       // after search + filter + sort applied
    this._searchQuery = '';
    this._filters = { type: null };   // type: 'base' | 'prestige' | null
    this._sortBy = 'source';          // 'source' | 'alpha'

    // Event listener cleanup
    this._utilityUnlisteners = [];

    // Committed selection tracking
    this._committedClassId = null;
    this._committedClassName = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Load all classes from registry
    this._allClasses = ClassesRegistry.getAll() || [];

    // Initial filter
    this._applyFilters();

    // Enable Ask Mentor for this step
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    // Clean up any existing listeners before rewiring (idempotent)
    this._cleanupUtilityListeners();

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

    shell.element.addEventListener('prog:utility:search', onSearch);
    shell.element.addEventListener('prog:utility:filter', onFilter);
    shell.element.addEventListener('prog:utility:sort', onSort);

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
    return {
      classes: this._filteredClasses.map(c => this._formatClassCard(c)),
      focusedClassId: context.focusedItem?.id ?? null,
      committedClassId: context.committedSelections?.get('class')?.classId ?? null,
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
    await handleAskMentor(shell.actor, 'class', shell);
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'class') || 'Choose your class carefully — it defines your role and abilities. Each path leads to a different destiny.';
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

  _formatClassCard(classData) {
    return {
      id: classData.id,
      name: classData.name,
      type: classData.prestige ? 'Prestige' : 'Base',
      bab: classData.bab ?? '+0',
      hitDie: classData.hitDie ?? 'd10',
      defenseBonus: classData.defenseBonus ?? '+0',
      description: classData.fantasy ?? classData.description ?? '',
      mentorName: classData.mentorName ?? 'Unknown Guide',
      metaChips: [
        { label: classData.prestige ? 'Prestige' : 'Base' },
        classData.source && { label: classData.source },
      ].filter(Boolean),
      stats: [
        { label: 'BAB', value: classData.bab ?? '+0' },
        { label: 'Hit Die', value: classData.hitDie ?? 'd10' },
        { label: 'Def Bonus', value: classData.defenseBonus ?? '+0' },
      ],
    };
  }
}
