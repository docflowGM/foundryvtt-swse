/**
 * Canonical species anatomy schema v1 (E2B-I1) -- PURE validation and copying authority.
 *
 * Contract: docs/architecture/equipment-ecosystem-e2b-s2-species-anatomy-schema-contract-v1.md (incl. section 15).
 * Source claims live in docs/audits/equipment-ecosystem-e2b-s1-species-anatomy-source-review.md; nothing here encodes a published rule.
 *
 * `anatomy` is an OPTIONAL field of an effective, publication-specific species profile. This module only decides whether a supplied
 * declaration is well-formed and returns an independent, deep-frozen copy. It does not compute attacks, occupancy, readiness, item sizes,
 * weights or encumbrance, imports no Foundry / engine / weapon-runtime code, and persists nothing.
 *
 * Shape (synthetic example, not a production declaration):
 *   { schemaVersion: 1, topologyStatus: 'complete'|'partial'|'unresolved',
 *     appendages: [{ id, kind, capabilities: { canHold, canWield, canManipulate }, constraints?: [ <held-item-load-floor> ] }] }
 *
 * - capabilities: each of the three keys is required and explicit: true | false | null (null = unknown; never defaulted to true).
 * - topology: `complete` = all equipment-relevant appendages are listed (an explicitly verified empty set is valid); `partial` = at least
 *   one reliably identified appendage but more structure uncertain (requires >= 1 appendage); `unresolved` = no established allocatable
 *   appendages (the list must be empty).
 * - the single supported constraint (data only, not an executable effect):
 *   { type:'held-item-load-floor', when:'held-by-appendage', itemSizeAtLeast:'Medium', loadCategoryFloor:'heavy', imposesEncumbered:true }
 * - canonical anatomy never carries per-actor functional / damage state, occupancy, readiness, attack entitlements or combat modifiers.
 *
 * Absent versus malformed: a missing / `undefined` `anatomy` property is valid (no declaration). Any other supplied value, including
 * `null`, is a declaration and must validate; it never silently becomes an ordinary default.
 */

export const SPECIES_ANATOMY_SCHEMA_VERSION = 1;
export const TOPOLOGY_STATUSES = Object.freeze(['complete', 'partial', 'unresolved']);
export const CAPABILITY_KEYS = Object.freeze(['canHold', 'canWield', 'canManipulate']);
export const SUPPORTED_CONSTRAINT_TYPES = Object.freeze(['held-item-load-floor']);

/** The only approved v1 constraint values (OD-2). Broadening this vocabulary is a later, separately approved decision. */
export const HELD_ITEM_LOAD_FLOOR_V1 = Object.freeze({
  type: 'held-item-load-floor',
  when: 'held-by-appendage',
  itemSizeAtLeast: 'Medium',
  loadCategoryFloor: 'heavy',
  imposesEncumbered: true,
});

/**
 * Field names that describe per-actor state, occupancy, readiness, attacks or combat modifiers. They are rejected with a dedicated code
 * so a misplaced actor-level fact is reported as such rather than as a generic unknown field.
 */
const FORBIDDEN_FIELDS = Object.freeze([
  'functionalState', 'functionalStateSource', 'functional', 'disabled', 'missing', 'severed', 'damaged', 'damage', 'injury', 'injured',
  'occupied', 'occupancy', 'assignedItem', 'heldItem', 'heldItems', 'grip', 'posture', 'ready', 'readied', 'readiness', 'equipped',
  'attacks', 'attackCount', 'extraAttacks', 'attackEntitlement', 'attackBonus', 'combat', 'modifiers', 'penalty', 'multipleAttackPenalty',
]);

/** Thrown for a supplied anatomy declaration that violates schema v1. `code` is stable and documented; `path` locates the problem. */
export class SpeciesAnatomySchemaError extends Error {
  constructor(code, path, detail) {
    super(`${code}: ${path}: ${detail}`);
    this.name = 'SpeciesAnatomySchemaError';
    this.code = code;
    this.path = path;
  }
}

/** Documented error codes. */
export const SPECIES_ANATOMY_ERROR_CODES = Object.freeze([
  'INVALID_ANATOMY_TYPE', 'INVALID_SCHEMA_VERSION', 'INVALID_TOPOLOGY_STATUS', 'INVALID_APPENDAGES', 'INVALID_APPENDAGE',
  'INVALID_APPENDAGE_ID', 'INVALID_APPENDAGE_KIND', 'DUPLICATE_APPENDAGE_ID', 'INVALID_CAPABILITIES', 'MISSING_CAPABILITY',
  'INVALID_CAPABILITY', 'PARTIAL_TOPOLOGY_REQUIRES_APPENDAGE', 'UNRESOLVED_TOPOLOGY_HAS_APPENDAGES', 'INVALID_CONSTRAINTS',
  'INVALID_CONSTRAINT', 'UNSUPPORTED_CONSTRAINT_TYPE', 'FORBIDDEN_FIELD', 'UNKNOWN_FIELD',
]);

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const nonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function rejectExtraKeys(obj, allowed, path) {
  for (const key of Object.keys(obj)) {
    if (allowed.includes(key)) continue;
    if (FORBIDDEN_FIELDS.includes(key)) {
      throw new SpeciesAnatomySchemaError('FORBIDDEN_FIELD', `${path}.${key}`, 'canonical species anatomy must not carry per-actor functional/damage state, occupancy, readiness, attack entitlements or combat modifiers');
    }
    throw new SpeciesAnatomySchemaError('UNKNOWN_FIELD', `${path}.${key}`, 'not part of anatomy schema v1');
  }
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function readConstraint(raw, path) {
  if (!isPlainObject(raw)) throw new SpeciesAnatomySchemaError('INVALID_CONSTRAINT', path, 'a constraint must be an object');
  if (!nonEmptyString(raw.type) || !SUPPORTED_CONSTRAINT_TYPES.includes(raw.type)) {
    throw new SpeciesAnatomySchemaError('UNSUPPORTED_CONSTRAINT_TYPE', `${path}.type`, `only ${SUPPORTED_CONSTRAINT_TYPES.join(', ')} is supported in schema v1`);
  }
  rejectExtraKeys(raw, Object.keys(HELD_ITEM_LOAD_FLOOR_V1), path);
  for (const [key, expected] of Object.entries(HELD_ITEM_LOAD_FLOOR_V1)) {
    if (!(key in raw)) throw new SpeciesAnatomySchemaError('INVALID_CONSTRAINT', `${path}.${key}`, 'required field is missing');
    if (raw[key] !== expected) throw new SpeciesAnatomySchemaError('INVALID_CONSTRAINT', `${path}.${key}`, `schema v1 accepts only ${JSON.stringify(expected)}`);
  }
  return { type: raw.type, when: raw.when, itemSizeAtLeast: raw.itemSizeAtLeast, loadCategoryFloor: raw.loadCategoryFloor, imposesEncumbered: raw.imposesEncumbered };
}

function readAppendage(raw, index, path, seen) {
  const where = `${path}.appendages[${index}]`;
  if (!isPlainObject(raw)) throw new SpeciesAnatomySchemaError('INVALID_APPENDAGE', where, 'an appendage must be an object');
  rejectExtraKeys(raw, ['id', 'kind', 'capabilities', 'constraints'], where);
  if (!nonEmptyString(raw.id)) throw new SpeciesAnatomySchemaError('INVALID_APPENDAGE_ID', `${where}.id`, 'must be a stable non-empty string');
  if (!nonEmptyString(raw.kind)) throw new SpeciesAnatomySchemaError('INVALID_APPENDAGE_KIND', `${where}.kind`, 'must be a non-empty string');
  if (seen.has(raw.id)) throw new SpeciesAnatomySchemaError('DUPLICATE_APPENDAGE_ID', `${where}.id`, `"${raw.id}" is declared more than once`);
  seen.add(raw.id);
  if (!isPlainObject(raw.capabilities)) throw new SpeciesAnatomySchemaError('INVALID_CAPABILITIES', `${where}.capabilities`, 'a capabilities object is required');
  rejectExtraKeys(raw.capabilities, CAPABILITY_KEYS, `${where}.capabilities`);
  const capabilities = {};
  for (const key of CAPABILITY_KEYS) {
    if (!(key in raw.capabilities) || raw.capabilities[key] === undefined) {
      throw new SpeciesAnatomySchemaError('MISSING_CAPABILITY', `${where}.capabilities.${key}`, 'must be stated explicitly as true, false or null (unknown)');
    }
    const v = raw.capabilities[key];
    if (v !== true && v !== false && v !== null) throw new SpeciesAnatomySchemaError('INVALID_CAPABILITY', `${where}.capabilities.${key}`, 'must be true, false or null');
    capabilities[key] = v;
  }
  const out = { id: raw.id, kind: raw.kind, capabilities };
  if (raw.constraints !== undefined) {
    if (!Array.isArray(raw.constraints)) throw new SpeciesAnatomySchemaError('INVALID_CONSTRAINTS', `${where}.constraints`, 'must be an array');
    out.constraints = raw.constraints.map((c, i) => readConstraint(c, `${where}.constraints[${i}]`));
  }
  return out;
}

/**
 * Validate a SUPPLIED anatomy declaration and return an independent, deep-frozen copy (the input is never mutated or aliased).
 * @param {*} raw  the declaration (`null` / non-objects are malformed, not "absent")
 * @param {string} [path='anatomy']  location label used in error messages
 * @returns {Readonly<{schemaVersion:1, topologyStatus:string, appendages:object[]}>}
 * @throws {SpeciesAnatomySchemaError}
 */
export function validateSpeciesAnatomyV1(raw, path = 'anatomy') {
  if (!isPlainObject(raw)) throw new SpeciesAnatomySchemaError('INVALID_ANATOMY_TYPE', path, 'a supplied anatomy declaration must be an object (null does not mean "absent")');
  rejectExtraKeys(raw, ['schemaVersion', 'topologyStatus', 'appendages'], path);
  if (raw.schemaVersion !== SPECIES_ANATOMY_SCHEMA_VERSION) throw new SpeciesAnatomySchemaError('INVALID_SCHEMA_VERSION', `${path}.schemaVersion`, `must equal ${SPECIES_ANATOMY_SCHEMA_VERSION}`);
  if (!TOPOLOGY_STATUSES.includes(raw.topologyStatus)) throw new SpeciesAnatomySchemaError('INVALID_TOPOLOGY_STATUS', `${path}.topologyStatus`, `must be one of ${TOPOLOGY_STATUSES.join(', ')}`);
  if (!Array.isArray(raw.appendages)) throw new SpeciesAnatomySchemaError('INVALID_APPENDAGES', `${path}.appendages`, 'must be an array');
  const seen = new Set();
  const appendages = raw.appendages.map((a, i) => readAppendage(a, i, path, seen));
  if (raw.topologyStatus === 'partial' && appendages.length === 0) throw new SpeciesAnatomySchemaError('PARTIAL_TOPOLOGY_REQUIRES_APPENDAGE', `${path}.appendages`, 'partial topology must contain at least one reliably identified appendage');
  if (raw.topologyStatus === 'unresolved' && appendages.length > 0) throw new SpeciesAnatomySchemaError('UNRESOLVED_TOPOLOGY_HAS_APPENDAGES', `${path}.appendages`, 'unresolved topology declares no established allocatable appendages');
  return deepFreeze({ schemaVersion: SPECIES_ANATOMY_SCHEMA_VERSION, topologyStatus: raw.topologyStatus, appendages });
}

/** True when `owner` declares an `anatomy` (own, non-undefined). `null` IS a declaration (and therefore malformed). */
export function declaresSpeciesAnatomy(owner) {
  return owner !== null && typeof owner === 'object' && Object.prototype.hasOwnProperty.call(owner, 'anatomy') && owner.anatomy !== undefined;
}

/**
 * Read the optional anatomy declared directly on `owner` (a species system block, registry variant, or snapshot variant).
 * Absent -> `undefined`. Declared -> validated frozen copy, or a thrown SpeciesAnatomySchemaError. Never reads any other object.
 */
export function readOptionalSpeciesAnatomy(owner, path = 'anatomy') {
  if (!declaresSpeciesAnatomy(owner)) return undefined;
  return validateSpeciesAnatomyV1(owner.anatomy, path);
}

export default { validateSpeciesAnatomyV1, readOptionalSpeciesAnatomy, declaresSpeciesAnatomy, SpeciesAnatomySchemaError };
