/**
 * Runtime Schema Validation - Phase 5 Data Contracts
 *
 * Validates actor/item data shapes against expected schemas.
 * Only active in dev mode (debugMode setting).
 * Logs violations without crashing production.
 *
 * Usage:
 *   validateActorSchema(actor, 'character')
 *   validateItemSchema(item, 'feat')
 *   validateNestedProperty(actor, 'system.hp.value', 'number')
 */

import { log, isGameReady } from './foundry-env.js';

const SYSTEM_ID = 'foundryvtt-swse';
const ACTIVE = () => {
  try {
    return game?.settings?.get?.(SYSTEM_ID, 'debugMode') === true;
  } catch {
    return false;
  }
};

/**
 * Expected Actor.system schema by type
 */
const ACTOR_SCHEMAS = {
  character: {
    type: 'string',
    level: 'number',
    race: 'string',
    class: 'string',
    hp: 'object',
    'hp.max': 'number',
    'hp.value': 'number',
    defenses: 'object',
    abilities: 'object',
    skills: 'object',
    destiny: 'object',
    'destiny.points': 'number'
  },
  npc: {
    type: 'string',
    level: 'number',
    hp: 'object',
    'hp.value': 'number',
    defenses: 'object'
  },
  vehicle: {
    type: 'string',
    hp: 'object',
    'hp.value': 'number'
  },
  droid: {
    type: 'string',
    level: 'number',
    hp: 'object',
    'hp.value': 'number'
  }
};

/**
 * Expected Item.system schema by type
 */
const ITEM_SCHEMAS = {
  weapon: {
    type: 'string',
    damage: 'string',
    damageBonus: 'number'
  },
  armor: {
    type: 'string',
    defense: 'number'
  },
  equipment: {
    type: 'string'
  },
  feat: {
    type: 'string'
  },
  talent: {
    type: 'string'
  },
  forcepower: {
    type: 'string',
    usesPerDay: 'number'
  }
};

/**
 * Check if a value matches expected type
 * @private
 */
function typeMatch(value, expectedType) {
  if (expectedType === 'object') {
    return value !== null && typeof value === 'object';
  }
  return typeof value === expectedType;
}

/**
 * Get nested property value using dot notation
 * @private
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, part) => current?.[part], obj);
}

/**
 * Validate actor data against schema
 * @param {Actor} actor
 * @param {string} actorType - 'character', 'npc', 'vehicle', 'droid'
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateActorSchema(actor, actorType = null) {
  if (!ACTIVE()) return { valid: true, errors: [] };
  if (!actor || !actor.system) return { valid: false, errors: ['Actor missing or no system'] };

  const type = actorType || actor.type;
  const schema = ACTOR_SCHEMAS[type];

  if (!schema) {
    return { valid: true, errors: [] }; // Unknown type, skip validation
  }

  const errors = [];
  for (const [path, expectedType] of Object.entries(schema)) {
    const value = path.includes('.')
      ? getNestedValue(actor.system, path)
      : actor.system[path];

    if (value !== undefined && !typeMatch(value, expectedType)) {
      errors.push(
        `system.${path}: expected ${expectedType}, got ${typeof value}`
      );
    }
  }

  if (errors.length > 0) {
    log.warn(
      `[Schema] Actor "${actor.name}" (${type}):`,
      errors.join('; ')
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate item data against schema
 * @param {Item} item
 * @param {string} itemType - optional, defaults to item.type
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateItemSchema(item, itemType = null) {
  if (!ACTIVE()) return { valid: true, errors: [] };
  if (!item || !item.system) return { valid: false, errors: ['Item missing or no system'] };

  const type = itemType || item.type;
  const schema = ITEM_SCHEMAS[type];

  if (!schema) {
    return { valid: true, errors: [] }; // Unknown type, skip validation
  }

  const errors = [];
  for (const [path, expectedType] of Object.entries(schema)) {
    const value = path.includes('.')
      ? getNestedValue(item.system, path)
      : item.system[path];

    if (value !== undefined && !typeMatch(value, expectedType)) {
      errors.push(
        `system.${path}: expected ${expectedType}, got ${typeof value}`
      );
    }
  }

  if (errors.length > 0) {
    log.warn(
      `[Schema] Item "${item.name}" (${type}):`,
      errors.join('; ')
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a specific nested property
 * @param {Object} dataObject - Actor or Item
 * @param {string} path - Dot-notation path (e.g., 'system.hp.value')
 * @param {string} expectedType
 * @returns {boolean}
 */
export function validateNestedProperty(dataObject, path, expectedType) {
  if (!ACTIVE()) return true;
  if (!dataObject) return false;

  const value = getNestedValue(dataObject, path);
  const valid = typeMatch(value, expectedType);

  if (!valid && value !== undefined) {
    log.warn(
      `[Schema] Invalid property ${path}: expected ${expectedType}, got ${typeof value}`
    );
  }

  return valid;
}

/**
 * Validate imported data against expected structure
 * Called before creating actor from import
 *
 * @param {Object} importData - Raw import data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateImportData(importData) {
  if (!ACTIVE()) return { valid: true, errors: [] };

  const errors = [];

  // Basic structure
  if (!importData || typeof importData !== 'object') {
    errors.push('Import data must be an object');
    return { valid: false, errors };
  }

  if (!importData.type || !['character', 'npc', 'vehicle', 'droid'].includes(importData.type)) {
    errors.push(`Invalid actor type: ${importData.type}`);
  }

  if (!importData.name || typeof importData.name !== 'string') {
    errors.push('Missing or invalid name');
  }

  // Check system object exists
  if (importData.system && typeof importData.system !== 'object') {
    errors.push('system must be an object');
  }

  // Check items array
  if (importData.items && !Array.isArray(importData.items)) {
    errors.push('items must be an array');
  }

  if (errors.length > 0) {
    log.warn(`[Schema] Import validation failed:`, errors.join('; '));
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize and normalize imported data
 * Removes unknown fields and ensures basic structure
 *
 * @param {Object} importData
 * @returns {Object} - Cleaned data
 */
export function sanitizeImportData(importData) {
  if (!importData || typeof importData !== 'object') {
    return {};
  }

  // Keep only known top-level fields
  const cleaned = {
    type: importData.type || 'character',
    name: importData.name || 'Imported Character',
    system: importData.system || {},
    items: Array.isArray(importData.items) ? importData.items : [],
    flags: importData.flags || {}
  };

  // Sanitize nested objects
  if (cleaned.system && typeof cleaned.system === 'object') {
    cleaned.system = { ...cleaned.system };
  }

  return cleaned;
}

/**
 * Create a data contract for runtime validation
 * Useful for documenting expected schemas
 *
 * Example:
 *   const charSchema = createDataContract('character', {
 *     'system.level': 'number',
 *     'system.hp.value': 'number'
 *   });
 *   charSchema.validate(actor);
 */
export function createDataContract(name, schema = {}) {
  return {
    name,
    schema,

    validate(dataObject) {
      if (!ACTIVE()) return { valid: true, errors: [] };

      const errors = [];
      for (const [path, expectedType] of Object.entries(schema)) {
        const value = getNestedValue(dataObject, path);
        if (value !== undefined && !typeMatch(value, expectedType)) {
          errors.push(`${path}: expected ${expectedType}, got ${typeof value}`);
        }
      }

      if (errors.length > 0) {
        log.warn(`[Contract ${name}] Violations:`, errors.join('; '));
      }

      return { valid: errors.length === 0, errors };
    }
  };
}

/**
 * Register all schema validation and make available to console
 */
export function registerSchemaValidation() {
  if (typeof window !== 'undefined') {
    window.SWSEValidation = {
      validateActorSchema,
      validateItemSchema,
      validateNestedProperty,
      validateImportData,
      sanitizeImportData,
      createDataContract
    };
  }
}
