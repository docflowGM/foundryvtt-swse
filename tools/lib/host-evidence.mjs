// D-005 T4d-1: the offline HOST EVIDENCE CONTRACT.
//
// Pure and offline. This module defines what an observation about a host / added / payload Item MUST look like before it can be
// treated as evidence, how that evidence is classified (trusted, untrusted, invalid, stale), how observations are resolved
// (basis, absence, contradiction) and how payload collections are modelled. It is NOT a predicate evaluator: none of the nine
// T4c operators is implemented here, no legal/illegal/not_established verdict is produced, and nothing reads real Item data.
//
// Authority: docs/audits/d-005-t4c-owner-decisions.md (T4C-D06, D07, D08, F04, F05, F07, F08) and the T4d architecture review.
// Imported by nothing under scripts/ (tests assert it). Uses the T4c vocabularies (FACTS, COMPATIBILITY_CHECKS, SIZE_CATEGORIES)
// rather than redefining them.
//
// Trust model (the whole point of this module):
//  * A caller can never make an observation trusted by labelling it. `trust: 'explicit'`, `binding.result: 'bound'` and
//    `completeness.basis: 'system-enumerated'` are CLAIMS. They count only when the object was issued by an EvidenceAuthority
//    that accepts the source kind, the binding method and the enumerator. The production authority accepts none of them, so
//    every real Item-derived observation is untrusted until a method is separately approved (TRUSTED_BINDING_METHODS is empty).
//  * Synthetic authorities exist only to test the contract; everything they vouch for is marked synthetic and is never
//    production-trusted.
//  * `attested` is a reserved class. It is never accepted (T4C-F04).

import { canonicalJson, sha256, jsonEqual } from './modification-runtime.mjs';
import { FACTS, COMPATIBILITY_CHECKS, SIZE_CATEGORIES, PINNED_HOST_REQUIREMENTS_SHA256, validateHostRequirements } from './host-requirements.mjs';

export const EVIDENCE_SCHEMA_ID = 'swse.modification.host-evidence/1';

/* ------------------------------------------------------------------------------------------ */
/* Frozen vocabularies                                                                         */
/* ------------------------------------------------------------------------------------------ */

/** The 14 certified T4c fact references (unchanged). */
export const FACT_REFS = Object.freeze(Object.keys(FACTS));
/** Evidence about the six compatibility checks is carried under a separate `compat:` namespace; these are not fact references. */
export const CHECK_REFS = Object.freeze(Object.keys(COMPATIBILITY_CHECKS).map((c) => `compat:${c}`));
const COLLECTION_REF = 'payload.items';
export const OBSERVATION_REFS = Object.freeze([...FACT_REFS.filter((f) => f !== COLLECTION_REF), ...CHECK_REFS]);

/** The 32 approved diagnostic codes (T4c owner decisions section 5.1). Compared with the record and the schema by the tests. */
export const DIAGNOSTIC_CODES = Object.freeze([
  'HOST_FACT_MISSING', 'HOST_FACT_UNTRUSTED', 'HOST_POWER_SOURCE_UNKNOWN', 'HOST_POWER_SOURCE_UNSUPPORTED', 'HOST_INTELLIGENCE_MISSING',
  'HOST_IS_DROID', 'HOST_DROID_STATUS_UNKNOWN', 'HOST_ONE_HANDED_UNKNOWN', 'HOST_NOT_ONE_HANDED', 'HOST_ACTIVATION_UNKNOWN',
  'HOST_RESTRICTABILITY_UNKNOWN', 'HOST_PHYSICAL_FIT_UNKNOWN', 'HOST_ADDED_ITEM_MISSING', 'HOST_SIZE_UNKNOWN', 'PAYLOAD_NOT_SMALLER',
  'HOST_WEIGHT_UNKNOWN', 'PAYLOAD_WEIGHT_UNKNOWN', 'PAYLOAD_WEIGHT_LIMIT_EXCEEDED', 'HOST_CONTRACT_VERSION_UNTRUSTED',
  'HOST_PREDICATE_UNSUPPORTED', 'HOST_DOMAIN_MISMATCH', 'HOST_EVIDENCE_CONTRADICTORY', 'HOST_PROVENANCE_INVALID', 'HOST_PROVENANCE_STALE',
  'HOST_NOT_RESTRICTABLE', 'HOST_NOT_ACTIVATABLE', 'HOST_PHYSICAL_FIT_DISPROVEN', 'HOST_ADDED_ITEM_LARGER', 'PAYLOAD_SIZE_UNKNOWN',
  'HOST_INTELLIGENCE_SCORE_ABSENT', 'PAYLOAD_ITEM_COUNT_EXCEEDED', 'HOST_ATTUNED_GAUNTLET_UNAVAILABLE'
]);

export const BASES = Object.freeze(['base', 'persistent', 'effective', 'user-entered']);
export const RESOLVABLE_BASES = Object.freeze(['base', 'persistent', 'effective']);
export const ROLES = Object.freeze(['host', 'addedItem', 'payloadItem', 'use']);
export const ITEM_TYPES = Object.freeze(['weapon', 'armor', 'equipment']);
export const INPUT_STATUSES = Object.freeze(['known', 'absent', 'unknown']);
export const TRUST_CLASSES = Object.freeze(['explicit', 'attested', 'derived', 'default', 'unknown']);
/** The only trust class that may ever be accepted. A constant, never a request or authority option (T4C-F04). */
export const ACCEPTED_TRUST = Object.freeze(['explicit']);
export const BINDING_RESULTS = Object.freeze(['bound', 'unbound', 'unresolvable', 'mismatch']);
export const SOURCE_KINDS = Object.freeze(['canonical-registry', 'certified-item-record', 'foundry-document', 'synthetic-fixture']);
/** Source kinds whose facts describe a specific Item through a canonical record, and therefore need a trusted Item binding. */
export const BINDING_REQUIRED_KINDS = Object.freeze(['canonical-registry', 'certified-item-record']);
export const PURPOSES = Object.freeze(['printed-statistics', 'installation-eligibility']);
export const PERSISTENT_CHANGE_STATES = Object.freeze(['none', 'resolved', 'unresolved']);
export const COMPLETENESS_STATUSES = Object.freeze(['complete', 'incomplete', 'unknown']);
export const COMPLETENESS_BASES = Object.freeze(['system-enumerated', 'caller-declared']);

/** Production trust configuration. All three are EMPTY: no binding method, source kind or enumerator is approved (T4d-1 safeguard 2). */
export const TRUSTED_BINDING_METHODS = Object.freeze([]);
export const TRUSTED_SOURCE_KINDS = Object.freeze([]);
export const TRUSTED_ENUMERATORS = Object.freeze([]);

/** Family-specific unknown code for each observation reference (T4c case-to-code table, cases 1 and 9-29 / 30b-30f). */
export const UNKNOWN_CODE = Object.freeze({
  'item.type': 'HOST_FACT_MISSING',
  'host.powerSourceTypes': 'HOST_POWER_SOURCE_UNKNOWN',
  'host.intelligenceScore': 'HOST_INTELLIGENCE_MISSING',
  'host.droidStatus': 'HOST_DROID_STATUS_UNKNOWN',
  'host.oneHandedHandheld': 'HOST_ONE_HANDED_UNKNOWN',
  'host.functionRestrictable': 'HOST_RESTRICTABILITY_UNKNOWN',
  'host.remotelyActivatableFunction': 'HOST_ACTIVATION_UNKNOWN',
  'use.attunedGauntletForHost': 'HOST_FACT_MISSING',
  'host.sizeCategory': 'HOST_SIZE_UNKNOWN',
  'addedItem.sizeCategory': 'HOST_SIZE_UNKNOWN',
  'payload.sizeCategory': 'PAYLOAD_SIZE_UNKNOWN',
  'host.weightKg': 'HOST_WEIGHT_UNKNOWN',
  'payload.weightKg': 'PAYLOAD_WEIGHT_UNKNOWN',
  [COLLECTION_REF]: 'HOST_FACT_MISSING',
  ...Object.fromEntries(CHECK_REFS.map((r) => [r, 'HOST_PHYSICAL_FIT_UNKNOWN']))
});

/* ------------------------------------------------------------------------------------------ */
/* Helpers                                                                                     */
/* ------------------------------------------------------------------------------------------ */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.length > 0;
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function deepFreeze(v) {
  if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); }
  return v;
}

/** Deterministic fingerprint of any JSON value. */
export const fingerprintOf = (value) => sha256(canonicalJson(value));

/* ------------------------------------------------------------------------------------------ */
/* Evidence authorities                                                                        */
/* ------------------------------------------------------------------------------------------ */

/**
 * Module-private authority identity. An authority object is trusted ONLY if it is a key of this map; its public fields (id, kind,
 * synthetic, lists, methods) are descriptive and never consulted for a trust decision, so a look-alike object, a spread/clone
 * or an Object.create() descendant is an unrecognized authority and fails closed.
 */
const AUTHORITY_STATE = new WeakMap();

function makeAuthority({ id, kind, trustedBindingMethods, trustedSourceKinds, trustedEnumerators, registryPins }) {
  const state = Object.freeze({
    kind, synthetic: kind === 'synthetic',
    trustedBindingMethods: Object.freeze([...trustedBindingMethods]), trustedSourceKinds: Object.freeze([...trustedSourceKinds]),
    trustedEnumerators: Object.freeze([...trustedEnumerators]), registryPins: Object.freeze([...registryPins]),
    issuedObservations: new WeakSet(), issuedCollections: new WeakSet()
  });
  const authority = Object.freeze({
    id, kind, synthetic: state.synthetic,
    trustedBindingMethods: state.trustedBindingMethods, trustedSourceKinds: state.trustedSourceKinds,
    trustedEnumerators: state.trustedEnumerators, registryPins: state.registryPins,
    /** Returns a frozen copy registered as issued by THIS authority. A structural copy of it (JSON, spread, clone) is not issued. */
    issue(raw) { const copy = deepFreeze(structuredClone(raw)); state.issuedObservations.add(copy); return copy; },
    issueCollection(raw) { const copy = deepFreeze(structuredClone(raw)); state.issuedCollections.add(copy); return copy; }
  });
  AUTHORITY_STATE.set(authority, state);
  return authority;
}

/** The private state of the authority named by ctx (production when none is named); null for anything this module did not create. */
function authorityState(ctx) {
  const a = ctx?.authority ?? PRODUCTION_AUTHORITY;
  return isObj(a) ? AUTHORITY_STATE.get(a) ?? null : null;
}

/** The production authority: accepts nothing, so no real Item-derived observation can be trusted. Cannot be constructed elsewhere. */
export const PRODUCTION_AUTHORITY = makeAuthority({
  id: 'production', kind: 'production',
  trustedBindingMethods: TRUSTED_BINDING_METHODS, trustedSourceKinds: TRUSTED_SOURCE_KINDS, trustedEnumerators: TRUSTED_ENUMERATORS, registryPins: []
});

const SYNTHETIC_OPTIONS = ['id', 'trustedBindingMethods', 'trustedSourceKinds', 'trustedEnumerators', 'registryPins'];

/**
 * A synthetic authority for tests and offline experiments. Everything it vouches for is marked `synthetic` and is never
 * production-trusted. It cannot widen the accepted trust classes or pose as the production authority.
 */
export function createSyntheticEvidenceAuthority(config = {}) {
  for (const k of Object.keys(config)) if (!SYNTHETIC_OPTIONS.includes(k)) throw new TypeError(`unsupported authority option: ${k}`);
  const list = (v) => (Array.isArray(v) && v.every(isStr) ? v : []);
  return makeAuthority({
    id: isStr(config.id) ? config.id : 'synthetic', kind: 'synthetic',
    trustedBindingMethods: list(config.trustedBindingMethods), trustedSourceKinds: list(config.trustedSourceKinds),
    trustedEnumerators: list(config.trustedEnumerators), registryPins: list(config.registryPins)
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Structural validation                                                                       */
/* ------------------------------------------------------------------------------------------ */

const OBS_KEYS = ['schema', 'factRef', 'subject', 'scope', 'status', 'value', 'absence', 'trust', 'provenance', 'bindings'];
const OBS_REQUIRED = ['schema', 'factRef', 'subject', 'scope', 'status', 'trust', 'provenance', 'bindings'];
const SUBJECT_KEYS = ['role', 'itemId', 'itemType', 'memberRef'];
const SCOPE_KEYS = ['basis', 'state'];
const PROV_KEYS = ['source', 'binding', 'transformation', 'zeroIsAuthored'];
const SOURCE_KEYS = ['kind', 'recordRef', 'path'];
const BINDING_KEYS = ['method', 'result'];
const TRANSFORMATION_KEYS = ['ruleRef', 'installationRecordRef'];
const BINDINGS_KEYS = ['contractRevision', 'registryHash', 'itemFingerprint'];

function onlyKeys(o, allowed, required, path, problems) {
  if (!isObj(o)) { problems.push(`${path}: object required`); return false; }
  for (const k of Object.keys(o)) if (!allowed.includes(k)) problems.push(`${path}: unexpected field ${k}`);
  for (const k of required) if (!hasOwn(o, k)) problems.push(`${path}: missing ${k}`);
  return true;
}

function allowedRoles(ref) {
  if (ref === 'item.type') return ['host', 'addedItem', 'payloadItem'];
  if (ref.startsWith('host.')) return ['host'];
  if (ref.startsWith('addedItem.')) return ['addedItem'];
  if (ref.startsWith('payload.')) return ['payloadItem'];
  if (ref.startsWith('use.')) return ['use'];
  if (ref.startsWith('compat:addedComponent')) return ['addedItem'];
  return ['host']; // remaining compat: checks are about the host
}

function valueProblems(ref, status, value, zeroIsAuthored) {
  if (status === 'unknown') return value === undefined ? [] : ['value present on an unknown observation'];
  if (status === 'absent') return ref === 'host.intelligenceScore' && value === undefined ? [] : ['absent is defined only for host.intelligenceScore and carries no value'];
  if (value === undefined) return ['known observation has no value'];
  if (ref.startsWith('compat:')) return typeof value === 'boolean' ? [] : ['compat evidence value must be a boolean'];
  const f = FACTS[ref];
  switch (f.kind) {
    case 'tri': return typeof value === 'boolean' ? [] : ['value must be the boolean true or false (unknown is a status, never a value)'];
    case 'enum': return f.domain.includes(value) ? [] : [`value outside the fact domain`];
    case 'set':
      return isObj(value) && Array.isArray(value.members) && typeof value.complete === 'boolean' && new Set(value.members).size === value.members.length && value.members.every((m) => f.domain.includes(m))
        && Object.keys(value).length === 2 ? [] : ['set value must be {members: unique domain values, complete: boolean}'];
    case 'int': return Number.isSafeInteger(value) && value >= 0 ? [] : ['value must be a non-negative integer'];
    case 'size': return SIZE_CATEGORIES.includes(value) ? [] : ['size must be an exact canonical category label (no case normalization here)'];
    case 'weight':
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return ['weight must be a finite non-negative number'];
      return value === 0 && zeroIsAuthored !== true ? ['a zero weight needs explicit authored provenance (a default zero is not evidence)'] : [];
    default: return ['fact is not an observation reference'];
  }
}

/** @returns {string[]} structural problems; empty means well-formed. */
export function validateObservationShape(obs) {
  const p = [];
  if (!onlyKeys(obs, OBS_KEYS, OBS_REQUIRED, 'observation', p)) return p;
  if (obs.schema !== EVIDENCE_SCHEMA_ID) p.push('observation: wrong schema id');
  if (!OBSERVATION_REFS.includes(obs.factRef)) { p.push('observation: factRef is not an observation reference'); return p; }
  if (onlyKeys(obs.subject, SUBJECT_KEYS, ['role', 'itemId', 'itemType'], 'subject', p)) {
    if (!ROLES.includes(obs.subject.role)) p.push('subject: unknown role');
    else if (!allowedRoles(obs.factRef).includes(obs.subject.role)) p.push('subject: role is not valid for this fact');
    if (!isStr(obs.subject.itemId)) p.push('subject: itemId required');
    if (!ITEM_TYPES.includes(obs.subject.itemType)) p.push('subject: unknown itemType');
    if (obs.subject.role === 'payloadItem' ? !isStr(obs.subject.memberRef) : hasOwn(obs.subject, 'memberRef')) p.push('subject: memberRef is required for payloadItem and forbidden otherwise');
  }
  if (onlyKeys(obs.scope, SCOPE_KEYS, SCOPE_KEYS, 'scope', p)) {
    if (!BASES.includes(obs.scope.basis)) p.push('scope: unknown basis');
    if (obs.scope.state !== null && !isStr(obs.scope.state)) p.push('scope: state must be null or a descriptor');
  }
  if (obs.factRef === 'item.type' && obs.status === 'known' && isObj(obs.subject) && obs.value !== obs.subject.itemType) p.push('observation: item.type value disagrees with subject.itemType');
  if (!INPUT_STATUSES.includes(obs.status)) p.push('observation: status must be known, absent or unknown');
  else p.push(...valueProblems(obs.factRef, obs.status, obs.value, obs.provenance?.zeroIsAuthored));
  if (obs.status === 'absent' ? !isObj(obs.absence) || !isStr(obs.absence.basis) || Object.keys(obs.absence).length !== 1 : hasOwn(obs, 'absence')) p.push('observation: absence evidence is required exactly when status is absent');
  if (!TRUST_CLASSES.includes(obs.trust)) p.push('observation: unknown trust class');
  if (onlyKeys(obs.provenance, PROV_KEYS, ['source', 'binding'], 'provenance', p)) {
    if (onlyKeys(obs.provenance.source, SOURCE_KEYS, SOURCE_KEYS, 'provenance.source', p)) {
      if (!SOURCE_KINDS.includes(obs.provenance.source.kind)) p.push('provenance.source: unknown kind');
      if (!isStr(obs.provenance.source.recordRef) || !isStr(obs.provenance.source.path)) p.push('provenance.source: recordRef and path required');
    }
    if (onlyKeys(obs.provenance.binding, BINDING_KEYS, BINDING_KEYS, 'provenance.binding', p)) {
      if (!BINDING_RESULTS.includes(obs.provenance.binding.result)) p.push('provenance.binding: unknown result');
      if (obs.provenance.binding.method !== null && !isStr(obs.provenance.binding.method)) p.push('provenance.binding: method must be null or a name');
    }
    const persistent = obs.scope?.basis === 'persistent';
    if (persistent ? !onlyKeys(obs.provenance.transformation, TRANSFORMATION_KEYS, TRANSFORMATION_KEYS, 'provenance.transformation', p) || !isStr(obs.provenance.transformation?.ruleRef) || !isStr(obs.provenance.transformation?.installationRecordRef)
      : hasOwn(obs.provenance, 'transformation')) p.push('provenance: a persistent observation needs a rule reference AND an installation record; other bases forbid a transformation');
    if (hasOwn(obs.provenance, 'zeroIsAuthored') && typeof obs.provenance.zeroIsAuthored !== 'boolean') p.push('provenance: zeroIsAuthored must be boolean');
  }
  if (onlyKeys(obs.bindings, BINDINGS_KEYS, BINDINGS_KEYS, 'bindings', p)) {
    if (!isStr(obs.bindings.contractRevision) || !isStr(obs.bindings.itemFingerprint)) p.push('bindings: contractRevision and itemFingerprint required');
    if (obs.bindings.registryHash !== null && !isStr(obs.bindings.registryHash)) p.push('bindings: registryHash must be null or a hash');
  }
  return p;
}

/* ------------------------------------------------------------------------------------------ */
/* Trust, corpus integrity and freshness                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * Shared checks for any evidence-bearing object. `ctx`: { authority, contractRevision, registryHash, itemFingerprints }.
 * @returns {{untrusted: string[], invalid: string[], stale: string[]}}
 */
function trustChecks({ issued, trust, basis, sourceKind, bindingMethod, bindingResult, bindings, itemId }, ctx, authority) {
  if (!authority) return { untrusted: ['unrecognized evidence authority (fails closed)'], invalid: [], stale: [] };
  const untrusted = [];
  const invalid = [];
  const stale = [];
  if (!ACCEPTED_TRUST.includes(trust)) untrusted.push(trust === 'attested' ? 'attestation is reserved and disabled' : `trust class ${trust} is not accepted`);
  if (basis === 'user-entered') untrusted.push('user-entered values are never evidence');
  if (!issued) untrusted.push('not issued by the evidence authority (a label is not proof)');
  if (!authority.trustedSourceKinds.includes(sourceKind)) untrusted.push(`source kind ${sourceKind} is not trusted by this authority`);
  if (BINDING_REQUIRED_KINDS.includes(sourceKind)) {
    if (bindingResult !== 'bound') untrusted.push(`item binding is ${bindingResult}`);
    else if (!authority.trustedBindingMethods.includes(bindingMethod)) untrusted.push('binding method is not trusted by this authority');
  }
  if (sourceKind === 'canonical-registry') {
    // corpus integrity is a separate proof from identity binding and freshness
    if (!isStr(ctx.registryHash) || !authority.registryPins.includes(ctx.registryHash)) invalid.push('registry corpus is not verified against a pinned hash');
    else if (bindings.registryHash !== ctx.registryHash) stale.push('registry hash differs from the verified corpus');
  }
  if (bindings.contractRevision !== ctx.contractRevision) stale.push('contract revision differs from the verified contract');
  const current = ctx.itemFingerprints?.[itemId];
  if (!isStr(current)) stale.push('no current item fingerprint to verify freshness');
  else if (bindings.itemFingerprint !== current) stale.push('item fingerprint differs from the current item');
  return { untrusted, invalid, stale };
}

function verdictOf(checks, extraInvalid = []) {
  const reasons = new Set();
  const invalid = [...extraInvalid, ...checks.invalid];
  if (invalid.length) reasons.add('HOST_PROVENANCE_INVALID');
  if (checks.untrusted.length) reasons.add('HOST_FACT_UNTRUSTED');
  if (checks.stale.length) reasons.add('HOST_PROVENANCE_STALE');
  const status = invalid.length ? 'invalid' : checks.untrusted.length ? 'untrusted' : checks.stale.length ? 'stale' : 'trusted';
  return { status, reasons: [...reasons].sort(), detail: [...invalid, ...checks.untrusted, ...checks.stale] };
}

/**
 * Classifies one observation. `usable` is true only for a well-formed, authority-issued, fresh, trusted `known` or `absent`
 * observation. An `unknown` observation carries no evidence and is never usable.
 */
export function classifyObservation(obs, ctx = {}) {
  const authority = authorityState(ctx);
  const problems = validateObservationShape(obs);
  if (problems.length) return { status: 'invalid', usable: false, reasons: ['HOST_PROVENANCE_INVALID'], detail: problems, synthetic: false, productionTrusted: false };
  if (obs.status === 'unknown') return { status: 'unknown', usable: false, reasons: [], detail: [], synthetic: false, productionTrusted: false };
  const checks = trustChecks({
    issued: authority?.issuedObservations.has(obs) === true, trust: obs.trust, basis: obs.scope.basis, sourceKind: obs.provenance.source.kind,
    bindingMethod: obs.provenance.binding.method, bindingResult: obs.provenance.binding.result, bindings: obs.bindings, itemId: obs.subject.itemId
  }, ctx, authority);
  const v = verdictOf(checks);
  const usable = v.status === 'trusted';
  return { status: usable ? obs.status : v.status, usable, reasons: v.reasons, detail: v.detail, synthetic: usable && authority.synthetic, productionTrusted: usable && authority.kind === 'production' };
}

/* ------------------------------------------------------------------------------------------ */
/* Item-level persistent-change declarations                                                   */
/* ------------------------------------------------------------------------------------------ */

const ITEM_STATE_BINDING_KEYS = ['contractRevision', 'itemFingerprint'];
const ITEM_STATE_KEYS = ['schema', 'itemId', 'persistentChanges', 'trust', 'provenance', 'bindings'];

/** Declares whether an Item carries unresolved persistent changes. Needed so a modified Item never silently falls back to base statistics. */
export function classifyItemState(decl, ctx = {}) {
  const authority = authorityState(ctx);
  const p = [];
  if (onlyKeys(decl, ITEM_STATE_KEYS, ITEM_STATE_KEYS, 'itemState', p)) {
    if (decl.schema !== EVIDENCE_SCHEMA_ID) p.push('itemState: wrong schema id');
    if (!isStr(decl.itemId)) p.push('itemState: itemId required');
    if (!PERSISTENT_CHANGE_STATES.includes(decl.persistentChanges)) p.push('itemState: unknown persistentChanges');
    if (!TRUST_CLASSES.includes(decl.trust)) p.push('itemState: unknown trust class');
    if (onlyKeys(decl.provenance, ['source', 'binding'], ['source', 'binding'], 'itemState.provenance', p)) {
      if (!onlyKeys(decl.provenance.source, SOURCE_KEYS, SOURCE_KEYS, 'itemState.provenance.source', p) || !SOURCE_KINDS.includes(decl.provenance.source.kind)) p.push('itemState: source kind invalid');
      if (!onlyKeys(decl.provenance.binding, BINDING_KEYS, BINDING_KEYS, 'itemState.provenance.binding', p) || !BINDING_RESULTS.includes(decl.provenance.binding.result)) p.push('itemState: binding invalid');
    }
    if (onlyKeys(decl.bindings, ITEM_STATE_BINDING_KEYS, ITEM_STATE_BINDING_KEYS, 'itemState.bindings', p) && (!isStr(decl.bindings.contractRevision) || !isStr(decl.bindings.itemFingerprint))) p.push('itemState: bindings incomplete');
  }
  if (p.length) return { status: 'invalid', usable: false, reasons: ['HOST_PROVENANCE_INVALID'], detail: p };
  const checks = trustChecks({
    issued: authority?.issuedObservations.has(decl) === true, trust: decl.trust, basis: 'base', sourceKind: decl.provenance.source.kind,
    bindingMethod: decl.provenance.binding.method, bindingResult: decl.provenance.binding.result, bindings: { ...decl.bindings, registryHash: null }, itemId: decl.itemId
  }, ctx, authority);
  const v = verdictOf(checks);
  return { status: v.status, usable: v.status === 'trusted', reasons: v.reasons, detail: v.detail, persistentChanges: v.status === 'trusted' ? decl.persistentChanges : null };
}

/* ------------------------------------------------------------------------------------------ */
/* Observation sets and resolution                                                             */
/* ------------------------------------------------------------------------------------------ */

/** Module-private storage for ObservationSets. A set is authentic only if it is a key of this map. */
const SET_STATE = new WeakMap();

const cloneOrNull = (v) => { try { return deepFreeze(structuredClone(v)); } catch { return null; } };
const invalidResult = (detail) => ({ status: 'invalid', usable: false, reasons: ['HOST_PROVENANCE_INVALID'], detail: [detail], synthetic: false, productionTrusted: false });

/**
 * Classifies every input once, at construction (the context is read only then and never stored), and keeps defensive frozen copies of the inputs and of
 * the classification results in private storage. The returned object is an opaque handle: it carries no evidence and nothing the
 * caller does to it, to the inputs or to the context afterwards can change a stored decision.
 * @param {{observations?: object[], itemStates?: object[]}} input
 * @param {object} ctx { authority, contractRevision, registryHash, itemFingerprints }
 */
export function createObservationSet({ observations = [], itemStates = [] } = {}, ctx = {}) {
  let entries = observations.map((o) => {
    const copy = cloneOrNull(o);
    return { observation: copy, result: copy === null ? invalidResult('observation is not cloneable') : classifyObservation(o, ctx) };
  });
  // Item type must have one representation per Item document: conflicting claims invalidate every claim about that document.
  const types = new Map();
  for (const e of entries) {
    if (!e.observation || e.result.status === 'invalid') continue;
    const id = e.observation.subject.itemId;
    types.set(id, new Set([...(types.get(id) ?? []), e.observation.subject.itemType]));
  }
  entries = entries.map((e) => {
    const conflict = e.observation && e.result.status !== 'invalid' && types.get(e.observation.subject.itemId).size > 1;
    return Object.freeze({ observation: e.observation, result: deepFreeze(conflict ? invalidResult('inconsistent itemType for one Item document') : e.result) });
  });
  const states = itemStates.map((d) => {
    const copy = cloneOrNull(d);
    return Object.freeze({ decl: copy, result: deepFreeze(copy === null ? invalidResult('item state is not cloneable') : classifyItemState(d, ctx)) });
  });
  const handle = Object.freeze({ entryCount: entries.length, stateCount: states.length });
  SET_STATE.set(handle, Object.freeze({ entries: Object.freeze(entries), states: Object.freeze(states) }));
  return handle;
}

export const isObservationSet = (v) => isObj(v) && SET_STATE.has(v);

/** A deep copy of the stored classification (for inspection and tests); throws for anything that is not an authentic set. */
export function describeObservationSet(set) {
  const st = isObj(set) ? SET_STATE.get(set) : undefined;
  if (!st) throw new TypeError('not an authentic ObservationSet');
  return structuredClone({
    entries: st.entries.map((e) => ({ factRef: e.observation?.factRef ?? null, result: e.result })),
    states: st.states.map((x) => ({ itemId: x.decl?.itemId ?? null, result: x.result }))
  });
}

const sortUnique = (a) => [...new Set(a)].sort();

/**
 * Resolves ONE fact for ONE subject under an explicit basis. There is no fallback between bases: a request for `persistent`
 * never answers from `base`, and an installation-eligibility request never uses `base` for an Item whose persistent changes
 * are not proven to be `none`.
 * @returns {{status:'known'|'absent'|'unknown'|'contradictory', value?:any, reasons:string[], detail:string[], evidence:object[]}}
 */
export function resolveFact(set, { factRef, subject, requestedBasis, purpose, state = null } = {}) {
  if (!OBSERVATION_REFS.includes(factRef)) throw new TypeError('resolveFact: unknown factRef');
  if (!isObj(subject) || !ROLES.includes(subject.role) || !isStr(subject.itemId)) throw new TypeError('resolveFact: subject {role,itemId[,memberRef]} required');
  if (!RESOLVABLE_BASES.includes(requestedBasis)) throw new TypeError('resolveFact: requestedBasis must be base, persistent or effective (never implicit)');
  if (!PURPOSES.includes(purpose)) throw new TypeError('resolveFact: purpose must be printed-statistics or installation-eligibility');
  const st = isObj(set) ? SET_STATE.get(set) : undefined;
  if (!st) throw new TypeError('resolveFact: not an authentic ObservationSet');
  const familyUnknown = UNKNOWN_CODE[factRef];
  const unknown = (reasons, detail) => ({ status: 'unknown', reasons: sortUnique([familyUnknown, ...reasons]), detail, evidence: [] });

  // The applicable basis must be established for the Item itself before any base or persistent value may be used.
  if (purpose === 'installation-eligibility') {
    const declared = st.states.filter((s) => s.decl && s.decl.itemId === subject.itemId);
    const trusted = declared.filter((s) => s.result.usable);
    const stateValue = trusted.length === 1 ? trusted[0].result.persistentChanges : trusted.length > 1 && trusted.every((s) => s.result.persistentChanges === trusted[0].result.persistentChanges) ? trusted[0].result.persistentChanges : null;
    const need = requestedBasis === 'base' ? 'none' : requestedBasis === 'persistent' ? 'resolved' : null;
    if (requestedBasis === 'effective' || stateValue !== need) {
      const extra = declared.flatMap((s) => s.result.reasons);
      return unknown(extra, [`applicable basis unresolved: item persistent-change state is ${stateValue ?? 'unknown'}; ${requestedBasis} requires ${need ?? 'an effective-state policy'}`]);
    }
  }

  const same = st.entries.filter((e) => e.observation && e.observation.factRef === factRef && e.observation.subject.role === subject.role && e.observation.subject.itemId === subject.itemId
    && (e.observation.subject.memberRef ?? null) === (subject.memberRef ?? null) && e.observation.scope.basis === requestedBasis && (e.observation.scope.state ?? null) === state);
  const usable = same.filter((e) => e.result.usable);
  const rejected = same.filter((e) => !e.result.usable && e.result.status !== 'unknown');
  if (usable.length === 0) return unknown(rejected.flatMap((e) => e.result.reasons), rejected.flatMap((e) => e.result.detail));

  const distinct = [];
  for (const e of usable) if (!distinct.some((d) => jsonEqual({ s: d.observation.status, v: d.observation.value }, { s: e.observation.status, v: e.observation.value }))) distinct.push(e);
  const evidence = usable.map((e) => ({ factRef, role: subject.role, itemId: subject.itemId, memberRef: subject.memberRef ?? null, basis: requestedBasis, recordRef: e.observation.provenance.source.recordRef, path: e.observation.provenance.source.path }))
    .sort((a, b) => (a.recordRef + a.path < b.recordRef + b.path ? -1 : 1));
  if (distinct.length > 1) {
    // Genuine contradiction: two TRUSTED observations of the same fact, subject and applicable state that disagree.
    return { status: 'contradictory', reasons: ['HOST_EVIDENCE_CONTRADICTORY'], detail: ['trusted observations of the same key disagree'], evidence };
  }
  const o = distinct[0].observation;
  return o.status === 'absent'
    ? { status: 'absent', reasons: [], detail: [], evidence }
    : { status: 'known', value: structuredClone(o.value), reasons: [], detail: [], evidence };
}

/* ------------------------------------------------------------------------------------------ */
/* Collections: membership, physical quantity, verified completeness                           */
/* ------------------------------------------------------------------------------------------ */

const COLLECTION_KEYS = ['schema', 'role', 'hostItemId', 'members', 'completeness', 'trust', 'provenance', 'bindings', 'fingerprint'];
const MEMBER_KEYS = ['memberRef', 'itemId', 'itemType', 'quantity'];
const COMPLETENESS_KEYS = ['status', 'basis', 'enumerator'];
const COLL_BINDING_KEYS = ['contractRevision', 'hostFingerprint'];

/** The fingerprint a snapshot must carry: a hash of its members and completeness claim. */
export const collectionFingerprint = (snapshot) => fingerprintOf({ role: snapshot.role, hostItemId: snapshot.hostItemId, members: snapshot.members, completeness: snapshot.completeness });

/**
 * Classifies a payload CollectionSnapshot. Document identity (`itemId`), collection membership (`memberRef`) and PHYSICAL quantity
 * are separate: one Item document may represent several physical objects, so the document count is never the object count.
 * Completeness is verified only when the snapshot is authority-issued AND the enumerator is trusted; a caller-declared completeness
 * claim is carried as a claim and counts for nothing.
 */
export function classifyCollection(snapshot, ctx = {}) {
  const authority = authorityState(ctx);
  const p = [];
  if (onlyKeys(snapshot, COLLECTION_KEYS, COLLECTION_KEYS, 'collection', p)) {
    if (snapshot.schema !== EVIDENCE_SCHEMA_ID) p.push('collection: wrong schema id');
    if (snapshot.role !== 'payload') p.push('collection: role must be payload');
    if (!isStr(snapshot.hostItemId)) p.push('collection: hostItemId required');
    if (!TRUST_CLASSES.includes(snapshot.trust)) p.push('collection: unknown trust class');
    if (!Array.isArray(snapshot.members)) p.push('collection: members must be an array');
    else {
      const refs = new Set();
      const docs = new Set();
      snapshot.members.forEach((m, i) => {
        if (!onlyKeys(m, MEMBER_KEYS, MEMBER_KEYS, `members[${i}]`, p)) return;
        if (!isStr(m.memberRef) || !isStr(m.itemId) || !ITEM_TYPES.includes(m.itemType)) p.push(`members[${i}]: memberRef, itemId and itemType required`);
        if (refs.has(m.memberRef)) p.push(`members[${i}]: duplicate memberRef`);
        if (docs.has(m.itemId)) p.push(`members[${i}]: duplicate item document`);
        refs.add(m.memberRef); docs.add(m.itemId);
        const q = m.quantity;
        if (!onlyKeys(q, ['status', 'value'], ['status'], `members[${i}].quantity`, p)) return;
        if (q.status === 'known' ? !Number.isSafeInteger(q.value) || q.value < 1 : q.status !== 'unknown' || hasOwn(q, 'value')) p.push(`members[${i}]: quantity must be {status:'known', value: integer >= 1} or {status:'unknown'}`);
      });
    }
    if (onlyKeys(snapshot.completeness, COMPLETENESS_KEYS, COMPLETENESS_KEYS, 'completeness', p)) {
      if (!COMPLETENESS_STATUSES.includes(snapshot.completeness.status)) p.push('completeness: unknown status');
      if (!COMPLETENESS_BASES.includes(snapshot.completeness.basis)) p.push('completeness: unknown basis');
      if (snapshot.completeness.enumerator !== null && !isStr(snapshot.completeness.enumerator)) p.push('completeness: enumerator must be null or a name');
    }
    if (onlyKeys(snapshot.provenance, ['source', 'binding'], ['source', 'binding'], 'collection.provenance', p)) {
      if (!onlyKeys(snapshot.provenance.source, SOURCE_KEYS, SOURCE_KEYS, 'collection.provenance.source', p) || !SOURCE_KINDS.includes(snapshot.provenance.source.kind)) p.push('collection: source kind invalid');
      if (!onlyKeys(snapshot.provenance.binding, BINDING_KEYS, BINDING_KEYS, 'collection.provenance.binding', p) || !BINDING_RESULTS.includes(snapshot.provenance.binding.result)) p.push('collection: binding invalid');
    }
    if (onlyKeys(snapshot.bindings, COLL_BINDING_KEYS, COLL_BINDING_KEYS, 'collection.bindings', p) && (!isStr(snapshot.bindings.contractRevision) || !isStr(snapshot.bindings.hostFingerprint))) p.push('collection: bindings incomplete');
    if (p.length === 0) {
      const total = snapshot.members.reduce((a, m) => a + (m.quantity.status === 'known' ? m.quantity.value : 1), 0);
      if (!Number.isSafeInteger(total)) p.push('collection: aggregate physical quantity exceeds the safe integer range');
    }
    if (p.length === 0 && snapshot.fingerprint !== collectionFingerprint(snapshot)) p.push('collection: fingerprint does not match its content');
  }
  const none = { synthetic: false, productionTrusted: false, documentCount: 0, physicalObjects: { status: 'unknown', value: null }, completeness: { verified: false, claimed: null } };
  if (p.length) return { status: 'invalid', usable: false, reasons: ['HOST_PROVENANCE_INVALID'], detail: p, members: [], ...none };

  const checks = trustChecks({
    issued: authority?.issuedCollections.has(snapshot) === true, trust: snapshot.trust, basis: 'base', sourceKind: snapshot.provenance.source.kind,
    bindingMethod: snapshot.provenance.binding.method, bindingResult: snapshot.provenance.binding.result,
    bindings: { contractRevision: snapshot.bindings.contractRevision, registryHash: null, itemFingerprint: snapshot.bindings.hostFingerprint }, itemId: snapshot.hostItemId
  }, ctx, authority);
  const v = verdictOf(checks);
  const claimed = snapshot.completeness.status;
  if (v.status !== 'trusted') return { status: v.status, usable: false, reasons: v.reasons, detail: v.detail, members: [], ...none, completeness: { verified: false, claimed } };

  const completeVerified = claimed === 'complete' && snapshot.completeness.basis === 'system-enumerated' && authority.trustedEnumerators.includes(snapshot.completeness.enumerator);
  const reasons = completeVerified || claimed !== 'complete' ? [] : ['HOST_FACT_UNTRUSTED'];
  const detail = claimed === 'complete' && !completeVerified ? ['completeness claim is not from a trusted system enumerator'] : [];
  const q = snapshot.members.map((m) => (m.quantity.status === 'known' ? m.quantity.value : null));
  const known = q.filter((x) => x !== null).reduce((a, b) => a + b, 0);
  const unknownQty = q.filter((x) => x === null).length;
  // At least one physical object per member; the exact object count needs every quantity known AND verified completeness.
  const physicalObjects = completeVerified && unknownQty === 0 ? { status: 'exact', value: known } : { status: 'lowerBound', value: known + unknownQty };
  return {
    status: 'trusted', usable: true, reasons, detail, synthetic: authority.synthetic, productionTrusted: authority.kind === 'production',
    members: snapshot.members.map((m) => ({ memberRef: m.memberRef, itemId: m.itemId, itemType: m.itemType, quantity: structuredClone(m.quantity) })),
    documentCount: snapshot.members.length, physicalObjects, completeness: { verified: completeVerified, claimed }
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Verified T4c contract binding                                                               */
/* ------------------------------------------------------------------------------------------ */

const VERIFIED_CONTRACTS = new WeakSet();

/**
 * Verifies a T4c sidecar bundle with the certified T4c validator (pin, oracle, schema parity, source census) and, only on success,
 * returns a frozen VerifiedContract. A future evaluator accepts only such an object, so arbitrary caller-supplied records labelled
 * "validated" cannot be evaluated. All inputs are injected; nothing is read here.
 * @returns {{ok:boolean, failures:object[], contract:object|null}}
 */
export function verifyContractBundle(inputs, { pin = PINNED_HOST_REQUIREMENTS_SHA256 } = {}) {
  const result = validateHostRequirements(inputs, { pin });
  if (!result.ok) return { ok: false, failures: result.failures, contract: null };
  const byId = {};
  for (const r of inputs.sidecar.records) byId[r.typedDefinitionId] = deepFreeze(structuredClone(r));
  const contract = deepFreeze({ schema: inputs.sidecar.schema, revision: inputs.sidecar.revision, records: byId, ids: Object.keys(byId).sort() });
  VERIFIED_CONTRACTS.add(contract);
  return { ok: true, failures: [], contract };
}

export const isVerifiedContract = (c) => isObj(c) && VERIFIED_CONTRACTS.has(c);

/** The frozen record of a verified contract; throws for anything that was not produced by verifyContractBundle. */
export function getVerifiedRecord(contract, typedDefinitionId) {
  if (!isVerifiedContract(contract)) throw new TypeError('not a verified T4c contract');
  return hasOwn(contract.records, typedDefinitionId) ? contract.records[typedDefinitionId] : null;
}
