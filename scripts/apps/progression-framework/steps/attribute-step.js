/**
 * AttributeStep plugin
 *
 * Handles attribute/ability assignment for character generation.
 * Integrates with existing attribute calculation logic from chargen-abilities.js
 *
 * Supported methods:
 * - point-buy: 25/20 point pool allocation
 * - standard-rolling: 4d6 drop lowest, 6 rolls
 * - organic-rolling: 21d6 drop lowest 3, chunk into 6
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { RollEngine } from '/systems/foundryvtt-swse/scripts/engine/roll-engine.js';
import { normalizeAttributes } from './step-normalizers.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';

// Ability score constants and calculations
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const ABILITY_EFFECTS = {
  str: {
    label: 'Strength',
    affects: ['Melee attack bonus', 'Damage with melee/thrown weapons', 'Armor class (some)', 'Carry capacity'],
    classRelevance: { 'Soldier': 'Primary', 'Jedi': 'Secondary' },
  },
  dex: {
    label: 'Dexterity',
    affects: ['Initiative', 'Ranged attack bonus', 'Reflex defense', 'Armor class', 'Acrobatics'],
    classRelevance: { 'Scoundrel': 'Primary', 'Soldier': 'Secondary' },
  },
  con: {
    label: 'Constitution',
    affects: ['Hit points', 'Fortitude defense', 'Endurance'],
    classRelevance: { 'Soldier': 'Primary', 'all': 'Important' },
  },
  int: {
    label: 'Intelligence',
    affects: ['Skill points', 'Knowledge skills', 'Technical knowledge'],
    classRelevance: { 'Tech Specialist': 'Primary' },
  },
  wis: {
    label: 'Wisdom',
    affects: ['Will defense', 'Awareness', 'Insight', 'Force potential'],
    classRelevance: { 'Jedi': 'Primary' },
  },
  cha: {
    label: 'Charisma',
    affects: ['Persuasion', 'Deception', 'Leadership', 'Social influence'],
    classRelevance: { 'Scoundrel': 'Secondary', 'Jedi': 'Secondary' },
  },
};

export class AttributeStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // State
    this._method = 'point-buy';      // 'point-buy' | 'standard' | 'organic'
    this._baseScores = {
      str: 10, dex: 10, con: 10,
      int: 10, wis: 10, cha: 10,
    };
    this._speciesModifiers = {
      str: 0, dex: 0, con: 0,
      int: 0, wis: 0, cha: 0,
    };
    this._focusedAbility = 'str';      // which ability row is focused
    this._pointBuyPool = 25;           // remaining points in point buy
    this._pointBuyCosts = {
      8: 0, 9: 1, 10: 2, 11: 3, 12: 4,
      13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16,
    };
    this._pointBuyAllocations = {};   // track point-buy state

    // Dice mode state (for standard/organic)
    this._rolledPool = [];             // {id, value} tiles from dice rolls
    this._assignedRolls = {            // ability -> tileId (standard) or [tileIds] (organic)
      str: null, dex: null, con: null,
      int: null, wis: null, cha: null,
    };
    this._diceLocked = false;          // whether current dice assignment is finalized
    this._nextTileId = 1;              // for generating unique tile IDs

    // Method controls
    this._methodChanged = false;

    // Suggestions
    this._suggestedAllocations = [];

    // Event listener cleanup
    this._renderAbort = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Load species modifiers from committed selection
    // FIXED: Use SpeciesRegistry to look up species by ID instead of relying on
    // non-existent speciesData field in committed selection. This ensures attribute
    // step uses the same species-modifier derivation path as the ProjectionEngine
    // and summary rail, keeping both synchronized.
    const speciesCommitment = shell.committedSelections?.get('species');
    if (speciesCommitment?.species?.id) {
      try {
        const species = SpeciesRegistry.getById(speciesCommitment.species.id);
        if (species?.abilityScores) {
          this._applySpeciesModifiers(species);
        }
      } catch (err) {
        swseLogger.warn('[AttributeStep] Error loading species modifiers:', err);
        // Fall back to no modifiers if species lookup fails
      }
    }

    // Initialize point buy allocations from base scores
    this._initializePointBuy();

    // Get suggested attribute allocations
    await this._getSuggestedAllocations(shell.actor, shell);

    // Enable Ask Mentor
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const methodButtons = shell.element.querySelectorAll('.attr-method-btn');
    methodButtons.forEach(btn => {
      const fn = async (e) => {
        e.preventDefault();
        const newMethod = btn.dataset.method;
        if (newMethod && newMethod !== this._method) {
          this._method = newMethod;
          this._methodChanged = true;
          this._diceLocked = false;

          if (newMethod === 'point-buy') {
            this._initializePointBuy();
          } else if (newMethod === 'standard') {
            await this._rollStandard();
          } else if (newMethod === 'organic') {
            await this._rollOrganic();
          }
          shell.render();
        }
      };
      btn.addEventListener('click', fn, { signal });
    });

    // Wire ability increment/decrement buttons for point buy
    if (this._method === 'point-buy') {
      ABILITIES.forEach(ability => {
        const minusBtn = shell.element.querySelector(`[data-ability="${ability}"][data-delta="-1"]`);
        const plusBtn = shell.element.querySelector(`[data-ability="${ability}"][data-delta="1"]`);

        if (minusBtn) {
          minusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this._adjustPointBuyScore(ability, -1);
            shell.render();
          }, { signal });
        }

        if (plusBtn) {
          plusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this._adjustPointBuyScore(ability, 1);
            shell.render();
          }, { signal });
        }
      });
    }

    // Wire drag/drop for dice modes (standard and organic)
    if (this._method === 'standard' || this._method === 'organic') {
      this._wireDiceDragDrop(shell, signal);
      this._wireDiceButtons(shell, signal);
    }

    // Wire focus on ability rows
    ABILITIES.forEach(ability => {
      const row = shell.element.querySelector(`[data-ability-row="${ability}"]`);
      if (row) {
        row.addEventListener('click', (e) => {
          e.preventDefault();
          this._focusedAbility = ability;
          shell.render();
        }, { signal });
      }
    });
  }

  async onStepExit(shell) {
    // PHASE 1: Normalize and commit to canonical session
    const normalizedAttributes = normalizeAttributes({ ...this._baseScores });

    if (normalizedAttributes && shell) {
      // Commit to canonical session (also updates buildIntent for backward compat)
      await this._commitNormalized(shell, 'attributes', normalizedAttributes);
    }
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedAllocations);

    // For dice modes, compute available pool tiles
    const getAvailablePoolTiles = () => {
      const assigned = new Set(
        Object.values(this._assignedRolls).flat().filter(v => v !== null && v !== undefined)
      );
      return this._rolledPool.filter(t => !assigned.has(t.id));
    };

    return {
      method: this._method,
      methodChanged: this._methodChanged,
      abilities: this._formatAbilityRows(suggestedIds, confidenceMap),
      focusedAbility: this._focusedAbility,
      pointBuyPool: this._pointBuyPool,
      pointBuyStatus: this._getPointBuyStatus(),
      speciesModifiers: this._speciesModifiers,
      validationStatus: this.validate(),
      hasSuggestions,
      suggestedAbilityIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
      // Dice mode data
      rolledPool: this._rolledPool,
      assignedRolls: this._assignedRolls,
      availablePoolTiles: this._method !== 'point-buy' ? getAvailablePoolTiles() : [],
      diceLocked: this._diceLocked,
      isDiceComplete: this._isDiceComplete(),
    };
  }

  getSelection() {
    const isValid = this.validate().isValid;
    return {
      selected: isValid ? ABILITIES.map(a => `${a}:${this._baseScores[a]}`) : [],
      count: isValid ? 1 : 0,
      isComplete: isValid,
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/attribute-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    const ability = this._focusedAbility;
    const baseScore = this._baseScores[ability];
    const speciesMod = this._speciesModifiers[ability];
    const finalScore = baseScore + speciesMod;
    const modifier = Math.floor((finalScore - 10) / 2);

    // Normalize detail panel data for canonical display (no fabrication)
    const normalized = normalizeDetailPanelData({ ability, key: ability }, 'attribute');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/attribute-details.hbs',
      data: {
        ability,
        label: ABILITY_NAMES[ability],
        description: this._getAbilityDescription(ability),
        affects: ABILITY_EFFECTS[ability]?.affects ?? [],
        baseScore,
        speciesMod,
        finalScore,
        modifier,
        modifierFormatted: modifier > 0 ? `+${modifier}` : `${modifier}`,
        modClass: modifier > 0 ? 'prog-num--pos' : modifier < 0 ? 'prog-num--neg' : 'prog-num--zero',
        speciesModClass: speciesMod > 0 ? 'prog-num--pos' : speciesMod < 0 ? 'prog-num--neg' : 'prog-num--zero',
        // Add normalized fields for enhanced detail rail
        canonicalDescription: normalized.description,
        metadataTags: normalized.metadataTags,
        mentorProse: normalized.mentorProse,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Attribute Methods
  // ---------------------------------------------------------------------------

  _applySpeciesModifiers(speciesData) {
    const mods = speciesData.abilityScores || {};
    ABILITIES.forEach(ability => {
      this._speciesModifiers[ability] = mods[ability] || 0;
    });
  }

  _initializePointBuy() {
    this._pointBuyPool = 25;
    this._pointBuyAllocations = {};
    ABILITIES.forEach(a => {
      this._baseScores[a] = 10;
      this._pointBuyAllocations[a] = 10;
    });
  }

  _adjustPointBuyScore(ability, delta) {
    const current = this._pointBuyAllocations[ability] || 10;
    const newScore = current + delta;

    // Validate bounds (8-18)
    if (newScore < 8 || newScore > 18) return;

    // Calculate cost difference
    const oldCost = this._pointBuyCosts[current] || 0;
    const newCost = this._pointBuyCosts[newScore] || 0;
    const costDelta = newCost - oldCost;

    // Check if we have enough points
    if (costDelta > this._pointBuyPool) return;

    // Apply change
    this._pointBuyAllocations[ability] = newScore;
    this._baseScores[ability] = newScore;
    this._pointBuyPool -= costDelta;
  }

  _getPointBuyStatus() {
    const spent = 25 - this._pointBuyPool;
    const isComplete = this._pointBuyPool === 0;
    const spentPercent = Math.round((spent / 25) * 100);
    return {
      spent,
      remaining: this._pointBuyPool,
      isComplete,
      spentPercent,
      status: isComplete
        ? 'All points allocated'
        : `${this._pointBuyPool} points remaining`,
    };
  }

  // ---------------------------------------------------------------------------
  // Dice Rolling Methods
  // ---------------------------------------------------------------------------

  async _rollStandard() {
    this._rolledPool = [];
    this._assignedRolls = { str: null, dex: null, con: null, int: null, wis: null, cha: null };
    this._diceLocked = false;
    this._nextTileId = 1;

    // Roll 4d6 drop lowest, six times
    for (let i = 0; i < 6; i++) {
      const roll = await this._safeRoll('4d6');
      const results = this._extractDiceResults(roll);
      const sorted = results.slice().sort((a, b) => a - b);
      sorted.shift(); // Drop lowest
      const total = sorted.reduce((a, b) => a + b, 0);

      this._rolledPool.push({
        id: `std-${this._nextTileId++}`,
        value: total,
      });
    }
  }

  async _rollOrganic() {
    this._rolledPool = [];
    this._assignedRolls = { str: [], dex: [], con: [], int: [], wis: [], cha: [] };
    this._diceLocked = false;
    this._nextTileId = 1;

    // Roll 21d6, drop lowest 3
    const roll = await this._safeRoll('21d6');
    let results = this._extractDiceResults(roll);

    // Ensure we have 21 results (fallback if roll fails)
    while (results.length < 21) {
      results.push(Math.ceil(Math.random() * 6));
    }

    // Sort and drop lowest 3
    const sorted = results.slice().sort((a, b) => a - b);
    sorted.splice(0, 3); // Drop lowest 3

    // Create 18 individual dice tiles
    for (let i = 0; i < sorted.length; i++) {
      this._rolledPool.push({
        id: `org-${this._nextTileId++}`,
        value: sorted[i],
      });
    }
  }

  async _safeRoll(formula) {
    try {
      const roll = await RollEngine.safeRoll(formula);
      if (roll) return roll;
    } catch (err) {
      swseLogger.warn('[AttributeStep] RollEngine failed, using fallback:', err);
    }

    // Fallback: simulate dice rolls
    const match = formula.match(/(\d+)d(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      const s = parseInt(match[2], 10);
      const results = [];
      for (let i = 0; i < n; i++) {
        results.push(Math.ceil(Math.random() * s));
      }
      return {
        dice: [{ results: results.map(r => ({ result: r })) }],
        results,
        total: results.reduce((a, b) => a + b, 0),
      };
    }
    return { dice: [], results: [], total: 0 };
  }

  _extractDiceResults(roll) {
    if (roll.dice && roll.dice.length > 0 && roll.dice[0].results) {
      return roll.dice[0].results.map(x => x.result);
    }
    return roll.results || [];
  }

  _wireDiceDragDrop(shell, signal) {
    if (!shell.element) return;

    // Make pool tiles draggable
    shell.element.querySelectorAll('[data-tile-id]').forEach(tile => {
      tile.addEventListener('dragstart', (e) => {
        const tileId = tile.dataset.tileId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tileId);
        tile.classList.add('dragging');
      }, { signal });

      tile.addEventListener('dragend', (e) => {
        tile.classList.remove('dragging');
      }, { signal });
    });

    // Make drop slots droppable
    const dropZones = shell.element.querySelectorAll('[data-drop-ability]');
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('dragover');
      }, { signal });

      zone.addEventListener('dragleave', (e) => {
        zone.classList.remove('dragover');
      }, { signal });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const tileId = e.dataTransfer.getData('text/plain');
        const ability = zone.dataset.dropAbility;

        if (this._method === 'standard') {
          this._assignStandardTile(ability, tileId);
        } else if (this._method === 'organic') {
          this._assignOrganicTile(ability, tileId);
        }

        shell.render();
      }, { signal });
    });
  }

  _wireDiceButtons(shell, signal) {
    if (!shell.element) return;

    const lockBtn = shell.element.querySelector('[data-dice-action="lock"]');
    const resetBtn = shell.element.querySelector('[data-dice-action="reset"]');
    const rerollBtn = shell.element.querySelector('[data-dice-action="reroll"]');

    if (lockBtn) {
      lockBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._lockDice(shell);
      }, { signal });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._resetDice(shell);
      }, { signal });
    }

    if (rerollBtn) {
      rerollBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (this._method === 'standard') {
          await this._rollStandard();
        } else if (this._method === 'organic') {
          await this._rollOrganic();
        }
        shell.render();
      }, { signal });
    }
  }

  _assignStandardTile(ability, tileId) {
    // Remove tile from any other ability
    ABILITIES.forEach(ab => {
      if (this._assignedRolls[ab] === tileId) {
        this._assignedRolls[ab] = null;
      }
    });
    // Assign to this ability
    this._assignedRolls[ability] = tileId;
  }

  _assignOrganicTile(ability, tileId) {
    // Remove tile from any other group
    ABILITIES.forEach(ab => {
      this._assignedRolls[ab] = this._assignedRolls[ab].filter(id => id !== tileId);
    });
    // Add to this ability's group (max 3)
    if (this._assignedRolls[ability].length < 3) {
      this._assignedRolls[ability].push(tileId);
    }
  }

  _lockDice(shell) {
    if (!this._isDiceComplete()) {
      swseLogger.warn('[AttributeStep] Cannot lock dice: assignment incomplete');
      return;
    }

    // Derive base scores from assigned dice
    ABILITIES.forEach(ability => {
      if (this._method === 'standard') {
        const tileId = this._assignedRolls[ability];
        const tile = this._rolledPool.find(t => t.id === tileId);
        this._baseScores[ability] = tile?.value || 10;
      } else if (this._method === 'organic') {
        const tileIds = this._assignedRolls[ability];
        const tiles = this._rolledPool.filter(t => tileIds.includes(t.id));
        const sum = tiles.reduce((acc, t) => acc + t.value, 0);
        this._baseScores[ability] = sum || 10;
      }
    });

    this._diceLocked = true;
    shell.render();
  }

  _resetDice(shell) {
    if (this._diceLocked) return;

    // Clear assignments, keep pool
    this._assignedRolls = this._method === 'standard'
      ? { str: null, dex: null, con: null, int: null, wis: null, cha: null }
      : { str: [], dex: [], con: [], int: [], wis: [], cha: [] };

    shell.render();
  }

  _isDiceComplete() {
    if (this._method === 'standard') {
      return ABILITIES.every(ab => this._assignedRolls[ab] !== null);
    } else if (this._method === 'organic') {
      return ABILITIES.every(ab => this._assignedRolls[ab].length === 3);
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const baseScoresValid = ABILITIES.every(a => {
      const score = this._baseScores[a];
      return score >= 8 && score <= 18;
    });

    const methodValid = this._method && ['point-buy', 'standard', 'organic'].includes(this._method);

    let isComplete = baseScoresValid && methodValid;

    // Method-specific validation
    if (this._method === 'point-buy') {
      isComplete = isComplete && this._pointBuyPool === 0;
    } else if (this._method === 'standard' || this._method === 'organic') {
      isComplete = isComplete && this._diceLocked && this._isDiceComplete();
    }

    return {
      isValid: isComplete,
      errors: isComplete ? [] : ['Complete attribute assignment to continue'],
      warnings: [],
    };
  }

  getBlockingIssues() {
    if (!this.validate().isValid) {
      if (this._method === 'point-buy' && this._pointBuyPool > 0) {
        return [`Allocate all ${this._pointBuyPool} remaining points`];
      }
      return ['Complete attribute assignment'];
    }
    return [];
  }

  getRemainingPicks() {
    if (this._method === 'point-buy') {
      return [{
        label: `Point Buy: ${this._getPointBuyStatus().status}`,
        count: this._pointBuyPool,
        isWarning: this._pointBuyPool > 0,
      }];
    }

    return [{
      label: `✓ Attributes assigned via ${this._method}`,
      count: 0,
      isWarning: false,
    }];
  }

  // ---------------------------------------------------------------------------
  // Utility Bar Config
  // ---------------------------------------------------------------------------

  getUtilityBarConfig() {
    return {
      mode: 'minimal',
      custom: [
        { id: 'method-selector', label: 'Method:', type: 'select' },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Mentor
  // ---------------------------------------------------------------------------

  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedAllocations && this._suggestedAllocations.length > 0) {
      await handleAskMentorWithSuggestions(shell.actor, 'attribute', this._suggestedAllocations, shell, {
        domain: 'attributes',
        archetype: 'your ability scores'
      });
    } else {
      // Fallback to standard guidance if no suggestions
      await handleAskMentor(shell.actor, 'attribute', shell);
    }
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'attribute');
    if (customGuidance) return customGuidance;

    // Mode-aware default guidance
    if (this.isChargen(shell)) {
      return 'Your attributes shape your capabilities. Strength, speed, intellect — choose wisely for your path.';
    } else if (this.isLevelup(shell)) {
      return 'As you grow stronger, you may sharpen your natural abilities. Allocate your improvement wisely.';
    }

    return 'Distribute your points with care.';
  }

  getMentorMode() {
    return 'context-only';
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  _formatAbilityRows(suggestedIds = new Set(), confidenceMap = new Map()) {
    return ABILITIES.map(ability => {
      const baseScore = this._baseScores[ability];
      const speciesMod = this._speciesModifiers[ability];
      const finalScore = baseScore + speciesMod;
      const modifier = Math.floor((finalScore - 10) / 2);
      const isSuggested = this.isSuggestedItem(ability, suggestedIds);
      const confidenceData = confidenceMap.get ? confidenceMap.get(ability) : confidenceMap[ability];

      // Calculate next increment cost (for point-buy mode display)
      // Uses marginal cost rule only, not cumulative table
      let nextIncrementCost = null;
      let canIncrement = false;
      if (this._method === 'point-buy' && baseScore < 18) {
        nextIncrementCost = this._getNextIncrementCost(baseScore);
        canIncrement = this._pointBuyPool >= nextIncrementCost;
      }

      return {
        id: ability,
        label: ABILITY_NAMES[ability],
        base: baseScore,
        speciesMod,
        speciesModClass: speciesMod > 0 ? 'prog-num--pos' : speciesMod < 0 ? 'prog-num--neg' : 'prog-num--zero',
        final: finalScore,
        modifier,
        modifierFormatted: modifier > 0 ? `+${modifier}` : `${modifier}`,
        modClass: modifier > 0 ? 'prog-num--pos' : modifier < 0 ? 'prog-num--neg' : 'prog-num--zero',
        isFocused: ability === this._focusedAbility,
        canAdjust: this._method === 'point-buy',
        isSuggested,
        badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
        badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
        confidenceLevel: confidenceData?.confidenceLevel || null,
        nextIncrementCost,
        canIncrement,
      };
    });
  }

  _getAbilityDescription(ability) {
    const descriptions = {
      str: 'Raw physical power. Melee attacks, carrying capacity, and heavy exertion.',
      dex: 'Speed and coordination. Ranged attacks, reflexes, and agility.',
      con: 'Endurance and vitality. Hit points and resistance to hardship.',
      int: 'Reasoning and knowledge. Problem-solving and technical skills.',
      wis: 'Perception and intuition. Awareness and Force potential.',
      cha: 'Force of personality. Persuasion, deception, and social influence.',
    };
    return descriptions[ability] || '';
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested attribute allocations from SuggestionService
   * Recommendations based on class, background, and other selections
   * @private
   */
  async _getSuggestedAllocations(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // Get suggestions from SuggestionService
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'attributes',
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true
      });

      // Store top suggestions
      this._suggestedAllocations = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[AttributeStep] Suggestion service error:', err);
      this._suggestedAllocations = [];
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
}
