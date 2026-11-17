/**
 * NonheroicStartingFeatsStep - the Nonheroic class's three printed starting feats
 *
 * Source: Saga Edition Core Rulebook, Nonheroic Characters, p.277. The legal
 * options, the "exactly three" rule and the repeatable (Skill Focus / Skill
 * Training) rule live in ONE place - NONHEROIC_STARTING_FEAT_RULE in
 * nonheroic-class-model.js - not in this step.
 *
 * - Selections are keyed by feat identity + chosen scope (never feat id alone),
 *   so Skill Focus (Perception) and Skill Focus (Stealth) are two selections.
 * - Choice-bearing feats go through canonical FeatChoiceDialog /
 *   FeatChoiceResolver validation and persist the canonical
 *   system.selectedChoice payload (FeatChoiceResolver.buildChoicePatch).
 * - These are CLASS grants (slotType 'nonheroic-starting'), distinct from the
 *   ordinary level-1 general feat, which keeps its own general-feat step.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { FeatRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-registry.js';
import { FeatChoiceResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js';
import { FeatChoiceDialog } from '/systems/foundryvtt-swse/scripts/apps/choices/feat-choice-dialog.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';
import {
  NONHEROIC_STARTING_FEAT_RULE,
  NONHEROIC_STARTING_FEAT_SLOT_TYPE,
  NONHEROIC_STARTING_FEAT_SOURCE,
  isNonheroicStartingFeatFamily,
  matchNonheroicStartingFeatOption,
  validateNonheroicStartingFeats,
  getStartingFeatSelectionKey,
} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/nonheroic-class-model.js';

const TOTAL_SLOTS = NONHEROIC_STARTING_FEAT_RULE.count;

function _featId(feat) {
  return feat?.id || feat?._id || feat?.uuid || feat?.name || null;
}

function _isStartingSelection(entry) {
  return entry?.slotType === NONHEROIC_STARTING_FEAT_SLOT_TYPE || entry?.source === NONHEROIC_STARTING_FEAT_SOURCE;
}

export class NonheroicStartingFeatsStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    this._allFeats = [];           // All feats from registry
    this._legalFeats = [];         // Feats legal for nonheroic characters
    this._selected = [];           // Canonical selection entries (identity + scope), max 3
    this._focusedFeatId = null;    // Currently focused feat
    this._searchQuery = '';        // Search filter

    // UI state
    this._expandedCategories = new Set(['suggested']);

    // Event listener cleanup
    this._renderAbort = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Initialize progression-facing registry
    if (!FeatRegistry.isBuilt && typeof FeatRegistry.build === 'function') {
      await FeatRegistry.build();
    }

    // Load all feats from registry
    this._allFeats = FeatRegistry.list?.() || [];

    // Hydrate from the canonical session so backtracking / session recovery
    // preserve prior picks (including their scoped choices).
    const draftFeats = shell?.progressionSession?.draftSelections?.feats;
    this._selected = (Array.isArray(draftFeats) ? draftFeats : []).filter(_isStartingSelection).slice(0, TOTAL_SLOTS);

    // Get legal feats for nonheroic context
    // PHASE 3.1: Pass shell to access pending class grants
    this._legalFeats = await this._getNonheroicLegalFeats(shell.actor, shell);

    swseLogger.log('[NonheroicStartingFeatsStep] Loaded legal feats:', {
      count: this._legalFeats.length,
      featNames: this._legalFeats.map(f => f.name)
    });

    // Enable mentor
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire search input
    const searchInput = shell.element.querySelector('.feat-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._searchQuery = e.target.value;
        shell.requestRender({ preserveScroll: true, reason: 'nonheroic-starting-feats-step:onDataReady' });
      }, { signal });
    }

    // Wire feat focus/click
    const featRows = shell.element.querySelectorAll('[data-action="focus-item"]');
    featRows.forEach(row => {
      row.addEventListener('click', (e) => {
        e.preventDefault();
        const featId = row.dataset.featId;
        this._onFeatClicked(featId, shell);
      }, { signal });
    });

    // Wire removal buttons
    const removeButtons = shell.element.querySelectorAll('[data-action="remove-feat"]');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const featId = btn.dataset.featId;
        this._onFeatRemoved(featId, shell);
      }, { signal });
    });
  }

  async onStepExit(shell) {
    // Feats are committed during focus/click, so nothing to do here
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    return {
      selectedFeats: this._selected.map(entry => ({
        id: getStartingFeatSelectionKey(entry),
        name: this._selectionLabel(entry),
      })),
      availableSlots: TOTAL_SLOTS - this._selected.length,
      totalSlots: TOTAL_SLOTS,
      allFeats: this._getFilteredFeats(),
      focusedFeatId: this._focusedFeatId,
      searchQuery: this._searchQuery,
    };
  }

  getSelection() {
    return {
      selected: this._selected.map(getStartingFeatSelectionKey),
      count: this._selected.length,
      isComplete: this._isComplete(),
    };
  }

  _isComplete() {
    return validateNonheroicStartingFeats(this._selected).valid;
  }

  _selectionLabel(entry) {
    const choice = entry?.system?.selectedChoice ?? null;
    const label = choice ? (FeatChoiceResolver.getChoiceLabel?.(choice) || '') : '';
    return label ? `${entry.name} (${label})` : entry.name;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/nonheroic-starting-feats-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!focusedItem) return this.renderDetailsPanelEmptyState();

    const feat = this._findFeat(focusedItem.id);
    if (!feat) return this.renderDetailsPanelEmptyState();

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/feat-details.hbs',
      data: {
        feat,
        description: feat.system?.description || feat.system?.rules || '',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  async _onFeatClicked(featId, shell) {
    this._focusedFeatId = null;

    // A click on an already-selected entry (identified by identity + scope) removes it.
    if (this._selected.some(entry => getStartingFeatSelectionKey(entry) === featId)) {
      return this._onFeatRemoved(featId, shell);
    }

    const feat = this._findFeat(featId);
    if (!feat) return;

    if (this._selected.length >= TOTAL_SLOTS) {
      ui.notifications?.warn?.(`Nonheroic characters receive exactly ${TOTAL_SLOTS} starting feats. Remove one first.`);
      return;
    }

    const entry = await this._buildSelectionWithChoice(feat, shell);
    if (!entry) return;

    // Non-choice feats toggle by identity: a second click removes the existing one.
    const key = getStartingFeatSelectionKey(entry);
    if (this._selected.some(existing => getStartingFeatSelectionKey(existing) === key)) {
      ui.notifications?.warn?.(`${this._selectionLabel(entry)} is already selected.`);
      return;
    }

    const candidate = [...this._selected, entry];
    const check = validateNonheroicStartingFeats(candidate, { requireComplete: false });
    if (!check.valid) {
      ui.notifications?.warn?.(check.errors.join(' '));
      return;
    }

    this._selected = candidate;
    await this._commitSelectedFeats(shell);
    shell.requestRender({ preserveScroll: true, reason: 'nonheroic-starting-feats-step:_onFeatClicked' });
  }

  async _onFeatRemoved(featKey, shell) {
    this._selected = this._selected.filter(entry => getStartingFeatSelectionKey(entry) !== featKey);
    await this._commitSelectedFeats(shell);
    shell.requestRender({ preserveScroll: true, reason: 'nonheroic-starting-feats-step:_onFeatRemoved' });
  }

  /**
   * Build the canonical selection entry. Choice-bearing feats are routed through
   * the canonical FeatChoiceDialog + FeatChoiceResolver validation (the same
   * path FeatStep uses) and then restricted to the printed Nonheroic options.
   */
  async _buildSelectionWithChoice(feat, shell) {
    const base = {
      id: feat.id || feat._id,
      name: feat.name || '',
      type: feat.type || 'feat',
      img: feat.iconPath || feat.img || undefined,
      uuid: feat.uuid || undefined,
      system: { ...(feat.system || {}) },
      slotType: NONHEROIC_STARTING_FEAT_SLOT_TYPE,
      source: NONHEROIC_STARTING_FEAT_SOURCE,
      slotKey: this.descriptor?.stepId || 'nonheroic-starting-feats',
      stepId: this.descriptor?.stepId || null,
      // Provenance: a Nonheroic CLASS grant, not a character-level selection.
      grantSource: 'class:nonheroic',
    };

    const meta = FeatChoiceResolver.getChoiceMeta(feat);
    const choiceSource = FeatChoiceResolver.inferChoiceSource(feat);
    if (meta?.required && choiceSource !== 'grantPool') {
      const pending = this._buildPendingStateWithClassGrants(shell.actor, shell);
      const selectedChoice = await FeatChoiceDialog.prompt(shell.actor, feat, {
        title: `Choose ${feat.name}`,
        context: { pending },
      });
      if (!selectedChoice) return null;

      const validation = await FeatChoiceResolver.validateSelectedChoice(shell.actor, feat, selectedChoice, { pending });
      if (!validation.valid) {
        ui.notifications?.warn?.(validation.errors?.join(' ') || 'That choice is not currently legal.');
        return null;
      }
      if (!matchNonheroicStartingFeatOption(feat.name, selectedChoice)) {
        ui.notifications?.warn?.(`${feat.name} with that choice is not on the Nonheroic starting feat list.`);
        return null;
      }

      const patch = FeatChoiceResolver.buildChoicePatch(feat, selectedChoice) || {};
      base.system = { ...base.system, ...(patch.system || {}) };
    } else if (!matchNonheroicStartingFeatOption(feat.name, null)) {
      ui.notifications?.warn?.(`${feat.name} is not on the Nonheroic starting feat list.`);
      return null;
    }

    return base;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const result = validateNonheroicStartingFeats(this._selected);
    return { isValid: result.valid, errors: result.errors, warnings: [] };
  }

  getBlockingIssues() {
    return validateNonheroicStartingFeats(this._selected).errors;
  }

  getRemainingPicks() {
    const remaining = Math.max(0, TOTAL_SLOTS - this._selected.length);
    return [
      {
        label: `Feats selected: ${this._selected.length}/${TOTAL_SLOTS}`,
        count: remaining,
        isWarning: remaining > 0 || !this._isComplete(),
      }
    ];
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get feats legal for nonheroic characters
   * Enforces nonheroic feat restrictions
   */
  async _getNonheroicLegalFeats(actor, shell = null) {
    const legal = [];

    // Build pending state with class-granted features for prerequisite evaluation
    const pending = this._buildPendingStateWithClassGrants(actor, shell);

    for (const feat of this._allFeats) {
      // Eligibility is the printed list in NONHEROIC_STARTING_FEAT_RULE.
      if (!isNonheroicStartingFeatFamily(feat.name)) continue;

      // Canonical prerequisite evaluation (pending state sees current picks).
      const assessment = AbilityEngine.evaluateAcquisition(actor, feat, pending);
      if (!assessment.legal) continue;

      // Non-repeatable, non-choice feats already owned cannot be taken again.
      // (Choice-bearing/repeatable feats are scoped; duplicates are rejected by
      // identity + scope in validateNonheroicStartingFeats.)
      const option = matchNonheroicStartingFeatOption(feat.name, null);
      const isScoped = !option || option.repeatable || option.scope === 'weapon-group';
      const alreadyOwned = actor.items.some(i =>
        i.type === 'feat' && i.name.toLowerCase() === feat.name.toLowerCase()
      );
      if (alreadyOwned && !isScoped) continue;

      legal.push(feat);
    }

    return legal;
  }

  /**
   * Build pending state with class-granted features for prerequisite evaluation.
   * @private
   */
  _buildPendingStateWithClassGrants(actor, shell = null) {
    const draft = shell?.progressionSession?.draftSelections || {};
    const trainedSkills = Array.isArray(draft.skills?.trained) ? draft.skills.trained
      : Array.isArray(draft.skills) ? draft.skills : [];
    const basePending = {
      selectedClass: draft.class || shell?.committedSelections?.get?.('class') || null,
      // Current starting picks are visible so e.g. Armor Proficiency (Medium)
      // sees an already-selected Armor Proficiency (Light).
      selectedFeats: this._selected,
      selectedTalents: [],
      selectedSkills: trainedSkills
        .map(key => (typeof key === 'string' ? { key } : (key?.key ? { key: key.key } : null)))
        .filter(Boolean),
      skillRanks: {},
      grantedFeats: [],
      pendingSpeciesContext: draft.pendingSpeciesContext || null,
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
   * Get filtered feats based on search query
   */
  _getFilteredFeats() {
    let filtered = [...this._legalFeats];

    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        (f.system?.description || '').toLowerCase().includes(q)
      );
    }

    // A feat row is "selected" when any starting pick uses that feat identity.
    const selectedFeatIds = new Set(this._selected.map(entry => String(entry.id || entry.name)));
    const isPicked = feat => selectedFeatIds.has(String(_featId(feat)));

    filtered.sort((a, b) => {
      const aSelected = isPicked(a) ? 0 : 1;
      const bSelected = isPicked(b) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return a.name?.localeCompare(b.name) ?? 0;
    });

    return filtered.map(feat => {
      const option = matchNonheroicStartingFeatOption(feat.name, null);
      const isGroupedWeapon = String(feat.name || '').toLowerCase() === 'weapon proficiency';
      return {
        id: _featId(feat),
        name: feat.name,
        description: feat.system?.description || feat.system?.rules || '',
        isSelected: isPicked(feat),
        // Repeatable per RULE: Skill Focus / Skill Training, once per different skill.
        isRepeatable: option?.repeatable === true,
        // Grouped Weapon Proficiency is taken once per allowed weapon group.
        isScoped: isGroupedWeapon,
      };
    });
  }


  _findFeat(featId) {
    return this._legalFeats.find(f => _featId(f) === featId)
      || this._allFeats.find(f => _featId(f) === featId)
      || null;
  }

  async _commitSelectedFeats(shell) {
    // Preserve every non-starting feat already in the draft (e.g. the ordinary
    // level-1 general feat); only the starting-feat slot is replaced here.
    const draftFeats = shell?.progressionSession?.draftSelections?.feats;
    const others = (Array.isArray(draftFeats) ? draftFeats : []).filter(entry => !_isStartingSelection(entry));
    await this._commitNormalized(shell, 'feats', [...others, ...this._selected]);
  }

  getAutoAdvanceConfig(shell) {
    return {
      enabled: true,
      delayMs: 700,
      requireNoRemainingPicks: true,
    };
  }

}
