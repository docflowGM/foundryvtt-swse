import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E3-A3 -- read-only weapon GRIP integration: real E3-A2 occupancy + the real weapon-runtime size/wielding authorities.
// Weapon shapes are the REAL canonical attack shapes (shapeOfWeapon over data/weapons/canonical-weapon-registry.json); only the wielder
// size, assignments and choices are hypothetical. grip-supported is not readiness, an attack permission or a posture.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { resolveEquipmentGrips, GripInputError, GRIP_STATUS: G } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-grip-resolver.js');
const { resolvePhysicalOccupancy } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-capability-resolver.js');
const { resolveEffectiveAnatomy } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js');
const { resolveSpeciesEquipmentPermissions } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/species-equipment-permissions.js');
const { resolveInstalledDroidComponents } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js');
const { getDroidPartDefinition, normalizeDroidPartId } = await import('/systems/foundryvtt-swse/scripts/data/droid-part-schema.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { applySpeciesVariantProfile } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const collect = (o, acc = []) => { if (o && typeof o === 'object') { acc.push(o); Object.values(o).forEach((v) => collect(v, acc)); } return acc; };
const codes = (r) => r.issues.map((i) => i.code);
const aCodes = (a) => a.issues.map((i) => i.code);

// canonical shapes (real registry data under a deliberately wrong Item name)
const shapeOf = (key) => rt.shapeOfWeapon({ id: 'x', name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: key } } }, system: {} }, {});
const SABER = shapeOf('lightsaber-chassis-archaic-lightsaber'); // Medium
const DUELING = shapeOf('lightsaber-chassis-dueling');         // Medium
const GREAT = shapeOf('lightsaber-chassis-great');             // Large
const SHORT = shapeOf('lightsaber-chassis-short');             // Small
const GARROTE = shapeOf('unmapped::Garrote');                  // Small, requiresTwoHands
const LIGHTFOIL = shapeOf('weapon-lightfoil');                 // Medium, cannot wield two-handed, may count as Small
const FLAME = shapeOf('weapon-flame-cannon');                  // Large, one size smaller on a tripod
const WRIST = shapeOf('weapon-wrist-blaster');                 // worn
for (const s of [SABER, DUELING, GREAT, SHORT, GARROTE, LIGHTFOIL, FLAME, WRIST]) assert.equal(s.source, 'canonical');

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
function run({ anatomy = human, assignments, weapons, perms, size = 'Medium' }) {
  const permissions = perms === undefined ? undefined : perms;
  const occupancy = resolvePhysicalOccupancy({ anatomy, speciesPermissions: permissions, assignments });
  return { occupancy, grip: resolveEquipmentGrips({ occupancy, wielderSize: size, speciesPermissions: permissions, weapons }) };
}
const one = (r) => r.grip.assessments[0];
const throwsCode = (fn, code) => assert.throws(fn, (e) => e instanceof GripInputError && e.code === code, code);

// 1-3
{
  const r = run({ assignments: [as('s', [A1])], weapons: [w('s', SABER, { gripOption: 1 })] });
  assert.equal(r.grip.status, G.SUPPORTED); assert.equal(one(r).requiredHands, 1); assert.equal(one(r).grip, 'one-handed'); assert.equal(one(r).canonicalWielding.source, 'option');
  ok('1: ordinary Medium weapon, chosen one-handed grip, one capable appendage: grip-supported');
  const two = run({ assignments: [as('a', [A1]), as('b', [A2])], weapons: [w('a', SABER, { gripOption: 1 }), w('b', DUELING, { gripOption: 'one-handed' })] });
  assert.equal(two.grip.status, G.SUPPORTED); assert.equal(two.grip.assessments.length, 2);
  ok('2: two independent one-handed weapons with non-conflicting occupancy: grip-supported');
  const big = run({ assignments: [as('g', [A1, A2])], weapons: [w('g', GREAT)] });
  assert.equal(big.grip.status, G.SUPPORTED); assert.equal(one(big).requiredHands, 2); assert.equal(one(big).canonicalSize.classification, 'two-handed'); assert.equal(one(big).canonicalWielding.source, 'size');
  ok('3: a size-required two-handed weapon with two available arms: grip-supported (grip derived by the canonical size authority)');
}

// 4-8
{
  const r4 = run({ assignments: [as('g', [A1])], weapons: [w('g', GREAT)] });
  assert.equal(r4.grip.status, G.BLOCKED); assert.ok(aCodes(one(r4)).includes('insufficient-appendages-for-grip'));
  const r4b = run({ assignments: [as('g', [A1])], weapons: [w('g', GARROTE)] });
  assert.equal(r4b.grip.status, G.BLOCKED); assert.equal(one(r4b).requiredHands, 2);
  ok('4: a required two-handed weapon assigned one arm: blocked (size-required Large weapon and mandatory-two-handed Garrote)');
  const r5 = run({ assignments: [as('g', [A1])], weapons: [w('g', GARROTE, { gripOption: 1 })] });
  assert.equal(r5.grip.status, G.BLOCKED); assert.equal(one(r5).canonicalWielding.reason, 'requires-two-hands');
  const r5b = run({ assignments: [as('g', [A1])], weapons: [w('g', GREAT, { gripOption: 1 })] });
  assert.equal(r5b.grip.status, G.BLOCKED); assert.equal(one(r5b).canonicalWielding.reason, 'requires-two-hands');
  ok('5: a chosen one-handed grip contradicting a mandatory two-handed requirement: blocked with the original reason');
  const r6 = run({ assignments: [as('l', [A1, A2])], weapons: [w('l', LIGHTFOIL, { gripOption: 2 })] });
  assert.equal(r6.grip.status, G.BLOCKED); assert.equal(one(r6).canonicalWielding.reason, 'cannot-wield-two-handed');
  ok('6: a weapon prohibited from two-handed wielding with a two-handed choice: blocked');
  const r7 = run({ assignments: [as('g', [A1, A2])], weapons: [w('g', GREAT)], size: 'Small' });
  assert.equal(r7.grip.status, G.BLOCKED); assert.equal(one(r7).canonicalWielding.reason, 'too-large-to-wield'); assert.equal(one(r7).canonicalSize.legal, false);
  ok('7: a weapon too large for its wielder: the authoritative refusal is preserved');
  const r8 = run({ assignments: [as('s', [A1])], weapons: [w('s', SHORT, { gripOption: 1 })] });
  assert.equal(r8.grip.status, G.SUPPORTED); assert.equal(one(r8).canonicalSize.classification, 'light');
  ok('8: a light weapon with a legal explicit grip: grip-supported');
}

// 9-13
{
  const r9 = run({ assignments: [as('s', [A1])], weapons: [w('s', SABER)] });
  assert.equal(r9.grip.status, G.INDETERMINATE); assert.ok(aCodes(one(r9)).includes('grip-unestablished')); assert.equal(one(r9).canonicalWielding.legal, true, 'the resolver itself said legal:true with no hands');
  assert.equal(one(r9).canonicalWielding.hands, undefined);
  ok('9: an unanswered grip is indeterminate (legal:true without hands is not a verified grip; it is never treated as one-handed)');
  for (const size of ['Gigantic', null, '']) {
    const r = run({ assignments: [as('s', [A1])], weapons: [w('s', SABER, { gripOption: 1 })], size });
    assert.equal(r.grip.status, G.INDETERMINATE); assert.ok(aCodes(one(r)).includes('wielder-size-unknown'));
  }
  ok('10: a missing or invalid wielder size is indeterminate');
  const noSize = { ...JSON.parse(JSON.stringify(SABER)), size: null }; // synthetic hypothetical: the canonical size is absent
  const r11 = run({ assignments: [as('s', [A1])], weapons: [w('s', noSize, { gripOption: 1 })] });
  assert.equal(r11.grip.status, G.INDETERMINATE); assert.ok(aCodes(one(r11)).includes('weapon-size-unknown'));
  ok('11: missing canonical weapon size evidence is indeterminate (a non-false legality value is not positive evidence)');
  const r12 = run({ assignments: [as('f', [A1, A2])], weapons: [w('f', FLAME)] });
  assert.equal(r12.grip.status, G.INDETERMINATE); assert.ok(aCodes(one(r12)).includes('tripod-state-unestablished')); assert.equal(one(r12).canonicalSize.pending, 'tripod');
  const r12b = run({ assignments: [as('f', [A1])], weapons: [w('f', FLAME, { gripOption: 1 })] });
  assert.equal(r12b.grip.status, G.INDETERMINATE); assert.ok(aCodes(one(r12b)).includes('grip-requires-tripod-confirmation')); assert.equal(one(r12b).canonicalWielding.reason, 'grip-requires-tripod-confirmation');
  ok('12: an unknown tripod state that changes the grip is indeterminate; the one-handed refusal is an unknown (original reason kept), not a prohibition');
  const mounted = run({ assignments: [as('f', [A1])], weapons: [w('f', FLAME, { gripOption: 1, tripodMounted: true })] });
  assert.equal(mounted.grip.status, G.SUPPORTED); assert.equal(one(mounted).canonicalSize.source, 'tripod');
  const unmounted = run({ assignments: [as('f', [A1, A2])], weapons: [w('f', FLAME, { tripodMounted: false })] });
  assert.equal(unmounted.grip.status, G.SUPPORTED); assert.equal(one(unmounted).requiredHands, 2);
  ok('13: an explicit tripod state with an established legal grip is grip-supported');
}

// 14-17
{
  const adj = run({ assignments: [as('l', [A1])], weapons: [w('l', LIGHTFOIL, { gripOption: 1, beneficialSizeChoice: 'Small' })] });
  assert.equal(adj.grip.status, G.SUPPORTED); assert.equal(one(adj).canonicalSize.effectiveSize, 'Small'); assert.equal(one(adj).canonicalSize.source, 'beneficial-choice');
  ok('14: a canonical beneficial-size adjustment is applied');
  const forged = run({ assignments: [as('l', [A1])], weapons: [w('l', LIGHTFOIL, { gripOption: 1, beneficialSizeChoice: 'Tiny' })] });
  assert.equal(one(forged).canonicalSize.effectiveSize, 'Medium'); assert.equal(one(forged).canonicalSize.source, 'base');
  const noRule = run({ assignments: [as('g', [A1, A2])], weapons: [w('g', GREAT, { beneficialSizeChoice: 'Small' })] });
  assert.equal(one(noRule).canonicalSize.effectiveSize, 'Large'); assert.equal(one(noRule).requiredHands, 2);
  ok('15: an unapproved beneficial-size choice gains no size advantage');
  const owned = run({ assignments: [as('g', [A1, A2])], weapons: [w('g', GREAT, { ownedState: { wielded: 'two-handed' } })] });
  assert.equal(owned.grip.status, G.SUPPORTED); assert.equal(one(owned).canonicalWielding.source, 'state');
  const owned1 = run({ assignments: [as('s', [A1])], weapons: [w('s', SABER, { ownedState: { wielded: 'one-handed' } })] });
  assert.equal(owned1.grip.status, G.SUPPORTED); assert.equal(one(owned1).canonicalWielding.source, 'state');
  ok('16: the owned-state grip selection is honored');
  const prec = run({ assignments: [as('s', [A1])], weapons: [w('s', SABER, { gripOption: 1, ownedState: { wielded: 'two-handed' } })] });
  assert.equal(prec.grip.status, G.SUPPORTED); assert.equal(one(prec).canonicalWielding.source, 'option'); assert.equal(one(prec).requiredHands, 1);
  ok('17: an explicit grip option takes precedence over the owned-state selection');
}

// 18-23
{
  const r = run({ assignments: [as('s', [A1, A2])], weapons: [w('s', SABER, { gripOption: 1 })] });
  assert.equal(r.grip.status, G.BLOCKED); assert.notEqual(r.grip.status, G.SUPPORTED); assert.ok(aCodes(one(r)).includes('excess-appendages-for-grip')); assert.equal(one(r).grip, 'one-handed');
  ok('18: a chosen one-handed grip with a two-appendage assignment is not certified as two-handed');
  const c = run({ assignments: [as('a', [A1]), as('b', [A1])], weapons: [w('a', SABER, { gripOption: 1 }), w('b', DUELING, { gripOption: 1 })] });
  assert.equal(c.grip.status, G.BLOCKED); assert.deepEqual(c.grip.conflicts, [{ appendageId: A1, slot: A1, itemIds: ['a', 'b'] }]); assert.equal(c.grip.occupancyStatus, 'physically-blocked');
  ok('19: a reused appendage is blocked through the E3-A2 conflict evidence, which is preserved');
  const dis = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { name: 'H' }, functionalOverrides: { [A1]: 'disabled', [A2]: 'missing' } });
  for (const arm of [A1, A2]) assert.equal(run({ anatomy: dis, assignments: [as('s', [arm])], weapons: [w('s', SABER, { gripOption: 1 })] }).grip.status, G.BLOCKED);
  ok('20: a disabled or missing appendage cannot support a grip');
  const dug = effective('dug-cw-2h-01'); const dugA = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: dug });
  const r21 = run({ anatomy: dugA, assignments: [as('s', ['lower-limb-1'])], weapons: [w('s', SABER, { gripOption: 1 })], size: 'Medium' });
  assert.equal(r21.grip.status, G.INDETERMINATE); assert.equal(one(r21).occupancyStatus, 'indeterminate'); assert.equal(one(r21).status, G.INDETERMINATE);
  ok('21: unknown wielding capability stays indeterminate even when the canonical grip is fine');
  for (const v of ['ryn-sv-2f-06', 'trianii-gaw-2i-06']) {
    const p = effective(v);
    const rw = run({ anatomy: resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: p }), assignments: [as('s', ['tail-1'])], weapons: [w('s', SHORT, { gripOption: 1 })], perms: resolveSpeciesEquipmentPermissions(p) });
    assert.equal(rw.grip.status, G.BLOCKED);
  }
  ok('22: Ryn and Trianii tails cannot wield (physical block preserved)');
  const rynP = effective('ryn-sv-2f-06'); const triP = effective('trianii-gaw-2i-06');
  const hold = run({ anatomy: resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: rynP }), assignments: [as('sack', ['tail-1'], 'hold')], weapons: [], perms: resolveSpeciesEquipmentPermissions(rynP) });
  assert.equal(hold.grip.status, G.INDETERMINATE); assert.equal(hold.grip.pendingConstraints.length, 1); assert.equal(hold.grip.pendingConstraints[0].constraint.type, 'held-item-load-floor'); assert.equal(hold.grip.pendingConstraints[0].evaluation, 'unevaluated');
  assert.ok(!('encumbered' in hold.grip) && !hold.grip.pendingConstraints[0].constraint.computedLoad, 'nothing is computed');
  const triHold = run({ anatomy: resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: triP }), assignments: [as('sack', ['tail-1'], 'hold')], weapons: [], perms: resolveSpeciesEquipmentPermissions(triP) });
  assert.equal(triHold.grip.pendingConstraints[0].constraint.type, 'held-item-load-floor');
  ok('23: Ryn and Trianii holding constraints remain pending and unevaluated (no encumbrance calculation)');
}

// 24-28
{
  const cj = effective('codru-ji-leg-2c-03'); const cjA = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: cj }); const cjP = resolveSpeciesEquipmentPermissions(cj);
  const two = { anatomy: cjA, perms: cjP, assignments: [as('g1', ['arm-1', 'arm-2']), as('g2', ['arm-3', 'arm-4'])], weapons: [w('g1', GREAT), w('g2', GREAT)] };
  const r24 = run(two);
  assert.equal(r24.occupancy.status, 'physically-compatible'); assert.equal(r24.grip.status, G.SUPPORTED);
  assert.deepEqual(r24.grip.simultaneousTwoHanded, { count: 2, permissionId: 'codru-ji-extra-arms', verified: true });
  assert.ok(r24.grip.assessments.every((a) => a.requiredHands === 2 && a.assignedAppendageCount === 2));
  ok('24: Codru-Ji (real profile): two two-handed weapons on separate arm pairs with the exact verified permission: grip-supported');
  const kl = effective('killik-ur-2b-12'); const klA = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: kl });
  const r25 = run({ anatomy: klA, perms: resolveSpeciesEquipmentPermissions(kl), assignments: [as('g1', ['arm-1', 'arm-2']), as('g2', ['arm-3', 'arm-4'])], weapons: [w('g1', GREAT), w('g2', GREAT)] });
  assert.equal(r25.occupancy.status, 'physically-compatible'); assert.equal(r25.grip.status, G.INDETERMINATE); assert.ok(codes(r25.grip).includes('simultaneous-two-handed-weapons-unestablished'));
  assert.equal(r25.grip.simultaneousTwoHanded.verified, false); assert.ok(r25.grip.assessments.every((a) => a.status === G.INDETERMINATE));
  const klOne = run({ anatomy: klA, perms: resolveSpeciesEquipmentPermissions(kl), assignments: [as('g1', ['arm-1', 'arm-2']), as('o', ['arm-3'])], weapons: [w('g1', GREAT), w('o', SABER, { gripOption: 1 })] });
  assert.equal(klOne.grip.status, G.SUPPORTED, 'one two-handed plus a one-handed weapon needs no special permission (no universal ban)');
  ok('25: Killik four arms do not inherit the Codru-Ji permission (indeterminate, neither granted nor prohibited); ordinary combinations stay supported');
  const broken = resolveSpeciesEquipmentPermissions({ ...cj, canonicalTraits: [] });
  assert.equal(broken.status, 'recognized-incomplete-evidence');
  const r26 = run({ ...two, perms: broken });
  assert.equal(r26.grip.status, G.INDETERMINATE); assert.ok(codes(r26.grip).includes('special-permission-evidence-incomplete'));
  const none = run({ ...two, perms: undefined });
  assert.equal(none.grip.status, G.INDETERMINATE); assert.ok(codes(none.grip).includes('simultaneous-two-handed-weapons-unestablished'));
  ok('26: missing or contradictory Codru-Ji permission evidence prevents certifying the special arrangement');
  const keys = new Set(collect(r24.grip).flatMap((o) => (Array.isArray(o) ? [] : Object.keys(o))));
  for (const k of ['attacks', 'attackCount', 'extraAttacks', 'additionalAttacks', 'attacksGranted']) assert.ok(!keys.has(k), k);
  ok('27: two-handed physical occupancy alone grants no extra attack');
  const heldGreat = run({ assignments: [as('g', [A1], 'hold')], weapons: [] });
  assert.equal(heldGreat.grip.assessments[0].grip, 'not-assessed-hold-only'); assert.equal(heldGreat.grip.assessments[0].requiredHands, null);
  const wrong = run({ assignments: [as('g', [A1])], weapons: [w('g', GREAT, { gripOption: 1 })] });
  assert.equal(wrong.grip.status, G.BLOCKED);
  const allKeys = new Set([...collect(heldGreat.grip), ...collect(wrong.grip)].flatMap((o) => (Array.isArray(o) ? [] : Object.keys(o))));
  for (const k of ['ready', 'readied', 'posture', 'equipped', 'drawn', 'attackEligible']) assert.ok(!allKeys.has(k), k);
  ok('28: a physically held or wrongly gripped weapon is never reported ready; hold assignments stay physical-holding evidence');
}

// 29-31
{
  const ryn = effective('ryn-sv-2f-06');
  const r29 = run({ anatomy: resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: ryn }), perms: resolveSpeciesEquipmentPermissions(ryn), assignments: [as('s', ['arm-1'])], weapons: [w('s', SABER, { gripOption: 1 })] });
  assert.equal(one(r29).status, G.SUPPORTED); assert.equal(r29.grip.status, G.INDETERMINATE); assert.ok(codes(r29.grip).includes('occupancy-not-compatible'));
  const unres = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { anatomy: { schemaVersion: 1, topologyStatus: 'unresolved', appendages: [] } } });
  const r29b = run({ anatomy: unres, assignments: [as('s', ['arm-1'])], weapons: [w('s', SABER, { gripOption: 1 })] });
  assert.equal(r29b.grip.status, G.INDETERMINATE);
  ok('29: partial or unresolved overall anatomy never yields a global grip-supported status');
  const item = (id, partId) => ({ id, type: 'droid-system', name: partId, system: { droidPartId: partId, integrated: true }, flags: {} });
  const installed = resolveInstalledDroidComponents(deepFreeze({ system: {}, items: [item('itm_hand_A', 'hand')] }), { normalizeId: normalizeDroidPartId, getDefinition: getDroidPartDefinition });
  const droid = resolveEffectiveAnatomy({ actorType: 'droid', installedComponents: installed });
  const r30 = run({ anatomy: droid, assignments: [as('s', ['hand'])], weapons: [w('s', SABER, { gripOption: 1 })] });
  assert.equal(r30.grip.status, G.INDETERMINATE); assert.deepEqual(r30.occupancy.occupancy, []);
  ok('30: real legacy droid anatomy gains no invented manipulators');
  const worn = run({ assignments: [as('wb', [A1])], weapons: [w('wb', WRIST, { gripOption: 1 })] });
  assert.equal(worn.grip.status, G.INDETERMINATE); assert.ok(aCodes(one(worn)).includes('worn-weapon-configuration-uncertified'));
  const hosted = run({ assignments: [as('s', [A1])], weapons: [w('s', SABER, { gripOption: 1, ownedState: { mountedHostId: 'rifle-1' } })] });
  assert.equal(hosted.grip.status, G.INDETERMINATE); assert.ok(aCodes(one(hosted)).includes('host-mount-configuration-uncertified'));
  assert.ok(!worn.grip.assessments.some((a) => a.assignedAppendageCount === 0));
  ok('31: uncertified worn and host-mounted configurations stay indeterminate; no zero-hand permission');
}

// 32-36
{
  const r = run({ assignments: [as('item-77', [A1])], weapons: [w('item-77', SABER, { gripOption: 1 })] });
  assert.equal(one(r).itemId, 'item-77'); assert.equal(one(r).weaponIdentityKey, 'lightsaber-chassis-archaic-lightsaber'); assert.deepEqual(one(r).appendageIds, [A1]);
  ok('32: item and canonical weapon identity evidence is preserved (matching is by itemId, never by name)');
  const frozenIn = deepFreeze({ occupancy: JSON.parse(JSON.stringify(r.occupancy)), wielderSize: 'Medium', speciesPermissions: null, weapons: [{ itemId: 'item-77', shape: JSON.parse(JSON.stringify(SABER)), gripOption: 1 }] });
  const before = JSON.stringify(frozenIn); resolveEquipmentGrips(frozenIn);
  assert.equal(JSON.stringify(frozenIn), before);
  ok('33: frozen inputs remain unchanged');
  const live = { occupancy: JSON.parse(JSON.stringify(r.occupancy)), wielderSize: 'Medium', weapons: [{ itemId: 'item-77', shape: JSON.parse(JSON.stringify(SABER)), gripOption: 1, ownedState: { wielded: 'one-handed' } }] };
  const lb = JSON.stringify(live); const out = resolveEquipmentGrips(live);
  assert.equal(JSON.stringify(live), lb); assert.ok(collect(live).every((o) => !Object.isFrozen(o)));
  ok('34: unfrozen caller-owned objects are neither mutated nor frozen');
  const owned = new Set(collect(live));
  assert.ok(collect(out).every((o) => Object.isFrozen(o))); assert.ok(collect(out).every((o) => !owned.has(o)));
  ok('35: results are deeply frozen and share no object with caller data');
  const mk = () => run({ assignments: [as('g', [A1, A2])], weapons: [w('g', GREAT)] }).grip;
  assert.equal(JSON.stringify(mk()), JSON.stringify(mk()));
  ok('36: repeated results are deterministic');
}

// 37-38
{
  const occ = resolvePhysicalOccupancy({ anatomy: human, assignments: [as('s', [A1])] });
  const base = { occupancy: occ, wielderSize: 'Medium', weapons: [] };
  for (const [bad, code] of [
    [undefined, 'INVALID_INPUT'], [[], 'INVALID_INPUT'], [{ weapons: [] }, 'INVALID_OCCUPANCY'], [{ ...base, occupancy: { status: 'x', assignments: [] } }, 'INVALID_OCCUPANCY'],
    [{ ...base, speciesPermissions: 'x' }, 'INVALID_SPECIES_PERMISSIONS'], [{ occupancy: occ }, 'INVALID_WEAPONS'], [{ ...base, weapons: 'x' }, 'INVALID_WEAPONS'],
    [{ ...base, weapons: [null] }, 'INVALID_WEAPON_FACT'], [{ ...base, weapons: [{ itemId: 's', shape: SABER, extra: 1 }] }, 'INVALID_WEAPON_FACT'],
    [{ ...base, weapons: [{ itemId: 's', shape: SABER, requiredHands: 1 }] }, 'FORBIDDEN_OVERRIDE'], [{ ...base, weapons: [{ itemId: 's', shape: { ...SABER, requiredHands: 1 } }] }, 'FORBIDDEN_OVERRIDE'],
    [{ ...base, weapons: [{ itemId: '', shape: SABER }] }, 'INVALID_ITEM_ID'], [{ ...base, weapons: [{ itemId: 'zzz', shape: SABER }] }, 'WEAPON_FACT_WITHOUT_ASSIGNMENT'],
    [{ ...base, weapons: [{ itemId: 's', shape: SABER }, { itemId: 's', shape: SABER }] }, 'DUPLICATE_WEAPON_FACT'], [{ ...base, weapons: [{ itemId: 's' }] }, 'INVALID_SHAPE'],
    [{ ...base, weapons: [{ itemId: 's', shape: SABER, gripOption: 3 }] }, 'INVALID_GRIP_OPTION'], [{ ...base, weapons: [{ itemId: 's', shape: SABER, ownedState: 'x' }] }, 'INVALID_OWNED_STATE'],
    [{ ...base, weapons: [{ itemId: 's', shape: SABER, tripodMounted: 'yes' }] }, 'INVALID_OWNED_STATE'],
  ]) { throwsCode(() => resolveEquipmentGrips(bad), code); throwsCode(() => resolveEquipmentGrips(bad), code); }
  ok('37: malformed API input raises stable, documented, deterministic errors (a caller-supplied requiredHands is rejected)');
  const src = readFileSync(new URL('../scripts/engine/equipment/equipment-grip-resolver.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const forbidden of [/ActorEngine/, /InventoryEngine/, /FireStateStore/, /ActionEconomy/, /EncumbranceEngine/, /\.update\(/, /\.setFlag\(/, /Hooks\./, /\bgame\./, /\bui\./, /attack-consumer/, /combat/i]) assert.ok(!forbidden.test(src), `forbidden dependency ${forbidden}`);
  const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ['/systems/foundryvtt-swse/scripts/items/weapon-runtime/owned-state.js', '/systems/foundryvtt-swse/scripts/items/weapon-runtime/wielding-size.js']);
  ok('38: no actor/item change, readiness update, action spend or combat decision is reachable; only the two pure weapon-runtime modules are imported');
}

console.log(`equipment-e3a3-weapon-grip-integration: ${n} checks passed`);
