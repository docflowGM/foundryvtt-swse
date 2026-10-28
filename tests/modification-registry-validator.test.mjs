/**
 * Tests for tools/validate-modification-registry.mjs (G1).
 *
 * Every expected value below is an independently specified literal (hash,
 * counts, ids, codes). Nothing is derived by calling the validator on the same
 * data to compute its own expectation.
 *
 * Run: node tests/modification-registry-validator.test.mjs
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateRegistry, MANIFEST_PATH, REGISTRY_PATH, MARKDOWN_PATH, APPROVED_DEVIATIONS, APPROVED_REGISTRY_VERSION } from '../tools/validate-modification-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// Independent literals.
const JSON_SHA256 = '7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00';
const JSON_BYTES = 960022;
const MD_SHA256 = '70e7cdff09fe612c9a68cfb6344eb553f64ee747d2ddfaed0262b6d270eab597';
const MD_BYTES = 137237;
const R1_PATHS = ['/definitions/136/sourceFamily', '/definitions/137/sourceFamily', '/definitions/138/sourceFamily'];

const registryBytes = read('data/audits/modification-rolling-authority-v1.5.json');
const markdownBytes = read('docs/audits/modification-rolling-authority-v1.5.md');
const manifest = JSON.parse(read(MANIFEST_PATH).toString('utf8'));
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

/** Build a registry variant whose manifest hash/length are re-synced so V1 passes unless a test says otherwise. */
function variant(mutate, editManifest = null) {
  const reg = clone(JSON.parse(registryBytes.toString('utf8')));
  mutate(reg);
  const bytes = Buffer.from(JSON.stringify(reg), 'utf8');
  const m = clone(manifest);
  m.files.registry.byteLength = bytes.length;
  m.files.registry.sha256 = sha(bytes);
  if (editManifest) editManifest(m);
  return validateRegistry({ registryBytes: bytes, markdownBytes, manifest: m });
}
const codes = (r) => r.unexpectedFailures.map((f) => f.code);
const hasFailure = (r, code, at) => r.unexpectedFailures.some((f) => f.code === code && (at === undefined || f.path === at));
const findDef = (reg, id) => reg.definitions.find((d) => d.id === id);

/* ------------------------------------------------------------------ the real snapshot */

check('snapshot bytes match the independently recorded hashes (JSON verified, Markdown committed identity only)', () => {
  assert.equal(registryBytes.length, JSON_BYTES);
  assert.equal(sha(registryBytes), JSON_SHA256);
  assert.equal(markdownBytes.length, MD_BYTES);
  assert.equal(sha(markdownBytes), MD_SHA256);
});

check('the real snapshot validates, with exactly the three approved source-family deviations listed', () => {
  const r = validateRegistry({ registryBytes, markdownBytes, manifest });
  assert.equal(r.ok, true, JSON.stringify(r.unexpectedFailures));
  assert.deepEqual(r.unexpectedFailures, []);
  assert.deepEqual(r.staleKnownDeviations, []);
  assert.deepEqual(r.invalidKnownDeviations, []);
  assert.deepEqual(r.matchedKnownDeviations.map((d) => d.path), R1_PATHS);
  assert.deepEqual(r.matchedKnownDeviations.map((d) => d.observed), ['armor_template', 'purchase_quality_talent', 'improvised_equipment_explosive']);
  for (const d of r.matchedKnownDeviations) {
    assert.equal(d.errorCode, 'REF_SOURCE_FAMILY_UNDECLARED');
    assert.equal(d.registryVersion, '1.5');
    assert.equal(d.expected, 'member of sourceFamilies');
  }
});

check('measured counts equal the contract figures (186 / 57 / 128 / 58 / 0; 232 typed versus 231 eligible)', () => {
  const m = validateRegistry({ registryBytes, markdownBytes, manifest }).measured;
  assert.equal(m.definitions, 186);
  assert.equal(m.procedures, 57);
  assert.deepEqual(m.mechanicalCertification, { EFFECTS_CERTIFIED: 128, PENDING_RULES_TEXT: 58 });
  assert.equal(m.fullyExecutableCertified, 0);
  assert.equal(m.scumAndVillainyDefinitions, 58);
  assert.deepEqual(m.tableCertification, { NOT_TABLE_BASED_PAGE_VERIFIED: 21, SOURCE_ENTRY_VERIFIED: 50, SOURCE_TABLE_ROW_AND_RULE_TEXT_VERIFIED: 2, TABLE_VERIFIED: 113 });
  assert.deepEqual(m.procedureStatus, { LEAD_PENDING_CERTIFICATION: 3, RULES_OUTLINE_REVIEWED: 4, SOURCE_RULES_CERTIFIED: 29, SOURCE_RULES_CERTIFIED_RUNTIME_PENDING: 21 });
  assert.deepEqual(m.typedDefinitions, { total: 232, equipment: 38, weapon: 121, armor: 73 });
  assert.deepEqual(m.eligibleUpgradeCandidates, { total: 231, equipment: 38, weapon: 120, armor: 73 });
  assert.deepEqual(m.excludedDefinitionIds, ['web-outlaw-tech-personalized-modifications']);
});

check('the report is deterministic and the input bytes are never mutated', () => {
  const before = sha(registryBytes);
  const a = validateRegistry({ registryBytes, markdownBytes, manifest });
  const b = validateRegistry({ registryBytes, markdownBytes, manifest });
  assert.deepEqual(a, b);
  assert.equal(sha(registryBytes), before);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
});

check('the Markdown is reported as committed identity only, with the owner waiver, and is never original-byte certified', () => {
  const r = validateRegistry({ registryBytes, markdownBytes, manifest });
  assert.equal(r.identity.companionMarkdown.originalByteVerification, 'waived-by-owner');
  assert.equal(manifest.files.companionMarkdown.originalByteVerification, 'waived-by-owner');
  assert.ok(manifest.ownerWaivers.some((w) => w.id === 'W1' && /waived/i.test(w.ruling) && /NOT original-byte certified/.test(w.effect)));
  const overstated = clone(manifest);
  overstated.files.companionMarkdown.originalByteVerification = 'verified-against-original';
  const bad = validateRegistry({ registryBytes, markdownBytes, manifest: overstated });
  assert.equal(bad.ok, false);
  assert.ok(hasFailure(bad, 'MARKDOWN_VERIFICATION_OVERSTATED'));
});

/* ------------------------------------------------------------------ V1 integrity */

check('V1: a flipped registry byte, a wrong length, a wrong hash and an unparseable file each fail', () => {
  const flipped = Buffer.from(registryBytes);
  flipped[10] ^= 0x01;
  const r = validateRegistry({ registryBytes: flipped, markdownBytes, manifest });
  assert.equal(r.ok, false);
  assert.ok(hasFailure(r, 'REGISTRY_HASH_MISMATCH', '/files/registry/sha256'));

  const truncated = registryBytes.subarray(0, registryBytes.length - 1);
  const t = validateRegistry({ registryBytes: truncated, markdownBytes, manifest });
  assert.ok(hasFailure(t, 'REGISTRY_LENGTH_MISMATCH', '/files/registry/byteLength'));
  assert.ok(hasFailure(t, 'REGISTRY_HASH_MISMATCH'));

  const garbage = Buffer.from('{ not json', 'utf8');
  const m = clone(manifest);
  m.files.registry.byteLength = garbage.length;
  m.files.registry.sha256 = sha(garbage);
  const g = validateRegistry({ registryBytes: garbage, markdownBytes, manifest: m });
  assert.equal(g.ok, false);
  assert.ok(hasFailure(g, 'REGISTRY_UNPARSEABLE'));
});

check('V1: registry version, Markdown identity and a missing Markdown fail', () => {
  const v = variant((reg) => { reg.version = '1.6'; });
  assert.ok(hasFailure(v, 'REGISTRY_VERSION_MISMATCH', '/version'));
  const md = Buffer.from(markdownBytes);
  md[0] ^= 0x01;
  const r = validateRegistry({ registryBytes, markdownBytes: md, manifest });
  assert.equal(r.ok, false);
  assert.ok(hasFailure(r, 'MARKDOWN_HASH_MISMATCH', '/files/companionMarkdown/sha256'));
  const none = validateRegistry({ registryBytes, markdownBytes: null, manifest });
  assert.ok(hasFailure(none, 'MARKDOWN_UNREADABLE'));
});

check('V1: a malformed manifest fails closed', () => {
  for (const edit of [(m) => { m.manifestVersion = 2; }, (m) => { m.runtimeLoading = 'allowed'; }, (m) => { m.files.registry.sha256 = 'XYZ'; }, (m) => { delete m.expected; }, (m) => { m.knownDeviations = {}; }]) {
    const m = clone(manifest);
    edit(m);
    const r = validateRegistry({ registryBytes, markdownBytes, manifest: m });
    assert.equal(r.ok, false);
    assert.ok(hasFailure(r, 'MANIFEST_INVALID'));
  }
  assert.equal(validateRegistry({ registryBytes, markdownBytes, manifest: null }).ok, false);
});

/* ------------------------------------------------------------------ V2 counts */

check('V2: removing, adding or changing records fails with the count path', () => {
  const removed = variant((reg) => { reg.definitions.pop(); });
  assert.ok(hasFailure(removed, 'COUNT_MISMATCH', '/definitions'));
  const procRemoved = variant((reg) => { reg.procedures.pop(); });
  assert.ok(hasFailure(procRemoved, 'COUNT_MISMATCH', '/procedures'));
  const recertified = variant((reg) => { findDef(reg, 'sv-cheater').mechanicalCertification = 'EFFECTS_CERTIFIED'; });
  assert.ok(hasFailure(recertified, 'COUNT_MISMATCH', '/definitions/*/mechanicalCertification'));
});

check('V2: the 232-versus-231 rule is asserted, not tolerated', () => {
  const unexcluded = variant((reg) => { findDef(reg, 'web-outlaw-tech-personalized-modifications').sourceRole = 'upgrade_option'; });
  assert.ok(hasFailure(unexcluded, 'COUNT_MISMATCH', '/definitions/*/typedDefinitions[eligible]'));
  assert.ok(hasFailure(unexcluded, 'COUNT_MISMATCH', '/definitions/*/sourceRole=excluded'));
  const secondExcluded = variant((reg) => { findDef(reg, 'sv-cheater').sourceRole = 'temporary_talent_actuator_not_installed_upgrade'; });
  assert.ok(hasFailure(secondExcluded, 'COUNT_MISMATCH', '/definitions/*/sourceRole=excluded'));
  assert.ok(hasFailure(secondExcluded, 'COUNT_MISMATCH', '/definitions/*/typedDefinitions[eligible]'));
});

check('V2: a registry summary that disagrees with the defined populations fails', () => {
  const r = variant((reg) => { reg.indexSummary.eligibleCandidateDomainVariants = 232; });
  assert.ok(hasFailure(r, 'SUMMARY_DISAGREES_WITH_MEASURED', '/indexSummary/eligibleCandidateDomainVariants'));
  const w = variant((reg) => { reg.indexSummary.domainCandidateCounts.weapon = 121; });
  assert.ok(hasFailure(w, 'SUMMARY_DISAGREES_WITH_MEASURED', '/indexSummary/domainCandidateCounts'));
});

/* ------------------------------------------------------------------ V3-V5 */

check('V3: duplicate ids, shared ids and bad typed ids each fail', () => {
  const dup = variant((reg) => { reg.definitions[1].id = reg.definitions[0].id; });
  assert.ok(hasFailure(dup, 'DUPLICATE_DEFINITION_ID'));
  const dupProc = variant((reg) => { reg.procedures[1].id = reg.procedures[0].id; });
  assert.ok(hasFailure(dupProc, 'DUPLICATE_PROCEDURE_ID'));
  const shared = variant((reg) => { reg.procedures[0].id = reg.definitions[0].id; });
  assert.ok(hasFailure(shared, 'ID_SHARED_DEFINITION_PROCEDURE'));
  const typedBad = variant((reg) => { findDef(reg, 'sv-cheater').typedDefinitions.equipment.definitionId = 'wrong::equipment'; });
  assert.ok(hasFailure(typedBad, 'TYPED_ID_MISMATCH'));
  const typedDup = variant((reg) => {
    const a = findDef(reg, 'sv-cheater').typedDefinitions.equipment;
    const b = findDef(reg, 'sv-bayonet-ring');
    const dom = Object.keys(b.typedDefinitions)[0];
    b.typedDefinitions[dom].definitionId = a.definitionId;
  });
  assert.ok(hasFailure(typedDup, 'DUPLICATE_TYPED_DEFINITION_ID'));
});

check('V4: a missing required field fails', () => {
  const r = variant((reg) => { delete findDef(reg, 'sv-cheater').audit; });
  assert.ok(hasFailure(r, 'MISSING_REQUIRED_FIELD'));
  const shape = variant((reg) => { reg.procedures = null; });
  assert.ok(hasFailure(shape, 'REGISTRY_SHAPE_INVALID'));
});

check('V5: droid, vehicle and starship domains and domain mismatches fail', () => {
  for (const bad of ['droid', 'vehicle', 'starship']) {
    const r = variant((reg) => { findDef(reg, 'sv-cheater').typedDefinitions[bad] = { domain: bad, definitionId: `sv-cheater::${bad}`, effectOperations: [], effectStatus: 'PENDING', consumerStatus: 'NOT_MAPPED' }; });
    assert.ok(hasFailure(r, 'UNKNOWN_DOMAIN_KEY'), bad);
  }
  const mismatch = variant((reg) => { findDef(reg, 'sv-cheater').typedDefinitions.equipment.domain = 'weapon'; });
  assert.ok(hasFailure(mismatch, 'TYPED_DOMAIN_MISMATCH'));
  const cand = variant((reg) => { findDef(reg, 'sv-cheater').candidateHostDomains = ['equipment', 'weapon']; });
  assert.ok(hasFailure(cand, 'CANDIDATE_DOMAINS_MISMATCH'));
});

/* ------------------------------------------------------------------ V6 references */

check('V6: dangling book, source family, procedure and page references fail; the three R1 findings are the only tolerated ones', () => {
  const book = variant((reg) => { findDef(reg, 'sv-cheater').source.bookId = 'no-such-book'; });
  assert.ok(hasFailure(book, 'REF_BOOK_UNDECLARED', '/definitions/0/source/bookId'));
  const family = variant((reg) => { findDef(reg, 'sv-cheater').sourceFamily = 'invented_family'; });
  assert.ok(hasFailure(family, 'REF_SOURCE_FAMILY_UNDECLARED', '/definitions/0/sourceFamily'));
  assert.equal(family.ok, false);
  const proc = variant((reg) => { findDef(reg, 'sog-tech-improved-accuracy').originalCost.procedureId = 'no-such-procedure'; });
  assert.ok(hasFailure(proc, 'REF_PROCEDURE_UNRESOLVED'));
  for (const page of [0, -3, 2.5, '41']) {
    const r = variant((reg) => { findDef(reg, 'sv-cheater').source.printedTablePage = page; });
    assert.ok(hasFailure(r, 'PAGE_NUMBER_INVALID'), String(page));
  }
  const procPage = variant((reg) => { reg.procedures[0].sourcePages = [0]; });
  assert.ok(hasFailure(procPage, 'PAGE_NUMBER_INVALID'));
  const procBook = variant((reg) => { reg.procedures[0].bookId = 'no-such-book'; });
  assert.ok(hasFailure(procBook, 'REF_BOOK_UNDECLARED'));
});

/* ------------------------------------------------------------------ V7 certification states */

check('V7: certification-state inconsistencies fail', () => {
  const pendingOps = variant((reg) => {
    findDef(reg, 'sv-cheater').typedDefinitions.equipment.effectOperations = [{ effectId: 'x', operation: 'add' }];
  });
  assert.ok(hasFailure(pendingOps, 'PENDING_EFFECTS_NONEMPTY'));
  const pendingStatus = variant((reg) => { findDef(reg, 'sv-cheater').typedDefinitions.equipment.effectStatus = 'EFFECTS_SOURCE_VERIFIED_CONSUMER_UNMAPPED'; });
  assert.ok(hasFailure(pendingStatus, 'PENDING_EFFECT_STATUS_INCONSISTENT'));
  const pendingCurrent = variant((reg) => { findDef(reg, 'sv-cheater').currentStatus = 'SOURCE_RULES_CERTIFIED_RUNTIME_NOT_MAPPED'; });
  assert.ok(hasFailure(pendingCurrent, 'PENDING_STATUS_INCONSISTENT'));
  const full = variant((reg) => { findDef(reg, 'kotor-accessory-hair-trigger').mechanicalCertification = 'FULL_CERTIFIED'; });
  assert.ok(hasFailure(full, 'FULL_CERTIFIED_PRESENT'));
  const unknown = variant((reg) => { findDef(reg, 'kotor-accessory-hair-trigger').mechanicalCertification = 'RUNTIME_VERIFIED'; });
  assert.ok(hasFailure(unknown, 'CERT_STATE_INVALID'));
  const effectsStatus = variant((reg) => { findDef(reg, 'kotor-accessory-hair-trigger').currentStatus = 'RUNTIME_APPROVED'; });
  assert.ok(hasFailure(effectsStatus, 'EFFECTS_CERTIFIED_STATUS_INCONSISTENT'));
  const consumer = variant((reg) => {
    const t = findDef(reg, 'kotor-accessory-hair-trigger').typedDefinitions;
    t[Object.keys(t)[0]].consumerStatus = 'RUNTIME_APPROVED';
  });
  assert.ok(hasFailure(consumer, 'CONSUMER_STATUS_UNRECOGNIZED'));
});

/* ------------------------------------------------------------------ V8 / V9 shapes */

check('V8: fixed slot costs must be integers >= 0; an unknown type fails', () => {
  for (const bad of ['1', -1, 1.5, null]) {
    const r = variant((reg) => { findDef(reg, 'sv-cheater').originalSlotCost = { type: 'fixed', slots: bad }; });
    assert.ok(hasFailure(r, 'FIXED_SLOT_INVALID'), String(bad));
  }
  const zero = variant((reg) => { findDef(reg, 'sv-cheater').originalSlotCost = { type: 'fixed', slots: 0 }; });
  assert.ok(!hasFailure(zero, 'FIXED_SLOT_INVALID'), 'an explicit certified zero is valid');
  const type = variant((reg) => { findDef(reg, 'sv-cheater').originalSlotCost = { type: 'whatever', slots: 1 }; });
  assert.ok(hasFailure(type, 'SLOT_COST_TYPE_UNKNOWN'));
});

check('V9: credits must be finite numbers >= 0; an unstated price may never carry a number; unknown price types fail', () => {
  for (const bad of ['500', -1, NaN, null, undefined]) {
    const r = variant((reg) => { findDef(reg, 'sv-cheater').originalCost = { type: 'credits', amount: bad === undefined ? undefined : bad }; });
    assert.ok(hasFailure(r, 'CREDITS_AMOUNT_INVALID'), String(bad));
  }
  const zeroUnstated = variant((reg) => { findDef(reg, 'goi-componentization-basic').originalCost.amount = 0; });
  assert.ok(hasFailure(zeroUnstated, 'UNSTATED_PRICE_HAS_AMOUNT'));
  const type = variant((reg) => { findDef(reg, 'sv-cheater').originalCost = { type: 'free', amount: 0 }; });
  assert.ok(hasFailure(type, 'PRICE_TYPE_UNKNOWN'));
});

/* ------------------------------------------------------------------ known deviations */

check('known deviations: an unlisted defect is an unexpected failure even when the three approved ones are listed', () => {
  const r = variant((reg) => { findDef(reg, 'sv-cheater').sourceFamily = 'invented_family'; });
  assert.equal(r.ok, false);
  assert.equal(r.unexpectedFailures.filter((f) => f.code === 'REF_SOURCE_FAMILY_UNDECLARED').length, 1);
  assert.equal(r.matchedKnownDeviations.length, 3);
});

check('known deviations: a changed observed or expected value, a moved path and another version are rejected (not the approved identities)', () => {
  const observed = clone(manifest);
  observed.knownDeviations[0].observed = 'something_else';
  const o = validateRegistry({ registryBytes, markdownBytes, manifest: observed });
  assert.equal(o.ok, false);
  assert.ok(o.invalidKnownDeviations.some((i) => i.code === 'DEVIATION_NOT_APPROVED' && i.path === R1_PATHS[0]));
  assert.ok(o.invalidKnownDeviations.some((i) => i.code === 'APPROVED_DEVIATION_MISSING' && i.path === R1_PATHS[0]));
  assert.ok(hasFailure(o, 'REF_SOURCE_FAMILY_UNDECLARED', R1_PATHS[0]), 'the defect itself is no longer tolerated');

  const expected = clone(manifest);
  expected.knownDeviations[1].expected = 'member of the declared families';
  const e = validateRegistry({ registryBytes, markdownBytes, manifest: expected });
  assert.equal(e.ok, false);
  assert.ok(e.invalidKnownDeviations.some((i) => i.code === 'DEVIATION_NOT_APPROVED' && i.path === R1_PATHS[1]));
  assert.ok(hasFailure(e, 'REF_SOURCE_FAMILY_UNDECLARED', R1_PATHS[1]));

  const moved = clone(manifest);
  moved.knownDeviations[2].path = '/definitions/139/sourceFamily';
  const mv = validateRegistry({ registryBytes, markdownBytes, manifest: moved });
  assert.equal(mv.ok, false);
  assert.ok(mv.invalidKnownDeviations.some((i) => i.code === 'DEVIATION_NOT_APPROVED'));
  assert.ok(mv.staleKnownDeviations.length === 0);

  const version = clone(manifest);
  version.knownDeviations[0].registryVersion = '1.6';
  const vr = validateRegistry({ registryBytes, markdownBytes, manifest: version });
  assert.equal(vr.ok, false);
  assert.equal(vr.invalidKnownDeviations[0].code, 'DEVIATION_VERSION_MISMATCH');
});

check('known deviations: the approved identities are pinned in the validator, independently of the manifest', () => {
  assert.equal(APPROVED_REGISTRY_VERSION, '1.5');
  assert.deepEqual(
    APPROVED_DEVIATIONS.map((d) => [d.registryVersion, d.errorCode, d.path, d.observed, d.expected]),
    [
      ['1.5', 'REF_SOURCE_FAMILY_UNDECLARED', '/definitions/136/sourceFamily', 'armor_template', 'member of sourceFamilies'],
      ['1.5', 'REF_SOURCE_FAMILY_UNDECLARED', '/definitions/137/sourceFamily', 'purchase_quality_talent', 'member of sourceFamilies'],
      ['1.5', 'REF_SOURCE_FAMILY_UNDECLARED', '/definitions/138/sourceFamily', 'improvised_equipment_explosive', 'member of sourceFamilies']
    ]
  );
  assert.ok(Object.isFrozen(APPROVED_DEVIATIONS) && APPROVED_DEVIATIONS.every((d) => Object.isFrozen(d)));
});

check('known deviations: a fourth defect with a matching fourth exception in the manifest still fails (a manifest cannot authorize itself)', () => {
  const extra = {
    registryVersion: '1.5',
    errorCode: 'REF_SOURCE_FAMILY_UNDECLARED',
    path: '/definitions/0/sourceFamily',
    observed: 'invented_family',
    expected: 'member of sourceFamilies',
    reason: 'self-authorized exception',
    approvalReference: 'none'
  };
  const r = variant((reg) => { findDef(reg, 'sv-cheater').sourceFamily = 'invented_family'; }, (m) => { m.knownDeviations.push(extra); });
  assert.equal(r.ok, false);
  assert.ok(r.invalidKnownDeviations.some((i) => i.code === 'DEVIATION_NOT_APPROVED' && i.path === '/definitions/0/sourceFamily'));
  assert.ok(hasFailure(r, 'REF_SOURCE_FAMILY_UNDECLARED', '/definitions/0/sourceFamily'), 'the fourth defect stays an unexpected failure');
  assert.equal(r.matchedKnownDeviations.length, 3);

  // A defect of a different kind, with an exception written to match it exactly, is rejected the same way.
  const countDefect = variant((reg) => { reg.definitions.pop(); }, (m) => {
    m.knownDeviations.push({ registryVersion: '1.5', errorCode: 'COUNT_MISMATCH', path: '/definitions', observed: 185, expected: 186, reason: 'self-authorized', approvalReference: 'none' });
  });
  assert.equal(countDefect.ok, false);
  assert.ok(countDefect.invalidKnownDeviations.some((i) => i.code === 'DEVIATION_NOT_APPROVED' && i.errorCode === 'COUNT_MISMATCH'));
  assert.ok(hasFailure(countDefect, 'COUNT_MISMATCH', '/definitions'));
});

check('known deviations: removing an approved exception fails (all three must be present)', () => {
  const m = clone(manifest);
  m.knownDeviations.pop();
  const r = validateRegistry({ registryBytes, markdownBytes, manifest: m });
  assert.equal(r.ok, false);
  assert.ok(r.invalidKnownDeviations.some((i) => i.code === 'APPROVED_DEVIATION_MISSING' && i.path === R1_PATHS[2]));
  assert.ok(hasFailure(r, 'REF_SOURCE_FAMILY_UNDECLARED', R1_PATHS[2]));
});

check('known deviations: an exception whose defect no longer exists is stale, not silently accepted', () => {
  const fixed = variant((reg) => { reg.sourceFamilies.push('armor_template'); });
  assert.equal(fixed.ok, false);
  assert.equal(fixed.staleKnownDeviations.length, 1);
  assert.equal(fixed.staleKnownDeviations[0].path, R1_PATHS[0]);
  assert.equal(fixed.matchedKnownDeviations.length, 2);
});

check('known deviations: an incomplete or duplicate exception is invalid', () => {
  for (const field of ['registryVersion', 'errorCode', 'path', 'observed', 'expected', 'reason', 'approvalReference']) {
    const m = clone(manifest);
    delete m.knownDeviations[0][field];
    const r = validateRegistry({ registryBytes, markdownBytes, manifest: m });
    assert.equal(r.ok, false, field);
    assert.equal(r.invalidKnownDeviations[0].code, 'DEVIATION_INVALID', field);
  }
  const blank = clone(manifest);
  blank.knownDeviations[0].approvalReference = '  ';
  assert.equal(validateRegistry({ registryBytes, markdownBytes, manifest: blank }).ok, false);
  const dup = clone(manifest);
  dup.knownDeviations.push(clone(dup.knownDeviations[0]));
  const d = validateRegistry({ registryBytes, markdownBytes, manifest: dup });
  assert.equal(d.ok, false);
  assert.equal(d.invalidKnownDeviations[0].code, 'DEVIATION_DUPLICATE');
});

check('known deviations: with none listed the three findings fail the run', () => {
  const m = clone(manifest);
  m.knownDeviations = [];
  const r = validateRegistry({ registryBytes, markdownBytes, manifest: m });
  assert.equal(r.ok, false);
  assert.deepEqual(r.unexpectedFailures.map((f) => f.path), R1_PATHS);
  assert.deepEqual(r.unexpectedFailures.map((f) => f.code), ['REF_SOURCE_FAMILY_UNDECLARED', 'REF_SOURCE_FAMILY_UNDECLARED', 'REF_SOURCE_FAMILY_UNDECLARED']);
});

/* ------------------------------------------------------------------ canonical paths */

check('canonical artifact paths are contract constants the manifest cannot redefine', () => {
  assert.equal(REGISTRY_PATH, 'data/audits/modification-rolling-authority-v1.5.json');
  assert.equal(MARKDOWN_PATH, 'docs/audits/modification-rolling-authority-v1.5.md');
  assert.equal(manifest.files.registry.path, REGISTRY_PATH);
  assert.equal(manifest.files.companionMarkdown.path, MARKDOWN_PATH);
  for (const bad of ['data/audits/other-registry.json', 'data/audits/modification-rolling-authority-v1.4.json', '../data/audits/modification-rolling-authority-v1.5.json', '', null]) {
    const m = clone(manifest);
    m.files.registry.path = bad;
    const r = validateRegistry({ registryBytes, markdownBytes, manifest: m });
    assert.equal(r.ok, false, String(bad));
    assert.ok(hasFailure(r, 'ARTIFACT_PATH_NOT_CANONICAL', '/files/registry/path'), String(bad));
    const md = clone(manifest);
    md.files.companionMarkdown.path = bad;
    const rm = validateRegistry({ registryBytes, markdownBytes, manifest: md });
    assert.equal(rm.ok, false);
    assert.ok(hasFailure(rm, 'ARTIFACT_PATH_NOT_CANONICAL', '/files/companionMarkdown/path'));
  }
  // Even with a re-synced hash and counts, a redirected path is not accepted.
  const redirected = variant(() => {}, (m) => { m.files.registry.path = 'data/audits/elsewhere.json'; });
  assert.equal(redirected.ok, false);
  assert.ok(hasFailure(redirected, 'ARTIFACT_PATH_NOT_CANONICAL'));
  // A manifest for another registry version is not accepted either.
  const other = clone(manifest);
  other.registryVersion = '1.6';
  assert.equal(validateRegistry({ registryBytes, markdownBytes, manifest: other }).ok, false);
  // The CLI reads the pinned paths, never paths taken from the manifest.
  const src = read('tools/validate-modification-registry.mjs').toString('utf8');
  assert.match(src, /readBytes\(REGISTRY_PATH\)/);
  assert.match(src, /readBytes\(MARKDOWN_PATH\)/);
  assert.ok(!/readBytes\(manifest/.test(src));
});

/* ------------------------------------------------------------------ malformed input fails closed */

const doesNotThrow = (fn) => {
  let r;
  assert.doesNotThrow(() => { r = fn(); });
  return r;
};

check('malformed registry structures return structured failures, never exceptions', () => {
  const cases = [
    ['null definition', (reg) => { reg.definitions[3] = null; }, 'DEFINITION_NOT_OBJECT', '/definitions/3'],
    ['scalar definition', (reg) => { reg.definitions[5] = 42; }, 'DEFINITION_NOT_OBJECT', '/definitions/5'],
    ['array definition', (reg) => { reg.definitions[6] = []; }, 'DEFINITION_NOT_OBJECT', '/definitions/6'],
    ['null procedure', (reg) => { reg.procedures[0] = null; }, 'PROCEDURE_NOT_OBJECT', '/procedures/0'],
    ['string typedDefinitions', (reg) => { findDef(reg, 'sv-cheater').typedDefinitions = 'x'; }, 'TYPED_DEFINITIONS_INVALID', '/definitions/0/typedDefinitions'],
    ['null typed definition', (reg) => { findDef(reg, 'sv-cheater').typedDefinitions.equipment = null; }, 'TYPED_DEFINITION_NOT_OBJECT', '/definitions/0/typedDefinitions/equipment'],
    ['string sourceFamilies', (reg) => { reg.sourceFamilies = 'abc'; }, 'REGISTRY_SHAPE_INVALID', '/sourceFamilies'],
    ['null bookLedger', (reg) => { reg.bookLedger = null; }, 'REGISTRY_SHAPE_INVALID', '/bookLedger'],
    ['null schema.required', (reg) => { reg.definitionsSchema.required = null; }, 'REGISTRY_SHAPE_INVALID', '/definitionsSchema/required'],
    ['missing allowed states', (reg) => { delete reg.definitionsSchema.allowedCertificationStates; }, 'REGISTRY_SHAPE_INVALID', '/definitionsSchema/allowedCertificationStates']
  ];
  for (const [label, mutate, code, at] of cases) {
    const r = doesNotThrow(() => variant(mutate));
    assert.equal(r.ok, false, label);
    assert.ok(hasFailure(r, code, at), `${label}: ${JSON.stringify(r.unexpectedFailures.slice(0, 3))}`);
    assert.ok(!hasFailure(r, 'VALIDATOR_INTERNAL_ERROR'), `${label}: specific failure expected, not the internal-error net`);
  }
  // Malformed leaf values inside otherwise valid records: structured failures, no exception, no internal-error net.
  for (const [label, mutate] of [
    ['null source', (reg) => { findDef(reg, 'sv-cheater').source = null; }],
    ['null originalSlotCost', (reg) => { findDef(reg, 'sv-cheater').originalSlotCost = null; }],
    ['null originalCost', (reg) => { findDef(reg, 'sv-cheater').originalCost = null; }],
    ['string candidateHostDomains', (reg) => { findDef(reg, 'sv-cheater').candidateHostDomains = 'equipment'; }],
    ['null bookLedger entry', (reg) => { reg.bookLedger[0] = null; }],
    ['null indexSummary', (reg) => { reg.indexSummary = null; }]
  ]) {
    const r = doesNotThrow(() => variant(mutate));
    assert.equal(r.ok, false, label);
    assert.ok(!hasFailure(r, 'VALIDATOR_INTERNAL_ERROR'), label);
  }
});

check('registry JSON of the wrong top-level type and non-byte inputs fail closed', () => {
  for (const text of ['null', '[]', '"x"', '42', 'true']) {
    const bytes = Buffer.from(text, 'utf8');
    const m = clone(manifest);
    m.files.registry.byteLength = bytes.length;
    m.files.registry.sha256 = sha(bytes);
    const r = doesNotThrow(() => validateRegistry({ registryBytes: bytes, markdownBytes, manifest: m }));
    assert.equal(r.ok, false, text);
    assert.ok(hasFailure(r, 'REGISTRY_SHAPE_INVALID', '/'), text);
  }
  for (const bad of [undefined, null, 'text', {}, 7]) {
    const r = doesNotThrow(() => validateRegistry({ registryBytes: bad, markdownBytes, manifest }));
    assert.equal(r.ok, false);
    assert.ok(hasFailure(r, 'REGISTRY_UNREADABLE'));
    const m = doesNotThrow(() => validateRegistry({ registryBytes, markdownBytes: bad === null ? 'x' : bad, manifest }));
    assert.equal(m.ok, false);
  }
  assert.equal(doesNotThrow(() => validateRegistry()).ok, false);
  assert.equal(doesNotThrow(() => validateRegistry({})).ok, false);
});

check('malformed manifest structures fail closed with MANIFEST_INVALID, never an exception', () => {
  const edits = [
    ['string vocabulary array', (m) => { m.expected.vocabularies.domains = 'weapon'; }],
    ['null vocabulary array', (m) => { m.expected.vocabularies.consumerStatus = null; }],
    ['missing vocabulary array', (m) => { delete m.expected.vocabularies.priceTypes; }],
    ['non-string vocabulary entry', (m) => { m.expected.vocabularies.slotCostTypes = ['fixed', 7]; }],
    ['non-object counts', (m) => { m.expected.counts = []; }],
    ['non-object typedDefinitions count', (m) => { m.expected.counts.typedDefinitions = 'x'; }],
    ['negative count entry', (m) => { m.expected.counts.mechanicalCertification.PENDING_RULES_TEXT = -1; }],
    ['missing eligibleCandidateRule', (m) => { delete m.expected.eligibleCandidateRule; }],
    ['non-array excludedDefinitionIds', (m) => { m.expected.eligibleCandidateRule.excludedDefinitionIds = 'x'; }],
    ['null registrySummaryAgreement', (m) => { m.expected.registrySummaryAgreement = null; }],
    ['non-object files', (m) => { m.files = 'x'; }],
    ['null file entry', (m) => { m.files.registry = null; }],
    ['non-array attestations', (m) => { m.slotCostPageAttestations = {}; }]
  ];
  for (const [label, edit] of edits) {
    const m = clone(manifest);
    edit(m);
    const r = doesNotThrow(() => validateRegistry({ registryBytes, markdownBytes, manifest: m }));
    assert.equal(r.ok, false, label);
    assert.ok(hasFailure(r, 'MANIFEST_INVALID'), `${label}: ${JSON.stringify(r.unexpectedFailures.slice(0, 2))}`);
    assert.ok(!hasFailure(r, 'VALIDATOR_INTERNAL_ERROR'), label);
  }
  for (const bad of [undefined, null, 'x', 7, []]) {
    const r = doesNotThrow(() => validateRegistry({ registryBytes, markdownBytes, manifest: bad }));
    assert.equal(r.ok, false);
  }
});

/* ------------------------------------------------------------------ no repair, no runtime loading, packaging */

check('the validator never writes, repairs or normalizes (static guard)', () => {
  const src = read('tools/validate-modification-registry.mjs').toString('utf8');
  for (const forbidden of [/writeFile/, /appendFile/, /unlink/, /rename\(/, /mkdir/, /copyFile/, /createWriteStream/, /\bnormalize\(/, /Date\.now/, /Math\.random/, /child_process/, /fetch\(/]) {
    assert.ok(!forbidden.test(src), String(forbidden));
  }
  assert.ok(!/^\s*import .* from ['"]\.\.?\//m.test(src), 'imports nothing from the repository');
});

check('no runtime code, template, style, language file or manifest references the research registry (G8 boundary)', () => {
  const needles = ['modification-rolling-authority', 'validate-modification-registry'];
  const roots = ['scripts', 'templates', 'helpers', 'styles', 'lang'];
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(m?js|cjs|hbs|html|css|scss|json)$/.test(entry.name)) files.push(full);
    }
  };
  for (const r of roots) if (fs.existsSync(path.join(ROOT, r))) walk(path.join(ROOT, r));
  for (const f of ['system.json', 'template.json', 'index.js']) if (fs.existsSync(path.join(ROOT, f))) files.push(path.join(ROOT, f));
  const hits = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const n of needles) if (text.includes(n)) hits.push(`${path.relative(ROOT, f)}: ${n}`);
  }
  assert.deepEqual(hits, []);
  assert.equal(manifest.runtimeLoading, 'prohibited');
});

const { PACKAGE_INCLUDE, PACKAGE_EXCLUDE_DIRS } = await import(path.join(ROOT, 'tools/release/pack-sources.mjs'));
check('release packaging does not ship the audit data or docs (tools/release/pack-sources.mjs allowlist)', () => {
  for (const e of PACKAGE_INCLUDE) assert.ok(!e.startsWith('docs'), e);
  assert.ok(PACKAGE_EXCLUDE_DIRS.includes('data/audits'), 'the audit snapshot under data/audits never ships');
  const src = read('scripts/build/package-system.js').toString('utf8');
  assert.ok(src.includes('PACKAGE_INCLUDE') && src.includes('PACKAGE_EXCLUDE_DIRS'), 'the packager uses that allowlist');
  // Modification V2 runtime (R1): the two pinned runtime files ship (data/ is included, only the audit evidence is excluded)
  for (const f of ['data/modifications/runtime-definitions-v1.5.json', 'data/modifications/specification-records-v1.json']) {
    assert.ok(PACKAGE_INCLUDE.includes(f.split('/')[0]) && !PACKAGE_EXCLUDE_DIRS.some((x) => f.startsWith(`${x}/`)), f);
  }
});

check('the two source files are protected from line-ending conversion', () => {
  const attrs = read('.gitattributes').toString('utf8');
  assert.match(attrs, /^data\/audits\/modification-rolling-authority-v1\.5\.json\s+-text\b/m);
  assert.match(attrs, /^docs\/audits\/modification-rolling-authority-v1\.5\.md\s+-text\b/m);
  assert.ok(!markdownBytes.includes(0x0d), 'committed Markdown contains no CR');
});

check('the CLI exits 0 on the real snapshot and prints the tolerated deviations', () => {
  const run = spawnSync(process.execPath, [path.join(ROOT, 'tools/validate-modification-registry.mjs')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /RESULT: VALID/);
  assert.match(run.stdout, /known deviations tolerated \(3\)/);
  assert.match(run.stdout, /7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00/);
  const json = spawnSync(process.execPath, [path.join(ROOT, 'tools/validate-modification-registry.mjs'), '--json'], { encoding: 'utf8' });
  assert.equal(json.status, 0);
  assert.equal(JSON.parse(json.stdout).ok, true);
});

console.log(`modification-registry-validator: ${checks} checks OK`);
