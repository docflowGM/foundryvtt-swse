/**
 * ModifierTypes.js — Canonical Modifier Type System
 *
 * Defines:
 * - Canonical modifier object shape
 * - Modifier type enums (stacking categories)
 * - Stacking rules per type
 * - Target key patterns
 * - Modifier factory
 *
 * Single source of truth for all modifier system contracts.
 */

/**
 * Canonical modifier type constants
 * These are the only stacking categories allowed in the system
 */
export const ModifierType = Object.freeze({
  UNTYPED: 'untyped',
  COMPETENCE: 'competence',
  ENHANCEMENT: 'enhancement',
  MORALE: 'morale',
  INSIGHT: 'insight',
  CIRCUMSTANCE: 'circumstance',
  PENALTY: 'penalty',
  DODGE: 'dodge',
  DEXTERITY_LOSS: 'dexterityLoss'  // Meta-modifier for special case
});

/**
 * Stacking rules for each modifier type
 * Determines how multiples of same type are resolved
 */
export const STACKING_RULES = Object.freeze({
  untyped: 'stack',                      // All untyped stack
  competence: 'highestOnly',             // Only highest competence applies
  enhancement: 'highestOnly',            // Only highest enhancement applies
  morale: 'highestOnly',                 // Only highest morale applies
  insight: 'highestOnly',                // Only highest insight applies
  circumstance: 'stackUnlessSameSource', // Stack unless from same sourceId
  penalty: 'stackUnlessSameSource',      // Stack unless from same sourceId
  dodge: 'stack',                        // All dodge stack
  dexterityLoss: 'meta'                  // Meta-modifier, special handling
});

/**
 * Valid target key patterns
 * Used for validation during modifier creation
 */
export const VALID_TARGET_PATTERNS = Object.freeze({
  skill: /^skill\.\w+$/,
  defense: /^defense\.(fort|reflex|will|damageThreshold)$/i,
  ability: /^ability\.(str|dex|con|int|wis|cha)$/i,
  hp: /^hp\.max$/,
  speed: /^speed\.(base|run)$/,
  initiative: /^initiative\.total$/,
  bab: /^bab\.total$/,
  global: /^global\.(attack|damage)$/
});

/**
 * Modifier source enum
 */
export const ModifierSource = Object.freeze({
  FEAT: 'feat',
  TALENT: 'talent',
  SPECIES: 'species',
  ENCUMBRANCE: 'encumbrance',
  CONDITION: 'condition',
  ITEM: 'item',
  EFFECT: 'effect',
  DROID_MOD: 'droidMod',
  VEHICLE_MOD: 'vehicleMod',
  CUSTOM: 'custom'
});

/**
 * Canonical Modifier object shape
 * @typedef {Object} Modifier
 * @property {string} id - Unique identifier (uuid or sourceId_index)
 * @property {string} source - Origin of modifier (feat, talent, species, etc.)
 * @property {string} sourceId - Item ID or hardcoded source identifier
 * @property {string} sourceName - Human-readable source name
 * @property {string} target - Canonical target key (skill.acrobatics, defense.reflex, etc.)
 * @property {string} type - Modifier type (controls stacking)
 * @property {number} value - Numeric modifier (signed)
 * @property {boolean} enabled - Whether modifier is currently active
 * @property {number} [priority] - Sort order (0-1000, lower = earlier)
 * @property {string[]} [conditions] - Optional conditional flags
 * @property {string} [description] - Human-readable description for UI
 */

/**
 * Validate that an object conforms to Modifier shape
 * @param {*} obj - Object to validate
 * @returns {boolean} True if valid Modifier
 */
export function isValidModifier(obj) {
  if (!obj || typeof obj !== 'object') return false;

  const required = ['id', 'source', 'sourceName', 'target', 'type', 'value', 'enabled'];
  for (const field of required) {
    if (!(field in obj)) return false;
  }

  // Type and source must be valid
  if (!Object.values(ModifierType).includes(obj.type)) return false;
  if (!Object.values(ModifierSource).includes(obj.source)) return false;

  // Value must be number
  if (typeof obj.value !== 'number') return false;

  // Enabled must be boolean
  if (typeof obj.enabled !== 'boolean') return false;

  return true;
}

/**
 * Create a valid Modifier object with defaults
 * @param {Object} data - Modifier data
 * @returns {Modifier} Valid modifier object
 */
export function createModifier(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('createModifier: data must be object');
  }

  const {
    source,
    sourceId,
    sourceName,
    target,
    type,
    value,
    enabled = true,
    priority = 500,
    conditions = [],
    description = ''
  } = data;

  // Validate required fields
  if (!source || !sourceName || !target || !type || value === undefined) {
    throw new Error(`createModifier: missing required fields: source=${source}, sourceName=${sourceName}, target=${target}, type=${type}, value=${value}`);
  }

  // Validate type
  if (!Object.values(ModifierType).includes(type)) {
    throw new Error(`createModifier: invalid type "${type}"`);
  }

  // Validate source
  if (!Object.values(ModifierSource).includes(source)) {
    throw new Error(`createModifier: invalid source "${source}"`);
  }

  // Validate value
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`createModifier: value must be finite number, got ${value}`);
  }

  // Generate ID if not provided
  const id = data.id || `${sourceId || source}_${sourceName}_${target}`.replace(/[^a-z0-9]/gi, '_');

  return {
    id,
    source,
    sourceId: sourceId || source,
    sourceName,
    target,
    type,
    value: Number(value),
    enabled: enabled === true,
    priority: Math.max(0, Math.min(1000, Number(priority) || 500)),
    conditions: Array.isArray(conditions) ? conditions : [],
    description: description || `${sourceName} ${value > 0 ? '+' : ''}${value}`
  };
}

/**
 * Get stacking rule for a modifier type
 * @param {string} type - Modifier type
 * @returns {string} Stacking rule name
 */
export function getStackingRule(type) {
  return STACKING_RULES[type] || 'stack';
}

/**
 * Check if target key is valid
 * @param {string} target - Target key to validate
 * @returns {boolean} True if valid target
 */
export function isValidTarget(target) {
  if (!target || typeof target !== 'string') return false;

  for (const pattern of Object.values(VALID_TARGET_PATTERNS)) {
    if (pattern.test(target)) return true;
  }

  return false;
}

/**
 * Compare two modifiers by priority (for sorting)
 * @param {Modifier} a
 * @param {Modifier} b
 * @returns {number} -1, 0, or 1 (for sort)
 */
export function compareModifierPriority(a, b) {
  const aPriority = Number(a?.priority ?? 500);
  const bPriority = Number(b?.priority ?? 500);

  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }

  // Tiebreaker: alphabetical by source
  return (a?.sourceName ?? '').localeCompare(b?.sourceName ?? '');
}

export default Object.freeze({
  ModifierType,
  ModifierSource,
  STACKING_RULES,
  VALID_TARGET_PATTERNS,
  isValidModifier,
  createModifier,
  getStackingRule,
  isValidTarget,
  compareModifierPriority
});
