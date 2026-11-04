/**
 * Corrections to the persistent scene weapons: command mines cost their gunner a STANDARD action; a mine can be claimed once even from
 * concurrent triggers; placement is legal only from the ship's own launcher and its token on THIS scene; scene writes are key-level so
 * concurrent writes cannot erase each other; only the active GM client acts on scene events; the interdiction state is shown on the sheet.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { S, VehicleAmmunitionService, ActorEngine, world, install, state } from './helpers/vehicle-weapon-world.mjs';

const { ActionEconomyConsumption } = await import('../scripts/engine/combat/action/action-economy-consumption.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const mines = await import('../scripts/engine/vehicles/vehicle-mine-service.js');
const gw = await import('../scripts/engine/vehicles/vehicle-interdiction-service.js');
const sceneState = await import('../scripts/engine/vehicles/vehicle-scene-state.js');
const { MINE_REASONS } = await import('../scripts/domain/vehicles/vehicle-space-mine.js');
const { buildVehiclePublicationViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-publication-view-model.js');

const GM = { isGM: true, id: 'gm1' }, OTHER_GM = { isGM: true, id: 'gm2' };
const ship = (id, hp = 400) => ({ id, type: 'vehicle', name: id, system: { size: 'medium', hp: { value: hp, max: 400 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 15 } }, damageThreshold: 999, damage: { threshold: 999, reduction: 0 }, hp: { value: hp, max: 400 }, shield: { current: 0, stored: false } } }, flags: { swse: {} }, effects: [], items: [], getFlag() {}, setFlag: async () => {} });
const tok = (actor, col, row) => ({ id: `t-${actor.id}`, actor, x: col * 100, y: row * 100, width: 1, height: 1 });
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
function stubs() {
  const real = { spend: ActionEconomyConsumption.spend, apply: ActorEngine.applyDamage, roll: RollEngine.safeRoll };
  const spends = [], rollbacks = [], applied = [];
  ActionEconomyConsumption.spend = async (a, type) => { spends.push([a.id, type]); return { allowed: true, rollback: async () => { rollbacks.push(type); } }; };
  ActorEngine.applyDamage = async (t, d) => { applied.push([t.id, d.amount]); return { resolution: { damageToHP: d.amount } }; };
  RollEngine.safeRoll = async f => (/1d20/.test(f) ? { total: 20, formula: f, dice: [{ results: [{ result: 15 }] }] } : { total: 10, formula: f, dice: [] });
  return { spends, rollbacks, applied, restore() { ActionEconomyConsumption.spend = real.spend; ActorEngine.applyDamage = real.apply; RollEngine.safeRoll = real.roll; } };
}

test('COMMAND mine: detonation costs the gunner a STANDARD action; a proximity-claim race rolls the action back', async () => {
  world({ hull: 'frigate' }); const scene = sceneWith([tok(ship('B'), 3, 1)]);
  const w = await launcher(); const { vehicle } = state(); const s = stubs();
  try {
    const cmd = (await mines.deploy({ vehicle, weapon: w, scene, user: GM, detonation: 'command' })).mine;
    s.spends.length = 0;
    const r = await mines.detonate({ scene, mineId: cmd.id, user: GM, command: true, vehicle });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.deepEqual(s.spends.map(x => x[1]), ['standard'], 'printed: a gunner detonates it as a standard action');
    assert.equal(mines.readMines(scene).length, 0);
    // already gone: refused AND no action is kept
    s.spends.length = 0; s.rollbacks.length = 0;
    assert.equal((await mines.detonate({ scene, mineId: cmd.id, user: GM, command: true, vehicle })).reason, MINE_REASONS.NOT_FOUND);
    assert.deepEqual([s.spends.length, s.rollbacks.length], [0, 0]);
    // a command mine whose deploying ship is another vehicle has no resolvable gunner
    const cmd2 = (await mines.deploy({ vehicle, weapon: w, scene, user: GM, detonation: 'command' })).mine;
    s.spends.length = 0;
    assert.equal((await mines.detonate({ scene, mineId: cmd2.id, user: GM, command: true, vehicle: ship('other') })).reason, MINE_REASONS.COMMAND_GUNNER_UNRESOLVED);
    assert.equal(s.spends.length, 0);
    // proximity detonation (no gunner) costs no action
    const prox = (await mines.deploy({ vehicle, weapon: w, scene, user: GM })).mine; s.spends.length = 0;
    assert.equal((await mines.detonate({ scene, mineId: prox.id, user: GM })).ok, true);
    assert.equal(s.spends.length, 0);
  } finally { s.restore(); }
});

test('CONCURRENCY: two simultaneous triggers claim a mine once; concurrent scene writes keep each other', async () => {
  world({ hull: 'frigate' }); const A = ship('A'), B = ship('B'); const scene = sceneWith([tok(A, 3, 1), tok(B, 3, 1)]);
  const w = await launcher(); const { vehicle } = state(); const s = stubs();
  try {
    const m = (await mines.deploy({ vehicle, weapon: w, scene, user: GM })).mine;
    const results = await Promise.all([mines.detonate({ scene, mineId: m.id, user: GM }), mines.detonate({ scene, mineId: m.id, user: GM }), mines.removeMine({ scene, mineId: m.id, user: GM })]);
    assert.equal(results.filter(r => r.ok).length, 1, 'exactly one claim wins');
    assert.equal(s.applied.length, 2, 'the two ships in the square are damaged once, not twice');
    // two deployments written at once both survive (key-level writes)
    const [d1, d2] = await Promise.all([mines.deploy({ vehicle, weapon: w, scene, user: GM }), mines.deploy({ vehicle, weapon: w, scene, user: GM })]);
    assert.deepEqual([d1.ok, d2.ok], [true, true]);
    assert.equal(mines.readMines(scene).length, 2);
    // removing one leaves the other
    await mines.removeMine({ scene, mineId: d1.mine.id, user: GM });
    assert.deepEqual(mines.readMines(scene).map(x => x.id), [d2.mine.id]);
    // a failed claim write leaves the record and the command action unspent
  } finally { s.restore(); }
});

test('PLACEMENT: own launcher, a token ON this scene, a printed mode; the wrong scene is never used', async () => {
  world({ hull: 'frigate' }); const scene = sceneWith();
  const w = await launcher(); const { vehicle } = state(); const s = stubs();
  try {
    assert.equal((await mines.deploy({ vehicle: ship('stranger'), weapon: w, scene, user: GM })).reason, MINE_REASONS.NOT_OWN_LAUNCHER);
    assert.equal((await mines.deploy({ vehicle, weapon: w, scene, user: GM, detonation: 'timer' })).reason, MINE_REASONS.MODE_INVALID);
    vehicle.getActiveTokens = () => [{ document: { x: 300, y: 100, width: 1, height: 1, parent: { id: 'another-scene' } } }];
    assert.equal((await mines.deploy({ vehicle, weapon: w, scene, user: GM })).reason, MINE_REASONS.NO_POSITION, 'a token on another scene is not a position here');
    assert.equal(mines.readMines(scene).length, 0);
    assert.equal(s.spends.length, 0, 'every refusal came before any cost');
  } finally { s.restore(); }
});

test('RESPONSIBLE GM: only the active GM client acts on a scene event', async () => {
  const prior = globalThis.game.users;
  try {
    world({ hull: 'frigate' }); globalThis.game.users = { activeGM: GM };
    assert.deepEqual([sceneState.isResponsibleGM(GM), sceneState.isResponsibleGM(OTHER_GM), sceneState.isResponsibleGM({ isGM: false, id: 'p' })], [true, false, false]);
    const A = ship('A'); const scene = sceneWith([tok(A, 3, 1)]);
    const w = await launcher(); const { vehicle } = state(); const s = stubs(); globalThis.game.users = { activeGM: GM };
    try {
      await mines.deploy({ vehicle, weapon: w, scene, user: GM });
      assert.deepEqual(await mines.onTokenMoved({ scene, tokenDoc: { ...tok(A, 3, 1), actor: A, parent: scene }, user: OTHER_GM }), [], 'the non-active GM does not detonate');
      assert.equal(mines.readMines(scene).length, 1);
      assert.equal((await mines.onTokenMoved({ scene, tokenDoc: { ...tok(A, 3, 1), actor: A, parent: scene }, user: GM })).length, 1);
    } finally { s.restore(); }
  } finally { globalThis.game.users = prior; }
});

test('GRAVITY WELL: wrong-scene tokens are never interdicted; concurrent identical fields are one; the sheet shows the interdiction', async () => {
  const scene = { id: 's1', grid: { size: 100 }, flags: { swse: {} }, async update(d) { await Promise.resolve(); for (const [k, v] of Object.entries(d)) { const parts = k.split('.'); let o = scene; for (const q of parts.slice(0, -1)) o = (o[q] ??= {}); const last = parts.at(-1); if (last.startsWith('-=')) delete o[last.slice(2)]; else o[last] = structuredClone(v); } } };
  const authority = { gravityWell: true };
  const [a, b] = await Promise.all([1, 2].map(() => gw.createFromHit({ vehicle: { id: 'V' }, weapon: { id: 'W' }, authority, area: { col: 2, row: 2 }, scene, scale: 'starship', user: GM })));
  assert.equal([a, b].filter(r => r.ok).length, 1, 'the duplicate check and the write are one step');
  assert.equal(gw.readFields(scene).length, 1);
  const elsewhere = { id: 'E', type: 'vehicle', effects: [], getActiveTokens: () => [{ document: { x: 250, y: 250, width: 1, height: 1, parent: { id: 'not-this-scene' } } }] };
  assert.deepEqual(await gw.applyAtTurnStart({ actor: elsewhere, scene, combat: { round: 1, turn: 0 } }), { applied: [], skipped: [] });
  const base = [...buildUniversalVehiclePackSources().output.values()].flat().find(a => a.system.vehicleSourceEntryKey === 'core-incom-t-65b-x-wing-starfighter');
  const withEffects = effects => ({ ...base, effects });
  assert.equal(buildVehiclePublicationViewModel(withEffects([{ flags: { swse: { hyperdriveInterdicted: { fieldId: 'f' } } }, disabled: false }])).hyperdrive.interdicted, true);
  assert.equal(buildVehiclePublicationViewModel(withEffects([])).hyperdrive.interdicted, false);
});
