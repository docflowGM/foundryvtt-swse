/**
 * G3 offline tests: ModificationCatalog, price resolution, slot-cost closure, legality framework and planner.
 * All data is passed in; nothing loads the generated file at runtime. Expected values are independent literals.
 *
 * Run: node tests/modification-v2-offline.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createModificationCatalog, checkRuntimeDocument } from '../scripts/engine/customization/modification-v2/modification-catalog.js';
import { resolvePrice } from '../scripts/engine/customization/modification-v2/modification-price.js';
import { createCertifiedDefinitionLookup } from '../scripts/engine/customization/modification-v2/modification-slot-closure.js';
import { createLegalityFramework } from '../scripts/engine/customization/modification-v2/modification-legality.js';
import { planModification, slotView } from '../scripts/engine/customization/modification-v2/modification-planner.js';
import * as slotAuthority from '../scripts/engine/customization/modification-slot-authority.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clone = (v) => JSON.parse(JSON.stringify(v));
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
let checks = 0;
function check(name, fn) { try { fn(); checks += 1; } catch (err) { console.error(`FAIL: ${name}`); throw err; } }

const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/modifications/runtime-definitions-v1.5.json'), 'utf8'));
const made = createModificationCatalog(doc);
assert.equal(made.ok, true, JSON.stringify(made.problems));
const catalog = made.catalog;

// Fixtures ---------------------------------------------------------------------------------------
const EV = 'test-evidence';
const armorItem = (instances = [], over = {}) => deepFreeze({ id: 'a1', type: 'armor', name: 'Test Armor', system: { armorType: 'medium', isPoweredArmor: false, upgradeSlots: 2, installedUpgrades: [] }, flags: { 'foundryvtt-swse': { customization: { installedUpgrades: instances } } }, ...over });
const armorCtx = { trustedClassification: { evidenceRef: EV, powered: false, armorStockClass: 'medium' } };
const eligibleArmor = catalog.listTyped({ domain: 'armor', accountingEligible: true });
const costOf = (id) => createCertifiedDefinitionLookup(catalog)(id).certifiedCost;

/** A synthetic catalog document in which ONE armor definition looks fully certified. The catalog does not verify provenance
 *  (that is G8), so this is a legitimate offline fixture; it is never written anywhere. */
function syntheticDoc(typedId, patch = (t, p) => {}) {
  const d = clone(doc);
  for (const r of d.records) for (const t of Object.values(r.domains)) if (t.typedDefinitionId === typedId) {
    t.runtimeSelectable = true;
    for (const c of Object.values(t.status.components)) Object.assign(c, { SOURCE_VERIFIED: true, MECHANIC_SPECIFIED: true, IMPLEMENTED: true, OFFLINE_TESTED: true, FOUNDRY_TESTED: true, pendingSource: [], deferred: [] });
    t.applicability.hostRequirementsSpecified = true;
    t.applicability.hostEvaluator = 'armor-host-evaluator';
    patch(t, r);
  }
  return d;
}
const legalEvaluator = { 'armor-host-evaluator': () => ({ verdict: 'legal', evidence: ['fixture evidence'] }) };

// Catalog ----------------------------------------------------------------------------------------
check('catalog: counts, immutability, lookups', () => {
  assert.deepEqual({ ...catalog.counts }, { records: 186, typedDefinitions: 232 });
  assert.equal(catalog.listTyped().length, 232);
  assert.equal(catalog.listTyped({ accountingEligible: true }).length, 49);
  assert.equal(catalog.listTyped({ runtimeSelectable: true }).length, 0);
  assert.equal(catalog.listTyped({ domain: 'weapon' }).length + catalog.listTyped({ domain: 'armor' }).length + catalog.listTyped({ domain: 'equipment' }).length, 232);
  assert.deepEqual(catalog.listTyped(), [...catalog.listTyped()].sort());
  assert.equal(catalog.getDefinition('sv-retractable-stock').definitionId, 'sv-retractable-stock');
  assert.equal(catalog.getTyped('sv-retractable-stock::weapon').domain, 'weapon');
  assert.equal(catalog.getTyped('sv-retractable-stock'), null, 'a parent id is not a typed id');
  assert.equal(catalog.getTyped('nope::weapon'), null);
  assert.equal(catalog.provenance.integrity, 'not-verified-by-catalog');
  assert.throws(() => { catalog.getTyped('sv-retractable-stock::weapon').typed.runtimeSelectable = true; }, TypeError);
  assert.throws(() => { catalog.counts.records = 1; }, TypeError);
});
check('catalog: the caller\'s document is copied, never mutated or aliased', () => {
  const d = clone(doc);
  const before = JSON.stringify(d);
  const c = createModificationCatalog(d).catalog;
  d.records[0].definitionId = 'tampered';
  assert.notEqual(c.getDefinition('tampered')?.definitionId, 'tampered');
  assert.notEqual(JSON.stringify(d), before);
});
check('catalog fails closed on inconsistent documents', () => {
  const bad = (mutate, code) => { const d = clone(doc); mutate(d); const r = createModificationCatalog(d); assert.equal(r.ok, false); assert.ok(r.problems.some((p) => p.startsWith(code)), `${code}: ${r.problems}`); };
  bad((d) => { d.header.schema = 'x'; }, 'SCHEMA_MISMATCH');
  bad((d) => { d.records[0].runtimeSelectable = true; }, 'PARENT_LEVEL_SELECTABLE');
  bad((d) => { const t = Object.values(d.records[0].domains)[0]; t.typedDefinitionId = 'x::weapon'; }, 'TYPED_ID_INVALID');
  bad((d) => { d.records[1].definitionId = d.records[0].definitionId; }, 'DEFINITION_ID_DUPLICATE');
  bad((d) => { Object.values(d.records[0].domains)[0].runtimeSelectable = 'yes'; }, 'SELECTABLE_NOT_BOOLEAN');
  bad((d) => { Object.values(d.records[0].domains)[0].applicability.hostEligibility = 'established'; }, 'HOST_ELIGIBILITY_ESTABLISHED');
  for (const v of [null, undefined, 'x', [], {}, { header: {}, records: 'no' }]) assert.equal(createModificationCatalog(v).ok, false);
  assert.deepEqual(checkRuntimeDocument(doc), []);
});

// Price ------------------------------------------------------------------------------------------
check('price: only stated credits are computable; unknown is never zero', () => {
  assert.deepEqual({ ...resolvePrice(catalog.getDefinition('sv-cheater')) }, { kind: 'credits', amount: 500, computable: true, registry: { type: 'credits', amount: 500 } });
  for (const id of ['goi-componentization-basic', 'goi-componentization-deluxe', 'reb-excellent-kit-purchased-quality']) {
    const p = resolvePrice(catalog.getDefinition(id));
    assert.equal(p.kind, 'unknown'); assert.equal(p.amount, null); assert.equal(p.computable, false);
  }
  const nonCredit = catalog.listTyped().map((id) => resolvePrice(catalog.getTyped(id).parent)).filter((p) => p.kind !== 'credits');
  assert.ok(nonCredit.length > 100);
  for (const p of nonCredit) { assert.equal(p.amount, null); assert.equal(p.computable, false); }
  assert.equal(resolvePrice(null).kind, 'unknown');
  assert.equal(resolvePrice({ price: { kind: 'credits', registry: { type: 'credits', amount: -5 } } }).computable, false);
  assert.equal(resolvePrice({ price: { kind: 'credits', registry: { type: 'credits', amount: 'x' } } }).computable, false);
});

// Slot closure and Phase 1a -------------------------------------------------------------------
check('closure answers exactly for the 49 accounting-eligible typed definitions', () => {
  const lookup = createCertifiedDefinitionLookup(catalog);
  const answered = catalog.listTyped().filter((id) => lookup(id) !== null);
  assert.equal(answered.length, 49);
  assert.deepEqual(answered, catalog.listTyped({ accountingEligible: true }));
  for (const id of answered) {
    const r = lookup(id);
    assert.equal(r.definitionId, id); assert.equal(r.upgradeKey, id);
    assert.ok(Number.isInteger(r.certifiedCost) && r.certifiedCost >= 0);
    assert.ok(r.source.ref.length > 0 && r.source.certification.includes('domainBasis='));
  }
  for (const id of ['sv-retractable-stock::weapon', 'sv-cheater::equipment', 'web-outlaw-tech-personalized-modifications::weapon', 'goi-componentization-basic::weapon']) assert.equal(lookup(id), null, id);
  for (const bad of [null, undefined, 5, {}, 'sv-cheater', '']) assert.equal(lookup(bad), null);
});
check('Phase 1a, fed by the closure through the adapter view, certifies a recorded installation', () => {
  const id = eligibleArmor[0];
  const item = armorItem([{ instanceId: 'i-1', typedDefinitionId: id, domain: 'armor' }]);
  const lookup = createCertifiedDefinitionLookup(catalog);
  const state = slotAuthority.resolveSlotState(slotView(item), { ...armorCtx, certifiedDefinitionLookup: lookup });
  assert.equal(state.totals.status, 'certified', JSON.stringify({ u: state.unresolved, c: state.conflicts }));
  assert.equal(state.totals.total, 2);
  assert.equal(state.totals.used, costOf(id));
  assert.equal(state.totals.free, 2 - costOf(id));
  // Without the adapter Phase 1a cannot read the V2 instance identity and refuses to certify.
  const raw = slotAuthority.resolveSlotState(item, { ...armorCtx, certifiedDefinitionLookup: lookup });
  assert.notEqual(raw.totals.status, 'certified');
});
check('slotView never mutates the Item', () => {
  const item = armorItem([{ instanceId: 'i-1', typedDefinitionId: eligibleArmor[0], domain: 'armor' }]);
  const view = slotView(item);
  assert.notEqual(view, item);
  assert.equal(item.flags['foundryvtt-swse'].customization.installedUpgrades[0].upgradeKey, undefined);
  assert.equal(view.flags['foundryvtt-swse'].customization.installedUpgrades[0].upgradeKey, eligibleArmor[0]);
});

// Legality ---------------------------------------------------------------------------------------
check('legality fails closed unless a registered evaluator returns certified evidence', () => {
  const typed = { applicability: { hostRequirementsSpecified: true, hostEvaluator: 'e' } };
  const none = createLegalityFramework();
  for (const id of catalog.listTyped()) assert.equal(none.evaluate(catalog.getTyped(id).typed, {}).status, 'not_established');
  const status = (evaluators, t = typed) => createLegalityFramework({ evaluators }).evaluate(t, {});
  assert.equal(status({ e: () => ({ verdict: 'legal', evidence: ['x'] }) }).status, 'legal');
  assert.equal(status({ e: () => ({ verdict: 'illegal', evidence: ['x'] }) }).status, 'illegal');
  assert.deepEqual(status({ e: () => ({ verdict: 'legal', evidence: [] }) }).reasons, ['HOST_EVALUATOR_MALFORMED']);
  assert.deepEqual(status({ e: () => ({ verdict: 'maybe', evidence: ['x'] }) }).reasons, ['HOST_EVALUATOR_MALFORMED']);
  assert.deepEqual(status({ e: () => { throw new Error('x'); } }).reasons, ['HOST_EVALUATOR_THREW']);
  assert.deepEqual(status({}).reasons, ['HOST_EVALUATOR_NOT_REGISTERED']);
  assert.deepEqual(status({ toString: 1 }, { applicability: { hostRequirementsSpecified: true, hostEvaluator: 'toString' } }).reasons, ['HOST_EVALUATOR_NOT_REGISTERED']);
  assert.deepEqual(status({ e: () => 1 }, { applicability: { hostRequirementsSpecified: true } }).reasons, ['HOST_EVALUATOR_NOT_NAMED']);
  assert.deepEqual(status({ e: () => 1 }, { applicability: { hostRequirementsSpecified: false, hostEvaluator: 'e' } }).reasons, ['HOST_REQUIREMENTS_NOT_SPECIFIED']);
});

// Planner on the real catalog ----------------------------------------------------------------
const hostFor = (domain) => deepFreeze({ id: 'h1', type: domain, name: 'Host', system: { upgradeSlots: 1, installedUpgrades: [] }, flags: {} });
const codesOf = (plan) => plan.blockers.map((b) => b.code);
const planFor = (id, extra = {}) => planModification({ catalog, operation: 'install', typedDefinitionId: id, item: hostFor(catalog.getTyped(id).domain), slotAuthority, legality: createLegalityFramework(), ...extra });

check('planner: with the real catalog no definition can be planned as executable', () => {
  let n = 0;
  let governed = 0;
  for (const id of catalog.listTyped()) {
    const p = planFor(id);
    n += 1;
    assert.equal(p.executable, false, id);
    assert.equal(p.readOnly, true);
    assert.ok(codesOf(p).includes('EXECUTOR_NOT_CERTIFIED'));
    assert.ok(codesOf(p).includes('NOT_SELECTABLE'), id);
    assert.ok(codesOf(p).includes('HOST_NOT_ESTABLISHED'), id);
    const d13 = p.deferrals.some((d) => d.register === 'D-013' && d.component === 'installProcedure');
    const specified = catalog.getTyped(id).typed.status.components.installProcedure.SOURCE_VERIFIED; // printed page-39 facts verified (governed)
    assert.equal(d13, !specified, `${id}: D-013 blocks exactly the definitions the page-39 procedure does not govern`);
    assert.equal(codesOf(p).includes('COMPONENT_UNVERIFIED') && p.blockers.some((b) => b.code === 'COMPONENT_UNVERIFIED' && b.detail === 'installProcedure'), !specified);
    // Host prerequisites are source-verified only where a PUBLISHED_FACTS host record exists (the 35 D-005 definitions); that is a source fact, never an established host or a mechanic.
    const hostFacts = catalog.getTyped(id).typed.status.components.hostPrerequisites;
    assert.equal(p.blockers.some((b) => b.code === 'COMPONENT_UNVERIFIED' && b.detail === 'hostPrerequisites'), !hostFacts.SOURCE_VERIFIED, `${id}: host prerequisites are unverified exactly where no host fact record exists`);
    assert.equal(hostFacts.MECHANIC_SPECIFIED, false, `${id}: published host facts are not a specified host mechanic`);
    if (hostFacts.SOURCE_VERIFIED) {
      assert.ok(!p.deferrals.some((d) => d.register === 'D-005'), `${id}: D-005 source question is lifted (source-only); no planner deferral remains`);
      assert.ok(codesOf(p).includes('HOST_NOT_ESTABLISHED') && codesOf(p).includes('NOT_SELECTABLE') && codesOf(p).includes('EXECUTOR_NOT_CERTIFIED'), `${id}: host still not established, not selectable`);
    }
    if (specified) {
      governed += 1;
      assert.ok(codesOf(p).includes('INSTALL_PROCEDURE_NOT_SPECIFIED'), 'verified published facts are not a complete mechanical procedure');
      assert.ok(p.deferrals.some((d) => d.register === 'D-014' && d.classification === 'DEFERRED_RULES_REVIEW'), 'D-014 (owner ruling) remains deferred on every governed definition');
      assert.ok(!p.deferrals.some((d) => d.register === 'D-015'), 'D-015 source question is lifted (source-only); it is not a planner deferral any more');
      assert.ok(!p.deferrals.some((d) => d.register === 'D-013'));
    }
  }
  assert.equal(n, 232);
  assert.equal(governed, 76);
});
check('planner: stable reason codes for specific definitions', () => {
  const rs = planFor('sv-retractable-stock::weapon');
  assert.ok(codesOf(rs).includes('SLOT_COST_UNCERTIFIED'));
  assert.ok(rs.deferrals.some((d) => d.register === 'D-004' && d.component === 'cost'));
  assert.ok(codesOf(planFor('goi-componentization-basic::weapon')).includes('PRICE_UNKNOWN'));
  assert.ok(planFor('goi-componentization-basic::weapon').deferrals.some((d) => d.register === 'D-006' && d.classification === 'DEFERRED_RULES_REVIEW'));
  assert.ok(codesOf(planFor('web-outlaw-tech-personalized-modifications::weapon')).includes('NOT_INSTALLABLE_CANDIDATE'));
  const crystal = catalog.listTyped().find((id) => (catalog.getTyped(id).typed.slotPool || '').startsWith('lightsaber-'));
  assert.ok(codesOf(planFor(crystal)).includes('NON_GENERAL_POOL'));
  assert.equal(planFor('sv-cheater::equipment').price.amount, 500);
});
check('planner: argument and domain errors are refused, never thrown', () => {
  const id = eligibleArmor[0];
  assert.ok(codesOf(planModification({ catalog, operation: 'install', typedDefinitionId: id, item: hostFor('weapon') })).includes('DOMAIN_MISMATCH'));
  assert.ok(codesOf(planModification({ catalog, operation: 'install', typedDefinitionId: id, item: hostFor('vehicle') })).includes('ITEM_DOMAIN_UNKNOWN'));
  assert.ok(codesOf(planModification({ catalog, operation: 'install', typedDefinitionId: id, item: null })).includes('ITEM_INVALID'));
  assert.ok(codesOf(planModification({ catalog, operation: 'install', typedDefinitionId: 'nope::armor', item: hostFor('armor') })).includes('DEFINITION_UNKNOWN'));
  assert.ok(codesOf(planModification({ catalog, operation: 'install', typedDefinitionId: 'sv-cheater', item: hostFor('armor') })).includes('DEFINITION_UNKNOWN'), 'parent id is not a typed id');
  assert.ok(codesOf(planModification({ catalog, operation: 'sell', typedDefinitionId: id, item: hostFor('armor') })).includes('OPERATION_INVALID'));
  assert.ok(codesOf(planModification({ operation: 'install', typedDefinitionId: id, item: hostFor('armor') })).includes('CATALOG_MISSING'));
  assert.ok(codesOf(planModification()).includes('CATALOG_MISSING'));
  for (const p of [planModification(), planModification({ catalog })]) assert.equal(p.executable, false);
});
check('planner: removal plans require the exact recorded instance', () => {
  const id = eligibleArmor[0];
  const item = armorItem([{ instanceId: 'i-1', typedDefinitionId: id, domain: 'armor' }]);
  const base = { catalog, operation: 'remove', typedDefinitionId: id, item };
  assert.ok(codesOf(planModification({ ...base, instanceId: 'missing' })).includes('REMOVE_INSTANCE_NOT_FOUND'));
  assert.ok(codesOf(planModification(base)).includes('REMOVE_INSTANCE_ID_INVALID'));
  for (const bad of ['', '  ', 5, {}, [], false]) assert.ok(codesOf(planModification({ ...base, instanceId: bad })).includes('REMOVE_INSTANCE_ID_INVALID'), `instanceId ${JSON.stringify(bad)}`);
  assert.ok(codesOf(planModification({ ...base, typedDefinitionId: eligibleArmor[1], instanceId: 'i-1' })).includes('REMOVE_INSTANCE_MISMATCH'));
  const ok = planModification({ ...base, instanceId: 'i-1' });
  assert.ok(!codesOf(ok).includes('REMOVE_INSTANCE_NOT_FOUND') && !codesOf(ok).includes('REMOVE_INSTANCE_MISMATCH'));
  assert.equal(ok.executable, false, 'removal procedure is as uncertified as installation (D-001)');
});
check('planner removal identity: domain, duplicates and malformed records are refused (G3 review correction)', () => {
  const id = eligibleArmor[0];
  const rec = (over = {}) => ({ instanceId: 'i-1', typedDefinitionId: id, domain: 'armor', ...over });
  const plan = (instances, extra = {}) => planModification({ catalog, operation: 'remove', typedDefinitionId: id, item: armorItem(instances), instanceId: 'i-1', ...extra });
  const identityCodes = ['REMOVE_INSTANCE_ID_INVALID', 'REMOVE_INSTANCES_NOT_ARRAY', 'REMOVE_INSTANCE_RECORD_MALFORMED', 'REMOVE_INSTANCE_ID_DUPLICATE', 'REMOVE_INSTANCE_NOT_FOUND', 'REMOVE_INSTANCE_MISMATCH', 'REMOVE_INSTANCE_DOMAIN_MISMATCH'];
  const identityBlockers = (p) => codesOf(p).filter((c) => identityCodes.includes(c));
  // exactly one well-formed matching record: no identity blocker (the plan is still non-executable for other reasons)
  assert.deepEqual(identityBlockers(plan([rec()])), []);
  // recorded domain disagrees with the definition and host
  assert.deepEqual(identityBlockers(plan([rec({ domain: 'weapon', typedDefinitionId: id })])), ['REMOVE_INSTANCE_NOT_FOUND', 'REMOVE_INSTANCE_RECORD_MALFORMED'], 'domain must also agree with the typed id suffix');
  const wrongDomainButConsistent = catalog.listTyped({ domain: 'weapon' })[0];
  const crossDomain = planModification({ catalog, operation: 'remove', typedDefinitionId: wrongDomainButConsistent, item: armorItem([{ instanceId: 'i-1', typedDefinitionId: wrongDomainButConsistent, domain: 'weapon' }]), instanceId: 'i-1' });
  assert.ok(codesOf(crossDomain).includes('REMOVE_INSTANCE_DOMAIN_MISMATCH') && codesOf(crossDomain).includes('DOMAIN_MISMATCH'), 'a weapon instance recorded on an armor host');
  const hostDomain = planModification({ catalog, operation: 'remove', typedDefinitionId: id, item: armorItem([rec()], { type: 'equipment' }), instanceId: 'i-1' });
  assert.ok(codesOf(hostDomain).includes('REMOVE_INSTANCE_DOMAIN_MISMATCH'));
  // duplicates: identical, or the same id with different content
  assert.deepEqual(identityBlockers(plan([rec(), rec()])), ['REMOVE_INSTANCE_ID_DUPLICATE']);
  assert.ok(codesOf(plan([rec(), rec({ typedDefinitionId: eligibleArmor[1] })])).includes('REMOVE_INSTANCE_ID_DUPLICATE'));
  assert.deepEqual(plan([rec(), rec()]).blockers.find((b) => b.code === 'REMOVE_INSTANCE_ID_DUPLICATE').detail, ['i-1']);
  // a duplicate of some OTHER id still makes the host's identity state ambiguous
  assert.ok(codesOf(plan([rec(), rec({ instanceId: 'i-2' }), rec({ instanceId: 'i-2' })])).includes('REMOVE_INSTANCE_ID_DUPLICATE'));
  // malformed records anywhere in the list
  for (const bad of [null, 'str', 7, [], {}, rec({ instanceId: '' }), rec({ instanceId: 3 }), rec({ typedDefinitionId: '' }), rec({ typedDefinitionId: 5 }), rec({ domain: 'vehicle' }), rec({ domain: undefined }), rec({ typedDefinitionId: 'no-separator' })]) {
    const p = plan([rec(), bad]);
    assert.ok(codesOf(p).includes('REMOVE_INSTANCE_RECORD_MALFORMED'), JSON.stringify(bad));
    assert.deepEqual(p.blockers.find((b) => b.code === 'REMOVE_INSTANCE_RECORD_MALFORMED').detail, [1]);
    assert.equal(p.executable, false);
  }
  // the instances container itself malformed
  const notArray = planModification({ catalog, operation: 'remove', typedDefinitionId: id, item: armorItem({ not: 'an array' }), instanceId: 'i-1' });
  assert.ok(codesOf(notArray).includes('REMOVE_INSTANCES_NOT_ARRAY'));
  assert.ok(!codesOf(notArray).includes('REMOVE_INSTANCE_NOT_FOUND'));
  // never throws for hostile hosts
  for (const item of [null, undefined, 5, { type: 'armor' }, { type: 'armor', flags: null }, { type: 'armor', flags: { 'foundryvtt-swse': { customization: null } } }]) {
    assert.doesNotThrow(() => planModification({ catalog, operation: 'remove', typedDefinitionId: id, item, instanceId: 'i-1' }));
  }
  // install plans do not depend on removal identity checks
  assert.ok(!identityBlockers(planFor(id)).length);
});
check('planner: deterministic and does not mutate its inputs', () => {
  const id = eligibleArmor[0];
  const item = armorItem([]);
  const a = JSON.stringify(planFor(id, { item }));
  const b = JSON.stringify(planFor(id, { item }));
  assert.equal(a, b);
  const blockers = planFor(id, { item }).blockers.map((x) => x.code);
  assert.deepEqual(blockers, [...blockers].sort());
});

// Planner on a synthetic fully-certified armor definition ---------------------------------------
const target = eligibleArmor.find((id) => catalog.getTyped(id).parent.price.kind === 'credits');
const synthCatalog = (patch) => createModificationCatalog(syntheticDoc(target, patch)).catalog;
const synthPlan = (over = {}) => planModification({ catalog: synthCatalog(over.patch), operation: 'install', typedDefinitionId: target, item: over.item ?? armorItem([]), slotAuthority: over.noAuthority ? null : (over.authority ?? slotAuthority), slotContext: armorCtx, legality: createLegalityFramework({ evaluators: over.evaluators ?? legalEvaluator }) });

check('planner: a fully certified synthetic definition leaves ONLY the executor blocker (executable stays false)', () => {
  const p = synthPlan();
  assert.deepEqual(codesOf(p), ['EXECUTOR_NOT_CERTIFIED']);
  assert.equal(p.executable, false);
  assert.equal(p.host.status, 'legal');
  assert.equal(p.slotImpact.status, 'certified');
  assert.equal(p.slotImpact.total, 2);
  assert.equal(p.slotImpact.cost, costOf(target));
  assert.equal(p.slotImpact.freeAfter, 2 - costOf(target));
  assert.deepEqual(p.deferrals, []);
});
check('planner: overflow, host verdicts, price kinds, slot-authority failures', () => {
  const full = armorItem([{ instanceId: 'a', typedDefinitionId: eligibleArmor[0], domain: 'armor' }, { instanceId: 'b', typedDefinitionId: eligibleArmor[0], domain: 'armor' }]);
  assert.equal(2 * costOf(eligibleArmor[0]), 2, 'fixture fills a medium armor (2 slots)');
  assert.ok(costOf(target) > 0);
  const overflow = synthPlan({ item: full });
  assert.ok(codesOf(overflow).includes('SLOT_OVERFLOW'));
  assert.equal(overflow.slotImpact.free, 0);
  assert.ok(codesOf(synthPlan({ evaluators: { 'armor-host-evaluator': () => ({ verdict: 'illegal', evidence: ['x'] }) } })).includes('HOST_ILLEGAL'));
  assert.ok(codesOf(synthPlan({ evaluators: {} })).includes('HOST_NOT_ESTABLISHED'));
  const pct = synthPlan({ patch: (t, r) => { r.price = { kind: 'percent_of_host_cost', registry: { type: 'percent_of_host_cost', percent: 10 } }; } });
  assert.ok(codesOf(pct).includes('PRICE_NOT_COMPUTABLE'));
  const unknown = synthPlan({ patch: (t, r) => { r.price = { kind: 'unknown', registry: { type: 'not_stated' } }; } });
  assert.ok(codesOf(unknown).includes('PRICE_UNKNOWN'));
  assert.ok(codesOf(synthPlan({ noAuthority: true })).includes('SLOT_STATE_UNRESOLVED'));
  assert.ok(codesOf(synthPlan({ authority: { resolveSlotState: () => { throw new Error('x'); } } })).includes('SLOT_STATE_UNRESOLVED'));
  assert.ok(codesOf(synthPlan({ authority: { resolveSlotState: () => ({ status: 'unresolved', totals: { status: 'unresolved', free: null } }) } })).includes('SLOT_STATE_UNRESOLVED'));
  assert.ok(codesOf(synthPlan({ item: armorItem([], { system: { armorType: 'medium', isPoweredArmor: false, upgradeSlots: 2, installedUpgrades: [] } }), authority: slotAuthority, patch: (t) => { t.slotPool = 'lightsaber-accessory'; } })).includes('NON_GENERAL_POOL'));
  assert.ok(codesOf(synthPlan({ patch: (t) => { t.status.components.installProcedure.SOURCE_VERIFIED = false; } })).includes('COMPONENT_UNVERIFIED'));
  assert.ok(codesOf(synthPlan({ patch: (t) => { t.status.components.installProcedure.pendingSource = ['D-001']; } })).includes('OPEN_REGISTER_ENTRY'));
});

// Static guards ----------------------------------------------------------------------------------
check('static: G3 modules are pure, import only each other, and nothing else imports them', () => {
  const dir = path.join(ROOT, 'scripts/engine/customization/modification-v2');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  assert.deepEqual(files, ['modification-catalog.js', 'modification-legality.js', 'modification-planner.js', 'modification-price.js', 'modification-slot-closure.js']);
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const forbidden of ['ActorEngine', 'TransactionEngine', 'ModifierEngine', '.update(', 'setFlag', 'unsetFlag', 'game.', 'fetch(', 'Date.now', 'Math.random', 'data/audits', 'data/modifications', 'require(', 'localStorage', 'modification-slot-authority']) assert.ok(!src.includes(forbidden), `${f} must not contain ${forbidden}`);
    for (const m of src.matchAll(/^import\s.*?from\s+'([^']+)'/gm)) assert.match(m[1], /^\.\/modification-[a-z-]+\.js$/, `${f} imports only sibling G3 modules`);
  }
  const importers = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const full = path.join(d, e.name); if (e.isDirectory()) { if (full !== dir) walk(full); } else if (/\.(m?js)$/.test(e.name) && fs.readFileSync(full, 'utf8').includes('modification-v2/')) importers.push(path.relative(ROOT, full)); } };
  walk(path.join(ROOT, 'scripts'));
  assert.deepEqual(importers, [], 'no runtime consumer exists before G6/G8');
});

console.log(`modification-v2-offline: ${checks} checks OK`);
