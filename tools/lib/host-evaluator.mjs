// D-005 T4d-2: the pure OFFLINE host-requirement evaluator.
//
// Compares the certified T4c contract (records obtained from an authentic VerifiedContract) with the certified T4d-1 evidence model
// and reports one three-state verdict (`legal` | `illegal` | `not_established`) per REQUESTED requirement group, with sorted
// diagnostics drawn only from the 32 frozen codes (T4c owner decisions section 5.1) following the case-to-code table (section 5.2).
//
// This is not runtime legality: nothing here reads an Item, registers with G3, selects a modification or authorizes installation.
// Nothing under scripts/ imports it. It performs no I/O.
//
// Trust: a report distinguishes SYNTHETIC outcomes (evidence vouched for by a test-only synthetic authority) from outcomes backed
// only by production-trusted evidence, as descriptive metadata (`evidenceClass`, `synthetic`). A host-only diagnostic is NEVER
// installation authority: every report and group fixes `selectable: false` and `installationAuthorized: false`.
// Freshness: the ObservationSet is bound to the evaluation context here (bindObservationSet), so evidence is trusted only for the
// context that is evaluated now - never replayed from an earlier one.

import { SIZE_CATEGORIES, OPERATORS, OPERATOR_GROUPS, GROUPS, GROUP_FIELD, FACTS } from './host-requirements.mjs';
import { DIAGNOSTIC_CODES, isVerifiedContract, getVerifiedRecord, resolveFact, classifyCollection, bindObservationSet, isObservationSet, BASES } from './host-evidence.mjs';

export const EVALUATION_SCHEMA_ID = 'swse.modification.host-evaluation/1';
export const VERDICTS = Object.freeze(['legal', 'illegal', 'not_established']);
export const EVALUATION_BASES = Object.freeze(BASES.filter((b) => b !== 'user-entered'));

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.length > 0;
const sizeRank = (label) => SIZE_CATEGORIES.indexOf(label);

function deepFreeze(v) {
  if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); }
  return v;
}

/* ------------------------------------------------------------------------------------------ */
/* Exact decimal arithmetic for the strict weight comparison                                   */
/* ------------------------------------------------------------------------------------------ */

/** The exact decimal value of a finite non-negative number's shortest round-trip representation, as { int: BigInt, exp } (value = int * 10^exp). */
function decimalOf(n) {
  const m = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(n));
  if (!m) throw new TypeError('not a finite non-negative number');
  return { int: BigInt(m[1] + (m[2] ?? '')), exp: (m[3] ? Number(m[3]) : 0) - (m[2]?.length ?? 0) };
}

/** Compares sum(unit_i * quantity_i) with limit exactly. Returns -1, 0 or 1. */
export function compareWeightSum(terms, limit) {
  const parts = terms.map((t) => ({ ...decimalOf(t.unitKg), qty: BigInt(t.quantity) }));
  const lim = decimalOf(limit);
  const minExp = Math.min(lim.exp, ...parts.map((x) => x.exp));
  const at = (x) => x.int * 10n ** BigInt(x.exp - minExp);
  const sum = parts.reduce((a, x) => a + at(x) * x.qty, 0n);
  const l = at(lim);
  return sum < l ? -1 : sum > l ? 1 : 0;
}

/* ------------------------------------------------------------------------------------------ */
/* Predicate evaluation                                                                        */
/* ------------------------------------------------------------------------------------------ */

const ROLE_OF_PREFIX = { host: 'host', addedItem: 'addedItem', use: 'use', payload: 'payloadItem' };
const roleOf = (factRef) => (factRef === 'item.type' ? 'host' : ROLE_OF_PREFIX[factRef.split('.')[0]]);

/** Violation codes (T4c section 5.2). A trusted false/disallowed value maps only to these approved codes. */
const BOOL_VIOLATION = Object.freeze({
  'host.oneHandedHandheld': 'HOST_NOT_ONE_HANDED', // case 16
  'host.functionRestrictable': 'HOST_NOT_RESTRICTABLE', // case 18
  'host.remotelyActivatableFunction': 'HOST_NOT_ACTIVATABLE', // case 20
  'use.attunedGauntletForHost': 'HOST_ATTUNED_GAUNTLET_UNAVAILABLE' // case 30d
});

const satisfied = (evidence = []) => ({ outcome: 'satisfied', codes: [], evidence });
const violated = (codes, evidence = []) => ({ outcome: 'violated', codes, evidence });
const unknown = (codes, evidence = []) => ({ outcome: 'unknown', codes, evidence });
const unsupported = () => unknown(['HOST_PREDICATE_UNSUPPORTED']);

function evaluatePredicate(pred, group, env) {
  if (!isObj(pred) || !OPERATORS.includes(pred.op) || !OPERATOR_GROUPS[pred.op].includes(group)) return unsupported();
  switch (pred.op) {
    case 'bool.equals': return opBoolEquals(pred, env);
    case 'enum.in': return opEnumIn(pred, env);
    case 'enum.intersects': return opEnumIntersects(pred, env);
    case 'int.explicit': return opIntExplicit(pred, env);
    case 'size.not_larger': return opSizeNotLarger(pred, env);
    case 'size.smaller_by_at_least': return opSizeSmallerBy(pred, env);
    case 'weight.sum_lt': return opWeightSumLt(pred, env);
    case 'count.at_most': return opCountAtMost(pred, env);
    case 'compat.evidenced': return opCompat(pred, env);
    default: return unsupported();
  }
}

/** Resolves a single-subject fact; a missing added item is reported once with its approved code (case 23). */
function fact(env, factRef, role = roleOf(factRef)) {
  if (role === 'addedItem' && !env.addedItemId) return { status: 'unknown', reasons: ['HOST_ADDED_ITEM_MISSING'], evidence: [], missingAddedItem: true };
  const itemId = role === 'addedItem' ? env.addedItemId : env.hostItemId;
  return resolveFact(env.set, { factRef, subject: { role, itemId }, requestedBasis: env.basis, purpose: 'installation-eligibility' });
}

function opBoolEquals(pred, env) {
  const f = pred.fact;
  if (!FACTS[f] || FACTS[f].kind !== 'tri' || pred.value !== true || !BOOL_VIOLATION[f]) return unsupported();
  const r = fact(env, f);
  if (r.status !== 'known') return unknown(r.reasons, r.evidence);
  return r.value === pred.value ? satisfied(r.evidence) : violated([BOOL_VIOLATION[f]], r.evidence);
}

function opEnumIn(pred, env) {
  const f = pred.fact;
  if (f !== 'host.droidStatus' || !Array.isArray(pred.allowed) || pred.allowed.length === 0) return unsupported();
  const r = fact(env, f);
  if (r.status !== 'known') return unknown(r.reasons, r.evidence);
  if (pred.allowed.includes(r.value)) return satisfied(r.evidence);
  return r.value === 'droid' ? violated(['HOST_IS_DROID'], r.evidence) : unsupported(); // case 14
}

function opEnumIntersects(pred, env) {
  const f = pred.fact;
  if (f !== 'host.powerSourceTypes' || !Array.isArray(pred.allowed) || pred.allowed.length === 0) return unsupported();
  const r = fact(env, f);
  if (r.status !== 'known') return unknown(r.reasons, r.evidence);
  if (r.value.members.some((m) => pred.allowed.includes(m))) return satisfied(r.evidence); // a known member in the allowed set proves intersection
  // an empty intersection is a proven failure only when the member list is declared complete (case 10); otherwise more sources may exist
  return r.value.complete ? violated(['HOST_POWER_SOURCE_UNSUPPORTED'], r.evidence) : unknown(['HOST_POWER_SOURCE_UNKNOWN'], r.evidence);
}

function opIntExplicit(pred, env) {
  if (pred.fact !== 'host.intelligenceScore') return unsupported();
  const r = fact(env, pred.fact);
  if (r.status === 'known') return satisfied(r.evidence); // a valid explicit integer exists; no threshold
  if (r.status === 'absent') return violated(['HOST_INTELLIGENCE_SCORE_ABSENT'], r.evidence); // case 12
  return unknown(r.reasons, r.evidence); // case 11 (also contradictory)
}

function opSizeNotLarger(pred, env) {
  if (pred.left !== 'addedItem.sizeCategory' || pred.right !== 'host.sizeCategory') return unsupported();
  const l = fact(env, pred.left);
  const r = fact(env, pred.right);
  if (l.status === 'known' && r.status === 'known') {
    const ev = [...l.evidence, ...r.evidence];
    return sizeRank(l.value) <= sizeRank(r.value) ? satisfied(ev) : violated(['HOST_ADDED_ITEM_LARGER'], ev); // equal passes (case 24)
  }
  return unknown([...(l.status === 'known' ? [] : l.reasons), ...(r.status === 'known' ? [] : r.reasons)], [...l.evidence, ...r.evidence]);
}

/** Codes explaining why a collection cannot be treated as the complete contents (T4c cases 1, 2, 30b). */
const incompleteCodes = (coll) => (coll.reasons.length ? coll.reasons : ['HOST_FACT_MISSING']);

function opSizeSmallerBy(pred, env) {
  if (pred.left !== 'payload.sizeCategory' || pred.right !== 'host.sizeCategory' || !Number.isInteger(pred.steps) || pred.steps < 1) return unsupported();
  const host = fact(env, pred.right);
  const evidence = [...host.evidence, ...env.collectionEvidence];
  const codes = host.status === 'known' ? [] : [...host.reasons];
  let proven = 0;
  let unknownMember = false;
  const violatingCodes = [];
  for (const m of env.collection.members) {
    const r = resolveFact(env.set, { factRef: pred.left, subject: { role: 'payloadItem', itemId: m.itemId, memberRef: m.memberRef }, requestedBasis: env.basis, purpose: 'installation-eligibility' });
    evidence.push(...r.evidence);
    if (r.status !== 'known') { unknownMember = true; codes.push(...(r.reasons.length ? r.reasons : ['PAYLOAD_SIZE_UNKNOWN'])); continue; }
    if (host.status !== 'known') continue;
    if (sizeRank(host.value) - sizeRank(r.value) >= pred.steps) proven += 1; else violatingCodes.push('PAYLOAD_NOT_SMALLER'); // equal or larger fails (case 27)
  }
  if (violatingCodes.length) return violated([...violatingCodes, ...codes], evidence);
  if (host.status !== 'known' || unknownMember) return unknown(codes, evidence);
  if (!env.collection.completeness.verified) return unknown(['PAYLOAD_SIZE_UNKNOWN', ...incompleteCodes(env.collection)], evidence);
  return proven === env.collection.members.length ? satisfied(evidence) : unknown(['PAYLOAD_SIZE_UNKNOWN'], evidence);
}

function opWeightSumLt(pred, env) {
  if (pred.items !== 'payload.weightKg' || pred.limit !== 'host.weightKg') return unsupported();
  const host = fact(env, pred.limit);
  const evidence = [...host.evidence, ...env.collectionEvidence];
  const codes = host.status === 'known' ? [] : [...host.reasons];
  const terms = [];
  let incompleteSum = false;
  for (const m of env.collection.members) {
    const r = resolveFact(env.set, { factRef: pred.items, subject: { role: 'payloadItem', itemId: m.itemId, memberRef: m.memberRef }, requestedBasis: env.basis, purpose: 'installation-eligibility' });
    evidence.push(...r.evidence);
    if (r.status !== 'known') { incompleteSum = true; codes.push(...(r.reasons.length ? r.reasons : ['PAYLOAD_WEIGHT_UNKNOWN'])); continue; }
    if (m.quantity.status !== 'known') { incompleteSum = true; codes.push('PAYLOAD_WEIGHT_UNKNOWN'); continue; } // per-unit weight needs a trusted physical quantity
    terms.push({ unitKg: r.value, quantity: m.quantity.value });
  }
  // Any unknown payload weight, or an unverified member list, leaves the total unknown (case 29). The partial-sum shortcut is excluded.
  if (!env.collection.completeness.verified) { incompleteSum = true; codes.push('PAYLOAD_WEIGHT_UNKNOWN', ...incompleteCodes(env.collection)); }
  if (host.status !== 'known' || incompleteSum) return unknown(codes, evidence);
  return compareWeightSum(terms, host.value) < 0 ? satisfied(evidence) : violated(['PAYLOAD_WEIGHT_LIMIT_EXCEEDED'], evidence); // equality fails (case 30)
}

function opCountAtMost(pred, env) {
  if (pred.collection !== 'payload.items' || !Number.isSafeInteger(pred.max) || pred.max < 0) return unsupported();
  const objects = env.collection.physicalObjects;
  if (objects.status === 'exact') return objects.value > pred.max ? violated(['PAYLOAD_ITEM_COUNT_EXCEEDED'], env.collectionEvidence) : satisfied(env.collectionEvidence);
  // A lower bound is not a trusted count (case 30b): it is never treated as a violation or as satisfaction.
  return unknown(incompleteCodes(env.collection), env.collectionEvidence);
}

function opCompat(pred, env) {
  if (!isStr(pred.check)) return unsupported();
  const isAdded = pred.check.startsWith('addedComponent');
  const r = fact(env, `compat:${pred.check}`, isAdded ? 'addedItem' : 'host');
  if (r.status === 'known') return r.value === true ? satisfied(r.evidence) : violated(['HOST_PHYSICAL_FIT_DISPROVEN'], r.evidence); // cases 21-22
  return unknown(r.reasons, r.evidence);
}

/* ------------------------------------------------------------------------------------------ */
/* Group evaluation                                                                            */
/* ------------------------------------------------------------------------------------------ */

const sortedCodes = (codes) => {
  const out = [...new Set(codes)].sort();
  for (const c of out) if (!DIAGNOSTIC_CODES.includes(c)) throw new Error(`evaluator produced an unapproved diagnostic code: ${c}`);
  return out;
};

const evidenceKey = (e) => JSON.stringify([e.factRef, e.role, e.itemId, e.memberRef, e.basis, e.recordRef, e.path]);
function uniqueEvidence(list) {
  const seen = new Map();
  for (const e of list) seen.set(evidenceKey(e), e);
  return [...seen.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, e]) => e);
}

/** 'production' only when every consulted piece of evidence is production-trusted; 'synthetic' if any is test-only; 'none' without evidence. */
export function evidenceClassOf(evidence) {
  if (evidence.length === 0) return 'none';
  return evidence.every((e) => e.productionTrusted === true) ? 'production' : 'synthetic';
}

function groupReport(group, status, codes, predicates, evidence, extra = {}) {
  const ev = uniqueEvidence(evidence);
  const evidenceClass = evidenceClassOf(ev);
  return {
    group, status, applicable: status !== null, codes: sortedCodes(codes), predicates, evidence: ev, evidenceClass,
    synthetic: evidenceClass === 'synthetic',
    selectable: false,
    installationAuthorized: false,
    ...extra
  };
}

const notEstablished = (group, codes, evidence = []) => groupReport(group, 'not_established', codes, [], evidence);

function evaluatePredicates(group, preds, env) {
  const results = preds.map((p, index) => {
    const r = evaluatePredicate(p, group, env);
    return { index, op: p?.op ?? null, outcome: r.outcome, codes: sortedCodes(r.codes), evidence: uniqueEvidence(r.evidence) };
  });
  const status = results.some((r) => r.outcome === 'violated') ? 'illegal' : results.every((r) => r.outcome === 'satisfied') ? 'legal' : 'not_established';
  return groupReport(group, status, results.flatMap((r) => r.codes), results, results.flatMap((r) => r.evidence));
}

function evaluateGroup(group, record, env) {
  const preds = record[GROUP_FIELD[group]];
  if (!Array.isArray(preds)) return notEstablished(group, ['HOST_PREDICATE_UNSUPPORTED']);

  if (group === 'install' && preds.length === 0) {
    // Case 33 / T4C-D09: an empty list is a source-backed declaration, never a wildcard. It needs a verified Item type.
    const decl = record.noAdditionalHostPrerequisite;
    if (!isObj(decl) || decl.declared !== true || decl.sourceSpecId !== record.sourceSpecId) return notEstablished(group, ['HOST_PROVENANCE_INVALID']);
    return env.itemType.status === 'known' && env.itemType.value === record.domain
      ? groupReport(group, 'legal', [], [], env.itemType.evidence, { emptyInstallDeclaration: true })
      : notEstablished(group, env.itemType.reasons, env.itemType.evidence);
  }
  if (preds.length === 0) return groupReport(group, null, [], [], [], { note: 'GROUP_HAS_NO_REQUIREMENTS' }); // T4C-F03: no fourth status

  if (group === 'payload') {
    // Case 31 and the collection prerequisites: the payload must be a trusted, fresh, host-bound snapshot with at least one member.
    if (!env.collection) return notEstablished(group, env.collectionCodes);
    if (env.collection.members.length === 0) return notEstablished(group, ['HOST_FACT_MISSING'], env.collectionEvidence);
  }
  const report = evaluatePredicates(group, preds, env);
  // Typed-domain isolation: a positive conclusion is never stronger than its domain evidence. A proven failure still stands.
  if (report.status === 'legal' && !(env.itemType.status === 'known' && env.itemType.value === record.domain)) {
    return groupReport(group, 'not_established', env.itemType.reasons, report.predicates, [...report.evidence, ...env.itemType.evidence]);
  }
  return report;
}

/* ------------------------------------------------------------------------------------------ */
/* Entry point                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/**
 * @param {object} input
 * @param {object} input.contract       an authentic VerifiedContract (verifyContractBundle)
 * @param {string} input.typedDefinitionId
 * @param {string[]} input.groups       the requested groups: any of 'install' | 'use' | 'payload'; unrequested groups yield no verdict (case 32)
 * @param {string} input.basis          'base' | 'persistent' | 'effective' - explicit; never defaulted, never fallen back from
 * @param {object} input.observationSet an authentic (unbound) ObservationSet (createObservationSet); it is bound to `ctx` here
 * @param {object} input.ctx            { authority, contractRevision, registryHash, itemFingerprints }
 * @param {{hostItemId: string, addedItemId?: string}} input.subjects
 * @param {object} [input.payload]      a CollectionSnapshot for the payload group
 */
export function evaluateHostRequirements(input) {
  if (!isObj(input)) throw new TypeError('evaluateHostRequirements: input object required');
  const { contract, typedDefinitionId, groups, basis, observationSet, ctx, subjects, payload } = input;
  if (!Array.isArray(groups) || groups.length === 0 || new Set(groups).size !== groups.length || !groups.every((g) => GROUPS.includes(g))) throw new TypeError('groups must be a non-empty list of distinct install | use | payload');
  if (!EVALUATION_BASES.includes(basis)) throw new TypeError('basis must be base, persistent or effective (never implicit)');
  if (!isObj(subjects) || !isStr(subjects.hostItemId) || (subjects.addedItemId !== undefined && !isStr(subjects.addedItemId))) throw new TypeError('subjects.hostItemId is required');
  if (!isStr(typedDefinitionId) || !isObj(ctx)) throw new TypeError('typedDefinitionId and ctx are required');

  if (!isObservationSet(observationSet)) throw new TypeError('evaluateHostRequirements: not an authentic ObservationSet');
  const ordered = GROUPS.filter((g) => groups.includes(g));
  const finish = (build) => {
    const reports = {};
    for (const g of ordered) reports[g] = build(g);
    const evidenceClasses = ordered.map((g) => reports[g].evidenceClass);
    return deepFreeze({
      schema: EVALUATION_SCHEMA_ID, typedDefinitionId, basis, requestedGroups: ordered, groups: reports,
      contractRevision: isVerifiedContract(contract) ? contract.revision : null,
      synthetic: evidenceClasses.includes('synthetic'),
      selectable: false,
      installationAuthorized: false
    });
  };

  // Case 6: only a contract produced by verifyContractBundle, evaluated against the same revision, is trusted.
  if (!isVerifiedContract(contract) || ctx.contractRevision !== contract.revision) return finish((g) => notEstablished(g, ['HOST_CONTRACT_VERSION_UNTRUSTED']));
  const record = getVerifiedRecord(contract, typedDefinitionId);
  if (!record) return finish((g) => notEstablished(g, ['HOST_DOMAIN_MISMATCH'])); // case 4

  // Bind to THIS evaluation context: classification (authority, revision, registry hash, Item fingerprints) happens now.
  const set = bindObservationSet(observationSet, ctx);
  const itemType = resolveFact(set, { factRef: 'item.type', subject: { role: 'host', itemId: subjects.hostItemId }, requestedBasis: 'base', purpose: 'printed-statistics' });
  if (itemType.status === 'known' && itemType.value !== record.domain) return finish((g) => notEstablished(g, ['HOST_DOMAIN_MISMATCH'], itemType.evidence));

  let collection = null;
  let collectionCodes = ['HOST_FACT_MISSING'];
  let collectionEvidence = [];
  if (ordered.includes('payload') && payload !== undefined && payload !== null) {
    const c = classifyCollection(payload, ctx);
    if (!c.usable) collectionCodes = c.reasons;
    else if (payload.hostItemId !== subjects.hostItemId) collectionCodes = ['HOST_PROVENANCE_INVALID'];
    else {
      collection = c;
      collectionEvidence = [{
        factRef: 'payload.items', role: 'payload', itemId: payload.hostItemId, memberRef: null, basis: 'base', recordRef: payload.provenance.source.recordRef,
        path: payload.provenance.source.path, synthetic: c.synthetic, productionTrusted: c.productionTrusted
      }];
    }
  }

  const env = { set, basis, hostItemId: subjects.hostItemId, addedItemId: subjects.addedItemId, itemType, collection, collectionCodes, collectionEvidence };
  return finish((g) => evaluateGroup(g, record, env));
}
