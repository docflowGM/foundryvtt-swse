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
    this._searchQuery = '';
    this._focusedTechniqueId = null;
    this._activeCategory = 'recommended';
    this._categorySidebarCollapsed = false;
    this._committedTechniqueCounts = new Map();
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
    const values = shell?.progressionSession?.draftSelections?.forceTechniques || [];
    if (!Array.isArray(values)) return;
    for (const entry of values) {
      const id = entry?.id || entry?._id || entry?.techniqueId || entry?.name || entry;
      const count = Math.max(0, Number(entry?.count ?? 1) || 0);
      if (id && count > 0) this._committedTechniqueCounts.set(id, count);
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
      this._searchQuery = e.detail.query;
      this._applyFilters();
      shell.render();
    };
    const onFilter = e => {
      this._applyFilters();
      shell.render();
    };
    const onSort = e => {
      this._applyFilters();
      shell.render();
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

  async getStepData(context) {
    const committedSummary = Array.from(this._committedTechniqueCounts.entries()).map(([id, count]) => {
      const technique = this._allTechniques.find(t => t.id === id);
      return { id, name: technique?.name || id, count };
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

    const currentCount = this._committedTechniqueCounts.get(techniqueId) ?? 0;
    const totalSelected = Array.from(this._committedTechniqueCounts.values()).reduce((sum, c) => sum + c, 0);

    if (totalSelected < this._remainingPicks) {
      this._committedTechniqueCounts.set(techniqueId, currentCount + 1);
    }

    const techniquesList = Array.from(this._committedTechniqueCounts.entries())
      .filter(([_, count]) => count > 0)
      .map(([techniqueId, count]) => ({ id: techniqueId, count }));

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

    if (action === 'reset-force-technique-browser') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      this._searchQuery = '';
      this._activeCategory = 'recommended';
      this._categorySidebarCollapsed = false;
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

    const currentCount = this._committedTechniqueCounts.get(focusedItem.id) ?? 0;
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
        canAddMore,
        buttonLabel: currentCount > 0 ? 'Choose This Technique Again' : 'Choose This Technique',
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
      const summaryParts = Array.from(this._committedTechniqueCounts.entries()).map(([id, count]) => {
        const technique = this._allTechniques.find(t => t.id === id);
        const name = technique?.name || id;
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

    // Build pending state including class-granted features
    const pending = this._buildPendingStateWithClassGrants(actor, shell);

    // PHASE 3.1: Pass pending state so prerequisites see class-granted features
    for (const technique of this._allTechniques) {
      const assessment = AbilityEngine.evaluateAcquisition(actor, technique, pending);

      if (assessment.legal) {
        this._legalTechniques.push(technique);
      }
    }

    swseLogger.debug(`[ForceTechniqueStep] Legal techniques: ${this._legalTechniques.length} of ${this._allTechniques.length}`);
  }

  /**
   * Build pending state with class-granted features for prerequisite evaluation.
   * @private
   */
  _getSelectedClassForPendingState(shell = null) {
    const session = shell?.progressionSession && shell.progressionSession !== shell ? shell.progressionSession : null;
    const read = (container) => container?.get?.('class') ?? container?.class ?? null;
    const candidates = [
      shell?.getSelection?.('class'),
      shell?.buildIntent?.getSelection?.('class'),
      read(shell?.draftSelections),
      read(shell?.committedSelections),
      session?.getSelection?.('class'),
      session?.buildIntent?.getSelection?.('class'),
      read(session?.draftSelections),
      read(session?.committedSelections),
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      return Array.isArray(candidate) ? candidate.find(Boolean) || null : candidate;
    }
    return null;
  }

  _buildPendingStateWithClassGrants(actor, shell = null) {
    const basePending = {
      selectedClass: this._getSelectedClassForPendingState(shell),
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
    let filtered = [...this._legalTechniques];
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
        available: this._legalTechniques,
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

  _formatTechniqueCard(technique, suggestedIds = new Set(), confidenceMap = new Map()) {
    const id = String(technique?.id || technique?._id || this._normalizeLookupKey(technique?.name));
    const isSuggested = this.isSuggestedItem(id, suggestedIds) || this.isSuggestedItem(technique?.id, suggestedIds);
    const confidenceData = confidenceMap.get ? (confidenceMap.get(id) || confidenceMap.get(technique?.id)) : (confidenceMap[id] || confidenceMap[technique?.id]);
    const relatedPower = this._getTechniqueRelatedPower(technique);
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
      isSelected: this._committedTechniqueCounts.has(id),
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
    const prereq = String(system.prerequisite || system.prerequisites || technique?.prerequisites?.raw || '').trim();
    if (prereq && !/^at least|force training|use the force/i.test(prereq)) return prereq;
    const name = String(technique?.name || '').trim();
    const match = name.match(/^(?:Improved|Extended|Advanced)\s+(.+)$/i);
    if (match) return match[1].trim();
    return '';
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

    const relatedPower = this._getTechniqueRelatedPower(technique);
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
    const allLegalFormatted = (this._legalTechniques || []).map((technique) => this._formatTechniqueCard(technique, suggestedIds, confidenceMap));
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
