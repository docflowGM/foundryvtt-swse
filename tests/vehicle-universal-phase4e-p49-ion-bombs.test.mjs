/**
 * Ion bombs (V-P6C-16, owner interpretation): an aftermarket ion bomb rack (four bombs, the shared ammunition ledger) drops on the square DIRECTLY
 * BENEATH the deploying ship, in an atmosphere only, with the printed -5 attack, 5d10 ion damage and a 10-square radius; one shared attack roll against
 * each target's Reflex, full on a hit and half on a miss, through the shared damage packet; no range band and no arbitrary target.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { S, VehicleAmmunitionService, ActorEngine, world, install, state } from './helpers/vehicle-weapon-world.mjs';

const { ActionEconomyConsumption } = await import('../scripts/engine/combat/action/action-economy-consumption.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const bombs = await import('../scripts/engine/vehicles/vehicle-ion-bomb-service.js');
const { resolveVehicleWeaponAuthority } = await import('../scripts/domain/vehicles/vehicle-weapon-damage.js');
const { BOMB_REASONS, ION_BOMB_ATTACK_PENALTY, ION_BOMB_RACK_CAPACITY, tokenInBlast, footprintDistance } = await import('../scripts/domain/vehicles/vehicle-ion-bomb.js');
const { launcherStandardCapacity } = await import('../scripts/domain/vehicles/vehicle-launcher-capacity.js');

const GM = { isGM: true, id: 'gm1' };
const unit = (id, type = 'vehicle', reflex = 15) => ({ id, type, name: id, system: { size: 'medium', hp: { value: 400, max: 400 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: reflex } }, damageThreshold: 999, damage: { threshold: 999, reduction: 0 }, hp: { value: 400, max: 400 }, shield: { current: 0, stored: false } } }, flags: { swse: {} }, effects: [], items: [], getFlag() {}, setFlag: async () => {} });
const tok = (actor, col, row) => ({ id: `t-${actor.id}`, actor, x: col * 100, y: row * 100, width: 1, height: 1 });
const sceneWith = tokens => { const scene = { id: 's1', grid: { size: 100 }, flags: { swse: {} }, tokens }; globalThis.canvas.scene = scene; return scene; };
async function rack(env = 'atmosphere') {
  const w = await install('ion-bomb-rack', null, 'turret-1');
  const { vehicle, owner } = state();
  assert.equal((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: w.flags.swse.vehicleInstalledWeapon.installId, units: 4 })).success, true);
  await VehicleAmmunitionService.gmReload(vehicle, w, { user: globalThis.game.user });
  vehicle.getActiveTokens = () => [{ document: { x: 300, y: 100, width: 1, height: 1, parent: { id: 's1' } } }];
  if (env) vehicle.flags.swse.vehicleEnvironment = { state: env };
  return w;
}
const ledgerOf = w => state().vehicle.flags.swse.vehicleAmmunition[w.flags.swse.vehicleInstalledWeapon.installId];
function stubs(d20 = 15) {
  const real = { spend: ActionEconomyConsumption.spend, apply: ActorEngine.applyDamage, roll: RollEngine.safeRoll };
  const spends = [], rollbacks = [], applied = [], rolled = [];
  ActionEconomyConsumption.spend = async (a, type) => { spends.push([a.id, type]); return { allowed: true, rollback: async () => { rollbacks.push(type); } }; };
  ActorEngine.applyDamage = async (t, x) => { applied.push({ id: t.id, amount: x.amount, type: x.type }); return { resolution: { damageToHP: x.amount } }; };
  RollEngine.safeRoll = async f => { rolled.push(String(f)); return /1d20/.test(f) ? { total: d20 + Number(/\+\s*(-?\d+)/.exec(f)?.[1] ?? 0), formula: f, dice: [{ results: [{ result: d20 }] }] } : { total: 30, formula: f, dice: [] }; };
  return { spends, rollbacks, applied, rolled, restore() { ActionEconomyConsumption.spend = real.spend; ActorEngine.applyDamage = real.apply; RollEngine.safeRoll = real.roll; } };
}

test('RACK: certified, four bombs, ion damage, no Table 10-2 row, flagged for the bomb service', async () => {
  world({ hull: 'frigate' }); sceneWith([]);
  const w = await rack(); const a = resolveVehicleWeaponAuthority(w);
  assert.deepEqual([a.ok, a.ionBomb, a.ammunition.capacity, a.rangeSlug, ION_BOMB_RACK_CAPACITY], [true, true, 4, null, 4]);
  assert.equal(launcherStandardCapacity('ion-bomb-rack').standard, 4);
  assert.match(a.damageRaw, /5d10 \(Ion\)/);
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).capacity], [4, 4]);
});

test('GEOMETRY: the 10-square radius is counted in squares (diagonals as one) from the impact square, by footprint', () => {
  const imp = { col: 3, row: 1 };
  assert.equal(tokenInBlast({ x: 1300, y: 100, width: 1, height: 1 }, 100, imp), true, 'exactly 10 squares east');
  assert.equal(tokenInBlast({ x: 1400, y: 100, width: 1, height: 1 }, 100, imp), false, '11 squares');
  assert.equal(tokenInBlast({ x: 1300, y: 1100, width: 1, height: 1 }, 100, imp), true, 'diagonal counts as one square: 10 east, 10 south');
  assert.equal(tokenInBlast({ x: 1400, y: 100, width: 6, height: 1 }, 100, { col: 30, row: 1 }), false, 'cols 14-19: 11 squares from col 30');
  assert.equal(tokenInBlast({ x: 1400, y: 100, width: 7, height: 1 }, 100, { col: 30, row: 1 }), true, 'cols 14-20: exactly 10 from the near edge');
  assert.equal(footprintDistance({ col: 5, row: 5 }, 1, 1, { col: 5, row: 5 }), 0);
});

test('DROP: atmosphere only, GM-only, own rack, the square beneath the ship; every refusal comes before a cost', async () => {
  world({ hull: 'frigate' }); const scene = sceneWith([]); const w = await rack(); const { vehicle } = state(); const s = stubs();
  try {
    assert.equal((await bombs.drop({ vehicle, weapon: w, scene, user: { isGM: false } })).reason, BOMB_REASONS.GM_ONLY);
    assert.equal((await bombs.drop({ vehicle: unit('stranger'), weapon: w, scene, user: GM })).reason, BOMB_REASONS.NOT_OWN_RACK);
    vehicle.flags.swse.vehicleEnvironment = { state: 'space' };
    assert.equal((await bombs.drop({ vehicle, weapon: w, scene, user: GM })).reason, BOMB_REASONS.ATMOSPHERE_REQUIRED);
    vehicle.flags.swse.vehicleEnvironment = undefined;
    assert.equal((await bombs.drop({ vehicle, weapon: w, scene, user: GM })).reason, BOMB_REASONS.ATMOSPHERE_REQUIRED, 'an unknown environment never allows it');
    vehicle.flags.swse.vehicleEnvironment = { state: 'atmosphere' };
    assert.equal((await bombs.drop({ vehicle, weapon: w, scene, user: GM, impact: { col: 9, row: 9 } })).reason, BOMB_REASONS.IMPACT_NOT_BENEATH_SHIP, 'no distant or arbitrary target');
    vehicle.getActiveTokens = () => [{ document: { x: 300, y: 100, width: 1, height: 1, parent: { id: 'elsewhere' } } }];
    assert.equal((await bombs.drop({ vehicle, weapon: w, scene, user: GM })).reason, BOMB_REASONS.NO_POSITION);
    const laser = await install('laser-cannon-light', null, 'turret-2');
    assert.equal((await bombs.drop({ vehicle, weapon: laser, scene, user: GM })).reason, BOMB_REASONS.NOT_AN_ION_BOMB_RACK);
    assert.deepEqual([s.spends.length, ledgerOf(w).loaded, s.applied.length], [0, 4, 0]);
  } finally { s.restore(); }
});

test('IMPACT: one shared roll (-5), per-target Reflex, ion damage full on a hit / half on a miss, deploying ship exempt, radius respected, one bomb and one standard action', async () => {
  world({ hull: 'frigate' });
  const near = unit('near', 'vehicle', 12), tough = unit('tough', 'vehicle', 40), far = unit('far', 'vehicle', 10), ground = unit('ground', 'character', 10);
  const scene = sceneWith([tok(near, 3, 1), tok(tough, 8, 4), tok(far, 40, 40), tok(ground, 12, 1)]);
  const w = await rack(); const { vehicle } = state(); scene.tokens.push(tok(vehicle, 3, 1)); const s = stubs(15);
  try {
    const r = await bombs.drop({ vehicle, weapon: w, scene, user: GM });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.deepEqual(r.square, { col: 3, row: 1 });
    const atk = s.rolled.find(f => /1d20/.test(f));
    const { resolveAbstractCrewAttackBonus } = await import('../scripts/engine/combat/vehicle-attack-math.js');
    const expected = (await resolveAbstractCrewAttackBonus(vehicle, w, vehicle.system?.crewQuality, {})).total + ION_BOMB_ATTACK_PENALTY;
    assert.equal(atk, `1d20 + ${expected}`, 'the shared attack-bonus authority plus the printed -5');
    // `near` and `ground` are hit (their Reflex 12 / 10 is within the roll), `tough` (Reflex 40) is missed: half. `far` is outside, the ship is exempt.
    const byId = Object.fromEntries(r.results.map(x => [x.targetId, x]));
    assert.deepEqual(Object.keys(byId).sort(), ['ground', 'near', 'tough']);
    assert.equal(byId.tough.hit, false);
    assert.deepEqual(s.applied.map(x => x.type), ['ion', 'ion', 'ion'], 'ion damage through the shared packet');
    const amounts = Object.fromEntries(s.applied.map(x => [x.id, x.amount]));
    assert.equal(amounts.tough * 2, amounts.near, 'a miss deals half of a hit');
    assert.deepEqual([s.spends.filter(x => x[1] === 'standard').length, ledgerOf(w).loaded], [1, 3]);
    // natural 1 hits nothing: every target takes the miss half
    s.applied.length = 0; s.restore();
    const s2 = stubs(1);
    try { await bombs.drop({ vehicle, weapon: w, scene, user: GM }); assert.equal(s2.applied.every(x => x.amount === amounts.tough || x.amount === 0), true); } finally { s2.restore(); }
  } finally { try { s.restore(); } catch {} }
});

test('AMMUNITION: four bombs and no more; an empty rack refuses before the action; a roll failure returns the bomb and the action', async () => {
  world({ hull: 'frigate' }); const A = unit('A'); const scene = sceneWith([tok(A, 3, 1)]); const w = await rack(); const { vehicle } = state(); const s = stubs(15);
  try {
    for (let i = 0; i < 4; i++) assert.equal((await bombs.drop({ vehicle, weapon: w, scene, user: GM })).ok, true, `bomb ${i + 1}`);
    const n = s.spends.length;
    assert.equal((await bombs.drop({ vehicle, weapon: w, scene, user: GM })).ok, false);
    assert.equal(s.spends.length, n, 'an empty rack costs no action');
    // rebuy and fail the roll
    const { owner } = state();
    assert.equal((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: w.flags.swse.vehicleInstalledWeapon.installId, units: 1 })).success, true);
    await VehicleAmmunitionService.gmReload(vehicle, w, { user: globalThis.game.user });
    const before = ledgerOf(w).loaded; s.rollbacks.length = 0;
    RollEngine.safeRoll = async () => null;
    assert.equal((await bombs.drop({ vehicle, weapon: w, scene, user: GM })).reason, BOMB_REASONS.ROLL_UNAVAILABLE);
    assert.deepEqual([ledgerOf(w).loaded, s.rollbacks], [before, ['standard']], 'the bomb and the action came back');
  } finally { s.restore(); }
});

test('EVASION: the shared area-attack rules apply to a character caught in the field (a miss deals nothing to an Evasion target)', async () => {
  world({ hull: 'frigate' });
  const plain = unit('plain', 'character', 40), evader = unit('evader', 'character', 40); evader.system.evasion = true;
  const scene = sceneWith([tok(plain, 4, 1), tok(evader, 5, 1)]); const w = await rack(); const { vehicle } = state(); const s = stubs(10);
  try {
    const r = await bombs.drop({ vehicle, weapon: w, scene, user: GM });
    assert.equal(r.ok, true, JSON.stringify(r));
    const amt = Object.fromEntries(r.results.map(x => [x.targetId, x.amount]));
    assert.deepEqual([r.results.every(x => x.hit === false), amt.plain > 0, amt.evader], [true, true, 0]);
  } finally { s.restore(); }
});
