import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Wave 2B / Gate C-2 -- installed-component evidence, quote vs installation
// eligibility, and host-dependent quotation. Real catalog, real quote
// authority, real engine; only ActorEngine is the shared fake.

registerFoundryPathLoader();
const SYSTEM_ID = 'foundryvtt-swse';
function makeActorsCollection(actors = []) {
  const map = new Map(actors.map(a => [a.id, a]));
  return { get: (id) => map.get(id), set: (id, a) => map.set(id, a), [Symbol.iterator]: () => map.values() };
}
function makeDroid({ id = 'droid-1', credits = 99999, installedSystems = {}, droidSystems = {}, items = [] } = {}) {
  const actor = {
    id, name: 'Test Droid', type: 'droid', uuid: `Actor.${id}`, isOwner: true,
    system: { credits, droidSystems: { size: 'medium', ...droidSystems }, installedSystems },
    img: 'icons/x.png', items, effects: [], flags: { [SYSTEM_ID]: {}, swse: {} },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    toObject() { return JSON.parse(JSON.stringify({ system: actor.system, name: actor.name, img: actor.img, prototypeToken: actor.prototypeToken, items: actor.items, effects: actor.effects, flags: actor.flags })); }
  };
  return actor;
}
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, actors: makeActorsCollection([]), users: [] } });

const { resetFakeActorEngine, fakeActorEngineCallLog } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { DroidCustomizationEngine } = await import('../scripts/engine/customization/droid-customization-engine.js');
const schema = await import('../scripts/data/droid-part-schema.js');
const { collectInstalledComponentEvidence, deriveHostAppendageBase, resolveDroidPartQuoteDetailed, resolveDroidPartQuote } = schema;
const { evaluateInstallationEligibility, unresolvedHostRequirement, ELIGIBILITY } = await import('../scripts/domain/droids/droid-installation-eligibility.js');
const { evaluateDroidComponentPrerequisites } = await import('../scripts/domain/droids/droid-component-prerequisites.js');

const seq = (...v) => { const q = [...v]; return () => q.shift(); };
let n = 0;
const ok = m => console.log(`  [${++n}] ${m} OK`);
const handEntry = (n2, slot) => ({ id: 'hand', instanceId: `inst-aaaaaa0${n2}`, locationId: `appendage-slot-${slot}`, name: 'Hand', category: 'appendage', slot: 'appendage', cost: 9999 });
const ledgerKey = e => `${e.id}--${e.instanceId}`;

// 1. Evidence is read from RECORDS, never from ledger keys.
{
  const h1 = handEntry(1, 1), h2 = handEntry(2, 2);
  const d = makeDroid({ installedSystems: { [ledgerKey(h1)]: h1, [ledgerKey(h2)]: h2 }, droidSystems: { appendages: [h1, h2] } });
  const ev = collectInstalledComponentEvidence(d);
  assert.ok(ev.confirmedIds.includes('hand'), 'the part id comes from the record');
  assert.ok(!ev.confirmedIds.some(id => id.includes('inst')), 'an opaque key is never read as a part id');
  assert.deepEqual(ev.confirmedAppendages.map(a => a.instanceId).sort(), ['inst-aaaaaa01', 'inst-aaaaaa02']);
  assert.ok(ev.confirmedAppendages.every(a => a.id === 'hand'));
  ok('opaque ledger keys: part ids and appendage instances come from records');
}

// 2. Confirmed vs present: a draft record, a mirror, a stock blob or an embedded Item never SATISFIES a
// post-creation requirement; only the ledger does. (remote-receiver requires the installed remote processor.)
{
  const stage = actor => resolveDroidPartQuoteDetailed(actor, 'remote-receiver').stages;
  const draftOnly = makeDroid({ droidSystems: { processor: { id: 'remote' } } });
  assert.equal(stage(draftOnly).prerequisites, 'BLOCKED', 'a creation-time/stock selection does not satisfy a post-creation prerequisite');
  const mirrorOnly = makeDroid({ droidSystems: { processorEnhancements: [{ id: 'remote' }], accessories: [{ id: 'remote' }] } });
  assert.equal(stage(mirrorOnly).prerequisites, 'BLOCKED', 'a display mirror does not satisfy it');
  const itemOnly = makeDroid({ items: [{ id: 'itm1', type: 'droid-system', name: 'remote', system: { droidPartId: 'remote', integrated: true }, flags: {} }] });
  assert.equal(stage(itemOnly).prerequisites, 'BLOCKED', 'an embedded Item is present but not confirmed hardware');
  const ledgered = makeDroid({ installedSystems: { remote: { id: 'remote', installed: true } } });
  assert.equal(stage(ledgered).prerequisites, 'MET', 'the installation ledger does');
  ok('requiredSystems: draft / mirror / embedded Item are refused; the ledger record satisfies');
}

// 3. ...but any present evidence still BLOCKS a conflict (the safe direction).
{
  const blob = makeDroid({ droidSystems: { size: 'large', accessories: [{ id: 'hardened-systems-x2' }] } });
  const r = resolveDroidPartQuoteDetailed(blob, 'hardened-systems-x3');
  assert.equal(r.stages.prerequisites, 'BLOCKED');
  assert.match(r.quote.blockingReason, /Only one Hardened Systems tier/);
  const clean = makeDroid({ droidSystems: { size: 'large' } });
  assert.equal(resolveDroidPartQuoteDetailed(clean, 'hardened-systems-x3').stages.prerequisites, 'MET');
  ok('nonstacking tiers: a draft/blob tier still blocks a second tier; a clean droid does not');
}

// 4. Chassis locomotion remains a droidSystems fact; draft mode (builders) is unchanged.
{
  const def = { id: 'x', requiredLocomotion: ['walking'] };
  const base = { definition: def, size: 'medium', droidSystems: { locomotion: { id: 'walking' } } };
  assert.equal(evaluateDroidComponentPrerequisites(base).status, 'PREREQUISITES_MET');
  assert.equal(evaluateDroidComponentPrerequisites({ ...base, ledgerEvidence: true }).status, 'PREREQUISITES_MET');
  const sys = { definition: { id: 'y', requiredSystems: ['remote'] }, size: 'medium', droidSystems: { processor: { id: 'remote' } } };
  assert.equal(evaluateDroidComponentPrerequisites(sys).status, 'PREREQUISITES_MET', 'DRAFT mode still accepts the draft selection (builders)');
  assert.equal(evaluateDroidComponentPrerequisites({ ...sys, ledgerEvidence: true }).status, 'BLOCKED', 'LEDGER mode does not');
  assert.equal(evaluateDroidComponentPrerequisites({ ...sys, ledgerEvidence: true, installedComponentIds: ['remote'] }).status, 'PREREQUISITES_MET');
  ok('draft mode unchanged for builders; ledger mode needs confirmed ids; locomotion stays a chassis fact');
}

// 5. Host-dependent quotation derives from the verified ledger host only.
{
  const h1 = handEntry(1, 1); // stored cost 9999 is a trap: it must never be read
  const claw = { id: 'claw', instanceId: 'inst-bbbbbb02', locationId: 'appendage-slot-2', name: 'Claw', category: 'appendage', slot: 'appendage', cost: 1 };
  const d = makeDroid({ installedSystems: { [ledgerKey(h1)]: h1, [ledgerKey(claw)]: claw }, droidSystems: { appendages: [{ ...h1, cost: 7777 }, claw] } });
  const canonicalHand = resolveDroidPartQuote(d, 'hand');
  assert.equal(canonicalHand.status, 'OK');
  const typed = { source: { requiresAppendage: ['hand', 'claw'] } };
  const okHost = deriveHostAppendageBase(d, typed, { id: 'hand', instanceId: 'inst-aaaaaa01' });
  assert.equal(okHost.status, 'OK');
  assert.equal(okHost.cost, canonicalHand.credits, 'the canonical quote, not the stored 9999 or the mirror 7777');
  assert.equal(okHost.kg, canonicalHand.kg);
  const clawHost = deriveHostAppendageBase(d, typed, { id: 'claw', instanceId: 'inst-bbbbbb02' });
  assert.equal(clawHost.cost, resolveDroidPartQuote(d, 'claw').credits);
  // wrong / stale / foreign / disallowed hosts yield no base
  for (const [label, sel] of [
    ['mismatched kind', { id: 'claw', instanceId: 'inst-aaaaaa01' }],
    ['stale/unknown instance', { id: 'hand', instanceId: 'inst-zzzzzz99' }],
    ['no selection', null],
    ['no instance id', { id: 'hand' }]
  ]) {
    const r = deriveHostAppendageBase(d, typed, sel);
    assert.equal(r.status, 'BLOCKED', label); assert.equal(r.cost, null, label);
  }
  assert.equal(deriveHostAppendageBase(d, { source: { requiresAppendage: ['hand'] } }, { id: 'claw', instanceId: 'inst-bbbbbb02' }).status, 'BLOCKED', 'a host kind the definition does not allow');
  const other = makeDroid({ id: 'droid-2' });
  assert.equal(deriveHostAppendageBase(other, typed, { id: 'hand', instanceId: 'inst-aaaaaa01' }).status, 'BLOCKED', 'another actor\'s host identity');
  // a component with no typed host requirement is never host-priced
  assert.equal(deriveHostAppendageBase(d, { source: {} }, { id: 'hand', instanceId: 'inst-aaaaaa01' }).status, 'NOT_HOST_PRICED');
  ok('host base cost/mass = canonical quote of the verified ledger host; stale / foreign / mismatched / disallowed hosts yield none');
}

// 6. Caller-supplied host prices are ignored on the actor path.
{
  const d = makeDroid();
  const plain = resolveDroidPartQuote(d, 'telescopic-appendage');
  const forged = resolveDroidPartQuote(d, 'telescopic-appendage', { appendageBaseCost: 1, appendageBaseWeight: 1 });
  assert.deepEqual(forged, plain, 'forged base values change nothing');
  assert.notEqual(forged.status, 'OK', 'Telescopic Appendage is not quotable without a verified host price');
  ok('forged appendageBaseCost / appendageBaseWeight are ignored');
}

// 7. Quote vs installation permission.
{
  const allOk = { sourceReview: 'PASS', prerequisites: 'MET', numeric: 'OK' };
  const quote = { status: 'OK', credits: 100, kg: 2 };
  const clear = evaluateInstallationEligibility({ componentId: 'hand', stages: allOk, quote });
  assert.equal(clear.status, ELIGIBILITY.ELIGIBLE); assert.equal(clear.installable, true);
  for (const [label, stages, code] of [
    ['source hold', { sourceReview: 'BLOCKED', prerequisites: 'NOT_EVALUATED', numeric: 'NOT_EVALUATED' }, 'SOURCE_REVIEW_HOLD'],
    ['prerequisite', { sourceReview: 'PASS', prerequisites: 'BLOCKED', numeric: 'NOT_EVALUATED' }, 'PREREQUISITES_UNMET'],
    ['price', { sourceReview: 'PASS', prerequisites: 'MET', numeric: 'INVALID' }, 'QUOTE_UNRESOLVED']
  ]) {
    const r = evaluateInstallationEligibility({ componentId: 'hand', stages, quote: { status: 'BLOCKED', credits: null, blockingReason: label } });
    assert.equal(r.status, ELIGIBILITY.BLOCKED, label); assert.equal(r.reasons[0].code, code, label);
  }
  assert.equal(evaluateInstallationEligibility({ componentId: 'hand', stages: null }).status, ELIGIBILITY.UNKNOWN, 'missing facts are UNKNOWN, never compatible');
  assert.equal(evaluateInstallationEligibility({ componentId: 'hand', stages: allOk, quote, restrictions: [{ code: 'PRIMARY_PROCESSOR_PRESENT', message: 'x' }] }).status, ELIGIBILITY.BLOCKED);
  ok('eligibility: ELIGIBLE only when every gate is clear; each failing gate and missing facts block');
}

// 8. A numeric host price can never make an unresolved-host component installable.
{
  const allOk = { sourceReview: 'PASS', prerequisites: 'MET', numeric: 'OK' };
  for (const id of ['telescopic-appendage', 'droid-telescopic-appendage', 'micro-shield', 'silence-bubble-generator']) {
    const r = evaluateInstallationEligibility({ componentId: id, stages: allOk, quote: { status: 'OK', credits: 400, kg: 4 } });
    assert.equal(r.status, ELIGIBILITY.BLOCKED, id);
    assert.equal(r.quote.status, 'OK', 'the quote stays a quote');
    assert.equal(r.installable, false, id);
    assert.ok(r.reasons.some(x => x.code === 'HOST_RULING_PENDING'), id);
  }
  assert.equal(unresolvedHostRequirement('telescopic-appendage').decisionId, 'DROID-RD-002');
  assert.equal(unresolvedHostRequirement('hand'), null);
  ok('Telescopic Appendage / Micro Shield / Silence-Bubble Generator stay blocked even with a valid numeric price');
}

// 9. Engine, end to end: Telescopic Appendage cannot be installed even with a verified host.
{
  resetFakeActorEngine();
  const d = makeDroid();
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seq('aaaaaa01') });
  const credits = d.system.credits, before = JSON.stringify(d.system);
  for (const change of [{ add: ['telescopic-appendage'] }, { add: [{ id: 'telescopic-appendage', hostInstanceId: 'inst-aaaaaa01' }] }]) {
    const p = DroidCustomizationEngine.previewDroidCustomization(d, change);
    assert.equal(p.success, false);
    const r = await DroidCustomizationEngine.applyDroidCustomization(d, change);
    assert.equal(r.success, false);
  }
  assert.equal(JSON.stringify(d.system), before, 'ledger and mirror untouched');
  assert.equal(d.system.credits, credits, 'no charge');
  const entry = DroidCustomizationEngine.getAvailableSystems(d).systems.find(s => s.id === 'telescopic-appendage');
  assert.equal(entry.compatible, false);
  assert.ok(entry.eligibility.reasons.some(x => x.code === 'HOST_RULING_PENDING' && x.decisionId === 'DROID-RD-002'));
  ok('engine: Telescopic Appendage preview/apply refused with a verified host; catalog entry shows the pending ruling');
}

// 10. Display contract: a backup processor slot lifts ONLY the "primary already installed" restriction.
{
  const withBackup = makeDroid({ droidSystems: { processor: { id: 'basic-processor' } }, installedSystems: { 'backup-processor': { id: 'backup-processor' } } });
  const sys = DroidCustomizationEngine.getAvailableSystems(withBackup).systems;
  const byId = id => sys.find(s => s.id === id);
  for (const id of ['military-processor', 'remote-processor']) {
    assert.notEqual(byId(id).quoteStatus, 'OK', `${id} has an independent quote/source failure`);
    assert.equal(byId(id).compatible, false, `${id} must not be shown compatible just because a backup slot exists`);
  }
  assert.equal(byId('heuristic-processor').compatible, true, 'a clean primary processor is installable into the backup slot');
  assert.equal(byId('heuristic-processor').eligibility.reasons.length, 0);

  const noBackup = makeDroid({ droidSystems: { processor: { id: 'basic-processor' } } });
  const h = DroidCustomizationEngine.getAvailableSystems(noBackup).systems.find(s => s.id === 'heuristic-processor');
  assert.equal(h.compatible, false);
  assert.ok(h.eligibility.reasons.some(x => x.code === 'PRIMARY_PROCESSOR_PRESENT'));
  // and the preview agrees with the display for every processor the display calls compatible
  for (const s of sys.filter(x => x.category === 'processor' && x.compatible && !x.installed)) {
    const p = DroidCustomizationEngine.previewDroidCustomization(withBackup, { add: [s.id] });
    assert.equal(p.success, true, `${s.id}: display and preview must agree (${p.error})`);
  }
  ok('backup slot lifts only the primary-processor restriction; display agrees with preview');
}

// 11. Display never claims more than the preview allows (whole catalog, several droid shapes).
{
  const shapes = [
    makeDroid(),
    makeDroid({ droidSystems: { processor: { id: 'basic-processor' } } }),
    makeDroid({ installedSystems: { remote: { id: 'remote', installed: true } } })
  ];
  let compared = 0;
  for (const d of shapes) {
    for (const s of DroidCustomizationEngine.getAvailableSystems(d).systems) {
      if (s.installed) continue;
      const p = DroidCustomizationEngine.previewDroidCustomization(d, { add: [s.id] });
      if (s.compatible) assert.equal(p.success, true, `${s.id} displayed compatible but preview refused: ${p.error}`);
      compared += 1;
    }
  }
  assert.ok(compared > 100);
  ok(`no catalog entry is displayed compatible that the preview refuses (${compared} comparisons)`);
}

console.log(`Droid Wave 2B installation eligibility tests passed (${n} groups).`);
