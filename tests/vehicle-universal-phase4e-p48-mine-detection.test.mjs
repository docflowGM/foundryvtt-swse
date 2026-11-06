/**
 * Space mine detection (V-P6C-15, owner interpretation) and path crossings (P6B-D-073): the mine's Stealth check 1d20+5 is rolled ONCE at
 * deployment and kept; entering a mined square opens a reaction window (pilot Perception / system operator Use Computer vs that DC) instead of
 * detonating; a noticed mine the ship steps off is avoided, otherwise the normal trigger runs through the atomic claim. Movement paths are used
 * only when Foundry's recorded movement establishes them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { S, VehicleAmmunitionService, ActorEngine, world, install, state } from './helpers/vehicle-weapon-world.mjs';

const { ActionEconomyConsumption } = await import('../scripts/engine/combat/action/action-economy-consumption.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const mines = await import('../scripts/engine/vehicles/vehicle-mine-service.js');
const { MINE_REASONS, pathCells, movementWaypointsOf, moveEntersSquare } = await import('../scripts/domain/vehicles/vehicle-space-mine.js');

const GM = { isGM: true, id: 'gm1' };
const ship = (id, w = 1) => ({ id, type: 'vehicle', name: id, isOwner: true, system: { size: 'medium', hp: { value: 400, max: 400 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 15 } }, damageThreshold: 999, damage: { threshold: 999, reduction: 0 }, hp: { value: 400, max: 400 }, shield: { current: 0, stored: false } } }, flags: { swse: {} }, effects: [], items: [], getFlag() {}, setFlag: async () => {} });
const tok = (actor, col, row, w = 1, h = 1) => ({ id: `t-${actor.id}`, actor, x: col * 100, y: row * 100, width: w, height: h });
function sceneWith(tokens = []) {
  const scene = { id: 's1', grid: { size: 100 }, flags: { swse: {} }, tokens,
    async update(d) { await Promise.resolve(); for (const [k, v] of Object.entries(d)) { const parts = k.split('.'); let o = scene; for (const q of parts.slice(0, -1)) o = (o[q] ??= {}); const last = parts.at(-1); if (last.startsWith('-=')) delete o[last.slice(2)]; else o[last.replace(/^==/, '')] = structuredClone(v); } } };
  globalThis.canvas.scene = scene; return scene;
}
async function launcher() {
  const w = await install('space-mine-launcher', null, 'turret-1');
  const { vehicle, owner } = state();
  assert.equal((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: w.flags.swse.vehicleInstalledWeapon.installId, units: 6 })).success, true);
  await VehicleAmmunitionService.gmReload(vehicle, w, { user: globalThis.game.user });
  vehicle.getActiveTokens = () => [{ document: { x: 300, y: 100, width: 1, height: 1, parent: { id: 's1' } } }];
  return w;
}
function stubs(d20 = 10) {
  const real = { spend: ActionEconomyConsumption.spend, apply: ActorEngine.applyDamage, roll: RollEngine.safeRoll };
  const spends = [], applied = [], rolled = [];
  ActionEconomyConsumption.spend = async (a, type) => { spends.push([a.id, type]); return { allowed: true, rollback: async () => {} }; };
  ActorEngine.applyDamage = async (t, x) => { applied.push([t.id, x.amount]); return { resolution: { damageToHP: x.amount } }; };
  RollEngine.safeRoll = async f => { rolled.push(String(f)); return /1d20/.test(f) ? { total: d20 + Number(/\+\s*(-?\d+)/.exec(f)?.[1] ?? 0), formula: f, dice: [{ results: [{ result: d20 }] }] } : { total: 10, formula: f, dice: [] }; };
  return { spends, applied, rolled, restore() { ActionEconomyConsumption.spend = real.spend; ActorEngine.applyDamage = real.apply; RollEngine.safeRoll = real.roll; } };
}
const roll = total => async () => total;

test('DETECTION DC: 1d20 + 5 rolled once at deployment and kept with the mine', async () => {
  world({ hull: 'frigate' }); const scene = sceneWith(); const w = await launcher(); const { vehicle } = state(); const s = stubs(13);
  try {
    const m = (await mines.deploy({ vehicle, weapon: w, scene, user: GM })).mine;
    assert.deepEqual([m.detectionDc, m.detectionD20], [18, 13]);
    assert.equal(s.rolled.filter(f => /1d20 \+ 5/.test(f)).length, 1, 'one Stealth roll');
    assert.equal(mines.readMines(scene)[0].detectionDc, 18, 'persisted on the Scene');
  } finally { s.restore(); }
});

test('REACTION WINDOW: entry opens a pending entry; pilot and operator checks run once each against the stored DC; a noticed mine the ship leaves is avoided', async () => {
  world({ hull: 'frigate' }); const B = ship('B'), pilot = ship('pilotActor'); pilot.type = 'character';
  const scene = sceneWith([tok(B, 3, 1)]); const w = await launcher(); const { vehicle } = state(); const s = stubs(10);
  try {
    const mine = (await mines.deploy({ vehicle, weapon: w, scene, user: GM })).mine;                // DC 15
    const moved = { ...tok(B, 3, 1), actor: B, parent: scene };
    const r = await mines.onTokenMoved({ scene, tokenDoc: moved, user: GM });
    assert.deepEqual([r.detonated.length, r.pending.length, s.applied.length], [0, 1, 0]);
    assert.equal((await mines.onTokenMoved({ scene, tokenDoc: moved, user: GM })).pending.length, 0, 'one entry per ship');
    // reactions: a failure first (14 < 15), then a success from the operator (15 >= 15)
    const crew = { id: 'crew1', type: 'character', isOwner: true };
    const fail = await mines.attemptNotice({ scene, mineId: mine.id, vehicle: B, kind: 'operator', crewActor: crew, user: GM, rollNotice: roll(14) });
    assert.deepEqual([fail.ok, fail.success, fail.dc], [true, false, 15]);
    assert.equal((await mines.attemptNotice({ scene, mineId: mine.id, vehicle: B, kind: 'operator', crewActor: crew, user: GM, rollNotice: roll(20) })).reason, MINE_REASONS.ALREADY_ATTEMPTED, 'one reaction per kind');
    assert.equal((await mines.attemptNotice({ scene, mineId: mine.id, vehicle: B, kind: 'pilot', user: GM, rollNotice: roll(20) })).reason, MINE_REASONS.CREW_REQUIRED, 'no pilot assigned, none invented');
    const ok = await mines.attemptNotice({ scene, mineId: mine.id, vehicle: B, kind: 'pilot', crewActor: pilot, user: GM, rollNotice: roll(15) });
    assert.deepEqual([ok.ok, ok.success], [true, true]);
    assert.deepEqual(s.spends.filter(x => x[1] === 'reaction').map(x => x[0]), ['crew1', 'crew1', 'pilotActor'].slice(0, 1).concat(['pilotActor']), 'each reaction is spent from the reacting crew member');
    assert.equal(mines.readMines(scene)[0].pending.B.noticed, true);
    // the pilot chooses another square: the entry is cleared, nothing detonates
    scene.tokens = [tok(B, 4, 1)];
    const settled = await mines.resolveEntry({ scene, mineId: mine.id, actor: B, user: GM });
    assert.deepEqual([settled.ok, settled.avoided, s.applied.length, mines.readMines(scene).length], [true, true, 0, 1]);
    assert.deepEqual(mines.readMines(scene)[0].pending, {});
  } finally { s.restore(); }
});

test('NOT NOTICED (or stayed): the normal trigger runs through the atomic claim, once', async () => {
  world({ hull: 'frigate' }); const B = ship('B'), C = ship('C');
  const scene = sceneWith([tok(B, 3, 1), tok(C, 3, 1)]); const w = await launcher(); const { vehicle } = state(); const s = stubs(10);
  try {
    const mine = (await mines.deploy({ vehicle, weapon: w, scene, user: GM })).mine;
    await mines.onTokenMoved({ scene, tokenDoc: { ...tok(B, 3, 1), actor: B, parent: scene }, user: GM });
    await mines.attemptNotice({ scene, mineId: mine.id, vehicle: B, kind: 'operator', crewActor: { id: 'c', type: 'character', isOwner: true }, user: GM, rollNotice: roll(3) });
    const [a, b] = await Promise.all([mines.resolveEntry({ scene, mineId: mine.id, actor: B, user: GM }), mines.resolveEntry({ scene, mineId: mine.id, actor: B, user: GM })]);
    assert.equal([a, b].filter(r => r.ok).length, 1, 'one detonation');
    assert.deepEqual(s.applied.map(x => x[0]).sort(), ['B', 'C']);
    assert.equal(mines.readMines(scene).length, 0);
  } finally { s.restore(); }
});

test('PATH CROSSING: a recorded straight/diagonal path enters intermediate squares; an unestablished path is never assumed; the GM can adjudicate', async () => {
  const opts = (id, wps) => ({ _movement: { [id]: { passed: { waypoints: wps } } } });
  const sq = { col: 3, row: 1 };
  // straight run (1,1) -> (5,1) passes (3,1), ends past it
  const tokenDoc = { id: 'T', x: 500, y: 100, width: 1, height: 1 };
  const straight = opts('T', [{ x: 100, y: 100 }, { x: 500, y: 100 }]);
  assert.deepEqual(moveEntersSquare(tokenDoc, straight, 100, sq), { entered: true, atDestination: false, passedThrough: true, pathTrusted: true });
  // exact diagonal
  assert.equal(moveEntersSquare({ id: 'T', x: 400, y: 300, width: 1, height: 1 }, opts('T', [{ x: 200, y: 100 }, { x: 400, y: 300 }]), 100, { col: 3, row: 2 }).passedThrough, true);
  // a segment whose shape the grid does not establish (dc 4, dr 1): untrusted, destination only
  const bent = opts('T', [{ x: 100, y: 100 }, { x: 500, y: 200 }]);
  assert.equal(pathCells(movementWaypointsOf(tokenDoc, bent), 100), null);
  assert.deepEqual(moveEntersSquare({ ...tokenDoc, y: 200 }, bent, 100, sq), { entered: false, atDestination: false, passedThrough: false, pathTrusted: false });
  // no movement data at all
  assert.equal(movementWaypointsOf(tokenDoc, {}), null);
  // a large ship's footprint
  assert.equal(moveEntersSquare({ id: 'T', x: 500, y: 100, width: 3, height: 1 }, opts('T', [{ x: 100, y: 100 }, { x: 500, y: 100 }]), 100, { col: 2, row: 1 }).entered, true);

  world({ hull: 'frigate' }); const B = ship('B'); const scene = sceneWith([tok(B, 5, 1)]); const w = await launcher(); const { vehicle } = state(); const s = stubs(10);
  try {
    const mine = (await mines.deploy({ vehicle, weapon: w, scene, user: GM })).mine;                 // square (3,1)
    const through = await mines.onTokenMoved({ scene, tokenDoc: { ...tok(B, 5, 1), actor: B, parent: scene }, options: opts('t-B', [{ x: 100, y: 100 }, { x: 500, y: 100 }]), user: GM });
    assert.deepEqual([through.pending.length, through.pending[0].passedThrough, through.pending[0].pathTrusted], [1, true, true]);
    // not noticed: the area attack is made on the entering ship even though it moved on (it is no longer in the square)
    const r = await mines.resolveEntry({ scene, mineId: mine.id, actor: B, user: GM });
    assert.deepEqual([r.ok, r.avoided, s.applied.map(x => x[0])], [true, false, ['B']]);
    // no recorded path: nothing is fabricated; the GM adjudicates a crossing explicitly
    const m2 = (await mines.deploy({ vehicle, weapon: w, scene, user: GM })).mine;
    none(await mines.onTokenMoved({ scene, tokenDoc: { ...tok(B, 5, 1), actor: B, parent: scene }, user: GM }));
    assert.equal((await mines.adjudicateEntry({ scene, mineId: m2.id, actor: B, user: { isGM: false } })).reason, MINE_REASONS.GM_ONLY);
    assert.equal((await mines.adjudicateEntry({ scene, mineId: m2.id, actor: B, user: GM })).ok, true);
    assert.equal((await mines.resolveEntry({ scene, mineId: m2.id, actor: B, outcome: 'avoided', user: GM })).avoided, true);
  } finally { s.restore(); }
});
function none(r) { assert.deepEqual([r.detonated.length, r.pending.length], [0, 0]); }
