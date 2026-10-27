/**
 * Equipment capability resolver -- PHYSICAL OCCUPANCY (E3-A2). PURE and READ ONLY.
 *
 * Decides whether explicit, HYPOTHETICAL item-to-appendage assignments are physically supported by an effective-anatomy result
 * (resolveEffectiveAnatomy) and reports the E3-A1 species-permission result alongside. It does NOT decide weapon grip legality
 * (one- vs two-handed requirements stay with resolveWielding()/resolveEffectiveWieldingSize(), E3-A3), readiness, attack
 * eligibility, action cost or encumbrance. It stores nothing, reads no Item/Actor document and never selects, drops, stows or moves
 * anything: appendages are only the ones the caller names, and only ones the anatomy actually contains.
 *
 * Assignment: { itemId:string, purpose:'hold'|'wield', appendageIds:string[] }  (proposed occupancy, not proof of legality).
 *
 * Physical rules per named appendage
 *   - must exist in the anatomy (unknown id: blocked when the anatomy topology is established, otherwise indeterminate)
 *   - functionalState disabled|missing -> blocked; unresolved -> indeterminate
 *   - needs a confirmed physical slot (identity.slot); a null slot -> indeterminate
 *   - hold needs canHold; wield needs canHold AND canWield: false -> blocked, null -> indeterminate (null is never permission);
 *     canManipulate is reported but is not required, so a known holding fact survives unknown manipulation
 *   - one physical appendage/slot serves one item: a second item claiming it is a conflict (blocked); nothing is displaced
 *   - typed appendage constraints touching the assignment (e.g. held-item-load-floor) are carried forward as `unevaluated`; they make
 *     the assignment indeterminate and are never compared, calculated or turned into a prohibition here
 *
 * Overall `status` (physical only): physically-blocked (an established incompatibility, regardless of unrelated unknowns) >
 * indeterminate (incomplete evidence, an unevaluated constraint, an anatomy that is not `resolved`, or recognized-but-incomplete
 * species-permission evidence) > physically-compatible. The special-entitlement projection is reported as supporting evidence and is
 * never required for, nor a prohibition of, ordinary single-appendage occupancy.
 *
 * Malformed API input throws EquipmentOccupancyInputError (documented codes below); incomplete-but-valid evidence never throws.
 */

export const OCCUPANCY_STATUS = Object.freeze({ COMPATIBLE: 'physically-compatible', BLOCKED: 'physically-blocked', INDETERMINATE: 'indeterminate' });
export const OCCUPANCY_PURPOSES = Object.freeze(['hold', 'wield']);

/**
 * Codes: INVALID_INPUT, INVALID_ANATOMY, INVALID_SPECIES_PERMISSIONS, INVALID_ASSIGNMENTS, INVALID_ASSIGNMENT, INVALID_ITEM_ID,
 * INVALID_PURPOSE, INVALID_APPENDAGE_IDS, DUPLICATE_APPENDAGE_IN_ASSIGNMENT, DUPLICATE_ITEM_ASSIGNMENT.
 */
export class EquipmentOccupancyInputError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'EquipmentOccupancyInputError';
    this.code = code;
  }
}

const ANATOMY_STATUSES = ['resolved', 'partial', 'unresolved'];
const FUNCTIONAL = ['functional', 'disabled', 'missing', 'unresolved'];
const PERMISSION_STATUSES = ['verified-permission-present', 'no-matching-entitlement', 'recognized-incomplete-evidence'];
const CAPS = ['canHold', 'canWield', 'canManipulate'];
const ASSIGNMENT_KEYS = ['itemId', 'purpose', 'appendageIds'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });
const clone = (v) => JSON.parse(JSON.stringify(v));

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function readAnatomy(anatomy) {
  if (!isPlainObject(anatomy) || !ANATOMY_STATUSES.includes(anatomy.status) || !Array.isArray(anatomy.appendages)) {
    throw new EquipmentOccupancyInputError('INVALID_ANATOMY', 'anatomy must be a resolveEffectiveAnatomy() result ({ status, appendages: [] })');
  }
  const byId = new Map();
  anatomy.appendages.forEach((a, i) => {
    const where = `anatomy.appendages[${i}]`;
    if (!isPlainObject(a) || !nonEmpty(a.id) || !isPlainObject(a.capabilities) || !FUNCTIONAL.includes(a.functionalState)) {
      throw new EquipmentOccupancyInputError('INVALID_ANATOMY', `${where} must have id, capabilities and a valid functionalState`);
    }
    if (a.identity !== undefined && !isPlainObject(a.identity)) throw new EquipmentOccupancyInputError('INVALID_ANATOMY', `${where}.identity must be an object`);
    for (const c of CAPS) if (![true, false, null, undefined].includes(a.capabilities[c])) throw new EquipmentOccupancyInputError('INVALID_ANATOMY', `${where}.capabilities.${c} must be true, false or null`);
    if (a.constraints !== undefined && !Array.isArray(a.constraints)) throw new EquipmentOccupancyInputError('INVALID_ANATOMY', `${where}.constraints must be an array`);
    if (byId.has(a.id)) throw new EquipmentOccupancyInputError('INVALID_ANATOMY', `duplicate appendage id "${a.id}"`);
    byId.set(a.id, a);
  });
  // an appendage list is only trustworthy as "complete" when the biological topology says so, or (droid) when the anatomy resolved
  const topologyEstablished = anatomy.topologyStatus === 'complete' || (anatomy.topologyStatus === undefined && anatomy.status === 'resolved');
  return { status: anatomy.status, byId, topologyEstablished };
}

function readPermissions(permissions) {
  if (permissions === undefined || permissions === null) return null;
  if (!isPlainObject(permissions) || !PERMISSION_STATUSES.includes(permissions.status) || !Array.isArray(permissions.permissions)) {
    throw new EquipmentOccupancyInputError('INVALID_SPECIES_PERMISSIONS', 'speciesPermissions must be a resolveSpeciesEquipmentPermissions() result or omitted');
  }
  return { status: permissions.status, supporting: permissions.permissions.map((p) => ({ id: p?.id ?? null, provenance: clone(p?.provenance ?? null) })) };
}

function readAssignments(assignments) {
  if (!Array.isArray(assignments)) throw new EquipmentOccupancyInputError('INVALID_ASSIGNMENTS', 'assignments must be an array');
  const seenItems = new Set();
  return assignments.map((raw, i) => {
    const where = `assignments[${i}]`;
    if (!isPlainObject(raw)) throw new EquipmentOccupancyInputError('INVALID_ASSIGNMENT', `${where} must be an object`);
    const extra = Object.keys(raw).filter((k) => !ASSIGNMENT_KEYS.includes(k));
    if (extra.length) throw new EquipmentOccupancyInputError('INVALID_ASSIGNMENT', `${where} has unsupported field(s): ${extra.sort().join(', ')} (grip requirements are not accepted from callers)`);
    if (!nonEmpty(raw.itemId)) throw new EquipmentOccupancyInputError('INVALID_ITEM_ID', `${where}.itemId must be a non-empty string`);
    if (!OCCUPANCY_PURPOSES.includes(raw.purpose)) throw new EquipmentOccupancyInputError('INVALID_PURPOSE', `${where}.purpose must be one of ${OCCUPANCY_PURPOSES.join(', ')}`);
    if (!Array.isArray(raw.appendageIds) || !raw.appendageIds.length || !raw.appendageIds.every(nonEmpty)) throw new EquipmentOccupancyInputError('INVALID_APPENDAGE_IDS', `${where}.appendageIds must be a non-empty array of non-empty strings`);
    if (new Set(raw.appendageIds).size !== raw.appendageIds.length) throw new EquipmentOccupancyInputError('DUPLICATE_APPENDAGE_IN_ASSIGNMENT', `${where} repeats an appendage id`);
    if (seenItems.has(raw.itemId)) throw new EquipmentOccupancyInputError('DUPLICATE_ITEM_ASSIGNMENT', `item "${raw.itemId}" appears in more than one assignment row`);
    seenItems.add(raw.itemId);
    return { itemId: raw.itemId, purpose: raw.purpose, appendageIds: [...raw.appendageIds] };
  });
}

/** Assess one appendage for one purpose. Returns { status, issues, ... } using only that appendage's own evidence. */
function assessAppendage(appendage, id, purpose, anatomy, itemId) {
  const issues = [];
  let blocked = false;
  let unknown = false;
  const block = (code, msg, details = {}) => { blocked = true; issues.push(issue(code, 'blocking', msg, { appendageId: id, itemId, ...details })); };
  const unsure = (code, msg, details = {}) => { unknown = true; issues.push(issue(code, 'warning', msg, { appendageId: id, itemId, ...details })); };

  if (!appendage) {
    if (anatomy.topologyEstablished) block('appendage-unknown', `Appendage "${id}" does not exist in the effective anatomy.`);
    else unsure('appendage-unknown-topology-incomplete', `Appendage "${id}" is not in the effective anatomy, whose topology is not established; no appendage is assumed.`);
    return { appendageId: id, kind: null, slot: null, functionalState: null, capabilities: null, status: blocked ? OCCUPANCY_STATUS.BLOCKED : OCCUPANCY_STATUS.INDETERMINATE, issues, constraints: [] };
  }
  const slot = typeof appendage.identity?.slot === 'string' && appendage.identity.slot ? appendage.identity.slot : null;
  if (appendage.functionalState === 'disabled' || appendage.functionalState === 'missing') block(`appendage-${appendage.functionalState}`, `Appendage "${id}" is ${appendage.functionalState} and provides no functional capacity.`, { functionalState: appendage.functionalState });
  else if (appendage.functionalState === 'unresolved') unsure('functional-state-unresolved', `Appendage "${id}" has an unresolved functional state.`);
  if (!slot) unsure('appendage-slot-unconfirmed', `Appendage "${id}" has no confirmed physical slot.`);
  const needed = purpose === 'wield' ? ['canHold', 'canWield'] : ['canHold'];
  for (const cap of needed) {
    const v = appendage.capabilities[cap] ?? null;
    if (v === false) block('capability-prohibited', `Appendage "${id}" is established as unable to satisfy ${cap} (${purpose}).`, { capability: cap });
    else if (v === null) unsure('capability-unknown', `Appendage "${id}" has unestablished ${cap}; unknown is not permission (${purpose}).`, { capability: cap });
  }
  return {
    appendageId: id, kind: appendage.kind ?? null, slot, functionalState: appendage.functionalState,
    capabilities: { canHold: appendage.capabilities.canHold ?? null, canWield: appendage.capabilities.canWield ?? null, canManipulate: appendage.capabilities.canManipulate ?? null },
    status: blocked ? OCCUPANCY_STATUS.BLOCKED : unknown ? OCCUPANCY_STATUS.INDETERMINATE : OCCUPANCY_STATUS.COMPATIBLE,
    issues, constraints: Array.isArray(appendage.constraints) ? appendage.constraints.map(clone) : [],
  };
}

/**
 * @param {{anatomy:object, speciesPermissions?:object|null, assignments:object[]}} input
 * @returns {{status:string, anatomyStatus:string, occupancy:object[], assignments:object[], conflicts:object[], pendingConstraints:object[],
 *   issues:object[], speciesPermissions:object|null}} deterministic, independently owned, deeply frozen
 * @throws {EquipmentOccupancyInputError}
 */
export function resolvePhysicalOccupancy(input) {
  if (!isPlainObject(input)) throw new EquipmentOccupancyInputError('INVALID_INPUT', 'input must be { anatomy, speciesPermissions, assignments }');
  const anatomy = readAnatomy(input.anatomy);
  const permissions = readPermissions(input.speciesPermissions);
  const rows = readAssignments(input.assignments);

  const claims = new Map(); // `appendage:<id>` / `slot:<slot>` -> first claiming itemId
  const conflicts = [];
  const assessments = rows.map((row) => {
    const appendages = row.appendageIds.map((id) => assessAppendage(anatomy.byId.get(id), id, row.purpose, anatomy, row.itemId));
    const issues = appendages.flatMap((a) => a.issues);
    const pending = [];
    for (const a of appendages) {
      if (a.status === OCCUPANCY_STATUS.BLOCKED && a.issues.some((i) => i.code === 'appendage-unknown')) continue;
      for (const key of [`appendage:${a.appendageId}`, a.slot ? `slot:${a.slot}` : null].filter(Boolean)) {
        const holder = claims.get(key);
        if (holder === undefined) claims.set(key, row.itemId);
        else if (holder !== row.itemId) {
          if (!conflicts.some((c) => c.appendageId === a.appendageId && c.itemIds[1] === row.itemId)) {
            const c = { appendageId: a.appendageId, slot: a.slot, itemIds: [holder, row.itemId] };
            conflicts.push(c);
            issues.push(issue('appendage-occupied-conflict', 'blocking', `Appendage "${a.appendageId}" is already assigned to item "${holder}"; nothing is displaced.`, clone(c)));
          }
        }
      }
      for (const constraint of a.constraints) {
        pending.push({ appendageId: a.appendageId, itemId: row.itemId, constraint: clone(constraint), evaluation: 'unevaluated' });
      }
    }
    if (pending.length) issues.push(issue('constraint-unevaluated', 'warning', 'A typed appendage constraint applies to this assignment and is carried forward unevaluated (no item size, load or encumbrance is computed here).', { itemId: row.itemId, constraintTypes: [...new Set(pending.map((p) => p.constraint.type))].sort() }));
    return { itemId: row.itemId, purpose: row.purpose, appendageIds: [...row.appendageIds], appendages: appendages.map(({ constraints, ...rest }) => rest), pendingConstraints: pending, issues };
  });

  // conflicts are discovered while walking later rows; mark the earlier holder's assessment too, then derive each row status
  for (const c of conflicts) {
    const first = assessments.find((a) => a.itemId === c.itemIds[0]);
    if (first && !first.issues.some((i) => i.code === 'appendage-occupied-conflict' && i.details.appendageId === c.appendageId)) first.issues.push(issue('appendage-occupied-conflict', 'blocking', `Appendage "${c.appendageId}" is also claimed by item "${c.itemIds[1]}".`, { ...c }));
  }
  for (const a of assessments) {
    const hasBlock = a.issues.some((i) => i.severity === 'blocking') || a.appendages.some((p) => p.status === OCCUPANCY_STATUS.BLOCKED);
    const hasUnknown = a.appendages.some((p) => p.status === OCCUPANCY_STATUS.INDETERMINATE) || a.pendingConstraints.length > 0;
    a.status = hasBlock ? OCCUPANCY_STATUS.BLOCKED : hasUnknown ? OCCUPANCY_STATUS.INDETERMINATE : OCCUPANCY_STATUS.COMPATIBLE;
  }

  const occupancy = [];
  for (const a of assessments) {
    if (a.status !== OCCUPANCY_STATUS.COMPATIBLE) continue;
    for (const p of a.appendages) occupancy.push({ appendageId: p.appendageId, slot: p.slot, itemId: a.itemId, purpose: a.purpose });
  }

  const issues = [];
  if (anatomy.status !== 'resolved') issues.push(issue('anatomy-not-resolved', 'warning', `The effective anatomy is ${anatomy.status}; no configuration is certified as fully physically compatible.`, { anatomyStatus: anatomy.status }));
  if (permissions?.status === 'recognized-incomplete-evidence') issues.push(issue('species-permission-evidence-incomplete', 'warning', 'A recognized species entitlement has incomplete or contradictory evidence; it is not treated as approval or prohibition.', {}));

  let status;
  if (assessments.some((a) => a.status === OCCUPANCY_STATUS.BLOCKED)) status = OCCUPANCY_STATUS.BLOCKED;
  else if (assessments.some((a) => a.status === OCCUPANCY_STATUS.INDETERMINATE) || issues.length) status = OCCUPANCY_STATUS.INDETERMINATE;
  else status = OCCUPANCY_STATUS.COMPATIBLE;

  return deepFreeze({
    status,
    anatomyStatus: anatomy.status,
    occupancy,
    assignments: assessments,
    conflicts,
    pendingConstraints: assessments.flatMap((a) => a.pendingConstraints),
    issues,
    speciesPermissions: permissions,
  });
}

export default { resolvePhysicalOccupancy, EquipmentOccupancyInputError, OCCUPANCY_STATUS, OCCUPANCY_PURPOSES };
