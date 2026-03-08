/**
 * FORCE_POWER Execution Model — Contract Validator
 *
 * Validates Force Power ability schema during registration.
 * Does NOT validate against actor state (that's runtime validation).
 * Does NOT validate Force Power availability (that's ActivationLimitEngine).
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ForcePowerFrequencyType, ForcePowerActionType, ForcePowerCostType, ForcePowerDescriptor } from "./force-power-types.js";

/**
 * Validates FORCE_POWER execution model schema
 */
export class ForcePowerContractValidator {
  /**
   * Validate a FORCE_POWER ability
   * @param {Object} ability - The ability item document
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validate(ability) {
    const errors = [];

    // ── 1. Execution model check ───────────────────────────────────────────
    if (ability.system?.executionModel !== 'FORCE_POWER') {
      errors.push('executionModel must be "FORCE_POWER"');
    }

    // ── 2. Basic metadata structure ─────────────────────────────────────────
    const meta = ability.system?.abilityMeta;
    if (!meta) {
      errors.push('abilityMeta field is required');
      return { valid: false, errors };
    }

    // ── 3. Frequency validation ────────────────────────────────────────────
    if (meta.frequency !== undefined) {
      if (!Object.values(ForcePowerFrequencyType).includes(meta.frequency)) {
        errors.push(
          `frequency must be one of: ${Object.values(ForcePowerFrequencyType).join(', ')}`
        );
      }

      if (meta.frequency !== ForcePowerFrequencyType.UNLIMITED && !Number.isInteger(meta.maxUses) || meta.maxUses < 1) {
        errors.push('maxUses must be a positive integer when frequency is not UNLIMITED');
      }
    }

    // ── 4. Action type validation ──────────────────────────────────────────
    if (meta.actionType !== undefined) {
      if (!Object.values(ForcePowerActionType).includes(meta.actionType)) {
        errors.push(
          `actionType must be one of: ${Object.values(ForcePowerActionType).join(', ')}`
        );
      }
    }

    // ── 5. Force Point cost validation ────────────────────────────────────
    if (meta.forcePointCost !== undefined) {
      if (!Number.isInteger(meta.forcePointCost) || meta.forcePointCost < 0) {
        errors.push('forcePointCost must be a non-negative integer');
      }
    }

    // ── 6. Descriptor validation ───────────────────────────────────────────
    if (meta.descriptor !== undefined) {
      if (!Object.values(ForcePowerDescriptor).includes(meta.descriptor)) {
        errors.push(
          `descriptor must be one of: ${Object.values(ForcePowerDescriptor).join(', ')}`
        );
      }
    }

    // ── 7. Base DC validation ──────────────────────────────────────────────
    if (meta.baseDC !== undefined) {
      if (!Number.isInteger(meta.baseDC) || meta.baseDC < 5) {
        errors.push('baseDC must be an integer >= 5 (or undefined)');
      }
    }

    // ── 8. Boolean flags validation ────────────────────────────────────────
    if (meta.darkSideOption !== undefined && typeof meta.darkSideOption !== 'boolean') {
      errors.push('darkSideOption must be a boolean');
    }

    const valid = errors.length === 0;

    if (!valid) {
      swseLogger.warn(
        `[ForcePowerContractValidator] Validation failed for "${ability.name}":`,
        errors
      );
    }

    return { valid, errors };
  }

  /**
   * Assert validation passes, throw if not
   * @param {Object} ability
   * @throws {Error} if validation fails
   */
  static assert(ability) {
    const result = ForcePowerContractValidator.validate(ability);
    if (!result.valid) {
      throw new Error(
        `FORCE_POWER contract violation for "${ability.name}": ${result.errors.join('; ')}`
      );
    }
  }
}
