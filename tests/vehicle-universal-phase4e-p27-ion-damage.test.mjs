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
const prosthesis = () => ({ id: 'pros1', type: 'equipment', name: 'Cybernetic Prosthesis', system: { tags: ['cybernetic', 'tech', 'gear', 'prosthesis'] } });
const importedVehicle = (key, { hp = 100, dt = 40, sr = 0, dr = 0 } = {}) => {
  const v = Object.assign(structuredClone(docs.find(d => keyOf(d) === key)), { id: `imp-${key}`, items: new Items(), flags: structuredClone(docs.find(d => keyOf(d) === key).flags) });
  v.system = { ...v.system, hp: { value: hp, max: 100 }, conditionTrack: { current: 0 },
    derived: { damageThreshold: dt, damage: { threshold: dt, reduction: dr }, hp: { value: hp, max: 100 }, shield: { current: sr, stored: false }, ...(dr ? { damageReduction: { value: dr, highestValue: dr } } : {}) } };
  return v;
};
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

test('COVERAGE: exactly the typed, plain ion groups that pass every other gate are executable; the rest keep a named refusal', () => {
  const all = docs.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.map(g => ({ key: keyOf(d), g })));
  const ion = all.filter(x => x.g.damage?.type === 'ion');
  assert.equal(ion.length, 69);
  assert.equal(ion.filter(x => x.g.executable).length, 43, '31 single-operator groups + 12 ion batteries as one independent weapon each (the Subjugator\'s area ion pulse cannons are refused)');
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
  assert.deepEqual(res.ionRuleDeferred, ['V-P6C-04:zero-hit-points-and-threshold'], 'a hit that does both is reported as unsettled (the reversible outcome is applied)');
  // from partway down the track: 5 steps, capped by the track
  t = target({ hp: 10, dt: 999, ct: 2 }); ({ res } = await apply(t, 30));
  assert.deepEqual([res.hpAfter, res.thresholdExceeded, res.conditionAfter, res.conditionDelta, res.disabled, res.destroyed], [0, false, 5, 3, true, false]);
  assert.equal(res.ionRuleDeferred, undefined, 'reaching 0 HP below the threshold is fully settled by the ion text');
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

test('ORGANIC (Core p. 159): an ordinary organic is singed: half hit-point damage and NO other ill effect, however large the hit', async () => {
  const t = target({ type: 'character', hp: 100, dt: 20 });
  const { res, packet } = await apply(t, 60);
  assert.equal(packet.type, 'normal', 'the ion special rules are suppressed for an ordinary organic');
  assert.deepEqual([packet.flags.ionOrganicHalved, packet.options.thresholdEffectsSuppressed], [true, true]);
  assert.deepEqual([res.damageToHP, res.hpAfter], [30, 70], 'half of 60');
  assert.deepEqual([res.thresholdExceeded, res.thresholdSuppressed, res.conditionDelta, res.conditionAfter], [false, true, 0, 0], '60 and 30 both exceed DT 20, yet there is no threshold or condition-track effect');
  assert.equal(res.ionDisabled, undefined);
  // the half damage reaching 0 HP is the ordinary hit-point rule (unconscious), not an ion effect, and it never kills through the threshold
  const low = await apply(target({ type: 'character', hp: 10, dt: 5 }), 60);
  assert.deepEqual([low.res.hpAfter, low.res.unconscious, low.res.dead, low.res.ionDisabled], [0, true, false, undefined]);
});

test('CYBERNETIC PROSTHETICS (Core p. 137): a creature with prosthetics takes FULL ion damage and the ion effects apply', async () => {
  const t = target({ type: 'character', hp: 100, dt: 40 });
  t.items.set('pros1', prosthesis());
  const { res, packet } = await apply(t, 60);
  assert.equal(packet.type, 'ion');
  assert.deepEqual([packet.flags.ionFullHpDamage, packet.flags.ionHpHalved, packet.options.hpDamageMultiplier], [true, false, 1]);
  assert.deepEqual([res.damageToHP, res.hpAfter, res.thresholdExceeded, res.conditionDelta], [60, 40, true, 2], 'full 60 to HP; the full amount reaches DT 40: -2 steps');
  // below the threshold: full HP damage, no condition-track move
  const small = target({ type: 'character', hp: 100, dt: 40 }); small.items.set('pros1', prosthesis());
  const r2 = await apply(small, 30);
  assert.deepEqual([r2.res.damageToHP, r2.res.thresholdExceeded, r2.res.conditionDelta], [30, false, 0]);
  // reduced to 0 HP: -5 steps and unconscious, as one outcome (not killed, not -5 plus -2)
  const down = target({ type: 'character', hp: 30, dt: 40 }); down.items.set('pros1', prosthesis());
  const r3 = await apply(down, 60);
  assert.deepEqual([r3.res.hpAfter, r3.res.conditionDelta, r3.res.conditionAfter, r3.res.unconscious, r3.res.dead, r3.res.ionDisabled], [0, 5, 5, true, false, true]);
  // only the structured tags count: an item merely NAMED like a prosthesis, or a non-prosthetic cybernetic, does not
  const named = target({ type: 'character', hp: 100, dt: 40 }); named.items.set('x', { id: 'x', type: 'equipment', name: 'Cybernetic Prosthesis', system: { tags: ['gear'] } });
  assert.equal((await apply(named, 60)).res.damageToHP, 30);
  const other = target({ type: 'character', hp: 100, dt: 40 }); other.items.set('y', { id: 'y', type: 'equipment', name: 'Biocomputer', system: { tags: ['cybernetic', 'tech'] } });
  assert.equal((await apply(other, 60)).res.damageToHP, 30, 'a cybernetic device that is not a prosthesis is not covered by the prosthesis rule');
  // the existing per-attack "cybernetically enhanced?" class answer is the same target class: full HP damage, extra effects
  const cyber = target({ type: 'character', hp: 100, dt: 20 });
  const packet2 = finalizeDamagePacketForTarget({ ...buildDamagePacket({ attacker: null, target: null, weapon: null, amount: 60, options: { damageType: 'ion', hit: true }, workflowContext: { damage: { hit: true, damageType: 'ion' } } }), flags: { ionEligibleByClass: true } }, cyber);
  const options = buildDamageApplyOptions(packet2);
  const r4 = await ActorEngine.applyDamage(cyber, { amount: packet2.amount, type: options.damageType, source: 'x', sourceActor: null, options });
  assert.deepEqual([packet2.type, r4.resolution.damageToHP, r4.resolution.thresholdExceeded, r4.resolution.conditionDelta], ['ion', 60, true, 2]);
});

test('ELECTRONIC DEVICES are reached by the ion rules (half HP, full to the threshold, 2 steps)', async () => {
  const dev = target({ type: 'device', hp: 100, dt: 20 });
  const { res } = await apply(dev, 60);
  assert.deepEqual([res.damageToHP, res.conditionDelta], [30, 2]);
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
  assert.deepEqual(res.ionRuleDeferred, ['V-P6C-04:shield-damage-reduction-order'], 'the result says the order against the shields is unsettled');
  // the same SR does not stop an ordinary (non-ion) threshold from being judged AFTER the shields
  t = target({ hp: 100, dt: 40, sr: 15 }); ({ res } = await apply(t, 50, { type: 'energy' }));
  assert.deepEqual([res.damageToHP, res.thresholdMeasuredDamage, res.thresholdExceeded], [35, 35, false]);
  // DR 10: 50 -> 40 -> half 20
  t = target({ hp: 100, dt: 999, dr: 10 }); ({ res } = await apply(t, 50));
  assert.equal(res.damageToHP, 20);
  assert.deepEqual(res.ionRuleDeferred, ['V-P6C-04:shield-damage-reduction-order']);
  // with NO shield rating and NO damage reduction the two readings coincide: the case is fully settled and carries no flag
  t = target({ hp: 100, dt: 40 }); ({ res } = await apply(t, 60));
  assert.equal(res.ionRuleDeferred, undefined);
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

test('AAT-1 (Core p. 176): the vulnerability is read from the SOURCE record, recorded on the packet, and NOT applied while its ordering is unsettled', async () => {
  const rec = recordOf('core-aat-1');
  assert.match(rec.text.mechanicalNotes, /Ion Vulnerability: takes double damage from ion weapons/);
  const all = readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(all.filter(r => /ion vulnerab/i.test(JSON.stringify([r.text, r.exceptions, r.rules]))).map(r => r.identity.sourceEntryKey), ['core-aat-1'], 'one published vehicle states it');
  const aat = importedVehicle('core-aat-1', { hp: 100, dt: 60, dr: 15 });
  const other = importedVehicle('core-incom-t-65b-x-wing-starfighter', { hp: 100, dt: 60, dr: 15 });
  const a = await apply(aat, 40), o = await apply(other, 40);
  assert.equal(a.packet.flags.damageVulnerability.id, 'ion-double-damage');
  assert.deepEqual([a.packet.flags.damageVulnerability.multiplier, a.packet.flags.damageVulnerability.state, a.packet.flags.damageVulnerability.applied, a.packet.flags.damageVulnerabilityDeferred], [2, 'DEFERRED_RULES_REVIEW', false, 'V-P6C-05']);
  assert.deepEqual(a.packet.flags.damageVulnerability.interactions, ['ion-halving', 'shield-rating', 'damage-reduction', 'damage-threshold', 'weapon-multiplier', 'battery-extra-dice']);
  assert.equal(o.packet.flags.damageVulnerability, undefined, 'an ordinary vehicle has none: this is a property of one source entry, not of vehicles');
  assert.equal(a.packet.amount, 40, 'the amount is not doubled');
  assert.equal(a.res.damageToHP, o.res.damageToHP, 'identical outcome until the owner rules on the ordering');
  // a vehicle that merely carries the AAT-1 NAME gets nothing (no name test anywhere): only a digest-verified record does
  const fake = { ...target({ hp: 100, dt: 60 }), name: 'AAT-1' };
  assert.equal((await apply(fake, 40)).packet.flags.damageVulnerability, undefined);
  // it applies to ion only
  assert.equal((await apply(importedVehicle('core-aat-1', { hp: 100, dt: 60 }), 40, { type: 'energy' })).packet.flags.damageVulnerability, undefined);
});

test('END TO END: weapon authority -> attack -> hit -> ion card -> packet -> defenses -> HP -> threshold -> condition track -> disabled', async () => {
  const v = await armed(YWING); const w = stockItem(v, 'ion cannons');
  const realSafe = RollEngine.safeRoll, realPost = SWSEChat.postRoll, realSWSE = globalThis.SWSE;
  const damageRoll = { total: 44, toJSON() { return { total: 44 }; } };
  const posted = [];
  SWSEChat.postRoll = async arg => { posted.push(arg); return { id: 'm' }; };
  let attack;
  try {
    RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); return { total: 15 + b, formula, dice: [{ results: [{ result: 15 }] }], toJSON() { return { total: 15 + b }; } }; };
    attack = await rollAttack(v, w, { abstractCrewQuality: 'normal', target: { ...target(), getActiveTokens: () => [token(300, 0)] } });
    const roller = { safeRoll: async f => ({ ...damageRoll, formula: f }) };
    RollEngine.safeRoll = roller.safeRoll; globalThis.SWSE = { ...(realSWSE ?? {}), RollEngine: roller };
    await rollDamage(v, w, { target: target(), combatContext: attack.workflowContext, workflowContext: attack.workflowContext });
  } finally { RollEngine.safeRoll = realSafe; SWSEChat.postRoll = realPost; globalThis.SWSE = realSWSE; }
  assert.equal(attack.isHit, true);
  const card = posted.at(-1).context;
  assert.equal(card.damageType, 'ion', 'the card carries the source-stated type');
  // the Apply Damage step on three targets, with the card's rolled amount (44)
  const amount = 44;
  const run = async (t) => { const packet = finalizeDamagePacketForTarget(buildDamagePacket({ attacker: null, target: t, weapon: null, amount, options: { damageType: card.damageType, hit: true }, workflowContext: { damage: { hit: true, damageType: card.damageType } } }), t); const o = buildDamageApplyOptions(packet); return (await ActorEngine.applyDamage(t, { amount: packet.amount, type: o.damageType, source: 'x', sourceActor: null, options: o })).resolution; };
  // droid, 50 HP, DT 40: half (22) to HP; 44 >= 40 -> 2 steps; not disabled
  let res = await run(target({ type: 'droid', hp: 50, dt: 40 }));
  assert.deepEqual([res.damageToHP, res.hpAfter, res.thresholdExceeded, res.conditionDelta, !!res.disabled], [22, 28, true, 2, false]);
  // unshielded vehicle with 20 HP: 22 >= 20 -> 0 HP: -5 steps and disabled (one outcome)
  res = await run(target({ type: 'vehicle', hp: 20, dt: 40 }));
  assert.deepEqual([res.hpAfter, res.conditionDelta, res.conditionAfter, res.disabled, res.destroyed], [0, 5, 5, true, false]);
  // shielded vehicle (SR 20): 44 -> 24 after the shields -> 12 to HP; the rolled 44 reaches DT 40 (ordering reported as unsettled)
  res = await run(target({ type: 'vehicle', hp: 100, dt: 40, sr: 20 }));
  assert.deepEqual([res.damageToHP, res.thresholdExceeded, res.conditionDelta], [12, true, 2]);
  assert.deepEqual(res.ionRuleDeferred, ['V-P6C-04:shield-damage-reduction-order']);
  // ordinary organic: half, nothing else
  res = await run(target({ type: 'character', hp: 100, dt: 10 }));
  assert.deepEqual([res.damageToHP, res.thresholdExceeded, res.conditionDelta], [22, false, 0]);
});

test.after(() => { ActorEngine.updateActor = realUpdate; });
