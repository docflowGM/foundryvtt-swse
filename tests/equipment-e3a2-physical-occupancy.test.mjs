import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E3-A2 -- read-only PHYSICAL occupancy. These tests assess hypothetical item-to-appendage assignments against real effective anatomy.
// Nothing here is a weapon grip verdict, a readiness state or an attack permission: those belong to E3-A3 and the weapon runtime.
registerFoundryPathLoader();
installFoundryShimGlobals();

const { resolvePhysicalOccupancy, EquipmentOccupancyInputError, OCCUPANCY_STATUS: O } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-capability-resolver.js');
const { resolveEffectiveAnatomy } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js');
const { resolveSpeciesEquipmentPermissions } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/species-equipment-permissions.js');
const { resolveInstalledDroidComponents } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js');
const { getDroidPartDefinition, normalizeDroidPartId } = await import('/systems/foundryvtt-swse/scripts/data/droid-part-schema.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { applySpeciesVariantProfile } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const codes = (r) => r.issues.map((i) => i.code);
const aCodes = (a) => a.issues.map((i) => i.code);
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const collect = (o, acc = []) => { if (o && typeof o === 'object') { acc.push(o); Object.values(o).forEach((v) => collect(v, acc)); } return acc; };
const as = (itemId, appendageIds, purpose = 'hold') => ({ itemId, purpose, appendageIds });
const ALL3 = { canHold: true, canWield: true, canManipulate: true };
const an = (appendages, topologyStatus = 'complete') => ({ schemaVersion: 1, topologyStatus, appendages });
const limb = (id, caps = ALL3, extra = {}) => ({ id, kind: 'arm', capabilities: { ...caps }, ...extra });

const recs = readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
function effective(variantId) {
  for (const d of recs) {
    const v = (d.system.variants ?? []).find((x) => x.id === variantId);
    if (!v) continue;
    const s = d.system;
    const nv = SpeciesRegistry._normalizeVariants(JSON.parse(JSON.stringify(s.variants)), d.name).find((x) => x.id === variantId);
    return applySpeciesVariantProfile({ id: d._id, name: d.name, type: 'species', category: 'species', tags: s.tags, pack: 'species', canonicalName: s.canonicalName, variants: s.variants, speed: s.speed, size: s.size, abilityScores: {}, skillBonuses: [], abilities: [], canonicalTraits: s.canonicalTraits, languages: [], naturalWeapons: [] }, nv);
  }
  throw new Error(variantId);
}
const anatomyOf = (profile, extra = {}) => resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: profile, ...extra });
const occ = (anatomy, assignments, speciesPermissions) => resolvePhysicalOccupancy({ anatomy, speciesPermissions, assignments });
const synth = (appendages, topologyStatus, extra) => anatomyOf({ anatomy: an(appendages, topologyStatus) }, extra);
const throwsCode = (fn, code) => assert.throws(fn, (e) => e instanceof EquipmentOccupancyInputError && e.code === code, code);

const human = anatomyOf({ name: 'Human' });

// 1-5
{
  assert.equal(human.status, 'resolved');
  const r = occ(human, [as('pistol-a', ['natural-arm-1']), as('pistol-b', ['natural-arm-2'])]);
  assert.equal(r.status, O.COMPATIBLE); assert.equal(r.occupancy.length, 2);
  assert.deepEqual(r.occupancy.map((o) => [o.appendageId, o.itemId, o.slot]), [['natural-arm-1', 'pistol-a', 'natural-arm-1'], ['natural-arm-2', 'pistol-b', 'natural-arm-2']]);
  ok('1: ordinary two-arm anatomy, two distinct single-appendage holding assignments: physically compatible');
  const c = occ(human, [as('a', ['natural-arm-1']), as('b', ['natural-arm-1'])]);
  assert.equal(c.status, O.BLOCKED); assert.deepEqual(c.conflicts, [{ appendageId: 'natural-arm-1', slot: 'natural-arm-1', itemIds: ['a', 'b'] }]);
  assert.ok(c.assignments.every((a) => a.status === O.BLOCKED && aCodes(a).includes('appendage-occupied-conflict')));
  assert.deepEqual(c.occupancy, [], 'nothing is displaced and no conflicting occupancy is established');
  ok('2: two items on one appendage: conflict reported with both item and appendage identities; nothing dropped or moved');
  const s = occ(human, [as('rifle', ['natural-arm-1', 'natural-arm-2'], 'wield')]);
  assert.equal(s.status, O.COMPATIBLE); assert.deepEqual(s.occupancy.map((o) => o.appendageId), ['natural-arm-1', 'natural-arm-2']); assert.ok(s.occupancy.every((o) => o.itemId === 'rifle'));
  ok('3: one item on two appendages: shared occupancy is physically identifiable (not a grip verdict)');
  throwsCode(() => occ(human, [as('a', ['natural-arm-1', 'natural-arm-1'])]), 'DUPLICATE_APPENDAGE_IN_ASSIGNMENT');
  ok('4: a repeated appendage id within one assignment is invalid');
  throwsCode(() => occ(human, [as('a', ['natural-arm-1']), as('a', ['natural-arm-2'])]), 'DUPLICATE_ITEM_ASSIGNMENT');
  ok('5: a duplicate independent item assignment is invalid');
}

// 6-9
{
  const u = occ(human, [as('a', ['tentacle-9'])]);
  assert.equal(u.status, O.BLOCKED); assert.ok(aCodes(u.assignments[0]).includes('appendage-unknown')); assert.deepEqual(u.occupancy, []);
  ok('6: an unknown appendage id cannot be allocated (blocked when the topology is established; none is invented)');
  const d = occ(anatomyOf({ name: 'H' }, { functionalOverrides: { 'natural-arm-1': 'disabled' } }), [as('a', ['natural-arm-1'])]);
  assert.equal(d.status, O.BLOCKED); assert.ok(aCodes(d.assignments[0]).includes('appendage-disabled'));
  ok('7: a disabled appendage provides no capacity');
  const m = occ(anatomyOf({ name: 'H' }, { functionalOverrides: { 'natural-arm-1': 'missing' } }), [as('a', ['natural-arm-1'])]);
  assert.equal(m.status, O.BLOCKED); assert.ok(aCodes(m.assignments[0]).includes('appendage-missing'));
  ok('8: a missing appendage provides no capacity');
  const un = occ(anatomyOf({ name: 'H' }, { functionalOverrides: { 'natural-arm-1': 'unresolved' } }), [as('a', ['natural-arm-1'])]);
  assert.equal(un.status, O.INDETERMINATE); assert.ok(aCodes(un.assignments[0]).includes('functional-state-unresolved'));
  ok('9: an unresolved functional state is indeterminate, never accepted as functioning');
}

// 10-14
{
  const noHold = synth([limb('x', { canHold: false, canWield: false, canManipulate: false })]);
  assert.equal(occ(noHold, [as('i', ['x'])]).status, O.BLOCKED);
  ok('10: canHold false: holding blocked');
  const unkHold = synth([limb('x', { canHold: null, canWield: true, canManipulate: true })]);
  const r11 = occ(unkHold, [as('i', ['x'])]); assert.equal(r11.status, O.INDETERMINATE); assert.ok(aCodes(r11.assignments[0]).includes('capability-unknown'));
  ok('11: canHold null: holding indeterminate (unknown is not permission)');
  const noWield = synth([limb('x', { canHold: true, canWield: false, canManipulate: true })]);
  assert.equal(occ(noWield, [as('i', ['x'])]).status, O.COMPATIBLE, 'holding is still fine');
  assert.equal(occ(noWield, [as('i', ['x'], 'wield')]).status, O.BLOCKED);
  ok('12: canWield false: wielding blocked while holding stays possible');
  const unkWield = synth([limb('x', { canHold: true, canWield: null, canManipulate: true })]);
  assert.equal(occ(unkWield, [as('i', ['x'], 'wield')]).status, O.INDETERMINATE);
  ok('13: canWield null: wielding indeterminate');
  const holdOnly = synth([limb('x', { canHold: true, canWield: false, canManipulate: null })]);
  const r14 = occ(holdOnly, [as('i', ['x'])]);
  assert.equal(r14.assignments[0].status, O.COMPATIBLE); assert.deepEqual(r14.assignments[0].appendages[0].capabilities, { canHold: true, canWield: false, canManipulate: null });
  assert.equal(r14.status, O.INDETERMINATE); assert.ok(codes(r14).includes('anatomy-not-resolved'));
  ok('14: a known holding fact survives unknown manipulation at assignment level; the unresolved overall anatomy keeps the configuration indeterminate');
}

// 15-17
{
  const CONSTRAINT = { type: 'held-item-load-floor', when: 'held-by-appendage', itemSizeAtLeast: 'Medium', loadCategoryFloor: 'heavy', imposesEncumbered: true };
  const ryn = effective('ryn-sv-2f-06'); const rynA = anatomyOf(ryn);
  const hold = occ(rynA, [as('sack', ['tail-1'])], resolveSpeciesEquipmentPermissions(ryn));
  assert.equal(hold.status, O.INDETERMINATE); assert.equal(hold.assignments[0].status, O.INDETERMINATE);
  assert.deepEqual(hold.assignments[0].appendages[0].capabilities, { canHold: true, canWield: false, canManipulate: null });
  assert.deepEqual(hold.pendingConstraints, [{ appendageId: 'tail-1', itemId: 'sack', constraint: CONSTRAINT, evaluation: 'unevaluated' }]);
  assert.ok(aCodes(hold.assignments[0]).includes('constraint-unevaluated')); assert.notEqual(hold.status, O.BLOCKED, 'not a prohibition');
  ok('15: Ryn tail holding: capability established, typed constraint pending and unevaluated (not a prohibition, not certified)');
  const wield = occ(rynA, [as('sword', ['tail-1'], 'wield')]);
  assert.equal(wield.status, O.BLOCKED); assert.ok(aCodes(wield.assignments[0]).includes('capability-prohibited'));
  ok('16: Ryn tail wielding: blocked');
  const arms = occ(rynA, [as('a', ['arm-1']), as('b', ['arm-2'])]);
  assert.deepEqual(arms.assignments.map((a) => a.status), [O.COMPATIBLE, O.COMPATIBLE]); assert.equal(arms.status, O.INDETERMINATE);
  const tri = effective('trianii-gaw-2i-06');
  const tr = occ(anatomyOf(tri), [as('sack', ['tail-1'])], resolveSpeciesEquipmentPermissions(tri));
  assert.deepEqual(tr.pendingConstraints[0].constraint, CONSTRAINT);
  assert.notEqual(tr.pendingConstraints[0].constraint, hold.pendingConstraints[0].constraint);
  assert.deepEqual(tr.speciesPermissions, { status: 'no-matching-entitlement', supporting: [] });
  ok('17: Trianii tail: the same published constraint from its own independent profile; Ryn arms remain individually compatible');
}

// 18-22
{
  const cj = effective('codru-ji-leg-2c-03'); const cjP = resolveSpeciesEquipmentPermissions(cj); const cjA = anatomyOf(cj);
  const four = occ(cjA, ['arm-1', 'arm-2', 'arm-3', 'arm-4'].map((id, i) => as(`item-${i}`, [id])), cjP);
  assert.equal(four.status, O.COMPATIBLE); assert.equal(four.occupancy.length, 4);
  ok('18: Codru-Ji (real profile): four distinct single-appendage holding assignments are physically compatible');
  assert.deepEqual(four.speciesPermissions, { status: 'verified-permission-present', supporting: [{ id: 'codru-ji-extra-arms', provenance: { variantId: 'codru-ji-leg-2c-03', sourceProfileId: 'LEG-2C-03', traitId: 'extra-arms' } }] });
  const without = occ(cjA, ['arm-1', 'arm-2', 'arm-3', 'arm-4'].map((id, i) => as(`item-${i}`, [id])));
  assert.equal(without.status, O.COMPATIBLE); assert.equal(without.speciesPermissions, null);
  assert.ok(!JSON.stringify(four).includes('maxSimultaneous'), 'special limits are not restated as capacity rules');
  ok('19: the Codru-Ji special permission is reported only as supporting evidence, distinct from (and not required for) physical appendage capacity');
  const kl = effective('killik-ur-2b-12');
  const k = occ(anatomyOf(kl), ['arm-1', 'arm-2', 'arm-3', 'arm-4'].map((id, i) => as(`i${i}`, [id])), resolveSpeciesEquipmentPermissions(kl));
  assert.equal(k.status, O.COMPATIBLE); assert.deepEqual(k.speciesPermissions, { status: 'no-matching-entitlement', supporting: [] });
  ok('20: Killik: four physically identified arms; no Codru-Ji permission acquired');
  const dug = anatomyOf(effective('dug-cw-2h-01'));
  const dh = occ(dug, [as('tool', ['lower-limb-1'])]); const dw = occ(dug, [as('tool', ['lower-limb-1'], 'wield')]);
  assert.equal(dh.assignments[0].status, O.COMPATIBLE); assert.equal(dw.status, O.INDETERMINATE); assert.ok(aCodes(dw.assignments[0]).includes('capability-unknown'));
  ok('21: Dug lower limb: holding established; unknown wielding is indeterminate');
  const lug = anatomyOf(effective('lugubraa-ur-2b-13'));
  const lh = occ(lug, [as('tool', ['forward-limb-1'])]); const lw = occ(lug, [as('tool', ['forward-limb-1'], 'wield')]);
  assert.equal(lh.assignments[0].status, O.COMPATIBLE); assert.deepEqual(lh.assignments[0].appendages[0].capabilities, { canHold: true, canWield: null, canManipulate: null });
  assert.equal(lw.status, O.INDETERMINATE);
  ok('22: Lugubraa: known grasping preserved; unknown wielding/manipulation are not promoted');
}

// 23-24
{
  const part = synth([limb('a1')], 'partial');
  assert.equal(part.status, 'partial');
  const p = occ(part, [as('i', ['a1'])]);
  assert.equal(p.assignments[0].status, O.COMPATIBLE); assert.equal(p.status, O.INDETERMINATE); assert.ok(codes(p).includes('anatomy-not-resolved'));
  const pu = occ(part, [as('j', ['a2'])]);
  assert.equal(pu.status, O.INDETERMINATE); assert.ok(aCodes(pu.assignments[0]).includes('appendage-unknown-topology-incomplete'));
  ok('23: partial topology never yields globally compatible occupancy; an unlisted appendage is not assumed absent');
  const un = synth([], 'unresolved');
  const r = occ(un, [as('i', ['natural-arm-1']), as('j', ['arm-1'])]);
  assert.equal(r.status, O.INDETERMINATE); assert.deepEqual(r.occupancy, []); assert.equal(r.assignments.length, 2);
  ok('24: unresolved topology never produces fabricated occupancy');
}

// 25-26
{
  const item = (id, partId) => ({ id, type: 'droid-system', name: partId, system: { droidPartId: partId, integrated: true }, flags: {} });
  const installed = resolveInstalledDroidComponents(deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand')] }), { normalizeId: normalizeDroidPartId, getDefinition: getDroidPartDefinition });
  const legacy = resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: installed });
  assert.deepEqual(legacy.appendages, []);
  for (const id of ['hand', 'itm_hand_A', 'left-hand']) { const r = occ(legacy, [as('x', [id])]); assert.equal(r.status, O.INDETERMINATE); assert.deepEqual(r.occupancy, []); }
  ok('25: real legacy droid evidence supplies no allocatable hand (candidates are not capacity)');
  const adapter = (appendages) => resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: { components: [] }, deps: { projectInstalledComponents: () => ({ appendages, unresolvedRecords: [], issues: [] }) } });
  const good = (id, slot, instance, over = {}) => ({ id, kind: 'hand', source: 'future-adapter', identity: { slot, instance, part: 'hand' }, capabilities: { ...ALL3 }, functionalState: 'functional', ...over });
  const full = adapter([good('h1', 'left', 'c1'), good('h2', 'right', 'c2')]);
  assert.equal(full.status, 'resolved');
  const ok1 = occ(full, [as('a', ['h1']), as('b', ['h2'])]); assert.equal(ok1.status, O.COMPATIBLE);
  assert.equal(occ(adapter([good('h1', null, 'c1')]), [as('a', ['h1'])]).status, O.INDETERMINATE);
  assert.ok(aCodes(occ(adapter([good('h1', null, 'c1')]), [as('a', ['h1'])]).assignments[0]).includes('appendage-slot-unconfirmed'));
  assert.equal(occ(adapter([good('h1', 'left', 'c1', { capabilities: { canHold: null, canWield: true, canManipulate: true } })]), [as('a', ['h1'])]).status, O.INDETERMINATE);
  ok('26: complete synthetic injected droid appendages are evaluated only by confirmed identities and capabilities');
}

// 27-28
{
  const ryn = effective('ryn-sv-2f-06');
  const r = occ(anatomyOf(ryn), [as('s', ['tail-1'])]);
  assert.deepEqual(Object.keys(r.pendingConstraints[0].constraint).sort(), ['imposesEncumbered', 'itemSizeAtLeast', 'loadCategoryFloor', 'type', 'when']);
  assert.ok(!JSON.stringify(r).match(/"(load|weight|encumb\w*|size)"\s*:/i), 'no size/load computation appears');
  ok('27: constraints survive the output exactly as declared, with no evaluation');
  const keys = new Set(collect(occ(human, [as('a', ['natural-arm-1'])])).flatMap((o) => (Array.isArray(o) ? [] : Object.keys(o))));
  for (const forbidden of ['attacks', 'attackCount', 'ready', 'readied', 'posture', 'actionCost', 'actions', 'equipped', 'gripRequirement', 'twoHanded', 'oneHanded']) assert.ok(!keys.has(forbidden), forbidden);
  ok('28: no attack count, action economy, posture, readiness or grip requirement is produced');
}

// 29-32
{
  const input = deepFreeze({ anatomy: JSON.parse(JSON.stringify(human)), speciesPermissions: resolveSpeciesEquipmentPermissions(effective('codru-ji-leg-2c-03')), assignments: [as('a', ['natural-arm-1'])] });
  const before = JSON.stringify(input);
  const r = resolvePhysicalOccupancy(input);
  assert.equal(JSON.stringify(input), before); assert.equal(r.status, O.COMPATIBLE);
  ok('29: frozen inputs are not mutated');
  const live = { anatomy: JSON.parse(JSON.stringify(human)), speciesPermissions: null, assignments: [as('a', ['natural-arm-1'])] };
  const liveBefore = JSON.stringify(live);
  const out = resolvePhysicalOccupancy(live);
  assert.equal(JSON.stringify(live), liveBefore); assert.ok(collect(live).every((o) => !Object.isFrozen(o)));
  ok('30: unfrozen caller-owned objects are neither mutated nor frozen');
  const owned = new Set(collect(live));
  assert.ok(collect(out).every((o) => Object.isFrozen(o))); assert.ok(collect(out).every((o) => !owned.has(o)));
  const ryn = resolvePhysicalOccupancy({ anatomy: JSON.parse(JSON.stringify(anatomyOf(effective('ryn-sv-2f-06')))), assignments: [as('s', ['tail-1'])] });
  assert.ok(collect(ryn).every((o) => Object.isFrozen(o)));
  ok('31: output is deeply frozen and shares no object with caller data');
  const mk = () => ({ anatomy: JSON.parse(JSON.stringify(anatomyOf(effective('ryn-sv-2f-06')))), assignments: [as('s', ['tail-1']), as('a', ['arm-1'], 'wield')] });
  assert.equal(JSON.stringify(resolvePhysicalOccupancy(mk())), JSON.stringify(resolvePhysicalOccupancy(mk())));
  ok('32: identical inputs give identical output');
}

// 33-34
{
  const base = { anatomy: human, assignments: [] };
  for (const [bad, code] of [
    [undefined, 'INVALID_INPUT'], [null, 'INVALID_INPUT'], [[], 'INVALID_INPUT'],
    [{ assignments: [] }, 'INVALID_ANATOMY'], [{ ...base, anatomy: { status: 'resolved' } }, 'INVALID_ANATOMY'], [{ ...base, anatomy: { status: 'weird', appendages: [] } }, 'INVALID_ANATOMY'],
    [{ ...base, anatomy: { status: 'resolved', appendages: [{ id: 'a', capabilities: {}, functionalState: 'broken' }] } }, 'INVALID_ANATOMY'],
    [{ ...base, speciesPermissions: 'x' }, 'INVALID_SPECIES_PERMISSIONS'], [{ ...base, speciesPermissions: { status: 'bogus', permissions: [] } }, 'INVALID_SPECIES_PERMISSIONS'],
    [{ anatomy: human }, 'INVALID_ASSIGNMENTS'], [{ ...base, assignments: 'a' }, 'INVALID_ASSIGNMENTS'],
    [{ ...base, assignments: [null] }, 'INVALID_ASSIGNMENT'], [{ ...base, assignments: [{ ...as('a', ['natural-arm-1']), handsRequired: 2 }] }, 'INVALID_ASSIGNMENT'],
    [{ ...base, assignments: [as('', ['natural-arm-1'])] }, 'INVALID_ITEM_ID'], [{ ...base, assignments: [as('a', ['natural-arm-1'], 'draw')] }, 'INVALID_PURPOSE'],
    [{ ...base, assignments: [as('a', [])] }, 'INVALID_APPENDAGE_IDS'], [{ ...base, assignments: [as('a', [7])] }, 'INVALID_APPENDAGE_IDS'],
  ]) { throwsCode(() => resolvePhysicalOccupancy(bad), code); throwsCode(() => resolvePhysicalOccupancy(bad), code); }
  ok('33: malformed API structures are rejected deterministically with stable codes (no caller-declared grip requirements accepted)');
  const z = occ(human, []);
  assert.equal(z.status, O.COMPATIBLE); assert.deepEqual(z.occupancy, []); assert.deepEqual(z.assignments, []); assert.deepEqual(z.conflicts, []);
  const zp = occ(anatomyOf(effective('ryn-sv-2f-06')), []);
  assert.equal(zp.status, O.INDETERMINATE); assert.deepEqual(zp.occupancy, []);
  ok('34: zero assignments invent no equipment state (compatible only when anatomy is resolved)');
}

console.log(`equipment-e3a2-physical-occupancy: ${n} checks passed`);
