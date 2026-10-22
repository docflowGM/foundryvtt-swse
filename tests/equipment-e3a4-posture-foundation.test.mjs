import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E3-A4 -- clean-break equipment posture foundation. Posture is an EXPLICIT three-valued declaration (STOWED / EQUIPPED / READIED).
// Legacy booleans (system.equipped, active, activated, ...) never establish it, a declaration is not verified readiness, and the module
// persists, reads and decides nothing else. The "documented migration hazard" checks pin what the CURRENT legacy predicate still does so the
// later coordinated cutover has regression evidence; they assert no new behavior.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const posture = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-posture.js');
const { projectEquipmentPosture, isEquipmentPosture, EQUIPMENT_POSTURE: P, EQUIPMENT_POSTURES, POSTURE_PROJECTION_STATUS: S, IGNORED_LEGACY_POSTURE_KEYS } = posture;
const { isItemEquipped } = await import('/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js');
const { resolvePhysicalOccupancy } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-capability-resolver.js');
const { resolveEquipmentGrips } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-grip-resolver.js');
const { resolveEffectiveAnatomy } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const collect = (o, acc = []) => { if (o && typeof o === 'object') { acc.push(o); Object.values(o).forEach((v) => collect(v, acc)); } return acc; };
const codes = (r) => r.issues.map((i) => i.code);
const keysOf = (r) => new Set(collect(r).flatMap((o) => (Array.isArray(o) ? [] : Object.keys(o))));

// 1-3 declarations
for (const [name, held] of [['STOWED', false], ['EQUIPPED', true], ['READIED', true]]) {
  const r = projectEquipmentPosture({ posture: name });
  assert.equal(r.status, S.DECLARED); assert.equal(r.posture, name); assert.equal(r.declaredPhysicalHold, held);
  assert.deepEqual(r.verification, { physicalOccupancy: 'unverified', gripLegality: 'unverified', readiness: 'unverified' });
}
assert.deepEqual([...EQUIPMENT_POSTURES], ['STOWED', 'EQUIPPED', 'READIED']);
ok('1-3: STOWED, EQUIPPED and READIED declarations are accepted; the vocabulary is exactly these three');

// 4 invalid
for (const bad of ['readied', 'Readied', 'DRAWN', '', 'EQUIPPED ', true, false, 1, 0, null, {}, [], ['READIED'], 'toString', '__proto__', 'constructor']) {
  const r = projectEquipmentPosture({ posture: bad });
  if (bad === null) { assert.equal(r.status, S.INVALID); } else assert.equal(r.status, S.INVALID, String(bad));
  assert.equal(r.posture, null); assert.ok(codes(r).includes('posture-invalid'));
}
for (const bad of ['READIED', 7, true, [], () => {}]) { const r = projectEquipmentPosture(bad); assert.equal(r.posture, null); assert.notEqual(r.status, S.DECLARED); }
assert.equal(isEquipmentPosture('READIED'), true); assert.equal(isEquipmentPosture('readied'), false); assert.equal(isEquipmentPosture('toString'), false);
ok('4: invalid postures are rejected (exact, case-sensitive; booleans, numbers, prototype names and bare strings never qualify)');

// 5 missing
for (const none of [undefined, null, {}, { posture: undefined }, { other: 1 }]) {
  const r = projectEquipmentPosture(none);
  assert.equal(r.status, S.ABSENT); assert.equal(r.posture, null); assert.equal(r.declaredPhysicalHold, null); assert.ok(codes(r).includes('posture-not-declared'));
}
ok('5: missing posture evidence never becomes READIED (or any posture)');

// 6-7 legacy fields
const legacyDoc = { system: { equipped: true, isEquipped: true, readied: true, active: true, activated: true, equippable: { equipped: true, active: true }, equipStatus: 'equipped', status: 'equipped', state: 'equipped' }, flags: { swse: { equipped: true } } };
{
  const r6 = projectEquipmentPosture({ equipped: true, isEquipped: true, readied: true, equippable: { equipped: true }, equipStatus: 'equipped', status: 'equipped', state: 'equipped' });
  assert.equal(r6.status, S.ABSENT); assert.equal(r6.posture, null);
  const ig = r6.issues.find((i) => i.code === 'legacy-posture-fields-ignored');
  assert.deepEqual(ig.details.fields, ['equipStatus', 'equippable', 'equipped', 'isEquipped', 'readied', 'state', 'status']); assert.equal(ig.severity, 'info');
  assert.equal(projectEquipmentPosture(legacyDoc).posture, null, 'a whole legacy item document establishes nothing (it is not even read)');
  const mixed = projectEquipmentPosture({ posture: 'STOWED', equipped: true, active: true });
  assert.equal(mixed.posture, 'STOWED', 'an explicit declaration wins; legacy booleans do not contradict or upgrade it');
  ok('6: legacy system.equipped / aliases never establish posture; an explicit declaration is not altered by them');
  const r7 = projectEquipmentPosture({ active: true, activated: true });
  assert.equal(r7.status, S.ABSENT); assert.equal(r7.posture, null); assert.deepEqual(r7.issues.find((i) => i.code === 'legacy-posture-fields-ignored').details.fields, ['activated', 'active']);
  ok('7: activation booleans (active, activated) do not establish posture');
}

// documented migration hazard: what the CURRENT legacy predicate does (unchanged here)
{
  assert.equal(isItemEquipped({ system: { equipped: true } }), true);
  assert.equal(isItemEquipped({ system: { active: true } }), true, 'HAZARD: the legacy reader treats system.active as equipped');
  assert.equal(isItemEquipped({ system: { activated: true } }), false, 'HAZARD: ...but system.activated is not an equip alias, so the two activation names differ');
  assert.equal(projectEquipmentPosture({ active: true }).posture, null);
  ok('hazard (labeled): the legacy isItemEquipped() still conflates system.active with posture; the posture contract does not');
}

// 8 EQUIPPED != READIED
{
  const e = projectEquipmentPosture({ posture: 'EQUIPPED' }); const r = projectEquipmentPosture({ posture: 'READIED' });
  assert.notEqual(e.posture, r.posture); assert.equal(e.declaredPhysicalHold, true);
  assert.ok(!codes(e).includes('readied-is-declared-not-verified')); assert.ok(codes(r).includes('readied-is-declared-not-verified'));
  ok('8: EQUIPPED (held) is distinct from READIED');
}
// 9 declared vs verified
{
  const r = projectEquipmentPosture({ posture: 'READIED' });
  assert.equal(r.verification.readiness, 'unverified'); assert.equal(r.verification.physicalOccupancy, 'unverified'); assert.equal(r.verification.gripLegality, 'unverified');
  assert.ok(!('verified' in r) && !('readinessVerified' in r));
  ok('9: a declared READIED is distinguishable from externally verified readiness (always reported unverified here)');
}

// 10-12 occupancy / grip / attack do not grant readiness
const SABER = rt.shapeOfWeapon({ id: 'x', name: 'Renamed', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } }, system: {} }, {});
const human = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: { name: 'Human' } });
const occupancy = resolvePhysicalOccupancy({ anatomy: human, assignments: [{ itemId: 's', purpose: 'wield', appendageIds: ['natural-arm-1'] }] });
const grip = resolveEquipmentGrips({ occupancy, wielderSize: 'Medium', weapons: [{ itemId: 's', shape: SABER, gripOption: 1 }] });
{
  assert.equal(occupancy.status, 'physically-compatible');
  const k = keysOf(occupancy);
  for (const forbidden of ['posture', 'ready', 'readied', 'readiness']) assert.ok(!k.has(forbidden), forbidden);
  assert.equal(projectEquipmentPosture(undefined).posture, null, 'compatible occupancy does not supply a posture');
  ok('10: physical occupancy alone grants no readiness or posture');
  assert.equal(grip.status, 'grip-supported');
  const gk = keysOf(grip);
  for (const forbidden of ['posture', 'ready', 'readied', 'readiness']) assert.ok(!gk.has(forbidden), forbidden);
  assert.equal(projectEquipmentPosture({}).posture, null);
  ok('11: a legal grip (grip-supported) alone grants no readiness or posture');
  const declared = projectEquipmentPosture({ posture: 'READIED' });
  for (const forbidden of ['attack', 'attacks', 'attackEligible', 'attackAuthorized', 'actionCost', 'actions', 'grip', 'appendageIds', 'occupancy']) assert.ok(!keysOf(declared).has(forbidden) && !keysOf(grip).has('attackAuthorized'), forbidden);
  assert.ok(!keysOf(grip).has('attacks') && !keysOf(grip).has('attackEligible'));
  ok('12: a readied weapon gains no attack: neither the posture result nor the grip result carries attack, action or eligibility data');
}

// 13 no duplicated persisted state
{
  const src = readFileSync(new URL('../scripts/engine/equipment/equipment-posture.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/\bimport\b/.test(src), 'no imports: no engine, document or settings access');
  for (const forbidden of [/ActorEngine/, /InventoryEngine/, /FireStateStore/, /\.update\(/, /\.setFlag\(/, /\.unsetFlag\(/, /updateOwned/, /game\./, /Hooks\./, /\bui\./, /localStorage/, /ActionEconomy/]) assert.ok(!forbidden.test(src), `${forbidden}`);
  const tpl = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
  assert.ok(!JSON.stringify(tpl).includes('"posture"'), 'no posture field is introduced into the existing item schema');
  assert.deepEqual(Object.keys(posture).sort(), ['EQUIPMENT_POSTURE', 'EQUIPMENT_POSTURES', 'IGNORED_LEGACY_POSTURE_KEYS', 'POSTURE_PROJECTION_STATUS', 'default', 'isEquipmentPosture', 'projectEquipmentPosture']);
  ok('13: the module persists nothing and adds no state: no imports, no writers, no schema field');
}

// 14-16 purity
{
  const input = deepFreeze({ posture: 'READIED', equipped: false, nested: { a: 1 } });
  const before = JSON.stringify(input);
  const r = projectEquipmentPosture(input);
  assert.equal(JSON.stringify(input), before);
  const live = { posture: 'EQUIPPED', equipped: true }; const lb = JSON.stringify(live);
  const out = projectEquipmentPosture(live);
  assert.equal(JSON.stringify(live), lb); assert.ok(!Object.isFrozen(live)); assert.ok(collect(out).every((o) => !collect(live).includes(o)));
  ok('14: inputs remain unchanged (frozen inputs accepted; live inputs neither mutated nor frozen)');
  assert.ok(collect(r).every((o) => Object.isFrozen(o))); assert.ok(Object.isFrozen(P) && Object.isFrozen(EQUIPMENT_POSTURES) && Object.isFrozen(IGNORED_LEGACY_POSTURE_KEYS));
  for (const bad of [undefined, { posture: 'x' }, { active: true }]) assert.ok(collect(projectEquipmentPosture(bad)).every((o) => Object.isFrozen(o)));
  ok('15: output and exported vocabularies are deeply frozen');
  assert.equal(JSON.stringify(projectEquipmentPosture({ posture: 'READIED', active: true })), JSON.stringify(projectEquipmentPosture({ posture: 'READIED', active: true })));
  assert.deepEqual(projectEquipmentPosture({ posture: 'READIED', active: true, equipped: true }).issues.map((i) => i.code), ['legacy-posture-fields-ignored', 'readied-is-declared-not-verified']);
  ok('16: repeated results are deterministic (including diagnostic order)');
}

console.log(`equipment-e3a4-posture-foundation: ${n} checks passed`);
