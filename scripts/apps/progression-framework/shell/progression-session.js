/**
 * ProgressionSession
 *
 * Canonical, normalized progression state for chargen/levelup/templates.
 *
 * This is the single source of truth for:
 * - Mode and subtype
 * - Actor context (immutable snapshot)
 * - Normalized draft selections (draftSelections)
 * - Derived entitlements (computed, not stored)
 * - Progression tracking (active/completed/invalidated steps)
 * - Projected character state
 * - Advisory context
 *
 * All step commits normalize into draftSelections via semantic keys.
 * Summary, finalizer, and prerequisite checks all read from this object.
 *
 * Architecture:
 * - Immutable actor snapshot prevents accidental reads from live actor during draft
 * - Normalized schemas enforced per selection key
 * - buildIntent becomes a derived view (not a co-authority)
 * - All mutations flow through commitSelection() for validation
 * - Subtype-specific behavior plugs in through adapter (Phase 1)
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { ProgressionSubtypeAdapterRegistry } from '../adapters/progression-subtype-adapter-registry.js';

export class ProgressionSession {
  /**
   * Create a new progression session.
   * @param {Object} options
   * @param {Actor} options.actor - Actor being progressed
   * @param {'chargen' | 'levelup' | 'template'} options.mode
   * @param {'actor' | 'npc' | 'droid' | 'follower' | 'nonheroic'} options.subtype
   * @param {ProgressionSubtypeAdapter} options.adapter - Optional adapter (resolved if not provided)
   * @param {Object} options.dependencyContext - For dependent participants (e.g., follower owner/provenance)
   */
  constructor(options = {}) {
    const { actor, mode = 'chargen', subtype = 'actor', adapter = null, dependencyContext = null } = options;

    // Immutable mode/type
    this.mode = mode;
    this.subtype = subtype;

    // Resolve adapter: either use provided or look up from registry
    // Phase 1 CORRECTED: This seam allows subtype-specific behavior to plug in
    // Including support for dependent participants via dependency context
    const registry = ProgressionSubtypeAdapterRegistry.getInstance();
    this.subtypeAdapter = adapter || registry.resolveAdapter(subtype);

    // Phase 1 CORRECTED: Dependency context for dependent participants (e.g., follower)
    // Stores owner/provenance/entitlement information
    this.dependencyContext = dependencyContext || null;

    swseLogger.debug('[ProgressionSession] Created with subtype adapter', {
      subtype,
      adapter: this.subtypeAdapter?.constructor?.name,
      adapterKind: this.subtypeAdapter?.kind,
      hasDepencyContext: !!this.dependencyContext,
    });

    // Actor context (snapshot, not live)
    this.actorId = actor?.id || null;
    this.actorSnapshot = actor ? this._snapshotActor(actor) : null;

    // Normalized draft selections (the single source of truth)
    this.draftSelections = {
      species: null,
      class: null,
      background: null,
      attributes: null,
      skills: null,
      feats: [],
      talents: [],
      languages: [],
      forcePowers: [],
      forceTechniques: [],
      forceSecrets: [],
      starshipManeuvers: [],
      survey: null,
      droid: null,
      pendingSpeciesContext: null,
      pendingBackgroundContext: null,
      backgroundLedger: null,
      // NEW: Pending entitlements & immediate choices (Phase 1)
      pendingEntitlements: [],  // Subsystem picks resolved elsewhere
      immediateChoices: [],     // Resolved immediately in owning step
    };

    // Derived outputs (computed on demand, not hand-maintained)
    this.derivedEntitlements = {
      feats: { available: 0, used: 0 },
      talents: { available: 0, used: 0 },
      languages: { maximum: 0 },
      skills: { trainedCount: 0 },
    };

    // Progression tracking
    this.activeSteps = [];          // Currently available step ids
    this.visitedStepIds = [];       // Steps player has entered (visited)
    this.currentStepId = null;       // Currently visible step
    this.completedStepIds = [];      // Steps already finalized
    this.invalidatedStepIds = [];    // Steps marked dirty by upstream changes

    // Projection/preview
    this.projectedCharacter = null;  // What character would look like if applied

    // Advisory context
    this.advisoryContext = {
      mentorId: 'ol-salty',
      buildIntentSignals: {},
      lastAdviceGiven: null,
    };

    // Session lifecycle
    this.createdAt = Date.now();
    this.lastModifiedAt = Date.now();
    this.checkpoints = [];           // Auto-save points

    // Persistence hooks (Phase 1: Session persistence)
    this._persistenceHooks = [];      // Callbacks called after each commit

    // Validation/schema tracking
    this._schema = this._buildSchema();
    this._watchers = new Map();      // For backward compat with buildIntent watchers
  }

  /**
   * Commit a selection to this session.
   * Validates schema and normalizes the value.
   *
   * @param {string} stepId - ID of the step making the commit (for tracking)
   * @param {string} selectionKey - Semantic key (species, class, feats, etc.)
   * @param {*} value - Value to commit (must match schema)
   * @returns {boolean} true if successful
   */
  commitSelection(stepId, selectionKey, value) {
    const selectionAliases = {
      'general-feat': 'feats',
      'class-feat': 'feats',
      'general-talent': 'talents',
      'class-talent': 'talents',
      'force-powers': 'forcePowers',
      'starship-maneuver': 'starshipManeuvers',
      'starship-maneuvers': 'starshipManeuvers',
    };
    selectionKey = selectionAliases[selectionKey] || selectionKey;
    if (!this._schema[selectionKey]) {
      swseLogger.warn(
        `[ProgressionSession] Unknown selection key: ${selectionKey}. Ignoring commit.`
      );
      return false;
    }

    try {
      // Validate schema (basic check — more can be added per type)
      this._validateSelection(selectionKey, value);

      // Write to canonical draftSelections
      this.draftSelections[selectionKey] = value;
      this.lastModifiedAt = Date.now();

      // Trigger watchers for backward compat
      this._triggerWatchers(selectionKey, value);

      // Trigger persistence hooks (Phase 1: auto-save after commit)
      this._triggerPersistenceHooks(stepId, selectionKey);

      swseLogger.debug(
        `[ProgressionSession] Committed ${selectionKey} from ${stepId}`,
        { value }
      );

      return true;
    } catch (err) {
      swseLogger.error(
        `[ProgressionSession] Error committing ${selectionKey}:`,
        err
      );
      return false;
    }
  }

  /**
   * Get a single selection.
   * @param {string} selectionKey
   * @returns {*} The value, or null if not set
   */
  getSelection(selectionKey) {
    return this.draftSelections[selectionKey] ?? null;
  }

  /**
   * Get all selections as a snapshot.
   * @returns {Object} Copy of draftSelections
   */
  getAllSelections() {
    return { ...this.draftSelections };
  }

  /**
   * Register a watcher on a selection.
   * Used by buildIntent and other subsystems that rely on change notifications.
   *
   * @param {string} selectionKey
   * @param {Function} callback - Called with (newValue, oldValue, key)
   * @returns {Function} Unobserve function
   */
  observeSelection(selectionKey, callback) {
    if (typeof callback !== 'function') {
      swseLogger.warn(
        `[ProgressionSession] Invalid callback type for ${selectionKey}`
      );
      return () => {};
    }

    if (!this._watchers.has(selectionKey)) {
      this._watchers.set(selectionKey, []);
    }

    this._watchers.get(selectionKey).push(callback);

    return () => {
      const cbs = this._watchers.get(selectionKey);
      const idx = cbs.indexOf(callback);
      if (idx >= 0) cbs.splice(idx, 1);
    };
  }

  /**
   * Clear all selections (for session reset).
   */
  reset() {
    this.draftSelections = {
      species: null,
      class: null,
      background: null,
      attributes: null,
      skills: null,
      feats: [],
      talents: [],
      languages: [],
      forcePowers: [],
      forceTechniques: [],
      forceSecrets: [],
      starshipManeuvers: [],
      survey: null,
      droid: null,
    };
    this.visitedStepIds = [];
    this.completedStepIds = [];
    this.invalidatedStepIds = [];
    this.projectedCharacter = null;
    this.lastModifiedAt = Date.now();
  }

  /**
   * Export session state as character data for suggestion context.
   * (Backward compat with buildIntent.toCharacterData)
   *
   * @returns {Object}
   */
  toCharacterData() {
    return {
      classes: this.draftSelections.class ? [this.draftSelections.class] : [],
      species: this.draftSelections.species,
      feats: this.draftSelections.feats || [],
      talents: this.draftSelections.talents || [],
      skills: this.draftSelections.skills || {},
      abilityIncreases: this.draftSelections.attributes || {},
      background: this.draftSelections.background,
      languages: this.draftSelections.languages || [],
      forcePowers: this.draftSelections.forcePowers || [],
      forceTechniques: this.draftSelections.forceTechniques || [],
      forceSecrets: this.draftSelections.forceSecrets || [],
      survey: this.draftSelections.survey || null,
    };
  }

  /**
   * Register a persistence hook.
   * Called after each commit to enable auto-save.
   *
   * @param {Function} callback - Called with (session, stepId, selectionKey)
   * @returns {Function} Unregister function
   */
  onPersist(callback) {
    if (typeof callback !== 'function') {
      swseLogger.warn('[ProgressionSession] Invalid persistence hook');
      return () => {};
    }

    this._persistenceHooks.push(callback);

    return () => {
      const idx = this._persistenceHooks.indexOf(callback);
      if (idx >= 0) this._persistenceHooks.splice(idx, 1);
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Internal: Schema and Validation
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Build the schema that describes valid selections.
   * @private
   */
  _buildSchema() {
    return {
      species: {
        type: 'object',
        description: 'Species selection: {id, name, grants, metadata}',
      },
      class: {
        type: 'object',
        description: 'Class selection: {id, name, grants, metadata}',
      },
      background: {
        type: 'object',
        description: 'Background selection: {id, name, grants, metadata}',
      },
      attributes: {
        type: 'object',
        description: '{values: {str,dex,con,int,wis,cha}, increases, metadata}',
      },
      skills: {
        type: 'object',
        description: '{trained: [skillId], source, metadata}',
      },
      feats: {
        type: 'array',
        description: '[{id, source}, ...]',
      },
      talents: {
        type: 'array',
        description: '[{id, treeId, source}, ...]',
      },
      languages: {
        type: 'array',
        description: '[{id, source}, ...]',
      },
      forcePowers: {
        type: 'array',
        description: '[{id, count}, ...]',
      },
      forceTechniques: {
        type: 'array',
        description: '[{id, source}, ...]',
      },
      forceSecrets: {
        type: 'array',
        description: '[{id, source}, ...]',
      },
      starshipManeuvers: {
        type: 'array',
        description: '[{id, source}, ...]',
      },
      survey: {
        type: 'object',
        description: '{archetypeSignals, mentorSignals, preferences}',
      },
      droid: {
        type: 'object',
        description:
          '{frame, systems, locomotion, creditsUsed, metadata}',
      },
      pendingSpeciesContext: {
        type: 'object',
        description: 'Canonical pending species materialization context from species ledger builder',
      },
      pendingBackgroundContext: {
        type: 'object',
        description: 'Canonical pending background materialization context from background ledger builder',
      },
      backgroundLedger: {
        type: 'object',
        description: 'Canonical background grant ledger for selected background set',
      },
    };
  }

  /**
   * Validate a selection before commit.
   * @private
   */
  _validateSelection(selectionKey, value) {
    const schemaDef = this._schema[selectionKey];
    if (!schemaDef) {
      throw new Error(`Unknown selection key: ${selectionKey}`);
    }

    // Basic type check
    if (value === null || value === undefined) {
      // Null is always allowed (represents "not yet selected")
      return;
    }

    const expectedType = schemaDef.type;
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      throw new Error(
        `Type mismatch for ${selectionKey}: expected ${expectedType}, got ${actualType}`
      );
    }
  }

  /**
   * Trigger watchers for a selection change.
   * @private
   */
  _triggerWatchers(selectionKey, newValue) {
    const oldValue = this.draftSelections[selectionKey];

    if (this._watchers.has(selectionKey)) {
      this._watchers.get(selectionKey).forEach(callback => {
        try {
          callback(newValue, oldValue, selectionKey);
        } catch (err) {
          swseLogger.error(
            `[ProgressionSession] Watcher error for ${selectionKey}:`,
            err
          );
        }
      });
    }
  }

  /**
   * Trigger persistence hooks after a commit.
   * Phase 1: Auto-save session state.
   * @private
   */
  _triggerPersistenceHooks(stepId, selectionKey) {
    for (const hook of this._persistenceHooks) {
      try {
        hook(this, stepId, selectionKey);
      } catch (err) {
        swseLogger.error(
          `[ProgressionSession] Persistence hook error:`,
          err
        );
      }
    }
  }

  /**
   * Create an immutable snapshot of an actor.
   * Prevents accidental reads from live actor during draft.
   * @private
   */
  _snapshotActor(actor) {
    if (!actor) return null;

    return {
      id: actor.id,
      name: actor.name,
      type: actor.type,
      system: actor.system ? JSON.parse(JSON.stringify(actor.system)) : {},
      items: actor.items
        ? actor.items.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            system: item.system ? JSON.parse(JSON.stringify(item.system)) : {},
          }))
        : [],
    };
  }

  /**
   * Debug: Dump current state
   */
  debug() {
    return {
      mode: this.mode,
      subtype: this.subtype,
      draftSelections: this.draftSelections,
      completedSteps: this.completedStepIds,
      invalidatedSteps: this.invalidatedStepIds,
      derivedEntitlements: this.derivedEntitlements,
      createdAt: new Date(this.createdAt).toISOString(),
      lastModifiedAt: new Date(this.lastModifiedAt).toISOString(),
    };
  }
}
