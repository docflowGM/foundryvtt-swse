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
import { normalizeClass } from './step-normalizers.js';
import { getStepMentorObject, getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { getMentorGuidance } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import SkillRegistry from '/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js';
import { evaluateClassEligibility } from '/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/class-prerequisites-cache.js';

export class ClassStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    this._allClasses = [];            // ClassesRegistry entries
    this._filteredClasses = [];       // after search + filter + sort applied
    this._searchQuery = '';
    this._filters = { type: null, heroicType: null };   // type: 'base' | 'prestige' | null; heroicType: 'heroic' | 'nonheroic' | null
    this._sortBy = 'source';          // 'source' | 'alpha'

    // Event listener cleanup
    this._renderAbort = null;
    this._utilityUnlisteners = [];

    // Committed selection tracking
    this._committedClassId = null;
    this._committedClassName = null;

    // Suggestions
    this._suggestedClasses = [];
    this._skillDocs = [];

    // Phase 2.5: Track if this is a nonheroic progression
    this._isNonheroicProgression = false;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Load all classes from registry
    this._allClasses = ClassesRegistry.getAll() || [];

    // Phase 2.5: Detect nonheroic progression context
    this._isNonheroicProgression = shell.progressionSession?.nonheroicContext?.hasNonheroic === true;

    // If nonheroic progression, auto-filter to nonheroic classes only
    if (this._isNonheroicProgression) {
      this._filters.heroicType = 'nonheroic';
    }

    // Get suggested classes
    await this._getSuggestedClasses(shell.actor, shell);

    try {
      if (!SkillRegistry.isBuilt) await SkillRegistry.build?.();
      this._skillDocs = SkillRegistry.list?.() || [];
    } catch (_err) {
      this._skillDocs = [];
    }

    const utilityFilters = shell?.utilityBar?.getFilterState?.() || {};
    if (utilityFilters.base) this._filters.type = 'base';
    if (utilityFilters.prestige) this._filters.type = 'prestige';
    if (utilityFilters.nonheroic) this._filters.heroicType = 'nonheroic';
    const utilitySearch = shell?.utilityBar?.getSearchQuery?.();
    if (utilitySearch) this._searchQuery = utilitySearch;
    const utilitySort = shell?.utilityBar?.getSortValue?.();
    if (utilitySort) this._sortBy = utilitySort;

    // Initial filter
    this._applyFilters(shell);

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
      this._applyFilters(shell);
      shell.render();
    };
    const onFilter = e => {
      const { filterId, value } = e.detail;
      if (filterId === 'base' && value) {
        this._filters.type = 'base';
      } else if (filterId === 'prestige' && value) {
        this._filters.type = 'prestige';
      } else if ((filterId === 'base' || filterId === 'prestige') && !value && this._filters.type === filterId) {
        this._filters.type = null;
      } else if (filterId === 'nonheroic') {
        this._filters.heroicType = value ? 'nonheroic' : null;
      }
      this._applyFilters(shell);
      shell.render();
    };
    const onSort = e => {
      this._sortBy = e.detail.sortId;
      this._applyFilters(shell);
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
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedClasses);
    return {
      classes: this._filteredClasses.map(c => this._formatClassCard(c, suggestedIds, confidenceMap)),
      focusedClassId: context.focusedItem?.id ?? null,
      committedClassId: context.committedSelections?.get('class')?.classId ?? null,
      suggestedClassIds: Array.from(suggestedIds),
      suggestedClasses: this._suggestedClasses,
      hasSuggestions,
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
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

    const normalized = normalizeDetailPanelData(classData, 'class');
    const mentor = getMentorForClass(classData.name);
    const levelOne = Array.isArray(classData.levelProgression) ? (classData.levelProgression.find(l => Number(l.level) === 1) || classData.levelProgression[0]) : null;
    const babValue = levelOne?.bab ?? (classData.babProgression === 'fast' ? 1 : 0);
    const defenses = classData.defenses || {};
    const classSkills = this._formatSkillNames(classData.classSkills || []);
    const trainedSkillCount = Number(classData.trainedSkills ?? classData.system?.trainedSkills ?? 0) || 0;
    const levelOneFeatures = (classData.startingFeatures || levelOne?.features || []).map(f => ({
      name: typeof f === 'string' ? f : (f?.name || f?.label || ''),
      type: typeof f === 'string' ? null : (f?.type || null),
    })).filter(f => f.name);

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/class-details.hbs',
      data: {
        class: classData,
        type: classData.prestigeClass ? 'Prestige' : 'Base',
        bab: `+${babValue}`,
        hitDie: `d${classData.hitDie ?? 10}`,
        defenses: { fortitude: defenses.fortitude ?? 0, reflex: defenses.reflex ?? 0, will: defenses.will ?? 0 },
        trainedSkillCount,
        classSkills: classSkills.map(name => ({ name })),
        mentorName: mentor?.name || classData.mentorName || 'Unknown Mentor',
        fantasy: classData.fantasy ?? classData.description ?? '',
        levelOneFeatures,
        classTags: [classData.role, classData.source, classData.forceSensitive ? 'Force-Sensitive' : null].filter(Boolean),
        canonicalDescription: normalized.description,
        metadataTags: normalized.metadataTags,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
      },
    };
  }

  _formatSkillNames(skillRefs = []) {
    return (skillRefs || []).map(ref => {
      if (!ref) return null;
      const direct = this._skillDocs.find(s => s._id === ref || s.id === ref || s.name === ref);
      if (direct?.name) return direct.name;
      const text = String(ref);
      if (/^[a-f0-9]{16}$/i.test(text)) return `Unknown Skill (${text.slice(0, 6)})`;
      return text.replace(/[_-]+/g, ' ').replace(/(^|\s)\w/g, m => m.toUpperCase());
    }).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Interaction: Focus vs Commit
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

    // PHASE 3: Normalize and commit to canonical session, preserving sourceId for re-resolution
    const normalizedClass = normalizeClass({
      classId: id,
      sourceId: classData.sourceId,  // PHASE 3: Preserve sourceId for downstream re-resolution
      className: entry.name,
      classData,
      system: classData.system,
    });

    if (!normalizedClass) {
      console.warn(`[ClassStep] Failed to normalize class data for ${entry.name}`);
      return;
    }

    // Commit to canonical session (also updates committedSelections for backward compat)
    // PHASE 2: await reconciliation after commit
    await this._commitNormalized(shell, 'class', normalizedClass);

    this._committedClassId = id;
    this._committedClassName = entry.name;

    const mentor = getMentorForClass(entry.name);
    if (mentor?.id) {
      shell.mentorRail?.setMentor?.(mentor.id);
      shell.mentor.currentDialogue = `Welcome, ${entry.name}. ${mentor.name} will guide your path.`;
      shell.mentor.mood = 'encouraging';
      shell.mentor.mentorId = mentor.id;
    }

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
    const filters = [
      { id: 'base', label: 'Base Class', defaultOn: false },
      { id: 'prestige', label: 'Prestige Class', defaultOn: false },
    ];

    // Phase 2.5: Show heroic/nonheroic filter only during chargen (not levelup)
    // Nonheroic progression auto-filters this, so show the filter for awareness
    if (this._isNonheroicProgression) {
      filters.push({ id: 'nonheroic', label: 'Nonheroic Only', defaultOn: true });
    }

    return {
      mode: 'rich',
      search: { enabled: true, placeholder: 'Search classes…' },
      filters,
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
    const customGuidance = getStepGuidance(shell.actor, 'class', shell);
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

  _applyFilters(shell = null) {
    let filtered = [...this._allClasses];

    // Search by name (case-insensitive substring)
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.name?.toLowerCase().includes(q));
    }

    // Type filter (base vs prestige)
    if (this._filters.type) {
      filtered = filtered.filter(c => {
        if (this._filters.type === 'base') return c.baseClass !== false;
        if (this._filters.type === 'prestige') return c.prestigeClass === true || c.baseClass === false;
        return true;
      });
    }

    const pendingData = shell?.buildIntent?.toCharacterData?.() || {};
    filtered = filtered.filter(c => evaluateClassEligibility({ className: c.name, actor: shell?.actor, pendingData })?.eligible !== false);

    // Phase 2.5: Heroic/Nonheroic filter
    if (this._filters.heroicType) {
      filtered = filtered.filter(c => {
        const isNonheroic = c.system?.isNonheroic === true;
        if (this._filters.heroicType === 'heroic') return !isNonheroic;
        if (this._filters.heroicType === 'nonheroic') return isNonheroic;
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

  _formatClassCard(classData, suggestedIds = new Set(), confidenceMap = new Map()) {
    const isSuggested = suggestedIds.has(classData.id);
    const confidenceData = confidenceMap.get ? confidenceMap.get(classData.id) : confidenceMap[classData.id];
    const recommendedLabel = isSuggested
      ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended')
      : null;

    return {
      id: classData.id,
      name: classData.name,
      type: classData.prestigeClass ? 'Prestige' : 'Base',
      bab: `+${(Array.isArray(classData.levelProgression) ? ((classData.levelProgression.find(l => Number(l.level) === 1) || classData.levelProgression[0])?.bab ?? 0) : 0)}`,
      hitDie: classData.hitDie ?? 'd10',
      defenseBonus: `${classData.defenses?.fortitude ?? 0}/${classData.defenses?.reflex ?? 0}/${classData.defenses?.will ?? 0}`,
      description: classData.fantasy ?? classData.description ?? '',
      mentorName: getMentorForClass(classData.name)?.name ?? classData.mentorName ?? 'Unknown Mentor',
      isSuggested,
      confidenceLevel: confidenceData?.confidenceLevel || null,
      metaChips: [
        { label: classData.prestige ? 'Prestige' : 'Base' },
        isSuggested && { label: recommendedLabel, cssClass: 'prog-meta-chip--suggested' },
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
    this._skillDocs = [];
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
