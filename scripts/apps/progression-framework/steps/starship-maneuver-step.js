/**
 * starship-maneuver-step.js
 *
 * Starship Maneuver selection step — CRITICAL: uses stacking model like Force Powers.
 * Each duplicate selection = additional use, not an error.
 *
 * PHASE 3: Hardened to use ManeuverAuthorityEngine for access/capacity.
 * Content source: StarshipManeuverEngine (actor-owned) → StarshipManeuverManager (definition pool fallback)
 * CONDITIONAL — unlocked only when actor has starship piloting capability.
 *
 * PHASE 3.1: Comprehensive diagnostic logging for hydration failures.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ManeuverAuthorityEngine } from '../../../engine/progression/engine/maneuver-authority-engine.js';
import { StarshipManeuverEngine } from '../../../engine/progression/engine/starship-maneuver-engine.js';
import { StarshipManeuverManager } from '../../../utils/starship-maneuver-manager.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions, handleAskMentorWithPicker } from './mentor-step-integration.js';
import { swseLogger } from '../../../utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';

export class StarshipManeuverStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._allManeuvers = [];
    this._legalManeuvers = [];
    this._filteredManeuvers = [];
    this._searchQuery = '';
    this._focusedManeuverID = null;

    /**
     * CRITICAL (Wave 10): Starship Maneuvers use stacking model.
     * Each selection = additional use (like "Battle Strike ×2").
     */
    this._committedManeuverCounts = new Map();
    this._removedManeuverCounts = new Map();
    this._actorManeuverCounts = new Map();
    this._baseRemainingPicks = 0;
    this._totalManeuverTraining = 0;
    this._selectedManeuverTraining = 0;

    this._remainingPicks = 0;
    this._suggestedManeuvers = [];  // Suggested starship maneuvers

    // Event listener cleanup
    this._renderAbort = null;
    this._utilityUnlisteners = [];
  }

  get descriptor() { return this._descriptor; }

  async onStepEnter(shell) {
    const sessionId = shell?.sessionId || 'unknown';
    const actorName = shell?.actor?.name || 'unknown';
    const diagnostics = {
      sessionId,
      actorName,
      accessValidation: null,
      capacityResolution: null,
      contentSourceLoading: null,
      alreadySelected: null,
    };

    try {
      // PHASE 3: Validate access first (fail-closed if not allowed)
      try {
        const accessValidation = await ManeuverAuthorityEngine.validateManeuverAccess(shell.actor);
        diagnostics.accessValidation = {
          success: accessValidation.valid,
          reason: accessValidation.reason || 'not specified',
        };

        if (!accessValidation.valid) {
          swseLogger.warn(`[StarshipManeuverStep] Access blocked for ${actorName}`, {
            sessionId,
            reason: accessValidation.reason,
            diagnostics,
          });
          this._allManeuvers = [];
          this._remainingPicks = 0;
          shell.mentor.askMentorEnabled = true;
          return;
        }

        swseLogger.debug(`[StarshipManeuverStep] Access validated for ${actorName}`, { sessionId });
      } catch (accessErr) {
        diagnostics.accessValidation = {
          success: false,
          error: accessErr.message,
          reason: 'access validation threw exception',
        };
        swseLogger.error(`[StarshipManeuverStep] Access validation exception for ${actorName}`, {
          sessionId,
          error: accessErr.message,
          diagnostics,
        });
        this._allManeuvers = [];
        this._remainingPicks = 0;
        shell.mentor.askMentorEnabled = true;
        return;
      }

      // PHASE 3: Get capacity from authority engine
      let capacity = 0;
      try {
        capacity = await ManeuverAuthorityEngine.getManeuverCapacity(shell.actor, { shell, includePending: true });
        diagnostics.capacityResolution = {
          success: capacity > 0,
          capacity,
          message: capacity > 0 ? 'capacity determined' : 'zero capacity resolved',
        };

        swseLogger.debug(`[StarshipManeuverStep] Capacity resolved for ${actorName}`, {
          sessionId,
          capacity,
        });
      } catch (capacityErr) {
        diagnostics.capacityResolution = {
          success: false,
          error: capacityErr.message,
          message: 'capacity resolution threw exception',
        };
        swseLogger.error(`[StarshipManeuverStep] Capacity resolution exception for ${actorName}`, {
          sessionId,
          error: capacityErr.message,
          diagnostics,
        });
        this._allManeuvers = [];
        this._remainingPicks = 0;
        shell.mentor.askMentorEnabled = true;
        return;
      }

      // PHASE 3: Load maneuvers from primary source (actor-owned items)
      let maneuverPool = [];
      let contentSource = 'none';
      try {
        const actorManeuvers = await StarshipManeuverEngine.collectAvailableManeuvers(shell.actor);
        maneuverPool = actorManeuvers;
        contentSource = 'actor-owned';

        // Fallback to definition pool if actor has no owned maneuvers but access is valid
        if (maneuverPool.length === 0) {
          try {
            maneuverPool = StarshipManeuverManager._getAllManeuverDefinitions();
            contentSource = 'definition-pool';
            swseLogger.debug(`[StarshipManeuverStep] No actor-owned maneuvers, using definition pool fallback for ${actorName}`, {
              sessionId,
              definitionCount: maneuverPool.length,
            });
          } catch (defPoolErr) {
            diagnostics.contentSourceLoading = {
              actorEngineSuccess: true,
              actorEngineCount: 0,
              definitionPoolSuccess: false,
              definitionPoolError: defPoolErr.message,
              message: 'definition pool fallback threw exception',
            };
            swseLogger.error(`[StarshipManeuverStep] Definition pool fallback exception for ${actorName}`, {
              sessionId,
              error: defPoolErr.message,
              diagnostics,
            });
            this._allManeuvers = [];
            this._remainingPicks = 0;
            shell.mentor.askMentorEnabled = true;
            return;
          }
        } else {
          swseLogger.debug(`[StarshipManeuverStep] Using actor-owned maneuvers for ${actorName}`, {
            sessionId,
            actorOwnedCount: maneuverPool.length,
          });
        }

        diagnostics.contentSourceLoading = {
          actorEngineSuccess: true,
          actorEngineCount: actorManeuvers.length,
          definitionPoolSuccess: contentSource === 'definition-pool',
          definitionPoolCount: contentSource === 'definition-pool' ? maneuverPool.length : 0,
          source: contentSource,
          totalCount: maneuverPool.length,
        };
      } catch (contentErr) {
        diagnostics.contentSourceLoading = {
          actorEngineSuccess: false,
          actorEngineError: contentErr.message,
          message: 'actor maneuver engine threw exception',
        };
        swseLogger.error(`[StarshipManeuverStep] Content source loading exception for ${actorName}`, {
          sessionId,
          error: contentErr.message,
          diagnostics,
        });
        this._allManeuvers = [];
        this._remainingPicks = 0;
        shell.mentor.askMentorEnabled = true;
        return;
      }

      this._allManeuvers = maneuverPool;

      // Calculate remaining picks from capacity and shell selections
      try {
        const pendingManeuvers = shell?.buildIntent?.getSelection?.('starshipManeuvers') || [];
        const pendingCount = Array.isArray(pendingManeuvers)
          ? pendingManeuvers.reduce((sum, m) => sum + (m.count || 1), 0)
          : 0;
        const actorCount = shell.actor?.system?.starshipManeuverSuite?.maneuvers?.length ?? 0;
        const alreadySelected = pendingCount > 0 ? pendingCount : actorCount;
        this._remainingPicks = Math.max(0, capacity - alreadySelected);
        this._baseRemainingPicks = this._remainingPicks;
        this._totalManeuverTraining = capacity;
        this._selectedManeuverTraining = alreadySelected;

        diagnostics.alreadySelected = {
          pendingCount,
          actorCount,
          total: alreadySelected,
          capacity,
          remaining: this._remainingPicks,
        };

        swseLogger.log(`[StarshipManeuverStep] Entitlements resolved for ${actorName}`, {
          sessionId,
          capacity,
          alreadySelected,
          remaining: this._remainingPicks,
          source: contentSource,
          diagnostics,
        });
      } catch (selectedErr) {
        diagnostics.alreadySelected = {
          error: selectedErr.message,
          message: 'already-selected counting threw exception',
        };
        swseLogger.error(`[StarshipManeuverStep] Already-selected counting exception for ${actorName}`, {
          sessionId,
          error: selectedErr.message,
          diagnostics,
        });
        this._allManeuvers = [];
        this._remainingPicks = 0;
        shell.mentor.askMentorEnabled = true;
        return;
      }

      await this._computeLegalManeuvers(shell.actor);
      this._applyFilters();

      // Get suggested starship maneuvers
      await this._getSuggestedManeuvers(shell.actor, shell);

      shell.mentor.askMentorEnabled = true;

      swseLogger.debug(`[StarshipManeuverStep] Entered: ${this._allManeuvers.length} total, ${this._legalManeuvers.length} legal, ${this._remainingPicks} picks`, {
        sessionId,
        diagnostics,
      });
    } catch (e) {
      swseLogger.error(`[StarshipManeuverStep.onStepEnter] Unhandled exception for ${actorName}`, {
        sessionId,
        error: e.message,
        diagnostics,
      });
      this._allManeuvers = [];
      this._remainingPicks = 0;
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

    shell.element.addEventListener('prog:utility:search', onSearch, { signal });

    this._utilityUnlisteners = [
      () => shell.element?.removeEventListener('prog:utility:search', onSearch),
    ];
  }

  async getStepData(context) {
    const actorEntries = this._getActorManeuverEntries(context?.actor);
    this._actorManeuverCounts = new Map(actorEntries.map((entry) => [entry.id, entry.count]));

    const pendingCounts = new Map(this._committedManeuverCounts);
    const removedCounts = new Map(this._removedManeuverCounts);
    const committedCounts = new Map(this._actorManeuverCounts);
    const pendingTotal = this._sumCounts(pendingCounts);
    const removedTotal = this._sumCounts(removedCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();
    const remainingPicks = Math.max(0, effectiveBudget - pendingTotal);

    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedManeuvers);
    const formattedManeuvers = this._filteredManeuvers.map(m => this._formatManeuverCard(m, suggestedIds, confidenceMap));

    const cardStates = new Map();
    const allIds = new Set([
      ...formattedManeuvers.map((maneuver) => maneuver.stateId || maneuver.id),
      ...Array.from(pendingCounts.keys()),
      ...Array.from(committedCounts.keys()),
      ...Array.from(removedCounts.keys()),
    ]);

    for (const maneuverId of allIds) {
      const pendingCount = pendingCounts.get(maneuverId) ?? 0;
      const committedCount = committedCounts.get(maneuverId) ?? 0;
      const removedCount = removedCounts.get(maneuverId) ?? 0;
      const effectiveOwnedCount = Math.max(0, committedCount - removedCount);
      const totalCount = effectiveOwnedCount + pendingCount;
      const canDecrement = pendingCount > 0 || effectiveOwnedCount > 0;
      const canIncrement = pendingTotal < effectiveBudget || removedCount > 0;
      cardStates.set(maneuverId, {
        maneuverId,
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
    for (const [id, count] of committedCounts.entries()) {
      const removedCount = removedCounts.get(id) ?? 0;
      const effectiveOwnedCount = Math.max(0, count - removedCount);
      const maneuver = this._resolveManeuver(id);
      if (effectiveOwnedCount > 0) committedSummary.push({ id, name: maneuver?.name || id, count: effectiveOwnedCount, status: 'committed' });
      if (removedCount > 0) committedSummary.push({ id, name: maneuver?.name || id, count: removedCount, status: 'removed' });
    }
    for (const [id, count] of pendingCounts.entries()) {
      if (count <= 0) continue;
      const maneuver = this._resolveManeuver(id);
      committedSummary.push({ id, name: maneuver?.name || id, count, status: 'pending' });
    }

    return {
      maneuvers: formattedManeuvers,
      focusedManeuverID: this._focusedManeuverID,
      pendingCounts: Object.fromEntries(pendingCounts),
      committedCounts: Object.fromEntries(committedCounts),
      removedCounts: Object.fromEntries(removedCounts),
      cardStates: Object.fromEntries(cardStates),
      committedSummary,
      remainingPicks,
      selectionBudget: effectiveBudget,
      totalManeuverTraining: this._totalManeuverTraining,
      selectedManeuverTraining: Math.min(effectiveBudget, Math.max(this._selectedManeuverTraining, pendingTotal)),
      knownManeuverCount: Math.max(0, this._sumCounts(committedCounts) - removedTotal + pendingTotal),
      selectedManeuverCount: pendingTotal,
      removedManeuverCount: removedTotal,
      pendingManeuverCount: pendingTotal,
      hasTrainingSummary: effectiveBudget > 0 || removedTotal > 0,
      hasSuggestions,
      suggestedManeuverIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  getSelection() {
    const totalSelected = this._sumCounts(this._committedManeuverCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();
    return {
      selected: Array.from(this._committedManeuverCounts.keys()),
      count: totalSelected,
      isComplete: totalSelected >= effectiveBudget,
    };
  }

  async onItemFocused(maneuverId, shell) {
    const maneuver = this._resolveManeuver(maneuverId);
    if (!maneuver) return;

    const resolvedId = this._normalizeManeuverId(maneuver);
    this._focusedManeuverID = resolvedId;
    shell.focusedItem = this._formatManeuverCard(maneuver);
  }

  async onItemHovered(maneuverId, shell) {}

  async onItemCommitted(maneuverId, shell) {
    await this.onIncrementQuantity(maneuverId, shell, { render: false });
  }

  async onIncrementQuantity(maneuverId, shell, options = {}) {
    const maneuver = this._resolveManeuver(maneuverId);
    if (!maneuver) return;

    const resolvedId = this._normalizeManeuverId(maneuver);
    const removedCount = this._removedManeuverCounts.get(resolvedId) ?? 0;
    const totalSelected = this._sumCounts(this._committedManeuverCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();

    if (removedCount > 0) {
      const next = removedCount - 1;
      if (next > 0) this._removedManeuverCounts.set(resolvedId, next);
      else this._removedManeuverCounts.delete(resolvedId);
    } else if (totalSelected < effectiveBudget) {
      const currentCount = this._committedManeuverCounts.get(resolvedId) ?? 0;
      this._committedManeuverCounts.set(resolvedId, currentCount + 1);
    } else {
      return;
    }

    await this._commitManeuverSelection(shell);
    this._focusedManeuverID = resolvedId;
    shell.focusedItem = this._formatManeuverCard(maneuver);
    if (options.render !== false) shell.render();
  }

  async onDecrementQuantity(maneuverId, shell) {
    const maneuver = this._resolveManeuver(maneuverId);
    if (!maneuver) return;

    const resolvedId = this._normalizeManeuverId(maneuver);
    const currentPending = this._committedManeuverCounts.get(resolvedId) ?? 0;

    if (currentPending > 0) {
      const next = currentPending - 1;
      if (next > 0) this._committedManeuverCounts.set(resolvedId, next);
      else this._committedManeuverCounts.delete(resolvedId);
    } else {
      const ownedCount = this._getActorManeuverCount(shell?.actor, resolvedId);
      const removedCount = this._removedManeuverCounts.get(resolvedId) ?? 0;
      if (ownedCount <= removedCount) return;
      this._removedManeuverCounts.set(resolvedId, removedCount + 1);
    }

    await this._commitManeuverSelection(shell);
    this._focusedManeuverID = resolvedId;
    shell.focusedItem = this._formatManeuverCard(maneuver);
    shell.render();
  }


  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/starship-maneuver-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!focusedItem) {
      return this.renderDetailsPanelEmptyState();
    }

    const stateId = focusedItem.stateId || this._normalizeManeuverId(focusedItem);
    const currentCount = this._committedManeuverCounts.get(stateId) ?? 0;
    const committedCount = this._actorManeuverCounts.get(stateId) ?? 0;
    const removedCount = this._removedManeuverCounts.get(stateId) ?? 0;
    const totalSelected = this._sumCounts(this._committedManeuverCounts);
    const canAddMore = totalSelected < this._getEffectiveSelectionBudget() || removedCount > 0;

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(focusedItem, 'starship_maneuver');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/starship-maneuver-details.hbs',
      data: {
        maneuver: focusedItem,
        description: focusedItem.description || focusedItem.system?.description || '',
        selectedCount: currentCount,
        committedCount,
        removedCount,
        canAddMore,
        buttonLabel: currentCount > 0 ? 'Add Another Use' : 'Add Maneuver',
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
        icon: 'fa-rocket',
        message: 'Select a Starship Maneuver to master piloting techniques.',
      },
    };
  }

  validate() {
    const totalSelected = this._sumCounts(this._committedManeuverCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();
    const isValid = totalSelected >= effectiveBudget;
    const errors = isValid ? [] : [`Select ${effectiveBudget - totalSelected} more Maneuver(s).`];
    return { isValid, errors, warnings: [] };
  }

  getBlockingIssues() {
    const totalSelected = this._sumCounts(this._committedManeuverCounts);
    const remaining = this._getEffectiveSelectionBudget() - totalSelected;
    if (remaining <= 0) return [];
    return [`${remaining} Maneuver(s) remaining`];
  }

  getWarnings() { return []; }

  getRemainingPicks() {
    const totalSelected = this._sumCounts(this._committedManeuverCounts);
    const effectiveBudget = this._getEffectiveSelectionBudget();
    const remaining = effectiveBudget - totalSelected;

    if (remaining <= 0) {
      const summaryParts = Array.from(this._committedManeuverCounts.entries()).map(([id, count]) => {
        const maneuver = this._resolveManeuver(id);
        const name = maneuver?.name || id;
        return count > 1 ? `${name} ×${count}` : name;
      });
      const removedTotal = this._sumCounts(this._removedManeuverCounts);
      if (removedTotal > 0) summaryParts.push(`${removedTotal} replacement slot${removedTotal === 1 ? '' : 's'} opened`);
      const label = summaryParts.length > 0
        ? `✓ ${summaryParts.join(', ')}`
        : `✓ ${totalSelected} Selected`;
      return [{ label, isWarning: false }];
    }

    return [{ label: `${remaining} Maneuver(s) remaining`, isWarning: true }];
  }

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: { enabled: true, placeholder: 'Search Maneuvers…' },
      filters: [],
      sorts: [{ id: 'name', label: 'Alphabetical' }],
    };
  }

  getUtilityBarMode() { return 'rich'; }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'starship-maneuver', shell)
      || 'Make your choice wisely.';
  }

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedManeuvers && this._suggestedManeuvers.length > 0) {
      await handleAskMentorWithPicker(shell.actor, 'starship-maneuvers', this._suggestedManeuvers, shell, {
        domain: 'starship-maneuvers',
        archetype: 'your starship maneuver choice',
        stepLabel: 'starship maneuvers'
      }, async (selected) => {
        const id = selected?.id || selected?._id || selected?.maneuverId;
        if (!id) return;
        await this.onItemFocused(id, shell);
        await this.onItemCommitted(id, shell);
        shell.render();
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'starship-maneuvers', shell);
    }
  }

  getMentorMode() { return 'interactive'; }

  // Private

  async _computeLegalManeuvers(actor) {
    this._legalManeuvers = [];
    const actorName = actor?.name || 'unknown';

    try {
      // PHASE 3: Use AbilityEngine to evaluate prerequisite legality
      let evaluationErrors = 0;
      for (const maneuver of this._allManeuvers) {
        try {
          const assessment = AbilityEngine.evaluateAcquisition(actor, maneuver);

          if (assessment.legal) {
            this._legalManeuvers.push(maneuver);
          }
        } catch (itemErr) {
          evaluationErrors++;
          swseLogger.warn(`[StarshipManeuverStep] AbilityEngine evaluation exception for maneuver ${maneuver.id}`, {
            actorName,
            maneuverName: maneuver.name,
            error: itemErr.message,
          });
        }
      }

      swseLogger.debug(`[StarshipManeuverStep] Legal maneuvers computed for ${actorName}`, {
        legal: this._legalManeuvers.length,
        total: this._allManeuvers.length,
        evaluationErrors,
      });

      if (evaluationErrors > 0) {
        swseLogger.warn(`[StarshipManeuverStep] ${evaluationErrors} maneuver legality evaluations failed for ${actorName}`, {
          total: this._allManeuvers.length,
          evaluated: this._allManeuvers.length - evaluationErrors,
        });
      }
    } catch (err) {
      swseLogger.error(`[StarshipManeuverStep._computeLegalManeuvers] Unhandled exception for ${actorName}`, {
        error: err.message,
      });
      this._legalManeuvers = [];
    }
  }

  _applyFilters() {
    let filtered = [...this._legalManeuvers];
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(m => m.name.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    this._filteredManeuvers = filtered;
  }

  _getMentorObject(actor) {
    const className = actor.system?.class?.primary?.name;
    return getMentorForClass(className) || MENTORS.Scoundrel || Object.values(MENTORS)[0];
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested starship maneuvers from SuggestionService
   * Recommendations based on class, feats, and other selections
   * @private
   */
  async _getSuggestedManeuvers(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'starship-maneuvers',
        available: this._legalManeuvers,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedManeuvers = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[StarshipManeuverStep] Suggestion service error:', err);
      this._suggestedManeuvers = [];
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

  _normalizeManeuverLookupKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '-');
  }

  _normalizeManeuverId(maneuverOrId) {
    const maneuver = typeof maneuverOrId === 'object' ? maneuverOrId : this._resolveManeuver(maneuverOrId);
    return String(maneuver?.id || maneuver?._id || maneuver?.uuid || this._normalizeManeuverLookupKey(maneuver?.name || maneuverOrId));
  }

  _resolveManeuver(maneuverId) {
    if (!maneuverId) return null;
    const key = String(maneuverId);
    const normalized = this._normalizeManeuverLookupKey(key);
    return this._allManeuvers.find(maneuver => {
      const ids = [maneuver?.id, maneuver?._id, maneuver?.uuid, maneuver?.name, maneuver?.system?.slug]
        .filter(Boolean)
        .map(value => String(value));
      return ids.includes(key) || ids.some(value => this._normalizeManeuverLookupKey(value) === normalized);
    }) || null;
  }

  _getEffectiveSelectionBudget() {
    return Math.max(0, Number(this._baseRemainingPicks ?? this._remainingPicks) || 0) + this._sumCounts(this._removedManeuverCounts);
  }

  _getActorManeuverEntries(actor) {
    const suiteIds = new Set(Array.isArray(actor?.system?.starshipManeuverSuite?.maneuvers)
      ? actor.system.starshipManeuverSuite.maneuvers.map(value => String(value))
      : []);
    const items = actor?.items?.filter?.((item) => String(item?.type || '').toLowerCase() === 'maneuver') || [];
    const counts = new Map();

    for (const item of items) {
      if (suiteIds.size && !suiteIds.has(String(item.id || item._id)) && !suiteIds.has(String(item.name || ''))) continue;
      const candidates = [item.system?.slug, item.flags?.swse?.progression?.selectionId, item.id, item._id, item.name];
      const resolved = candidates.map((candidate) => this._resolveManeuver(candidate)).find(Boolean);
      const id = this._normalizeManeuverId(resolved || item.name || item.id);
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([id, count]) => ({ id, count }));
  }

  _getActorManeuverCount(actor, maneuverId) {
    if (!this._actorManeuverCounts?.size) {
      this._actorManeuverCounts = new Map(this._getActorManeuverEntries(actor).map((entry) => [entry.id, entry.count]));
    }
    return this._actorManeuverCounts.get(this._normalizeManeuverId(maneuverId)) || 0;
  }

  async _commitManeuverSelection(shell) {
    const maneuversList = [];
    const ids = new Set([
      ...Array.from(this._committedManeuverCounts.keys()),
      ...Array.from(this._removedManeuverCounts.keys()),
    ]);

    for (const id of ids) {
      const maneuver = this._resolveManeuver(id);
      const count = Math.max(0, Number(this._committedManeuverCounts.get(id) || 0));
      const removeCount = Math.max(0, Number(this._removedManeuverCounts.get(id) || 0));
      if (count <= 0 && removeCount <= 0) continue;
      maneuversList.push({ id, name: maneuver?.name || id, count, removeCount });
    }

    await this._commitNormalized(shell, 'starshipManeuvers', maneuversList);
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, 'starshipManeuvers', maneuversList);
    }
  }

  _formatManeuverCard(maneuver, suggestedIds = new Set(), confidenceMap = new Map()) {
    const canonicalId = this._normalizeManeuverId(maneuver);
    const isSuggested = this.isSuggestedItem(canonicalId, suggestedIds) || this.isSuggestedItem(maneuver.id, suggestedIds);
    const confidenceData = confidenceMap.get ? (confidenceMap.get(canonicalId) || confidenceMap.get(maneuver.id)) : (confidenceMap[canonicalId] || confidenceMap[maneuver.id]);
    return {
      ...maneuver,
      id: canonicalId,
      _id: maneuver?._id || canonicalId,
      lookupId: canonicalId,
      stateId: canonicalId,
      isSuggested,
      badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
    };
  }
}
