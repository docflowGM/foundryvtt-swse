import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';
import { resolveVehicleWeaponAuthority, resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { armStockWeaponsOnCreate } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { rollDamage } = await import('../scripts/combat/rolls/damage.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const { buildDamagePacket, finalizeDamagePacketForTarget, buildDamageApplyOptions, resolveDamagePacketType } = await import('../scripts/engine/combat/damage-packet-builder.js');
const { ThresholdEngine, ION_THRESHOLD_CT_STEPS } = await import('../scripts/engine/combat/threshold-engine.js');
const { SWSEChat } = await import('../scripts/chat/swse-chat.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const keyOf = d => d.flags.swse.canonicalPublication.sourceEntryKey;
const recordOf = key => docs.find(d => keyOf(d) === key).flags.swse.universalVehicleSource.source;
const YWING = 'core-koensayr-y-wing-starfighter';

class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });
let seq = 0;
async function armed(key) {
  const d = structuredClone(docs.find(x => keyOf(x) === key));
  const v = Object.assign(d, { id: 'veh1', isOwner: true, items: new Items(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const x of data) { const id = 'i' + (++seq); v.items.set(id, { id, ...structuredClone(x), actor: v }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) v.items.delete(id); };
  globalThis.game.user.id = 'u1';
  await armStockWeaponsOnCreate(v, {}, 'u1');
  return v;
}
const stockItem = (v, label) => [...v.items.values()].find(i => i.flags?.swse?.vehicleStockWeapon && i.name === label);
globalThis.ui = { notifications: { warn() {}, error() {}, info() {} } };
globalThis.game.settings = { get: () => undefined };

// ---------------------------------------------------------------------------------------------------------------------
// Targets and the apply-damage chain exactly as the chat card runs it: packet -> target rules -> ActorEngine.applyDamage
// ---------------------------------------------------------------------------------------------------------------------
const target = ({ type = 'vehicle', hp = 100, dt = 40, ct = 0, sr = 0, dr = 0, cyber = false } = {}) => ({
  id: `t-${type}`, name: `Target ${type}`, type, flags: { swse: {} }, effects: [], items: new Items(), getFlag() { return undefined; }, setFlag: async () => {},
  system: { size: 'medium', hp: { value: hp, max: 100 }, conditionTrack: { current: ct },
    ...(dr ? { damageReduction: dr } : {}),
    derived: { damageThreshold: dt, damage: { threshold: dt, reduction: dr }, hp: { value: hp, max: 100 }, shield: { current: sr, stored: false }, ...(dr ? { damageReduction: { value: dr, highestValue: dr } } : {}) } },
  _cyber: cyber
});
const updates = [];
const realUpdate = ActorEngine.updateActor;
ActorEngine.updateActor = async (_a, u) => { updates.push(u); };
const apply = async (t, rolled, { type = 'ion', ionEligibleByClass = false } = {}) => {
  const packet = finalizeDamagePacketForTarget(buildDamagePacket({
    attacker: null, target: t, weapon: null, amount: rolled, options: { damageType: type, hit: true, ...(ionEligibleByClass ? { } : {}) },
    workflowContext: { damage: { hit: true, damageType: type } }
  }), t);
  const options = buildDamageApplyOptions(packet);
  const r = await ActorEngine.applyDamage(t, { amount: packet.amount, type: options.damageType, source: options.source, sourceActor: null, options });
  return { packet, r, res: r.resolution };
};

test('SOURCE: ion is a typed damage only where the source types it (printed damage line / structured evidence); a name only denies', () => {
  const yw = assessStockWeaponGroups(recordOf(YWING)).groups;
  const ion = yw.find(g => g.label === 'ion cannons');
  assert.equal(ion.executable, true, ion.reasons.join(','));
  assert.deepEqual([ion.damage.raw, ion.damage.type, ion.operator], ['4d10x2', 'ion', 'gunner']);
  assert.equal(yw.find(g => g.label === 'laser cannons').damage.type, undefined, 'a plain group carries no type');
  // the name says ion, the printed damage line does not: still refused (R-28 p. 85)
  const r28 = assessStockWeaponGroups(recordOf('le-r-28-starfighter')).groups.find(g => g.label === 'medium ion cannons');
  assert.equal(r28.executable, false);
  assert.ok(r28.reasons.includes('STOCK_DAMAGE_ION_UNVERIFIED'));
  // "concussion" is not "ion": the AT-TE rail cannon is refused as a qualified damage, not as ion
  const rail = assessStockWeaponGroups(recordOf('cw-all-terrain-tactical-enforcer-at-te')).groups.find(g => g.label === 'rail cannon');
  assert.equal(rail.reasons.includes('STOCK_DAMAGE_ION_UNVERIFIED'), false);
  assert.ok(rail.reasons.includes('STOCK_DAMAGE_QUALIFIED'));
  // ion plus splash (BB-2 ion bomb) stays refused; ion batteries need their battery facts
  const bomb = assessStockWeaponGroups(recordOf('le-bb-2-starfire-fighter-bomber')).groups.find(g => g.label === 'ion bomb');
  assert.equal(bomb.executable, false);
  assert.ok(bomb.reasons.includes('STOCK_DAMAGE_AREA_OR_SPLASH'));
  const isd = assessStockWeaponGroups(recordOf('core-imperial-i-class-star-destroyer')).groups.find(g => g.label === 'ion cannon battery');
  assert.equal(isd.executable, false);
  assert.equal(isd.damage.type, 'ion', 'typed as ion, refused for its battery facts');
  // a contradicting type in the group evidence is refused, not resolved
  const alt = structuredClone(recordOf(YWING));
  const g = alt.armament.firingGroups.find(x => x.label === 'ion cannons');
  g.specialNotes = g.specialNotes.replace('4d10x2 ion;', '4d10x2 ion; remaining source attack evidence {"damageType":"stun"};');
  const conflict = assessStockWeaponGroups(alt).groups.find(x => x.label === 'ion cannons');
  assert.equal(conflict.executable, false);
  assert.ok(conflict.reasons.includes('STOCK_DAMAGE_TYPE_CONFLICT'));
});

test('COVERAGE: exactly the typed, plain, single-operator ion groups are executable; the rest keep a named refusal', () => {
  const all = docs.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.map(g => ({ key: keyOf(d), g })));
  const ion = all.filter(x => x.g.damage?.type === 'ion');
  assert.equal(ion.length, 69);
  assert.equal(ion.filter(x => x.g.executable).length, 32);
  assert.ok(ion.filter(x => !x.g.executable).every(x => x.g.reasons.length > 0));
  assert.equal(all.filter(x => x.g.executable && /\bion\b/i.test(x.g.label) && x.g.damage?.type !== 'ion').length, 0, 'no executable ion-named group lacks a source-stated ion type');
});

test('AUTHORITY: the armed ion Item takes its damage type from the source group; the Item cannot change it', async () => {
  const v = await armed(YWING); const w = stockItem(v, 'ion cannons');
  assert.ok(w, 'the ion cannons are armed');
  assert.deepEqual(resolveVehicleWeaponDamage(w), { ok: true, formula: '4d10', multiplier: 2, damageType: 'ion', printed: '4d10x2' });
  assert.equal(resolveVehicleWeaponAuthority(w).damageType, 'ion');
  assert.deepEqual(resolveVehicleWeaponDamage(stockItem(v, 'laser cannons')), { ok: true, formula: '4d10', multiplier: 2, damageType: null, printed: '4d10x2' }, 'the laser cannons are not typed');
  w.system.damageType = 'normal'; w.system.damage = '4d10x2';
  assert.equal(resolveVehicleWeaponDamage(w).damageType, 'ion', 'editing the Item changes nothing');
  assert.deepEqual(resolveDamageComposition(v, w, { weapon: w }).damageTypes, ['ion']);
  assert.equal(buildDamageFormula(resolveDamageComposition(v, w, { weapon: w })), '(4d10) * 2');
  assert.equal(resolveDamagePacketType({ weapon: w, options: { damageType: 'ion' } }), 'ion');
});

test('DAMAGE CARD: rolling damage for the ion Item posts the card with the source-stated ion type', async () => {
  const v = await armed(YWING); const w = stockItem(v, 'ion cannons'); const laser = stockItem(v, 'laser cannons');
  const realPost = SWSEChat.postRoll, realSafe = RollEngine.safeRoll, realSWSE = globalThis.SWSE;
  const posted = [];
  SWSEChat.postRoll = async arg => { posted.push(arg); return { id: 'm' }; };
  const roller = { safeRoll: async f => ({ total: 44, formula: f, dice: [], toJSON() { return { total: 44 }; } }) };
  RollEngine.safeRoll = roller.safeRoll; globalThis.SWSE = { ...(realSWSE ?? {}), RollEngine: roller };
  try {
    await rollDamage(v, w, { target: target() });
    await rollDamage(v, laser, { target: target() });
  } finally { SWSEChat.postRoll = realPost; RollEngine.safeRoll = realSafe; globalThis.SWSE = realSWSE; }
  assert.equal(posted.length, 2);
  assert.equal(posted[0].context.damageType, 'ion');
  assert.ok(posted[0].context.damageTypes.includes('ion'));
  assert.notEqual(posted[1].context.damageType, 'ion', 'the laser cannons are not ion');
  assert.equal(posted[0].roll.swseDamageFormula, '(4d10) * 2');
});

// ---------------------------------------------------------------------------------------------------------------------
// The ion lifecycle (Core pp. 159-160, owner-verified) on the existing damage authorities
// ---------------------------------------------------------------------------------------------------------------------
test('VEHICLE: HP takes HALF of the ion damage; the FULL amount is compared to the threshold; reaching it costs 2 condition-track steps', async () => {
  assert.equal(ION_THRESHOLD_CT_STEPS, 2);
  // below the threshold: half to HP, no condition-track effect
  let t = target({ hp: 100, dt: 40 }); let { res } = await apply(t, 30);
  assert.deepEqual([res.damageToHP, res.hpAfter, res.thresholdExceeded, res.conditionDelta, res.conditionAfter], [15, 85, false, 0, 0]);
  // 39 < 40 < 40: the boundary is "equals or exceeds" on the FULL amount
  t = target({ hp: 100, dt: 40 }); ({ res } = await apply(t, 39));
  assert.equal(res.thresholdExceeded, false);
  t = target({ hp: 100, dt: 40 }); ({ res } = await apply(t, 40));
  assert.deepEqual([res.thresholdExceeded, res.damageToHP, res.conditionDelta, res.conditionAfter], [true, 20, 2, 2]);
  // the key rule: HALF (30) would NOT reach DT 40, the FULL 60 does
  t = target({ hp: 100, dt: 40 }); ({ res } = await apply(t, 60));
  assert.deepEqual([res.damageToHP, res.thresholdMeasuredDamage, res.thresholdExceeded, res.conditionDelta], [30, 60, true, 2]);
  assert.equal(res.hpAfter, 70);
  assert.ok(!res.disabled);
  // a target already down the track moves two more steps from where it is
  t = target({ hp: 100, dt: 40, ct: 1 }); ({ res } = await apply(t, 60));
  assert.deepEqual([res.conditionBefore, res.conditionAfter, res.conditionDelta], [1, 3, 2]);
  // ordinary (non-ion) damage of the same size moves ONE step: ion is not just "half damage"
  t = target({ hp: 100, dt: 40 }); ({ res } = await apply(t, 60, { type: 'energy' }));
  assert.deepEqual([res.damageToHP, res.conditionDelta], [60, 1]);
});

test('VEHICLE: ion that reduces HP to 0 moves it 5 steps and DISABLES it; one outcome, never both the threshold shift and destruction', async () => {
  let t = target({ hp: 20, dt: 40, ct: 0 }); let { res } = await apply(t, 50);      // half = 25 >= 20 HP; full 50 >= DT 40
  assert.deepEqual([res.hpAfter, res.thresholdExceeded, res.conditionBefore, res.conditionDelta, res.conditionAfter], [0, true, 0, 5, 5], '5 steps, not 5 + 2');
  assert.deepEqual([res.disabled, res.destroyed, res.dead], [true, false, false], 'disabled, not destroyed');
  assert.equal(res.ionDisabled, true);
  // from partway down the track: 5 steps, capped by the track
  t = target({ hp: 10, dt: 999, ct: 2 }); ({ res } = await apply(t, 30));
  assert.deepEqual([res.hpAfter, res.thresholdExceeded, res.conditionAfter, res.conditionDelta, res.disabled, res.destroyed], [0, false, 5, 3, true, false]);
  // the same hit as ordinary energy damage is the standard outcome (threshold + 0 HP), not the ion outcome
  t = target({ hp: 20, dt: 40 }); ({ res } = await apply(t, 50, { type: 'energy' }));
  assert.equal(res.ionDisabled, undefined);
});

test('DROID: the ion rules apply (half HP, full to threshold, 2 steps; 0 HP disables the droid)', async () => {
  let t = target({ type: 'droid', hp: 100, dt: 30 }); let { res, packet } = await apply(t, 60);
  assert.deepEqual([packet.type, res.damageToHP, res.thresholdExceeded, res.conditionDelta], ['ion', 30, true, 2]);
  t = target({ type: 'droid', hp: 5, dt: 30 }); ({ res } = await apply(t, 60));
  assert.deepEqual([res.hpAfter, res.conditionAfter, res.disabled, res.destroyed], [0, 5, true, false]);
  const droidUpdate = updates.at(-1);
  assert.equal(droidUpdate['system.droidState.status'], 'disabled', 'the droid state is disabled, not destroyed');
});

test('ORGANIC: an ordinary organic takes only the half-damage HP effect; no ion threshold or condition-track effect', async () => {
  const t = target({ type: 'character', hp: 100, dt: 20 });
  const { res, packet } = await apply(t, 60);
  assert.equal(packet.type, 'normal', 'the ion special rules are suppressed for an ordinary organic');
  assert.equal(packet.flags.ionOrganicHalved, true);
  assert.equal(res.damageToHP, 30, 'half of 60');
  assert.equal(res.ionDisabled, undefined);
  // the ordinary threshold rule is judged on the damage actually dealt (30 >= DT 20): ONE step, not the ion two
  assert.deepEqual([res.thresholdMeasuredDamage, res.conditionDelta], [30, 1]);
  const small = await apply(target({ type: 'character', hp: 100, dt: 50 }), 60);
  assert.deepEqual([small.res.damageToHP, small.res.thresholdExceeded, small.res.conditionDelta], [30, false, 0]);
});

test('ELECTRONIC DEVICES and CYBERNETIC CREATURES are reached by the ion rules (class-flagged organics included)', async () => {
  const dev = target({ type: 'device', hp: 100, dt: 20 });
  assert.equal((await apply(dev, 60)).res.conditionDelta, 2);
  const cyber = target({ type: 'character', hp: 100, dt: 20 });
  const packet = finalizeDamagePacketForTarget({ ...buildDamagePacket({ attacker: null, target: cyber, weapon: null, amount: 60, options: { damageType: 'ion', hit: true }, workflowContext: { damage: { hit: true, damageType: 'ion' } } }), flags: { ionEligibleByClass: true } }, cyber);
  const options = buildDamageApplyOptions(packet);
  const r = await ActorEngine.applyDamage(cyber, { amount: packet.amount, type: options.damageType, source: 'x', sourceActor: null, options });
  assert.deepEqual([packet.type, r.resolution.damageToHP, r.resolution.thresholdExceeded, r.resolution.conditionDelta], ['ion', 30, true, 2]);
});

test('NO DUPLICATE APPLICATION: one applyDamage = one HP write and one condition-track write; Ion Shielding caps the threshold shift at one step', async () => {
  updates.length = 0;
  const t = target({ hp: 100, dt: 40 });
  const { res } = await apply(t, 60);
  assert.equal(updates.length, 1, 'a single actor update carries the HP and the condition-track result');
  assert.equal(updates[0]['system.conditionTrack.current'], res.conditionAfter);
  assert.equal(res.conditionDelta, 2, 'moved once');
  // the existing Ion Shielding cap now has something to cap (a two-step baseline)
  const capped = await ThresholdEngine.evaluateThreshold({ target: t, damage: 60, isIon: true });
  assert.equal(capped.totalCTShift, 2);
});

test('THRESHOLD ENGINE: only an ion hit gets the two-step baseline; stun and ordinary damage are unchanged', () => {
  const t = target({ dt: 40 });
  assert.equal(ThresholdEngine.evaluateThreshold({ target: t, damage: 40, isIon: true }).totalCTShift, 2);
  assert.equal(ThresholdEngine.evaluateThreshold({ target: t, damage: 40 }).totalCTShift, 1);
  assert.equal(ThresholdEngine.evaluateThreshold({ target: t, damage: 39, isIon: true }).thresholdExceeded, false);
});

test('ORDERING AS IMPLEMENTED (owner question V-P6C-04): shield rating and damage reduction reduce the HP damage; the threshold comparison uses the full rolled amount', async () => {
  // SR 15 on a vehicle: 50 -> 35 after the shields -> half = 17 to HP; the full rolled 50 is what meets DT 40
  let t = target({ hp: 100, dt: 40, sr: 15 }); let { res } = await apply(t, 50);
  assert.deepEqual([res.damageToHP, res.thresholdMeasuredDamage, res.thresholdExceeded, res.conditionDelta], [17, 50, true, 2]);
  // the same SR does not stop an ordinary (non-ion) threshold from being judged AFTER the shields
  t = target({ hp: 100, dt: 40, sr: 15 }); ({ res } = await apply(t, 50, { type: 'energy' }));
  assert.deepEqual([res.damageToHP, res.thresholdMeasuredDamage, res.thresholdExceeded], [35, 35, false]);
  // DR 10: 50 -> 40 -> half 20
  t = target({ hp: 100, dt: 999, dr: 10 }); ({ res } = await apply(t, 50));
  assert.equal(res.damageToHP, 20);
});

test('ATTACK -> CARD -> DAMAGE: the typed ion Item attacks and rolls through the same runtime as every stock weapon', async () => {
  const v = await armed(YWING); const w = stockItem(v, 'ion cannons');
  const real = RollEngine.safeRoll;
  RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); return { total: 12 + b, formula, dice: [{ results: [{ result: 12 }] }], toJSON() { return { total: 12 + b }; } }; };
  try {
    const out = await rollAttack(v, w, { abstractCrewQuality: 'normal', target: { ...target(), getActiveTokens: () => [token(300, 0)] } });
    assert.ok(out, 'the ion attack resolves');
    assert.equal(out.atkBonus, assessStockWeaponGroups(recordOf(YWING)).groups.find(g => g.label === 'ion cannons').attackBonusPrinted);
  } finally { RollEngine.safeRoll = real; }
});

test('AAT-1: the published "takes double damage from ion weapons" is preserved text only; nothing generalizes or guesses it', async () => {
  const rec = recordOf('core-aat-1');
  assert.match(rec.text.mechanicalNotes, /Ion Vulnerability: takes double damage from ion weapons/);
  const all = readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n').map(JSON.parse);
  const carriers = all.filter(r => /ion vulnerab/i.test(JSON.stringify([r.text, r.exceptions, r.rules])));
  assert.deepEqual(carriers.map(r => r.identity.sourceEntryKey), ['core-aat-1'], 'one published vehicle states it');
  // an AAT-1 and a Y-wing take the same ion outcome: no per-vehicle doubling exists in any damage authority
  const aat = { ...target({ hp: 100, dt: 60 }), name: 'AAT-1' }; const other = { ...target({ hp: 100, dt: 60 }), name: 'Y-wing' };
  assert.equal((await apply(aat, 40)).res.damageToHP, (await apply(other, 40)).res.damageToHP);
});

test.after(() => { ActorEngine.updateActor = realUpdate; });
