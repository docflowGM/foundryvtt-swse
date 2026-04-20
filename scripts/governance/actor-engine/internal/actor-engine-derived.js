// scripts/governance/actor-engine/internal/actor-engine-derived.js
// Internal module for derived recalculation and integrity checking
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { MutationInterceptor } from "/systems/foundryvtt-swse/scripts/governance/mutation/MutationInterceptor.js";
import { DerivedCalculator } from "/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { PrerequisiteIntegrityChecker } from "/systems/foundryvtt-swse/scripts/governance/integrity/prerequisite-integrity-checker.js";

/**
 * DerivedEngineModule
 * Handles derived recalculation and integrity checking
 */
export const DerivedEngineModule = {
  /**
   * Perform any derived-stat recalculation.
   * Runs after every validated update. Non-blocking.
   *
   * PHASE 2C: ModifierEngine.applyAll() is currently IMPURE
   * It writes directly to system.derived.* without enforcement.
   * TODO (Phase 2C): Refactor ModifierEngine.applyAll() to:
   *   - Return computed modifier bundle instead of mutating
   *   - Apply bundle in DerivedCalculator context only
   *   - Prevent unauthorized writes to system.derived.*
   * Known issues in ModifierEngine.applyAll():
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
        await DerivedCalculator.computeAll(actor);
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] DerivedCalculator.computeAll() completed`, {
            actor: actor.name,
            derivedHP: actor.system?.derived?.hp?.total,
            derivedBAB: actor.system?.derived?.bab,
            defensesFort: actor.system?.derived?.defenses?.fortitude?.total
          });
        }

        // ========================================
        // PHASE 3: Apply modifier bundle
        // ========================================
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] ModifierEngine.computeModifierBundle() starting...`, { actor: actor.name });
        }
        const allModifiers = await ModifierEngine.getAllModifiers(actor);
        const modifierMap = await ModifierEngine.aggregateAll(actor);
        const modifierBundle = ModifierEngine.computeModifierBundle(actor, modifierMap, allModifiers);
        ModifierEngine.applyComputedBundle(actor, modifierBundle);
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] ModifierEngine.applyComputedBundle() completed`, {
            actor: actor.name,
            modifierCount: actor.system?.derived?.modifiers?.all?.length || 0,
            hpAdjustment: actor.system?.derived?.hp?.adjustment,
            babAdjustment: actor.system?.derived?.babAdjustment
          });
        }
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
    }
  }
};
