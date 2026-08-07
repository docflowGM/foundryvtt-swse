/**
 * medical-secret-step.js
 *
 * Medical Secret selection step for the Medic prestige class. Mirrors the
 * Force Secret/Technique picker pattern but enforces RAW: each Medical Secret
 * can be selected only once. Selections are metadata hooks for Treat Injury and
 * its extra skill uses; the step itself does not hard-code roll math.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { buildOptionCardAction } from '../shell/option-card-action.js';
import { MedicalSecretRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/medical/medical-secret-registry.js';
import { resolveMedicalSecretEntitlements } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/medical-secret-resolution.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithPicker } from './mentor-step-integration.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { compileProgressionSearchQuery, buildProgressionSearchText } from '../utils/progression-search.js';

export class MedicalSecretStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._allSecrets = [];
    this._legalSecrets = [];
    this._filteredSecrets = [];
    this._searchQuery = '';
    this._focusedSecretId = null;
    this._committedSecretIds = new Set();
    this._selectionBudget = 0;
    this._suggestedSecrets = [];
    this._renderAbort = null;
    this._utilityUnlisteners = [];
  }

  get descriptor() { return this._descriptor; }

  async onStepEnter(shell) {
    try {
      await MedicalSecretRegistry.ensureInitialized();
      this._allSecrets = MedicalSecretRegistry.getAll() || [];

      const entitlements = resolveMedicalSecretEntitlements(shell?.progressionSession || shell, null, shell?.actor);
      // entitlements.remaining is total minus the pending draft selections, and
      // every use site below subtracts the selected count again — storing it
      // here made a two-pick entitlement with one draft pick look complete and
      // blocked the second legal choice. The budget is the total.
      this._selectionBudget = Number(entitlements.total ?? 0);

      this._hydrateCommitted(shell);
      this._computeLegalSecrets(shell?.actor);
      this._applyFilters();
      await this._getSuggestedSecrets(shell?.actor, shell);

      if (shell?.mentor) shell.mentor.askMentorEnabled = true;
      swseLogger.debug('[MedicalSecretStep] Entered', {
        total: this._allSecrets.length,
        legal: this._legalSecrets.length,
        remainingPicks: Math.max(0, this._selectionBudget - this._committedSecretIds.size),
      selectionBudget: this._selectionBudget,
        reasons: entitlements.reasons,
      });
    } catch (err) {
      swseLogger.error('[MedicalSecretStep.onStepEnter]', err);
      this._allSecrets = [];
      this._legalSecrets = [];
      this._filteredSecrets = [];
      this._selectionBudget = 0;
    }
  }

  async onStepExit(shell) {
    this._utilityUnlisteners.forEach((fn) => fn());
    this._utilityUnlisteners = [];
  }

  async onDataReady(shell) {
    if (!shell.element) return;
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const onSearch = (event) => {
      this._searchQuery = event.detail.query;
      this._applyFilters();
      shell.requestRender({ preserveScroll: true, reason: 'medical-secret-step:onSearch', regions: ['work-surface', 'utility'] });
    };
    const onFilter = () => {
      this._applyFilters();
      shell.requestRender({ preserveScroll: true, reason: 'medical-secret-step:onFilter', regions: ['work-surface', 'utility'] });
    };
    const onSort = () => {
      this._applyFilters();
      shell.requestRender({ preserveScroll: true, reason: 'medical-secret-step:onSort', regions: ['work-surface', 'utility'] });
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
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedSecrets);
    const committedSummary = Array.from(this._committedSecretIds).map((id) => {
      const secret = this._allSecrets.find((entry) => entry.id === id);
      return { id, name: secret?.name || id, count: 1 };
    });

    return {
      secrets: this._filteredSecrets.map((secret) => this._formatSecretCard(secret, suggestedIds, confidenceMap)),
      focusedSecretId: this._focusedSecretId,
      committedIds: Array.from(this._committedSecretIds),
      committedSummary,
      remainingPicks: Math.max(0, this._selectionBudget - this._committedSecretIds.size),
      selectionBudget: this._selectionBudget,
      // Retained for the footer and summary copy. The cards' SELECT control
      // reads the per-card cardAction DTO instead.
      canAddMore: this._canSelectMoreSecrets(),
      hasSuggestions,
      suggestedSecretIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  getSelection() {
    return {
      selected: Array.from(this._committedSecretIds),
      count: this._committedSecretIds.size,
      isComplete: this._committedSecretIds.size >= this._selectionBudget,
    };
  }

  async onItemFocused(secretId, shell) {
    const secret = this._allSecrets.find((entry) => entry.id === secretId);
    if (!secret) return;
    this._focusedSecretId = secretId;
    shell.focusedItem = secret;
    // Focus inspects; it does not speak at Ask Mentor priority. This used to
    // call handleAskMentor(), which presents at priority 50 — so merely
    // clicking a card overrode the build recommendation exactly as though
    // the player had pressed Ask Mentor. MentorChoiceReactionRouter still
    // composes a focus reaction at focusReaction priority.
    // The shell owns the repaint for shell-routed focus: it folds this
    // declaration into the single update it already schedules.
    return { handled: true, dirty: ['details'], structural: false, recommendationRelevant: false };
  }

  async onItemCommitted(secretId, shell) {
    const secret = this._allSecrets.find((entry) => entry.id === secretId);
    if (!secret) return;
    if (this._committedSecretIds.has(secretId)) return;
    if (this._committedSecretIds.size >= this._selectionBudget) return;

    this._committedSecretIds.add(secretId);
    const secretsList = Array.from(this._committedSecretIds).map((id) => {
      const selected = this._allSecrets.find((entry) => entry.id === id);
      return {
        id,
        name: selected?.name || id,
        source: 'medical-secret-selection',
        tags: selected?.tags || [],
        system: {
          ...(selected?.system || {}),
          medicalSecret: true,
          treatInjuryHook: selected?.system?.treatInjuryHook || null,
        },
      };
    });

    await this._commitNormalized(shell, 'medicalSecrets', secretsList);
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, 'medicalSecrets', secretsList);
    }

    this._focusedSecretId = secretId;
    shell.focusedItem = secret;
    return { handled: true, dirty: [], structural: true, recommendationRelevant: true };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/medical-secret-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!focusedItem) return this.renderDetailsPanelEmptyState();

    const selected = this._committedSecretIds.has(focusedItem.id);
    const canAddMore = !selected && this._committedSecretIds.size < this._selectionBudget;
    const normalized = normalizeDetailPanelData(focusedItem, 'medical_secret');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/medical-secret-details.hbs',
      data: {
        secret: focusedItem,
        description: focusedItem.description || focusedItem.system?.description || '',
        canonicalDescription: normalized.description,
        metadataTags: normalized.metadataTags,
        selected,
        canAddMore,
        treatInjuryHook: focusedItem.system?.treatInjuryHook || null,
        buttonLabel: selected ? 'Already Selected' : 'Add Medical Secret',
      },
    };
  }

  renderDetailsPanelEmptyState() {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: {
        icon: 'fa-kit-medical',
        message: 'Select a Medical Secret to review its Treat Injury benefit.',
      },
    };
  }

  validate() {
    const remaining = this._selectionBudget - this._committedSecretIds.size;
    return {
      isValid: remaining <= 0,
      errors: remaining <= 0 ? [] : [`Select ${remaining} more Medical Secret(s).`],
      warnings: [],
    };
  }

  getBlockingIssues() {
    const remaining = this._selectionBudget - this._committedSecretIds.size;
    return remaining <= 0 ? [] : [`${remaining} Medical Secret(s) remaining`];
  }

  getWarnings() { return []; }

  getRemainingPicks() {
    const remaining = this._selectionBudget - this._committedSecretIds.size;
    if (remaining <= 0) {
      const names = Array.from(this._committedSecretIds).map((id) => this._allSecrets.find((entry) => entry.id === id)?.name || id);
      return [{ label: names.length ? `✓ ${names.join(', ')}` : '✓ Medical Secret selected', isWarning: false }];
    }
    return [{ label: `${remaining} Medical Secret(s) remaining`, isWarning: true }];
  }

  getUtilityBarConfig() {
    return {
      mode: 'rich',
      search: { enabled: true, placeholder: 'Search Medical Secrets…' },
      filters: [],
      sorts: [{ id: 'name', label: 'Alphabetical' }],
    };
  }

  getUtilityBarMode() { return 'rich'; }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'medical-secrets', shell)
      || 'Choose the procedure that best supports the lives depending on your hands.';
  }

  async onAskMentor(shell) {
    if (this._suggestedSecrets?.length > 0) {
      await handleAskMentorWithPicker(shell.actor, 'medical-secrets', this._suggestedSecrets, shell, {
        domain: 'medical-secrets',
        archetype: 'your medical specialization',
        stepLabel: 'Medical Secrets',
      }, async (selected) => {
        const id = selected?.id || selected?._id || selected?.secretId;
        if (!id) return;
        // One canonical commit through the shell: the old focus + commit +
        // render triple repainted twice for a single choice.
        await shell.commitSuggestionFromMentor({ stepId: 'medical-secrets', itemId: id, source: 'ask-mentor' });
      });
      return;
    }
    await handleAskMentor(shell.actor, 'medical-secrets', shell);
  }

  getMentorMode() { return 'interactive'; }

  _hydrateCommitted(shell) {
    this._committedSecretIds.clear();
    const values = shell?.progressionSession?.draftSelections?.medicalSecrets || [];
    for (const entry of values) {
      const id = entry?.id || entry?._id || entry?.name || entry;
      if (id) this._committedSecretIds.add(id);
    }
  }

  _computeLegalSecrets(actor) {
    const owned = new Set((actor?.items?.filter?.((item) => item?.type === 'feat') || [])
      .filter((item) => item?.system?.tags?.includes?.('medical_secret') || item?.flags?.swse?.medicalSecret === true)
      .map((item) => String(item.name || '').toLowerCase()));

    this._legalSecrets = this._allSecrets.filter((secret) => {
      if (this._committedSecretIds.has(secret.id)) return true;
      return !owned.has(String(secret.name || '').toLowerCase());
    });
  }

  _applyFilters() {
    let filtered = [...this._legalSecrets];
    // Canonical rich search: name + description (picked up automatically by
    // buildProgressionSearchText) + tags. Supports AND/OR/NOT/wildcards/
    // quoted phrases; see utils/progression-search.js.
    if (this._searchQuery) {
      const compiled = compileProgressionSearchQuery(this._searchQuery);
      filtered = filtered.filter((secret) => compiled.test(buildProgressionSearchText(secret, secret.tags || [])));
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    this._filteredSecrets = filtered;
  }

  async _getSuggestedSecrets(actor, shell) {
    try {
      const characterData = shell?.buildIntent?.toCharacterData?.() || shell?.progressionSession?.toCharacterData?.() || {};
      const suggested = await SuggestionService.getSuggestions(actor, shell?.mode || 'levelup', {
        domain: 'medical-secrets',
        available: this._legalSecrets,
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true,
      });
      this._suggestedSecrets = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[MedicalSecretStep] Suggestion service error:', err);
      this._suggestedSecrets = [];
    }
  }

  /**
   * Whether the step's entitlement still admits another Medical Secret.
   * @returns {boolean}
   * @private
   */
  _canSelectMoreSecrets() {
    return this._committedSecretIds.size < this._selectionBudget;
  }

  _formatSecretCard(secret, suggestedIds = new Set(), confidenceMap = new Map()) {
    const isSuggested = this.isSuggestedItem(secret.id, suggestedIds);
    const confidenceData = confidenceMap.get ? confidenceMap.get(secret.id) : confidenceMap[secret.id];
    const isSelected = this._committedSecretIds.has(secret.id);
    return {
      ...secret,
      isSelected,
      // Per-card budget decision, so the control no longer depends on how many
      // {{#each}} blocks the surface nests around it.
      cardAction: buildOptionCardAction({
        canSelect: this._canSelectMoreSecrets(),
        selected: isSelected,
        name: secret?.name || '',
        title: 'Choose this Medical Secret',
      }),
      isSuggested,
      badgeLabel: isSuggested ? 'Recommended' : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
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

export default MedicalSecretStep;
