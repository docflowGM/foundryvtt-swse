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
    this.sessionId = `${mode}-${this.actorId || 'unknown'}-${Date.now()}`;
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
      forceRegimens: [],
      forceTechniques: [],
      forceSecrets: [],
      medicalSecrets: [],
      starshipManeuvers: [],
      survey: null,
      prestigeSurvey: null,
      classSurveyDrafts: {},
      classSurveys: {},
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

    // Canonical mentor identity context for the progression rail. This is
    // intentionally separate from advisory text: identity should remain stable
    // once high-confidence class context exists, while dialogue lines can fall
    // back independently per step.
    this.mentorContext = this._createDefaultMentorContext('session initialized');

    // Non-blocking mentor diagnostics. These breadcrumbs help identify why a
    // rail fell through to generic guidance without making dialogue lookup a
    // progression blocker.
    this.mentorDiagnostics = {
      contextUpdates: [],
      preservedContexts: [],
      choiceReactions: [],
      skippedReactions: [],
      coverageWarnings: [],
      fallbackPaths: [],
    };

    // Commit diagnostics are non-blocking breadcrumbs. A bad step commit must
    // never destroy the last known-good draft selections.
    this.commitDiagnostics = {
      coercedCommits: [],
      failedCommits: [],
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
      'force-regimens': 'forceRegimens',
      'force-secrets': 'forceSecrets',
      'force-techniques': 'forceTechniques',
      'medical-secrets': 'medicalSecrets',
      'starship-maneuver': 'starshipManeuvers',
      'starship-maneuvers': 'starshipManeuvers',
      'prestige-survey': 'prestigeSurvey',
    };
    selectionKey = selectionAliases[selectionKey] || selectionKey;
    if (!this._schema[selectionKey]) {
      swseLogger.warn(
        `[ProgressionSession] Unknown selection key: ${selectionKey}. Ignoring commit.`
      );
      return false;
    }

    try {
      // Coerce known legacy/step-local payloads into the canonical schema before
      // validating. This keeps one bad step payload from throwing away or hiding
      // the rest of the recovered chargen state.
      const normalizedValue = this._coerceSelectionToSchema(selectionKey, value, { stepId });

      // Validate schema (basic check — more can be added per type)
      this._validateSelection(selectionKey, normalizedValue);

      // Write to canonical draftSelections only after validation succeeds. The
      // previous value remains intact if validation fails. Array-backed ability
      // domains are append/replace-by-slot safe so legacy singleton commits can
      // never erase the rest of a build at Summary.
      const previousValue = this.draftSelections[selectionKey];
      const valueToStore = this._mergeArraySelection(selectionKey, normalizedValue, { stepId });

      // No-op unchanged commits. This is important for Summary/Business Items
      // and language selection: repeated render-time validation must never cause
      // actor flag writes, queued sheet renders, or active-step recomputation.
      if (this._selectionValuesEqual(previousValue, valueToStore)) {
        swseLogger.debug(`[ProgressionSession] Ignored unchanged ${selectionKey} commit from ${stepId}`);
        return true;
      }

      this.draftSelections[selectionKey] = valueToStore;
      this.lastModifiedAt = Date.now();

      // Trigger watchers for backward compat
      this._triggerWatchers(selectionKey, valueToStore, previousValue);

      // Trigger persistence hooks (Phase 1: auto-save after commit)
      this._triggerPersistenceHooks(stepId, selectionKey);

      swseLogger.debug(
        `[ProgressionSession] Committed ${selectionKey} from ${stepId}`,
        { value: valueToStore }
      );

      return true;
    } catch (err) {
      this._recordCommitDiagnostic('failed', {
        stepId,
        selectionKey,
        expectedType: this._schema?.[selectionKey]?.type || 'unknown',
        actualType: Array.isArray(value) ? 'array' : typeof value,
        message: err?.message || String(err),
      });
      swseLogger.error(
        `[ProgressionSession] Error committing ${selectionKey}; preserving previous valid selection:`,
        err
      );
      // Force a persistence pass for the last known-good state. Failed commits
      // should be recoverable breadcrumbs, not data loss events.
      this._triggerPersistenceHooks(stepId || 'failed-commit', `${selectionKey}:failed`);
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
   * Return a snapshot of the canonical mentor identity context.
   * @returns {Object|null}
   */
  getMentorContext() {
    return this.mentorContext ? { ...this.mentorContext } : null;
  }

  /**
   * Update the canonical mentor identity context with sticky high-confidence
   * behavior. Low-confidence fallbacks should never overwrite a class-selected
   * mentor during chargen rerenders or async hydration gaps.
   *
   * @param {Object} nextContext
   * @param {Object} options
   * @param {boolean} options.force
   * @returns {Object|null}
   */
  updateMentorContext(nextContext = null, options = {}) {
    if (!nextContext) return this.getMentorContext();

    const current = this.mentorContext || null;
    const currentConfidence = Number(current?.confidence ?? 0) || 0;
    const nextConfidence = Number(nextContext?.confidence ?? 0) || 0;
    const force = options.force === true
      || ['manual', 'class-selection', 'prestige-selection'].includes(nextContext.source);

    const shouldKeepCurrent = !force
      && current
      && (current.mentorId || current.mentorKey)
      && (
        (currentConfidence >= 0.85 && nextConfidence < 0.65)
        || (current.source === 'class-selection' && nextContext.fallback === true)
      );

    if (shouldKeepCurrent) {
      this._recordMentorDiagnostic('preservedContexts', {
        currentSource: current?.source,
        currentMentorId: current?.mentorId || current?.mentorKey,
        currentConfidence,
        attemptedSource: nextContext?.source,
        attemptedMentorId: nextContext?.mentorId || nextContext?.mentorKey,
        attemptedConfidence: nextConfidence,
        attemptedFallback: nextContext?.fallback === true,
      });
      return this.getMentorContext();
    }

    this.mentorContext = {
      ...current,
      ...nextContext,
      lastResolvedAt: Date.now(),
    };
    this._recordMentorDiagnostic('contextUpdates', {
      mentorId: this.mentorContext.mentorId || this.mentorContext.mentorKey,
      className: this.mentorContext.className || null,
      source: this.mentorContext.source,
      confidence: this.mentorContext.confidence,
      fallback: this.mentorContext.fallback === true,
      stepId: this.mentorContext.stepId || null,
    });
    this.advisoryContext.mentorId = this.mentorContext.mentorId || this.mentorContext.mentorKey || this.advisoryContext.mentorId;
    this.lastModifiedAt = Date.now();
    return this.getMentorContext();
  }



  _createDefaultMentorContext(reason = 'default mentor context') {
    return {
      mentorId: 'Scoundrel',
      mentorKey: 'Scoundrel',
      className: null,
      stepId: null,
      source: 'fallback',
      confidence: 0.1,
      reason,
      fallback: true,
      lastResolvedAt: Date.now(),
    };
  }

  _recordMentorDiagnostic(bucket, entry = {}) {
    if (!this.mentorDiagnostics) {
      this.mentorDiagnostics = { contextUpdates: [], preservedContexts: [], choiceReactions: [], skippedReactions: [], coverageWarnings: [], fallbackPaths: [] };
    }
    if (!Array.isArray(this.mentorDiagnostics[bucket])) {
      this.mentorDiagnostics[bucket] = [];
    }
    this.mentorDiagnostics[bucket].push({ ...entry, timestamp: Date.now() });
    if (this.mentorDiagnostics[bucket].length > 25) {
      this.mentorDiagnostics[bucket].shift();
    }
  }

  clearSelection(selectionKey) {
    if (!this._schema[selectionKey] && !(selectionKey in this.draftSelections)) return false;
    const defaults = {
      feats: [],
      talents: [],
      languages: [],
      forcePowers: [],
      forceRegimens: [],
      forceTechniques: [],
      forceSecrets: [],
      medicalSecrets: [],
      starshipManeuvers: [],
      pendingEntitlements: [],
      immediateChoices: [],
      classSurveys: {},
      classSurveyDrafts: {},
      survey: null,
      prestigeSurvey: null,
      skills: null,
      attributes: null,
    };
    const previousValue = this.draftSelections[selectionKey];
    const nextValue = Object.prototype.hasOwnProperty.call(defaults, selectionKey) ? defaults[selectionKey] : null;
    if (this._selectionValuesEqual(previousValue, nextValue)) return true;
    this.draftSelections[selectionKey] = nextValue;
    this.lastModifiedAt = Date.now();
    this._triggerWatchers(selectionKey, this.draftSelections[selectionKey], previousValue);
    this._triggerPersistenceHooks('clear-selection', selectionKey);
    return true;
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
      forceRegimens: [],
      forceTechniques: [],
      forceSecrets: [],
      medicalSecrets: [],
      starshipManeuvers: [],
      pendingEntitlements: [],
      immediateChoices: [],
      survey: null,
      prestigeSurvey: null,
      classSurveyDrafts: {},
      classSurveys: {},
      droid: null,
    };
    this.visitedStepIds = [];
    this.completedStepIds = [];
    this.invalidatedStepIds = [];
    this.projectedCharacter = null;
    this.mentorContext = this._createDefaultMentorContext('session reset');
    this.mentorDiagnostics = { contextUpdates: [], preservedContexts: [], choiceReactions: [], skippedReactions: [], coverageWarnings: [], fallbackPaths: [] };
    this.advisoryContext.mentorId = this.mentorContext.mentorId;
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
      forceRegimens: this.draftSelections.forceRegimens || [],
      forceTechniques: this.draftSelections.forceTechniques || [],
      forceSecrets: this.draftSelections.forceSecrets || [],
      medicalSecrets: this.draftSelections.medicalSecrets || [],
      survey: this.draftSelections.survey?.completed === true ? this.draftSelections.survey : null,
      prestigeSurvey: this.draftSelections.prestigeSurvey?.completed === true ? this.draftSelections.prestigeSurvey : null,
      classSurveys: Object.fromEntries(
        Object.entries(this.draftSelections.classSurveys || {}).filter(([, survey]) => survey?.completed === true)
      ),
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
      forceRegimens: {
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
      medicalSecrets: {
        type: 'array',
        description: '[{id, source}, ...]',
      },
      classSurveyDrafts: {
        type: 'object',
        description: 'Draft-only base-class survey answers keyed by class id; never consumed by suggestion bias',
      },
      classSurveys: {
        type: 'object',
        description: 'Completed-only base-class survey responses keyed by class id',
      },
      starshipManeuvers: {
        type: 'array',
        description: '[{id, source}, ...]',
      },
      survey: {
        type: 'object',
        description: '{archetypeSignals, mentorSignals, preferences}',
      },
      prestigeSurvey: {
        type: 'object',
        description: '{classId, commitment, specialization, profileReading, metadata}',
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
      pendingEntitlements: {
        type: 'array',
        description: 'Pending level-up subsystem picks granted by feat/class/talent selections',
      },
      immediateChoices: {
        type: 'array',
        description: 'Choice-bearing feat/talent selections resolved at their owning step',
      },
    };
  }

  /**
   * Coerce legacy step-local payloads into canonical selection shapes.
   * This is intentionally conservative: it only reshapes recognizable wrapper
   * objects for array-typed selections. Unrecognized data still fails validation
   * without replacing the prior valid selection.
   * @private
   */
  _coerceSelectionToSchema(selectionKey, value, context = {}) {
    const schemaDef = this._schema?.[selectionKey];
    if (!schemaDef || value === null || value === undefined) return value;

    if (schemaDef.type === 'array') {
      if (Array.isArray(value)) return this._normalizeArraySelection(selectionKey, value);

      if (typeof value === 'object') {
        const candidate = this._extractArrayCandidate(selectionKey, value);
        const rawArray = Array.isArray(candidate) ? candidate : [value];
        const coerced = this._normalizeArraySelection(selectionKey, rawArray);
        this._recordCommitDiagnostic('coerced', {
          stepId: context.stepId || null,
          selectionKey,
          fromType: 'object',
          toType: 'array',
          count: coerced.length,
        });
        swseLogger.warn(`[ProgressionSession] Coerced ${selectionKey} commit into canonical array`, {
          stepId: context.stepId,
          count: coerced.length,
        });
        return coerced;
      }
    }

    return value;
  }

  /** @private */
  _extractArrayCandidate(selectionKey, value) {
    if (!value || typeof value !== 'object') return null;

    if (selectionKey === 'languages') {
      return value.selectedBonusLanguages
        || value.bonusLanguages
        || value.selectedLanguages
        || value.selected
        || value.languages
        || value.items
        || value.values
        || null;
    }

    return value.selected
      || value.selections
      || value.items
      || value.values
      || value[selectionKey]
      || null;
  }

  /** @private */
  _normalizeArraySelection(selectionKey, entries) {
    if (!Array.isArray(entries)) return entries;

    if (selectionKey !== 'languages') return entries;

    return entries
      .map(entry => {
        if (typeof entry === 'string') return { id: entry, name: entry, source: 'selected' };
        if (!entry || typeof entry !== 'object') return null;
        const id = entry.id || entry.key || entry.slug || entry.name || entry.label;
        if (!id) return null;
        return {
          ...entry,
          id,
          name: entry.name || entry.label || id,
          source: entry.source || 'selected',
        };
      })
      .filter(Boolean);
  }

  /** @private */
  _mergeArraySelection(selectionKey, normalizedValue, context = {}) {
    const schemaDef = this._schema?.[selectionKey];
    if (schemaDef?.type !== 'array') return normalizedValue;
    if (!Array.isArray(normalizedValue)) return normalizedValue;

    // Full array commits from modern steps replace the prior array. Singleton
    // legacy object commits may be merged by id so a single feat/talent choice
    // cannot erase the rest of the draft. Languages intentionally replace: the
    // language step owns the entire bonus-language list.
    if (selectionKey === 'languages') return this._dedupeSelectionArray(normalizedValue);
    if (normalizedValue.length !== 1 || !this._isSelectionLikeObject(normalizedValue[0])) {
      return this._dedupeSelectionArray(normalizedValue);
    }

    const previous = Array.isArray(this.draftSelections?.[selectionKey])
      ? this.draftSelections[selectionKey]
      : [];
    const incoming = normalizedValue[0];
    const incomingKey = this._entryIdentityKey(incoming);
    if (!incomingKey) return this._dedupeSelectionArray(normalizedValue);

    const merged = previous.filter(entry => this._entryIdentityKey(entry) !== incomingKey);
    merged.push(incoming);
    return this._dedupeSelectionArray(merged);
  }

  /** @private */
  _dedupeSelectionArray(entries = []) {
    const seen = new Set();
    const out = [];
    for (const entry of entries || []) {
      const key = this._entryIdentityKey(entry) || this._stableSelectionStringify(entry);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(entry);
    }
    return out;
  }

  /** @private */
  _entryIdentityKey(entry) {
    if (entry === null || entry === undefined) return '';
    if (typeof entry !== 'object') return String(entry);
    const raw = entry.uuid || entry.id || entry._id || entry.key || entry.slug || entry.name || entry.label;
    return raw ? String(raw).trim().toLowerCase() : '';
  }

  /** @private */
  _isSelectionLikeObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value)
      && !!(value.uuid || value.id || value._id || value.key || value.slug || value.name || value.label);
  }

  /** @private */
  _selectionValuesEqual(a, b) {
    return this._stableSelectionStringify(a) === this._stableSelectionStringify(b);
  }

  /** @private */
  _stableSelectionStringify(value) {
    const normalize = (input) => {
      if (Array.isArray(input)) return input.map(normalize);
      if (!input || typeof input !== 'object') return input;
      return Object.keys(input).sort().reduce((out, key) => {
        if (typeof input[key] === 'function') return out;
        out[key] = normalize(input[key]);
        return out;
      }, {});
    };
    try {
      return JSON.stringify(normalize(value));
    } catch (_err) {
      return String(value);
    }
  }

  /** @private */
  _recordCommitDiagnostic(kind, detail = {}) {
    if (!this.commitDiagnostics) {
      this.commitDiagnostics = { coercedCommits: [], failedCommits: [] };
    }
    const key = kind === 'coerced' ? 'coercedCommits' : 'failedCommits';
    const list = this.commitDiagnostics[key] || [];
    list.push({ ...detail, timestamp: new Date().toISOString() });
    this.commitDiagnostics[key] = list.slice(-20);
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
  _triggerWatchers(selectionKey, newValue, oldValue = undefined) {
    if (oldValue === undefined) oldValue = this.draftSelections[selectionKey];

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
