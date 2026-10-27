import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E2B-I3B -- universal anatomy integrity at the shared resolver boundary: unresolved physical records vs. `resolved`, and collisions between
// CONFIRMED slot / installed-instance identities of distinct appendages. Uses the real resolveEffectiveAnatomy with injected adapter fixtures.
registerFoundryPathLoader();
installFoundryShimGlobals();

const { resolveEffectiveAnatomy, AnatomyInputError, ANATOMY_STATUS } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js');
const { resolveInstalledDroidComponents } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js');
const { getDroidPartDefinition, normalizeDroidPartId } = await import('/systems/foundryvtt-swse/scripts/data/droid-part-schema.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { applySpeciesVariantProfile } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');
import { readFileSync } from 'node:fs';

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const codes = (r) => r.issues.map((i) => i.code);
const adapterOf = (result) => ({ actorType: 'droid', installedComponents: { components: [] }, deps: { projectInstalledComponents: () => result } });
const app = (over = {}) => ({
  id: 'arm-001', kind: 'arm', source: 'future-droid-adapter',
  identity: { slot: 'left-arm', instance: 'component-001', part: 'hand' },
  capabilities: { canHold: true, canWield: true, canManipulate: true },
  functionalState: 'functional', ...over,
});
const result = (appendages = [], unresolvedRecords = [], issues = []) => ({ appendages, unresolvedRecords, issues });
const resolve = (res) => resolveEffectiveAnatomy(adapterOf(res));
const throwsCode = (res, code) => assert.throws(() => resolve(res), (e) => e instanceof AnatomyInputError && e.code === code, code);
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const collect = (o, acc = []) => { if (o && typeof o === 'object') { acc.push(o); Object.values(o).forEach((v) => collect(v, acc)); } return acc; };
const rec = (over = {}) => ({ partId: 'hand', identityStatus: 'candidate-document-ids-only', identity: { slot: null, instance: null, part: 'hand' }, candidateInstances: [{ documentId: 'itm-1', functionalState: 'functional' }], capabilities: { canHold: null, canWield: null, canManipulate: true }, ...over });

// ---- unresolved-record completeness (1-9) ------------------------------------------------------------------------------------
{
  const full = resolve(result([app()]));
  assert.equal(full.status, ANATOMY_STATUS.RESOLVED);
  assert.ok(!codes(full).includes('unresolved-physical-records-present'));
  ok('1: a fully identified appendage with established capabilities and no unresolved records is resolved');

  const r1 = resolve(result([app()], [rec()]));
  assert.equal(r1.status, ANATOMY_STATUS.PARTIAL);
  const note = r1.issues.find((i) => i.code === 'unresolved-physical-records-present');
  assert.ok(note && note.severity === 'warning' && note.details.count === 1);
  ok('2: the same appendage plus one unresolved physical record becomes partial with a structured diagnostic');

  const r2 = resolve(result([app()], [rec(), rec({ partId: 'claw', identity: { slot: null, instance: null, part: 'claw' } })]));
  assert.equal(r2.status, ANATOMY_STATUS.PARTIAL);
  assert.equal(r2.issues.find((i) => i.code === 'unresolved-physical-records-present').details.count, 2);
  ok('3: several unresolved physical records also prevent resolution');

  assert.deepEqual(r1.appendages.map((a) => a.id), ['arm-001']);
  assert.deepEqual(r1.appendages[0].identity, { slot: 'left-arm', instance: 'component-001', part: 'hand' });
  assert.deepEqual(r1.appendages[0].capabilities, { canHold: true, canWield: true, canManipulate: true });
  assert.equal(r1.appendages[0].functionalState, 'functional');
  ok('4: known appendages remain present and unchanged in the partial result');

  assert.deepEqual(r1.unresolvedRecords, [rec()]);
  ok('5: unresolved records keep their original diagnostic evidence');

  assert.equal(r1.appendages.length, 1, 'no appendage was created from the unresolved record');
  assert.ok(!r1.appendages.some((a) => a.id === 'hand' || a.identity.part === 'hand' && a.id !== 'arm-001'));
  ok('6: an unresolved candidate is never promoted to an allocatable appendage');

  const usable = resolve(result([], [rec()]));
  assert.equal(usable.status, ANATOMY_STATUS.PARTIAL); assert.deepEqual(usable.appendages, []);
  ok('7: no confirmed appendages plus usable unresolved evidence keeps the established partial behavior');

  const none = resolve(result([], [rec({ capabilities: { canHold: null, canWield: null, canManipulate: false }, candidateInstances: [{ documentId: 'x', functionalState: 'disabled' }] })]));
  assert.equal(none.status, ANATOMY_STATUS.UNRESOLVED);
  assert.equal(resolve(result()).status, ANATOMY_STATUS.UNRESOLVED);
  ok('8: no confirmed appendages and no usable evidence remains unresolved');

  const blocking = resolve(result([app()], [], [{ code: 'adapter-block', severity: 'blocking', message: 'm' }]));
  assert.equal(blocking.status, ANATOMY_STATUS.PARTIAL);
  ok('9: existing blocking issues still prevent resolved');
}

// ---- identity collisions (10-19) ---------------------------------------------------------------------------------------------
{
  const dupSlot = result([app(), app({ id: 'arm-002', identity: { slot: 'left-arm', instance: 'component-002', part: 'hand' } })]);
  throwsCode(dupSlot, 'DUPLICATE_APPENDAGE_SLOT');
  ok('10: different ids claiming one confirmed slot throw DUPLICATE_APPENDAGE_SLOT');

  const dupInst = result([app(), app({ id: 'arm-002', identity: { slot: 'right-arm', instance: 'component-001', part: 'hand' } })]);
  throwsCode(dupInst, 'DUPLICATE_INSTALLED_INSTANCE');
  ok('11: different slots claiming one confirmed installed instance throw DUPLICATE_INSTALLED_INSTANCE');

  throwsCode(result([app(), app()]), 'DUPLICATE_APPENDAGE_ID');
  ok('12: repeated appendage ids still throw DUPLICATE_APPENDAGE_ID');

  const two = resolve(result([app(), app({ id: 'arm-002', identity: { slot: 'right-arm', instance: 'component-002', part: 'hand' } })]));
  assert.equal(two.status, ANATOMY_STATUS.RESOLVED); assert.equal(two.appendages.length, 2);
  ok('13: two independent slots and independent instances are valid');

  assert.deepEqual(two.appendages.map((a) => a.identity.part), ['hand', 'hand']);
  ok('14: independent instances of the same canonical part definition are valid (part is not unique)');

  for (const slot of [null, undefined]) {
    const id = slot === null ? { slot: null, instance: 'c-1', part: 'hand' } : { instance: 'c-2', part: 'hand' };
    const r = resolve(result([app({ id: 'a1', identity: id }), app({ id: 'a2', identity: { ...id, instance: id.instance + 'b' } })]));
    assert.equal(r.status, ANATOMY_STATUS.PARTIAL); assert.ok(codes(r).includes('appendage-identity-incomplete'));
  }
  ok('15: missing or null slot identity is incomplete evidence (even for several appendages), not a collision');

  for (const instance of [null, undefined]) {
    const mk = (id, slot) => app({ id, identity: instance === null ? { slot, instance: null, part: 'hand' } : { slot, part: 'hand' } });
    const r = resolve(result([mk('a1', 'left-arm'), mk('a2', 'right-arm')]));
    assert.equal(r.status, ANATOMY_STATUS.PARTIAL); assert.ok(codes(r).includes('appendage-identity-incomplete'));
  }
  ok('16: missing or null installed-instance identity is incomplete evidence, not a collision');

  const repeated = resolve(result([app()], [rec({ candidateInstances: [{ documentId: 'dup', functionalState: 'functional' }, { documentId: 'dup', functionalState: 'functional' }] }), rec({ identity: { slot: 'left-arm', instance: 'component-001', part: 'hand' } }), rec()]));
  assert.equal(repeated.status, ANATOMY_STATUS.PARTIAL); assert.equal(repeated.appendages.length, 1);
  ok('17: repeated / overlapping identifiers inside unresolved candidate records raise no collision error');

  for (const [bad, code] of [[dupSlot, 'DUPLICATE_APPENDAGE_SLOT'], [dupInst, 'DUPLICATE_INSTALLED_INSTANCE']]) {
    let out; let err;
    try { out = resolve(bad); } catch (e) { err = e; }
    assert.equal(out, undefined, 'no successful result'); assert.equal(err.code, code);
  }
  ok('18: confirmed collisions never return a successful result or an inflated appendage count');

  const slotErr = (() => { try { resolve(dupSlot); } catch (e) { return e; } })();
  const instErr = (() => { try { resolve(dupInst); } catch (e) { return e; } })();
  assert.equal(slotErr.name, 'AnatomyInputError'); assert.deepEqual(slotErr.details, { slot: 'left-arm', appendageIds: ['arm-001', 'arm-002'] });
  assert.deepEqual(instErr.details, { instance: 'component-001', appendageIds: ['arm-001', 'arm-002'] });
  assert.ok(slotErr.message.includes('arm-001') && slotErr.message.includes('arm-002') && slotErr.message.includes('left-arm'));
  const both = (() => { try { resolve(result([app(), app({ id: 'arm-002' })])); } catch (e) { return e; } })();
  assert.equal(both.code, 'DUPLICATE_APPENDAGE_SLOT', 'a pair colliding on both reports the slot first, deterministically');
  assert.equal((() => { try { resolve(dupSlot); } catch (e) { return e.message; } })(), slotErr.message, 'identical input -> identical error');
  ok('19: stable codes and deterministic identifying details (identity value and both appendage ids)');
}

// ---- ownership, determinism, regression (20-26) ------------------------------------------------------------------------------
{
  const mk = () => result([app(), app({ id: 'arm-002', identity: { slot: 'right-arm', instance: 'component-002', part: 'hand' } })], [rec()], [{ code: 'adapter-note', severity: 'info', message: 'm', details: { list: [1, 2] } }]);
  const live = mk(); const before = JSON.stringify(live);
  const r = resolve(live);
  assert.equal(JSON.stringify(live), before);
  ok('20: inputs are never mutated');
  assert.ok(collect(live).every((o) => !Object.isFrozen(o)));
  ok('21: inputs are never frozen by the resolver');
  const owned = new Set(collect(live));
  assert.ok(Object.isFrozen(r) && collect(r).every((o) => Object.isFrozen(o)));
  assert.ok(collect(r).every((o) => !owned.has(o)));
  ok('22: returned snapshots are deeply frozen and share no object with the adapter data');
  assert.equal(JSON.stringify(resolve(mk())), JSON.stringify(resolve(mk())));
  ok('23: repeated calls are deterministic');
  throwsCode({ appendages: [], unresolvedRecords: [], issues: 'none' }, 'INVALID_ADAPTER_RESULT');
  throwsCode(result([app({ capabilities: { canHold: 'yes', canWield: true, canManipulate: true } })]), 'INVALID_CAPABILITY');
  throwsCode(result([app({ functionalState: 'broken' })]), 'INVALID_FUNCTIONAL_STATE');
  assert.equal(resolve(result([app({ capabilities: {} })])).appendages[0].capabilities.canHold, null);
  assert.throws(() => resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: { components: [] }, deps: { projectInstalledComponents: () => { throw new RangeError('adapter boom'); } } }), RangeError);
  ok('24: existing adapter errors, capability handling and adapter-exception propagation are intact');

  const item = (id, partId) => ({ id, type: 'droid-system', name: partId, system: { droidPartId: partId, integrated: true }, flags: {} });
  const installed = resolveInstalledDroidComponents(deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand'), item('itm_hand_B', 'hand')] }), { normalizeId: normalizeDroidPartId, getDefinition: getDroidPartDefinition });
  const legacy = resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: installed });
  assert.deepEqual(legacy.appendages, []); assert.notEqual(legacy.status, ANATOMY_STATUS.RESOLVED);
  assert.ok(legacy.unresolvedRecords.length >= 1 && legacy.unresolvedRecords.every((x) => x.identity.slot === null && x.identity.instance === null));
  assert.ok(legacy.unresolvedRecords[0].candidateInstances.length === 2, 'both document ids kept as candidates, none promoted');
  ok('25: the real legacy droid projection still reports candidates conservatively (no appendages, no collision error)');

  const recs = readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const eff = (vid) => { for (const d of recs) { const v = (d.system.variants ?? []).find((x) => x.id === vid); if (!v) continue; const s = d.system; const nv = SpeciesRegistry._normalizeVariants(JSON.parse(JSON.stringify(s.variants)), d.name).find((x) => x.id === vid); return applySpeciesVariantProfile({ id: d._id, name: d.name, type: 'species', category: 'species', tags: s.tags, pack: 'species', canonicalName: s.canonicalName, variants: s.variants, speed: s.speed, size: s.size, abilityScores: {}, skillBonuses: [], abilities: [], canonicalTraits: s.canonicalTraits, languages: [], naturalWeapons: [] }, nv); } throw new Error(vid); };
  const expected = { 'codru-ji-leg-2c-03': 'resolved', 'ryn-sv-2f-06': 'partial', 'trianii-gaw-2i-06': 'partial', 'krevaaki-ur-2b-04': 'resolved', 'killik-ur-2b-12': 'resolved', 'dug-cw-2h-01': 'partial', 'lugubraa-ur-2b-13': 'partial', 'krevaaki-jatm-2j-04': 'unresolved' };
  for (const [vid, status] of Object.entries(expected)) assert.equal(resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: eff(vid) }).status, status, vid);
  assert.equal(eff('krevaaki-jatm-2j-04').anatomy, undefined);
  ok('26: source-verified biological statuses and publication isolation are unchanged (7 certified profiles + Jedi Academy Krevaaki)');
}

console.log(`equipment-e2b-i3b-universal-integrity: ${n} checks passed`);
