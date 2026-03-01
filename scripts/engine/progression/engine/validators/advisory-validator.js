/**
 * ADVISORY SCHEMA VALIDATOR v1.1
 *
 * Tier XI: Placeholder Presence Enforcement
 * Contract: Each required placeholder appears exactly once in its authorized segment.
 *
 * This validator enforces semantic guarantees that JSON Schema cannot.
 * - Structure validation: delegated to JSON Schema (ajv)
 * - Placeholder injection: enforced here
 */

const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');

// Placeholder authorization map
// Maps advisory_type -> tier -> segment -> required placeholder token
const PLACEHOLDER_AUTHORIZATION = {
  conflict: {
    all_tiers: {
      Observation: 'conflict_observation',
      Impact: 'conflict_impact',
      Guidance: 'conflict_guidance',
      'Optional Encouragement': 'conflict_encouragement'
    }
  },
  drift: {
    all_tiers: {
      Observation: 'drift_observation',
      Impact: 'drift_impact',
      Guidance: 'drift_guidance',
      'Optional Encouragement': 'drift_encouragement'
    }
  },
  prestige_planning: {
    all_tiers: {
      Observation: 'prestige_observation',
      Impact: 'prestige_impact',
      Guidance: 'prestige_guidance',
      'Optional Encouragement': 'prestige_encouragement'
    }
  },
  strength_reinforcement: {
    all_tiers: {
      Observation: 'strength_observation',
      Impact: 'strength_impact',
      Guidance: 'strength_guidance',
      'Optional Encouragement': 'strength_encouragement'
    }
  },
  hybrid_identity: {
    all_tiers: {
      Observation: 'hybrid_observation',
      Impact: 'hybrid_impact',
      Guidance: 'hybrid_guidance',
      'Optional Encouragement': 'hybrid_encouragement'
    }
  },
  specialization_warning: {
    all_tiers: {
      Observation: 'specialization_observation',
      Impact: 'specialization_impact',
      Guidance: 'specialization_guidance',
      'Optional Encouragement': 'specialization_encouragement'
    }
  },
  momentum: {
    all_tiers: {
      Observation: 'momentum_observation',
      Impact: 'momentum_impact',
      Guidance: 'momentum_guidance',
      'Optional Encouragement': 'momentum_encouragement'
    }
  },
  long_term_trajectory: {
    all_tiers: {
      Observation: 'trajectory_observation',
      Impact: 'trajectory_impact',
      Guidance: 'trajectory_guidance',
      'Optional Encouragement': 'trajectory_encouragement'
    }
  }
};

/**
 * Asserts that a placeholder appears exactly once in a segment value
 * @param {string} segmentValue - The text content of the segment
 * @param {string} placeholderToken - The placeholder token (e.g., 'conflict_observation')
 * @throws {Error} if placeholder appears 0 or 2+ times
 */
function assertExactPlaceholder(segmentValue, placeholderToken) {
  const regex = new RegExp(`\\{${placeholderToken}\\}`, 'g');
  const matches = segmentValue.match(regex) || [];

  if (matches.length !== 1) {
    throw new Error(
      `Placeholder {${placeholderToken}} must appear exactly once, found ${matches.length} occurrences`
    );
  }
}

/**
 * Validates placeholder presence in all segments of a tier object
 * @param {object} tierObj - The tier object (very_low, low, etc.)
 * @param {string} advisoryType - Type of advisory (e.g., 'conflict')
 * @param {string} tier - Intensity tier (e.g., 'very_low')
 */
function validateTierPlaceholders(tierObj, advisoryType, tier) {
  const auth = PLACEHOLDER_AUTHORIZATION[advisoryType]?.all_tiers;
  if (!auth) return;

  // Handle Observation and Impact as arrays or strings
  for (const [segment, expectedToken] of Object.entries(auth)) {
    const value = tierObj[segment];

    if (!value) continue;

    if (Array.isArray(value)) {
      // For array fields (hybrid_identity.Observation, etc.)
      for (let i = 0; i < value.length; i++) {
        try {
          assertExactPlaceholder(value[i], expectedToken);
        } catch (err) {
          throw new Error(
            `Advisory type '${advisoryType}', tier '${tier}', segment '${segment}' (array index ${i}): ${err.message}`
          );
        }
      }
    } else if (typeof value === 'string') {
      // For string fields
      try {
        assertExactPlaceholder(value, expectedToken);
      } catch (err) {
        throw new Error(
          `Advisory type '${advisoryType}', tier '${tier}', segment '${segment}': ${err.message}`
        );
      }
    }
  }
}

/**
 * Validates all advisory types and their placeholder injection
 * @param {object} advisory - The advisory object
 * @throws {Error} on any validation failure
 */
function validateAdvisoryPlaceholders(advisory) {
  const advisoryTypes = advisory.advisory_types;

  for (const [advisoryType, typeObj] of Object.entries(advisoryTypes)) {
    const tiers = ['very_low', 'low', 'medium', 'high', 'very_high'];

    for (const tier of tiers) {
      const tierObj = typeObj[tier];
      if (!tierObj) continue;

      validateTierPlaceholders(tierObj, advisoryType, tier);
    }
  }
}

/**
 * Main validation function combining structural and semantic validation
 * @param {object} advisory - The advisory object to validate
 * @param {string} schemaPath - Path to JSON schema file
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateAdvisory(advisory, schemaPath) {
  const errors = [];

  // 1. Structural validation via JSON Schema
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const structurallyValid = validate(advisory);

  if (!structurallyValid) {
    errors.push('STRUCTURAL VIOLATIONS:');
    validate.errors.forEach(err => {
      errors.push(`  ${err.instancePath || 'root'}: ${err.message}`);
    });
  }

  // 2. Semantic validation (Tier XI: placeholder enforcement)
  try {
    validateAdvisoryPlaceholders(advisory);
  } catch (err) {
    errors.push('SEMANTIC VIOLATIONS (Tier XI - Placeholder Enforcement):');
    errors.push(`  ${err.message}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateAdvisory,
  validateAdvisoryPlaceholders,
  validateTierPlaceholders,
  assertExactPlaceholder
};
