/**
 * force-power-step.js
 *
 * Force Power selection step plugin for the progression shell.
 * Wraps ForcePowerPicker and integrates with the shell regions (work-surface, details-panel).
 *
 * This step is CONDITIONAL in level-up mode — it's only unlocked by:
 * - Force Sensitivity feat
 * - Force Training feat
 * - Engine-defined force power grants
 *
 * Chargen: Force Powers are not a canonical step (unlocked implicitly via class).
 * Level-up: Force Powers only appear when ForcePowerEngine grants them.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ForcePowerPicker } from '../../../apps/progression/force-power-picker.js';
import { ForcePowerEngine } from '../../../engine/progression/engine/force-power-engine.js';
import { ForceRegistry } from '../../../engine/registries/force-registry.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions, handleAskMentorWithPicker } from './mentor-step-integration.js';
import { swseLogger } from '../../../utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';

/**
 * Force Power step — both Generic (force-powers) for level-up use.
 * Extends this for domain-specific (ChargenForcePowerStep, LevelupForcePowerStep) if needed.
 */
export class ForcePowerStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._allPowers = [];              // All available force powers from registry
    this._legalPowers = [];            // Powers whose prerequisites are met
    this._filteredPowers = [];         // After search + filter + sort
    this._searchQuery = '';
    this._focusedPowerId = null;

    /**
     * CRITICAL (Wave 10): Force Powers allow duplicate selections.
     * Each selection = additional use, not a unique ownership.
     * Model: Map<powerId, count> instead of Set.
     * Example: { 'move-object': 2, 'surge': 1 } = 3 total selections, 2 picks remaining
     */
    this._committedPowerCounts = new Map();  // id -> count (for stacking)

    this._remainingPicks = 0;
    this._totalPowerTraining = 0;
    this._selectedPowerTraining = 0;
    this._entitlementReasons = [];
    this._entitlementSummary = null;
    this._suggestedPowers = [];  // Suggested force powers
    this._renderAbort = null;
    this._utilityUnlisteners = [];
  }

  get descriptor() { return this._descriptor; }

  /**
   * On step entry:
   * 1. Load available force powers from registry
   * 2. Determine how many picks are allowed (from engine or level grants)
   * 3. Compute legal powers (those whose prereqs are met)
   * 4. Update utility bar config
   */
  async onStepEnter(shell) {
    try {
      // Initialize force registry if needed
      if (!ForceRegistry._initialized) {
        await ForceRegistry.init();
      }

      // Get all force powers from registry
      this._allPowers = ForceRegistry.byType('power') || [];

      // GUARDRAIL (Wave 10): Compute total force power entitlements from ALL sources:
      // 1. Standard Force Training path (1 + WIS mod)
      // 2. Telekinetic Prodigy bonus slots (restricted to telekinetic powers)
      // 3. Class-based grants (from class level progression)
      // 4. Template-based grants (from applied templates)
      // 5. Generic feat-based grants (from compendium or hardcoded data)
      //
      // PHASE 3: Now shell-aware — passes shell context for pending state
      this._remainingPicks = await this._computeTotalEntitlements(shell.actor, shell);

      // Filter to legal powers (prereqs met, not already selected)
      // PHASE 3.1: Pass shell to access pending class grants
      await this._computeLegalPowers(shell.actor, shell);
      this._applyFilters();

      // Get suggested force powers
      await this._getSuggestedPowers(shell.actor, shell);

      // Enable Ask Mentor
      shell.mentor.askMentorEnabled = true;

      swseLogger.debug(
        `[ForcePowerStep] Entered: ${this._allPowers.length} total, ${this._legalPowers.length} legal, ${this._remainingPicks} picks available`
      );
    } catch (e) {
      swseLogger.error('[ForcePowerStep.onStepEnter]', e);
      this._allPowers = [];
      this._remainingPicks = 0;
    }
  }

  async onStepExit(shell) {
    // Cleanup listeners
    this._utilityUnlisteners.forEach(fn => fn());
    this._utilityUnlisteners = [];
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire utility bar event listeners
    const onSearch = e => {
      this._searchQuery = e.detail.query;
      this._applyFilters();
      shell.render();
    };
    const onFilter = e => {
      // planned (Wave 10+): implement power-level filtering
      this._applyFilters();
      shell.render();
    };
    const onSort = e => {
      // planned (Wave 10+): implement sorting
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

  /**
   * Provide step data to templates.
   * PHASE 8: Distinguishes pending counts (current session) from committed counts (already on actor).
   */
  async getStepData(context) {
    // Load actor's existing force powers (previously committed from past progressions)
    const actorForcePowers = context?.actor?.items?.filter(i =>
      i.type === 'force-power' || i.type === 'power'
    ) || [];
    const actorCommittedCounts = new Map();
    for (const item of actorForcePowers) {
      // Count occurrences of each power by name (actor may have duplicates for stacking)
      const powerId = item.system?.abilities?.id || item.name?.toLowerCase().replace(/\s+/g, '-');
      const currentCount = actorCommittedCounts.get(powerId) ?? 0;
      actorCommittedCounts.set(powerId, currentCount + 1);
    }

    // Pending counts are current session selections (in _committedPowerCounts)
    const pendingCounts = new Map(this._committedPowerCounts);

    const pendingSelectedTotal = Array.from(pendingCounts.values()).reduce((sum, count) => sum + (Number(count) || 0), 0);
    const selectedTrainingDisplay = Math.min(
      this._totalPowerTraining,
      Math.max(this._selectedPowerTraining, pendingSelectedTotal)
    );
    const remainingTrainingDisplay = Math.max(0, this._remainingPicks - pendingSelectedTotal);

    // Build card state map: powerId → {isPending, isCommitted, count, status}
    const cardStates = new Map();
    const allPowerIds = new Set([
      ...Array.from(pendingCounts.keys()),
      ...Array.from(actorCommittedCounts.keys()),
    ]);

    for (const powerId of allPowerIds) {
      const pendingCount = pendingCounts.get(powerId) ?? 0;
      const committedCount = actorCommittedCounts.get(powerId) ?? 0;
      const totalCount = pendingCount + committedCount;

      cardStates.set(powerId, {
        powerId,
        pendingCount,
        committedCount,
        totalCount,
        isPending: pendingCount > 0,
        isCommitted: committedCount > 0,
        status: committedCount > 0 && pendingCount > 0 ? 'pending-additional'
                : committedCount > 0 ? 'committed'
                : 'pending',
      });
    }

    // Build summary display: "Power A ×2 (Pending), Power B ×1 (Committed)"
    const committedSummary = Array.from(pendingCounts.entries()).map(([id, count]) => {
      const power = this._allPowers.find(p => p.id === id);
      return { id, name: power?.name || id, count, status: 'pending' };
    });
    for (const [id, count] of actorCommittedCounts.entries()) {
      if (!pendingCounts.has(id)) {
        const power = this._allPowers.find(p => p.id === id);
        committedSummary.push({ id, name: power?.name || id, count, status: 'committed' });
      }
    }

    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedPowers);

    return {
      powers: this._filteredPowers.map(p => this._formatPowerCard(p, suggestedIds, confidenceMap)),
      focusedPowerId: this._focusedPowerId,
      // PHASE 8: Separate pending and committed for UI distinction
      pendingCounts: Object.fromEntries(pendingCounts),
      committedCounts: Object.fromEntries(actorCommittedCounts),
      cardStates: Object.fromEntries(cardStates),
      committedSummary,  // for footer display
      totalPowerTraining: this._totalPowerTraining,
      selectedPowerTraining: selectedTrainingDisplay,
      remainingPicks: remainingTrainingDisplay,
      selectionBudget: this._remainingPicks,
      entitlementReasons: [...this._entitlementReasons],
      hasTrainingSummary: this._totalPowerTraining > 0 || this._entitlementReasons.length > 0,
      hasSuggestions,
      suggestedPowerIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  /**
   * Return current selection state.
   * Selection is complete when total picks selected >= total picks allowed.
   */
  getSelection() {
    const totalSelected = Array.from(this._committedPowerCounts.values()).reduce((sum, count) => sum + count, 0);
    return {
      selected: Array.from(this._committedPowerCounts.keys()),
      count: totalSelected,
      isComplete: totalSelected >= this._remainingPicks,
    };
  }

  /**
   * Single click = focus. Display in details panel, mentor reacts.
   */
  async onItemFocused(powerId, shell) {
    const power = this._resolvePower(powerId);
    if (!power) {
      swseLogger.warn('[ForcePowerStep] Focus requested for unknown force power', { powerId });
      return;
    }

    this._focusedPowerId = power.id;
    shell.focusedItem = this._formatPowerCard(power);

    // Do not fire mentor dialogue or render from focus. The shell owns the
    // detail-panel render after focus and preserves scroll around it. Triggering
    // an extra render here caused intermittent blank/stale details rails.
  }

  async onItemHovered(powerId, shell) {
    // Lightweight hover effect — no commit, no render
    // Could queue lightweight mentor comment here if desired
  }

  /**
   * Choose button = commit (add another use).
   * CRITICAL: Force Powers allow stacking — each click adds +1 to the count.
   * Removes power only if explicitly deselected (count → 0).
   */
  async onItemCommitted(powerId, shell) {
    const power = this._resolvePower(powerId);
    if (!power) return;

    const resolvedPowerId = power.id || powerId;
    const currentCount = this._committedPowerCounts.get(resolvedPowerId) ?? 0;
    const totalSelected = Array.from(this._committedPowerCounts.values()).reduce((sum, c) => sum + c, 0);

    // Can add another use if picks remain
    if (totalSelected < this._remainingPicks) {
      this._committedPowerCounts.set(resolvedPowerId, currentCount + 1);
    }
    // If all picks are used and this power is selected, allow deselection (count → 0)
    // This is handled via a separate deselect action in the details panel, if needed

    const powersList = Array.from(this._committedPowerCounts.entries())
      .filter(([_, count]) => count > 0)
      .map(([powerId, count]) => ({ id: powerId, count }));

    await this._commitNormalized(shell, 'forcePowers', powersList);

    // Update observable build intent (Phase 6 solution)
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, 'forcePowers', powersList);
    }

    // Keep focus on the power for context
    this._focusedPowerId = resolvedPowerId;
    shell.focusedItem = this._formatPowerCard(power);
    // The shell owns the post-commit render for normal card/details clicks. Rendering
    // here caused double-renders and intermittent stale/blank detail rails.
  }

  /**
   * PHASE 8: Increment quantity of a selected power (via [+] button on card).
   */
  async onIncrementQuantity(powerId, shell) {
    const power = this._resolvePower(powerId);
    if (!power) return;

    const resolvedPowerId = power.id || powerId;
    const currentCount = this._committedPowerCounts.get(resolvedPowerId) ?? 0;
    const totalSelected = Array.from(this._committedPowerCounts.values()).reduce((sum, c) => sum + c, 0);

    // Allow increment if picks remain
    if (totalSelected < this._remainingPicks) {
      this._committedPowerCounts.set(resolvedPowerId, currentCount + 1);

      const powersList = Array.from(this._committedPowerCounts.entries())
        .filter(([_, count]) => count > 0)
        .map(([id, count]) => ({ id, count }));
      await this._commitNormalized(shell, 'forcePowers', powersList);

      // Update buildIntent
      if (shell?.buildIntent && this.descriptor?.stepId) {
        shell.buildIntent.commitSelection(this.descriptor.stepId, 'forcePowers', powersList);
      }

      shell.render();
    }
  }

  /**
   * PHASE 8: Decrement quantity of a selected power (via [−] button on card).
   * Cannot decrement below 0 or decrement committed (already on actor) quantities.
   */
  async onDecrementQuantity(powerId, shell) {
    const power = this._resolvePower(powerId);
    if (!power) return;

    const resolvedPowerId = power.id || powerId;
    const currentCount = this._committedPowerCounts.get(resolvedPowerId) ?? 0;

    // Only decrement if there are pending selections to remove
    if (currentCount > 0) {
      this._committedPowerCounts.set(resolvedPowerId, currentCount - 1);

      // If count reaches 0, remove from map
      if (this._committedPowerCounts.get(resolvedPowerId) === 0) {
        this._committedPowerCounts.delete(resolvedPowerId);
      }

      const powersList = Array.from(this._committedPowerCounts.entries())
        .filter(([_, count]) => count > 0)
        .map(([id, count]) => ({ id, count }));
      await this._commitNormalized(shell, 'forcePowers', powersList);

      // Update buildIntent
      if (shell?.buildIntent && this.descriptor?.stepId) {
        shell.buildIntent.commitSelection(this.descriptor.stepId, 'forcePowers', powersList);
      }

      shell.render();
    }
  }

  /**
   * Render the work-surface content (power cards grid).
   */
  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/force-power-work-surface.hbs',
      data: stepData,
    };
  }

  /**
   * Render the details panel for a focused power.
   * Shows current stack count and button text: "Add Power" (first time) vs "Add Another Use" (already selected).
   */
  renderDetailsPanel(focusedItem) {
    if (!focusedItem) {
      return this.renderDetailsPanelEmptyState();
    }

    const resolvedPower = this._resolvePower(focusedItem.id || focusedItem._id || focusedItem.name) || focusedItem;
    const formattedPower = this._formatPowerCard(resolvedPower);
    const currentCount = this._committedPowerCounts.get(formattedPower.id) ?? this._committedPowerCounts.get(focusedItem.id) ?? 0;
    const totalSelected = Array.from(this._committedPowerCounts.values()).reduce((sum, c) => sum + c, 0);
    const canAddMore = totalSelected < this._remainingPicks;

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(formattedPower, 'force_power');
    const prerequisites = this._formatPrerequisites(formattedPower);
    const descriptors = this._formatDescriptorList(formattedPower);
    const roleMetadataTags = this._formatRoleMetadataTags(formattedPower);

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/force-power-details.hbs',
      data: {
        power: formattedPower,
        description: formattedPower.description || formattedPower.system?.description || '',
        prerequisites,
        descriptors,
        roleMetadataTags,
        hasDescriptors: descriptors.length > 0,
        hasRoleMetadataTags: roleMetadataTags.length > 0,
        selectedCount: currentCount,
        selectedCountLabel: currentCount === 1 ? 'time' : 'times',
        selectedUseLabel: currentCount === 1 ? 'use' : 'uses',
        canAddMore,
        buttonLabel: currentCount > 0 ? 'Add Another Use' : 'Add Power',
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
        icon: 'fa-hand-sparkles',
        message: 'Select a Force Power to review its effects and prerequisites.',
      },
    };
  }

  /**
   * Validation — check that enough power selections are made (counting stacks).
   * Example: "Move Object ×2, Surge ×1" = 3 picks, if 3 allowed then valid.
   */
  validate() {
    const totalSelected = Array.from(this._committedPowerCounts.values()).reduce((sum, c) => sum + c, 0);
    const isValid = totalSelected >= this._remainingPicks;
    const errors = isValid ? [] : [
      `Select ${this._remainingPicks - totalSelected} more Force Power use(s).`,
    ];
    return { isValid, errors, warnings: [] };
  }

  getBlockingIssues() {
    const totalSelected = Array.from(this._committedPowerCounts.values()).reduce((sum, c) => sum + c, 0);
    const remaining = this._remainingPicks - totalSelected;
    if (remaining <= 0) return [];
    return [
      `${remaining} Force Power use(s) remaining`,
    ];
  }

  getWarnings() {
    return [];
  }

  /**
   * Footer display: shows stacking summary + remaining picks.
   * Example footer: "Move Object ×2 | Surge ×1 | 3 Total | (0 remaining)"
   */
  getRemainingPicks() {
    const totalSelected = Array.from(this._committedPowerCounts.values()).reduce((sum, c) => sum + c, 0);
    const remaining = this._remainingPicks - totalSelected;

    if (remaining <= 0) {
      // Build display like "Move Object ×2, Surge ×1"
      const summaryParts = Array.from(this._committedPowerCounts.entries()).map(([id, count]) => {
        const power = this._allPowers.find(p => p.id === id);
        const name = power?.name || id;
        return count > 1 ? `${name} ×${count}` : name;
      });
      const label = summaryParts.length > 0
        ? `✓ ${summaryParts.join(', ')}`
        : `✓ ${totalSelected} Selected`;
      return [{ label, isWarning: false }];
    }

    return [{ label: `${remaining} Force Power use(s) remaining`, isWarning: true }];
  }

  /**
   * Utility bar config — search + power level filter.
   */
  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: {
        enabled: true,
        placeholder: 'Search Force Powers…',
      },
      filters: [
        // planned (Wave 10+): add power level filter
        // { id: 'level-1', label: 'Force Level 1', defaultOn: false },
        // { id: 'level-2', label: 'Force Level 2', defaultOn: false },
        // etc.
      ],
      sorts: [
        { id: 'name', label: 'Alphabetical' },
        // planned (Wave 10+): add force level sort
        // { id: 'level', label: 'Force Level' },
      ],
    };
  }

  getUtilityBarMode() {
    return 'rich';
  }

  /**
   * Mentor guidance for Force Powers step.
   * Uses canonical mentor dialogue authority (forcePowers guidance field).
   */
  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'force-powers')
      || 'The Force awaits your choice, young apprentice.';
  }

  /**
   * Ask Mentor — open suggestion modal or dialogue depending on step.
   */
  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedPowers && this._suggestedPowers.length > 0) {
      await handleAskMentorWithPicker(shell.actor, 'force-powers', this._suggestedPowers, shell, {
        domain: 'forcepowers',
        archetype: 'your force power choice',
        stepLabel: 'Force powers'
      }, async (selected) => {
        const id = selected?.id || selected?._id || selected?.powerId;
        if (!id) return;
        await this.onItemFocused(id, shell);
        await this.onItemCommitted(id, shell);
        shell.render();
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'force-powers', shell);
    }
  }

  getMentorMode() {
    return 'interactive';
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Compute total force power entitlements from ALL sources.
   * PHASE 3: Shell-aware — reads from pending shell state first, falls back to actor state.
   *
   * Sources:
   * 1. Force Training feat (1 + WIS/CHA modifier per feat instance)
   * 2. Class-level grants (from class level progression data)
   * 3. Template grants (from applied templates)
   * 4. Feat grants (generic feat-based grants)
   * 5. Telekinetic Prodigy bonus slots (restricted, but still count toward total)
   *
   * @param {Actor} actor
   * @param {Object} shell - Progression shell with pending selections
   * @returns {Promise<number>} Total picks the actor is entitled to
   */
  async _computeTotalEntitlements(actor, shell = null) {
    // Use shell-aware resolution if shell is provided
    if (shell) {
      const { resolveForcePowerEntitlements } = await import(
        '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js'
      );
      const result = await resolveForcePowerEntitlements(shell, actor);
      this._entitlementSummary = result;
      this._totalPowerTraining = Number(result.total) || 0;
      this._selectedPowerTraining = Number(result.selected) || 0;
      this._remainingPicks = Number(result.remaining) || 0;
      this._entitlementReasons = Array.isArray(result.reasons) ? result.reasons : [];
      swseLogger.debug(
        `[ForcePowerStep._computeTotalEntitlements] Shell-aware: ${result.total} total, ${result.selected} selected, ${result.remaining} remaining`,
        { reasons: result.reasons, source: result.source }
      );
      return result.remaining;
    }

    // Fallback: Legacy actor-only calculation (compatibility)
    let totalEntitlements = 0;
    const reasons = [];

    const feats = actor.items?.filter(i => i.type === 'feat') ?? [];
    const forceTrainingFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

    if (forceTrainingFeats.length > 0) {
      const wisMod = actor.system?.abilities?.wis?.mod ?? 0;
      const wisOrChaMod = actor.system?.abilities?.cha?.mod ?? wisMod;

      for (let i = 0; i < forceTrainingFeats.length; i++) {
        const grantsForThisFeat = Math.max(1, 1 + wisOrChaMod);
        totalEntitlements += grantsForThisFeat;
        reasons.push(`Force Training (${i + 1}) grants +${grantsForThisFeat}`);
      }
    }

    const alreadySelected = actor.system?.progression?.forcePowers?.length ?? 0;
    const remaining = Math.max(0, totalEntitlements - alreadySelected);

    this._entitlementSummary = { total: totalEntitlements, selected: alreadySelected, remaining, reasons, source: 'actor-fallback' };
    this._totalPowerTraining = totalEntitlements;
    this._selectedPowerTraining = alreadySelected;
    this._remainingPicks = remaining;
    this._entitlementReasons = reasons;

    swseLogger.debug(
      `[ForcePowerStep._computeTotalEntitlements] Actor fallback: ${totalEntitlements} total, ${alreadySelected} selected, ${remaining} remaining`
    );

    return remaining;
  }

  /**
   * Compute which powers have met prerequisites.
   * PHASE 3.1: Builds pending state with class-granted features for prerequisite checking.
   */
  async _computeLegalPowers(actor, shell = null) {
    this._legalPowers = [];

    // Build pending state including class-granted features
    const pending = this._buildPendingStateWithClassGrants(actor, shell);

    for (const power of this._allPowers) {
      // PHASE 3.1: Pass pending state so prerequisites see class-granted features
      const assessment = AbilityEngine.evaluateAcquisition(actor, power, pending);

      if (assessment.legal) {
        this._legalPowers.push(power);
      }
    }

    swseLogger.debug(`[ForcePowerStep] Legal powers: ${this._legalPowers.length} of ${this._allPowers.length}`);
  }

  /**
   * Build pending state with class-granted features for prerequisite evaluation.
   * @private
   */
  _buildPendingStateWithClassGrants(actor, shell = null) {
    const characterData = shell?.buildIntent?.toCharacterData?.() || shell?.progressionSession?.toCharacterData?.() || {};
    const basePending = {
      selectedClass: shell?.committedSelections?.get?.('class') || shell?.progressionSession?.draftSelections?.class || characterData.classes?.[0] || null,
      selectedFeats: characterData.feats || shell?.progressionSession?.draftSelections?.feats || [],
      selectedTalents: characterData.talents || shell?.progressionSession?.draftSelections?.talents || [],
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

  /**
   * Apply search + filter + sort to compute _filteredPowers.
   */
  _applyFilters() {
    let filtered = [...this._legalPowers];

    // Search by name
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    // Sort: alphabetical (default)
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    this._filteredPowers = filtered;
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested force powers from SuggestionService
   * Recommendations based on class, feats, and other selections
   * @private
   */
  async _getSuggestedPowers(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      // NOTE: Domain is 'forcepowers' per canonical domain registry (not 'force-powers')
      const suggested = await SuggestionService.getSuggestions(actor, (shell?.mode || shell?.progressionSession?.mode || 'chargen'), {
        domain: 'forcepowers',
        available: this._legalPowers,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedPowers = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[ForcePowerStep] Suggestion service error:', err);
      this._suggestedPowers = [];
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

  _normalizePowerLookupKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '-');
  }

  _resolvePower(powerId) {
    if (!powerId) return null;
    const key = String(powerId);
    const normalized = this._normalizePowerLookupKey(key);
    return this._allPowers.find(power => {
      const ids = [power?.id, power?._id, power?.uuid, power?.name]
        .filter(Boolean)
        .map(value => String(value));
      return ids.includes(key) || ids.some(value => this._normalizePowerLookupKey(value) === normalized);
    }) || null;
  }

  _toSystemAssetPath(value) {
    const path = String(value || '').trim();
    if (!path) return '';
    if (/^(?:https?:|data:|blob:)/i.test(path)) return path;
    if (path.startsWith('/systems/foundryvtt-swse/')) return path.slice(1);
    if (path.startsWith('systems/foundryvtt-swse/')) return path;
    if (path.startsWith('assets/')) return `systems/foundryvtt-swse/${path}`;
    if (path.startsWith('icons/svg/')) return 'systems/foundryvtt-swse/assets/icons/force-powers/force-power-31.png';
    return path;
  }

  _fallbackPowerIconBySlug(slug) {
    const exact = {
      'art-of-the-small': 'art-of-the-small.png',
      'battle-meditation': 'Battle Meditation.png',
      'battle-strike': 'Battle-Strike.png',
      'battlemind': 'Battlemind.png',
      'beam-of-light': 'beam-of-light.png',
      'cleanse-mind': 'cleanse-mind.png',
      'drain-energy': 'Drain-energy.png',
      'drain-life': 'Drain-life.png',
      'farseeing': 'Farseeing.png',
      'flashburn': 'flashburn.png',
      'force-blinding': 'force-blinding.png',
      'force-body': 'Force-Body.png',
      'force-cloak': 'Force-Cloak.png',
      'force-defense': 'Force-defense.png',
      'force-disarm': 'Force Disarm.png',
      'force-enlightenment': 'force-enlightenment.png',
      'force-grip': 'Force-grip.png',
      'force-harmony': 'force-harmony.png',
      'force-light': 'force-light.png',
      'force-meld': 'force-meld.png',
      'force-scream': 'Force Scream.png',
      'force-sense': 'Force Sense.png',
      'force-stasis': 'force-stasis.png',
      'force-storm': 'Force-Storm.png',
      'force-strike': 'Force Strike.png',
      'force-thrust': 'Force-Thrust.png',
      'force-track': 'Force Track.png',
      'force-valor': 'force-valor.png',
      'force-weapon': 'Force Weapon.png',
      'inspire': 'inspire.png',
      'mind-trick': 'mind-trick.png',
      'move-object': 'Move-object.png',
      'negate-energy': 'Negate-Energy.png',
      'plant-surge': 'plant-surge.png',
      'rebuke': 'Rebuke.png',
      'sever-force': 'sever-force.png',
      'surge': 'Surge.png',
      'vital-transfer': 'Vital-Transfer.png'
    };
    if (exact[slug]) return `assets/icons/force-powers/${exact[slug]}`;
    const generic = ['force-power-31.png', 'force-power-32.png', 'force-power-33.png', 'force-power-34.png', 'force-power-35.png', 'force-power-36.png', 'force-power-38.png', 'force-power-40.png', 'force-power-42.png', 'force-power-46.png', 'force-power-50.png', 'force-power-52.png', 'force-power-54.png', 'force-power-55.png', 'force-power-56.png', 'force-power-58.png'];
    const hash = Array.from(String(slug || 'force-power')).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return `assets/icons/force-powers/${generic[hash % generic.length]}`;
  }

  _resolvePowerImage(power) {
    const current = String(power?.img || '').trim();
    const slug = this._normalizePowerLookupKey(power?.name);
    const fallback = this._fallbackPowerIconBySlug(slug);
    if (!current || current === 'icons/svg/item-bag.svg' || current.includes('/svg/')) {
      return this._toSystemAssetPath(fallback);
    }
    return this._toSystemAssetPath(current);
  }

  _formatDescriptorList(power) {
    const raw = power?.system?.descriptor ?? power?.descriptor ?? power?.system?.descriptors ?? [];
    const values = Array.isArray(raw) ? raw : String(raw || '').split(/[,;]/);
    return values.map((value) => String(value || '').trim()).filter(Boolean);
  }

  _formatRoleMetadataTags(power) {
    const descriptors = new Set(this._formatDescriptorList(power).map((value) => this._normalizePowerLookupKey(value)));
    const rawTags = power?.system?.tags ?? power?.tags ?? [];
    const tags = Array.isArray(rawTags) ? rawTags : String(rawTags || '').split(/[,;]/);
    return tags
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)
      .filter((tag) => {
        const normalized = this._normalizePowerLookupKey(tag);
        return normalized && normalized !== 'force-power' && !descriptors.has(normalized);
      })
      .map((tag) => tag.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()));
  }

  _formatPrerequisites(power) {
    const raw = power?.system?.prerequisites
      ?? power?.system?.prerequisite
      ?? power?.prerequisites?.raw
      ?? power?.prerequisites
      ?? '';
    if (Array.isArray(raw)) return raw.filter(Boolean).join(', ');
    if (raw && typeof raw === 'object') return Object.values(raw).filter(Boolean).join(', ');
    return String(raw || '').trim();
  }

  _formatPowerCard(power, suggestedIds = new Set(), confidenceMap = new Map()) {
    const canonicalId = String(power?.id || power?._id || power?.uuid || this._normalizePowerLookupKey(power?.name));
    const isSuggested = this.isSuggestedItem(canonicalId, suggestedIds) || this.isSuggestedItem(power?.id, suggestedIds);
    const confidenceData = confidenceMap.get ? (confidenceMap.get(canonicalId) || confidenceMap.get(power?.id)) : (confidenceMap[canonicalId] || confidenceMap[power?.id]);
    const formatted = {
      ...power,
      id: canonicalId,
      _id: power?._id || canonicalId,
      lookupId: canonicalId,
      img: this._resolvePowerImage(power),
      descriptorList: this._formatDescriptorList(power),
      roleMetadataTags: this._formatRoleMetadataTags(power),
      prerequisiteText: this._formatPrerequisites(power),
      isSuggested,
      badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
    };
    return formatted;
  }
}
