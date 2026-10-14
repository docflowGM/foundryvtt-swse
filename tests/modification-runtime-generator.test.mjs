/**
 * Tests for the G2 canonical V2 runtime generator (tools/lib/modification-runtime.mjs,
 * tools/build-modification-runtime.mjs) and the committed generated file.
 *
 * Expected values are independent literals. Mutation tests build variants of the inputs and
 * assert that the generator / V10' validator fail closed.
 *
 * Run: node tests/modification-runtime-generator.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REGISTRY_PATH } from '../tools/validate-modification-registry.mjs';
import { loadInputs, RUNTIME_PATH, LEDGER_PATH, SPECS_PATH } from '../tools/build-modification-runtime.mjs';
import { deriveRuntime, validateRuntime, canonicalJson, parseRegister, certifySlotCost, domainBasisFor, sha256 } from '../tools/lib/modification-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));
let checks = 0;
function check(name, fn) {
  try { fn(); checks += 1; } catch (err) { console.error(`FAIL: ${name}`); throw err; }
}

const loaded = loadInputs();
assert.equal(loaded.ok, true, loaded.error);
const base = loaded.inputs;
const committed = JSON.parse(readText(RUNTIME_PATH));
const derive = (over = {}) => deriveRuntime({ ...clone(base), register: base.register, ...over });
const codes = (r) => r.failures.map((f) => f.code);
const records = committed.records;
const domainsOf = (id) => records.find((r) => r.definitionId === id).domains;
const allDomains = records.flatMap((r) => Object.values(r.domains));

// ---- independent literals (Phase 1b / G1 measurements) -------------------------------------
check('registry binding and counts', () => {
  assert.equal(committed.header.schema, 'swse.modification.runtime/1');
  assert.equal(committed.header.registry.version, '1.5');
  assert.equal(committed.header.registry.sha256, '7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00');
  assert.deepEqual(committed.header.counts, { records: 186, typedDefinitions: 232, eligibleCandidates: 231, accountingEligiblePairs: 49, certifiedSlotCosts: 84, runtimeSelectable: 0 });
  // 84 certified slot costs = 49 accounting-eligible + 35 Table 2-3 universal pairs whose domain applicability is CONDITIONAL_UNVERIFIED (cost certified, domain blocked).
  assert.equal(84 - 35, 49);
});
check('accounting-eligible pairs: 41 Scum (14 weapon, 27 armor) + 8 KOTOR (6 weapon, 2 armor)', () => {
  const elig = allDomains.filter((d) => d.accounting.eligible);
  assert.equal(elig.length, 49);
  const byDomain = (pred) => elig.filter((d) => pred(d)).reduce((a, d) => ({ ...a, [d.domain]: (a[d.domain] ?? 0) + 1 }), {});
  const scum = byDomain((d) => d.typedDefinitionId.startsWith('sv-'));
  const kotor = byDomain((d) => !d.typedDefinitionId.startsWith('sv-'));
  assert.deepEqual(scum, { weapon: 14, armor: 27 });
  assert.deepEqual(kotor, { weapon: 6, armor: 2 });
  assert.equal(elig.filter((d) => d.applicability.domainBasis === 'table-category').length, 41);
  assert.equal(elig.filter((d) => d.applicability.domainBasis === 'rules-certified').length, 8);
});
check('nothing is selectable, specified, implemented or tested', () => {
  assert.equal(allDomains.filter((d) => d.runtimeSelectable).length, 0);
  for (const d of allDomains) for (const c of Object.values(d.status.components)) {
    assert.equal(c.MECHANIC_SPECIFIED || c.IMPLEMENTED || c.OFFLINE_TESTED || c.FOUNDRY_TESTED, false);
    assert.equal(c.DATA_RECONCILED, true);
    assert.equal(d.effects.automation, 'none');
    assert.equal(d.applicability.hostEligibility, 'not_established');
  }
  assert.equal(records.filter((r) => 'runtimeSelectable' in r).length, 0, 'no parent-level flag');
});
check('component certification is independent: a certified cost does not certify installation', () => {
  const d = records.find((r) => r.domains.armor && r.domains.armor.accounting.eligible).domains.armor;
  assert.equal(d.status.components.cost.SOURCE_VERIFIED, true);
  assert.equal(d.status.components.installProcedure.SOURCE_VERIFIED, false);
  assert.equal(d.status.components.hostPrerequisites.SOURCE_VERIFIED, false);
  assert.deepEqual(d.status.components.installProcedure.pendingSource, ['D-001']);
});
check('typed ids are parent id + :: + domain, distinct from the parent definitionId', () => {
  for (const r of records) for (const [domain, d] of Object.entries(r.domains)) {
    assert.equal(d.typedDefinitionId, `${r.definitionId}::${domain}`);
    assert.notEqual(d.typedDefinitionId, r.definitionId);
  }
});
check('Droidification is present, excluded and has no typed definitions', () => {
  const r = records.find((x) => x.definitionId === 'sv-droidification');
  assert.equal(r.excluded, true);
  assert.deepEqual(r.domains, {});
});
check('the excluded talent actuator is a typed definition but not a candidate', () => {
  const d = domainsOf('web-outlaw-tech-personalized-modifications').weapon;
  assert.equal(d.candidate, false);
  assert.equal(d.accounting.eligible, false);
  assert.equal(allDomains.filter((x) => !x.candidate).length, 1);
});
check('unstated prices are unknown, never numeric', () => {
  for (const id of ['goi-componentization-basic', 'goi-componentization-deluxe', 'reb-excellent-kit-purchased-quality']) {
    const r = records.find((x) => x.definitionId === id);
    assert.equal(r.price.kind, 'unknown');
    assert.equal(r.price.registry.type, 'not_stated');
    for (const d of Object.values(r.domains)) assert.deepEqual(d.status.components.cost.deferred, ['D-006']);
  }
});
check('Retractable Stock never certifies; D-004 pending', () => {
  for (const d of Object.values(records.find((r) => r.definitionId === 'sv-retractable-stock').domains)) {
    assert.equal(d.slotCost.certification.certified, false);
    assert.deepEqual(d.status.components.cost.pendingSource, ['D-004']);
  }
});
check('lightsaber pools never certify as general slot costs', () => {
  const l = allDomains.filter((d) => d.slotPool && d.slotPool.startsWith('lightsaber-'));
  assert.equal(l.length, 44);
  for (const d of l) { assert.equal(d.slotCost.certification.certified, false); assert.equal(d.accounting.eligible, false); }
});
check('Table 2-3 universal rows (35 pairs) stay blocked', () => {
  const pending = allDomains.filter((d) => d.status.components.hostPrerequisites.pendingSource.includes('D-005'));
  assert.equal(pending.length, 35);
  for (const d of pending) assert.equal(d.accounting.eligible, false);
});
check('three page-verified fixed costs are uncertified (no attestation exists)', () => {
  for (const id of ['gaw-ion-shielding-cybernetic-prosthesis', 'goi-componentization-basic', 'goi-componentization-deluxe']) {
    for (const d of Object.values(domainsOf(id))) assert.ok(d.slotCost.certification.reasons.includes('PAGE_ATTESTATION_MISSING'), id);
  }
});
check('registry-sourced fields are verbatim', () => {
  const reg = base.registry;
  committed.records.forEach((r, i) => {
    assert.deepEqual(r.provenance.source, reg.definitions[i].source);
    assert.deepEqual(r.price.registry, reg.definitions[i].originalCost);
    assert.deepEqual(r.slotCost.registry, reg.definitions[i].originalSlotCost);
    assert.equal(r.registry.pointer, `/definitions/${i}`);
  });
});

// ---- determinism and --check ----------------------------------------------------------------
check('committed file equals deterministic regeneration (byte for byte)', () => {
  assert.equal(readText(RUNTIME_PATH), canonicalJson(derive().runtime));
  assert.equal(derive().runtime.header.recordsSha256, sha256(canonicalJson(records)));
});
check('regeneration twice is identical', () => {
  assert.equal(canonicalJson(derive().runtime), canonicalJson(derive().runtime));
});
check('V10\' accepts the committed file', () => {
  const r = validateRuntime({ ...base, runtime: committed });
  assert.deepEqual(r.failures, []);
});
check('CLI --check and --validate pass', () => {
  for (const flag of ['--check', '--validate']) {
    const r = spawnSync('node', ['tools/build-modification-runtime.mjs', flag], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  }
});

// ---- predicate unit tests -----------------------------------------------------------------
check('slot-cost predicate', () => {
  const def = (o = {}) => ({ currentStatus: 'x', sourceRole: 'upgrade_option', originalSlotCost: { type: 'fixed', slots: 1 }, tableCertification: 'TABLE_VERIFIED', ...o });
  const typed = { slotPoolId: 'general-upgrades' };
  assert.equal(certifySlotCost(def(), typed).certified, true);
  assert.equal(certifySlotCost(def({ originalSlotCost: { type: 'fixed', slots: 0 } }), typed).certified, true, 'explicit zero is certified');
  assert.equal(certifySlotCost(def({ originalSlotCost: { type: 'conditional' } }), typed).certified, false);
  assert.equal(certifySlotCost(def({ originalSlotCost: { type: 'fixed', slots: 1.5 } }), typed).certified, false);
  assert.equal(certifySlotCost(def({ originalSlotCost: { type: 'fixed', slots: -1 } }), typed).certified, false);
  assert.equal(certifySlotCost(def({ tableCertification: 'SOURCE_ENTRY_VERIFIED' }), typed).certified, false);
  assert.equal(certifySlotCost(def({ tableCertification: 'NOT_TABLE_BASED_PAGE_VERIFIED' }), typed).certified, false);
  assert.equal(certifySlotCost(def(), { slotPoolId: 'lightsaber-accessory' }).certified, false);
  assert.equal(certifySlotCost(def({ currentStatus: 'EXCLUDED_SCOPE' }), typed).certified, false);
  assert.equal(certifySlotCost(def({ sourceRole: 'temporary_talent_actuator_not_installed_upgrade' }), typed).certified, false);
});
check('domain basis', () => {
  assert.equal(domainBasisFor('RULES_CERTIFIED', 'equipment'), 'rules-certified');
  assert.equal(domainBasisFor('TABLE_CATEGORY', 'weapon'), 'table-category');
  assert.equal(domainBasisFor('TABLE_CATEGORY', 'equipment'), null);
  for (const v of ['CONDITIONAL_UNVERIFIED', 'NOT_CANDIDATE_PENDING_SOURCE_REVIEW', 'RULES_CERTIFIED_LIGHTSABER_ONLY', 'OUT_OF_SCOPE', 'APPLICABILITY_PENDING_HOST_RULE_REVIEW']) assert.equal(domainBasisFor(v, 'weapon'), null);
});

// ---- non-promotion / fail-closed (ledger, specs, runtime tampering) ---------------------------
const spec = (o = {}) => ({
  specId: 'S-1', typedDefinitionId: 'sv-retractable-stock::weapon', component: 'description', basis: 'PUBLISHED_UNAMBIGUOUS',
  publication: { bookId: 'scum-and-villainy', title: 'Scum and Villainy', printedPage: 42, tableOrSection: 'Table 2-4' },
  verification: 'SOURCE_VERIFIED', evidence: 'test fixture', behavior: 'test fixture', authoredBy: 'test', ...o
});
const withSpecs = (...records) => ({ specs: { ...clone(base.specs), records } });
const withLedger = (mut) => { const l = clone(base.ledger); mut(l); return { ledger: l }; };

check('a ledger selectable entry alone cannot make a definition selectable', () => {
  const r = derive(withLedger((l) => l.selectable.push({ typedDefinitionId: 'sv-retractable-stock::weapon', approvalRef: 'x', reviewedBy: 'x', evidence: ['x'] })));
  assert.equal(r.runtime, null);
  assert.ok(codes(r).includes('SELECTABLE_CONDITIONS_UNMET'));
});
check('accounting-eligible alone cannot become selectable', () => {
  const id = allDomains.find((d) => d.accounting.eligible).typedDefinitionId;
  const r = derive(withLedger((l) => l.selectable.push({ typedDefinitionId: id, approvalRef: 'x', reviewedBy: 'x', evidence: ['x'] })));
  assert.equal(r.runtime, null);
  const unmet = r.failures.find((f) => f.code === 'SELECTABLE_CONDITIONS_UNMET').detail.unmet;
  assert.ok(unmet.includes('1:installProcedure') && unmet.includes('2:hostEligibility') && unmet.includes('5:installProcedure.FOUNDRY_TESTED'));
});
check('selectability is domain-specific: certifying one domain leaves the sibling non-selectable', () => {
  // Fully satisfy every 3.4 condition for ONE typed definition using synthetic inputs, then check the sibling domain.
  const parent = base.registry.definitions.find((d) => Object.keys(d.typedDefinitions).length >= 2 && certifySlotCost(d, Object.values(d.typedDefinitions)[0]).certified);
  assert.ok(parent, 'a multi-domain definition with a certified cost exists');
  const [dA, dB] = Object.keys(parent.typedDefinitions);
  const idA = parent.typedDefinitions[dA].definitionId;
  const idB = parent.typedDefinitions[dB].definitionId;
  const r = derive({
    ...withSpecs(...['cost', 'description', 'hostPrerequisites', 'installProcedure', 'executableEffect'].map((component, i) => spec({ specId: `S-${i}`, typedDefinitionId: idA, component }))),
    ...withLedger((l) => {
      // Clear the install-procedure blocker for idA only by replacing the "all" D-001 blocker with an explicit list of every other id.
      const all = base.registry.definitions.flatMap((d) => Object.values(d.typedDefinitions).map((t) => t.definitionId)).filter((i) => i !== idA);
      l.blockers = l.blockers.filter((b) => b.register !== 'D-001').concat([{ register: 'D-001', classification: 'PENDING_SOURCE_VERIFICATION', component: 'installProcedure', typedDefinitionIds: all }]);
      l.blockers = l.blockers.map((b) => (b.typedDefinitionIds ? { ...b, typedDefinitionIds: b.typedDefinitionIds.filter((i) => i !== idA) } : b)).filter((b) => b.appliesToAllTypedDefinitions || b.typedDefinitionIds.length);
      for (const component of ['executableEffect', 'installProcedure']) l.implementation.push({ typedDefinitionId: idA, component, flags: { IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: component === 'installProcedure' }, commit: 'deadbeef', tests: ['t'], ...(component === 'installProcedure' ? { foundryEvidence: { route: 'isolated', runId: 'r1' } } : {}) });
      l.selectable.push({ typedDefinitionId: idA, approvalRef: 'x', reviewedBy: 'x', evidence: ['x'] });
    })
  });
  assert.deepEqual(codes(r), [], JSON.stringify(r.failures));
  const rec = r.runtime.records.find((x) => x.definitionId === parent.id);
  assert.equal(rec.domains[dA].runtimeSelectable, true);
  assert.equal(rec.domains[dB].runtimeSelectable, false, 'sibling domain must not be authorized');
  assert.equal('runtimeSelectable' in rec, false);
  assert.equal(r.runtime.header.counts.runtimeSelectable, 1);
  assert.ok(idB !== idA);
});
check('unknown register id in a blocker is rejected', () => {
  assert.ok(codes(derive(withLedger((l) => l.blockers.push({ register: 'D-999', classification: 'PENDING_SOURCE_VERIFICATION', component: 'cost', typedDefinitionIds: ['sv-retractable-stock::weapon'] })))).includes('BLOCKER_REGISTER_ID_UNKNOWN'));
});
check('blocker classification must match the register', () => {
  assert.ok(codes(derive(withLedger((l) => l.blockers.push({ register: 'D-006', classification: 'PENDING_SOURCE_VERIFICATION', component: 'cost', appliesToAllTypedDefinitions: true })))).includes('BLOCKER_CLASSIFICATION_MISMATCH'));
});
check('unknown typed id / component in a blocker is rejected', () => {
  assert.ok(codes(derive(withLedger((l) => l.blockers.push({ register: 'D-001', classification: 'PENDING_SOURCE_VERIFICATION', component: 'cost', typedDefinitionIds: ['nope::weapon'] })))).includes('BLOCKER_TYPED_ID_UNKNOWN'));
  assert.ok(codes(derive(withLedger((l) => l.blockers.push({ register: 'D-001', classification: 'PENDING_SOURCE_VERIFICATION', component: 'bogus', appliesToAllTypedDefinitions: true })))).includes('BLOCKER_COMPONENT_INVALID'));
});
check('specification record requires publication identity, page, evidence and verification', () => {
  const bad = (o) => codes(derive(withSpecs(spec(o))));
  assert.ok(bad({ publication: { bookId: 'x', title: 'x', printedPage: 'ii', tableOrSection: 'x' } }).includes('SPEC_PUBLICATION_INCOMPLETE'));
  assert.ok(bad({ evidence: '' }).includes('SPEC_FIELD_MISSING'));
  assert.ok(bad({ verification: 'PENDING' }).includes('SPEC_VERIFICATION_INVALID'));
  assert.ok(bad({ basis: 'OWNER_RULING' }).includes('SPEC_OWNER_RULING_REF_MISSING'));
  assert.ok(bad({ basis: 'GUESS' }).includes('SPEC_BASIS_INVALID'));
});
check('a specification cannot exist while a blocker is open for that component', () => {
  assert.ok(codes(derive(withSpecs(spec({ component: 'installProcedure' })))).includes('SPEC_WHILE_BLOCKER_OPEN'));
});
check('a specification for an unblocked component verifies and specifies only that component', () => {
  const r = derive(withSpecs(spec({ component: 'description' })));
  assert.deepEqual(codes(r), []);
  const c = r.runtime.records.find((x) => x.definitionId === 'sv-retractable-stock').domains.weapon.status.components;
  assert.equal(c.description.MECHANIC_SPECIFIED, true);
  assert.equal(c.installProcedure.MECHANIC_SPECIFIED, false);
  assert.equal(r.runtime.records.find((x) => x.definitionId === 'sv-retractable-stock').domains.weapon.runtimeSelectable, false);
});
check('implementation flags require a specification, ordering and evidence', () => {
  const impl = (flags, extra = {}) => derive(withLedger((l) => l.implementation.push({ typedDefinitionId: 'sv-retractable-stock::weapon', component: 'description', flags, commit: 'c', tests: ['t'], ...extra })));
  assert.ok(codes(impl({ IMPLEMENTED: true, OFFLINE_TESTED: false, FOUNDRY_TESTED: false })).includes('IMPL_WITHOUT_SPECIFICATION'));
  assert.ok(codes(impl({ IMPLEMENTED: false, OFFLINE_TESTED: true, FOUNDRY_TESTED: false })).includes('IMPL_FLAG_ORDER'));
  assert.ok(codes(impl({ IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: true })).includes('IMPL_FOUNDRY_EVIDENCE_MISSING'));
});
check('ledger/spec schema or registry-version mismatch fails closed', () => {
  assert.ok(codes(derive({ ledger: { ...clone(base.ledger), schema: 'x' } })).includes('LEDGER_SCHEMA_INVALID'));
  assert.ok(codes(derive({ specs: { ...clone(base.specs), registryVersion: '9' } })).includes('SPECS_REGISTRY_VERSION_MISMATCH'));
  assert.ok(codes(derive({ ledger: null })).includes('LEDGER_SCHEMA_INVALID'));
});
check('V10\' rejects tampered generated data', () => {
  const t = (mut, code) => { const rt = clone(committed); mut(rt); rt.header.recordsSha256 = sha256(canonicalJson(rt.records)); const r = validateRuntime({ ...base, runtime: rt }); assert.ok(codes(r).includes(code), `${code}: ${codes(r)}`); };
  t((rt) => { rt.records[0].price.registry = { type: 'credits', amount: 1 }; }, 'VERBATIM_PRICE_MISMATCH');
  t((rt) => { rt.records[0].runtimeSelectable = true; }, 'PARENT_LEVEL_SELECTABLE_FORBIDDEN');
  t((rt) => { const d = Object.values(rt.records[0].domains)[0]; d.runtimeSelectable = true; }, 'SELECTABLE_CONDITIONS_UNMET');
  t((rt) => { const d = Object.values(rt.records[0].domains)[0]; d.status.components.cost.IMPLEMENTED = true; }, 'FLAG_ORDER');
  t((rt) => { const d = Object.values(rt.records[0].domains)[0]; d.status.components.installProcedure.MECHANIC_SPECIFIED = true; }, 'FLAG_WITH_OPEN_BLOCKER');
  t((rt) => { const d = Object.values(rt.records[0].domains)[0]; d.effects.automation = 'full'; }, 'AUTOMATION_NOT_NONE');
  t((rt) => { const d = Object.values(rt.records[0].domains)[0]; d.status.components.cost.pendingSource.push('D-999'); }, 'REGISTER_ID_UNKNOWN');
  t((rt) => { const d = Object.values(rt.records[0].domains)[0]; d.accounting.eligible = true; }, 'REGENERATION_MISMATCH');
  t((rt) => { rt.records.pop(); }, 'RECORD_COUNT_MISMATCH');
  t((rt) => { rt.header.registry.sha256 = '0'.repeat(64); }, 'REGISTRY_BINDING_MISMATCH');
  const rt = clone(committed); rt.records[1].name = 'x';
  assert.ok(codes(validateRuntime({ ...base, runtime: rt })).includes('RECORDS_HASH_MISMATCH'));
});
check('generator refuses an untrusted registry (G1 validation must pass)', () => {
  const read = (rel) => { const b = fs.readFileSync(path.join(ROOT, rel)); return rel === REGISTRY_PATH ? Buffer.concat([b, Buffer.from(' ')]) : b; };
  const r = loadInputs(read);
  assert.equal(r.ok, false);
  assert.match(r.error, /G1_VALIDATION_FAILED/);
});
check('generator input is read-only: no source file other than the runtime output is written', () => {
  const before = ['data/audits/modification-rolling-authority-v1.5.json', 'data/audits/modification-rolling-authority-v1.5.manifest.json', LEDGER_PATH, SPECS_PATH, 'docs/audits/swse-rules-decisions-pending.md'].map((p) => sha256(fs.readFileSync(path.join(ROOT, p))));
  spawnSync('node', ['tools/build-modification-runtime.mjs', '--check'], { cwd: ROOT });
  const after = ['data/audits/modification-rolling-authority-v1.5.json', 'data/audits/modification-rolling-authority-v1.5.manifest.json', LEDGER_PATH, SPECS_PATH, 'docs/audits/swse-rules-decisions-pending.md'].map((p) => sha256(fs.readFileSync(path.join(ROOT, p))));
  assert.deepEqual(after, before);
});
check('register parsing: D-001..D-012 classified, only D-006 deferred', () => {
  const reg = parseRegister(readText('docs/audits/swse-rules-decisions-pending.md'));
  assert.equal(reg.size, 12);
  for (const [id, t] of reg) assert.deepEqual(t, [id === 'D-006' ? 'DEFERRED_RULES_REVIEW' : 'PENDING_SOURCE_VERIFICATION'], id);
});
check('no runtime (scripts/) file references the generated data or generator yet', () => {
  const hits = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = `${d}/${e.name}`; if (e.isDirectory()) walk(rel); else if (/\.(js|mjs|hbs)$/.test(e.name) && /modifications\/(runtime-definitions|status-ledger|specification-records)|build-modification-runtime|modification-runtime\.mjs/.test(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) hits.push(rel); } };
  walk('scripts');
  assert.deepEqual(hits, [], 'G8 loader is not authorized');
});

console.log(`modification-runtime-generator: ${checks} checks OK`);
