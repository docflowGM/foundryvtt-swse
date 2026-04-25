/**
 * NonheroicStartingFeatsStep - Constrained feat selection for nonheroic characters
 *
 * Enforces strict nonheroic feat constraints:
 * - Exactly 3 feat slots (all must be filled)
 * - Only nonheroic-legal feats allowed
 * - Skill Focus and Training are repeatable
 * - Focus/commit interaction model
 *
 * Phase 2.5: Replaces normal FeatStep for nonheroic chargen
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { FeatRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/feat-registry.js';
import { FeatEngine } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-engine.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';

// Nonheroic-specific feats that are allowed
const NONHEROIC_LEGAL_FEATS = [
  'Alertness',
  'Armor Proficiency',
  'Blind-Fight',
  'Cleave',
  'Dodge',
  'Exotic Weapon Proficiency',
  'Far Shot',
  'Improved Initiative',
  'Improved Unarmed Strike',
  'Martial Arts Training',
  'Power Attack',
  'Quick Draw',
  'Shield Proficiency',
  'Simple Weapon Proficiency',
  'Skill Focus',           // Repeatable
  'Skill Training',        // Repeatable
  'Toughness',
  'Weapon Focus',
  'Weapon Proficiency',
];

export class NonheroicStartingFeatsStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    this._allFeats = [];           // All feats from registry
    this._legalFeats = [];         // Feats legal for nonheroic characters
    this._selectedFeatIds = [];    // Up to 3 selected feat IDs
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
    // Initialize registry
    await FeatRegistry.initialize?.();

    // Load all feats from registry
    this._allFeats = FeatRegistry.list?.() || [];

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
        shell.render();
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
      selectedFeats: this._selectedFeatIds.map(id => {
        const feat = this._legalFeats.find(f => f._id === id);
        return feat ? { id: feat._id, name: feat.name } : null;
      }).filter(Boolean),
      availableSlots: 3 - this._selectedFeatIds.length,
      totalSlots: 3,
      allFeats: this._getFilteredFeats(),
      focusedFeatId: this._focusedFeatId,
      searchQuery: this._searchQuery,
    };
  }

  getSelection() {
    return {
      selected: this._selectedFeatIds,
      count: this._selectedFeatIds.length,
      isComplete: this._selectedFeatIds.length === 3, // Must fill all 3 slots
    };
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

    const feat = this._legalFeats.find(f => f._id === focusedItem.id);
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
    // Toggle selection
    const index = this._selectedFeatIds.indexOf(featId);
    if (index >= 0) {
      // Already selected, remove it
      this._selectedFeatIds.splice(index, 1);
    } else {
      // Not selected and we have room
      if (this._selectedFeatIds.length < 3) {
        this._selectedFeatIds.push(featId);
      }
    }

    this._focusedFeatId = null;
    shell.render();
  }

  async _onFeatRemoved(featId, shell) {
    const index = this._selectedFeatIds.indexOf(featId);
    if (index >= 0) {
      this._selectedFeatIds.splice(index, 1);
    }
    shell.render();
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const errors = [];

    if (this._selectedFeatIds.length < 3) {
      errors.push(`Select ${3 - this._selectedFeatIds.length} more feat(s)`);
    }

    return {
      isValid: this._selectedFeatIds.length === 3,
      errors,
      warnings: [],
    };
  }

  getBlockingIssues() {
    if (this._selectedFeatIds.length < 3) {
      return [`Select ${3 - this._selectedFeatIds.length} more feat(s)`];
    }
    return [];
  }

  getRemainingPicks() {
    const remaining = 3 - this._selectedFeatIds.length;
    return [
      {
        label: `Feats selected: ${this._selectedFeatIds.length}/3`,
        count: remaining,
        isWarning: remaining > 0
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
      // Check if feat is in nonheroic legal list
      if (!NONHEROIC_LEGAL_FEATS.some(name =>
        name.toLowerCase() === feat.name.toLowerCase()
      )) {
        continue;
      }

      // Check if feat meets prerequisites
      // PHASE 3.1: Pass pending state so prerequisites see class-granted features
      const assessment = AbilityEngine.evaluateAcquisition(actor, feat, pending);
      if (!assessment.legal) {
        continue;
      }

      // Check if already owned (unless repeatable)
      const alreadyOwned = actor.items.some(i =>
        i.type === 'feat' && i.name.toLowerCase() === feat.name.toLowerCase()
      );

      // Skill Focus and Training are repeatable for nonheroic
      const isRepeatable = ['skill focus', 'skill training'].includes(
        feat.name.toLowerCase()
      );

      if (alreadyOwned && !isRepeatable) {
        continue;
      }

      legal.push(feat);
    }

    return legal;
  }

  /**
   * Build pending state with class-granted features for prerequisite evaluation.
   * @private
   */
  _buildPendingStateWithClassGrants(actor, shell = null) {
    const basePending = {
      selectedClass: shell?.committedSelections?.get?.('class') || null,
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

    // Sort: selected first, then alphabetical
    filtered.sort((a, b) => {
      const aSelected = this._selectedFeatIds.includes(a._id) ? 0 : 1;
      const bSelected = this._selectedFeatIds.includes(b._id) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return a.name?.localeCompare(b.name) ?? 0;
    });

    return filtered.map(feat => ({
      id: feat._id,
      name: feat.name,
      description: feat.system?.description || feat.system?.rules || '',
      isSelected: this._selectedFeatIds.includes(feat._id),
      isRepeatable: ['skill focus', 'skill training'].includes(
        feat.name.toLowerCase()
      ),
    }));
  }
}
