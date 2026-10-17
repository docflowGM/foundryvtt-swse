/**
 * Weapon record invariants (E4-C1 WP2) -- PURE and READ ONLY.
 *
 * Validates the persisted weapon equipment record defined by the approved E4-C0 contract (§3):
 *   system.weaponPosture   : 'STOWED' | 'EQUIPPED' | 'READIED'
 *   system.weaponOccupancy : { schemaVersion: 1, purpose: null | 'hold' | 'wield', appendageIds: string[] }
 *
 * Structural invariants checked here (contract §3.2, items 1-5):
 *   1. STOWED   <=> purpose === null and appendageIds is empty
 *   2. EQUIPPED  => purpose is 'hold' or 'wield' and appendageIds is non-empty
 *   3. READIED   => purpose === 'wield' (the appendage COUNT must also equal the required hands when the caller supplies the
 *                   canonical `requiredHands`; the hands themselves come from the E3-A3 grip authority, never from here)
 *   4. appendageIds are distinct non-empty strings; when `knownAppendageIds` is supplied each must exist in the effective anatomy
 *      (cross-Item conflicts are the E3-A2 resolver's job and are not duplicated here)
 *   5. schemaVersion === 1 and the exact shape; an absent record is `absent` and a malformed one `invalid` -- neither is ever
 *      defaulted to STOWED (the default applies only to NEWLY created weapons, through the schema/creation defaults)
 *
 * The validator never reads legacy fields as posture: `equipped`, `dualWielded` and `wieldedTwoHanded` are reported as ignored when present.
 * It performs no mutation, spends nothing, reads no document and decides no game rule (no action cost, no grip, no readiness).
 */
import { EQUIPMENT_POSTURE, isEquipmentPosture } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-posture.js';

export const WEAPON_OCCUPANCY_SCHEMA_VERSION = 1;
export const WEAPON_OCCUPANCY_PURPOSES = Object.freeze(['hold', 'wield']);
export const DEFAULT_WEAPON_POSTURE = EQUIPMENT_POSTURE.STOWED;
export const WEAPON_RECORD_STATUS = Object.freeze({ VALID: 'valid', ABSENT: 'absent', INVALID: 'invalid' });
/** Retired weapon fields. They never establish posture or grip; their presence is only reported. */
export const LEGACY_WEAPON_STATE_FIELDS = Object.freeze(['equipped', 'dualWielded', 'wieldedTwoHanded']);

/** Codes: INVALID_OPTIONS, INVALID_KNOWN_APPENDAGES, INVALID_REQUIRED_HANDS. Evidence problems never throw; they are reported as issues. */
export class WeaponRecordInputError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'WeaponRecordInputError';
    this.code = code;
  }
}

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.length > 0 && v.trim() === v;
const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });
const clone = (v) => JSON.parse(JSON.stringify(v));
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

/** The record a NEWLY created ordinary weapon starts with. Fresh and unfrozen so callers cannot share state. */
export function createDefaultWeaponRecord() {
  return { weaponPosture: DEFAULT_WEAPON_POSTURE, weaponOccupancy: { schemaVersion: WEAPON_OCCUPANCY_SCHEMA_VERSION, purpose: null, appendageIds: [] } };
}

function readOptions(options) {
  if (options === undefined || options === null) return { known: null, requiredHands: null };
  if (!isPlain(options)) throw new WeaponRecordInputError('INVALID_OPTIONS', 'options must be an object');
  let known = null;
  if (options.knownAppendageIds !== undefined && options.knownAppendageIds !== null) {
    if (!Array.isArray(options.knownAppendageIds) || !options.knownAppendageIds.every(nonEmpty)) throw new WeaponRecordInputError('INVALID_KNOWN_APPENDAGES', 'knownAppendageIds must be an array of non-empty strings');
    known = new Set(options.knownAppendageIds);
  }
  let requiredHands = null;
  if (options.requiredHands !== undefined && options.requiredHands !== null) {
    if (![1, 2].includes(options.requiredHands)) throw new WeaponRecordInputError('INVALID_REQUIRED_HANDS', 'requiredHands must be 1 or 2 when supplied (it is canonical evidence, not a stored value)');
    requiredHands = options.requiredHands;
  }
  return { known, requiredHands };
}

const finish = (status, extra, issues) => deepFreeze({ status, posture: null, occupancy: null, ...extra, issues });

/**
 * @param {object} system a weapon Item's `system` data (plain data; never mutated or frozen)
 * @param {{knownAppendageIds?:string[], requiredHands?:1|2}} [options]
 * @returns {{status:'valid'|'absent'|'invalid', posture:string|null, occupancy:object|null, issues:object[]}}
 *   `posture`/`occupancy` are populated ONLY when status is `valid`. Deterministic, independently owned, deeply frozen.
 * @throws {WeaponRecordInputError} for malformed options only
 */
export function validateWeaponRecord(system, options) {
  const { known, requiredHands } = readOptions(options);
  const issues = [];
  if (!isPlain(system)) {
    issues.push(issue('weapon-system-not-an-object', 'blocking', 'The weapon system data is not an object; no record can be read.', { receivedType: Array.isArray(system) ? 'array' : typeof system }));
    return finish(WEAPON_RECORD_STATUS.INVALID, {}, issues);
  }
  const legacy = LEGACY_WEAPON_STATE_FIELDS.filter((k) => has(system, k));
  if (legacy.length) issues.push(issue('legacy-weapon-fields-ignored', 'info', 'Retired weapon equip and grip fields never establish posture or grip and were ignored.', { fields: [...legacy].sort() }));

  const hasPosture = has(system, 'weaponPosture') && system.weaponPosture !== undefined;
  const hasOccupancy = has(system, 'weaponOccupancy') && system.weaponOccupancy !== undefined;
  if (!hasPosture && !hasOccupancy) {
    issues.push(issue('weapon-record-absent', 'warning', 'The weapon carries no posture/occupancy record. No posture is assumed: an absent record is not a STOWED weapon.'));
    return finish(WEAPON_RECORD_STATUS.ABSENT, {}, issues);
  }
  const invalid = (code, message, details = {}) => issues.push(issue(code, 'blocking', message, details));
  if (hasPosture !== hasOccupancy) invalid('weapon-record-incomplete', 'Posture and occupancy are one record; exactly one of the two fields is present.', { present: hasPosture ? 'weaponPosture' : 'weaponOccupancy' });
  if (hasPosture && !isEquipmentPosture(system.weaponPosture)) invalid('weapon-posture-invalid', `weaponPosture must be one of ${Object.values(EQUIPMENT_POSTURE).join(', ')} (exact, case-sensitive).`, { receivedType: typeof system.weaponPosture });

  let occupancy = null;
  if (hasOccupancy) {
    const o = system.weaponOccupancy;
    if (!isPlain(o)) invalid('weapon-occupancy-malformed', 'weaponOccupancy must be an object { schemaVersion, purpose, appendageIds }.', { receivedType: Array.isArray(o) ? 'array' : typeof o });
    else {
      const extra = Object.keys(o).filter((k) => !['schemaVersion', 'purpose', 'appendageIds'].includes(k));
      const missing = ['schemaVersion', 'purpose', 'appendageIds'].filter((k) => !has(o, k));
      if (extra.length) invalid('weapon-occupancy-unsupported-fields', 'weaponOccupancy carries unsupported field(s); nothing is read from them.', { fields: [...extra].sort() });
      if (missing.length) invalid('weapon-occupancy-missing-fields', 'weaponOccupancy is missing required field(s).', { fields: [...missing].sort() });
      if (has(o, 'schemaVersion') && o.schemaVersion !== WEAPON_OCCUPANCY_SCHEMA_VERSION) invalid('weapon-occupancy-schema-version-unsupported', `weaponOccupancy.schemaVersion must be ${WEAPON_OCCUPANCY_SCHEMA_VERSION}; there is no migration or fallback.`, { received: typeof o.schemaVersion === 'number' ? o.schemaVersion : typeof o.schemaVersion });
      if (has(o, 'purpose') && o.purpose !== null && !WEAPON_OCCUPANCY_PURPOSES.includes(o.purpose)) invalid('weapon-occupancy-purpose-invalid', `purpose must be null, 'hold' or 'wield'.`, { receivedType: typeof o.purpose });
      if (has(o, 'appendageIds')) {
        if (!Array.isArray(o.appendageIds) || !o.appendageIds.every(nonEmpty)) invalid('weapon-occupancy-appendage-ids-invalid', 'appendageIds must be an array of non-empty, untrimmed-whitespace-free strings.');
        else {
          if (new Set(o.appendageIds).size !== o.appendageIds.length) invalid('weapon-occupancy-duplicate-appendage', 'appendageIds repeats an appendage id.');
          if (known) {
            const unknown = o.appendageIds.filter((id) => !known.has(id));
            if (unknown.length) invalid('weapon-occupancy-appendage-unknown', 'appendageIds names appendage(s) that do not exist in the effective anatomy.', { appendageIds: [...unknown].sort() });
          }
        }
      }
      if (!issues.some((i) => i.code.startsWith('weapon-occupancy-') && i.severity === 'blocking')) occupancy = { schemaVersion: o.schemaVersion, purpose: o.purpose, appendageIds: [...o.appendageIds] };
    }
  }

  // cross-field invariants only on a structurally sound pair
  if (occupancy && hasPosture && isEquipmentPosture(system.weaponPosture)) {
    const posture = system.weaponPosture;
    const count = occupancy.appendageIds.length;
    if (posture === EQUIPMENT_POSTURE.STOWED && (occupancy.purpose !== null || count > 0)) invalid('stowed-record-holds-appendages', 'A STOWED weapon must have purpose null and no appendages.', { purpose: occupancy.purpose, appendageCount: count });
    if (posture !== EQUIPMENT_POSTURE.STOWED && (occupancy.purpose === null || count === 0)) invalid('held-record-without-assignment', `A ${posture} weapon must name its purpose and at least one appendage; none is chosen for it.`, { purpose: occupancy.purpose, appendageCount: count });
    if (posture === EQUIPMENT_POSTURE.READIED && occupancy.purpose === 'hold') invalid('readied-record-hold-only', 'A READIED weapon must be wielded, not merely held.', { purpose: occupancy.purpose });
    if (posture === EQUIPMENT_POSTURE.READIED && requiredHands !== null && count !== requiredHands) invalid('readied-record-appendage-count-mismatch', 'A READIED weapon must name exactly the canonical required hands.', { requiredHands, appendageCount: count });
  }

  if (issues.some((i) => i.severity === 'blocking')) return finish(WEAPON_RECORD_STATUS.INVALID, {}, issues);
  return finish(WEAPON_RECORD_STATUS.VALID, { posture: system.weaponPosture, occupancy: clone(occupancy) }, issues);
}

/**
 * Structural legality of replacing one persisted record with another. This is NOT a rules check: draw/stow cost, Quick Draw and every
 * other action rule stay with their existing authorities, and cross-Item appendage conflicts stay with the E3-A2 resolver. It only
 * guarantees that a coordinator write can never persist a malformed record or silently repair one.
 *
 * @param {object} beforeSystem  the weapon's current `system` data
 * @param {object} afterSystem   the proposed `system` data (posture/occupancy fields)
 * @param {{knownAppendageIds?:string[], requiredHands?:1|2, explicitRepair?:boolean}} [options]
 * @returns {{allowed:boolean, changed:boolean, from:string, to:string, issues:object[]}} deep-frozen
 */
export function validateWeaponRecordTransition(beforeSystem, afterSystem, options) {
  const base = isPlain(options) ? { knownAppendageIds: options.knownAppendageIds, requiredHands: options.requiredHands } : options;
  const explicitRepair = isPlain(options) && options.explicitRepair === true;
  const before = validateWeaponRecord(beforeSystem, base);
  const after = validateWeaponRecord(afterSystem, base);
  const issues = [];
  const deny = (code, message, details = {}) => issues.push(issue(code, 'blocking', message, details));
  if (after.status !== WEAPON_RECORD_STATUS.VALID) deny('transition-target-not-valid', 'The proposed record is not a valid weapon record; nothing malformed or absent may be persisted.', { targetStatus: after.status, targetIssueCodes: after.issues.map((i) => i.code) });
  if (before.status === WEAPON_RECORD_STATUS.INVALID) {
    if (explicitRepair) issues.push(issue('transition-repairs-invalid-record', 'info', 'An explicit repair replaces a malformed record; the original evidence is not carried forward.', { sourceIssueCodes: before.issues.map((i) => i.code) }));
    else deny('transition-from-invalid-record', 'The current record is malformed. It is never silently replaced; an explicit repair must be requested.', { sourceIssueCodes: before.issues.map((i) => i.code) });
  } else if (before.status === WEAPON_RECORD_STATUS.ABSENT) {
    issues.push(issue('transition-initializes-absent-record', 'info', 'The weapon had no record; this write initializes it explicitly.'));
  }
  const changed = after.status === WEAPON_RECORD_STATUS.VALID && before.status === WEAPON_RECORD_STATUS.VALID
    ? before.posture !== after.posture || JSON.stringify(before.occupancy) !== JSON.stringify(after.occupancy)
    : true;
  return deepFreeze({ allowed: !issues.some((i) => i.severity === 'blocking'), changed, from: before.status, to: after.status, issues });
}

export default { validateWeaponRecord, validateWeaponRecordTransition, createDefaultWeaponRecord, WeaponRecordInputError, WEAPON_RECORD_STATUS, WEAPON_OCCUPANCY_SCHEMA_VERSION, WEAPON_OCCUPANCY_PURPOSES, DEFAULT_WEAPON_POSTURE, LEGACY_WEAPON_STATE_FIELDS };
