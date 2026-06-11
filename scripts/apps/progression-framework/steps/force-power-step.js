/**
 * force-power-step.js
 *
 * Force Power selection step plugin for the progression shell.
 * Canonical V2 Force Power selector integrated with the shell regions (work-surface, details-panel).
 *
 * This step is CONDITIONAL in level-up mode — it's only unlocked by:
 * - Force Sensitivity feat
 * - Force Training feat
 * - Engine-defined force power grants
 *
 * Chargen: Force Powers are not a canonical step (unlocked implicitly via class).
 * Level-up: Force Powers appear when progression grants/reselection expose a force-power budget.
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
import { FeatGrantEntitlementResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js';

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
    this._activeCategory = 'force-all';
    this._categorySidebarCollapsed = false;

    /**
     * CRITICAL (Wave 10): Force Powers allow duplicate selections.
     * Each selection = additional use, not a unique ownership.
     * Model: Map<powerId, count> instead of Set.
     * Example: { 'move-object': 2, 'surge': 1 } = 3 total selections, 2 picks remaining
     */
    this._committedPowerCounts = new Map();  // id -> pending add count (for stacking)
    this._removedPowerCounts = new Map();    // id -> owned uses removed for reselection
    this._actorPowerCounts = new Map();      // id -> actor-owned count at render time
    this._baseRemainingPicks = 0;            // entitlement slots before reselection removals

    this._remainingPicks = 0;
    this._totalPowerTraining = 0;
    this._selectedPowerTraining = 0;
    this._entitlementReasons = [];
    this._entitlementSummary = null;
    this._suggestedPowers = [];  // Suggested force powers
    this._renderAbort = null;
    this._utilityUnlisteners = [];
    this._noChoiceAutoAdvanceStepId = null;
    this._currentActor = null;
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
      this._currentActor = shell?.actor ?? null;
      // Initialize force registry if needed
      if (!ForceRegistry._initialized) {
        await ForceRegistry.init();
      }

      // Get all force powers from registry
      this._allPowers = ForceRegistry.byType('power') || [];
      this._hydrateCommittedFromSession(shell);

      // GUARDRAIL (Wave 10): Compute total force power entitlements from ALL sources:
      // 1. Standard Force Training path (1 + WIS mod)
      // 2. Telekinetic Prodigy bonus slots (restricted to telekinetic powers)
      // 3. Class-based grants (from class level progression)
      // 4. Template-based grants (from applied templates)
      // 5. Generic feat-based grants (from compendium or hardcoded data)
      //
      // PHASE 3: Now shell-aware — passes shell context for pending state
      this._remainingPicks = await this._computeTotalEntitlements(shell.actor, shell);
      this._baseRemainingPicks = this._remainingPicks;

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

    this._scheduleNoChoiceAutoAdvance(shell);

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
    this._currentActor = context?.actor ?? this._currentActor ?? null;
    const actorEntries = this._getActorForcePowerEntries(context?.actor);
    this._actorPowerCounts = new Map(actorEntries.map((entry) => [entry.id, entry.count]));

    const pendingCounts = new Map(this._committedPowerCounts);
    const removedCounts = new Map(this._removedPowerCounts);
    const actorCommittedCounts = new Map(this._actorPowerCounts);

    const pendingSelectedTotal = this._sumCounts(pendingCounts);
    const removedTotal = this._sumCounts(removedCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();
    const remainingTrainingDisplay = Math.max(0, effectiveBudget - pendingSelectedTotal);
    const selectedTrainingDisplay = Math.min(effectiveBudget, Math.max(this._selectedPowerTraining, pendingSelectedTotal));

    swseLogger.debug('[ForcePowerStep.getStepData] Slot calculation', {
      totalPowerTraining: this._totalPowerTraining,
      selectedPowerTraining: this._selectedPowerTraining,
      baseRemainingPicks: this._baseRemainingPicks,
      remainingPicks: this._remainingPicks,
      effectiveBudget,
      pendingSelectedTotal,
      removedTotal,
      actorCommittedCounts: Object.fromEntries(actorCommittedCounts),
      pendingPowerCounts: Object.fromEntries(pendingCounts),
      removedPowerCounts: Object.fromEntries(removedCounts),
      entitlementReasons: this._entitlementReasons
    });

    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedPowers);
    const formattedPowers = this._filteredPowers.map(p => this._formatPowerCard(p, suggestedIds, confidenceMap));
    const browserModel = this._buildBrowserModel(formattedPowers);

    const cardStates = new Map();
    const allPowerIds = new Set([
      ...formattedPowers.map((power) => power.stateId || power.id),
      ...Array.from(pendingCounts.keys()),
      ...Array.from(actorCommittedCounts.keys()),
      ...Array.from(removedCounts.keys()),
    ]);

    for (const powerId of allPowerIds) {
      const pendingCount = pendingCounts.get(powerId) ?? 0;
      const committedCount = actorCommittedCounts.get(powerId) ?? 0;
      const removedCount = removedCounts.get(powerId) ?? 0;
      const effectiveOwnedCount = Math.max(0, committedCount - removedCount);
      const totalCount = effectiveOwnedCount + pendingCount;
      const canDecrement = pendingCount > 0 || effectiveOwnedCount > 0;
      const canIncrement = pendingSelectedTotal < effectiveBudget || removedCount > 0;

      cardStates.set(powerId, {
        powerId,
        pendingCount,
        committedCount,
        removedCount,
        effectiveOwnedCount,
        totalCount,
        isPending: pendingCount > 0,
        isCommitted: effectiveOwnedCount > 0,
        isRemoved: removedCount > 0,
        canIncrement,
        canDecrement,
        status: removedCount > 0 ? 'removed'
          : effectiveOwnedCount > 0 && pendingCount > 0 ? 'pending-additional'
            : effectiveOwnedCount > 0 ? 'committed'
              : pendingCount > 0 ? 'pending'
                : 'available',
      });
    }

    const committedSummary = [];
    for (const [id, count] of actorCommittedCounts.entries()) {
      const removedCount = removedCounts.get(id) ?? 0;
      const effectiveOwnedCount = Math.max(0, count - removedCount);
      const power = this._resolvePower(id);
      if (effectiveOwnedCount > 0) committedSummary.push({ id, name: power?.name || id, count: effectiveOwnedCount, status: 'committed' });
      if (removedCount > 0) committedSummary.push({ id, name: power?.name || id, count: removedCount, status: 'removed' });
    }
    for (const [id, count] of pendingCounts.entries()) {
      if (count <= 0) continue;
      const power = this._resolvePower(id);
      committedSummary.push({ id, name: power?.name || id, count, status: 'pending' });
    }

    const telekineticProdigy = this._getTelekineticProdigyState(context?.actor);

    return {
      powers: formattedPowers,
      ...browserModel,
      focusedPowerId: this._focusedPowerId,
      pendingCounts: Object.fromEntries(pendingCounts),
      committedCounts: Object.fromEntries(actorCommittedCounts),
      removedCounts: Object.fromEntries(removedCounts),
      cardStates: Object.fromEntries(cardStates),
      committedSummary,
      totalPowerTraining: this._totalPowerTraining,
      selectedPowerTraining: selectedTrainingDisplay,
      remainingPicks: remainingTrainingDisplay,
      selectionBudget: effectiveBudget,
      baseRemainingPicks: this._baseRemainingPicks,
      knownPowerCount: Math.max(0, this._sumCounts(actorCommittedCounts) - removedTotal + pendingSelectedTotal),
      removedPowerCount: removedTotal,
      pendingPowerCount: pendingSelectedTotal,
      entitlementReasons: [...this._entitlementReasons, ...(telekineticProdigy.active ? [`Telekinetic Prodigy: Move Object selected; +${telekineticProdigy.bonusSlots} bonus [Telekinetic] slot${telekineticProdigy.bonusSlots === 1 ? '' : 's'}`] : [])],
      telekineticProdigy,
      hasTrainingSummary: this._totalPowerTraining > 0 || this._entitlementReasons.length > 0 || removedTotal > 0,
      hasSuggestions,
      noNewPowerChoices: this._hasNoNewPowerChoices(),
      noNewPowerChoicesMessage: 'No new Force Power choices were granted by this level. Continuing automatically.',
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
    const totalSelected = this._sumCounts(this._committedPowerCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();
    return {
      selected: Array.from(this._committedPowerCounts.keys()),
      count: totalSelected,
      isComplete: totalSelected >= effectiveBudget,
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
    await this.onIncrementQuantity(powerId, shell, { render: false });
  }

  /**
   * Increment quantity of a selected power (via [+] button on card).
   * Restores a removed owned use first; otherwise spends an available pick.
   */
  async onIncrementQuantity(powerId, shell, options = {}) {
    const power = this._resolvePower(powerId);
    if (!power) return;

    const resolvedPowerId = this._normalizePowerId(power);
    const removedCount = this._removedPowerCounts.get(resolvedPowerId) ?? 0;
    const totalSelected = this._sumCounts(this._committedPowerCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();

    if (removedCount > 0) {
      const nextRemoved = removedCount - 1;
      if (nextRemoved > 0) this._removedPowerCounts.set(resolvedPowerId, nextRemoved);
      else this._removedPowerCounts.delete(resolvedPowerId);
    } else if (totalSelected < effectiveBudget) {
      const baseBudget = Math.max(0, Number(this._baseRemainingPicks ?? this._remainingPicks) || 0) + this._sumCounts(this._removedPowerCounts);
      const spendingOnlyProdigySlot = totalSelected >= baseBudget && this._getTelekineticProdigyBonusSlots(shell?.actor ?? this._currentActor) > 0;
      if (spendingOnlyProdigySlot && !this._isTelekineticPower(resolvedPowerId)) {
        ui?.notifications?.warn?.('Telekinetic Prodigy bonus slot can only select a [Telekinetic] Force Power.');
        return;
      }
      const currentCount = this._committedPowerCounts.get(resolvedPowerId) ?? 0;
      this._committedPowerCounts.set(resolvedPowerId, currentCount + 1);
    } else {
      return;
    }

    await this._commitPowerSelection(shell);
    this._focusedPowerId = resolvedPowerId;
    shell.focusedItem = this._formatPowerCard(power);
    if (options.render !== false) shell.render();
  }

  /**
   * Decrement quantity of a selected power (via [−] button on card).
   * Removes pending selections first. If the actor already owns the power,
   * marks one owned use for replacement, opening one additional pick slot.
   */
  async onDecrementQuantity(powerId, shell) {
    const power = this._resolvePower(powerId);
    if (!power) return;

    const resolvedPowerId = this._normalizePowerId(power);
    const currentPending = this._committedPowerCounts.get(resolvedPowerId) ?? 0;

    if (currentPending > 0) {
      const next = currentPending - 1;
      if (next > 0) this._committedPowerCounts.set(resolvedPowerId, next);
      else this._committedPowerCounts.delete(resolvedPowerId);
    } else {
      const ownedCount = this._getActorPowerCount(shell?.actor, resolvedPowerId);
      const removedCount = this._removedPowerCounts.get(resolvedPowerId) ?? 0;
      if (ownedCount <= removedCount) return;
      this._removedPowerCounts.set(resolvedPowerId, removedCount + 1);
    }

    await this._commitPowerSelection(shell);
    this._focusedPowerId = resolvedPowerId;
    shell.focusedItem = this._formatPowerCard(power);
    shell.render();
  }

  async handleAction(action, event, target, shell) {
    if (action === 'select-force-power-category') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const category = target?.dataset?.category || target?.closest?.('[data-category]')?.dataset?.category;
      if (!category) return true;
      this._activeCategory = category;
      this._searchQuery = '';
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'force-power-category' }) ?? shell?.render?.());
      return true;
    }

    if (action === 'toggle-force-power-category-sidebar') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      this._categorySidebarCollapsed = !this._categorySidebarCollapsed;
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'force-power-category-sidebar' }) ?? shell?.render?.());
      return true;
    }

    if (action === 'reset-force-power-browser') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      this._searchQuery = '';
      this._activeCategory = 'force-all';
      this._categorySidebarCollapsed = false;
      await (shell?.requestRender?.({ preserveScroll: true, reason: 'force-power-browser-reset' }) ?? shell?.render?.());
      return true;
    }

    return false;
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
    const stateId = formattedPower.stateId || formattedPower.id;
    const currentCount = this._committedPowerCounts.get(stateId) ?? 0;
    const committedCount = this._actorPowerCounts.get(stateId) ?? 0;
    const removedCount = this._removedPowerCounts.get(stateId) ?? 0;
    const totalSelected = this._sumCounts(this._committedPowerCounts);
    const canAddMore = totalSelected < this._getEffectiveSelectionBudget() || removedCount > 0;

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
        committedCount,
        removedCount,
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

  _hasNoNewPowerChoices() {
    const effectiveBudget = this._getEffectiveSelectionBudget();
    const totalSelected = this._sumCounts(this._committedPowerCounts);
    return effectiveBudget <= 0 && totalSelected <= 0;
  }

  _scheduleNoChoiceAutoAdvance(shell) {
    if (!this._hasNoNewPowerChoices()) return false;
    const stepId = shell?.progressionSession?.currentStepId || shell?.steps?.[shell.currentStepIndex]?.stepId || 'force-powers';
    if (this._noChoiceAutoAdvanceStepId === stepId) return true;
    this._noChoiceAutoAdvanceStepId = stepId;

    globalThis.setTimeout?.(() => {
      const currentStepId = shell?.progressionSession?.currentStepId || shell?.steps?.[shell.currentStepIndex]?.stepId || null;
      if (currentStepId !== stepId) return;
      if (!this._hasNoNewPowerChoices()) return;
      void shell?._maybeScheduleAutoAdvance?.({ source: 'force-power-no-new-choices' });
    }, 120);
    return true;
  }

  /**
   * Validation — check that enough power selections are made (counting stacks).
   * Example: "Move Object ×2, Surge ×1" = 3 picks, if 3 allowed then valid.
   */
  validate() {
    const totalSelected = this._sumCounts(this._committedPowerCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();
    const isValid = totalSelected >= effectiveBudget;
    const errors = isValid ? [] : [
      `Select ${effectiveBudget - totalSelected} more Force Power use(s).`,
    ];
    return { isValid, errors, warnings: [] };
  }

  getBlockingIssues() {
    const totalSelected = this._sumCounts(this._committedPowerCounts);
    const remaining = this._getEffectiveSelectionBudget() - totalSelected;
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
    const totalSelected = this._sumCounts(this._committedPowerCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();
    const remaining = effectiveBudget - totalSelected;

    swseLogger.debug('[ForcePowerStep.getRemainingPicks] Footer calculation', {
      totalPowerTraining: this._totalPowerTraining,
      baseRemainingPicks: this._baseRemainingPicks,
      effectiveBudget,
      totalSelected,
      remaining,
      committedPowerCounts: Object.fromEntries(this._committedPowerCounts),
      removedPowerCounts: Object.fromEntries(this._removedPowerCounts)
    });

    if (remaining <= 0) {
      const summaryParts = Array.from(this._committedPowerCounts.entries()).map(([id, count]) => {
        const power = this._resolvePower(id);
        const name = power?.name || id;
        return count > 1 ? `${name} ×${count}` : name;
      });
      const removedTotal = this._sumCounts(this._removedPowerCounts);
      if (removedTotal > 0) summaryParts.push(`${removedTotal} replacement slot${removedTotal === 1 ? '' : 's'} opened`);
      const label = effectiveBudget <= 0
        ? 'Force Powers: no new choices'
        : (summaryParts.length > 0
          ? `✓ ${summaryParts.join(', ')}`
          : `✓ ${totalSelected} Selected`);
      return [{ label, count: 0, total: Math.max(0, Number(effectiveBudget || 0)), selected: Math.max(0, totalSelected), isWarning: false }];
    }

    return [{ label: 'Force Power use(s)', count: Math.max(0, remaining), total: Math.max(0, Number(effectiveBudget || 0)), selected: Math.max(0, totalSelected), isWarning: true }];
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
    return getStepGuidance(shell.actor, 'force-powers', shell)
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
        {
          reasons: result.reasons,
          source: result.source,
          diagnostics: result.diagnostics,
          featEntitlements: this._entitlementSummary
        }
      );
      return result.remaining;
    }

    // Fallback: Legacy actor-only calculation (compatibility)
    let totalEntitlements = 0;
    const reasons = [];

    const feats = actor.items?.filter(i => i.type === 'feat') ?? [];
    const forceTrainingFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

    if (forceTrainingFeats.length > 0) {
      const grantsForThisFeat = FeatGrantEntitlementResolver.getForceTrainingSlotsPerInstance(actor, null);

      for (let i = 0; i < forceTrainingFeats.length; i++) {
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

    // Build pending state including class-granted features and feat choices made
    // earlier in the same chargen/level-up session.
    const pending = this._buildPendingStateWithClassGrants(actor, shell);
    const rejectedSamples = [];

    for (const power of this._allPowers) {
      try {
        // PHASE 3.1: Pass pending state so prerequisites see class-granted features
        const assessment = AbilityEngine.evaluateAcquisition(actor, power, pending);

        if (assessment.legal) {
          this._legalPowers.push(power);
        } else if (rejectedSamples.length < 20) {
          rejectedSamples.push({
            id: power?.id || power?._id || null,
            name: power?.name || '(unnamed power)',
            reason: assessment?.reason || assessment?.message || assessment?.failureReason || null,
            missing: assessment?.missing || assessment?.missingPrerequisites || null,
          });
        }
      } catch (err) {
        if (rejectedSamples.length < 20) {
          rejectedSamples.push({
            id: power?.id || power?._id || null,
            name: power?.name || '(unnamed power)',
            reason: `assessment exception: ${err.message}`,
          });
        }
      }
    }

    if ((this._remainingPicks > 0 || this._totalPowerTraining > 0) && this._allPowers.length === 0) {
      swseLogger.warn('[ForcePowerStep] Force Power entitlement exists but ForceRegistry returned no powers', {
        entitlementSummary: this._entitlementSummary,
        pending,
      });
    } else if ((this._remainingPicks > 0 || this._totalPowerTraining > 0) && this._legalPowers.length === 0) {
      swseLogger.warn('[ForcePowerStep] Force Power entitlement exists but no legal powers resolved', {
        entitlementSummary: this._entitlementSummary,
        allPowerCount: this._allPowers.length,
        pendingClass: pending?.selectedClass?.name || pending?.selectedClass || null,
        pendingFeatNames: (pending?.selectedFeats || []).map(feat => feat?.name || feat?.label || feat).filter(Boolean),
        grantedFeatNames: (pending?.grantedFeats || []).map(feat => feat?.name || feat?.label || feat).filter(Boolean),
        rejectedSamples,
      });
    }

    swseLogger.debug(`[ForcePowerStep] Legal powers: ${this._legalPowers.length} of ${this._allPowers.length}`);
  }

  /**
   * Convert any selection container to a flat array.
   * @private
   */
  _asSelectionArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Collect pending selections from all known shell/session surfaces.
   * @private
   */
  _collectPendingSelections(shell, key, characterDataValue = []) {
    const values = [
      characterDataValue,
      shell?.getSelection?.(key),
      shell?.buildIntent?.getSelection?.(key),
      shell?.draftSelections?.[key],
      shell?.draftSelections?.get?.(key),
      shell?.committedSelections?.get?.(key),
      shell?.progressionSession?.draftSelections?.[key],
      shell?.progressionSession?.getSelection?.(key),
    ];
    const merged = [];
    const seen = new Set();
    for (const value of values) {
      for (const entry of this._asSelectionArray(value)) {
        if (!entry) continue;
        const identity = entry.id || entry._id || entry.uuid || entry.name || entry.label || `${typeof entry}:${merged.length}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        merged.push(entry);
      }
    }
    return merged;
  }

  _getPendingClassSelection(shell, characterData = {}) {
    return shell?.getSelection?.('class')
      || shell?.buildIntent?.getSelection?.('class')
      || shell?.committedSelections?.get?.('class')
      || shell?.draftSelections?.class
      || shell?.draftSelections?.get?.('class')
      || shell?.progressionSession?.draftSelections?.class
      || shell?.progressionSession?.getSelection?.('class')
      || characterData.classes?.[0]
      || characterData.class
      || null;
  }

  /**
   * Build pending state with class-granted features for prerequisite evaluation.
   * @private
   */
  _buildPendingStateWithClassGrants(actor, shell = null) {
    const characterData = shell?.buildIntent?.toCharacterData?.() || shell?.progressionSession?.toCharacterData?.() || {};
    const basePending = {
      selectedClass: this._getPendingClassSelection(shell, characterData),
      selectedFeats: this._collectPendingSelections(shell, 'feats', characterData.feats),
      selectedTalents: this._collectPendingSelections(shell, 'talents', characterData.talents),
      selectedSkills: this._collectPendingSelections(shell, 'skills', characterData.skills),
      skillRanks: characterData.skillRanks || shell?.draftSelections?.skillRanks || shell?.progressionSession?.draftSelections?.skillRanks || {},
      grantedFeats: [],
    };

    // Derive class-granted features.
    const selectedClass = basePending.selectedClass;
    if (selectedClass && actor) {
      const ledger = buildClassGrantLedger(actor, selectedClass, basePending);
      return mergeLedgerIntoPending(basePending, ledger);
    }

    return basePending;
  }

  /**
   * Apply search + sort to compute _filteredPowers. Category filtering is applied
   * in the browser view model so the left rail can still show accurate counts.
   */
  _applyFilters() {
    let filtered = [...this._legalPowers];

    if (this._searchQuery) {
      const q = this._normalizeSearchText(this._searchQuery);
      filtered = filtered.filter((power) => this._powerSearchText(power).includes(q));
    }

    filtered.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    this._filteredPowers = filtered;
  }

  _normalizeSearchText(value) {
    return String(value || '').trim().toLowerCase();
  }

  _powerSearchText(power) {
    const tags = this._collectPowerTags(power).join(' ');
    return this._normalizeSearchText([
      power?.name,
      power?.description,
      power?.system?.description,
      power?.category,
      power?.system?.category,
      power?.category,
      power?.system?.category,
      power?.form,
      power?.discipline,
      power?.system?.form,
      power?.system?.discipline,
      power?.meta?.discipline,
      tags,
    ].filter(Boolean).join(' '));
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

  _sumCounts(counts) {
    return Array.from(counts?.values?.() || []).reduce((sum, count) => sum + (Number(count) || 0), 0);
  }

  _normalizePowerId(powerOrId) {
    const power = typeof powerOrId === 'object' ? powerOrId : this._resolvePower(powerOrId);
    return String(power?.id || power?._id || power?.uuid || this._normalizePowerLookupKey(power?.name || powerOrId));
  }

  _hydrateCommittedFromSession(shell) {
    this._committedPowerCounts.clear();
    this._removedPowerCounts.clear();
    const values = shell?.progressionSession?.draftSelections?.forcePowers || [];
    if (!Array.isArray(values)) return;
    for (const entry of values) {
      const rawId = entry?.id || entry?._id || entry?.powerId || entry?.name || entry;
      if (!rawId) continue;
      const resolved = this._resolvePower(rawId);
      const id = this._normalizePowerId(resolved || rawId);
      const count = Math.max(0, Number(entry?.count ?? 1) || 0);
      const removeCount = Math.max(0, Number(entry?.removeCount ?? 0) || 0);
      if (count > 0) this._committedPowerCounts.set(id, count);
      if (removeCount > 0) this._removedPowerCounts.set(id, removeCount);
    }
  }

  _getEffectiveSelectionBudget() {
    const base = Math.max(0, Number(this._baseRemainingPicks ?? this._remainingPicks) || 0) + this._sumCounts(this._removedPowerCounts);
    return base + this._getTelekineticProdigyBonusSlots(this._currentActor);
  }

  _actorHasTalent(actor, talentName) {
    const wanted = String(talentName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return Array.from(actor?.items ?? []).some((item) => item?.type === 'talent' && String(item?.name || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*\(\d+\)\s*$/, '') === wanted);
  }

  _isMoveObjectPowerId(powerId) {
    const power = this._resolvePower(powerId);
    return /move\s*object/i.test(String(power?.name || powerId || ''));
  }

  _isTelekineticPower(powerId) {
    const power = this._resolvePower(powerId);
    const system = power?.system ?? {};
    const haystack = [
      power?.name,
      system.discipline,
      system.category,
      system.subcategory,
      ...(Array.isArray(system.descriptor) ? system.descriptor : []),
      ...(Array.isArray(system.descriptors) ? system.descriptors : []),
      ...(Array.isArray(system.tags) ? system.tags : [])
    ].join(' ').toLowerCase();
    return /telekinetic|telekinesis|move object|force slam|force thrust|force grip|ballistakinesis/.test(haystack);
  }

  _getTelekineticProdigyBonusSlots(actor) {
    if (!this._actorHasTalent(actor, 'Telekinetic Prodigy')) return 0;
    const hasSelectedMoveObject = Array.from(this._committedPowerCounts.keys()).some((id) => this._isMoveObjectPowerId(id));
    if (!hasSelectedMoveObject) return 0;
    // One bonus slot for this Force Training selection packet when Move Object is selected.
    return 1;
  }

  _getTelekineticProdigyState(actor) {
    const hasTalent = this._actorHasTalent(actor, 'Telekinetic Prodigy');
    const moveObjectSelected = Array.from(this._committedPowerCounts.keys()).some((id) => this._isMoveObjectPowerId(id));
    const bonusSlots = this._getTelekineticProdigyBonusSlots(actor);
    const pendingTelekineticSelections = Array.from(this._committedPowerCounts.entries())
      .filter(([id]) => this._isTelekineticPower(id))
      .reduce((sum, [, count]) => sum + (Number(count) || 0), 0);
    return {
      available: hasTalent,
      active: hasTalent && moveObjectSelected,
      moveObjectSelected,
      bonusSlots,
      pendingTelekineticSelections,
      note: hasTalent
        ? (moveObjectSelected ? 'Bonus slot unlocked. Use it for one extra [Telekinetic] Force Power.' : 'Select Move Object with Force Training to unlock one extra [Telekinetic] Force Power.')
        : ''
    };
  }

  _getActorForcePowerEntries(actor) {
    const items = actor?.items?.filter?.((item) => {
      const type = String(item?.type || '').toLowerCase();
      const executionModel = String(item?.system?.executionModel || item?.system?.abilityType || '').toLowerCase();
      return type === 'force-power' || type === 'power' || executionModel === 'force_power';
    }) || [];

    const counts = new Map();
    for (const item of items) {
      const candidates = [
        item.system?.abilities?.id,
        item.system?.slug,
        item.flags?.swse?.progression?.selectionId,
        item.id,
        item._id,
        item.name,
      ];
      const resolved = candidates.map((candidate) => this._resolvePower(candidate)).find(Boolean);
      const id = this._normalizePowerId(resolved || item.name || item.id);
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([id, count]) => ({ id, count }));
  }

  _getActorPowerCount(actor, powerId) {
    if (!this._actorPowerCounts?.size) {
      this._actorPowerCounts = new Map(this._getActorForcePowerEntries(actor).map((entry) => [entry.id, entry.count]));
    }
    return this._actorPowerCounts.get(this._normalizePowerId(powerId)) || 0;
  }

  async _commitPowerSelection(shell) {
    const powersList = [];
    const ids = new Set([
      ...Array.from(this._committedPowerCounts.keys()),
      ...Array.from(this._removedPowerCounts.keys()),
    ]);

    for (const id of ids) {
      const power = this._resolvePower(id);
      const count = Math.max(0, Number(this._committedPowerCounts.get(id) || 0));
      const removeCount = Math.max(0, Number(this._removedPowerCounts.get(id) || 0));
      if (count <= 0 && removeCount <= 0) continue;
      powersList.push({ id, name: power?.name || id, count, removeCount });
    }

    await this._commitNormalized(shell, 'forcePowers', powersList);
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, 'forcePowers', powersList);
    }
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

  _collectPowerTags(power) {
    const raw = [
      power?.tags,
      power?.system?.tags,
      power?.descriptor,
      power?.system?.descriptor,
      power?.system?.descriptors,
    ];
    const tags = [];
    for (const value of raw) {
      if (Array.isArray(value)) tags.push(...value);
      else if (value) tags.push(...String(value).split(/[,;]/));
    }
    return tags.map((tag) => String(tag || '').trim()).filter(Boolean);
  }

  _powerHasTag(power, candidates = []) {
    const haystack = [
      ...this._collectPowerTags(power),
      power?.name,
      power?.description,
      power?.category,
      power?.system?.category,
      power?.form,
      power?.discipline,
      power?.system?.form,
      power?.system?.discipline,
      power?.meta?.discipline,
    ].filter(Boolean).map((value) => this._normalizePowerLookupKey(value));
    return candidates.some((candidate) => haystack.includes(this._normalizePowerLookupKey(candidate)));
  }

  _isLightsaberFormPower(power) {
    return Boolean(
      String(power?.category || power?.system?.category || '').toLowerCase() === 'lightsaber-form'
      || power?.form
      || power?.system?.form
      || power?.discipline?.match?.(/form\s+[ivx]+/i)
      || power?.system?.discipline?.match?.(/form\s+[ivx]+/i)
      || this._powerHasTag(power, ['lightsaber-form', 'lightsaber form', 'lightsaber_form'])
    );
  }

  _getLightsaberFormName(power) {
    const raw = power?.form || power?.system?.form || power?.system?.discipline || power?.discipline || power?.category || '';
    const text = String(raw || '').trim();
    if (!text) return 'Other Forms';
    const afterColon = text.includes(':') ? text.split(':').pop().trim() : text;
    return afterColon || text;
  }

  _getForcePowerSubcategories(power) {
    const categories = [];
    if (this._powerHasTag(power, ['light-side', 'light side', 'light_side'])) categories.push('light-side');
    if (this._powerHasTag(power, ['dark-side', 'dark side', 'dark_side'])) categories.push('dark-side');
    if (this._powerHasTag(power, ['telekinesis', 'telekinetic', 'move-object', 'move object', 'force-thrust', 'force thrust'])) categories.push('telekinesis');
    if (this._powerHasTag(power, ['mind-affecting', 'mind affecting', 'mind_affecting', 'telepathic', 'mind trick', 'mind-trick'])) categories.push('mind-affecting');
    return categories;
  }

  _getPowerCategoryKeys(power) {
    if (this._isLightsaberFormPower(power)) {
      const formName = this._getLightsaberFormName(power);
      return ['lfp-all', `lfp-form:${this._normalizePowerLookupKey(formName)}`];
    }
    return ['force-all', ...this._getForcePowerSubcategories(power)];
  }

  _makeCategoryOption(key, label, icon, powers, options = {}) {
    const matching = powers.filter((power) => this._getPowerCategoryKeys(power).includes(key));
    return {
      key,
      label,
      icon,
      totalCount: matching.length,
      isActive: this._activeCategory === key,
      isMajor: options.isMajor === true,
      isSubcategory: options.isSubcategory === true,
    };
  }

  _buildBrowserModel(formattedPowers) {
    const allPowers = Array.isArray(formattedPowers) ? formattedPowers : [];
    const allLegalFormatted = (this._legalPowers || []).map((power) => this._formatPowerCard(power));
    const formNames = Array.from(new Set(
      allLegalFormatted
        .filter((power) => this._isLightsaberFormPower(power))
        .map((power) => this._getLightsaberFormName(power))
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    const categoryOptions = [
      this._makeCategoryOption('force-all', 'Force Powers', 'fa-hand-sparkles', allLegalFormatted, { isMajor: true }),
      this._makeCategoryOption('light-side', 'Light Side', 'fa-sun', allLegalFormatted, { isSubcategory: true }),
      this._makeCategoryOption('dark-side', 'Dark Side', 'fa-moon', allLegalFormatted, { isSubcategory: true }),
      this._makeCategoryOption('telekinesis', 'Telekinesis', 'fa-wind', allLegalFormatted, { isSubcategory: true }),
      this._makeCategoryOption('mind-affecting', 'Mind Affecting', 'fa-brain', allLegalFormatted, { isSubcategory: true }),
      this._makeCategoryOption('lfp-all', 'Lightsaber Form Powers', 'fa-sword-laser', allLegalFormatted, { isMajor: true }),
      ...formNames.map((formName) => this._makeCategoryOption(
        `lfp-form:${this._normalizePowerLookupKey(formName)}`,
        formName,
        'fa-jedi',
        allLegalFormatted,
        { isSubcategory: true }
      )),
    ];

    const hasSearchQuery = Boolean(this._searchQuery);
    const activeCategory = categoryOptions.find((category) => category.key === this._activeCategory)
      || categoryOptions.find((category) => category.key === 'force-all')
      || null;
    if (activeCategory && this._activeCategory !== activeCategory.key) this._activeCategory = activeCategory.key;

    const activeCategoryPowers = hasSearchQuery
      ? []
      : allPowers.filter((power) => this._getPowerCategoryKeys(power).includes(this._activeCategory));
    const searchResults = hasSearchQuery ? allPowers : [];

    const decorate = (power) => ({
      ...power,
      isFocused: this._focusedPowerId && String(power.stateId || power.id) === String(this._focusedPowerId),
      isSelected: this._committedPowerCounts.has(power.stateId) || ((this._actorPowerCounts.get(power.stateId) || 0) - (this._removedPowerCounts.get(power.stateId) || 0) > 0),
      shortSummary: power.description || power.system?.description || '',
      searchCategoryLabel: this._isLightsaberFormPower(power) ? `Lightsaber Form: ${this._getLightsaberFormName(power)}` : 'Force Power',
    });

    return {
      hasSearchQuery,
      searchQueryLabel: this._searchQuery,
      categorySidebarCollapsed: this._categorySidebarCollapsed,
      categoryOptions,
      activeCategoryLabel: activeCategory?.label || 'Force Powers',
      activeCategoryIcon: activeCategory?.icon || 'fa-hand-sparkles',
      activeCategoryCount: activeCategoryPowers.length,
      activeCategoryPowers: activeCategoryPowers.map(decorate),
      searchResults: searchResults.map(decorate),
      searchResultCount: searchResults.length,
      totalLegalPowerCount: allLegalFormatted.length,
    };
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
      stateId: this._normalizePowerId(power),
      img: this._resolvePowerImage(power),
      descriptorList: this._formatDescriptorList(power),
      roleMetadataTags: this._formatRoleMetadataTags(power),
      prerequisiteText: this._formatPrerequisites(power),
      isSuggested,
      badgeLabel: isSuggested ? 'Recommended' : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
    };
    return formatted;
  }
  getAutoAdvanceConfig(shell) {
    return {
      enabled: true,
      delayMs: 700,
      requireNoRemainingPicks: true,
    };
  }

}
