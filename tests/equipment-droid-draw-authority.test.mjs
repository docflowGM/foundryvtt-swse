import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Droid weapon Draw authority. Who follows Droid rules is the Droid rules profile's answer (an NPC-type Droid Follower included); a Droid-rules
// actor is exempt from BIOLOGICAL species evidence only. Its anatomy is confirmed installed-component evidence; occupancy, grip, capability, cost
// and authorization are still the existing owners'. Biological actors still need species evidence; contradictory classification fails closed.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { readActorEquipmentState } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-reader.js');
const { resolveDroidRulesProfile } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-rules-profile.js');
const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');
const h = installCoordinatorHarness(ActorEngine);

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const setPath = (obj, path, value) => { const parts = path.split('.'); let node = obj; for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {}); node[parts.at(-1)] = value; };
const weapon = (id, extra = {}) => ({ id, name: id, type: 'weapon', system: { weight: 1, activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...REC('STOWED', null, []), ...extra }, flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } } });
const mk = (type, system, items, flags = {}) => { system = { size: 'Medium', ...system }; items.get = (id) => items.find((i) => i.id === id); const a = { id: `${type}-x`, type, items, system, flags: { swse: flags } }; for (const i of items) i.actor = a; return a; };
// explicit-capability ledger appendages (the shape the existing installed-component resolver produces)
const comp = (i, { enabled = true } = {}) => ({ canonicalId: 'hand', definition: { slot: 'appendage', category: 'appendage', appendageType: 'hand', source: { canHold: true, canWield: true, canManipulate: true, features: [] } }, slot: 'appendage', category: 'appendage', installed: true, enabled, active: false, instanceId: `i${i}`, locationId: `l${i}`, primarySource: { kind: 'installedLedger' }, sources: [{ kind: 'installedLedger', installed: true, enabled }] });
const hands = (count, opts = {}) => ({ components: Array.from({ length: count }, (_, k) => comp(k + 1, opts.disabled?.includes(k + 1) ? { enabled: false } : {})) });
const ledger = { installedSystems: Object.fromEntries([1, 2].map((i) => [`hand-${i}`, { id: 'hand', instanceId: `i${i}`, locationId: `l${i}`, installed: true, enabled: true }])) };
const spends = [];
const baseDeps = { ...h.deps, ledger: new Map(), isGm: () => true, resolveActionCost: async (_a, _it, dir) => (dir === 'draw' ? 'move' : 'swift'), isLightsaber: async () => false, spendAction: async (_a, type, meta) => { spends.push({ type, meta }); return { allowed: true, committed: true }; }, spendMarkerPresent: async () => false,
  writeItems: async (a, ups) => { for (const u of ups) { const it = a.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); } },
  writeJournal: async (a, stored) => { a.flags.swse.equipmentTxn = JSON.parse(JSON.stringify(stored)); } };
const noSpecies = async () => ({ status: 'unavailable', profile: null, reason: 'actor-species-not-recorded', evidence: { speciesName: null, variantId: null } });
const depsFor = (actor, { components, species = 'none' } = {}) => ({ ...baseDeps, ...(species === 'none' ? { loadSpecies: noSpecies } : {}), ...(components ? { reader: { getInstalledComponents: () => components } } : {}) });
const snap = (a) => JSON.stringify(Array.from(a.items).map(({ actor: _a, ...i }) => i));
const ready = (id, appendageIds, grip = 'one-handed') => ({ type: 'ready', itemId: id, appendageIds, grip });
const run = (actor, intent, deps) => InventoryEngine.requestWeaponPosture(actor, intent, { deps });
const refusedClean = async (actor, intent, deps, label) => { const before = snap(actor); const sp = spends.length; const r = await run(actor, intent, deps); assert.equal(r.ok, false, `${label}: refused`); assert.equal(snap(actor), before, `${label}: nothing written`); assert.equal(spends.length, sp, `${label}: nothing spent`); return r; };

// 1/2. biological actors still need species evidence; with it, a Character draws
{
  const pc = mk('character', { size: 'Medium' }, [weapon('s')]);
  const okRes = await run(pc, ready('s', ['natural-arm-1']), { ...baseDeps });
  assert.equal(okRes.ok, true); assert.equal(pc.items.get('s').system.weaponPosture, 'READIED');
  const npc = mk('npc', { size: 'Medium' }, [weapon('s')]);
  const r = await refusedClean(npc, ready('s', ['natural-arm-1']), { ...baseDeps, loadSpecies: noSpecies }, 'biological NPC without species evidence');
  assert.ok(JSON.stringify(r).includes('species-evidence-unavailable'));
  ok('1-2: a biological Character draws with species evidence; a biological NPC without it is still refused (species gate preserved), no write or spend');
}

// 3/5. standard Droid with certified appendages; multi-appendage Droid (four): independent hands, no species evidence needed
{
  const d = mk('droid', {}, [weapon('a'), weapon('b'), weapon('c')]);
  const deps = depsFor(d, { components: hands(4) });
  const rd = await run(d, ready('a', ['hand:i1']), deps);
  assert.equal(rd.ok, true, JSON.stringify(rd)); assert.equal(d.items.get('a').system.weaponPosture, 'READIED');
  assert.deepEqual(d.items.get('a').system.weaponOccupancy.appendageIds, ['hand:i1']);
  assert.equal((await run(d, ready('b', ['hand:i3']), deps)).ok, true); assert.equal((await run(d, ready('c', ['hand:i4']), deps)).ok, true);
  const st = readActorEquipmentState(d, deps.reader);
  assert.deepEqual([...st.summary.readied].sort(), ['a', 'b', 'c']); assert.equal(st.anatomy.appendages.length, 4);
  ok('3,5: a Droid with certified appendages draws without species evidence; a four-appendage Droid holds three weapons in three distinct appendages');
}

// 6. NPC-type Droid Follower: classified by the rules profile, not the Foundry type
{
  const f = mk('npc', { isDroid: true }, [weapon('s')], { follower: { isFollower: true } });
  assert.equal(resolveDroidRulesProfile(f).droidRules.isDroid, true);
  const r = await run(f, ready('s', ['hand:i1']), depsFor(f, { components: hands(2) }));
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(readActorEquipmentState(f, { getInstalledComponents: () => hands(2) }).anatomy.appendages.length, 2);
  ok('6: an NPC-type Droid Follower is recognised by the Droid rules profile (anatomy and coordinator agree) and can draw');
}

// 7. contradictory classification fails closed
{
  const c = mk('droid', { isDroid: false }, [weapon('s')]);
  assert.equal(resolveDroidRulesProfile(c).confidence, 'CONTRADICTORY');
  const r = await refusedClean(c, ready('s', ['hand:i1']), depsFor(c, { components: hands(2) }), 'contradictory droid classification');
  assert.ok(JSON.stringify(r).includes('droid-classification-contradictory'));
  const st = readActorEquipmentState(c, { getInstalledComponents: () => hands(2) });
  assert.equal(st.droidRules.isDroid, false); assert.equal(st.droidRules.confidence, 'CONTRADICTORY');
  ok('7: contradictory Droid classification is treated as neither kind: the draw is refused and the reader reports the conflict');
}

// 4/8/9. unresolved appendages, disabled appendage, unknown wielding capability: refused, nothing written or spent
{
  const unresolved = mk('droid', { installedSystems: { hand: { installed: true, enabled: true } } }, [weapon('s')]); // part-keyed record, no instance/location
  await refusedClean(unresolved, ready('s', ['hand']), depsFor(unresolved), 'unresolved appendages (default resolver)');
  const off = mk('droid', {}, [weapon('s')]);
  await refusedClean(off, ready('s', ['hand:i1']), depsFor(off, { components: hands(2, { disabled: [1] }) }), 'disabled appendage');
  assert.equal((await run(off, ready('s', ['hand:i2']), depsFor(off, { components: hands(2, { disabled: [1] }) }))).ok, true, 'the enabled appendage still works');
  const unknown = mk('droid', ledger, [weapon('s')]); // real catalog hand: canHold/canWield are not recorded
  const st = readActorEquipmentState(unknown, {});
  assert.equal(st.anatomy.appendages.length, 2); assert.ok(st.anatomy.appendages.every((a) => a.capabilities.canHold === null && a.capabilities.canWield === null));
  await refusedClean(unknown, ready('s', ['hand:i1']), depsFor(unknown), 'unknown wielding capability (catalog does not record canHold/canWield)');
  ok('4,8,9: unresolved appendages, a disabled appendage and unknown hold/wield capability all refuse the draw with no write or spend (unknown is never permission)');
}

// 10/11. two-handed occupancy across two appendages; a collision is never resolved silently
{
  const d = mk('droid', {}, [weapon('two'), weapon('other')]);
  const deps = depsFor(d, { components: hands(3) });
  const r2 = await run(d, ready('two', ['hand:i1', 'hand:i2'], 'two-handed'), deps);
  assert.equal(r2.ok, true, JSON.stringify(r2)); assert.deepEqual(d.items.get('two').system.weaponOccupancy.appendageIds, ['hand:i1', 'hand:i2']);
  await refusedClean(d, ready('other', ['hand:i2']), deps, 'collision with an existing weapon');
  assert.equal((await run(d, ready('other', ['hand:i3']), deps)).ok, true);
  ok('10-11: a two-handed draw occupies two appendages; a third weapon cannot take an occupied appendage (refused, nothing displaced) but can use a free one');
}

// 12. integrated weapon with uncertified Item binding is not certified
{
  const d = mk('droid', {}, [weapon('int', { integrated: true })]);
  const st = readActorEquipmentState(d, { getInstalledComponents: () => hands(2) });
  const w = st.weapons.find((x) => x.itemId === 'int');
  assert.equal(w.pending?.kind, 'integrated-droid-weapon'); assert.equal(w.pending?.reason, 'droid-installation-identity-not-certified');
  await refusedClean(d, ready('int', ['hand:i1']), depsFor(d, { components: hands(2) }), 'integrated weapon with an uncertified Item binding');
  ok('12: an integrated Droid weapon (Item binding not certified) is never drawn into a hand');
}

// 13. action costs come from the existing cost authority for each direction
{
  const d = mk('droid', {}, [weapon('s')]);
  const deps = depsFor(d, { components: hands(2) });
  spends.length = 0;
  await run(d, ready('s', ['hand:i1']), deps);
  await run(d, { type: 'stow', itemId: 's' }, deps);
  assert.deepEqual(spends.map((x) => x.type), ['move', 'swift'], 'draw and stow are priced by resolveActionCost');
  assert.equal(d.items.get('s').system.weaponPosture, 'STOWED');
  ok('13: Draw and Stow are charged the cost the existing action-cost authority returns for each direction');
}

// 14. authorization is unchanged: a non-GM request is refused with no write or spend, for a Droid as for anyone
{
  const d = mk('droid', {}, [weapon('s')]);
  await refusedClean(d, ready('s', ['hand:i1']), { ...depsFor(d, { components: hands(2) }), isGm: () => false }, 'non-GM request');
  ok('14: a non-GM Droid draw is refused with no write or spend (the authorization gate is untouched)');
}
console.log(`equipment-droid-draw-authority: ${n} checks ok`);
