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
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';

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
    const speciesCommitment = shell.committedSelections?.get('species');
    if (speciesCommitment?.speciesData) {
      this._applySpeciesModifiers(speciesCommitment.speciesData);
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
      const fn = (e) => {
        e.preventDefault();
        const newMethod = btn.dataset.method;
        if (newMethod && newMethod !== this._method) {
          this._method = newMethod;
          this._methodChanged = true;
          if (newMethod === 'point-buy') this._initializePointBuy();
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
    // Update observable build intent (Phase 6 solution)
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(
        this.descriptor.stepId,
        'attributes',
        { ...this._baseScores }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    const { suggestedIds, hasSuggestions } = this.formatSuggestionsForDisplay(this._suggestedAllocations);
    return {
      method: this._method,
      methodChanged: this._methodChanged,
      abilities: this._formatAbilityRows(suggestedIds),
      focusedAbility: this._focusedAbility,
      pointBuyPool: this._pointBuyPool,
      pointBuyStatus: this._getPointBuyStatus(),
      speciesModifiers: this._speciesModifiers,
      validationStatus: this.validate(),
      hasSuggestions,
      suggestedAbilityIds: Array.from(suggestedIds),
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
    return {
      spent,
      remaining: this._pointBuyPool,
      isComplete,
      status: isComplete
        ? 'All points allocated'
        : `${this._pointBuyPool} points remaining`,
    };
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

  _formatAbilityRows(suggestedIds = new Set()) {
    return ABILITIES.map(ability => {
      const baseScore = this._baseScores[ability];
      const speciesMod = this._speciesModifiers[ability];
      const finalScore = baseScore + speciesMod;
      const modifier = Math.floor((finalScore - 10) / 2);
      const isSuggested = this.isSuggestedItem(ability, suggestedIds);

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
        badgeLabel: isSuggested ? 'Recommended' : null,
        badgeCssClass: isSuggested ? 'prog-badge--suggested' : null,
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
