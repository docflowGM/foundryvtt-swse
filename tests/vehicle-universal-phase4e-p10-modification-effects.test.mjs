import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as E from '../scripts/domain/vehicles/vehicle-modification-effects.js';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';

installSystemsResolver(); installFoundryStubs();
const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const catalog = [...load('defense-systems'), ...load('movement-systems'), ...load('accessories'), ...load('weapon-systems')];
const overlay = JSON.parse(readFileSync('data/vehicle-modifications/certification.json', 'utf8')).rows;
const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const byKey = k => structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === k));
const rules = { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 40 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'TEST' }) };
const row = id => ({ ...catalog.find(c => c.id === id), certification: overlay[id] });
const TIE = 'core-tie-fighter', XW = 'core-incom-t-65b-x-wing-starfighter', ARC = 'core-arc-170-starfighter';

function install(actor, id, installId = 'i' + Math.random().toString(36).slice(2, 6)) {
  const plan = L.planVehicleInstallation({ record: actor.flags.swse.universalVehicleSource.source, flags: actor.flags, catalogEntry: row(id), installId, availableCredits: 1e9, rules, nonstandard: false });
  if (plan.ok) actor.flags.swse.vehicleInstallations = plan.nextLedger;
  return plan;
}
const effective = actor => E.computeEffectiveStatistics({ record: actor.flags.swse.universalVehicleSource.source, entries: L.readCertifiedInstallations(actor.flags, actor.flags.swse.universalVehicleSource.source.identity.sourceEntryKey).entries });
const wrap = a => ({ ...structuredClone(a), id: 'v1', isOwner: true, items: [], toObject: () => structuredClone(a) });

test('registry and certification agree exactly: MECHANIC_SPECIFIED <=> implemented effect', () => {
  const certified = Object.entries(overlay).filter(([, r]) => r.status === 'MECHANIC_SPECIFIED').map(([id]) => id).sort();
  assert.deepEqual(certified, [...E.IMPLEMENTED_EFFECT_IDS].sort());
  assert.equal(certified.length, 39);
  for (const id of E.IMPLEMENTED_EFFECT_IDS) {
    assert.ok(catalog.some(c => c.id === id), id);
    assert.match(E.EFFECTS[id].citation, /Starships of the Galaxy/);
    assert.equal(overlay[id].effectTest, 'tests/vehicle-universal-phase4e-p10-modification-effects.test.mjs');
  }
  for (const id of ['reinforced-bulkheads-10', 'jamming-suite', 'regenerating-shields', 'combat-thrusters', 'navicomputer', 'sublight-accelerator', 'sublight-drive-3'])
    assert.equal(overlay[id].status, 'SOURCE_VERIFIED', id + ' stays deferred');
});

test('armor adds its equipment bonus to Reflex; the baseline is untouched; removal restores it', () => {
  const a = byKey(XW);
  const base = a.flags.swse.universalVehicleSource.source.defenses.reflex;
  const baseline = JSON.stringify(a.flags.swse.universalVehicleSource);
  assert.equal(install(a, 'armor-1', 'a1').ok, true);
  assert.equal(effective(a).reflex.effective, base + 1);
  assert.equal(effective(a).reflex.base, base);
  assert.equal(JSON.stringify(a.flags.swse.universalVehicleSource), baseline);
  const removal = L.planVehicleUninstall({ record: a.flags.swse.universalVehicleSource.source, flags: a.flags, installId: 'a1' });
  a.flags.swse.vehicleInstallations = removal.nextLedger;
  assert.equal(effective(a).reflex.effective, base, 'original effective statistics restored');
});

test('a second system of the same kind is refused (stacking unruled), not guessed', () => {
  const a = byKey(XW);
  const big = actors.find(x => x.flags.swse.universalVehicleSource.source.classification.printedSize === 'Colossal (cruiser)');
  const c = byKey(big.system.vehicleSourceEntryKey);
  assert.equal(install(c, 'armor-1', 'a1').ok, true);
  assert.ok(install(c, 'armor-2', 'a2').reasons.includes('EFFECT_STACKING_UNRULED'));
});

test('maneuvering jets change the Dexterity modifier: Reflex and Initiative move by the modifier delta only', () => {
  const a = byKey(XW); const r = a.flags.swse.universalVehicleSource.source;
  assert.equal(r.abilities.dex, 22);
  assert.equal(install(a, 'maneuvering-jets-2', 'j1').ok, true); // 22 -> 24: +1 modifier
  const fx = effective(a);
  assert.equal(fx.reflex.effective, r.defenses.reflex + 1);
  assert.equal(fx.initiative.effective, r.abilities.initiativePrinted + 1);
  const b = byKey(XW); install(b, 'maneuvering-jets-4', 'j2'); // 22 -> 26: +2
  assert.equal(effective(b).reflex.effective, r.defenses.reflex + 2);
});

test('shields apply only to a hull printed with SR 0; a shielded or unknown hull is refused', () => {
  const tie = byKey(TIE);
  assert.equal(tie.flags.swse.universalVehicleSource.source.defenses.shieldRating, 0);
  const ok = install(tie, 'shields-10', 's1');
  assert.equal(ok.ok, true, ok.reasons.join());
  assert.equal(effective(tie).shield.effective, 10);
  assert.equal(effective(tie).shield.base, 0);
  assert.ok(install(byKey(XW), 'shields-10').reasons.includes('SHIELD_REPLACEMENT_OR_ADDITION_UNRULED'));
  assert.ok(install(tie, 'shields-15', 's2').reasons.includes('EFFECT_STACKING_UNRULED'));
});

test('a hyperdrive applies only to a hull printed without one', () => {
  const tie = byKey(TIE);
  const ok = install(tie, 'hyperdrive-3', 'h1');
  assert.equal(ok.ok, true, ok.reasons.join());
  assert.equal(effective(tie).hyperdrive.effectiveClass, 3);
  assert.equal(ok.entry.quote.nonstandard, false); // quote is the caller's rules in this fixture; starfighter rule is covered by the p8 suite
  assert.ok(install(byKey(XW), 'hyperdrive-3').reasons.includes('HYPERDRIVE_REPLACEMENT_UNRULED'));
});

test('atmospheric thrusters raise fly speed and max velocity, rounded down, only for character-scale flight', () => {
  const a = byKey(ARC); const modes = a.flags.swse.universalVehicleSource.source.movement.speedModes;
  const fly = modes.find(m => m.scale === 'character');
  const ok = install(a, 'atmospheric-thrusters', 't1');
  assert.equal(ok.ok, true, ok.reasons.join());
  const m = effective(a).movement[0];
  assert.equal(m.effectiveSquares, Math.floor(fly.squaresPerMove * 1.1));
  assert.equal(m.effectiveKmh, Math.floor(fly.maxVelocityKmh * 1.1 / 10) * 10);
  assert.equal(m.baseSquares, fly.squaresPerMove);
  assert.equal(effective(a).movement.length, 1, 'starship-scale movement is untouched');
  // hull without a character-scale fly mode
  const ground = actors.find(x => !(x.flags.swse.universalVehicleSource.source.movement.speedModes ?? []).some(s => FLY(s)));
  assert.ok(E.effectInstallability({ catalogEntry: row('atmospheric-thrusters'), record: ground.flags.swse.universalVehicleSource.source }).includes('NO_ATMOSPHERIC_FLIGHT_MODE'));
});
const FLY = s => s.scale === 'character' && ['fly', 'flying'].includes(s.mode);

test('deferred rows stay denied through the planner with the precise reason', () => {
  for (const id of ['reinforced-bulkheads-20', 'jamming-array', 'navicomputer-advanced', 'sublight-drive-2', 'combat-thrusters']) {
    const r = install(byKey(XW), id);
    assert.equal(r.ok, false); assert.ok(r.reasons.includes('MODIFICATION_EFFECT_NOT_IMPLEMENTED'), id);
  }
});

test('ledger entries without a registered effect contribute nothing and are reported', () => {
  const fx = E.computeEffectiveStatistics({ record: byKey(XW).flags.swse.universalVehicleSource.source, entries: [{ installId: 'z', catalogId: 'fx-unknown', name: 'Fixture' }] });
  assert.equal(fx.reflex.delta, 0);
  assert.deepEqual(fx.unimplemented, [{ installId: 'z', name: 'Fixture' }]);
});

test('V2 schema view shows base, modification, effective separately', () => {
  const a = byKey(XW); install(a, 'armor-1', 'a1');
  const m = buildVehicleSchemaViewModel(wrap(a), { epTable: null });
  const r = m.effective.find(x => x.label === 'Reflex Defense');
  const base = a.flags.swse.universalVehicleSource.source.defenses.reflex;
  assert.equal(r.baseLabel, String(base));
  assert.match(r.modification, /^\+1 \(Starship Armor, \+1\)$/);
  assert.equal(r.effectiveLabel, String(base + 1));
  assert.equal(m.installed.entries[0].effectStatus, 'EFFECT_CERTIFIED');
  const t = byKey(TIE); install(t, 'shields-10', 's1');
  assert.equal(buildVehicleSchemaViewModel(wrap(t), { epTable: null }).effective.find(x => x.label === 'Shield Rating').effectiveLabel, '10');
});
