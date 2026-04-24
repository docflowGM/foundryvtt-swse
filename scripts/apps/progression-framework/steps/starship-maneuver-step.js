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
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
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
        capacity = await ManeuverAuthorityEngine.getManeuverCapacity(shell.actor);
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
    const committedSummary = Array.from(this._committedManeuverCounts.entries()).map(([id, count]) => {
      const maneuver = this._allManeuvers.find(m => m.id === id);
      return { id, name: maneuver?.name || id, count };
    });

    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedManeuvers);

    return {
      maneuvers: this._filteredManeuvers.map(m => this._formatManeuverCard(m, suggestedIds, confidenceMap)),
      focusedManeuverID: this._focusedManeuverID,
      committedCounts: Object.fromEntries(this._committedManeuverCounts),
      committedSummary,
      remainingPicks: this._remainingPicks,
      hasSuggestions,
      suggestedManeuverIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  getSelection() {
    const totalSelected = Array.from(this._committedManeuverCounts.values()).reduce((sum, c) => sum + c, 0);
    return {
      selected: Array.from(this._committedManeuverCounts.keys()),
      count: totalSelected,
      isComplete: totalSelected >= this._remainingPicks,
    };
  }

  async onItemFocused(maneuverId, shell) {
    const maneuver = this._allManeuvers.find(m => m.id === maneuverId);
    if (!maneuver) return;

    this._focusedManeuverID = maneuverId;
    shell.focusedItem = maneuver;
    await handleAskMentor(shell.actor, 'starship-maneuvers', shell);
    shell.render();
  }

  async onItemHovered(maneuverId, shell) {}

  async onItemCommitted(maneuverId, shell) {
    const maneuver = this._allManeuvers.find(m => m.id === maneuverId);
    if (!maneuver) return;

    const currentCount = this._committedManeuverCounts.get(maneuverId) ?? 0;
    const totalSelected = Array.from(this._committedManeuverCounts.values()).reduce((sum, c) => sum + c, 0);

    if (totalSelected < this._remainingPicks) {
      this._committedManeuverCounts.set(maneuverId, currentCount + 1);
    }

    // Update observable build intent (Phase 6 solution)
    if (shell?.buildIntent && this.descriptor?.stepId) {
      const maneuversList = Array.from(this._committedManeuverCounts.entries())
        .filter(([_, count]) => count > 0)
        .map(([maneuverId, count]) => ({ id: maneuverId, count }));

      shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, maneuversList);
    }

    this._focusedManeuverID = maneuverId;
    shell.focusedItem = maneuver;
    shell.render();
  }

  /**
   * PHASE 3: Increment quantity of a selected maneuver (via [+] button in details panel).
   */
  async onIncrementQuantity(maneuverId, shell) {
    const maneuver = this._allManeuvers.find(m => m.id === maneuverId);
    if (!maneuver) return;

    const currentCount = this._committedManeuverCounts.get(maneuverId) ?? 0;
    const totalSelected = Array.from(this._committedManeuverCounts.values()).reduce((sum, c) => sum + c, 0);

    // Allow increment if picks remain
    if (totalSelected < this._remainingPicks) {
      this._committedManeuverCounts.set(maneuverId, currentCount + 1);

      // Update buildIntent
      if (shell?.buildIntent && this.descriptor?.stepId) {
        const maneuversList = Array.from(this._committedManeuverCounts.entries())
          .filter(([_, count]) => count > 0)
          .map(([id, count]) => ({ id, count }));
        shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, maneuversList);
      }

      shell.render();
    }
  }

  /**
   * PHASE 3: Decrement quantity of a selected maneuver (via [−] button in details panel).
   * Cannot decrement below 0 or decrement committed (already on actor) quantities.
   */
  async onDecrementQuantity(maneuverId, shell) {
    const maneuver = this._allManeuvers.find(m => m.id === maneuverId);
    if (!maneuver) return;

    const currentCount = this._committedManeuverCounts.get(maneuverId) ?? 0;

    // Only decrement if there are pending selections to remove
    if (currentCount > 0) {
      this._committedManeuverCounts.set(maneuverId, currentCount - 1);

      // If count reaches 0, remove from map
      if (this._committedManeuverCounts.get(maneuverId) === 0) {
        this._committedManeuverCounts.delete(maneuverId);
      }

      // Update buildIntent
      if (shell?.buildIntent && this.descriptor?.stepId) {
        const maneuversList = Array.from(this._committedManeuverCounts.entries())
          .filter(([_, count]) => count > 0)
          .map(([id, count]) => ({ id, count }));
        shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, maneuversList);
      }

      shell.render();
    }
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

    const currentCount = this._committedManeuverCounts.get(focusedItem.id) ?? 0;
    const totalSelected = Array.from(this._committedManeuverCounts.values()).reduce((sum, c) => sum + c, 0);
    const canAddMore = totalSelected < this._remainingPicks;

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(focusedItem, 'starship_maneuver');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/starship-maneuver-details.hbs',
      data: {
        maneuver: focusedItem,
        description: focusedItem.description || focusedItem.system?.description || '',
        selectedCount: currentCount,
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
    const totalSelected = Array.from(this._committedManeuverCounts.values()).reduce((sum, c) => sum + c, 0);
    const isValid = totalSelected >= this._remainingPicks;
    const errors = isValid ? [] : [`Select ${this._remainingPicks - totalSelected} more Maneuver(s).`];
    return { isValid, errors, warnings: [] };
  }

  getBlockingIssues() {
    const totalSelected = Array.from(this._committedManeuverCounts.values()).reduce((sum, c) => sum + c, 0);
    const remaining = this._remainingPicks - totalSelected;
    if (remaining <= 0) return [];
    return [`${remaining} Maneuver(s) remaining`];
  }

  getWarnings() { return []; }

  getRemainingPicks() {
    const totalSelected = Array.from(this._committedManeuverCounts.values()).reduce((sum, c) => sum + c, 0);
    const remaining = this._remainingPicks - totalSelected;

    if (remaining <= 0) {
      const summaryParts = Array.from(this._committedManeuverCounts.entries()).map(([id, count]) => {
        const maneuver = this._allManeuvers.find(m => m.id === id);
        const name = maneuver?.name || id;
        return count > 1 ? `${name} ×${count}` : name;
      });
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
    return getStepGuidance(shell.actor, 'starship-maneuver')
      || 'Make your choice wisely.';
  }

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedManeuvers && this._suggestedManeuvers.length > 0) {
      await handleAskMentorWithSuggestions(shell.actor, 'starship-maneuvers', this._suggestedManeuvers, shell, {
        domain: 'starship-maneuvers',
        archetype: 'your starship maneuver choice'
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'starship-maneuvers', shell);
    }
  }

  getMentorMode() { return 'context-only'; }

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

  _formatManeuverCard(maneuver, suggestedIds = new Set(), confidenceMap = new Map()) {
    const isSuggested = this.isSuggestedItem(maneuver.id, suggestedIds);
    const confidenceData = confidenceMap.get ? confidenceMap.get(maneuver.id) : confidenceMap[maneuver.id];
    return {
      ...maneuver,
      isSuggested,
      badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
    };
  }
}
