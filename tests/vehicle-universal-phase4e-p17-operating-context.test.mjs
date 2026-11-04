import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import * as O from '../scripts/domain/vehicles/vehicle-operating-context.js';
import { getPublishedDerivedBase, getEffectiveVehicleDerived, claimsPublishedSource } from '../scripts/domain/vehicles/vehicle-published-derived.js';
import { runOperatingAction } from '../scripts/sheets/v2/vehicle-sheet/vehicle-shipyard-actions.js';

installSystemsResolver(); installFoundryStubs();
const { guardVehicleEnvironment } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { SWSECombatDocument } = await import('../scripts/combat/swse-combat.js');
const { buildVehicleSheetContext } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');
const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const catalog = [...load('defense-systems'), ...load('movement-systems')];
const overlay = load('certification').rows;
const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter', ARC = 'core-arc-170-starfighter';
const rules = { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 40 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) };
const actorOf = key => { const d = structuredClone(docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === key)); return Object.assign(d, { id: 'v1', isOwner: true, items: [], toObject() { const { toObject, ...r } = this; return structuredClone(r); } }); };
const rec = a => a.flags.swse.universalVehicleSource.source;
function install(a, id, installId) {
  const p = L.planVehicleInstallation({ record: rec(a), flags: a.flags, catalogEntry: { ...catalog.find(c => c.id === id), certification: overlay[id] }, installId, availableCredits: 1e9, rules, nonstandard: false });
  assert.equal(p.ok, true, (p.reasons ?? []).join());
  a.flags.swse.vehicleInstallations = p.nextLedger;
}
const remove = (a, installId) => { a.flags.swse.vehicleInstallations = L.planVehicleUninstall({ record: rec(a), flags: a.flags, installId }).nextLedger; };
const builder = (() => {
  const code = readFileSync('scripts/actors/v2/vehicle-derived-builder.js', 'utf8').replace(/^import[\s\S]*?;\s*$/gm, '').replace(/^export\s+\{[^}]*\};?/gm, '').replace(/\bexport\s+/g, '');
  const ctx = { getPublishedDerivedBase, getEffectiveVehicleDerived, claimsPublishedSource };
  runInNewContext(code + '\nglobalThis.build = buildVehicleDerived;', ctx);
  return ctx.build;
})();
const derive = a => { builder(a, a.system); return a.system.derived; };
const setEnv = (a, state) => { a.flags.swse.vehicleEnvironment = O.planEnvironmentChange(a, { state, user: { id: 'gm', isGM: true }, at: 1 }).update['flags.swse.vehicleEnvironment']; };

test('environment: unknown by default; only an explicit GM-set flag counts; audited; non-GM writes refused', () => {
  const a = actorOf(ARC);
  assert.equal(O.readVehicleEnvironment(a), 'unknown');
  a.flags.swse.vehicleEnvironment = { state: 'Atmosphere?' };
  assert.equal(O.readVehicleEnvironment(a), 'unknown', 'only exact states are accepted');
  assert.deepEqual(O.planEnvironmentChange(a, { state: 'atmosphere', user: { isGM: false } }).reasons, ['GM_REQUIRED']);
  assert.deepEqual(O.planEnvironmentChange(a, { state: 'water', user: { isGM: true } }).reasons, ['ENVIRONMENT_STATE_INVALID']);
  setEnv(a, 'atmosphere'); setEnv(a, 'space');
  assert.equal(O.readVehicleEnvironment(a), 'space');
  assert.deepEqual(a.flags.swse.vehicleEnvironment.history.map(h => h.state), ['atmosphere', 'space']);
  globalThis.game = { user: { id: 'p', isGM: false }, users: { get: id => ({ gm: { isGM: true }, p: { isGM: false } })[id] } };
  assert.equal(guardVehicleEnvironment(a, { 'flags.swse.vehicleEnvironment': { state: 'atmosphere' } }, {}, 'p'), false);
  assert.equal(guardVehicleEnvironment(a, { flags: { swse: { vehicleEnvironment: { state: 'atmosphere' } } } }, {}, 'p'), false);
  assert.equal(guardVehicleEnvironment(a, { 'flags.swse.vehicleEnvironment': { state: 'atmosphere' } }, {}, 'gm'), undefined);
  assert.equal(guardVehicleEnvironment(a, { 'system.hp.value': 3 }, {}, 'p'), undefined);
});

test('atmospheric thrusters apply only in an explicit atmosphere; removal restores the published speed', () => {
  const a = actorOf(ARC); const fly = rec(a).movement.speedModes.find(m => m.scale === 'character');
  install(a, 'atmospheric-thrusters', 't1');
  assert.equal(derive(a).speed.total, fly.squaresPerMove, 'unknown environment: not applied');
  setEnv(a, 'space'); assert.equal(derive(a).speed.total, fly.squaresPerMove);
  setEnv(a, 'atmosphere');
  const d = derive(a);
  assert.equal(d.speed.total, Math.floor(fly.squaresPerMove * 1.1));
  assert.equal(d.speed.base, fly.squaresPerMove, 'published base untouched');
  assert.equal(d.speed.environment, 'atmosphere');
  remove(a, 't1');
  assert.equal(derive(a).speed.total, fly.squaresPerMove);
});

test('Pilot check: crew pilot gets vehicle size + effective Dex modifier (no crew quality); generic crew uses the printed Pilot', () => {
  const a = actorOf(XW); // Gargantuan (-5), Dex 22 (+6), printed Pilot +7
  assert.equal(O.vehicleSizeModifier('Gargantuan'), -5);
  assert.equal(O.vehicleSizeModifier('Colossal (frigate)'), -10);
  assert.equal(O.vehicleSizeModifier('mystery'), null);
  let c = O.vehiclePilotCheck(a, { pilotActor: { id: 'p1' } });
  assert.deepEqual([c.ok, c.mode, c.modifier], [true, 'CREW_ACTOR', 1]);
  assert.deepEqual(c.breakdown.map(b => b.value), [-5, 6]);
  c = O.vehiclePilotCheck(a);
  assert.deepEqual([c.mode, c.modifier], ['GENERIC_CREW', 7]);
  install(a, 'maneuvering-jets-2', 'j1'); // Dex 24: +1 modifier
  assert.equal(O.vehiclePilotCheck(a, { pilotActor: { id: 'p1' } }).modifier, 2);
  assert.equal(O.vehiclePilotCheck(a).modifier, 8);
  remove(a, 'j1');
  assert.equal(O.vehiclePilotCheck(a, { pilotActor: { id: 'p1' } }).modifier, 1);
  // custom vehicle: attributes; unknown values are refused, never zero
  const custom = { type: 'vehicle', system: { size: 'Huge', attributes: { dex: { base: 20, racial: 0, temp: 0 } } }, flags: {} };
  assert.equal(O.vehiclePilotCheck(custom, { pilotActor: {} }).modifier, 3);
  assert.deepEqual(O.vehiclePilotCheck({ type: 'vehicle', system: { size: 'Huge' }, flags: {} }, { pilotActor: {} }).reasons, ['VEHICLE_DEXTERITY_UNKNOWN']);
  assert.deepEqual(O.vehiclePilotCheck({ type: 'vehicle', system: {}, flags: {} }).reasons, ['PRINTED_PILOT_MODIFIER_UNKNOWN']);
});

test('one size-modifier authority: combat Initiative uses the same Table 10-1 values', () => {
  const combat = new SWSECombatDocument();
  for (const size of ['Colossal (cruiser)', 'Colossal', 'Gargantuan', 'Huge', 'Large', 'Medium']) assert.equal(combat._getVehicleSizeModifier({ system: { size } }), O.vehicleSizeModifier(size));
  assert.equal(combat._getInitiativeFormula({ actor: actorOf(XW) }), '1d20 + 7', 'printed Initiative unchanged');
});

test('roll wiring reuses the canonical skill roll; actions route through the service', async () => {
  const svc = readFileSync('scripts/engine/vehicles/vehicle-operating-context-service.js', 'utf8');
  assert.match(svc, /rollSkill\(pilotActor, 'pilot', \{ \.\.\.options, customModifier:/);
  assert.doesNotMatch(svc, /new Roll\(/, 'no second dice engine');
  assert.equal(existsSync('scripts/actors/vehicle/swse-vehicle-core.js'), false, 'the legacy vehicle core (broken pilot-check call, duplicate crew/weapon logic) is retired; the service is the only owner');
  const calls = [];
  const service = { setEnvironment: async (v, s) => (calls.push(['env', s]), { success: true }), rollPilotCheck: async (v, o) => (calls.push(['pilot', o.pilotActor?.id ?? null]), { success: true }) };
  const deps = { service, notify: { warn() {} } };
  await runOperatingAction({ environment: 'atmosphere', vehicle: {} }, deps);
  await runOperatingAction({ action: 'pilot-check', vehicle: {} }, deps);
  assert.deepEqual(calls, [['env', 'atmosphere'], ['pilot', null]], 'the sheet no longer resolves the pilot; the service does and fails explicitly');
});

test('effective statistics agree across derived data, sheet, projection, Initiative and the Pilot check', () => {
  const a = actorOf(XW); const printed = rec(a);
  install(a, 'maneuvering-jets-2', 'j1'); install(a, 'armor-1', 'a1');
  assert.equal(derive(a).defenses.reflex.total, printed.defenses.reflex + 2);
  assert.equal(buildVehicleSheetContext(a, { editable: true }, {}).vehiclePanels.defensesPanel.defenses.find(r => r.key === 'ref').total, String(printed.defenses.reflex + 2));
  assert.equal(buildVehicleSchemaViewModel(a, {}).effective.find(r => r.label === 'Reflex Defense').effectiveLabel, String(printed.defenses.reflex + 2));
  assert.equal(new SWSECombatDocument()._getInitiativeFormula({ actor: a }), `1d20 + ${printed.abilities.initiativePrinted + 1}`);
  assert.equal(buildVehicleSchemaViewModel(a, {}).operating.crewPilotVehicleModifier, 2);
  remove(a, 'j1'); remove(a, 'a1');
  assert.equal(derive(a).defenses.reflex.total, printed.defenses.reflex);
  assert.equal(buildVehicleSchemaViewModel(a, {}).operating.crewPilotVehicleModifier, 1);
});

let Handlebars = null;
try { Handlebars = createRequire(new URL('../tools/release/package.json', import.meta.url))('handlebars'); } catch { /* optional locally */ }
if (!Handlebars && process.env.SWSE_REQUIRE_HANDLEBARS === '1') throw new Error('handlebars required');
(Handlebars ? test : test.skip)('panel: environment and Pilot labels; GM-only environment buttons', () => {
  const H = Handlebars.create();
  H.registerHelper('localize', k => String(k)); H.registerHelper('eq', (x, y) => x === y);
  const t = H.compile(readFileSync('templates/actors/vehicle/v2/partials/vehicle-schema-panel.hbs', 'utf8'));
  const a = actorOf(XW);
  const player = t({ view: buildVehicleSchemaViewModel(a, { isGM: false }) });
  assert.match(player, /Unknown \(atmosphere-only effects inactive\)/);
  assert.match(player, /Pilot \(generic crew\)<\/span><strong>\+7/);
  assert.match(player, /data-vehicle-action="pilot-check"/);
  assert.doesNotMatch(player, /data-vehicle-environment/);
  assert.match(t({ view: buildVehicleSchemaViewModel(a, { isGM: true }) }), /data-vehicle-environment="atmosphere"/);
});


// ---------------- independent-review corrections ----------------
const { registerVehiclePreCreateHooks, updateTouchesVehicleEnvironment } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { VehicleOperatingContextService: Svc } = await import('../scripts/engine/vehicles/vehicle-operating-context-service.js');

test('review 1: the GM-only environment guard holds for every accepted update shape, at the real hook boundary', () => {
  const handlers = [];
  globalThis.Hooks = { on: (name, fn) => { if (name === 'preUpdateActor') handlers.push(fn); }, once() {}, off() {}, call() {}, callAll() {} };
  registerVehiclePreCreateHooks();
  assert.ok(handlers.length >= 3);
  globalThis.game = { user: { id: 'p', isGM: false }, users: { get: id => ({ gm: { id: 'gm', isGM: true }, p: { id: 'p', isGM: false } })[id] } };
  const a = actorOf(ARC);
  const verdict = (changes, userId) => (handlers.some(h => h(a, structuredClone(changes), {}, userId) === false) ? 'DENIED' : 'ALLOWED');
  const touching = [
    { 'flags.swse.vehicleEnvironment': { state: 'atmosphere' } },
    { 'flags.swse.vehicleEnvironment.state': 'atmosphere' },
    { 'flags.swse.vehicleEnvironment.history': [] },
    { 'flags.swse.-=vehicleEnvironment': null },
    { 'flags.swse.==vehicleEnvironment': { state: 'space' } },
    { flags: { swse: { vehicleEnvironment: { state: 'atmosphere' } } } },
    { flags: { swse: { '-=vehicleEnvironment': null } } },
    { flags: { swse: { '==vehicleEnvironment': {} } } },
    { 'flags.swse': { vehicleEnvironment: { state: 'atmosphere' } } },   // parent-object update
    { flags: { swse: { vehicleEnvironment: { history: [] } } } },        // audit history
    { 'flags.-=swse': null }, { flags: { '-=swse': null } }, { flags: { '==swse': {} } }, { '-=flags': null },
    { 'flags.swse': null }, { flags: null }
  ];
  const plainGmOk = [touching[0], touching[1], touching[5], touching[8]];
  for (const c of plainGmOk) assert.equal(verdict(c, 'gm'), 'ALLOWED', 'GM through the full hook chain: ' + JSON.stringify(c));
  for (const c of touching) {
    assert.equal(updateTouchesVehicleEnvironment(c), true, JSON.stringify(c));
    assert.equal(verdict(c, 'p'), 'DENIED', 'player: ' + JSON.stringify(c));
    // a GM passes the ENVIRONMENT guard (broad parent deletions are still stopped by the provenance/ledger guards)
    assert.equal(guardVehicleEnvironment(a, structuredClone(c), {}, 'gm'), undefined, 'GM: ' + JSON.stringify(c));
    assert.equal(guardVehicleEnvironment(a, structuredClone(c), {}, 'p'), false);
    assert.equal(verdict(c, 'nobody'), 'DENIED', 'unknown user fails closed: ' + JSON.stringify(c));
  }
  // mixed with another guarded flag: the player is denied by the environment guard; a GM is still stopped by the ledger guard
  const mixed = { flags: { swse: { vehicleInstallations: [], vehicleEnvironment: { state: 'space' } } } };
  assert.equal(updateTouchesVehicleEnvironment(mixed), true);
  assert.equal(verdict(mixed, 'p'), 'DENIED');
  assert.equal(handlers.map(h => h(a, structuredClone(mixed), {}, 'gm')).includes(false), true, 'ledger guard still applies to a GM');
  const unrelated = [
    { 'system.hp.value': 5 }, { name: 'x' }, { 'flags.swse.vehicleInstallations': undefined }, { flags: { swse: { other: 1 } } }, { 'flags.swse': { other: 1 } },
    { 'flags.other.vehicleEnvironment': 1 }, { flags: { foundryvtt: { vehicleEnvironment: 1 } } }, { 'flags.swse.vehicleEnvironmentX': 1 }
  ];
  for (const c of unrelated) assert.equal(updateTouchesVehicleEnvironment(c), false, JSON.stringify(c));
  assert.equal(handlers.some(h => h({ type: 'character' }, { 'flags.swse.vehicleEnvironment': {} }, {}, 'p') === false), false, 'non-vehicle Actors are not governed');
});

test('review 2: an assigned pilot that cannot be resolved fails explicitly and never falls back to the generic crew', async () => {
  const vehicle = actorOf(XW);
  const me = { id: 'p', isGM: false };
  const pc = { id: 'pc1', documentName: 'Actor', type: 'character', system: {}, items: [], isOwner: true };
  const warns = [];
  globalThis.ui = { notifications: { warn: m => warns.push(m), error() {}, info() {} } };
  // the decision itself
  assert.deepEqual(O.assignedPilotEntry(vehicle), { assigned: false });
  vehicle.system.crewPositions = { pilot: 'Actor.missing' };
  assert.deepEqual(O.assignedPilotEntry(vehicle), { assigned: true, uuid: 'Actor.missing' });
  assert.deepEqual(O.decidePilotRoller({ vehicle, resolved: null, user: me }).reasons, ['ASSIGNED_PILOT_UNAVAILABLE']);
  assert.deepEqual(O.decidePilotRoller({ vehicle, resolved: { documentName: 'Item', type: 'weapon' }, user: me }).reasons, ['ASSIGNED_PILOT_UNAVAILABLE'], 'not an Actor');
  assert.deepEqual(O.decidePilotRoller({ vehicle, resolved: { ...vehicle, documentName: 'Actor', type: 'vehicle' }, user: me }).reasons, ['ASSIGNED_PILOT_UNAVAILABLE'], 'a vehicle is not a pilot');
  vehicle.system.crewPositions = { pilot: { name: 'Legacy name only' } };
  assert.deepEqual(O.decidePilotRoller({ vehicle, resolved: null, user: me }).reasons, ['ASSIGNED_PILOT_UNAVAILABLE'], 'legacy entry without a UUID');
  vehicle.system.crewPositions = { pilot: 'Actor.pc1' };
  assert.deepEqual(O.decidePilotRoller({ vehicle, resolved: { ...pc, isOwner: false }, user: me }).reasons, ['PILOT_ROLL_NOT_AUTHORIZED']);
  assert.equal(O.decidePilotRoller({ vehicle, resolved: { ...pc, isOwner: false }, user: { isGM: true } }).ok, true, 'GM may roll');
  assert.deepEqual(O.decidePilotRoller({ vehicle, resolved: pc, user: me }).mode, 'CREW_ACTOR');
  // generic crew only when nobody is assigned, and only for the owner / GM
  const nobody = actorOf(XW);
  assert.deepEqual(O.decidePilotRoller({ vehicle: nobody, user: me }).mode, 'GENERIC_CREW');
  assert.deepEqual(O.decidePilotRoller({ vehicle: { ...nobody, isOwner: false }, user: me }).reasons, ['GENERIC_CREW_ROLL_NOT_AUTHORIZED']);
  // through the service: no roll is made for an unresolved assignment
  vehicle.system.crewPositions = { pilot: 'Actor.missing' };
  const r = await Svc.rollPilotCheck(vehicle, { resolveUuid: async () => null, user: me });
  assert.deepEqual([r.success, r.reasons], [false, ['ASSIGNED_PILOT_UNAVAILABLE']]);
  assert.equal(r.check, undefined, 'no generic-crew modifier was even computed');
  const r2 = await Svc.rollPilotCheck(vehicle, { resolveUuid: async () => { throw new Error('boom'); }, user: me });
  assert.deepEqual(r2.reasons, ['ASSIGNED_PILOT_UNAVAILABLE']);
  assert.ok(warns.some(w => /ASSIGNED_PILOT_UNAVAILABLE/.test(w)));
  const src = readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-shipyard-actions.js', 'utf8');
  assert.doesNotMatch(src, /resolvePilot/, 'the null-returning sheet resolver is gone');
});

test('review 3: the displayed atmospheric speed follows the explicit environment and agrees with derived data', () => {
  const a = actorOf(ARC); const fly = rec(a).movement.speedModes.find(m => m.scale === 'character');
  const boosted = Math.floor(fly.squaresPerMove * 1.1);
  install(a, 'atmospheric-thrusters', 't1');
  const row = () => buildVehicleSchemaViewModel(a, {}).effective.find(r => r.label.startsWith('Atmospheric'));
  for (const env of [null, 'unknown', 'space']) {
    if (env) setEnv(a, env);
    const r = row();
    assert.equal(r.effective, fly.squaresPerMove, `${env}: unmodified`);
    assert.equal(r.conditionalActive, false);
    assert.match(r.effectiveLabel, new RegExp(`^${fly.squaresPerMove} sq`));
    assert.match(r.availableLabel, new RegExp(`^${boosted} sq`), 'availability shown separately');
    assert.match(r.modification, /inactive/);
    assert.equal(derive(a).speed.total, r.effective, 'sheet and derived data agree');
  }
  setEnv(a, 'atmosphere');
  const r = row();
  assert.equal(r.effective, boosted);
  assert.equal(r.conditionalActive, true);
  assert.equal(r.availableLabel, null);
  assert.match(r.modification, /active/);
  assert.equal(derive(a).speed.total, r.effective);
  assert.equal(rec(a).movement.speedModes.find(m => m.scale === 'character').squaresPerMove, fly.squaresPerMove, 'published baseline untouched');
  remove(a, 't1');
  assert.equal(buildVehicleSchemaViewModel(a, {}).effective.some(x => x.label.startsWith('Atmospheric')), false, 'removal drops the contribution');
  assert.equal(derive(a).speed.total, fly.squaresPerMove);
});
