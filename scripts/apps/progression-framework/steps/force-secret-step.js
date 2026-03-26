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
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { swseLogger } from '../../../utils/logger.js';

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

      // Determine picks available (engine-specific logic)
      const secretGrants = await this._detectSecretGrants(shell.actor);
      this._remainingPicks = secretGrants - (shell.actor.system?.progression?.forceSecrets?.length ?? 0);

      await this._computeLegalSecrets(shell.actor);
      this._applyFilters();

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

    return {
      secrets: this._filteredSecrets,
      focusedSecretId: this._focusedSecretId,
      committedCounts: Object.fromEntries(this._committedSecretCounts),
      committedSummary,
      remainingPicks: this._remainingPicks,
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

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/force-secret-details.hbs',
      data: {
        secret: focusedItem,
        description: focusedItem.description || focusedItem.system?.description || '',
        prerequisites: focusedItem.system?.prerequisites || null,
        selectedCount: currentCount,
        canAddMore,
        buttonLabel: currentCount > 0 ? 'Add Another Secret' : 'Add Secret',
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
    await handleAskMentor(shell.actor, 'force-secrets', shell);
  }

  getMentorMode() {
    return 'context-only';
  }

  // Private helpers

  async _detectSecretGrants(actor) {
    // TODO (Wave 10+): Call engine API to get secret grants
    return 0; // Conservative: no secrets in interim
  }

  async _computeLegalSecrets(actor) {
    this._legalSecrets = [];
    // TODO (Wave 10+): Use AbilityEngine to validate prerequisites
    // For now: empty
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
}
