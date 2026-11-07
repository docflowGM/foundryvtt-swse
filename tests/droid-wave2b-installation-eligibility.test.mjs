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
const { collectInstalledComponentEvidence, deriveHostAppendageBase, resolveDroidPartQuoteDetailed, resolveDroidPartQuote, listConfirmedHostInstances, deriveInstalledShieldRating } = schema;
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

// ======================= Review corrections (Wave 2B) =======================

// 12. Only a GENUINELY confirmed, installed physical appendage can be a host.
{
  const base = (over = {}) => ({ id: 'hand', instanceId: 'inst-aaaaaa01', locationId: 'appendage-slot-1', name: 'Hand', category: 'appendage', slot: 'appendage', ...over });
  const build = (entry, extraMirror) => {
    const mirror = [{ id: entry.id, instanceId: entry.instanceId, ...(entry.locationId ? { locationId: entry.locationId } : {}) }];
    return makeDroid({ installedSystems: { [`${entry.id}--${entry.instanceId}`]: entry }, droidSystems: { appendages: extraMirror ?? mirror } });
  };
  const typed = { source: { requiresAppendage: ['hand', 'claw'] } };
  const sel = { id: 'hand', instanceId: 'inst-aaaaaa01' };
  const good = build(base());
  assert.equal(deriveHostAppendageBase(good, typed, sel).status, 'OK', 'control: a confirmed hand is a host');
  assert.equal(listConfirmedHostInstances(good).length, 1);
  const cases = [
    ['installed:false', build(base({ installed: false }))],
    ['no confirmed location', build(base({ locationId: null }))],
    ['identified NON-appendage record', build(base({ id: 'plasteel-shell', category: 'armor', slot: 'armor.shell' }))],
    ['record fitted to another host', build(base({ hostInstanceId: 'inst-bbbbbb02' }))],
    ['unknown part id', build(base({ id: 'not-a-real-part' }))]
  ];
  for (const [label, d] of cases) {
    const id = d.system.installedSystems[Object.keys(d.system.installedSystems)[0]];
    assert.equal(listConfirmedHostInstances(d).length, 0, `${label}: not a confirmed host`);
    assert.equal(collectInstalledComponentEvidence(d).confirmedAppendages.length, 0, `${label}: not confirmed appendage evidence`);
    assert.equal(deriveHostAppendageBase(d, typed, { id: id.id === 'hand' ? 'hand' : id.id, instanceId: 'inst-aaaaaa01' }).status, 'BLOCKED', `${label}: no host base`);
  }
  // ledger / mirror disagreement: no host is confirmed until reconciled
  const lostMirror = build(base(), []);
  assert.equal(listConfirmedHostInstances(lostMirror).length, 0);
  assert.equal(deriveHostAppendageBase(lostMirror, typed, sel).status, 'BLOCKED');
  const ghostMirror = build(base(), [{ id: 'hand', instanceId: 'inst-aaaaaa01', locationId: 'appendage-slot-1' }, { id: 'claw', instanceId: 'inst-ffffff09', locationId: 'appendage-slot-2' }]);
  assert.equal(listConfirmedHostInstances(ghostMirror).length, 0);
  // removed host
  assert.equal(deriveHostAppendageBase(makeDroid(), typed, sel).status, 'BLOCKED');
  // the engine agrees (same authority): fitting to an unconfirmed host is refused with the host reason
  for (const [label, d] of cases) {
    const p = DroidCustomizationEngine.previewDroidCustomization(d, { add: [{ id: 'climbing-claws', hostInstanceId: 'inst-aaaaaa01' }] });
    assert.equal(p.success, false, label);
    assert.ok(['Host appendage not installed', 'Inconsistent appendage records'].includes(p.blockingReason), `${label}: refused at host/record validation, before any price (got ${p.blockingReason})`);
  }
  ok('host evidence: installed:false / no location / non-appendage / fitted-to-other / unknown part / mirror disagreement / removed are never hosts; engine agrees');
}

// 13. Post-creation quotes cannot gain clearance from caller claims.
{
  const actor = makeDroid({ droidSystems: { locomotion: { id: 'walking', speed: 6 } } });
  const forged = { operationPhase: 'INITIAL_BUILD', locomotionSlotOrdinal: 1, restrictedLocomotion: false, size: 'huge', baseLocomotionCost: 1, selectedInstalledShieldRating: 20, appendageBaseCost: 1, appendageBaseWeight: 1 };
  const locomotion = schema.getAllDroidPartDefinitions().filter(d => String(d.sourcePath).toLowerCase().includes('locomotion'));
  assert.ok(locomotion.length >= 8);
  let held = 0;
  for (const def of locomotion) {
    const honest = resolveDroidPartQuote(actor, def.id, { speed: 6 });
    const claimed = resolveDroidPartQuote(actor, def.id, { speed: 6, ...forged });
    assert.deepEqual(claimed, honest, `${def.id}: forged context changes nothing`);
    if (honest.status === 'NEEDS_SOURCE_ADJUDICATION') held += 1;
  }
  assert.ok(held >= 5, 'the source-HOLD locomotion records stay held post-creation (no INITIAL_BUILD claim)');
  assert.equal(resolveDroidPartQuote(actor, 'walking', forged).status, 'NEEDS_SOURCE_ADJUDICATION');
  // size comes from the actor only
  const small = makeDroid({ droidSystems: { size: 'small' } });
  assert.deepEqual(resolveDroidPartQuote(small, 'hand', { size: 'colossal' }), resolveDroidPartQuote(small, 'hand'));
  assert.notEqual(resolveDroidPartQuote(small, 'hand').credits, resolveDroidPartQuote(makeDroid(), 'hand').credits, 'size matters, so the override test is meaningful');
  ok('forged operationPhase / slot ordinal / restricted flag / size / base costs are ignored; locomotion HOLDs stay held');
}

// 14. Installed shield rating comes from confirmed hardware, never from the caller.
{
  const bare = makeDroid();
  const claim = o => resolveDroidPartQuote(bare, 'shield-expansion-module', o);
  assert.deepEqual(claim({ selectedInstalledShieldRating: 20 }), claim({}), 'a claimed rating on a droid with no generator changes nothing');
  assert.notEqual(claim({ selectedInstalledShieldRating: 10 }).status, 'OK');
  const withGen = makeDroid({ installedSystems: { 'sr10-shield-generator': { id: 'sr10-shield-generator', installed: true } } });
  assert.equal(deriveInstalledShieldRating(collectInstalledComponentEvidence(withGen).confirmedIds), 10);
  assert.deepEqual(resolveDroidPartQuote(withGen, 'shield-expansion-module', { selectedInstalledShieldRating: 20 }), resolveDroidPartQuote(withGen, 'shield-expansion-module', {}), 'the derived rating wins over a claim');
  const draftGen = makeDroid({ droidSystems: { accessories: [{ id: 'sr10-shield-generator' }] } });
  assert.equal(deriveInstalledShieldRating(collectInstalledComponentEvidence(draftGen).confirmedIds), null, 'a draft/mirror generator is not confirmed hardware');
  const two = makeDroid({ installedSystems: { 'sr5-shield-generator': { id: 'sr5-shield-generator' }, 'sr10-shield-generator': { id: 'sr10-shield-generator' } } });
  assert.equal(deriveInstalledShieldRating(collectInstalledComponentEvidence(two).confirmedIds), null, 'several generators are ambiguous, never guessed');
  ok('installed shield rating: derived from confirmed hardware only; none / draft / several => no rating');
}

// 15. A mirror-only backup processor never authorizes a second primary processor.
{
  const primary = { processor: { id: 'basic-processor' } };
  for (const [label, ds] of [
    ['processorSlots.backup mirror', { ...primary, processorSlots: { backup: { id: 'backup-processor', active: false } } }],
    ['backupProcessor mirror', { ...primary, backupProcessor: { id: 'backup-processor', active: false } }],
    ['stock blob processorEnhancements', { ...primary, processorEnhancements: [{ id: 'backup-processor' }] }]
  ]) {
    const d = makeDroid({ droidSystems: ds });
    const h = DroidCustomizationEngine.getAvailableSystems(d).systems.find(x => x.id === 'heuristic-processor');
    assert.equal(h.compatible, false, `${label}: no backup slot`);
    assert.ok(h.eligibility.reasons.some(r => r.code === 'PRIMARY_PROCESSOR_PRESENT'), label);
    const p = DroidCustomizationEngine.previewDroidCustomization(d, { add: ['heuristic-processor'] });
    assert.equal(p.success, false, `${label}: preview refuses`);
    resetFakeActorEngine();
    const r = await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['heuristic-processor'] });
    assert.equal(r.success, false, `${label}: apply refuses`);
    assert.equal(fakeActorEngineCallLog.length, 0, `${label}: nothing mutated`);
  }
  const confirmed = makeDroid({ droidSystems: primary, installedSystems: { 'backup-processor': { id: 'backup-processor', installed: true } } });
  assert.equal(DroidCustomizationEngine.getAvailableSystems(confirmed).systems.find(x => x.id === 'heuristic-processor').compatible, true, 'a LEDGER backup processor does');
  ok('backup slot: mirror / blob records never authorize a second primary processor; a ledger record does');
}

console.log(`Droid Wave 2B installation eligibility tests passed (${n} groups).`);
