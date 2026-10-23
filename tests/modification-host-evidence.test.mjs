// D-005 T4d-1: offline tests for the host EVIDENCE CONTRACT (tools/lib/host-evidence.mjs).
// This is an evidence contract, not a predicate evaluator: nothing here evaluates an operator or produces legal/illegal.
// Synthetic fixtures are validated only through a test-local synthetic authority; production trust stays empty.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../tools/lib/host-evidence.mjs';
import {
  FACTS, COMPATIBILITY_CHECKS, PINNED_HOST_REQUIREMENTS_SHA256, HOST_REQUIREMENTS_PATH, HOST_REQUIREMENTS_SCHEMA_PATH, OWNER_DECISIONS_PATH, OPERATORS
} from '../tools/lib/host-requirements.mjs';
import { canonicalJson, sha256, PINNED_SCOPE_SHA256 } from '../tools/lib/modification-runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));
/** An ObservationSet bound to one evaluation context (the only thing resolveFact accepts). */
const bound = (inputs, ctx) => E.bindObservationSet(E.createObservationSet(inputs), ctx);

let checks = 0;
function check(name, fn) {
  try { fn(); checks += 1; } catch (err) { console.error(`FAIL: ${name}`); throw err; }
}

/* ---------------------------------- fixtures ---------------------------------- */

const REG = 'a'.repeat(64);
const REVISION = PINNED_HOST_REQUIREMENTS_SHA256;
const FP = { host1: 'fp-host1', host2: 'fp-host2', add1: 'fp-add1', pay1: 'fp-pay1', pay2: 'fp-pay2' };
const synth = () => E.createSyntheticEvidenceAuthority({
  id: 'test', trustedSourceKinds: ['synthetic-fixture', 'canonical-registry'], trustedBindingMethods: ['test-binding'], trustedEnumerators: ['test-enum'], registryPins: [REG]
});
const ctxOf = (authority, extra = {}) => ({ authority, contractRevision: REVISION, registryHash: REG, itemFingerprints: FP, ...extra });

/** A well-formed raw observation (not yet issued). */
function obs(over = {}) {
  const o = {
    schema: E.EVIDENCE_SCHEMA_ID, factRef: 'host.sizeCategory', subject: { role: 'host', itemId: 'host1', itemType: 'weapon' },
    scope: { basis: 'base', state: null }, status: 'known', value: 'Medium', trust: 'explicit',
    provenance: { source: { kind: 'synthetic-fixture', recordRef: 'fx:1', path: 'size' }, binding: { method: null, result: 'unbound' } },
    bindings: { contractRevision: REVISION, registryHash: null, itemFingerprint: FP.host1 }
  };
  return { ...o, ...over };
}
const registryObs = (over = {}) => obs({
  provenance: { source: { kind: 'canonical-registry', recordRef: 'reg:1', path: 'canonicalStats.size' }, binding: { method: 'test-binding', result: 'bound' } },
  bindings: { contractRevision: REVISION, registryHash: REG, itemFingerprint: FP.host1 }, ...over
});
const itemState = (over = {}) => ({
  schema: E.EVIDENCE_SCHEMA_ID, itemId: 'host1', persistentChanges: 'none', trust: 'explicit',
  provenance: { source: { kind: 'synthetic-fixture', recordRef: 'fx:state', path: 'state' }, binding: { method: null, result: 'unbound' } },
  bindings: { contractRevision: REVISION, itemFingerprint: FP.host1 }, ...over
});
const snapshot = (members, over = {}) => {
  const s = {
    schema: E.EVIDENCE_SCHEMA_ID, role: 'payload', hostItemId: 'host1', members,
    completeness: { status: 'complete', basis: 'system-enumerated', enumerator: 'test-enum' }, trust: 'explicit',
    provenance: { source: { kind: 'synthetic-fixture', recordRef: 'fx:coll', path: 'payload' }, binding: { method: null, result: 'unbound' } },
    bindings: { contractRevision: REVISION, hostFingerprint: FP.host1 }, ...over
  };
  s.fingerprint = over.fingerprint ?? E.collectionFingerprint(s);
  return s;
};
const member = (ref, itemId, qty) => ({ memberRef: ref, itemId, itemType: 'equipment', quantity: qty });
const ASK = { factRef: 'host.sizeCategory', subject: { role: 'host', itemId: 'host1' }, requestedBasis: 'base', purpose: 'printed-statistics' };
const reasons = (r) => r.reasons;

/* ---------------------------------- vocabulary preserved ---------------------------------- */

check('vocabulary: 14 fact references, 6 compatibility checks, 9 operators, 32 diagnostic codes are unchanged', () => {
  assert.equal(E.FACT_REFS.length, 14);
  assert.deepEqual([...E.FACT_REFS], Object.keys(FACTS));
  assert.equal(E.CHECK_REFS.length, 6);
  assert.deepEqual([...E.CHECK_REFS], Object.keys(COMPATIBILITY_CHECKS).map((c) => `compat:${c}`));
  assert.equal(OPERATORS.length ?? Object.keys(OPERATORS).length, 9);
  assert.equal(E.DIAGNOSTIC_CODES.length, 32);
  assert.equal(new Set(E.DIAGNOSTIC_CODES).size, 32);
  const owner = read(OWNER_DECISIONS_PATH);
  const section = owner.slice(owner.indexOf('### 5.1'), owner.indexOf('### 5.2'));
  const inDoc = [...section.matchAll(/`((?:HOST|PAYLOAD)_[A-Z_]+)`/g)].map((m) => m[1]).filter((c) => !c.startsWith('HOST_REQUIREMENTS') && !c.startsWith('HOST_EVALUATOR'));
  assert.deepEqual([...new Set(inDoc)].sort(), [...E.DIAGNOSTIC_CODES].sort());
  const schema = JSON.parse(read(HOST_REQUIREMENTS_SCHEMA_PATH));
  assert.deepEqual([...schema.$defs.diagnosticCode.enum].sort(), [...E.DIAGNOSTIC_CODES].sort());
  for (const code of Object.values(E.UNKNOWN_CODE)) assert.ok(E.DIAGNOSTIC_CODES.includes(code));
  assert.deepEqual(Object.keys(E.UNKNOWN_CODE).sort(), [...E.OBSERVATION_REFS, 'payload.items'].sort());
});

check('trust: production trust sets are empty and the only acceptable class is explicit', () => {
  assert.deepEqual([...E.TRUSTED_BINDING_METHODS], []);
  assert.deepEqual([...E.TRUSTED_SOURCE_KINDS], []);
  assert.deepEqual([...E.TRUSTED_ENUMERATORS], []);
  assert.deepEqual([...E.PRODUCTION_AUTHORITY.trustedBindingMethods], []);
  assert.deepEqual([...E.PRODUCTION_AUTHORITY.trustedSourceKinds], []);
  assert.deepEqual([...E.PRODUCTION_AUTHORITY.trustedEnumerators], []);
  assert.deepEqual([...E.ACCEPTED_TRUST], ['explicit']);
  assert.ok(Object.isFrozen(E.ACCEPTED_TRUST) && Object.isFrozen(E.PRODUCTION_AUTHORITY));
  assert.equal(E.PRODUCTION_AUTHORITY.synthetic, false);
});

/* ---------------------------------- structural validation ---------------------------------- */

check('shape: a well-formed observation validates; unknown fields and wrong schema are rejected', () => {
  assert.deepEqual(E.validateObservationShape(obs()), []);
  assert.ok(E.validateObservationShape({ ...obs(), extra: 1 }).length);
  assert.ok(E.validateObservationShape(obs({ schema: 'other' })).length);
  assert.ok(E.validateObservationShape(obs({ factRef: 'host.color' })).length);
  assert.ok(E.validateObservationShape(null).length);
  assert.ok(E.validateObservationShape(obs({ bindings: { contractRevision: REVISION, registryHash: null } })).length);
  assert.ok(E.validateObservationShape(obs({ trust: 'trusted' })).length);
});

check('shape: values are validated per fact kind; unknown is a status, never a value', () => {
  const bad = (ref, value, role = 'host') => E.validateObservationShape(obs({ factRef: ref, value, subject: { role, itemId: 'host1', itemType: 'weapon' } })).length > 0;
  assert.ok(bad('host.sizeCategory', 'medium'), 'sizes must be exact canonical labels');
  assert.ok(bad('host.sizeCategory', 'Huge ')); assert.ok(bad('host.sizeCategory', 3));
  assert.ok(bad('host.oneHandedHandheld', 'unknown')); assert.ok(bad('host.oneHandedHandheld', null)); assert.ok(bad('host.oneHandedHandheld', 'true'));
  assert.ok(!bad('host.oneHandedHandheld', false));
  assert.ok(bad('host.droidStatus', 'Droid')); assert.ok(!bad('host.droidStatus', 'droid'));
  assert.ok(bad('host.intelligenceScore', -1)); assert.ok(bad('host.intelligenceScore', 1.5)); assert.ok(!bad('host.intelligenceScore', 0));
  assert.ok(bad('host.weightKg', NaN)); assert.ok(bad('host.weightKg', -1)); assert.ok(bad('host.weightKg', '1'));
  assert.ok(bad('host.powerSourceTypes', ['energy-cell'])); assert.ok(bad('host.powerSourceTypes', { members: ['x'], complete: true }));
  assert.ok(bad('host.powerSourceTypes', { members: ['energy-cell', 'energy-cell'], complete: true }));
  assert.ok(!bad('host.powerSourceTypes', { members: ['energy-cell'], complete: false }));
  assert.ok(bad('compat:canCarryPayload', 'yes')); assert.ok(!bad('compat:canCarryPayload', true));
  assert.ok(E.validateObservationShape(obs({ status: 'unknown', value: 'Medium' })).length, 'unknown carries no value');
  assert.deepEqual(E.validateObservationShape(obs({ status: 'unknown', value: undefined })), []);
  assert.ok(E.validateObservationShape(obs({ status: 'known', value: undefined })).length);
});

check('shape: roles, payload member references and the zero-weight rule', () => {
  assert.ok(E.validateObservationShape(obs({ subject: { role: 'addedItem', itemId: 'x', itemType: 'weapon' } })).length, 'host fact on the wrong role');
  assert.ok(E.validateObservationShape(obs({ factRef: 'payload.sizeCategory', subject: { role: 'payloadItem', itemId: 'p', itemType: 'equipment' } })).length, 'payload member needs memberRef');
  assert.deepEqual(E.validateObservationShape(obs({ factRef: 'payload.sizeCategory', subject: { role: 'payloadItem', itemId: 'p', itemType: 'equipment', memberRef: 'm1' } })), []);
  assert.ok(E.validateObservationShape(obs({ subject: { role: 'host', itemId: 'h', itemType: 'weapon', memberRef: 'm1' } })).length, 'memberRef forbidden off payload');
  const w = (value, zero) => obs({ factRef: 'host.weightKg', value, provenance: { ...obs().provenance, ...(zero === undefined ? {} : { zeroIsAuthored: zero }) } });
  assert.ok(E.validateObservationShape(w(0)).length, 'a bare zero weight is not evidence');
  assert.ok(E.validateObservationShape(w(0, false)).length);
  assert.deepEqual(E.validateObservationShape(w(0, true)), []);
  assert.deepEqual(E.validateObservationShape(w(2.5)), []);
});

check('shape: absence is defined only for host.intelligenceScore and needs evidence; persistent needs transformation provenance', () => {
  const intel = (over = {}) => obs({ factRef: 'host.intelligenceScore', status: 'absent', value: undefined, absence: { basis: 'device-has-no-intelligence' }, ...over });
  assert.deepEqual(E.validateObservationShape(intel()), []);
  assert.ok(E.validateObservationShape(intel({ absence: undefined })).length, 'absent needs absence evidence');
  assert.ok(E.validateObservationShape(obs({ status: 'absent', value: undefined, absence: { basis: 'x' } })).length, 'absent invalid for other facts');
  assert.ok(E.validateObservationShape(obs({ absence: { basis: 'x' } })).length, 'absence evidence only with absent');
  const persistent = (t) => obs({ scope: { basis: 'persistent', state: null }, provenance: { ...obs().provenance, ...(t ? { transformation: t } : {}) } });
  assert.ok(E.validateObservationShape(persistent()).length);
  assert.ok(E.validateObservationShape(persistent({ ruleRef: 'r1' })).length);
  assert.deepEqual(E.validateObservationShape(persistent({ ruleRef: 'r1', installationRecordRef: 'i1' })), []);
  assert.ok(E.validateObservationShape(obs({ provenance: { ...obs().provenance, transformation: { ruleRef: 'r', installationRecordRef: 'i' } } })).length, 'base forbids transformation');
  assert.ok(E.validateObservationShape(obs({ scope: { basis: 'inferred', state: null } })).length);
});

/* ---------------------------------- trust: forged labels ---------------------------------- */

check('forged labels: a caller-supplied explicit/bound observation is never trusted (production authority)', () => {
  const forged = registryObs();
  const r = E.classifyObservation(forged, { contractRevision: REVISION, registryHash: REG, itemFingerprints: FP });
  assert.equal(r.usable, false);
  assert.ok(reasons(r).includes('HOST_FACT_UNTRUSTED'));
  assert.equal(r.productionTrusted, false);
  const prodIssued = E.PRODUCTION_AUTHORITY.issue(registryObs());
  const r2 = E.classifyObservation(prodIssued, ctxOf(E.PRODUCTION_AUTHORITY));
  assert.equal(r2.usable, false, 'even production-issued evidence is untrusted: no source kind or method is approved');
  assert.equal(r2.productionTrusted, false);
});

check('forged labels: a structural copy of an issued observation is not issued; JSON round-trip loses issuance', () => {
  const a = synth();
  const issued = a.issue(obs());
  assert.equal(E.classifyObservation(issued, ctxOf(a)).usable, true);
  assert.equal(E.classifyObservation(clone(issued), ctxOf(a)).usable, false);
  assert.equal(E.classifyObservation({ ...issued }, ctxOf(a)).usable, false);
  assert.equal(E.classifyObservation(obs(), ctxOf(a)).usable, false);
  const other = synth();
  assert.equal(E.classifyObservation(issued, ctxOf(other)).usable, false, 'issuance belongs to one authority');
  assert.ok(Object.isFrozen(issued));
});

check('forged labels: trust classes other than explicit, and user-entered values, are never accepted', () => {
  const a = synth();
  for (const trust of ['derived', 'default', 'unknown']) {
    const r = E.classifyObservation(a.issue(obs({ trust })), ctxOf(a));
    assert.equal(r.usable, false, trust); assert.equal(r.status, 'untrusted'); assert.deepEqual(reasons(r), ['HOST_FACT_UNTRUSTED']);
  }
  const ue = E.classifyObservation(a.issue(obs({ scope: { basis: 'user-entered', state: null } })), ctxOf(a));
  assert.equal(ue.usable, false); assert.deepEqual(reasons(ue), ['HOST_FACT_UNTRUSTED']);
});

check('attestation: the reserved class cannot become trusted, under any authority', () => {
  const a = synth();
  const r = E.classifyObservation(a.issue(obs({ trust: 'attested' })), ctxOf(a));
  assert.equal(r.usable, false); assert.equal(r.status, 'untrusted');
  assert.ok(r.detail.some((d) => /reserved/.test(d)));
  assert.throws(() => E.createSyntheticEvidenceAuthority({ acceptedTrust: ['explicit', 'attested'] }), /unsupported authority option/);
  assert.throws(() => E.createSyntheticEvidenceAuthority({ kind: 'production' }), /unsupported authority option/);
  assert.deepEqual([...E.ACCEPTED_TRUST], ['explicit']);
});

check('binding: unbound, unresolvable and mismatched Items are untrusted, and a mismatch is not a contradiction', () => {
  const a = synth();
  for (const result of ['unbound', 'unresolvable', 'mismatch']) {
    const o = a.issue(registryObs({ provenance: { source: { kind: 'canonical-registry', recordRef: 'reg:1', path: 'p' }, binding: { method: result === 'unbound' ? null : 'test-binding', result } } }));
    const c = E.classifyObservation(o, ctxOf(a));
    assert.equal(c.usable, false, result); assert.equal(c.status, 'untrusted'); assert.deepEqual(reasons(c), ['HOST_FACT_UNTRUSTED']);
    const set = bound({ observations: [o] }, ctxOf(a));
    const res = E.resolveFact(set, ASK);
    assert.equal(res.status, 'unknown'); assert.ok(!reasons(res).includes('HOST_EVIDENCE_CONTRADICTORY'));
    assert.ok(reasons(res).includes('HOST_SIZE_UNKNOWN') && reasons(res).includes('HOST_FACT_UNTRUSTED'));
  }
  const unapproved = a.issue(registryObs({ provenance: { source: { kind: 'canonical-registry', recordRef: 'r', path: 'p' }, binding: { method: 'made-up-method', result: 'bound' } } }));
  assert.equal(E.classifyObservation(unapproved, ctxOf(a)).usable, false, 'an unapproved binding method is an unsupported signal, not trust');
  assert.equal(E.classifyObservation(a.issue(registryObs()), ctxOf(a)).usable, true);
});

check('binding: a source kind the authority does not trust is untrusted; a missing binding requirement is enforced only where needed', () => {
  const narrow = E.createSyntheticEvidenceAuthority({ trustedSourceKinds: ['canonical-registry'], trustedBindingMethods: ['test-binding'], registryPins: [REG] });
  assert.equal(E.classifyObservation(narrow.issue(obs()), ctxOf(narrow)).usable, false);
  const fixtureOnly = E.createSyntheticEvidenceAuthority({ trustedSourceKinds: ['synthetic-fixture'] });
  assert.equal(E.classifyObservation(fixtureOnly.issue(obs()), ctxOf(fixtureOnly)).usable, true, 'fixtures need no Item binding');
  assert.equal(E.classifyObservation(fixtureOnly.issue(registryObs()), ctxOf(fixtureOnly)).usable, false);
});

check('synthetic authority: results are marked synthetic and never production-trusted', () => {
  const a = synth();
  const r = E.classifyObservation(a.issue(obs()), ctxOf(a));
  assert.equal(r.usable, true); assert.equal(r.synthetic, true); assert.equal(r.productionTrusted, false);
  assert.equal(a.synthetic, true);
  const unusable = E.classifyObservation(obs(), ctxOf(a));
  assert.equal(unusable.synthetic, false);
});

/* ---------------------------------- invalid vs untrusted vs stale ---------------------------------- */

check('classification: invalid provenance, untrusted and stale are distinct and ordered invalid > untrusted > stale', () => {
  const a = synth();
  const invalid = E.classifyObservation(a.issue(obs({ extra: 1 })), ctxOf(a));
  assert.equal(invalid.status, 'invalid'); assert.deepEqual(reasons(invalid), ['HOST_PROVENANCE_INVALID']);
  const stale = E.classifyObservation(a.issue(obs({ bindings: { contractRevision: REVISION, registryHash: null, itemFingerprint: 'fp-old' } })), ctxOf(a));
  assert.equal(stale.status, 'stale'); assert.deepEqual(reasons(stale), ['HOST_PROVENANCE_STALE']);
  const both = E.classifyObservation(a.issue(obs({ trust: 'default', bindings: { contractRevision: REVISION, registryHash: null, itemFingerprint: 'fp-old' } })), ctxOf(a));
  assert.equal(both.status, 'untrusted'); assert.deepEqual(reasons(both), ['HOST_FACT_UNTRUSTED', 'HOST_PROVENANCE_STALE']);
  const unknown = E.classifyObservation(obs({ status: 'unknown', value: undefined }), ctxOf(a));
  assert.equal(unknown.status, 'unknown'); assert.equal(unknown.usable, false);
});

check('freshness: stale contract revision, registry hash and Item fingerprint are detected; a missing current fingerprint is stale', () => {
  const a = synth();
  const staleContract = E.classifyObservation(a.issue(obs({ bindings: { contractRevision: 'f'.repeat(64), registryHash: null, itemFingerprint: FP.host1 } })), ctxOf(a));
  assert.deepEqual(reasons(staleContract), ['HOST_PROVENANCE_STALE']);
  const staleRegistry = E.classifyObservation(a.issue(registryObs({ bindings: { contractRevision: REVISION, registryHash: 'b'.repeat(64), itemFingerprint: FP.host1 } })), ctxOf(a));
  assert.deepEqual(reasons(staleRegistry), ['HOST_PROVENANCE_STALE']);
  const staleItem = E.classifyObservation(a.issue(obs({ bindings: { contractRevision: REVISION, registryHash: null, itemFingerprint: 'changed' } })), ctxOf(a));
  assert.deepEqual(reasons(staleItem), ['HOST_PROVENANCE_STALE']);
  const noCurrent = E.classifyObservation(a.issue(obs()), ctxOf(a, { itemFingerprints: {} }));
  assert.deepEqual(reasons(noCurrent), ['HOST_PROVENANCE_STALE']);
  const noContext = E.classifyObservation(a.issue(obs()), { authority: a });
  assert.equal(noContext.usable, false);
  assert.equal(E.classifyObservation(a.issue(obs()), ctxOf(a)).usable, true);
});

check('corpus integrity is a separate proof: an unpinned registry hash is invalid provenance, not stale and not trust', () => {
  const a = synth();
  const o = a.issue(registryObs());
  const unpinned = E.classifyObservation(o, ctxOf(a, { registryHash: 'c'.repeat(64) }));
  assert.equal(unpinned.status, 'invalid'); assert.ok(reasons(unpinned).includes('HOST_PROVENANCE_INVALID'));
  const none = E.classifyObservation(o, ctxOf(a, { registryHash: null }));
  assert.equal(none.status, 'invalid');
  const prod = E.classifyObservation(E.PRODUCTION_AUTHORITY.issue(registryObs()), ctxOf(E.PRODUCTION_AUTHORITY));
  assert.ok(reasons(prod).includes('HOST_PROVENANCE_INVALID'), 'production authority pins no registry corpus');
});

/* ---------------------------------- scopes, absence, fallback ---------------------------------- */

const setOf = (a, observations, itemStates = []) => bound({ observations: observations.map((o) => a.issue(o)), itemStates: itemStates.map((s) => a.issue(s)) }, ctxOf(a));
const persistentObs = (value, over = {}) => obs({ value, scope: { basis: 'persistent', state: null }, provenance: { ...obs().provenance, transformation: { ruleRef: 'rule:1', installationRecordRef: 'inst:1' } }, ...over });

check('scopes: base and persistent values may legitimately differ and are not contradictory', () => {
  const a = synth();
  const set = setOf(a, [obs({ value: 'Medium' }), persistentObs('Large')], [itemState({ persistentChanges: 'resolved' })]);
  const base = E.resolveFact(set, { ...ASK, requestedBasis: 'base' });
  const pers = E.resolveFact(set, { ...ASK, requestedBasis: 'persistent' });
  assert.equal(base.status, 'known'); assert.equal(base.value, 'Medium');
  assert.equal(pers.status, 'known'); assert.equal(pers.value, 'Large');
  assert.ok(!reasons(base).includes('HOST_EVIDENCE_CONTRADICTORY') && !reasons(pers).includes('HOST_EVIDENCE_CONTRADICTORY'));
});

check('no silent fallback: a persistent request is never answered from base, and effective is never synthesised', () => {
  const a = synth();
  const set = setOf(a, [obs({ value: 'Medium' })]);
  const pers = E.resolveFact(set, { ...ASK, requestedBasis: 'persistent' });
  assert.equal(pers.status, 'unknown'); assert.equal(pers.value, undefined);
  assert.deepEqual(reasons(pers), ['HOST_SIZE_UNKNOWN']);
  const eff = E.resolveFact(set, { ...ASK, requestedBasis: 'effective' });
  assert.equal(eff.status, 'unknown');
  assert.throws(() => E.resolveFact(set, { ...ASK, requestedBasis: undefined }), /never implicit/);
  assert.throws(() => E.resolveFact(set, { ...ASK, requestedBasis: 'user-entered' }), /never implicit/);
  assert.throws(() => E.resolveFact(set, { ...ASK, purpose: undefined }), /purpose/);
  assert.throws(() => E.resolveFact(set, { ...ASK, factRef: 'host.color' }), /unknown factRef/);
});

check('applicable basis: an unknown applicable basis cannot silently fall back to base for installation eligibility', () => {
  const a = synth();
  const elig = { ...ASK, purpose: 'installation-eligibility' };
  assert.equal(E.classifyItemState(a.issue(itemState()), ctxOf(a)).persistentChanges, 'none', 'a well-formed declaration is usable');
  assert.equal(E.classifyItemState(itemState(), ctxOf(a)).usable, false, 'an unissued declaration is not trusted');
  assert.equal(E.classifyItemState(a.issue(itemState({ persistentChanges: 'maybe' })), ctxOf(a)).status, 'invalid');
  // no Item-state declaration at all
  const none = setOf(a, [obs()]);
  const r0 = E.resolveFact(none, elig);
  assert.equal(r0.status, 'unknown'); assert.ok(reasons(r0).includes('HOST_SIZE_UNKNOWN'));
  // state declared but unresolved persistent changes
  const unresolved = setOf(a, [obs()], [itemState({ persistentChanges: 'unresolved' })]);
  assert.equal(E.resolveFact(unresolved, elig).status, 'unknown');
  // an untrusted declaration (default trust) does not count
  const untrustedDecl = setOf(a, [obs()], [itemState({ persistentChanges: 'none', trust: 'default' })]);
  const r1 = E.resolveFact(untrustedDecl, elig);
  assert.equal(r1.status, 'unknown'); assert.ok(reasons(r1).includes('HOST_FACT_UNTRUSTED'));
  // a stale declaration does not count
  const staleDecl = setOf(a, [obs()], [itemState({ bindings: { contractRevision: REVISION, itemFingerprint: 'old' } })]);
  assert.equal(E.resolveFact(staleDecl, elig).status, 'unknown');
  // proven 'none' permits base; proven 'resolved' forbids base and permits persistent
  const proven = setOf(a, [obs()], [itemState({ persistentChanges: 'none' })]);
  assert.equal(E.resolveFact(proven, elig).status, 'known');
  assert.equal(E.resolveFact(proven, { ...elig, requestedBasis: 'persistent' }).status, 'unknown');
  const resolved = setOf(a, [obs(), persistentObs('Small')], [itemState({ persistentChanges: 'resolved' })]);
  assert.equal(E.resolveFact(resolved, elig).status, 'unknown', 'base is not used for a modified Item');
  assert.equal(E.resolveFact(resolved, { ...elig, requestedBasis: 'persistent' }).value, 'Small');
  assert.equal(E.resolveFact(resolved, { ...elig, requestedBasis: 'effective' }).status, 'unknown');
  // printed statistics do not need the declaration
  assert.equal(E.resolveFact(none, { ...ASK }).status, 'known');
});

check('absence: confirmed Intelligence absence differs from missing and unknown data', () => {
  const a = synth();
  const intel = { factRef: 'host.intelligenceScore', subject: { role: 'host', itemId: 'host1' }, requestedBasis: 'base', purpose: 'printed-statistics' };
  const base = { factRef: 'host.intelligenceScore', subject: { role: 'host', itemId: 'host1', itemType: 'weapon' } };
  const absent = E.resolveFact(setOf(a, [obs({ ...base, status: 'absent', value: undefined, absence: { basis: 'no-intelligence-trait' } })]), intel);
  const known = E.resolveFact(setOf(a, [obs({ ...base, value: 12 })]), intel);
  const unknown = E.resolveFact(setOf(a, [obs({ ...base, status: 'unknown', value: undefined })]), intel);
  const missing = E.resolveFact(setOf(a, []), intel);
  assert.equal(absent.status, 'absent'); assert.deepEqual(reasons(absent), []);
  assert.equal(known.status, 'known'); assert.equal(known.value, 12);
  assert.equal(unknown.status, 'unknown'); assert.deepEqual(reasons(unknown), ['HOST_INTELLIGENCE_MISSING']);
  assert.equal(missing.status, 'unknown'); assert.deepEqual(reasons(missing), ['HOST_INTELLIGENCE_MISSING']);
  const untrustedAbsent = E.resolveFact(setOf(a, [obs({ ...base, status: 'absent', value: undefined, absence: { basis: 'x' }, trust: 'default' })]), intel);
  assert.equal(untrustedAbsent.status, 'unknown', 'untrusted absence is not absence');
  assert.notEqual(absent.status, missing.status);
  const zero = E.resolveFact(setOf(a, [obs({ ...base, value: 0 })]), intel);
  assert.equal(zero.status, 'known'); assert.equal(zero.value, 0); assert.notEqual(zero.status, absent.status);
});

/* ---------------------------------- contradiction ---------------------------------- */

check('contradiction: only disagreeing TRUSTED observations of the same key contradict', () => {
  const a = synth();
  const second = (v, ref = 'fx:2') => obs({ value: v, provenance: { source: { kind: 'synthetic-fixture', recordRef: ref, path: 'size' }, binding: { method: null, result: 'unbound' } } });
  const conflict = E.resolveFact(setOf(a, [obs({ value: 'Medium' }), second('Large')]), ASK);
  assert.equal(conflict.status, 'contradictory'); assert.deepEqual(reasons(conflict), ['HOST_EVIDENCE_CONTRADICTORY']);
  const agree = E.resolveFact(setOf(a, [obs({ value: 'Medium' }), second('Medium')]), ASK);
  assert.equal(agree.status, 'known'); assert.equal(agree.value, 'Medium'); assert.equal(agree.evidence.length, 2);
  const untrustedDisagrees = E.resolveFact(setOf(a, [obs({ value: 'Medium' }), obs({ value: 'Large', trust: 'default', provenance: second('Large').provenance })]), ASK);
  assert.equal(untrustedDisagrees.status, 'known'); assert.equal(untrustedDisagrees.value, 'Medium');
  const staleDisagrees = E.resolveFact(setOf(a, [obs({ value: 'Medium' }), obs({ value: 'Large', bindings: { contractRevision: REVISION, registryHash: null, itemFingerprint: 'old' }, provenance: second('Large').provenance })]), ASK);
  assert.equal(staleDisagrees.status, 'known');
  const knownVsAbsent = E.resolveFact(setOf(a, [
    obs({ factRef: 'host.intelligenceScore', value: 10 }),
    obs({ factRef: 'host.intelligenceScore', status: 'absent', value: undefined, absence: { basis: 'x' }, provenance: second('x').provenance })
  ]), { factRef: 'host.intelligenceScore', subject: { role: 'host', itemId: 'host1' }, requestedBasis: 'base', purpose: 'printed-statistics' });
  assert.equal(knownVsAbsent.status, 'contradictory');
  const otherSubject = E.resolveFact(setOf(a, [obs({ value: 'Medium' }), obs({ value: 'Large', subject: { role: 'host', itemId: 'host2', itemType: 'weapon' }, bindings: { contractRevision: REVISION, registryHash: null, itemFingerprint: FP.host2 } })]), ASK);
  assert.equal(otherSubject.status, 'known', 'different Items never contradict');
});

check('evidence references are deterministic and ordered', () => {
  const a = synth();
  const mk = (ref) => obs({ provenance: { source: { kind: 'synthetic-fixture', recordRef: ref, path: 'size' }, binding: { method: null, result: 'unbound' } } });
  const r1 = E.resolveFact(setOf(a, [mk('fx:b'), mk('fx:a')]), ASK);
  const r2 = E.resolveFact(setOf(a, [mk('fx:a'), mk('fx:b')]), ASK);
  assert.deepEqual(r1, r2);
  assert.deepEqual(r1.evidence.map((e) => e.recordRef), ['fx:a', 'fx:b']);
});

/* ---------------------------------- sets ---------------------------------- */

check('set-valued facts carry explicit completeness; an incomplete set is still a known partial value', () => {
  const a = synth();
  const ps = (complete, members) => obs({ factRef: 'host.powerSourceTypes', value: { members, complete } });
  const r = E.resolveFact(setOf(a, [ps(false, ['energy-cell'])]), { factRef: 'host.powerSourceTypes', subject: { role: 'host', itemId: 'host1' }, requestedBasis: 'base', purpose: 'printed-statistics' });
  assert.equal(r.status, 'known'); assert.deepEqual(r.value, { members: ['energy-cell'], complete: false });
  assert.deepEqual(E.validateObservationShape(ps(true, [])), []);
  assert.ok(E.validateObservationShape(obs({ factRef: 'host.powerSourceTypes', value: ['energy-cell'] })).length, 'a bare array cannot express completeness');
});

/* ---------------------------------- collections ---------------------------------- */

check('collections: a stack of quantity 3 in one Item document is three physical objects, one document', () => {
  const a = synth();
  const snap = a.issueCollection(snapshot([member('m1', 'pay1', { status: 'known', value: 3 })]));
  const c = E.classifyCollection(snap, ctxOf(a));
  assert.equal(c.usable, true); assert.equal(c.documentCount, 1);
  assert.deepEqual(c.physicalObjects, { status: 'exact', value: 3 });
  assert.equal(c.completeness.verified, true);
  assert.notEqual(c.physicalObjects.value, c.documentCount);
  assert.equal(c.synthetic, true); assert.equal(c.productionTrusted, false);
});

check('collections: unknown quantity yields a lower bound; the count never claims exactness', () => {
  const a = synth();
  const c = E.classifyCollection(a.issueCollection(snapshot([member('m1', 'pay1', { status: 'unknown' }), member('m2', 'pay2', { status: 'known', value: 2 })])), ctxOf(a));
  assert.equal(c.usable, true);
  assert.deepEqual(c.physicalObjects, { status: 'lowerBound', value: 3 });
  assert.equal(c.documentCount, 2);
});

check('collections: caller-declared completeness is not verified completeness', () => {
  const a = synth();
  const declared = a.issueCollection(snapshot([member('m1', 'pay1', { status: 'known', value: 1 })], { completeness: { status: 'complete', basis: 'caller-declared', enumerator: null } }));
  const c = E.classifyCollection(declared, ctxOf(a));
  assert.equal(c.completeness.verified, false); assert.equal(c.completeness.claimed, 'complete');
  assert.deepEqual(c.physicalObjects, { status: 'lowerBound', value: 1 });
  assert.ok(reasons(c).includes('HOST_FACT_UNTRUSTED'));
  const unapprovedEnum = a.issueCollection(snapshot([member('m1', 'pay1', { status: 'known', value: 1 })], { completeness: { status: 'complete', basis: 'system-enumerated', enumerator: 'made-up' } }));
  assert.equal(E.classifyCollection(unapprovedEnum, ctxOf(a)).completeness.verified, false);
  const prod = E.PRODUCTION_AUTHORITY.issueCollection(snapshot([member('m1', 'pay1', { status: 'known', value: 1 })]));
  const pc = E.classifyCollection(prod, ctxOf(E.PRODUCTION_AUTHORITY));
  assert.equal(pc.usable, false); assert.equal(pc.completeness.verified, false);
  assert.deepEqual(pc.physicalObjects, { status: 'unknown', value: null });
});

check('collections: an unissued or tampered snapshot is unusable; the fingerprint binds the content', () => {
  const a = synth();
  const raw = snapshot([member('m1', 'pay1', { status: 'known', value: 1 })]);
  assert.equal(E.classifyCollection(raw, ctxOf(a)).usable, false);
  assert.ok(reasons(E.classifyCollection(raw, ctxOf(a))).includes('HOST_FACT_UNTRUSTED'));
  const tampered = clone(raw); tampered.members[0].quantity.value = 99;
  const t = E.classifyCollection(a.issueCollection(tampered), ctxOf(a));
  assert.equal(t.status, 'invalid'); assert.deepEqual(reasons(t), ['HOST_PROVENANCE_INVALID']);
  const staleHost = E.classifyCollection(a.issueCollection(snapshot([member('m1', 'pay1', { status: 'known', value: 1 })], { bindings: { contractRevision: REVISION, hostFingerprint: 'old' } })), ctxOf(a));
  assert.equal(staleHost.status, 'stale'); assert.deepEqual(reasons(staleHost), ['HOST_PROVENANCE_STALE']);
  const staleRev = E.classifyCollection(a.issueCollection(snapshot([], { bindings: { contractRevision: 'e'.repeat(64), hostFingerprint: FP.host1 } })), ctxOf(a));
  assert.equal(staleRev.status, 'stale');
});

check('collections: duplicate members/documents and bad quantities are invalid', () => {
  const a = synth();
  const q1 = { status: 'known', value: 1 };
  const bad = (members) => E.classifyCollection(a.issueCollection(snapshot(members)), ctxOf(a));
  assert.equal(bad([member('m1', 'pay1', q1), member('m1', 'pay2', q1)]).status, 'invalid');
  assert.equal(bad([member('m1', 'pay1', q1), member('m2', 'pay1', q1)]).status, 'invalid');
  assert.equal(bad([member('m1', 'pay1', { status: 'known', value: 0 })]).status, 'invalid');
  assert.equal(bad([member('m1', 'pay1', { status: 'known', value: 1.5 })]).status, 'invalid');
  assert.equal(bad([member('m1', 'pay1', { status: 'known' })]).status, 'invalid');
  assert.equal(bad([member('m1', 'pay1', { status: 'unknown', value: 1 })]).status, 'invalid');
  assert.equal(bad([member('m1', 'pay1', 3)]).status, 'invalid');
  assert.equal(E.classifyCollection({ nope: true }, ctxOf(a)).status, 'invalid');
});

check('collections: an empty complete snapshot from a trusted enumerator is exactly zero; an incomplete one is not', () => {
  const a = synth();
  const empty = E.classifyCollection(a.issueCollection(snapshot([])), ctxOf(a));
  assert.equal(empty.usable, true); assert.deepEqual(empty.physicalObjects, { status: 'exact', value: 0 }); assert.equal(empty.documentCount, 0);
  const incomplete = E.classifyCollection(a.issueCollection(snapshot([], { completeness: { status: 'incomplete', basis: 'system-enumerated', enumerator: 'test-enum' } })), ctxOf(a));
  assert.equal(incomplete.completeness.verified, false);
  assert.deepEqual(incomplete.physicalObjects, { status: 'lowerBound', value: 0 });
  const unk = E.classifyCollection(a.issueCollection(snapshot([], { completeness: { status: 'unknown', basis: 'caller-declared', enumerator: null } })), ctxOf(a));
  assert.equal(unk.physicalObjects.status, 'lowerBound');
});

/* ---------------------------------- verified contract binding ---------------------------------- */

const bundle = () => {
  const bytes = read(HOST_REQUIREMENTS_PATH);
  return {
    bytes, sidecar: JSON.parse(bytes), schema: JSON.parse(read(HOST_REQUIREMENTS_SCHEMA_PATH)),
    specs: JSON.parse(read('data/modifications/specification-records-v1.json')).records,
    registry: JSON.parse(read('data/audits/modification-rolling-authority-v1.5.json')), ownerDecisionsText: read(OWNER_DECISIONS_PATH)
  };
};

check('contract binding: the committed bundle verifies and yields a frozen VerifiedContract equal to the pin', () => {
  const r = E.verifyContractBundle(bundle());
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  assert.equal(E.isVerifiedContract(r.contract), true);
  assert.equal(r.contract.revision, PINNED_HOST_REQUIREMENTS_SHA256);
  assert.equal(r.contract.ids.length, 35);
  assert.ok(Object.isFrozen(r.contract) && Object.isFrozen(r.contract.records));
  const rec = E.getVerifiedRecord(r.contract, r.contract.ids[0]);
  assert.ok(Object.isFrozen(rec));
  assert.equal(E.getVerifiedRecord(r.contract, 'nope::weapon'), null);
  assert.throws(() => { 'use strict'; rec.upgradeLabel = 'x'; });
});

check('contract binding: a tampered bundle, a wrong pin and arbitrary sidecar-shaped objects are not verified contracts', () => {
  const b = bundle();
  b.sidecar.records[0].upgradeLabel = 'tampered';
  const bad = E.verifyContractBundle(b);
  assert.equal(bad.ok, false); assert.equal(bad.contract, null); assert.ok(bad.failures.length);
  assert.equal(E.verifyContractBundle(bundle(), { pin: '0'.repeat(64) }).ok, false);
  const good = E.verifyContractBundle(bundle()).contract;
  for (const fake of [clone(good), { ...good }, { schema: good.schema, revision: good.revision, records: good.records, ids: good.ids }, {}, null, 'x']) {
    assert.equal(E.isVerifiedContract(fake), false);
    assert.throws(() => E.getVerifiedRecord(fake, good.ids[0]), /not a verified T4c contract/);
  }
});

/* ---------------------------------- synthetic fixtures end to end ---------------------------------- */

check('synthetic trusted fixtures validate under a synthetic authority and remain unknown under the production authority', () => {
  const a = synth();
  const raws = [obs(), obs({ factRef: 'host.droidStatus', value: 'nondroid' }), obs({ factRef: 'host.weightKg', value: 4.5 }), registryObs({ factRef: 'host.sizeCategory', value: 'Medium', provenance: { source: { kind: 'canonical-registry', recordRef: 'reg:9', path: 'p' }, binding: { method: 'test-binding', result: 'bound' } } })];
  for (const r of raws) assert.deepEqual(E.validateObservationShape(r), []);
  const sset = setOf(a, raws);
  const pset = bound({ observations: raws.map((r) => E.PRODUCTION_AUTHORITY.issue(r)) }, ctxOf(E.PRODUCTION_AUTHORITY));
  const probes = [['host.sizeCategory', 'Medium'], ['host.droidStatus', 'nondroid'], ['host.weightKg', 4.5]];
  for (const [factRef, expected] of probes) {
    const q = { factRef, subject: { role: 'host', itemId: 'host1' }, requestedBasis: 'base', purpose: 'printed-statistics' };
    const s = E.resolveFact(sset, q);
    assert.equal(s.status === 'contradictory' ? 'known' : s.status, 'known', factRef);
    if (s.status === 'known') assert.equal(s.value, expected);
    const p = E.resolveFact(pset, q);
    assert.equal(p.status, 'unknown', `${factRef} must not resolve in production`);
    assert.ok(p.reasons.includes('HOST_FACT_UNTRUSTED'));
  }
  assert.ok(E.describeObservationSet(sset).entries.every((e) => e.result.productionTrusted === false));
  const ev = E.resolveFact(sset, { factRef: 'host.droidStatus', subject: { role: 'host', itemId: 'host1' }, requestedBasis: 'base', purpose: 'printed-statistics' }).evidence;
  assert.ok(ev.length === 1 && ev[0].synthetic === true && ev[0].productionTrusted === false, 'resolved evidence reports its trust class');
});


/* ---------------------------------- correction #1: authority impersonation ---------------------------------- */

check('authority identity: forged and derived authority objects can issue nothing trusted (observations, item states, collections)', () => {
  const real = synth();
  const forge = (kind) => ({
    id: 'production', kind, synthetic: kind === 'synthetic', trustedBindingMethods: ['test-binding'], trustedSourceKinds: ['synthetic-fixture', 'canonical-registry'],
    trustedEnumerators: ['test-enum'], registryPins: [REG], isIssued: () => true, isIssuedCollection: () => true,
    issue: (x) => x, issueCollection: (x) => x
  });
  const forgeries = [forge('production'), forge('synthetic'), { ...real }, Object.create(real), new Proxy(real, {}), Object.freeze(forge('production')), Object.assign({}, E.PRODUCTION_AUTHORITY)];
  for (const [i, f] of forgeries.entries()) {
    const c = ctxOf(f);
    const o = f.issue ? f.issue(obs()) : obs();
    for (const x of [o, obs(), real.issue(obs())]) {
      const r = E.classifyObservation(x, c);
      assert.equal(r.usable, false, `forgery ${i}`); assert.equal(r.productionTrusted, false); assert.ok(r.reasons.includes('HOST_FACT_UNTRUSTED'));
    }
    const rr = E.classifyObservation(real.issue(registryObs()), c);
    assert.equal(rr.usable, false);
    const st = E.classifyItemState(real.issue(itemState()), c);
    assert.equal(st.usable, false); assert.equal(st.persistentChanges, null);
    const col = E.classifyCollection(real.issueCollection(snapshot([member('m1', 'pay1', { status: 'known', value: 1 })])), c);
    assert.equal(col.usable, false); assert.equal(col.productionTrusted, false); assert.deepEqual(col.physicalObjects, { status: 'unknown', value: null });
    const set = bound({ observations: [real.issue(obs())] }, c);
    assert.equal(E.resolveFact(set, ASK).status, 'unknown', `forgery ${i} cannot resolve a fact`);
  }
  assert.equal(E.classifyObservation(real.issue(obs()), ctxOf(real)).usable, true, 'the genuine authority still works');
  assert.equal(E.classifyObservation(obs(), { ...ctxOf(real), authority: 'production' }).usable, false);
  assert.equal(E.classifyObservation(real.issue(obs()), { ...ctxOf(real), authority: null }).usable, false, 'null falls to production, which accepts nothing');
});

check('authority identity: the public authority fields are descriptive only; a genuine production authority cannot be widened', () => {
  const real = synth();
  assert.ok(Object.isFrozen(real) && Object.isFrozen(real.trustedSourceKinds));
  assert.throws(() => { real.trustedSourceKinds.push('x'); });
  assert.throws(() => { real.kind = 'production'; });
  assert.throws(() => { E.PRODUCTION_AUTHORITY.trustedSourceKinds.push('synthetic-fixture'); });
  assert.equal(real.isIssued, undefined, 'no public issuance oracle');
  assert.equal(real.isIssuedCollection, undefined);
  assert.equal(E.classifyObservation(E.PRODUCTION_AUTHORITY.issue(obs()), ctxOf(E.PRODUCTION_AUTHORITY)).usable, false);
});

/* ---------------------------------- correction #1: ObservationSet integrity ---------------------------------- */

check('ObservationSet: the handle is opaque and frozen; fabricated, copied and spread sets are rejected by resolveFact', () => {
  const a = synth();
  const good = setOf(a, [obs()]);
  assert.equal(E.isBoundObservationSet(good), true);
  assert.equal(E.isObservationSet(good), false, 'a bound set is not an unbound set');
  assert.deepEqual(Object.keys(good).sort(), ['bound', 'entryCount', 'stateCount']);
  assert.throws(() => { good.entries = []; });
  assert.throws(() => { good.entryCount = 5; });
  assert.throws(() => { good.extra = 1; });
  assert.equal(E.resolveFact(good, ASK).status, 'known');
  const fabricated = { entries: [{ observation: obs(), result: { status: 'known', usable: true } }], states: [], ctx: ctxOf(a) };
  const legacyShape = { entries: [{ observation: a.issue(obs()), result: { usable: true, status: 'known', reasons: [] } }], states: [] };
  for (const bad of [fabricated, legacyShape, clone(good), { ...good }, Object.create(good), null, undefined, 'set', []]) {
    assert.equal(E.isBoundObservationSet(bad), false);
    assert.equal(E.isObservationSet(bad), false);
    assert.throws(() => E.bindObservationSet(bad, ctxOf(a)), /not an authentic ObservationSet/);
    assert.throws(() => E.resolveFact(bad, ASK), /not an authentic (Bound)?ObservationSet/);
    assert.throws(() => E.describeObservationSet(bad), /not an authentic (Bound)?ObservationSet/);
  }
  // an UNBOUND set carries no decisions and cannot be resolved, described or re-bound as if it were bound
  const unbound = E.createObservationSet({ observations: [a.issue(obs())] });
  assert.equal(E.isObservationSet(unbound), true);
  assert.throws(() => E.resolveFact(unbound, ASK), /not an authentic BoundObservationSet/);
  assert.throws(() => E.describeObservationSet(unbound), /not an authentic BoundObservationSet/);
  assert.throws(() => E.bindObservationSet(good, ctxOf(a)), /not an authentic ObservationSet/, 'a bound set cannot be re-bound');
});

check('freshness at binding: a set built under one Item fingerprint cannot establish facts under another context (R1)', () => {
  const a = synth();
  const unbound = E.createObservationSet({
    observations: [a.issue(obs()), a.issue(obs({ factRef: 'addedItem.sizeCategory', value: 'Small', subject: { role: 'addedItem', itemId: 'add1', itemType: 'weapon' }, bindings: { contractRevision: REVISION, registryHash: null, itemFingerprint: FP.add1 } }))],
    itemStates: [a.issue(itemState())]
  });
  const ask = { ...ASK, purpose: 'installation-eligibility' };
  const askAdded = { factRef: 'addedItem.sizeCategory', subject: { role: 'addedItem', itemId: 'add1' }, requestedBasis: 'base', purpose: 'printed-statistics' };
  const fresh = E.bindObservationSet(unbound, ctxOf(a));
  assert.equal(E.resolveFact(fresh, ask).status, 'known');
  assert.equal(E.resolveFact(fresh, askAdded).status, 'known');
  // the SAME unbound set under a context that says the host (or the added Item) changed
  const hostChanged = E.bindObservationSet(unbound, ctxOf(a, { itemFingerprints: { ...FP, host1: 'fp-host1-v2' } }));
  const r = E.resolveFact(hostChanged, ask);
  assert.equal(r.status, 'unknown'); assert.ok(reasons(r).includes('HOST_PROVENANCE_STALE'));
  assert.equal(E.resolveFact(hostChanged, askAdded).status, 'known', 'an unchanged Item is unaffected');
  const addedChanged = E.bindObservationSet(unbound, ctxOf(a, { itemFingerprints: { ...FP, add1: 'fp-add1-v2' } }));
  assert.ok(reasons(E.resolveFact(addedChanged, askAdded)).includes('HOST_PROVENANCE_STALE'));
  assert.equal(E.resolveFact(addedChanged, ask).status, 'known');
  // a changed contract revision, a missing fingerprint and a different authority also make the same set stale/untrusted
  assert.ok(reasons(E.resolveFact(E.bindObservationSet(unbound, ctxOf(a, { contractRevision: 'c'.repeat(64) })), ask)).includes('HOST_PROVENANCE_STALE'));
  assert.ok(reasons(E.resolveFact(E.bindObservationSet(unbound, ctxOf(a, { itemFingerprints: {} })), ask)).includes('HOST_PROVENANCE_STALE'));
  const other = synth();
  const foreign = E.resolveFact(E.bindObservationSet(unbound, ctxOf(other)), ask);
  assert.equal(foreign.status, 'unknown'); assert.ok(reasons(foreign).includes('HOST_FACT_UNTRUSTED'));
  const prod = E.resolveFact(E.bindObservationSet(unbound, ctxOf(E.PRODUCTION_AUTHORITY)), ask);
  assert.equal(prod.status, 'unknown');
  // binding is a snapshot: later edits to the context object change nothing, and each bind is independent
  const ctx = ctxOf(a, { itemFingerprints: { ...FP } });
  const snap = E.bindObservationSet(unbound, ctx);
  ctx.itemFingerprints.host1 = 'edited-later';
  assert.equal(E.resolveFact(snap, ask).status, 'known');
  assert.equal(E.resolveFact(E.bindObservationSet(unbound, ctx), ask).status, 'unknown');
});

check('ObservationSet: rejected evidence cannot become known or absent by mutating inputs, results, entries or the saved context', () => {
  const a = synth();
  const intel = { factRef: 'host.intelligenceScore', subject: { role: 'host', itemId: 'host1' }, requestedBasis: 'base', purpose: 'printed-statistics' };
  const fps = { ...FP, host1: 'stale-fp' };
  const rejected = obs({ trust: 'default' });
  const staleObs = a.issue(obs());
  const absentRaw = obs({ factRef: 'host.intelligenceScore', status: 'absent', value: undefined, absence: { basis: 'x' }, trust: 'derived' });
  const context = { ...ctxOf(a), itemFingerprints: fps };
  const set = bound({ observations: [rejected, staleObs, absentRaw] }, context);
  const before = JSON.stringify([E.resolveFact(set, ASK), E.resolveFact(set, intel)]);
  assert.equal(E.resolveFact(set, ASK).status, 'unknown');
  assert.equal(E.resolveFact(set, intel).status, 'unknown');
  // mutate the caller's inputs and context after construction
  rejected.trust = 'explicit'; rejected.value = 'Huge'; absentRaw.trust = 'explicit';
  rejected.factRef = 'host.weightKg';
  assert.equal(E.describeObservationSet(set).entries[0].factRef, 'host.sizeCategory', 'the stored copy is independent of the caller object');
  fps.host1 = FP.host1; context.itemFingerprints = FP; context.authority = null; context.contractRevision = 'zzz'; context.registryHash = REG;
  assert.throws(() => { staleObs.value = 'Huge'; }, 'issued evidence is frozen');
  assert.equal(JSON.stringify([E.resolveFact(set, ASK), E.resolveFact(set, intel)]), before, 'stored decisions are unaffected');
  // mutate a described copy; the set is unaffected
  const d = E.describeObservationSet(set);
  d.entries.forEach((e) => { e.result.usable = true; e.result.status = 'known'; });
  d.entries.push({ factRef: 'host.sizeCategory', result: { usable: true } });
  assert.equal(JSON.stringify([E.resolveFact(set, ASK), E.resolveFact(set, intel)]), before);
  assert.equal(E.describeObservationSet(set).entries.length, 3);
  assert.ok(E.describeObservationSet(set).entries.every((e) => e.result.usable === false));
  // a genuinely fresh construction with the corrected context is a different set and does resolve
  assert.equal(E.resolveFact(bound({ observations: [staleObs] }, ctxOf(a)), ASK).status, 'known');
});

check('ObservationSet: accepted decisions are a snapshot; later context edits cannot revoke or forge them, and item-state declarations are protected too', () => {
  const a = synth();
  const fps = { ...FP };
  const context = { ...ctxOf(a), itemFingerprints: fps };
  const set = bound({ observations: [a.issue(obs())], itemStates: [a.issue(itemState({ persistentChanges: 'unresolved' }))] }, context);
  fps.host1 = 'changed-later';
  assert.equal(E.resolveFact(set, ASK).status, 'known');
  const elig = { ...ASK, purpose: 'installation-eligibility' };
  assert.equal(E.resolveFact(set, elig).status, 'unknown');
  const st = E.describeObservationSet(set);
  st.states[0].result.usable = true; st.states[0].result.persistentChanges = 'none';
  assert.equal(E.resolveFact(set, elig).status, 'unknown', 'item-state classification cannot be edited');
  // an unissued (forged) item-state declaration stays untrusted, and its mutation afterwards changes nothing
  const raw = itemState({ persistentChanges: 'none' });
  const set2 = bound({ observations: [a.issue(obs())], itemStates: [raw] }, ctxOf(a));
  raw.persistentChanges = 'none'; raw.trust = 'explicit';
  assert.equal(E.resolveFact(set2, elig).status, 'unknown');
  // an inconsistent set of inputs stays deterministic
  assert.deepEqual(E.resolveFact(set2, elig), E.resolveFact(set2, elig));
});

check('item type: item.type must agree with subject.itemType, and one Item document has one type across a set', () => {
  const a = synth();
  const typeObs = (value, itemType = 'weapon') => obs({ factRef: 'item.type', value, subject: { role: 'host', itemId: 'host1', itemType } });
  assert.deepEqual(E.validateObservationShape(typeObs('weapon')), []);
  assert.ok(E.validateObservationShape(typeObs('armor')).length, 'value disagrees with subject.itemType');
  const c = E.classifyObservation(a.issue(typeObs('armor')), ctxOf(a));
  assert.equal(c.status, 'invalid'); assert.deepEqual(reasons(c), ['HOST_PROVENANCE_INVALID']);
  // conflicting itemType claims about the same document invalidate every claim about it
  const conflicting = setOf(a, [obs({ value: 'Medium' }), obs({ value: 'Medium', subject: { role: 'host', itemId: 'host1', itemType: 'armor' }, provenance: { source: { kind: 'synthetic-fixture', recordRef: 'fx:2', path: 'size' }, binding: { method: null, result: 'unbound' } } })]);
  const r = E.resolveFact(conflicting, ASK);
  assert.equal(r.status, 'unknown'); assert.ok(reasons(r).includes('HOST_PROVENANCE_INVALID'));
  assert.ok(E.describeObservationSet(conflicting).entries.every((e) => e.result.status === 'invalid'));
  // a consistent type is unaffected, and other documents are not dragged in
  const fine = setOf(a, [obs(), typeObs('weapon')]);
  assert.equal(E.resolveFact(fine, ASK).status, 'known');
  assert.equal(E.resolveFact(fine, { factRef: 'item.type', subject: { role: 'host', itemId: 'host1' }, requestedBasis: 'base', purpose: 'printed-statistics' }).value, 'weapon');
});

check('collections: aggregate physical quantity must remain a safe integer', () => {
  const a = synth();
  const cls = (members) => E.classifyCollection(a.issueCollection(snapshot(members)), ctxOf(a));
  const MAX = Number.MAX_SAFE_INTEGER;
  const big = cls([member('m1', 'pay1', { status: 'known', value: MAX }), member('m2', 'pay2', { status: 'known', value: 1 })]);
  assert.equal(big.status, 'invalid'); assert.deepEqual(reasons(big), ['HOST_PROVENANCE_INVALID']);
  assert.equal(cls([member('m1', 'pay1', { status: 'known', value: MAX }), member('m2', 'pay2', { status: 'unknown' })]).status, 'invalid', 'the lower bound is bounded too');
  assert.equal(cls([member('m1', 'pay1', { status: 'known', value: MAX })]).physicalObjects.value, MAX);
  assert.equal(cls([member('m1', 'pay1', { status: 'known', value: MAX - 1 }), member('m2', 'pay2', { status: 'known', value: 1 })]).physicalObjects.value, MAX);
  assert.equal(cls([member('m1', 'pay1', { status: 'known', value: MAX + 1 })]).status, 'invalid');
});

/* ---------------------------------- scope guards ---------------------------------- */

check('scope: the module defines no operator evaluator, no verdicts and no I/O; nothing under scripts/ imports it', () => {
  const src = read('tools/lib/host-evidence.mjs');
  assert.ok(!/from 'node:(fs|child_process|net|http)/.test(src), 'pure module');
  assert.ok(!/legal'|'illegal|not_established/.test(src.replace(/\/\/.*$/gm, '')), 'no verdict vocabulary');
  for (const op of ['bool.equals', 'enum.in', 'enum.intersects', 'int.explicit', 'size.not_larger', 'size.smaller_by_at_least', 'weight.sum_lt', 'count.at_most', 'compat.evidenced']) {
    assert.ok(!src.includes(op), `operator ${op} is not implemented here`);
  }
  assert.deepEqual(Object.keys(E).filter((k) => /evaluat|operator|verdict|predicate/i.test(k)), []);
  assert.ok(!/scripts\//.test(src.replace(/\/\/.*$/gm, '')));
  for (const f of fs.readdirSync(path.join(root, 'scripts'), { recursive: true })) {
    if (typeof f === 'string' && f.endsWith('.js')) assert.ok(!/host-evidence|host-requirements/.test(fs.readFileSync(path.join(root, 'scripts', f), 'utf8')), `scripts/${f}`);
  }
});

check('invariants: sidecar, pin, registry, specifications and runtime selectability are unchanged', () => {
  assert.equal(sha256(fs.readFileSync(path.join(root, HOST_REQUIREMENTS_PATH))), '25218b4dcebacf653810213b50dfb2cf9d67b92bc702471d7cd6a826db364e3a');
  assert.equal(PINNED_HOST_REQUIREMENTS_SHA256, 'b5f8c7aab8cc5409ab0d24d0a033189ba6542f3c665da659a0c75a151dcf76b8');
  assert.equal(sha256(fs.readFileSync(path.join(root, 'data/audits/modification-rolling-authority-v1.5.json'))), '7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00');
  assert.equal(JSON.parse(read('data/modifications/specification-records-v1.json')).records.length, 111);
  assert.deepEqual(Object.keys(PINNED_SCOPE_SHA256), ['D-001', 'D-004', 'D-005', 'D-006', 'D-010', 'D-011', 'D-013', 'D-014', 'D-015']);
  assert.equal(JSON.parse(read('data/modifications/runtime-definitions-v1.5.json')).header.counts.runtimeSelectable, 0);
  assert.equal(canonicalJson(JSON.parse(read(HOST_REQUIREMENTS_PATH))), read(HOST_REQUIREMENTS_PATH));
});

console.log(`modification-host-evidence.test: ${checks} checks passed`);
