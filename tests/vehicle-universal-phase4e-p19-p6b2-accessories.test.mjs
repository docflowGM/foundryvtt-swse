import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import * as E from '../scripts/domain/vehicles/vehicle-modification-effects.js';
import * as O from '../scripts/domain/vehicles/vehicle-operating-context.js';
import { getEffectiveVehicleDerived } from "../scripts/domain/vehicles/vehicle-published-derived.js";

installSystemsResolver(); installFoundryStubs();

const { VehicleOperatingContextService: Svc } = await import('../scripts/engine/vehicles/vehicle-operating-context-service.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const catalog = [...load('defense-systems'), ...load('movement-systems'), ...load('accessories')];
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';           // Gargantuan, 110 kg cargo
const YT = 'core-corellian-yt-1300-transport'; const LAATC = 'cw-laat-c-carrier'; const C99 = 'cw-c-9979-landing-craft';
const rules = { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 40 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) };
const actorOf = key => { const d = structuredClone(docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === key)); return Object.assign(d, { id: 'v1', isOwner: true, items: [], toObject() { const { toObject, ...r } = this; return structuredClone(r); } }); };
const rec = a => a.flags.swse.universalVehicleSource.source;
function plan(a, id, installId = 'i-' + id) {
  return L.planVehicleInstallation({ record: rec(a), flags: a.flags, catalogEntry: { ...catalog.find(c => c.id === id), certification: cert[id] }, installId, availableCredits: 1e9, rules, nonstandard: false });
}
function install(a, id, installId) { const p = plan(a, id, installId); assert.equal(p.ok, true, id + ': ' + (p.reasons ?? []).join()); a.flags.swse.vehicleInstallations = p.nextLedger; return p; }
const remove = (a, installId) => { a.flags.swse.vehicleInstallations = L.planVehicleUninstall({ record: rec(a), flags: a.flags, installId }).nextLedger; };


test('certification: the eleven P6B-2 accessories are MECHANIC_SPECIFIED from the PDF overlay; unclear accessories stay closed', () => {
  const certified = ['cargo-pod-light', 'cargo-pod-medium', 'cargo-pod-heavy', 'cryogenic-chambers', 'extended-range', 'hangar-bay', 'hangar-bay-concealed',
    'sensor-array-2', 'sensor-array-4', 'sensor-array-6', 'sensor-enhancement'];
  for (const id of certified) { assert.equal(cert[id].status, 'MECHANIC_SPECIFIED', id); assert.ok(cert[id].book && Number.isInteger(cert[id].printedPage), id); }
  for (const id of ['escape-pod-small', 'escape-pod-large', 'smuggler-compartments', 'slave-circuits-basic', 'slave-circuits-advanced', 'droid-repair-team',
    'cargo-jettison', 'luxury-extreme', 'cloaking-hibridium', 'docking-clamps', 'transponder-masked', 'medical-suite', 'passenger-seating'])
    assert.ok(plan(actorOf(YT), id).reasons.includes('MODIFICATION_EFFECT_NOT_IMPLEMENTED'), id);
});

test('cargo pods: +cost modifier x 1/5/10 tons; Dexterity -2 each through Reflex, Initiative and Pilot; never below Dexterity 1', () => {
  const a = actorOf(YT), r = rec(a);                     // Colossal (cost modifier 5), Dex 10, 100 tons
  const base = { reflex: r.defenses.reflex, init: r.abilities.initiativePrinted, pilot: O.vehiclePilotCheck(a).modifier };
  install(a, 'cargo-pod-light', 'p1');
  let eff = getEffectiveVehicleDerived(a);
  assert.equal(eff.dexterity.effective, 8);
  assert.equal(eff.reflex, base.reflex - 1, 'Dex 10 -> 8: modifier 0 -> -1');
  assert.equal(eff.initiative, base.init - 1);
  assert.equal(O.vehiclePilotCheck(a).modifier, base.pilot - 1);
  assert.deepEqual(eff.cargo.effective, { value: 105, unit: 'tons' });
  assert.ok(plan(a, 'cargo-pod-heavy', 'px').reasons.includes('SIZE_INELIGIBLE'), 'printed size restriction still enforced');
  install(a, 'cargo-pod-medium', 'p2');                  // pods stack ("each pod added")
  eff = getEffectiveVehicleDerived(a);
  assert.equal(eff.dexterity.effective, 6);
  assert.deepEqual(eff.cargo.effective, { value: 130, unit: 'tons' });
  install(a, 'cargo-pod-medium', 'p3'); install(a, 'cargo-pod-light', 'p4');   // Dex 2
  assert.ok(plan(a, 'cargo-pod-light', 'p5').reasons.includes('CARGO_POD_DEXTERITY_BELOW_1'), 'Dex 2 -> 0 refused');
  remove(a, 'p4');
  assert.equal(plan(a, 'cargo-pod-light', 'p6').ok, true);
  for (const id of ['p1', 'p2', 'p3']) remove(a, id);
  eff = getEffectiveVehicleDerived(a);
  assert.equal(eff.reflex, base.reflex, 'removal restores the published baseline');
  assert.equal(eff.cargo.effective, null);
  // jets and pods accumulate on the Dexterity score, not on separately rounded modifiers
  install(a, 'maneuvering-jets-2', 'j1'); install(a, 'cargo-pod-light', 'p7');
  assert.equal(getEffectiveVehicleDerived(a).reflex, base.reflex, 'Dex 10 +2 -2 = 10');
  // V-P6B-02: printed kg cargo combines at 1,000 kg per ton; the printed value is untouched
  const x = actorOf(XW); install(x, 'cargo-pod-light', 'k1');           // Gargantuan: cost modifier 2 -> +2 tons
  const xc = getEffectiveVehicleDerived(x).cargo;
  assert.deepEqual([xc.baseKg, xc.effectiveKg, xc.effective.value], [110, 2110, 2.11]);
  assert.deepEqual(rec(x).capacity.cargo, { value: 110, unit: 'kg', raw: '110 kg' }, 'published value and unit preserved');
  // annotated quantities are never guessed
  assert.ok(plan(actorOf('kotor-star-forge-manufacture-herald-class-shuttle'), 'cargo-pod-light').reasons.includes('CARGO_QUANTITY_ANNOTATED_UNRULED'));
});

test('sensor arrays: equipment bonus to Intelligence; not stackable; no consumer changes other statistics', () => {
  const a = actorOf(YT), r = rec(a);
  install(a, 'sensor-array-2', 's1');
  let eff = getEffectiveVehicleDerived(a);
  assert.deepEqual([eff.intelligence.base, eff.intelligence.effective, eff.intelligence.modifierDelta], [r.abilities.int, r.abilities.int + 2, 1]);
  assert.equal(eff.reflex, r.defenses.reflex);
  assert.ok(plan(a, 'sensor-array-4', 's2').reasons.includes('EFFECT_STACKING_UNRULED'));
  remove(a, 's1'); install(a, 'sensor-array-6', 's3');
  assert.equal(getEffectiveVehicleDerived(a).intelligence.effective, r.abilities.int + 6);
});

test('sensor enhancement package: +5 on Perception and Use Computer checks to operate sensors only', async () => {
  const a = actorOf(YT);
  const bonus = (skill, use) => O.vehicleSkillEquipmentBonus(a, { skill, use }).total;
  const astrogateBefore = bonus('useComputer', 'astrogate');      // the YT-1300 is printed with a navicomputer (+5)
  install(a, 'sensor-enhancement', 'e1');
  assert.deepEqual([bonus('perception', 'sensors'), bonus('useComputer', 'sensors'), bonus('perception', null), bonus('pilot', 'sensors')], [5, 5, 0, 0]);
  assert.equal(bonus('useComputer', 'astrogate'), astrogateBefore, 'astrogation unaffected');
  assert.deepEqual(await Svc.rollSensorCheck(a, { crewActor: null, skill: 'perception' }).then(r => r.reasons), ['CREW_ACTOR_REQUIRED']);
  assert.deepEqual(await Svc.rollSensorCheck(a, { crewActor: { id: 'c', type: 'character', isOwner: false }, skill: 'perception', user: { isGM: false } }).then(r => r.reasons), ['CREW_ROLL_NOT_AUTHORIZED']);
  assert.deepEqual(await Svc.rollSensorCheck(a, { crewActor: { id: 'c', type: 'character', isOwner: true }, skill: 'stealth' }).then(r => r.reasons), ['SENSOR_SKILL_INVALID']);
  const svc = readFileSync('scripts/engine/vehicles/vehicle-operating-context-service.js', 'utf8');
  assert.match(svc, /vehicleSkillEquipmentBonus\(vehicle, \{ skill, use: 'sensors' \}\)/);
});

test('extended range (V-P6B-02): 10% of the ORIGINAL duration in days, rounded down, minimum 1 day; not compounded', () => {
  const ext = (key, n) => { const a = actorOf(key); for (let i = 0; i < n; i++) install(a, 'extended-range', `x${i}`); return getEffectiveVehicleDerived(a).consumables; };
  assert.equal(ext(LAATC, 1).effectiveDays, 4, '3 days: 0.3 -> minimum 1 day');
  assert.equal(ext(LAATC, 2).effectiveDays, 5);
  let c = ext(YT, 1);                                                      // 2 months
  assert.deepEqual([c.baseDays, c.addedDays, c.effectiveDays, c.basis], [60, 6, 66, 'PROJECT_CALENDAR_CONVENTION']);
  assert.equal(ext(YT, 3).effectiveDays, 60 + 18, 'each installation adds 10% of the original 60 days (never 10% of 66)');
  c = ext('core-arc-170-starfighter', 1);                                  // 1 week = 7 days: 0.7 -> 1
  assert.deepEqual([c.baseDays, c.effectiveDays, c.basis], [7, 8, 'UNIT_FACT']);
  assert.equal(ext('core-imperial-i-class-star-destroyer', 1).effectiveDays, 2190 + 219, '6 years = 2,190 days');
  assert.ok(plan(actorOf('core-eta-2-actis-interceptor'), 'extended-range').reasons.includes('CONSUMABLES_UNIT_CONVERSION_UNRULED'), 'annotated duration not guessed');
  assert.deepEqual(rec(actorOf(YT)).capacity.consumables, { value: 2, unit: 'months', raw: '2 months' });
});

test('capacities: hangar bays (cost modifier/50 units) and cryogenic chambers (cost modifier/5); fractional capacities refused', () => {
  const f = actorOf(C99);                                // Colossal (frigate): cost modifier 50
  install(f, 'hangar-bay', 'h1'); install(f, 'hangar-bay-concealed', 'h2'); install(f, 'cryogenic-chambers', 'c1');
  const caps = getEffectiveVehicleDerived(f).capacities;
  assert.equal(caps.hangar.total, 2);
  assert.equal(caps.cryogenic.total, 10);
  assert.ok(plan(actorOf(YT), 'hangar-bay').reasons.some(r => r.startsWith('SIZE_') || r === 'CAPACITY_FRACTIONAL_FOR_HULL_SIZE'), 'Colossal: 5/50 is not a whole bay');
  const y = actorOf(YT); install(y, 'cryogenic-chambers', 'c2');
  assert.equal(getEffectiveVehicleDerived(y).capacities.cryogenic.total, 1);
});

test('the vehicle sheet shows Dexterity, Intelligence, cargo, consumables and capacity rows', async () => {
  const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');
  const a = actorOf(YT);
  install(a, 'cargo-pod-light', 'p1'); install(a, 'sensor-array-2', 's1'); install(a, 'cryogenic-chambers', 'c1'); install(a, 'sensor-enhancement', 'e1');
  const rows = buildVehicleSchemaViewModel(a, {}).effective;
  assert.equal(rows.find(r => r.label === 'Dexterity').effectiveLabel, '8');
  assert.equal(rows.find(r => r.label === 'Intelligence').effectiveLabel, String(rec(a).abilities.int + 2));
  assert.equal(rows.find(r => r.label === 'Cargo').effectiveLabel, '105 tons');
  assert.equal(rows.find(r => /Cryogenic/.test(r.label)).effectiveLabel, '1');
  assert.ok(rows.some(r => r.label === 'Perception (sensors) equipment bonus'));
  const c = actorOf(LAATC); install(c, 'extended-range', 'x1');
  assert.equal(buildVehicleSchemaViewModel(c, {}).effective.find(r => r.label === 'Consumables').effectiveLabel, '4 days');
});
