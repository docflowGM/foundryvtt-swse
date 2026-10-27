/**
 * Equipment posture vocabulary (E3-A4) -- PURE and READ ONLY.
 *
 * The clean-break equipment model has exactly three weapon postures:
 *   STOWED    not physically held for ordinary operation (occupies no ordinary manipulator)
 *   EQUIPPED  physically held, not necessarily ready for combat
 *   READIED   in an established, legal operating configuration (physical occupancy and grip verified by the E3-A2 / E3-A3 resolvers)
 * Activation (a lit blade, an energized shield) is a separate fact and is never read here.
 *
 * This module only validates and projects an EXPLICIT posture declaration, `{ posture: 'STOWED'|'EQUIPPED'|'READIED' }`. It is not a persistence
 * authority and not a second source of truth: it does not choose where posture is stored, reads no Actor or Item document, and writes nothing. It
 * never derives posture from legacy fields -- `equipped`, `isEquipped`, `readied`, `active`, `activated`, `equippable.*`, `flags.swse.equipped`,
 * `equipStatus`, `status`, `state` -- even when they are present on the declaration; such keys are reported as ignored. Absent or malformed
 * declarations yield no posture: they can never become READIED (or anything else).
 *
 * A DECLARED posture is not a VERIFIED one. The result always reports that physical occupancy, grip legality and readiness are unverified here
 * (`verification`); they are established only by the occupancy / grip resolvers. The result carries no attack, action-cost or combat data.
 */

export const EQUIPMENT_POSTURE = Object.freeze({ STOWED: 'STOWED', EQUIPPED: 'EQUIPPED', READIED: 'READIED' });
export const EQUIPMENT_POSTURES = Object.freeze(Object.values(EQUIPMENT_POSTURE));
export const POSTURE_PROJECTION_STATUS = Object.freeze({ DECLARED: 'declared', ABSENT: 'absent', INVALID: 'invalid' });

/** Legacy / alias keys that must never establish posture. Reported (ignored) when found on a declaration. */
export const IGNORED_LEGACY_POSTURE_KEYS = Object.freeze([
  'equipped', 'isEquipped', 'readied', 'active', 'activated', 'equippable', 'equipStatus', 'status', 'state', 'drawn', 'carried', 'wielded',
]);

/** Postures that, BY DECLARATION ONLY, mean the weapon is physically held (not a verified occupancy). */
const DECLARES_PHYSICAL_HOLD = Object.freeze({ STOWED: false, EQUIPPED: true, READIED: true });

export const isEquipmentPosture = (value) => typeof value === 'string' && Object.prototype.hasOwnProperty.call(EQUIPMENT_POSTURE, value) && EQUIPMENT_POSTURE[value] === value;

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });
const NOT_VERIFIED = Object.freeze({ physicalOccupancy: 'unverified', gripLegality: 'unverified', readiness: 'unverified' });

/**
 * @param {{posture?:string}} declaration an explicit posture declaration; any other keys are never read as posture
 * @returns {{status:'declared'|'absent'|'invalid', posture:'STOWED'|'EQUIPPED'|'READIED'|null, declaredPhysicalHold:boolean|null,
 *   verification:{physicalOccupancy:'unverified', gripLegality:'unverified', readiness:'unverified'}, issues:object[]}}
 *   deterministic, independently owned and deeply frozen
 */
export function projectEquipmentPosture(declaration) {
  const issues = [];
  const base = { posture: null, declaredPhysicalHold: null, verification: { ...NOT_VERIFIED } };
  const finish = (status, extra = {}) => deepFreeze({ status, ...base, ...extra, issues });

  if (declaration === undefined || declaration === null) {
    issues.push(issue('posture-not-declared', 'warning', 'No posture declaration was provided; no posture is assumed.'));
    return finish(POSTURE_PROJECTION_STATUS.ABSENT);
  }
  if (typeof declaration !== 'object' || Array.isArray(declaration)) {
    issues.push(issue('posture-declaration-malformed', 'blocking', 'A posture declaration must be an object { posture }.', { receivedType: Array.isArray(declaration) ? 'array' : typeof declaration }));
    return finish(POSTURE_PROJECTION_STATUS.INVALID);
  }
  const ignored = IGNORED_LEGACY_POSTURE_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(declaration, k));
  if (ignored.length) issues.push(issue('legacy-posture-fields-ignored', 'info', 'Legacy equipment and activation fields never establish posture and were ignored.', { fields: [...ignored].sort() }));

  if (!Object.prototype.hasOwnProperty.call(declaration, 'posture') || declaration.posture === undefined) {
    issues.push(issue('posture-not-declared', 'warning', 'The declaration carries no posture; no posture is assumed.'));
    return finish(POSTURE_PROJECTION_STATUS.ABSENT);
  }
  if (!isEquipmentPosture(declaration.posture)) {
    issues.push(issue('posture-invalid', 'blocking', `"${String(declaration.posture)}" is not one of ${EQUIPMENT_POSTURES.join(', ')}; posture values are exact and case-sensitive.`, { received: typeof declaration.posture === 'string' ? declaration.posture : typeof declaration.posture }));
    return finish(POSTURE_PROJECTION_STATUS.INVALID);
  }
  if (declaration.posture === EQUIPMENT_POSTURE.READIED) {
    issues.push(issue('readied-is-declared-not-verified', 'info', 'READIED is a declaration; occupancy, grip legality and readiness are verified only by the occupancy and grip resolvers.', {}));
  }
  return finish(POSTURE_PROJECTION_STATUS.DECLARED, { posture: declaration.posture, declaredPhysicalHold: DECLARES_PHYSICAL_HOLD[declaration.posture] });
}

export default { projectEquipmentPosture, isEquipmentPosture, EQUIPMENT_POSTURE, EQUIPMENT_POSTURES, POSTURE_PROJECTION_STATUS, IGNORED_LEGACY_POSTURE_KEYS };
