/**
 * force-technique-step.js
 *
 * Force Technique selection step plugin — same stacking model as Force Powers.
 * CONDITIONAL — unlocked by engine-defined rules.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ForceRegistry } from '../../../engine/registries/force-registry.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { swseLogger } from '../../../utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';

export class ForceTechniqueStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._allTechniques = [];
    this._legalTechniques = [];
    this._filteredTechniques = [];
    this._searchQuery = '';
    this._focusedTechniqueId = null;
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
      this._remainingPicks = 0; // TODO (Wave 10): detect from engine

      await this._computeLegalTechniques(shell.actor);
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

    const { suggestedIds, hasSuggestions } = this.formatSuggestionsForDisplay(this._suggestedTechniques);

    return {
      techniques: this._filteredTechniques.map(t => this._formatTechniqueCard(t, suggestedIds)),
      focusedTechniqueId: this._focusedTechniqueId,
      committedCounts: Object.fromEntries(this._committedTechniqueCounts),
      committedSummary,
      remainingPicks: this._remainingPicks,
      hasSuggestions,
      suggestedTechniqueIds: Array.from(suggestedIds),
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

    // Update observable build intent (Phase 6 solution)
    if (shell?.buildIntent && this.descriptor?.stepId) {
      const techniquesList = Array.from(this._committedTechniqueCounts.entries())
        .filter(([_, count]) => count > 0)
        .map(([techniqueId, count]) => ({ id: techniqueId, count }));

      shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, techniquesList);
    }

    this._focusedTechniqueId = techniqueId;
    shell.focusedItem = technique;
    shell.render();
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

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/force-technique-details.hbs',
      data: {
        technique: focusedItem,
        description: focusedItem.description || focusedItem.system?.description || '',
        selectedCount: currentCount,
        canAddMore,
        buttonLabel: currentCount > 0 ? 'Add Another Technique' : 'Add Technique',
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
      return [{ label, isWarning: false }];
    }

    return [{ label: `${remaining} Technique(s) remaining`, isWarning: true }];
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
    const mentorObj = this._getMentorObject(shell.actor);
    return getMentorGuidance(mentorObj, 'force_technique') || 'Master these techniques with patience and practice.';
  }

  async onAskMentor(shell) {
    await handleAskMentor(shell.actor, 'force-techniques', shell);
  }

  getMentorMode() { return 'context-only'; }

  // Private

  async _computeLegalTechniques(actor) {
    this._legalTechniques = [...this._allTechniques]; // TODO: filter by prerequisites
  }

  _applyFilters() {
    let filtered = [...this._legalTechniques];
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));
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
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
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

  _formatTechniqueCard(technique, suggestedIds = new Set()) {
    const isSuggested = this.isSuggestedItem(technique.id, suggestedIds);
    return {
      ...technique,
      isSuggested,
      badgeLabel: isSuggested ? 'Recommended' : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
    };
  }
}
