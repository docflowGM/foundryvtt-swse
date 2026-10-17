import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E4-C1 WP1 + WP2 (NOT CONVERGED) -- canonical weapon schema/defaults and the pure record validator + read-only equipment-state reader.
// Weapon shapes are the REAL canonical shapes (renamed Items prove identity, never the name, is used). No coordinator, no writer, no spend.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const inv = await import('/systems/foundryvtt-swse/scripts/engine/equipment/weapon-record-invariants.js');
const { validateWeaponRecord, validateWeaponRecordTransition, createDefaultWeaponRecord, WeaponRecordInputError, WEAPON_RECORD_STATUS: R } = inv;
const reader = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-reader.js');
const { readActorEquipmentState, readWeaponEffectivePosture, EquipmentStateInputError } = reader;
const { resolveEffectiveEquipmentPosture } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/effective-equipment-posture.js');
const { BLANK_ITEM_DEFAULTS, normalizeItemSystem, createBlankItemData } = await import('/systems/foundryvtt-swse/scripts/items/item-defaults.js');
const { createSafeItemData } = await import('/systems/foundryvtt-swse/scripts/engine/items/safe-item-factory.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const collect = (o, acc = []) => { if (o && typeof o === 'object') { acc.push(o); Object.values(o).forEach((v) => collect(v, acc)); } return acc; };
const codes = (r) => r.issues.map((i) => i.code);
const REC = (posture, purpose, appendageIds) => ({ weaponPosture: posture, weaponOccupancy: { schemaVersion: 1, purpose, appendageIds } });

// ---------------------------------------------------------------- WP1: schema and defaults
const tpl = JSON.parse(read('template.json'));
const weaponTpl = tpl.Item.weapon;
{
  assert.equal(weaponTpl.weaponPosture, 'STOWED');
  assert.deepEqual(weaponTpl.weaponOccupancy, { schemaVersion: 1, purpose: null, appendageIds: [] });
  for (const k of ['equipped', 'dualWielded', 'wieldedTwoHanded']) assert.ok(!(k in weaponTpl), `weapon template must not carry ${k}`);
  assert.deepEqual(createDefaultWeaponRecord(), { weaponPosture: weaponTpl.weaponPosture, weaponOccupancy: weaponTpl.weaponOccupancy });
  assert.equal(validateWeaponRecord(createDefaultWeaponRecord()).status, R.VALID);
  ok('1: the weapon template carries weaponPosture STOWED and the empty v1 occupancy record, and no retired equip/grip booleans; the default record validates');
}
{
  const blank = BLANK_ITEM_DEFAULTS.weapon;
  assert.deepEqual({ p: blank.weaponPosture, o: blank.weaponOccupancy }, { p: weaponTpl.weaponPosture, o: weaponTpl.weaponOccupancy });
  const safe = createSafeItemData('weapon', {}).system;
  assert.deepEqual({ p: safe.weaponPosture, o: safe.weaponOccupancy }, { p: weaponTpl.weaponPosture, o: weaponTpl.weaponOccupancy });
  const created = createBlankItemData('weapon').system;
  assert.equal(created.weaponPosture, 'STOWED');
  for (const sys of [blank, safe, created]) for (const k of ['equipped', 'dualWielded', 'wieldedTwoHanded']) assert.ok(!(k in sys), `new weapon defaults must not carry ${k}`);
  assert.notEqual(createBlankItemData('weapon').system.weaponOccupancy, created.weaponOccupancy, 'creation defaults are not shared mutable state');
  ok('2: blank-item defaults, the safe item factory and createBlankItemData all create STOWED weapons from the same record, with no retired booleans');
}
{
  for (const type of ['armor', 'equipment']) {
    assert.equal(BLANK_ITEM_DEFAULTS[type].equipped, false, `${type} blank default keeps worn state`);
    assert.equal(createSafeItemData(type, {}).system.equipped, false, `${type} safe default keeps worn state`);
  }
  for (const type of ['armor', 'equipment']) assert.ok(!JSON.stringify(tpl.Item[type]).includes('weaponPosture') && !JSON.stringify(tpl.Item[type]).includes('weaponOccupancy'), `${type} template carries no weapon record`);
  const shield = createSafeItemData('armor', { shieldMode: true }).system;
  assert.equal(shield.equipped, false);
  ok('3: armor, shield and equipment keep their worn-state semantics (nonregression)');
}
{
  // sheet normalization never fills defaults into an existing record and never lets a submit rewrite posture/occupancy
  const legacyOwned = { damage: '2d8', equipped: true, dualWielded: true };
  const norm = normalizeItemSystem('weapon', legacyOwned, { damage: '3d8' });
  assert.ok(!('weaponPosture' in norm) && !('weaponOccupancy' in norm), 'an absent owned record stays absent (not defaulted to STOWED)');
  const malformed = { weaponPosture: 'READY', weaponOccupancy: { schemaVersion: 7 } };
  const norm2 = normalizeItemSystem('weapon', malformed, {});
  assert.equal(norm2.weaponPosture, 'READY'); assert.equal(norm2.weaponOccupancy.schemaVersion, 7);
  const good = REC('EQUIPPED', 'hold', ['natural-arm-1']);
  const norm3 = normalizeItemSystem('weapon', good, REC('READIED', 'wield', ['natural-arm-2']));
  assert.deepEqual({ weaponPosture: norm3.weaponPosture, weaponOccupancy: norm3.weaponOccupancy }, good, 'a sheet submit cannot change the persisted record');
  assert.equal(good.weaponOccupancy.appendageIds.length, 1);
  assert.notEqual(norm3.weaponOccupancy, good.weaponOccupancy, 'the preserved record is a copy');
  assert.equal(normalizeItemSystem('armor', { equipped: true }, {}).equipped, true);
  ok('4: normalizeItemSystem preserves an owned record exactly (absent stays absent, malformed stays malformed, submits cannot rewrite it) and leaves armor untouched');
}
{
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const fn = (src, start, end) => { const a = src.indexOf(start); assert.ok(a >= 0, start); const b = src.indexOf(end, a + start.length); assert.ok(b > a, end); return strip(src.slice(a, b)); };
  const fin = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  const saber = fn(fin, 'static async _compileClassStarterEquipmentItems', 'static async _loadStarterLightsaberItemData') + fn(fin, 'static _buildFallbackStarterLightsaberItemData', 'effects: []');
  assert.ok(!/\bequipped\b|autoEquipped|dualWielded|wieldedTwoHanded/.test(saber), 'the starter lightsaber is created with no posture/equip flags (template default STOWED)');
  const eq = read('scripts/engine/progression/engine/equipment-engine.js');
  assert.ok(!/weapon\.equipped/.test(strip(eq)), 'starting weapons no longer derive an equipped value');
  assert.ok(/armor\.equipped !== false/.test(strip(eq)), 'starting armor keeps its worn state');
  const fol = fn(read('scripts/apps/follower-creator.js'), "type: 'weapon',", 'combat: {');
  assert.ok(!/\bequipped\b/.test(fol), 'follower natural weapons are not created equipped');
  for (const f of ['scripts/ui/chat/chat-interaction-bridge.js', 'scripts/patches/runtime-bugfix-hotfixes.js', 'scripts/sheets/v2/droid-actor-sheet.js']) {
    const s = strip(read(f)); const i = s.indexOf('integrated: true'); assert.ok(i > 0, f);
    assert.ok(!/equipped:\s*true/.test(s.slice(Math.max(0, i - 200), i + 40)), `${f}: the droid-integrated weapon materializer no longer writes equipped`);
  }
  const dlg = read('scripts/apps/custom-item-dialog.js');
  assert.equal((strip(dlg).match(/equipped: false/g) ?? []).length, 1, 'only the armor path of the custom item dialog keeps equipped:false');
  ok('5: creation producers (starter equipment, starter lightsaber, follower natural weapons, droid-integrated materializers, custom weapon dialog) no longer write weapon equip/grip state; armor paths unchanged');
}

// ---------------------------------------------------------------- WP2: record validator
{
  const v = validateWeaponRecord(REC('STOWED', null, []));
  assert.equal(v.status, R.VALID); assert.equal(v.posture, 'STOWED'); assert.deepEqual(v.occupancy, { schemaVersion: 1, purpose: null, appendageIds: [] });
  assert.equal(validateWeaponRecord(REC('EQUIPPED', 'hold', ['a'])).status, R.VALID);
  assert.equal(validateWeaponRecord(REC('EQUIPPED', 'wield', ['a'])).status, R.VALID);
  assert.equal(validateWeaponRecord(REC('READIED', 'wield', ['a', 'b'])).status, R.VALID);
  ok('6: all three postures validate in their legal shapes');
}
{
  const bad = (rec, code, opts) => { const r = validateWeaponRecord(rec, opts); assert.equal(r.status, R.INVALID, code); assert.ok(codes(r).includes(code), `${code} in ${codes(r)}`); assert.equal(r.posture, null); assert.equal(r.occupancy, null); return r; };
  bad(REC('STOWED', 'hold', ['a']), 'stowed-record-holds-appendages');
  bad(REC('STOWED', null, ['a']), 'stowed-record-holds-appendages');
  bad(REC('EQUIPPED', null, []), 'held-record-without-assignment');
  bad(REC('EQUIPPED', 'hold', []), 'held-record-without-assignment');
  bad(REC('READIED', 'hold', ['a']), 'readied-record-hold-only');
  bad(REC('READIED', null, []), 'held-record-without-assignment');
  bad(REC('READIED', 'wield', ['a']), 'readied-record-appendage-count-mismatch', { requiredHands: 2 });
  bad(REC('READIED', 'wield', ['a', 'b']), 'readied-record-appendage-count-mismatch', { requiredHands: 1 });
  bad(REC('Readied', 'wield', ['a']), 'weapon-posture-invalid');
  bad(REC('READIED', 'wield', ['a', 'a']), 'weapon-occupancy-duplicate-appendage');
  bad(REC('READIED', 'wield', ['a', '']), 'weapon-occupancy-appendage-ids-invalid');
  bad(REC('READIED', 'wield', ['arm']), 'weapon-occupancy-appendage-unknown', { knownAppendageIds: ['natural-arm-1'] });
  bad(REC('READIED', 'carry', ['a']), 'weapon-occupancy-purpose-invalid');
  bad({ weaponPosture: 'STOWED', weaponOccupancy: { schemaVersion: 2, purpose: null, appendageIds: [] } }, 'weapon-occupancy-schema-version-unsupported');
  bad({ weaponPosture: 'STOWED', weaponOccupancy: { purpose: null, appendageIds: [] } }, 'weapon-occupancy-missing-fields');
  bad({ weaponPosture: 'STOWED', weaponOccupancy: { schemaVersion: 1, purpose: null, appendageIds: [], extra: 1 } }, 'weapon-occupancy-unsupported-fields');
  bad({ weaponPosture: 'STOWED', weaponOccupancy: 'x' }, 'weapon-occupancy-malformed');
  bad({ weaponPosture: 'STOWED' }, 'weapon-record-incomplete');
  bad({ weaponOccupancy: { schemaVersion: 1, purpose: null, appendageIds: [] } }, 'weapon-record-incomplete');
  bad(null, 'weapon-system-not-an-object');
  assert.throws(() => validateWeaponRecord({}, { requiredHands: 3 }), (e) => e instanceof WeaponRecordInputError && e.code === 'INVALID_REQUIRED_HANDS');
  assert.throws(() => validateWeaponRecord({}, { knownAppendageIds: 'x' }), (e) => e.code === 'INVALID_KNOWN_APPENDAGES');
  assert.throws(() => validateWeaponRecord({}, 5), (e) => e.code === 'INVALID_OPTIONS');
  ok('7: every occupancy and record invariant is enforced; malformed records are invalid (no posture or occupancy leaks out) and malformed options throw');
}
{
  const absent = validateWeaponRecord({ damage: '1d6' });
  assert.equal(absent.status, R.ABSENT); assert.equal(absent.posture, null); assert.ok(codes(absent).includes('weapon-record-absent'));
  const legacy = validateWeaponRecord({ equipped: true, dualWielded: true, wieldedTwoHanded: true });
  assert.equal(legacy.status, R.ABSENT); assert.equal(legacy.posture, null);
  assert.deepEqual(legacy.issues.find((i) => i.code === 'legacy-weapon-fields-ignored').details.fields, ['dualWielded', 'equipped', 'wieldedTwoHanded']);
  const both = validateWeaponRecord({ ...REC('STOWED', null, []), equipped: true });
  assert.equal(both.status, R.VALID); assert.equal(both.posture, 'STOWED');
  ok('8: an absent record is `absent` (never defaulted); retired equip/grip fields never establish posture and are only reported');
}
{
  const before = REC('STOWED', null, []);
  const t = (a, b, o) => validateWeaponRecordTransition(a, b, o);
  assert.equal(t(before, REC('EQUIPPED', 'hold', ['a'])).allowed, true);
  assert.equal(t(before, REC('READIED', 'wield', ['a'])).allowed, true);
  assert.equal(t(REC('READIED', 'wield', ['a']), before).allowed, true);
  assert.equal(t(before, before).changed, false);
  assert.equal(t(before, REC('EQUIPPED', 'hold', ['a'])).changed, true);
  assert.equal(t(before, REC('READIED', 'hold', ['a'])).allowed, false);
  assert.equal(t(before, {}).allowed, false);
  assert.ok(codes(t(before, {})).includes('transition-target-not-valid'));
  const fromBad = t(REC('STOWED', 'hold', ['a']), before);
  assert.equal(fromBad.allowed, false); assert.ok(codes(fromBad).includes('transition-from-invalid-record'));
  const repaired = t(REC('STOWED', 'hold', ['a']), before, { explicitRepair: true });
  assert.equal(repaired.allowed, true); assert.ok(codes(repaired).includes('transition-repairs-invalid-record'));
  const init = t({ damage: '1d6' }, before);
  assert.equal(init.allowed, true); assert.ok(codes(init).includes('transition-initializes-absent-record'));
  assert.equal(t({ damage: '1d6' }, { damage: '1d6' }).allowed, false);
  ok('9: transitions are structural only: legal records pass, malformed targets and silent repairs are refused, repair/initialization must be explicit and is reported');
}
{
  const input = deepFreeze(REC('READIED', 'wield', ['a']));
  const r1 = validateWeaponRecord(input); const r2 = validateWeaponRecord(input);
  assert.equal(JSON.stringify(r1), JSON.stringify(r2));
  const live = REC('READIED', 'wield', ['a']); const snap = JSON.stringify(live);
  const out = validateWeaponRecord(live);
  assert.equal(JSON.stringify(live), snap); assert.ok(!Object.isFrozen(live) && !Object.isFrozen(live.weaponOccupancy));
  assert.ok(collect(out).every(Object.isFrozen)); assert.ok(collect(out).every((o) => !collect(live).includes(o)));
  const src = read('scripts/engine/equipment/weapon-record-invariants.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.deepEqual([...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]), ['/systems/foundryvtt-swse/scripts/engine/equipment/equipment-posture.js']);
  for (const f of [/ActorEngine/, /InventoryEngine/, /FireStateStore/, /\.update\(/, /setFlag/, /game\./, /Hooks\./, /ActionEconomy/]) assert.ok(!f.test(src), String(f));
  ok('10: the validator is deterministic, immutable-in/immutable-out, imports only the posture vocabulary and has no writers');
}

// ---------------------------------------------------------------- WP2: reader fixtures (real canonical weapons under deliberately wrong names)
const item = (id, identityKey, system, extra = {}) => ({ id, type: 'weapon', name: 'Renamed Thing', flags: { swse: { canonicalWeapon: { identityKey }, ...(extra.fireState ? { fireState: extra.fireState } : {}), ...(extra.swse ?? {}) } }, system });
const SABER = 'lightsaber-chassis-archaic-lightsaber'; // Medium
const GREAT = 'lightsaber-chassis-great';               // Large, two-handed for a Medium wielder
const GARROTE = 'unmapped::Garrote';
const ONE = { v: 1, wielded: 'one-handed' };
const human = () => ({ name: 'Human' });
const actorOf = (items, extra = {}) => ({ id: 'actor-1', type: 'character', system: { size: 'Medium' }, items, ...extra });
const deps = (extra = {}) => ({ resolveSpeciesProfile: human, ...extra });
const by = (state, id) => state.weapons.find((w) => w.itemId === id);

{
  const state = readActorEquipmentState(actorOf([item('s', SABER, REC('STOWED', null, []))]), deps());
  assert.equal(by(state, 's').status, 'established'); assert.equal(by(state, 's').effectivePosture, 'STOWED');
  assert.equal(state.anatomy.status, 'resolved');
  const eq = readActorEquipmentState(actorOf([item('s', SABER, REC('EQUIPPED', 'hold', ['natural-arm-1']))]), deps());
  assert.equal(by(eq, 's').effectivePosture, 'EQUIPPED'); assert.equal(by(eq, 's').status, 'established');
  const rd = readActorEquipmentState(actorOf([item('s', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE })]), deps());
  assert.equal(by(rd, 's').effectivePosture, 'READIED'); assert.equal(by(rd, 's').effective.verification.readiness, 'verified');
  assert.deepEqual(rd.summary.readied, ['s']);
  ok('11: STOWED, EQUIPPED and a source-verified READIED are each established from the persisted record plus anatomy, occupancy and grip evidence');
}
{
  // READIED needs every applicable evidence source
  const noGrip = readActorEquipmentState(actorOf([item('s', SABER, REC('READIED', 'wield', ['natural-arm-1']))]), deps()); // no FireStateStore grip choice
  assert.equal(by(noGrip, 's').effectivePosture, null); assert.equal(by(noGrip, 's').status, 'indeterminate');
  const holdOnly = readActorEquipmentState(actorOf([item('s', SABER, REC('EQUIPPED', 'hold', ['natural-arm-1']), { fireState: ONE })]), deps());
  assert.equal(by(holdOnly, 's').effectivePosture, 'EQUIPPED');
  const noSpecies = readActorEquipmentState(actorOf([item('s', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE })]));
  assert.notEqual(by(noSpecies, 's').effectivePosture, 'READIED'); assert.ok(noSpecies.issues.some((i) => i.code === 'species-profile-not-supplied'));
  const large = readActorEquipmentState(actorOf([item('g', GREAT, REC('READIED', 'wield', ['natural-arm-1']))]), deps());
  assert.equal(by(large, 'g').status, 'blocked'); assert.equal(by(large, 'g').effectivePosture, null);
  const twoOk = readActorEquipmentState(actorOf([item('g', GREAT, REC('READIED', 'wield', ['natural-arm-1', 'natural-arm-2']))]), deps());
  assert.equal(by(twoOk, 'g').effectivePosture, 'READIED');
  const garrote = readActorEquipmentState(actorOf([item('r', GARROTE, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE })]), deps());
  assert.equal(by(garrote, 'r').status, 'blocked');
  const unmapped = readActorEquipmentState(actorOf([{ id: 'legacy', type: 'weapon', name: 'Vibroblade', flags: {}, system: REC('READIED', 'wield', ['natural-arm-1']) }]), deps());
  assert.notEqual(by(unmapped, 'legacy').effectivePosture, 'READIED', 'a non-canonical weapon has no source-verified grip');
  ok('12: READIED requires the exact wield assignment, the canonical grip evidence (FireStateStore choice or source-required hands) and resolved anatomy; a mismatch or missing evidence never certifies it');
}
{
  // cross-item conflicts, disabled/missing appendages
  const clash = readActorEquipmentState(actorOf([
    item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }),
    item('b', SABER, REC('EQUIPPED', 'hold', ['natural-arm-1'])),
  ]), deps());
  assert.equal(clash.conflicts.length, 1); assert.ok(clash.issues.some((i) => i.code === 'cross-item-appendage-conflicts'));
  assert.ok(['a', 'b'].every((id) => by(clash, id).effectivePosture === null), 'neither conflicting weapon is established; nothing is displaced');
  const split = readActorEquipmentState(actorOf([
    item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE }),
    item('b', SABER, REC('EQUIPPED', 'hold', ['natural-arm-2'])),
  ]), deps());
  assert.equal(split.conflicts.length, 0); assert.equal(by(split, 'a').effectivePosture, 'READIED'); assert.equal(by(split, 'b').effectivePosture, 'EQUIPPED');
  for (const state of ['disabled', 'missing']) {
    const s = readActorEquipmentState(actorOf([item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE })]), deps({ getFunctionalOverrides: () => ({ 'natural-arm-1': state }) }));
    assert.equal(by(s, 'a').status, 'blocked', state); assert.equal(by(s, 'a').effectivePosture, null);
  }
  const unknownArm = readActorEquipmentState(actorOf([item('a', SABER, REC('EQUIPPED', 'hold', ['tail-9']))]), deps());
  assert.equal(by(unknownArm, 'a').status, 'blocked');
  ok('13: two weapons on one appendage conflict (neither established, nothing reassigned); independent arms coexist; disabled, missing and unknown appendages block');
}
{
  // legacy aliases and invalid / absent records
  const items = [
    { id: 'old', type: 'weapon', name: 'Old', flags: { swse: { canonicalWeapon: { identityKey: SABER }, equipped: true } }, system: { equipped: true, dualWielded: true, wieldedTwoHanded: true, equippable: { equipped: true }, active: true } },
    item('bad', SABER, REC('STOWED', 'hold', ['natural-arm-1'])),
    item('ok', SABER, { ...REC('STOWED', null, []), equipped: true }),
  ];
  const s = readActorEquipmentState(actorOf(items), deps());
  assert.equal(by(s, 'old').status, 'undeclared'); assert.equal(by(s, 'old').effectivePosture, null); assert.equal(by(s, 'old').record.status, 'absent');
  assert.equal(by(s, 'bad').status, 'contradictory'); assert.equal(by(s, 'bad').effectivePosture, null);
  assert.equal(by(s, 'ok').effectivePosture, 'STOWED', 'legacy equipped:true does not override the persisted STOWED record');
  assert.equal(s.occupancy.assignments.length, 0, 'an invalid record never enters the occupancy resolver');
  assert.equal(s.summary.undeclared, 1); assert.equal(s.summary.contradictory, 1);
  ok('14: legacy equipped/dualWielded/wieldedTwoHanded/equippable/active never establish posture; an absent record is undeclared and a malformed one contradictory (neither defaulted nor repaired)');
}
{
  // activation is independent evidence; natural / integrated stay pending
  const lit = readActorEquipmentState(actorOf([item('s', SABER, { ...REC('STOWED', null, []), activated: true })]), deps());
  assert.equal(by(lit, 's').effectivePosture, 'STOWED'); assert.equal(by(lit, 's').effective.activation.state, 'activated');
  const nat = readActorEquipmentState(actorOf([
    item('n1', SABER, REC('READIED', 'wield', ['natural-arm-1']), { swse: { isNaturalWeapon: true, alwaysArmed: true } }),
    item('n2', SABER, { source: 'species-natural-weapon', ...REC('STOWED', null, []) }),
    item('d1', SABER, { integrated: true, ...REC('STOWED', null, []) }),
  ]), deps());
  for (const id of ['n1', 'n2']) { assert.equal(by(nat, id).status, 'indeterminate'); assert.equal(by(nat, id).effectivePosture, null); assert.equal(by(nat, id).pending.kind, 'natural-weapon'); }
  assert.equal(by(nat, 'd1').pending.kind, 'integrated-droid-weapon'); assert.equal(by(nat, 'd1').effectivePosture, null); assert.equal(by(nat, 'd1').status, 'indeterminate');
  assert.equal(nat.occupancy.assignments.length, 0, 'natural/integrated weapons never claim ordinary appendages');
  assert.ok(by(nat, 'n1').issues.some((i) => i.code === 'pending-identity-item-has-occupancy-record'));
  const forged = readActorEquipmentState(actorOf([item('f', SABER, REC('STOWED', null, []), { swse: { isNaturalWeapon: false, alwaysArmed: false } })]), deps());
  assert.equal(by(forged, 'f').effectivePosture, 'STOWED');
  ok('15: activation never changes posture; natural and integrated weapons stay pending (flags can only withhold readiness, never grant it)');
}
{
  // armor / shield / nonweapon Items are not read as weapon equipment state
  const armor = { id: 'ar', type: 'armor', name: 'Armor', system: { equipped: true, armorType: 'light' } };
  const shield = { id: 'sh', type: 'armor', name: 'Shield', system: { equipped: true, armorType: 'shield' } };
  const gear = { id: 'ge', type: 'equipment', name: 'Gear', system: { equipped: true } };
  const before = JSON.stringify([armor, shield, gear]);
  const s = readActorEquipmentState(actorOf([armor, shield, gear, item('s', SABER, REC('STOWED', null, []))]), deps());
  assert.deepEqual(s.weapons.map((w) => w.itemId), ['s']);
  assert.equal(JSON.stringify([armor, shield, gear]), before);
  ok('16: armor, shield and equipment Items keep their worn state and are outside the weapon reader');
}
{
  // determinism, immutability, collection shapes
  const items = [item('b', SABER, REC('EQUIPPED', 'hold', ['natural-arm-2'])), item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE })];
  const actor = actorOf(items); const snap = JSON.stringify(actor);
  const r1 = readActorEquipmentState(actor, deps()); const r2 = readActorEquipmentState(actorOf([...items].reverse()), deps());
  assert.equal(JSON.stringify(r1), JSON.stringify(r2), 'Item order does not change the result');
  assert.equal(JSON.stringify(actor), snap, 'the actor is never mutated'); assert.ok(!Object.isFrozen(actor) && !Object.isFrozen(items[0]));
  assert.ok(collect(r1).every(Object.isFrozen)); assert.ok(collect(r1).every((o) => !collect(actor).includes(o)), 'the result shares no object with the inputs');
  const frozenActor = deepFreeze(actorOf(items.map((i) => JSON.parse(JSON.stringify(i)))));
  assert.equal(JSON.stringify(readActorEquipmentState(frozenActor, deps())), JSON.stringify(r1));
  const coll = { id: 'actor-1', type: 'character', system: { size: 'Medium' }, items: new Map(items.map((i) => [i.id, i])).values() };
  assert.equal(readActorEquipmentState(coll, deps()).weapons.length, 2);
  assert.equal(readWeaponEffectivePosture(actor, 'a', deps()).effectivePosture, 'READIED'); assert.equal(readWeaponEffectivePosture(actor, 'zz', deps()), null);
  ok('17: the reader is deterministic (Item-order independent), never mutates or freezes its inputs, shares no objects with them and accepts frozen actors and iterable collections');
}
{
  // E3 integration compatibility: the reader is a faithful composition of the established resolvers
  const state = readActorEquipmentState(actorOf([item('a', SABER, REC('READIED', 'wield', ['natural-arm-1']), { fireState: ONE })]), deps());
  const direct = resolveEffectiveEquipmentPosture({ itemId: 'a', declaration: { posture: 'READIED' }, occupancy: state.occupancy, grip: state.grip });
  assert.equal(JSON.stringify(by(state, 'a').effective), JSON.stringify(direct));
  assert.equal(state.grip.assessments[0].canonicalWielding.source, 'state');
  assert.equal(state.speciesPermissions.status, 'no-matching-entitlement');
  ok('18: the reader result equals the direct E3-A2/A3/A5 composition; the grip choice comes from the FireStateStore record and the species permission from E3-A1');
}
{
  const throws = (fn, code) => assert.throws(fn, (e) => e instanceof EquipmentStateInputError && e.code === code, code);
  throws(() => readActorEquipmentState(null), 'INVALID_ACTOR');
  throws(() => readActorEquipmentState(actorOf([]), 5), 'INVALID_DEPS');
  throws(() => readActorEquipmentState(actorOf([]), { shapeOfWeapon: 1 }), 'INVALID_DEPS');
  throws(() => readActorEquipmentState(actorOf(5)), 'INVALID_ITEMS');
  throws(() => readActorEquipmentState(actorOf([{ type: 'weapon', system: {} }])), 'INVALID_ITEM');
  throws(() => readActorEquipmentState(actorOf([item('x', SABER, {}), item('x', SABER, {})])), 'DUPLICATE_ITEM_ID');
  assert.equal(readActorEquipmentState(actorOf([])).weapons.length, 0);
  const droid = readActorEquipmentState({ id: 'd', type: 'droid', system: { size: 'Medium' }, items: [item('w', SABER, REC('EQUIPPED', 'hold', ['hand-1']))] });
  assert.notEqual(by(droid, 'w').effectivePosture, 'EQUIPPED', 'a droid without certified installed-component evidence is never given hands');
  ok('19: malformed API input throws documented codes; incomplete evidence (including an unadapted droid) is reported, never granted');
}
{
  const src = read('scripts/engine/equipment/equipment-state-reader.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const f of [/ActorEngine/, /InventoryEngine/, /\.update\(/, /updateEmbedded/, /\.setFlag\(/, /\.unsetFlag\(/, /updateOwned/, /ActionEconomy/, /\.spend\(/, /Hooks\./, /\b(item|actor)\??\.name\b/, /\b(item|actor)\??\.(system\??\.)?description\b/, /system\??\.equipped/, /dualWielded/, /wieldedTwoHanded/, /isItemEquipped/, /game\./]) assert.ok(!f.test(src), `reader must not contain ${f}`);
  const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1].replace('/systems/foundryvtt-swse/scripts/', ''));
  assert.deepEqual(imports.sort(), ['engine/combat/fire-state-store.js', 'engine/equipment/anatomy-resolver.js', 'engine/equipment/effective-equipment-posture.js', 'engine/equipment/equipment-capability-resolver.js', 'engine/equipment/equipment-grip-resolver.js', 'engine/equipment/species-equipment-permissions.js', 'engine/equipment/weapon-record-invariants.js', 'items/weapon-runtime/attack-consumer.js']);
  ok('20: the reader has no writers, no action spending, no name/description/legacy-flag reads and imports only the established authorities');
}

console.log(`equipment-e4c1-wp1-wp2-foundation: ${n} checks ok`);
