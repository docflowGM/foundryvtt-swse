import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { ENCOUNTER_SCALE, resolveEncounterScale, resolveAreaAtScale } from '../scripts/domain/vehicles/vehicle-encounter-scale.js';
import { assessStockWeaponGroups, extractOrdinaryArea } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { armStockWeaponsOnCreate } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const keyOf = d => d.flags.swse.canonicalPublication.sourceEntryKey;
const recordOf = key => docs.find(d => keyOf(d) === key).flags.swse.universalVehicleSource.source;
const UT = docs.map(keyOf).find(k => /unstable-terrain-artillery/.test(k));

class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });
let seq = 0;
async function armed(key) {
  const d = structuredClone(docs.find(x => keyOf(x) === key));
  const v = Object.assign(d, { id: 'veh1', type: 'vehicle', isOwner: true, items: new Items(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const x of data) { const id = 'i' + (++seq); v.items.set(id, { id, ...structuredClone(x), actor: v }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) v.items.delete(id); };
  globalThis.game.user.id = 'u1';
  await armStockWeaponsOnCreate(v, {}, 'u1');
  return v;
}
const stockItems = v => [...v.items.values()].filter(i => i.flags?.swse?.vehicleStockWeapon);
const tgt = (type, id = 'tgt') => ({ id, type, items: [], system: { size: 'medium', defenses: { reflex: { total: 15 } } }, getActiveTokens: () => [token(300, 0)] });
const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
globalThis.game.settings = { get: () => undefined };
const fire = async (v, w, t) => { log.length = 0; const r = await rollAttack(v, w, { abstractCrewQuality: 'normal', target: t }); return { r, log: [...log] }; };
const withCombat = (actors, fn) => { const prev = globalThis.game.combat; globalThis.game.combat = { id: 'c1', combatants: { contents: actors.map(a => ({ actor: a })) } }; return Promise.resolve(fn()).finally(() => { globalThis.game.combat = prev; }); };

// ---------------------------------------------------------------------------------------------------------------------
test('ENCOUNTER SCALE (Core): vehicles only = starship scale; any character on foot = character scale; unknown = undetermined', () => {
  const veh = id => ({ id, type: 'vehicle' }), chr = id => ({ id, type: 'character' });
  assert.deepEqual(resolveEncounterScale({ attacker: veh('a'), target: veh('t') }).scale, ENCOUNTER_SCALE.STARSHIP);
  assert.deepEqual(resolveEncounterScale({ attacker: veh('a'), target: chr('t') }).scale, ENCOUNTER_SCALE.CHARACTER, 'a character target puts the encounter in character scale');
  assert.equal(resolveEncounterScale({ attacker: veh('a') }).scale, ENCOUNTER_SCALE.UNDETERMINED, 'no target and no combat: not determinable');
  assert.equal(resolveEncounterScale({ attacker: null, target: veh('t') }).scale, ENCOUNTER_SCALE.UNDETERMINED);
  // an active combat decides: one character among the combatants makes the whole encounter character scale, even for a vehicle target
  const combat = list => ({ combatants: { contents: list.map(actor => ({ actor })) } });
  assert.equal(resolveEncounterScale({ attacker: veh('a'), target: veh('t'), combat: combat([veh('a'), veh('t'), chr('c')]) }).scale, ENCOUNTER_SCALE.CHARACTER);
  assert.equal(resolveEncounterScale({ attacker: veh('a'), target: veh('t'), combat: combat([veh('a'), veh('t'), veh('x')]) }).scale, ENCOUNTER_SCALE.STARSHIP);
  // a combat the attacker is not part of does not decide the scale
  assert.equal(resolveEncounterScale({ attacker: veh('a'), target: veh('t'), combat: combat([chr('c')]) }).scale, ENCOUNTER_SCALE.STARSHIP);
});

test('AREA AT SCALE: ordinary splash/burst is a single-target attack at starship scale; refused at character scale; explicit starship-scale area is its own mechanic', () => {
  const splash = { kind: 'splash', squares: 4 };
  assert.deepEqual(resolveAreaAtScale(null, ENCOUNTER_SCALE.CHARACTER), { mode: 'single-target' }, 'a single-target weapon is unaffected by scale');
  assert.deepEqual(resolveAreaAtScale(splash, ENCOUNTER_SCALE.STARSHIP), { mode: 'single-target' });
  assert.equal(resolveAreaAtScale(splash, ENCOUNTER_SCALE.CHARACTER).reason, 'CHARACTER_SCALE_AREA_NOT_IMPLEMENTED');
  assert.equal(resolveAreaAtScale(splash, ENCOUNTER_SCALE.UNDETERMINED).reason, 'ENCOUNTER_SCALE_UNDETERMINED');
  assert.equal(resolveAreaAtScale({ kind: 'starship-area' }, ENCOUNTER_SCALE.STARSHIP).reason, 'STARSHIP_SCALE_AREA_NOT_IMPLEMENTED', 'a weapon specifically listed with a starship-scale area keeps its own area attack');
});

test('GATE: "N-square splash/burst" is an ordinary area; unsized radii, starship-scale areas and hit/miss riders stay refused', () => {
  assert.deepEqual(extractOrdinaryArea({}, ' 2-square splash'), { kind: 'splash', squares: 2, source: 'damage-line', conflict: false });
  assert.deepEqual(extractOrdinaryArea({ splash: '4-square' }, ''), { kind: 'splash', squares: 4, source: 'evidence', conflict: false });
  assert.equal(extractOrdinaryArea({ splash: '4-square' }, '2-square burst').conflict, true, 'two different sizes conflict');
  assert.equal(extractOrdinaryArea({}, ' ion'), null);
  const ut = assessStockWeaponGroups(recordOf(UT)).groups.find(g => g.label === 'heavy laser cannon');
  assert.deepEqual([ut.executable, ut.area.kind, ut.area.squares], [true, 'splash', 2]);
  // the Subjugator's ion pulse cannons carry an explicit starship-scale radius with hit/miss riders: still refused
  const pulse = assessStockWeaponGroups(recordOf('cw-subjugator-class-heavy-cruiser')).groups.find(g => g.label === 'ion pulse cannons');
  assert.equal(pulse.executable, false);
  assert.ok(pulse.reasons.includes('STOCK_DAMAGE_AREA_OR_SPLASH'));
  // finite-ammunition groups keep their own refusal whatever their splash
  const xw = assessStockWeaponGroups(recordOf('core-incom-t-65b-x-wing-starfighter')).groups.find(g => g.label === 'proton torpedoes');
  assert.deepEqual([xw.executable, xw.area.squares, xw.reasons.includes('STOCK_AMMUNITION_LIMITED_UNTRACKED')], [false, 4, true]);
});

test('RUNTIME: an ordinary-splash cannon fires at a vehicle in a vehicles-only encounter (single target) and is refused when a character is involved', async () => {
  const v = await armed(UT); const w = stockItems(v).find(i => i.name === 'heavy laser cannon');
  assert.ok(w, 'armed');
  const ok = await fire(v, w, tgt('vehicle'));
  assert.ok(ok.r, ok.log.join('|'));
  assert.equal(buildDamageFormula(resolveDamageComposition(v, w, { weapon: w })), '(6d10) * 2', 'ordinary damage to the one target; nothing is added or split for the splash');
  const chr = await fire(v, w, tgt('character'));
  assert.equal(chr.r, null);
  assert.match(chr.log.join('|'), /STOCK_AREA_CHARACTER_SCALE_AREA_NOT_IMPLEMENTED/);
  // an active combat that includes a character on foot makes the encounter character scale even for a vehicle target
  const mixed = await withCombat([v, tgt('vehicle'), tgt('character', 'pc')], () => fire(v, w, tgt('vehicle')));
  assert.equal(mixed.r, null);
  assert.match(mixed.log.join('|'), /STOCK_AREA_CHARACTER_SCALE_AREA_NOT_IMPLEMENTED/);
  // ... and a combat of vehicles only is starship scale
  const only = await withCombat([v, tgt('vehicle')], () => fire(v, w, tgt('vehicle')));
  assert.ok(only.r, only.log.join('|'));
});

test('COVERAGE: five ordinary-splash groups are executable at starship scale only; the only ammunition-limited ones are the two complete source-established launcher families', () => {
  const all = docs.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.map(g => ({ key: keyOf(d), g })));
  const area = all.filter(x => x.g.area);
  assert.equal(area.length, 107);
  assert.equal(area.filter(x => x.g.executable).length, 5);
  assert.ok(area.filter(x => x.g.executable).every(x => !x.g.reasons.includes('STOCK_AMMUNITION_LIMITED_UNTRACKED')));
  assert.deepEqual(area.filter(x => x.g.executable && x.g.ammunition).map(x => x.key).sort(), ['sotg-mandalmotors-starviper-assault-fighter', 'sotg-sorosuub-cutlass-9-patrol-fighter']);
  assert.equal(area.filter(x => x.g.reasons.includes('STOCK_AMMUNITION_LIMITED_UNTRACKED')).length > 50, true);
});
