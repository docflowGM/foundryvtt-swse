/**
 * Equipment grip resolver -- WEAPON GRIP INTEGRATION (E3-A3). PURE and READ ONLY.
 *
 * Combines three existing, separate authorities for HYPOTHETICAL wield assignments and invents no rule of its own:
 *   1. physical occupancy         resolvePhysicalOccupancy() (E3-A2): which appendages are proposed, whether they can physically do it
 *   2. canonical weapon runtime   resolveEffectiveWieldingSize() + resolveWielding(): the size classification, the hands the weapon
 *                                 requires and the hands actually chosen (source precedence: explicit option > owned state >
 *                                 mandatory two-handed > effective-size requirement). No second size table, no second grip rule.
 *   3. species permission         resolveSpeciesEquipmentPermissions() (E3-A1): a source-specific entitlement, used only to
 *                                 certify simultaneous two-handed weapons.
 * It reads no Actor/Item document and changes nothing. `grip-supported` is NOT readiness: nothing is drawn, readied, activated or
 * authorized to attack, no action is spent and no posture is written. Holding stays physical-holding evidence only.
 *
 * Input: { occupancy, wielderSize, speciesPermissions?, weapons:[{ itemId, shape, ownedState?, gripOption?, beneficialSizeChoice?,
 *   tripodMounted? }] }. `shape` is a weapon-runtime attack shape (size, sizeRules, wielding, worn). Weapons are matched to
 *   occupancy assignments by itemId only. A caller-supplied `requiredHands` is rejected: the requirement comes from the authorities.
 *
 * Statuses: grip-blocked (established prohibition or contradiction) > indeterminate (unresolved evidence) > grip-supported.
 * Established prohibitions stay distinct from unknowns: e.g. resolveWielding()'s `grip-requires-tripod-confirmation` is an UNKNOWN here
 * (indeterminate, original reason kept), while `requires-two-hands`, `cannot-wield-two-handed`, `too-large-to-wield` are blocks.
 * Two traps in the authorities are handled explicitly: a size verdict can be non-false while its classification is unknown, and
 * resolveWielding() can be legal:true with hands undefined -- neither is a verified grip.
 *
 * Mounted/worn/integrated configurations (shape.worn, ownedState.mountedHostId) are governed elsewhere and stay indeterminate; no
 * zero-hand operation is granted. Malformed API input throws GripInputError.
 */
import { resolveEffectiveWieldingSize, sizeStateOf, sizeIndexOf } from '/systems/foundryvtt-swse/scripts/items/weapon-runtime/wielding-size.js';
import { resolveWielding } from '/systems/foundryvtt-swse/scripts/items/weapon-runtime/owned-state.js';

export const GRIP_STATUS = Object.freeze({ SUPPORTED: 'grip-supported', BLOCKED: 'grip-blocked', INDETERMINATE: 'indeterminate' });

/**
 * Codes: INVALID_INPUT, INVALID_OCCUPANCY, INVALID_SPECIES_PERMISSIONS, INVALID_WEAPONS, INVALID_WEAPON_FACT, FORBIDDEN_OVERRIDE,
 * INVALID_ITEM_ID, DUPLICATE_WEAPON_FACT, WEAPON_FACT_WITHOUT_ASSIGNMENT, INVALID_SHAPE, INVALID_GRIP_OPTION, INVALID_OWNED_STATE.
 */
export class GripInputError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'GripInputError';
    this.code = code;
  }
}

const OCC_STATUSES = ['physically-compatible', 'physically-blocked', 'indeterminate'];
const PERMISSION_STATUSES = ['verified-permission-present', 'no-matching-entitlement', 'recognized-incomplete-evidence'];
const FACT_KEYS = ['itemId', 'shape', 'ownedState', 'gripOption', 'beneficialSizeChoice', 'tripodMounted'];
const BLOCKING_WIELD_REASONS = ['too-large-to-wield', 'below-minimum-wielder-size', 'requires-two-hands', 'cannot-wield-two-handed'];
const TWO_HANDED_PERMISSION_ID = 'codru-ji-extra-arms';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function readOccupancy(occ) {
  if (!isPlainObject(occ) || !OCC_STATUSES.includes(occ.status) || !Array.isArray(occ.assignments)) {
    throw new GripInputError('INVALID_OCCUPANCY', 'occupancy must be a resolvePhysicalOccupancy() result');
  }
  const byItem = new Map();
  occ.assignments.forEach((a, i) => {
    if (!isPlainObject(a) || !nonEmpty(a.itemId) || !['hold', 'wield'].includes(a.purpose) || !Array.isArray(a.appendageIds) || !OCC_STATUSES.includes(a.status)) {
      throw new GripInputError('INVALID_OCCUPANCY', `occupancy.assignments[${i}] is malformed`);
    }
    byItem.set(a.itemId, a);
  });
  return byItem;
}

function readPermissions(p) {
  if (p === undefined || p === null) return null;
  if (!isPlainObject(p) || !PERMISSION_STATUSES.includes(p.status) || !Array.isArray(p.permissions)) {
    throw new GripInputError('INVALID_SPECIES_PERMISSIONS', 'speciesPermissions must be a resolveSpeciesEquipmentPermissions() result or omitted');
  }
  return p;
}

function readWeapons(weapons, assignments) {
  if (!Array.isArray(weapons)) throw new GripInputError('INVALID_WEAPONS', 'weapons must be an array');
  const seen = new Set();
  return weapons.map((raw, i) => {
    const where = `weapons[${i}]`;
    if (!isPlainObject(raw)) throw new GripInputError('INVALID_WEAPON_FACT', `${where} must be an object`);
    if ('requiredHands' in raw || (isPlainObject(raw.shape) && 'requiredHands' in raw.shape)) throw new GripInputError('FORBIDDEN_OVERRIDE', `${where}: requiredHands cannot be supplied; it comes from the canonical size and wielding authorities`);
    const extra = Object.keys(raw).filter((k) => !FACT_KEYS.includes(k));
    if (extra.length) throw new GripInputError('INVALID_WEAPON_FACT', `${where} has unsupported field(s): ${extra.sort().join(', ')}`);
    if (!nonEmpty(raw.itemId)) throw new GripInputError('INVALID_ITEM_ID', `${where}.itemId must be a non-empty string`);
    if (seen.has(raw.itemId)) throw new GripInputError('DUPLICATE_WEAPON_FACT', `item "${raw.itemId}" has more than one weapon fact`);
    seen.add(raw.itemId);
    if (!assignments.has(raw.itemId)) throw new GripInputError('WEAPON_FACT_WITHOUT_ASSIGNMENT', `item "${raw.itemId}" has no assignment in the occupancy result`);
    if (!isPlainObject(raw.shape) || !isPlainObject(raw.shape.wielding)) throw new GripInputError('INVALID_SHAPE', `${where}.shape must be a weapon-runtime attack shape with a wielding block`);
    if (![undefined, null, 1, 2, '1', '2', 'one-handed', 'two-handed'].includes(raw.gripOption)) throw new GripInputError('INVALID_GRIP_OPTION', `${where}.gripOption must be 1, 2, 'one-handed' or 'two-handed'`);
    if (raw.ownedState !== undefined && raw.ownedState !== null && !isPlainObject(raw.ownedState)) throw new GripInputError('INVALID_OWNED_STATE', `${where}.ownedState must be an object`);
    if (raw.tripodMounted !== undefined && typeof raw.tripodMounted !== 'boolean') throw new GripInputError('INVALID_OWNED_STATE', `${where}.tripodMounted must be a boolean or omitted`);
    if (raw.beneficialSizeChoice !== undefined && raw.beneficialSizeChoice !== null && typeof raw.beneficialSizeChoice !== 'string') throw new GripInputError('INVALID_OWNED_STATE', `${where}.beneficialSizeChoice must be a string or omitted`);
    return raw;
  });
}

/** Canonical verdict for one wield assignment: { status, requiredHands, sizing, wielding, issues } (no physical judgement). */
function assessCanonicalGrip(fact, wielderSize) {
  const issues = [];
  const { shape } = fact;
  const owned = fact.ownedState ?? null;
  const state = sizeStateOf(owned, { mounted: fact.tripodMounted, beneficialSizeChoice: fact.beneficialSizeChoice ?? null });
  const sizing = resolveEffectiveWieldingSize(shape, wielderSize, { tripodMounted: state.mounted, beneficialSizeChoice: state.treatAs });
  const option = fact.gripOption === null ? undefined : fact.gripOption;
  const wielding = resolveWielding(shape.wielding, { option, state: owned ?? undefined, sizing });
  const out = (status, requiredHands = null) => ({ status, requiredHands, sizing, wielding, issues });
  const unknown = (code, msg, details = {}) => issues.push(issue(code, 'warning', msg, details));
  const block = (code, msg, details = {}) => issues.push(issue(code, 'blocking', msg, details));

  // mounted / worn / integrated configurations are governed by other authorities and are never zero-hand here
  if (shape.worn || shape.dualWield?.wornNotHeld === true) unknown('worn-weapon-configuration-uncertified', 'Worn weapons have separate, uncertified hand semantics; no zero-hand operation is granted.', {});
  if (nonEmpty(owned?.mountedHostId)) unknown('host-mount-configuration-uncertified', 'A host-mounted configuration requires host evidence that is not certified here.', { mountedHostId: owned.mountedHostId });
  const configUnknown = issues.length > 0;

  if (wielding.legal === false) {
    if (wielding.reason === 'grip-requires-tripod-confirmation') unknown('grip-requires-tripod-confirmation', 'The chosen one-handed grip is only legal if the weapon is on a tripod, and that state is not established.', { reason: wielding.reason });
    else if (BLOCKING_WIELD_REASONS.includes(wielding.reason)) block(wielding.reason, `The canonical weapon authorities refuse this grip: ${wielding.reason}.`, { reason: wielding.reason });
    else unknown('wielding-refusal-unclassified', `The wielding resolver refused with an unrecognised reason "${wielding.reason}".`, { reason: wielding.reason });
    return out(issues.some((i) => i.severity === 'blocking') ? GRIP_STATUS.BLOCKED : GRIP_STATUS.INDETERMINATE);
  }
  // legal !== false does not mean the evidence is complete
  if (sizeIndexOf(wielderSize) < 0) unknown('wielder-size-unknown', 'The wielder size is missing or invalid; no size classification is possible.', { wielderSize: wielderSize ?? null });
  else if (sizeIndexOf(shape.size) < 0) unknown('weapon-size-unknown', 'The canonical weapon size is missing or invalid.', { weaponSize: shape.size ?? null });
  else if (sizing.pending === 'tripod') unknown('tripod-state-unestablished', 'Whether the weapon is on a tripod is not established and it changes the required grip.', { outcomes: sizing.outcomes ?? null });
  else if (sizing.classification === null) unknown('size-classification-unknown', 'No size classification could be established.', {});
  if (issues.length) return out(GRIP_STATUS.INDETERMINATE);
  if (wielding.hands === undefined) { unknown('grip-unestablished', 'No grip is established: nothing chose one and no authority requires one. An unanswered grip is not a one-handed choice.', {}); return out(GRIP_STATUS.INDETERMINATE); }
  if (configUnknown) return out(GRIP_STATUS.INDETERMINATE);
  return out(GRIP_STATUS.SUPPORTED, wielding.hands);
}

/**
 * @param {{occupancy:object, wielderSize?:string|null, speciesPermissions?:object|null, weapons:object[]}} input
 * @returns {{status:string, occupancyStatus:string, wieldAssignmentCount:number, assessments:object[], simultaneousTwoHanded:object, conflicts:object[],
 *   pendingConstraints:object[], issues:object[], speciesPermissions:object|null}} deterministic, independently owned, deeply frozen
 * @throws {GripInputError}
 */
export function resolveEquipmentGrips(input) {
  if (!isPlainObject(input)) throw new GripInputError('INVALID_INPUT', 'input must be { occupancy, wielderSize, speciesPermissions, weapons }');
  const assignments = readOccupancy(input.occupancy);
  const permissions = readPermissions(input.speciesPermissions);
  const facts = new Map(readWeapons(input.weapons, assignments).map((f) => [f.itemId, f]));
  const wielderSize = typeof input.wielderSize === 'string' ? input.wielderSize : null;

  const assessments = input.occupancy.assignments.map((a) => {
    const base = { itemId: a.itemId, purpose: a.purpose, appendageIds: [...a.appendageIds], assignedAppendageCount: a.appendageIds.length, occupancyStatus: a.status };
    const fact = facts.get(a.itemId);
    const weaponIdentityKey = nonEmpty(fact?.shape?.identityKey) ? fact.shape.identityKey : null;
    const physicalIssues = [];
    if (a.status === 'physically-blocked') physicalIssues.push(issue('physical-occupancy-blocked', 'blocking', 'The proposed appendages are physically blocked.', { itemId: a.itemId }));
    else if (a.status === 'indeterminate') physicalIssues.push(issue('physical-occupancy-indeterminate', 'warning', 'The proposed appendages are not established as physically sufficient.', { itemId: a.itemId }));
    if (a.purpose === 'hold') {
      return { ...base, weaponIdentityKey, requiredHands: null, grip: 'not-assessed-hold-only', status: a.status === 'physically-blocked' ? GRIP_STATUS.BLOCKED : a.status === 'indeterminate' ? GRIP_STATUS.INDETERMINATE : GRIP_STATUS.SUPPORTED, canonicalSize: null, canonicalWielding: null, issues: physicalIssues };
    }
    if (!fact) {
      return { ...base, weaponIdentityKey, requiredHands: null, grip: 'weapon-facts-missing', status: a.status === 'physically-blocked' ? GRIP_STATUS.BLOCKED : GRIP_STATUS.INDETERMINATE, canonicalSize: null, canonicalWielding: null, issues: [...physicalIssues, issue('weapon-facts-missing', 'warning', 'No canonical weapon facts were supplied for this wield assignment; no grip is certified.', { itemId: a.itemId })] };
    }
    const canon = assessCanonicalGrip(fact, wielderSize);
    const issues = [...canon.issues, ...physicalIssues];
    let status = canon.status;
    if (canon.requiredHands !== null) {
      if (a.appendageIds.length < canon.requiredHands) { status = GRIP_STATUS.BLOCKED; issues.push(issue('insufficient-appendages-for-grip', 'blocking', `The established grip needs ${canon.requiredHands} appendage(s); ${a.appendageIds.length} assigned.`, { itemId: a.itemId, requiredHands: canon.requiredHands, assigned: a.appendageIds.length })); }
      else if (a.appendageIds.length > canon.requiredHands) { status = GRIP_STATUS.BLOCKED; issues.push(issue('excess-appendages-for-grip', 'blocking', `The established grip uses ${canon.requiredHands} appendage(s); ${a.appendageIds.length} were assigned, so the assignment does not match the grip.`, { itemId: a.itemId, requiredHands: canon.requiredHands, assigned: a.appendageIds.length })); }
    }
    if (a.status === 'physically-blocked') status = GRIP_STATUS.BLOCKED;
    else if (a.status === 'indeterminate' && status === GRIP_STATUS.SUPPORTED) status = GRIP_STATUS.INDETERMINATE;
    return {
      ...base, weaponIdentityKey, requiredHands: canon.requiredHands, grip: canon.wielding.hands === undefined ? null : canon.wielding.hands === 2 ? 'two-handed' : 'one-handed',
      status, canonicalSize: clone(canon.sizing), canonicalWielding: clone(canon.wielding), issues,
    };
  });

  // simultaneous two-handed weapons need an exact, verified source-specific entitlement; neither a universal grant nor a ban is invented
  const issues = [];
  const twoHanded = assessments.filter((a) => a.purpose === 'wield' && a.requiredHands === 2 && a.status === GRIP_STATUS.SUPPORTED);
  const entitlement = permissions?.status === 'verified-permission-present' ? permissions.permissions.find((p) => p?.id === TWO_HANDED_PERMISSION_ID && Number.isInteger(p.maxSimultaneousTwoHandedWeapons)) ?? null : null;
  const simultaneous = { count: twoHanded.length, permissionId: null, verified: false };
  if (twoHanded.length >= 2) {
    let code = null; let msg = '';
    if (entitlement && twoHanded.length <= entitlement.maxSimultaneousTwoHandedWeapons) { simultaneous.permissionId = entitlement.id; simultaneous.verified = true; }
    else if (entitlement) { code = 'simultaneous-two-handed-count-exceeds-verified-permission'; msg = `${twoHanded.length} two-handed weapons exceed the verified source permission (${entitlement.maxSimultaneousTwoHandedWeapons}).`; }
    else if (permissions?.status === 'recognized-incomplete-evidence') { code = 'special-permission-evidence-incomplete'; msg = 'A recognized species entitlement has incomplete or contradictory evidence; it cannot certify simultaneous two-handed weapons.'; }
    else { code = 'simultaneous-two-handed-weapons-unestablished'; msg = 'No verified source-specific permission covers wielding several two-handed weapons at once; this is neither granted nor prohibited here.'; }
    if (code) {
      issues.push(issue(code, 'warning', msg, { itemIds: twoHanded.map((a) => a.itemId) }));
      for (const a of twoHanded) { a.status = GRIP_STATUS.INDETERMINATE; a.issues.push(issue(code, 'warning', msg, { itemIds: twoHanded.map((x) => x.itemId) })); }
    }
  }

  const occ = input.occupancy;
  if (occ.status !== 'physically-compatible') issues.push(issue('occupancy-not-compatible', occ.status === 'physically-blocked' ? 'blocking' : 'warning', `The underlying physical occupancy is ${occ.status}.`, { occupancyStatus: occ.status }));
  let status;
  if (assessments.some((a) => a.status === GRIP_STATUS.BLOCKED) || occ.status === 'physically-blocked') status = GRIP_STATUS.BLOCKED;
  else if (assessments.some((a) => a.status === GRIP_STATUS.INDETERMINATE) || occ.status !== 'physically-compatible') status = GRIP_STATUS.INDETERMINATE;
  else status = GRIP_STATUS.SUPPORTED;

  return deepFreeze({
    status,
    occupancyStatus: occ.status,
    wieldAssignmentCount: assessments.filter((a) => a.purpose === 'wield').length,
    assessments,
    simultaneousTwoHanded: simultaneous,
    conflicts: clone(occ.conflicts ?? []),
    pendingConstraints: clone(occ.pendingConstraints ?? []),
    issues,
    speciesPermissions: permissions ? { status: permissions.status, supporting: permissions.permissions.map((p) => ({ id: p?.id ?? null, provenance: clone(p?.provenance ?? null) })) } : null,
  });
}

export default { resolveEquipmentGrips, GripInputError, GRIP_STATUS };
