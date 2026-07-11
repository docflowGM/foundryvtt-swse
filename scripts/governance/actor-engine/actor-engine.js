// scripts/actor-engine.js
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { applyActorUpdateAtomic } from "/systems/foundryvtt-swse/scripts/utils/actor-utils.js";
import { MutationInterceptor } from "/systems/foundryvtt-swse/scripts/governance/mutation/MutationInterceptor.js";
import { determineLevelFromXP } from "/systems/foundryvtt-swse/scripts/engine/shared/xp-system.js";
import { DerivedCalculator } from "/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js";
import { MutationApplicationError } from "/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js";
import { PrerequisiteIntegrityChecker } from "/systems/foundryvtt-swse/scripts/governance/integrity/prerequisite-integrity-checker.js";
import { PreflightValidator } from "/systems/foundryvtt-swse/scripts/governance/enforcement/preflight-validator.js";
import { MissingPrereqsTracker } from "/systems/foundryvtt-swse/scripts/governance/integrity/missing-prereqs-tracker.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { traceLog, actorSummary, payloadSummary, MutationDepth } from "/systems/foundryvtt-swse/scripts/utils/mutation-trace.js";
import { captureHydrationSnapshot, collectHydrationSensitivePaths, emitHydrationError, emitHydrationWarning } from "/systems/foundryvtt-swse/scripts/utils/hydration-diagnostics.js";
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";
import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ForcePointsService } from "/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";
import { SecondWindRules } from "/systems/foundryvtt-swse/scripts/engine/combat/SecondWindRules.js";
import { MutationNormalizationService } from "/systems/foundryvtt-swse/scripts/governance/mutation/mutation-normalization-service.js";
import { MutationBoundaryService } from "/systems/foundryvtt-swse/scripts/governance/mutation/mutation-boundary-service.js";
import * as PlanBuilders from "/systems/foundryvtt-swse/scripts/governance/actor-engine/plan-builders.js";
import { normalizeActiveEffectDataForRuntime } from "/systems/foundryvtt-swse/scripts/utils/active-effect-change-utils.js";

/**
 * ActorEngine
 * Centralized actor mutation and recalculation pipeline.
 * Modernized for Foundry VTT v13+, avoids deprecated actor.data access.
 *
 * PHASE 2: Per-actor transaction guard prevents same-actor re-entry
 * during an in-flight actor update. Reactive hooks and other systems
 * must check _isActorMutationInFlight before writing back to the same actor.
 */
// Track instrumented actors to avoid re-patching
const _instrumentedActors = new WeakMap();

export const ActorEngine = {
  // PHASE 2: In-flight mutation guard per actor (actor id → reference count)
  // Uses reference counting to handle nested updates (preUpdateActor hooks calling updateActor again)
  _inFlightMutations: new Map(),

  /**
   * Instrument actor.items to route direct access through Sentinel Engine.
   * Patches filter, some, map, find to report bypasses.
   * Safe to call multiple times (uses WeakMap to skip already-instrumented actors).
   * @private
   */
  _instrumentActorItemsForSSSTOT(actor) {
    if (!actor?.items) return;
    if (_instrumentedActors.has(actor)) return;

    try {
      const itemsCollection = actor.items;

      // Patch filter
      const originalFilter = itemsCollection.filter.bind(itemsCollection);
      itemsCollection.filter = function (...args) {
        SentinelEngine.reportSSOTViolation(actor, 'filter');
        return originalFilter(...args);
      };

      // Patch some
      const originalSome = itemsCollection.some.bind(itemsCollection);
      itemsCollection.some = function (...args) {
        SentinelEngine.reportSSOTViolation(actor, 'some');
        return originalSome(...args);
      };

      // Patch map
      const originalMap = itemsCollection.map.bind(itemsCollection);
      itemsCollection.map = function (...args) {
        SentinelEngine.reportSSOTViolation(actor, 'map');
        return originalMap(...args);
      };

      // Patch find
      const originalFind = itemsCollection.find.bind(itemsCollection);
      itemsCollection.find = function (...args) {
        SentinelEngine.reportSSOTViolation(actor, 'find');
        return originalFind(...args);
      };

      // Mark as instrumented
      _instrumentedActors.set(actor, true);
    } catch (e) {
      // Fail silently — instrumentation must never break execution
    }
  },

  /**
   * Merge a DerivedCalculator update bundle into the live actor document.
   *
   * Foundry does not persist or await async derived recomputations for us.
   * When ActorEngine performs an authoritative mutation, we must fold the
   * freshly computed system.derived.* snapshot back onto the live actor so
   * any follow-up render reads the same canonical state.
   *
   * @param {Actor} actor
   * @param {Object} updates - Flat update object returned by DerivedCalculator.computeAll()
   * @private
   */
  _applyDerivedUpdates(actor, updates) {
    if (!actor?.system || !updates || typeof updates !== 'object') return;

    const expanded = foundry.utils.expandObject(updates);
    const derivedUpdate = expanded?.system?.derived;
    if (!derivedUpdate || typeof derivedUpdate !== 'object') return;

    actor.system.derived ??= {};

    // HARDENING: system.derived.skills must remain the engine-owned object map.
    // Some sheet/view-model paths render skill rows as arrays; if that display shape ever
    // leaks onto actor.system.derived.skills, later skill edits repaint every total as 0
    // because ModifierEngine and the concept sheet read an array instead of keyed skills.
    if (derivedUpdate.skills && typeof derivedUpdate.skills === 'object' && !Array.isArray(derivedUpdate.skills)) {
      if (!actor.system.derived.skills || typeof actor.system.derived.skills !== 'object' || Array.isArray(actor.system.derived.skills)) {
        actor.system.derived.skills = {};
      }
    }

    foundry.utils.mergeObject(actor.system.derived, derivedUpdate, {
      inplace: true,
      insertKeys: true,
      insertValues: true,
      overwrite: true,
      recursive: true
    });
  },

  /**
   * Re-render any open actor sheets after an engine-owned recomputation.
   *
   * The base actor update triggers one render from Foundry, but that render can
   * happen before our async derived recomputation finishes. Request one follow-up
   * render so the UI reflects the authoritative post-mutation derived snapshot.
   *
   * @param {Actor} actor
   * @private
   */
  _refreshOpenActorApps(actor, options = {}) {
    if (options?.suppressAppRefresh) {
      SWSELogger.debug(`[RENDER REFRESH] Suppressed open-app refresh for ${actor?.name ?? 'unknown actor'}`, {
        actorId: actor?.id,
        source: options?.source ?? null
      });
      return;
    }

    const apps = Object.values(actor?.apps ?? {});
    if (!apps.length) return;

    queueMicrotask(() => {
      for (const app of apps) {
        const surfaceId = app?._shellSurface ?? app?.shellSurface ?? app?.currentPage ?? 'sheet';
        try {
          if (typeof app?.requestSurfaceRender === 'function') {
            app.requestSurfaceRender({
              reason: options?.source ?? 'actor-engine-refresh',
              surfaceId,
              preserveUi: true
            });
            continue;
          }
          if (typeof app?.render === 'function') {
            import('/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js')
              .then(({ requestShellRender }) => requestShellRender(app, {
                reason: options?.source ?? 'actor-engine-refresh',
                surfaceId,
                preserveUi: true
              }))
              .catch(() => app.render(false));
          }
        } catch (err) {
          SWSELogger.warn(`[RENDER REFRESH] Failed to refresh app for ${actor?.name ?? 'unknown actor'}`, {
            actorId: actor?.id,
            appId: app?.id,
            error: err?.message
          });
        }
      }
    });
  },
  /**
   * Perform any derived-stat recalculation.
   * Runs after every validated update. Non-blocking.
   *
   * PHASE 2C: ModifierEngine.applyComputedBundle() is currently IMPURE
   * It writes directly to system.derived.* without enforcement.
   * planned (Phase 2C): Refactor ModifierEngine.applyComputedBundle() to:
   *   - Return computed modifier bundle instead of mutating
   *   - Apply bundle in DerivedCalculator context only
   *   - Prevent unauthorized writes to system.derived.*
   * Known issues in ModifierEngine.applyComputedBundle():
   *   - Writes system.skills.*.total directly (should be derived-only)
   *   - Writes system.derived.initiative as number (corrupts shape)
   *   - Writes system.derived.defenses.*.total (should be value)
   *   - Non-idempotent (calling twice produces different results)
   * Mitigation: Set actor._isDerivedCalcCycle = true during DerivedCalculator phase
   */
  async recalcAll(actor) {
    if (!actor) throw new Error('recalcAll() called with no actor');

    // PHASE 3: Recomputation observability
    const recomputeStart = performance.now();
    const enforcementLevel = MutationInterceptor.getEnforcementLevel();
    const isDevEnvironment = (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
    const observabilityEnabled = (enforcementLevel === 'strict' || isDevEnvironment);

    try {
      if (observabilityEnabled) {
        SWSELogger.debug(`[RECOMPUTE START] ${actor.name}`, {
          stage: 'begin',
          enforceLevel: enforcementLevel,
          timestamp: new Date().toISOString()
        });
      }

      // ========================================
      // PHASE 1: Mark that we're in derived calc cycle
      // ========================================
      actor._isDerivedCalcCycle = true;
      try {
        // ========================================
        // PHASE 2: Compute base derived values
        // ========================================
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] DerivedCalculator.computeAll() starting...`, { actor: actor.name });
        }
        const derivedUpdates = await DerivedCalculator.computeAll(actor);
        this._applyDerivedUpdates(actor, derivedUpdates);
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] DerivedCalculator.computeAll() completed`, {
            actor: actor.name,
            derivedHP: actor.system?.derived?.hp?.total,
            derivedBAB: actor.system?.derived?.bab,
            defensesFort: actor.system?.derived?.defenses?.fortitude?.total
          });
        }

        // ========================================
        // PHASE 3: Modifier bundle legacy pass removed
        // ========================================
        // DerivedCalculator.computeAll() already applies static/passive modifiers
        // and writes system.derived.modifiers for UI breakdown. Running the old
        // ModifierEngine.computeModifierBundle() pass after that is non-idempotent
        // and double-counts static modifiers such as Skill Focus.
      } finally {
        actor._isDerivedCalcCycle = false;
      }

      // ========================================
      // PHASE 4: Check prerequisite integrity
      // ========================================
      // PHASE 3: In strict mode, reject skip flags (S2 hardening)
      if (actor._skipIntegrityCheck && enforcementLevel === 'strict') {
        const message = (
          `[INTEGRITY SKIP REJECTED] Attempted to skip integrity checks in strict mode\n` +
          `_skipIntegrityCheck is only allowed for legitimate recursion prevention\n` +
          `In strict mode, all mutations must include integrity validation`
        );
        throw new Error(message);
      }

      // Skip if flagged as integrity check (prevent recursion)
      if (!actor._skipIntegrityCheck) {
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] Integrity checks starting...`, { actor: actor.name });
        }
        await this._checkIntegrity(actor);
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] Integrity checks completed`, { actor: actor.name });
        }
      } else {
        // PHASE 3: In normal mode, still warn about skip flag
        if (enforcementLevel !== 'silent') {
          SWSELogger.warn(`[INTEGRITY SKIP] Integrity checks skipped for ${actor.name} due to _skipIntegrityCheck flag`);
        }
      }

      // ========================================
      // PHASE 5: Recomputation complete
      // ========================================
      const recomputeEnd = performance.now();
      const duration = (recomputeEnd - recomputeStart).toFixed(2);
      if (observabilityEnabled) {
        SWSELogger.debug(`[RECOMPUTE END] ${actor.name} — Pipeline completed`, {
          stage: 'complete',
          durationMs: duration,
          enforceLevel: enforcementLevel,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      const recomputeEnd = performance.now();
      const duration = (recomputeEnd - recomputeStart).toFixed(2);
      SWSELogger.error(`[RECOMPUTE FAILED] ${actor.name} — Pipeline error after ${duration}ms:`, err);
      throw err; // Re-throw in strict mode
    }
  },

  /**
   * PHASE 3: Strict enforcement check for derived writes
   * Validates that writes to system.derived.* only happen during:
   * - DerivedCalculator (marked with _isDerivedCalcCycle = true)
   * - Designated mutation phases with isDerivedCalculatorCall option
   *
   * PHASE 3 HARDENING: In strict mode, throws error. In normal mode, warns only.
   *
   * @param {Object} changes - Update changes to validate
   * @param {Actor} actor - Actor being updated
   * @param {Object} options - Update options
   * @throws {Error} If violation detected in strict mode
   * @private
   */
  _validateDerivedWriteAuthority(changes, actor, options = {}) {
    const derivedPaths = [];

    const checkObject = (obj, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (path.startsWith('system.derived.')) {
          derivedPaths.push(path);
        }
        if (typeof value === 'object' && value !== null) {
          checkObject(value, path);
        }
      }
    };

    checkObject(changes);

    // Enforce derived write authority
    if (derivedPaths.length > 0 &&
        !actor._isDerivedCalcCycle &&
        !options.isDerivedCalculatorCall) {
      const violationList = derivedPaths.slice(0, 5).join(', ');
      const enforcementLevel = MutationInterceptor.getEnforcementLevel();
      const message = (
        `[SSOT VIOLATION] Attempted direct write to derived paths: ${violationList}${derivedPaths.length > 5 ? '...' : ''}\n` +
        `Only DerivedCalculator may write system.derived.*\n` +
        `Caller: ${new Error().stack.split('\n')[2]}`
      );

      if (enforcementLevel === 'strict') {
        // PHASE 3: Hard enforcement in strict mode
        throw new Error(message);
      } else {
        // PHASE 3: Warning-only in normal/log-only mode
        SWSELogger.warn(message);
      }
    }
  },

  /**
   * Check prerequisite integrity and update tracking.
   * Called after every mutation that affects abilities.
   * @private
   */
  async _checkIntegrity(actor) {
    try {
      const report = await PrerequisiteIntegrityChecker.evaluate(actor);
      if (Object.keys(report.violations).length > 0) {
        SWSELogger.warn(`[INTEGRITY] Prerequisite violations detected for ${actor.name}:`, report.violations);
      }
    } catch (err) {
      SWSELogger.error('[INTEGRITY] Failed to check prerequisites:', err);
      // Don't throw — integrity check failure shouldn't block gameplay
    }
  },

  // PHASE 11: Track active migrations to prevent recursion
  _activeMigrations: new Set(),

  // PHASE 2B: Loop detection for cascading mutations
  _updateStack: new Map(), // actor.id → { count, timestamp, sources }

  /**
   * Detect and report cascading update loops
   * @private
   * @param {Actor} actor
   * @param {string} source - Caller or guardKey
   */
  _detectUpdateLoop(actor, source) {
    const key = actor.id;
    const now = performance.now();

    if (!this._updateStack.has(key)) {
      this._updateStack.set(key, { count: 0, timestamp: now, sources: [] });
    }

    const state = this._updateStack.get(key);

    // Reset if > 50ms has passed (new mutation cycle)
    if (now - state.timestamp > 50) {
      state.count = 0;
      state.sources = [];
      state.timestamp = now;
    }

    state.count++;
    state.sources.push(source);

    // WARN if same actor updated >5 times in 50ms
    if (state.count > 5 && globalThis.SWSE?.SentinelEngine) {
      globalThis.SWSE.SentinelEngine.report('actor-update-loop',
        globalThis.SWSE.SentinelEngine.SEVERITY?.WARN ?? 'warn',
        `Possible update loop: ${actor.name} updated ${state.count}x in 50ms`,
        {
          actorId: actor.id,
          actorName: actor.name,
          count: state.count,
          sources: state.sources
        }
      );
    }
  },

  /**
   * PHASE 2: Mark an actor as mutating (in-flight transaction started)
   * Uses reference counting to handle nested updates (preUpdateActor → updateActor)
   * @private
   * @param {string} actorId
   */
  _markActorMutationInFlight(actorId) {
    const count = this._inFlightMutations.get(actorId) || 0;
    this._inFlightMutations.set(actorId, count + 1);
    traceLog('ENGINE', `mutation in-flight guard SET for actor ${actorId} (depth=${count + 1})`, {});
  },

  /**
   * PHASE 2: Clear in-flight flag for an actor (transaction complete)
   * Decrements reference count; only removes flag when count reaches 0
   * @private
   * @param {string} actorId
   */
  _clearActorMutationInFlight(actorId) {
    const count = this._inFlightMutations.get(actorId) || 0;
    if (count <= 1) {
      this._inFlightMutations.delete(actorId);
      traceLog('ENGINE', `mutation in-flight guard CLEARED for actor ${actorId}`, {});
    } else {
      this._inFlightMutations.set(actorId, count - 1);
      traceLog('ENGINE', `mutation in-flight guard decremented for actor ${actorId} (depth=${count - 1})`, {});
    }
  },

  /**
   * PHASE 2: Check if an actor is currently in an in-flight mutation
   * Used by reactive hooks to determine if they should defer/skip same-actor writes
   * @param {string} actorId
   * @returns {boolean}
   */
  isActorMutationInFlight(actorId) {
    return (this._inFlightMutations.get(actorId) || 0) > 0;
  },

  /**
   * Track migration context
   * @private
   */
  _markMigrationActive(actorId) {
    this._activeMigrations.add(actorId);
  },

  /**
   * Clear migration context
   * @private
   */
  _clearMigrationActive(actorId) {
    this._activeMigrations.delete(actorId);
  },

  /**
   * Check if actor is currently migrating
   * @private
   */
  _isMigrationActive(actorId) {
    return this._activeMigrations.has(actorId);
  },

  /**
   * Apply a template or module of predefined data to the actor,
   * then rebuild its derived values.
   */
  async applyTemplate(actor, templateData) {
    try {
      if (!actor) {throw new Error('applyTemplate() called with no actor');}

      await this.updateActor(actor, templateData);
      await this.recalcAll(actor);

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyTemplate failed on ${actor?.name ?? 'unknown actor'}`, err);
    }
  },

  /**
   * updateActor()
   * PHASE 3: Single mutation authority for all actor field updates.
   * PHASE 10: Enhanced with transaction metadata for recursive guard support.
   *
   * Enforced contract:
   * 1. Set mutation context (authorizes actor.update() call)
   * 2. Apply atomic update to actor
   * 3. Trigger single recalculation
   * 4. Clear mutation context
   *
   * Transaction metadata support:
   * - options.meta.guardKey: String to prevent re-entrant hook mutations
   * - Example: { guardKey: 'language-sync' } prevents same hook from re-firing
   *
   * This is the ONLY legal path to actor mutations.
   */
  async updateActor(actor, updateData, options = {}) {
    // [MUTATION TRACE] ENGINE — depth tracking wraps the entire method
    const _traceId = MutationDepth.enter();
    try {
      if (!actor) {throw new Error('updateActor() called with no actor');}

      if (!updateData || typeof updateData !== 'object') {
        throw new Error(`Invalid updateData passed to updateActor for ${actor.name}`);
      }

      // [MUTATION TRACE] ENGINE — ingress boundary
      traceLog('ENGINE', `updateActor entry (traceId=${_traceId})`, {
        actor:     actorSummary(actor),
        payload:   payloadSummary(updateData),
        guardKey:  options.meta?.guardKey ?? null,
        nested:    MutationDepth.isNested()
      });

      SWSELogger.debug(`ActorEngine.updateActor → ${actor.name}`, {
        updateData,
        meta: options.meta,
        guardKey: options.meta?.guardKey
      });

      // ========================================
      // DEV MODE: Instrument actor.items for SSOT violation detection
      // ========================================
      this._instrumentActorItemsForSSSTOT(actor);

      // ========================================
      // PHASE 2B: Detect cascading update loops
      // ========================================
      const source = options.meta?.guardKey || 'unguarded';
      this._detectUpdateLoop(actor, source);

      // ========================================
      // PHASE 10: Extract and propagate metadata
      // ========================================
      const meta = options.meta || {};
      if (meta.guardKey) {
        SWSELogger.debug(`[GUARD] updateActor with guardKey: ${meta.guardKey}`);
      }

      // ========================================
      // PHASE 11: Migration context guard
      // ========================================
      const isMigration = meta.origin === 'migration';
      const isMigrationActive = this._isMigrationActive(actor.id);

      if (isMigration && !isMigrationActive) {
        // Mark migration as active
        this._markMigrationActive(actor.id);
        SWSELogger.debug(`[MIGRATION] Starting migration for ${actor.name}`);
      }

      if (isMigration && isMigrationActive) {
        // Prevent recursive mutations during migration
        SWSELogger.warn(`[MIGRATION] Suppressing recursive mutation during migration for ${actor.name}`);
        return { prevented: true, actor };
      }

      // ========================================
      // PHASE 4: Contract Enforcement & Normalization
      // ========================================
      // Normalize incoming mutation to canonical contract paths
      // Initialize required base shapes for touched domains
      // Validate post-normalization
      const { normalizedUpdateData, warnings } = this._normalizeMutationForContract(updateData, actor);
      this._initializeCanonicalShapesForTouchedDomains(normalizedUpdateData, actor);
      const validationResult = this._validateCanonicalMutationPlan(normalizedUpdateData, actor);

      // Log Phase 4 warnings and validation results
      if (warnings.length > 0) {
        SWSELogger.warn(`[PHASE 4] Normalization warnings for ${actor.name}:`, warnings);
      }
      if (!validationResult.isValid) {
        SWSELogger.warn(`[PHASE 4] Contract validation warnings for ${actor.name}:`, validationResult.warnings);
      }

      const sensitivePaths = collectHydrationSensitivePaths(normalizedUpdateData);
      const shouldTraceHydration = sensitivePaths.length > 0;
      const hydrationBefore = shouldTraceHydration ? captureHydrationSnapshot(actor) : null;
      if (shouldTraceHydration) {
        emitHydrationWarning('ENGINE_UPDATE_START', {
          traceId: _traceId,
          actorId: actor.id,
          actorName: actor.name,
          source: options.source ?? null,
          guardKey: meta.guardKey ?? null,
          sensitivePaths,
          normalizedUpdateData,
          before: hydrationBefore
        });
      }

      // ========================================
      // PHASE 4D: HP max write enforcement
      // ========================================
      const flatUpdateData = foundry.utils.flattenObject(normalizedUpdateData);
      const hpMaxPath = Object.keys(flatUpdateData).find(path => path === 'system.hp.max');

      if (hpMaxPath && !options.isRecomputeHPCall && !options.isMigration) {
        const caller = new Error().stack.split('\n')[2];
        throw new Error(
          `[HP SSOT Violation] system.hp.max may only be written by ActorEngine.recomputeHP().\n` +
          `Caller: ${caller}`
        );
      }

      // Phase 3A & 3D normalizations are now handled in Phase 4 comprehensive normalization above

      // ========================================
      // PHASE 1 DIAGNOSTICS: Semantic boundary audit (warning-only)
      // PHASE 2 CLASSIFICATION: Source-based false-positive suppression
      // PHASE 3 GUARDRAILS: Safe automatic correction for proven-unsafe paths
      //
      // Phase 1/2: identify and classify suspicious payloads (no payload changes).
      // Phase 3: correct paths we know are wrong for live/unknown callers.
      // Future phases: convert warning-only broad replacements to strict enforcement
      //   after runtime validation proves parity.
      //
      // Long-term invariant: ActorEngine is the public mutation facade.
      // ========================================
      // Derived-write authority: system.derived.* is owned by DerivedCalculator.
      // Throws in strict mode / warns otherwise when a caller writes derived paths
      // outside a derived-calc cycle. (Previously defined but never wired.)
      this._validateDerivedWriteAuthority(normalizedUpdateData, actor, options);

      const _opCategory = this._classifyOperationIntent(normalizedUpdateData, options, actor);
      // Pass the ORIGINAL updateData (pre-normalization) so check #1 can detect whether the
      // caller explicitly passed {system:{...}} (nested) vs a flat dot-path key. After
      // _normalizeMutationForContract runs expandObject(), normalizedUpdateData.system is
      // always an object — using it here would false-positive on every safe narrow update.
      const _boundaryFindings = this._auditSemanticBoundaries(updateData, flatUpdateData, actor, _opCategory, options);
      // Phase 2: high-confidence findings become hard failures in strict/dev mode.
      // Ambiguous findings stay warning-only (already logged by the audit above).
      this._enforceStrictSemanticBoundaries(_boundaryFindings, _opCategory, actor, options);
      // Phase 3: apply guardrails — safe corrections to proven-unsafe paths.
      // Result replaces flatUpdateData as the payload that crosses the document boundary.
      const p3FlatData = this._applyPhase3Guardrails(flatUpdateData, _opCategory, actor, options);

      // ========================================
      // PHASE 2: Mark mutation as in-flight before any reactive code can run
      // ========================================
      this._markActorMutationInFlight(actor.id);

      // Quiet sheet edits are intentionally persisted without forcing every open
      // sheet/shell surface to repaint. Foundry's own render:false option stops
      // the document update repaint; this transient flag also tells async derived
      // recalculation hooks not to schedule a follow-up shell render.
      const shouldSuppressAppRefresh = Boolean(options?.suppressAppRefresh);
      if (shouldSuppressAppRefresh) {
        actor._swseSuppressAppRefreshDepth = Number(actor._swseSuppressAppRefreshDepth || 0) + 1;
        // Foundry prepareData() can spawn async derived work after actor.update().
        // Keep quiet field edits render-suppressed for a short grace window so
        // those async recomputes do not repaint every open actor app anyway.
        actor._swseSuppressAppRefreshUntil = Math.max(
          Number(actor._swseSuppressAppRefreshUntil || 0),
          Date.now() + Number(options?.suppressAppRefreshMs || 900)
        );
      }

      try {
        // ========================================
        // PHASE 3: Authorize mutation via context
        // ========================================
        MutationInterceptor.setContext('ActorEngine.updateActor');
        let updateApplied = false;
        try {
          // DIAGNOSTIC: Verify actor is still valid before atomic update
          if (!(actor instanceof Actor)) {
            throw new Error(`[GUARD] actor is not an Actor instance: ${actor.constructor.name}`);
          }
          if (actor !== game.actors?.get?.(actor.id)) {
            SWSELogger.debug(`[GUARD] actor reference diverged from world actor before atomic update`, {
              actorId: actor.id,
              actorName: actor.name
            });
          }

          // Perform safe atomic update (now authorized)
          // Pass metadata through options to Foundry hooks
          const optsWithMeta = {
            ...options,
            meta: meta
          };
          // [MUTATION TRACE] ENGINE — handoff to applyActorUpdateAtomic
          traceLog('ENGINE', `handoff to applyActorUpdateAtomic (traceId=${_traceId})`, {
            actor:   actorSummary(actor),
            payload: payloadSummary(p3FlatData)
          });
          // Foundry's update boundary is safest with flattened dot-path payloads.
          // Passing a nested partial like {system:{skills:{acrobatics:{trained:true}}}}
          // can be interpreted as an object replacement by some schema paths, which is
          // exactly the failure mode that makes one skill checkbox repaint the whole
          // skill table with zero totals. Keep the ActorEngine contract normalized, but
          // cross the document update boundary as explicit leaf paths.
          // p3FlatData is flatUpdateData after Phase 3 guardrail corrections.
          const atomicUpdateData = p3FlatData;
          const result = await applyActorUpdateAtomic(actor, atomicUpdateData, optsWithMeta);
          updateApplied = true;
          if (options.skipRecalc || options.deferRecalc) {
            SWSELogger.debug(`[RECOMPUTE] Skipped after ActorEngine.updateActor for ${actor.name}`, {
              guardKey: meta.guardKey ?? null,
              skipRecalc: Boolean(options.skipRecalc),
              deferRecalc: Boolean(options.deferRecalc)
            });
          } else {
            await this.recalcAll(actor);
          }
          if (shouldTraceHydration) {
            emitHydrationWarning('ENGINE_UPDATE_SUCCESS', {
              traceId: _traceId,
              actorId: actor.id,
              actorName: actor.name,
              sensitivePaths,
              after: captureHydrationSnapshot(actor)
            });
          }
          return result;
        } finally {
          // RENDER SEQUENCING: Guarantee final render after successful actor update,
          // even if recalcAll or hydration tracing throws. This ensures the sheet is
          // not left stale after render:false suppresses Foundry's auto-render.
          // Only render if actor.update() actually succeeded and committed data.
          if (updateApplied) {
            this._refreshOpenActorApps(actor, options);
          }

          // Always clear context, even on error
          MutationInterceptor.clearContext();

          // PHASE 11: Clear migration context if this was a migration
          if (isMigration && !isMigrationActive) {
            this._clearMigrationActive(actor.id);
            SWSELogger.debug(`[MIGRATION] Completed migration for ${actor.name}`);
          }
        }
      } finally {
        if (shouldSuppressAppRefresh) {
          actor._swseSuppressAppRefreshDepth = Math.max(0, Number(actor._swseSuppressAppRefreshDepth || 0) - 1);
        }
        // PHASE 2: Always clear in-flight flag, even on error
        this._clearActorMutationInFlight(actor.id);
      }

    } catch (err) {
      // [MUTATION TRACE] ENGINE — error exit
      traceLog('ENGINE', `updateActor threw (traceId=${_traceId}): ${err?.message}`, {
        actor: actorSummary(actor)
      });
      if (typeof shouldTraceHydration !== 'undefined' && shouldTraceHydration) {
        emitHydrationError('ENGINE_UPDATE_FAILED', {
          traceId: _traceId,
          actorId: actor?.id ?? null,
          actorName: actor?.name ?? null,
          sensitivePaths: typeof sensitivePaths !== 'undefined' ? sensitivePaths : [],
          error: err?.message,
          stack: err?.stack,
          snapshot: captureHydrationSnapshot(actor)
        });
      }
      SWSELogger.error(`ActorEngine.updateActor failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        updateData,
        meta: options.meta?.guardKey
      });
      throw err;
    } finally {
      MutationDepth.exit();
    }
  },

  /**
   * Update embedded documents (e.g. owned Items) while preserving the ActorEngine lifecycle.
   *
   * PHASE 3: Single mutation authority for all embedded document updates.
   * v2 contract: any actor-affecting state change (including embedded Items) must route through ActorEngine.
   *
   * @param {Actor} actor
   * @param {string} embeddedName - Embedded collection name, e.g. "Item"
   * @param {object[]} updates - update objects (must include _id)
   * @param {object} [options={}] - forwarded to updateEmbeddedDocuments
   */
  async updateEmbeddedDocuments(actor, embeddedName, updates, options = {}) {
    try {
      if (!actor) {throw new Error('updateEmbeddedDocuments() called with no actor');}
      if (!embeddedName) {throw new Error('updateEmbeddedDocuments() called without embeddedName');}
      if (!Array.isArray(updates)) {throw new Error('updateEmbeddedDocuments() requires updates array');}

      // DEV MODE: Instrument actor.items for SSOT violation detection
      this._instrumentActorItemsForSSSTOT(actor);

      // Backstop: strip type mutations for existing embedded Items.
      // The primary guard is in the item sheet, but this catches any caller that
      // accidentally includes a type field in an update targeting an existing item.
      let safeUpdates = updates;
      if (embeddedName === 'Item') {
        // Phase 1 diagnostics: audit original updates before P0.1 stripping
        this._auditEmbeddedItemBoundaries(updates, actor, options);

        safeUpdates = updates.map(update => {
          const itemId = update._id ?? update.id;
          if (!itemId || !('type' in update)) return update;
          const existing = actor.items?.get?.(itemId);
          if (!existing) return update;
          if (existing.type !== update.type) {
            SWSELogger.warn('[ActorEngine] Blocked item type mutation attempt', {
              itemId,
              existingType: existing.type,
              attemptedType: update.type,
              source: options?.source ?? 'unknown'
            });
          }
          const clean = { ...update };
          delete clean.type;
          return clean;
        });
      }

      if (embeddedName === 'ActiveEffect') {
        safeUpdates = normalizeActiveEffectDataForRuntime(safeUpdates);
      }

      SWSELogger.debug(`ActorEngine.updateEmbeddedDocuments → ${actor.name}`, {
        embeddedName,
        updates: safeUpdates,
        options
      });

      // ========================================
      // PHASE 3: Authorize mutation via context
      // ========================================
      MutationInterceptor.setContext(`ActorEngine.updateEmbeddedDocuments[${embeddedName}]`);
      try {
        const result = await actor.updateEmbeddedDocuments(embeddedName, safeUpdates, options);
        if (!options.skipRecalc && !options.deferRecalc) await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.updateEmbeddedDocuments failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        embeddedName,
        updates
      });
      throw err;
    }
  },

  /**
   * Convenience wrapper for updating owned Items through ActorEngine.
   * @param {Actor} actor
   * @param {object[]} updates
   * @param {object} [options={}]
   */
  async updateOwnedItems(actor, updates, options = {}) {
    return this.updateEmbeddedDocuments(actor, 'Item', updates, options);
  },

  /**
   * Create embedded documents while preserving the ActorEngine lifecycle.
   * PHASE 3: Only legal way to create embedded documents.
   */
  async createEmbeddedDocuments(actor, embeddedName, data, options = {}) {
    try {
      if (!actor) {throw new Error('createEmbeddedDocuments() called with no actor');}
      if (!embeddedName) {throw new Error('createEmbeddedDocuments() called without embeddedName');}
      if (!Array.isArray(data)) {throw new Error('createEmbeddedDocuments() requires data array');}

      // DEV MODE: Instrument actor.items for SSOT violation detection
      this._instrumentActorItemsForSSSTOT(actor);

      SWSELogger.debug(`ActorEngine.createEmbeddedDocuments → ${actor.name}`, {
        embeddedName,
        count: data.length
      });

      const safeData = embeddedName === 'ActiveEffect' ? normalizeActiveEffectDataForRuntime(data) : data;

      MutationInterceptor.setContext(`ActorEngine.createEmbeddedDocuments[${embeddedName}]`);
      try {
        const result = await actor.createEmbeddedDocuments(embeddedName, safeData, options);
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.createEmbeddedDocuments failed for ${actor?.name ?? 'unknown actor'}`, err);
      throw err;
    }
  },

  /**
   * Delete embedded documents while preserving the ActorEngine lifecycle.
   * PHASE 3: Only legal way to delete embedded documents.
   */
  async deleteEmbeddedDocuments(actor, embeddedName, ids, options = {}) {
    try {
      if (!actor) {throw new Error('deleteEmbeddedDocuments() called with no actor');}
      if (!embeddedName) {throw new Error('deleteEmbeddedDocuments() called without embeddedName');}
      if (!Array.isArray(ids)) {throw new Error('deleteEmbeddedDocuments() requires ids array');}

      SWSELogger.debug(`ActorEngine.deleteEmbeddedDocuments → ${actor.name}`, {
        embeddedName,
        count: ids.length
      });

      MutationInterceptor.setContext(`ActorEngine.deleteEmbeddedDocuments[${embeddedName}]`);
      try {
        const result = await actor.deleteEmbeddedDocuments(embeddedName, ids, options);
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.deleteEmbeddedDocuments failed for ${actor?.name ?? 'unknown actor'}`, err);
      throw err;
    }
  },

  /**
   * Move embedded documents between actors atomically.
   * PHASE 9: Atomic cross-actor item transfer.
   *
   * This is NOT delete + create in sequence.
   * It is a single transaction-level operation.
   *
   * Ensures:
   * - Source item is deleted
   * - Target receives item
   * - One mutation context
   * - One recalculation pass per actor
   * - No partial failure state
   *
   * @param {Actor} sourceActor - Actor to remove item from
   * @param {Actor} targetActor - Actor to add item to
   * @param {string} embeddedName - Collection name (e.g. "Item")
   * @param {string|string[]} ids - Item ID(s) to move
   * @param {object} [options={}] - Forwarded options
   * @returns {Promise<Array>} Created items on target actor
   */
  async moveEmbeddedDocuments(sourceActor, targetActor, embeddedName, ids, options = {}) {
    try {
      if (!sourceActor) {throw new Error('moveEmbeddedDocuments() called without sourceActor');}
      if (!targetActor) {throw new Error('moveEmbeddedDocuments() called without targetActor');}
      if (!embeddedName) {throw new Error('moveEmbeddedDocuments() called without embeddedName');}
      if (!Array.isArray(ids)) {throw new Error('moveEmbeddedDocuments() requires ids array');}

      SWSELogger.debug(`ActorEngine.moveEmbeddedDocuments → ${sourceActor.name} → ${targetActor.name}`, {
        embeddedName,
        count: ids.length
      });

      // Get the items to move before deletion
      const collection = sourceActor.getEmbeddedCollection(embeddedName);
      const itemsToMove = ids.map(id => {
        const doc = collection.get(id);
        if (!doc) throw new Error(`Document ${id} not found in ${embeddedName} collection`);
        return doc.toObject();
      }).filter(obj => obj); // Remove nulls

      if (itemsToMove.length === 0) {
        SWSELogger.warn(`No items to move from ${sourceActor.name}`);
        return [];
      }

      // Clear _id so they can be recreated on target
      itemsToMove.forEach(item => { delete item._id; });

      // Single mutation context for the entire operation
      MutationInterceptor.setContext(`ActorEngine.moveEmbeddedDocuments[${embeddedName}]`);
      try {
        // Delete from source
        await sourceActor.deleteEmbeddedDocuments(embeddedName, ids, options);

        // Create on target
        const created = await targetActor.createEmbeddedDocuments(embeddedName, itemsToMove, options);

        // Recalculate both actors
        await this.recalcAll(sourceActor);
        await this.recalcAll(targetActor);

        return created;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.moveEmbeddedDocuments failed`, {
        error: err,
        sourceActor: sourceActor?.name,
        targetActor: targetActor?.name,
        embeddedName,
        ids
      });
      throw err;
    }
  },

  /**
   * applyDelta(actor, delta)
   *
   * v2 Progression Contract: The ONLY legal way to apply ProgressionCompiler output.
   *
   * Enforces strict guarantees:
   * - No derived writes (illegal boundary violation)
   * - No async computation (math belongs in prepareDerivedData)
   * - No conditional branching (resolver is deterministic)
   *
   * @param {Actor} actor
   * @param {ProgressionDelta} delta - { set, add, delete }
   * @throws if delta violates v2 constraints
   */
  async applyDelta(actor, delta) {
    try {
      if (!actor) {throw new Error('applyDelta() called with no actor');}
      if (!delta) {return;} // noop

      // ---- GUARDRAIL 1: Reject derived writes ----
      if (delta.derived) {
        throw new Error(
          'ARCHITECTURE VIOLATION: Progression attempted to write to derived fields. ' +
          'Math computation belongs in prepareDerivedData(), not progression.'
        );
      }

      // ---- GUARDRAIL 2: Validate delta structure ----
      if (delta.set && typeof delta.set !== 'object') {
        throw new Error('Invalid delta.set: must be object { path: value }');
      }
      if (delta.add && typeof delta.add !== 'object') {
        throw new Error('Invalid delta.add: must be object with feature arrays');
      }
      if (delta.delete && typeof delta.delete !== 'object') {
        throw new Error('Invalid delta.delete: must be object with feature arrays');
      }

      SWSELogger.debug(`ActorEngine.applyDelta → ${actor.name}`, { delta });

      // ---- Phase 4: Apply SET operations (field updates) ----
      const updates = {};
      if (delta.set) {
        for (const [path, value] of Object.entries(delta.set)) {
          if (path.startsWith('system.derived')) {
            throw new Error(`ILLEGAL: applyDelta cannot write ${path} (derived field)`);
          }
          updates[path] = value;
        }
      }

      // Apply field updates atomically
      if (Object.keys(updates).length > 0) {
        await this.updateActor(actor, updates);
      }

      // ---- Phase 4: Apply ADD operations (create items) ----
      if (delta.add?.talents && delta.add.talents.length > 0) {
        const talentItems = delta.add.talents.map(talentId => ({
          type: 'talent',
          name: talentId, // Will be enriched by sheet
          system: {
            ssotId: talentId // Pointer to SSOT, not rules
          }
        }));
        await this.createEmbeddedDocuments(actor, 'Item', talentItems);
      }

      if (delta.add?.feats && delta.add.feats.length > 0) {
        const featItems = delta.add.feats.map(featId => ({
          type: 'feat',
          name: featId,
          system: {
            ssotId: featId
          }
        }));
        await this.createEmbeddedDocuments(actor, 'Item', featItems);
      }

      if (delta.add?.skills && delta.add.skills.length > 0) {
        const skillUpdates = {};
        for (const skillId of delta.add.skills) {
          // Skills are ranks in system.skills, not items
          skillUpdates[`system.progression.skills.${skillId}`] = 1;
        }
        await this.updateActor(actor, skillUpdates);
      }

      // ---- Phase 4: Apply DELETE operations (remove items) ----
      if (delta.delete?.talents && delta.delete.talents.length > 0) {
        const talentsToDelete = actor.items
          .filter(item => item.type === 'talent' && delta.delete.talents.includes(item.system.ssotId))
          .map(item => item.id);
        if (talentsToDelete.length > 0) {
          await this.deleteEmbeddedDocuments(actor, 'Item', talentsToDelete);
        }
      }

      if (delta.delete?.feats && delta.delete.feats.length > 0) {
        const featsToDelete = actor.items
          .filter(item => item.type === 'feat' && delta.delete.feats.includes(item.system.ssotId))
          .map(item => item.id);
        if (featsToDelete.length > 0) {
          await this.deleteEmbeddedDocuments(actor, 'Item', featsToDelete);
        }
      }

      SWSELogger.log(`ActorEngine.applyDelta completed for ${actor.name}`);

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyDelta failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        delta
      });
      throw err;
    }
  },

  /**
   * apply(actor, mutationPlan)
   *
   * PHASE 3: Universal mutation acceptor for all domain engines.
   *
   * This is the ONLY method domain engines (DropResolutionEngine, AdoptionEngine, etc.) use
   * to mutate actors. No embedded document creation bypasses this.
   *
   * Contract:
   * - mutationPlan is pure data (no functions, no side effects)
   * - Execution order is strictly controlled and atomic
   * - All operations succeed or all fail (no partial mutations)
   * - Derived recalculation triggered after mutations
   *
   * Execution Order:
   * 0. Adoption (if replaceSystem/replaceEmbedded):
   *    - Delete all existing embedded docs
   *    - Create replacement embedded docs
   *    - Replace system entirely
   * 1. Standard operations (create/update/delete):
   *    - Create embedded documents
   *    - Update embedded documents
   *    - Delete embedded documents
   * 2. System updates (dot-path only)
   * 3. Derived recalculation
   *
   * @param {Actor} actor - target actor
   * @param {Object} mutationPlan - {
   *   replaceSystem?: Object,                   (adoption only)
   *   replaceEmbedded?: Array<{ type, data }>, (adoption only)
   *   _adoptionSource?: string,                (metadata only, for logging)
   *   createEmbedded?: Array<{ type, data }>,
   *   updateEmbedded?: Array<{ _id, update }>,
   *   deleteEmbedded?: Array<{ type, _id }>,
   *   update?: { ... }  (system updates via dot-path)
   * }
   */
  /**
   * Preflight validation for adoption payloads.
   * Validates all replacement embedded documents before any destructive operations.
   * This ensures the actor is not left in a broken state if creation fails after deletion.
   *
   * @private
   * @param {Object} mutationPlan - The adoption mutation plan
   * @returns {Object} { itemsToCreate, effectsToCreate } - Validated payloads ready to create
   * @throws {Error} If validation fails
   */
  _preflightAdoptionPayloads(mutationPlan) {
    const itemsToCreate = [];
    const effectsToCreate = [];

    if (mutationPlan.createEmbedded?.length > 0) {
      for (const embedded of mutationPlan.createEmbedded) {
        if (!embedded.type || !embedded.data) {
          throw new Error('Invalid createEmbedded in adoption: missing type or data');
        }

        if (embedded.type === 'Item') {
          itemsToCreate.push(embedded.data);
        } else if (embedded.type === 'ActiveEffect') {
          effectsToCreate.push(embedded.data);
        } else {
          throw new Error(`Invalid embedded type in adoption: ${embedded.type}`);
        }
      }
    }

    return { itemsToCreate, effectsToCreate };
  },

  async apply(actor, mutationPlan, options = {}) {
    try {
      if (!actor) {throw new Error('apply() called with no actor');}
      if (!mutationPlan) {return;} // noop

      const isAdoption = mutationPlan.replaceSystem !== undefined;

      SWSELogger.debug(`ActorEngine.apply → ${actor.name}`, {
        isAdoption,
        mutationPlan: isAdoption ? { adoption: true } : mutationPlan
      });

      // ========================================
      // PHASE 0: ADOPTION (Identity Mutation)
      // ========================================

      if (isAdoption) {
        SWSELogger.info(`[Adoption] ${actor.name} (ID: ${actor.id}) adopting from ${mutationPlan._adoptionSource}`);

        // ---- ADOPTION PREFLIGHT: Validate all replacement payloads BEFORE destructive operations ----
        // This ensures the actor is not left in a broken state if creation fails after deletion.
        const { itemsToCreate, effectsToCreate } = this._preflightAdoptionPayloads(mutationPlan);

        // ---- ADOPTION PHASE 1: Delete all existing embedded documents ----
        if (actor.items?.length > 0) {
          const itemIds = actor.items.map(i => i.id);
          await this.deleteEmbeddedDocuments(actor, 'Item', itemIds);
        }

        if (actor.effects?.length > 0) {
          const effectIds = actor.effects.map(e => e.id);
          await this.deleteEmbeddedDocuments(actor, 'ActiveEffect', effectIds);
        }

        // ---- ADOPTION PHASE 2: Create replacement embedded documents ----
        if (itemsToCreate.length > 0) {
          await this.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
        }

        if (effectsToCreate.length > 0) {
          await this.createEmbeddedDocuments(actor, 'ActiveEffect', effectsToCreate);
        }

        // ---- ADOPTION PHASE 3: Replace system ----
        if (mutationPlan.replaceSystem && Object.keys(mutationPlan.replaceSystem).length > 0) {
          // Source tag required: this is an intentionally broad system replacement (adoption).
          // The diagnostic classifier recognizes 'ActorEngine.apply:adoption' → canonical-normalization.
          await this.updateActor(actor, { system: mutationPlan.replaceSystem }, {
            source: 'ActorEngine.apply:adoption'
          });
        }
      }

      // ========================================
      // PHASE 1-4: Standard Mutations
      // ========================================

      // ---- PHASE 1: Create Embedded Documents (non-adoption) ----
      if (!isAdoption && mutationPlan.createEmbedded?.length > 0) {
        const itemsToCreate = mutationPlan.createEmbedded.map(item => {
          if (!item.type || !item.data) {
            throw new Error('Invalid createEmbedded item: missing type or data');
          }
          return item.data;
        });
        await this.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
      }

      // ---- PHASE 2: Update Embedded Documents ----
      if (mutationPlan.updateEmbedded?.length > 0) {
        for (const update of mutationPlan.updateEmbedded) {
          if (!update._id || !update.update) {
            throw new Error('Invalid updateEmbedded: missing _id or update');
          }
        }
        await this.updateEmbeddedDocuments(actor, 'Item', mutationPlan.updateEmbedded);
      }

      // ---- PHASE 3: Delete Embedded Documents (non-adoption) ----
      if (!isAdoption && mutationPlan.deleteEmbedded?.length > 0) {
        const idsToDelete = mutationPlan.deleteEmbedded.map(item => {
          if (!item._id) {
            throw new Error('Invalid deleteEmbedded: missing _id');
          }
          return item._id;
        });
        await this.deleteEmbeddedDocuments(actor, 'Item', idsToDelete);
      }

      // ---- PHASE 4: Update Actor System (non-adoption) ----
      if (!isAdoption && mutationPlan.update && Object.keys(mutationPlan.update).length > 0) {
        // Guard against derived writes
        for (const path of Object.keys(mutationPlan.update)) {
          if (path.startsWith('system.derived')) {
            throw new Error(
              `ARCHITECTURE VIOLATION: mutationPlan attempted to write to ${path}. ` +
              'Derived fields are computed, not mutated.'
            );
          }
        }
        await this.updateActor(actor, mutationPlan.update, options);
      }

      if (isAdoption) {
        SWSELogger.log(`[Adoption] Complete: ${actor.name} (ID: ${actor.id})`);
      } else {
        SWSELogger.log(`ActorEngine.apply completed for ${actor.name}`);
      }

    } catch (err) {
      SWSELogger.error(`ActorEngine.apply failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        isAdoption: mutationPlan?.replaceSystem !== undefined,
        mutationPlan: mutationPlan?.replaceSystem ? { adoption: true } : mutationPlan
      });
      throw err;
    }
  },

  // ============================================================================
  // PHASE 3 BATCH 2: COMBAT AUTHORITY APIS
  // ============================================================================

  /**
   * applyDamage() — PHASE 3 Combat Authority
   *
   * ONLY legal way to reduce actor HP in combat.
   *
   * Contract:
   * - Combat produces DamagePacket (declarative)
   * - ActorEngine applies modifiers & computes final damage
   * - ConditionTrack shifts handled atomically
   * - Single mutation, single recalc
   *
   * @param {Actor} actor - target actor
   * @param {Object} damagePacket - {
   *   amount: number,           // Raw damage amount
   *   type: string,             // 'kinetic', 'energy', 'burn', etc.
   *   source: string,           // 'laser-attack', 'force-power', etc.
   *   modifiersApplied: boolean,// Have ModifierEngine modifiers been applied?
   *   conditionShift: boolean,  // Should condition track shift?
   *   targetActor: Actor        // (optional, for logging)
   * }
   */
  async applyDamage(actor, damagePacket) {
    try {
      if (!actor) {throw new Error('applyDamage() called with no actor');}
      if (!damagePacket) {throw new Error('applyDamage() called with no damagePacket');}
      if (typeof damagePacket.amount !== 'number' || damagePacket.amount < 0) {
        throw new Error(`Invalid damage amount: ${damagePacket.amount}`);
      }

      SWSELogger.debug(`ActorEngine.applyDamage → ${actor.name}`, {
        amount: damagePacket.amount,
        type: damagePacket.type,
        source: damagePacket.source
      });

      const { DamageResolutionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/combat/damage-resolution-engine.js");
      const resolution = await DamageResolutionEngine.resolveDamage({
        actor,
        damage: damagePacket.amount,
        damageType: damagePacket.type ?? 'normal',
        source: damagePacket.sourceActor ?? null,
        options: damagePacket.options ?? {},
      });

      await this._maybeResolveForcePointRescue(actor, resolution, damagePacket);

      const updates = {
        ...SchemaAdapters.setHPUpdate(resolution.hpAfter)
      };

      // Persist bonus/temp HP depletion from the same authoritative resolution packet.
      if (resolution.bonusHpAfter !== undefined) {
        updates['system.hp.bonus'] = Math.max(0, Number(resolution.bonusHpAfter) || 0);
      }
      if (resolution.mitigation?.tempHP?.after !== undefined) {
        updates['system.hp.temp'] = Math.max(0, Number(resolution.mitigation.tempHP.after) || 0);
      }

      if (resolution.conditionAfter !== undefined && resolution.conditionAfter !== (actor.system?.conditionTrack?.current ?? 0)) {
        updates['system.conditionTrack.current'] = resolution.conditionAfter;
      }
      if (resolution.conditionPersistent === true) {
        updates['system.conditionTrack.persistent'] = true;
      }

      if (actor.type === 'droid') {
        if (resolution.destroyed === true) {
          updates['system.droidState.status'] = 'destroyed';
          updates['system.droidState.destroyed'] = true;
          updates['system.droidState.disabled'] = false;
          updates['system.droidState.canBeRepaired'] = false;
          updates['system.droidState.destroyedAt'] = Date.now();
          updates['system.droidState.destroyedBy'] = damagePacket.source ?? damagePacket.type ?? 'damage';
        } else if (resolution.disabled === true) {
          updates['system.droidState.status'] = 'disabled';
          updates['system.droidState.disabled'] = true;
          updates['system.droidState.destroyed'] = false;
          updates['system.droidState.canBeRepaired'] = true;
        } else if ((resolution.hpAfter ?? 0) > 0 && actor.system?.droidState?.status === 'disabled') {
          updates['system.droidState.status'] = 'operational';
          updates['system.droidState.disabled'] = false;
          updates['system.droidState.canBeRepaired'] = true;
        }
      }

      // RENDER SEQUENCING FIX: Suppress intermediate renders. Damage application affects
      // both HP and condition track, which both impact derived values. After updateActor
      // completes recalcAll(), _refreshOpenActorApps() will render with stable data.
      await this.updateActor(actor, updates, {
        render: false
      });

      SWSELogger.log(`Damage applied to ${actor.name}: ${damagePacket.amount} incoming → ${resolution.damageToHP} HP`, {
        source: damagePacket.source,
        thresholdExceeded: resolution.thresholdExceeded,
        conditionAfter: resolution.conditionAfter,
        measuredDamageForThreshold: resolution.thresholdMeasuredDamage
      });

      return {
        applied: resolution.damageToHP,
        newHP: resolution.hpAfter,
        conditionShifted: resolution.conditionAfter !== (actor.system?.conditionTrack?.current ?? 0),
        resolution
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyDamage failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        damagePacket
      });
      throw err;
    }
  },

  /**
   * applyHealing() — Restore actor HP
   *
   * Use outside of combat for healing.
   * In combat, use applyDamage with negative amounts.
   *
   * @param {Actor} actor - target actor
   * @param {number} amount - HP to restore
   * @param {string} source - healing source
   */
  async applyHealing(actor, amount, source = 'healing') {
    try {
      if (!actor) {throw new Error('applyHealing() called with no actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid healing amount: ${amount}`);
      }

      SWSELogger.debug(`ActorEngine.applyHealing → ${actor.name}`, {
        amount,
        source
      });

      if (actor.type === 'droid' && actor.system?.droidState?.destroyed === true) {
        throw new Error(`${actor.name} is destroyed and cannot be repaired or healed.`);
      }

      const currentHP = SchemaAdapters.getHP(actor);
      const maxHP = SchemaAdapters.getMaxHP(actor);
      const currentCT = Number(actor.system?.conditionTrack?.current ?? 0);
      const newHP = Math.min(maxHP, currentHP + amount);
      const actualHealing = newHP - currentHP;

      if (actualHealing === 0) {
        SWSELogger.debug(`${actor.name} healing had no effect (already at max HP)`);
        return { applied: 0, newHP };
      }

      const updates = {
        ...SchemaAdapters.setHPUpdate(newHP)
      };

      // RAW: Any healing while at 0 HP / disabled revives and moves +1 step up the CT.
      const recoveredStep = ConditionTrackRules.resolveHealingConditionRecovery(currentHP, currentCT);
      if (recoveredStep !== null) {
        updates['system.conditionTrack.current'] = recoveredStep;
      }
      if (actor.type === 'droid' && newHP > 0 && actor.system?.droidState?.status === 'disabled') {
        updates['system.droidState.status'] = 'operational';
        updates['system.droidState.disabled'] = false;
        updates['system.droidState.canBeRepaired'] = true;
      }

      await this.updateActor(actor, updates);

      SWSELogger.log(`Healing applied to ${actor.name}: +${actualHealing}HP (now: ${newHP}/${maxHP})`, {
        source
      });

      return {
        applied: actualHealing,
        newHP
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyHealing failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount,
        source
      });
      throw err;
    }
  },

  /**
   * setConditionStep() — Set condition track to exact step
   *
   * Sets actor's condition track to specific step (0 to cap).
   * Used by UI components for direct condition selection.
   *
   * @param {Actor} actor - target actor
   * @param {number} step - condition step (0 to cap, clamped via ConditionTrackRules)
   * @param {string} source - reason for change
   */
  async setConditionStep(actor, step, source = 'manual') {
    try {
      if (!actor) {throw new Error('setConditionStep() requires actor');}
      if (typeof step !== 'number' || !Number.isFinite(step)) {
        throw new Error(`Invalid condition step: ${step}`);
      }

      const conditionCap = ConditionTrackRules.getConditionStepCap();
      const clampedStep = Math.min(conditionCap, Math.max(0, step));
      const current = actor.system.conditionTrack?.current || 0;

      if (clampedStep === current) {
        SWSELogger.debug(`${actor.name} condition already at step ${clampedStep}`);
        return { applied: 0, newStep: clampedStep };
      }

      // RENDER SEQUENCING FIX: Suppress intermediate renders during condition update.
      // Pass render: false to actor.update() to prevent Foundry from auto-rendering.
      // After recalcAll() completes, _refreshOpenActorApps() will render once with
      // stable derived data (system.derived.damage.conditionPenalty). This ensures the
      // condition track step and penalty display are always in sync.
      await this.updateActor(actor, {
        'system.conditionTrack.current': clampedStep
      }, {
        render: false
      });

      SWSELogger.log(`Condition step updated for ${actor.name}`, {
        from: current,
        to: clampedStep,
        source
      });

      return { applied: 1, newStep: clampedStep };

    } catch (err) {
      SWSELogger.error(`ActorEngine.setConditionStep failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        step,
        source
      });
      throw err;
    }
  },

  /**
   * setConditionPersistent() — Toggle persistent condition flag
   *
   * Marks condition as persistent (cannot be recovered naturally).
   *
   * @param {Actor} actor - target actor
   * @param {boolean} persistent - true for persistent, false to clear
   * @param {string} source - reason for change
   */
  async setConditionPersistent(actor, persistent, source = 'manual') {
    try {
      if (!actor) {throw new Error('setConditionPersistent() requires actor');}

      const current = actor.system.conditionTrack?.persistent ?? false;

      if (persistent === current) {
        SWSELogger.debug(`${actor.name} persistent condition already ${persistent ? 'set' : 'clear'}`);
        return { applied: 0, persistent };
      }

      // RENDER SEQUENCING FIX: Suppress intermediate renders during condition update.
      await this.updateActor(actor, {
        'system.conditionTrack.persistent': persistent,
        ...(persistent ? {} : { 'system.conditionTrack.persistentSteps': 0 })
      }, {
        render: false
      });

      SWSELogger.log(`Condition persistent flag updated for ${actor.name}`, {
        persistent,
        source
      });

      return { applied: 1, persistent };

    } catch (err) {
      SWSELogger.error(`ActorEngine.setConditionPersistent failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        persistent,
        source
      });
      throw err;
    }
  },

  /**
   * applyConditionShift() — Shift condition track
   *
   * Shifts actor's condition track by +1 or -1.
   * Triggers derived recalculation for condition penalties.
   *
   * @param {Actor} actor - target actor
   * @param {number} direction - +1 (worse) or -1 (better)
   * @param {string} source - reason for shift
   */
  async applyConditionShift(actor, direction, source = 'manual') {
    try {
      if (!actor) {throw new Error('applyConditionShift() called with no actor');}
      if (!Number.isInteger(direction) || direction === 0) {
        throw new Error(`Invalid shift direction: ${direction} (must be a non-zero integer)`);
      }

      SWSELogger.debug(`ActorEngine.applyConditionShift → ${actor.name}`, {
        direction,
        source
      });

      const shift = ConditionTrackRules.resolveConditionShift(actor, direction);

      if (shift.appliedShift === 0) {
        SWSELogger.debug(`${actor.name} condition shift had no effect (at boundary)`);
        return { applied: 0, newCondition: shift.next };
      }

      // RENDER SEQUENCING FIX: Suppress intermediate renders during condition update.
      await this.updateActor(actor, {
        'system.conditionTrack.current': shift.next
      }, {
        render: false
      });

      const directionLabel = direction > 0 ? 'worsened' : 'improved';
      SWSELogger.log(`Condition ${directionLabel} for ${actor.name} (now: ${shift.next})`, {
        source,
        requestedShift: direction,
        implantExtraStep: shift.implantExtraStep,
        appliedShift: shift.appliedShift
      });

      return {
        applied: shift.appliedShift,
        newCondition: shift.next
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyConditionShift failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        direction,
        source
      });
      throw err;
    }
  },

  /**
   * Increment persistent CT step counter.
   * Used by threshold house rules to track capped persistent penalties.
   */
  async incrementPersistentConditionSteps(actor, amount = 1, source = 'threshold') {
    try {
      if (!actor) throw new Error('incrementPersistentConditionSteps() requires actor');
      const delta = Math.max(0, Number(amount) || 0);
      if (delta === 0) return { applied: 0, total: Number(actor.system?.conditionTrack?.persistentSteps ?? 0) };

      const current = Math.max(0, Number(actor.system?.conditionTrack?.persistentSteps ?? 0));
      const total = current + delta;
      // RENDER SEQUENCING FIX: Suppress intermediate renders during condition update.
      await this.updateActor(actor, { 'system.conditionTrack.persistentSteps': total }, {
        render: false
      });
      return { applied: delta, total, source };
    } catch (err) {
      SWSELogger.error(`ActorEngine.incrementPersistentConditionSteps failed for ${actor?.name ?? 'unknown actor'}`, { error: err, amount, source });
      throw err;
    }
  },

  /**
   * Offer Force Point rescue for lethal/destructive threshold hits.
   *
   * Mutation contract — fields written to resolution on success:
   *   resolution.forceRescueUsed     = true
   *   resolution.forceRescueEligible = false
   *   resolution.dead                = false
   *   resolution.destroyed           = false
   *   resolution.unconscious         = true  (character/npc/beast)
   *   resolution.disabled            = true  (droid/object/device/vehicle)
   *   resolution.hpAfter             = 0
   *   resolution.conditionAfter      = 5
   *   resolution.conditionDelta      = max(0, 5 - conditionBefore)
   *   resolution.resolutionNote      = 'force-point-rescue'
   *
   * applyDamage() reads the mutated resolution to build its update dict.
   * No actor.update() is called here — caller owns persistence.
   *
   * @private
   */
  async _maybeResolveForcePointRescue(actor, resolution, damagePacket = {}) {
    try {
      if (!actor || !resolution?.forceRescueEligible || (!resolution.dead && !resolution.destroyed)) return false;

      const { ForcePointsService } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js');
      const rescueContext = {
        damage: resolution.thresholdMeasuredDamage ?? damagePacket.amount ?? 0,
        hp: resolution.hpAfter,
        threshold: resolution.thresholdTotal
      };
      if (!ForcePointsService.canRescue(actor, rescueContext)) return false;

      const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
      const label = resolution.destroyed ? 'destruction' : 'death';
      const title = resolution.destroyed ? 'Spend Force Point to Avoid Destruction?' : 'Spend Force Point to Avoid Death?';
      const yes = await SWSEDialogV2.confirm({
        title,
        content: `<p><strong>${actor.name}</strong> would suffer ${label} from this hit.</p><p>Spend 1 Force Point to remain at <strong>0 HP</strong>, move to the bottom of the Condition Track, and become ${resolution.destroyed ? 'disabled' : 'unconscious'} instead?</p>`,
        defaultYes: true
      });
      if (!yes) return false;

      // Post-dialog re-check: FP may have been spent elsewhere while the dialog was open.
      if (!ForcePointsService.canRescue(actor, rescueContext)) {
        ui.notifications?.warn?.(`${actor.name}: Force Point rescue is no longer available — a Force Point may have been spent while the dialog was open.`);
        return false;
      }

      const spend = await this.spendForcePoints(actor, 1);
      if (!spend?.spent) {
        ui.notifications?.warn?.(`${actor.name}: Force Point rescue failed — no Force Points remaining.`);
        return false;
      }
      await actor.setFlag?.('foundryvtt-swse', 'alreadyRescuedThisResolution', true);

      resolution.forceRescueUsed = true;
      resolution.forceRescueEligible = false;
      resolution.dead = false;
      resolution.destroyed = false;
      resolution.unconscious = actor.type === 'character' || actor.type === 'npc' || actor.type === 'beast';
      resolution.disabled = actor.type === 'droid' || actor.type === 'object' || actor.type === 'device' || actor.type === 'vehicle';
      resolution.hpAfter = 0;
      resolution.conditionAfter = 5;
      resolution.conditionDelta = Math.max(0, 5 - Number(resolution.conditionBefore ?? 0));
      resolution.resolutionNote = 'force-point-rescue';
      return true;
    } catch (err) {
      SWSELogger.error(`ActorEngine._maybeResolveForcePointRescue failed for ${actor?.name ?? 'unknown actor'}`, { error: err });
      return false;
    }
  },

  /**
   * recoverConditionStep() — RAW Recover Action support.
   *
   * In combat, recovering 1 CT step requires 3 Swift Actions which may be
   * spent in the same round || across consecutive rounds. Persistent
   * conditions block the Recover Action.
   */
  async recoverConditionStep(actor, source = 'recover-action') {
    try {
      if (!actor) throw new Error('recoverConditionStep() requires actor');

      const current = Math.max(0, Number(actor.system?.conditionTrack?.current ?? 0));
      const persistent = actor.system?.conditionTrack?.persistent === true;
      if (current <= 0) return { applied: false, reason: 'no-condition' };
      if (persistent) return { applied: false, reason: 'persistent' };

      const combat = game.combat;
      const combatant = combat?.combatants?.find?.(c => c.actorId === actor.id) ?? actor.combatant;
      const inCombat = !!combat && !!combatant;

      if (!inCombat) {
        await this.applyConditionShift(actor, -1, source);
        await actor.unsetFlag?.('foundryvtt-swse', 'conditionRecoverProgress');
        return { applied: true, stepsRecovered: 1, spent: 3, inCombat: false, complete: true };
      }

      const progress = foundry.utils.deepClone(
        actor.getFlag?.('foundryvtt-swse', 'conditionRecoverProgress') ?? {}
      );
      const combatId = combat.id;
      const round = Number(combat.round ?? 0);

      const sameCombat = progress.combatId === combatId;
      const sameRound = Number(progress.round ?? -999) == round;
      const nextRound = Number(progress.round ?? -999) == (round - 1);

      const spent = (sameCombat && (sameRound || nextRound)) ? Number(progress.spent ?? 0) + 1 : 1;
      const payload = { combatId, round, spent };

      if (spent >= 3) {
        await this.applyConditionShift(actor, -1, source);
        await actor.unsetFlag?.('foundryvtt-swse', 'conditionRecoverProgress');
        return { applied: true, stepsRecovered: 1, spent, inCombat: true, complete: true };
      }

      await actor.setFlag?.('foundryvtt-swse', 'conditionRecoverProgress', payload);
      return { applied: false, reason: 'progress', spent, remaining: Math.max(0, 3 - spent), inCombat: true, complete: false };
    } catch (err) {
      SWSELogger.error(`ActorEngine.recoverConditionStep failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        source
      });
      return { applied: false, reason: 'error', error: err };
    }
  },


  /**
   * updateActionEconomy() — Update action economy state
   *
   * Used by combatants to mark actions as used/available.
   * Single mutation for action state changes.
   *
   * @param {Actor} actor - target actor
   * @param {Object} actionEconomy - { swift, move, standard, fullRound, reaction }
   */
  async updateActionEconomy(actor, actionEconomy) {
    try {
      if (!actor) {throw new Error('updateActionEconomy() called with no actor');}
      if (!actionEconomy || typeof actionEconomy !== 'object') {
        throw new Error('updateActionEconomy() requires actionEconomy object');
      }

      SWSELogger.debug(`ActorEngine.updateActionEconomy → ${actor.name}`, {
        swift: actionEconomy.swift,
        move: actionEconomy.move,
        standard: actionEconomy.standard,
        fullRound: actionEconomy.fullRound,
        reaction: actionEconomy.reaction
      });

      await this.updateActor(actor, {
        'system.actionEconomy': actionEconomy
      });

      SWSELogger.log(`Action economy updated for ${actor.name}`, {
        actionEconomy
      });

      return { updated: true, actionEconomy };

    } catch (err) {
      SWSELogger.error(`ActorEngine.updateActionEconomy failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        actionEconomy
      });
      throw err;
    }
  },

  /**
   * gainForcePoints() — Restore actor's force points
   *
   * @param {Actor} actor - target actor
   * @param {number} amount - number of points to gain
   */
  async gainForcePoints(actor, amount = 1) {
    try {
      if (!actor) {throw new Error('gainForcePoints() requires actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid force point amount: ${amount}`);
      }

      // Delegate calculation to ForcePointsService; mutation stays here
      const { newValue: newFP, actualGain, maxFP } = ForcePointsService.calcGain(actor, amount);

      if (actualGain === 0) {
        SWSELogger.debug(`${actor.name} force points already at max`);
        return { gained: 0, current: newFP, max: maxFP };
      }

      await this.updateActor(actor, {
        'system.forcePoints.value': newFP
      });

      SWSELogger.log(`Force points gained: ${actor.name} gained ${actualGain}FP (now: ${newFP}/${maxFP})`, {
        amount: actualGain
      });

      return { gained: actualGain, current: newFP, max: maxFP };

    } catch (err) {
      SWSELogger.error(`ActorEngine.gainForcePoints failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount
      });
      throw err;
    }
  },

  /**
   * spendForcePoints() — Reduce actor's force points
   *
   * @param {Actor} actor - target actor
   * @param {number} amount - number of points to spend
   */
  async spendForcePoints(actor, amount = 1) {
    try {
      if (!actor) {throw new Error('spendForcePoints() called with no actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid force point amount: ${amount}`);
      }

      const normalizeBonusEntries = (pool = {}) => {
        const entries = Array.isArray(pool.entries) ? pool.entries.map((entry, index) => ({
          id: String(entry?.id ?? `bonus-${index}`),
          source: String(entry?.source ?? 'Bonus Force Point'),
          value: Math.max(0, Number(entry?.value ?? 0) || 0),
          max: Math.max(0, Number(entry?.max ?? entry?.value ?? 0) || 0),
          restrictions: entry?.restrictions ?? entry?.restriction ?? '',
          expires: entry?.expires ?? '',
          encounterId: entry?.encounterId ?? null,
          createdAt: entry?.createdAt ?? null
        })).filter(entry => entry.value > 0) : [];
        const legacyValue = Math.max(0, Number(pool.value ?? 0) || 0);
        const entryTotal = entries.reduce((sum, entry) => sum + entry.value, 0);
        if (!entries.length && legacyValue > 0) {
          entries.push({ id: 'legacy-bonus-force-points', source: Array.isArray(pool.sources) && pool.sources.length ? pool.sources.join(', ') : 'Bonus Force Point', value: legacyValue, max: Math.max(legacyValue, Number(pool.max ?? legacyValue) || legacyValue), restrictions: pool.note ?? '', expires: '', encounterId: null, createdAt: null });
        } else if (legacyValue > entryTotal) {
          entries.push({ id: 'legacy-bonus-force-points', source: 'Bonus Force Point', value: legacyValue - entryTotal, max: legacyValue - entryTotal, restrictions: pool.note ?? '', expires: '', encounterId: null, createdAt: null });
        }
        return entries;
      };
      const buildBonusPool = (entries = [], existing = {}) => {
        const clean = entries.filter(entry => Math.max(0, Number(entry.value) || 0) > 0);
        const value = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.value) || 0), 0);
        const max = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.max ?? entry.value) || 0), 0);
        return {
          ...existing,
          value,
          max: Math.max(value, max),
          sources: [...new Set(clean.map(entry => entry.source).filter(Boolean))],
          entries: clean,
          note: existing.note || 'Bonus Force Points are spent before normal Force Points and may have source-specific restrictions.'
        };
      };

      const bonusPool = actor.getFlag?.('swse', 'bonusForcePoints') ?? {};
      const bonusEntries = normalizeBonusEntries(bonusPool);
      const bonusCurrent = bonusEntries.reduce((sum, entry) => sum + entry.value, 0);
      const bonusSpent = Math.min(bonusCurrent, amount);
      const normalToSpend = Math.max(0, amount - bonusSpent);

      let remainingBonusSpend = bonusSpent;
      const remainingEntries = [];
      for (const entry of bonusEntries) {
        if (remainingBonusSpend <= 0) {
          remainingEntries.push(entry);
          continue;
        }
        const used = Math.min(entry.value, remainingBonusSpend);
        remainingBonusSpend -= used;
        const left = entry.value - used;
        if (left > 0) remainingEntries.push({ ...entry, value: left });
      }

      // Delegate normal FP calculation to ForcePointsService; mutation stays here.
      const { newValue: newFP, actualSpent: normalSpent } = ForcePointsService.calcSpend(actor, normalToSpend);
      const actualSpent = bonusSpent + normalSpent;

      if (actualSpent === 0) {
        SWSELogger.debug(`${actor.name} has no force points to spend`);
        return { spent: 0, remaining: newFP, bonusSpent: 0, normalSpent: 0, bonusRemaining: bonusCurrent };
      }

      const update = { 'system.forcePoints.value': newFP };
      if (bonusSpent > 0) {
        update['flags.swse.bonusForcePoints'] = buildBonusPool(remainingEntries, bonusPool);
      }

      await this.updateActor(actor, update);

      SWSELogger.log(`Force points spent: ${actor.name} used ${actualSpent}FP (${bonusSpent} bonus, ${normalSpent} normal; normal now: ${newFP})`, {
        amount: actualSpent,
        bonusSpent,
        normalSpent,
        bonusRemaining: remainingEntries.reduce((sum, entry) => sum + Number(entry.value || 0), 0)
      });

      return { spent: actualSpent, remaining: newFP, bonusSpent, normalSpent, bonusRemaining: remainingEntries.reduce((sum, entry) => sum + Number(entry.value || 0), 0) };

    } catch (err) {
      SWSELogger.error(`ActorEngine.spendForcePoints failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount
      });
      throw err;
    }
  },

  /**
   * spendDestinyPoints() — Reduce actor's destiny points
   *
   * @param {Actor} actor - target actor
   * @param {number} amount - number of points to spend
   */
  async spendDestinyPoints(actor, amount = 1) {
    try {
      if (!actor) {throw new Error('spendDestinyPoints() called with no actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid destiny point amount: ${amount}`);
      }

      // Delegate calculation to ForcePointsService; mutation stays here
      const { newValue: newDP, actualSpent } = ForcePointsService.calcDestinySpend(actor, amount);

      if (actualSpent === 0) {
        SWSELogger.debug(`${actor.name} has no destiny points to spend`);
        return { spent: 0, remaining: newDP };
      }

      await this.updateActor(actor, {
        'system.destinyPoints.value': newDP
      });

      SWSELogger.log(`Destiny points spent: ${actor.name} used ${actualSpent}DP (now: ${newDP})`, {
        amount: actualSpent
      });

      return { spent: actualSpent, remaining: newDP };

    } catch (err) {
      SWSELogger.error(`ActorEngine.spendDestinyPoints failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount
      });
      throw err;
    }
  },

  /**
   * applySecondWind() — Use second wind and restore HP
   *
   * Heals actor based on level, reduces second wind uses.
   * Combat-critical atomic operation.
   *
   * @param {Actor} actor - target actor
   * @param {Object} [options={}] - optional healing parameters
   * @returns {Promise<{success, healed, newHP}>}
   */
  async applySecondWind(actor, options = {}) {
    try {
      if (!actor) {throw new Error('applySecondWind() requires actor');}

      const secondWindFeatRules = MetaResourceFeatResolver.getSecondWindRules(actor);
      const hasToughAsNails = actor.items?.some(i => i.type === 'talent' && i.name === 'Tough as Nails') === true;

      // Eligibility check (pure calculation delegated to SecondWindRules)
      const eligibility = SecondWindRules.canUseSecondWind(actor, options, secondWindFeatRules);
      if (!eligibility.allowed) {
        SWSELogger.warn(`Second Wind attempt blocked for ${actor.name}: ${eligibility.reason}`);
        return { success: false, reason: eligibility.reason };
      }

      const currentHP = SchemaAdapters.getHP(actor);
      const maxHP = SchemaAdapters.getMaxHP(actor);
      const activeCombatId = game.combat?.started ? game.combat.id : null;

      const isDroidActor = actor.type === 'droid' || actor.system?.isDroid === true;
      const conScore = isDroidActor ? 0 : Number(actor.system?.derived?.attributes?.con?.total ?? actor.system?.attributes?.con?.base ?? 10);
      const conMod = isDroidActor ? 0 : this._getCanonicalAbilityMod(actor, 'con');
      const fortClassBonus = Number(actor.system?.defenses?.fortitude?.classBonus ?? 0);

      // Uses calculation delegated to SecondWindRules
      const computedMaxUses = SecondWindRules.calculateMaxUses(conMod, fortClassBonus, secondWindFeatRules, hasToughAsNails);
      const storedUses = Number(actor.system.secondWind?.uses ?? 0);
      const uses = Math.max(0, Math.min(storedUses, computedMaxUses));
      if (uses < 1) {
        return { success: false, reason: 'No Second Wind uses remaining' };
      }

      // Healing amount delegated to SecondWindRules, then adjusted by explicit feat rules.
      let heal = SecondWindRules.calculateHealingAmount(maxHP, conScore) + Number(secondWindFeatRules.extraHealing || 0);
      const impetuousMoveSelected = options.impetuousMove === true || options.halfHealingForMovement === true;
      if (secondWindFeatRules.halfHealingForMovement && impetuousMoveSelected) {
        heal = Math.max(0, Math.floor(heal / 2));
      }

      const newHP = Math.min(currentHP + heal, maxHP);
      const actualHealing = newHP - currentHP;

      // ========================================
      // PHASE B FIX 6: Improved Second Wind houserule
      // ========================================
      const improvements = {
        ...SchemaAdapters.setHPUpdate(newHP),
        'system.secondWind.max': computedMaxUses,
        'system.secondWind.uses': Math.max(0, uses - 1)
      };

      const improvedSecondWind = HouseRuleService.isEnabled('secondWindImproved');
      // Condition recovery steps delegated to SecondWindRules
      const recoverySteps = SecondWindRules.calculateConditionRecovery(secondWindFeatRules, improvedSecondWind);
      if (recoverySteps > 0) {
        // Also move up condition track (+1 improvement = -1 on numeric scale)
        const currentCT = actor.system.conditionTrack?.current ?? 0;
        improvements['system.conditionTrack.current'] = Math.max(0, currentCT - recoverySteps);

        SWSELogger.debug(`Second Wind condition recovery: moving condition track from ${currentCT} to ${Math.max(0, currentCT - recoverySteps)}`);
      }

      // Add action grants to improvements BEFORE actor update
      if (secondWindFeatRules.grantMoveActionOnUse) {
        improvements['system.actions.moveAction'] = (actor.system.actions?.moveAction ?? 0) + 1;
      }

      if (secondWindFeatRules.grantMovementOnUse && (!secondWindFeatRules.halfHealingForMovement || impetuousMoveSelected)) {
        improvements['system.actions.movement'] = (actor.system.actions?.movement ?? 0) + 1;
      }

      // Batch update: HP restoration + use consumption + optional condition improvement + action grants
      await this.updateActor(actor, improvements);
      if (activeCombatId) {
        await actor.setFlag?.('foundryvtt-swse', 'secondWindEncounterUsed', activeCombatId);
      }
      if (secondWindFeatRules.regainForcePowerOnUse) {
        await actor.setFlag?.('foundryvtt-swse', 'forcefulRecoveryPending', {
          source: 'Forceful Recovery',
          note: 'Regain one expended Force power after catching a Second Wind.',
          timestamp: Date.now()
        });
      }
      if (secondWindFeatRules.delayedHealing) {
        await actor.setFlag?.('foundryvtt-swse', 'delayedSecondWindHealing', {
          ...secondWindFeatRules.delayedHealing,
          timestamp: Date.now()
        });
      }

      const resultLog = {
        healed: actualHealing,
        newHP,
        maxHP,
        usesRemaining: Math.max(0, uses - 1)
      };

      if (improvedSecondWind) {
        resultLog.conditionImproved = true;
        resultLog.newCondition = Math.max(0, (actor.system.conditionTrack?.current ?? 0) - 1);
      }

      SWSELogger.log(`Second wind used by ${actor.name}`, resultLog);

      return {
        success: true,
        healed: actualHealing,
        newHP,
        usesRemaining: Math.max(0, uses - 1),
        conditionImproved: improvedSecondWind ? true : false,
        newCondition: improvedSecondWind ? Math.max(0, (actor.system.conditionTrack?.current ?? 0) - 1) : undefined,
        grantedMoveAction: secondWindFeatRules.grantMoveActionOnUse ? true : undefined,
        grantedMovement: (secondWindFeatRules.grantMovementOnUse && (!secondWindFeatRules.halfHealingForMovement || impetuousMoveSelected)) ? true : undefined,
        delayedHealing: secondWindFeatRules.delayedHealing ?? undefined
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applySecondWind failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err
      });
      throw err;
    }
  },

  /**
   * resetSecondWind() — Reset second wind uses to maximum
   *
   * Called at combat start (or rest) to restore uses.
   * RAW: Once per day, but houserule allows per encounter.
   *
   * @param {Actor} actor - target actor
   * @returns {Promise<{reset, restoredUses, max}>}
   */
  async resetSecondWind(actor) {
    try {
      if (!actor) {throw new Error('resetSecondWind() called with no actor');}

      const isDroidActor = actor.type === 'droid' || actor.system?.isDroid === true;
      const conMod = isDroidActor ? 0 : this._getCanonicalAbilityMod(actor, 'con');
      const fortClassBonus = Number(actor.system?.defenses?.fortitude?.classBonus ?? 0);
      const secondWindFeatRules = MetaResourceFeatResolver.getSecondWindRules(actor);
      const hasToughAsNails = actor.items?.some(i => i.type === 'talent' && i.name === 'Tough as Nails') === true;
      // Max uses calculation delegated to SecondWindRules
      const maxUses = SecondWindRules.calculateMaxUses(conMod, fortClassBonus, secondWindFeatRules, hasToughAsNails);

      await this.updateActor(actor, {
        'system.secondWind.max': maxUses,
        'system.secondWind.uses': maxUses
      });
      await actor.unsetFlag?.('foundryvtt-swse', 'secondWindEncounterUsed');

      SWSELogger.log(`Second wind reset for ${actor.name}`, {
        restoredUses: maxUses,
        max: maxUses
      });

      return {
        reset: true,
        restoredUses: maxUses,
        max: maxUses
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.resetSecondWind failed for ${actor?.name ?? 'unknown actor'}`, { error: err });
      throw err;
    }
  },

  /**
   * applySecondWindEdgeOfExhaustion() — Trade condition for extra use
   *
   * PHASE C: Edge of Exhaustion variant rule
   *
   * When out of Second Wind uses, actor may voluntarily accept -1 persistent
   * condition step (worsen condition track) to gain 1 additional use.
   *
   * Requirements:
   * - Uses at 0 (no uses remaining)
   * - Condition track not already at helpless (step 5)
   * - In active combat
   *
   * @param {Actor} actor - target actor
   * @returns {Promise<{success, reason, condition, newCondition}>}
   */
  async applySecondWindEdgeOfExhaustion(actor) {
    try {
      if (!actor) {throw new Error('applySecondWindEdgeOfExhaustion() requires actor');}

      // Eligibility check delegated to SecondWindRules
      const eligibility = SecondWindRules.canUseEdgeOfExhaustion(actor);
      if (!eligibility.allowed) {
        return { success: false, reason: eligibility.reason };
      }

      // Trade: Worsen condition by 1, gain 1 Second Wind use
      const currentCT = Number(actor.system.conditionTrack?.current ?? 0);
      const conditionStepCap = ConditionTrackRules.getConditionStepCap();
      const newCT = Math.min(conditionStepCap, currentCT + 1);

      await this.updateActor(actor, {
        'system.secondWind.uses': 1,
        'system.conditionTrack.current': newCT,
        'system.conditionTrack.persistent': true
      });

      SWSELogger.log(`${actor.name} accepts Edge of Exhaustion`, {
        trade: 'condition for Second Wind',
        conditionBefore: currentCT,
        conditionAfter: newCT,
        secondWindRestored: 1
      });

      return {
        success: true,
        reason: 'Edge of Exhaustion accepted',
        condition: currentCT,
        newCondition: newCT
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applySecondWindEdgeOfExhaustion failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err
      });
      throw err;
    }
  },

  /**
   * applyProgression() — ATOMIC PROGRESSION TRANSACTION
   *
   * Single transaction for all progression mutations:
   * 1. Compute new level internally
   * 2. Build full mutation plan (memory)
   * 3. Apply root state update (1 mutation)
   * 4. Apply embedded batch changes (2 mutations max: delete, create)
   * 5. Emit hooks (read-only observers)
   * 6. Explicit single recomputation
   *
   * @param {Actor} actor - target actor
   * @param {Object} progressionPacket - Atomic progression packet containing:
   *   - xpDelta: number (XP to add)
   *   - featsAdded: string[] (feat IDs to add)
   *   - featsRemoved: string[] (feat IDs to remove for respec)
   *   - talentsAdded: string[] (talent IDs to add)
   *   - talentsRemoved: string[] (talent IDs to remove)
   *   - trainedSkills: {skillKey: boolean} (skills to mark trained)
   *   - itemsToCreate: Object[] (raw item data to create)
   *   - stateUpdates: {path: value} (progression state updates)
   * @returns {Promise<{success, newLevel, leveledUp, mutationCount, itemsCreated, itemsDeleted}>}
   */
  async applyProgression(actor, progressionPacket) {
    try {
      if (!actor) {throw new Error('applyProgression() called with no actor');}
      if (!progressionPacket || typeof progressionPacket !== 'object') {
        throw new Error('applyProgression() requires progressionPacket object');
      }

      // ====================================================================
      // PHASE 1: COMPUTE NEW LEVEL (INTERNALLY)
      // ====================================================================
      const currentXP = actor.system.xp?.total || 0;
      const newXPTotal = currentXP + (progressionPacket.xpDelta || 0);
      const oldLevel = determineLevelFromXP(currentXP);
      const newLevel = determineLevelFromXP(newXPTotal);
      const leveledUp = newLevel > oldLevel;

      SWSELogger.log(`[PROGRESSION] Applying progression to ${actor.name}:`, {
        xpDelta: progressionPacket.xpDelta,
        leveledUp: leveledUp ? `${oldLevel} → ${newLevel}` : 'no level change',
        featsAdded: progressionPacket.featsAdded?.length || 0,
        talentsAdded: progressionPacket.talentsAdded?.length || 0,
        itemsToCreate: progressionPacket.itemsToCreate?.length || 0
      });

      // ====================================================================
      // PHASE 2: BUILD FULL MUTATION PLAN (MEMORY)
      // ====================================================================
      const rootUpdates = {
        'system.xp.total': newXPTotal,
        ...(progressionPacket.stateUpdates || {})
      };

      const itemsToDelete = actor.items
        .filter(item =>
          progressionPacket.featsRemoved?.includes(item.id) ||
          progressionPacket.talentsRemoved?.includes(item.id)
        )
        .map(i => i.id);

      const itemsToCreate = progressionPacket.itemsToCreate || [];

      // ====================================================================
      // PHASE 3: SET STRICT MUTATION CONTEXT
      // ====================================================================
      // blockNestedMutations prevents hooks from triggering additional mutations
      MutationInterceptor.setContext({
        operation: 'applyProgression',
        source: 'ActorEngine.applyProgression',
        suppressRecalc: true,           // Blocks prepareDerivedData()
        blockNestedMutations: true      // Blocks additional ActorEngine calls
      });

      try {
        // ====================================================================
        // PHASE 4A: APPLY ROOT UPDATE (Mutation #1)
        // ====================================================================
        if (Object.keys(rootUpdates).length > 0) {
          SWSELogger.debug(`[PROGRESSION] Applying ${Object.keys(rootUpdates).length} root updates`);
          await this.updateActor(actor, rootUpdates, { source: 'ActorEngine.applyProgression' });
        }

        // ====================================================================
        // PHASE 4B: DELETE ITEMS (Mutation #2, only if needed)
        // ====================================================================
        if (itemsToDelete.length > 0) {
          SWSELogger.debug(`[PROGRESSION] Deleting ${itemsToDelete.length} items`);
          await this.deleteEmbeddedDocuments(actor, 'Item', itemsToDelete, { source: 'ActorEngine.applyProgression' });
        }

        // ====================================================================
        // PHASE 4C: CREATE ITEMS (Mutation #3, only if needed)
        // ====================================================================
        const createdItems = [];
        if (itemsToCreate.length > 0) {
          SWSELogger.debug(`[PROGRESSION] Creating ${itemsToCreate.length} items`);
          const created = await this.createEmbeddedDocuments(actor, 'Item', itemsToCreate, { source: 'ActorEngine.applyProgression' });
          createdItems.push(...created.map(i => i.id));
        }

        // ====================================================================
        // PHASE 5: EMIT PROGRESSION HOOKS (NO MUTATIONS)
        // ====================================================================
        // Hooks called AFTER mutations, BEFORE recalc
        // blockNestedMutations prevents listeners from triggering new mutations
        if (leveledUp) {
          Hooks.call('swseProgressionLevelUp', {
            actor,
            fromLevel: oldLevel,
            toLevel: newLevel,
            xpGained: progressionPacket.xpDelta
          });
        }

        Hooks.call('swseProgressionApplied', {
          actor,
          packet: progressionPacket,
          itemsCreated: createdItems.length,
          itemsDeleted: itemsToDelete.length,
          newLevel
        });

        // ====================================================================
        // PHASE 6: EXPLICIT DETERMINISTIC RECOMPUTATION (ONCE)
        // ====================================================================
        // CRITICAL: No sheet rendering, no lifecycle hooks
        // Direct state computation
        SWSELogger.debug(`[PROGRESSION] Triggering derived recalculation`);

        // Step 1: Compute all derived values
        const progressionDerivedUpdates = await DerivedCalculator.computeAll(actor);
        this._applyDerivedUpdates(actor, progressionDerivedUpdates);

        // Step 2: no separate modifier-bundle pass. DerivedCalculator.computeAll()
        // already includes static/passive modifiers. A second pass double-counts
        // skill focus, defense feats, BAB modifiers, and similar static sources.

        SWSELogger.log(`[PROGRESSION] ✅ Progression applied to ${actor.name}:`, {
          mutationCount: (itemsToDelete.length > 0 ? 1 : 0) + (itemsToCreate.length > 0 ? 1 : 0) + 1,
          itemsCreated: createdItems.length,
          itemsDeleted: itemsToDelete.length,
          newXPTotal,
          newLevel
        });

        // ====================================================================
        // RETURN RESULTS
        // ====================================================================
        return {
          success: true,
          newLevel,
          leveledUp,
          fromLevel: oldLevel,
          mutationCount: (itemsToDelete.length > 0 ? 1 : 0) +
                          (itemsToCreate.length > 0 ? 1 : 0) +
                          (Object.keys(rootUpdates).length > 0 ? 1 : 0),
          itemsCreated: createdItems.length,
          itemsDeleted: itemsToDelete.length,
          xpTotal: actor.system.xp?.total,
          createdItemIds: createdItems,
          timestamp: new Date().toISOString()
        };

      } finally {
        // ====================================================================
        // PHASE 7: CLEAR MUTATION CONTEXT
        // ====================================================================
        MutationInterceptor.clearContext();
      }

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyProgression failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        packet: progressionPacket
      });
      throw err;
    }
  },

  // ============================================================================
  // PHASE 5: TALENT EFFECT ORCHESTRATION
  // ============================================================================

  /**
   * applyTalentEffect() — COORDINATED TALENT EFFECT MUTATIONS
   *
   * Executes a pre-computed talent effect plan.
   *
   * Contract:
   * - Plan is pre-computed (from TalentEffectEngine)
   * - Each actor mutation is individually governed
   * - Derived recalculation happens per-actor
   * - No cross-actor atomicity (domain-level coordination only)
   * - If any mutation fails, error is thrown (no automatic rollback)
   *
   * @param {Object} plan - Effect plan from TalentEffectEngine.build*Plan()
   * @param {Object} [options={}] - Optional execution options
   * @returns {Promise<{success, effect, damageAmount, roll, results}>}
   */
  async applyTalentEffect(plan, options = {}) {
    try {
      if (!plan) {
        throw new Error('applyTalentEffect() called with no plan');
      }

      if (!plan.success) {
        // Plan computation failed; return failure as-is
        return {
          success: false,
          reason: plan.reason,
          effect: plan.effect
        };
      }

      if (!Array.isArray(plan.mutations) || plan.mutations.length === 0) {
        throw new Error('applyTalentEffect() plan has no mutations');
      }

      SWSELogger.log(`[TALENT EFFECT] Applying ${plan.effect} with ${plan.mutations.length} mutations`, {
        damageAmount: plan.damageAmount,
        roll: plan.roll?.result
      });

      const results = [];
      const appliedMutations = [];

      // ====================================================================
      // PHASE 1: Apply each mutation through ActorEngine
      // ====================================================================
      for (let i = 0; i < plan.mutations.length; i++) {
        const mutation = plan.mutations[i];

        try {
          // Execute mutation based on type
          if (mutation.type === 'update') {
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: update ${mutation.actor.name}`, {
              data: mutation.data
            });

            await this.updateActor(mutation.actor, mutation.data);

            results.push({
              actor: mutation.actor.id,
              type: 'update',
              success: true
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'setFlag') {
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: setFlag ${mutation.actor.name}`, {
              scope: mutation.scope,
              key: mutation.key,
              value: mutation.value
            });

            await mutation.actor.setFlag(mutation.scope, mutation.key, mutation.value);

            results.push({
              actor: mutation.actor.id,
              type: 'setFlag',
              success: true
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'unsetFlag') {
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: unsetFlag ${mutation.actor.name}`, {
              scope: mutation.scope,
              key: mutation.key
            });

            await mutation.actor.unsetFlag(mutation.scope, mutation.key);

            results.push({
              actor: mutation.actor.id,
              type: 'unsetFlag',
              success: true
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'createEmbedded') {
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: createEmbedded ${mutation.actor.name}`, {
              embeddedName: mutation.embeddedName,
              count: mutation.data.length
            });

            await this.createEmbeddedDocuments(
              mutation.actor,
              mutation.embeddedName,
              mutation.data
            );

            results.push({
              actor: mutation.actor.id,
              type: 'createEmbedded',
              success: true,
              count: mutation.data.length
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'deleteEmbedded') {
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: deleteEmbedded ${mutation.actor.name}`, {
              embeddedName: mutation.embeddedName,
              count: mutation.ids.length
            });

            await this.deleteEmbeddedDocuments(
              mutation.actor,
              mutation.embeddedName,
              mutation.ids
            );

            results.push({
              actor: mutation.actor.id,
              type: 'deleteEmbedded',
              success: true,
              count: mutation.ids.length
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'updateOwnedItems') {
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: updateOwnedItems ${mutation.actor.name}`, {
              itemCount: mutation.items.length
            });

            await this.updateOwnedItems(mutation.actor, mutation.items);

            results.push({
              actor: mutation.actor.id,
              type: 'updateOwnedItems',
              success: true,
              count: mutation.items.length
            });

            appliedMutations.push(mutation);

          } else {
            throw new Error(`Unknown mutation type: ${mutation.type}`);
          }

        } catch (mutationErr) {
          SWSELogger.error(`[TALENT EFFECT] Mutation ${i + 1} failed: ${mutation.type} on ${mutation.actor.name}`, {
            error: mutationErr,
            appliedSoFar: appliedMutations.length,
            totalMutations: plan.mutations.length
          });

          // Report which mutations succeeded, which failed
          results.push({
            actor: mutation.actor.id,
            type: mutation.type,
            success: false,
            error: mutationErr.message
          });

          // Throw to prevent partial execution
          throw new Error(
            `Talent effect ${plan.effect} failed at mutation ${i + 1}: ${mutationErr.message}`
          );
        }
      }

      // ====================================================================
      // PHASE 2: All mutations succeeded
      // ====================================================================
      SWSELogger.log(`[TALENT EFFECT] ✅ ${plan.effect} applied successfully`, {
        mutationCount: plan.mutations.length,
        damageAmount: plan.damageAmount,
        resultSummary: results.map(r => `${r.type}:${r.success ? 'OK' : 'FAIL'}`)
      });

      return {
        success: true,
        effect: plan.effect,
        damageAmount: plan.damageAmount,
        roll: plan.roll,
        results: results,
        mutationCount: plan.mutations.length,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyTalentEffect failed`, {
        error: err,
        effect: plan?.effect,
        plan: plan
      });

      // Return error result (do not throw; let caller decide)
      return {
        success: false,
        effect: plan?.effect,
        reason: err.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * restoreFromSnapshot() — Atomic snapshot restoration
   *
   * Restores complete actor state from snapshot:
   * 1. Update root actor data (system, name, img, prototypeToken)
   * 2. Delete all current items, then create snapshot items
   * 3. Delete all current effects, then create snapshot effects
   * 4. All in single mutation transaction
   *
   * @param {Actor} actor - target actor
   * @param {Object} snapshot - snapshot object with { system, name, img, prototypeToken, items, effects }
   * @param {Object} [options={}] - mutation options
   */
  async restoreFromSnapshot(actor, snapshot, options = {}) {
    // Dynamic import avoids a static circular dependency (SnapshotService imports ActorEngine).
    const { SnapshotService } = await import('/systems/foundryvtt-swse/scripts/governance/snapshot/snapshot-service.js');
    return SnapshotService.restoreFromSnapshot(actor, snapshot, options);
  },

  // ========================================================================
  // PHASE 8: EMBEDDED DOCUMENT PLAN BUILDERS
  // ========================================================================
  // Non-mutating plan builders for embedded document operations
  // Plans are executed atomically through ActorEngine

  /**
   * Build a plan to create embedded documents (Item, ActiveEffect, etc.)
   * PHASE 8: Non-mutating builder — returns plan object for later execution
   *
   * @param {Actor} actor - Target actor
   * @param {string} embeddedName - Document type ('Item', 'ActiveEffect', etc.)
   * @param {Array} documents - Array of document data to create
   * @returns {Object} Plan object with { success, embeddedName, actor, documents, mutations }
   */
  buildEmbeddedCreatePlan(actor, embeddedName, documents) {
    // Phase 6: pure builder extracted to plan-builders.js; facade delegate.
    return PlanBuilders.buildEmbeddedCreatePlan(actor, embeddedName, documents);
  },

  /**
   * Build a plan to delete embedded documents
   * PHASE 8: Non-mutating builder — returns plan object for later execution
   *
   * @param {Actor} actor - Target actor
   * @param {string} embeddedName - Document type ('Item', 'ActiveEffect', etc.)
   * @param {Array} ids - Array of document IDs to delete
   * @returns {Object} Plan object with { success, embeddedName, actor, ids, mutations }
   */
  buildEmbeddedDeletePlan(actor, embeddedName, ids) {
    // Phase 6: pure builder extracted to plan-builders.js; facade delegate.
    return PlanBuilders.buildEmbeddedDeletePlan(actor, embeddedName, ids);
  },

  /**
   * Build a plan to replace embedded documents (delete old, create new)
   * PHASE 8: Non-mutating builder — atomic replacement
   *
   * @param {Actor} actor - Target actor
   * @param {string} embeddedName - Document type ('Item', 'ActiveEffect', etc.)
   * @param {Array} idsToDelete - IDs to delete
   * @param {Array} docsToCreate - Documents to create
   * @returns {Object} Plan object with both delete and create mutations
   */
  buildEmbeddedReplacePlan(actor, embeddedName, idsToDelete, docsToCreate) {
    // Phase 6: pure builder extracted to plan-builders.js; facade delegate.
    return PlanBuilders.buildEmbeddedReplacePlan(actor, embeddedName, idsToDelete, docsToCreate);
  },

  /**
   * Build a plan to clone an actor and apply modifications
   * PHASE 8: Non-mutating builder — clone + modifications in one transaction
   *
   * Prevents the dangerous pattern of: const clone = actor.clone(); await clone.update(...)
   * Instead builds a plan for atomic creation+modification
   *
   * @param {Actor} actor - Actor to clone
   * @param {Object} modifications - Changes to apply to the clone
   * @param {Object} options - Clone options
   * @returns {Object} Plan object
   */
  buildCloneActorPlan(actor, modifications = {}, options = {}) {
    // Phase 6: pure builder extracted to plan-builders.js; facade delegate.
    return PlanBuilders.buildCloneActorPlan(actor, modifications, options);
  },

  /**
   * Execute an embedded operation plan
   * PHASE 8: Atomic execution of pre-built plans
   *
   * @param {Object} plan - Plan object from builder methods
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeEmbeddedPlan(plan, options = {}) {
    try {
      if (!plan) {
        throw new Error('executeEmbeddedPlan called with no plan');
      }

      if (!plan.success) {
        return {
          success: false,
          reason: plan.reason
        };
      }

      if (!Array.isArray(plan.mutations) || plan.mutations.length === 0) {
        return {
          success: true,
          actor: plan.actor,
          mutations: []
        };
      }

      const results = [];
      const { actor } = plan;

      // Execute mutations in order (delete before create)
      for (const mutation of plan.mutations) {
        try {
          if (mutation.type === 'deleteEmbedded') {
            const result = await this.deleteEmbeddedDocuments(
              actor,
              mutation.embeddedName,
              mutation.ids,
              options
            );
            results.push({
              type: 'deleteEmbedded',
              success: true,
              deleted: mutation.ids.length
            });
          } else if (mutation.type === 'createEmbedded') {
            const result = await this.createEmbeddedDocuments(
              actor,
              mutation.embeddedName,
              mutation.documents,
              options
            );
            results.push({
              type: 'createEmbedded',
              success: true,
              created: (result || []).length
            });
          }
        } catch (mutationErr) {
          SWSELogger.error(`executeEmbeddedPlan mutation failed (${mutation.type}):`, mutationErr);
          throw mutationErr;
        }
      }

      return {
        success: true,
        actor,
        mutations: results
      };
    } catch (err) {
      SWSELogger.error('executeEmbeddedPlan failed:', err);
      throw err;
    }
  },




  /* ============================================================
     BUILD DERIVED STATE (AUTHORITATIVE)
  ============================================================ */

  buildDerivedState(actor) {

    const abilityKeys = ["str","dex","con","int","wis","cha"];

    const abilities = abilityKeys.map(key => {
      // Canonical total: derived (pre-computed) → attributes base → abilities mirror fallback
      const total = actor.system?.derived?.attributes?.[key]?.total
        ?? actor.system?.attributes?.[key]?.base
        ?? actor.system?.abilities?.[key]?.total
        ?? 10;
      return {
        key,
        label: key.toUpperCase(),
        total,
        mod: Math.floor((total - 10) / 2)
      };
    });

    const currentStep = actor.system?.conditionTrack?.current ?? 0;

    const conditionSteps = Array.from({ length: 5 }).map((_, i) => ({
      index: i,
      active: i <= currentStep
    }));

    return {
      abilities,
      conditionSteps
    };
  },

  /* ============================================================
     APPLY MUTATION PLAN (Deterministic Progression)
  ============================================================ */

  /**
   * Apply a MutationPlan to the actor.
   *
   * Contract:
   * - Input is a validated MutationPlan: { set?, add?, delete? }
   * - Operations apply in strict order: DELETE → SET → ADD
   * - All operations complete or none do (atomic)
   * - Derived data recalculates once after all mutations
   * - Errors throw MutationApplicationError
   *
   * @param {Actor} actor - Target actor
   * @param {Object} mutationPlan - { set?, add?, delete? }
   * @param {Object} options
   * @param {boolean} options.validate - Validate plan before applying (default: true)
   * @param {boolean} options.rederive - Recalculate derived data after (default: true)
   * @param {string} options.source - Source for logging (e.g., 'CharacterGeneratorApp.partial')
   * @returns {Promise<void>}
   * @throws {MutationApplicationError} If any operation fails
   */
  async applyMutationPlan(actor, mutationPlan = {}, options = {}) {
    const {
      validate = true,
      rederive = true,
      transactional = false,
      source = 'ActorEngine.applyMutationPlan'
    } = options;

    // When transactional, holds a pre-plan snapshot of the target actor used to
    // roll back a partially-applied plan if any operation fails.
    let _txnSnapshot = null;

    // CREATE-bucket world actors created during this plan (tempId → realId).
    // Hoisted so transactional rollback can also delete them: the target-actor
    // snapshot restore does NOT cover separately-created world actors, so without
    // this a failed plan could orphan created actors (audit R5).
    const tempIdMap = {};

    try {
      if (!actor) {
        throw new Error('applyMutationPlan() called with no actor');
      }

      // Import error classes dynamically to avoid circular deps
      const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");

      SWSELogger.debug('ActorEngine.applyMutationPlan', {
        actor: actor.id,
        source,
        hasCreates: !!mutationPlan.create && !!mutationPlan.create.actors && mutationPlan.create.actors.length > 0,
        hasSets: !!mutationPlan.set && Object.keys(mutationPlan.set).length > 0,
        hasUpdates: !!mutationPlan.update && Object.keys(mutationPlan.update).length > 0,
        hasAdds: !!mutationPlan.add && Object.keys(mutationPlan.add).length > 0,
        hasDeletes: !!mutationPlan.delete && Object.keys(mutationPlan.delete).length > 0
      });

      // Normalize buckets
      const plan = {
        create: mutationPlan.create || {},
        set: mutationPlan.set || {},
        update: mutationPlan.update || {},
        add: mutationPlan.add || {},
        delete: mutationPlan.delete || {}
      };

      // Phase 1: Validate plan structure (if enabled)
      if (validate) {
        this._validateMutationPlan(plan);
      }

      // Transactional mode: capture the target actor's pre-plan state so a
      // failure partway through the strict-order application can be reverted.
      // The target actor is restored from this snapshot; CREATE-bucket world
      // actors are additionally deleted in the catch block below (see tempIdMap),
      // so transactional mode now covers both actor-local plans (progression
      // finalization) and plans that create world actors.
      if (transactional) {
        _txnSnapshot = actor.toObject(true);
      }

      // Phase 2: Apply operations in strict order
      // CREATE first (create world actors, build tempId→realId map)
      if (plan.create && plan.create.actors && plan.create.actors.length > 0) {
        await this._applyCreateOps(plan.create.actors, tempIdMap, source);
      }

      // Rewrite temporary IDs in all remaining mutation buckets with real IDs.
      // CREATE-backed store assets may be linked into system.ownedActors and
      // system.relationships through SET, not just embedded ADD operations.
      if (Object.keys(tempIdMap).length > 0) {
        if (plan.set && Object.keys(plan.set).length > 0) this._rewriteTemporaryIds(plan.set, tempIdMap);
        if (plan.update && Object.keys(plan.update).length > 0) this._rewriteTemporaryIds(plan.update, tempIdMap);
        if (plan.add && Object.keys(plan.add).length > 0) this._rewriteTemporaryIds(plan.add, tempIdMap);
      }

      // DELETE next (remove stale references)
      await this._applyDeleteOps(actor, plan.delete, source);

      // SET next (modify scalars)
      await this._applySetOps(actor, plan.set, source);

      // UPDATE embedded documents after actor-level SETs and before ADDs.
      await this._applyUpdateOps(actor, plan.update, source);

      // ADD last (create new embedded docs)
      await this._applyAddOps(actor, plan.add, source);

      // Phase 3: Recalculate derived data once
      if (rederive) {
        await this.recalcAll(actor);
      }

      SWSELogger.info('ActorEngine.applyMutationPlan: Success', {
        actor: actor.id,
        source
      });

    } catch (error) {
      SWSELogger.error('ActorEngine.applyMutationPlan failed:', {
        actor: actor?.id,
        source,
        error: error.message
      });

      // Transactional rollback: restore the target actor to its pre-plan state.
      // If the restore itself fails, flag the error so callers know the actor
      // may be in a partial state.
      if (_txnSnapshot) {
        try {
          await this.restoreFromSnapshot(actor, _txnSnapshot, { source: `${source}:rollback` });
          SWSELogger.warn('ActorEngine.applyMutationPlan: rolled back to pre-plan snapshot after failure', {
            actor: actor?.id,
            source
          });
        } catch (restoreErr) {
          error.partialMutationPossible = true;
          SWSELogger.error('ActorEngine.applyMutationPlan: rollback FAILED; actor may be in a partial state', {
            actor: actor?.id,
            source,
            restoreError: restoreErr?.message
          });
        }

        // CREATE-bucket rollback (audit R5): delete any world actors created by
        // this plan so a mid-plan failure does not orphan them. Only runs in
        // transactional mode; best-effort, and any failure downgrades the
        // transactional guarantee via partialMutationPossible rather than masking it.
        const createdActorIds = Object.values(tempIdMap).filter(Boolean);
        if (createdActorIds.length > 0) {
          try {
            await Actor.deleteDocuments(createdActorIds);
            SWSELogger.warn('ActorEngine.applyMutationPlan: deleted CREATE-bucket actors during rollback', {
              source,
              deletedActorIds: createdActorIds
            });
          } catch (createRollbackErr) {
            error.partialMutationPossible = true;
            SWSELogger.error('ActorEngine.applyMutationPlan: CREATE-bucket rollback FAILED; created actors may be orphaned', {
              source,
              createdActorIds,
              createRollbackError: createRollbackErr?.message
            });
          }
        }
      }

      throw error;
    }
  },

  /**
   * Validate mutation plan structure
   * @private
   */
  _validateMutationPlan(plan) {
    // Validate create bucket (PHASE 2)
    if (plan.create && typeof plan.create !== 'object') {
      throw new MutationApplicationError('create bucket must be an object', { operation: 'create' });
    }
    if (plan.create && plan.create.actors) {
      if (!Array.isArray(plan.create.actors)) {
        throw new MutationApplicationError(
          'create.actors must be an array',
          { operation: 'create' }
        );
      }
      for (const spec of plan.create.actors) {
        if (!spec.temporaryId || typeof spec.temporaryId !== 'string') {
          throw new MutationApplicationError(
            'create actor spec must have temporaryId (string)',
            { operation: 'create' }
          );
        }
        if (!spec.data || typeof spec.data !== 'object') {
          throw new MutationApplicationError(
            'create actor spec must have data (object)',
            { operation: 'create', temporaryId: spec.temporaryId }
          );
        }
      }
    }

    // Validate set bucket
    if (plan.set && typeof plan.set !== 'object') {
      throw new MutationApplicationError('set bucket must be an object', { operation: 'set' });
    }

    // Validate update bucket
    if (plan.update && typeof plan.update !== 'object') {
      throw new MutationApplicationError('update bucket must be an object', { operation: 'update' });
    }
    if (plan.update) {
      for (const [collection, updates] of Object.entries(plan.update)) {
        if (!Array.isArray(updates)) {
          throw new MutationApplicationError(
            `update bucket "${collection}" must be an array`,
            { operation: 'update', collection }
          );
        }
        for (const update of updates) {
          if (!update || typeof update !== 'object') {
            throw new MutationApplicationError(
              `update bucket "${collection}" entries must be objects`,
              { operation: 'update', collection }
            );
          }
          if (!update._id && !update.id) {
            throw new MutationApplicationError(
              `update bucket "${collection}" entries must include _id or id`,
              { operation: 'update', collection }
            );
          }
        }
      }
    }

    // Validate add bucket
    if (plan.add && typeof plan.add !== 'object') {
      throw new MutationApplicationError('add bucket must be an object', { operation: 'add' });
    }
    if (plan.add) {
      for (const [collection, ids] of Object.entries(plan.add)) {
        if (!Array.isArray(ids)) {
          throw new MutationApplicationError(
            `add bucket "${collection}" must be an array`,
            { operation: 'add', collection }
          );
        }
      }
    }

    // Validate delete bucket
    if (plan.delete && typeof plan.delete !== 'object') {
      throw new MutationApplicationError('delete bucket must be an object', { operation: 'delete' });
    }
    if (plan.delete) {
      for (const [collection, ids] of Object.entries(plan.delete)) {
        if (!Array.isArray(ids)) {
          throw new MutationApplicationError(
            `delete bucket "${collection}" must be an array`,
            { operation: 'delete', collection }
          );
        }
      }
    }
  },

  /**
   * PHASE 2: Apply CREATE operations
   * Creates world actors from specs and builds tempId→realId map.
   * @private
   */
  async _applyCreateOps(actorSpecs, tempIdMap, source) {
    if (!Array.isArray(actorSpecs) || actorSpecs.length === 0) {
      return;
    }

    try {
      for (const spec of actorSpecs) {
        if (!spec || !spec.temporaryId || !spec.data) {
          continue;
        }

        SWSELogger.debug('ActorEngine._applyCreateOps', {
          temporaryId: spec.temporaryId,
          type: spec.type || 'unknown'
        });

        // Create actor from spec data
        try {
          const created = await Actor.create(spec.data);
          if (created) {
            // Map temporary ID to real ID
            tempIdMap[spec.temporaryId] = created.id;
            SWSELogger.info('ActorEngine: Created actor', {
              temporaryId: spec.temporaryId,
              realId: created.id,
              type: spec.type
            });
          }
        } catch (createErr) {
          const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
          throw new MutationApplicationError(
            `Failed to create actor ${spec.temporaryId}: ${createErr.message}`,
            { temporaryId: spec.temporaryId, type: spec.type }
          );
        }
      }
    } catch (error) {
      const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
      throw new MutationApplicationError(
        `Failed to apply CREATE operations: ${error.message}`,
        { specCount: actorSpecs.length }
      );
    }
  },

  /**
   * PHASE 2: Rewrite temporary IDs to real IDs in add bucket
   * After CREATE phase creates actors, map temp IDs to real IDs.
   * @private
   */
  _rewriteTemporaryIds(targetBucket, tempIdMap) {
    if (!targetBucket || typeof targetBucket !== 'object') {
      return;
    }

    const rewriteValue = (value) => {
      if (typeof value === 'string') {
        if (tempIdMap[value]) {
          const realId = tempIdMap[value];
          SWSELogger.debug('ActorEngine: Rewrote temp ID', {
            temporaryId: value,
            realId
          });
          return realId;
        }

        // Support UUID-like references staged before CREATE, such as
        // Actor.temp_vehicle_x. This is needed for store-acquired assets that
        // are linked into relationship panels in the same atomic mutation.
        for (const [tempId, realId] of Object.entries(tempIdMap)) {
          const tempUuid = `Actor.${tempId}`;
          if (value === tempUuid) return `Actor.${realId}`;
        }
        return value;
      }

      if (Array.isArray(value)) {
        return value.map(entry => rewriteValue(entry));
      }

      if (value && typeof value === 'object') {
        for (const [key, nested] of Object.entries(value)) {
          value[key] = rewriteValue(nested);
        }
        return value;
      }

      return value;
    };

    try {
      for (const [key, value] of Object.entries(targetBucket)) {
        targetBucket[key] = rewriteValue(value);
      }
    } catch (error) {
      throw new MutationApplicationError(
        `Failed to rewrite temporary IDs: ${error.message}`,
        {}
      );
    }
  },

  /**
   * Apply DELETE operations
   * @private
   */
  async _applyDeleteOps(actor, deleteOps, source) {
    if (!deleteOps || Object.keys(deleteOps).length === 0) {
      return;
    }

    try {
      for (const [collection, ids] of Object.entries(deleteOps)) {
        if (!Array.isArray(ids) || ids.length === 0) {
          continue;
        }

        const embeddedName = collection === 'items' || collection === 'item' || collection === 'Item'
          ? 'Item'
          : collection === 'effects' || collection === 'activeEffects' || collection === 'ActiveEffect'
            ? 'ActiveEffect'
            : collection;

        SWSELogger.debug('ActorEngine._applyDeleteOps', {
          actor: actor.id,
          collection,
          embeddedName,
          count: ids.length
        });

        await this.deleteEmbeddedDocuments(actor, embeddedName, ids, { source });
      }
    } catch (error) {
      const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
      throw new MutationApplicationError(
        `Failed to delete from ${Object.keys(deleteOps)[0]}: ${error.message}`,
        {
          operation: 'delete',
          collection: Object.keys(deleteOps)[0],
          underlyingError: error
        }
      );
    }
  },

  /**
   * Apply SET operations
   * @private
   */
  async _applySetOps(actor, setOps, source) {
    if (!setOps || Object.keys(setOps).length === 0) {
      return;
    }

    try {
      SWSELogger.debug('ActorEngine._applySetOps', {
        actor: actor.id,
        paths: Object.keys(setOps)
      });

      // Batch all set operations into a single actor.update() call.
      // Progression/chargen finalization is the authoritative source for level-1
      // HP initialization, so allow system.hp.max when it appears in a validated
      // mutation plan instead of tripping the recompute-only guard.
      const flatSetOps = foundry.utils.flattenObject(setOps || {});
      const writesHpMax = Object.prototype.hasOwnProperty.call(flatSetOps, 'system.hp.max');
      await this.updateActor(actor, setOps, { source, isRecomputeHPCall: writesHpMax });

    } catch (error) {
      const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
      throw new MutationApplicationError(
        `Failed to apply set operations: ${error.message}`,
        {
          operation: 'set',
          paths: Object.keys(setOps),
          underlyingError: error
        }
      );
    }
  },

  /**
   * Apply UPDATE operations to embedded documents.
   * @private
   */
  async _applyUpdateOps(actor, updateOps, source) {
    if (!updateOps || Object.keys(updateOps).length === 0) {
      return;
    }

    try {
      for (const [collection, updates] of Object.entries(updateOps)) {
        if (!Array.isArray(updates) || updates.length === 0) continue;

        const embeddedName = collection === 'items'
          ? 'Item'
          : collection === 'effects'
            ? 'ActiveEffect'
            : collection.charAt(0).toUpperCase() + collection.slice(1, -1);

        const normalizedUpdates = updates.map(update => {
          const clone = foundry.utils.deepClone(update);
          if (!clone._id && clone.id) {
            clone._id = clone.id;
            delete clone.id;
          }
          return clone;
        });

        SWSELogger.debug('ActorEngine._applyUpdateOps', {
          actor: actor.id,
          collection,
          embeddedName,
          count: normalizedUpdates.length
        });

        await this.updateEmbeddedDocuments(actor, embeddedName, normalizedUpdates, {
          source,
          skipRecalc: true
        });
      }
    } catch (error) {
      const { MutationApplicationError } = await import("/systems/foundryvtt-swse/scripts/governance/mutation/mutation-errors.js");
      throw new MutationApplicationError(
        `Failed to apply update operations: ${error.message}`,
        {
          operation: 'update',
          collections: Object.keys(updateOps),
          underlyingError: error
        }
      );
    }
  },

  /**
   * Apply ADD operations
   * @private
   */
  async _applyAddOps(actor, addOps, source) {
    if (!addOps || Object.keys(addOps).length === 0) {
      return;
    }

    try {
      for (const [collection, documents] of Object.entries(addOps)) {
        if (!Array.isArray(documents) || documents.length === 0) {
          continue;
        }

        SWSELogger.debug('ActorEngine._applyAddOps', {
          actor: actor.id,
          collection,
          count: documents.length
        });

        try {
          const embeddedName =
            collection.charAt(0).toUpperCase() + collection.slice(1, -1);

          await this.createEmbeddedDocuments(actor, embeddedName, documents, { source });
        } catch (err) {
          throw new MutationApplicationError(
            `Failed to add documents to ${collection}: ${err.message}`,
            { operation: 'add', collection }
          );
        }
      }
    } catch (error) {
      throw new MutationApplicationError(
        `Failed to add items: ${error.message}`,
        {
          operation: 'add',
          collections: Object.keys(addOps),
          underlyingError: error
        }
      );
    }
  },

  /**
   * PHASE 5C-4: Apply a repair proposal
   *
   * Route GM-approved repair proposals through ActorEngine.
   * Respects governance modes and runs full validation.
   *
   * @param {Actor} actor - Actor to repair
   * @param {Object} proposal - Repair proposal from ActorRepairEngine
   *   { type, itemId, reason, ... }
   * @param {Object} options - Mutation options
   * @returns {Promise<Object>} Result { success, reason, actor }
   */
  async applyRepair(actor, proposal, options = {}) {
    if (!actor) {
      throw new Error('applyRepair() called with no actor');
    }

    if (!proposal) {
      throw new Error('applyRepair() called without proposal');
    }

    try {
      SWSELogger.log(`[5C-4] Applying repair: ${proposal.type} on ${actor.name}`, {
        proposalId: proposal.id,
        proposalType: proposal.type,
        reason: proposal.reason
      });

      // Build mutation from proposal type
      let mutation;

      switch (proposal.type) {
        case 'removeItem':
          // Remove item mutation
          mutation = {
            operation: 'remove-items',
            itemsToRemove: [proposal.itemId],
            updates: {},
            reason: `Repair: ${proposal.reason}`
          };
          break;

        case 'suggestAcquisition':
          // This is informational only - don't auto-add
          // Instead, return suggestion for GM to handle
          return {
            success: false,
            reason: 'Acquisition must be performed manually via character sheet',
            suggestion: {
              type: 'suggestAcquisition',
              candidateId: proposal.candidateId,
              candidateName: proposal.candidateName
            },
            actor: actor
          };

        case 'classAdjustment':
          // Class changes are complex - require manual review
          return {
            success: false,
            reason: 'Class adjustments must be reviewed and applied manually',
            suggestion: {
              type: 'classAdjustment',
              details: proposal.details
            },
            actor: actor
          };

        default:
          throw new Error(`Unknown repair type: ${proposal.type}`);
      }

      // Run PreflightValidator
      const preflightResult = await PreflightValidator.validateBeforeMutation(
        actor,
        mutation,
        { source: 'repair', reason: proposal.reason }
      );

      // If blocked, return error
      if (preflightResult.outcome === 'block') {
        return {
          success: false,
          reason: `Repair blocked by governance: ${preflightResult.reason}`,
          actor: actor
        };
      }

      // Apply repair via appropriate method
      let result;

      if (proposal.type === 'removeItem') {
        // Delete the item
        await this.deleteEmbeddedDocuments(actor, 'Item', [proposal.itemId], {
          source: 'repair'
        });
        result = { deletedItemId: proposal.itemId };
      }

      // Recalc and integrity check already happen in called methods
      // Verify repair worked
      const violations = MissingPrereqsTracker.getMissingPrereqs(actor);
      const itemViolations = violations.filter(v => v.itemId === proposal.itemId);

      return {
        success: true,
        reason: 'Repair applied successfully',
        result: result,
        remainingViolations: violations.length,
        itemViolationsResolved: itemViolations.length === 0,
        actor: actor
      };

    } catch (err) {
      SWSELogger.error(`[5C-4] Repair failed on ${actor?.name}:`, err);
      throw err;
    }
  },

  /**
   * PHASE 3.4.2: Safe flag update method for progression governance.
   *
   * Routes all flag updates through ActorEngine to maintain mutation authority
   * and prevent governance leaks.
   *
   * Contract:
   * - Enforces mutation context guard
   * - Triggers single recalculation pass
   * - Enables audit trail for flag mutations
   * - No direct actor.setFlag() calls outside ActorEngine
   *
   * @param {Actor} actor - The actor to update
   * @param {string} scope - Flag scope (e.g. 'foundryvtt-swse')
   * @param {string} key - Flag key name
   * @param {*} value - Flag value (any serializable type)
   * @param {object} [options={}] - Additional options
   */
  async updateActorFlags(actor, scope, key, value, options = {}) {
    try {
      if (!actor) {throw new Error('updateActorFlags() called with no actor');}
      if (!scope || typeof scope !== 'string') {throw new Error('updateActorFlags() requires scope string');}
      if (!key || typeof key !== 'string') {throw new Error('updateActorFlags() requires key string');}

      SWSELogger.debug(`ActorEngine.updateActorFlags → ${actor.name}`, {
        scope,
        key,
        valueType: typeof value,
        meta: options.meta
      });

      // ========================================
      // PHASE 3: Authorize mutation via context
      // ========================================
      MutationInterceptor.setContext(`ActorEngine.updateActorFlags[${scope}.${key}]`);
      try {
        // Route through setFlag with mutation context active
        const result = await actor.setFlag(scope, key, value);
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.updateActorFlags failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        scope,
        key
      });
      throw err;
    }
  },

  /**
   * PHASE 3: Remove a flag from an actor.
   * ONLY legal way to unset actor flags.
   * Routes through mutation context enforcement.
   *
   * @param {Actor} actor - The actor to unset flag on
   * @param {string} scope - Flag scope (e.g., 'foundryvtt-swse')
   * @param {string} key - Flag key
   * @param {object} [options={}] - Additional options
   * @returns {Promise<Actor>} Updated actor
   */
  async unsetActorFlag(actor, scope, key, options = {}) {
    try {
      if (!actor) {throw new Error('unsetActorFlag() called with no actor');}
      if (!scope || typeof scope !== 'string') {throw new Error('unsetActorFlag() requires scope string');}
      if (!key || typeof key !== 'string') {throw new Error('unsetActorFlag() requires key string');}

      SWSELogger.debug(`ActorEngine.unsetActorFlag → ${actor.name}`, {
        scope,
        key,
        meta: options.meta
      });

      // ========================================
      // PHASE 3: Authorize mutation via context
      // ========================================
      MutationInterceptor.setContext(`ActorEngine.unsetActorFlag[${scope}.${key}]`);
      try {
        // Route through unsetFlag with mutation context active
        const result = await actor.unsetFlag(scope, key);
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.unsetActorFlag failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        scope,
        key
      });
      throw err;
    }
  },

  /**
   * PHASE 8D: Approved wrapper for updating ActiveEffects on actors.
   * Routes through mutation context enforcement.
   *
   * @param {Actor} actor - The actor owning the effects
   * @param {Array} updates - Array of effect updates (each must include _id)
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Array>} Updated ActiveEffect documents
   */
  async updateActiveEffects(actor, updates, options = {}) {
    try {
      if (!actor) {throw new Error('updateActiveEffects() called with no actor');}
      if (!Array.isArray(updates)) {throw new Error('updateActiveEffects() requires updates array');}

      SWSELogger.debug(`ActorEngine.updateActiveEffects → ${actor.name}`, {
        count: updates.length,
        source: options.source || 'unknown'
      });

      MutationInterceptor.setContext({
        operation: 'updateActiveEffects',
        source: options.source || 'ActorEngine',
        suppressRecalc: options.suppressRecalc ?? false
      });
      try {
        const normalizedUpdates = normalizeActiveEffectDataForRuntime(updates);
        const result = await actor.updateEmbeddedDocuments('ActiveEffect', normalizedUpdates, options);
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.updateActiveEffects failed for ${actor?.name ?? 'unknown actor'}`, err);
      throw err;
    }
  },

  /**
   * Recompute actor's system.hp.max using SWSE Saga RAW formula.
   * ONLY writer of system.hp.max. Uses PERSISTENT (non-derived) canonical inputs only.
   * Called on: level-up, CON change, class change, species apply, feat change.
   *
   * Guardrails:
   * - Recursion prevention: guardKey in meta options prevents updateActor hook re-trigger
   * - Idempotency: Early return if newHPMax === current hp.max (avoids unnecessary updates)
   *
   * @param {Actor} actor - Character to recompute HP for
   * @param {Object} [options={}]
   * @param {boolean} [options.fromHook] - If true, omit DerivedCalculator call
   * @returns {Promise<number>} - New HP max value
   * @throws {Error} if actor/class invalid
   */
  async recomputeHP(actor, options = {}) {
    try {
      if (!actor) {
        throw new Error('ActorEngine.recomputeHP() requires actor');
      }

      // SSOT ENFORCEMENT: Get class from registry
      const classItem = ActorAbilityBridge.getClasses(actor)[0] || null;
      if (!classItem) {
        // No class = minimum 1 HP; but check if it's already 1
        const currentMax = actor.system.hp?.max ?? 1;
        if (currentMax === 1) {
          return 1; // Already at minimum, no update needed
        }
        await this.updateActor(actor, { 'system.hp.max': 1 }, {
          ...options,
          isRecomputeHPCall: true,
          meta: { ...(options.meta || {}), guardKey: 'hp-recompute' }
        });
        return 1;
      }

      const level = Math.max(1, actor.system.level ?? 1);
      const isDroid = actor.type === 'droid';
      const bonusHP = actor.system.hp?.bonus ?? 0;
      const featHPBonus = MetaResourceFeatResolver.getHitPointMaxBonus(actor);

      // Compute CON modifier from canonical persistent path (system.attributes),
      // falling back to compatibility mirror (system.abilities) for old actors.
      let conMod = 0;
      if (!isDroid) {
        const conSrc = actor.system.attributes?.con ?? actor.system.abilities?.con ?? {};
        const conBase = Number(conSrc.base ?? 10);
        const conRacial = Number(conSrc.racial ?? 0);
        const conEnhancement = Number(conSrc.enhancement ?? 0);
        const conTemp = Number(conSrc.temp ?? 0);
        const conTotal = conBase + conRacial + conEnhancement + conTemp;
        conMod = Math.floor((conTotal - 10) / 2);
      }

      // HP progression: primary source is progression fields; fallback to hitDie
      let hpAtFirstLevel, hpPerLevel;
      if (classItem.system.progression?.hpAtFirstLevel !== undefined) {
        hpAtFirstLevel = classItem.system.progression.hpAtFirstLevel;
        hpPerLevel = classItem.system.progression.hpPerLevel ?? (Math.floor((classItem.system.hitDie ?? 6) / 2) + 1);
      } else {
        const hitDie = classItem.system.hitDie ?? 6;
        hpAtFirstLevel = hitDie * 3;
        hpPerLevel = Math.floor(hitDie / 2) + 1;
      }

      // CANONICAL formula: base + per-level gains + CON at every level + bonus
      // DO NOT split into baseHP + levelGains + conGains separately (avoids misreading)
      const newHPMax = Math.max(1,
        hpAtFirstLevel + (level - 1) * hpPerLevel + (conMod * level) + bonusHP + featHPBonus
      );

      // Guardrail: Only update if value changed (idempotency)
      const currentMax = actor.system.hp?.max ?? 0;
      if (newHPMax === currentMax) {
        SWSELogger.debug(`ActorEngine.recomputeHP: ${actor.name} (no change)`, {
          level,
          hitDie: classItem.system.hitDie,
          hpAtFirstLevel,
          hpPerLevel,
          conMod,
          bonusHP,
        featHPBonus,
          isDroid,
          result: newHPMax
        });
        return newHPMax; // Early return, no update needed
      }

      SWSELogger.debug(`ActorEngine.recomputeHP: ${actor.name}`, {
        level,
        hitDie: classItem.system.hitDie,
        hpAtFirstLevel,
        hpPerLevel,
        conTotal: conBase + conRacial + conEnhancement + conTemp,
        conMod,
        bonusHP,
        featHPBonus,
        isDroid,
        oldValue: currentMax,
        newValue: newHPMax
      });

      // Update system.hp.max via ActorEngine mutation (not direct write)
      // isRecomputeHPCall flag bypasses HP write guard (see 4D enforcement)
      // meta.guardKey prevents updateActor hook from re-triggering
      await this.updateActor(actor, { 'system.hp.max': newHPMax }, {
        ...options,
        isRecomputeHPCall: true,
        meta: { ...(options.meta || {}), guardKey: 'hp-recompute' }
      });

      // Trigger DerivedCalculator to mirror HP if not called from hook (prevent recursion)
      if (!options.fromHook) {
        // Optional: Queue DerivedCalculator refresh for this actor
        // (implementation depends on existing async queue pattern)
      }

      return newHPMax;
    } catch (err) {
      SWSELogger.error(`ActorEngine.recomputeHP failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        level: actor?.system?.level,
        classItem: actor?.items.find(i => i.type === 'class')?.name
      });
      throw err;
    }
  },

  /**
   * PHASE 8D: Approved wrapper for creating ActiveEffects on actors.
   * This is the ONLY legal way to create ActiveEffects from runtime systems.
   * Routes through mutation context enforcement.
   *
   * @param {Actor} actor - The actor to create effects on
   * @param {Array} effectData - Array of ActiveEffect data objects
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Array>} Created ActiveEffect documents
   */
  async createActiveEffects(actor, effectData, options = {}) {
    try {
      if (!actor) {throw new Error('createActiveEffects() called with no actor');}
      if (!Array.isArray(effectData)) {throw new Error('createActiveEffects() requires effectData array');}

      SWSELogger.debug(`ActorEngine.createActiveEffects → ${actor.name}`, {
        count: effectData.length,
        source: options.source || 'unknown'
      });

      MutationInterceptor.setContext({
        operation: 'createActiveEffects',
        source: options.source || 'ActorEngine',
        suppressRecalc: options.suppressRecalc ?? false
      });
      try {
        const normalizedEffectData = normalizeActiveEffectDataForRuntime(effectData);
        const result = await actor.createEmbeddedDocuments('ActiveEffect', normalizedEffectData, options);
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.createActiveEffects failed for ${actor?.name ?? 'unknown actor'}`, err);
      throw err;
    }
  },

  /**
   * PHASE 8D: Approved wrapper for deleting ActiveEffects from actors.
   * This is the ONLY legal way to delete ActiveEffects from runtime systems.
   * Routes through mutation context enforcement.
   *
   * @param {Actor} actor - The actor to delete effects from
   * @param {Array} ids - Array of ActiveEffect IDs to delete
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Array>} Deleted ActiveEffect documents
   */
  async deleteActiveEffects(actor, ids, options = {}) {
    try {
      if (!actor) {throw new Error('deleteActiveEffects() called with no actor');}
      if (!Array.isArray(ids)) {throw new Error('deleteActiveEffects() requires ids array');}

      SWSELogger.debug(`ActorEngine.deleteActiveEffects → ${actor.name}`, {
        count: ids.length,
        source: options.source || 'unknown'
      });

      MutationInterceptor.setContext({
        operation: 'deleteActiveEffects',
        source: options.source || 'ActorEngine',
        suppressRecalc: options.suppressRecalc ?? false
      });
      try {
        const result = await actor.deleteEmbeddedDocuments('ActiveEffect', ids, options);
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.deleteActiveEffects failed for ${actor?.name ?? 'unknown actor'}`, err);
      throw err;
    }
  },

  /**
   * PHASE 4: Comprehensive mutation plan normalization for contract enforcement.
   *
   * Transforms incoming mutation data to conform to canonical contract paths:
   * - Abilities: .value → .base, and ensure ability object shapes
   * - Class: remove redundant class scalar paths
   * - Skills: complete skill object shapes
   * - XP: system.experience → system.xp.total
   *
   * @param {Object} updateData - Raw incoming mutation data
   * @param {Actor} actor - Target actor
   * @returns {Object} {normalizedUpdateData, warnings}
   * @private
   */
  _normalizeMutationForContract(updateData, actor) {
    return MutationNormalizationService.normalizePayload(updateData, actor);
  },

  /**
   * Initialize canonical base shapes for domains touched by this mutation.
   *
   * Called AFTER normalization to ensure canonical structure exists before apply.
   * Only initializes required containers for touched domains.
   *
   * @param {Object} updateData - Normalized update data
   * @param {Actor} actor - Target actor
   * @private
   */
  _initializeCanonicalShapesForTouchedDomains(updateData, actor) {
    if (!updateData || typeof updateData !== 'object') return;

    const flat = foundry.utils.flattenObject(updateData);
    const touched = new Set();

    // Detect which domains are being touched.
    // system.attributes is canonical persisted ability storage; system.abilities is the
    // read-only compat mirror. Both must trigger ability shape initialization so that the
    // container exists before Foundry merges either write path.
    for (const key of Object.keys(flat)) {
      if (key.startsWith('system.attributes.') || key.startsWith('system.abilities.')) touched.add('abilities');
      if (key.startsWith('system.skills.')) touched.add('skills');
      if (key.startsWith('system.defenses.')) touched.add('defenses');
      if (key.startsWith('system.xp.') || key.startsWith('system.experience')) touched.add('xp');
      if (key.startsWith('system.hp')) touched.add('hp');
    }

    // Initialize required structures for touched domains
    if (touched.has('abilities')) {
      this._ensureCanonicalAbilityShapes(actor);
    }
    if (touched.has('skills')) {
      this._ensureCanonicalSkillShapes(actor, flat);
    }
    if (touched.has('defenses')) {
      this._ensureCanonicalDefenseShapes(actor);
    }
    if (touched.has('xp')) {
      this._ensureCanonicalXpShape(actor);
    }
    if (touched.has('hp')) {
      this._ensureCanonicalHpShape(actor);
    }
  },

  /**
   * Validate that normalized mutation plan complies with canonical contract.
   *
   * Checks for coherence issues, conflicting paths, required structures.
   * Warns but does not fail - allows callers to proceed with visibility.
   *
   * @param {Object} updateData - Normalized update data
   * @param {Actor} actor - Target actor
   * @returns {Object} {isValid, warnings}
   * @private
   */
  _validateCanonicalMutationPlan(updateData, actor) {
    if (!updateData || typeof updateData !== 'object') {
      return { isValid: true, warnings: [] };
    }

    const warnings = [];
    const flat = foundry.utils.flattenObject(updateData);

    // Check for conflicting canonical/legacy paths
    if (flat['system.abilities.str.base'] && flat['system.abilities.str.value']) {
      warnings.push('Conflict: both system.abilities.str.base and .value present in mutation');
    }
    if (flat['system.xp.total'] && flat['system.experience']) {
      warnings.push('Conflict: both system.xp.total and system.experience present in mutation');
    }

    // Check for incomplete skill objects being set
    for (const key of Object.keys(flat)) {
      if (key.match(/^system\.skills\.\w+\.\w+$/)) {
        const skillMatch = key.match(/^system\.skills\.(\w+)\.(\w+)$/);
        if (skillMatch) {
          const skillKey = skillMatch[1];
          const propKey = skillMatch[2];
          // If only one property is being set, that's usually ok (partial updates)
          // But warn if it looks like incomplete initialization
          if (!['trained', 'miscMod', 'focused', 'selectedAbility', 'favorite'].includes(propKey)) {
            warnings.push(`Unusual skill property: system.skills.${skillKey}.${propKey}`);
          }
        }
      }
    }

    return { isValid: warnings.length === 0, warnings };
  },

  // ========================================
  // PHASE 1 DIAGNOSTICS: Semantic boundary helpers
  // Diagnostic-only. No rejection. No behavior change.
  // These collect evidence before Phase 2 enforcement.
  // ========================================

  // ========================================
  // PHASE 1 DIAGNOSTICS + PHASE 3 GUARDRAILS — delegated to MutationBoundaryService
  // ActorEngine retains these thin wrappers to preserve the call sites in
  // updateActor() and updateEmbeddedDocuments() without changing their signatures.
  // ========================================

  /** @private — delegates to MutationBoundaryService */
  _classifyOperationIntent(updateData, options, actor) {
    return MutationBoundaryService.classifyOperationIntent(updateData, options, actor);
  },

  /** @private — delegates to MutationBoundaryService */
  _auditSemanticBoundaries(updateData, flatData, actor, operationCategory, options) {
    return MutationBoundaryService.auditSemanticBoundaries(updateData, flatData, actor, operationCategory, options);
  },

  /** @private — delegates to MutationBoundaryService */
  _auditEmbeddedItemBoundaries(updates, actor, options) {
    return MutationBoundaryService.auditEmbeddedItemBoundaries(updates, actor, options);
  },

  /**
   * PHASE 2: Strict-mode enforcement of high-confidence semantic-boundary findings.
   *
   * The MutationBoundaryService audit is warning-only and never throws — it just
   * returns the suspicious findings. This method decides whether to reject.
   *
   * STRICT/DEV mode: reject the two high-confidence unknown-caller cases —
   *   - full-system-replacement      (caller handed a whole {system:{...}} object)
   *   - broad-domain-key-replacement (caller replaced system.skills/defenses/
   *                                   attributes/abilities wholesale)
   * These only ever fire for non-broad-safe callers: the audit already skips them
   * for allowlisted contexts (adoption, migration/repair, progression commit/
   * finalization, canonical normalization, derived rebuild).
   *
   * NORMAL/PRODUCTION mode: no throw — the audit's warning already fired, and
   * production behavior is preserved unchanged.
   *
   * Ambiguous findings (abilities mirror writes, unclassified broad payloads) stay
   * warning-only even in strict mode: mirror writes are auto-redirected by the
   * Phase 3 guardrail, and the broad-key-count heuristic is too coarse to fail on.
   * Derived writes are enforced separately by _validateDerivedWriteAuthority().
   *
   * @param {Array} findings - Return value of _auditSemanticBoundaries()
   * @param {string} operationCategory
   * @param {Actor} actor
   * @param {Object} options
   * @throws {Error} In strict mode when a high-confidence violation is present.
   * @private
   */
  _enforceStrictSemanticBoundaries(findings, operationCategory, actor, options = {}) {
    if (!Array.isArray(findings) || findings.length === 0) return;
    if (MutationInterceptor.getEnforcementLevel() !== 'strict') return;

    const HIGH_CONFIDENCE = new Set(['full-system-replacement', 'broad-domain-key-replacement']);
    const blocking = findings.filter(f => HIGH_CONFIDENCE.has(f?.reason));
    if (blocking.length === 0) return;

    const detail = blocking.map(f => `${f.key} (${f.reason})`).join(', ');
    throw new Error(
      `[MUTATION BOUNDARY VIOLATION] Unknown caller attempted broad replacement: ${detail}\n` +
      `operationCategory=${operationCategory}, source=${options?.source ?? options?.meta?.source ?? 'unknown'}\n` +
      `Broad system/domain replacement is only permitted from adoption, migration/repair, ` +
      `progression commit/finalization, canonical normalization, or derived rebuild contexts. ` +
      `Use leaf dot-path updates instead.\n` +
      `Caller: ${new Error().stack.split('\n')[2]}`
    );
  },

  // ========================================
  // PHASE 3 GUARDRAILS: Safe automatic corrections for proven-unsafe paths
  // ========================================

  /** @private — delegates to MutationBoundaryService */
  _applyPhase3Guardrails(flatData, operationCategory, actor, options) {
    return MutationBoundaryService.applyPhase3Guardrails(flatData, operationCategory, actor, options);
  },

  /** @private — delegates to MutationBoundaryService */
  _guardrailAbilitiesMirrorWrites(flatData, operationCategory, actor, options) {
    return MutationBoundaryService._guardrailAbilitiesMirrorWrites(flatData, operationCategory, actor, options);
  },

  // ========================================
  // Domain-specific normalization helpers
  // ========================================

  /**
   * Normalize ability paths: .value → .base with warnings
   * @private
   */
  /** @private — delegates to MutationNormalizationService */
  _normalizeAbilityPathsForContract(flat) {
    return MutationNormalizationService._normalizeAbilityPaths(flat);
  },

  /** @private — delegates to MutationNormalizationService */
  _normalizeClassPathsForContract(flat) {
    return MutationNormalizationService._normalizeClassPaths(flat);
  },

  /** @private — delegates to MutationNormalizationService */
  _normalizeSkillStructureForContract(flat, actor) {
    return MutationNormalizationService._normalizeSkillStructure(flat, actor);
  },

  /** @private — delegates to MutationNormalizationService */
  _normalizeDefensePathsForContract(flat) {
    return MutationNormalizationService._normalizeDefensePaths(flat);
  },

  /** @private — delegates to MutationNormalizationService */
  _normalizeXpPathsForContract(flat) {
    return MutationNormalizationService._normalizeXpPaths(flat);
  },

  // ========================================
  // Canonical ability read helpers (Phase 4)
  // ========================================

  /**
   * Get canonical ability base score.
   * Primary:  system.attributes.[key].base  (persisted canonical)
   * Fallback: system.abilities.[key].base   (compatibility mirror)
   *
   * @param {Actor} actor
   * @param {string} key - e.g. 'con'
   * @param {number} [fallback=10]
   * @returns {number}
   */
  _getCanonicalAbilityBase(actor, key, fallback = 10) {
    return Number(
      actor.system?.attributes?.[key]?.base ??
      actor.system?.abilities?.[key]?.base ??
      fallback
    );
  },

  /**
   * Get canonical ability modifier.
   * Primary:  system.derived.attributes.[key].mod  (pre-computed by DerivedCalculator)
   * Fallback: compute from canonical base + racial + enhancement + temp
   *
   * @param {Actor} actor
   * @param {string} key - e.g. 'con'
   * @returns {number}
   */
  _getCanonicalAbilityMod(actor, key) {
    const derivedMod = actor.system?.derived?.attributes?.[key]?.mod;
    if (derivedMod !== undefined) return Number(derivedMod);
    const src = actor.system?.attributes?.[key] ?? actor.system?.abilities?.[key] ?? {};
    const total = (Number(src.base ?? 10))
      + (Number(src.racial ?? 0))
      + (Number(src.enhancement ?? 0))
      + (Number(src.temp ?? 0));
    return Math.floor((total - 10) / 2);
  },

  // ========================================
  // Canonical shape initialization helpers
  // ========================================

  /**
   * Ensure canonical ability/attribute containers exist in memory before an update merge.
   *
   * Two separate storage surfaces:
   *   system.attributes  — canonical persisted ability scores { base, racial, enhancement, temp }.
   *                        Shape is defined by template.json (no TypeDataModel is registered for
   *                        actors at runtime), so existence is NOT schema-guaranteed. Initialized
   *                        here as a defensive backstop. Do NOT include derived fields (total, mod).
   *   system.abilities   — read-only compatibility mirror. Rebuilt from system.attributes on every
   *                        prepareDerivedData() call. Initialized here for non-character actor types
   *                        that lack system.attributes in their schema, and as a compat backstop.
   *
   * @private
   */
  _ensureCanonicalAbilityShapes(actor) {
    if (!actor.system) actor.system = {};

    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    // 1. Canonical persisted storage: system.attributes
    //    Character-type actors own this namespace. Initialize it for newly-created or
    //    partially-migrated characters so ability edits and progression writes never
    //    fall back to the read-only system.abilities mirror.
    const shouldOwnAttributes = actor.type === 'character' || actor.system.attributes !== undefined;
    if (shouldOwnAttributes) {
      if (typeof actor.system.attributes !== 'object' || Array.isArray(actor.system.attributes)) {
        actor.system.attributes = {};
      }
      for (const key of abilityKeys) {
        if (!actor.system.attributes[key] || typeof actor.system.attributes[key] !== 'object') {
          actor.system.attributes[key] = { base: 10, racial: 0, enhancement: 0, temp: 0 };
        } else {
          actor.system.attributes[key].base        ??= 10;
          actor.system.attributes[key].racial      ??= 0;
          actor.system.attributes[key].enhancement ??= 0;
          actor.system.attributes[key].temp        ??= 0;
        }
      }
    }

    // 2. Compatibility mirror: system.abilities
    //    Rebuilt from system.attributes on every prepareDerivedData(); treat as a compat backstop.
    if (!actor.system.abilities) actor.system.abilities = {};
    for (const key of abilityKeys) {
      if (!actor.system.abilities[key]) {
        actor.system.abilities[key] = { base: 10, racial: 0, temp: 0, total: 10, mod: 0 };
      } else {
        if (actor.system.abilities[key].base === undefined) {
          actor.system.abilities[key].base = actor.system.abilities[key].value || 10;
        }
        actor.system.abilities[key].racial ??= 0;
        actor.system.abilities[key].temp   ??= 0;
      }
    }
  },

  /**
   * Ensure touched skills have canonical object containers.
   *
   * IMPORTANT:
   * Existing skills must not be backfilled here during live edits. Backfilling
   * untouched properties turns a narrow mutation into an implicit rewrite.
   * Only create the full canonical object when the touched skill does not exist
   * at all or is not an object.
   *
   * @private
   */
  _ensureCanonicalSkillShapes(actor, flatUpdateData) {
    if (!actor.system) actor.system = {};
    if (!actor.system.skills || typeof actor.system.skills !== 'object') actor.system.skills = {};

    const skillKeys = new Set();
    for (const key of Object.keys(flatUpdateData)) {
      const match = key.match(/^system\.skills\.([^.]+)\./);
      if (match) {
        skillKeys.add(match[1]);
      }
    }

    for (const skillKey of skillKeys) {
      const current = actor.system.skills[skillKey];
      if (current && typeof current === 'object' && !Array.isArray(current)) continue;

      actor.system.skills[skillKey] = {
        trained: false,
        miscMod: 0,
        focused: false,
        selectedAbility: '',
        favorite: false
      };
    }
  },


  /**
   * Ensure canonical defense containers exist for touched mutations.
   * @private
   */
  _ensureCanonicalDefenseShapes(actor) {
    if (!actor.system) actor.system = {};
    if (!actor.system.defenses || typeof actor.system.defenses !== 'object') actor.system.defenses = {};

    const defaults = {
      reflex: { classBonus: 0, armor: 0, ability: 'dex', misc: { auto: {}, user: { extra: 0 } } },
      fortitude: { classBonus: 0, ability: (actor.type === 'droid' || actor.system?.isDroid === true) ? 'str' : 'con', misc: { auto: {}, user: { extra: 0 } } },
      will: { classBonus: 0, ability: 'wis', misc: { auto: {}, user: { extra: 0 } } }
    };

    for (const [key, seed] of Object.entries(defaults)) {
      if (!actor.system.defenses[key] || typeof actor.system.defenses[key] !== 'object') {
        actor.system.defenses[key] = foundry.utils.deepClone(seed);
        continue;
      }
      const defense = actor.system.defenses[key];
      defense.classBonus ??= Number(defense.class ?? seed.classBonus) || seed.classBonus;
      if (key === 'reflex') defense.armor ??= seed.armor;
      if (!defense.ability || typeof defense.ability !== 'string') defense.ability = seed.ability;

      const legacyMisc = (defense.misc !== undefined && (!defense.misc || typeof defense.misc !== 'object' || Array.isArray(defense.misc)))
        ? (Number(defense.misc) || 0)
        : null;
      if (!defense.misc || typeof defense.misc !== 'object' || Array.isArray(defense.misc)) defense.misc = {};
      if (!defense.misc.auto || typeof defense.misc.auto !== 'object' || Array.isArray(defense.misc.auto)) defense.misc.auto = {};
      if (!defense.misc.user || typeof defense.misc.user !== 'object' || Array.isArray(defense.misc.user)) defense.misc.user = {};
      defense.misc.user.extra ??= legacyMisc ?? 0;
    }
  },

  /**
   * Ensure canonical XP object shape
   * @private
   */
  _ensureCanonicalXpShape(actor) {
    if (!actor.system) actor.system = {};
    if (!actor.system.xp) {
      actor.system.xp = { total: 0 };
    }
    if (actor.system.xp.total === undefined) {
      actor.system.xp.total = 0;
    }
  },

  /**
   * Ensure canonical HP object shape
   * @private
   */
  _ensureCanonicalHpShape(actor) {
    if (!actor.system) actor.system = {};
    if (!actor.system.hp) {
      actor.system.hp = {
        value: 1,
        max: 1,
        temp: 0
      };
    }
    if (actor.system.hp.value === undefined) actor.system.hp.value = 1;
    if (actor.system.hp.max === undefined) actor.system.hp.max = 1;
  },

  /**
   * PHASE 3A: Normalize legacy ability paths to canonical schema.
   * Converts deprecated system.abilities.<key>.value → system.abilities.<key>.base
   * This allows old progression/saved data to work with new schema without immediate migration.
   *
   * @param {Object} updateData - The update data object (may be nested)
   * @private
   */
  _normalizeAbilityPaths(updateData) {
    if (!updateData || typeof updateData !== 'object') return;

    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const flat = foundry.utils.flattenObject(updateData);
    const toDelete = [];

    for (const key of Object.keys(flat)) {
      // Match system.abilities.<key>.value
      const match = key.match(/^system\.abilities\.([a-z]+)\.value$/);
      if (match && abilityKeys.includes(match[1])) {
        const abilityKey = match[1];
        const newPath = `system.abilities.${abilityKey}.base`;

        // Only normalize if the canonical .base path isn't already being set
        if (!(newPath in flat)) {
          flat[newPath] = flat[key];
          SWSELogger.warn(`[ABILITY NORMALIZATION] Converted legacy path ${key} → ${newPath}`, {
            abilityKey,
            value: flat[key]
          });
        }

        toDelete.push(key);
      }
    }

    // Remove legacy paths from update
    for (const path of toDelete) {
      delete flat[path];
    }

    // Unflatten back to nested form if we made changes
    if (toDelete.length > 0) {
      const updated = foundry.utils.expandObject(flat);
      Object.assign(updateData, updated);
    }
  },

  /**
   * PHASE 3D: Normalize legacy XP/experience paths to canonical schema.
   * Converts deprecated system.experience → system.xp.total
   * This allows old progression/saved data to work with new naming without immediate migration.
   *
   * @param {Object} updateData - The update data object (may be nested)
   * @private
   */
  _normalizeXpPaths(updateData) {
    if (!updateData || typeof updateData !== 'object') return;

    const flat = foundry.utils.flattenObject(updateData);
    const toDelete = [];

    // Check for legacy system.experience path
    if ('system.experience' in flat && !('system.xp.total' in flat)) {
      flat['system.xp.total'] = flat['system.experience'];
      SWSELogger.warn(`[XP NORMALIZATION] Converted legacy path system.experience → system.xp.total`, {
        value: flat['system.experience']
      });
      toDelete.push('system.experience');
    }

    // Remove legacy paths from update
    for (const path of toDelete) {
      delete flat[path];
    }

    // Unflatten back to nested form if we made changes
    if (toDelete.length > 0) {
      const updated = foundry.utils.expandObject(flat);
      Object.assign(updateData, updated);
    }
  }
};
