
/**
 * AttributeStep plugin
 *
 * Restored, pool-driven attribute assignment for chargen.
 * Supports:
 * - point-buy
 * - array (standard / high-power)
 * - standard (4d6 drop lowest, 6 scores)
 * - organic (18 individual d6 chosen into 6 groups of 3)
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { normalizeAttributes } from './step-normalizers.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { normalizeDetailPanelData } from '../detail-rail-normalizer.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const ARRAY_PRESETS = {
  standard: [15, 14, 13, 12, 10, 8],
  highPower: [16, 14, 12, 12, 10, 8],
};

const METHOD_LABELS = {
  'point-buy': 'Point Buy',
  'array': 'Array',
  'standard': 'Standard 4d6',
  'organic': 'Organic',
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

function cloneAbilityMap(value = 0) {
  return Object.fromEntries(ABILITIES.map((ability) => [ability, value]));
}

export class AttributeStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    this._method = 'point-buy';
    this._arrayType = 'standard';
    this._focusedAbility = 'str';
    this._baseScores = cloneAbilityMap(10);
    this._speciesModifiers = cloneAbilityMap(0);

    this._pointBuyPool = 25;
    this._pointBuyCosts = {
      8: 0, 9: 1, 10: 2, 11: 3, 12: 4,
      13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16,
    };
    this._pointBuyAllocations = {};

    this._poolTiles = [];
    this._assignedTileByAbility = {};
    this._organicDice = [];
    this._organicSelection = [];
    this._organicGroupsByAbility = {};

    this._suggestedAllocations = [];
    this._renderAbort = null;
  }

  async onStepEnter(shell) {
    await this._hydrateSpeciesModifiers(shell);
    await this._initializeMethod(shell, this._method, { force: true });
    await this._getSuggestedAllocations(shell.actor, shell);
    shell.mentor.askMentorEnabled = true;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    shell.element.querySelectorAll('.attr-method-btn').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        const newMethod = btn.dataset.method;
        if (!newMethod || newMethod === this._method) return;
        await this._initializeMethod(shell, newMethod);
        shell.render();
      }, { signal });
    });

    shell.element.querySelectorAll('.attr-array-type-btn').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        const newArrayType = btn.dataset.arrayType;
        if (!newArrayType || newArrayType === this._arrayType) return;
        this._arrayType = newArrayType;
        await this._initializeMethod(shell, 'array', { force: true });
        shell.render();
      }, { signal });
    });

    shell.element.querySelectorAll('[data-reroll-method]').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        const method = btn.dataset.rerollMethod;
        if (!method) return;
        await this._initializeMethod(shell, method, { force: true });
        shell.render();
      }, { signal });
    });

    if (this._method === 'point-buy') {
      ABILITIES.forEach((ability) => {
        const minusBtn = shell.element.querySelector(`[data-ability="${ability}"][data-delta="-1"]`);
        const plusBtn = shell.element.querySelector(`[data-ability="${ability}"][data-delta="1"]`);

        minusBtn?.addEventListener('click', (event) => {
          event.preventDefault();
          this._adjustPointBuyScore(ability, -1);
          shell.render();
        }, { signal });

        plusBtn?.addEventListener('click', (event) => {
          event.preventDefault();
          this._adjustPointBuyScore(ability, 1);
          shell.render();
        }, { signal });
      });
    }

    shell.element.querySelectorAll('[data-pool-tile-id]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        this._assignPoolTile(btn.dataset.poolTileId, this._focusedAbility);
        shell.render();
      }, { signal });
    });

    shell.element.querySelectorAll('[data-organic-die-id]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        this._toggleOrganicDie(btn.dataset.organicDieId);
        shell.render();
      }, { signal });
    });

    shell.element.querySelectorAll('[data-organic-assign-focused]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        if (this._organicSelection.length === 3) {
          this._assignOrganicSelection(this._focusedAbility);
          shell.render();
        }
      }, { signal });
    });

    shell.element.querySelectorAll('[data-clear-ability]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this._clearAbilityAssignment(btn.dataset.clearAbility);
        shell.render();
      }, { signal });
    });

    ABILITIES.forEach((ability) => {
      const row = shell.element.querySelector(`[data-ability-row="${ability}"]`);
      row?.addEventListener('click', (event) => {
        event.preventDefault();
        this._focusedAbility = ability;
        if (this._method === 'organic' && this._organicSelection.length === 3) {
          this._assignOrganicSelection(ability);
        }
        shell.render();
      }, { signal });
    });
  }

  async onStepExit(shell) {
    const normalizedAttributes = normalizeAttributes({ ...this._baseScores });
    if (normalizedAttributes && shell) {
      await this._commitNormalized(shell, 'attributes', normalizedAttributes);
    }
  }

  async getStepData() {
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(this._suggestedAllocations);
    const validationStatus = this.validate();
    const organicSelectedTotal = this._getOrganicSelectionTotal();
    const remainingUnassigned = this._getRemainingUnassignedCount();
    const remainingOrganicDice = this._organicDice.filter((die) => !die.used).length;

    return {
      method: this._method,
      methodLabel: METHOD_LABELS[this._method] || this._method,
      arrayType: this._arrayType,
      abilities: this._formatAbilityRows(suggestedIds, confidenceMap),
      focusedAbility: this._focusedAbility,
      focusedAbilityLabel: ABILITY_NAMES[this._focusedAbility],
      pointBuyPool: this._pointBuyPool,
      pointBuyStatus: this._getPointBuyStatus(),
      speciesModifiers: this._speciesModifiers,
      validationStatus,
      hasSuggestions,
      poolTiles: this._formatPoolTiles(),
      organicDice: this._organicDice,
      organicSelectedCount: this._organicSelection.length,
      organicSelectedTotal,
      remainingUnassigned,
      remainingOrganicDice,
      showPointBuy: this._method === 'point-buy',
      showArrayPools: this._method === 'array',
      showStandardPools: this._method === 'standard',
      showOrganicPools: this._method === 'organic',
      poolHeading: this._getPoolHeading(),
      poolInstructions: this._getPoolInstructions(),
      arrayPresetName: this._arrayType === 'highPower' ? 'High Power Array' : 'Standard Array',
      suggestedAbilityIds: Array.from(suggestedIds),
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  getSelection() {
    const isValid = this.validate().isValid;
    return {
      selected: isValid ? ABILITIES.map((ability) => `${ability}:${this._baseScores[ability]}`) : [],
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

  renderDetailsPanel() {
    const ability = this._focusedAbility;
    const baseScore = this._baseScores[ability] || 0;
    const speciesMod = this._speciesModifiers[ability] || 0;
    const finalScore = baseScore + speciesMod;
    const modifier = Math.floor((finalScore - 10) / 2);
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
        canonicalDescription: normalized.description,
        metadataTags: normalized.metadataTags,
        mentorProse: normalized.mentorProse,
        hasMentorProse: normalized.fallbacks.hasMentorProse,
      },
    };
  }

  validate() {
    const methodValid = ['point-buy', 'array', 'standard', 'organic'].includes(this._method);
    if (!methodValid) {
      return { isValid: false, errors: ['Select an attribute method'], warnings: [] };
    }

    if (this._method === 'point-buy') {
      const validScores = ABILITIES.every((ability) => {
        const score = this._baseScores[ability];
        return score >= 8 && score <= 18;
      });
      const valid = validScores && this._pointBuyPool === 0;
      return {
        isValid: valid,
        errors: valid ? [] : ['Spend all point-buy points before continuing'],
        warnings: [],
      };
    }

    if (this._method === 'organic') {
      const assigned = ABILITIES.every((ability) => Array.isArray(this._organicGroupsByAbility[ability]) && this._organicGroupsByAbility[ability].length === 3);
      const noRemainder = this._organicDice.every((die) => die.used);
      const validScores = ABILITIES.every((ability) => {
        const score = this._baseScores[ability];
        return Number.isFinite(score) && score >= 3 && score <= 18;
      });
      const valid = assigned && noRemainder && validScores;
      return {
        isValid: valid,
        errors: valid ? [] : ['Assign six groups of three dice in Organic mode'],
        warnings: [],
      };
    }

    const poolComplete = this._poolTiles.length === 6 && this._poolTiles.every((tile) => tile.usedBy);
    const assigned = ABILITIES.every((ability) => this._assignedTileByAbility[ability]);
    const validScores = ABILITIES.every((ability) => Number.isFinite(this._baseScores[ability]) && this._baseScores[ability] > 0);
    const valid = poolComplete && assigned && validScores;
    return {
      isValid: valid,
      errors: valid ? [] : ['Assign all six values before continuing'],
      warnings: [],
    };
  }

  getBlockingIssues() {
    const validation = this.validate();
    if (validation.isValid) return [];
    if (this._method === 'point-buy') return [`Allocate all ${this._pointBuyPool} remaining points`];
    if (this._method === 'organic') return ['Assign six groups of three Organic dice'];
    return ['Assign all six attribute values'];
  }

  getRemainingPicks() {
    if (this._method === 'point-buy') {
      return [{
        label: `Point Buy: ${this._getPointBuyStatus().status}`,
        count: this._pointBuyPool,
        isWarning: this._pointBuyPool > 0,
      }];
    }

    const remaining = this._getRemainingUnassignedCount();
    return [{
      label: remaining > 0
        ? `${remaining} attribute ${remaining === 1 ? 'slot remains' : 'slots remain'}`
        : `✓ Attributes assigned via ${METHOD_LABELS[this._method]}`,
      count: remaining,
      isWarning: remaining > 0,
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

  async _hydrateSpeciesModifiers(shell) {
    this._speciesModifiers = cloneAbilityMap(0);

    const speciesCommitment = shell?.committedSelections?.get('species');
    const normalizedSpecies = speciesCommitment?.species ?? speciesCommitment?.speciesData ?? speciesCommitment ?? null;
    const directSpeciesData = normalizedSpecies?.speciesData ?? normalizedSpecies;

    let abilityScores = directSpeciesData?.abilityScores ?? normalizedSpecies?.abilityScores ?? null;

    if (!abilityScores) {
      const lookupId = normalizedSpecies?.id ?? normalizedSpecies?.speciesId ?? null;
      const lookupName = normalizedSpecies?.name ?? normalizedSpecies?.speciesName ?? null;
      const registryEntry = (lookupId && SpeciesRegistry?.getById?.(lookupId)) || (lookupName && SpeciesRegistry?.getByName?.(lookupName)) || null;
      abilityScores = registryEntry?.abilityScores ?? null;
    }

    ABILITIES.forEach((ability) => {
      this._speciesModifiers[ability] = Number(abilityScores?.[ability] ?? 0);
    });
  }

  async _initializeMethod(shell, method, options = {}) {
    const { force = false } = options;
    if (!force && this._method === method) return;

    this._method = method;
    this._focusedAbility = this._focusedAbility || 'str';
    this._organicSelection = [];
    this._poolTiles = [];
    this._assignedTileByAbility = {};
    this._organicDice = [];
    this._organicGroupsByAbility = {};

    if (method === 'point-buy') {
      this._initializePointBuy();
      return;
    }

    this._baseScores = cloneAbilityMap(0);

    if (method === 'array') {
      this._initializePoolFromValues(ARRAY_PRESETS[this._arrayType] || ARRAY_PRESETS.standard, this._arrayType === 'highPower' ? 'High Power Array' : 'Standard Array');
      return;
    }

    if (method === 'standard') {
      const rolled = Array.from({ length: 6 }, () => this._rollStandardScore());
      this._initializePoolFromValues(rolled, '4d6 Drop Lowest');
      return;
    }

    if (method === 'organic') {
      this._initializeOrganicDice();
      return;
    }
  }

  _initializePointBuy() {
    this._pointBuyPool = 25;
    this._pointBuyAllocations = {};
    ABILITIES.forEach((ability) => {
      this._baseScores[ability] = 10;
      this._pointBuyAllocations[ability] = 10;
    });
  }

  _initializePoolFromValues(values, sourceLabel) {
    this._poolTiles = values.map((value, index) => ({
      id: `${sourceLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
      value,
      label: sourceLabel,
      usedBy: null,
    }));
    this._assignedTileByAbility = {};
  }

  _initializeOrganicDice() {
    const values = Array.from({ length: 18 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
    this._organicDice = values.map((value, index) => ({
      id: `organic-die-${index}`,
      value,
      selected: false,
      used: false,
    }));
    this._organicSelection = [];
    this._organicGroupsByAbility = {};
  }

  _adjustPointBuyScore(ability, delta) {
    const current = this._pointBuyAllocations[ability] || 10;
    const newScore = current + delta;
    if (newScore < 8 || newScore > 18) return;

    const oldCost = this._pointBuyCosts[current] || 0;
    const newCost = this._pointBuyCosts[newScore] || 0;
    const costDelta = newCost - oldCost;
    if (costDelta > this._pointBuyPool) return;

    this._pointBuyAllocations[ability] = newScore;
    this._baseScores[ability] = newScore;
    this._pointBuyPool -= costDelta;
  }

  _assignPoolTile(tileId, ability) {
    const tile = this._poolTiles.find((entry) => entry.id === tileId);
    if (!tile) return;

    if (tile.usedBy && tile.usedBy !== ability) {
      this._assignedTileByAbility[tile.usedBy] = null;
      this._baseScores[tile.usedBy] = 0;
    }

    const previousTileId = this._assignedTileByAbility[ability];
    if (previousTileId && previousTileId !== tileId) {
      const previousTile = this._poolTiles.find((entry) => entry.id === previousTileId);
      if (previousTile) previousTile.usedBy = null;
    }

    tile.usedBy = ability;
    this._assignedTileByAbility[ability] = tile.id;
    this._baseScores[ability] = tile.value;
  }

  _toggleOrganicDie(dieId) {
    const die = this._organicDice.find((entry) => entry.id === dieId);
    if (!die || die.used) return;

    if (die.selected) {
      die.selected = false;
      this._organicSelection = this._organicSelection.filter((id) => id !== dieId);
      return;
    }

    if (this._organicSelection.length >= 3) return;

    die.selected = true;
    this._organicSelection.push(dieId);
  }

  _assignOrganicSelection(ability) {
    if (this._organicSelection.length !== 3) return;

    if (Array.isArray(this._organicGroupsByAbility[ability])) {
      this._clearAbilityAssignment(ability);
    }

    const selectedDice = this._organicSelection
      .map((id) => this._organicDice.find((entry) => entry.id === id))
      .filter(Boolean);
    if (selectedDice.length !== 3) return;

    selectedDice.forEach((die) => {
      die.selected = false;
      die.used = true;
    });

    this._organicGroupsByAbility[ability] = selectedDice.map((die) => die.id);
    this._baseScores[ability] = selectedDice.reduce((sum, die) => sum + Number(die.value || 0), 0);
    this._organicSelection = [];
  }

  _clearAbilityAssignment(ability) {
    if (this._method === 'point-buy') {
      return;
    }

    if (this._method === 'organic') {
      const existingGroup = this._organicGroupsByAbility[ability];
      if (Array.isArray(existingGroup)) {
        existingGroup.forEach((dieId) => {
          const die = this._organicDice.find((entry) => entry.id === dieId);
          if (die) {
            die.used = false;
            die.selected = false;
          }
        });
      }
      delete this._organicGroupsByAbility[ability];
      this._baseScores[ability] = 0;
      this._organicSelection = [];
      return;
    }

    const tileId = this._assignedTileByAbility[ability];
    if (tileId) {
      const tile = this._poolTiles.find((entry) => entry.id === tileId);
      if (tile) tile.usedBy = null;
    }
    this._assignedTileByAbility[ability] = null;
    this._baseScores[ability] = 0;
  }

  _formatPoolTiles() {
    if (!Array.isArray(this._poolTiles)) return [];
    return this._poolTiles.map((tile) => ({
      ...tile,
      used: Boolean(tile.usedBy),
      assignedToFocused: tile.usedBy === this._focusedAbility,
    }));
  }

  _getPointBuyStatus() {
    const spent = 25 - this._pointBuyPool;
    const isComplete = this._pointBuyPool === 0;
    return {
      spent,
      total: 25,
      remaining: this._pointBuyPool,
      isComplete,
      status: isComplete ? 'All points allocated' : `${this._pointBuyPool} points remaining`,
      percent: Math.max(0, Math.min(100, Math.round((spent / 25) * 100))),
    };
  }

  _getPoolHeading() {
    if (this._method === 'array') {
      return this._arrayType === 'highPower' ? 'High Power Array' : 'Standard Array';
    }
    if (this._method === 'standard') {
      return '4d6 Drop Lowest Pool';
    }
    if (this._method === 'organic') {
      return 'Organic Dice Pool';
    }
    return 'Attribute Pool';
  }

  _getPoolInstructions() {
    if (this._method === 'array') {
      return 'Click a number box to assign it to the focused attribute row. Array values are one-use tiles.';
    }
    if (this._method === 'standard') {
      return 'Standard rolls are generated as draggable-style boxes. Click a value box to assign it to the focused attribute row.';
    }
    if (this._method === 'organic') {
      return 'Select exactly three d6 boxes, then click an attribute row to lock that trio into the attribute.';
    }
    return 'Use the controls below to assign attribute values.';
  }

  _getRemainingUnassignedCount() {
    return ABILITIES.filter((ability) => !(Number(this._baseScores[ability]) > 0)).length;
  }

  _getOrganicSelectionTotal() {
    return this._organicSelection
      .map((dieId) => this._organicDice.find((entry) => entry.id === dieId))
      .filter(Boolean)
      .reduce((sum, die) => sum + Number(die.value || 0), 0);
  }

  _rollStandardScore() {
    const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6));
    dice.sort((a, b) => a - b);
    return dice.slice(1).reduce((sum, value) => sum + value, 0);
  }

  _formatAbilityRows(suggestedIds = new Set(), confidenceMap = new Map()) {
    return ABILITIES.map((ability) => {
      const baseScore = Number(this._baseScores[ability] || 0);
      const speciesMod = Number(this._speciesModifiers[ability] || 0);
      const hasBase = baseScore > 0 || this._method === 'point-buy';
      const finalScore = hasBase ? baseScore + speciesMod : speciesMod;
      const modifier = hasBase ? Math.floor((finalScore - 10) / 2) : 0;
      const isSuggested = this.isSuggestedItem(ability, suggestedIds);
      const confidenceData = confidenceMap.get ? confidenceMap.get(ability) : confidenceMap[ability];
      const organicIds = this._organicGroupsByAbility[ability] || [];
      const organicDice = organicIds.map((dieId) => this._organicDice.find((entry) => entry.id === dieId)?.value).filter((value) => Number.isFinite(value));
      const tileId = this._assignedTileByAbility[ability];
      const tile = tileId ? this._poolTiles.find((entry) => entry.id === tileId) : null;

      return {
        id: ability,
        label: ABILITY_NAMES[ability],
        base: hasBase ? baseScore : 0,
        baseDisplay: hasBase ? `${baseScore}` : '—',
        speciesMod,
        speciesModClass: speciesMod > 0 ? 'prog-num--pos' : speciesMod < 0 ? 'prog-num--neg' : 'prog-num--zero',
        final: hasBase ? finalScore : '—',
        finalDisplay: hasBase ? `${finalScore}` : '—',
        modifier,
        modifierFormatted: hasBase ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '—',
        modClass: modifier > 0 ? 'prog-num--pos' : modifier < 0 ? 'prog-num--neg' : 'prog-num--zero',
        isFocused: ability === this._focusedAbility,
        canAdjust: this._method === 'point-buy',
        canClear: this._method !== 'point-buy' && hasBase,
        isSuggested,
        badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
        confidenceLevel: confidenceData?.confidenceLevel || null,
        poolSourceLabel: tile ? tile.label : null,
        organicBreakdown: organicDice.length === 3 ? organicDice.join(' + ') : null,
        poolValueLabel: tile ? `${tile.value}` : null,
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
