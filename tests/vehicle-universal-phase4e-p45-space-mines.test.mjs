/**
 * Space mines (Starships of the Galaxy): launchers DEPLOY (swift action, one unit of the launcher ledger) into the deploying ship's square; a ship
 * entering the square detonates a proximity mine (once) and every ship in it takes an area attack against Reflex (full on a hit, half on a miss,
 * nothing on a natural 1) through the shared damage pipeline; IFF-exempt ships do not trigger it; command mines are detonated by the GM.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { S, VehicleAmmunitionService, ActorEngine, world, install, shootD20, targetAt, state } from './helpers/vehicle-weapon-world.mjs';

const { ActionEconomyConsumption } = await import('../scripts/engine/combat/action/action-economy-consumption.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const mines = await import('../scripts/engine/vehicles/vehicle-mine-service.js');
const { resolveVehicleWeaponAuthority } = await import('../scripts/domain/vehicles/vehicle-weapon-damage.js');
const { MINE_REASONS, MINE_TYPES, squareOfToken, tokenOccupies, mineDamageFormula } = await import('../scripts/domain/vehicles/vehicle-space-mine.js');

const GM = { isGM: true, id: 'gm1' }, PLAYER = { isGM: false, id: 'p1' };
const ship = (id, hp = 400, size = 'medium', reflex = 15) => ({ id, type: 'vehicle', name: id, system: { size, hp: { value: hp, max: 400 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: reflex } }, damageThreshold: 999, damage: { threshold: 999, reduction: 0 }, hp: { value: hp, max: 400 }, shield: { current: 0, stored: false } } }, flags: { swse: {} }, effects: [], items: [], getFlag() { return undefined; }, setFlag: async () => {} });
const tok = (actor, col, row, w = 1, h = 1) => ({ id: `t-${actor.id}`, actor, x: col * 100, y: row * 100, width: w, height: h });
function sceneWith(tokens = []) {
  const scene = { id: 's1', grid: { size: 100 }, flags: { swse: {} }, tokens, fail: false,
    async update(d) { if (scene.fail) throw new Error('scene write failed'); for (const [k, v] of Object.entries(d)) { const parts = k.split('.'); let o = scene; for (const q of parts.slice(0, -1)) o = (o[q] ??= {}); const last = parts.at(-1); if (last.startsWith('-=')) delete o[last.slice(2)]; else o[last.replace(/^==/, '')] = structuredClone(v); } } };
  globalThis.canvas.scene = scene; return scene;
}
async function minelauncher(id = 'space-mine-launcher', mount = 'turret-1') {
  const w = await install(id, null, mount);
  const { vehicle, owner } = state();
  assert.equal((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: w.flags.swse.vehicleInstalledWeapon.installId, units: 6 })).success, true);
  await VehicleAmmunitionService.gmReload(vehicle, w, { user: globalThis.game.user });
  state().vehicle.getActiveTokens = () => [{ document: { x: 300, y: 100, width: 1, height: 1, parent: { id: 's1' } } }];
  return w;
}
const ledgerOf = w => { const { vehicle } = state(); return vehicle.flags.swse.vehicleAmmunition[w.flags.swse.vehicleInstalledWeapon.installId]; };

test('GEOMETRY and statistics: a mine is deployed in a square; any square a hull occupies counts; the printed statistics', () => {
  assert.deepEqual(squareOfToken({ document: { x: 350, y: 120 } }, 100), { col: 3, row: 1 });
  assert.equal(tokenOccupies({ x: 200, y: 100, width: 3, height: 1 }, 100, { col: 4, row: 1 }), true);
  assert.equal(tokenOccupies({ x: 200, y: 100, width: 3, height: 1 }, 100, { col: 5, row: 1 }), false);
  assert.deepEqual([MINE_TYPES.standard.attack, mineDamageFormula('standard'), MINE_TYPES.standard.multiplier], [5, '7d10', 2]);
  assert.deepEqual([MINE_TYPES.heavy.attack, mineDamageFormula('heavy'), MINE_TYPES.heavy.multiplier, MINE_TYPES.heavy.capitalWeapon], [5, '6d10', 5, true]);
});

test('LAUNCHER: certified, holds six, flagged by the weapon authority, and cannot be FIRED as an ordinary weapon', async () => {
  world({ hull: 'frigate' }); sceneWith();
  const w = await minelauncher();
  const a = resolveVehicleWeaponAuthority(w);
  assert.deepEqual([a.ok, a.mine, a.ammunition.capacity], [true, 'standard', 6]);
  assert.equal(await shootD20(15, w, targetAt(1), {}), null, 'a mine launcher deploys; it has no Table 10-2 row to fire against');
});

test('DEPLOY: GM-only; a swift action, one ledger unit, the square of the deploying ship; failures refund both', async () => {
  world({ hull: 'frigate' }); const scene = sceneWith();
  const w = await minelauncher();
  const { vehicle } = state();
  const spends = [], rollbacks = [];
  const realSpend = ActionEconomyConsumption.spend;
  ActionEconomyConsumption.spend = async (a, type) => { spends.push([a.id, type]); return { allowed: true, rollback: async () => { rollbacks.push(type); } }; };
  try {
    const before = ledgerOf(w).loaded;
    assert.equal((await mines.deploy({ vehicle, weapon: w, scene, user: PLAYER })).reason, MINE_REASONS.GM_ONLY);
    assert.equal(spends.length, 0); assert.equal(ledgerOf(w).loaded, before);
    const r = await mines.deploy({ vehicle, weapon: w, scene, user: GM });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.deepEqual([spends, ledgerOf(w).loaded, r.mine.square, r.mine.type, mines.readMines(scene).length], [[[vehicle.id, 'swift']], before - 1, { col: 3, row: 1 }, 'standard', 1]);
    // the scene write fails: the unit and the action come back
    scene.fail = true;
    await assert.rejects(mines.deploy({ vehicle, weapon: w, scene, user: GM }), /scene write failed/);
    scene.fail = false;
    assert.deepEqual([ledgerOf(w).loaded, rollbacks], [before - 1, ['swift']], 'refunded; the failed deployment cost nothing');
    // an empty launcher refuses before any cost
    const left = ledgerOf(w).loaded;
    for (let i = 0; i < left; i++) await VehicleAmmunitionService.spendLaunch(vehicle, w, { attackId: 'x' + i });
    const n = spends.length;
    assert.equal((await mines.deploy({ vehicle, weapon: w, scene, user: GM })).ok, false);
    assert.equal(spends.length, n);
    // a non-mine weapon is not a mine launcher
    const laser = await install('laser-cannon-light', null, 'turret-2');
    assert.equal((await mines.deploy({ vehicle, weapon: laser, scene, user: GM })).reason, MINE_REASONS.NOT_A_MINE_LAUNCHER);
  } finally { ActionEconomyConsumption.spend = realSpend; }
});

function rolls(d20s, damageTotal) {
  const calls = []; let i = 0;
  RollEngine.safeRoll = async formula => {
    calls.push(String(formula));
    if (/1d20/.test(formula)) { const d = d20s[i++ % d20s.length]; const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(formula)?.[1] ?? 0); return { total: d + b, formula, dice: [{ results: [{ result: d }] }] }; }
    return { total: damageTotal, formula, dice: [] };
  };
  return calls;
}

test('DETONATION: entry sets off a proximity mine ONCE; every ship in the square is attacked; hit full, miss half, natural 1 nothing; exempt and absent ships are not triggers', async () => {
  world({ hull: 'frigate' });
  const realApply = ActorEngine.applyDamage, realUpdate = ActorEngine.updateActor, realRoll = RollEngine.safeRoll;
  const applied = [];
  ActorEngine.applyDamage = async (t, d) => { applied.push([t.id, d.amount]); return { resolution: { damageToHP: d.amount } }; };
  try {
    const A = ship('A'), B = ship('B'), C = ship('C'), exempt = ship('X'), away = ship('Y');
    const scene = sceneWith([tok(B, 3, 1), tok(C, 3, 1), tok(away, 9, 9)]);
    const w = await minelauncher();
    const dep0 = await mines.deploy({ vehicle: state().vehicle, weapon: w, scene, user: GM, iffExempt: ['X'] });
    assert.equal(dep0.ok, true, JSON.stringify(dep0));
    const mine = dep0.mine;
    // hit (20 >= 15): 30 x 2 = 60; B and C both in the square
    rolls([15, 15], 30);
    const enter = ship('E'); const moved = tok(enter, 3, 1); scene.tokens.push(moved);
    assert.deepEqual(await mines.onTokenMoved({ scene, tokenDoc: { ...moved, actor: exempt, parent: scene }, user: GM }), [], 'an IFF-exempt ship does not set it off');
    assert.equal(mines.readMines(scene).length, 1);
    assert.deepEqual(await mines.onTokenMoved({ scene, tokenDoc: { ...tok(away, 8, 8), parent: scene }, user: GM }), [], 'a ship elsewhere does not');
    const fired = await mines.onTokenMoved({ scene, tokenDoc: { ...moved, parent: scene }, user: GM });
    assert.equal(fired.length, 1);
    assert.deepEqual(applied.sort(), [['B', 60], ['C', 60], ['E', 60]], 'all three ships in the square take full damage');
    assert.equal(mines.readMines(scene).length, 0, 'the mine is gone');
    assert.deepEqual(await mines.onTokenMoved({ scene, tokenDoc: { ...moved, parent: scene }, user: GM }), [], 'a discrete mine cannot detonate twice');
    // miss (5+5=10 < 15): half; natural 1: nothing
    for (const [d20, expect] of [[5, 30], [1, null]]) {
      applied.length = 0; scene.tokens = [tok(B, 3, 1)];
      const m2 = (await mines.deploy({ vehicle: state().vehicle, weapon: w, scene, user: GM })).mine;
      rolls([d20], 30);
      const r = await mines.detonate({ scene, mineId: m2.id, user: GM });
      assert.equal(r.ok, true);
      assert.deepEqual(applied.map(x => x[1]), expect === null ? [] : [expect], `d20 ${d20}`);
    }
    // not a GM / unknown mine
    assert.equal((await mines.detonate({ scene, mineId: 'x', user: PLAYER })).reason, MINE_REASONS.GM_ONLY);
    assert.equal((await mines.detonate({ scene, mineId: 'x', user: GM })).reason, MINE_REASONS.NOT_FOUND);
    // a proximity mine cannot be command-detonated; a command mine can
    const prox = (await mines.deploy({ vehicle: state().vehicle, weapon: w, scene, user: GM })).mine;
    assert.equal((await mines.detonate({ scene, mineId: prox.id, user: GM, command: true })).reason, MINE_REASONS.NOT_COMMAND);
    await mines.removeMine({ scene, mineId: prox.id, user: GM });
    const cmd = (await mines.deploy({ vehicle: state().vehicle, weapon: w, scene, user: GM, detonation: 'command' })).mine;
    assert.deepEqual(await mines.onTokenMoved({ scene, tokenDoc: { ...tok(B, 3, 1), actor: B, parent: scene }, user: GM }), [], 'a command mine ignores proximity');
    assert.equal((await mines.detonate({ scene, mineId: cmd.id, user: GM, command: true })).ok, true);
  } finally { ActorEngine.applyDamage = realApply; ActorEngine.updateActor = realUpdate; RollEngine.safeRoll = realRoll; }
});

test('HEAVY MINE: 6d10x5 and the capital-weapon -20 against targets smaller than Colossal; the damage reaches the real pipeline', async () => {
  world({ hull: 'frigate' });
  const realUpdate = ActorEngine.updateActor, realRoll = RollEngine.safeRoll;
  try {
    const small = ship('S', 400, 'medium'), big = ship('G', 4000, 'colossal');
    const scene = sceneWith([tok(small, 3, 1), tok(big, 3, 1)]);
    const w = await minelauncher('space-mine-launcher-heavy');
    const harnessUpdate = ActorEngine.updateActor;
    ActorEngine.updateActor = async (actor, data) => { if (actor.id === 'veh1') return harnessUpdate(actor, data); };      // the ships' HP writes are not under test
    assert.equal(resolveVehicleWeaponAuthority(w).mine, 'heavy');
    const dep = await mines.deploy({ vehicle: state().vehicle, weapon: w, scene, user: GM });
    assert.equal(dep.ok, true, JSON.stringify(dep));
    const mine = dep.mine;
    const calls = rolls([15], 20);
    const r = await mines.detonate({ scene, mineId: mine.id, user: GM });
    assert.ok(calls.some(c => c === '1d20 + -15'), `5 - 20 against the medium ship: ${calls.join(' | ')}`);
    assert.ok(calls.some(c => c === '1d20 + 5'), 'no penalty against a Colossal ship');
    assert.ok(calls.includes('6d10'));
    const byId = Object.fromEntries(r.results.map(x => [x.targetId, x]));
    assert.equal(byId.S.hit, false, '15 - 15 = 0 against Reflex 15 misses');
    assert.equal(byId.G.hit, true);
    assert.equal(byId.G.amount, 100, '20 x 5');
    assert.equal(byId.S.amount, 50, 'a miss deals half: 100 / 2');
    assert.equal(byId.G.damageToHP, 100, 'applied through ActorEngine.applyDamage');
  } finally { ActorEngine.updateActor = realUpdate; RollEngine.safeRoll = realRoll; }
});
