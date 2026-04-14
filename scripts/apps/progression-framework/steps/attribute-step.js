/**
 * AttributeStep plugin
 *
 * Handles attribute/ability assignment for character generation.
 * Refactored to support canonical Point Buy, Array, High Power, and Organic methods.
 * Reuses the legacy v1 rolling formulas for Organic generation.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { normalizeAttributes } from './step-normalizers.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';
import { RollEngine } from '/systems/foundryvtt-swse/scripts/engine/roll-engine.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const METHOD_IDS = ['point-buy', 'array', 'high-power', 'organic'];
const ARRAY_PRESETS = {
  array: [15, 14, 13, 12, 10, 8],
  'high-power': [16, 14, 12, 10, 10, 8],
};
const POINT_BUY_COSTS = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 6,
  15: 8,
  16: 10,
  17: 13,
  18: 16,
};

const ABILITY_EFFECTS = {
  str: {
    label: 'Strength',
    affects: ['Melee attack bonus', 'Damage with melee/thrown weapons', 'Armor class (some)', 'Carry capacity'],
    classRelevance: { Soldier: 'Primary', Jedi: 'Secondary' },
  },
  dex: {
    label: 'Dexterity',
    affects: ['Initiative', 'Ranged attack bonus', 'Reflex defense', 'Armor class', 'Acrobatics'],
    classRelevance: { Scoundrel: 'Primary', Soldier: 'Secondary' },
  },
  con: {
    label: 'Constitution',
    affects: ['Hit points', 'Fortitude defense', 'Endurance'],
    classRelevance: { Soldier: 'Primary', all: 'Important' },
  },
  int: {
    label: 'Intelligence',
    affects: ['Skill points', 'Knowledge skills', 'Technical knowledge'],
    classRelevance: { 'Tech Specialist': 'Primary' },
  },
  wis: {
    label: 'Wisdom',
    affects: ['Will defense', 'Awareness', 'Insight', 'Force potential'],
    classRelevance: { Jedi: 'Primary' },
  },
  cha: {
    label: 'Charisma',
    affects: ['Persuasion', 'Deception', 'Leadership', 'Social influence'],
    classRelevance: { Scoundrel: 'Secondary', Jedi: 'Secondary' },
  },
};

export class AttributeStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    this._method = 'point-buy';
    this._baseScores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
    this._speciesModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    this._focusedAbility = 'str';

    this._isDroid = false;
    this._activeAbilities = [...ABILITIES];

    this._pointBuyCosts = { ...POINT_BUY_COSTS };
    this._pointBuyPoolTotal = 25;
    this._pointBuyPool = 25;

    this._poolTiles = [];
    this._assignedTiles = {};
    this._nextPoolId = 1;

    this._methodChanged = false;
    this._suggestedAllocations = [];
    this._renderAbort = null;
  }

  async onStepEnter(shell) {
    this._isDroid = shell?.actor?.type === 'droid';
    this._activeAbilities = this._isDroid ? ABILITIES.filter((a) => a !== 'con') : [...ABILITIES];
    this._focusedAbility = this._activeAbilities[0] || 'str';

    const speciesCommitment = shell.committedSelections?.get('species');
    if (speciesCommitment?.speciesData) {
      this._applySpeciesModifiers(speciesCommitment.speciesData);
    }

    await this._initializeMethod(this._method);
    await this._getSuggestedAllocations(shell.actor, shell);
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const methodButtons = shell.element.querySelectorAll('.attr-method-btn');
    methodButtons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const newMethod = btn.dataset.method;
        if (!newMethod || newMethod === this._method) return;
        await this._initializeMethod(newMethod);
        this._methodChanged = true;
        shell.render();
      }, { signal });
    });

    this._activeAbilities.forEach((ability) => {
      const row = shell.element.querySelector(`[data-ability-row="${ability}"]`);
      if (row) {
        row.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          e.preventDefault();
          this._focusedAbility = ability;
          shell.render();
        }, { signal });
      }
    });

    if (this._method === 'point-buy') {
      this._wirePointBuyControls(shell, signal);
    } else {
      this._wirePoolControls(shell, signal);
    }
  }

  async onStepExit(shell) {
    this._renderAbort?.abort();

    if (!this.validate().isValid || !shell) return;

    const values = {};
    this._activeAbilities.forEach((ability) => {
      values[ability] = this._baseScores[ability];
    });

    const normalizedAttributes = normalizeAttributes(values);
    if (normalizedAttributes) {
      await this._commitNormalized(shell, 'attributes', normalizedAttributes);
    }
  }

  async getStepData(context) {
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedAllocations);
    const pointBuyStatus = this._getPointBuyStatus();
    const availablePool = this._getAvailablePoolTiles();
    return {
      method: this._method,
      methodChanged: this._methodChanged,
      abilities: this._formatAbilityRows(suggestedIds, confidenceMap),
      focusedAbility: this._focusedAbility,
      pointBuyPool: this._pointBuyPool,
      pointBuyStatus,
      pointBuyTotal: this._pointBuyPoolTotal,
      speciesModifiers: this._speciesModifiers,
      validationStatus: this.validate(),
      hasSuggestions,
      suggestedAbilityIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
      isPointBuy: this._method === 'point-buy',
      isPoolMethod: this._method !== 'point-buy',
      isDroid: this._isDroid,
      methodLabel: this._getMethodLabel(),
      poolInstruction: this._getPoolInstruction(),
      availablePool,
      hasAvailablePool: availablePool.length > 0,
      poolEmptyText: this._method === 'organic' ? 'All rolled values assigned.' : 'All values assigned.',
    };
  }

  getSelection() {
    const isValid = this.validate().isValid;
    return {
      selected: isValid ? this._activeAbilities.map((a) => `${a}:${this._baseScores[a]}`) : [],
      count: isValid ? 1 : 0,
      isComplete: isValid,
    };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/attribute-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    const ability = this._activeAbilities.includes(this._focusedAbility) ? this._focusedAbility : (this._activeAbilities[0] || 'str');
    const row = this._getAbilityRowData(ability);
    const normalized = normalizeDetailPanelData({ ability, key: ability }, 'attribute');

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/attribute-details.hbs',
      data: {
        ability,
        label: ABILITY_NAMES[ability],
        description: this._getAbilityDescription(ability),
        affects: ABILITY_EFFECTS[ability]?.affects ?? [],
        baseScore: row.assigned ? row.base : 8,
        speciesMod: row.speciesMod,
        finalScore: row.assigned ? row.final : (8 + row.speciesMod),
        modifier: row.assigned ? row.modifier : Math.floor(((8 + row.speciesMod) - 10) / 2),
        modifierFormatted: row.assigned ? row.modifierFormatted : `${Math.floor(((8 + row.speciesMod) - 10) / 2)}`,
        modClass: row.assigned ? row.modClass : 'prog-num--zero',
        speciesModClass: row.speciesModClass,
        canonicalDescription: normalized.description,
        metadataTags: normalized.metadataTags,
        mentorProse: normalized.mentorProse,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
      },
    };
  }

  _applySpeciesModifiers(speciesData) {
    const mods = speciesData.abilityScores || {};
    ABILITIES.forEach((ability) => {
      this._speciesModifiers[ability] = mods[ability] || 0;
    });
  }

  async _initializeMethod(method) {
    if (!METHOD_IDS.includes(method)) {
      method = 'point-buy';
    }

    this._method = method;
    this._resetFocusIfNeeded();

    if (method === 'point-buy') {
      this._initializePointBuy();
      return;
    }

    if (method === 'array' || method === 'high-power') {
      this._initializeFixedPool(method);
      return;
    }

    if (method === 'organic') {
      await this._initializeOrganicPool();
    }
  }

  _initializePointBuy() {
    this._pointBuyPoolTotal = this._isDroid ? 20 : 25;
    this._pointBuyPool = this._pointBuyPoolTotal;
    this._poolTiles = [];
    this._assignedTiles = this._makeEmptyAssignments();
    this._nextPoolId = 1;

    ABILITIES.forEach((ability) => {
      this._baseScores[ability] = this._activeAbilities.includes(ability) ? 8 : null;
    });
  }

  _initializeFixedPool(method) {
    const preset = ARRAY_PRESETS[method] || ARRAY_PRESETS.array;
    this._poolTiles = preset
      .slice(0, this._activeAbilities.length)
      .map((value) => this._makePoolTile({ value, origin: method, tooltip: `${this._getMethodLabel(method)} value` }));
    this._assignedTiles = this._makeEmptyAssignments();
    this._nextPoolId = this._poolTiles.length + 1;
    this._pointBuyPool = this._pointBuyPoolTotal;

    ABILITIES.forEach((ability) => {
      this._baseScores[ability] = this._activeAbilities.includes(ability) ? 8 : null;
    });
  }

  async _initializeOrganicPool() {
    const rolled = await this._rollOrganicValues(this._activeAbilities.length);
    this._poolTiles = rolled.map((entry) => this._makePoolTile(entry));
    this._assignedTiles = this._makeEmptyAssignments();
    this._nextPoolId = this._poolTiles.length + 1;
    this._pointBuyPool = this._pointBuyPoolTotal;

    ABILITIES.forEach((ability) => {
      this._baseScores[ability] = this._activeAbilities.includes(ability) ? 8 : null;
    });
  }

  _wirePointBuyControls(shell, signal) {
    this._activeAbilities.forEach((ability) => {
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

  _wirePoolControls(shell, signal) {
    const poolTiles = shell.element.querySelectorAll('[data-pool-id]');
    poolTiles.forEach((tile) => {
      tile.setAttribute('draggable', 'true');
      tile.addEventListener('click', (e) => {
        e.preventDefault();
        const tileId = tile.dataset.poolId;
        const targetAbility = this._focusedAbility;
        if (!tileId || !targetAbility) return;
        this._assignTileToAbility(tileId, targetAbility);
        shell.render();
      }, { signal });

      tile.addEventListener('dragstart', (e) => {
        const tileId = tile.dataset.poolId;
        if (!tileId) return;
        e.dataTransfer.setData('text/swse-attribute-tile', tileId);
        e.dataTransfer.effectAllowed = 'move';
        tile.classList.add('is-dragging');
      }, { signal });

      tile.addEventListener('dragend', () => {
        tile.classList.remove('is-dragging');
      }, { signal });
    });

    const assignmentBoxes = shell.element.querySelectorAll('[data-assign-ability]');
    assignmentBoxes.forEach((box) => {
      const ability = box.dataset.assignAbility;
      if (!ability) return;

      box.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        box.classList.add('is-dragover');
      }, { signal });

      box.addEventListener('dragleave', () => {
        box.classList.remove('is-dragover');
      }, { signal });

      box.addEventListener('drop', (e) => {
        e.preventDefault();
        box.classList.remove('is-dragover');
        const tileId = e.dataTransfer.getData('text/swse-attribute-tile');
        if (!tileId || !ability) return;
        this._assignTileToAbility(tileId, ability);
        shell.render();
      }, { signal });
    });

    const assignedTiles = shell.element.querySelectorAll('[data-assigned-tile-id]');
    assignedTiles.forEach((tile) => {
      tile.setAttribute('draggable', 'true');
      tile.addEventListener('dragstart', (e) => {
        const tileId = tile.dataset.assignedTileId;
        if (!tileId) return;
        e.dataTransfer.setData('text/swse-attribute-tile', tileId);
        e.dataTransfer.effectAllowed = 'move';
        tile.classList.add('is-dragging');
      }, { signal });

      tile.addEventListener('dragend', () => {
        tile.classList.remove('is-dragging');
      }, { signal });
    });

    const poolDropZone = shell.element.querySelector('[data-pool-dropzone]');
    if (poolDropZone) {
      poolDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        poolDropZone.classList.add('is-dragover');
      }, { signal });

      poolDropZone.addEventListener('dragleave', () => {
        poolDropZone.classList.remove('is-dragover');
      }, { signal });

      poolDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        poolDropZone.classList.remove('is-dragover');
        const tileId = e.dataTransfer.getData('text/swse-attribute-tile');
        if (!tileId) return;
        this._returnTileToPool(tileId);
        shell.render();
      }, { signal });
    }

    const clearButtons = shell.element.querySelectorAll('[data-clear-ability]');
    clearButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ability = btn.dataset.clearAbility;
        if (!ability) return;
        this._clearAssignment(ability);
        shell.render();
      }, { signal });
    });
  }

  _adjustPointBuyScore(ability, delta) {
    if (!this._activeAbilities.includes(ability)) return;

    const current = Number.isFinite(this._baseScores[ability]) ? this._baseScores[ability] : 8;
    const newScore = current + delta;

    if (newScore < 8 || newScore > 18) return;

    const oldCost = this._getPointBuyCost(current);
    const newCost = this._getPointBuyCost(newScore);
    const costDelta = newCost - oldCost;

    if (costDelta > this._pointBuyPool) return;

    this._baseScores[ability] = newScore;
    this._pointBuyPool -= costDelta;
  }

  _getPointBuyCost(score) {
    return this._pointBuyCosts[score] ?? 0;
  }

  _getNextIncrementCost(score) {
    if (score >= 18) return null;
    return this._getPointBuyCost(score + 1) - this._getPointBuyCost(score);
  }

  _getPointBuyStatus() {
    const spent = this._pointBuyPoolTotal - this._pointBuyPool;
    const isComplete = this._pointBuyPool === 0;
    return {
      spent,
      remaining: this._pointBuyPool,
      total: this._pointBuyPoolTotal,
      isComplete,
      status: isComplete ? 'All points allocated' : `${this._pointBuyPool} points remaining`,
    };
  }

  _makeEmptyAssignments() {
    const assignments = {};
    this._activeAbilities.forEach((ability) => {
      assignments[ability] = null;
    });
    return assignments;
  }

  _makePoolTile({ value, tooltip = '', origin = 'array' }) {
    return {
      id: `pool-${this._nextPoolId++}`,
      value,
      tooltip,
      origin,
    };
  }

  _getAvailablePoolTiles() {
    const assignedIds = new Set(Object.values(this._assignedTiles || {}).filter(Boolean));
    return this._poolTiles.filter((tile) => !assignedIds.has(tile.id));
  }

  _findPoolTile(tileId) {
    return this._poolTiles.find((tile) => tile.id === tileId) || null;
  }

  _assignTileToAbility(tileId, ability) {
    if (!this._activeAbilities.includes(ability)) return;
    const tile = this._findPoolTile(tileId);
    if (!tile) return;

    const oldAbility = Object.keys(this._assignedTiles).find((key) => this._assignedTiles[key] === tileId);
    const currentTileId = this._assignedTiles[ability];

    if (oldAbility && oldAbility !== ability) {
      this._assignedTiles[oldAbility] = currentTileId || null;
      this._assignedTiles[ability] = tileId;
    } else {
      this._assignedTiles[ability] = tileId;
    }

    this._syncBaseScoresFromAssignments();
  }

  _clearAssignment(ability) {
    if (!this._activeAbilities.includes(ability)) return;
    this._assignedTiles[ability] = null;
    this._syncBaseScoresFromAssignments();
  }

  _syncBaseScoresFromAssignments() {
    this._activeAbilities.forEach((ability) => {
      const tileId = this._assignedTiles[ability];
      const tile = tileId ? this._findPoolTile(tileId) : null;
      this._baseScores[ability] = tile ? tile.value : 8;
    });
  }

  async _rollOrganicValues(count = 6) {
    const roll = await this._rollFormula('21d6');
    const results = (roll.dice && roll.dice[0] && roll.dice[0].results)
      ? roll.dice[0].results.map((x) => x.result)
      : (roll.results || []);

    const filled = results.slice();
    while (filled.length < 21) {
      filled.push(Math.ceil(Math.random() * 6));
    }

    const sortedAll = filled.slice().sort((a, b) => a - b);
    const dropped = sortedAll.splice(0, 3);
    const remaining = sortedAll.slice().reverse();

    const pool = [];
    const targetCount = Math.max(count, 6);
    for (let i = 0; i < targetCount; i += 1) {
      const chunk = remaining.splice(0, 3);
      const sum = chunk.reduce((acc, val) => acc + val, 0);
      pool.push({
        value: sum,
        tooltip: `Rolled group: ${chunk.join(', ')} (dropped global: ${dropped.join(', ')})`,
        origin: 'organic',
      });
    }

    return pool.slice(0, count);
  }

  async _rollFormula(formula) {
    try {
      const roll = await RollEngine.safeRoll(formula);
      if (roll) return roll;
    } catch (err) {
      console.warn('RollEngine failed in AttributeStep:', err);
    }

    const results = [];
    const match = formula.match(/(\d+)d(\d+)/);
    if (match) {
      const count = parseInt(match[1], 10);
      const sides = parseInt(match[2], 10);
      for (let i = 0; i < count; i += 1) {
        results.push(Math.ceil(Math.random() * sides));
      }
    }

    return {
      dice: [{ results: results.map((result) => ({ result })) }],
      results,
      total: results.reduce((acc, val) => acc + val, 0),
    };
  }

  validate() {
    const abilities = this._activeAbilities;
    const baseScoresValid = abilities.every((ability) => {
      const score = this._baseScores[ability];
      return Number.isFinite(score) && score >= 8 && score <= 18;
    });

    const methodValid = METHOD_IDS.includes(this._method);
    let isComplete = baseScoresValid && methodValid;

    if (this._method === 'point-buy') {
      isComplete = isComplete && this._pointBuyPool === 0;
    } else {
      isComplete = isComplete && abilities.every((ability) => !!this._assignedTiles[ability]);
    }

    return {
      isValid: isComplete,
      errors: isComplete ? [] : ['Complete attribute assignment to continue'],
      warnings: [],
    };
  }

  getBlockingIssues() {
    if (this.validate().isValid) return [];

    if (this._method === 'point-buy' && this._pointBuyPool > 0) {
      return [`Allocate all ${this._pointBuyPool} remaining points`];
    }

    const unassigned = this._activeAbilities.filter((ability) => !this._assignedTiles[ability]);
    if (unassigned.length > 0) {
      return [`Assign all remaining values (${unassigned.length} left)`];
    }

    return ['Complete attribute assignment'];
  }

  getRemainingPicks() {
    if (this._method === 'point-buy') {
      return [{
        label: `Point Buy: ${this._getPointBuyStatus().status}`,
        count: this._pointBuyPool,
        isWarning: this._pointBuyPool > 0,
      }];
    }

    const unassigned = this._activeAbilities.filter((ability) => !this._assignedTiles[ability]).length;
    return [{
      label: unassigned > 0 ? `${unassigned} values unassigned` : `✓ ${this._getMethodLabel()} complete`,
      count: unassigned,
      isWarning: unassigned > 0,
    }];
  }

  getUtilityBarConfig() {
    return {
      mode: 'minimal',
      custom: [{ id: 'method-selector', label: 'Method:', type: 'select' }],
    };
  }

  async onAskMentor(shell) {
    if (this._suggestedAllocations && this._suggestedAllocations.length > 0) {
      await handleAskMentorWithSuggestions(shell.actor, 'attribute', this._suggestedAllocations, shell, {
        domain: 'attributes',
        archetype: 'your ability scores',
      });
    } else {
      await handleAskMentor(shell.actor, 'attribute', shell);
    }
  }

  getMentorContext(shell) {
    const customGuidance = getStepGuidance(shell.actor, 'attribute');
    if (customGuidance) return customGuidance;

    if (this.isChargen(shell)) {
      return 'Your attributes shape your capabilities. Strength, speed, intellect — choose wisely for your path.';
    }
    if (this.isLevelup(shell)) {
      return 'As you grow stronger, you may sharpen your natural abilities. Allocate your improvement wisely.';
    }
    return 'Distribute your points with care.';
  }

  getMentorMode() {
    return 'context-only';
  }

  _formatAbilityRows(suggestedIds = new Set(), confidenceMap = new Map()) {
    return this._activeAbilities.map((ability) => this._getAbilityRowData(ability, suggestedIds, confidenceMap));
  }

  _getAbilityRowData(ability, suggestedIds = new Set(), confidenceMap = new Map()) {
    const isPointBuy = this._method === 'point-buy';
    const baseScore = Number.isFinite(this._baseScores[ability]) ? this._baseScores[ability] : 8;
    const speciesMod = this._speciesModifiers[ability] || 0;
    const tileId = this._assignedTiles[ability] || null;
    const assignedTile = tileId ? this._findPoolTile(tileId) : null;
    const assigned = isPointBuy ? true : !!assignedTile;
    const finalScore = assigned ? baseScore + speciesMod : null;
    const modifier = assigned ? Math.floor((finalScore - 10) / 2) : null;
    const isSuggested = this.isSuggestedItem(ability, suggestedIds);
    const confidenceData = confidenceMap.get ? confidenceMap.get(ability) : confidenceMap[ability];
    const nextIncrementCost = isPointBuy ? this._getNextIncrementCost(baseScore) : null;
    const canIncrement = isPointBuy && baseScore < 18 && nextIncrementCost !== null && this._pointBuyPool >= nextIncrementCost;
    const canDecrement = isPointBuy && baseScore > 8;
    const rowFocused = ability === this._focusedAbility;

    return {
      id: ability,
      label: ABILITY_NAMES[ability],
      base: baseScore,
      baseDisplay: assigned ? `${baseScore}` : '—',
      speciesMod,
      speciesModDisplay: `${speciesMod > 0 ? '+' : ''}${speciesMod}`,
      speciesModClass: speciesMod > 0 ? 'prog-num--pos' : speciesMod < 0 ? 'prog-num--neg' : 'prog-num--zero',
      final: finalScore,
      finalDisplay: assigned ? `${finalScore}` : '—',
      modifier,
      modifierFormatted: assigned ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '—',
      modClass: assigned ? (modifier > 0 ? 'prog-num--pos' : modifier < 0 ? 'prog-num--neg' : 'prog-num--zero') : 'prog-num--zero',
      isFocused: rowFocused,
      canAdjust: isPointBuy,
      canIncrement,
      canDecrement,
      nextIncrementCost,
      canAffordNext: nextIncrementCost !== null ? this._pointBuyPool >= nextIncrementCost : false,
      assigned,
      assignedTileId: tileId,
      assignedOrigin: assignedTile?.origin || null,
      isSuggested,
      badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
      badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
      confidenceLevel: confidenceData?.confidenceLevel || null,
    };
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

  _getMethodLabel(method = this._method) {
    if (method === 'point-buy') return 'Point Buy';
    if (method === 'array') return 'Array';
    if (method === 'high-power') return 'High Power';
    if (method === 'organic') return 'Organic';
    return 'Attributes';
  }

  _getPoolInstruction() {
    if (this._method === 'organic') {
      return 'Click a rolled value to assign it to the focused ability row.';
    }
    return 'Click a value in the pool to assign it to the focused ability row.';
  }

  _resetFocusIfNeeded() {
    if (!this._activeAbilities.includes(this._focusedAbility)) {
      this._focusedAbility = this._activeAbilities[0] || 'str';
    }
  }

  async _getSuggestedAllocations(actor, shell) {
    try {
      const characterData = this._buildCharacterDataFromShell(shell);
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'attributes',
        pendingData: SuggestionContextBuilder.buildPendingData(actor, characterData),
        engineOptions: { includeFutureAvailability: true },
        persist: true,
      });
      this._suggestedAllocations = (suggested || []).slice(0, 3);
    } catch (err) {
      swseLogger.warn('[AttributeStep] Suggestion service error:', err);
      this._suggestedAllocations = [];
    }
  }

  _buildCharacterDataFromShell(shell) {
    if (!shell?.buildIntent) return {};
    return shell.buildIntent.toCharacterData();
  }
}
