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
import { FeatRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-registry.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';

// Nonheroic-specific feat families that are allowed. Use normalized family
// matching because the compendium stores many SWSE proficiencies as variants
// such as "Weapon Proficiency (Simple Weapons)" and "Armor Proficiency (light)".
const NONHEROIC_LEGAL_FEAT_FAMILIES = [
  'alertness',
  'armor proficiency',
  'blind fight',
  'cleave',
  'dodge',
  'exotic weapon proficiency',
  'far shot',
  'improved initiative',
  'improved unarmed strike',
  'martial arts i',
  'martial arts training',
  'power attack',
  'quick draw',
  'shield proficiency',
  'simple weapon proficiency',
  'skill focus',
  'skill training',
  'toughness',
  'weapon focus',
  'weapon proficiency',
];

function _featId(feat) {
  return feat?.id || feat?._id || feat?.uuid || feat?.name || null;
}

function _normalizeFeatName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function _isNonheroicLegalFeatName(name) {
  const key = _normalizeFeatName(name);
  if (!key) return false;

  if (key === 'weapon proficiency simple weapons') return true;
  if (key === 'simple weapon proficiency') return true;
  if (key.startsWith('armor proficiency')) return true;
  if (key.startsWith('weapon proficiency')) return true;
  if (key === 'martial arts i') return true;

  return NONHEROIC_LEGAL_FEAT_FAMILIES.some(family => key === family);
}

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
    // Initialize progression-facing registry
    if (!FeatRegistry.isBuilt && typeof FeatRegistry.build === 'function') {
      await FeatRegistry.build();
    }

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
        const feat = this._findFeat(id);
        return feat ? { id: _featId(feat), name: feat.name } : null;
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
    await this._commitSelectedFeats(shell);
    shell.render();
  }

  async _onFeatRemoved(featId, shell) {
    const index = this._selectedFeatIds.indexOf(featId);
    if (index >= 0) {
      this._selectedFeatIds.splice(index, 1);
    }
    await this._commitSelectedFeats(shell);
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
      if (!_isNonheroicLegalFeatName(feat.name)) {
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
        _normalizeFeatName(feat.name)
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
      const aSelected = this._selectedFeatIds.includes(_featId(a)) ? 0 : 1;
      const bSelected = this._selectedFeatIds.includes(_featId(b)) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return a.name?.localeCompare(b.name) ?? 0;
    });

    return filtered.map(feat => ({
      id: _featId(feat),
      name: feat.name,
      description: feat.system?.description || feat.system?.rules || '',
      isSelected: this._selectedFeatIds.includes(_featId(feat)),
      isRepeatable: ['skill focus', 'skill training'].includes(
        _normalizeFeatName(feat.name)
      ),
    }));
  }


  _findFeat(featId) {
    return this._legalFeats.find(f => _featId(f) === featId)
      || this._allFeats.find(f => _featId(f) === featId)
      || null;
  }

  async _commitSelectedFeats(shell) {
    const selected = this._selectedFeatIds
      .map(id => this._findFeat(id))
      .filter(Boolean)
      .map(feat => ({
        id: _featId(feat),
        _id: feat?._id || feat?.id || null,
        uuid: feat?.uuid || null,
        name: feat?.name || _featId(feat),
        type: 'feat',
        source: 'nonheroic-starting-feats'
      }));

    await this._commitNormalized(shell, 'feats', selected);
  }

  getAutoAdvanceConfig(shell) {
    return {
      enabled: true,
      delayMs: 700,
      requireNoRemainingPicks: true,
    };
  }

}
