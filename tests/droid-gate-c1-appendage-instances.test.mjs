import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Droid Gate C-1 -- physical appendage instance identity through the single
// installation authority (DroidCustomizationEngine), the read model
// (resolver / E2A projection) and the display mirror.
//
// Source basis (not a ruling): Core p.190 -- a droid may have ANY number of
// appendages; their number does not add actions or attacks. So same-kind
// appendages must be distinguishable (distinct instance + location) and no
// capacity, anatomy or capability is invented. Coverage tier: direct
// production-path (real engine, real catalog, real quote authority; only
// ActorEngine is the shared fake).

registerFoundryPathLoader();

const SYSTEM_ID = 'foundryvtt-swse';

function makeActorsCollection(actors = []) {
  const map = new Map(actors.map(a => [a.id, a]));
  return { get: (id) => map.get(id), set: (id, actor) => map.set(id, actor), [Symbol.iterator]: () => map.values() };
}
function makeFakeDroid({ credits = 10000, installedSystems = {}, droidSystems = {}, items = [] } = {}) {
  const actor = {
    id: 'droid-1', name: 'Test Droid', type: 'droid', uuid: 'Actor.droid-1', isOwner: true,
    system: { credits, droidSystems: { size: 'medium', ...droidSystems }, installedSystems },
    img: 'icons/x.png', items, effects: [], flags: { [SYSTEM_ID]: {}, swse: {} },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    toObject() {
      return JSON.parse(JSON.stringify({ system: actor.system, name: actor.name, img: actor.img, prototypeToken: actor.prototypeToken, items: actor.items, effects: actor.effects, flags: actor.flags }));
    }
  };
  return actor;
}
function asGM(actors = []) {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, actors: makeActorsCollection(actors), users: [] } });
}

const { fakeActorEngineCallLog, resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { DroidCustomizationEngine } = await import('../scripts/engine/customization/droid-customization-engine.js');
const { computeDroidPartCost, getDroidPartDefinition, normalizeDroidPartId } = await import('../scripts/data/droid-part-schema.js');
const { resolveInstalledDroidComponents } = await import('../scripts/domain/droids/droid-installed-component-resolver.js');
const { listLedgerInstances, auditAppendageMirror } = await import('../scripts/domain/droids/droid-appendage-instance.js');
const { projectActorDroidAppendages } = await import('../scripts/engine/equipment/droid-appendage-projection.js');
const { evaluateDroidComponentPrerequisites } = await import('../scripts/domain/droids/droid-component-prerequisites.js');

const resolve = (actor) => resolveInstalledDroidComponents(actor, { normalizeId: normalizeDroidPartId, getDefinition: getDroidPartDefinition });
const seqSource = (...values) => { const q = [...values]; return () => q.shift(); };
const handCost = (actor) => computeDroidPartCost(actor, { id: 'hand' });
let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);

// 1. First hand: one minted physical instance in the LEDGER, mirrored (not
// duplicated) in droidSystems; no invented anatomy; wallet debited once.
const droid = makeFakeDroid();
{
  resetFakeActorEngine(); asGM();
  const cost = handCost(droid);
  assert.ok(Number.isFinite(cost) && cost > 0, 'hand has a source-reviewed quote');
  const r = await DroidCustomizationEngine.applyDroidCustomization(droid, { add: ['hand'] }, { idSource: seqSource('aaaaaa01') });
  assert.equal(r.success, true, r.error);
  const { instances, malformed } = listLedgerInstances(droid.system.installedSystems);
  assert.equal(malformed.length, 0);
  assert.equal(instances.length, 1);
  assert.equal(instances[0].instanceId, 'inst-aaaaaa01');
  assert.equal(instances[0].partId, 'hand');
  assert.equal(instances[0].locationId, 'appendage-slot-1', 'an opaque token, not "left-arm"');
  assert.equal(Object.keys(droid.system.installedSystems).length, 1, 'exactly one ledger record per physical component');
  assert.equal(droid.system.installedSystems['hand'], undefined, 'no part-keyed record is written for an instance');
  assert.equal(droid.system.droidSystems.appendages.length, 1);
  assert.equal(droid.system.droidSystems.appendages[0].instanceId, 'inst-aaaaaa01');
  assert.deepEqual(auditAppendageMirror(droid.system.installedSystems, droid.system.droidSystems), [], 'ledger and display mirror agree');
  assert.equal(droid.system.credits, 10000 - cost);
  assert.equal(r.applied.systemsAdded[0].instanceId, 'inst-aaaaaa01', 'the caller learns the minted identity');
  ok('first hand: ledger instance + consistent mirror, opaque location, single debit');
}

// 2. Second hand is a DIFFERENT instance, not a rejected duplicate. Core p.190.
{
  resetFakeActorEngine(); asGM();
  const before = droid.system.credits;
  const r = await DroidCustomizationEngine.applyDroidCustomization(droid, { add: ['hand'] }, { idSource: seqSource('aaaaaa01', 'bbbbbb02') });
  assert.equal(r.success, true, r.error);
  const { instances } = listLedgerInstances(droid.system.installedSystems);
  assert.deepEqual(instances.map(i => i.instanceId).sort(), ['inst-aaaaaa01', 'inst-bbbbbb02'], 'a colliding draw was re-minted');
  assert.deepEqual(instances.map(i => i.locationId).sort(), ['appendage-slot-1', 'appendage-slot-2']);
  assert.equal(droid.system.droidSystems.appendages.length, 2);
  assert.equal(before - droid.system.credits, handCost(droid), 'charged for the second hand once');
  const hands = resolve(droid).components.filter(c => c.canonicalId === 'hand');
  assert.equal(hands.length, 2, 'the read model keeps two hands as two components');
  assert.deepEqual(hands.map(c => c.instanceId).sort(), ['inst-aaaaaa01', 'inst-bbbbbb02']);
  ok('second hand: distinct instance + location, resolver keeps two components, charged once');
}

// 3. A claw and a tool alongside: kinds mix freely, nothing is capped.
{
  resetFakeActorEngine(); asGM();
  for (const part of ['claw', 'tool', 'tool']) {
    const r = await DroidCustomizationEngine.applyDroidCustomization(droid, { add: [part] });
    assert.equal(r.success, true, `${part}: ${r.error}`);
  }
  const { instances, malformed } = listLedgerInstances(droid.system.installedSystems);
  assert.equal(malformed.length, 0);
  assert.equal(instances.length, 5);
  assert.equal(new Set(instances.map(i => i.instanceId)).size, 5);
  assert.equal(new Set(instances.map(i => i.locationId)).size, 5);
  assert.deepEqual(auditAppendageMirror(droid.system.installedSystems, droid.system.droidSystems), []);
  ok('hand x2 + claw + tool x2 coexist with five distinct identities (no capacity invented)');
}

// 4. Duplicate string ids in ONE request still collapse (exploit closure):
// two purchases are two requests.
{
  asGM();
  const fresh = makeFakeDroid();
  const p = DroidCustomizationEngine.previewDroidCustomization(fresh, { add: ['hand', 'hand'] });
  assert.equal(p.success, true, p.error);
  assert.equal(p.preview.systemsAdded.length, 1, 'duplicate add ids in one request collapse to one purchase');
  assert.equal(p.preview.totalAddCost, handCost(fresh));
  ok('duplicate add ids in a single request still collapse to one purchase');
}

// 5. Source projection: ledger-confirmed instances are the evidence the E2A
// projection was waiting for. Slot and instance are both confirmed and
// distinct; capabilities stay tri-state (canHold/canWield remain unknown).
{
  const proj = projectActorDroidAppendages(droid);
  assert.equal(proj.appendages.length, 5);
  assert.equal(new Set(proj.appendages.map(a => a.identity.instance)).size, 5);
  assert.equal(new Set(proj.appendages.map(a => a.identity.slot)).size, 5);
  for (const a of proj.appendages) {
    assert.equal(a.functionalState, 'functional');
    assert.equal(a.capabilities.canHold, null);
    assert.equal(a.capabilities.canWield, null);
    assert.equal(a.identity.part, a.identity.part.toLowerCase());
  }
  assert.deepEqual(proj.unresolvedRecords, [], 'nothing left unresolved when every record is ledger-confirmed');
  ok('projection promotes five ledger-confirmed appendages; capabilities not invented');
}

// 6. Legacy part-keyed evidence stays unresolved and never merges into an instance.
{
  const legacy = makeFakeDroid({ installedSystems: { hand: { installed: true, enabled: true } } });
  asGM();
  const p0 = projectActorDroidAppendages(legacy);
  assert.deepEqual(p0.appendages, []);
  assert.equal(p0.unresolvedRecords.length, 1);
  resetFakeActorEngine();
  const r = await DroidCustomizationEngine.applyDroidCustomization(legacy, { add: ['hand'] }, { idSource: seqSource('cccccc03') });
  assert.equal(r.success, true, r.error);
  const comps = resolve(legacy).components.filter(c => c.canonicalId === 'hand');
  assert.equal(comps.length, 2, 'legacy record and the new instance are separate components');
  const p1 = projectActorDroidAppendages(legacy);
  assert.equal(p1.appendages.length, 1, 'only the instance is a confirmed appendage');
  assert.equal(p1.unresolvedRecords.length, 1, 'the legacy record stays unresolved evidence');
  ok('legacy part-keyed record never becomes an instance; only the minted one is confirmed');
}

// 7. Removal names ONE instance; siblings and their mirror rows are untouched.
{
  resetFakeActorEngine(); asGM();
  const d = makeFakeDroid();
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seqSource('aaaaaa01') });
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seqSource('bbbbbb02') });
  const credits = d.system.credits;
  const resale = Math.floor(handCost(d) * 0.5);
  const r = await DroidCustomizationEngine.applyDroidCustomization(d, { remove: [{ id: 'hand', instanceId: 'inst-aaaaaa01' }] });
  assert.equal(r.success, true, r.error);
  assert.deepEqual(listLedgerInstances(d.system.installedSystems).instances.map(i => i.instanceId), ['inst-bbbbbb02']);
  assert.deepEqual(d.system.droidSystems.appendages.map(a => a.instanceId), ['inst-bbbbbb02']);
  assert.equal(d.system.credits - credits, resale, 'resale paid once, for one hand');
  assert.deepEqual(auditAppendageMirror(d.system.installedSystems, d.system.droidSystems), []);
  ok('removing one named hand leaves its sibling and pays resale once');
}

// 8. A bare part id that matches several instances is AMBIGUOUS and refused (no guess, no mutation).
{
  resetFakeActorEngine(); asGM();
  const d = makeFakeDroid();
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seqSource('aaaaaa01') });
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seqSource('bbbbbb02') });
  resetFakeActorEngine();
  const snapshot = JSON.stringify(d.system);
  const p = DroidCustomizationEngine.previewDroidCustomization(d, { remove: ['hand'] });
  assert.equal(p.success, false);
  assert.equal(p.blockingReason, 'Ambiguous instance');
  const r = await DroidCustomizationEngine.applyDroidCustomization(d, { remove: ['hand'] });
  assert.equal(r.success, false);
  assert.equal(fakeActorEngineCallLog.length, 0, 'no mutation on an ambiguous request');
  assert.equal(JSON.stringify(d.system), snapshot, 'droid state untouched');
  // exactly one instance of a kind: a bare id is unambiguous
  const single = makeFakeDroid();
  await DroidCustomizationEngine.applyDroidCustomization(single, { add: ['claw'] }, { idSource: seqSource('dddddd04') });
  const ok1 = await DroidCustomizationEngine.applyDroidCustomization(single, { remove: ['claw'] });
  assert.equal(ok1.success, true, ok1.error);
  assert.equal(listLedgerInstances(single.system.installedSystems).instances.length, 0);
  ok('bare id with several instances is refused untouched; with exactly one it is unambiguous');
}

// 9. Removal of an unknown / mismatched / repeated instance.
{
  resetFakeActorEngine(); asGM();
  const d = makeFakeDroid();
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seqSource('aaaaaa01') });
  const unknown = DroidCustomizationEngine.previewDroidCustomization(d, { remove: [{ id: 'hand', instanceId: 'inst-zzzzzz99' }] });
  assert.equal(unknown.success, false); assert.equal(unknown.blockingReason, 'Not installed');
  const wrongKind = DroidCustomizationEngine.previewDroidCustomization(d, { remove: [{ id: 'claw', instanceId: 'inst-aaaaaa01' }] });
  assert.equal(wrongKind.success, false, 'an instance id cannot be sold as a different part');
  const twice = DroidCustomizationEngine.previewDroidCustomization(d, { remove: [{ id: 'hand', instanceId: 'inst-aaaaaa01' }, { id: 'hand', instanceId: 'inst-aaaaaa01' }, 'hand'] });
  assert.equal(twice.success, true, twice.error);
  assert.equal(twice.preview.systemsRemoved.length, 1, 'the same instance named three ways is sold once');
  assert.equal(twice.preview.totalRemoveSale, Math.floor(handCost(d) * 0.5));
  ok('unknown / mismatched instance refused; repeated references to one instance resell once');
}

// 10. Host binding. climbing-claws is typed requiresAppendage ['hand','claw'] but is on source HOLD:
// host selection must be required, and a selected host must NOT unblock a HOLD.
{
  resetFakeActorEngine(); asGM();
  const d = makeFakeDroid();
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['claw'] }, { idSource: seqSource('aaaaaa01') });
  const noHost = DroidCustomizationEngine.previewDroidCustomization(d, { add: ['climbing-claws'] });
  assert.equal(noHost.success, false);
  assert.equal(noHost.blockingReason, 'Host appendage required');
  const missingHost = DroidCustomizationEngine.previewDroidCustomization(d, { add: [{ id: 'climbing-claws', hostInstanceId: 'inst-zzzzzz99' }] });
  assert.equal(missingHost.success, false);
  assert.equal(missingHost.blockingReason, 'Host appendage not installed');
  const held = DroidCustomizationEngine.previewDroidCustomization(d, { add: [{ id: 'climbing-claws', hostInstanceId: 'inst-aaaaaa01' }] });
  assert.equal(held.success, false, 'a valid host does not override a source-review HOLD');
  assert.match(String(held.error), /HOLD|source/i);
  // host binding on something that does not attach to an appendage is refused, not silently ignored
  const unsupported = DroidCustomizationEngine.previewDroidCustomization(d, { add: [{ id: 'plasteel-shell', hostInstanceId: 'inst-aaaaaa01' }] });
  assert.equal(unsupported.success, false);
  assert.equal(unsupported.blockingReason, 'Host binding not supported');
  ok('host required; unknown host refused; valid host cannot lift a source HOLD; stray host refused');
}

// 11. The typed Gate A prerequisite now receives a real, ledger-derived
// instance, so a host of the right kind passes and the wrong kind is refused.
{
  const d = makeFakeDroid();
  asGM(); resetFakeActorEngine();
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seqSource('aaaaaa01') });
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['probe'] }, { idSource: seqSource('bbbbbb02') });
  const definition = { id: 'synthetic-hand-only-fitting', requiresAppendage: ['hand'] };
  const input = (instanceId, id) => ({ definition, size: 'medium', droidSystems: d.system.droidSystems, installedComponentIds: [], selectedAppendage: { id, instanceId } });
  assert.equal(evaluateDroidComponentPrerequisites(input('inst-aaaaaa01', 'hand')).status, 'PREREQUISITES_MET');
  assert.equal(evaluateDroidComponentPrerequisites(input('inst-bbbbbb02', 'probe')).status, 'BLOCKED', 'a probe is not a hand');
  assert.equal(evaluateDroidComponentPrerequisites(input('inst-aaaaaa01', 'probe')).status, 'BLOCKED', 'an instance id cannot be presented as another kind');
  assert.equal(evaluateDroidComponentPrerequisites(input('inst-zzzzzz99', 'hand')).status, 'BLOCKED', 'an unknown instance proves nothing');
  ok('typed prerequisite accepts only the ledger-minted instance of the right kind');
}

// 12. Host with fitted components cannot be removed from under them.
{
  resetFakeActorEngine(); asGM();
  const d = makeFakeDroid({
    installedSystems: {
      'hand--inst-aaaaaa01': { id: 'hand', instanceId: 'inst-aaaaaa01', locationId: 'appendage-slot-1', name: 'Hand', category: 'appendage', slot: 'appendage' },
      'telescopic-appendage': { id: 'telescopic-appendage', hostInstanceId: 'inst-aaaaaa01', name: 'Telescopic Appendage', category: 'appendage', slot: 'appendage.enhancement' }
    },
    droidSystems: { appendages: [{ id: 'hand', instanceId: 'inst-aaaaaa01', locationId: 'appendage-slot-1' }] }
  });
  const blocked = DroidCustomizationEngine.previewDroidCustomization(d, { remove: [{ id: 'hand', instanceId: 'inst-aaaaaa01' }] });
  assert.equal(blocked.success, false);
  assert.equal(blocked.blockingReason, 'Appendage has fitted components');
  const r = await DroidCustomizationEngine.applyDroidCustomization(d, { remove: [{ id: 'hand', instanceId: 'inst-aaaaaa01' }] });
  assert.equal(r.success, false);
  assert.equal(fakeActorEngineCallLog.length, 0);
  // removing the fitting in the same change is allowed to proceed past the guard
  const both = DroidCustomizationEngine.previewDroidCustomization(d, { remove: [{ id: 'hand', instanceId: 'inst-aaaaaa01' }, 'telescopic-appendage'] });
  assert.notEqual(both.blockingReason, 'Appendage has fitted components');
  // fitting to a host that the same change removes is refused
  const removeAndFit = DroidCustomizationEngine.previewDroidCustomization(d, { remove: [{ id: 'hand', instanceId: 'inst-aaaaaa01' }], add: [{ id: 'climbing-claws', hostInstanceId: 'inst-aaaaaa01' }] });
  assert.equal(removeAndFit.success, false);
  ok('a host with fitted components is protected; same-change removal is not blocked; fitting to a removed host is refused');
}

// 13. Inconsistent ledger/mirror: nothing is mutated until reconciled.
{
  resetFakeActorEngine(); asGM();
  const d = makeFakeDroid({
    installedSystems: { 'hand--inst-aaaaaa01': { id: 'hand', instanceId: 'inst-aaaaaa01', locationId: 'appendage-slot-1' } },
    droidSystems: { appendages: [] }   // mirror lost the instance
  });
  const r = await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['claw'] });
  assert.equal(r.success, false);
  assert.equal(r.blockingReason, 'Inconsistent appendage records');
  assert.equal(fakeActorEngineCallLog.length, 0);
  ok('ledger/mirror disagreement blocks every customization until reconciled');
}

// 14. Insufficient funds: no identity is minted, nothing is written.
{
  resetFakeActorEngine(); asGM();
  const d = makeFakeDroid({ credits: 1 });
  const r = await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seqSource('aaaaaa01') });
  assert.equal(r.success, false);
  assert.deepEqual(d.system.installedSystems, {});
  assert.equal(d.system.credits, 1);
  assert.equal(fakeActorEngineCallLog.length, 0);
  ok('unaffordable hand: no instance, no mutation, no debit');
}

// 15. Non-appendage parts are unchanged: part-keyed, no identity fields, still one-per-droid.
{
  resetFakeActorEngine(); asGM();
  const d = makeFakeDroid();
  const r = await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['plasteel-shell'] });
  assert.equal(r.success, true, r.error);
  const entry = d.system.installedSystems['plasteel-shell'];
  assert.ok(entry);
  assert.equal(entry.instanceId, undefined);
  assert.equal(entry.locationId, undefined);
  const again = DroidCustomizationEngine.previewDroidCustomization(d, { add: ['plasteel-shell'] });
  assert.equal(again.success, false);
  assert.match(again.error, /already installed/);
  ok('non-appendage components keep part-keyed, single-instance behaviour');
}

// 16. Fittings vs limbs. Parts with the appendage CATEGORY that are not base
// appendages are fitted TO an appendage and are routed to their own mirror list.
// (No such fitting is purchasable today -- every one is source-HOLD or fail-closed
// pending a host-priced quote -- so the routing is proven on the pure classifier.)
{
  const { appendageMirrorBucket } = await import('../scripts/domain/droids/droid-appendage-instance.js');
  assert.equal(appendageMirrorBucket({ category: 'appendage', slot: 'appendage' }), 'appendages');
  for (const slot of ['appendage.enhancement', 'appendage.mount', 'appendage.weapon', 'appendage.utility', 'appendage.shield', 'appendage.toolWeapon']) {
    assert.equal(appendageMirrorBucket({ category: 'appendage', slot }), 'appendageEnhancements', slot);
  }
  assert.equal(appendageMirrorBucket({ category: 'accessory', slot: 'appendage' }), null);
  ok('fittings route to appendageEnhancements; only base appendages enter the physical list');
}

// 16b. KNOWN CATALOG CLASSIFICATION -- recorded as DROID-RD-001 (DEFERRED_RULES_REVIEW), pinned here
// so any future change is deliberate. The catalog files "Stabilized Mount" (a base-list record whose id
// is "mount"; a request for "stabilized-mount" resolves to it by name) in its BASE appendage list (slot "appendage", canManipulate:false), and the E2A projection already
// reports it as an appendage record. The printed Core text describes it as an upgrade of a TOOL
// appendage. Gate C-1 follows the repo's existing classification and decides nothing: the record is
// an instance with canManipulate:false, so it can never become a manipulator.
{
  resetFakeActorEngine(); asGM();
  const d = makeFakeDroid();
  assert.ok(getDroidPartDefinition('stabilized-mount'), 'catalog overlay definition exists');
  assert.equal(getDroidPartDefinition('mount').slot, 'appendage');
  const r = await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['stabilized-mount'] }, { idSource: seqSource('eeeeee05') });
  assert.equal(r.success, true, r.error);
  const proj = projectActorDroidAppendages(d);
  assert.equal(proj.appendages.length, 1);
  assert.equal(proj.appendages[0].identity.part, 'mount', 'the request resolved to the base-list record');
  assert.equal(proj.appendages[0].capabilities.canManipulate, false, 'a mount never becomes a manipulator');
  ok('DROID-RD-001 pinned: catalog "mount" is classified as a base appendage with canManipulate:false');
}

// 17. getAvailableSystems: owning a hand does not make the kind "already installed".
{
  asGM();
  const d = makeFakeDroid();
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seqSource('aaaaaa01') });
  const systems = DroidCustomizationEngine.getAvailableSystems(d).systems;
  const hand = systems.find(s => s.id === 'hand');
  assert.equal(hand.installed, false);
  assert.equal(hand.instanceCount, 1);
  const shell = systems.find(s => s.id === 'plasteel-shell');
  assert.equal(shell.installed, false);
  console.log(`  [${++n}] Garage catalog: hand is repeatable (instanceCount ${hand.instanceCount}) OK`);
}

console.log(`Droid Gate C-1 appendage instance tests passed (${n} groups).`);
