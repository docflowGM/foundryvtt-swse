/**
 * WE-2 (P6B-D-053): automatic range authority of vehicle weapons (Core Rulebook, Vehicle Combat, Range Modifier and Table 10-2).
 * The band is the distance between the ACTUAL TOKENS (counting their footprints) at the ENCOUNTER's scale in the weapon's Table 10-2 row;
 * the modifier is the Core band penalty (0 / -2 / -5 / -10); a target beyond long range, an unresolved distance and an unidentified
 * weapon type are refused before any cost; no caller-supplied band, distance or penalty can replace the calculation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as R from '../scripts/domain/vehicles/vehicle-weapon-range.js';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';

installSystemsResolver(); installFoundryStubs();
const { VehicleInstallationService: S } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { VehicleAmmunitionService, readAftermarketLedgers } = await import('../scripts/engine/vehicles/vehicle-ammunition-service.js');
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('../scripts/engine/progression/utils/snapshot-manager.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveVehicleAttackRange, describeRangeRefusal } = await import('../scripts/engine/combat/vehicle-attack-range.js');
const { RangeEngine } = await import('../scripts/engine/combat/range-engine.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const { SWSEChat } = await import('../scripts/chat/swse-chat.js');
const { armStockWeaponsOnCreate } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');

const ranges = JSON.parse(readFileSync('data/vehicle-weapon-ranges.json', 'utf8'));
const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const weapons = load('weapon-systems');
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
const catalogRow = id => ({ ...weapons.find(c => c.id === id), certification: cert[id] });
const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const HULLS = { fighter: 'core-incom-t-65b-x-wing-starfighter', frigate: 'cw-c-9979-landing-craft' };
const BANDS = ['pb', 'short', 'medium', 'long'];
const PENALTY = { pb: 0, short: -2, medium: -5, long: -10 };

// ------------------------------------------------------------------------------------------------------------------------------
// Pure: the table, the designations, the geometry
// ------------------------------------------------------------------------------------------------------------------------------
test('TABLE: every Table 10-2 row is contiguous from 0, and the band lookup is exact at every boundary, both scales', () => {
  assert.equal(ranges.length, 9);
  for (const p of ranges) for (const scale of ['character', 'starship']) {
    const bands = BANDS.map(b => [b, p[scale][b]]).filter(([, r]) => r);
    assert.equal(bands[0][1].min, 0, `${p.slug} ${scale} starts at 0`);
    for (let i = 1; i < bands.length; i++) assert.equal(bands[i][1].min, bands[i - 1][1].max + 1, `${p.slug} ${scale}: no hole between ${bands[i - 1][0]} and ${bands[i][0]}`);
    for (const [b, r] of bands) {
      for (const d of [r.min, r.max]) assert.equal(R.bandForDistance(p, scale, d).band.key, b, `${p.slug} ${scale} ${d}`);
    }
    const last = bands.at(-1)[1];
    const beyond = R.bandForDistance(p, scale, last.max + 1);
    assert.deepEqual([beyond.ok, beyond.reason, beyond.longestBand], [false, R.RANGE_REASONS.OUT_OF_RANGE, last.max], `${p.slug} ${scale} beyond ${last.max}`);
  }
  // Core Table 10-2 values (read from the committed OCR): laser cannon starship 0-1 / 2 / 3-5 / 6-10; turbolaser 0-4 / 5-8; ion 0-2 / 3-4 / 5-10
  const laser = ranges.find(p => p.slug === 'laser-cannons');
  assert.deepEqual(BANDS.map(b => [laser.starship[b].min, laser.starship[b].max]), [[0, 1], [2, 2], [3, 5], [6, 10]]);
  assert.deepEqual(BANDS.map(b => [laser.character[b].min, laser.character[b].max]), [[0, 150], [151, 300], [301, 750], [751, 1500]]);
  assert.deepEqual([ranges.find(p => p.slug === 'turbolasers').starship.pb, ranges.find(p => p.slug === 'turbolasers').starship.short], [{ min: 0, max: 4 }, { min: 5, max: 8 }]);
  assert.deepEqual([ranges.find(p => p.slug === 'ion-cannons').starship.short, ranges.find(p => p.slug === 'ion-cannons').starship.medium], [{ min: 3, max: 4 }, { min: 5, max: 10 }]);
  // a row with only point blank (gravity well projectors) has no short / medium / long band
  assert.equal(R.bandForDistance(ranges.find(p => p.slug === 'gravity-well-projectors'), 'starship', 11).ok, false);
});

test('DESIGNATION: a printed weapon designation names exactly one Table 10-2 row, or none', () => {
  const s = R.rangeSlugFromPrintedDesignation;
  assert.equal(s('light laser cannons'), 'laser-cannons'); assert.equal(s('heavy laser cannon battery'), 'laser-cannons');
  assert.equal(s('medium blaster cannon'), 'blaster-cannons'); assert.equal(s('autoblasters'), 'blaster-cannons');
  assert.equal(s('light ion cannon'), 'ion-cannons'); assert.equal(s('turbolaser cannons'), 'turbolasers', '"turbolaser cannons" is not a laser cannon');
  assert.equal(s('heavy turbolasers'), 'turbolasers'); assert.equal(s('proton torpedoes'), 'missiles-torpedoes'); assert.equal(s('medium concussion missiles'), 'missiles-torpedoes');
  assert.equal(s('shieldbuster torpedoes'), 'shieldbuster-torpedoes'); assert.equal(s('tractor beam batteries'), 'tractor-beams'); assert.equal(s('gravity well projector'), 'gravity-well-projectors');
  assert.equal(s('point-defense'), 'point-defense');
  // none or several: unidentified, never guessed
  for (const x of ['mass-driver cannon', 'Proton beam cannon', 'volcano cannons', 'double lasers', 'laser cannon and ion cannon', '', null, undefined]) assert.equal(s(x), null, String(x));
});

test('GEOMETRY: squares are counted nearest square to nearest square; adjacent = 1, the same square = 0; footprints count; the grid size does not matter', () => {
  const tok = (cx, cy, w = 1, h = 1) => ({ center: { x: cx, y: cy }, document: { width: w, height: h } });
  const at = (size, sqx, sqy = 0, w1 = 1, h1 = 1, w2 = 1, h2 = 1) => R.measureSquaresBetweenTokens(tok(0, 0, w1, h1), tok(sqx * size, sqy * size, w2, h2), { size, type: 1 });
  for (const size of [50, 100, 140, 72.5]) {            // different scene grid sizes: the same layout counts the same squares
    assert.equal(at(size, 0).squares, 0, 'same square');
    for (const n of [1, 2, 3, 5, 6, 11, 150, 151]) assert.equal(at(size, n).squares, n, `${n} squares at grid ${size}`);
    assert.equal(at(size, 3, 3).squares, 3, 'a diagonal step counts as one square (Chebyshev)');
    assert.equal(at(size, 4, 2).squares, 4);
  }
  // token footprints (a 4-square-wide token is centred on a grid corner, a 1-square one on a square centre): a 4x4 ship adjacent to a 1x1 ship (centres 2.5 apart) is 1 square away
  assert.equal(at(100, 2.5, 0, 4, 4, 1, 1).squares, 1);
  assert.equal(at(100, 3.5, 0, 4, 4, 1, 1).squares, 2, 'one empty square between a 4x4 and a 1x1');
  assert.equal(at(100, 8, 0, 4, 4, 4, 4).squares, 5, 'two 4x4 ships, centers 8 apart: 4 empty squares between them');
  assert.equal(at(100, 1, 0, 4, 4, 4, 4).squares, 0, 'overlapping footprints');
  assert.equal(at(100, 10, 0, 2, 6, 2, 6).squares, 9, 'footprints are per axis: 2 wide each, 10 apart => 8 gap + 1');
  assert.equal(at(100, 0, 6, 2, 6, 2, 6).squares, 1 /* tall tokens along y: centers 6 apart, halves sum to 6 */);
  // a token without its center falls back to its document position + footprint
  assert.equal(R.measureSquaresBetweenTokens({ document: { x: 0, y: 0, width: 1, height: 1 } }, { document: { x: 500, y: 0, width: 1, height: 1 } }, { size: 100, type: 1 }).squares, 5);
  // gridless is measured the same way; a hex grid, an unknown grid size and a missing token are refused, never point blank
  assert.equal(R.measureSquaresBetweenTokens(tok(0, 0), tok(300, 0), { size: 100, type: 0 }).squares, 3);
  for (const grid of [{ size: 100, type: 2 }, { size: 100, type: 3 }, { size: 100, type: 4 }]) assert.equal(R.measureSquaresBetweenTokens(tok(0, 0), tok(300, 0), grid).reason, R.RANGE_REASONS.GRID_UNSUPPORTED);
  for (const grid of [{}, { size: 0 }, { size: NaN }, { size: 'x' }, null, undefined]) assert.equal(R.measureSquaresBetweenTokens(tok(0, 0), tok(300, 0), grid).reason, R.RANGE_REASONS.GRID_UNRESOLVED);
  assert.equal(R.measureSquaresBetweenTokens(null, tok(300, 0), { size: 100, type: 1 }).reason, R.RANGE_REASONS.DISTANCE_UNRESOLVED);
  assert.equal(R.measureSquaresBetweenTokens(tok(0, 0), {}, { size: 100, type: 1 }).reason, R.RANGE_REASONS.DISTANCE_UNRESOLVED);
});

test('RESOLUTION: refusals are named and ordered; nothing resolves to point blank by default', () => {
  const tok = x => ({ center: { x, y: 0 }, document: {} });
  const base = { slug: 'laser-cannons', scale: 'starship', attackerToken: tok(0), targetToken: tok(300), grid: { size: 100, type: 1 }, profile: ranges.find(p => p.slug === 'laser-cannons') };
  const ok = R.resolveVehicleRange(base);
  assert.deepEqual([ok.ok, ok.band, ok.squares, ok.scale, ok.bandMin, ok.bandMax], [true, 'medium', 3, 'starship', 3, 5]);
  assert.equal(R.resolveVehicleRange({ ...base, slug: null }).reason, R.RANGE_REASONS.TABLE_NOT_IDENTIFIED);
  assert.equal(R.resolveVehicleRange({ ...base, scale: 'undetermined' }).reason, R.RANGE_REASONS.SCALE_UNDETERMINED);
  assert.equal(R.resolveVehicleRange({ ...base, profile: null }).reason, R.RANGE_REASONS.TABLE_MISSING);
  assert.equal(R.resolveVehicleRange({ ...base, targetToken: null }).reason, R.RANGE_REASONS.DISTANCE_UNRESOLVED);
  assert.equal(R.resolveVehicleRange({ ...base, targetToken: tok(1100) }).reason, R.RANGE_REASONS.OUT_OF_RANGE);
  assert.equal(R.resolveVehicleRange({ ...base, targetToken: tok(1000) }).band, 'long', 'exactly 10 squares is the last long square');
  assert.match(describeRangeRefusal({ reason: R.RANGE_REASONS.OUT_OF_RANGE, squares: 11, longestBand: 10 }), /beyond the weapon's long range \(11 squares; long range ends at 10\)/);
});

test('STOCK GATE: every executable stock group names its Table 10-2 row; a group that names none is refused for it', () => {
  const all = actors.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups);
  for (const g of all) {
    if (g.executable) assert.ok(g.rangeSlug, `${g.groupKey} (${g.label})`);
    if (!g.rangeSlug) assert.ok(g.reasons.includes('STOCK_RANGE_TABLE_NOT_IDENTIFIED'), g.groupKey);
  }
  const unidentified = all.filter(g => g.reasons.includes('STOCK_RANGE_TABLE_NOT_IDENTIFIED') && !g.reasons.some(r => r !== 'STOCK_RANGE_TABLE_NOT_IDENTIFIED'));
  assert.deepEqual(unidentified.map(g => g.label).sort(), ['Proton beam cannon', 'SPHA-M mass-driver cannon', 'composite beam cannon', 'double lasers', 'laser turret', 'mass-driver cannon', 'volcano cannons'],
    'the five groups that were executable only because range was never asked');
});

// ------------------------------------------------------------------------------------------------------------------------------
// Attack integration: installed laser cannon, installed launcher, stock cannons
// ------------------------------------------------------------------------------------------------------------------------------
class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const rules = { resolveEpBudget: () => ({ state: 'known', total: 60 }), resolveUninstallRefund: () => null, allowEpShortfall: false, resolveNonstandard: () => ({ nonstandard: false, basis: 'FIXTURE' }) };
const GM_MOUNT = { mountKey: 'turret-1', arc: 'omni', operatorRole: 'pilot', reason: 'hardpoint fitted at the yard' };
const tokenAt = (x, y = 0, w, h) => ({ center: { x, y }, document: { rotation: 0, ...(w ? { width: w } : {}), ...(h ? { height: h } : {}) } });
let src, vehicle, owner, items, seq = 0, attackerToken = tokenAt(0, 0);
const setGrid = (size = 100, over = {}) => { globalThis.canvas = { grid: { size, type: 1 }, scene: { id: 's1', grid: { size, distance: 5, units: 'ft', type: 1 }, ...over } }; return size; };
function world({ hull = 'fighter', credits = 500000 } = {}) {
  setGrid(100); attackerToken = tokenAt(0, 0);
  src = structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === HULLS[hull]));
  src.system.ownedByActorId = 'owner1';
  items = new Items();
  vehicle = { ...src, id: 'veh1', name: 'Test hull', isOwner: true, items, getActiveTokens: () => [attackerToken], getRollData: () => ({}), toObject() { return structuredClone(src); } };
  owner = { id: 'owner1', name: 'Owner', isOwner: true, system: { credits }, flags: {}, toObject() { return { system: this.system }; }, getFlag: () => [] };
  Object.assign(globalThis.game, { user: Object.assign(globalThis.game.user ?? {}, { id: 'gm1', isGM: true }), actors: { get: id => ({ owner1: owner, veh1: vehicle })[id], contents: [] }, users: new Map(), combat: null });
  ActorEngine.applyMutationPlan = async (actor, plan) => {
    if (actor.id === 'veh1') for (const [k, v] of Object.entries(plan.set ?? {})) { const m = /^flags\.swse\.(.+)$/.exec(k); if (m) src.flags.swse[m[1]] = structuredClone(v); }
    if (plan.set?.['system.credits'] !== undefined) actor.system.credits = plan.set['system.credits'];
  };
  const snaps = new Map();
  SnapshotManager.createSnapshot = async actor => { const t = snaps.size + 1; snaps.set(`${actor.id}:${t}`, { credits: actor.system?.credits }); return { timestamp: t }; };
  SnapshotManager.restoreSnapshot = async () => true;
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const d of data) { const id = 'i' + (++seq); items.set(id, { id, ...structuredClone(d), actor: vehicle }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) items.delete(id); };
  ActorEngine.updateActor = async (actor, data) => {
    for (const [path, value] of Object.entries(data)) {
      const parts = path.split('.'); let o = actor;
      for (const k of parts.slice(0, -1)) o = (o[k] ??= {});
      const last = parts.at(-1); o[last.startsWith('==') ? last.slice(2) : last] = structuredClone(value);
    }
  };
  S.rules = rules;
}
const catalogOf = id => new Map([[id, catalogRow(id)]]);
async function install(id) {
  const r = await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: id, catalog: catalogOf(id), reason: 'refit', mount: GM_MOUNT });
  assert.equal(r.success, true, JSON.stringify(r));
  return [...items.values()].filter(i => i.flags?.swse?.vehicleInstalledWeapon).at(-1);
}
const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
globalThis.game.settings = globalThis.game.settings ?? { get: () => undefined };
const realPost = SWSEChat.postRoll; SWSEChat.postRoll = async () => ({ id: 'm' });
test.after(() => { SWSEChat.postRoll = realPost; });
const targetAt = (squares, { type = 'vehicle', size = 'medium', w, h, reflex = 15 } = {}) => ({ id: 'tgt', type, items: [], system: { size, defenses: { reflex: { total: reflex } } }, getActiveTokens: () => [tokenAt(squares * 100, 0, w, h)] });
async function withD20(d20, fn) {
  const r0 = RollEngine.safeRoll;
  RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); const total = d20 + b; return { total, formula, dice: [{ results: [{ result: d20 }] }], toJSON() { return { total, formula }; } }; };
  try { return await fn(); } finally { RollEngine.safeRoll = r0; }
}
const shoot = (w, target, extra = {}) => withD20(15, async () => { log.length = 0; return rollAttack(vehicle, w, { abstractCrewQuality: 'normal', target, ...extra }); });
const rangeEntry = r => r.componentLedger.filter(e => e.id === 'range');

test('ATTACK: an installed laser cannon takes the Core band penalty of its distance at starship scale; exact boundaries; beyond long range is refused', async () => {
  world();
  const w = await install('laser-cannon-light');
  const expect = { 1: 'pb', 2: 'short', 3: 'medium', 4: 'medium', 5: 'medium', 6: 'long', 10: 'long' };
  let pbBonus = null;
  for (const [sq, band] of Object.entries(expect)) {
    const r = await shoot(w, targetAt(Number(sq)));
    assert.ok(r, `${sq}: ${log.join('|')}`);
    const e = rangeEntry(r);
    assert.equal(e.length, 1, 'exactly one range component: never applied twice');
    assert.equal(e[0].value, PENALTY[band], `${sq} squares => ${band}`);
    assert.match(e[0].reason, new RegExp(`Table 10-2 \\(laser-cannons\\).*${R.RANGE_BANDS.find(b => b.key === band).label}.*${sq} square${sq === '1' ? '' : 's'}, starship scale`));
    if (band === 'pb') pbBonus ??= r.atkBonus;
    assert.equal(r.atkBonus, pbBonus + PENALTY[band], 'BAB + Int + the one range penalty');
  }
  // beyond long range (> 10 squares): refused, with the reason, before any roll
  for (const sq of [11, 12, 40]) {
    const r = await shoot(w, targetAt(sq));
    assert.equal(r, null); assert.match(log.join('|'), new RegExp(`beyond the weapon's long range \\(${sq} squares; long range ends at 10\\)`));
  }
});

test('SCALE: the same cannon uses the CHARACTER table against a character target (vehicles with characters on foot) and the starship table against a vehicle', async () => {
  world();
  const w = await install('laser-cannon-light');
  // 5 squares: a vehicle target is a starship-scale encounter (medium, -5); a character target is character scale (point blank: 0-150)
  assert.equal(rangeEntry(await shoot(w, targetAt(5, { type: 'vehicle' })))[0].value, -5);
  assert.equal(rangeEntry(await shoot(w, targetAt(5, { type: 'character' })))[0].value, 0);
  // character-scale boundaries of the laser cannon: 150 pb, 151 short, 300 short, 301 medium, 750 medium, 751 long, 1500 long, 1501 out
  for (const [sq, band] of [[150, 'pb'], [151, 'short'], [300, 'short'], [301, 'medium'], [750, 'medium'], [751, 'long'], [1500, 'long']]) {
    const r = await shoot(w, targetAt(sq, { type: 'character' }));
    assert.equal(rangeEntry(r)[0].value, PENALTY[band], `${sq} squares at character scale`);
    assert.match(rangeEntry(r)[0].reason, /character scale/);
  }
  assert.equal(await shoot(w, targetAt(1501, { type: 'character' })), null); assert.match(log.join('|'), /beyond the weapon's long range \(1501 squares; long range ends at 1500\)/);
  // an active combat that includes a character puts a vehicle target in character scale too
  globalThis.game.combat = { id: 'c1', round: 1, combatants: { contents: [{ actor: vehicle }, { actor: { id: 'pc', type: 'character' } }, { actor: { id: 'tgt', type: 'vehicle' } }] } };
  try { assert.equal(rangeEntry(await shoot(w, targetAt(5, { type: 'vehicle' })))[0].value, 0, 'character scale: 5 squares is point blank'); } finally { globalThis.game.combat = null; }
});

test('FAMILIES: each weapon type uses its own Table 10-2 row (blaster, ion, turbolaser, torpedo)', async () => {
  const cases = [['blaster-cannon-light', 'fighter', [[1, 'pb'], [2, 'short'], [3, 'medium'], [4, 'medium'], [5, 'long'], [8, 'long']], 9],
    ['ion-cannon-light', 'fighter', [[2, 'pb'], [3, 'short'], [4, 'short'], [5, 'medium'], [10, 'medium'], [11, 'long'], [20, 'long']], 21],
    ['turbolaser-light', 'frigate', [[4, 'pb'], [5, 'short'], [8, 'short'], [9, 'medium'], [20, 'medium'], [21, 'long'], [40, 'long']], 41]];
  for (const [id, hull, table, outAt] of cases) {
    world({ hull });
    const w = await install(id);
    for (const [sq, band] of table) { const r = await shoot(w, targetAt(sq)); assert.ok(r, `${id} ${sq}: ${log.join('|')}`); assert.equal(rangeEntry(r)[0].value, PENALTY[band], `${id} at ${sq}`); }
    assert.equal(await shoot(w, targetAt(outAt)), null, `${id} at ${outAt}`);
  }
});

test('LAUNCHER: a torpedo uses the missile row; out of range is refused BEFORE any ammunition is spent', async () => {
  world();
  const w = await install('proton-torpedo-launcher');
  const entryId = [...items.values()].find(i => i.flags?.swse?.vehicleInstalledWeapon).flags.swse.vehicleInstalledWeapon.installId;
  assert.equal((await S.purchaseAmmunition({ ownerActor: owner, vehicle, installId: entryId, units: 9 })).success, true);
  const reload = () => VehicleAmmunitionService.gmReload(vehicle, w, { user: globalThis.game.user });
  assert.equal((await reload()).ok, true);
  const ledger = () => JSON.stringify(readAftermarketLedgers(vehicle)[entryId]);
  const before = ledger();
  assert.equal(await shoot(w, targetAt(31)), null); assert.match(log.join('|'), /beyond the weapon's long range \(31 squares; long range ends at 30\)/);
  assert.equal(ledger(), before, 'a refused attack spends no ammunition');
  const credits = owner.system.credits;
  for (const [sq, band] of [[3, 'pb'], [4, 'short'], [6, 'short'], [7, 'medium'], [15, 'medium'], [16, 'long'], [30, 'long']]) {
    await reload();                                      // (a GM refills the three-torpedo magazine from the reserve between shots)
    const r = await shoot(w, targetAt(sq)); assert.ok(r, `${sq}: ${log.join('|')}`);
    assert.equal(rangeEntry(r)[0].value, PENALTY[band], `torpedo at ${sq}`);
  }
  assert.equal(JSON.parse(ledger()).expended, 7); assert.equal(owner.system.credits, credits);
});

test('NO OVERRIDE: a caller-supplied band, distance or explicit penalty cannot move a vehicle weapon to point blank; the breakdown shows the calculation', async () => {
  world();
  const w = await install('laser-cannon-light');
  const forged = [{ rangeBand: 'pb' }, { rangeBand: 'pointBlank', range: 'pb' }, { distanceSquares: 1 }, { rangePenalty: 0 }, { modifiers: { rangePenalty: 0 } },
    { rangeBand: 'pb', distanceSquares: 0, rangePenalty: 0, modifiers: { rangePenalty: 0 } }];
  for (const extra of forged) {
    const r = await shoot(w, targetAt(4), extra);               // 4 squares at starship scale: medium (-5)
    assert.equal(rangeEntry(r).length, 1); assert.equal(rangeEntry(r)[0].value, -5, JSON.stringify(extra));
    assert.match(rangeEntry(r)[0].reason, /Table 10-2 \(laser-cannons\)/);
  }
  // and the reverse: a caller claiming long range cannot make a point-blank shot worse
  assert.equal(rangeEntry(await shoot(w, targetAt(1), { rangeBand: 'long', rangePenalty: -10 }))[0].value, 0);
});

test('UNRESOLVED: no token, no grid, an unsupported grid or an unidentified weapon type is refused, never treated as point blank', async () => {
  world();
  const w = await install('laser-cannon-light');
  const res = (v, t) => resolveVehicleAttackRange({ vehicle: v, weapon: w, target: t });
  assert.equal((await res(vehicle, targetAt(3))).ok, true);
  assert.equal((await res(vehicle, { ...targetAt(3), getActiveTokens: () => [] })).reason, R.RANGE_REASONS.DISTANCE_UNRESOLVED, 'target without a token');
  assert.equal((await res(vehicle, { id: 'tgt', type: 'vehicle', items: [], system: {} })).reason, R.RANGE_REASONS.DISTANCE_UNRESOLVED, 'target that cannot report tokens');
  const noTokenVehicle = { ...vehicle, getActiveTokens: () => [] }; Object.defineProperty(noTokenVehicle, 'items', { value: items });
  assert.equal((await res(noTokenVehicle, targetAt(3))).ok, false);
  globalThis.canvas = { grid: {}, scene: { id: 's1', grid: {} } };
  assert.equal((await res(vehicle, targetAt(3))).reason, R.RANGE_REASONS.GRID_UNRESOLVED, 'no grid size');
  globalThis.canvas = { grid: { size: 100, type: 2 }, scene: { id: 's1', grid: { size: 100, type: 2 } } };
  assert.equal((await res(vehicle, targetAt(3))).reason, R.RANGE_REASONS.GRID_UNSUPPORTED, 'hex grid');
  setGrid(100);
  assert.equal((await res(vehicle, undefined)).ok, false, 'no target at all');
  // the range table could not be read: refused
  const saved = RangeEngine._vehicleProfiles, savedFetch = globalThis.fetch;
  RangeEngine._vehicleProfiles = null; globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => null });
  try { assert.equal((await res(vehicle, targetAt(3))).reason, R.RANGE_REASONS.TABLE_MISSING); } finally { globalThis.fetch = savedFetch; RangeEngine._vehicleProfiles = saved; }
  assert.equal((await res(vehicle, targetAt(3))).ok, true);
  // and through rollAttack: an unresolved range spends and rolls nothing (the arc check also needs tokens, so this proves the whole gate fails closed)
  globalThis.canvas = { grid: {}, scene: { id: 's1', grid: {} } };
  assert.equal(await shoot(w, targetAt(3)), null);
  setGrid(100);
});

test('SCENE: a different grid size or distance unit changes nothing: ranges are counted in squares', async () => {
  world();
  const w = await install('laser-cannon-light');
  for (const [size, units, distance] of [[50, 'ft', 5], [100, 'm', 1.5], [140, 'km', 0.5], [200, 'ft', 5]]) {
    globalThis.canvas = { grid: { size, type: 1 }, scene: { id: 's1', grid: { size, distance, units, type: 1 } } };
    const tgt = n => ({ ...targetAt(0), getActiveTokens: () => [tokenAt(n * size, 0)] });
    attackerToken = tokenAt(0, 0);
    assert.equal(rangeEntry(await shoot(w, tgt(2)))[0].value, -2, `${size}px ${distance}${units}: 2 squares`);
    assert.equal(rangeEntry(await shoot(w, tgt(6)))[0].value, -10);
    assert.equal(await shoot(w, tgt(11)), null);
  }
  setGrid(100);
});

test('TOKEN SIZE: a large target is measured to its nearest square, not its center', async () => {
  world();
  const w = await install('laser-cannon-light');
  // a 4x4 target against a 1x1 attacker: half-widths sum to 2.5, so a centre 2.5 squares away is ADJACENT (1 square), 4.5 away is 3 squares, ...
  const big = n => ({ ...targetAt(0), getActiveTokens: () => [tokenAt(n * 100, 0, 4, 4)] });
  const value = async n => rangeEntry(await shoot(w, big(n)))[0].value;
  assert.equal(await value(1.5), 0, 'overlapping footprints: the same square');
  assert.equal(await value(2.5), 0, 'adjacent: 1 square (point blank)');
  assert.equal(await value(3.5), -2, 'one empty square between: 2 squares (short)');
  assert.equal(await value(4.5), -5, '3 squares (medium)');
  assert.equal(await value(6.5), -5, '5 squares (still medium)');
  assert.equal(await value(7.5), -10, '6 squares (long)');
  assert.equal(await value(11.5), -10, '10 squares (the last long square)');
  assert.equal(await shoot(w, big(12.5)), null, '11 squares: out of range');
  // the attacker's own footprint counts too: a 4x4 attacker shrinks every distance
  attackerToken = tokenAt(0, 0, 4, 4);
  assert.equal(await value(4), 0, 'two 4x4 ships, centres 4 apart: edge to edge, adjacent (1 square)');
  assert.equal(await value(5), -2, 'centres 5 apart: one empty square between (2 squares, short)');
  attackerToken = tokenAt(0, 0);
});
