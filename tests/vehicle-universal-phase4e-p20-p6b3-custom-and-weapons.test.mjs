import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as C from '../scripts/domain/vehicles/custom-vehicle-construction.js';
import { getEffectiveVehicleDerived, getEffectiveVehicleSource, getEffectiveVehicleInitiative, getEffectiveRechargeShieldsAmount } from '../scripts/domain/vehicles/vehicle-published-derived.js';
import * as O from '../scripts/domain/vehicles/vehicle-operating-context.js';

installSystemsResolver(); installFoundryStubs();
const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');
const { buildVehicleDerived } = await import('../scripts/actors/v2/vehicle-derived-builder.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const catalog = [...load('defense-systems'), ...load('movement-systems'), ...load('accessories'), ...load('weapon-systems')];
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
const frames = JSON.parse(readFileSync('data/canonical/vehicles/construction/stock-frames.json', 'utf8')).frames;
const row = id => ({ ...catalog.find(c => c.id === id), certification: cert[id] });
const claims = { kind: 'rules-legal', designerActorId: 'a1', starshipDesigner: true, shipyardAidApprovedBy: 'gm1' };
const RULES = { ...C.DEFAULT_CONSTRUCTION_RULES, designRounding: 'floor', resolveFrameEpPool: () => 30 };

function customShip(systemIds, { approved = true, frameId = 'superiority-fighter' } = {}) {
  const frame = frames.find(f => f.id === frameId);
  const systems = systemIds.map((id, i) => ({ catalogEntry: row(id), installId: `s${i}` }));
  const v = C.validateDesign({ designId: 'd1', name: 'Test Ship', frame, systems, authorship: claims, crewQuality: 'skilled', authority: approved ? { verified: true } : null, rules: RULES });
  assert.deepEqual(v.reasons, [], 'design valid');
  const record = C.buildConstructionRecord({ designId: 'd1', name: 'Test Ship', frame, validation: v, authorship: claims, crewQuality: 'skilled' });
  const data = approved ? C.buildCustomVehicleActorData({ record, frame }) : { name: 'Test Ship', type: 'vehicle', system: {}, flags: { swse: { vehicleConstruction: record } } };
  return Object.assign(structuredClone(data), { id: 'c1', isOwner: true, items: [], toObject() { const { toObject, ...r } = this; return structuredClone(r); } });
}

test('custom ship: certified installed systems apply through the one effective-statistics authority', () => {
  const plain = customShip([]);
  const base = getEffectiveVehicleDerived(plain);
  assert.equal(base.origin, 'custom-constructed');
  assert.equal(base.reflex, plain.flags.swse.vehicleConstruction.derived.reflexDefense);
  assert.equal(base.shieldMax, 0, 'a stock frame includes no shields');
  const a = customShip(['armor-1', 'shields-20', 'maneuvering-jets-2', 'regenerating-shields']);
  const eff = getEffectiveVehicleDerived(a);
  // Dex 22 -> 24: modifier +6 -> +7
  assert.equal(eff.reflex, base.reflex + 1 + 1, 'armor +1 and jets +1 Dex modifier');
  assert.equal(eff.initiative, base.initiative + 1);
  assert.equal(getEffectiveVehicleInitiative(a), base.initiative + 1, 'combat Initiative reads the same authority');
  assert.equal(eff.shieldMax, 20);
  assert.equal(getEffectiveRechargeShieldsAmount(a, 5), 10);
  assert.equal(eff.dexterity.effective, 24);
  // the actor's derived data (what defenses, combat and shield mitigation read) uses the same values
  const system = structuredClone(a.system); system.derived ??= {};
  buildVehicleDerived(a, system);
  assert.equal(system.derived.defenses.reflex.total, eff.reflex);
  assert.equal(system.derived.shield.max, 20);
  assert.equal(system.derived.damage.reductionPublished, undefined, 'custom values are never labelled as published');
});

test('custom ship Pilot check: construction Pilot (generic crew) or crew Actor + frame size and effective Dex', () => {
  const a = customShip(['maneuvering-jets-2', 'sublight-accelerator']);
  const d = a.flags.swse.vehicleConstruction.derived;
  assert.equal(O.vehiclePilotCheck(a).mode, 'GENERIC_CREW');
  assert.equal(O.vehiclePilotCheck(a).modifier, d.pilot + 1);
  assert.equal(O.vehiclePilotCheck(a, { purpose: 'increase-speed' }).modifier, d.pilot + 1 + 5);
  const crew = O.vehiclePilotCheck(a, { pilotActor: { id: 'p' } });
  assert.equal(crew.modifier, -5 + 7, 'Gargantuan -5; Dex 24 -> +7');
  assert.equal(crew.breakdown.find(b => /Dexterity/.test(b.label)).basis, 'CONSTRUCTION_FRAME_PLUS_CERTIFIED');
});

test('custom ship: unapproved or tampered construction records apply nothing; frame values never come from system data', () => {
  assert.equal(getEffectiveVehicleSource(customShip(['armor-1'], { approved: false })), null, 'pending approval');
  const t = customShip(['armor-1']);
  t.flags.swse.vehicleConstruction.derived.reflexDefense += 5;
  assert.equal(getEffectiveVehicleDerived(t), null, 'digest mismatch');
  const m = customShip(['maneuvering-jets-2']);
  m.system.attributes.dex.base = 40;                     // mutable mirror ignored
  assert.equal(getEffectiveVehicleDerived(m).dexterity.effective, 24);
});

test('custom ship sheet rows agree with the gameplay authority (Dex and Int now known)', () => {
  const a = customShip(['maneuvering-jets-2', 'sensor-array-2', 'armor-1']);
  const m = buildVehicleSchemaViewModel(a, {});
  const eff = getEffectiveVehicleDerived(a);
  assert.equal(m.effective.find(r => r.label === 'Reflex Defense').effective, eff.reflex);
  assert.equal(m.effective.find(r => r.label === 'Dexterity').effectiveLabel, '24');
  assert.equal(m.effective.find(r => r.label === 'Intelligence').effectiveLabel, '16');
  const labels = m.installed.entries.map(e => e.effectLabel);
  assert.ok(labels.includes('Effect certified; shown in statistics (no rule consumer yet)'), 'sensor array is not claimed as applied');
});

test('weapons stay closed: no weapon, launcher or ammunition is installable, and no stock attack group is trusted', async () => {
  const weapons = catalog.filter(c => c.category === 'Weapon' || c.category === 'Ammunition' || /launcher|missile|torpedo|mine|bomb/.test(c.id));
  assert.ok(weapons.length > 40);
  for (const w of weapons) assert.notEqual(cert[w.id]?.status, 'MECHANIC_SPECIFIED', w.id);
  const { TRUSTED_STOCK_WEAPON_GROUP_COUNT } = await import('../scripts/domain/vehicles/vehicle-stock-attack-authority.js');
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT, 0);
  const frame = frames.find(f => f.id === 'superiority-fighter');
  const v = C.validateDesign({ designId: 'd2', name: 'X', frame, systems: [{ catalogEntry: row('proton-torpedo-launcher'), installId: 'w1' }], authorship: claims, crewQuality: 'skilled', authority: { verified: true }, rules: RULES });
  assert.ok(v.reasons.some(r => /MODIFICATION_EFFECT_NOT_IMPLEMENTED|WEAPON_MOUNT_UNCERTIFIED/.test(r)), 'a custom design cannot add a weapon either');
  const ledger = readFileSync('scripts/domain/vehicles/vehicle-installation-ledger.js', 'utf8');
  assert.match(ledger, /executable: false/);
});

test('custom designs refuse accessories whose base the stock frame does not provide (P6B-D-021, P6B-D-022)', () => {
  const frame = frames.find(f => f.id === 'light-freighter');
  const reasons = id => C.validateDesign({ designId: 'd3', name: 'X', frame, systems: [{ catalogEntry: row(id), installId: 'z1' }], authorship: claims,
    crewQuality: 'skilled', authority: { verified: true }, rules: RULES }).reasons;
  assert.ok(reasons('cargo-pod-light').includes('cargo-pod-light:CARGO_UNIT_NOT_TONS'));
  assert.ok(reasons('extended-range').includes('extended-range:CONSUMABLES_UNIT_CONVERSION_UNRULED'));
  assert.ok(reasons('atmospheric-thrusters').includes('atmospheric-thrusters:NO_ATMOSPHERIC_FLIGHT_MODE'));
  assert.deepEqual(reasons('cryogenic-chambers'), [], 'capacity accessories work (Colossal: 1 creature per unit)');
});
