// D-005 T4c: static contract tests for data/modifications/host-requirements-v1.json (35 typed definitions).
//
// Scope: STATIC CONTRACT VALIDATION ONLY. There is deliberately no evaluator, adapter or simulated eligibility check here.
// T4d TEST OBLIGATION (not implemented, not authorized): behavioural outcome tests for the three-state results -- e.g.
// "trusted false use.attunedGauntletForHost => illegal for the use group only", "explicit unknown never becomes trusted
// false", "equal payload size fails smaller_by_at_least", "payload weight equal to host weight fails weight.sum_lt",
// "payload count above 1 => illegal for the payload group", "empty installRequirements => legal only with verified Item
// type, typed identity, trusted declaration and contract revision" -- belong to the future offline diagnostic and need
// actual runtime evidence. This file only proves that the static contract cannot express an unknown-as-success value and
// that every tri-state fact, boundary and scope is constructed exactly as approved.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateHostRequirements, computeRevision, parseOwnerDecisionIds, PINNED_HOST_REQUIREMENTS_SHA256,
  HOST_REQUIREMENTS_PATH, HOST_REQUIREMENTS_SCHEMA_PATH, OWNER_DECISIONS_PATH,
  OPERATORS, OPERATOR_GROUPS, FACTS, COMPATIBILITY_CHECKS, SIZE_CATEGORIES, GROUPS, GROUP_FIELD, NAHP_STATEMENT
} from '../tools/lib/host-requirements.mjs';
import { loadAndValidate } from '../tools/validate-host-requirements.mjs';
import { canonicalJson, sha256, PINNED_SCOPE_SHA256 } from '../tools/lib/modification-runtime.mjs';
import { createLegalityFramework } from '../scripts/engine/customization/modification-v2/modification-legality.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));

let checks = 0;
function check(name, fn) {
  try {
    fn();
    checks += 1;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    throw err;
  }
}

/* ---------------------------------- fixtures ---------------------------------- */

const BYTES = read(HOST_REQUIREMENTS_PATH);
const SIDECAR = JSON.parse(BYTES);
const SCHEMA = JSON.parse(read(HOST_REQUIREMENTS_SCHEMA_PATH));
const SPECS = JSON.parse(read('data/modifications/specification-records-v1.json')).records;
const REGISTRY = JSON.parse(read('data/audits/modification-rolling-authority-v1.5.json'));
const OWNER_TEXT = read(OWNER_DECISIONS_PATH);
const HOST_SPECS = SPECS.filter((r) => r.component === 'hostPrerequisites');

/** Validates a mutated copy. `rehash` keeps revision/pin consistent so ONLY the semantic rule under test can fail. */
function run(mutate, { rehash = true, bytes, schema = SCHEMA, registry = REGISTRY, specs = SPECS, owner = OWNER_TEXT } = {}) {
  const s = clone(SIDECAR);
  mutate(s);
  if (rehash) s.revision = computeRevision(s.records);
  const r = validateHostRequirements(
    { bytes: bytes ?? canonicalJson(s), sidecar: s, schema, specs, registry, ownerDecisionsText: owner },
    rehash ? { pin: computeRevision(s.records) } : {}
  );
  return { ...r, codes: [...new Set(r.failures.map((f) => f.code))].sort() };
}
const rec = (s, id) => s.records.find((r) => r.typedDefinitionId === id);
const expectCode = (result, code, label) => assert.ok(result.codes.includes(code), `${label}: expected ${code}, got ${result.codes.join(',') || 'none'}`);

const ALL_IDS = HOST_SPECS.map((r) => r.typedDefinitionId).sort();
const NONCANDIDATE = [
  'sv-cheater::weapon', 'sv-cheater::armor', 'sv-dual-gear::weapon', 'sv-dual-gear::armor', 'sv-electrograpple-handle::armor',
  'sv-memory-upgrade::weapon', 'sv-memory-upgrade::armor', 'sv-memory-upgrade-advanced::weapon', 'sv-memory-upgrade-advanced::armor', 'sv-spring-loaded::armor'
];
const EMPTY_INSTALL = [
  'sv-cloaked::weapon', 'sv-cloaked::armor', 'sv-cloaked::equipment',
  'sv-environmental-sealing::weapon', 'sv-environmental-sealing::armor', 'sv-environmental-sealing::equipment',
  'sv-miniaturized::weapon', 'sv-miniaturized::armor', 'sv-miniaturized::equipment',
  'sv-silverplate::weapon', 'sv-silverplate::armor', 'sv-silverplate::equipment'
];
const PREDICATES = (r) => GROUPS.flatMap((g) => r[GROUP_FIELD[g]].map((p) => ({ group: g, p })));

/* The approved 15-upgrade mappings (owner-decisions record section 4.4), as test expectations only. */
const SIG = {
  'sv-cheater': { install: ['compat.evidenced:canConcealCheater'], use: [], payload: [] },
  'sv-cloaked': { install: [], use: [], payload: [] },
  'sv-dual-gear': { install: ['size.not_larger:addedItem.sizeCategory<=host.sizeCategory', 'compat.evidenced:addedComponentQualifiesAsEquipment', 'compat.evidenced:addedComponentPhysicalFit'], use: [], payload: [] },
  'sv-electrograpple-handle': { install: ['compat.evidenced:canFitElectrograppleHandle'], use: ['bool.equals:use.attunedGauntletForHost=true'], payload: [] },
  'sv-environmental-sealing': { install: [], use: [], payload: [] },
  'sv-extra-power-source': { install: ['enum.intersects:host.powerSourceTypes:energy-cell,power-pack'], use: [], payload: [] },
  'sv-memory-upgrade': { install: ['int.explicit:host.intelligenceScore', 'enum.in:host.droidStatus:nondroid'], use: [], payload: [] },
  'sv-memory-upgrade-advanced': { install: ['int.explicit:host.intelligenceScore', 'enum.in:host.droidStatus:nondroid'], use: [], payload: [] },
  'sv-miniaturized': { install: [], use: [], payload: [] },
  'sv-recognition-system': { install: ['bool.equals:host.functionRestrictable=true'], use: [], payload: [] },
  'sv-remote-activation': { install: ['bool.equals:host.remotelyActivatableFunction=true'], use: [], payload: [] },
  'sv-secret-compartment': { install: ['compat.evidenced:canAccommodateHiddenCompartment'], use: [], payload: ['size.smaller_by_at_least:payload.sizeCategory<host.sizeCategory:1', 'count.at_most:payload.items:1'] },
  'sv-silverplate': { install: [], use: [], payload: [] },
  'sv-spring-loaded': { install: ['bool.equals:host.oneHandedHandheld=true'], use: [], payload: [] },
  'sv-storage-capacity': { install: ['compat.evidenced:canCarryPayload'], use: [], payload: ['size.smaller_by_at_least:payload.sizeCategory<host.sizeCategory:1', 'weight.sum_lt:payload.weightKg<host.weightKg'] }
};
const sigOf = (p) => {
  switch (p.op) {
    case 'compat.evidenced': return `${p.op}:${p.check}`;
    case 'bool.equals': return `${p.op}:${p.fact}=${p.value}`;
    case 'enum.in': case 'enum.intersects': return `${p.op}:${p.fact}:${p.allowed.join(',')}`;
    case 'int.explicit': return `${p.op}:${p.fact}`;
    case 'size.not_larger': return `${p.op}:${p.left}<=${p.right}`;
    case 'size.smaller_by_at_least': return `${p.op}:${p.left}<${p.right}:${p.steps}`;
    case 'weight.sum_lt': return `${p.op}:${p.items}<${p.limit}`;
    case 'count.at_most': return `${p.op}:${p.collection}:${p.max}`;
    default: throw new Error(`unexpected op ${p.op}`);
  }
};

/* ---------------------------------- the committed artifact ---------------------------------- */

check('the committed sidecar passes the offline validator (CLI loader)', () => {
  const r = loadAndValidate();
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  assert.deepEqual(r.counts.domains, { equipment: 15, weapon: 11, armor: 9 });
  assert.deepEqual(r.counts.verdicts, { SUPPORTED: 19, CONDITIONALLY_SUPPORTED: 16 });
  assert.equal(r.counts.total, 35);
  assert.equal(r.counts.emptyInstall, 12);
});

check('exact identity coverage: 35 of 35, no duplicate, no extra, deterministic byte-wise order', () => {
  const ids = SIDECAR.records.map((r) => r.typedDefinitionId);
  assert.equal(ids.length, 35);
  assert.equal(new Set(ids).size, 35);
  assert.deepEqual(ids, [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  assert.deepEqual(ids, ALL_IDS);
  assert.equal(HOST_SPECS.length, 35);
  for (const id of NONCANDIDATE) assert.ok(!ids.includes(id), `no record for the pending noncandidate pair ${id}`);
  assert.equal(NONCANDIDATE.length, 10);
  const parents = new Set(ids.map((i) => i.split('::')[0]));
  assert.equal(parents.size, 15);
});

check('source linkage: each record links its exact D005 record, printed page, domain and verdict (19 / 16)', () => {
  let s = 0;
  let c = 0;
  for (const r of SIDECAR.records) {
    const spec = HOST_SPECS.find((x) => x.typedDefinitionId === r.typedDefinitionId);
    assert.ok(spec, r.typedDefinitionId);
    assert.equal(r.sourceSpecId, `D005::${r.typedDefinitionId}`);
    assert.equal(spec.specId, r.sourceSpecId);
    assert.equal(spec.coverage, 'PUBLISHED_FACTS');
    assert.equal(r.source.printedPage, spec.publication.printedPage);
    assert.equal(r.source.bookId, spec.publication.bookId);
    assert.equal(r.domain, r.typedDefinitionId.split('::')[1]);
    // Test-side verification of the transcribed domain verdict statement in the committed record (not a rule parse).
    const stated = /domain verdict (SUPPORTED|CONDITIONALLY SUPPORTED)\./.exec(spec.behavior)[1].replace(' ', '_');
    assert.equal(r.domainVerdict, stated, r.typedDefinitionId);
    r.domainVerdict === 'SUPPORTED' ? (s += 1) : (c += 1);
  }
  assert.deepEqual([s, c], [19, 16]);
  const sc = SIDECAR.records.filter((r) => r.typedDefinitionId.startsWith('sv-secret-compartment::'));
  assert.equal(sc.length, 3);
  for (const r of sc) {
    assert.equal(r.source.printedPage, 41);
    assert.equal(r.source.continuesOnPage, 42);
    assert.match(HOST_SPECS.find((x) => x.typedDefinitionId === r.typedDefinitionId).publication.tableOrSection, /continues on printed p\. 42/);
  }
  assert.equal(SIDECAR.records.filter((r) => 'continuesOnPage' in r.source).length, 3);
});

check('registry scope: the 35 are exactly the CONDITIONAL_UNVERIFIED pairs; the 10 noncandidate pairs are absent and registry v1.5 is byte-identical', () => {
  const pairs = [];
  for (const p of new Set(ALL_IDS.map((i) => i.split('::')[0]))) {
    const d = REGISTRY.definitions.find((x) => x.id === p);
    for (const [dom, v] of Object.entries(d.domainApplicability)) {
      if (v === 'CONDITIONAL_UNVERIFIED') pairs.push(`${p}::${dom}`);
      else assert.equal(v, 'NOT_CANDIDATE_PENDING_SOURCE_REVIEW', `${p}::${dom}`);
    }
  }
  assert.deepEqual(pairs.sort(), ALL_IDS);
  assert.equal(sha256(fs.readFileSync(path.join(root, 'data/audits/modification-rolling-authority-v1.5.json'))), '7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00');
});

check('the approved 15 mappings are represented exactly (install / use / payload separated)', () => {
  for (const r of SIDECAR.records) {
    const parent = r.typedDefinitionId.split('::')[0];
    const want = SIG[parent];
    assert.deepEqual(r.installRequirements.map(sigOf), want.install, `${r.typedDefinitionId} install`);
    assert.deepEqual(r.useRequirements.map(sigOf), want.use, `${r.typedDefinitionId} use`);
    assert.deepEqual(r.payloadRequirements.map(sigOf), want.payload, `${r.typedDefinitionId} payload`);
  }
  assert.equal(Object.keys(SIG).length, 15);
});

check('source-specific scoping: attunement is use-only, the one-item limit is payload-only, host accommodation is install-only', () => {
  for (const r of SIDECAR.records) {
    for (const { group, p } of PREDICATES(r)) {
      if (p.fact === 'use.attunedGauntletForHost') assert.equal(group, 'use');
      if (p.op === 'count.at_most') assert.equal(group, 'payload');
      if (p.op === 'compat.evidenced') assert.equal(group, 'install');
    }
  }
  const eg = SIDECAR.records.filter((r) => r.typedDefinitionId.startsWith('sv-electrograpple-handle::'));
  assert.equal(eg.length, 2);
  for (const r of eg) {
    assert.ok(r.installRequirements.every((p) => p.fact !== 'use.attunedGauntletForHost'), 'attunement is never an installation prerequisite');
    assert.equal(r.useRequirements.length, 1);
  }
  const counts = SIDECAR.records.flatMap((r) => r.payloadRequirements.filter((p) => p.op === 'count.at_most'));
  assert.equal(counts.length, 3);
  for (const p of counts) assert.deepEqual([p.collection, p.max], ['payload.items', 1]);
  assert.ok(SIDECAR.records.filter((r) => r.typedDefinitionId.startsWith('sv-storage-capacity::')).every((r) => r.payloadRequirements.every((p) => p.op !== 'count.at_most')), 'Storage Capacity has no item-count limit');
});

check('strict boundaries: equal size passes only Dual Gear (not_larger); smaller-by-one for payloads; weight is strictly less', () => {
  const dg = SIDECAR.records.find((r) => r.typedDefinitionId === 'sv-dual-gear::equipment');
  assert.ok(dg.installRequirements.some((p) => p.op === 'size.not_larger'));
  assert.ok(dg.payloadRequirements.length === 0);
  const smaller = SIDECAR.records.flatMap((r) => r.payloadRequirements.filter((p) => p.op === 'size.smaller_by_at_least'));
  assert.equal(smaller.length, 6);
  for (const p of smaller) assert.equal(p.steps, 1);
  const weights = SIDECAR.records.flatMap((r) => r.payloadRequirements.filter((p) => p.op === 'weight.sum_lt'));
  assert.equal(weights.length, 3);
  assert.deepEqual(OPERATORS.filter((o) => /sum_l|at_most|not_larger|smaller/.test(o)).sort(), ['count.at_most', 'size.not_larger', 'size.smaller_by_at_least', 'weight.sum_lt']);
  assert.deepEqual(OPERATORS.filter((o) => o.startsWith('weight.')), ['weight.sum_lt'], 'the only weight operator is the strict one');
  assert.deepEqual(SIZE_CATEGORIES, ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal']);
});

check('empty-install definitions: exactly the 12 approved, each with a source-backed declaration', () => {
  const empties = SIDECAR.records.filter((r) => r.installRequirements.length === 0).map((r) => r.typedDefinitionId).sort();
  assert.deepEqual(empties, [...EMPTY_INSTALL].sort());
  for (const r of SIDECAR.records) {
    if (EMPTY_INSTALL.includes(r.typedDefinitionId)) {
      assert.deepEqual(r.noAdditionalHostPrerequisite, { declared: true, statement: NAHP_STATEMENT, sourceSpecId: r.sourceSpecId, printedPage: r.source.printedPage });
      assert.deepEqual([r.useRequirements.length, r.payloadRequirements.length], [0, 0]);
    } else assert.equal(r.noAdditionalHostPrerequisite, null);
  }
});

check('authority: every predicate is a PUBLISHED_RULE citing its own D005 record and page; compat evidence methods are owner engineering checks that resolve', () => {
  const ids = parseOwnerDecisionIds(OWNER_TEXT);
  assert.equal(ids.size, 23);
  let compat = 0;
  for (const r of SIDECAR.records) {
    for (const { p } of PREDICATES(r)) {
      assert.deepEqual(p.authority, { kind: 'PUBLISHED_RULE', sourceSpecId: r.sourceSpecId, printedPage: r.source.printedPage }, r.typedDefinitionId);
      if (p.op === 'compat.evidenced') {
        compat += 1;
        assert.equal(p.evidenceMethod.kind, 'OWNER_ENGINEERING_CHECK');
        for (const x of p.evidenceMethod.ownerRulingIds) assert.ok(ids.has(x), x);
        assert.ok(p.evidenceMethod.ownerRulingIds.includes('T4C-D05'));
        if (r.typedDefinitionId.startsWith('sv-dual-gear::') && p.check.startsWith('addedComponent')) assert.ok(p.evidenceMethod.ownerRulingIds.includes('T4C-F09'));
      } else assert.ok(!('evidenceMethod' in p));
    }
  }
  // Cheater 1, Dual Gear 2, Electrograpple 2 (weapon, equipment), Secret Compartment 3, Storage Capacity 3
  assert.equal(compat, 1 + 2 + 2 + 3 + 3);
});

check('stacking: separate from eligibility, no invented limit, registry vocabulary untouched', () => {
  for (const r of SIDECAR.records) {
    assert.equal(r.stacking.maxPerHost, null);
    const parent = r.typedDefinitionId.split('::')[0];
    const want = parent === 'sv-extra-power-source' ? 'EXPLICITLY_REPEATABLE' : parent.startsWith('sv-memory-upgrade') ? 'ADVANCED_REPLACES_BASIC_NO_STACKING' : 'NOT_SPECIFIED_BY_SOURCE';
    assert.equal(r.stacking.fact, want, r.typedDefinitionId);
  }
  for (const p of new Set(ALL_IDS.map((i) => i.split('::')[0]))) {
    const d = REGISTRY.definitions.find((x) => x.id === p);
    assert.equal(d.eligibility.stackingPolicy, 'UNVERIFIED');
    assert.equal(d.eligibility.maxPerHost, null);
  }
  assert.ok(SIDECAR.records.every((r) => r.installRequirements.every((p) => p.op !== 'count.at_most')), 'no count limit on installations');
});

check('effect references are neutral labels with source links only (no digits, formulas or installation predicates)', () => {
  for (const r of SIDECAR.records) {
    assert.ok(r.effectReferences.length >= 1);
    for (const e of r.effectReferences) {
      assert.deepEqual(Object.keys(e), ['label', 'sourceSpecId']);
      assert.ok(!/\d/.test(e.label));
      assert.equal(e.sourceSpecId, r.sourceSpecId);
    }
  }
  for (const id of ['sv-silverplate', 'sv-spring-loaded']) {
    for (const r of SIDECAR.records.filter((x) => x.typedDefinitionId.startsWith(`${id}::`))) assert.match(r.effectReferences[0].label, /outside host-eligibility scope/);
  }
});

/* ---------------------------------- vocabulary and schema ---------------------------------- */

check('exactly nine operators; every operator is used; each appears only in an allowed group', () => {
  assert.equal(OPERATORS.length, 9);
  assert.equal(new Set(OPERATORS).size, 9);
  assert.deepEqual(Object.keys(OPERATOR_GROUPS).sort(), [...OPERATORS].sort());
  const used = new Set();
  for (const r of SIDECAR.records) for (const { group, p } of PREDICATES(r)) {
    used.add(p.op);
    assert.ok(OPERATOR_GROUPS[p.op].includes(group), `${r.typedDefinitionId} ${p.op} in ${group}`);
  }
  assert.deepEqual([...used].sort(), [...OPERATORS].sort());
  assert.deepEqual(OPERATOR_GROUPS['count.at_most'], ['payload']);
  assert.equal(SCHEMA.$defs.predicate.oneOf.length, 9);
});

check('schema parity: enumerations equal the validator vocabularies; the schema pins the schema id and 35 records', () => {
  const r = run(() => {});
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  assert.equal(SCHEMA.properties.schema.const, 'swse.modification.host-requirements/1');
  assert.equal(SCHEMA.properties.records.minItems, 35);
  assert.equal(SCHEMA.properties.records.maxItems, 35);
  assert.equal(SCHEMA.additionalProperties, false);
  assert.deepEqual(SCHEMA.$defs.fact.enum, Object.keys(FACTS));
  assert.deepEqual(SCHEMA.$defs.check.enum, Object.keys(COMPATIBILITY_CHECKS));
  for (const mutate of [(s) => s.$defs.operator.enum.pop(), (s) => s.$defs.size.enum.reverse(), (s) => { s.$defs.fact.enum.push('host.invented'); }, (s) => { s.properties.schema.const = 'x'; }, (s) => { delete s.$defs; }]) {
    const sc = clone(SCHEMA);
    mutate(sc);
    expectCode(run(() => {}, { schema: sc }), 'HRV_SCHEMA_PARITY', 'schema mutation');
  }
});

check('the 32 approved diagnostic codes are preserved: unique, documented in the case table, distinct from G3 codes and from HRV_* codes', () => {
  const g3 = new Set(['HOST_REQUIREMENTS_NOT_SPECIFIED', 'HOST_EVALUATOR_NOT_NAMED', 'HOST_EVALUATOR_NOT_REGISTERED', 'HOST_EVALUATOR_THREW', 'HOST_EVALUATOR_MALFORMED']);
  const section = OWNER_TEXT.split('### 5.1')[1].split('### 5.2')[0];
  const table = OWNER_TEXT.split('### 5.2')[1].split('## 6.')[0];
  const codes = [...section.matchAll(/`((?:HOST|PAYLOAD)_[A-Z_]+)`/g)].map((m) => m[1]).filter((c) => !g3.has(c));
  assert.equal(codes.length, 32);
  assert.equal(new Set(codes).size, 32);
  for (const c of codes) assert.ok(table.includes(`\`${c}\``), `${c} in case-to-code table`);
  for (const c of ['PAYLOAD_ITEM_COUNT_EXCEEDED', 'HOST_ATTUNED_GAUNTLET_UNAVAILABLE', 'HOST_INTELLIGENCE_MISSING', 'HOST_INTELLIGENCE_SCORE_ABSENT', 'HOST_PHYSICAL_FIT_UNKNOWN', 'HOST_PHYSICAL_FIT_DISPROVEN']) assert.ok(codes.includes(c));
  assert.deepEqual(SCHEMA.$defs.diagnosticCode.enum, codes);
  assert.ok(codes.every((c) => !c.startsWith('HRV_') && !g3.has(c)));
  assert.match(table, /equality fails/);
  assert.match(OWNER_TEXT, /\*\*T4C-F09 /);
});

/* ---------------------------------- tri-state / unknown safeguards ---------------------------------- */

const TRI = ['host.oneHandedHandheld', 'host.functionRestrictable', 'host.remotelyActivatableFunction', 'use.attunedGauntletForHost'];
const triPredicate = (s, fact) => {
  for (const r of s.records) for (const g of GROUPS) for (const p of r[GROUP_FIELD[g]]) if (p.op === 'bool.equals' && p.fact === fact) return p;
  return null;
};

check('the static contract cannot express unknown / null / default / untrusted as an accepted value (bool.equals, all tri-state facts)', () => {
  for (const fact of TRI) {
    assert.equal(FACTS[fact].kind, 'tri');
    for (const bad of ['unknown', null, 'true', 'false', 1, 0, 'default', 'derived', 'untrusted', undefined]) {
      const r = run((s) => { const p = triPredicate(s, fact); p.value = bad; });
      assert.equal(r.ok, false, `${fact}=${String(bad)}`);
      assert.ok(r.codes.includes('HRV_UNKNOWN_OPERAND') || r.codes.includes('HRV_OPERAND') || r.codes.includes('HRV_FIELDS'), `${fact}=${String(bad)}: ${r.codes}`);
    }
    // an explicit boolean false is a representable value but still passes only as a boolean literal, never as 'unknown'
    assert.equal(run((s) => { triPredicate(s, fact).value = false; }).ok, true);
  }
  // the droid-status enum: 'unknown' is a runtime state, never an operand, alone or alongside nondroid
  for (const allowed of [['unknown'], ['nondroid', 'unknown'], [], ['droid', 'droid'], ['default'], 'nondroid']) {
    const r = run((s) => { for (const rr of s.records) for (const p of rr.installRequirements) if (p.fact === 'host.droidStatus') p.allowed = allowed; });
    assert.equal(r.ok, false, JSON.stringify(allowed));
  }
  expectCode(run((s) => { for (const rr of s.records) for (const p of rr.installRequirements) if (p.fact === 'host.droidStatus') p.allowed = ['unknown']; }), 'HRV_UNKNOWN_OPERAND', 'droid unknown');
  // the committed artifact never mentions unknown or a trust class as an operand value
  const text = JSON.stringify(SIDECAR.records.flatMap((r) => PREDICATES(r).map((x) => x.p)));
  for (const word of ['unknown', 'default', 'derived', 'untrusted', 'attested']) assert.ok(!text.includes(`"${word}"`), word);
});

check('no observation of any real Item is embedded in the contract; no evaluator-state fields exist', () => {
  const forbidden = ['observed', 'observedValue', 'trust', 'itemId', 'itemName', 'value:unknown', 'hostEvaluator', 'hostRequirementsSpecified', 'runtimeSelectable', 'verdict', 'status'];
  const keys = new Set();
  const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); } };
  walk(SIDECAR);
  for (const k of forbidden) assert.ok(!keys.has(k), k);
});

/* ---------------------------------- negative / mutation: structure ---------------------------------- */

check('mutations: unknown or malformed operators, facts, operands and unexpected fields are rejected', () => {
  const first = (s, id, g = 'installRequirements') => rec(s, id)[g][0];
  expectCode(run((s) => { first(s, 'sv-spring-loaded::weapon').op = 'bool.compare'; }), 'HRV_OPERATOR', 'unknown operator');
  expectCode(run((s) => { first(s, 'sv-spring-loaded::weapon').op = 'eval'; }), 'HRV_OPERATOR', 'eval');
  expectCode(run((s) => { first(s, 'sv-spring-loaded::weapon').fact = 'host.invented'; }), 'HRV_FACT', 'unknown fact');
  expectCode(run((s) => { first(s, 'sv-spring-loaded::weapon').fact = 'host.sizeCategory'; }), 'HRV_OPERAND', 'fact kind mismatch');
  expectCode(run((s) => { first(s, 'sv-spring-loaded::weapon').extra = 1; }), 'HRV_FIELDS', 'extra predicate field');
  expectCode(run((s) => { delete first(s, 'sv-spring-loaded::weapon').value; }), 'HRV_FIELDS', 'missing operand');
  expectCode(run((s) => { rec(s, 'sv-spring-loaded::weapon').extra = true; }), 'HRV_FIELDS', 'extra record field');
  expectCode(run((s) => { delete rec(s, 'sv-spring-loaded::weapon').stacking; }), 'HRV_FIELDS', 'missing record field');
  expectCode(run((s) => { const p = first(s, 'sv-spring-loaded::weapon'); const { op, fact, value, authority } = p; Object.keys(p).forEach((k) => delete p[k]); Object.assign(p, { fact, op, value, authority }); }), 'HRV_FIELDS', 'predicate key order');
  expectCode(run((s) => { const r = rec(s, 'sv-spring-loaded::weapon'); const { typedDefinitionId, ...rest } = r; Object.keys(r).forEach((k) => delete r[k]); Object.assign(r, rest, { typedDefinitionId }); }), 'HRV_FIELDS', 'record key order');
  expectCode(run((s) => { first(s, 'sv-extra-power-source::weapon').allowed = ['energy-cell', 'plasma']; }), 'HRV_ENUM_VALUE', 'unknown enum value');
  expectCode(run((s) => { first(s, 'sv-extra-power-source::weapon').allowed = 'energy-cell'; }), 'HRV_OPERAND', 'allowed not array');
  expectCode(run((s) => { first(s, 'sv-extra-power-source::weapon').fact = 'host.droidStatus'; }), 'HRV_OPERAND', 'set op on enum fact');
  expectCode(run((s) => { rec(s, 'sv-memory-upgrade::equipment').installRequirements[1].fact = 'host.intelligenceScore'; }), 'HRV_OPERAND', 'enum op on int fact');
  expectCode(run((s) => { rec(s, 'sv-memory-upgrade::equipment').installRequirements[0].fact = 'host.droidStatus'; }), 'HRV_OPERAND', 'int op on enum fact');
  expectCode(run((s) => { const p = rec(s, 'sv-memory-upgrade::equipment').installRequirements[0]; p.min = 12; }), 'HRV_FIELDS', 'numeric Intelligence threshold');
  expectCode(run((s) => { rec(s, 'sv-storage-capacity::weapon').payloadRequirements[1].items = 'host.weightKg'; }), 'HRV_OPERAND', 'wrong weight operand');
  expectCode(run((s) => { rec(s, 'sv-storage-capacity::weapon').payloadRequirements[0].left = 'host.sizeCategory'; }), 'HRV_OPERAND', 'wrong size operand');
  expectCode(run((s) => { rec(s, 'sv-dual-gear::equipment').installRequirements[0].left = 'host.sizeCategory'; }), 'HRV_OPERAND', 'not_larger direction');
  expectCode(run((s) => { rec(s, 'sv-storage-capacity::weapon').payloadRequirements[0].steps = 0; }), 'HRV_OPERAND', 'steps 0');
  expectCode(run((s) => { rec(s, 'sv-storage-capacity::weapon').payloadRequirements[0].steps = 2; }), 'HRV_OPERAND', 'steps 2 not approved');
  expectCode(run((s) => { rec(s, 'sv-storage-capacity::weapon').payloadRequirements[0].steps = '1'; }), 'HRV_OPERAND', 'steps string');
  for (const max of [-1, 1.5, '1', null, undefined]) expectCode(run((s) => { rec(s, 'sv-secret-compartment::weapon').payloadRequirements[1].max = max; }), 'HRV_OPERAND', `max ${String(max)}`);
});

check('mutations: operators and facts in disallowed groups are rejected (including attunement outside use and count outside payload)', () => {
  const sc = 'sv-secret-compartment::armor';
  expectCode(run((s) => { const r = rec(s, sc); r.installRequirements.push(r.payloadRequirements.pop()); }), 'HRV_OPERATOR_GROUP', 'count.at_most in install');
  expectCode(run((s) => { const r = rec(s, sc); r.useRequirements.push(r.payloadRequirements.pop()); }), 'HRV_OPERATOR_GROUP', 'count.at_most in use');
  expectCode(run((s) => { const r = rec(s, 'sv-electrograpple-handle::weapon'); r.installRequirements.push(r.useRequirements.pop()); }), 'HRV_FACT_GROUP', 'attunement in install');
  expectCode(run((s) => { const r = rec(s, 'sv-electrograpple-handle::weapon'); r.payloadRequirements.push(r.useRequirements.pop()); }), 'HRV_FACT_GROUP', 'attunement in payload');
  expectCode(run((s) => { const r = rec(s, 'sv-storage-capacity::weapon'); r.installRequirements.push(r.payloadRequirements.pop()); }), 'HRV_OPERATOR_GROUP', 'weight.sum_lt in install');
  expectCode(run((s) => { const r = rec(s, 'sv-dual-gear::equipment'); r.payloadRequirements.push(r.installRequirements.shift()); }), 'HRV_OPERATOR_GROUP', 'size.not_larger in payload');
  expectCode(run((s) => { const r = rec(s, 'sv-memory-upgrade::equipment'); r.useRequirements.push(r.installRequirements.shift()); }), 'HRV_OPERATOR_GROUP', 'int.explicit in use');
  expectCode(run((s) => { const r = rec(s, 'sv-cloaked::weapon'); r.installRequirements.push({ op: 'bool.equals', fact: 'item.type', value: true, authority: { kind: 'PUBLISHED_RULE', sourceSpecId: r.sourceSpecId, printedPage: 40 } }); }), 'HRV_FACT_GROUP', 'item.type is not a predicate fact');
  assert.deepEqual(OPERATOR_GROUPS['compat.evidenced'], ['install', 'use', 'payload']);
});

check('mutations: authority and evidence-method forgery is rejected', () => {
  const ep = 'sv-extra-power-source::weapon';
  const cc = 'sv-cheater::equipment';
  expectCode(run((s) => { rec(s, ep).installRequirements[0].authority.sourceSpecId = 'D005::sv-cheater::equipment'; }), 'HRV_AUTHORITY', 'borrowed evidence from another record');
  expectCode(run((s) => { rec(s, ep).installRequirements[0].authority.sourceSpecId = 'D005::sv-extra-power-source::armor'; }), 'HRV_AUTHORITY', 'borrowed evidence across domains');
  expectCode(run((s) => { rec(s, ep).installRequirements[0].authority.printedPage = 40; }), 'HRV_AUTHORITY', 'wrong authority page');
  expectCode(run((s) => { rec(s, ep).installRequirements[0].authority.kind = 'RULES_CERTIFIED'; }), 'HRV_AUTHORITY', 'unsupported authority kind');
  expectCode(run((s) => { rec(s, ep).installRequirements[0].authority = { kind: 'OWNER_ENGINEERING_CHECK', ownerRulingIds: ['T4C-D05'] }; }), 'HRV_AUTHORITY', 'engineering check as authority of a non-compat predicate');
  expectCode(run((s) => { rec(s, cc).installRequirements[0].authority = { kind: 'OWNER_ENGINEERING_CHECK', ownerRulingIds: ['T4C-D05'] }; }), 'HRV_AUTHORITY', 'engineering check as requirement authority');
  expectCode(run((s) => { rec(s, cc).installRequirements[0].evidenceMethod.kind = 'PUBLISHED_RULE'; }), 'HRV_EVIDENCE_METHOD', 'published rule as evidence method');
  expectCode(run((s) => { rec(s, cc).installRequirements[0].evidenceMethod.ownerRulingIds = ['T4C-D99']; }), 'HRV_AUTHORITY_REF', 'unresolved owner id');
  expectCode(run((s) => { rec(s, cc).installRequirements[0].evidenceMethod.ownerRulingIds = []; }), 'HRV_AUTHORITY_REF', 'empty owner ids');
  expectCode(run((s) => { rec(s, cc).installRequirements[0].evidenceMethod.ownerRulingIds = ['T4C-D05', 'T4C-D05']; }), 'HRV_AUTHORITY_REF', 'duplicate owner ids');
  expectCode(run((s) => { delete rec(s, cc).installRequirements[0].evidenceMethod; }), 'HRV_FIELDS', 'missing evidence method');
  expectCode(run(() => {}, { owner: OWNER_TEXT.replace('**T4C-D05 ', '**T4C-X05 ') }), 'HRV_AUTHORITY_REF', 'owner decision removed from the owner record');
  expectCode(run(() => {}, { owner: 'no decisions' }), 'HRV_OWNER_DOC', 'owner record missing');
  expectCode(run((s) => { rec(s, cc).installRequirements[0].check = 'canCarryPayload'; }), 'HRV_CHECK', 'check scoped to another upgrade');
  expectCode(run((s) => { rec(s, cc).installRequirements[0].check = 'canInvent'; }), 'HRV_CHECK', 'unknown check');
});

check('mutations: the Dual Gear checks stay two distinct conditions and component qualification is not inferred from Item type', () => {
  const dg = rec(SIDECAR, 'sv-dual-gear::equipment');
  const checks = dg.installRequirements.filter((p) => p.op === 'compat.evidenced').map((p) => p.check);
  assert.deepEqual(checks, ['addedComponentQualifiesAsEquipment', 'addedComponentPhysicalFit']);
  assert.ok(!dg.installRequirements.some((p) => p.fact === 'item.type'), 'component qualification is not an Item.type predicate');
  assert.equal(FACTS['item.type'].groups.length, 0);
  assert.ok(dg.installRequirements.some((p) => p.op === 'size.not_larger' && p.authority.kind === 'PUBLISHED_RULE'));
});

check('mutations: empty-install declarations are required exactly when installRequirements is empty', () => {
  const ci = 'sv-cloaked::weapon';
  expectCode(run((s) => { rec(s, ci).noAdditionalHostPrerequisite = null; }), 'HRV_EMPTY_INSTALL', 'omitted declaration');
  expectCode(run((s) => { rec(s, ci).noAdditionalHostPrerequisite.declared = false; }), 'HRV_EMPTY_INSTALL', 'declared false');
  expectCode(run((s) => { rec(s, ci).noAdditionalHostPrerequisite.statement = 'Any item may host this.'; }), 'HRV_EMPTY_INSTALL', 'changed statement');
  expectCode(run((s) => { rec(s, ci).noAdditionalHostPrerequisite.sourceSpecId = 'D005::sv-cloaked::armor'; }), 'HRV_EMPTY_INSTALL', 'other record cited');
  expectCode(run((s) => { rec(s, ci).noAdditionalHostPrerequisite.printedPage = 41; }), 'HRV_EMPTY_INSTALL', 'wrong page');
  expectCode(run((s) => { delete rec(s, ci).noAdditionalHostPrerequisite; }), 'HRV_FIELDS', 'declaration key missing');
  expectCode(run((s) => { const r = rec(s, 'sv-spring-loaded::weapon'); r.noAdditionalHostPrerequisite = { declared: true, statement: NAHP_STATEMENT, sourceSpecId: r.sourceSpecId, printedPage: r.source.printedPage }; }), 'HRV_EMPTY_INSTALL', 'declaration on a record with install requirements');
  expectCode(run((s) => { const r = rec(s, 'sv-spring-loaded::weapon'); r.installRequirements = []; }), 'HRV_EMPTY_INSTALL', 'emptied install requirements without a declaration');
});

check('mutations: identity, coverage, ordering, source and stacking tampering is rejected', () => {
  expectCode(run((s) => { s.records.pop(); }), 'HRV_COUNT', 'dropped record');
  expectCode(run((s) => { s.records.pop(); }), 'HRV_IDENTITY', 'dropped record identity');
  expectCode(run((s) => { s.records.push(clone(s.records[0])); }), 'HRV_DUPLICATE', 'duplicate record');
  expectCode(run((s) => { const r = clone(s.records[0]); r.typedDefinitionId = 'sv-cheater::weapon'; r.sourceSpecId = 'D005::sv-cheater::weapon'; r.domain = 'weapon'; s.records.push(r); }), 'HRV_IDENTITY', 'noncandidate pair added');
  expectCode(run((s) => { s.records.reverse(); }), 'HRV_ORDER', 'reordered');
  expectCode(run((s) => { [s.records[0], s.records[1]] = [s.records[1], s.records[0]]; }), 'HRV_ORDER', 'swapped');
  expectCode(run((s) => { rec(s, 'sv-cheater::equipment').sourceSpecId = 'D005::sv-cloaked::equipment'; }), 'HRV_SOURCE_LINK', 'wrong source spec');
  expectCode(run((s) => { rec(s, 'sv-cheater::equipment').source.printedPage = 41; }), 'HRV_PAGE', 'wrong page');
  expectCode(run((s) => { rec(s, 'sv-cheater::equipment').source.printedPage = '40'; }), 'HRV_PAGE', 'page not an integer');
  expectCode(run((s) => { rec(s, 'sv-cheater::equipment').source.bookId = 'other'; }), 'HRV_PAGE', 'wrong book');
  expectCode(run((s) => { rec(s, 'sv-secret-compartment::weapon').source.continuesOnPage = 41; }), 'HRV_PAGE', 'continuation not after page');
  expectCode(run((s) => { rec(s, 'sv-cheater::equipment').domain = 'weapon'; }), 'HRV_DOMAIN', 'domain mismatch');
  expectCode(run((s) => { rec(s, 'sv-cheater::equipment').domainVerdict = 'RULES_CERTIFIED'; }), 'HRV_VERDICT', 'verdict');
  expectCode(run((s) => { s.schema = 'swse.modification.host-requirements/2'; }), 'HRV_SCHEMA_ID', 'schema id');
  expectCode(run((s) => { rec(s, 'sv-spring-loaded::weapon').stacking.maxPerHost = 1; }), 'HRV_STACKING', 'invented maximum');
  expectCode(run((s) => { rec(s, 'sv-spring-loaded::weapon').stacking.fact = 'UNLIMITED'; }), 'HRV_STACKING', 'invented stacking fact');
  expectCode(run((s) => { rec(s, 'sv-cheater::equipment').effectReferences[0].label = 'Adds +2 (x2)!'; }), 'HRV_EFFECT_REF', 'formula-like effect label');
  expectCode(run((s) => { rec(s, 'sv-cheater::equipment').effectReferences[0].label = 'Adds 2 to checks'; }), 'HRV_EFFECT_REF', 'numeric effect label');
  expectCode(run((s) => { rec(s, 'sv-cheater::equipment').effectReferences[0].sourceSpecId = 'D005::sv-cloaked::equipment'; }), 'HRV_EFFECT_REF', 'effect ref other record');
  expectCode(run((s) => { s.records = {}; }), 'HRV_SHAPE', 'records not array');
  expectCode(run((s) => { s.extra = 1; }), 'HRV_FIELDS', 'unexpected root field');
});

check('mutations: registry-scope tampering (domain-pair changes) is detected without modifying the registry', () => {
  const reg = clone(REGISTRY);
  const cheater = reg.definitions.find((d) => d.id === 'sv-cheater');
  cheater.domainApplicability.weapon = 'CONDITIONAL_UNVERIFIED';
  expectCode(run(() => {}, { registry: reg }), 'HRV_REGISTRY_SCOPE', 'noncandidate pair became applicable');
  const reg2 = clone(REGISTRY);
  reg2.definitions.find((d) => d.id === 'sv-silverplate').domainApplicability.armor = 'NOT_CANDIDATE_PENDING_SOURCE_REVIEW';
  expectCode(run(() => {}, { registry: reg2 }), 'HRV_REGISTRY_SCOPE', 'covered pair no longer applicable');
  const reg3 = clone(REGISTRY);
  reg3.definitions = reg3.definitions.filter((d) => d.id !== 'sv-storage-capacity');
  expectCode(run(() => {}, { registry: reg3 }), 'HRV_REGISTRY_SCOPE', 'parent missing');
  assert.equal(sha256(fs.readFileSync(path.join(root, 'data/audits/modification-rolling-authority-v1.5.json'))), '7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00');
});

/* ---------------------------------- integrity and canonical serialization ---------------------------------- */

check('integrity: the stored revision equals the canonical records hash and the independent pin; PINNED_SCOPE_SHA256 is untouched', () => {
  assert.equal(SIDECAR.revision, computeRevision(SIDECAR.records));
  assert.equal(SIDECAR.revision, sha256(canonicalJson(SIDECAR.records)));
  assert.equal(PINNED_HOST_REQUIREMENTS_SHA256, SIDECAR.revision);
  assert.match(PINNED_HOST_REQUIREMENTS_SHA256, /^[0-9a-f]{64}$/);
  assert.equal(BYTES, canonicalJson(SIDECAR));
  assert.deepEqual(Object.keys(PINNED_SCOPE_SHA256), ['D-001', 'D-004', 'D-005', 'D-006', 'D-010', 'D-011', 'D-013', 'D-014', 'D-015']);
  assert.ok(!Object.values(PINNED_SCOPE_SHA256).includes(PINNED_HOST_REQUIREMENTS_SHA256));
  assert.ok(!read('tools/lib/host-requirements.mjs').includes('PINNED_SCOPE_SHA256 ='), 'the existing scope pin is neither redefined nor modified here');
});

check('integrity: an unauthorized edit is caught by the revision AND the independent pin; a self-consistent edit is caught by the pin alone', () => {
  const tampered = clone(SIDECAR);
  rec(tampered, 'sv-spring-loaded::weapon').upgradeLabel = 'Spring Loaded (edited)';
  // edited content, stale self-reported revision
  const a = validateHostRequirements({ bytes: canonicalJson(tampered), sidecar: tampered, schema: SCHEMA, specs: SPECS, registry: REGISTRY, ownerDecisionsText: OWNER_TEXT });
  const aCodes = new Set(a.failures.map((f) => f.code));
  assert.ok(aCodes.has('HRV_REVISION') && aCodes.has('HRV_PIN'));
  // edited content with a recomputed, self-consistent revision: only the trusted pin detects it
  tampered.revision = computeRevision(tampered.records);
  const b = validateHostRequirements({ bytes: canonicalJson(tampered), sidecar: tampered, schema: SCHEMA, specs: SPECS, registry: REGISTRY, ownerDecisionsText: OWNER_TEXT });
  assert.deepEqual([...new Set(b.failures.map((f) => f.code))], ['HRV_PIN']);
  // the pin override used by these tests is the only way to accept the edit
  assert.equal(validateHostRequirements({ bytes: canonicalJson(tampered), sidecar: tampered, schema: SCHEMA, specs: SPECS, registry: REGISTRY, ownerDecisionsText: OWNER_TEXT }, { pin: tampered.revision }).ok, true);
});

check('integrity: noncanonical output and reordered records are rejected', () => {
  expectCode(run(() => {}, { bytes: JSON.stringify(SIDECAR) }), 'HRV_CANONICAL', 'compact serialization');
  expectCode(run(() => {}, { bytes: `${canonicalJson(SIDECAR)}\n` }), 'HRV_CANONICAL', 'extra trailing newline');
  expectCode(run(() => {}, { bytes: canonicalJson(SIDECAR).replace(/ /, '  ') }), 'HRV_CANONICAL', 'indent');
  expectCode(run((s) => { s.records.reverse(); }), 'HRV_ORDER', 'reordered records');
  const reordered = clone(SIDECAR);
  reordered.records.reverse();
  reordered.revision = computeRevision(reordered.records);
  assert.notEqual(reordered.revision, SIDECAR.revision, 'record order is part of the hashed content');
  assert.equal(run((s) => { s.revision = 'f'.repeat(64); }, { rehash: false }).codes.includes('HRV_REVISION'), true);
});

/* ---------------------------------- scope: nothing operational changed ---------------------------------- */

check('non-effects: no evaluator exists, G3 still answers not_established for all 35, and nothing is selectable', () => {
  const runtime = JSON.parse(read('data/modifications/runtime-definitions-v1.5.json'));
  assert.equal(runtime.header.counts.runtimeSelectable, 0);
  const typed = runtime.records.flatMap((d) => Object.values(d.domains));
  assert.equal(typed.length, 232);
  assert.ok(typed.every((t) => t.runtimeSelectable === false || t.runtimeSelectable?.selectable === false || !t.runtimeSelectable));
  assert.ok(typed.every((t) => t.applicability.hostRequirementsSpecified === false && t.applicability.hostEvaluator === null && t.applicability.hostEligibility === 'not_established'));
  const fw = createLegalityFramework({ evaluators: {} });
  for (const id of ALL_IDS) {
    const t = typed.find((x) => x.typedDefinitionId === id);
    const v = fw.evaluate(t, {});
    assert.equal(v.status, 'not_established');
    assert.deepEqual(v.reasons, ['HOST_REQUIREMENTS_NOT_SPECIFIED']);
  }
  assert.equal(SPECS.length, 111);
  assert.equal(HOST_SPECS.length, 35);
  assert.ok(SPECS.every((r) => r.coverage === 'PUBLISHED_FACTS'), 'no COMPLETE_MECHANIC record exists');
  const src = read('tools/lib/host-requirements.mjs');
  assert.ok(!/from 'node:(fs|child_process|net|http)/.test(src), 'the validator library is pure');
  assert.ok(!/scripts\//.test(src.replace(/\/\/.*$/gm, '')), 'nothing under scripts/ is imported by the library');
  for (const f of fs.readdirSync(path.join(root, 'scripts'), { recursive: true })) {
    if (typeof f === 'string' && f.endsWith('.js')) assert.ok(!/host-requirements/.test(fs.readFileSync(path.join(root, 'scripts', f), 'utf8')), `scripts/${f} must not load the sidecar`);
  }
});

console.log(`modification-host-requirements: ${checks} checks OK`);
