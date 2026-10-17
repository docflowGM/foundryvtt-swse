/**
 * Effective weapon posture resolver (E3-A5) -- PURE and READ ONLY.
 *
 * Evaluates ONE item's explicit posture declaration (E3-A4) against the physical occupancy (E3-A2) and canonical grip (E3-A3) evidence, and
 * reports declared posture, effective posture, verification, independent activation and diagnostics as separate facts. It is not a persistence
 * authority and not a second rules authority: it consumes the existing resolver outputs unchanged, reads no Foundry document, writes nothing,
 * spends no action and authorizes no attack. A declaration never becomes an effective posture by itself.
 *
 * Statuses:  established | blocked | indeterminate | contradictory | undeclared
 *   STOWED    established only when neither resolver assigns the item to any appendage; an assignment is a contradiction (evidence kept).
 *   EQUIPPED  established when the item's own occupancy assignment (hold or wield) is physically compatible. It never advances to READIED.
 *   READIED   verified only when ALL hold for this exact itemId: an occupancy assignment with purpose `wield`; that assignment physically
 *             compatible; the overall occupancy physically compatible; an E3-A3 assessment for the same item with purpose `wield`, status
 *             grip-supported and an established required-hands count equal to the assigned distinct appendages; no unresolved constraint
 *             for the item; and occupancy/grip evidence that agree with each other. The aggregate grip status is never used alone: a hold-only
 *             configuration can be `grip-supported` with `wieldAssignmentCount: 0`, which certifies nothing.
 *   A failed or unverifiable READIED declaration yields `effectivePosture: null` with the original evidence; it is never reinterpreted as
 *   EQUIPPED (that would be a separate, authorized transition). Missing/invalid declarations yield `undeclared`, never STOWED or READIED.
 * Activation is carried through untouched and never establishes, repairs or implies posture (and READIED never implies activation).
 *
 * Always-readied exceptions are claims, never trusted booleans (`alwaysReadied: true` is rejected as an unknown field):
 *   natural-weapon        established only if the effective species profile's selected complete-snapshot publication lists a natural weapon
 *                         with that exact id and `alwaysArmed: true`; the Item-to-record binding is caller-asserted (trust boundary, see
 *                         `exception.binding`). Otherwise pending. No appendage is invented and ordinary occupancy for it is a contradiction.
 *   integrated-droid-weapon  always pending: droid installation identity is uncertified (droid refactor deferred), so no readiness is granted.
 * Malformed API input throws EffectivePostureInputError.
 */
import { projectEquipmentPosture, EQUIPMENT_POSTURE, POSTURE_PROJECTION_STATUS } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-posture.js';

export const EFFECTIVE_POSTURE_STATUS = Object.freeze({ ESTABLISHED: 'established', BLOCKED: 'blocked', INDETERMINATE: 'indeterminate', CONTRADICTORY: 'contradictory', UNDECLARED: 'undeclared' });
export const ACTIVATION_STATES = Object.freeze(['activated', 'inactive', 'unknown']);

/** Codes: INVALID_INPUT, UNKNOWN_FIELD, INVALID_ITEM_ID, INVALID_OCCUPANCY, INVALID_GRIP, INVALID_ACTIVATION, INVALID_EXCEPTION_CLAIM, INVALID_SPECIES_PROFILE. */
export class EffectivePostureInputError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'EffectivePostureInputError';
    this.code = code;
  }
}

const INPUT_KEYS = ['itemId', 'declaration', 'occupancy', 'grip', 'activation', 'exception', 'speciesProfile'];
const OCC = ['physically-compatible', 'physically-blocked', 'indeterminate'];
const GRIP = ['grip-supported', 'grip-blocked', 'indeterminate'];
const S = EFFECTIVE_POSTURE_STATUS;

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });
const sameSet = (a, b) => a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function readOccupancy(o) {
  if (!isPlain(o) || !OCC.includes(o.status) || !Array.isArray(o.assignments)) throw new EffectivePostureInputError('INVALID_OCCUPANCY', 'occupancy must be a resolvePhysicalOccupancy() result');
  o.assignments.forEach((a, i) => {
    if (!isPlain(a) || !nonEmpty(a.itemId) || !['hold', 'wield'].includes(a.purpose) || !Array.isArray(a.appendageIds) || !OCC.includes(a.status)) throw new EffectivePostureInputError('INVALID_OCCUPANCY', `occupancy.assignments[${i}] is malformed`);
  });
  return o;
}

function readGrip(g) {
  if (!isPlain(g) || !GRIP.includes(g.status) || !Array.isArray(g.assessments) || !Number.isInteger(g.wieldAssignmentCount) || !OCC.includes(g.occupancyStatus)) throw new EffectivePostureInputError('INVALID_GRIP', 'grip must be a resolveEquipmentGrips() result');
  g.assessments.forEach((a, i) => {
    if (!isPlain(a) || !nonEmpty(a.itemId) || !['hold', 'wield'].includes(a.purpose) || !Array.isArray(a.appendageIds) || !GRIP.includes(a.status)) throw new EffectivePostureInputError('INVALID_GRIP', `grip.assessments[${i}] is malformed`);
  });
  return g;
}

function readActivation(a) {
  if (a === undefined || a === null) return { state: 'unknown', source: 'not-provided' };
  if (!isPlain(a) || !ACTIVATION_STATES.includes(a.state) || Object.keys(a).some((k) => k !== 'state')) throw new EffectivePostureInputError('INVALID_ACTIVATION', `activation must be { state: ${ACTIVATION_STATES.join(' | ')} }`);
  return { state: a.state, source: 'caller-evidence' };
}

function readException(e, speciesProfile) {
  if (e === undefined || e === null) return null;
  if (!isPlain(e)) throw new EffectivePostureInputError('INVALID_EXCEPTION_CLAIM', 'exception must be { claim: "natural-weapon", naturalWeaponId } or { claim: "integrated-droid-weapon" }');
  if (e.claim === 'natural-weapon') {
    if (!nonEmpty(e.naturalWeaponId) || Object.keys(e).some((k) => !['claim', 'naturalWeaponId'].includes(k))) throw new EffectivePostureInputError('INVALID_EXCEPTION_CLAIM', 'a natural-weapon claim needs exactly { claim, naturalWeaponId }');
    if (speciesProfile !== undefined && speciesProfile !== null && !isPlain(speciesProfile)) throw new EffectivePostureInputError('INVALID_SPECIES_PROFILE', 'speciesProfile must be an effective species profile object');
    return { claim: 'natural-weapon', naturalWeaponId: e.naturalWeaponId };
  }
  if (e.claim === 'integrated-droid-weapon') {
    if (Object.keys(e).some((k) => k !== 'claim')) throw new EffectivePostureInputError('INVALID_EXCEPTION_CLAIM', 'an integrated-droid-weapon claim carries no other fields');
    return { claim: 'integrated-droid-weapon' };
  }
  throw new EffectivePostureInputError('INVALID_EXCEPTION_CLAIM', 'exception.claim must be "natural-weapon" or "integrated-droid-weapon"');
}

const rank = (r) => (r.blocked ? S.BLOCKED : r.unknown ? S.INDETERMINATE : S.ESTABLISHED);

/**
 * @param {{itemId:string, declaration?:object, occupancy:object, grip:object, activation?:{state:string}, exception?:object, speciesProfile?:object}} input
 * @returns {{itemId:string, status:string, declaredPosture:string|null, declarationStatus:string, effectivePosture:string|null,
 *   verification:{physicalHolding:string, grip:string, readiness:string}, activation:{state:string, source:string, independentOfPosture:true},
 *   exception:object|null, evidence:object, issues:object[]}} deterministic, independently owned, deeply frozen
 * @throws {EffectivePostureInputError}
 */
export function resolveEffectiveEquipmentPosture(input) {
  if (!isPlain(input)) throw new EffectivePostureInputError('INVALID_INPUT', 'input must be an object');
  const unknownKeys = Object.keys(input).filter((k) => !INPUT_KEYS.includes(k));
  if (unknownKeys.length) throw new EffectivePostureInputError('UNKNOWN_FIELD', `unsupported field(s): ${unknownKeys.sort().join(', ')} (no item documents, legacy flags or alwaysReadied booleans are accepted)`);
  if (!nonEmpty(input.itemId)) throw new EffectivePostureInputError('INVALID_ITEM_ID', 'itemId must be a non-empty string');
  const occupancy = readOccupancy(input.occupancy);
  const grip = readGrip(input.grip);
  const activation = { ...readActivation(input.activation), independentOfPosture: true };
  const exception = readException(input.exception, input.speciesProfile);

  const { itemId } = input;
  const projection = projectEquipmentPosture(input.declaration);
  const declared = projection.status === POSTURE_PROJECTION_STATUS.DECLARED ? projection.posture : null;
  const assignment = occupancy.assignments.find((a) => a.itemId === itemId) ?? null;
  const assessment = grip.assessments.find((a) => a.itemId === itemId) ?? null;
  // E3-A3 re-reports E3-A2's pending constraints, so identical entries are counted once
  const itemConstraints = [...new Map([...(occupancy.pendingConstraints ?? []), ...(grip.pendingConstraints ?? [])].filter((c) => c?.itemId === itemId).map((c) => [JSON.stringify(c), c])).values()];

  const issues = projection.issues.map((i) => clone(i));
  const note = (code, severity, message, details = {}) => issues.push(issue(code, severity, message, { itemId, ...details }));
  const verification = { physicalHolding: 'unverified', grip: 'unverified', readiness: 'unverified' };
  const evidence = {
    itemId,
    occupancyAssignment: assignment ? { purpose: assignment.purpose, status: assignment.status, appendageIds: [...assignment.appendageIds] } : null,
    occupancyStatus: occupancy.status,
    gripAssessment: assessment ? { purpose: assessment.purpose, status: assessment.status, requiredHands: assessment.requiredHands ?? null, assignedAppendageCount: assessment.assignedAppendageCount ?? assessment.appendageIds.length } : null,
    gripStatus: grip.status,
    wieldAssignmentCount: grip.wieldAssignmentCount,
    pendingConstraints: clone(itemConstraints),
    speciesPermissionStatus: grip.speciesPermissions?.status ?? occupancy.speciesPermissions?.status ?? null,
  };
  const out = (status, effectivePosture, exceptionResult = null) => deepFreeze({
    itemId, status, declaredPosture: declared, declarationStatus: projection.status, effectivePosture, verification, activation, exception: exceptionResult, evidence, issues,
  });

  // ---- always-readied exception claims (never trusted booleans) ----
  if (exception) {
    if (exception.claim === 'integrated-droid-weapon') {
      note('integrated-droid-exception-unverified', 'warning', 'An integrated-droid-weapon claim cannot be certified: droid installation identity is not an established authority (droid refactor deferred). No readiness is granted.');
      note('droid-installation-provenance-required', 'info', 'Live integration must supply certified installed-component identity before this exception can be established.');
      return out(S.INDETERMINATE, null, { claim: exception.claim, established: false, binding: 'unverifiable' });
    }
    const profile = isPlain(input.speciesProfile) ? input.speciesProfile : null;
    const record = profile?.selectedVariant?.completeSnapshot === true && Array.isArray(profile.naturalWeapons)
      ? profile.naturalWeapons.find((w) => isPlain(w) && w.id === exception.naturalWeaponId) ?? null : null;
    if (!record || record.alwaysArmed !== true) {
      note('natural-weapon-exception-unverified', 'warning', 'The natural-weapon claim is not corroborated by an always-armed natural weapon of the selected complete-snapshot species publication. No readiness is granted.', { naturalWeaponId: exception.naturalWeaponId });
      return out(S.INDETERMINATE, null, { claim: exception.claim, naturalWeaponId: exception.naturalWeaponId, established: false, binding: 'unverified' });
    }
    if (declared && declared !== EQUIPMENT_POSTURE.READIED) note('declaration-superseded-by-natural-weapon-exception', 'info', 'The established natural-weapon exception is always readied; the declared posture was not used.', { declared });
    if (assignment || assessment) {
      note('natural-weapon-has-ordinary-assignment', 'blocking', 'A natural weapon uses no ordinary appendage assignment; the supplied occupancy/grip evidence contradicts the exception and is retained.');
      return out(S.CONTRADICTORY, null, { claim: exception.claim, naturalWeaponId: exception.naturalWeaponId, established: true, binding: 'caller-asserted' });
    }
    note('natural-weapon-item-binding-caller-asserted', 'info', 'The species record is source-certified; that this Item is that natural weapon is asserted by the caller and must be enforced by the live integration.', { naturalWeaponId: exception.naturalWeaponId });
    verification.physicalHolding = 'not-applicable'; verification.grip = 'not-applicable'; verification.readiness = 'verified';
    return out(S.ESTABLISHED, EQUIPMENT_POSTURE.READIED, { claim: exception.claim, naturalWeaponId: exception.naturalWeaponId, established: true, binding: 'caller-asserted' });
  }

  if (!declared) {
    note('no-effective-posture-without-declaration', 'warning', 'No valid posture declaration exists; no posture (and no readiness) is inferred from physical or grip evidence or from activation.');
    return out(S.UNDECLARED, null);
  }

  // ---- STOWED ----
  if (declared === EQUIPMENT_POSTURE.STOWED) {
    if (assignment || assessment) {
      note('stowed-contradicts-occupancy', 'blocking', 'STOWED is declared but occupancy or grip evidence assigns this item to appendages; the evidence is kept and nothing is discarded.');
      verification.physicalHolding = 'contradicted';
      return out(S.CONTRADICTORY, null);
    }
    verification.physicalHolding = 'none-assigned';
    return out(S.ESTABLISHED, EQUIPMENT_POSTURE.STOWED);
  }

  // ---- shared physical checks ----
  const flags = { blocked: false, unknown: false };
  const block = (code, msg, details) => { flags.blocked = true; note(code, 'blocking', msg, details); };
  const unsure = (code, msg, details) => { flags.unknown = true; note(code, 'warning', msg, details); };
  const physical = () => {
    if (!assignment) { unsure('no-physical-holding-evidence', 'The occupancy result has no assignment for this item.'); return false; }
    if (assignment.status === 'physically-blocked') { block('item-occupancy-blocked', 'This item\'s proposed appendages are physically blocked.'); verification.physicalHolding = 'blocked'; return false; }
    if (assignment.status === 'indeterminate') { unsure('item-occupancy-indeterminate', 'This item\'s proposed appendages are not established as physically sufficient.'); return false; }
    if (itemConstraints.length) { unsure('unresolved-constraint', 'A typed appendage constraint for this item is still unevaluated.', { constraintTypes: [...new Set(itemConstraints.map((c) => c.constraint?.type ?? null))].sort() }); }
    verification.physicalHolding = 'verified';
    return true;
  };

  // ---- EQUIPPED ----
  if (declared === EQUIPMENT_POSTURE.EQUIPPED) {
    physical();
    if (assessment) verification.grip = assessment.status === 'grip-supported' ? 'verified' : assessment.status === 'grip-blocked' ? 'blocked' : 'unverified';
    if (occupancy.status !== 'physically-compatible') note('overall-occupancy-not-compatible', 'info', `The overall occupancy is ${occupancy.status}; EQUIPPED is judged on this item's own assignment.`, { occupancyStatus: occupancy.status });
    const status = rank(flags);
    return out(status, status === S.ESTABLISHED ? EQUIPMENT_POSTURE.EQUIPPED : null);
  }

  // ---- READIED ----
  note('readied-declared-requires-verification', 'info', 'READIED is a declaration; readiness is verified below against this item\'s own occupancy and grip evidence.');
  if (physical() && assignment.purpose !== 'wield') unsure('readied-requires-wield-assignment', 'READIED needs a wield assignment; this item\'s assignment is hold-only. The aggregate grip status does not certify a hold-only configuration.', { purpose: assignment.purpose });
  if (assignment && assignment.status === 'physically-compatible' && occupancy.status === 'physically-blocked') block('overall-occupancy-blocked', 'Other occupancy in the configuration is physically blocked.', { occupancyStatus: occupancy.status });
  else if (assignment && assignment.status === 'physically-compatible' && occupancy.status !== 'physically-compatible') unsure('overall-occupancy-unresolved', 'The overall occupancy configuration has unresolved incompatibilities.', { occupancyStatus: occupancy.status });

  if (!assessment) unsure('no-grip-assessment-for-item', 'The grip result has no assessment for this exact item (an aggregate result or another item\'s verdict cannot certify it).', { gripStatus: grip.status, wieldAssignmentCount: grip.wieldAssignmentCount });
  else {
    if (assessment.purpose !== 'wield') unsure('grip-assessment-not-wield', 'The grip assessment for this item is not a wield assessment.', { purpose: assessment.purpose });
    if (assessment.status === 'grip-blocked') { block('item-grip-blocked', 'The canonical grip verdict for this item is blocked; the original assessment is retained.'); verification.grip = 'blocked'; }
    else if (assessment.status === 'indeterminate') unsure('item-grip-indeterminate', 'The canonical grip verdict for this item is unresolved.');
    else if (![1, 2].includes(assessment.requiredHands) || !['one-handed', 'two-handed'].includes(assessment.grip)) unsure('grip-requirement-not-established', 'The canonical grip requirement for this item is not established.');
    else if (assessment.requiredHands !== assessment.appendageIds.length || (assessment.assignedAppendageCount ?? assessment.appendageIds.length) !== assessment.requiredHands) block('appendage-count-mismatch', 'The assigned appendage count does not equal the established required hands.', { requiredHands: assessment.requiredHands, assigned: assessment.appendageIds.length });
    else verification.grip = 'verified';
  }
  if (assignment && assessment && (assessment.purpose !== assignment.purpose || !sameSet(assessment.appendageIds, assignment.appendageIds) || grip.occupancyStatus !== occupancy.status)) {
    unsure('occupancy-grip-evidence-mismatch', 'The grip assessment does not agree with the occupancy assignment for this item (different purpose, appendages or occupancy status); the two results were not produced from the same configuration.');
    verification.grip = verification.grip === 'blocked' ? 'blocked' : 'unverified';
  }

  const status = rank(flags);
  if (status === S.ESTABLISHED) {
    verification.readiness = 'verified';
    return out(S.ESTABLISHED, EQUIPMENT_POSTURE.READIED);
  }
  if (status === S.BLOCKED) verification.readiness = 'blocked';
  return out(status, null);
}

export default { resolveEffectiveEquipmentPosture, EffectivePostureInputError, EFFECTIVE_POSTURE_STATUS, ACTIVATION_STATES };
