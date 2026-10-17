// D-005 T4c: offline static validation of the structured host-requirements sidecar
// (data/modifications/host-requirements-v1.json, schema id swse.modification.host-requirements/1).
//
// STATIC CONTRACT VALIDATION ONLY. This module is not a host evaluator: it never decides whether an Item satisfies a
// requirement, never reads Item data, never produces legal / illegal / not_established, and is imported by nothing at
// runtime. It checks that the contract artifact is structurally exact, linked to the committed D005 published-fact
// records, consistent with the immutable v1.5 registry's domain entries, canonically serialized and independently pinned.
//
// Authority: docs/audits/d-005-t4c-owner-decisions.md (T4C-D01..D12, T4C-F01..F11, Amendments A1 and A2).
// Pure: no filesystem, no Foundry. The CLI (tools/validate-host-requirements.mjs) supplies the bytes.
//
// Validator failure codes here (HRV_*) are authoring/validation errors. They are unrelated to the 32 runtime diagnostic
// codes of the owner-decisions record and to the G3 framework reason codes.

import { canonicalJson, sha256, jsonEqual } from './modification-runtime.mjs';
import { checkJsonSchema } from './mini-json-schema.mjs';

export const HOST_REQUIREMENTS_SCHEMA_ID = 'swse.modification.host-requirements/1';
export const HOST_REQUIREMENTS_PATH = 'data/modifications/host-requirements-v1.json';
export const HOST_REQUIREMENTS_SCHEMA_PATH = 'data/modifications/schemas/host-requirements-v1.schema.json';
export const OWNER_DECISIONS_PATH = 'docs/audits/d-005-t4c-owner-decisions.md';

/**
 * Independently maintained trusted pin: SHA-256 of the canonical serialization (canonicalJson) of the sidecar `records`
 * array ONLY. It is deliberately separate from PINNED_SCOPE_SHA256 (modification-runtime.mjs), which this file never
 * touches. A legitimate change to the sidecar requires an explicit, reviewable update of this constant. A self-reported
 * `revision` inside the sidecar is never trusted on its own.
 */
export const PINNED_HOST_REQUIREMENTS_SHA256 = 'b5f8c7aab8cc5409ab0d24d0a033189ba6542f3c665da659a0c75a151dcf76b8';

/* ------------------------------------------------------------------------------------------ */
/* Closed vocabularies (T4C-D04, T4C-F08, Amendment A1/A2)                                     */
/* ------------------------------------------------------------------------------------------ */

export const GROUPS = Object.freeze(['install', 'use', 'payload']);
export const GROUP_FIELD = Object.freeze({ install: 'installRequirements', use: 'useRequirements', payload: 'payloadRequirements' });

export const SIZE_CATEGORIES = Object.freeze(['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal']);

export const OPERATORS = Object.freeze([
  'bool.equals', 'enum.in', 'enum.intersects', 'int.explicit', 'size.not_larger',
  'size.smaller_by_at_least', 'weight.sum_lt', 'count.at_most', 'compat.evidenced'
]);

/** Fixed key order for each predicate shape (strict: no unexpected fields, canonical order). */
export const PREDICATE_KEYS = Object.freeze({
  'bool.equals': ['op', 'fact', 'value', 'authority'],
  'enum.in': ['op', 'fact', 'allowed', 'authority'],
  'enum.intersects': ['op', 'fact', 'allowed', 'authority'],
  'int.explicit': ['op', 'fact', 'authority'],
  'size.not_larger': ['op', 'left', 'right', 'authority'],
  'size.smaller_by_at_least': ['op', 'left', 'right', 'steps', 'authority'],
  'weight.sum_lt': ['op', 'items', 'limit', 'authority'],
  'count.at_most': ['op', 'collection', 'max', 'authority'],
  'compat.evidenced': ['op', 'check', 'authority', 'evidenceMethod']
});

/** Where each operator may appear (T4C-D03, T4C-F03, Amendment A1: count.at_most is payload-only). */
export const OPERATOR_GROUPS = Object.freeze({
  'bool.equals': ['install', 'use'],
  'enum.in': ['install', 'use'],
  'enum.intersects': ['install', 'use'],
  'int.explicit': ['install'],
  'size.not_larger': ['install'],
  'size.smaller_by_at_least': ['payload'],
  'weight.sum_lt': ['payload'],
  'count.at_most': ['payload'],
  'compat.evidenced': ['install', 'use', 'payload']
});

/**
 * Closed fact vocabulary: references only. The sidecar stores no observed value for any of these (T4C-D06).
 *  kind: tri  - true | false | unknown at runtime; a static predicate may only name the boolean true/false literal
 *        enum - enumerated; `domain` lists the values a predicate may name ('unknown' is a runtime state, never an operand)
 *        set  - set-valued; `domain` lists the values a predicate may name
 */
export const FACTS = Object.freeze({
  'item.type': { kind: 'enum', domain: ['weapon', 'armor', 'equipment'], groups: [] },
  'host.powerSourceTypes': { kind: 'set', domain: ['energy-cell', 'power-pack'], groups: ['install', 'use'] },
  'host.intelligenceScore': { kind: 'int', groups: ['install'] },
  'host.droidStatus': { kind: 'enum', domain: ['droid', 'nondroid'], groups: ['install', 'use'] },
  'host.oneHandedHandheld': { kind: 'tri', groups: ['install', 'use'] },
  'host.functionRestrictable': { kind: 'tri', groups: ['install', 'use'] },
  'host.remotelyActivatableFunction': { kind: 'tri', groups: ['install', 'use'] },
  'use.attunedGauntletForHost': { kind: 'tri', groups: ['use'] },
  'host.sizeCategory': { kind: 'size', groups: ['install', 'payload'] },
  'addedItem.sizeCategory': { kind: 'size', groups: ['install'] },
  'payload.sizeCategory': { kind: 'size', groups: ['payload'] },
  'host.weightKg': { kind: 'weight', groups: ['payload'] },
  'payload.weightKg': { kind: 'weight', groups: ['payload'] },
  'payload.items': { kind: 'collection', groups: ['payload'] }
});

/** Closed compatibility-check list for compat.evidenced, each scoped to the parent upgrade(s) that may name it (§4.3). */
export const COMPATIBILITY_CHECKS = Object.freeze({
  canConcealCheater: { groups: ['install'], parents: ['sv-cheater'] },
  canFitElectrograppleHandle: { groups: ['install'], parents: ['sv-electrograpple-handle'] },
  canAccommodateHiddenCompartment: { groups: ['install'], parents: ['sv-secret-compartment'] },
  canCarryPayload: { groups: ['install'], parents: ['sv-storage-capacity'] },
  addedComponentQualifiesAsEquipment: { groups: ['install'], parents: ['sv-dual-gear'] },
  addedComponentPhysicalFit: { groups: ['install'], parents: ['sv-dual-gear'] }
});

export const AUTHORITY_KINDS = Object.freeze(['PUBLISHED_RULE', 'OWNER_ENGINEERING_CHECK']);
export const DOMAIN_VERDICTS = Object.freeze(['SUPPORTED', 'CONDITIONALLY_SUPPORTED']);
export const STACKING_FACTS = Object.freeze(['NOT_SPECIFIED_BY_SOURCE', 'EXPLICITLY_REPEATABLE', 'ADVANCED_REPLACES_BASIC_NO_STACKING']);
export const NAHP_STATEMENT = 'No additional host prerequisite is stated by the published source.';
export const TYPED_DOMAINS = Object.freeze(['equipment', 'weapon', 'armor']);

const ROOT_KEYS = ['schema', 'revision', 'records'];
const RECORD_KEYS = ['typedDefinitionId', 'upgradeLabel', 'domain', 'sourceSpecId', 'source', 'domainVerdict', 'installRequirements', 'noAdditionalHostPrerequisite', 'useRequirements', 'payloadRequirements', 'effectReferences', 'stacking'];
const SOURCE_KEYS = ['bookId', 'printedPage'];
const SOURCE_KEYS_CONT = ['bookId', 'printedPage', 'continuesOnPage'];
const PUBLISHED_KEYS = ['kind', 'sourceSpecId', 'printedPage'];
const OWNER_KEYS = ['kind', 'ownerRulingIds'];
const NAHP_KEYS = ['declared', 'statement', 'sourceSpecId', 'printedPage'];
const EFFECT_KEYS = ['label', 'sourceSpecId'];
const STACKING_KEYS = ['fact', 'maxPerHost', 'sourceSpecId'];
const BOOK_ID = 'scum-and-villainy';
const REGISTRY_APPLICABLE = 'CONDITIONAL_UNVERIFIED';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isInt = (v) => Number.isInteger(v);
const byteCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);


/* ------------------------------------------------------------------------------------------ */
/* The approved mapping oracle (owner-decisions record section 4.4, Amendments A1 and A2)      */
/* ------------------------------------------------------------------------------------------ */

/**
 * APPROVED_MAPPING: the single, frozen, offline-only oracle of what each of the 35 typed definitions' record must be.
 * The validator enforces it exactly (HRV_MAPPING), so a sidecar edit that is internally consistent -- even with an updated
 * revision and pin -- is still rejected when it departs from the approved mapping. It is NOT a second rule source for any
 * runtime: nothing imports it outside tools/ and tests/. Tests cross-check it independently against the owner-decisions
 * record (section 4.4 table) and against the committed D005 published-facts records; there is no other copy of this table.
 */
const PARENT_MAPPING = {
  'sv-cheater': { label: 'Cheater', page: 40, verdict: 'SUPPORTED', domains: ['equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Cheating and concealment effects depend on the device and the circumstances of use', install: [{ op: 'compat.evidenced', check: 'canConcealCheater', owners: ['T4C-D05'] }] },
  'sv-cloaked': { label: 'Cloaked', page: 40, verdict: 'SUPPORTED', domains: ['weapon', 'armor', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Signature, sound and appearance effects differ by host type', install: [] },
  'sv-dual-gear': { label: 'Dual Gear', page: 41, verdict: 'SUPPORTED', domains: ['equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Combined-function and simultaneous-use effects, and added-item price', install: [{ op: 'size.not_larger', left: 'addedItem.sizeCategory', right: 'host.sizeCategory' }, { op: 'compat.evidenced', check: 'addedComponentQualifiesAsEquipment', owners: ['T4C-D05', 'T4C-F09'] }, { op: 'compat.evidenced', check: 'addedComponentPhysicalFit', owners: ['T4C-D05', 'T4C-F09'] }] },
  'sv-electrograpple-handle': { label: 'Electrograpple Handle', page: 41, verdict: 'SUPPORTED', domains: ['weapon', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Retrieval and restrained-equipment effects', install: [{ op: 'compat.evidenced', check: 'canFitElectrograppleHandle', owners: ['T4C-D05'] }], use: [{ op: 'bool.equals', fact: 'use.attunedGauntletForHost', value: true }] },
  'sv-environmental-sealing': { label: 'Environmental Sealing', page: 41, verdict: 'SUPPORTED', domains: ['weapon', 'armor', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Item-level environmental protection effects', install: [] },
  'sv-extra-power-source': { label: 'Extra Power Source', page: 41, verdict: 'CONDITIONALLY_SUPPORTED', domains: ['weapon', 'armor', 'equipment'], stacking: 'EXPLICITLY_REPEATABLE', effect: 'Additional power supply effect', install: [{ op: 'enum.intersects', fact: 'host.powerSourceTypes', allowed: ['energy-cell', 'power-pack'] }] },
  'sv-memory-upgrade': { label: 'Memory Upgrade', page: 41, verdict: 'CONDITIONALLY_SUPPORTED', domains: ['equipment'], stacking: 'ADVANCED_REPLACES_BASIC_NO_STACKING', effect: 'Intelligence and data-storage effects', install: [{ op: 'int.explicit', fact: 'host.intelligenceScore' }, { op: 'enum.in', fact: 'host.droidStatus', allowed: ['nondroid'] }] },
  'sv-memory-upgrade-advanced': { label: 'Memory Upgrade, Advanced', page: 41, verdict: 'CONDITIONALLY_SUPPORTED', domains: ['equipment'], stacking: 'ADVANCED_REPLACES_BASIC_NO_STACKING', effect: 'Intelligence and data-storage effects that replace the basic version', install: [{ op: 'int.explicit', fact: 'host.intelligenceScore' }, { op: 'enum.in', fact: 'host.droidStatus', allowed: ['nondroid'] }] },
  'sv-miniaturized': { label: 'Miniaturized', page: 41, verdict: 'SUPPORTED', domains: ['weapon', 'armor', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Weight and size effects, and the melee-weapon damage consequence', install: [] },
  'sv-recognition-system': { label: 'Recognition System', page: 41, verdict: 'SUPPORTED', domains: ['weapon', 'armor', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Authorized-user restriction, bypass and owner-deactivation effects', install: [{ op: 'bool.equals', fact: 'host.functionRestrictable', value: true }] },
  'sv-remote-activation': { label: 'Remote Activation', page: 41, verdict: 'CONDITIONALLY_SUPPORTED', domains: ['weapon', 'armor', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Remote signal, action and security effects', install: [{ op: 'bool.equals', fact: 'host.remotelyActivatableFunction', value: true }] },
  'sv-secret-compartment': { label: 'Secret Compartment', page: 41, continuesOnPage: 42, verdict: 'CONDITIONALLY_SUPPORTED', domains: ['weapon', 'armor', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Concealment and detection effects', install: [{ op: 'compat.evidenced', check: 'canAccommodateHiddenCompartment', owners: ['T4C-D05'] }], payload: [{ op: 'size.smaller_by_at_least', left: 'payload.sizeCategory', right: 'host.sizeCategory', steps: 1 }, { op: 'count.at_most', collection: 'payload.items', max: 1 }] },
  'sv-silverplate': { label: 'Silverplate', page: 42, verdict: 'SUPPORTED', domains: ['weapon', 'armor', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Object protection and related effects; outside host-eligibility scope, see the source record', install: [] },
  'sv-spring-loaded': { label: 'Spring Loaded', page: 42, verdict: 'CONDITIONALLY_SUPPORTED', domains: ['weapon', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Presentation and drawing effects; outside host-eligibility scope, see the source record', install: [{ op: 'bool.equals', fact: 'host.oneHandedHandheld', value: true }] },
  'sv-storage-capacity': { label: 'Storage Capacity', page: 42, verdict: 'CONDITIONALLY_SUPPORTED', domains: ['weapon', 'armor', 'equipment'], stacking: 'NOT_SPECIFIED_BY_SOURCE', effect: 'Compartment and storage effects', install: [{ op: 'compat.evidenced', check: 'canCarryPayload', owners: ['T4C-D05'] }], payload: [{ op: 'size.smaller_by_at_least', left: 'payload.sizeCategory', right: 'host.sizeCategory', steps: 1 }, { op: 'weight.sum_lt', items: 'payload.weightKg', limit: 'host.weightKg' }] }
};

function expandPredicate(t, specId, page) {
  const authority = { kind: 'PUBLISHED_RULE', sourceSpecId: specId, printedPage: page };
  const { op, owners, ...operands } = t;
  const ordered = {};
  for (const k of PREDICATE_KEYS[op]) {
    if (k === 'op') ordered.op = op;
    else if (k === 'authority') ordered.authority = authority;
    else if (k === 'evidenceMethod') ordered.evidenceMethod = { kind: 'OWNER_ENGINEERING_CHECK', ownerRulingIds: [...owners] };
    else ordered[k] = operands[k];
  }
  return ordered;
}

function deepFreeze(v) {
  if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); }
  return v;
}

function expandMapping() {
  const out = {};
  for (const [parent, m] of Object.entries(PARENT_MAPPING)) {
    for (const domain of m.domains) {
      const id = `${parent}::${domain}`;
      const specId = `D005::${id}`;
      const install = (m.install ?? []).map((t) => expandPredicate(t, specId, m.page));
      const source = { bookId: BOOK_ID, printedPage: m.page };
      if (m.continuesOnPage) source.continuesOnPage = m.continuesOnPage;
      out[id] = {
        typedDefinitionId: id, upgradeLabel: m.label, domain, sourceSpecId: specId, source, domainVerdict: m.verdict,
        installRequirements: install,
        noAdditionalHostPrerequisite: install.length === 0 ? { declared: true, statement: NAHP_STATEMENT, sourceSpecId: specId, printedPage: m.page } : null,
        useRequirements: (m.use ?? []).map((t) => expandPredicate(t, specId, m.page)),
        payloadRequirements: (m.payload ?? []).map((t) => expandPredicate(t, specId, m.page)),
        effectReferences: [{ label: m.effect, sourceSpecId: specId }],
        stacking: { fact: m.stacking, maxPerHost: null, sourceSpecId: specId }
      };
    }
  }
  return out;
}

/** typedDefinitionId -> the exact record the sidecar must contain (deep-frozen). */
export const APPROVED_MAPPING = deepFreeze(expandMapping());
/** The 35 approved typed identities, byte-wise sorted. */
export const APPROVED_IDS = Object.freeze(Object.keys(APPROVED_MAPPING).sort(byteCompare));
export const APPROVED_PARENTS = Object.freeze([...new Set(APPROVED_IDS.map((i) => i.split('::')[0]))]);
/** Doc-notation of a predicate, used by tests to compare the oracle with the owner-decisions record table. */
export function predicateNotation(p) {
  const fmt = (x) => (Array.isArray(x) ? `[${x.join(', ')}]` : String(x));
  const args = PREDICATE_KEYS[p.op].filter((k) => !['op', 'authority', 'evidenceMethod'].includes(k)).map((k) => fmt(p[k]));
  return `${p.op}(${args.join(', ')})`;
}

/** First few differing JSON paths between two values (for HRV_MAPPING diagnostics). */
function diffPaths(a, b, at = '', out = []) {
  if (out.length >= 5 || jsonEqual(a, b)) return out;
  if (isObj(a) && isObj(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffPaths(a[k], b[k], `${at}/${k}`, out);
  } else if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) diffPaths(a[i], b[i], `${at}/${i}`, out);
  } else out.push(at || '/');
  return out.slice(0, 5);
}

/** The records array canonicalized and hashed: this value is the sidecar `revision` and the trusted pin. */
export function computeRevision(records) {
  return sha256(canonicalJson(records));
}

/** Owner decision identifiers (T4C-Dnn / T4C-Fnn) defined in the owner-decisions document. */
export function parseOwnerDecisionIds(text) {
  return new Set([...String(text).matchAll(/^\*\*(T4C-[DF]\d\d) /gm)].map((m) => m[1]));
}

/**
 * @param {object} inputs
 * @param {string} inputs.bytes            exact sidecar file text
 * @param {object} inputs.sidecar          parsed sidecar
 * @param {object} inputs.schema           parsed schema (parity check only)
 * @param {object[]} inputs.specs          the specification records array
 * @param {object} inputs.registry         the immutable v1.5 registry (read-only)
 * @param {string} inputs.ownerDecisionsText
 * @param {object} [options]
 * @param {string} [options.pin]           override of the trusted pin (tests only)
 * @returns {{ ok: boolean, failures: {code:string,path:string,detail:any}[], counts: object }}
 */
export function validateHostRequirements(inputs, options = {}) {
  const pin = options.pin ?? PINNED_HOST_REQUIREMENTS_SHA256;
  const failures = [];
  const counts = { total: 0, domains: { equipment: 0, weapon: 0, armor: 0 }, verdicts: { SUPPORTED: 0, CONDITIONALLY_SUPPORTED: 0 }, emptyInstall: 0, predicates: 0 };
  const fail = (code, path, detail = null) => failures.push({ code, path, detail });
  const { bytes, sidecar, schema, specs, registry, ownerDecisionsText } = inputs;

  const keysExact = (obj, expected, path) => {
    if (!isObj(obj)) { fail('HRV_SHAPE', path, 'not an object'); return false; }
    const keys = Object.keys(obj);
    if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
      fail('HRV_FIELDS', path, { observed: keys, expected });
      return false;
    }
    return true;
  };

  // Root and canonical serialization ------------------------------------------------------------
  if (!keysExact(sidecar, ROOT_KEYS, '')) return finish();
  if (sidecar.schema !== HOST_REQUIREMENTS_SCHEMA_ID) fail('HRV_SCHEMA_ID', '/schema', sidecar.schema);
  if (!Array.isArray(sidecar.records)) { fail('HRV_SHAPE', '/records', 'not an array'); return finish(); }
  if (typeof bytes === 'string' && bytes !== canonicalJson(sidecar)) fail('HRV_CANONICAL', '', 'file bytes are not the canonical serialization of the parsed content');
  const revision = computeRevision(sidecar.records);
  if (sidecar.revision !== revision) fail('HRV_REVISION', '/revision', { stored: sidecar.revision, computed: revision });
  if (revision !== pin) fail('HRV_PIN', '/revision', { computed: revision, pinned: pin });

  // Schema parity --------------------------------------------------------------------------------
  schemaParity(schema, fail);
  schemaConformance(schema, sidecar, fail);

  // Authoritative source sets --------------------------------------------------------------------
  // Source census (Finding 4): isolated to the D-005 records. Host-prerequisite records of any other audit are ignored;
  // a missing, duplicate or unexpected D005 identity is a failure. The expected identities come from the frozen oracle.
  const d005Specs = (Array.isArray(specs) ? specs : []).filter((r) => r && r.component === 'hostPrerequisites' && typeof r.specId === 'string' && r.specId.startsWith('D005::'));
  const specById = new Map();
  const dupSpecs = [];
  for (const r of d005Specs) { if (specById.has(r.specId)) dupSpecs.push(r.specId); else specById.set(r.specId, r); }
  const expectedSpecIds = APPROVED_IDS.map((id) => `D005::${id}`);
  const missingSpecs = expectedSpecIds.filter((id) => !specById.has(id));
  const unexpectedSpecs = [...specById.keys()].filter((id) => !expectedSpecIds.includes(id)).sort(byteCompare);
  if (dupSpecs.length || missingSpecs.length || unexpectedSpecs.length) fail('HRV_SOURCE_CENSUS', '/specs', { missing: missingSpecs, duplicate: dupSpecs, unexpected: unexpectedSpecs });
  for (const [id, r] of specById) {
    const typed = id.slice('D005::'.length);
    if (r.typedDefinitionId !== typed) fail('HRV_SOURCE_CENSUS', `/specs/${id}`, { typedDefinitionId: r.typedDefinitionId });
    const m = APPROVED_MAPPING[typed];
    if (m && (r.publication?.printedPage !== m.source.printedPage || r.publication?.bookId !== m.source.bookId)) fail('HRV_PAGE', `/specs/${id}`, { oracle: m.source.printedPage, record: r.publication?.printedPage });
  }
  const expectedIds = [...APPROVED_IDS];
  const parents = new Set(APPROVED_PARENTS);
  const ownerIds = parseOwnerDecisionIds(ownerDecisionsText);
  if (ownerIds.size === 0) fail('HRV_OWNER_DOC', OWNER_DECISIONS_PATH, 'no decision identifiers found');

  // Registry scope: exactly the CONDITIONAL_UNVERIFIED pairs of these parents; no noncandidate pair is covered.
  const defs = Array.isArray(registry?.definitions) ? registry.definitions : [];
  const registryPairs = [];
  for (const p of parents) {
    const d = defs.find((x) => x.id === p);
    if (!d) { fail('HRV_REGISTRY_SCOPE', `/registry/${p}`, 'parent missing from registry'); continue; }
    for (const [dom, v] of Object.entries(d.domainApplicability ?? {})) if (v === REGISTRY_APPLICABLE) registryPairs.push(`${p}::${dom}`);
  }
  registryPairs.sort(byteCompare);
  if (!jsonEqual(registryPairs, expectedIds)) fail('HRV_REGISTRY_SCOPE', '/records', { registryConditionalUnverified: registryPairs.length, specHostRecords: expectedIds.length });

  // Records --------------------------------------------------------------------------------------
  const records = sidecar.records;
  if (records.length !== expectedIds.length) fail('HRV_COUNT', '/records', { observed: records.length, expected: expectedIds.length });
  const seen = new Set();
  let prev = null;
  counts.total = records.length;

  records.forEach((rec, i) => {
    const base = `/records/${i}`;
    if (!keysExact(rec, RECORD_KEYS, base)) return;
    const id = rec.typedDefinitionId;
    if (!isStr(id) || !/^[a-z0-9-]+::(equipment|weapon|armor)$/.test(id)) { fail('HRV_IDENTITY', `${base}/typedDefinitionId`, id); return; }
    if (seen.has(id)) fail('HRV_DUPLICATE', `${base}/typedDefinitionId`, id);
    seen.add(id);
    if (prev !== null && byteCompare(prev, id) >= 0) fail('HRV_ORDER', `${base}/typedDefinitionId`, { previous: prev, observed: id });
    prev = id;
    if (!expectedIds.includes(id)) fail('HRV_IDENTITY', `${base}/typedDefinitionId`, 'not one of the approved typed definitions');
    const [parent, domain] = id.split('::');
    // Exact approved mapping (Findings 1 and 2): predicates, operands, groups, evidence methods, verdict, stacking, empty-install
    // declaration, effect reference and source linkage must equal the frozen oracle, whatever the revision or pin says.
    if (Object.prototype.hasOwnProperty.call(APPROVED_MAPPING, id) && !jsonEqual(rec, APPROVED_MAPPING[id])) fail('HRV_MAPPING', base, { id, differs: diffPaths(rec, APPROVED_MAPPING[id], '') });
    if (rec.domain !== domain) fail('HRV_DOMAIN', `${base}/domain`, { observed: rec.domain, expected: domain });
    if (TYPED_DOMAINS.includes(domain)) counts.domains[domain] += 1;
    if (!isStr(rec.upgradeLabel)) fail('HRV_SHAPE', `${base}/upgradeLabel`, 'display label required (never an identity)');

    // Source linkage: structured fields of the committed D005 published-facts record only.
    const specId = `D005::${id}`;
    if (rec.sourceSpecId !== specId) fail('HRV_SOURCE_LINK', `${base}/sourceSpecId`, { observed: rec.sourceSpecId, expected: specId });
    const spec = specById.get(specId);
    if (!spec) fail('HRV_SOURCE_LINK', `${base}/sourceSpecId`, 'no committed D005 hostPrerequisites record');
    else {
      if (spec.coverage !== 'PUBLISHED_FACTS' || spec.typedDefinitionId !== id) fail('HRV_SOURCE_LINK', `${base}/sourceSpecId`, 'linked record is not the PUBLISHED_FACTS record of this typed definition');
      if (rec.source?.printedPage !== spec.publication?.printedPage) fail('HRV_PAGE', `${base}/source/printedPage`, { observed: rec.source?.printedPage, expected: spec.publication?.printedPage });
      if (rec.source?.bookId !== spec.publication?.bookId) fail('HRV_PAGE', `${base}/source/bookId`, { observed: rec.source?.bookId, expected: spec.publication?.bookId });
    }
    const hasCont = isObj(rec.source) && Object.prototype.hasOwnProperty.call(rec.source, 'continuesOnPage');
    if (keysExact(rec.source, hasCont ? SOURCE_KEYS_CONT : SOURCE_KEYS, `${base}/source`)) {
      if (rec.source.bookId !== BOOK_ID) fail('HRV_PAGE', `${base}/source/bookId`, rec.source.bookId);
      if (!isInt(rec.source.printedPage)) fail('HRV_PAGE', `${base}/source/printedPage`, 'single integer required');
      if (hasCont && (!isInt(rec.source.continuesOnPage) || rec.source.continuesOnPage <= rec.source.printedPage)) fail('HRV_PAGE', `${base}/source/continuesOnPage`, rec.source.continuesOnPage);
    }
    if (!DOMAIN_VERDICTS.includes(rec.domainVerdict)) fail('HRV_VERDICT', `${base}/domainVerdict`, rec.domainVerdict);
    else counts.verdicts[rec.domainVerdict] += 1;

    // Requirement groups -------------------------------------------------------------------------
    for (const g of GROUPS) {
      const field = GROUP_FIELD[g];
      if (!Array.isArray(rec[field])) { fail('HRV_SHAPE', `${base}/${field}`, 'array required'); continue; }
      rec[field].forEach((p, j) => { counts.predicates += 1; validatePredicate(p, g, `${base}/${field}/${j}`, { parent, specId, page: rec.source?.printedPage, ownerIds, fail, keysExact }); });
    }

    // Empty installation requirements (T4C-D09, F02): explicit source-backed declaration, never an omission.
    const empty = Array.isArray(rec.installRequirements) && rec.installRequirements.length === 0;
    if (empty) {
      counts.emptyInstall += 1;
      if (keysExact(rec.noAdditionalHostPrerequisite, NAHP_KEYS, `${base}/noAdditionalHostPrerequisite`)) {
        const n = rec.noAdditionalHostPrerequisite;
        if (n.declared !== true || n.statement !== NAHP_STATEMENT || n.sourceSpecId !== specId || n.printedPage !== rec.source?.printedPage) fail('HRV_EMPTY_INSTALL', `${base}/noAdditionalHostPrerequisite`, 'declaration must be true, use the fixed statement and cite this record and page');
      } else fail('HRV_EMPTY_INSTALL', `${base}/noAdditionalHostPrerequisite`, 'empty installRequirements require an explicit declaration');
    } else if (rec.noAdditionalHostPrerequisite !== null) fail('HRV_EMPTY_INSTALL', `${base}/noAdditionalHostPrerequisite`, 'must be null when installRequirements is non-empty');

    // Effect references: source links and neutral labels only (T4C-F10).
    if (!Array.isArray(rec.effectReferences)) fail('HRV_SHAPE', `${base}/effectReferences`, 'array required');
    else rec.effectReferences.forEach((e, j) => {
      const ep = `${base}/effectReferences/${j}`;
      if (!keysExact(e, EFFECT_KEYS, ep)) return;
      if (!isStr(e.label) || /\d/.test(e.label) || !/^[A-Za-z][A-Za-z ,;()'.-]*$/.test(e.label)) fail('HRV_EFFECT_REF', `${ep}/label`, 'label must be a neutral descriptive string with no digits or mechanics');
      if (e.sourceSpecId !== specId) fail('HRV_EFFECT_REF', `${ep}/sourceSpecId`, e.sourceSpecId);
    });

    // Stacking: separate from eligibility; no invented limit (T4C-D10).
    if (keysExact(rec.stacking, STACKING_KEYS, `${base}/stacking`)) {
      if (!STACKING_FACTS.includes(rec.stacking.fact)) fail('HRV_STACKING', `${base}/stacking/fact`, rec.stacking.fact);
      if (rec.stacking.maxPerHost !== null) fail('HRV_STACKING', `${base}/stacking/maxPerHost`, 'must be null; null is not a grant of unlimited installation');
      if (rec.stacking.sourceSpecId !== specId) fail('HRV_STACKING', `${base}/stacking/sourceSpecId`, rec.stacking.sourceSpecId);
    }
  });

  // Coverage ------------------------------------------------------------------------------------
  for (const id of expectedIds) if (!seen.has(id)) fail('HRV_IDENTITY', '/records', { missing: id });

  return finish();

  function finish() {
    return { ok: failures.length === 0, failures, counts };
  }
}

function validatePredicate(p, group, path, ctx) {
  const { parent, specId, page, ownerIds, fail, keysExact } = ctx;
  if (!isObj(p)) return fail('HRV_SHAPE', path, 'predicate must be an object');
  const op = p.op;
  if (!OPERATORS.includes(op)) return fail('HRV_OPERATOR', `${path}/op`, op);
  if (!keysExact(p, PREDICATE_KEYS[op], path)) return undefined;
  if (!OPERATOR_GROUPS[op].includes(group)) fail('HRV_OPERATOR_GROUP', path, { op, group, allowed: OPERATOR_GROUPS[op] });

  const factOk = (name, at, kinds) => {
    if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(FACTS, name)) { fail('HRV_FACT', at, name); return null; }
    const f = FACTS[name];
    if (!f.groups.includes(group)) fail('HRV_FACT_GROUP', at, { fact: name, group, allowed: f.groups });
    if (kinds && !kinds.includes(f.kind)) { fail('HRV_OPERAND', at, { fact: name, kind: f.kind, required: kinds }); return null; }
    return f;
  };
  const sameValues = (arr, domain, at) => {
    if (!Array.isArray(arr) || arr.length === 0) return fail('HRV_OPERAND', at, 'non-empty array required');
    if (new Set(arr).size !== arr.length) fail('HRV_OPERAND', at, 'duplicate values');
    for (const v of arr) {
      if (v === 'unknown') fail('HRV_UNKNOWN_OPERAND', at, "'unknown' is a runtime state; it can never be an accepted operand value");
      else if (!domain.includes(v)) fail('HRV_ENUM_VALUE', at, v);
    }
    return undefined;
  };

  switch (op) {
    case 'bool.equals': {
      factOk(p.fact, `${path}/fact`, ['tri']);
      if (p.value === 'unknown' || p.value === null || p.value === undefined) fail('HRV_UNKNOWN_OPERAND', `${path}/value`, "'unknown' or null can never be a predicate value");
      else if (typeof p.value !== 'boolean') fail('HRV_OPERAND', `${path}/value`, 'boolean literal required');
      break;
    }
    case 'enum.in': {
      const f = factOk(p.fact, `${path}/fact`, ['enum']);
      if (f) sameValues(p.allowed, f.domain, `${path}/allowed`);
      break;
    }
    case 'enum.intersects': {
      const f = factOk(p.fact, `${path}/fact`, ['set']);
      if (f) sameValues(p.allowed, f.domain, `${path}/allowed`);
      break;
    }
    case 'int.explicit': factOk(p.fact, `${path}/fact`, ['int']); break;
    case 'size.not_larger': {
      factOk(p.left, `${path}/left`, ['size']);
      factOk(p.right, `${path}/right`, ['size']);
      if (p.left !== 'addedItem.sizeCategory' || p.right !== 'host.sizeCategory') fail('HRV_OPERAND', path, 'size.not_larger compares addedItem.sizeCategory against host.sizeCategory');
      break;
    }
    case 'size.smaller_by_at_least': {
      factOk(p.left, `${path}/left`, ['size']);
      factOk(p.right, `${path}/right`, ['size']);
      if (p.left !== 'payload.sizeCategory' || p.right !== 'host.sizeCategory') fail('HRV_OPERAND', path, 'size.smaller_by_at_least compares payload.sizeCategory against host.sizeCategory');
      if (!isInt(p.steps) || p.steps < 1 || p.steps >= SIZE_CATEGORIES.length) fail('HRV_OPERAND', `${path}/steps`, 'integer between 1 and the number of categories minus one');
      else if (p.steps !== 1) fail('HRV_OPERAND', `${path}/steps`, 'approved uses fix steps = 1');
      break;
    }
    case 'weight.sum_lt': {
      factOk(p.items, `${path}/items`, ['weight']);
      factOk(p.limit, `${path}/limit`, ['weight']);
      if (p.items !== 'payload.weightKg' || p.limit !== 'host.weightKg') fail('HRV_OPERAND', path, 'weight.sum_lt compares the sum of payload.weightKg against host.weightKg (strict)');
      break;
    }
    case 'count.at_most': {
      factOk(p.collection, `${path}/collection`, ['collection']);
      if (p.collection !== 'payload.items') fail('HRV_OPERAND', `${path}/collection`, 'count.at_most counts payload.items');
      if (!isInt(p.max) || p.max < 0) fail('HRV_OPERAND', `${path}/max`, 'non-negative integer required');
      break;
    }
    case 'compat.evidenced': {
      const c = COMPATIBILITY_CHECKS[p.check];
      if (!isStr(p.check) || !c) fail('HRV_CHECK', `${path}/check`, p.check);
      else {
        if (!c.groups.includes(group)) fail('HRV_CHECK', `${path}/check`, { check: p.check, group, allowed: c.groups });
        if (!c.parents.includes(parent)) fail('HRV_CHECK', `${path}/check`, { check: p.check, parent, allowedParents: c.parents });
      }
      if (keysExact(p.evidenceMethod, OWNER_KEYS, `${path}/evidenceMethod`)) {
        if (p.evidenceMethod.kind !== 'OWNER_ENGINEERING_CHECK') fail('HRV_EVIDENCE_METHOD', `${path}/evidenceMethod/kind`, 'an evidence method must be an OWNER_ENGINEERING_CHECK');
        ownerRefs(p.evidenceMethod.ownerRulingIds, `${path}/evidenceMethod/ownerRulingIds`);
      }
      break;
    }
    default: break;
  }

  // Requirement authority (all predicates): a published SWSE rule cites its D005 record and printed page.
  const a = p.authority;
  if (!isObj(a)) return fail('HRV_AUTHORITY', `${path}/authority`, 'object required');
  if (a.kind === 'PUBLISHED_RULE') {
    if (keysExact(a, PUBLISHED_KEYS, `${path}/authority`)) {
      if (a.sourceSpecId !== specId || a.printedPage !== page) fail('HRV_AUTHORITY', `${path}/authority`, 'a published rule must cite this record and its printed page');
    }
  } else if (a.kind === 'OWNER_ENGINEERING_CHECK') {
    if (keysExact(a, OWNER_KEYS, `${path}/authority`)) ownerRefs(a.ownerRulingIds, `${path}/authority/ownerRulingIds`);
    if (op !== 'compat.evidenced') fail('HRV_AUTHORITY', `${path}/authority`, 'an engineering check can only be a compat.evidenced predicate');
  } else fail('HRV_AUTHORITY', `${path}/authority/kind`, a.kind);
  // An engineering check is never the requirement authority of a printed-source physical requirement (Amendment A1, item 3).
  if (op === 'compat.evidenced' && a.kind !== 'PUBLISHED_RULE') fail('HRV_AUTHORITY', `${path}/authority/kind`, 'the requirement behind a compat.evidenced predicate is a PUBLISHED_RULE; the engineering check is only its evidence method');
  return undefined;

  function ownerRefs(ids, at) {
    if (!Array.isArray(ids) || ids.length === 0) return fail('HRV_AUTHORITY_REF', at, 'at least one owner decision id required');
    for (const id of ids) if (!ownerIds.has(id)) fail('HRV_AUTHORITY_REF', at, { unresolved: id });
    if (new Set(ids).size !== ids.length) fail('HRV_AUTHORITY_REF', at, 'duplicate ids');
    return undefined;
  }
}

function schemaParity(schema, fail) {
  if (!isObj(schema) || !isObj(schema.$defs)) return fail('HRV_SCHEMA_PARITY', '/schema', 'schema file missing $defs');
  const d = schema.$defs;
  const bad = (at, detail) => fail('HRV_SCHEMA_PARITY', `/schema${at}`, detail);
  const cmp = (name, observed, expected) => {
    if (!Array.isArray(observed) || !jsonEqual([...observed], [...expected])) bad(`/$defs/${name}`, { observed, expected });
  };
  const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');
  /** An object shape must be closed (additionalProperties false) with required/properties equal to the validator's key list. */
  const shape = (at, node, keys, required = keys) => {
    if (!isObj(node)) return bad(at, 'missing shape');
    if (node.type !== 'object') bad(`${at}/type`, 'object expected');
    if (node.additionalProperties !== false) bad(`${at}/additionalProperties`, 'must be false');
    if (!sameSet(node.required, required)) bad(`${at}/required`, { observed: node.required, expected: required });
    if (!isObj(node.properties) || !sameSet(Object.keys(node.properties), keys)) bad(`${at}/properties`, { observed: node.properties && Object.keys(node.properties), expected: keys });
    return undefined;
  };

  // Root
  if (schema.properties?.schema?.const !== HOST_REQUIREMENTS_SCHEMA_ID) bad('/properties/schema', 'schema id const');
  shape('', schema, ROOT_KEYS);
  if (schema.properties?.records?.minItems !== APPROVED_IDS.length || schema.properties?.records?.maxItems !== APPROVED_IDS.length) bad('/properties/records', 'minItems and maxItems must equal the 35 approved definitions');

  // Closed enumerations
  cmp('group', d.group?.enum, GROUPS);
  cmp('typedDomain', d.typedDomain?.enum, TYPED_DOMAINS);
  cmp('operator', d.operator?.enum, OPERATORS);
  cmp('fact', d.fact?.enum, Object.keys(FACTS));
  cmp('size', d.size?.enum, SIZE_CATEGORIES);
  cmp('check', d.check?.enum, Object.keys(COMPATIBILITY_CHECKS));
  cmp('authorityKind', d.authorityKind?.enum, AUTHORITY_KINDS);
  cmp('domainVerdict', d.domainVerdict?.enum, DOMAIN_VERDICTS);
  cmp('stackingFact', d.stackingFact?.enum, STACKING_FACTS);

  // Record and nested shapes
  const rec = d.record;
  shape('/$defs/record', rec, RECORD_KEYS);
  shape('/$defs/record/properties/source', rec?.properties?.source, SOURCE_KEYS_CONT, SOURCE_KEYS);
  shape('/$defs/record/properties/stacking', rec?.properties?.stacking, STACKING_KEYS);
  if (rec?.properties?.stacking?.properties?.maxPerHost?.type !== 'null') bad('/$defs/record/properties/stacking/properties/maxPerHost', 'must be type null');
  shape('/$defs/record/properties/effectReferences/items', rec?.properties?.effectReferences?.items, EFFECT_KEYS);
  const nahp = rec?.properties?.noAdditionalHostPrerequisite?.oneOf;
  if (!Array.isArray(nahp) || nahp.length !== 2 || nahp[0]?.type !== 'null') bad('/$defs/record/properties/noAdditionalHostPrerequisite', 'oneOf [null, declaration] expected');
  else shape('/$defs/record/properties/noAdditionalHostPrerequisite/oneOf/1', nahp[1], NAHP_KEYS);
  for (const g of GROUPS) {
    const node = rec?.properties?.[GROUP_FIELD[g]];
    if (node?.type !== 'array' || node?.items?.$ref !== '#/$defs/predicate') bad(`/$defs/record/properties/${GROUP_FIELD[g]}`, 'array of predicate expected');
  }
  shape('/$defs/publishedRuleAuthority', d.publishedRuleAuthority, PUBLISHED_KEYS);
  shape('/$defs/engineeringAuthority', d.engineeringAuthority, OWNER_KEYS);

  // Predicate union: exactly one closed branch per approved operator, with the validator's key list
  const branches = d.predicate?.oneOf;
  if (!Array.isArray(branches) || branches.length !== OPERATORS.length) bad('/$defs/predicate/oneOf', { observed: Array.isArray(branches) ? branches.length : null, expected: OPERATORS.length });
  else {
    for (const op of OPERATORS) {
      const matching = branches.filter((b) => b?.properties?.op?.const === op);
      if (matching.length !== 1) { bad(`/$defs/predicate/oneOf/${op}`, 'exactly one branch required'); continue; }
      shape(`/$defs/predicate/oneOf/${op}`, matching[0], PREDICATE_KEYS[op]);
    }
  }
  return undefined;
}

/** The committed sidecar must conform to the committed schema, using the restricted checker (fails closed on unsupported keywords). */
function schemaConformance(schema, sidecar, fail) {
  const r = checkJsonSchema(schema, sidecar);
  for (const u of r.unsupported) fail('HRV_SCHEMA_UNSUPPORTED', `/schema${u.path}`, u.keyword);
  for (const e of r.errors) fail('HRV_SCHEMA_CONFORMANCE', e.path || '/', { keyword: e.keyword, detail: e.detail });
  return r;
}
