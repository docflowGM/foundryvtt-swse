/**
 * UNLOCK Execution Model — Contract Validator
 *
 * Validates UNLOCK ability schema during registration.
 * Does NOT validate prerequisites (that's PrerequisiteChecker's responsibility).
 * Does NOT validate against actor state (that's runtime validation).
 *
 * Validates schema shape only:
 * - Ability has abilityMeta with grants array
 * - Each grant has valid category and required fields per category
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { GrantCategory, ProficiencyType, SystemAccessType } from "./unlock-types.js";

/**
 * Validates UNLOCK execution model schema
 */
export class UnlockContractValidator {
  /**
   * Validate an UNLOCK ability
   * @param {Object} ability - The ability item document
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validate(ability) {
    const errors = [];

    // ── 1. Execution model check ───────────────────────────────────────────
    if (ability.system?.executionModel !== 'UNLOCK') {
      errors.push('executionModel must be "UNLOCK"');
    }

    // ── 2. abilityMeta structure ───────────────────────────────────────────
    const meta = ability.system?.abilityMeta;
    if (!meta) {
      errors.push('abilityMeta field is required');
      return { valid: false, errors };
    }

    // ── 3. Grants array ────────────────────────────────────────────────────
    const grants = meta.grants;
    if (!Array.isArray(grants) || grants.length === 0) {
      errors.push('abilityMeta.grants must be a non-empty array');
      return { valid: false, errors };
    }

    // ── 4. Validate each grant ────────────────────────────────────────────
    for (let i = 0; i < grants.length; i++) {
      const grant = grants[i];
      const grantErrors = this._validateGrant(grant, i);
      errors.push(...grantErrors);
    }

    const valid = errors.length === 0;

    if (!valid) {
      swseLogger.warn(
        `[UnlockContractValidator] Validation failed for "${ability.name}":`,
        errors
      );
    }

    return { valid, errors };
  }

  /**
   * Validate a single grant object
   * @private
   */
  static _validateGrant(grant, index) {
    const errors = [];
    const prefix = `grant[${index}]`;

    if (!grant || typeof grant !== 'object') {
      errors.push(`${prefix} must be an object`);
      return errors;
    }

    const { category } = grant;

    // Check category exists
    if (!category) {
      errors.push(`${prefix}.category is required`);
      return errors;
    }

    if (!Object.values(GrantCategory).includes(category)) {
      errors.push(
        `${prefix}.category must be one of: ${Object.values(GrantCategory).join(', ')}`
      );
      return errors;
    }

    // Route to category-specific validator
    switch (category) {
      case GrantCategory.SYSTEM_ACCESS:
        this._validateSystemAccessGrant(grant, prefix, errors);
        break;

      case GrantCategory.PROFICIENCY:
        this._validateProficiencyGrant(grant, prefix, errors);
        break;

      case GrantCategory.DOMAIN_ACCESS:
        this._validateDomainAccessGrant(grant, prefix, errors);
        break;

      case GrantCategory.SKILL_TRAINING:
        this._validateSkillTrainingGrant(grant, prefix, errors);
        break;
    }

    return errors;
  }

  /**
   * Validate SYSTEM_ACCESS grant
   * @private
   */
  static _validateSystemAccessGrant(grant, prefix, errors) {
    const { capability } = grant;

    if (!capability) {
      errors.push(`${prefix}.capability is required for SYSTEM_ACCESS grant`);
      return;
    }

    if (!Object.values(SystemAccessType).includes(capability)) {
      errors.push(
        `${prefix}.capability must be one of: ${Object.values(SystemAccessType).join(', ')}`
      );
    }
  }

  /**
   * Validate PROFICIENCY grant
   * @private
   */
  static _validateProficiencyGrant(grant, prefix, errors) {
    const { proficiencyType, proficiencies } = grant;

    if (!proficiencyType) {
      errors.push(`${prefix}.proficiencyType is required for PROFICIENCY grant`);
      return;
    }

    if (!Object.values(ProficiencyType).includes(proficiencyType)) {
      errors.push(
        `${prefix}.proficiencyType must be one of: ${Object.values(ProficiencyType).join(', ')}`
      );
    }

    if (!Array.isArray(proficiencies) || proficiencies.length === 0) {
      errors.push(
        `${prefix}.proficiencies must be a non-empty array of proficiency names`
      );
      return;
    }

    // Validate each proficiency is a string
    for (let i = 0; i < proficiencies.length; i++) {
      if (typeof proficiencies[i] !== 'string' || proficiencies[i].trim() === '') {
        errors.push(
          `${prefix}.proficiencies[${i}] must be a non-empty string`
        );
      }
    }
  }

  /**
   * Validate DOMAIN_ACCESS grant
   * @private
   */
  static _validateDomainAccessGrant(grant, prefix, errors) {
    const { domains } = grant;

    if (!Array.isArray(domains) || domains.length === 0) {
      errors.push(
        `${prefix}.domains must be a non-empty array of domain IDs`
      );
      return;
    }

    // Validate each domain is a string
    for (let i = 0; i < domains.length; i++) {
      if (typeof domains[i] !== 'string' || domains[i].trim() === '') {
        errors.push(
          `${prefix}.domains[${i}] must be a non-empty string`
        );
      }
    }
  }

  /**
   * Validate SKILL_TRAINING grant
   * @private
   */
  static _validateSkillTrainingGrant(grant, prefix, errors) {
    const { skills } = grant;

    if (!Array.isArray(skills) || skills.length === 0) {
      errors.push(
        `${prefix}.skills must be a non-empty array of skill IDs`
      );
      return;
    }

    // Validate each skill is a string
    for (let i = 0; i < skills.length; i++) {
      if (typeof skills[i] !== 'string' || skills[i].trim() === '') {
        errors.push(
          `${prefix}.skills[${i}] must be a non-empty string`
        );
      }
    }

    // Validate asClassSkill if present
    if (grant.asClassSkill !== undefined && typeof grant.asClassSkill !== 'boolean') {
      errors.push(`${prefix}.asClassSkill must be a boolean`);
    }
  }

  /**
   * Assert validation passes, throw if not
   * @param {Object} ability
   * @throws {Error} if validation fails
   */
  static assert(ability) {
    const result = UnlockContractValidator.validate(ability);
    if (!result.valid) {
      throw new Error(
        `UNLOCK contract violation for "${ability.name}": ${result.errors.join('; ')}`
      );
    }
  }
}
