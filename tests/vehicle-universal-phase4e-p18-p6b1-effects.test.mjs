import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import * as E from '../scripts/domain/vehicles/vehicle-modification-effects.js';
import * as O from '../scripts/domain/vehicles/vehicle-operating-context.js';
import { getEffectiveRechargeShieldsAmount } from '../scripts/domain/vehicles/vehicle-published-derived.js';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { VehicleOperatingContextService: Svc } = await import('../scripts/engine/vehicles/vehicle-operating-context-service.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const catalog = [...load('defense-systems'), ...load('movement-systems')];
const cert = load('certification').rows;
const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';           // Gargantuan, astromech nav, SR 15, Pilot +7
const DAV = 'kotor-davaab-type-starfighter';                  // Huge, navicomputer installed
const rules = { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 40 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) };
const actorOf = key => { const d = structuredClone(docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === key)); return Object.assign(d, { id: 'v1', isOwner: true, items: [], toObject() { const { toObject, ...r } = this; return structuredClone(r); } }); };
const rec = a => a.flags.swse.universalVehicleSource.source;
function plan(a, id, installId = 'i-' + id) {
  return L.planVehicleInstallation({ record: rec(a), flags: a.flags, catalogEntry: { ...catalog.find(c => c.id === id), certification: cert[id] }, installId, availableCredits: 1e9, rules, nonstandard: false });
}
function install(a, id, installId) { const p = plan(a, id, installId); assert.equal(p.ok, true, id + ': ' + (p.reasons ?? []).join()); a.flags.swse.vehicleInstallations = p.nextLedger; return p; }
const remove = (a, installId) => { a.flags.swse.vehicleInstallations = L.planVehicleUninstall({ record: rec(a), flags: a.flags, installId }).nextLedger; };

test('certification: the four new rows are MECHANIC_SPECIFIED, installable, and the rest of the deferred set stays closed', () => {
  for (const id of ['regenerating-shields', 'sublight-accelerator', 'navicomputer', 'navicomputer-advanced']) {
    assert.equal(cert[id].status, 'MECHANIC_SPECIFIED', id);
    assert.ok(E.EFFECTS[id].citation.startsWith('Starships of the Galaxy'));
  }
  for (const id of ['reinforced-bulkheads-10', 'reinforced-bulkheads-20', 'reinforced-bulkheads-30', 'sublight-drive-1', 'sublight-drive-6', 'jamming-suite', 'jamming-array', 'combat-thrusters', 'navicomputer-limited'])
    assert.equal(cert[id].status, 'SOURCE_VERIFIED', id + ' stays deferred');
});

test('regenerating shields: a recharge action restores 10 instead of 5, capped at the maximum; removal restores 5', async () => {
  const a = actorOf(XW); a.system.shields.value = 3;
  const calls = [];
  ActorEngine.updateActor = async (actor, update) => { calls.push(update); Object.assign(actor.system.shields, { value: update['system.shields.value'] }); };
  let r = await ActorEngine.rechargeShields(a);
  assert.deepEqual([r.restored, r.current, r.max], [5, 8, 15], 'normal shields: 5');
  a.system.shields.value = 3;
  install(a, 'regenerating-shields', 'r1');
  r = await ActorEngine.rechargeShields(a);
  assert.deepEqual([r.restored, r.current], [10, 13]);
  r = await ActorEngine.rechargeShields(a); // 13 -> capped at 15
  assert.deepEqual([r.restored, r.current], [2, 15], 'up to the ship maximum');
  a.system.shields.value = 3;
  assert.equal(getEffectiveRechargeShieldsAmount(a, 5), 10);
  assert.equal(getEffectiveRechargeShieldsAmount(a, 7), 7, 'other amounts (e.g. a droid restoration) pass through untouched');
  assert.equal(getEffectiveRechargeShieldsAmount({ type: 'character' }, 5), 5);
  remove(a, 'r1');
  assert.equal(getEffectiveRechargeShieldsAmount(a, 5), 5);
  assert.ok(plan(a, 'regenerating-shields', 'r2').ok);
  install(a, 'regenerating-shields', 'r3');
  assert.ok(plan(a, 'regenerating-shields', 'r4').reasons.includes('EFFECT_STACKING_UNRULED'), 'a second system of the same kind is denied (V-P6-03)');
});

test('SLAM: +5 on Pilot checks to increase speed, +10 for all-out movement; no other Pilot check changes', () => {
  const a = actorOf(XW);
  assert.equal(O.vehiclePilotCheck(a).modifier, 7);
  install(a, 'sublight-accelerator', 's1');
  assert.equal(O.vehiclePilotCheck(a).modifier, 7, 'an ordinary Pilot check is unchanged');
  assert.equal(O.vehiclePilotCheck(a, { purpose: 'increase-speed' }).modifier, 12);
  assert.equal(O.vehiclePilotCheck(a, { purpose: 'increase-speed', allOutMovement: true }).modifier, 17);
  assert.equal(O.vehiclePilotCheck(a, { purpose: 'dogfight' }).modifier, 7);
  assert.equal(O.vehiclePilotCheck(a, { pilotActor: { id: 'p' }, purpose: 'increase-speed' }).modifier, 1 + 5);
  assert.equal(O.vehiclePilotCheck(a, { pilotActor: { id: 'p' }, purpose: 'increase-speed', allOutMovement: true }).modifier, 1 + 10);
  assert.ok(O.vehiclePilotCheck(a, { purpose: 'increase-speed' }).breakdown.some(b => /sublight|accelerator/i.test(b.label)));
  remove(a, 's1');
  assert.equal(O.vehiclePilotCheck(a, { purpose: 'increase-speed' }).modifier, 7);
  // hull restriction from the printed table is still enforced (Gargantuan or smaller)
  const big = docs.find(d => d.flags.swse.universalVehicleSource.source.classification.printedSize === 'Colossal (cruiser)');
  const cruiser = actorOf(big.flags.swse.canonicalPublication.sourceEntryKey);
  assert.ok(plan(cruiser, 'sublight-accelerator').reasons.some(r => r.startsWith('SIZE_')));
});

test('navicomputer: +5 (standard) / +10 (advanced) equipment bonus on astrogation Use Computer checks only; non-stacking', async () => {
  const a = actorOf(XW);
  const bonus = (v, use = 'astrogate', skill = 'useComputer') => O.vehicleSkillEquipmentBonus(v, { skill, use }).total;
  assert.equal(bonus(a), 0, 'astromech hull: nothing printed');
  install(a, 'navicomputer', 'n1');
  assert.equal(bonus(a), 5);
  assert.equal(bonus(a, 'hyperspace-mapping'), 0, 'only astrogation');
  assert.equal(bonus(a, 'astrogate', 'pilot'), 0, 'only Use Computer');
  assert.ok(plan(a, 'navicomputer-advanced', 'n2').reasons.includes('EFFECT_STACKING_UNRULED'), 'two navicomputers on one ship are denied');
  remove(a, 'n1');
  install(a, 'navicomputer-advanced', 'n3');
  assert.equal(bonus(a), 10, 'advanced +10 instead of +5');
  // a hull printed with an installed navicomputer already has the standard +5
  const d = actorOf(DAV);
  assert.equal(bonus(d), 5);
  assert.ok(plan(d, 'navicomputer').reasons.includes('NAVICOMPUTER_ALREADY_PRESENT'));
  install(d, 'navicomputer-advanced', 'n4');
  assert.equal(bonus(d), 10, 'the advanced unit supersedes the hull\'s +5 (highest equipment bonus applies, never 15)');
  remove(d, 'n4');
  assert.equal(bonus(d), 5);
  // the roll goes through the canonical skill roll with the bonus as a custom modifier
  const crew = { id: 'c1', type: 'character', isOwner: true, system: {}, items: [] };
  const vehicle = actorOf(XW); install(vehicle, 'navicomputer', 'n5');
  const svc = readFileSync('scripts/engine/vehicles/vehicle-operating-context-service.js', 'utf8');
  assert.match(svc, /rollSkill\(crewActor, 'useComputer', \{[^}]*skillUse: \{ key: 'astrogate' \}[^}]*customModifier: Number\(options\.customModifier \|\| 0\) \+ eq\.total/);
  assert.deepEqual(await Svc.rollAstrogationCheck(vehicle, { crewActor: null }).then(r => r.reasons), ['CREW_ACTOR_REQUIRED']);
  assert.deepEqual(await Svc.rollAstrogationCheck(vehicle, { crewActor: { ...crew, isOwner: false }, user: { isGM: false } }).then(r => r.reasons), ['CREW_ROLL_NOT_AUTHORIZED']);
});

test('the limited navicomputer and other deferred rows are refused by the planner', () => {
  const a = actorOf(XW);
  for (const id of ['navicomputer-limited', 'combat-thrusters', 'jamming-suite', 'reinforced-bulkheads-10', 'sublight-drive-1'])
    assert.ok(plan(a, id).reasons.includes('MODIFICATION_EFFECT_NOT_IMPLEMENTED'), id);
});

test('the vehicle sheet shows the new action/check modifiers separately from statistics', async () => {
  const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');
  const a = actorOf(XW);
  install(a, 'regenerating-shields', 'r1'); install(a, 'sublight-accelerator', 's1'); install(a, 'navicomputer', 'n1');
  const rows = buildVehicleSchemaViewModel(a, {}).effective;
  assert.equal(rows.find(r => r.label === 'Recharge shields action').effectiveLabel, '+10 (up to the maximum)');
  assert.equal(rows.find(r => /Pilot \(increase-speed\)/.test(r.label)).effectiveLabel, '+5 (+10 all-out)');
  assert.equal(rows.find(r => /Use Computer \(astrogate\)/.test(r.label)).effectiveLabel, '+5');
  assert.equal(rows.find(r => r.label === 'Reflex Defense').effectiveLabel, String(rec(a).defenses.reflex), 'statistics unaffected');
});

test('P6B deferred-work register is valid, rendered, and every deferred component stays uninstallable', async () => {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['tools/audits/vehicles/build-p6b-deferred-work.mjs', '--check']);
  const d = JSON.parse(readFileSync('data/audits/vehicles/p6b-deferred-work.json', 'utf8'));
  const deferredIds = ['reinforced-bulkheads-10', 'reinforced-bulkheads-20', 'reinforced-bulkheads-30', 'sublight-drive-1', 'sublight-drive-6',
    'jamming-suite', 'jamming-array', 'combat-thrusters', 'navicomputer-limited'];
  for (const id of deferredIds) {
    assert.ok(d.items.some(i => i.component.includes(id.replace(/-\d$/, ''))), `${id} has a deferred-work item`);
    assert.equal(E.hasEffect(id), false, `${id} must not have a registered effect`);
    assert.notEqual(cert[id]?.status, 'MECHANIC_SPECIFIED', `${id} must not be MECHANIC_SPECIFIED`);
    assert.equal(plan(actorOf(XW), id).ok, false, `${id} must not be installable`);
  }
  for (const i of d.items.filter(x => x.ownerRulingNeeded)) assert.ok(i.linkedDecisions.length, `${i.id} links a register decision`);
});
