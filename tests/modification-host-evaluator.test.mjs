// D-005 T4d-2: behavioural tests for the pure offline host-requirement evaluator (tools/lib/host-evaluator.mjs).
// Synthetic evidence only (a test-local synthetic authority): every outcome here is a TEST-ONLY outcome and is asserted to be
// non-production. Nothing here enables production trust, registers with G3 or reads a real Item.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../tools/lib/host-evidence.mjs';
import * as V from '../tools/lib/host-evaluator.mjs';
import { evaluateHostRequirements as evaluate, compareWeightSum } from '../tools/lib/host-evaluator.mjs';
import { PINNED_HOST_REQUIREMENTS_SHA256, HOST_REQUIREMENTS_PATH, HOST_REQUIREMENTS_SCHEMA_PATH, OWNER_DECISIONS_PATH, GROUPS, GROUP_FIELD, SIZE_CATEGORIES } from '../tools/lib/host-requirements.mjs';
import { sha256, PINNED_SCOPE_SHA256 } from '../tools/lib/modification-runtime.mjs';
import { SIZE_RANK } from '../scripts/items/weapon-runtime/condition-policy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let checks = 0;
function check(name, fn) {
  try { fn(); checks += 1; } catch (err) { console.error(`FAIL: ${name}`); throw err; }
}

/* ---------------------------------- fixtures ---------------------------------- */

const bundle = () => {
  const bytes = read(HOST_REQUIREMENTS_PATH);
  return {
    bytes, sidecar: JSON.parse(bytes), schema: JSON.parse(read(HOST_REQUIREMENTS_SCHEMA_PATH)),
    specs: JSON.parse(read('data/modifications/specification-records-v1.json')).records,
    registry: JSON.parse(read('data/audits/modification-rolling-authority-v1.5.json')), ownerDecisionsText: read(OWNER_DECISIONS_PATH)
  };
};
const verified = E.verifyContractBundle(bundle());
assert.equal(verified.ok, true);
const CONTRACT = verified.contract;
const REVISION = CONTRACT.revision;
const SIDECAR = JSON.parse(read(HOST_REQUIREMENTS_PATH));

const IDS = ['host1', 'add1', 'p1', 'p2', 'p3'];
const FP = Object.fromEntries(IDS.map((i) => [i, `fp-${i}`]));
const authority = E.createSyntheticEvidenceAuthority({ id: 'test', trustedSourceKinds: ['synthetic-fixture'], trustedEnumerators: ['test-enum'] });
const ctxOf = (a = authority, extra = {}) => ({ authority: a, contractRevision: REVISION, registryHash: null, itemFingerprints: FP, ...extra });

const roleFor = (ref) => (ref === 'item.type' || ref.startsWith('host.') ? 'host' : ref.startsWith('addedItem.') || ref.startsWith('compat:addedComponent') ? 'addedItem' : ref.startsWith('use.') ? 'use' : ref.startsWith('payload.') ? 'payloadItem' : 'host');
let counter = 0;
/** One raw synthetic observation. Override anything through `o`. */
function ob(ref, value, o = {}) {
  const role = o.role ?? roleFor(ref);
  const itemId = o.itemId ?? (role === 'addedItem' ? 'add1' : 'host1');
  const status = o.status ?? 'known';
  const x = {
    schema: E.EVIDENCE_SCHEMA_ID, factRef: ref,
    subject: { role, itemId, itemType: o.itemType ?? 'equipment', ...(role === 'payloadItem' ? { memberRef: o.memberRef } : {}) },
    scope: { basis: o.basis ?? 'base', state: null }, status, trust: o.trust ?? 'explicit',
    provenance: { source: { kind: 'synthetic-fixture', recordRef: `fx:${(counter += 1)}`, path: ref }, binding: { method: null, result: 'unbound' }, ...(o.provenance ?? {}) },
    bindings: { contractRevision: o.revision ?? REVISION, registryHash: null, itemFingerprint: o.fingerprint ?? FP[itemId] }
  };
  if (status === 'known') x.value = value;
  if (status === 'absent') x.absence = { basis: 'no-intelligence-trait' };
  return x;
}
const unknownOb = (ref, o = {}) => ob(ref, undefined, { ...o, status: 'unknown' });
const state = (itemId, persistentChanges = 'none', o = {}) => ({
  schema: E.EVIDENCE_SCHEMA_ID, itemId, persistentChanges, trust: o.trust ?? 'explicit',
  provenance: { source: { kind: 'synthetic-fixture', recordRef: `fx:state:${itemId}`, path: 'state' }, binding: { method: null, result: 'unbound' } },
  bindings: { contractRevision: REVISION, itemFingerprint: o.fingerprint ?? FP[itemId] }
});
const member = (ref, itemId, qty) => ({ memberRef: ref, itemId, itemType: 'equipment', quantity: qty === null ? { status: 'unknown' } : { status: 'known', value: qty } });
function snapshot(members, o = {}) {
  const s = {
    schema: E.EVIDENCE_SCHEMA_ID, role: 'payload', hostItemId: o.hostItemId ?? 'host1', members,
    completeness: o.completeness ?? { status: 'complete', basis: 'system-enumerated', enumerator: 'test-enum' }, trust: o.trust ?? 'explicit',
    provenance: { source: { kind: 'synthetic-fixture', recordRef: 'fx:coll', path: 'payload.items' }, binding: { method: null, result: 'unbound' } },
    bindings: { contractRevision: REVISION, hostFingerprint: o.hostFingerprint ?? FP.host1 }
  };
  s.fingerprint = E.collectionFingerprint(s);
  return s;
}
const ALL_STATES = IDS.map((i) => state(i));

/** Runs the evaluator with a fresh ObservationSet built from raw observations. */
function run(id, { obs = [], states = ALL_STATES, groups = ['install'], payload, added = false, basis = 'base', auth = authority, issue = true, ctx, contract = CONTRACT, set: prebuilt } = {}) {
  const set = prebuilt ?? E.createObservationSet({
    observations: issue ? obs.map((x) => auth.issue(x)) : obs, itemStates: issue ? states.map((x) => auth.issue(x)) : states
  });
  return evaluate({
    contract, typedDefinitionId: id, groups, basis, observationSet: set, ctx: ctx ?? ctxOf(auth),
    subjects: { hostItemId: 'host1', ...(added ? { addedItemId: 'add1' } : {}) },
    ...(payload ? { payload: issue ? auth.issueCollection(payload) : payload } : {})
  });
}
const G = (r, g = 'install') => r.groups[g];
const verdict = (r, g = 'install') => [G(r, g).status, G(r, g).codes];

/* ---------------------------------- vocabulary, scope, determinism ---------------------------------- */

check('size order is the established Fine..Colossal order (matches the weapon condition policy)', () => {
  assert.deepEqual([...SIZE_CATEGORIES], ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal']);
  const rank = (label) => SIZE_RANK[label.toLowerCase()] ?? SIZE_RANK[label];
  for (const label of SIZE_CATEGORIES) assert.ok(Number.isInteger(rank(label)), label);
  for (let i = 1; i < SIZE_CATEGORIES.length; i += 1) assert.ok(rank(SIZE_CATEGORIES[i]) > rank(SIZE_CATEGORIES[i - 1]), 'same ordering as the weapon condition policy');
});

check('exact decimal weight arithmetic: strict, exact and quantity-aware', () => {
  assert.equal(compareWeightSum([{ unitKg: 0.1, quantity: 1 }, { unitKg: 0.7, quantity: 1 }], 0.8), 0, '0.1 + 0.7 equals 0.8 exactly (binary floats would say 0.7999999999999999)');
  assert.equal(compareWeightSum([{ unitKg: 3, quantity: 2 }], 5), 1);
  assert.equal(compareWeightSum([{ unitKg: 3, quantity: 2 }], 7), -1);
  assert.equal(compareWeightSum([{ unitKg: 3, quantity: 2 }], 6), 0);
  assert.equal(compareWeightSum([{ unitKg: 1e-7, quantity: 10 }], 1e-6), 0);
  assert.equal(compareWeightSum([{ unitKg: 1.5e21, quantity: 1 }], 1.5e21), 0);
  assert.equal(compareWeightSum([{ unitKg: 0, quantity: 5 }], 0.000001), -1);
  assert.equal(compareWeightSum([{ unitKg: 0.3, quantity: 1 }], 0.30000000000000004), -1);
});

check('scope: pure module, no scripts/ import, no I/O, nothing imports it, T4c and T4d-1 vocabularies reused', () => {
  const src = read('tools/lib/host-evaluator.mjs');
  assert.ok(!/from 'node:(fs|child_process|net|http)/.test(src));
  assert.ok(!/scripts\//.test(src.replace(/\/\/.*$/gm, '')));
  for (const f of fs.readdirSync(path.join(root, 'scripts'), { recursive: true })) {
    if (typeof f === 'string' && f.endsWith('.js')) assert.ok(!/host-evaluator|host-evidence|host-requirements/.test(read(`scripts/${f}`)), `scripts/${f}`);
  }
  assert.deepEqual([...V.VERDICTS], ['legal', 'illegal', 'not_established']);
  assert.equal(E.DIAGNOSTIC_CODES.length, 32);
});

check('invariants: sidecar, pin, registry, specifications, runtime selectability and the 35/41 contract are unchanged', () => {
  assert.equal(sha256(fs.readFileSync(path.join(root, HOST_REQUIREMENTS_PATH))), '25218b4dcebacf653810213b50dfb2cf9d67b92bc702471d7cd6a826db364e3a');
  assert.equal(PINNED_HOST_REQUIREMENTS_SHA256, 'b5f8c7aab8cc5409ab0d24d0a033189ba6542f3c665da659a0c75a151dcf76b8');
  assert.equal(sha256(fs.readFileSync(path.join(root, 'data/audits/modification-rolling-authority-v1.5.json'))), '7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00');
  assert.equal(SIDECAR.records.length, 35);
  assert.equal(SIDECAR.records.reduce((n, r) => n + GROUPS.reduce((m, g) => m + r[GROUP_FIELD[g]].length, 0), 0), 41);
  assert.equal(JSON.parse(read('data/modifications/specification-records-v1.json')).records.length, 111);
  assert.deepEqual(Object.keys(PINNED_SCOPE_SHA256), ['D-001', 'D-004', 'D-005', 'D-006', 'D-010', 'D-011', 'D-013', 'D-014', 'D-015']);
  assert.equal(JSON.parse(read('data/modifications/runtime-definitions-v1.5.json')).header.counts.runtimeSelectable, 0);
});

/* ---------------------------------- contract and request handling ---------------------------------- */

check('contract: only an authentic VerifiedContract at the evaluated revision is accepted (case 6)', () => {
  const obs = [ob('item.type', 'equipment'), ob('host.oneHandedHandheld', true)];
  const clone = JSON.parse(JSON.stringify(CONTRACT));
  for (const bad of [clone, { ...CONTRACT }, { schema: CONTRACT.schema, revision: REVISION, records: CONTRACT.records, ids: CONTRACT.ids }, null, {}]) {
    const r = run('sv-spring-loaded::equipment', { obs, contract: bad, groups: ['install', 'use', 'payload'] });
    for (const g of ['install', 'use', 'payload']) assert.deepEqual(verdict(r, g), ['not_established', ['HOST_CONTRACT_VERSION_UNTRUSTED']]);
    assert.equal(r.installationAuthorized, false); assert.equal(r.selectable, false); assert.equal(r.contractRevision, null);
  }
  const mismatch = run('sv-spring-loaded::equipment', { obs, ctx: ctxOf(authority, { contractRevision: 'e'.repeat(64) }) });
  assert.deepEqual(verdict(mismatch), ['not_established', ['HOST_CONTRACT_VERSION_UNTRUSTED']]);
  assert.deepEqual(verdict(run('sv-spring-loaded::equipment', { obs })), ['legal', []]);
});

check('contract: an unknown typed identity or a mismatching Item type is a domain mismatch (case 4); no evaluation happens', () => {
  assert.deepEqual(verdict(run('sv-nonexistent::weapon', { obs: [ob('item.type', 'weapon', { itemType: 'weapon' })] })), ['not_established', ['HOST_DOMAIN_MISMATCH']]);
  const r = run('sv-spring-loaded::weapon', { obs: [ob('item.type', 'equipment'), ob('host.oneHandedHandheld', false)] });
  assert.deepEqual(verdict(r), ['not_established', ['HOST_DOMAIN_MISMATCH']], 'a weapon definition on an equipment Item is not evaluated (not even to illegal)');
  assert.equal(G(r).predicates.length, 0);
});

check('request validation: groups and basis are explicit; unrequested groups carry no verdict (case 32)', () => {
  const base = { contract: CONTRACT, typedDefinitionId: 'sv-cheater::equipment', basis: 'base', observationSet: E.createObservationSet({}), ctx: ctxOf(), subjects: { hostItemId: 'host1' } };
  for (const bad of [{ groups: [] }, { groups: ['bogus'] }, { groups: ['install', 'install'] }, { groups: 'install' }, { groups: ['install'], basis: undefined }, { groups: ['install'], basis: 'user-entered' }, { groups: ['install'], subjects: {} }]) {
    assert.throws(() => evaluate({ ...base, ...bad }), TypeError);
  }
  assert.throws(() => evaluate({ ...base, groups: ['install'], observationSet: { entries: [] } }), /not an authentic ObservationSet/);
  assert.throws(() => evaluate({ ...base, groups: ['install'], contract: null, observationSet: {} }), /not an authentic ObservationSet/, 'a fabricated set is rejected even when the contract is not trusted');
  assert.throws(() => evaluate({ ...base, groups: ['install'], observationSet: E.bindObservationSet(E.createObservationSet({}), ctxOf()) }), /not an authentic ObservationSet/, 'an already-bound set cannot be replayed into an evaluation');
  const r = evaluate({ ...base, groups: ['install'] });
  assert.deepEqual(Object.keys(r.groups), ['install'], 'use and payload are not requested: no verdict, no fourth status');
  assert.deepEqual(r.requestedGroups, ['install']);
  const two = run('sv-cheater::equipment', { groups: ['payload', 'install'] });
  assert.deepEqual(two.requestedGroups, ['install', 'payload'], 'request order does not change the report');
});

check('records with no requirements in a requested group yield no verdict rather than an invented status', () => {
  const r = run('sv-cheater::equipment', { groups: ['install', 'use', 'payload'], obs: [ob('item.type', 'equipment'), ob('compat:canConcealCheater', true)] });
  assert.equal(G(r, 'install').status, 'legal');
  for (const g of ['use', 'payload']) { assert.equal(G(r, g).status, null); assert.equal(G(r, g).applicable, false); assert.deepEqual(G(r, g).codes, []); }
});

/* ---------------------------------- bool.equals ---------------------------------- */

const BOOL_CASES = [
  ['host.oneHandedHandheld', 'sv-spring-loaded::equipment', 'HOST_NOT_ONE_HANDED', 'HOST_ONE_HANDED_UNKNOWN'],
  ['host.functionRestrictable', 'sv-recognition-system::equipment', 'HOST_NOT_RESTRICTABLE', 'HOST_RESTRICTABILITY_UNKNOWN'],
  ['host.remotelyActivatableFunction', 'sv-remote-activation::equipment', 'HOST_NOT_ACTIVATABLE', 'HOST_ACTIVATION_UNKNOWN']
];
check('bool.equals (install): trusted true is legal, trusted false is illegal with its approved code, unknown/untrusted is never illegal', () => {
  for (const [ref, id, failCode, unknownCode] of BOOL_CASES) {
    const itemType = ob('item.type', 'equipment');
    assert.deepEqual(verdict(run(id, { obs: [itemType, ob(ref, true)] })), ['legal', []], ref);
    assert.deepEqual(verdict(run(id, { obs: [itemType, ob(ref, false)] })), ['illegal', [failCode]], ref);
    assert.deepEqual(verdict(run(id, { obs: [itemType, unknownOb(ref)] })), ['not_established', [unknownCode]], `${ref}: explicit unknown never becomes trusted false`);
    assert.deepEqual(verdict(run(id, { obs: [itemType] })), ['not_established', [unknownCode]], `${ref}: missing`);
    for (const trust of ['derived', 'default', 'unknown', 'attested']) {
      assert.deepEqual(verdict(run(id, { obs: [itemType, ob(ref, false, { trust })] })), ['not_established', ['HOST_FACT_UNTRUSTED', unknownCode].sort()], `${ref}: ${trust} false is not a proven failure`);
    }
  }
});

check('bool.equals (use): attunement is use-only, false never blocks installation, unknown/untrusted never fails', () => {
  const id = 'sv-electrograpple-handle::weapon';
  const base = [ob('item.type', 'weapon', { itemType: 'weapon' }), ob('compat:canFitElectrograppleHandle', true, { itemType: 'weapon' })];
  const use = (v, o) => ob('use.attunedGauntletForHost', v, { itemType: 'weapon', ...o });
  const run2 = (extra) => run(id, { obs: [...base, ...extra], groups: ['install', 'use'] });
  const t = run2([use(true)]);
  assert.deepEqual([verdict(t, 'install'), verdict(t, 'use')], [['legal', []], ['legal', []]]);
  const f = run2([use(false)]);
  assert.deepEqual(verdict(f, 'use'), ['illegal', ['HOST_ATTUNED_GAUNTLET_UNAVAILABLE']]);
  assert.deepEqual(verdict(f, 'install'), ['legal', []], 'installation is never affected by the use group');
  assert.deepEqual(verdict(run2([unknownOb('use.attunedGauntletForHost', { itemType: 'weapon' })]), 'use'), ['not_established', ['HOST_FACT_MISSING']]);
  assert.deepEqual(verdict(run2([]), 'use'), ['not_established', ['HOST_FACT_MISSING']]);
  assert.deepEqual(verdict(run2([use(false, { trust: 'default' })]), 'use'), ['not_established', ['HOST_FACT_MISSING', 'HOST_FACT_UNTRUSTED']]);
  assert.equal(G(run2([use(false)]), 'install').status, 'legal');
});

/* ---------------------------------- enum.in and int.explicit ---------------------------------- */

const MEM = 'sv-memory-upgrade::equipment';
const memBase = () => [ob('item.type', 'equipment')];
check('enum.in + int.explicit: nondroid with an explicit Intelligence score is legal; each failure has its own approved code', () => {
  assert.deepEqual(verdict(run(MEM, { obs: [...memBase(), ob('host.droidStatus', 'nondroid'), ob('host.intelligenceScore', 12)] })), ['legal', []]);
  assert.deepEqual(verdict(run(MEM, { obs: [...memBase(), ob('host.droidStatus', 'nondroid'), ob('host.intelligenceScore', 0)] })), ['legal', []], 'a zero score is a valid explicit integer; no threshold');
  assert.deepEqual(verdict(run(MEM, { obs: [...memBase(), ob('host.droidStatus', 'droid'), ob('host.intelligenceScore', 12)] })), ['illegal', ['HOST_IS_DROID']]);
  assert.deepEqual(verdict(run(MEM, { obs: [...memBase(), ob('host.droidStatus', 'nondroid'), ob('host.intelligenceScore', undefined, { status: 'absent' })] })), ['illegal', ['HOST_INTELLIGENCE_SCORE_ABSENT']]);
  assert.deepEqual(verdict(run(MEM, { obs: [...memBase(), unknownOb('host.droidStatus'), ob('host.intelligenceScore', 12)] })), ['not_established', ['HOST_DROID_STATUS_UNKNOWN']]);
  assert.deepEqual(verdict(run(MEM, { obs: [...memBase(), ob('host.droidStatus', 'nondroid')] })), ['not_established', ['HOST_INTELLIGENCE_MISSING']]);
  assert.deepEqual(verdict(run(MEM, { obs: [...memBase(), ob('host.droidStatus', 'nondroid'), unknownOb('host.intelligenceScore')] })), ['not_established', ['HOST_INTELLIGENCE_MISSING']]);
});

check('absence is not missing data: confirmed Intelligence absence (illegal) differs from missing/untrusted (not established)', () => {
  const nd = ob('host.droidStatus', 'nondroid');
  const absent = run(MEM, { obs: [...memBase(), nd, ob('host.intelligenceScore', undefined, { status: 'absent' })] });
  const missing = run(MEM, { obs: [...memBase(), nd] });
  const untrustedAbsent = run(MEM, { obs: [...memBase(), nd, ob('host.intelligenceScore', undefined, { status: 'absent', trust: 'derived' })] });
  assert.equal(G(absent).status, 'illegal'); assert.equal(G(missing).status, 'not_established'); assert.equal(G(untrustedAbsent).status, 'not_established');
  assert.ok(G(untrustedAbsent).codes.includes('HOST_FACT_UNTRUSTED') && !G(untrustedAbsent).codes.includes('HOST_INTELLIGENCE_SCORE_ABSENT'));
});

check('a proven failure outranks unrelated unknowns, and codes are all emitted sorted (T4C-D08, section 5.2)', () => {
  const r = run(MEM, { obs: [...memBase(), ob('host.droidStatus', 'droid')] });
  assert.deepEqual(verdict(r), ['illegal', ['HOST_INTELLIGENCE_MISSING', 'HOST_IS_DROID']]);
  assert.ok(G(r).predicates.some((p) => p.outcome === 'violated') && G(r).predicates.some((p) => p.outcome === 'unknown'));
});

/* ---------------------------------- enum.intersects ---------------------------------- */

check('enum.intersects: a known allowed member proves it; an empty complete set fails; an incomplete or unknown set is not established', () => {
  const id = 'sv-extra-power-source::weapon';
  const t = ob('item.type', 'weapon', { itemType: 'weapon' });
  const ps = (members, complete, o) => ob('host.powerSourceTypes', { members, complete }, { itemType: 'weapon', ...o });
  assert.deepEqual(verdict(run(id, { obs: [t, ps(['energy-cell'], true)] })), ['legal', []]);
  assert.deepEqual(verdict(run(id, { obs: [t, ps(['power-pack'], false)] })), ['legal', []], 'one known allowed member proves intersection even if the list is incomplete');
  assert.deepEqual(verdict(run(id, { obs: [t, ps([], true)] })), ['illegal', ['HOST_POWER_SOURCE_UNSUPPORTED']]);
  assert.deepEqual(verdict(run(id, { obs: [t, ps([], false)] })), ['not_established', ['HOST_POWER_SOURCE_UNKNOWN']]);
  assert.deepEqual(verdict(run(id, { obs: [t, unknownOb('host.powerSourceTypes', { itemType: 'weapon' })] })), ['not_established', ['HOST_POWER_SOURCE_UNKNOWN']]);
  assert.deepEqual(verdict(run(id, { obs: [t] })), ['not_established', ['HOST_POWER_SOURCE_UNKNOWN']]);
  assert.deepEqual(verdict(run(id, { obs: [t, ps([], true, { trust: 'derived' })] })), ['not_established', ['HOST_FACT_UNTRUSTED', 'HOST_POWER_SOURCE_UNKNOWN']]);
});

/* ---------------------------------- size.not_larger ---------------------------------- */

const DUAL = 'sv-dual-gear::equipment';
const dualBase = (hostSize, addedSize) => [
  ob('item.type', 'equipment'), ob('compat:addedComponentQualifiesAsEquipment', true), ob('compat:addedComponentPhysicalFit', true),
  ...(hostSize ? [ob('host.sizeCategory', hostSize)] : []), ...(addedSize ? [ob('addedItem.sizeCategory', addedSize)] : [])
];
check('size.not_larger: smaller and EQUAL sizes pass, larger fails; unknown sizes and a missing added item are not established', () => {
  const go = (h, a, added = true) => run(DUAL, { obs: dualBase(h, a), added });
  assert.deepEqual(verdict(go('Medium', 'Small')), ['legal', []]);
  assert.deepEqual(verdict(go('Medium', 'Medium')), ['legal', []], 'equal passes');
  assert.deepEqual(verdict(go('Medium', 'Large')), ['illegal', ['HOST_ADDED_ITEM_LARGER']]);
  assert.deepEqual(verdict(go('Fine', 'Colossal')), ['illegal', ['HOST_ADDED_ITEM_LARGER']]);
  assert.deepEqual(verdict(go('Colossal', 'Fine')), ['legal', []]);
  assert.deepEqual(verdict(go('Medium', null)), ['not_established', ['HOST_SIZE_UNKNOWN']]);
  assert.deepEqual(verdict(go(null, 'Small')), ['not_established', ['HOST_SIZE_UNKNOWN']]);
  assert.deepEqual(verdict(go('Medium', 'Small', false)), ['not_established', ['HOST_ADDED_ITEM_MISSING']], 'case 23: added item not supplied (also for its compatibility checks)');
  const unknownAdded = run(DUAL, { obs: [...dualBase('Medium', null), unknownOb('addedItem.sizeCategory')], added: true });
  assert.deepEqual(verdict(unknownAdded), ['not_established', ['HOST_SIZE_UNKNOWN']]);
  assert.deepEqual(verdict(run(DUAL, { obs: [...dualBase('Medium', null), ob('addedItem.sizeCategory', 'Large', { trust: 'default' })], added: true })), ['not_established', ['HOST_FACT_UNTRUSTED', 'HOST_SIZE_UNKNOWN']], 'a default Small/Large size is never evidence');
});

check('size.not_larger: a violation outranks unknown compatibility evidence; the added item must be a separately identified Item', () => {
  const r = run(DUAL, { obs: [ob('item.type', 'equipment'), ob('host.sizeCategory', 'Small'), ob('addedItem.sizeCategory', 'Large')], added: true });
  assert.deepEqual(verdict(r), ['illegal', ['HOST_ADDED_ITEM_LARGER', 'HOST_PHYSICAL_FIT_UNKNOWN']]);
  const wrongItem = run(DUAL, { obs: [...dualBase('Medium', 'Small').filter((o) => o.factRef !== 'addedItem.sizeCategory'), ob('addedItem.sizeCategory', 'Small', { role: 'addedItem', itemId: 'p1' })], added: true });
  assert.equal(G(wrongItem).status, 'not_established', 'evidence about another Item is not about the added item');
});

/* ---------------------------------- payload group ---------------------------------- */

const SECRET = 'sv-secret-compartment::equipment';
const secretBase = (hostSize = 'Large') => [ob('item.type', 'equipment'), ...(hostSize ? [ob('host.sizeCategory', hostSize)] : [])];
const psize = (memberRef, itemId, size, o) => ob('payload.sizeCategory', size, { role: 'payloadItem', itemId, memberRef, ...o });
const pweight = (memberRef, itemId, w, o) => ob('payload.weightKg', w, { role: 'payloadItem', itemId, memberRef, provenance: undefined, ...o });
const payloadRun = (id, obs, members, o = {}) => run(id, { obs, groups: ['payload'], payload: snapshot(members, o.snap), ...o });

check('size.smaller_by_at_least: at least one category smaller passes; equal and larger fail; evaluated per physical member', () => {
  const one = [member('m1', 'p1', 1)];
  const go = (size, o) => payloadRun(SECRET, [...secretBase(), psize('m1', 'p1', size)], one, o);
  assert.deepEqual(verdict(go('Medium'), 'payload'), ['legal', []]);
  assert.deepEqual(verdict(go('Fine'), 'payload'), ['legal', []]);
  assert.deepEqual(verdict(go('Large'), 'payload'), ['illegal', ['PAYLOAD_NOT_SMALLER']], 'equal fails (case 27)');
  assert.deepEqual(verdict(go('Huge'), 'payload'), ['illegal', ['PAYLOAD_NOT_SMALLER']]);
  const two = [member('m1', 'p1', 1), member('m2', 'p2', 1)];
  const okThenBad = payloadRun(SECRET, [...secretBase(), psize('m1', 'p1', 'Small'), psize('m2', 'p2', 'Large')], two);
  assert.ok(G(okThenBad, 'payload').codes.includes('PAYLOAD_NOT_SMALLER') && G(okThenBad, 'payload').status === 'illegal');
  const badThenUnknown = payloadRun(SECRET, [...secretBase(), psize('m1', 'p1', 'Huge')], two);
  assert.equal(G(badThenUnknown, 'payload').status, 'illegal', 'a trusted failure outranks an unknown member');
  assert.deepEqual(G(badThenUnknown, 'payload').codes, ['PAYLOAD_ITEM_COUNT_EXCEEDED', 'PAYLOAD_NOT_SMALLER', 'PAYLOAD_SIZE_UNKNOWN']);
});

check('size.smaller_by_at_least: unknown payload or host size is not established; sizes of other members are never borrowed', () => {
  const one = [member('m1', 'p1', 1)];
  assert.deepEqual(verdict(payloadRun(SECRET, [...secretBase()], one), 'payload'), ['not_established', ['PAYLOAD_SIZE_UNKNOWN']]);
  assert.deepEqual(verdict(payloadRun(SECRET, [...secretBase(null), psize('m1', 'p1', 'Small')], one), 'payload'), ['not_established', ['HOST_SIZE_UNKNOWN']]);
  assert.deepEqual(verdict(payloadRun(SECRET, [...secretBase(), psize('m1', 'p1', 'Small', { trust: 'default' })], one), 'payload'), ['not_established', ['HOST_FACT_UNTRUSTED', 'PAYLOAD_SIZE_UNKNOWN']]);
  assert.deepEqual(verdict(payloadRun(SECRET, [...secretBase(), psize('mX', 'p1', 'Small')], one), 'payload'), ['not_established', ['PAYLOAD_SIZE_UNKNOWN']], 'a size recorded for another member reference does not count');
});

check('count.at_most: counts PHYSICAL objects, not Item documents; a stack of 2 in one document exceeds a maximum of 1', () => {
  const sized = (refs) => [...secretBase(), ...refs.map(([m, i]) => psize(m, i, 'Small'))];
  assert.deepEqual(verdict(payloadRun(SECRET, sized([['m1', 'p1']]), [member('m1', 'p1', 1)]), 'payload'), ['legal', []]);
  const stack = payloadRun(SECRET, sized([['m1', 'p1']]), [member('m1', 'p1', 2)]);
  assert.deepEqual(verdict(stack, 'payload'), ['illegal', ['PAYLOAD_ITEM_COUNT_EXCEEDED']], 'one document of quantity 2 is two contained items');
  const twoDocs = payloadRun(SECRET, sized([['m1', 'p1'], ['m2', 'p2']]), [member('m1', 'p1', 1), member('m2', 'p2', 1)]);
  assert.deepEqual(verdict(twoDocs, 'payload'), ['illegal', ['PAYLOAD_ITEM_COUNT_EXCEEDED']]);
  assert.equal(G(stack, 'payload').status, 'illegal');
  assert.deepEqual(verdict(run(SECRET, { obs: [...secretBase(), ob('compat:canAccommodateHiddenCompartment', true)], groups: ['install'] }), 'install'), ['legal', []], 'the count limits contents, never installation');
});

check('count.at_most: unknown quantity, unverified completeness, lower bounds and untrusted snapshots are never violations', () => {
  const sized = [...secretBase(), psize('m1', 'p1', 'Small')];
  assert.deepEqual(verdict(payloadRun(SECRET, sized, [member('m1', 'p1', null)]), 'payload'), ['not_established', ['HOST_FACT_MISSING']]);
  const claimed = payloadRun(SECRET, sized, [member('m1', 'p1', 1)], { snap: { completeness: { status: 'complete', basis: 'caller-declared', enumerator: null } } });
  assert.deepEqual(verdict(claimed, 'payload'), ['not_established', ['HOST_FACT_UNTRUSTED', 'PAYLOAD_SIZE_UNKNOWN']], 'caller-declared completeness is not verified completeness');
  const lowerBound = payloadRun(SECRET, sized, [member('m1', 'p1', 2)], { snap: { completeness: { status: 'incomplete', basis: 'system-enumerated', enumerator: 'test-enum' } } });
  assert.equal(G(lowerBound, 'payload').status, 'not_established', 'a lower bound exceeding the maximum is not a trusted count');
  assert.ok(G(lowerBound, 'payload').codes.includes('HOST_FACT_MISSING') && !G(lowerBound, 'payload').codes.includes('PAYLOAD_ITEM_COUNT_EXCEEDED'));
  const unissued = run(SECRET, { obs: sized, groups: ['payload'], payload: snapshot([member('m1', 'p1', 5)]), auth: authority, issue: false });
  assert.equal(G(unissued, 'payload').status, 'not_established'); assert.ok(G(unissued, 'payload').codes.includes('HOST_FACT_UNTRUSTED'));
  const unissuedCollection = evaluate({ contract: CONTRACT, typedDefinitionId: SECRET, groups: ['payload'], basis: 'base', observationSet: E.createObservationSet({ observations: sized.map((x) => authority.issue(x)), itemStates: ALL_STATES.map((x) => authority.issue(x)) }), ctx: ctxOf(), subjects: { hostItemId: 'host1' }, payload: snapshot([member('m1', 'p1', 5)]) });
  assert.deepEqual(verdict(unissuedCollection, 'payload'), ['not_established', ['HOST_FACT_UNTRUSTED']]);
  const staleHost = payloadRun(SECRET, sized, [member('m1', 'p1', 5)], { snap: { hostFingerprint: 'old' } });
  assert.deepEqual(verdict(staleHost, 'payload'), ['not_established', ['HOST_PROVENANCE_STALE']]);
  const otherHost = payloadRun(SECRET, sized, [member('m1', 'p1', 5)], { snap: { hostItemId: 'someone-else' } });
  assert.equal(G(otherHost, 'payload').status, 'not_established', 'a snapshot for another host is not this host\'s payload');
});

check('empty payload (case 31): a requested payload group with no items, or no snapshot, is not established with HOST_FACT_MISSING', () => {
  assert.deepEqual(verdict(payloadRun(SECRET, secretBase(), []), 'payload'), ['not_established', ['HOST_FACT_MISSING']]);
  assert.deepEqual(verdict(run(SECRET, { obs: secretBase(), groups: ['payload'] }), 'payload'), ['not_established', ['HOST_FACT_MISSING']]);
  assert.deepEqual(verdict(run(SECRET, { obs: secretBase(), groups: ['payload'], payload: null }), 'payload'), ['not_established', ['HOST_FACT_MISSING']]);
  const incompleteEmpty = payloadRun(SECRET, secretBase(), [], { snap: { completeness: { status: 'incomplete', basis: 'system-enumerated', enumerator: 'test-enum' } } });
  assert.deepEqual(verdict(incompleteEmpty, 'payload'), ['not_established', ['HOST_FACT_MISSING']]);
});

const STORE = 'sv-storage-capacity::equipment';
// Storage Capacity also carries the payload size predicate: every weighed member gets a smaller size so only the weight predicate is under test.
const storeObs = (hostW, members) => [
  ob('item.type', 'equipment'), ob('host.sizeCategory', 'Large'), ...(hostW === null ? [] : [ob('host.weightKg', hostW)]), ...members,
  ...members.filter((m) => m.factRef === 'payload.weightKg').map((m) => psize(m.subject.memberRef, m.subject.itemId, 'Small'))
];
check('weight.sum_lt: strictly less passes; EQUAL fails; greater fails; per-unit weight is multiplied by trusted physical quantity', () => {
  const w = (unit, qty, host) => payloadRun(STORE, storeObs(host, [pweight('m1', 'p1', unit)]), [member('m1', 'p1', qty)]);
  assert.deepEqual(verdict(w(2, 1, 5), 'payload'), ['legal', []]);
  assert.deepEqual(verdict(w(5, 1, 5), 'payload'), ['illegal', ['PAYLOAD_WEIGHT_LIMIT_EXCEEDED']], 'equality fails (case 30)');
  assert.deepEqual(verdict(w(6, 1, 5), 'payload'), ['illegal', ['PAYLOAD_WEIGHT_LIMIT_EXCEEDED']]);
  assert.deepEqual(verdict(w(3, 2, 5), 'payload'), ['illegal', ['PAYLOAD_WEIGHT_LIMIT_EXCEEDED']], '2 x 3 = 6 >= 5');
  assert.deepEqual(verdict(w(3, 2, 7), 'payload'), ['legal', []], '2 x 3 = 6 < 7');
  assert.deepEqual(verdict(w(3, 2, 6), 'payload'), ['illegal', ['PAYLOAD_WEIGHT_LIMIT_EXCEEDED']], 'equal total fails');
  const exact = payloadRun(STORE, storeObs(0.8, [pweight('m1', 'p1', 0.1), pweight('m2', 'p2', 0.7)]), [member('m1', 'p1', 1), member('m2', 'p2', 1)]);
  assert.deepEqual(verdict(exact, 'payload'), ['illegal', ['PAYLOAD_WEIGHT_LIMIT_EXCEEDED']], 'exact decimal arithmetic: 0.1 + 0.7 equals 0.8');
  const zero = payloadRun(STORE, storeObs(1, [pweight('m1', 'p1', 0, { provenance: { source: { kind: 'synthetic-fixture', recordRef: 'fx:z', path: 'weight' }, binding: { method: null, result: 'unbound' }, zeroIsAuthored: true } })]), [member('m1', 'p1', 4)]);
  assert.deepEqual(verdict(zero, 'payload'), ['legal', []], 'an authored zero weight is evidence');
});

check('weight.sum_lt: any unknown weight or quantity is not established; the partial-sum shortcut is excluded (case 29)', () => {
  const heavy = pweight('m1', 'p1', 10);
  const two = [member('m1', 'p1', 1), member('m2', 'p2', 1)];
  const partial = payloadRun(STORE, [...storeObs(5, [heavy]), psize('m2', 'p2', 'Small')], two);
  assert.deepEqual(verdict(partial, 'payload'), ['not_established', ['PAYLOAD_WEIGHT_UNKNOWN']], 'a known member already exceeding the limit does not fail the group while another weight is unknown');
  assert.deepEqual(verdict(payloadRun(STORE, storeObs(5, [heavy, unknownOb('payload.weightKg', { role: 'payloadItem', itemId: 'p2', memberRef: 'm2' })]), two), 'payload'), ['not_established', ['PAYLOAD_WEIGHT_UNKNOWN']]);
  assert.deepEqual(verdict(payloadRun(STORE, storeObs(null, [pweight('m1', 'p1', 1)]), [member('m1', 'p1', 1)]), 'payload'), ['not_established', ['HOST_WEIGHT_UNKNOWN']]);
  assert.deepEqual(verdict(payloadRun(STORE, storeObs(5, [pweight('m1', 'p1', 1)]), [member('m1', 'p1', null)]), 'payload'), ['not_established', ['PAYLOAD_WEIGHT_UNKNOWN']], 'unknown quantity: the total is unknown');
  const unverified = payloadRun(STORE, storeObs(5, [pweight('m1', 'p1', 9)]), [member('m1', 'p1', 1)], { snap: { completeness: { status: 'incomplete', basis: 'system-enumerated', enumerator: 'test-enum' } } });
  assert.equal(G(unverified, 'payload').status, 'not_established', 'unseen members may exist; no shortcut even when the seen weight already exceeds the limit');
  assert.deepEqual(verdict(payloadRun(STORE, storeObs(5, [pweight('m1', 'p1', 1, { trust: 'derived' })]), [member('m1', 'p1', 1)]), 'payload'), ['not_established', ['HOST_FACT_UNTRUSTED', 'PAYLOAD_WEIGHT_UNKNOWN']]);
  const bareZero = payloadRun(STORE, storeObs(5, [pweight('m1', 'p1', 0)]), [member('m1', 'p1', 1)]);
  assert.deepEqual(verdict(bareZero, 'payload'), ['not_established', ['HOST_PROVENANCE_INVALID', 'PAYLOAD_WEIGHT_UNKNOWN']], 'a bare default zero weight is invalid evidence and never satisfies');
});

/* ---------------------------------- compat.evidenced ---------------------------------- */

const CHEATER = 'sv-cheater::equipment';
check('compat.evidenced: trusted true is legal, trusted false is disproven, anything else is not established', () => {
  const t = ob('item.type', 'equipment');
  const c = (v, o) => ob('compat:canConcealCheater', v, o);
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, c(true)] })), ['legal', []]);
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, c(false)] })), ['illegal', ['HOST_PHYSICAL_FIT_DISPROVEN']]);
  assert.deepEqual(verdict(run(CHEATER, { obs: [t] })), ['not_established', ['HOST_PHYSICAL_FIT_UNKNOWN']]);
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, unknownOb('compat:canConcealCheater')] })), ['not_established', ['HOST_PHYSICAL_FIT_UNKNOWN']]);
  for (const trust of ['derived', 'default', 'unknown', 'attested']) {
    assert.deepEqual(verdict(run(CHEATER, { obs: [t, c(true, { trust })] })), ['not_established', ['HOST_FACT_UNTRUSTED', 'HOST_PHYSICAL_FIT_UNKNOWN']], `untrusted ${trust} compatibility evidence`);
    assert.deepEqual(verdict(run(CHEATER, { obs: [t, c(false, { trust })] })), ['not_established', ['HOST_FACT_UNTRUSTED', 'HOST_PHYSICAL_FIT_UNKNOWN']]);
  }
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, ob('compat:canFitElectrograppleHandle', true)] })), ['not_established', ['HOST_PHYSICAL_FIT_UNKNOWN']], 'evidence for a different check never satisfies this check');
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, ob('compat:canConcealCheater', true, { itemId: 'p1' })] })), ['not_established', ['HOST_PHYSICAL_FIT_UNKNOWN']], 'evidence about another Item does not count');
});

/* ---------------------------------- evidence conditions ---------------------------------- */

check('contradictory trusted evidence is not established (case 3), never illegal, and untrusted disagreement is ignored', () => {
  const t = ob('item.type', 'equipment');
  const r = run(CHEATER, { obs: [t, ob('compat:canConcealCheater', true), ob('compat:canConcealCheater', false)] });
  assert.deepEqual(verdict(r), ['not_established', ['HOST_EVIDENCE_CONTRADICTORY']]);
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, ob('compat:canConcealCheater', true), ob('compat:canConcealCheater', false, { trust: 'default' })] })), ['legal', []]);
  const spring = run('sv-spring-loaded::equipment', { obs: [t, ob('host.oneHandedHandheld', true), ob('host.oneHandedHandheld', false)] });
  assert.deepEqual(verdict(spring), ['not_established', ['HOST_EVIDENCE_CONTRADICTORY']]);
});

check('stale and invalid evidence: freshness and provenance failures are not established with their own codes', () => {
  const t = ob('item.type', 'equipment');
  const stale = run(CHEATER, { obs: [t, ob('compat:canConcealCheater', true, { fingerprint: 'old' })] });
  assert.deepEqual(verdict(stale), ['not_established', ['HOST_PHYSICAL_FIT_UNKNOWN', 'HOST_PROVENANCE_STALE']]);
  const oldRevision = run(CHEATER, { obs: [t, ob('compat:canConcealCheater', true, { revision: 'f'.repeat(64) })] });
  assert.deepEqual(verdict(oldRevision), ['not_established', ['HOST_PHYSICAL_FIT_UNKNOWN', 'HOST_PROVENANCE_STALE']]);
  const malformed = ob('compat:canConcealCheater', true); malformed.extra = 1;
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, malformed] })), ['not_established', ['HOST_PHYSICAL_FIT_UNKNOWN', 'HOST_PROVENANCE_INVALID']]);
  const staleFalse = run(CHEATER, { obs: [t, ob('compat:canConcealCheater', false, { fingerprint: 'old' })] });
  assert.equal(G(staleFalse).status, 'not_established', 'a stale false is not a proven failure');
});

check('basis: an unknown applicable basis is never answered from base; persistent and base are distinct requests', () => {
  const t = ob('item.type', 'equipment');
  const base = ob('compat:canConcealCheater', true);
  const persistent = (v) => ob('compat:canConcealCheater', v, { basis: 'persistent', provenance: { transformation: { ruleRef: 'rule:1', installationRecordRef: 'inst:1' } } });
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, base], states: [] })), ['not_established', ['HOST_PHYSICAL_FIT_UNKNOWN']], 'no trusted Item-state declaration: base is not used');
  assert.equal(G(run(CHEATER, { obs: [t, base], states: [state('host1', 'unresolved')] })).status, 'not_established');
  assert.equal(G(run(CHEATER, { obs: [t, base], states: [state('host1', 'resolved')] })).status, 'not_established', 'a modified Item does not fall back to base');
  assert.equal(G(run(CHEATER, { obs: [t, base], states: [state('host1', 'resolved')], basis: 'persistent' })).status, 'not_established', 'persistent requested, only base observed');
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, base, persistent(false)], states: [state('host1', 'resolved')], basis: 'persistent' })), ['illegal', ['HOST_PHYSICAL_FIT_DISPROVEN']]);
  assert.deepEqual(verdict(run(CHEATER, { obs: [t, base, persistent(false)], states: [state('host1', 'none')] })), ['legal', []], 'base and persistent values may legitimately differ');
  assert.equal(G(run(CHEATER, { obs: [t, base, persistent(true)], states: [state('host1', 'resolved')], basis: 'effective' })).status, 'not_established', 'no approved effective-state policy exists');
  assert.equal(G(run(CHEATER, { obs: [t, base], states: [state('host1', 'none', { trust: 'default' })] })).status, 'not_established', 'an untrusted Item-state declaration does not establish the basis');
});

/* ---------------------------------- empty install declarations ---------------------------------- */

const EMPTY_INSTALL = SIDECAR.records.filter((r) => r.installRequirements.length === 0).map((r) => r.typedDefinitionId);
check('empty install requirements (case 33): legal only with verified Item type, identity, declaration and revision; never a wildcard', () => {
  assert.equal(EMPTY_INSTALL.length, 12);
  for (const id of EMPTY_INSTALL) {
    const domain = id.split('::')[1];
    const t = (v = domain, o = {}) => ob('item.type', v, { itemType: v, ...o });
    const ok = run(id, { obs: [t()] });
    assert.deepEqual(verdict(ok), ['legal', []], id);
    assert.equal(G(ok).emptyInstallDeclaration, true); assert.deepEqual(G(ok).predicates, []);
    assert.deepEqual(verdict(run(id, { obs: [] })), ['not_established', ['HOST_FACT_MISSING']], `${id}: unverified Item type`);
    assert.deepEqual(verdict(run(id, { obs: [unknownOb('item.type', { itemType: domain })] })), ['not_established', ['HOST_FACT_MISSING']]);
    assert.deepEqual(verdict(run(id, { obs: [t(domain, { trust: 'default' })] })), ['not_established', ['HOST_FACT_MISSING', 'HOST_FACT_UNTRUSTED']]);
    const wrong = ['weapon', 'armor', 'equipment'].find((d) => d !== domain);
    assert.deepEqual(verdict(run(id, { obs: [t(wrong)] })), ['not_established', ['HOST_DOMAIN_MISMATCH']]);
    assert.deepEqual(verdict(run(id, { obs: [t()], ctx: ctxOf(authority, { contractRevision: 'd'.repeat(64) }) })), ['not_established', ['HOST_CONTRACT_VERSION_UNTRUSTED']]);
    assert.deepEqual(verdict(run(id, { obs: [t(domain, { fingerprint: 'old' })] })), ['not_established', ['HOST_FACT_MISSING', 'HOST_PROVENANCE_STALE']]);
    assert.notEqual(G(ok).status, 'illegal');
  }
});

/* ---------------------------------- trust and synthetic outcomes ---------------------------------- */

check('synthetic outcomes are flagged test-only and are never production-authorized', () => {
  const r = run(CHEATER, { obs: [ob('item.type', 'equipment'), ob('compat:canConcealCheater', true)] });
  assert.equal(G(r).status, 'legal');
  assert.equal(G(r).evidenceClass, 'synthetic'); assert.equal(G(r).synthetic, true); assert.equal(G(r).installationAuthorized, false);
  assert.equal(r.synthetic, true); assert.equal(r.installationAuthorized, false);
  assert.ok(G(r).evidence.length > 0 && G(r).evidence.every((e) => e.synthetic === true && e.productionTrusted === false));
  const illegal = run(CHEATER, { obs: [ob('item.type', 'equipment'), ob('compat:canConcealCheater', false)] });
  assert.equal(G(illegal).status, 'illegal'); assert.equal(G(illegal).installationAuthorized, false); assert.equal(G(illegal).evidenceClass, 'synthetic');
  const empty = run('sv-cloaked::equipment', { obs: [ob('item.type', 'equipment')] });
  assert.equal(G(empty).status, 'legal'); assert.equal(G(empty).installationAuthorized, false); assert.equal(G(empty).synthetic, true);
  const none = run(CHEATER, { obs: [] });
  assert.equal(G(none).evidenceClass, 'none'); assert.equal(G(none).synthetic, false); assert.equal(G(none).installationAuthorized, false);
});

check('no caller-controlled route to trust: production authority, forged authorities and unissued evidence establish nothing', () => {
  const full = [ob('item.type', 'equipment'), ob('compat:canConcealCheater', true)];
  const prod = run(CHEATER, { obs: full, auth: E.PRODUCTION_AUTHORITY });
  assert.equal(G(prod).status, 'not_established'); assert.ok(G(prod).codes.includes('HOST_FACT_UNTRUSTED')); assert.equal(G(prod).installationAuthorized, false);
  const forged = { id: 'production', kind: 'production', synthetic: false, trustedSourceKinds: ['synthetic-fixture'], trustedBindingMethods: [], trustedEnumerators: [], registryPins: [], isIssued: () => true, issue: (x) => x, issueCollection: (x) => x };
  const f = run(CHEATER, { obs: full, auth: forged, issue: false });
  assert.equal(G(f).status, 'not_established'); assert.equal(G(f).installationAuthorized, false);
  const unissued = run(CHEATER, { obs: full, issue: false });
  assert.equal(G(unissued).status, 'not_established');
  assert.deepEqual(G(unissued).codes, ['HOST_FACT_UNTRUSTED', 'HOST_PHYSICAL_FIT_UNKNOWN']);
  assert.throws(() => evaluate({ contract: CONTRACT, typedDefinitionId: CHEATER, groups: ['install'], basis: 'base', observationSet: { entries: [{ observation: full[0], result: { usable: true } }], states: [] }, ctx: ctxOf(), subjects: { hostItemId: 'host1' } }), /not an authentic ObservationSet/);
});

check('group isolation: failures in one requested group never change another group\'s verdict', () => {
  const id = 'sv-secret-compartment::equipment';
  const obs = [...secretBase(), ob('compat:canAccommodateHiddenCompartment', true), psize('m1', 'p1', 'Huge')];
  const r = run(id, { obs, groups: ['install', 'payload'], payload: snapshot([member('m1', 'p1', 1)]) });
  assert.deepEqual([verdict(r, 'install'), verdict(r, 'payload')], [['legal', []], ['illegal', ['PAYLOAD_NOT_SMALLER']]]);
  const r2 = run(id, { obs: [...secretBase(), ob('compat:canAccommodateHiddenCompartment', false), psize('m1', 'p1', 'Small')], groups: ['install', 'payload'], payload: snapshot([member('m1', 'p1', 1)]) });
  assert.deepEqual([verdict(r2, 'install'), verdict(r2, 'payload')], [['illegal', ['HOST_PHYSICAL_FIT_DISPROVEN']], ['legal', []]]);
  assert.equal(r2.installationAuthorized, false);
});

check('evidence class: production only when every consulted piece is production-trusted; one synthetic piece makes the outcome synthetic', () => {
  const prod = { productionTrusted: true, synthetic: false };
  const syn = { productionTrusted: false, synthetic: true };
  assert.equal(V.evidenceClassOf([]), 'none');
  assert.equal(V.evidenceClassOf([prod, prod]), 'production');
  assert.equal(V.evidenceClassOf([prod, syn]), 'synthetic');
  assert.equal(V.evidenceClassOf([syn]), 'synthetic');
  assert.equal(V.evidenceClassOf([{ productionTrusted: 'yes' }]), 'synthetic', 'only the boolean true counts');
});

/* ---------------------------------- review correction #1 ---------------------------------- */

const fresh = (extra) => ctxOf(authority, extra);
const build = (obs, states = ALL_STATES) => E.createObservationSet({ observations: obs.map((x) => authority.issue(x)), itemStates: states.map((x) => authority.issue(x)) });

check('R1: a set trusted under Item fingerprint A is stale, not legal, when evaluated under fingerprint B (host, added, payload, authority)', () => {
  const dual = build(dualBase('Medium', 'Small'));
  const under = (set, ctx, extra = {}) => run(DUAL, { set, ctx, added: true, ...extra });
  assert.deepEqual(verdict(under(dual, fresh())), ['legal', []], 'baseline: trusted under fingerprint A');
  const hostB = under(dual, fresh({ itemFingerprints: { ...FP, host1: 'fp-host1-B' } }));
  assert.equal(G(hostB).status, 'not_established'); assert.ok(G(hostB).codes.includes('HOST_PROVENANCE_STALE'));
  const addedB = under(dual, fresh({ itemFingerprints: { ...FP, add1: 'fp-add1-B' } }));
  assert.equal(G(addedB).status, 'not_established'); assert.ok(G(addedB).codes.includes('HOST_PROVENANCE_STALE'));
  const noFp = under(dual, fresh({ itemFingerprints: {} }));
  assert.equal(G(noFp).status, 'not_established');
  const revision = under(dual, fresh({ contractRevision: 'a'.repeat(64) }));
  assert.deepEqual(verdict(revision), ['not_established', ['HOST_CONTRACT_VERSION_UNTRUSTED']]);
  // the same set under a different authority context is untrusted, not legal
  const otherAuthority = E.createSyntheticEvidenceAuthority({ trustedSourceKinds: ['synthetic-fixture'] });
  const foreign = under(dual, ctxOf(otherAuthority));
  assert.equal(G(foreign).status, 'not_established'); assert.ok(G(foreign).codes.includes('HOST_FACT_UNTRUSTED'));
  const production = under(dual, ctxOf(E.PRODUCTION_AUTHORITY));
  assert.equal(G(production).status, 'not_established');
  // payload Items: changing a member's fingerprint makes its size evidence stale
  const secret = build([...secretBase(), psize('m1', 'p1', 'Small')]);
  const payload = (ctx) => run(SECRET, { set: secret, ctx, groups: ['payload'], payload: snapshot([member('m1', 'p1', 1)]) });
  assert.deepEqual(verdict(payload(fresh()), 'payload'), ['legal', []]);
  const memberB = payload(fresh({ itemFingerprints: { ...FP, p1: 'fp-p1-B' } }));
  assert.equal(G(memberB, 'payload').status, 'not_established'); assert.ok(G(memberB, 'payload').codes.includes('HOST_PROVENANCE_STALE'));
  const hostForPayload = payload(fresh({ itemFingerprints: { ...FP, host1: 'fp-host1-B' } }));
  assert.equal(G(hostForPayload, 'payload').status, 'not_established', 'the payload snapshot is bound to the host fingerprint too');
  // the set object is not mutated by being evaluated under B: A still works afterwards
  assert.deepEqual(verdict(under(dual, fresh())), ['legal', []]);
});

check('R1: a still-trusted independent failure remains illegal while other evidence is stale', () => {
  const set = build([...secretBase(), psize('m1', 'p1', 'Huge'), psize('m2', 'p2', 'Small')]);
  const r = run(SECRET, { set, ctx: fresh({ itemFingerprints: { ...FP, p2: 'fp-p2-B' } }), groups: ['payload'], payload: snapshot([member('m1', 'p1', 1), member('m2', 'p2', 1)]) });
  assert.equal(G(r, 'payload').status, 'illegal');
  assert.ok(G(r, 'payload').codes.includes('PAYLOAD_NOT_SMALLER') && G(r, 'payload').codes.includes('HOST_PROVENANCE_STALE'));
});

check('R2: a nonempty group is never legal without trusted typed-domain proof (all three groups); proven failures still stand', () => {
  const WEAPON = { itemType: 'weapon' };
  const spring = 'sv-spring-loaded::weapon';
  const oneHanded = (v) => ob('host.oneHandedHandheld', v, WEAPON);
  const good = ob('item.type', 'weapon', WEAPON);
  assert.deepEqual(verdict(run(spring, { obs: [good, oneHanded(true)] })), ['legal', []], 'with the domain proven it is legal');
  const cases = [
    ['absent', []],
    ['unknown', [unknownOb('item.type', WEAPON)]],
    ['default-derived', [ob('item.type', 'weapon', { ...WEAPON, trust: 'default' })]],
    ['untrusted', [ob('item.type', 'weapon', { ...WEAPON, trust: 'derived' })]],
    ['attested', [ob('item.type', 'weapon', { ...WEAPON, trust: 'attested' })]],
    ['stale', [ob('item.type', 'weapon', { ...WEAPON, fingerprint: 'old' })]]
  ];
  for (const [label, typeObs] of cases) {
    const r = run(spring, { obs: [...typeObs, oneHanded(true)] });
    assert.equal(G(r).status, 'not_established', `install/${label}`);
    assert.ok(G(r).codes.includes('HOST_FACT_MISSING'), `install/${label}`);
    assert.ok(!G(r).codes.includes('HOST_DOMAIN_MISMATCH'));
    assert.equal(G(r).predicates[0].outcome, 'satisfied', 'the predicate itself is satisfied; only the positive conclusion is withheld');
    // the use group
    const use = run('sv-electrograpple-handle::weapon', { groups: ['use'], obs: [...typeObs, ob('use.attunedGauntletForHost', true, WEAPON)] });
    assert.equal(G(use, 'use').status, 'not_established', `use/${label}`);
    // the payload group
    const pay = run('sv-secret-compartment::weapon', { groups: ['payload'], obs: [...typeObs, ob('host.sizeCategory', 'Large', WEAPON), psize('m1', 'p1', 'Small', WEAPON)], payload: snapshot([member('m1', 'p1', 1)]) });
    assert.equal(G(pay, 'payload').status, 'not_established', `payload/${label}`);
    // a separately proven failure is still illegal without any domain proof
    const failing = run(spring, { obs: [...typeObs, oneHanded(false)] });
    assert.equal(G(failing).status, 'illegal', `failure/${label}`);
    assert.ok(G(failing).codes.includes('HOST_NOT_ONE_HANDED'));
  }
  // a trusted domain mismatch is a domain mismatch, never illegal and never legal
  assert.deepEqual(verdict(run(spring, { obs: [ob('item.type', 'armor', { itemType: 'armor' }), ob('host.oneHandedHandheld', false, { itemType: 'armor' })] })), ['not_established', ['HOST_DOMAIN_MISMATCH']]);
  // the unknown-domain legal withholding keeps the satisfied evidence for inspection
  const withheld = run(spring, { obs: [oneHanded(true)] });
  assert.ok(G(withheld).evidence.length > 0);
});

check('R3: host diagnostics never authorize installation or selection; there is no productionAuthorized field', () => {
  const variants = [
    run(CHEATER, { obs: [ob('item.type', 'equipment'), ob('compat:canConcealCheater', true)] }),
    run(CHEATER, { obs: [ob('item.type', 'equipment'), ob('compat:canConcealCheater', false)] }),
    run(CHEATER, { obs: [] }),
    run(CHEATER, { obs: [ob('item.type', 'equipment'), ob('compat:canConcealCheater', true)], auth: E.PRODUCTION_AUTHORITY }),
    run('sv-cloaked::equipment', { obs: [ob('item.type', 'equipment')], groups: ['install', 'use'] }),
    run(CHEATER, { obs: [], contract: null })
  ];
  assert.deepEqual(variants.map((r) => G(r).status), ['legal', 'illegal', 'not_established', 'not_established', 'legal', 'not_established']);
  for (const r of variants) {
    assert.equal(r.selectable, false); assert.equal(r.installationAuthorized, false);
    assert.ok(!('productionAuthorized' in r));
    for (const g of Object.values(r.groups)) {
      assert.equal(g.selectable, false); assert.equal(g.installationAuthorized, false);
      assert.ok(!('productionAuthorized' in g));
      assert.ok(['none', 'synthetic', 'production'].includes(g.evidenceClass));
    }
  }
  assert.equal(JSON.stringify(variants).includes('productionAuthorized'), false);
});

/* ---------------------------------- determinism and corpus ---------------------------------- */

check('determinism: reports are frozen, JSON-serializable, ordered and reproducible; every code is one of the 32', () => {
  const mk = () => run(MEM, { obs: [...memBase(), ob('host.droidStatus', 'droid')] });
  const a = mk(); const b = mk();
  const strip = (r) => JSON.parse(JSON.stringify(r, (k, v) => (k === 'recordRef' ? undefined : v)));
  assert.deepEqual(strip(a), strip(b));
  assert.ok(Object.isFrozen(a) && Object.isFrozen(a.groups.install) && Object.isFrozen(a.groups.install.codes));
  assert.throws(() => { a.groups.install.status = 'legal'; });
  const codes = G(a).codes;
  assert.deepEqual(codes, [...codes].sort());
  assert.ok(codes.every((c) => E.DIAGNOSTIC_CODES.includes(c)));
  const refs = G(a).evidence.map((e) => JSON.stringify([e.factRef, e.role, e.itemId, e.memberRef, e.basis, e.recordRef, e.path]));
  assert.deepEqual(refs, [...refs].sort());
});

check('corpus: with no evidence all 35 definitions are not established for every requested group; no code outside the 32 is ever produced', () => {
  for (const rec of SIDECAR.records) {
    const r = run(rec.typedDefinitionId, { obs: [], groups: ['install', 'use', 'payload'], added: true, payload: snapshot([member('m1', 'p1', 1)]) });
    for (const g of GROUPS) {
      const gr = G(r, g);
      assert.ok(gr.status === null || gr.status === 'not_established', `${rec.typedDefinitionId}/${g}`);
      assert.equal(gr.installationAuthorized, false);
      assert.ok(gr.codes.every((c) => E.DIAGNOSTIC_CODES.includes(c)));
      assert.equal(gr.status === null, rec[GROUP_FIELD[g]].length === 0 && !(g === 'install'));
    }
    assert.equal(r.installationAuthorized, false);
  }
});

check('corpus: with a fully-satisfying synthetic fixture every definition is legal only as a test-only outcome; under production trust none is', () => {
  const factsFor = (rec) => {
    const dom = rec.domain;
    const o = [ob('item.type', dom, { itemType: dom }), ob('host.sizeCategory', 'Large', { itemType: dom }), ob('host.weightKg', 10, { itemType: dom })];
    for (const g of GROUPS) {
      for (const p of rec[GROUP_FIELD[g]]) {
        const t = { itemType: dom };
        if (p.op === 'compat.evidenced') o.push(ob(`compat:${p.check}`, true, t));
        if (p.op === 'bool.equals') o.push(ob(p.fact, true, t));
        if (p.op === 'enum.in') o.push(ob(p.fact, p.allowed[0], t));
        if (p.op === 'enum.intersects') o.push(ob(p.fact, { members: [p.allowed[0]], complete: true }, t));
        if (p.op === 'int.explicit') o.push(ob(p.fact, 10, t));
        if (p.op === 'size.not_larger') o.push(ob('addedItem.sizeCategory', 'Small', t));
        if (p.op === 'size.smaller_by_at_least') o.push(psize('m1', 'p1', 'Small', t));
        if (p.op === 'weight.sum_lt') o.push(pweight('m1', 'p1', 1, t));
      }
    }
    return o;
  };
  for (const rec of SIDECAR.records) {
    const obs = factsFor(rec);
    const args = { obs, groups: ['install', 'use', 'payload'], added: true, payload: snapshot([member('m1', 'p1', 1)]) };
    const syn = run(rec.typedDefinitionId, args);
    const prod = run(rec.typedDefinitionId, { ...args, auth: E.PRODUCTION_AUTHORITY });
    for (const g of GROUPS) {
      if (rec[GROUP_FIELD[g]].length === 0 && g !== 'install') continue;
      assert.equal(G(syn, g).status, 'legal', `${rec.typedDefinitionId}/${g}: ${G(syn, g).codes}`);
      assert.equal(G(syn, g).installationAuthorized, false);
      assert.equal(G(prod, g).status, 'not_established', `${rec.typedDefinitionId}/${g} under production trust`);
      assert.equal(G(prod, g).installationAuthorized, false);
    }
  }
});

console.log(`modification-host-evaluator.test: ${checks} checks passed`);
