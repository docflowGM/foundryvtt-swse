/**
 * AbilityEngine — Phase 6: Authority Boundary Realignment
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  AUTHORITY BOUNDARY: PUBLIC "MAY I ACQUIRE?" DOOR                  │
 * │                                                                     │
 * │  AbilityEngine = "May I?" (acquisition legality authority)         │
 * │  ↓ delegates to                                                     │
 * │  PrerequisiteChecker / PrerequisiteEvaluator = "Do the rules say?" │
 * │  ↓ uses                                                             │
 * │  ActorPrerequisiteSnapshot + PrerequisiteNormalizer = "What does   │
 * │  the actor have and what do the requirements mean?"                 │
 * │  ↓ result flows back up to                                          │
 * │  AbilityEngine returns canonical result to UI / progression        │
 * │  ↓                                                                  │
 * │  ActorEngine / MutationCoordinator applies if legal                │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Responsibilities:
 * - Evaluate whether an actor can acquire a specific item (feat, talent, class, etc.)
 * - Delegate to PrerequisiteChecker for all prerequisite evaluation — do NOT re-implement rules
 * - Return standardized legality assessment including unresolved/advisory requirements
 * - Surface advisory/table-state requirements so UI can distinguish hard-fail from advisory
 *
 * Result shape (stable API):
 *   {
 *     legal: boolean,            // All HARD prerequisites met — can acquire now
 *     eligible: boolean,         // Alias for legal (for Phase 4 suggestion engine)
 *     permanentlyBlocked: boolean,
 *     missingPrereqs: string[],  // Hard failures (backward compat alias for missing)
 *     missing: string[],         // Hard failures
 *     blockingReasons: string[], // Hard failures (backward compat alias)
 *     reasons: string[],         // Alias for blockingReasons
 *     unresolved: string[],      // Advisory / table-state prerequisites (NOT auto-verifiable)
 *     advisory: string[],        // Alias for unresolved
 *     warnings: string[],        // Non-blocking concerns
 *     evaluation: {}             // Phase 3 detailed evaluation data (for debugging)
 *   }
 *
 * CALLERS: chargen-feats-talents, talent steps, MutationCoordinator, PrerequisiteIntegrityChecker
 * DO NOT CALL: PrerequisiteChecker directly from UI — always go through AbilityEngine
 */

import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js";
import { PRESTIGE_PREREQUISITES } from "/systems/foundryvtt-swse/scripts/data/prestige-prerequisites.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { getDroidAcquisitionBlockReason, getOrganicDroidAcquisitionBlockReason } from "/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js";

function emitAbilityTrace(label, payload = {}) {
  // Only emit trace logs when debug mode is enabled
  if (!game?.settings?.get?.('foundryvtt-swse', 'debugMode')) {
    return;
  }
  try {
    SWSELogger.debug(`[PREREQ TRACE] ${label}`, payload);
  } catch (_err) {
    // no-op
  }
}


function stableAbilityStringify(value, depth = 0) {
  if (depth > 5) return '...';
  if (value === null || value === undefined) return String(value);
  const type = typeof value;
  if (type === 'number' || type === 'boolean' || type === 'string') return JSON.stringify(value);
  if (type !== 'object') return JSON.stringify(String(value));
  if (Array.isArray(value)) return `[${value.map(entry => stableAbilityStringify(entry, depth + 1)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableAbilityStringify(value[key], depth + 1)}`).join(',')}}`;
}

function duplicateAbilityAssessment(value) {
  if (!value || typeof value !== 'object') return value;
  try {
    if (typeof foundry?.utils?.duplicate === 'function') return foundry.utils.duplicate(value);
  } catch (_err) {
    // fall through
  }
  try {
    return structuredClone(value);
  } catch (_err) {
    return JSON.parse(JSON.stringify(value));
  }
}

export class AbilityEngine {
  static _acquisitionCache = new Map();
  static _acquisitionCacheOrder = [];
  static _acquisitionCacheMax = 800;

  static _actorCacheSignature(actor) {
    if (!actor) return 'no-actor';
    const revision = actor?._stats?.modifiedTime
      ?? actor?._source?._stats?.modifiedTime
      ?? actor?.system?._version
      ?? actor?.system?.modifiedTime
      ?? null;
    const itemSignature = Array.from(actor?.items ?? [])
      .map(item => [
        item?.id ?? item?._id ?? 'no-id',
        item?.type ?? 'unknown',
        item?._stats?.modifiedTime ?? item?._source?._stats?.modifiedTime ?? item?.system?._version ?? '',
        item?.name ?? ''
      ].join(':'))
      .join('|');

    if (revision) {
      return [actor?.id ?? actor?._id ?? 'no-id', actor?.type ?? 'unknown', revision, actor?.items?.size ?? actor?.items?.length ?? 0, itemSignature].join('::');
    }

    // Projection/test actors may not have Foundry revision metadata. Fall back
    // to a compact stable signature so cached legality does not leak across
    // different actor snapshots.
    return stableAbilityStringify({
      id: actor?.id ?? actor?._id ?? null,
      type: actor?.type ?? null,
      system: actor?.system ?? null,
      items: Array.from(actor?.items ?? []).map(item => ({
        id: item?.id ?? item?._id ?? null,
        type: item?.type ?? null,
        name: item?.name ?? null,
        system: item?.system ?? null
      }))
    });
  }

  static _candidateCacheSignature(candidate) {
    if (typeof candidate === 'string') return `string:${candidate.trim().toLowerCase()}`;
    if (!candidate || typeof candidate !== 'object') return 'no-candidate';
    return stableAbilityStringify({
      id: candidate?._id ?? candidate?.id ?? candidate?.uuid ?? null,
      type: candidate?.type ?? null,
      name: candidate?.name ?? null,
      system: candidate?.system ?? null,
      flags: candidate?.flags ?? null
    });
  }

  static _pendingCacheSignature(pending = {}) {
    return stableAbilityStringify(pending || {});
  }

  static _buildAcquisitionCacheKey(actor, candidate, pending = {}) {
    return [
      this._actorCacheSignature(actor),
      this._candidateCacheSignature(candidate),
      this._pendingCacheSignature(pending)
    ].join('||');
  }

  static _getCachedAcquisition(cacheKey) {
    if (!cacheKey) return null;
    const entry = this._acquisitionCache.get(cacheKey);
    return entry ? duplicateAbilityAssessment(entry) : null;
  }

  static _setCachedAcquisition(cacheKey, assessment) {
    if (!cacheKey || !assessment || typeof assessment !== 'object') return;
    this._acquisitionCache.set(cacheKey, duplicateAbilityAssessment(assessment));
    const existing = this._acquisitionCacheOrder.indexOf(cacheKey);
    if (existing >= 0) this._acquisitionCacheOrder.splice(existing, 1);
    this._acquisitionCacheOrder.push(cacheKey);
    while (this._acquisitionCacheOrder.length > this._acquisitionCacheMax) {
      const stale = this._acquisitionCacheOrder.shift();
      if (stale) this._acquisitionCache.delete(stale);
    }
  }

  static clearAcquisitionCache() {
    this._acquisitionCache.clear();
    this._acquisitionCacheOrder.length = 0;
  }
  /**
   * Evaluate whether an actor can acquire a candidate item.
   *
   * This is the SOVEREIGN AUTHORITY on legality.
   * PrerequisiteChecker is delegated to internally.
   * No other system calls PrerequisiteChecker directly.
   *
   * @param {Object} actor - Actor document
   * @param {Object|string} candidate - Item being evaluated (feat, talent, class, power, etc.)
   * @param {Object} pending - Pending selections {selectedFeats, selectedTalents, etc.}
   * @returns {Object} Standardized legality assessment
   *   {
   *     legal: boolean,                    // Can acquire now
   *     permanentlyBlocked: boolean,       // Can never acquire (incompatible)
   *     missingPrereqs: string[],          // Unmet prerequisites
   *     blockingReasons: string[]          // Human-readable blocking reasons
   *   }
   */
  static evaluateAcquisition(actor, candidate, pending = {}) {
    if (!actor || !candidate) {
      return {
        legal: false,
        permanentlyBlocked: true,
        missingPrereqs: ['Invalid actor or candidate'],
        blockingReasons: ['Cannot evaluate invalid inputs']
      };
    }

    const cacheKey = this._buildAcquisitionCacheKey(actor, candidate, pending);
    const cached = this._getCachedAcquisition(cacheKey);
    if (cached) return cached;

    try {
      emitAbilityTrace('EVALUATE_START', {
        actorName: actor?.name || null,
        candidateName: typeof candidate === 'string' ? candidate : candidate?.name || candidate?.id || null,
        candidateType: typeof candidate === 'string' ? 'string' : candidate?.type || 'unknown',
        rawPrerequisite: typeof candidate === 'object'
          ? (candidate?.system?.prerequisite || candidate?.system?.prerequisites || null)
          : null,
        pendingKeys: Object.keys(pending || {}),
      });
      const droidBlockReason = getDroidAcquisitionBlockReason(actor, candidate, pending)
        || getOrganicDroidAcquisitionBlockReason(actor, candidate, pending);
      if (droidBlockReason) {
        const assessment = {
          legal: false,
          eligible: false,
          permanentlyBlocked: true,
          missingPrereqs: [droidBlockReason],
          missing: [droidBlockReason],
          blockingReasons: [droidBlockReason],
          reasons: [droidBlockReason],
          unresolved: [],
          advisory: [],
          warnings: [],
          evaluation: { details: { droidChassisGate: droidBlockReason }, met: false },
        };
        this._setCachedAcquisition(cacheKey, assessment);
        return duplicateAbilityAssessment(assessment);
      }

      // Detect candidate type (fix operator precedence)
      let type;
      if (typeof candidate === 'string') {
        type = 'unknown';  // String candidates are bare names, type unknown
      } else {
        type = candidate.type || 'unknown';  // Object candidate should have type field
      }

      let result = { met: false, missing: [], details: {} };

      // Route to appropriate PrerequisiteChecker method
      if (type === 'feat' || (typeof candidate === 'string' && this._isLikelyFeat(candidate))) {
        result = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate, pending);
      } else if (type === 'talent') {
        result = PrerequisiteChecker.checkTalentPrerequisites(actor, candidate, pending);
      } else if (type === 'class') {
        // Detect prestige vs base classes and route appropriately
        const className = typeof candidate === 'string' ? candidate : candidate?.name;
        if (className && className in PRESTIGE_PREREQUISITES) {
          // Prestige class - use prestige-specific checker
          result = PrerequisiteChecker.checkPrestigeClassPrerequisites(actor, className, pending);
        } else {
          // Base class - use generic class checker
          result = PrerequisiteChecker.checkClassLevelPrerequisites(actor, candidate, pending);
        }
      } else if (type === 'power' || type === 'force-power') {
        // Force powers use feat prerequisite logic (they have prerequisite/prerequisites fields)
        result = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate, pending);
      } else if (type === 'technique' || type === 'force-technique' || type === 'forcetechnique' || type === 'secret' || type === 'force-secret' || type === 'forcesecret') {
        // Force techniques/secrets are their own item domains, but they still use the shared prerequisite grammar.
        result = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate, pending);
      } else {
        // Fallback: try feat, then talent
        result = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate, pending);
        if (!result.met) {
          result = PrerequisiteChecker.checkTalentPrerequisites(actor, candidate, pending);
        }
      }

      // Convert PrerequisiteChecker result to standardized format
      // Phase 6: surface unresolved/advisory from Phase 3 checker result
      const missing = result.missing || [];
      const unresolved = result.unresolved || [];  // advisory / table-state prerequisites
      const warnings = result.warnings || [];
      const legal = result.met === true;

      emitAbilityTrace('EVALUATE_RESULT', {
        actorName: actor?.name || null,
        candidateName: typeof candidate === 'string' ? candidate : candidate?.name || candidate?.id || null,
        candidateType: type,
        met: legal,
        missing,
        unresolved,
        detailsKeys: Object.keys(result?.details || {}),
      });

      const assessment = {
        legal,
        eligible: legal,                 // Phase 4 alias — legal right now
        permanentlyBlocked: false,       // PrerequisiteChecker doesn't distinguish; assume temporary
        // Hard prerequisite failures
        missingPrereqs: missing,         // backward compat
        missing,
        blockingReasons: missing,        // backward compat
        reasons: missing,
        // Advisory / unresolvable prerequisites (table-state, GM approval, org membership, etc.)
        // These do NOT block acquisition mechanically but should be visible to UI/suggestions
        unresolved,
        advisory: unresolved,
        // Non-blocking concerns
        warnings,
        // Phase 3 detailed evaluation (for debugging / diagnostics)
        evaluation: { details: result.details || {}, met: legal },
      };
      this._setCachedAcquisition(cacheKey, assessment);
      return duplicateAbilityAssessment(assessment);
    } catch (err) {
      emitAbilityTrace('EVALUATE_FAILED', {
        actorName: actor?.name || null,
        candidateName: typeof candidate === 'string' ? candidate : candidate?.name || candidate?.id || null,
        candidateType: typeof candidate === 'string' ? 'string' : candidate?.type || 'unknown',
        error: err?.message || String(err),
      });
      SWSELogger.error('[AbilityEngine.evaluateAcquisition]', err);
      return {
        legal: false,
        eligible: false,
        permanentlyBlocked: true,
        missingPrereqs: ['Evaluation error'],
        missing: ['Evaluation error'],
        blockingReasons: [err.message || 'Unknown error evaluating prerequisites'],
        reasons: [err.message || 'Unknown error evaluating prerequisites'],
        unresolved: [],
        advisory: [],
        warnings: [],
        evaluation: {},
      };
    }
  }

  /**
   * Quick check: can this candidate be acquired?
   * Returns boolean (true if legal).
   *
   * @param {Object} actor - Actor document
   * @param {Object|string} candidate - Item being evaluated
   * @param {Object} pending - Pending selections
   * @returns {boolean}
   */
  static canAcquire(actor, candidate, pending = {}) {
    const assessment = this.evaluateAcquisition(actor, candidate, pending);
    return assessment.legal === true;
  }

  /**
   * Get unmet requirements for a candidate.
   *
   * @param {Object} actor - Actor document
   * @param {Object|string} candidate - Item being evaluated
   * @param {Object} pending - Pending selections
   * @returns {string[]} Array of unmet requirement descriptions
   */
  static getUnmetRequirements(actor, candidate, pending = {}) {
    const assessment = this.evaluateAcquisition(actor, candidate, pending);
    return assessment.missingPrereqs;
  }

  /**
   * Filter feats to only those an actor qualifies for.
   * Adds isQualified and prerequisiteReasons fields to each feat.
   *
   * @param {Array} feats - Array of feat items
   * @param {Actor} actor - The actor
   * @param {Object} pending - Pending selections
   * @returns {Array} Feats with isQualified and prerequisiteReasons added
   */
  static filterQualifiedFeats(feats, actor, pending = {}) {
    return feats.map(feat => {
      const assessment = this.evaluateAcquisition(actor, feat, pending);
      return {
        ...feat,
        isQualified: assessment.legal,
        prerequisiteReasons: assessment.missingPrereqs
      };
    });
  }

  /**
   * Filter talents to only those an actor qualifies for.
   * Adds isQualified and prerequisiteReasons fields to each talent.
   *
   * @param {Array} talents - Array of talent items
   * @param {Actor} actor - The actor
   * @param {Object} pending - Pending selections
   * @returns {Array} Talents with isQualified and prerequisiteReasons added
   */
  static filterQualifiedTalents(talents, actor, pending = {}) {
    return talents.map(talent => {
      const assessment = this.evaluateAcquisition(actor, talent, pending);
      return {
        ...talent,
        isQualified: assessment.legal,
        prerequisiteReasons: assessment.missingPrereqs
      };
    });
  }

  /**
   * Check if an actor can access a talent tree.
   *
   * @param {Actor} actor - The actor
   * @param {string} treeId - The talent tree ID
   * @param {Object} pending - Pending selections
   * @returns {Promise<boolean>} True if the actor can access the tree
   */
  static async canAccessTalentTree(actor, treeId, pending = {}) {
    return PrerequisiteChecker.canAccessTalentTree(actor, treeId);
  }

  /**
   * Evaluate whether an actor can acquire a prestige class.
   *
   * @param {Object} actor - Actor document
   * @param {string} className - Prestige class name
   * @param {Object} pending - Pending selections
   * @returns {Object} Standardized legality assessment
   */
  static evaluatePrestigeClassAcquisition(actor, className, pending = {}) {
    if (!actor || !className) {
      return {
        legal: false,
        permanentlyBlocked: true,
        missingPrereqs: ['Invalid actor or class name'],
        blockingReasons: ['Cannot evaluate invalid inputs']
      };
    }

    try {
      const droidBlockReason = getOrganicDroidAcquisitionBlockReason(actor, { name: className, type: 'class' }, pending);
      if (droidBlockReason) {
        return {
          legal: false,
          eligible: false,
          permanentlyBlocked: true,
          missingPrereqs: [droidBlockReason],
          missing: [droidBlockReason],
          blockingReasons: [droidBlockReason],
          reasons: [droidBlockReason],
          unresolved: [],
          advisory: [],
          warnings: [],
          evaluation: { details: { droidChassisGate: droidBlockReason }, met: false },
        };
      }

      const result = PrerequisiteChecker.checkPrestigeClassPrerequisites(actor, className, pending);
      const missing = result.missing || [];
      const unresolved = result.unresolved || [];
      const legal = result.met === true;
      return {
        legal,
        eligible: legal,
        permanentlyBlocked: false,
        missingPrereqs: missing,
        missing,
        blockingReasons: missing,
        reasons: missing,
        unresolved,
        advisory: unresolved,
        warnings: result.warnings || [],
        evaluation: { details: result.details || {}, special: result.special || null },
      };
    } catch (err) {
      SWSELogger.error('[AbilityEngine.evaluatePrestigeClassAcquisition]', err);
      return {
        legal: false,
        eligible: false,
        permanentlyBlocked: true,
        missingPrereqs: ['Evaluation error'],
        missing: ['Evaluation error'],
        blockingReasons: [err.message || 'Unknown error evaluating prerequisites'],
        reasons: [err.message || 'Unknown error evaluating prerequisites'],
        unresolved: [],
        advisory: [],
        warnings: [],
        evaluation: {},
      };
    }
  }

  /**
   * Get card panel model for actor abilities (legacy)
   * @param {Actor} actor - The actor to get abilities for
   * @returns {Object} Model with all, feats, talents, racialAbilities
   */
  static getCardPanelModelForActor(actor) {
    return {
      all: [],
      feats: [],
      talents: [],
      racialAbilities: []
    };
  }

  /**
   * WAVE 3: Metadata Accessors
   * These methods provide structural queries (not legality checks).
   * They delegate to PrerequisiteChecker for data retrieval.
   */

  /**
   * Get feats granted by a class (via houserules or class definition).
   *
   * @param {Actor} actor - The actor
   * @param {Object} classDoc - The class document
   * @returns {Array} Feats granted by this class
   */
  static getGrantedFeats(actor, classDoc = null, pending = {}) {
    return PrerequisiteChecker.getAllGrantedFeats(actor, classDoc, pending);
  }

  /**
   * Load talent tree access rules from storage.
   *
   * @returns {Promise<Object>} Talent tree access rules
   */
  static async loadTalentTreeAccessRules() {
    return PrerequisiteChecker._loadTalentTreeAccessRules();
  }

  /**
   * Batch check prerequisites for a snapshot (progression compilation).
   *
   * @param {Object} snapshot - Actor snapshot from progression engine
   * @param {string} type - Item type ('feat' or 'talent')
   * @param {string} itemId - Item ID to check
   * @returns {Object} Prerequisite check result
   */
  static checkPrerequisites(snapshot, type, itemId) {
    return PrerequisiteChecker.checkPrerequisites(snapshot, type, itemId);
  }

  /**
   * Helper: Guess if a string-based candidate is likely a feat.
   * @private
   */
  static _isLikelyFeat(candidateString) {
    // If it looks like a feat name, treat as feat
    // This is a fallback heuristic; explicit type is preferred
    return typeof candidateString === 'string';
  }
}
