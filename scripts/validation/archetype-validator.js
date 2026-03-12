/**
 * Runtime Archetype Validation Module
 *
 * Validates archetype objects at load time against the canonical schema.
 * If validation fails, logs Sentinel error and disables archetype.
 * Prevents silent scoring corruption.
 */

import {
  MECHANICAL_BIAS_KEYS,
  ROLE_BIAS_KEYS,
  ATTRIBUTE_KEYS,
  ARCHETYPE_STATUS,
  isValidMechanicalBiasKey,
  isValidRoleBiasKey,
  isValidAttributeKey,
  isValidArchetypeStatus
} from "../constants/archetype-bias-enums.js";

// Sentinel error types
export class ArchetypeValidationError extends Error {
  constructor(message, archetype, details) {
    super(message);
    this.name = "ArchetypeValidationError";
    this.archetype = archetype;
    this.details = details;
  }
}

export class ArchetypeUnknownBiasKey extends Error {
  constructor(message, biasType, invalidKeys, archetype) {
    super(message);
    this.name = "ArchetypeUnknownBiasKey";
    this.biasType = biasType;
    this.invalidKeys = invalidKeys;
    this.archetype = archetype;
  }
}

export class ArchetypeInvalidAttributeKey extends Error {
  constructor(message, invalidKeys, archetype) {
    super(message);
    this.name = "ArchetypeInvalidAttributeKey";
    this.invalidKeys = invalidKeys;
    this.archetype = archetype;
  }
}

/**
 * Validate a single archetype object
 * Returns validation result with detailed error info
 */
export function validateArchetype(archetype, archetypeName) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    sanitized: null
  };

  if (!archetype || typeof archetype !== "object") {
    result.isValid = false;
    result.errors.push("Archetype is not an object");
    return result;
  }

  // Check required fields
  if (!archetype.name || typeof archetype.name !== "string") {
    result.isValid = false;
    result.errors.push("Missing or invalid 'name' field");
  }

  if (!archetype.mechanicalBias) {
    result.isValid = false;
    result.errors.push("Missing 'mechanicalBias' object");
  }

  if (!archetype.roleBias) {
    result.isValid = false;
    result.errors.push("Missing 'roleBias' object");
  }

  if (!archetype.attributeBias) {
    result.isValid = false;
    result.errors.push("Missing 'attributeBias' object");
  }

  // Validate status
  if (archetype.status && !isValidArchetypeStatus(archetype.status)) {
    result.isValid = false;
    result.errors.push(
      `Invalid status "${archetype.status}". Must be one of: ${ARCHETYPE_STATUS.join(", ")}`
    );
  }

  // Validate mechanicalBias keys
  if (archetype.mechanicalBias && typeof archetype.mechanicalBias === "object") {
    const invalidKeys = Object.keys(archetype.mechanicalBias).filter(
      k => !isValidMechanicalBiasKey(k)
    );
    if (invalidKeys.length > 0) {
      result.isValid = false;
      result.errors.push(
        new ArchetypeUnknownBiasKey(
          `Invalid mechanicalBias keys: ${invalidKeys.join(", ")}`,
          "mechanicalBias",
          invalidKeys,
          archetypeName
        )
      );
    }

    // Validate numeric values
    for (const [key, value] of Object.entries(archetype.mechanicalBias)) {
      if (typeof value !== "number" || value < 0) {
        result.isValid = false;
        result.errors.push(
          `mechanicalBias["${key}"] must be a non-negative number, got ${typeof value}`
        );
      }
    }
  }

  // Validate roleBias keys
  if (archetype.roleBias && typeof archetype.roleBias === "object") {
    const invalidKeys = Object.keys(archetype.roleBias).filter(
      k => !isValidRoleBiasKey(k)
    );
    if (invalidKeys.length > 0) {
      result.isValid = false;
      result.errors.push(
        new ArchetypeUnknownBiasKey(
          `Invalid roleBias keys: ${invalidKeys.join(", ")}`,
          "roleBias",
          invalidKeys,
          archetypeName
        )
      );
    }

    // Validate numeric values
    for (const [key, value] of Object.entries(archetype.roleBias)) {
      if (typeof value !== "number" || value < 0) {
        result.isValid = false;
        result.errors.push(
          `roleBias["${key}"] must be a non-negative number, got ${typeof value}`
        );
      }
    }
  }

  // Validate attributeBias keys
  if (archetype.attributeBias && typeof archetype.attributeBias === "object") {
    const invalidKeys = Object.keys(archetype.attributeBias).filter(
      k => !isValidAttributeKey(k)
    );
    if (invalidKeys.length > 0) {
      result.isValid = false;
      result.errors.push(
        new ArchetypeInvalidAttributeKey(
          `Invalid attributeBias keys: ${invalidKeys.join(", ")}`,
          invalidKeys,
          archetypeName
        )
      );
    }

    // Validate numeric values
    for (const [key, value] of Object.entries(archetype.attributeBias)) {
      if (typeof value !== "number" || value < 0) {
        result.isValid = false;
        result.errors.push(
          `attributeBias["${key}"] must be a non-negative number, got ${typeof value}`
        );
      }
    }
  }

  // Validate talents array
  if (archetype.talents && !Array.isArray(archetype.talents)) {
    result.warnings.push("'talents' should be an array");
  }

  // Validate feats array
  if (archetype.feats && !Array.isArray(archetype.feats)) {
    result.warnings.push("'feats' should be an array");
  }

  return result;
}

/**
 * Normalize and sanitize an archetype object
 * Ensures all required fields exist with safe defaults
 */
export function normalizeArchetype(archetype) {
  const normalized = { ...archetype };

  // Ensure required fields
  if (!normalized.status) {
    normalized.status = "active";
  }

  if (!normalized.mechanicalBias || typeof normalized.mechanicalBias !== "object") {
    normalized.mechanicalBias = {};
  }

  if (!normalized.roleBias || typeof normalized.roleBias !== "object") {
    normalized.roleBias = {};
  }

  if (!normalized.attributeBias || typeof normalized.attributeBias !== "object") {
    normalized.attributeBias = {};
  }

  // Ensure arrays exist
  if (!Array.isArray(normalized.talents)) {
    normalized.talents = [];
  }

  if (!Array.isArray(normalized.feats)) {
    normalized.feats = [];
  }

  // Freeze to prevent accidental mutation
  return Object.freeze(normalized);
}

/**
 * Load and validate all archetypes from data
 * Logs errors through Sentinel system if available
 */
export function loadAndValidateArchetypes(archetypesData, sentinelLogger = null) {
  const validArchetypes = {};
  const disabledArchetypes = [];
  const validationErrors = [];

  if (!archetypesData || !archetypesData.classes) {
    const error = "Invalid archetypes data structure";
    if (sentinelLogger) sentinelLogger.error(error);
    return { validArchetypes, disabledArchetypes, validationErrors };
  }

  for (const [className, classData] of Object.entries(archetypesData.classes)) {
    if (!classData.archetypes) continue;

    validArchetypes[className] = {};

    for (const [archetypeName, archetype] of Object.entries(classData.archetypes)) {
      const fullName = `${className}/${archetypeName}`;
      const validation = validateArchetype(archetype, fullName);

      if (validation.isValid) {
        // Normalize and store valid archetype
        validArchetypes[className][archetypeName] = normalizeArchetype(archetype);
      } else {
        // Disable invalid archetype
        const disabledArchetype = normalizeArchetype(archetype);
        disabledArchetype.status = "disabled";
        validArchetypes[className][archetypeName] = disabledArchetype;

        const errorMsg = `Archetype validation failed: ${fullName}\n${validation.errors
          .map(e => `  - ${e instanceof Error ? e.message : e}`)
          .join("\n")}`;

        validationErrors.push({
          archetype: fullName,
          errors: validation.errors,
          warnings: validation.warnings
        });

        if (sentinelLogger) {
          sentinelLogger.error(errorMsg, {
            archetype: fullName,
            errors: validation.errors.map(e =>
              e instanceof Error ? e.message : e
            )
          });
        }

        disabledArchetypes.push(fullName);
      }

      // Log warnings
      if (validation.warnings.length > 0 && sentinelLogger) {
        sentinelLogger.warn(`Archetype warnings for ${fullName}: ${validation.warnings.join(", ")}`);
      }
    }
  }

  return { validArchetypes, disabledArchetypes, validationErrors };
}
