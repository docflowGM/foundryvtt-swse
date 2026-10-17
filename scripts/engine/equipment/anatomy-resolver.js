/**
 * Effective anatomy resolver (E2A) -- PURE and READ ONLY.
 *
 * Produces a derived, deterministic anatomy snapshot for an actor: which appendages can be identified, what each can do, whether
 * each is functional, where the fact came from, and what is still unknown. It stores nothing, mutates nothing (inputs are never
 * modified), and decides nothing about weapons: no hand occupancy, grips, readiness or attack permission (E3 / E7).
 *
 * Owner rulings applied (see docs/architecture/equipment-ecosystem-authority-contract-v1.md):
 *   OA-7  species anatomy will be an optional structured `anatomy` field on the EFFECTIVE species profile (not in the trait-rule
 *         vocabulary). It is read ONLY from the profile that is passed in -- never recovered from a base species.
 *   OA-8  slot / installed-instance / canonical-part identities are kept separate (see droid-appendage-projection.js).
 *   OA-4  functional state belongs to the actor's effective anatomy: functional | disabled | missing | unresolved.
 *   OA-2  the result is derived on demand; no persistent equipment state.
 *
 * Capabilities are tri-state (true | false | null; null = unknown). Unknown is never promoted to true. A capability field that is
 * missing is unknown (null), never ignored: an appendage is allocation-grade only when all three are explicit booleans.
 *
 * Unknown evidence versus malformed data (owner ruling E2A-C3):
 *   incomplete but valid evidence  -> `partial` / `unresolved` plus structured `issues`
 *   malformed injected-adapter output -> `AnatomyInputError` (documented codes below); never normalised into a success
 *   caller-owned data              -> never mutated and never frozen: adapter output is validated, then deep-COPIED, and only the
 *                                     newly owned snapshot is frozen.
 *
 * Biological input (E2B-I3A): `speciesProfile.anatomy`, when declared, is validated by the canonical schema authority
 * (scripts/species/species-anatomy-schema-v1.js, schema v1) -- this module has no validator of its own. Malformed declarations throw
 * `AnatomyInputError` (code INVALID_ANATOMY, or INVALID_CAPABILITY for a bad capability value) carrying `schemaCode` and `schemaPath` from
 * the original `SpeciesAnatomySchemaError`; they are never replaced by the default anatomy. Per-actor functional state is not part of
 * canonical anatomy (the schema rejects it): every species appendage starts `functional` and only `functionalOverrides` restrict it.
 * Topology: `complete` = all equipment-relevant appendages declared (zero is valid and gets no default); `partial` = known appendages,
 * incomplete topology -> never `resolved`; `unresolved` = no reliable topology -> `unresolved`, no appendages. Declared `constraints`
 * are copied through verbatim and are NEVER evaluated here (no size comparison, load or encumbrance calculation).
 */
import { projectDroidAppendages } from "/systems/foundryvtt-swse/scripts/engine/equipment/droid-appendage-projection.js";
import { validateSpeciesAnatomyV1, SpeciesAnatomySchemaError } from "/systems/foundryvtt-swse/scripts/species/species-anatomy-schema-v1.js";

export const ANATOMY_STATUS = Object.freeze({ RESOLVED: 'resolved', PARTIAL: 'partial', UNRESOLVED: 'unresolved' });
export const FUNCTIONAL_STATES = Object.freeze(['functional', 'disabled', 'missing', 'unresolved']);
const STATE_RANK = Object.freeze({ functional: 0, unresolved: 1, disabled: 2, missing: 3 });

/** Anatomy `source` values. */
export const ANATOMY_SOURCE = Object.freeze({
  DEFAULT: 'default',
  SPECIES_ANATOMY: 'species-anatomy',
  DROID_COMPONENTS: 'droid-installed-component',
  NONE: 'none',
});

/**
 * Temporary E2A compatibility guards (REMOVE WHEN E2B SUPPLIES STRUCTURED ANATOMY).
 * Exact trait identities already present in complete-snapshot species variants whose published anatomical capability has not yet
 * been added to the structured species authority. They only mark the anatomy incomplete; they compute no capability and carry no
 * species-name special case. Matching is by exact trait `id`; trait prose is never parsed.
 */
export const TEMPORARY_UNRESOLVED_EXCEPTION_TRAIT_IDS = Object.freeze(['extra-arms', 'prehensile-tail']);

/**
 * Temporary E2B-I3A fail-closed migration protection by EXACT publication identity (REMOVE when profile-keyed completeness is
 * enforced by the species authority itself). These are the source-reviewed exceptional publications plus the independently
 * unreviewed Jedi Academy Krevaaki profile. When the effective profile selected one of them and carries no structured anatomy, the
 * result is `unresolved` and the two-arm default is NOT applied. Identity comes only from the selected-variant fields of the effective
 * profile (`selectedVariantId`, `selectedVariant.id`, `selectedVariant.sourceProfileId`); display names and prose are never consulted.
 * This is not a species registry and carries no anatomy.
 */
export const TEMPORARY_FAIL_CLOSED_PUBLICATION_IDENTITIES = Object.freeze({
  variantIds: Object.freeze(['codru-ji-leg-2c-03', 'ryn-sv-2f-06', 'trianii-gaw-2i-06', 'krevaaki-ur-2b-04', 'killik-ur-2b-12', 'dug-cw-2h-01', 'lugubraa-ur-2b-13', 'krevaaki-jatm-2j-04']),
  sourceProfileIds: Object.freeze(['LEG-2C-03', 'SV-2F-06', 'GAW-2I-06', 'UR-2B-04', 'UR-2B-12', 'CW-2H-01', 'UR-2B-13', 'JATM-2J-04']),
});

/** Thrown for input that violates the resolver API. Ordinary missing / ambiguous evidence is reported as `issues`, not thrown. */
export class AnatomyInputError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'AnatomyInputError';
    this.code = code;
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const triState = (v, where, field) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v;
  throw new AnatomyInputError('INVALID_CAPABILITY', `${where}.${field} must be true, false or null`);
};

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

const issue = (code, severity, message, details = {}) => ({ code, severity, message, details });

// ---- injected droid-adapter boundary (E2A-C3) ----------------------------------------------------------------------------------
const NONEMPTY = (v) => typeof v === 'string' && v.trim().length > 0;
const ISSUE_SEVERITIES = ['info', 'warning', 'blocking'];

/** Independent deep copy of plain data (primitives, arrays, plain objects). Anything else is malformed adapter output. */
function clonePlain(value, where, seen = new WeakSet()) {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (value === undefined) return undefined;
  if (typeof value !== 'object') throw new AnatomyInputError('INVALID_ADAPTER_RESULT', `${where} contains a non-data value (${typeof value})`);
  if (seen.has(value)) throw new AnatomyInputError('INVALID_ADAPTER_RESULT', `${where} contains a circular reference`);
  const proto = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) throw new AnatomyInputError('INVALID_ADAPTER_RESULT', `${where} contains a non-plain object`);
  seen.add(value);
  let out;
  if (Array.isArray(value)) out = value.map((v, i) => clonePlain(v, `${where}[${i}]`, seen));
  else { out = {}; for (const key of Object.keys(value)) { const v = clonePlain(value[key], `${where}.${key}`, seen); if (v !== undefined) out[key] = v; } }
  seen.delete(value);
  return out;
}

function readAdapterIdentity(raw, where) {
  if (!isPlainObject(raw)) throw new AnatomyInputError('INVALID_ADAPTER_IDENTITY', `${where}.identity must be an object distinguishing slot, instance and part`);
  const out = {};
  for (const field of ['slot', 'instance', 'part']) {
    const v = raw[field];
    if (v === undefined || v === null) { out[field] = null; continue; }
    if (!NONEMPTY(v)) throw new AnatomyInputError('INVALID_ADAPTER_IDENTITY', `${where}.identity.${field} must be null or a non-empty string`);
    out[field] = v;
  }
  return out;
}

/** Validate one adapter appendage and return an independent, normalised copy (missing capabilities -> null). */
function readAdapterAppendage(raw, index, seenIds) {
  const where = `adapter.appendages[${index}]`;
  if (!isPlainObject(raw)) throw new AnatomyInputError('INVALID_ADAPTER_APPENDAGE', `${where} must be an object`);
  for (const field of ['id', 'kind', 'source']) {
    if (!NONEMPTY(raw[field])) throw new AnatomyInputError('INVALID_ADAPTER_APPENDAGE', `${where}.${field} must be a non-empty string`);
  }
  if (seenIds.has(raw.id)) throw new AnatomyInputError('DUPLICATE_APPENDAGE_ID', `${where}.id "${raw.id}" is duplicated; duplicates must not create several allocatable manipulators`);
  seenIds.add(raw.id);
  const identity = readAdapterIdentity(raw.identity, where);
  if (!isPlainObject(raw.capabilities)) throw new AnatomyInputError('INVALID_ADAPTER_APPENDAGE', `${where}.capabilities must be an object (individual capabilities may be omitted = unknown)`);
  const capabilities = { canHold: triState(raw.capabilities.canHold, where, 'canHold'), canWield: triState(raw.capabilities.canWield, where, 'canWield'), canManipulate: triState(raw.capabilities.canManipulate, where, 'canManipulate') };
  if (!FUNCTIONAL_STATES.includes(raw.functionalState)) throw new AnatomyInputError('INVALID_FUNCTIONAL_STATE', `${where}.functionalState must be one of ${FUNCTIONAL_STATES.join(', ')} (an adapter that cannot establish the state must supply "unresolved")`);
  if (raw.functionalStateSource !== undefined && !NONEMPTY(raw.functionalStateSource)) throw new AnatomyInputError('INVALID_ADAPTER_APPENDAGE', `${where}.functionalStateSource must be a non-empty string when supplied`);
  if (raw.restrictions !== undefined && !(Array.isArray(raw.restrictions) && raw.restrictions.every((r) => typeof r === 'string'))) throw new AnatomyInputError('INVALID_ADAPTER_APPENDAGE', `${where}.restrictions must be an array of strings`);
  const copy = clonePlain(raw, where);
  return { ...copy, identity, capabilities, functionalState: raw.functionalState, functionalStateSource: raw.functionalStateSource ?? 'adapter' };
}

/**
 * Confirmed-identity collisions (E2B-I3B). A non-null `identity.slot` names one physical appendage slot and a non-null
 * `identity.instance` names one installed component instance; two DIFFERENT confirmed appendages may not claim the same one. These are
 * malformed data (not uncertainty) and throw. Null identities are incomplete evidence and never collide; `identity.part` (the
 * canonical part definition) is deliberately not unique. Only the adapter's confirmed `appendages` are checked: repeated candidate ids
 * inside `unresolvedRecords` are diagnostic evidence, not allocatable appendages. Detection is in array order, slot before instance.
 */
function assertDistinctConfirmedIdentities(appendages) {
  const bySlot = new Map();
  const byInstance = new Map();
  for (const a of appendages) {
    for (const [field, seen, code] of [['slot', bySlot, 'DUPLICATE_APPENDAGE_SLOT'], ['instance', byInstance, 'DUPLICATE_INSTALLED_INSTANCE']]) {
      const value = a.identity?.[field];
      if (!value) continue;
      if (seen.has(value)) {
        const first = seen.get(value);
        const err = new AnatomyInputError(code, `appendages "${first}" and "${a.id}" both claim confirmed ${field} "${value}"; one physical ${field === 'slot' ? 'slot' : 'installed instance'} cannot be two appendages`);
        err.details = { [field]: value, appendageIds: [first, a.id] };
        throw err;
      }
      seen.set(value, a.id);
    }
  }
}

/**
 * Validate an injected droid adapter's result and return an independent copy:
 * { appendages:[], unresolvedRecords:[], issues:[] } -- all three must be arrays (empty is valid). Malformed output throws; it is never
 * converted into empty arrays, and errors thrown by the adapter itself propagate unchanged.
 */
function readAdapterResult(raw) {
  if (!isPlainObject(raw)) throw new AnatomyInputError('INVALID_ADAPTER_RESULT', 'the droid adapter must return { appendages: [], unresolvedRecords: [], issues: [] }');
  for (const field of ['appendages', 'unresolvedRecords', 'issues']) {
    if (!Array.isArray(raw[field])) throw new AnatomyInputError('INVALID_ADAPTER_RESULT', `adapter result.${field} must be an array`);
  }
  const seenIds = new Set();
  const appendages = raw.appendages.map((a, i) => readAdapterAppendage(a, i, seenIds));
  assertDistinctConfirmedIdentities(appendages);
  const unresolvedRecords = raw.unresolvedRecords.map((r, i) => {
    if (!isPlainObject(r)) throw new AnatomyInputError('INVALID_ADAPTER_RESULT', `adapter unresolvedRecords[${i}] must be an object`);
    return clonePlain(r, `adapter.unresolvedRecords[${i}]`);
  });
  const issues = raw.issues.map((it, i) => {
    const where = `adapter.issues[${i}]`;
    if (!isPlainObject(it) || !NONEMPTY(it.code) || !ISSUE_SEVERITIES.includes(it.severity) || typeof it.message !== 'string') throw new AnatomyInputError('INVALID_ADAPTER_RESULT', `${where} must be { code:string, severity:${ISSUE_SEVERITIES.join('|')}, message:string, details? }`);
    return { code: it.code, severity: it.severity, message: it.message, details: clonePlain(it.details ?? {}, `${where}.details`) };
  });
  return { appendages, unresolvedRecords, issues };
}

/** Diagnostics for adapter appendages whose physical identity is incomplete (they can never make the anatomy `resolved`). */
function identityIssues(appendages, issues) {
  for (const a of appendages) {
    const missing = ['slot', 'instance'].filter((f) => !a.identity?.[f]);
    if (missing.length) issues.push(issue('appendage-identity-incomplete', 'warning', `Appendage "${a.id}" has no established ${missing.join(' / ')} identity.`, { id: a.id, missing }));
  }
}

function validateInput(input) {
  if (!isPlainObject(input)) throw new AnatomyInputError('INVALID_INPUT', 'input must be an object');
  const { actorType, speciesProfile, installedComponents, functionalOverrides } = input;
  if (actorType !== undefined && actorType !== null && typeof actorType !== 'string') throw new AnatomyInputError('INVALID_ACTOR_TYPE', 'actorType must be a string');
  if (speciesProfile !== undefined && speciesProfile !== null && !isPlainObject(speciesProfile)) throw new AnatomyInputError('INVALID_SPECIES_PROFILE', 'speciesProfile must be an object');
  if (installedComponents !== undefined && installedComponents !== null) {
    if (!isPlainObject(installedComponents) || !Array.isArray(installedComponents.components)) throw new AnatomyInputError('INVALID_INSTALLED_COMPONENTS', 'installedComponents must be the result of resolveInstalledDroidComponents() ({ components: [] })');
  }
  if (functionalOverrides !== undefined && functionalOverrides !== null) {
    if (!isPlainObject(functionalOverrides)) throw new AnatomyInputError('INVALID_FUNCTIONAL_OVERRIDES', 'functionalOverrides must be an object keyed by appendage id');
    for (const [id, raw] of Object.entries(functionalOverrides)) {
      const state = isPlainObject(raw) ? raw.state : raw;
      if (!FUNCTIONAL_STATES.includes(state)) throw new AnatomyInputError('INVALID_FUNCTIONAL_OVERRIDES', `override for "${id}" must be one of ${FUNCTIONAL_STATES.join(', ')}`);
    }
  }
}

/** Validate a declared species anatomy with the canonical schema v1 authority and project it. Never mutates or freezes the input. */
function readSpeciesAnatomy(anatomy) {
  let canonical;
  try {
    canonical = validateSpeciesAnatomyV1(anatomy, 'speciesProfile.anatomy');
  } catch (e) {
    if (!(e instanceof SpeciesAnatomySchemaError)) throw e;
    const err = new AnatomyInputError(e.code === 'INVALID_CAPABILITY' ? 'INVALID_CAPABILITY' : 'INVALID_ANATOMY', e.message);
    err.schemaCode = e.code;
    err.schemaPath = e.path ?? null;
    throw err;
  }
  const appendages = canonical.appendages.map((raw) => ({
    id: raw.id,
    kind: raw.kind,
    source: ANATOMY_SOURCE.SPECIES_ANATOMY,
    identity: { slot: raw.id, instance: null, part: null },
    capabilities: { canHold: raw.capabilities.canHold, canWield: raw.capabilities.canWield, canManipulate: raw.capabilities.canManipulate },
    functionalState: 'functional',
    functionalStateSource: 'species-anatomy',
    ...(raw.constraints ? { constraints: raw.constraints.map((c) => ({ ...c })) } : {}),
  }));
  return { topologyStatus: canonical.topologyStatus, appendages };
}

function defaultNaturalArms() {
  return [1, 2].map((n) => ({
    id: `natural-arm-${n}`,
    kind: 'natural-arm',
    source: ANATOMY_SOURCE.DEFAULT,
    identity: { slot: `natural-arm-${n}`, instance: null, part: null },
    capabilities: { canHold: true, canWield: true, canManipulate: true },
    functionalState: 'functional',
    functionalStateSource: 'default',
  }));
}

/** Apply caller-supplied functional overrides. Overrides may only RESTRICT evidence-based state (conservative; see checkpoint doc). */
function applyOverrides(appendages, overrides, issues) {
  if (!overrides) return appendages;
  const ids = new Set(appendages.map((a) => a.id));
  for (const id of Object.keys(overrides)) {
    if (!ids.has(id)) issues.push(issue('override-unknown-appendage', 'warning', `Functional override for "${id}" does not match any identified appendage and was ignored.`, { id }));
  }
  return appendages.map((a) => {
    if (!Object.prototype.hasOwnProperty.call(overrides, a.id)) return a;
    const raw = overrides[a.id];
    const state = isPlainObject(raw) ? raw.state : raw;
    if (STATE_RANK[state] > STATE_RANK[a.functionalState]) return { ...a, functionalState: state, functionalStateSource: 'override' };
    if (state !== a.functionalState) issues.push(issue('override-less-restrictive-than-evidence', 'info', `Override "${state}" for "${a.id}" is less restrictive than recorded evidence "${a.functionalState}" and was not applied.`, { id: a.id, override: state, evidence: a.functionalState }));
    return a;
  });
}

function capabilityIssues(appendages, issues) {
  for (const a of appendages) {
    const unknown = Object.entries(a.capabilities).filter(([, v]) => v === null).map(([k]) => k);
    if (unknown.length) issues.push(issue('capability-unknown', 'warning', `Appendage "${a.id}" has unestablished capabilities: ${unknown.join(', ')}.`, { id: a.id, unknown }));
    if (a.functionalState === 'unresolved') issues.push(issue('functional-state-unresolved', 'warning', `Appendage "${a.id}" has an unresolved functional state.`, { id: a.id }));
  }
}

function traitIds(profile) {
  const out = [];
  for (const list of [profile?.canonicalTraits, profile?.traits]) {
    if (Array.isArray(list)) for (const t of list) if (t && typeof t.id === 'string') out.push(t.id);
  }
  return out;
}

/** Exact-match selected-publication identity of the effective profile (null fields when the profile carries none). */
function publicationIdentity(profile) {
  const variantId = [profile?.selectedVariantId, profile?.selectedVariant?.id].find((v) => typeof v === 'string' && v) ?? null;
  const sourceProfileId = typeof profile?.selectedVariant?.sourceProfileId === 'string' && profile.selectedVariant.sourceProfileId ? profile.selectedVariant.sourceProfileId : null;
  return { variantId, sourceProfileId };
}

const result = (r) => deepFreeze({ anatomyKind: r.anatomyKind, status: r.status, source: r.source, defaultApplied: r.defaultApplied, appendages: r.appendages, issues: r.issues, ...(r.topologyStatus ? { topologyStatus: r.topologyStatus } : {}), ...(r.unresolvedRecords ? { unresolvedRecords: r.unresolvedRecords } : {}) });

/**
 * Resolve the effective anatomy.
 *
 * @param {{actorType?:string, speciesProfile?:object, installedComponents?:{components:object[]}, functionalOverrides?:Object<string,string|{state:string}>, deps?:object}} input
 *   `deps` (optional): `projectInstalledComponents(installedComponents, deps) -> {appendages, unresolvedRecords, issues}` replaces the legacy droid
 *   adapter (the droid refactor is pending); other keys are forwarded to the adapter (getDefinition / catalogEntryFor for tests).
 * @returns {{anatomyKind:string, status:'resolved'|'partial'|'unresolved', source:string, defaultApplied:boolean, appendages:object[], issues:object[]}}
 * @throws {AnatomyInputError} for input that violates the API (documented codes: INVALID_INPUT, INVALID_ACTOR_TYPE,
 *   INVALID_SPECIES_PROFILE, INVALID_INSTALLED_COMPONENTS, INVALID_FUNCTIONAL_OVERRIDES, INVALID_ANATOMY, INVALID_CAPABILITY;
 *   injected droid adapter: INVALID_ADAPTER_RESULT, INVALID_ADAPTER_APPENDAGE, INVALID_ADAPTER_IDENTITY, INVALID_FUNCTIONAL_STATE, DUPLICATE_APPENDAGE_ID,
 *   DUPLICATE_APPENDAGE_SLOT, DUPLICATE_INSTALLED_INSTANCE -- the last two carry `details` {slot|instance, appendageIds})
 */
export function resolveEffectiveAnatomy(input) {
  validateInput(input);
  const speciesProfile = input.speciesProfile ?? null;
  const actorType = typeof input.actorType === 'string' ? input.actorType.trim().toLowerCase() : '';
  const overrides = input.functionalOverrides ?? null;
  const issues = [];

  const isDroid = actorType === 'droid' || speciesProfile?.speciesActsAsDroid === true;

  // ---- installed-component (droid) anatomy ---------------------------------------------------------------------------
  if (isDroid) {
    if (!input.installedComponents) {
      issues.push(issue('installed-components-not-provided', 'blocking', 'A droid anatomy needs the installed-component resolution; none was provided, so no manipulator is granted.'));
      return result({ anatomyKind: 'installed-component', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.NONE, defaultApplied: false, appendages: [], issues });
    }
    // The droid adapter is isolated and replaceable (droid refactor pending): a future adapter can be injected via deps.projectInstalledComponents.
    const project = typeof input.deps?.projectInstalledComponents === 'function' ? input.deps.projectInstalledComponents : projectDroidAppendages;
    // Adapter output is validated and deep-copied before anything else (E2A-C3); the caller's objects are never touched or frozen.
    const projected = readAdapterResult(project(input.installedComponents, input.deps ?? {}));
    issues.push(...projected.issues);
    const appendages = applyOverrides(projected.appendages, overrides, issues);
    capabilityIssues(appendages, issues);
    identityIssues(appendages, issues);
    // E2B-I3B: unresolved physical records beside confirmed appendages mean the topology is incomplete -> never `resolved`. The records
    // stay separate diagnostic evidence; they are never promoted to appendages and no count/identity/capability is inferred from them.
    if (appendages.length && projected.unresolvedRecords.length) issues.push(issue('unresolved-physical-records-present', 'warning', `${projected.unresolvedRecords.length} unresolved physical appendage record(s) remain beside the confirmed appendages; the anatomy cannot be fully resolved.`, { count: projected.unresolvedRecords.length }));
    if (!appendages.length && !projected.unresolvedRecords.length) issues.push(issue('no-appendage-evidence', 'blocking', 'No appendage component is recorded in the installed-component evidence; no manipulator is granted (a droid is not given default biological arms).'));
    // `resolved` is reserved for evidence sufficient for future allocation: every appendage has a confirmed slot AND installed-instance
    // identity, all three capabilities are booleans, the functional state is known, and no blocking issue remains. Unresolved records
    // (legacy evidence without installation identity) never count as appendages; they can raise `unresolved` to `partial` only when
    // they show installed, enabled hardware that is not stated to be unable to manipulate.
    const blocking = issues.some((i) => i.severity === 'blocking');
    const unknownFacts = issues.some((i) => i.code === 'capability-unknown' || i.code === 'functional-state-unresolved');
    const allocationGrade = appendages.length > 0 && appendages.every((a) => a.identity?.slot && a.identity?.instance && ['canHold', 'canWield', 'canManipulate'].every((c) => typeof a.capabilities?.[c] === 'boolean') && FUNCTIONAL_STATES.includes(a.functionalState) && a.functionalState !== 'unresolved');
    const usableRecordFacts = projected.unresolvedRecords.some((r) => (r.candidateInstances?.length ? r.candidateInstances.some((c) => c.functionalState === 'functional') : r.componentState === 'functional') && r.capabilities?.canManipulate !== false);
    let status;
    if (!appendages.length) status = usableRecordFacts ? ANATOMY_STATUS.PARTIAL : ANATOMY_STATUS.UNRESOLVED;
    else status = blocking || unknownFacts || !allocationGrade || projected.unresolvedRecords.length ? ANATOMY_STATUS.PARTIAL : ANATOMY_STATUS.RESOLVED;
    return result({ anatomyKind: 'installed-component', status, source: appendages.length || projected.unresolvedRecords.length ? ANATOMY_SOURCE.DROID_COMPONENTS : ANATOMY_SOURCE.NONE, defaultApplied: false, appendages, issues, unresolvedRecords: projected.unresolvedRecords });
  }

  if (!actorType) {
    issues.push(issue('actor-type-unknown', 'blocking', 'No explicit actor classification was provided; the biological default is not assumed.'));
    return result({ anatomyKind: 'unknown', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.NONE, defaultApplied: false, appendages: [], issues });
  }

  // ---- unsupported actor types -----------------------------------------------------------------------------------------
  if (!['character', 'npc'].includes(actorType)) {
    issues.push(issue('actor-type-unsupported', 'blocking', `Anatomy is not defined for actor type "${actorType}".`, { actorType }));
    return result({ anatomyKind: 'unsupported', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.NONE, defaultApplied: false, appendages: [], issues });
  }

  // ---- biological anatomy ----------------------------------------------------------------------------------------------
  if (speciesProfile && Object.prototype.hasOwnProperty.call(speciesProfile, 'anatomy') && speciesProfile.anatomy !== undefined) {
    // a supplied `null` is a malformed declaration (schema INVALID_ANATOMY_TYPE), never an absent one
    const declared = readSpeciesAnatomy(speciesProfile.anatomy);
    const { topologyStatus } = declared;
    if (topologyStatus === 'unresolved') {
      issues.push(issue('anatomy-topology-unresolved', 'blocking', 'The species anatomy declares no reliable equipment-relevant topology; no appendage is generated and the two-arm default is not applied.'));
      return result({ anatomyKind: 'biological', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.SPECIES_ANATOMY, defaultApplied: false, appendages: [], issues, topologyStatus });
    }
    const appendages = applyOverrides(declared.appendages, overrides, issues);
    if (topologyStatus === 'partial') issues.push(issue('anatomy-topology-partial', 'warning', 'The species anatomy declares only some equipment-relevant appendages; the known appendages are preserved but the topology is incomplete.', { appendageIds: appendages.map((a) => a.id) }));
    capabilityIssues(appendages, issues);
    const incomplete = topologyStatus === 'partial' || issues.some((i) => i.code === 'capability-unknown' || i.code === 'functional-state-unresolved');
    return result({ anatomyKind: 'biological', status: incomplete ? ANATOMY_STATUS.PARTIAL : ANATOMY_STATUS.RESOLVED, source: ANATOMY_SOURCE.SPECIES_ANATOMY, defaultApplied: false, appendages, issues, topologyStatus });
  }

  // Publication-profile guard (E2B-I3A): an exceptional publication without structured anatomy never falls back to two arms.
  if (speciesProfile) {
    const { variantId, sourceProfileId } = publicationIdentity(speciesProfile);
    const ids = TEMPORARY_FAIL_CLOSED_PUBLICATION_IDENTITIES;
    if ((variantId && ids.variantIds.includes(variantId)) || (sourceProfileId && ids.sourceProfileIds.includes(sourceProfileId))) {
      issues.push(issue('anatomy-exception-unresolved', 'blocking', 'The selected publication profile is a recognized anatomical exception (or is not independently certified) and carries no structured anatomy. No appendage count or capability is inferred and the two-arm default is not applied.', { variantId, sourceProfileId, temporary: true }));
      return result({ anatomyKind: 'biological', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.NONE, defaultApplied: false, appendages: [], issues });
    }
  }

  // Temporary guards: a known anatomical exception exists but its structured data does not. Never flatten it into a complete default.
  if (speciesProfile) {
    const guarded = traitIds(speciesProfile).filter((id) => TEMPORARY_UNRESOLVED_EXCEPTION_TRAIT_IDS.includes(id));
    if (guarded.length) {
      for (const traitId of [...new Set(guarded)].sort()) {
        issues.push(issue('anatomy-exception-unresolved', 'blocking', `The effective species profile carries trait "${traitId}", a known anatomical exception whose structured anatomy is not yet supplied (E2B). No appendage count or capability is inferred and the two-arm default is not applied.`, { traitId, temporary: true }));
      }
      return result({ anatomyKind: 'biological', status: ANATOMY_STATUS.UNRESOLVED, source: ANATOMY_SOURCE.NONE, defaultApplied: false, appendages: [], issues });
    }
  } else {
    issues.push(issue('species-profile-not-provided', 'warning', 'No effective species profile was provided; the provisional two-arm default was applied, but whether a species exception exists cannot be established.'));
  }

  const appendages = applyOverrides(defaultNaturalArms(), overrides, issues);
  capabilityIssues(appendages, issues);
  const defaultIncomplete = issues.some((i) => i.code === 'functional-state-unresolved' || i.code === 'species-profile-not-provided');
  return result({ anatomyKind: 'biological', status: defaultIncomplete ? ANATOMY_STATUS.PARTIAL : ANATOMY_STATUS.RESOLVED, source: ANATOMY_SOURCE.DEFAULT, defaultApplied: true, appendages, issues });
}

export default { resolveEffectiveAnatomy, AnatomyInputError, ANATOMY_STATUS, ANATOMY_SOURCE, FUNCTIONAL_STATES, TEMPORARY_UNRESOLVED_EXCEPTION_TRAIT_IDS, TEMPORARY_FAIL_CLOSED_PUBLICATION_IDENTITIES };
