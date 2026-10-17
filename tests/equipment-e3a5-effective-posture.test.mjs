import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E3-A5 -- effective weapon posture. Exercises the REAL E3-A4 posture module, the REAL E3-A2 occupancy and E3-A3 grip resolvers (never faked
// "successful" results) and the real canonical weapon shapes. A declaration only becomes an effective posture with item-level evidence.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { resolveEffectiveEquipmentPosture, EffectivePostureInputError, EFFECTIVE_POSTURE_STATUS: S } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/effective-equipment-posture.js');
const { resolvePhysicalOccupancy } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-capability-resolver.js');
const { resolveEquipmentGrips } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-grip-resolver.js');
const { resolveEffectiveAnatomy } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js');
const { resolveSpeciesEquipmentPermissions } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/species-equipment-permissions.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { applySpeciesVariantProfile } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const collect = (o, acc = []) => { if (o && typeof o === 'object') { acc.push(o); Object.values(o).forEach((v) => collect(v, acc)); } return acc; };
const codes = (r) => r.issues.map((i) => i.code);
const throwsCode = (fn, code) => assert.throws(fn, (e) => e instanceof EffectivePostureInputError && e.code === code, code);

const shapeOf = (key) => rt.shapeOfWeapon({ id: 'x', name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: key } } }, system: {} }, {});
const SABER = shapeOf('lightsaber-chassis-archaic-lightsaber'); // Medium
const DUELING = shapeOf('lightsaber-chassis-dueling');         // Medium
const GREAT = shapeOf('lightsaber-chassis-great');             // Large (two-handed for a Medium wielder)
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
const human = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { name: 'Human' } });
const as = (itemId, appendageIds, purpose = 'wield') => ({ itemId, purpose, appendageIds });
const w = (itemId, shape, extra = {}) => ({ itemId, shape, ...extra });
const A1 = 'natural-arm-1', A2 = 'natural-arm-2';
function scene({ anatomy = human, assignments, weapons = [], perms, size = 'Medium' }) {
  const occupancy = resolvePhysicalOccupancy({ anatomy, speciesPermissions: perms, assignments });
  const grip = resolveEquipmentGrips({ occupancy, wielderSize: size, speciesPermissions: perms, weapons });
  return { occupancy, grip };
}
const posture = (sc, itemId, declaration, extra = {}) => resolveEffectiveEquipmentPosture({ itemId, declaration, occupancy: sc.occupancy, grip: sc.grip, ...extra });
const ready = (id = 's') => scene({ assignments: [as(id, [A1])], weapons: [w(id, SABER, { gripOption: 1 })] });

// 1-2 STOWED
{
  const sc = scene({ assignments: [as('other', [A1])], weapons: [w('other', SABER, { gripOption: 1 })] });
  const r = posture(sc, 'x', { posture: 'STOWED' });
  assert.equal(r.status, S.ESTABLISHED); assert.equal(r.effectivePosture, 'STOWED'); assert.equal(r.declaredPosture, 'STOWED'); assert.equal(r.verification.physicalHolding, 'none-assigned'); assert.equal(r.evidence.occupancyAssignment, null);
  ok('1: STOWED with no physical assignment is established');
  const c = posture(ready(), 's', { posture: 'STOWED' });
  assert.equal(c.status, S.CONTRADICTORY); assert.equal(c.effectivePosture, null); assert.equal(c.declaredPosture, 'STOWED');
  assert.ok(codes(c).includes('stowed-contradicts-occupancy')); assert.equal(c.evidence.occupancyAssignment.purpose, 'wield'); assert.equal(c.evidence.gripAssessment.status, 'grip-supported');
  ok('2: STOWED with contradictory assigned occupancy is reported; the occupancy and grip evidence is kept and the declaration is not changed');
}

// 3-5 EQUIPPED
{
  const hold = scene({ assignments: [as('s', [A1], 'hold')] });
  const r3 = posture(hold, 's', { posture: 'EQUIPPED' });
  assert.equal(r3.status, S.ESTABLISHED); assert.equal(r3.effectivePosture, 'EQUIPPED'); assert.equal(r3.verification.physicalHolding, 'verified'); assert.equal(r3.verification.readiness, 'unverified');
  ok('3: EQUIPPED with verified physical holding is established');
  const r4 = posture(ready(), 's', { posture: 'EQUIPPED' });
  assert.equal(r4.effectivePosture, 'EQUIPPED'); assert.notEqual(r4.effectivePosture, 'READIED'); assert.equal(r4.verification.grip, 'verified'); assert.equal(r4.verification.readiness, 'unverified');
  ok('4: EQUIPPED with a legal grip stays EQUIPPED (never advances to READIED, no combat permission)');
  const r5 = posture(scene({ assignments: [as('other', [A1], 'hold')] }), 's', { posture: 'EQUIPPED' });
  assert.equal(r5.status, S.INDETERMINATE); assert.equal(r5.effectivePosture, null); assert.ok(codes(r5).includes('no-physical-holding-evidence'));
  ok('5: EQUIPPED with no established physical holding evidence is indeterminate');
}

// 6-12 READIED
{
  const r6 = posture(ready(), 's', { posture: 'READIED' });
  assert.equal(r6.status, S.ESTABLISHED); assert.equal(r6.effectivePosture, 'READIED');
  assert.deepEqual(r6.verification, { physicalHolding: 'verified', grip: 'verified', readiness: 'verified' });
  assert.deepEqual(r6.evidence.gripAssessment, { purpose: 'wield', status: 'grip-supported', requiredHands: 1, assignedAppendageCount: 1 });
  ok('6: declared READIED with valid occupancy and legal grip is verified');
  const holdSc = scene({ assignments: [as('s', [A1], 'hold')] });
  assert.equal(holdSc.grip.status, 'grip-supported'); assert.equal(holdSc.grip.wieldAssignmentCount, 0);
  const r7 = posture(holdSc, 's', { posture: 'READIED' });
  assert.equal(r7.status, S.INDETERMINATE); assert.equal(r7.effectivePosture, null); assert.ok(codes(r7).includes('readied-requires-wield-assignment')); assert.equal(r7.verification.readiness, 'unverified');
  ok('7: READIED with hold-only occupancy is not verified, even though the aggregate grip result is grip-supported');
  const blk = scene({ assignments: [as('a', [A1]), as('b', [A1])], weapons: [w('a', SABER, { gripOption: 1 }), w('b', DUELING, { gripOption: 1 })] });
  const r8 = posture(blk, 'a', { posture: 'READIED' });
  assert.equal(r8.status, S.BLOCKED); assert.equal(r8.effectivePosture, null); assert.notEqual(r8.effectivePosture, 'EQUIPPED');
  ok('8: READIED with blocked occupancy is blocked (not reinterpreted as EQUIPPED)');
  const dug = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: effective('dug-cw-2h-01') });
  const r9 = posture(scene({ anatomy: dug, assignments: [as('s', ['lower-limb-1'])], weapons: [w('s', SABER, { gripOption: 1 })] }), 's', { posture: 'READIED' });
  assert.equal(r9.status, S.INDETERMINATE); assert.equal(r9.effectivePosture, null);
  ok('9: READIED with indeterminate occupancy (unknown wield capability) is not verified');
  const bg = scene({ assignments: [as('g', [A1])], weapons: [w('g', GREAT, { gripOption: 1 })] });
  assert.equal(bg.occupancy.status, 'physically-compatible'); assert.equal(bg.grip.assessments[0].status, 'grip-blocked');
  const r10 = posture(bg, 'g', { posture: 'READIED' });
  assert.equal(r10.status, S.BLOCKED); assert.equal(r10.verification.grip, 'blocked'); assert.ok(codes(r10).includes('item-grip-blocked'));
  ok('10: READIED with a blocked canonical grip is blocked');
  const ig = scene({ assignments: [as('s', [A1])], weapons: [w('s', SABER)] });
  const r11 = posture(ig, 's', { posture: 'READIED' });
  assert.equal(r11.status, S.INDETERMINATE); assert.ok(codes(r11).includes('item-grip-indeterminate'));
  ok('11: READIED with an indeterminate canonical grip (no grip chosen) is not verified');
  const dis = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { name: 'H' }, functionalOverrides: { [A1]: 'disabled' } });
  const healthy = posture(ready(), 's', { posture: 'READIED' });
  const lost = posture(scene({ anatomy: dis, assignments: [as('s', [A1])], weapons: [w('s', SABER, { gripOption: 1 })] }), 's', { posture: 'READIED' });
  assert.equal(healthy.effectivePosture, 'READIED'); assert.equal(lost.status, S.BLOCKED); assert.equal(lost.effectivePosture, null);
  const missing = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { name: 'H' }, functionalOverrides: { [A1]: 'missing' } });
  assert.equal(posture(scene({ anatomy: missing, assignments: [as('s', [A1])], weapons: [w('s', SABER, { gripOption: 1 })] }), 's', { posture: 'READIED' }).status, S.BLOCKED);
  ok('12: a disabled or missing appendage invalidates effective readiness although the stored declaration is unchanged');
}

// 13-17 identity and aggregate traps
{
  const sc = ready('s');
  const r13 = posture(sc, 'other-item', { posture: 'READIED' });
  assert.equal(r13.status, S.INDETERMINATE); assert.equal(r13.effectivePosture, null); assert.ok(codes(r13).includes('no-physical-holding-evidence') && codes(r13).includes('no-grip-assessment-for-item'));
  const otherArm = scene({ assignments: [as('s', [A2])], weapons: [w('s', SABER, { gripOption: 1 })] });
  const mixed = { occupancy: sc.occupancy, grip: otherArm.grip };
  const r13b = posture(mixed, 's', { posture: 'READIED' });
  assert.equal(r13b.status, S.INDETERMINATE); assert.ok(codes(r13b).includes('occupancy-grip-evidence-mismatch'));
  ok('13: an item identity mismatch (or occupancy and grip from different configurations) cannot certify readiness');
  const two = scene({ assignments: [as('a', [A1]), as('b', [A2])], weapons: [w('a', SABER, { gripOption: 1 })] });
  assert.equal(posture(two, 'a', { posture: 'READIED' }).effectivePosture, 'READIED');
  const rb = posture(two, 'b', { posture: 'READIED' });
  assert.equal(rb.status, S.INDETERMINATE); assert.equal(rb.effectivePosture, null);
  ok('14: another item\'s valid grip does not certify this item');
  const empty = scene({ assignments: [] });
  assert.deepEqual(empty.grip.assessments, []);
  const r15 = posture({ occupancy: sc.occupancy, grip: empty.grip }, 's', { posture: 'READIED' });
  assert.equal(r15.status, S.INDETERMINATE); assert.ok(codes(r15).includes('no-grip-assessment-for-item'));
  ok('15: empty grip-assessment collections cannot certify READIED');
  const agg = scene({ assignments: [as('s', [A1], 'hold')] });
  assert.equal(agg.grip.status, 'grip-supported');
  assert.equal(posture(agg, 's', { posture: 'READIED' }).effectivePosture, null);
  const aggBad = { occupancy: sc.occupancy, grip: { ...agg.grip, assessments: [] } };
  assert.equal(posture(aggBad, 's', { posture: 'READIED' }).effectivePosture, null);
  ok('16: a positive aggregate grip verdict without a wield assignment for the item is insufficient');
}

// 17-20 species
{
  const cj = effective('codru-ji-leg-2c-03'); const cjA = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: cj }); const cjP = resolveSpeciesEquipmentPermissions(cj);
  const arrangement = (anatomy, perms) => scene({ anatomy, perms, assignments: [as('g1', ['arm-1', 'arm-2']), as('g2', ['arm-3', 'arm-4'])], weapons: [w('g1', GREAT), w('g2', GREAT)] });
  const codru = arrangement(cjA, cjP);
  for (const id of ['g1', 'g2']) { const r = posture(codru, id, { posture: 'READIED' }); assert.equal(r.status, S.ESTABLISHED, id); assert.equal(r.effectivePosture, 'READIED'); assert.equal(r.evidence.gripAssessment.requiredHands, 2); }
  const kl = effective('killik-ur-2b-12'); const klA = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: kl });
  const killik = arrangement(klA, resolveSpeciesEquipmentPermissions(kl));
  for (const id of ['g1', 'g2']) { const r = posture(killik, id, { posture: 'READIED' }); assert.equal(r.status, S.INDETERMINATE, id); assert.equal(r.effectivePosture, null); assert.equal(r.evidence.speciesPermissionStatus, 'no-matching-entitlement'); }
  ok('17: simultaneous two-handed weapons keep their E3-A3 requirement: verified for Codru-Ji, unresolved without the entitlement');
  const keys = new Set(collect(posture(codru, 'g1', { posture: 'READIED' })).flatMap((o) => (Array.isArray(o) ? [] : Object.keys(o))));
  for (const k of ['attacks', 'attackCount', 'extraAttacks', 'additionalAttacks', 'attackEligible', 'attackAuthorized']) assert.ok(!keys.has(k), k);
  ok('18: Codru-Ji\'s verified entitlement grants no attacks');
  assert.equal(posture(killik, 'g1', { posture: 'READIED' }).evidence.speciesPermissionStatus, 'no-matching-entitlement');
  ok('19: Killik does not inherit the Codru-Ji entitlement');
  const ryn = effective('ryn-sv-2f-06');
  const tail = scene({ anatomy: resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: ryn }), perms: resolveSpeciesEquipmentPermissions(ryn), assignments: [as('sack', ['tail-1'], 'hold')] });
  const rt20 = posture(tail, 'sack', { posture: 'EQUIPPED' });
  assert.equal(rt20.status, S.INDETERMINATE); assert.equal(rt20.effectivePosture, null); assert.equal(rt20.evidence.pendingConstraints.length, 1); assert.equal(rt20.evidence.pendingConstraints[0].evaluation, 'unevaluated');
  ok('20: Ryn/Trianii holding-tail uncertainty (unevaluated constraint) stays unresolved');
}

// 21-23 activation
{
  const und = posture(ready(), 's', undefined, { activation: { state: 'activated' } });
  assert.equal(und.status, S.UNDECLARED); assert.equal(und.effectivePosture, null); assert.equal(und.activation.state, 'activated');
  ok('21: activation does not establish posture');
  const r = posture(ready(), 's', { posture: 'READIED' }, { activation: { state: 'inactive' } });
  assert.equal(r.effectivePosture, 'READIED'); assert.equal(r.activation.state, 'inactive');
  assert.equal(posture(ready(), 's', { posture: 'READIED' }).activation.state, 'unknown');
  const eq = posture(scene({ assignments: [as('s', [A1], 'hold')] }), 's', { posture: 'EQUIPPED' }, { activation: { state: 'activated' } });
  assert.equal(eq.effectivePosture, 'EQUIPPED'); assert.equal(eq.activation.independentOfPosture, true);
  const noGrip = posture(scene({ assignments: [as('s', [A1])], weapons: [w('s', SABER)] }), 's', { posture: 'READIED' }, { activation: { state: 'activated' } });
  assert.equal(noGrip.effectivePosture, null, 'activation cannot compensate for an unverified grip');
  ok('22: READIED does not imply activated, and activation does not repair an invalid grip');
  const act = deepFreeze({ state: 'activated' });
  const out = posture(ready(), 's', { posture: 'READIED' }, { activation: act });
  assert.deepEqual({ ...act }, { state: 'activated' }); assert.notEqual(out.activation, act);
  const live = { state: 'inactive' }; posture(ready(), 's', { posture: 'READIED' }, { activation: live });
  assert.deepEqual(live, { state: 'inactive' }); assert.ok(!Object.isFrozen(live));
  ok('23: activation evidence is not mutated');
}

// 24-25 declarations
{
  for (const d of [undefined, null, {}, { posture: 'readied' }, { posture: true }, { posture: 'DRAWN' }]) {
    const r = posture(ready(), 's', d);
    assert.equal(r.status, S.UNDECLARED); assert.equal(r.effectivePosture, null); assert.equal(r.declaredPosture, null);
  }
  ok('24: a missing or invalid posture never becomes STOWED or READIED, even with perfect physical evidence');
  const r = posture(ready(), 's', { equipped: true, active: true, readied: true });
  assert.equal(r.status, S.UNDECLARED); assert.ok(codes(r).includes('legacy-posture-fields-ignored'));
  throwsCode(() => resolveEffectiveEquipmentPosture({ itemId: 's', occupancy: ready().occupancy, grip: ready().grip, item: { system: { equipped: true } } }), 'UNKNOWN_FIELD');
  throwsCode(() => resolveEffectiveEquipmentPosture({ itemId: 's', occupancy: ready().occupancy, grip: ready().grip, alwaysReadied: true }), 'UNKNOWN_FIELD');
  ok('25: legacy system.equipped never establishes posture and whole item documents or alwaysReadied booleans are rejected');
}

// 26-27 exceptions
{
  const bar = effective('barabel-sv-2f-10');
  assert.ok(bar.naturalWeapons.some((x) => x.id === 'sv-barabel-claws' && x.alwaysArmed === true));
  const none = scene({ assignments: [] });
  const nat = posture(none, 'claws-item', undefined, { exception: { claim: 'natural-weapon', naturalWeaponId: 'sv-barabel-claws' }, speciesProfile: bar });
  assert.equal(nat.status, S.ESTABLISHED); assert.equal(nat.effectivePosture, 'READIED'); assert.deepEqual(nat.verification, { physicalHolding: 'not-applicable', grip: 'not-applicable', readiness: 'verified' });
  assert.equal(nat.exception.established, true); assert.equal(nat.exception.binding, 'caller-asserted'); assert.ok(codes(nat).includes('natural-weapon-item-binding-caller-asserted'));
  const stowedDecl = posture(none, 'claws-item', { posture: 'STOWED' }, { exception: { claim: 'natural-weapon', naturalWeaponId: 'sv-barabel-claws' }, speciesProfile: bar });
  assert.equal(stowedDecl.effectivePosture, 'READIED'); assert.ok(codes(stowedDecl).includes('declaration-superseded-by-natural-weapon-exception'));
  const unknownId = posture(none, 'claws-item', undefined, { exception: { claim: 'natural-weapon', naturalWeaponId: 'not-a-record' }, speciesProfile: bar });
  assert.equal(unknownId.status, S.INDETERMINATE); assert.equal(unknownId.effectivePosture, null); assert.equal(unknownId.exception.established, false);
  assert.equal(posture(none, 'i', undefined, { exception: { claim: 'natural-weapon', naturalWeaponId: 'sv-barabel-claws' } }).status, S.INDETERMINATE);
  assert.equal(posture(none, 'i', undefined, { exception: { claim: 'natural-weapon', naturalWeaponId: 'sv-barabel-claws' }, speciesProfile: { ...bar, selectedVariant: { ...bar.selectedVariant, completeSnapshot: false } } }).status, S.INDETERMINATE);
  const withHands = posture(ready('claws-item'), 'claws-item', { posture: 'READIED' }, { exception: { claim: 'natural-weapon', naturalWeaponId: 'sv-barabel-claws' }, speciesProfile: bar });
  assert.equal(withHands.status, S.CONTRADICTORY); assert.equal(withHands.effectivePosture, null); assert.ok(withHands.evidence.occupancyAssignment);
  ok('26: a natural-weapon exception is established only by an always-armed record of the selected publication; ordinary appendage assignment contradicts it');
  const integ = posture(none, 'port-1', { posture: 'READIED' }, { exception: { claim: 'integrated-droid-weapon' } });
  assert.equal(integ.status, S.INDETERMINATE); assert.equal(integ.effectivePosture, null); assert.equal(integ.verification.readiness, 'unverified'); assert.ok(codes(integ).includes('integrated-droid-exception-unverified'));
  ok('27: an unverified integrated-droid claim is reported as pending and never promoted to READIED');
}

// 28-29 no writes, no actions/attacks
{
  const src = readFileSync(new URL('../scripts/engine/equipment/effective-equipment-posture.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(imports, ['/systems/foundryvtt-swse/scripts/engine/equipment/equipment-posture.js']);
  for (const f of [/ActorEngine/, /InventoryEngine/, /FireStateStore/, /ActionEconomy/, /EncumbranceEngine/, /\.update\(/, /\.setFlag\(/, /\.unsetFlag\(/, /updateOwned/, /Hooks\./, /\bgame\./, /\bui\./, /weapon-runtime/]) assert.ok(!f.test(src), `${f}`);
  ok('28: no actor or item write is reachable: the only import is the E3-A4 posture module');
  const keys = new Set(collect(posture(ready(), 's', { posture: 'READIED' })).flatMap((o) => (Array.isArray(o) ? [] : Object.keys(o))));
  for (const k of ['attacks', 'attackEligible', 'attackAuthorized', 'actionCost', 'actions', 'spend', 'combatReady', 'canAttack']) assert.ok(!keys.has(k), k);
  ok('29: no action-economy spend or attack authorization is produced');
}

// 30-32 purity
{
  const sc = ready(); const dec = { posture: 'READIED', equipped: false };
  const frozenIn = deepFreeze({ itemId: 's', declaration: JSON.parse(JSON.stringify(dec)), occupancy: JSON.parse(JSON.stringify(sc.occupancy)), grip: JSON.parse(JSON.stringify(sc.grip)), activation: { state: 'inactive' }, exception: null });
  const fb = JSON.stringify(frozenIn); resolveEffectiveEquipmentPosture(frozenIn); assert.equal(JSON.stringify(frozenIn), fb);
  const live = { itemId: 's', declaration: { ...dec }, occupancy: JSON.parse(JSON.stringify(sc.occupancy)), grip: JSON.parse(JSON.stringify(sc.grip)), activation: { state: 'inactive' } };
  const lb = JSON.stringify(live); const out = resolveEffectiveEquipmentPosture(live);
  assert.equal(JSON.stringify(live), lb); assert.ok(collect(live).every((o) => !Object.isFrozen(o)));
  ok('30: inputs are neither mutated nor frozen by the resolver');
  const owned = new Set(collect(live));
  assert.ok(collect(out).every((o) => Object.isFrozen(o))); assert.ok(collect(out).every((o) => !owned.has(o)));
  for (const d of [undefined, { posture: 'STOWED' }, { posture: 'EQUIPPED' }]) assert.ok(collect(posture(ready(), 's', d)).every((o) => Object.isFrozen(o)));
  ok('31: results are deeply frozen and share no object with the inputs');
  const mk = () => JSON.stringify(posture(ready(), 's', { posture: 'READIED', active: true }, { activation: { state: 'activated' } }));
  assert.equal(mk(), mk());
  ok('32: repeated inputs produce identical results');
}

// 33 malformed
{
  const sc = ready(); const base = { itemId: 's', occupancy: sc.occupancy, grip: sc.grip };
  for (const [bad, code] of [
    [undefined, 'INVALID_INPUT'], [null, 'INVALID_INPUT'], [[], 'INVALID_INPUT'], [{ ...base, itemId: '' }, 'INVALID_ITEM_ID'], [{ ...base, itemId: 7 }, 'INVALID_ITEM_ID'],
    [{ itemId: 's', grip: sc.grip }, 'INVALID_OCCUPANCY'], [{ ...base, occupancy: { status: 'x', assignments: [] } }, 'INVALID_OCCUPANCY'], [{ ...base, occupancy: { status: 'physically-compatible', assignments: [{}] } }, 'INVALID_OCCUPANCY'],
    [{ itemId: 's', occupancy: sc.occupancy }, 'INVALID_GRIP'], [{ ...base, grip: { status: 'grip-supported', assessments: [], wieldAssignmentCount: 'x', occupancyStatus: 'physically-compatible' } }, 'INVALID_GRIP'], [{ ...base, grip: { ...sc.grip, assessments: [null] } }, 'INVALID_GRIP'],
    [{ ...base, activation: { state: 'lit' } }, 'INVALID_ACTIVATION'], [{ ...base, activation: 'on' }, 'INVALID_ACTIVATION'], [{ ...base, activation: { state: 'inactive', extra: 1 } }, 'INVALID_ACTIVATION'],
    [{ ...base, exception: true }, 'INVALID_EXCEPTION_CLAIM'], [{ ...base, exception: { claim: 'alwaysReadied' } }, 'INVALID_EXCEPTION_CLAIM'], [{ ...base, exception: { claim: 'natural-weapon' } }, 'INVALID_EXCEPTION_CLAIM'],
    [{ ...base, exception: { claim: 'integrated-droid-weapon', extra: 1 } }, 'INVALID_EXCEPTION_CLAIM'], [{ ...base, exception: { claim: 'natural-weapon', naturalWeaponId: 'a' }, speciesProfile: 'x' }, 'INVALID_SPECIES_PROFILE'],
    [{ ...base, alwaysReadied: true }, 'UNKNOWN_FIELD'],
  ]) { throwsCode(() => resolveEffectiveEquipmentPosture(bad), code); throwsCode(() => resolveEffectiveEquipmentPosture(bad), code); }
  ok('33: malformed API input fails with stable, deterministic error codes');
}

console.log(`equipment-e3a5-effective-posture: ${n} checks passed`);
