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
import { resolveDroidBuilderQuote } from '../../../domain/droids/droid-component-quote-authority.js';
import { swseLogger } from '../../../utils/logger.js';
import { ProgressionRules } from '../../../engine/progression/ProgressionRules.js';
import { getStepGuidance, handleAskMentor, handleAskMentorWithSuggestions } from './mentor-step-integration.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SuggestionContextBuilder } from '/systems/foundryvtt-swse/scripts/engine/progression/suggestion/suggestion-context-builder.js';
import {
  DROID_DEGREE_PACKAGES,
  DROID_SIZE_PACKAGES,
  getDroidSizeDefaultLocomotion,
  getDroidSizeBaseSpeed,
  getDroidSizeCostFactor
} from '../../../engine/progression/droids/droid-trait-rules.js';
import { DroidBuilderViewModelAdapter } from './droid-builder-view-model.js';
import { isFollowerDroidChassisApplicable, getApplicableFollowerDroidChassisOptions } from './follower-droid-chassis-applicability.js';

export class DroidBuilderStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._droidState = null;
    this._suggestedSystems = [];  // Suggested droid systems
    this._buildMode = 'provisional'; // 'deferred' | 'provisional' | 'finalized'
    this._selectedComponentKey = null;
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

    if (this._droidState) {
      this._refreshSizeDependentSystems();
      this._normalizeDroidCredits();
      this._syncDraftDroidIdentity(shell);
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

    const session = shell?.progressionSession || null;
    const speciesContext = session?.draftSelections?.pendingSpeciesContext || null;
    const speciesDroidBuilder = speciesContext?.metadata?.droidBuilder || speciesContext?.ledger?.rules?.droidBuilder || null;
    const draftDroid = session?.draftSelections?.droid && typeof session.draftSelections.droid === 'object'
      ? session.draftSelections.droid
      : {};
    const droidContext = session?.droidContext || {};

    // Check if this is a droid chargen participant.  Newly-created droid PCs can
    // enter the builder before the live actor document has been materialized as a
    // droid, so the subtype/session context must be authoritative here.
    const isDroid = actor?.type === 'droid'
      || actor?.system?.isDroid === true
      || session?.subtype === 'droid'
      || droidContext?.isDroid === true
      || draftDroid?.isDroid === true
      || !!draftDroid?.droidSystems
      || !!speciesDroidBuilder?.required;
    if (!isDroid) {
      swseLogger.warn('[DroidBuilderStep] Refusing to initialize droid state for non-droid context', {
        actorType: actor?.type,
        actorIsDroid: actor?.system?.isDroid === true,
        subtype: session?.subtype,
        hasDroidContext: !!session?.droidContext,
        hasDraftDroid: Object.keys(draftDroid || {}).length > 0,
      });
      return null;
    }

    this._ensureDroidSessionContext(shell, actor, draftDroid);

    // Get creation mode from session
    const creationMode = speciesDroidBuilder?.mode
      || draftDroid.creationMode
      || shell?.progressionSession?.droidContext?.creationMode
      || 'custom';
    const isStandardModel = creationMode === 'standard-model';

    // Get house rule settings
    let baseCredits = Number(draftDroid?.droidCredits?.base ?? ProgressionRules.getDroidConstructionCredits()); // Default 1000 for custom
    const allowOverflow = ProgressionRules.droidOverflowEnabled();

    // RAW: Standard model droids have a 5000 credit cap total (includes model base cost)
    if (isStandardModel) {
      const modelBaseCost = Number(draftDroid?.standardModelBaseCost ?? draftDroid?.droidCredits?.standardModelBaseCost ?? 0);
      baseCredits = Math.max(0, 5000 - modelBaseCost); // Remaining budget after model cost
    }

    // Get degree/size for RAW defaults. Prefer already-selected chargen draft values
    // over the actor document so the builder reflects the previous droid identity step.
    const degree = (speciesDroidBuilder?.fixedDegree
      || draftDroid.droidDegree
      || shell?.progressionSession?.droidContext?.degree
      || speciesDroidBuilder?.defaultDegree
      || actor?.system?.droidDegree
      || '1st-degree').toLowerCase();
    const size = (speciesDroidBuilder?.fixedSize
      || draftDroid.droidSize
      || shell?.progressionSession?.droidContext?.size
      || speciesDroidBuilder?.defaultSize
      || actor?.system?.droidSize
      || 'medium').toLowerCase();
    const defaultLocomotionId = getDroidSizeDefaultLocomotion(size);
    const defaultSpeed = getDroidSizeBaseSpeed(size);
    const costFactor = getDroidSizeCostFactor(size);

    const defaultDroidSystems = {
      locomotion: {
        id: defaultLocomotionId,
        name: this._getLocomotionName(defaultLocomotionId),
        speed: defaultSpeed,
        costFactor: costFactor,
        // The chassis' default locomotion is part of the baseline frame in chargen.
        // It should not consume construction credits until the player replaces it.
        cost: 0,
        weight: resolveDroidBuilderQuote({ definition: DROID_SYSTEMS.locomotion.find(entry => entry.id === defaultLocomotionId), category: 'locomotion', size, speed: defaultSpeed }).kg,
        isDefault: true,
        isGranted: true
      },
      processor: { id: 'heuristic', name: 'Heuristic Processor', cost: 0, weight: 5, isGranted: true },
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

    // Initialize from recovered draft first, then actor document, then RAW defaults.
    // Empty/partial objects are merged with required defaults so the first real
    // droid chargen step never renders an unavailable-state dead end.
    const droidSystems = this._mergeDroidSystemsWithDefaults(
      defaultDroidSystems,
      draftDroid?.droidSystems || actor?.system?.droidSystems || null
    );

    // Deep copy systems to avoid mutating actor data directly during building
    const systemsCopy = JSON.parse(JSON.stringify(droidSystems));
    const spentCredits = Number(draftDroid?.droidCredits?.spent ?? actor?.system?.droidCredits?.spent ?? 0);
    const standardModelBaseCost = Number(draftDroid?.standardModelBaseCost ?? draftDroid?.droidCredits?.standardModelBaseCost ?? 0);

    // PHASE A + B: Extended state model for budget-aware deferred construction
    const initializedState = {
      isDroid: true,
      creationMode: creationMode,  // 'custom' or 'standard-model'
      isStandardModel: isStandardModel,
      droidDegree: degree,
      droidSize: size,
      speciesDroidBuilder: speciesDroidBuilder ? JSON.parse(JSON.stringify(speciesDroidBuilder)) : null,
      sourceSpecies: speciesContext?.identity?.name || null,

      // Core systems (unchanged structure)
      droidSystems: systemsCopy,

      // PHASE A + B: Budget tracking (use-it-or-lose-it)
      droidCredits: {
        base: baseCredits,
        spent: spentCredits,
        remaining: baseCredits - spentCredits,
        // New: Track whether overflow into general credits is allowed
        allowOverflow: allowOverflow,
        // Standard model: track total cap (5000) vs budget remaining
        standardModelBaseCost: isStandardModel ? standardModelBaseCost : 0,
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

    this._normalizeDroidCredits(initializedState);
    return initializedState;
  }

  /**
   * Normalize droid construction accounting so remaining credits are always
   * derived from the authoritative base/spent pair instead of stale recovered
   * session data.
   * @private
   */
  _normalizeDroidCredits(state = this._droidState) {
    if (!state) return null;
    if (!state.droidCredits || typeof state.droidCredits !== 'object') {
      state.droidCredits = {};
    }

    const credits = state.droidCredits;
    const fallbackBase = ProgressionRules.getDroidConstructionCredits();
    const base = Number.isFinite(Number(credits.base)) ? Number(credits.base) : fallbackBase;
    const spent = Number.isFinite(Number(credits.spent)) ? Math.max(0, Number(credits.spent)) : 0;

    credits.base = base;
    credits.spent = spent;
    credits.remaining = base - spent;
    credits.allowOverflow = !!credits.allowOverflow;
    if (state.isStandardModel) {
      credits.standardModelBaseCost = Number(credits.standardModelBaseCost || state.standardModelBaseCost || 0);
      credits.maxTotalCost = Number.isFinite(Number(credits.maxTotalCost)) ? Number(credits.maxTotalCost) : 5000;
    }

    return credits;
  }

  /**
   * Ensure a droid chargen session has the context normally seeded by the droid
   * subtype adapter. Inline recovery can restore directly into the builder before
   * a live actor document has droid-shaped system data, so the builder maintains
   * the minimum context it needs to render and validate safely.
   * @private
   */
  _ensureDroidSessionContext(shell, actor, draftDroid = {}) {
    const session = shell?.progressionSession;
    if (!session) return;

    if (!session.droidContext || typeof session.droidContext !== 'object') {
      session.droidContext = {};
    }

    const degree = draftDroid?.droidDegree || session.droidContext.degree || actor?.system?.droidDegree || '1st-degree';
    const size = draftDroid?.droidSize || session.droidContext.size || actor?.system?.droidSize || 'medium';

    session.subtype = session.subtype || 'droid';
    session.droidContext = {
      ...session.droidContext,
      isDroid: true,
      creationMode: session.droidContext.creationMode || draftDroid?.creationMode || 'custom',
      pointBuyPool: Number(session.droidContext.pointBuyPool || 20),
      excludedAbilities: Array.isArray(session.droidContext.excludedAbilities) ? session.droidContext.excludedAbilities : ['con'],
      conBase: 0,
      degree,
      degreePackage: session.droidContext.degreePackage || DROID_DEGREE_PACKAGES[String(degree).toLowerCase()] || null,
      size,
      attributeGenerationConfig: session.droidContext.attributeGenerationConfig || {
        abilityCount: 5,
        abilityKeys: ['STR', 'DEX', 'INT', 'WIS', 'CHA'],
        abilitySystemKeys: ['str', 'dex', 'int', 'wis', 'cha'],
        standardRollCount: 5,
        organicDiceCount: 18,
        organicGroupCount: 5,
        organicDropCount: 3,
        arrays: {
          standard: [15, 14, 13, 12, 10],
          highPower: [16, 14, 12, 10, 8],
        },
      },
    };
  }

  /**
   * Merge recovered/actor droid systems over required RAW defaults.  This keeps
   * partial legacy data from producing a null builder state or an empty surface.
   * @private
   */
  _mergeDroidSystemsWithDefaults(defaultSystems, existingSystems = null) {
    const defaults = JSON.parse(JSON.stringify(defaultSystems || {}));
    const existing = existingSystems && typeof existingSystems === 'object'
      ? JSON.parse(JSON.stringify(existingSystems))
      : {};

    const merged = {
      ...defaults,
      ...existing,
      locomotion: existing.locomotion || defaults.locomotion || null,
      processor: existing.processor || defaults.processor || null,
      appendages: Array.isArray(existing.appendages) && existing.appendages.length > 0
        ? existing.appendages
        : (defaults.appendages || []),
      accessories: Array.isArray(existing.accessories) ? existing.accessories : (defaults.accessories || []),
      locomotionEnhancements: Array.isArray(existing.locomotionEnhancements)
        ? existing.locomotionEnhancements
        : (defaults.locomotionEnhancements || []),
      appendageEnhancements: Array.isArray(existing.appendageEnhancements)
        ? existing.appendageEnhancements
        : (defaults.appendageEnhancements || []),
    };

    merged.totalCost = Number.isFinite(Number(existing.totalCost)) ? Number(existing.totalCost) : Number(defaults.totalCost || 0);
    merged.totalWeight = Number.isFinite(Number(existing.totalWeight)) ? Number(existing.totalWeight) : Number(defaults.totalWeight || 0);

    return merged;
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
  /**
   * Published DROID_SYSTEMS facts pass through a single mechanical resolver.
   * Explicit builder grants adjust the charged price AFTER the source quote.
   */
  _quoteDroidSystem(definition, category, subcategory = null, options = {}) {
    const size = options.size ?? this._droidState?.droidSize ?? null;
    const group = category === 'enhancement'
      ? (subcategory === 'appendageEnhancement' ? 'appendageEnhancement' : 'locomotionEnhancement')
      : category;
    const locomotion = this._droidState?.droidSystems?.locomotion;
    const baseDefinition = DROID_SYSTEMS.locomotion?.find(entry => entry.id === locomotion?.id);
    const baseSpeed = locomotion?.speed ?? null;
    const baseQuote = group === 'locomotionEnhancement' && baseDefinition
      ? resolveDroidBuilderQuote({
          definition: baseDefinition, category: 'locomotion', size, speed: baseSpeed
        }) : null;
    const installedShields = (this._droidState?.droidSystems?.accessories ?? [])
      .map(entry => DROID_SYSTEMS.accessories?.shields?.find(def => def.id === entry.id)?.sr ?? null)
      .filter(sr => Number.isInteger(sr));
    const selectedInstalledShieldRating = installedShields.length === 1 ? installedShields[0] : null;
    return resolveDroidBuilderQuote({
      definition, category: group, subcategory, size,
      speed: options.speed ?? null,
      variant: options.variant ?? null,
      baseLocomotionCost: baseQuote?.status === 'OK' ? baseQuote.credits : null,
      appendageBaseCost: options.appendageBaseCost ?? null,
      appendageBaseWeight: options.appendageBaseWeight ?? null,
      selectedInstalledShieldRating
    });
  }

  _getDroidBuilderContextMode(shell = null) {
    const droidContext = shell?.progressionSession?.droidContext || {};
    return droidContext.contextMode
      || droidContext.builderMode
      || this.descriptor?.contextMode
      || this.descriptor?.builderContextMode
      || 'chargenDraft';
  }

  /**
   * Provide step data to templates.
   */
  async getStepData(context) {
    const shell = context?.shell || context?.progressionShell || null;
    const contextMode = this._getDroidBuilderContextMode(shell);

    if (!this._droidState) {
      const builderVm = DroidBuilderViewModelAdapter.build({
        droidState: null,
        contextMode,
      });
      return {
        droidState: null,
        presentation: {},
        builderVm,
        readiness: builderVm.validation,
        buildComplete: false,
        buildIssues: builderVm.validation.errors || [],
        hasSuggestions: false,
        suggestedSystemIds: [],
        suggestedSystems: [],
        confidenceMap: {},
      };
    }

    this._normalizeDroidCredits();
    this._syncDraftDroidIdentity(shell);

    // PHASE D: Flatten PHASE D suggestions (organized by category) into array for display
    const suggestionsArray = this._flattenDroidSuggestions(this._suggestedSystems);
    const { suggestedIds, hasSuggestions, confidenceMap } = this.formatSuggestionsForDisplay(suggestionsArray);
    const presentation = this._buildDroidPresentation(suggestedIds, confidenceMap);
    const readiness = this._validateDroidBuild();
    const builderVm = DroidBuilderViewModelAdapter.build({
      droidState: this._droidState,
      readiness,
      suggestedIds,
      confidenceMap,
      contextMode,
      selectedComponentKey: this._selectedComponentKey,
    });

    return {
      droidState: { ...this._droidState },
      presentation,
      builderVm,
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
    if (!this._droidState) {
      return {
        selected: [],
        count: 0,
        isComplete: false,
      };
    }

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
    if (!this._droidState) {
      return ['Droid construction state is not available. Return to the prior droid setup step and try again.'];
    }

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
          badgeLabel: isSuggested ? 'Recommended' : null,
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


  // PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step:
  // these two methods are now thin delegates to
  // follower-droid-chassis-applicability.js's pure functions, extracted so
  // the actual filtering decision is unit-testable without instantiating
  // this class. Behavior is unchanged for every existing caller (PC droid
  // chargen passes no constraint object; follower droid chargen passes the
  // follower category/subcategory constraint from
  // FollowerDroidBuilderStep#_getFollowerConstraint).
  _applySpeciesDroidConstraintsToPresentation(available, enhanceSystemsWithSuggestions = systems => systems) {
    return getApplicableFollowerDroidChassisOptions(available, this._droidState?.speciesDroidBuilder || null, enhanceSystemsWithSuggestions);
  }

  _systemAllowedBySpeciesConstraints(category, id, subcategory = null) {
    return isFollowerDroidChassisApplicable(this._droidState?.speciesDroidBuilder || null, { category, id, subcategory });
  }

  /**
   * Validate droid build completeness.
   * PHASE A + B: Deferred builds skip validation (handled by getBlockingIssues)
   */
  _validateDroidBuild() {
    if (!this._droidState) {
      return {
        isValid: false,
        issues: ['Droid construction state is not available.'],
        summary: 'Droid construction state unavailable.',
        isDeferred: false,
      };
    }

    const sys = this._droidState.droidSystems || {};
    const credits = this._droidState.droidCredits || { remaining: 0 };
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
    if (!Array.isArray(sys.appendages) || sys.appendages.length === 0) {
      issues.push('At least one appendage required');
    }

    // Source-quoted numbers must survive every size refresh. A blocked or
    // unquoted draft component may never be finalized with a free price.
    const quotedEntries = [sys.locomotion, sys.processor,
      ...(sys.appendages || []), ...(sys.accessories || []),
      ...(sys.locomotionEnhancements || []), ...(sys.appendageEnhancements || [])].filter(Boolean);
    for (const entry of quotedEntries) {
      if (entry.quoteStatus === 'BLOCKED' || !Number.isFinite(entry.cost) || !Number.isFinite(entry.weight)) {
        issues.push(`Unresolved component quote: ${entry.name || entry.id || 'unknown'}`);
      }
    }

    // Check budget
    if (Number(credits.remaining || 0) < 0) {
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
    return getDroidSizeCostFactor(size);
  }

  /**
   * Update the droid degree from the builder header.
   * Degree changes are chargen-draft mutations only and preserve installed systems.
   */
  setDroidDegree(degree, shell = null) {
    if (!this._droidState) return false;
    const normalized = String(degree || '').trim().toLowerCase();
    if (!DROID_DEGREE_PACKAGES[normalized]) return false;

    const fixedDegree = this._droidState.speciesDroidBuilder?.fixedDegree;
    if (fixedDegree && String(fixedDegree).toLowerCase() !== normalized) {
      swseLogger.warn('[DroidBuilderStep] Degree change blocked by fixed chassis profile', { fixedDegree, requested: normalized });
      return false;
    }

    this._droidState.droidDegree = normalized;
    this._droidState.buildState.isDeferred = false;
    this._droidState.buildState.mode = 'provisional';
    this._syncDraftDroidIdentity(shell);
    return true;
  }

  /**
   * Update the droid size and recalculate size-dependent costs.
   */
  setDroidSize(size, shell = null) {
    if (!this._droidState) return false;
    const normalized = String(size || '').trim().toLowerCase();
    if (!DROID_SIZE_PACKAGES[normalized]) return false;

    const fixedSize = this._droidState.speciesDroidBuilder?.fixedSize;
    if (fixedSize && String(fixedSize).toLowerCase() !== normalized) {
      swseLogger.warn('[DroidBuilderStep] Size change blocked by fixed chassis profile', { fixedSize, requested: normalized });
      return false;
    }

    this._droidState.droidSize = normalized;
    this._droidState.buildState.isDeferred = false;
    this._droidState.buildState.mode = 'provisional';
    this._refreshSizeDependentSystems();
    this._syncDraftDroidIdentity(shell);
    return true;
  }

  /**
   * Keep session draft identity in sync so later steps/finalization see header changes.
   */
  _syncDraftDroidIdentity(shell) {
    const draft = shell?.progressionSession?.draftSelections;
    if (!draft) return;
    if (!draft.droid) draft.droid = {};
    draft.droid.isDroid = true;
    this._normalizeDroidCredits();
    draft.droid.creationMode = this._droidState.creationMode || 'custom';
    draft.droid.droidDegree = this._droidState.droidDegree;
    draft.droid.droidSize = this._droidState.droidSize;
    draft.droid.droidSystems = JSON.parse(JSON.stringify(this._droidState.droidSystems || {}));
    draft.droid.droidCredits = JSON.parse(JSON.stringify(this._droidState.droidCredits || {}));
    draft.droid.buildState = JSON.parse(JSON.stringify(this._droidState.buildState || {}));

    if (shell?.progressionSession?.droidContext) {
      shell.progressionSession.droidContext.degree = this._droidState.droidDegree;
      shell.progressionSession.droidContext.size = this._droidState.droidSize;
      shell.progressionSession.droidContext.degreePackage = DROID_DEGREE_PACKAGES[this._droidState.droidDegree];
    }
  }

  /**
   * Remove duplicate singleton installs that can be produced by repeated event
   * binding or fast double-clicks before the shell finishes re-rendering.
   * Appendages are intentionally left alone because multiple limbs can be valid.
   * @private
   */
  _dedupeInstalledSingletonSystems() {
    const sys = this._droidState?.droidSystems;
    if (!sys) return false;

    let changed = false;
    const dedupeByKey = (items, keyFn) => {
      if (!Array.isArray(items)) return [];
      const seen = new Set();
      const deduped = [];
      for (const item of items) {
        if (!item) continue;
        const key = keyFn(item);
        if (key && seen.has(key)) {
          changed = true;
          continue;
        }
        if (key) seen.add(key);
        deduped.push(item);
      }
      if (deduped.length !== items.length) changed = true;
      return deduped;
    };

    sys.accessories = dedupeByKey(sys.accessories, item => `${item.category || item.subcategory || 'base'}:${item.id || ''}`);
    sys.locomotionEnhancements = dedupeByKey(sys.locomotionEnhancements, item => item.id || '');
    sys.appendageEnhancements = dedupeByKey(sys.appendageEnhancements, item => item.id || '');

    return changed;
  }

  /**
   * Recalculate costs, weights, and speeds when the chassis size changes.
   * Granted/default systems remain free, while purchased systems use existing formulas.
   */
  _refreshSizeDependentSystems() {
    const sys = this._droidState?.droidSystems;
    const credits = this._droidState?.droidCredits;
    if (!sys || !credits) return;
    this._dedupeInstalledSingletonSystems();

    const quoteEntry = (entry, definition, group, subcategory = null, options = {}) => {
      if (!definition) return { ...entry, cost: null, weight: null, quoteStatus: 'BLOCKED', quoteBlockingReason: 'Source definition not found' };
      const quote = this._quoteDroidSystem(definition, group, subcategory, options);
      const granted = !!entry.isDefault || !!entry.isGranted || !!options.granted;
      return {
        ...entry,
        name: entry.name || definition.name,
        cost: quote.status === 'OK' ? (granted ? 0 : quote.credits) : null,
        weight: quote.kg,
        quoteStatus: quote.status,
        quoteBlockingReason: quote.blockingReason,
        isGranted: !!entry.isGranted || !!options.granted
      };
    };

    if (sys.locomotion) {
      const def = DROID_SYSTEMS.locomotion?.find(item => item.id === sys.locomotion.id);
      const speed = def ? this._calculateLocomotionSpeed(def) : null;
      sys.locomotion = {
        ...quoteEntry(sys.locomotion, def, 'locomotion', null, { speed }),
        speed
      };
    }

    if (sys.processor) {
      const def = DROID_SYSTEMS.processors?.find(item => item.id === sys.processor.id);
      sys.processor = quoteEntry(sys.processor, def, 'processor');
    }

    sys.appendages = (sys.appendages || []).map((entry, index) => {
      const id = ['hand-1', 'hand-2'].includes(entry.id) ? 'hand' : entry.id;
      const def = DROID_SYSTEMS.appendages?.find(item => item.id === id);
      const granted = ['hand-1', 'hand-2'].includes(entry.id) || (id === 'hand' && index < 2 && entry.cost === 0);
      return quoteEntry(entry, def, 'appendage', null, { granted });
    });

    sys.accessories = (sys.accessories || []).map(entry => {
      const subcategory = entry.category || entry.subcategory;
      const def = DROID_SYSTEMS.accessories?.[subcategory]?.find(item => item.id === entry.id);
      return { ...quoteEntry(entry, def, 'accessory', subcategory), category: subcategory };
    });

    sys.locomotionEnhancements = (sys.locomotionEnhancements || []).map(entry => {
      const def = DROID_SYSTEMS.locomotionEnhancements?.find(item => item.id === entry.id);
      return quoteEntry(entry, def, 'locomotionEnhancement');
    });
    sys.appendageEnhancements = (sys.appendageEnhancements || []).map(entry => {
      const def = DROID_SYSTEMS.appendageEnhancements?.find(item => item.id === entry.id);
      return quoteEntry(entry, def, 'appendageEnhancement');
    });

    const all = [sys.locomotion, sys.processor, ...(sys.appendages || []),
      ...(sys.accessories || []), ...(sys.locomotionEnhancements || []),
      ...(sys.appendageEnhancements || [])].filter(Boolean);
    credits.spent = all.reduce((sum, entry) => sum + (Number.isFinite(entry.cost) ? entry.cost : 0), 0);
    this._normalizeDroidCredits();
    this._recalculateTotals();
  }

  /**
   * Purchase a system.
   * Cannibalizes logic from original chargen-droid.js _onPurchaseSystem
   */
  purchaseSystem(category, id, subcategory = null) {
    if (!this._droidState) return false;
    const sys = this._droidState.droidSystems;
    const credits = this._normalizeDroidCredits();

    try {
      if (!this._systemAllowedBySpeciesConstraints(category, id, subcategory)
          || this._isSingletonSystemInstalled(category, id, subcategory)) return false;

      const group = category === 'enhancement'
        ? (subcategory === 'appendageEnhancement' ? 'appendageEnhancement' : 'locomotionEnhancement')
        : category;
      const options = {
        locomotion: DROID_SYSTEMS.locomotion,
        processor: DROID_SYSTEMS.processors,
        appendage: DROID_SYSTEMS.appendages,
        locomotionEnhancement: DROID_SYSTEMS.locomotionEnhancements,
        appendageEnhancement: DROID_SYSTEMS.appendageEnhancements,
        accessory: DROID_SYSTEMS.accessories?.[subcategory],
      };
      const system = options[group]?.find(entry => entry.id === id);
      if (!system) return false; // Unknown component is never a free construction.
      const speed = group === 'locomotion' ? this._calculateLocomotionSpeed(system) : null;
      const quote = this._quoteDroidSystem(system, group, subcategory, { speed });
      if (quote.status !== 'OK') {
        swseLogger.warn('[DroidBuilderStep] Blocked component quote', { category, id, subcategory, reason: quote.blockingReason });
        return false;
      }

      const freeHand = group === 'appendage' && id === 'hand' && this._countFreeHands() < 2;
      const speciesGrant = group === 'accessory' && this._isSpeciesBonusEquipmentChoice(category, id, subcategory);
      const startingHeuristic = group === 'processor' && id === 'heuristic'
        && !!sys.processor?.isGranted;
      const granted = freeHand || speciesGrant || startingHeuristic;
      const cost = granted ? 0 : quote.credits;
      const old = group === 'locomotion' ? sys.locomotion : group === 'processor' ? sys.processor : null;
      const recovered = Number.isFinite(old?.cost) ? old.cost : 0;
      if (Math.max(0, cost - recovered) > credits.remaining) {
        swseLogger.warn('[DroidBuilderStep] Not enough credits for component', { category, id, cost });
        return false;
      }

      const entry = { id: system.id, name: system.name, cost,
        weight: quote.kg, quoteStatus: quote.status, quoteBlockingReason: null,
        ...(granted ? { isGranted: true } : {}),
        ...(speed === null ? {} : { speed }),
        ...(group === 'accessory' ? { category: subcategory, data: system } : {})
      };
      if (group === 'locomotion') sys.locomotion = entry;
      else if (group === 'processor') sys.processor = entry;
      else if (group === 'appendage') (sys.appendages ??= []).push(entry);
      else if (group === 'accessory') (sys.accessories ??= []).push(entry);
      else if (group === 'locomotionEnhancement') (sys.locomotionEnhancements ??= []).push(entry);
      else if (group === 'appendageEnhancement') (sys.appendageEnhancements ??= []).push(entry);
      else return false;

      credits.spent += cost - recovered;
      this._refreshSizeDependentSystems(); // dependent enhancements reprice on any source change
      return true;
    } catch (error) {
      swseLogger.error('[DroidBuilderStep.purchaseSystem]', error);
      return false;
    }
  }

  /**
   * Systems represented as single install rows should not be added twice.
   * This protects against duplicated click bindings and rapid double-clicks.
   * Locomotion and processor are replacement slots, so they are not blocked here.
   * @private
   */
  _isSingletonSystemInstalled(category, id, subcategory = null) {
    const sys = this._droidState?.droidSystems || {};
    const normalizedCategory = String(category || '').trim();
    const normalizedId = String(id || '').trim();
    const normalizedSubcategory = subcategory == null ? null : String(subcategory).trim();

    if (!normalizedId) return false;
    if (normalizedCategory === 'accessory') {
      return (sys.accessories || []).some(accessory => {
        const itemSubcategory = accessory.category || accessory.subcategory || null;
        return accessory.id === normalizedId && (!normalizedSubcategory || itemSubcategory === normalizedSubcategory);
      });
    }

    const enhancementGroup = normalizedCategory === 'enhancement'
      ? (normalizedSubcategory === 'appendageEnhancement' ? 'appendageEnhancement' : 'locomotionEnhancement')
      : normalizedCategory;
    if (enhancementGroup === 'locomotionEnhancement') {
      return (sys.locomotionEnhancements || []).some(enhancement => enhancement.id === normalizedId);
    }

    if (enhancementGroup === 'appendageEnhancement') {
      return (sys.appendageEnhancements || []).some(enhancement => enhancement.id === normalizedId);
    }

    return false;
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
    try {
      if (!this._systemAllowedBySpeciesConstraints(category, id, subcategory)) return false;
      const group = category === 'enhancement'
        ? (subcategory === 'appendageEnhancement' ? 'appendageEnhancement' : 'locomotionEnhancement')
        : category;

      if (group === 'locomotion') {
        if (!sys.locomotion || sys.locomotion.id !== id) return false;
        sys.locomotion = null;
      } else if (group === 'processor') {
        if (!sys.processor || sys.processor.id !== id || id === 'heuristic') return false;
        const heuristic = DROID_SYSTEMS.processors?.find(entry => entry.id === 'heuristic');
        const quote = this._quoteDroidSystem(heuristic, 'processor');
        if (quote.status !== 'OK') return false;
        sys.processor = {
          id: 'heuristic', name: heuristic.name, cost: 0, weight: quote.kg,
          isGranted: true, quoteStatus: 'OK', quoteBlockingReason: null
        };
      } else {
        const lists = {
          appendage: sys.appendages,
          accessory: sys.accessories,
          locomotionEnhancement: sys.locomotionEnhancements,
          appendageEnhancement: sys.appendageEnhancements,
        };
        const list = lists[group];
        if (!Array.isArray(list)) return false;
        const index = list.findIndex(entry => entry.id === id
          && (group !== 'accessory' || !subcategory
            || (entry.category ?? entry.subcategory) === subcategory));
        if (index < 0) return false;
        if (list[index]?.isDefault || list[index]?.isLocked) return false;
        list.splice(index, 1);
      }

      this._refreshSizeDependentSystems();
      return true;
    } catch (error) {
      swseLogger.error('[DroidBuilderStep.removeSystem]', error);
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
    const size = this._droidState?.droidSize;
    const printed = system?.speeds?.[size] ?? system?.baseSpeed?.[size];
    // Stationary (0) is valid. Missing size speeds must not fabricate 6.
    return Number.isFinite(printed) && printed >= 0 ? printed : null;
  }

  /**
   * Recalculate build totals.
   * Cannibalizes logic from original chargen-droid.js _recalculateDroidTotals
   */
  _recalculateTotals() {
    const sys = this._droidState.droidSystems;
    const entries = [sys.locomotion, sys.processor, ...(sys.appendages || []),
      ...(sys.accessories || []), ...(sys.locomotionEnhancements || []),
      ...(sys.appendageEnhancements || [])].filter(Boolean);
    // Never display an apparently complete mass or price after an unresolved
    // source quote. The readiness gate additionally blocks progression.
    sys.totalCost = entries.every(entry => Number.isFinite(entry.cost))
      ? entries.reduce((sum, entry) => sum + entry.cost, 0) : null;
    sys.totalWeight = entries.every(entry => Number.isFinite(entry.weight))
      ? entries.reduce((sum, entry) => sum + entry.weight, 0) : null;
  }

  /**
   * Keep the selected/summary rail aligned with the in-progress droid draft.
   */
  renderSummaryPanel(context = {}) {
    if (!this._droidState) return null;

    const shell = context?.shell || context?.progressionShell || null;
    const contextMode = this._getDroidBuilderContextMode(shell);
    const readiness = this._validateDroidBuild();
    const builderVm = DroidBuilderViewModelAdapter.build({
      droidState: this._droidState,
      readiness,
      contextMode,
      selectedComponentKey: this._selectedComponentKey,
    });

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/summary-panel/droid-builder-summary.hbs',
      data: {
        actor: context?.shell?.actor || context?.actor || null,
        builderVm,
        readiness,
      },
    };
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

    const readiness = this._validateDroidBuild();
    const suggestionsArray = this._flattenDroidSuggestions(this._suggestedSystems);
    const { suggestedIds, confidenceMap } = this.formatSuggestionsForDisplay(suggestionsArray);
    const builderVm = DroidBuilderViewModelAdapter.build({
      droidState: this._droidState,
      readiness,
      suggestedIds,
      confidenceMap,
      contextMode: 'chargenDraft',
      selectedComponentKey: this._selectedComponentKey,
    });

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/droid-builder-details.hbs',
      data: {
        builderVm,
        readiness,
        buildComplete: readiness.isValid,
        buildIssues: readiness.issues,
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
    const warnings = this.getWarnings();
    return {
      isValid: readiness.isValid,
      errors: readiness.isValid ? [] : readiness.issues,
      warnings,
    };
  }

  /**
   * Return non-blocking warnings for the shell footer/status model.
   */
  getWarnings() {
    if (!this._droidState || this._droidState?.buildState?.isDeferred) return [];
    const warnings = [];
    const credits = this._droidState.droidCredits || {};
    const remaining = Number(credits.remaining || 0);
    if (remaining === 0) warnings.push('Construction budget is fully allocated.');
    return warnings;
  }

  /**
   * Explain exactly why the shell cannot advance from this step.
   */
  getBlockerExplanation() {
    const issues = this.getBlockingIssues();
    if (!issues.length) return null;
    return issues[0];
  }

  /**
   * Provide footer pick/status counts for the progression shell.
   */
  getRemainingPicks() {
    if (this._droidState?.buildState?.isDeferred) {
      return [{ label: 'Build deferred', count: 0, isWarning: true }];
    }
    const readiness = this._validateDroidBuild();
    return [{
      label: readiness.isValid ? 'Build ready' : 'Build issues',
      count: readiness.isValid ? 0 : readiness.issues.length,
      isWarning: !readiness.isValid,
    }];
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
      nextLabel: readiness.isValid ? 'Next: Attributes' : 'Resolve Droid Build',
      confirmLabel: readiness.isValid ? 'Finalize Build' : 'Build Incomplete',
      isBlocked: !readiness.isValid,
      statusText: readiness.summary,
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
    return getStepGuidance(shell.actor, 'droid-builder', shell)
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

      // Chassis controls
      const degreeSelect = workSurfaceEl.querySelector('[data-action="set-degree"]');
      if (degreeSelect) {
        degreeSelect.addEventListener('change', (e) => this._onSetDegree(e, shell));
      }

      const sizeSelect = workSurfaceEl.querySelector('[data-action="set-size"]');
      if (sizeSelect) {
        sizeSelect.addEventListener('change', (e) => this._onSetSize(e, shell));
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

      // Component selection: Phase 5 moves install/remove decisions to the right detail rail.
      const componentSelectors = workSurfaceEl.querySelectorAll('[data-action="select-component"]');
      componentSelectors.forEach(el => {
        el.addEventListener('click', (e) => this._onSelectComponent(e, shell));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') this._onSelectComponent(e, shell);
        });
      });

      // Search/filter within the component browser without triggering a shell rerender.
      const searchInput = workSurfaceEl.querySelector('[data-action="filter-systems"]');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => this._onFilterSystems(e, workSurfaceEl));
      }

      // Install/remove buttons may live in the shell details rail, outside the work surface.
      const rootEl = shell?.getRootElement?.() || workSurfaceEl;
      const purchaseButtons = rootEl.querySelectorAll('[data-action="purchase-system"], [data-action="install-system"]');
      purchaseButtons.forEach(btn => {
        if (btn.dataset.swseDroidBuilderPurchaseWired === 'true') return;
        btn.dataset.swseDroidBuilderPurchaseWired = 'true';
        btn.addEventListener('click', (e) => this._onPurchaseSystem(e, shell, workSurfaceEl));
      });

      const removeButtons = rootEl.querySelectorAll('[data-action="remove-system"]');
      removeButtons.forEach(btn => {
        if (btn.dataset.swseDroidBuilderRemoveWired === 'true') return;
        btn.dataset.swseDroidBuilderRemoveWired = 'true';
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

    swseLogger.debug('[DroidBuilderStep] Deferred droid build committed before reconciliation', deferredSelection);
  }

  _rerenderShell(shell, reason = 'droid-builder-update') {
    return shell?.requestRender?.({ preserveScroll: true, reason, regions: ['work-surface', 'utility'] });
  }

  _onFilterSystems(event, workSurfaceEl) {
    const query = String(event.currentTarget?.value || '').trim().toLowerCase();
    const panels = workSurfaceEl.querySelectorAll('.prog-droid-builder__panel');

    panels.forEach(panel => {
      let visibleCount = 0;
      panel.querySelectorAll('.prog-droid-builder__component-card').forEach(card => {
        const haystack = String(card.textContent || '').toLowerCase();
        const visible = !query || haystack.includes(query);
        card.classList.toggle('prog-droid-builder__component-card--filtered-out', !visible);
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      panel.classList.toggle('prog-droid-builder__panel--filtered-empty', visibleCount === 0);
      let empty = panel.querySelector('[data-filter-empty]');
      if (!empty && visibleCount === 0) {
        empty = document.createElement('div');
        empty.dataset.filterEmpty = 'true';
        empty.className = 'prog-droid-builder__filter-empty';
        empty.textContent = 'No components match the current search.';
        panel.appendChild(empty);
      } else if (empty) {
        empty.hidden = visibleCount !== 0;
      }
    });
  }

  /**
   * Handle chassis degree changes from the builder strip.
   */
  _onSetDegree(event, shell) {
    event.preventDefault();
    const degree = event.currentTarget?.value;
    const success = this.setDroidDegree(degree, shell);
    if (!success) {
      ui.notifications.warn('Unable to change droid degree for this chassis.');
      return;
    }
    this._rerenderShell(shell, 'droid-builder-degree');
  }

  /**
   * Handle chassis size changes from the builder strip.
   */
  _onSetSize(event, shell) {
    event.preventDefault();
    const size = event.currentTarget?.value;
    const success = this.setDroidSize(size, shell);
    if (!success) {
      ui.notifications.warn('Unable to change droid size for this chassis.');
      return;
    }
    this._rerenderShell(shell, 'droid-builder-size');
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
   * Handle component card/installed item selection.
   * The selected component drives the right rail detail/action panel.
   */
  _onSelectComponent(event, shell) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    const key = target?.dataset?.componentUid
      || this._componentKeyFromDataset(target?.dataset || {});

    if (!key) return;

    this._selectedComponentKey = key;
    this._rerenderShell(shell, 'droid-builder-select-component');
  }

  _componentKeyFromDataset(dataset = {}) {
    const category = dataset.componentCategory || dataset.category;
    const subcategory = dataset.componentSubcategory || dataset.subcategory || 'base';
    const id = dataset.componentId || dataset.id;
    if (!category || !id) return null;
    return `${category}:${subcategory || 'base'}:${id}`;
  }

  /**
   * Handle system purchase button click.
   */
  _onPurchaseSystem(event, shell, workSurfaceEl) {
    event.preventDefault();
    event.stopPropagation();

    const btn = event.currentTarget;
    if (!btn || btn.dataset.swseDroidBuilderActionBusy === 'true') return;
    btn.dataset.swseDroidBuilderActionBusy = 'true';
    btn.disabled = true;

    const category = btn.dataset.category;
    const id = btn.dataset.id;
    const subcategory = btn.dataset.subcategory;

    const success = this.purchaseSystem(category, id, subcategory);

    if (success) {
      this._selectedComponentKey = this._componentKeyFromDataset({ category, subcategory, id });
      // Trigger shell re-render to reflect state changes
      this._rerenderShell(shell, 'droid-builder-install-system');
      ui.notifications.info(`${id} system installed`);
    } else {
      btn.dataset.swseDroidBuilderActionBusy = 'false';
      btn.disabled = false;
      ui.notifications.warn('Unable to install system - check credits and requirements');
    }
  }

  /**
   * Handle system removal button click.
   */
  _onRemoveSystem(event, shell, workSurfaceEl) {
    event.preventDefault();
    event.stopPropagation();

    const btn = event.currentTarget;
    if (!btn || btn.dataset.swseDroidBuilderActionBusy === 'true') return;
    btn.dataset.swseDroidBuilderActionBusy = 'true';
    btn.disabled = true;

    const category = btn.dataset.category;
    const id = btn.dataset.id;
    const subcategory = btn.dataset.subcategory;

    const success = this.removeSystem(category, id, subcategory);

    if (success) {
      this._selectedComponentKey = this._componentKeyFromDataset({ category, subcategory, id });
      // Trigger shell re-render to reflect state changes
      this._rerenderShell(shell, 'droid-builder-remove-system');
      ui.notifications.info(`${id} system removed`);
    } else {
      btn.dataset.swseDroidBuilderActionBusy = 'false';
      btn.disabled = false;
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
    if (!this._droidState) {
      swseLogger.warn('[DroidBuilderStep.onItemCommitted] No droid state available to commit');
      return;
    }

    const readiness = this._validateDroidBuild();
    if (!readiness.isValid && !this._droidState?.buildState?.isDeferred) {
      ui.notifications?.warn?.(readiness.issues?.[0] || 'Complete the droid build before continuing.');
      return;
    }

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
    const alreadyCommitted = !!shell?.committedSelections?.has?.(this.descriptor.stepId);
    if (this._validateDroidBuild().isValid && !alreadyCommitted) {
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
      // ADDENDUM (Phase 6 follow-up): a follower droid's constraint
      // (speciesDroidBuilder — see FollowerDroidBuilderStep#_getFollowerConstraint)
      // must gate suggestions the same way it already gates presentation
      // (_applySpeciesDroidConstraintsToPresentation) and purchase actions
      // (_systemAllowedBySpeciesConstraints) — otherwise the mentor could
      // suggest a system a follower is not actually allowed to buy.
      // Non-follower (ordinary PC droid chargen) callers have no
      // constraint object, so this is a no-op passthrough for them.
      const constrainedAvailableSystems = getApplicableFollowerDroidChassisOptions(
        { locomotion: DROID_SYSTEMS.locomotion, processors: DROID_SYSTEMS.processors, appendages: DROID_SYSTEMS.appendages, accessories: DROID_SYSTEMS.accessories, locomotionEnhancements: DROID_SYSTEMS.locomotionEnhancements, appendageEnhancements: DROID_SYSTEMS.appendageEnhancements },
        this._droidState?.speciesDroidBuilder || null
      );
      const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
        domain: 'droid-systems',
        available: { ...DROID_SYSTEMS, ...constrainedAvailableSystems },  // Constrained where a follower/species restriction applies
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
