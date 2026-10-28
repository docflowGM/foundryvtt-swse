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
import { deriveRuntime, validateRuntime, canonicalJson, parseRegister, PINNED_SCOPE_SHA256, certifySlotCost, domainBasisFor, selectabilityFacts, unmetSelectableConditions, sha256 } from '../tools/lib/modification-runtime.mjs';
import { produceTrustedSnapshot, isTrustedSnapshot } from '../tools/lib/modification-snapshot-producer.mjs';

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
const registry = base.snapshot.registry;
const derive = (over = {}) => deriveRuntime({ ...base, ledger: clone(base.ledger), specs: clone(base.specs), ...over });
const codes = (r) => r.failures.map((f) => f.code);
const records = committed.records;
const domainsOf = (id) => records.find((r) => r.definitionId === id).domains;
const allDomains = records.flatMap((r) => Object.values(r.domains));

// ---- independent literals (Phase 1b / G1 measurements) -------------------------------------
check('registry binding and counts', () => {
  assert.equal(committed.header.schema, 'swse.modification.runtime/1');
  assert.equal(committed.header.registry.version, '1.5');
  assert.equal(committed.header.registry.sha256, '7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00');
  assert.equal(committed.header.registry.byteLength, 960022);
  assert.equal(committed.header.validator.name, 'tools/validate-modification-registry.mjs');
  assert.equal(committed.header.validator.approvedRegistryVersion, '1.5');
  assert.deepEqual(committed.header.validator.matchedKnownDeviations.map((d) => d.path), ['/definitions/136/sourceFamily', '/definitions/137/sourceFamily', '/definitions/138/sourceFamily']);
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
check('nothing is selectable, implemented, tested or mechanically specified; the 76 page-39 installProcedure components are SOURCE_VERIFIED facts only', () => {
  assert.equal(allDomains.filter((d) => d.runtimeSelectable).length, 0);
  const verifiedFacts = [];
  for (const d of allDomains) for (const [name, c] of Object.entries(d.status.components)) {
    assert.equal(c.MECHANIC_SPECIFIED || c.IMPLEMENTED || c.OFFLINE_TESTED || c.FOUNDRY_TESTED, false, `${d.typedDefinitionId}.${name}`);
    assert.equal(c.DATA_RECONCILED, true);
    if (name === 'installProcedure' && c.SOURCE_VERIFIED) verifiedFacts.push(d.typedDefinitionId);
    assert.equal(d.effects.automation, 'none');
    assert.equal(d.applicability.hostEligibility, 'not_established');
  }
  assert.equal(verifiedFacts.length, 76);
  assert.ok(verifiedFacts.every((id) => id.startsWith('sv-')), 'only Scum and Villainy upgrade options are governed by page 39');
  assert.ok(!verifiedFacts.some((id) => id.startsWith('sv-retractable-stock') || id.startsWith('kotor-')), 'conditional-cost and KOTOR definitions are not verified');
  assert.equal(new Set(verifiedFacts.map((id) => id.split('::')[0])).size, 56);
  for (const id of verifiedFacts) {
    const c = allDomains.find((d) => d.typedDefinitionId === id).status.components.installProcedure;
    assert.deepEqual(c.deferred, ['D-014'], id);
    assert.deepEqual(c.pendingSource, [], `${id}: D-015 source question lifted (source-only); D-014 stays deferred`);
  }
  assert.equal(records.filter((r) => 'runtimeSelectable' in r).length, 0, 'no parent-level flag');
});
check('component certification is independent: a certified cost and a verified procedure do not certify host prerequisites', () => {
  const sv = records.find((r) => r.definitionId.startsWith('sv-') && r.domains.armor && r.domains.armor.accounting.eligible).domains.armor;
  assert.equal(sv.status.components.cost.SOURCE_VERIFIED, true);
  assert.equal(sv.status.components.installProcedure.SOURCE_VERIFIED, true, 'page 39 facts verified for Scum upgrade options');
  assert.equal(sv.status.components.installProcedure.MECHANIC_SPECIFIED, false, 'published facts are not a complete mechanic (D-014, D-015)');
  assert.equal(sv.status.components.hostPrerequisites.SOURCE_VERIFIED, false);
  assert.equal(sv.status.components.executableEffect.IMPLEMENTED, false);
  const kotor = records.find((r) => r.definitionId.startsWith('kotor-accessory-') && r.domains.armor).domains.armor;
  assert.equal(kotor.status.components.cost.SOURCE_VERIFIED, true);
  assert.equal(kotor.status.components.installProcedure.SOURCE_VERIFIED, false, 'not certified by inference');
  assert.deepEqual(kotor.status.components.installProcedure.pendingSource, ['D-013']);
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
  const reg = registry;
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
  specId: 'S-1', typedDefinitionId: 'sv-retractable-stock::weapon', component: 'description', basis: 'PUBLISHED_UNAMBIGUOUS', coverage: 'COMPLETE_MECHANIC',
  publication: { bookId: 'scum-and-villainy', title: 'Scum and Villainy', printedPage: 42, tableOrSection: 'Table 2-4' },
  verification: 'SOURCE_VERIFIED', evidence: 'test fixture', behavior: 'test fixture', authoredBy: 'test', ...o
});
const withSpecs = (...records) => ({ specs: { ...clone(base.specs), records: [...clone(base.specs.records), ...records] } });
const withLedger = (mut) => { const l = clone(base.ledger); mut(l); return { ledger: l }; };

check('a ledger selectable entry alone cannot make a definition selectable', () => {
  const r = derive(withLedger((l) => l.selectable.push({ typedDefinitionId: 'sv-retractable-stock::weapon', approvalRef: 'x', reviewedBy: 'x', evidence: ['x'], hostEvaluation: { evaluator: 'g3-eval', offlineTests: ['t'] } })));
  assert.equal(r.runtime, null);
  assert.ok(codes(r).includes('SELECTABLE_CONDITIONS_UNMET'));
});
check('accounting-eligible alone cannot become selectable', () => {
  const id = allDomains.find((d) => d.accounting.eligible).typedDefinitionId;
  const r = derive(withLedger((l) => l.selectable.push({ typedDefinitionId: id, approvalRef: 'x', reviewedBy: 'x', evidence: ['x'], hostEvaluation: { evaluator: 'g3-eval', offlineTests: ['t'] } })));
  assert.equal(r.runtime, null);
  const unmet = r.failures.find((f) => f.code === 'SELECTABLE_CONDITIONS_UNMET').detail.unmet;
  assert.ok(unmet.includes('1:hostPrerequisites') && unmet.includes('2:hostRequirementsSpecified') && unmet.includes('5:installProcedure.FOUNDRY_TESTED'));
});
const liftedRegister = (...ids) => {
  const reg = new Map(base.register);
  for (const id of ids) reg.set(id, { ...reg.get(id), lift: { source: 'fixture', evidence: 'fixture' }, liftValid: true });
  return reg;
};
const specifiedParents = new Set(base.specs.records.map((x) => x.typedDefinitionId.split('::')[0]));
const scopedParents = new Set([...specifiedParents, 'sv-retractable-stock', 'goi-componentization-basic', 'goi-componentization-deluxe', 'reb-excellent-kit-purchased-quality', 'legacy-biotech-host-template', 'legacy-weapon-template-antiquated', 'legacy-weapon-template-refitted']);
check('selectability is per typed domain: the same complete record passes for one domain and fails for another (unit)', () => {
  const rec = {
    candidate: true,
    effects: { operations: [] },
    applicability: { hostRequirementsSpecified: true, hostEvaluator: 'g3-eval' },
    status: { components: Object.fromEntries(['cost', 'description', 'hostPrerequisites', 'executableEffect', 'installProcedure'].map((c) => [c, { SOURCE_VERIFIED: true, MECHANIC_SPECIFIED: true, IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: true, pendingSource: [], deferred: [] }])) }
  };
  const good = { parentExcluded: false, nonInstalledRole: false, domainBasis: 'table-category', slotCostCertified: true, priceUnknown: false };
  assert.deepEqual(unmetSelectableConditions('p::armor', rec, good), []);
  assert.deepEqual(unmetSelectableConditions('p::weapon', rec, { ...good, domainBasis: null }), ['G3:domainNotSourceCertified'], 'weapon is not certified even though armor is');
});
check('end to end: a fully certified single typed definition can be selected only with the complete chain (synthetic lifted registry)', () => {
  const parent = registry.definitions.find((d) => !scopedParents.has(d.id) && Object.keys(d.typedDefinitions).length >= 1 && (() => { const dom = Object.keys(d.typedDefinitions)[0]; const f = selectabilityFacts(d, d.typedDefinitions[dom], dom); return !f.parentExcluded && !f.nonInstalledRole && f.domainBasis !== null && f.slotCostCertified && !f.priceUnknown; })());
  assert.ok(parent, 'a definition that passes every canonical fact exists');
  const dom = Object.keys(parent.typedDefinitions)[0];
  const idA = parent.typedDefinitions[dom].definitionId;
  const r = derive({
    register: liftedRegister('D-013', 'D-005'),
    ...withSpecs(...['description', 'hostPrerequisites', 'installProcedure', 'executableEffect'].map((component, i) => spec({ specId: `S-${i}`, typedDefinitionId: idA, component }))),
    ...withLedger((l) => {
      l.blockers = l.blockers.filter((b) => b.register !== 'D-013' && b.register !== 'D-005');
      for (const component of ['executableEffect', 'installProcedure']) l.implementation.push({ typedDefinitionId: idA, component, flags: { IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: component === 'installProcedure' }, commit: 'deadbeef', tests: ['t'], ...(component === 'installProcedure' ? { foundryEvidence: { route: 'isolated', runId: 'r1' } } : {}) });
      l.selectable.push({ typedDefinitionId: idA, approvalRef: 'x', reviewedBy: 'x', evidence: ['x'], hostEvaluation: { evaluator: 'g3-eval', offlineTests: ['t'] } });
    })
  });
  assert.deepEqual(codes(r), [], JSON.stringify(r.failures));
  const rec = r.runtime.records.find((x) => x.definitionId === parent.id);
  assert.equal(rec.domains[dom].runtimeSelectable, true);
  assert.equal('runtimeSelectable' in rec, false);
  assert.equal(r.runtime.header.counts.runtimeSelectable, 1);
  assert.equal(rec.domains[dom].applicability.hostEligibility, 'not_established', 'specified host requirements never establish individual eligibility');
  assert.equal(rec.domains[dom].applicability.hostRequirementsSpecified, true);
  for (const other of Object.keys(rec.domains)) if (other !== dom) assert.equal(rec.domains[other].runtimeSelectable, false);
});
check('REGRESSION: removing the D-013 blocker from the ledger while D-013 is open cannot authorize implementation or selectability', () => {
  const parent = registry.definitions.find((d) => !scopedParents.has(d.id) && d.sourceFamily !== 'universal_upgrade' && certifySlotCost(d, Object.values(d.typedDefinitions)[0] ?? {}).certified);
  const idA = Object.values(parent.typedDefinitions)[0].definitionId;
  const r = derive({
    ...withSpecs(...['cost', 'description', 'hostPrerequisites', 'installProcedure', 'executableEffect'].map((component, i) => spec({ specId: `S-${i}`, typedDefinitionId: idA, component }))),
    ...withLedger((l) => {
      l.blockers = l.blockers.filter((b) => b.register !== 'D-013');
      for (const component of ['executableEffect', 'installProcedure']) l.implementation.push({ typedDefinitionId: idA, component, flags: { IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: component === 'installProcedure' }, commit: 'deadbeef', tests: ['t'], ...(component === 'installProcedure' ? { foundryEvidence: { route: 'isolated', runId: 'r1' } } : {}) });
      l.selectable.push({ typedDefinitionId: idA, approvalRef: 'x', reviewedBy: 'x', evidence: ['x'], hostEvaluation: { evaluator: 'g3-eval', offlineTests: ['t'] } });
    })
  });
  assert.equal(r.runtime, null, 'nothing is generated');
  assert.ok(codes(r).includes('BLOCKER_REMOVED_WHILE_REGISTER_OPEN'), codes(r).join());
});
check('REGRESSION: every scoped open register entry must keep its full ledger scope', () => {
  for (const [id, drop] of [['D-013', null], ['D-014', null], ['D-004', null], ['D-005', null], ['D-006', null], ['D-010', null], ['D-011', null]]) {
    const whole = derive(withLedger((l) => { l.blockers = l.blockers.filter((b) => b.register !== id); }));
    assert.ok(codes(whole).includes('BLOCKER_REMOVED_WHILE_REGISTER_OPEN'), `${id} whole removal`);
    void drop;
  }
  // partial removal: drop one typed id from each explicit list
  for (const id of ['D-004', 'D-005', 'D-006', 'D-010', 'D-011', 'D-014']) {
    const r = derive(withLedger((l) => { const b = l.blockers.find((x) => x.register === id); b.typedDefinitionIds = b.typedDefinitionIds.slice(1); if (!b.typedDefinitionIds.length) l.blockers = l.blockers.filter((x) => x !== b); }));
    assert.ok(codes(r).includes('BLOCKER_REMOVED_WHILE_REGISTER_OPEN'), `${id} partial removal`);
  }
  // downgrading the classification or moving the blocker to another component does not substitute
  assert.ok(codes(derive(withLedger((l) => { l.blockers.find((b) => b.register === 'D-013').component = 'cost'; }))).length > 0);
});
check('ledger blockers must stay inside the register scope and be bound to a scoped entry', () => {
  assert.ok(codes(derive(withLedger((l) => { l.blockers.push({ register: 'D-004', classification: 'PENDING_SOURCE_VERIFICATION', component: 'cost', typedDefinitionIds: ['sv-cheater::equipment'] }); }))).includes('BLOCKER_OUTSIDE_REGISTER_SCOPE'));
  assert.ok(codes(derive(withLedger((l) => { l.blockers.push({ register: 'D-002', classification: 'PENDING_SOURCE_VERIFICATION', component: 'cost', typedDefinitionIds: ['sv-cheater::equipment'] }); }))).includes('BLOCKER_WITHOUT_REGISTER_SCOPE'));
});
check('a blocker is lifted only by a valid register lift row; the ledger must then drop it', () => {
  const text = readText('docs/audits/swse-rules-decisions-pending.md');
  const lift = (id, row) => text.replace(new RegExp(`(## ${id} — [\\s\\S]*?\\| Ledger scope \\|[^\\n]*\\n)`), `$1${row}\n`);
  const bad = parseRegister(lift('D-013', '| Blocker lifted | source=x |'));
  assert.equal(bad.get('D-013').liftValid, false, 'pending lift needs evidence as well as source');
  const good = parseRegister(lift('D-013', '| Blocker lifted | source=x; evidence=fixture |'));
  assert.equal(good.get('D-013').liftValid, true);
  const ownerless = parseRegister(lift('D-006', '| Blocker lifted | source=x; evidence=y |'));
  assert.equal(ownerless.get('D-006').liftValid, false, 'a deferred entry needs an owner ruling');
  assert.equal(parseRegister(lift('D-006', '| Blocker lifted | owner-ruling=fixture |')).get('D-006').liftValid, true);
  assert.ok(codes(derive({ register: bad })).includes('REGISTER_LIFT_INVALID'));
  assert.ok(codes(derive({ register: good })).includes('BLOCKER_FOR_LIFTED_REGISTER_ENTRY'), 'ledger still blocking a lifted entry');
  assert.deepEqual(codes(derive({ register: good, ...withLedger((l) => { l.blockers = l.blockers.filter((b) => b.register !== 'D-013'); }) })), []);
});
check('a hostPrerequisites specification states requirements only; it never establishes individual host eligibility', () => {
  const id = 'sv-retractable-stock::weapon';
  const r = derive(withSpecs(spec({ typedDefinitionId: id, component: 'description' })));
  assert.equal(r.runtime.records.find((x) => x.definitionId === 'sv-retractable-stock').domains.weapon.applicability.hostEligibility, 'not_established');
  const parent = registry.definitions.find((d) => !scopedParents.has(d.id) && d.sourceFamily !== 'universal_upgrade' && Object.keys(d.typedDefinitions).length);
  const tid = Object.values(parent.typedDefinitions)[0].definitionId;
  const dom = Object.keys(parent.typedDefinitions)[0];
  const r2 = derive({ register: liftedRegister('D-013'), ...withSpecs(spec({ typedDefinitionId: tid, component: 'hostPrerequisites' })), ...withLedger((l) => { l.blockers = l.blockers.filter((b) => b.register !== 'D-013'); }) });
  assert.deepEqual(codes(r2), []);
  const a = r2.runtime.records.find((x) => x.definitionId === parent.id).domains[dom].applicability;
  assert.equal(a.hostRequirementsSpecified, true);
  assert.equal(a.hostEligibility, 'not_established');
  assert.equal(a.hostEvaluator, null);
});
check('V10\' rejects a record that claims established host eligibility', () => {
  const rt = clone(committed);
  Object.values(rt.records[0].domains)[0].applicability.hostEligibility = 'established';
  rt.header.recordsSha256 = sha256(canonicalJson(rt.records));
  assert.ok(codes(validateRuntime({ ...base, runtime: rt })).includes('HOST_ELIGIBILITY_ESTABLISHED_FORBIDDEN'));
});
check('selectable ledger entries require a named host evaluator and offline tests', () => {
  const r = derive(withLedger((l) => { l.selectable.push({ typedDefinitionId: 'sv-retractable-stock::weapon', approvalRef: 'x', reviewedBy: 'x', evidence: ['x'] }); }));
  assert.ok(codes(r).includes('SELECTABLE_HOST_EVALUATION_MISSING'));
});
check('trusted snapshot boundary: only the producer can mint a handle', () => {
  assert.equal(isTrustedSnapshot(base.snapshot), true);
  assert.equal(Object.isFrozen(base.snapshot) && Object.isFrozen(base.snapshot.registry) && Object.isFrozen(base.snapshot.registry.definitions[0]), true);
  const forged = { kind: base.snapshot.kind, registry: clone(registry), identity: clone(base.snapshot.identity), validator: clone(base.snapshot.validator) };
  for (const bad of [forged, clone(base.snapshot), { ...base.snapshot }, structuredClone(base.snapshot), Object.create(base.snapshot), null, undefined, 'x', { ok: true, validated: true }]) {
    assert.equal(isTrustedSnapshot(bad), false);
    const r = derive({ snapshot: bad });
    assert.equal(r.runtime, null);
    assert.deepEqual(codes(r), ['UNTRUSTED_SNAPSHOT']);
    assert.deepEqual(codes(validateRuntime({ ...base, snapshot: bad, runtime: committed })), ['UNTRUSTED_SNAPSHOT']);
  }
  assert.throws(() => { base.snapshot.identity.sha256 = '0'; }, TypeError, 'handle is immutable');
});
check('trusted snapshot producer binds data to the exact validated bytes', () => {
  const manifest = JSON.parse(readText('data/audits/modification-rolling-authority-v1.5.manifest.json'));
  const regBytes = fs.readFileSync(path.join(ROOT, REGISTRY_PATH));
  const mdBytes = fs.readFileSync(path.join(ROOT, 'docs/audits/modification-rolling-authority-v1.5.md'));
  const ok = produceTrustedSnapshot({ registryBytes: regBytes, markdownBytes: mdBytes, manifest });
  assert.equal(ok.ok, true);
  assert.equal(ok.handle.identity.sha256, '7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00');
  assert.equal(ok.handle.identity.byteLength, 960022);
  assert.notEqual(ok.handle, base.snapshot, 'each production mints a distinct handle');
  // one changed byte, a lying manifest, or a missing markdown all fail closed; no handle is produced
  assert.equal(produceTrustedSnapshot({ registryBytes: Buffer.concat([regBytes, Buffer.from(' ')]), markdownBytes: mdBytes, manifest }).ok, false);
  const lying = clone(manifest); lying.files.registry.sha256 = '0'.repeat(64);
  assert.equal(produceTrustedSnapshot({ registryBytes: regBytes, markdownBytes: mdBytes, manifest: lying }).ok, false);
  assert.equal(produceTrustedSnapshot({ registryBytes: regBytes, markdownBytes: null, manifest }).ok, false);
  assert.equal(produceTrustedSnapshot({}).ok, false);
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
  t((rt) => { const d = Object.values(rt.records.find((r) => Object.values(r.domains).some((x) => x.status.components.installProcedure.pendingSource.length)).domains).find((x) => x.status.components.installProcedure.pendingSource.length); d.status.components.installProcedure.MECHANIC_SPECIFIED = true; }, 'FLAG_WITH_OPEN_BLOCKER');
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
check('register parsing: D-001..D-018 classified; D-006, D-014, D-016 and D-018 deferred; only D-001 and D-015 lifted; one D-013 partial lift', () => {
  const reg = parseRegister(readText('docs/audits/swse-rules-decisions-pending.md'));
  assert.equal(reg.size, 18);
  const deferred = new Set(['D-006', 'D-014', 'D-016', 'D-018']);
  for (const [id, t] of reg) assert.deepEqual(t.classifications, [deferred.has(id) ? 'DEFERRED_RULES_REVIEW' : 'PENDING_SOURCE_VERIFICATION'], id);
  for (const [id, t] of reg) {
    if (id === 'D-001') { assert.equal(t.liftValid, true); assert.ok(t.lift.source.includes('page 39') && t.lift.evidence.includes('d-001-install-remove-pdf-verification.md')); }
    else if (id === 'D-015') {
      assert.equal(t.liftValid, true);
      assert.ok(t.lift.source.includes('Core Rulebook printed pages 60 and 68-70') && t.lift.source.includes('Scum and Villainy printed pages 37-41'));
      assert.ok(t.lift.evidence.includes('d-015-mechanics-complete-visual-source-reconciliation.md') && t.lift.evidence.includes('d-015-source-certification-release-acceptance-checklist.md'));
    }
    else { assert.equal(t.lift, null, `${id} has no whole lift row`); assert.equal(t.liftValid, false); }
    assert.equal(t.scopeInvalid, false);
    assert.equal(t.partialLifts.length, id === 'D-013' ? 1 : 0, id);
  }
  assert.deepEqual([...reg].filter(([, t]) => t.scope).map(([id]) => id), ['D-001', 'D-004', 'D-005', 'D-006', 'D-010', 'D-011', 'D-013', 'D-014', 'D-015']);
  assert.deepEqual({ ...reg.get('D-013').scope }, { component: 'installProcedure', kind: 'all' }, 'D-013 has no exception list');
  const pl = reg.get('D-013').partialLifts[0];
  assert.equal(pl.definitions.split(',').length, 56);
  assert.ok(pl.source.includes('printed page 39') && pl.evidence.includes('d-001-install-remove-pdf-verification.md'));
});
check('D-001 is lifted: a ledger that still blocks it is rejected, and the 156 non-governed definitions stay blocked by D-013', () => {
  assert.ok(codes(derive(withLedger((l) => { l.blockers.push({ register: 'D-001', classification: 'PENDING_SOURCE_VERIFICATION', component: 'installProcedure', appliesToAllTypedDefinitions: true }); }))).includes('BLOCKER_FOR_LIFTED_REGISTER_ENTRY'));
  const d13 = allDomains.filter((d) => d.status.components.installProcedure.pendingSource.includes('D-013'));
  assert.equal(d13.length, 156);
  assert.equal(d13.length + allDomains.filter((d) => d.status.components.installProcedure.SOURCE_VERIFIED).length, 232);
});
check('page-39 specification records: exact provenance and governance', () => {
  const recs = base.specs.records;
  assert.equal(recs.length, 76);
  for (const r of recs) {
    assert.equal(r.component, 'installProcedure'); assert.equal(r.basis, 'PUBLISHED_UNAMBIGUOUS'); assert.equal(r.verification, 'SOURCE_VERIFIED'); assert.equal(r.coverage, 'PUBLISHED_FACTS');
    assert.deepEqual(r.publication, { bookId: 'scum-and-villainy', title: 'Scum and Villainy', printedPage: 39, tableOrSection: 'Table 2-2: Upgrade Installation; Installing Upgrades text' });
    assert.ok(r.evidence.includes('fa4c7131829212cec52bb8fd887402aafbdb4b0a9cb6cdfaa246db0d79ca9fc1'));
    assert.ok(r.behavior.includes('register D-014'));
  }
  const parents = new Set(recs.map((r) => r.typedDefinitionId.split('::')[0]));
  for (const p of parents) {
    const def = registry.definitions.find((d) => d.id === p);
    assert.equal(def.source.bookId, 'scum-and-villainy'); assert.equal(def.sourceRole, 'upgrade_option');
    assert.ok(['2-3', '2-4', '2-5'].includes(def.source.tableId));
    assert.equal(def.originalSlotCost.type, 'fixed');
  }
  assert.ok(!parents.has('sv-retractable-stock') && !parents.has('sv-droidification'));
});
check('only the Modification V2 install service (runtime loader) references the generated data', () => {
  const hits = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = `${d}/${e.name}`; if (e.isDirectory()) walk(rel); else if (/\.(js|mjs|hbs)$/.test(e.name) && /modifications\/(runtime-definitions|status-ledger|specification-records)|build-modification-runtime|modification-runtime\.mjs/.test(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) hits.push(rel); } };
  walk('scripts');
  // Modification V2 convergence (owner directive 2026-10-28): the install service is the one runtime loader; it verifies the records
  // against header.recordsSha256 and the catalog checks before use and never writes the generated data
  // plus its reviewed SHA-256 pins and the packager's exact allowlist of the two shipped files (R1/R2)
  // the release packager ships data/ as a whole (tools/release/pack-sources.mjs; the registry-validator test checks these files ship)
  assert.deepEqual(hits.sort(), ['scripts/engine/customization/modification-v2-runtime/modification-data-pins.js', 'scripts/engine/customization/modification-v2-runtime/modification-install-service.js'], 'only the Modification V2 install service and its pins reference the generated data');
});


// ---- canonical non-installability guard (G2 final review) ----------------------------------------
const allLifted = () => liftedRegister('D-013', 'D-014', 'D-015', 'D-004', 'D-005', 'D-006', 'D-010', 'D-011');
/** Otherwise-complete promotion: every component specified, implemented, tested, evaluator named, every blocker lifted. */
function completePromotion(typedId, { skipCostSpec = false } = {}) {
  const already = new Set(base.specs.records.filter((x) => x.typedDefinitionId === typedId && x.coverage === 'COMPLETE_MECHANIC').map((x) => x.component));
  const comps = ['cost', 'description', 'hostPrerequisites', 'installProcedure', 'executableEffect'].filter((c) => !(skipCostSpec && c === 'cost') && !already.has(c));
  return {
    register: allLifted(),
    ...withSpecs(...comps.map((component, i) => spec({ specId: `P-${i}`, typedDefinitionId: typedId, component }))),
    ...withLedger((l) => {
      l.blockers = [];
      for (const component of ['executableEffect', 'installProcedure']) l.implementation.push({ typedDefinitionId: typedId, component, flags: { IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: component === 'installProcedure' }, commit: 'deadbeef', tests: ['t'], ...(component === 'installProcedure' ? { foundryEvidence: { route: 'isolated', runId: 'r1' } } : {}) });
      l.selectable.push({ typedDefinitionId: typedId, approvalRef: 'x', reviewedBy: 'x', evidence: ['x'], hostEvaluation: { evaluator: 'g3-eval', offlineTests: ['t'] } });
    })
  };
}
const unmetFor = (r) => r.failures.find((x) => x.code === 'SELECTABLE_CONDITIONS_UNMET')?.detail.unmet ?? [];
check('predicate: canonical facts are computed from the registry, not from a runtime record', () => {
  const def = registry.definitions.find((d) => d.id === 'sv-retractable-stock');
  const f = selectabilityFacts(def, def.typedDefinitions.weapon, 'weapon');
  assert.equal(f.slotCostCertified, false);
  const talent = registry.definitions.find((d) => d.id === 'web-outlaw-tech-personalized-modifications');
  assert.equal(selectabilityFacts(talent, talent.typedDefinitions.weapon, 'weapon').nonInstalledRole, true);
  assert.deepEqual(unmetSelectableConditions('x', { candidate: true, status: { components: {} }, applicability: {}, effects: { operations: [] } }), ['G0:canonical-facts-missing']);
});
check('PROMOTION GUARD: an otherwise-complete ledger and specification set cannot select the non-installable temporary talent actuator', () => {
  const r = derive(completePromotion('web-outlaw-tech-personalized-modifications::weapon', { skipCostSpec: true }));
  assert.equal(r.runtime, null);
  const unmet = unmetFor(r);
  assert.ok(unmet.includes('G2:notInstallableCandidate'), unmet.join());
});
check('PROMOTION GUARD: a domain-uncertified definition (Table 2-3 universal, CONDITIONAL_UNVERIFIED) cannot be selected by specifications', () => {
  const r = derive(completePromotion('sv-cheater::equipment', { skipCostSpec: true }));
  assert.equal(r.runtime, null);
  assert.ok(unmetFor(r).includes('G3:domainNotSourceCertified'), unmetFor(r).join());
});
check('PROMOTION GUARD: a uncertified or conditional slot cost cannot be bypassed through a cost specification', () => {
  // The cost specification itself is rejected...
  const withCostSpec = derive(completePromotion('sv-retractable-stock::weapon'));
  assert.equal(withCostSpec.runtime, null);
  assert.ok(codes(withCostSpec).includes('SPEC_CANNOT_OVERRIDE_COST_CERTIFICATION'), codes(withCostSpec).join());
  // ...and without it, the predicate still refuses.
  const noCostSpec = derive(completePromotion('sv-retractable-stock::weapon', { skipCostSpec: true }));
  assert.equal(noCostSpec.runtime, null);
  assert.ok(unmetFor(noCostSpec).includes('G4:slotCostNotCertified') && unmetFor(noCostSpec).includes('1:cost'), unmetFor(noCostSpec).join());
  // a special-pool (lightsaber) definition is refused the same way
  const lightsaber = allDomains.find((d) => d.slotPool === 'lightsaber-primary-crystal').typedDefinitionId;
  const ls = derive(completePromotion(lightsaber, { skipCostSpec: true }));
  assert.equal(ls.runtime, null);
  assert.ok(unmetFor(ls).includes('G4:slotCostNotCertified'));
});
check('PROMOTION GUARD: an unknown price never authorizes selection, even with D-006 lifted by an owner-ruling fixture', () => {
  for (const id of ['goi-componentization-basic', 'goi-componentization-deluxe', 'reb-excellent-kit-purchased-quality']) {
    const typedId = Object.values(registry.definitions.find((d) => d.id === id).typedDefinitions)[0].definitionId;
    const r = derive(completePromotion(typedId, { skipCostSpec: true }));
    assert.equal(r.runtime, null, id);
    assert.ok(unmetFor(r).includes('G5:priceUnknown'), `${id}: ${unmetFor(r).join()}`);
  }
});
check('PROMOTION GUARD: accounting eligibility with a stated price and certified domain is still not selectable without the install chain', () => {
  const typedId = allDomains.find((d) => d.accounting.eligible && d.candidate).typedDefinitionId;
  const parentId = typedId.split('::')[0];
  const price = records.find((x) => x.definitionId === parentId).price.kind;
  assert.notEqual(price, 'unknown');
  const r = derive(withLedger((l) => { l.selectable.push({ typedDefinitionId: typedId, approvalRef: 'x', reviewedBy: 'x', evidence: ['x'], hostEvaluation: { evaluator: 'e', offlineTests: ['t'] } }); }));
  assert.equal(r.runtime, null);
  const u = unmetFor(r);
  assert.ok(!u.some((x) => x.startsWith('G')), `canonical facts pass for an accounting-eligible definition: ${u.join()}`);
  assert.ok(u.includes('1:hostPrerequisites') && u.includes('2:hostRequirementsSpecified'));
});
check('V10\' rejects a runtime that marks an excluded / uncertified / unknown-price definition selectable', () => {
  const pick = (pred) => { for (const r of committed.records) for (const d of Object.values(r.domains)) if (pred(r, d)) return d; };
  const cases = [
    [(r) => r.definitionId === 'web-outlaw-tech-personalized-modifications', 'G2:notInstallableCandidate'],
    [(r, d) => r.definitionId === 'sv-cheater' && d.domain === 'equipment', 'G3:domainNotSourceCertified'],
    [(r) => r.definitionId === 'sv-retractable-stock', 'G4:slotCostNotCertified'],
    [(r) => r.definitionId === 'goi-componentization-basic', 'G5:priceUnknown']
  ];
  for (const [pred, expected] of cases) {
    const rt = clone(committed);
    const target = pick.call(null, (r, d) => pred(r, d));
    const rec = rt.records.find((r) => Object.values(r.domains).some((d) => d.typedDefinitionId === target.typedDefinitionId));
    const dom = rec.domains[target.domain];
    dom.runtimeSelectable = true;
    // even if every status flag were forged to look complete, the registry-derived facts still refuse it
    for (const c of Object.values(dom.status.components)) Object.assign(c, { SOURCE_VERIFIED: true, MECHANIC_SPECIFIED: true, IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: true, pendingSource: [], deferred: [] });
    dom.applicability.hostRequirementsSpecified = true;
    dom.applicability.hostEvaluator = 'forged';
    rt.header.recordsSha256 = sha256(canonicalJson(rt.records));
    const v = validateRuntime({ ...base, runtime: rt });
    const unmet = v.failures.filter((x) => x.code === 'SELECTABLE_CONDITIONS_UNMET').flatMap((x) => x.detail);
    assert.ok(unmet.includes(expected), `${expected}: ${unmet.join()}`);
  }
});
check('baseline preserved after the guard: counts unchanged, nothing selectable', () => {
  assert.deepEqual(committed.header.counts, { records: 186, typedDefinitions: 232, eligibleCandidates: 231, accountingEligiblePairs: 49, certifiedSlotCosts: 84, runtimeSelectable: 0 });
});


// ---- PR #1043 review corrections ----------------------------------------------------------------
const REGISTER_TEXT = readText('docs/audits/swse-rules-decisions-pending.md');
/** Parses the real register after inserting extra rows directly after an entry's Ledger scope row. */
const registerWith = (id, ...rows) => parseRegister(REGISTER_TEXT.replace(new RegExp(`(## ${id} — [\\s\\S]*?\\| Ledger scope \\|[^\\n]*\\n)`), `$1${rows.join('\n')}\n`));
const governedIds = base.specs.records.map((x) => x.typedDefinitionId);
const governedPick = governedIds.find((id) => { const d = allDomains.find((x) => x.typedDefinitionId === id); return d.accounting.eligible && d.candidate && records.find((r) => r.definitionId === id.split('::')[0]).price.kind === 'credits'; });
const kotorParents = [...new Set(allDomains.filter((d) => d.typedDefinitionId.startsWith('kotor-accessory-')).map((d) => d.typedDefinitionId.split('::')[0]))];
const typedOf = (parents) => allDomains.filter((d) => parents.includes(d.typedDefinitionId.split('::')[0])).map((d) => d.typedDefinitionId);
const withoutTyped = (ids) => withLedger((l) => { for (const b of l.blockers) if (b.register === 'D-013') b.typedDefinitionIds = b.typedDefinitionIds.filter((t) => !ids.includes(t)); });

check('CORRECTION 1: published facts are certified but the procedure is not complete while D-014 is open (D-015 source question lifted)', () => {
  assert.ok(governedPick, 'a governed, accounting-eligible, priced definition exists');
  const c = allDomains.find((d) => d.typedDefinitionId === governedPick).status.components.installProcedure;
  assert.deepEqual({ SOURCE_VERIFIED: c.SOURCE_VERIFIED, MECHANIC_SPECIFIED: c.MECHANIC_SPECIFIED, deferred: c.deferred, pendingSource: c.pendingSource }, { SOURCE_VERIFIED: true, MECHANIC_SPECIFIED: false, deferred: ['D-014'], pendingSource: [] });
});
check('CORRECTION 1: a complete-mechanic record, implementation evidence and a selectable entry are all refused while D-014/D-015 are open', () => {
  const complete = spec({ specId: 'C-1', typedDefinitionId: governedPick, component: 'installProcedure' });
  assert.ok(codes(derive(withSpecs(complete))).includes('SPEC_WHILE_BLOCKER_OPEN'));
  const impl = (flags) => withLedger((l) => { l.implementation.push({ typedDefinitionId: governedPick, component: 'installProcedure', flags, commit: 'c', tests: ['t'], foundryEvidence: { route: 'isolated', runId: 'r' } }); });
  // facts record alone is not a basis for implementation
  assert.ok(codes(derive(impl({ IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: true }))).includes('IMPL_WITHOUT_SPECIFICATION'));
  // even with a complete record present, the open blockers still refuse the evidence
  const both = derive({ ...withSpecs(complete), ...impl({ IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: true }) });
  assert.equal(both.runtime, null);
  assert.ok(codes(both).includes('IMPL_WHILE_BLOCKER_OPEN') && codes(both).includes('SPEC_WHILE_BLOCKER_OPEN'), codes(both).join());
  // otherwise-complete everything else + a selectable entry: the unmet list names the install procedure
  const sel = derive(withLedger((l) => { l.selectable.push({ typedDefinitionId: governedPick, approvalRef: 'x', reviewedBy: 'x', evidence: ['x'], hostEvaluation: { evaluator: 'e', offlineTests: ['t'] } }); }));
  const unmet = sel.failures.find((x) => x.code === 'SELECTABLE_CONDITIONS_UNMET').detail.unmet;
  assert.ok(unmet.includes('1:installProcedure') && unmet.includes('3:installProcedure'), unmet.join());
});
check('D-015 (source-only lift): a ledger blocker cannot be reintroduced, and a lift row missing source= or evidence= is invalid', () => {
  const reintroduced = derive(withLedger((l) => { l.blockers.push({ register: 'D-015', classification: 'PENDING_SOURCE_VERIFICATION', component: 'installProcedure', typedDefinitionIds: governedIds }); }));
  assert.equal(reintroduced.runtime, null, 'nothing is generated');
  assert.ok(codes(reintroduced).includes('BLOCKER_FOR_LIFTED_REGISTER_ENTRY'), codes(reintroduced).join());
  const withLiftRow = (row) => parseRegister(REGISTER_TEXT.replace(/^\| Blocker lifted \| source=Core Rulebook printed pages 60[^\n]*$/m, `| Blocker lifted | ${row} |`));
  assert.equal(withLiftRow('source=Core Rulebook printed pages 60 and 68-70; evidence=docs/audits/d-015-mechanics-complete-visual-source-reconciliation.md').get('D-015').liftValid, true, 'control: source + evidence is valid');
  assert.equal(withLiftRow('source=Core Rulebook printed pages 60 and 68-70').get('D-015').liftValid, false, 'source without evidence');
  assert.equal(withLiftRow('evidence=docs/audits/d-015-mechanics-complete-visual-source-reconciliation.md').get('D-015').liftValid, false, 'evidence without source');
  assert.equal(parseRegister(REGISTER_TEXT.replace(/^\| Blocker lifted \| source=Core Rulebook printed pages 60[^\n]*\n/m, '')).get('D-015').liftValid, false, 'no lift row');
});
check('CORRECTION 1: D-014 cannot be dropped from the ledger or lifted without its required evidence', () => {
  const r = derive(withLedger((l) => { l.blockers = l.blockers.filter((b) => b.register !== 'D-014'); }));
  assert.ok(codes(r).includes('BLOCKER_REMOVED_WHILE_REGISTER_OPEN'), 'D-014');
  const liftRow = (row) => registerWith('D-014', `| Blocker lifted | ${row} |`);
  assert.equal(liftRow('source=x; evidence=docs/audits/d-001-install-remove-pdf-verification.md').get('D-014').liftValid, false, 'a deferred entry needs an owner ruling, not just a source');
  assert.equal(liftRow('owner-ruling=fixture').get('D-014').liftValid, true);
});
check('CORRECTION 1: with D-014 (owner ruling) and D-015 (source) lifted, a complete-mechanic record is accepted and promotion works end to end (synthetic)', () => {
  const reg = new Map(base.register);
  reg.set('D-014', { ...reg.get('D-014'), lift: { 'owner-ruling': 'fixture' }, liftValid: true });
  reg.set('D-015', { ...reg.get('D-015'), lift: { source: 'f', evidence: 'f' }, liftValid: true });
  const r = derive({
    register: reg,
    ...withSpecs(spec({ specId: 'C-2', typedDefinitionId: governedPick, component: 'installProcedure' }), spec({ specId: 'C-3', typedDefinitionId: governedPick, component: 'hostPrerequisites' })),
    ...withLedger((l) => {
      l.blockers = l.blockers.filter((b) => b.register !== 'D-014' && b.register !== 'D-015');
      l.implementation.push({ typedDefinitionId: governedPick, component: 'installProcedure', flags: { IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: true }, commit: 'c', tests: ['t'], foundryEvidence: { route: 'isolated', runId: 'r' } });
    })
  });
  assert.deepEqual(codes(r), [], JSON.stringify(r.failures));
  const c = r.runtime.records.find((x) => x.definitionId === governedPick.split('::')[0]).domains[governedPick.split('::')[1]].status.components.installProcedure;
  assert.deepEqual({ S: c.SOURCE_VERIFIED, M: c.MECHANIC_SPECIFIED, I: c.IMPLEMENTED, F: c.FOUNDRY_TESTED, deferred: c.deferred, pending: c.pendingSource }, { S: true, M: true, I: true, F: true, deferred: [], pending: [] });
});
check('CORRECTION 1: spec coverage validation', () => {
  const bad = (o) => codes(derive(withSpecs(spec({ specId: 'V-1', typedDefinitionId: governedPick, component: 'description', ...o }))));
  assert.ok(bad({ coverage: undefined }).includes('SPEC_COVERAGE_INVALID'));
  assert.ok(bad({ coverage: 'PARTIAL' }).includes('SPEC_COVERAGE_INVALID'));
  assert.ok(bad({ coverage: 'PUBLISHED_FACTS', basis: 'OWNER_RULING', ownerRulingRef: 'x' }).includes('SPEC_FACTS_BASIS_INVALID'));
  // facts records never set MECHANIC_SPECIFIED
  const ok = derive(withSpecs(spec({ specId: 'V-2', typedDefinitionId: 'sv-retractable-stock::weapon', component: 'description', coverage: 'PUBLISHED_FACTS' })));
  const c = ok.runtime.records.find((x) => x.definitionId === 'sv-retractable-stock').domains.weapon.status.components.description;
  assert.equal(c.SOURCE_VERIFIED, true); assert.equal(c.MECHANIC_SPECIFIED, false);
  // a facts record may coexist with a complete one for the same component, but not twice with the same coverage
  assert.ok(codes(derive(withSpecs(spec({ specId: 'V-3', typedDefinitionId: 'sv-retractable-stock::weapon', component: 'description', coverage: 'PUBLISHED_FACTS' }), spec({ specId: 'V-4', typedDefinitionId: 'sv-retractable-stock::weapon', component: 'description', coverage: 'PUBLISHED_FACTS' })))).includes('SPEC_DUPLICATE_COMPONENT'));
});

check('CORRECTION 2: a valid, evidence-backed partial lift releases exactly the named family and nothing else', () => {
  assert.equal(kotorParents.length, 8);
  const row = `| Partial lift | definitions=${kotorParents.join(',')}; source=KOTOR pp. 75-76 (fixture); evidence=docs/audits/d-001-install-remove-pdf-verification.md |`;
  const reg = registerWith('D-013', row);
  assert.equal(reg.get('D-013').partialLifts.length, 2);
  const released = typedOf(kotorParents);
  assert.equal(released.length, 8);
  // the register row alone, with the ledger unchanged, is refused: the ledger must drop the released definitions
  assert.ok(codes(derive({ register: reg })).includes('BLOCKER_OUTSIDE_REGISTER_SCOPE'));
  // the register row plus the exact ledger change is accepted; the other 148 stay blocked
  const r = derive({ register: reg, ...withoutTyped(released) });
  assert.deepEqual(codes(r), [], JSON.stringify(r.failures));
  const stillBlocked = r.runtime.records.flatMap((x) => Object.values(x.domains)).filter((d) => d.status.components.installProcedure.pendingSource.includes('D-013'));
  assert.equal(stillBlocked.length, 148);
  for (const id of released) assert.ok(!stillBlocked.some((d) => d.typedDefinitionId === id));
  // releasing a blocker certifies nothing
  for (const d of r.runtime.records.flatMap((x) => Object.values(x.domains)).filter((x) => released.includes(x.typedDefinitionId))) {
    assert.equal(d.status.components.installProcedure.SOURCE_VERIFIED, false);
    assert.equal(d.runtimeSelectable, false);
  }
});
check('CORRECTION 2: a ledger change without a lift row, or a lift row plus extra ledger removals, is refused', () => {
  const released = typedOf(kotorParents);
  assert.ok(codes(derive(withoutTyped(released))).includes('BLOCKER_REMOVED_WHILE_REGISTER_OPEN'), 'ledger edit alone');
  const reg = registerWith('D-013', `| Partial lift | definitions=${kotorParents.join(',')}; source=s; evidence=docs/audits/d-001-install-remove-pdf-verification.md |`);
  const extra = allDomains.find((d) => d.status.components.installProcedure.pendingSource.includes('D-013') && !released.includes(d.typedDefinitionId)).typedDefinitionId;
  assert.ok(codes(derive({ register: reg, ...withoutTyped([...released, extra]) })).includes('BLOCKER_REMOVED_WHILE_REGISTER_OPEN'), 'unrelated blocker removed');
  assert.ok(codes(derive({ register: reg, ...withoutTyped(released.slice(1)) })).includes('BLOCKER_OUTSIDE_REGISTER_SCOPE'), 'released definition still blocked');
});
check('CORRECTION 2: invalid partial lifts release nothing and are themselves failures', () => {
  const released = typedOf(kotorParents);
  const p = kotorParents.join(',');
  const cases = [
    [`definitions=${p}; source=s`, 'missing evidence'],
    [`definitions=${p}; evidence=docs/audits/d-001-install-remove-pdf-verification.md`, 'missing source'],
    [`source=s; evidence=docs/audits/d-001-install-remove-pdf-verification.md`, 'no definitions'],
    [`definitions=nope-definition; source=s; evidence=e`, 'unknown definition'],
    [`definitions=sv-cheater; source=s; evidence=e`, 'already released by the first row'],
    [`definitions=${kotorParents[0]},${kotorParents[0]}; source=s; evidence=e`, 'duplicate within one row']
  ];
  for (const [row, why] of cases) {
    const reg = registerWith('D-013', `| Partial lift | ${row} |`);
    const r = derive({ register: reg, ...withoutTyped(released) });
    assert.ok(codes(r).includes('REGISTER_PARTIAL_LIFT_INVALID'), why);
    assert.ok(codes(r).includes('BLOCKER_REMOVED_WHILE_REGISTER_OPEN'), `${why}: an invalid row must not release anything`);
  }
  // two rows naming the same parent: the second is invalid
  const two = registerWith('D-013', `| Partial lift | definitions=${kotorParents[0]}; source=s; evidence=e |`, `| Partial lift | definitions=${kotorParents[0]}; source=s; evidence=e |`);
  assert.ok(codes(derive({ register: two })).includes('REGISTER_PARTIAL_LIFT_INVALID'));
  // a deferred entry needs an owner ruling for a partial lift too
  const d14 = registerWith('D-014', `| Partial lift | definitions=${governedIds[0].split('::')[0]}; source=s; evidence=e |`);
  assert.ok(codes(derive({ register: d14 })).includes('REGISTER_PARTIAL_LIFT_INVALID'));
  const d14ok = registerWith('D-014', `| Partial lift | definitions=${governedIds[0].split('::')[0]}; owner-ruling=fixture |`);
  const dropped = typedOf([governedIds[0].split('::')[0]]);
  const r14 = derive({ register: d14ok, ...withLedger((l) => { const b = l.blockers.find((x) => x.register === 'D-014'); b.typedDefinitionIds = b.typedDefinitionIds.filter((t) => !dropped.includes(t)); }) });
  assert.deepEqual(codes(r14), [], JSON.stringify(r14.failures));
});
check('CORRECTION 2: scope rows are pinned: an edited exception list, a corrupted, removed or new scope row releases nothing', () => {
  const edit = (id, replacement) => parseRegister(REGISTER_TEXT.replace(new RegExp(`(## ${id} — [\\s\\S]*?\\| Ledger scope \\| )[^\\n]*( \\|\\n)`), `$1${replacement}$2`));
  assert.ok(codes(derive({ register: edit('D-013', 'component=installProcedure; definitions=ALL; except=sv-cheater') })).includes('REGISTER_SCOPE_UNPARSEABLE'));
  assert.ok(codes(derive({ register: edit('D-013', 'component=installProcedure; definitions=sv-cheater') })).includes('REGISTER_SCOPE_PINNED_MISMATCH'));
  assert.ok(codes(derive({ register: edit('D-004', 'component=cost; definitions=sv-cheater') })).includes('REGISTER_SCOPE_PINNED_MISMATCH'));
  assert.ok(codes(derive({ register: edit('D-005', 'component=hostPrerequisites; definitions=sv-cheater') })).includes('REGISTER_SCOPE_PINNED_MISMATCH'));
  assert.ok(codes(derive({ register: edit('D-004', 'garbage') })).includes('REGISTER_SCOPE_UNPARSEABLE'));
  const removed = parseRegister(REGISTER_TEXT.replace(/^\| Ledger scope \| component=cost; definitions=sv-retractable-stock \|\n/m, ''));
  assert.ok(codes(derive({ register: removed })).includes('REGISTER_SCOPE_MISSING'));
  const added = parseRegister(REGISTER_TEXT.replace(/(## D-002 — [^\n]*\n[\s\S]*?\| Status \|[^\n]*\n)/, '$1| Ledger scope | component=cost; definitions=sv-cheater |\n'));
  assert.ok(codes(derive({ register: added })).includes('REGISTER_SCOPE_NOT_PINNED'));
  assert.deepEqual(Object.keys(PINNED_SCOPE_SHA256), ['D-001', 'D-004', 'D-005', 'D-006', 'D-010', 'D-011', 'D-013', 'D-014', 'D-015']);
});
check('CORRECTION 2: every lift and partial-lift row must cite an existing repository file (CLI)', () => {
  const readWith = (text) => (rel) => (rel === 'docs/audits/swse-rules-decisions-pending.md' ? Buffer.from(text) : fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel)) : null);
  const withRow = (row) => REGISTER_TEXT.replace(/(## D-013 — [\s\S]*?\| Ledger scope \|[^\n]*\n)/, `$1${row}\n`);
  assert.equal(loadInputs(readWith(REGISTER_TEXT)).ok, true);
  const missingFile = loadInputs(readWith(withRow(`| Partial lift | definitions=${kotorParents[0]}; source=s; evidence=docs/audits/does-not-exist.md |`)));
  assert.equal(missingFile.ok, false); assert.match(missingFile.error, /LIFT_EVIDENCE_FILE_MISSING/);
  const noPath = loadInputs(readWith(withRow(`| Partial lift | definitions=${kotorParents[0]}; source=s; evidence=trust me |`)));
  assert.equal(noPath.ok, false); assert.match(noPath.error, /LIFT_EVIDENCE_FILE_MISSING/);
  assert.equal(loadInputs(readWith(withRow(`| Partial lift | definitions=${kotorParents[0]}; source=s; evidence=docs/audits/d-001-install-remove-pdf-verification.md |`))).ok, true);
});
check('baseline preserved after the review corrections', () => {
  assert.deepEqual(committed.header.counts, { records: 186, typedDefinitions: 232, eligibleCandidates: 231, accountingEligiblePairs: 49, certifiedSlotCosts: 84, runtimeSelectable: 0 });
});

console.log(`modification-runtime-generator: ${checks} checks OK`);
