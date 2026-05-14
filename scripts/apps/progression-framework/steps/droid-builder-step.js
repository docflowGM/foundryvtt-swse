/**
 * Droid Builder Step — Progression Framework Integration
 *
 * WAVE 12: Controlled migration of working droid builder logic into the progression shell.
 *
 * This step wraps the existing authoritative droid builder and exposes it as a shell-native step.
 * It preserves all purchasing logic, validation, and state management from the original builder.
 *
 * Architecture:
 * - Cannibalizes existing droid builder purchasing/validation logic
 * - Wraps in shell-friendly step interface
 * - Maintains clear adapter boundary between shell and subsystem logic
 * - Preserves full droid package in committed selection
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { DROID_SYSTEMS } from '../../../data/droid-systems.js';
import { swseLogger } from '../../../utils/logger.js';
import { ProgressionRules } from '../../../engine/progression/ProgressionRules.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import { getDroidSizeDefaultLocomotion, getDroidSizeBaseSpeed, getDroidSizeCostFactor } from '../../../engine/progression/droids/droid-trait-rules.js';

export class DroidBuilderStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._droidState = null;
    this._suggestedSystems = [];  // Suggested droid systems
    this._buildMode = 'provisional'; // 'deferred' | 'provisional' | 'finalized'
  }

  /**
   * Called when the shell navigates TO this step.
   * Initialize droid builder state, mode-aware for custom vs standard model.
   */
  async onStepEnter(shell) {
    // Ensure droid builder state exists
    if (!this._droidState) {
      this._droidState = this._initializeDroidState(shell.actor, shell);
    }

    // Get suggested droid systems
    await this._getSuggestedSystems(shell.actor, shell);
  }

  /**
   * Initialize droid builder state from actor or defaults.
   * PHASE A + B: Extended state model for deferred/provisional/finalized support
   * Mode-aware: Custom droids get 1000 credit budget, standard models get 5000 cap
   */
  _initializeDroidState(actor, shell) {
    if (!actor) {
      return null;
    }

    const speciesContext = shell?.progressionSession?.draftSelections?.pendingSpeciesContext || null;
    const speciesDroidBuilder = speciesContext?.metadata?.droidBuilder || speciesContext?.ledger?.rules?.droidBuilder || null;

    // Check if actor is a droid character or an organic species that requires a droid-shell builder.
    const isDroid = actor?.system?.isDroid || !!speciesDroidBuilder?.required;
    if (!isDroid) {
      return null;
    }

    // Get creation mode from session
    const creationMode = speciesDroidBuilder?.mode || shell?.progressionSession?.droidContext?.creationMode || 'custom';
    const isStandardModel = creationMode === 'standard-model';

    // Get house rule settings
    let baseCredits = ProgressionRules.getDroidConstructionCredits(); // Default 1000 for custom
    const allowOverflow = ProgressionRules.droidOverflowEnabled();

    // RAW: Standard model droids have a 5000 credit cap total (includes model base cost)
    if (isStandardModel) {
      const modelBaseCost = shell?.progressionSession?.draftSelections?.droid?.standardModelBaseCost || 0;
      baseCredits = 5000 - modelBaseCost; // Remaining budget after model cost
    }

    // Get size for RAW defaults
    const size = (speciesDroidBuilder?.defaultSize || actor?.system?.droidSize || 'medium').toLowerCase();
    const defaultLocomotionId = getDroidSizeDefaultLocomotion(size);
    const defaultSpeed = getDroidSizeBaseSpeed(size);
    const costFactor = getDroidSizeCostFactor(size);

    // Initialize with actor's current droid state, or RAW defaults
    const droidSystems = actor?.system?.droidSystems || {
      locomotion: {
        id: defaultLocomotionId,
        name: this._getLocomotionName(defaultLocomotionId),
        speed: defaultSpeed,
        costFactor: costFactor,
        cost: this._calculateLocomotionCost(defaultLocomotionId, defaultSpeed, costFactor),
        weight: this._calculateLocomotionWeight(defaultLocomotionId, costFactor),
        isDefault: true
      },
      processor: { id: 'heuristic', name: 'Heuristic Processor', cost: 0, weight: 5 },
      appendages: [
        { id: 'hand-1', name: 'Hand (Right)', type: 'hand', cost: 0, weight: 0, isDefault: true },
        { id: 'hand-2', name: 'Hand (Left)', type: 'hand', cost: 0, weight: 0, isDefault: true }
      ],
      accessories: [],
      locomotionEnhancements: [],
      appendageEnhancements: [],
      totalCost: 0,
      totalWeight: 0
    };

    // Deep copy systems to avoid mutating actor data directly during building
    const systemsCopy = JSON.parse(JSON.stringify(droidSystems));

    // PHASE A + B: Extended state model for budget-aware deferred construction
    return {
      isDroid: true,
      creationMode: creationMode,  // 'custom' or 'standard-model'
      isStandardModel: isStandardModel,
      droidDegree: speciesDroidBuilder?.fixedDegree || speciesDroidBuilder?.defaultDegree || actor?.system?.droidDegree || '1st-degree',
      droidSize: size,
      speciesDroidBuilder: speciesDroidBuilder ? JSON.parse(JSON.stringify(speciesDroidBuilder)) : null,
      sourceSpecies: speciesContext?.identity?.name || null,

      // Core systems (unchanged structure)
      droidSystems: systemsCopy,

      // PHASE A + B: Budget tracking (use-it-or-lose-it)
      droidCredits: {
        base: baseCredits,
        spent: actor?.system?.droidCredits?.spent || 0,
        remaining: baseCredits - (actor?.system?.droidCredits?.spent || 0),
        // New: Track whether overflow into general credits is allowed
        allowOverflow: allowOverflow,
        // Standard model: track total cap (5000) vs budget remaining
        standardModelBaseCost: isStandardModel ? shell?.progressionSession?.draftSelections?.droid?.standardModelBaseCost || 0 : 0,
        maxTotalCost: isStandardModel ? 5000 : Infinity
      },

      // PHASE A + B: Free/default systems tracking
      grantedSystems: {
        // Heuristic processor is always free in chargen (PC droids only)
        processor: {
          id: 'heuristic',
          name: 'Heuristic Processor',
          cost: 0,
          weight: 5,
          isGranted: true,
          isRequired: true,  // PC droids MUST have Heuristic
          isLocked: true     // Cannot be removed/changed during chargen
        },
        // Two appendages standard (typically hands) - free
        freeAppendages: [
          { id: 'hand-1', name: 'Hand (Right)', type: 'hand', cost: 0, weight: 0, isGranted: true },
          { id: 'hand-2', name: 'Hand (Left)', type: 'hand', cost: 0, weight: 0, isGranted: true }
        ],
        // Size-based default locomotion
        locomotion: {
          id: defaultLocomotionId,
          name: this._getLocomotionName(defaultLocomotionId),
          isDefault: true,
          isGranted: true  // Don't count toward budget
        }
      },

      // PHASE A + B: Build state machine
      buildState: {
        mode: 'provisional',  // 'deferred' | 'provisional' | 'finalized'
        isDeferred: false,    // True if player chose "Do Later"
        isFinalized: false,   // True if final pass completed
        completedInitially: false  // True if completed on first pass
      },

      // PHASE A + B: Player choices tracking
      playerChoices: {
        skippedForNow: false,        // Player clicked "Do Later"
        acceptedWastedBudget: false, // Player acknowledged unspent budget will be lost
        confirmedFinal: false        // Player confirmed final build at end
      },

      // PHASE A + B: Suggestion mode hint
      suggestionMode: 'preview'  // 'preview' (provisional) | 'final' (finalized)
    };
  }

  /**
   * Helper: Get locomotion system name by ID
   * @private
   */
  _getLocomotionName(locomotionId) {
    const system = DROID_SYSTEMS.locomotion?.find(l => l.id === locomotionId);
    return system?.name || 'Walking';
  }

  /**
   * Helper: Calculate locomotion cost based on system and size
   * @private
   */
  _calculateLocomotionCost(locomotionId, baseSpeed, costFactor) {
    const system = DROID_SYSTEMS.locomotion?.find(l => l.id === locomotionId);
    if (!system || !system.costFormula) return 0;
    return system.costFormula(baseSpeed, costFactor);
  }

  /**
   * Helper: Calculate locomotion weight based on size
   * @private
   */
  _calculateLocomotionWeight(locomotionId, costFactor) {
    const system = DROID_SYSTEMS.locomotion?.find(l => l.id === locomotionId);
    if (!system || !system.weightFormula) return 0;
    return system.weightFormula(costFactor);
  }

  /**
   * Provide step data to templates.
   */
  async getStepData(context) {
    if (!this._droidState) {
      return {};
    }

    // PHASE D: Flatten PHASE D suggestions (organized by category) into array for display
    const suggestionsArray = this._flattenDroidSuggestions(this._suggestedSystems);
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(suggestionsArray);
    const presentation = this._buildDroidPresentation(suggestedIds, confidenceMap);
    const readiness = this._validateDroidBuild();

    return {
      droidState: { ...this._droidState },
      presentation,
      readiness,
      buildComplete: readiness.isValid,
      buildIssues: readiness.issues,
      hasSuggestions,
      suggestedSystemIds: Array.from(suggestedIds),
      suggestedSystems: suggestionsArray,  // PHASE D: Include flattened suggestions
      confidenceMap: Array.from(confidenceMap.entries()).reduce((acc, [id, data]) => {
        acc[id] = data;
        return acc;
      }, {}),
    };
  }

  /**
   * PHASE D: Flatten suggestions from all categories into single array for display.
   * Suggestions come organized as {locomotion: [], processor: [], appendages: [], accessories: {}}
   * @private
   */
  _flattenDroidSuggestions(suggestedByCategory = {}) {
    const flattened = [];

    // Add suggestions from each category
    if (Array.isArray(suggestedByCategory.locomotion)) {
      flattened.push(...suggestedByCategory.locomotion);
    }
    if (Array.isArray(suggestedByCategory.processor)) {
      flattened.push(...suggestedByCategory.processor);
    }
    if (Array.isArray(suggestedByCategory.appendages)) {
      flattened.push(...suggestedByCategory.appendages);
    }

    // Add accessories from all sub-categories
    if (suggestedByCategory.accessories && typeof suggestedByCategory.accessories === 'object') {
      Object.values(suggestedByCategory.accessories).forEach(category => {
        if (Array.isArray(category)) {
          flattened.push(...category);
        }
      });
    }

    return flattened;
  }

  /**
   * Return selection state — droid builder works as a single configuration step.
   * PHASE A + B: Support deferred state (allows progression without completing build)
   */
  getSelection() {
    // If deferred, treat as complete to allow progression
    if (this._droidState?.buildState?.isDeferred) {
      return {
        selected: [this._droidState?.droidSize || ''],
        count: 1,
        isComplete: true,  // Allow progression when deferred
        isDeferred: true,
      };
    }

    // Otherwise, validate normally (provisional mode)
    return {
      selected: [this._droidState?.droidSize || ''],
      count: 1,
      isComplete: this._validateDroidBuild().isValid,
    };
  }

  /**
   * Return blocking issues that prevent advancing.
   * PHASE A + B: No blocking issues when deferred
   */
  getBlockingIssues() {
    // If deferred, don't block progression
    if (this._droidState?.buildState?.isDeferred) {
      return [];
    }

    // Otherwise validate normally
    const readiness = this._validateDroidBuild();
    return readiness.isValid ? [] : readiness.issues;
  }

  /**
   * Build presentation-friendly droid data.
   */
  _buildDroidPresentation(suggestedIds = new Set(), confidenceMap = new Map()) {
    if (!this._droidState) return {};

    const sys = this._droidState.droidSystems;
    const credits = this._droidState.droidCredits;

    // Helper to enhance systems with suggestion data
    const enhanceSystemsWithSuggestions = (systems) => {
      return systems.map(s => {
        const isSuggested = this.isSuggestedItem(s.id, suggestedIds);
        const confidenceData = confidenceMap.get ? confidenceMap.get(s.id) : confidenceMap[s.id];
        return {
          ...s,
          isSuggested,
          badgeLabel: isSuggested ? (confidenceData?.confidenceLabel ? `Recommended (${confidenceData.confidenceLabel})` : 'Recommended') : null,
          confidenceLevel: confidenceData?.confidenceLevel || null,
        };
      });
    };

    return {
      title: 'DROID SYSTEMS CONFIGURATION',
      subtitle: 'Configure chassis systems and components before unit registration.',

      droidInfo: {
        degree: this._droidState.droidDegree,
        size: this._droidState.droidSize,
      },

      selectedSystems: {
        locomotion: sys.locomotion,
        processor: sys.processor,
        appendages: sys.appendages,
        accessories: sys.accessories,
        locomotionEnhancements: sys.locomotionEnhancements || [],
        appendageEnhancements: sys.appendageEnhancements || [],
      },

      buildTotals: {
        systemCount: this._countSelectedSystems(),
        totalCost: sys.totalCost || 0,
        totalWeight: sys.totalWeight || 0,
        creditsBase: credits.base,
        creditsSpent: credits.spent,
        creditsRemaining: credits.remaining,
      },

      availableSystems: this._applySpeciesDroidConstraintsToPresentation({
        locomotion: enhanceSystemsWithSuggestions(DROID_SYSTEMS.locomotion),
        processors: enhanceSystemsWithSuggestions(DROID_SYSTEMS.processors),
        appendages: enhanceSystemsWithSuggestions(DROID_SYSTEMS.appendages),
        accessories: DROID_SYSTEMS.accessories,
        locomotionEnhancements: enhanceSystemsWithSuggestions(DROID_SYSTEMS.locomotionEnhancements || []),
        appendageEnhancements: enhanceSystemsWithSuggestions(DROID_SYSTEMS.appendageEnhancements || []),
      }, enhanceSystemsWithSuggestions),

      costFactor: this._getCostFactor(),
    };
  }


  _applySpeciesDroidConstraintsToPresentation(available, enhanceSystemsWithSuggestions = systems => systems) {
    const constraints = this._droidState?.speciesDroidBuilder || null;
    if (!constraints) {
      return {
        ...available,
        accessories: Object.fromEntries(Object.entries(available.accessories || {}).map(([key, systems]) => [key, enhanceSystemsWithSuggestions(systems)])),
      };
    }

    const allowedCategories = new Set(constraints.allowedCategories || []);
    const allowedAccessorySubcategories = new Set(constraints.allowedAccessorySubcategories || []);
    const allowedAccessoryIds = new Set(constraints.allowedAccessoryIds || []);

    const shouldShowCategory = (category) => allowedCategories.size === 0 || allowedCategories.has(category);
    const constrainedAccessories = {};
    for (const [subcategory, systems] of Object.entries(available.accessories || {})) {
      if (allowedAccessorySubcategories.size && !allowedAccessorySubcategories.has(subcategory)) continue;
      const filtered = (systems || []).filter(system => allowedAccessoryIds.size === 0 || allowedAccessoryIds.has(system.id));
      if (filtered.length) constrainedAccessories[subcategory] = enhanceSystemsWithSuggestions(filtered);
    }

    return {
      locomotion: shouldShowCategory('locomotion') ? available.locomotion : [],
      processors: shouldShowCategory('processor') ? available.processors : [],
      appendages: shouldShowCategory('appendage') ? available.appendages : [],
      accessories: constrainedAccessories,
      locomotionEnhancements: shouldShowCategory('locomotionEnhancements') ? available.locomotionEnhancements : [],
      appendageEnhancements: shouldShowCategory('appendageEnhancements') ? available.appendageEnhancements : [],
      constraintNote: constraints.notes || null,
    };
  }

  _systemAllowedBySpeciesConstraints(category, id, subcategory = null) {
    const constraints = this._droidState?.speciesDroidBuilder || null;
    if (!constraints) return true;
    const allowedCategories = new Set(constraints.allowedCategories || []);
    if (allowedCategories.size && !allowedCategories.has(category) && !allowedCategories.has(subcategory)) {
      return false;
    }
    if (category === 'accessory') {
      const allowedAccessorySubcategories = new Set(constraints.allowedAccessorySubcategories || []);
      const allowedAccessoryIds = new Set(constraints.allowedAccessoryIds || []);
      if (allowedAccessorySubcategories.size && !allowedAccessorySubcategories.has(subcategory)) return false;
      if (allowedAccessoryIds.size && !allowedAccessoryIds.has(id)) return false;
    }
    return true;
  }

  /**
   * Validate droid build completeness.
   * PHASE A + B: Deferred builds skip validation (handled by getBlockingIssues)
   */
  _validateDroidBuild() {
    const sys = this._droidState.droidSystems;
    const credits = this._droidState.droidCredits;
    const isDeferred = this._droidState?.buildState?.isDeferred || false;
    const issues = [];

    // When deferred, show no validation issues in UI
    // (player will complete build in final pass)
    if (isDeferred) {
      return {
        isValid: false,  // Still "incomplete" for display purposes
        issues: [],      // But no blocking issues
        summary: 'Droid build deferred to final pass.',
        isDeferred: true,
      };
    }

    const constraints = this._droidState?.speciesDroidBuilder || null;

    // Normal validation for provisional mode
    // Check required systems
    if (!sys.locomotion) {
      issues.push('Locomotion system required');
    }

    if (!sys.processor) {
      issues.push('Processor required');
    }

    // Check appendages (must have at least one)
    if (!sys.appendages || sys.appendages.length === 0) {
      issues.push('At least one appendage required');
    }

    // Check budget
    if (credits.remaining < 0) {
      issues.push('Over budget - remove systems to proceed');
    }

    // Check for free Heuristic processor requirement, except constrained replica droid profiles that use species rules.
    if (!constraints?.fixedDegree && sys.processor && sys.processor.id !== 'heuristic') {
      issues.push('Heuristic processor required for playable droids');
    }

    if (constraints?.bonusEquipmentChoices) {
      const allowedIds = new Set(constraints.allowedAccessoryIds || []);
      const chosen = (sys.accessories || []).filter(acc => !allowedIds.size || allowedIds.has(acc.id)).length;
      if (chosen > constraints.bonusEquipmentChoices) {
        issues.push(`${constraints.label || 'Species chassis'} allows only ${constraints.bonusEquipmentChoices} bonus equipment choices`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      summary: issues.length === 0
        ? `Droid chassis configuration complete. Ready to proceed.`
        : `${issues.length} requirement${issues.length !== 1 ? 's' : ''} not met.`,
    };
  }

  /**
   * Count selected systems for display.
   */
  _countSelectedSystems() {
    const sys = this._droidState.droidSystems;
    let count = 0;

    if (sys.locomotion) count++;
    if (sys.processor) count++;
    count += (sys.appendages || []).length;
    count += (sys.accessories || []).length;
    count += (sys.locomotionEnhancements || []).length;
    count += (sys.appendageEnhancements || []).length;

    return count;
  }

  /**
   * Get cost factor based on droid size.
   */
  _getCostFactor() {
    const size = this._droidState?.droidSize || 'medium';
    const costFactors = {
      'tiny': 5,
      'small': 2,
      'medium': 1,
      'large': 2,
      'huge': 5,
      'gargantuan': 10,
      'colossal': 20
    };
    return costFactors[size] || 1;
  }

  /**
   * Purchase a system.
   * Cannibalizes logic from original chargen-droid.js _onPurchaseSystem
   */
  purchaseSystem(category, id, subcategory = null) {
    if (!this._droidState) return false;

    const sys = this._droidState.droidSystems;
    const credits = this._droidState.droidCredits;
    let system = null;
    let cost = 0;

    try {
      if (!this._systemAllowedBySpeciesConstraints(category, id, subcategory)) {
        swseLogger.warn('[DroidBuilderStep] System blocked by species droid-builder constraints', {
          category, id, subcategory, sourceSpecies: this._droidState?.sourceSpecies,
        });
        return false;
      }

      if (category === 'locomotion') {
        system = DROID_SYSTEMS.locomotion.find(s => s.id === id);
        if (system) {
          const speed = this._calculateLocomotionSpeed(system);
          const weight = this._calculateWeight(system);
          cost = this._calculateLocomotionCost(system, speed);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for locomotion');
            return false;
          }

          // Remove old locomotion cost if replacing
          if (sys.locomotion) {
            credits.spent -= sys.locomotion.cost;
          }

          sys.locomotion = {
            id: system.id,
            name: system.name,
            cost,
            weight,
            speed
          };
        }
      } else if (category === 'processor') {
        system = DROID_SYSTEMS.processors.find(s => s.id === id);
        if (system) {
          cost = this._calculateProcessorCost(system);
          const weight = this._calculateProcessorWeight(system);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for processor');
            return false;
          }

          // Remove old processor cost if replacing
          if (sys.processor) {
            credits.spent -= sys.processor.cost;
          }

          sys.processor = {
            id: system.id,
            name: system.name,
            cost,
            weight
          };
        }
      } else if (category === 'appendage') {
        system = DROID_SYSTEMS.appendages.find(s => s.id === id);
        if (system) {
          const weight = this._calculateWeight(system);
          const isFreeHand = (id === 'hand' && this._countFreeHands() < 2);
          cost = isFreeHand ? 0 : this._calculateAppendageCost(system);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for appendage');
            return false;
          }

          sys.appendages.push({
            id: system.id,
            name: system.name,
            cost,
            weight
          });
        }
      } else if (category === 'accessory') {
        const accessoryCategory = DROID_SYSTEMS.accessories[subcategory];
        system = accessoryCategory?.find(s => s.id === id);
        if (system) {
          cost = this._isSpeciesBonusEquipmentChoice(category, id, subcategory) ? 0 : this._calculateAccessoryCost(system);
          const weight = this._calculateWeight(system);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for accessory');
            return false;
          }

          sys.accessories.push({
            id: system.id,
            name: system.name,
            category: subcategory,
            cost,
            weight,
            data: system
          });
        }
      } else if (category === 'enhancement') {
        const enhancement = DROID_SYSTEMS.locomotionEnhancements?.find(e => e.id === id);
        if (enhancement) {
          cost = this._calculateEnhancementCost(enhancement);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for enhancement');
            return false;
          }

          if (!sys.locomotionEnhancements) sys.locomotionEnhancements = [];
          sys.locomotionEnhancements.push({
            id: enhancement.id,
            name: enhancement.name,
            cost,
            weight: 0
          });
        }
      }

      // Update remaining and recalculate totals. Cost is applied once here;
      // species bonus equipment can set cost to 0 before this point.
      if (cost > 0) {
        credits.spent += cost;
      }
      credits.remaining = credits.base - credits.spent;
      this._recalculateTotals();

      return true;
    } catch (e) {
      swseLogger.error('[DroidBuilderStep.purchaseSystem]', e);
      return false;
    }
  }

  _isSpeciesBonusEquipmentChoice(category, id, subcategory = null) {
    const constraints = this._droidState?.speciesDroidBuilder || null;
    const maxChoices = Number(constraints?.bonusEquipmentChoices || 0);
    if (!maxChoices || category !== 'accessory') return false;
    if (!this._systemAllowedBySpeciesConstraints(category, id, subcategory)) return false;
    const currentChoices = (this._droidState?.droidSystems?.accessories || [])
      .filter(accessory => this._systemAllowedBySpeciesConstraints('accessory', accessory.id, accessory.category))
      .length;
    return currentChoices < maxChoices;
  }

  /**
   * Remove a system.
   * Cannibalizes logic from original chargen-droid.js _onRemoveSystem
   */
  removeSystem(category, id, subcategory = null) {
    if (!this._droidState) return false;

    const sys = this._droidState.droidSystems;
    const credits = this._droidState.droidCredits;

    try {
      if (!this._systemAllowedBySpeciesConstraints(category, id, subcategory)) {
        swseLogger.warn('[DroidBuilderStep] System blocked by species droid-builder constraints', {
          category, id, subcategory, sourceSpecies: this._droidState?.sourceSpecies,
        });
        return false;
      }

      if (category === 'locomotion') {
        if (sys.locomotion) {
          credits.spent -= sys.locomotion.cost;
          sys.locomotion = null;
        }
      } else if (category === 'processor') {
        if (sys.processor && sys.processor.id !== 'heuristic') {
          credits.spent -= sys.processor.cost;
          // Reset to free heuristic
          sys.processor = {
            id: 'heuristic',
            name: 'Heuristic Processor',
            cost: 0,
            weight: 5
          };
        }
      } else if (category === 'appendage') {
        const idx = sys.appendages.findIndex(a => a.id === id);
        if (idx >= 0) {
          const app = sys.appendages[idx];
          credits.spent -= app.cost;
          sys.appendages.splice(idx, 1);
        }
      } else if (category === 'accessory') {
        const idx = sys.accessories.findIndex(a => a.id === id);
        if (idx >= 0) {
          const acc = sys.accessories[idx];
          credits.spent -= acc.cost;
          sys.accessories.splice(idx, 1);
        }
      } else if (category === 'enhancement') {
        const idx = sys.locomotionEnhancements?.findIndex(e => e.id === id) ?? -1;
        if (idx >= 0) {
          const enh = sys.locomotionEnhancements[idx];
          credits.spent -= enh.cost;
          sys.locomotionEnhancements.splice(idx, 1);
        }
      }

      credits.remaining = credits.base - credits.spent;
      this._recalculateTotals();

      return true;
    } catch (e) {
      swseLogger.error('[DroidBuilderStep.removeSystem]', e);
      return false;
    }
  }

  /**
   * Helper: Count free hands.
   */
  _countFreeHands() {
    const appendages = this._droidState.droidSystems.appendages || [];
    return appendages.filter(a => a.id === 'hand' && a.cost === 0).length;
  }

  /**
   * Helper: Calculate locomotion speed.
   */
  _calculateLocomotionSpeed(system) {
    const size = this._droidState.droidSize || 'medium';
    return system.speeds?.[size] || system.speeds?.medium || 6;
  }

  /**
   * Helper: Calculate locomotion cost.
   */
  _calculateLocomotionCost(system, speed) {
    const costFactor = this._getCostFactor();
    if (typeof system.costFormula === 'function') {
      return system.costFormula(speed, costFactor);
    }
    return system.cost || 0;
  }

  /**
   * Helper: Calculate appendage cost.
   */
  _calculateAppendageCost(system) {
    const costFactor = this._getCostFactor();
    if (typeof system.cost === 'function') {
      return system.cost(costFactor);
    }
    return system.cost || 0;
  }

  /**
   * Helper: Calculate processor cost.
   */
  _calculateProcessorCost(system) {
    const costFactor = this._getCostFactor();
    // Heuristic is free in chargen
    if (system.id === 'heuristic') return 0;
    if (typeof system.costFormula === 'function') {
      return system.costFormula(costFactor);
    }
    return system.cost || 0;
  }

  /**
   * Helper: Calculate processor weight.
   */
  _calculateProcessorWeight(system) {
    const costFactor = this._getCostFactor();
    if (typeof system.weightFormula === 'function') {
      return system.weightFormula(costFactor);
    }
    return system.weight || 0;
  }

  /**
   * Helper: Calculate accessory cost.
   */
  _calculateAccessoryCost(system) {
    const costFactor = this._getCostFactor();
    if (typeof system.costFormula === 'function') {
      return system.costFormula(costFactor);
    }
    return system.cost || 0;
  }

  /**
   * Helper: Calculate enhancement cost.
   */
  _calculateEnhancementCost(enhancement) {
    const costFactor = this._getCostFactor();
    if (typeof enhancement.costFormula === 'function') {
      return enhancement.costFormula(costFactor);
    }
    if (typeof enhancement.cost === 'function') {
      return enhancement.cost(costFactor);
    }
    return enhancement.cost || 0;
  }

  /**
   * Helper: Calculate weight for any system.
   */
  _calculateWeight(system) {
    const costFactor = this._getCostFactor();
    if (typeof system.weightFormula === 'function') {
      return system.weightFormula(costFactor);
    }
    if (typeof system.weight === 'function') {
      return system.weight(costFactor);
    }
    return system.weight || 0;
  }

  /**
   * Recalculate build totals.
   * Cannibalizes logic from original chargen-droid.js _recalculateDroidTotals
   */
  _recalculateTotals() {
    const sys = this._droidState.droidSystems;
    let totalCost = 0;
    let totalWeight = 0;

    if (sys.locomotion) {
      totalCost += sys.locomotion.cost;
      totalWeight += sys.locomotion.weight;
    }

    if (sys.processor) {
      totalCost += sys.processor.cost;
      totalWeight += sys.processor.weight;
    }

    for (const app of (sys.appendages || [])) {
      totalCost += app.cost;
      totalWeight += app.weight;
    }

    for (const acc of (sys.accessories || [])) {
      totalCost += acc.cost;
      totalWeight += acc.weight;
    }

    for (const enh of (sys.locomotionEnhancements || [])) {
      totalCost += enh.cost;
      totalWeight += enh.weight || 0;
    }

    for (const enh of (sys.appendageEnhancements || [])) {
      totalCost += enh.cost;
      totalWeight += enh.weight || 0;
    }

    sys.totalCost = totalCost;
    sys.totalWeight = totalWeight;
  }

  /**
   * Return work surface rendering spec.
   */
  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/droid-builder-work-surface.hbs',
      data: stepData,
    };
  }

  /**
   * Return details panel rendering spec.
   */
  renderDetailsPanel(focusedItem) {
    if (!this._droidState) {
      return this.renderDetailsPanelEmptyState();
    }

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/droid-builder-details.hbs',
      data: {
        droidInfo: {
          degree: this._droidState.droidDegree,
          size: this._droidState.droidSize,
        },
        selectedSystems: this._droidState.droidSystems,
        categories: this._getSystemCategories(),
        creditsBase: this._droidState.droidCredits.base,
        creditsSpent: this._droidState.droidCredits.spent,
        creditsRemaining: this._droidState.droidCredits.remaining,
        totalCost: this._droidState.droidSystems.totalCost,
        totalWeight: this._droidState.droidSystems.totalWeight,
        systemCount: this._countSelectedSystems(),
      },
    };
  }

  /**
   * Get system category guide for details panel.
   */
  _getSystemCategories() {
    return [
      {
        name: 'Locomotion',
        description: 'How your droid moves (walking, hovering, rolling, etc.)',
        required: true
      },
      {
        name: 'Processor',
        description: 'The droid\'s "brain" - determines capabilities (always Heuristic for PC)',
        required: true
      },
      {
        name: 'Appendages',
        description: 'Limbs and manipulation tools (hands, legs, tools)',
        required: true,
        note: 'First 2 hands are free'
      },
      {
        name: 'Accessories',
        description: 'Optional systems (armor, sensors, shields, etc.)',
        required: false
      }
    ];
  }

  /**
   * Validate droid build state.
   */
  validate() {
    const readiness = this._validateDroidBuild();
    return {
      isValid: readiness.isValid,
      errors: readiness.isValid ? [] : readiness.issues,
      warnings: []
    };
  }

  /**
   * PHASE A + B: Mark build as deferred.
   * Player chooses to complete droid build in final pass instead of now.
   * PHASE C: Triggers shell reconciliation to inject final-droid-configuration step
   */
  async deferBuild(shell) {
    if (!this._droidState) return false;

    // Mark as deferred
    this._droidState.buildState.isDeferred = true;
    this._droidState.buildState.mode = 'deferred';
    this._droidState.playerChoices.skippedForNow = true;

    // PHASE C: Reconcile conditional steps to inject final-droid-configuration step
    // This ensures the step is available later in the progression
    if (shell) {
      try {
        await shell.reconcileConditionalSteps();
        swseLogger.info('[DroidBuilderStep] Droid build deferred and conditional steps reconciled');
      } catch (err) {
        swseLogger.warn('[DroidBuilderStep] Error reconciling steps after deferral:', err);
      }
    }

    swseLogger.info('[DroidBuilderStep] Droid build deferred to final pass');
    return true;
  }

  /**
   * Return footer configuration overrides for droid builder.
   * PHASE A + B: Show different button text when deferred
   */
  getFooterConfig() {
    const readiness = this._validateDroidBuild();
    const isDeferred = this._droidState?.buildState?.isDeferred || false;

    if (isDeferred) {
      return {
        nextLabel: 'Continue (Build Later)',
        confirmLabel: 'Skip for Now',
        isBlocked: false,
        showDeferOption: false,  // Already deferred
      };
    }

    return {
      nextLabel: readiness.isValid ? 'Next: Attributes' : 'Complete Build',
      confirmLabel: 'Finalize',
      isBlocked: !readiness.isValid,
    };
  }

  /**
   * Return utility bar configuration for droid builder.
   */
  getUtilityBarConfig() {
    return {
      mode: 'droid-builder',
      showBudgetStatus: true,
      showSystemCount: true,
      showSearchBar: true,
    };
  }

  /**
   * Return mentor guidance text for this step.
   */
  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'droid-builder')
      || 'Make your choice wisely.';
  }

  /**
   * Called when user clicks "Ask Mentor".
   */
  async onAskMentor(shell) {
    // If we have suggestions, use the advisory system instead of standard guidance
    if (this._suggestedSystems && this._suggestedSystems.length > 0) {
      await handleAskMentorWithSuggestions(shell.actor, 'droid-builder', this._suggestedSystems, shell, {
        domain: 'droid-systems',
        archetype: 'your droid configuration'
      });
    } else {
      // Fallback: show standard guidance
      await handleAskMentor(shell.actor, 'droid-builder', shell);
    }
  }

  /**
   * Called after the step is rendered in the shell.
   * Wire up event handlers for the work surface.
   * PHASE A + B: Add "Do Later" button handler for deferred builds
   */
  async afterRender(shell, workSurfaceEl) {
    if (!workSurfaceEl || !this._droidState) {
      return;
    }

    try {
      // PHASE A + B: "Do Later" button - allows deferring build to final pass
      const deferButton = workSurfaceEl.querySelector('[data-action="defer-build"]');
      if (deferButton) {
        deferButton.addEventListener('click', (e) => this._onDeferBuild(e, shell, workSurfaceEl));
      }

      // Tab switching
      const tabs = workSurfaceEl.querySelectorAll('.prog-droid-builder__tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => this._onTabClick(e, shell, workSurfaceEl));
      });

      // Accessory tabs
      const accTabs = workSurfaceEl.querySelectorAll('.accessory-tab');
      accTabs.forEach(tab => {
        tab.addEventListener('click', (e) => this._onAccessoryTabClick(e, workSurfaceEl));
      });

      // Purchase system buttons
      const purchaseButtons = workSurfaceEl.querySelectorAll('[data-action="purchase-system"]');
      purchaseButtons.forEach(btn => {
        btn.addEventListener('click', (e) => this._onPurchaseSystem(e, shell, workSurfaceEl));
      });

      // Remove system buttons
      const removeButtons = workSurfaceEl.querySelectorAll('[data-action="remove-system"]');
      removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => this._onRemoveSystem(e, shell, workSurfaceEl));
      });
    } catch (e) {
      swseLogger.error('[DroidBuilderStep.activateWorkSurface]', e);
    }
  }

  /**
   * PHASE A + B: Handle "Do Later" button — defer build to final pass.
   * PHASE C: Commits deferred state before reconciling steps
   */
  async _onDeferBuild(event, shell, workSurfaceEl) {
    event.preventDefault();

    const success = await this.deferBuild(shell);

    if (success) {
      // PHASE C: Commit the deferred state before reconciling steps
      // This ensures the final-droid-configuration step can be discovered
      await this._commitDeferredBuild(shell);

      ui.notifications.info('Droid build deferred. You can complete it in the final pass.');
      // Note: reconcileConditionalSteps() already triggers render internally
    } else {
      ui.notifications.warn('Unable to defer build');
    }
  }

  /**
   * PHASE C: Commit the deferred droid build to shell state.
   */
  async _commitDeferredBuild(shell) {
    const deferredSelection = {
      isDroid: true,
      droidDegree: this._droidState.droidDegree,
      droidSize: this._droidState.droidSize,
      droidSystems: JSON.parse(JSON.stringify(this._droidState.droidSystems)),
      droidCredits: JSON.parse(JSON.stringify(this._droidState.droidCredits)),
      buildState: JSON.parse(JSON.stringify(this._droidState.buildState)),
      speciesDroidBuilder: this._droidState.speciesDroidBuilder ? JSON.parse(JSON.stringify(this._droidState.speciesDroidBuilder)) : null,
      sourceSpecies: this._droidState.sourceSpecies || null,
    };

    await this._commitNormalized(shell, 'droid', deferredSelection);

    if (shell?.committedSelections && this.descriptor?.stepId) {
      shell.committedSelections.set(this.descriptor.stepId, deferredSelection);
    }
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, deferredSelection);
    }

    swseLogger.debug('[DroidBuilderStep] Deferred droid build committed before reconciliation', deferredSelection);
  }

  /**
   * Handle tab click to switch between system categories.
   */
  _onTabClick(event, shell, workSurfaceEl) {
    event.preventDefault();
    const category = event.currentTarget.dataset.category;

    // Update active tab
    workSurfaceEl.querySelectorAll('.prog-droid-builder__tab').forEach(t => {
      t.classList.remove('prog-droid-builder__tab--active');
    });
    event.currentTarget.classList.add('prog-droid-builder__tab--active');

    // Update active panel
    workSurfaceEl.querySelectorAll('.prog-droid-builder__panel').forEach(p => {
      p.classList.remove('prog-droid-builder__panel--active');
    });
    const panel = workSurfaceEl.querySelector(`[data-panel="${category}"]`);
    if (panel) {
      panel.classList.add('prog-droid-builder__panel--active');
    }
  }

  /**
   * Handle accessory tab click.
   */
  _onAccessoryTabClick(event, workSurfaceEl) {
    event.preventDefault();
    const tabName = event.currentTarget.dataset.accessoryTab;

    workSurfaceEl.querySelectorAll('.accessory-tab').forEach(t => {
      t.classList.remove('accessory-tab--active');
    });
    event.currentTarget.classList.add('accessory-tab--active');

    workSurfaceEl.querySelectorAll('.accessory-panel').forEach(p => {
      p.classList.remove('accessory-panel--active');
    });
    const panel = workSurfaceEl.querySelector(`[data-accessory-panel="${tabName}"]`);
    if (panel) {
      panel.classList.add('accessory-panel--active');
    }
  }

  /**
   * Handle system purchase button click.
   */
  _onPurchaseSystem(event, shell, workSurfaceEl) {
    event.preventDefault();
    const btn = event.currentTarget;
    const category = btn.dataset.category;
    const id = btn.dataset.id;
    const subcategory = btn.dataset.subcategory;

    const success = this.purchaseSystem(category, id, subcategory);

    if (success) {
      // Trigger shell re-render to reflect state changes
      shell.render();
      ui.notifications.info(`${id} system purchased`);
    } else {
      ui.notifications.warn('Unable to purchase system - check credits and requirements');
    }
  }

  /**
   * Handle system removal button click.
   */
  _onRemoveSystem(event, shell, workSurfaceEl) {
    event.preventDefault();
    const btn = event.currentTarget;
    const category = btn.dataset.category;
    const id = btn.dataset.id;
    const subcategory = btn.dataset.subcategory;

    const success = this.removeSystem(category, id, subcategory);

    if (success) {
      // Trigger shell re-render to reflect state changes
      shell.render();
      ui.notifications.info(`${id} system removed`);
    }
  }

  /**
   * Called when an item is focused (selected in work surface).
   * Droid builder doesn't use item focus.
   */
  async onItemFocused(itemId, shell) {
    // No-op for droid builder
  }

  /**
   * Called when an item is committed (via Choose button or footer).
   * Droid builder commits the entire build, not individual items.
   * PHASE A + B: Include buildState to track deferred/provisional/finalized status
   */
  async onItemCommitted(itemId, shell) {
    // Store committed droid package in shell's committed selections map
    const selection = {
      isDroid: true,
      droidDegree: this._droidState.droidDegree,
      droidSize: this._droidState.droidSize,
      droidSystems: JSON.parse(JSON.stringify(this._droidState.droidSystems)),
      droidCredits: JSON.parse(JSON.stringify(this._droidState.droidCredits)),
      // PHASE A + B: Include build state for deferred detection in finalizer
      buildState: JSON.parse(JSON.stringify(this._droidState.buildState)),
      speciesDroidBuilder: this._droidState.speciesDroidBuilder ? JSON.parse(JSON.stringify(this._droidState.speciesDroidBuilder)) : null,
      sourceSpecies: this._droidState.sourceSpecies || null,
    };

    await this._commitNormalized(shell, 'droid', selection);

    if (shell?.committedSelections && this.descriptor?.stepId) {
      shell.committedSelections.set(this.descriptor.stepId, selection);
    }
    if (shell?.buildIntent && this.descriptor?.stepId) {
      shell.buildIntent.commitSelection(this.descriptor.stepId, this.descriptor.stepId, selection);
    }

    swseLogger.debug('[DroidBuilderStep.onItemCommitted] Droid build committed', selection);
  }

  /**
   * Called when step is exited.
   * PHASE A + B: Don't auto-commit if deferred
   */
  async onStepExit(shell) {
    // When deferred, don't commit yet - will be completed in final pass
    if (this._droidState?.buildState?.isDeferred) {
      swseLogger.debug('[DroidBuilderStep.onStepExit] Build is deferred, skipping auto-commit');
      return;
    }

    // Otherwise, automatically commit droid build when exiting this step
    if (this._validateDroidBuild().isValid && !shell.committedSelections.has(this.descriptor.stepId)) {
      await this.onItemCommitted(null, shell);
    }
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  /**
   * Get suggested droid systems from SuggestionService
   * Recommendations based on droid degree, class, and other selections
   * @private
   */
  async _getSuggestedSystems(actor, shell) {
    try {
      // Build characterData from shell's buildIntent/committedSelections
      const characterData = this._buildCharacterDataFromShell(shell);

      // PHASE D: Build pending droid budget info from current state
      const pendingDroidBudget = {
        base: this._droidState?.droidCredits?.base || 1000,
        spent: this._droidState?.droidCredits?.spent || 0,
        remaining: this._droidState?.droidCredits?.remaining || 1000,
        allowOverflow: ProgressionRules.droidOverflowEnabled(),
      };

      const droidDegree = this._droidState?.droidDegree || actor?.system?.droidDegree || '1st-degree';
      const droidSize = this._droidState?.droidSize || actor?.system?.droidSize || 'medium';

      // Get suggestions from SuggestionService
      // PHASE D: Pass DROID_SYSTEMS as available systems and include budget info
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'droid-systems',
        available: DROID_SYSTEMS,  // Pass available droid systems
        pendingData: {
          ...SuggestionContextBuilder.buildPendingData(actor, characterData),
          droidDegree,
          droidSize,
          droidBudget: pendingDroidBudget,
        },
        engineOptions: {
          includeFutureAvailability: true,
          mode: 'preview',  // Provisional mode shows preview recommendations
          allowOverflow: pendingDroidBudget.allowOverflow,
          debug: false,
        },
        persist: false  // Don't persist suggestions yet (they're transient during build)
      });

      // Store suggestions (organized by category from PHASE D engine)
      // Format: { locomotion: [], processor: [], appendages: [], accessories: {} }
      this._suggestedSystems = suggested || {};

      if (Object.keys(this._suggestedSystems).length > 0) {
        swseLogger.debug('[DroidBuilderStep] Droid suggestions received', {
          hasLocomotion: !!this._suggestedSystems.locomotion?.length,
          hasProcessor: !!this._suggestedSystems.processor?.length,
          hasAppendages: !!this._suggestedSystems.appendages?.length,
          hasAccessories: !!this._suggestedSystems.accessories,
        });
      }
    } catch (err) {
      swseLogger.warn('[DroidBuilderStep] Suggestion service error:', err);
      this._suggestedSystems = {};
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
