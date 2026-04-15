/**
 * force-secret-step.js
 *
 * Force Secret selection step plugin for the progression shell.
 * Follows the same stacking model as Force Powers — duplicate selections allowed.
 *
 * Force Secrets are CONDITIONAL — unlocked by engine-defined rules and usually
 * available only after Force Power grants.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ForcePowerEngine } from '../../../engine/progression/engine/force-secret-engine.js';
import { ForceRegistry } from '../../../engine/registries/force-registry.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { swseLogger } from '../../../utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';

export class ForceSecretStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._allSecrets = [];
    this._legalSecrets = [];
    this._filteredSecrets = [];
    this._searchQuery = '';
    this._focusedSecretId = null;

    // Stacking model: secret -> count (same as Force Powers)
    this._committedSecretCounts = new Map();

    this._remainingPicks = 0;
    this._suggestedSecrets = [];  // Suggested force secrets
    this._renderAbort = null;
    this._utilityUnlisteners = [];
  }

  get descriptor() { return this._descriptor; }

  async onStepEnter(shell) {
    try {
      if (!ForceRegistry._initialized) {
        await ForceRegistry.init();
      }

      this._allSecrets = ForceRegistry.byType('secret') || [];

      // PHASE 3: Determine picks available using class progression features + engine choice budget
      const entitlements = await this._resolveSecretEntitlements(shell);
      this._remainingPicks = entitlements.remaining;

      await this._computeLegalSecrets(shell.actor);
      this._applyFilters();

      // Get suggested force secrets
      await this._getSuggestedSecrets(shell.actor, shell);

      shell.mentor.askMentorEnabled = true;

      swseLogger.debug(
        `[ForceSecretStep] Entered: ${this._allSecrets.length} total, ${this._legalSecrets.length} legal, ${this._remainingPicks} picks`
      );
    } catch (e) {
      swseLogger.error('[ForceSecretStep.onStepEnter]', e);
      this._allSecrets = [];
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
    const committedSummary = Array.from(this._committedSecretCounts.entries()).map(([id, count]) => {
      const secret = this._allSecrets.find(s => s.id === id);
      return { id, name: secret?.name || id, count };
    });

    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedSecrets);

    return {
      secrets: this._filteredSecrets.map(s => this._formatSecretCard(s, suggestedIds, confidenceMap)),
      focusedSecretId: this._focusedSecretId,
      committedCounts: Object.fromEntries(this._committedSecretCounts),
      committedSummary,
      remainingPicks: this._remainingPicks,
      hasSuggestions,
      suggestedSecretIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  getSelection() {
    const totalSelected = Array.from(this._committedSecretCounts.values()).reduce((sum, c) => sum + c, 0);
    return {
      selected: Array.from(this._committedSecretCounts.keys()),
      count: totalSelected,
      isComplete: totalSelected >= this._remainingPicks,
    };
  }

  async onItemFocused(secretId, shell) {
    const secret = this._allSecrets.find(s => s.id === secretId);
    if (!secret) return;

    this._focusedSecretId = secretId;
    shell.focusedItem = secret;
    await handleAskMentor(shell.actor, 'force-secrets', shell);
    shell.render();
  }

  async onItemHovered(secretId, shell) {
    // Lightweight hover
  }

  async onItemCommitted(secretId, shell) {
    const secret = this._allSecrets.find(s => s.id === secretId);
    if (!secret) return;

    const currentCount = this._committedSecretCounts.get(secretId) ?? 0;
    const totalSelected = Array.from(this._committedSecretCounts.values()).reduce((sum, c) => sum + c, 0);

    if (totalSelected < this._remainingPicks) {
      this._committedSecretCounts.set(secretId, currentCount + 1);
    }

    // Update observable build intent (Phase 6 solution)
    if (shell?.buildIntent && this.descriptor?.stepId) {
      const secretsList = Array.from(this._committedSecretCounts.entries())
        .filter(([_, count]) => count > 0)
        .map(([secretId, count]) => ({ id: secretId, count }));

      shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, secretsList);
    }

    this._focusedSecretId = secretId;
    shell.focusedItem = secret;
    shell.render();
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/force-secret-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!focusedItem) {
      return this.renderDetailsPanelEmptyState();
    }

    const currentCount = this._committedSecretCounts.get(focusedItem.id) ?? 0;
    const totalSelected = Array.from(this._committedSecretCounts.values()).reduce((sum, c) => sum + c, 0);
    const canAddMore = totalSelected < this._remainingPicks;

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData(focusedItem, 'force_secret');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/force-secret-details.hbs',
      data: {
        secret: focusedItem,
        description: focusedItem.description || focusedItem.system?.description || '',
        prerequisites: focusedItem.system?.prerequisites || null,
        selectedCount: currentCount,
        canAddMore,
        buttonLabel: currentCount > 0 ? 'Add Another Secret' : 'Add Secret',
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
        icon: 'fa-eye-slash',
        message: 'Select a Force Secret to review its knowledge and costs.',
      },
    };
  }

  validate() {
    const totalSelected = Array.from(this._committedSecretCounts.values()).reduce((sum, c) => sum + c, 0);
    const isValid = totalSelected >= this._remainingPicks;
    const errors = isValid ? [] : [
      `Select ${this._remainingPicks - totalSelected} more Force Secret(s).`,
    ];
    return { isValid, errors, warnings: [] };
  }

  getBlockingIssues() {
    const totalSelected = Array.from(this._committedSecretCounts.values()).reduce((sum, c) => sum + c, 0);
    const remaining = this._remainingPicks - totalSelected;
    if (remaining <= 0) return [];
    return [`${remaining} Force Secret(s) remaining`];
  }

  getWarnings() {
    return [];
  }

  getRemainingPicks() {
    const totalSelected = Array.from(this._committedSecretCounts.values()).reduce((sum, c) => sum + c, 0);
    const remaining = this._remainingPicks - totalSelected;

    if (remaining <= 0) {
      const summaryParts = Array.from(this._committedSecretCounts.entries()).map(([id, count]) => {
        const secret = this._allSecrets.find(s => s.id === id);
        const name = secret?.name || id;
        return count > 1 ? `${name} ×${count}` : name;
      });
      const label = summaryParts.length > 0
        ? `✓ ${summaryParts.join(', ')}`
        : `✓ ${totalSelected} Selected`;
      return [{ label, isWarning: false }];
    }

    return [{ label: `${remaining} Force Secret(s) remaining`, isWarning: true }];
  }

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: {
        enabled: true,
        placeholder: 'Search Force Secrets…',
      },
      filters: [],
      sorts: [
        { id: 'name', label: 'Alphabetical' },
      ],
    };
  }

  getUtilityBarMode() {
    return 'rich';
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'force-secrets')
      || 'The path to deeper understanding awaits.';
  }

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedSecrets && this._suggestedSecrets.length > 0) {
      await handleAskMentorWithSuggestions(shell.actor, 'force-secrets', this._suggestedSecrets, shell, {
        domain: 'force-secrets',
        archetype: 'your force secret choice'
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'force-secrets', shell);
    }
  }

  getMentorMode() {
    return 'context-only';
  }

  // Private helpers

  /**
   * PHASE 3: Resolve Force Secret entitlements from class progression features
   * Primary source: class level progression features (force_secret_choice)
   * Secondary: engine choice budget from feature dispatcher
   * Fallback: actor state for compatibility
   */
  async _resolveSecretEntitlements(shell) {
    const { resolveForceSecretEntitlements } = await import(
      '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js'
    );

    // Note: engine data not available in this context, so pass null
    const entitlements = resolveForceSecretEntitlements(shell, null, shell?.actor);

    if (entitlements.isBlocked) {
      swseLogger.log(
        `[ForceSecretStep] Force Secrets blocked — no class grant resolved`,
        { reasons: entitlements.reasons }
      );
    } else if (entitlements.isEmpty && entitlements.total > 0) {
      swseLogger.debug(
        `[ForceSecretStep] Force Secrets available but not yet selected`,
        { total: entitlements.total, reasons: entitlements.reasons }
      );
    }

    return entitlements;
  }

  async _computeLegalSecrets(actor) {
    this._legalSecrets = [];

    // PHASE 1: Use AbilityEngine to evaluate prerequisite legality
    for (const secret of this._allSecrets) {
      const assessment = AbilityEngine.evaluateAcquisition(actor, secret);

      if (assessment.legal) {
        this._legalSecrets.push(secret);
      }
    }

    swseLogger.debug(`[ForceSecretStep] Legal secrets: ${this._legalSecrets.length} of ${this._allSecrets.length}`);
  }

  _applyFilters() {
    let filtered = [...this._legalSecrets];

    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));
    this._filteredSecrets = filtered;
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested force secrets from SuggestionService
   * Recommendations based on class, force powers, and other selections
   * @private
   */
  async _getSuggestedSecrets(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'force-secrets',
        available: this._legalSecrets,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedSecrets = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[ForceSecretStep] Suggestion service error:', err);
      this._suggestedSecrets = [];
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

  _formatSecretCard(secret, suggestedIds = new Set(), confidenceMap = new Map()) {
    const isSuggested = this.isSuggestedItem(secret.id, suggestedIds);
    const confidenceData = confidenceMap.get ? confidenceMap.get(secret.id) : confidenceMap[secret.id];
    return {
      ...secret,
      isSuggested,
      badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
    };
  }
}
