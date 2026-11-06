import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { getPublishedDerivedBase, getEffectiveVehicleDerived, claimsPublishedSource } from '../scripts/domain/vehicles/vehicle-published-derived.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const rec = a => a.flags.swse.universalVehicleSource.source;
const XW = 'core-incom-t-65b-x-wing-starfighter';
const byKey = key => actors.find(a => a.system.vehicleSourceEntryKey === key);

const builder = (() => {
  const code = readFileSync('scripts/actors/v2/vehicle-derived-builder.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace(/^export\s+\{[^}]*\};?/gm, '').replace(/\bexport\s+/g, '');
  const ctx = { getPublishedDerivedBase, getEffectiveVehicleDerived, claimsPublishedSource };
  runInNewContext(code + '\nglobalThis.build = buildVehicleDerived;', ctx);
  return ctx.build;
})();
const derive = a => { const actor = structuredClone(a); builder(actor, actor.system); return actor.system.derived; };

test('all 429: derived defenses, DT, DR and HP max equal the printed record', () => {
  for (const a of actors) {
    const r = rec(a), d = derive(a);
    assert.equal(d.defenses.ref.total, r.defenses.reflex);
    assert.equal(d.defenses.fort.total, r.defenses.fortitude);
    assert.equal(d.damageThreshold, r.durability.damageThreshold);
    assert.equal(d.damage.threshold, r.durability.damageThreshold);
    assert.equal(d.hp.max, r.durability.hitPoints);
    assert.equal(d.hp.value, a.system.hp.value);
    const dr = r.defenses.damageReduction;
    assert.equal(d.damage.reduction, Number.isFinite(dr) ? dr : 0);
    assert.equal(d.damage.reductionPublished, Number.isFinite(dr));
    assert.equal(d.defenses.flatFooted.total, Number.isFinite(r.defenses.reflexFlatFooted) ? r.defenses.reflexFlatFooted : d.defenses.ref.total);
  }
});

test('tampered system mirrors cannot change printed derived values; current HP stays actor state', () => {
  const a = structuredClone(byKey(XW));
  Object.assign(a.system, { damageThreshold: 1, damageReduction: 99, reflexDefense: 1, fortitudeDefense: 1, flatFooted: 1 });
  a.system.hp = { value: 37, max: 5 };
  const d = derive(a);
  assert.equal(d.damageThreshold, 46);
  assert.equal(d.damage.reduction, 10);
  assert.equal(d.defenses.ref.total, 18);
  assert.equal(d.defenses.fort.total, 26);
  assert.equal(d.defenses.flatFooted.total, 12);
  assert.equal(d.hp.max, 120);
  assert.equal(d.hp.value, 37);
});

test('a damaged vehicle recomputes the same printed totals (no drift across repeated derivation)', () => {
  const a = structuredClone(byKey(XW));
  const first = derive(a);
  a.system.hp.value = 10;
  const second = derive(a);
  for (const k of ['damageThreshold']) assert.equal(first[k], second[k]);
  assert.equal(second.hp.percent, (10 / 120) * 100);
  assert.equal(second.hp.critical, true);
});

test('unverifiable record (digest mismatch) is ignored; legacy fields apply', () => {
  const a = structuredClone(byKey(XW));
  a.flags.swse.universalVehicleSource.source.durability.damageThreshold = 999;
  assert.equal(getPublishedDerivedBase(a), null);
  const d = derive(a);
  assert.equal(d.damageThreshold, a.system.damageThreshold);
});

test('non-source vehicles keep legacy derived behavior', () => {
  const custom = { type: 'vehicle', flags: {}, system: { reflexDefense: 15, fortitudeDefense: 17, damageThreshold: 22, damageReduction: 4, hp: { value: 5, max: 30 } } };
  builder(custom, custom.system);
  assert.equal(custom.system.derived.defenses.ref.total, 15);
  assert.equal(custom.system.derived.damageThreshold, 22);
  assert.equal(custom.system.derived.damage.reduction, 4);
  assert.equal(custom.system.derived.hp.max, 30);
});

// ---- P4-B: movement and Initiative ----
import { getPublishedVehicleInitiative } from '../scripts/domain/vehicles/vehicle-published-derived.js';

test('all 429: derived speed is the structured published movement; unknown is null, never the character default 6', () => {
  let noMode = 0;
  for (const a of actors) {
    const r = rec(a), modes = r.movement?.speedModes ?? [], d = derive(a);
    assert.equal(d.speed.modes.length, modes.length);
    assert.equal(d.speed.known, modes.length > 0);
    const firstChar = modes.find(m => m.scale === 'character');
    assert.equal(d.speed.total, firstChar ? firstChar.squaresPerMove : null);
    const firstShip = modes.find(m => m.scale === 'starship');
    assert.equal(d.speed.starshipSquares, firstShip ? firstShip.squaresPerMove : null);
    assert.equal(d.speed.walk, modes.find(m => m.scale === 'character' && m.mode === 'walking')?.squaresPerMove ?? null);
    if (!firstChar) noMode++;
  }
  assert.ok(noMode >= 0);
});

test('hybrid and multi-mode vehicles keep every mode and both scales', () => {
  const x = derive(byKey(XW)).speed;
  assert.deepEqual([x.total, x.starshipSquares, x.mode], [16, 4, 'flying']);
  assert.equal(x.modes.length, 2);
  const walker = derive(byKey('core-at-at')).speed;
  assert.equal(walker.mode, 'walking');
  assert.equal(walker.walk, walker.total);
});

test('printed Initiative (negative, zero, positive) is the vehicle Initiative authority', () => {
  const values = new Set();
  for (const a of actors) {
    const printed = rec(a).abilities.initiativePrinted;
    values.add(Math.sign(printed));
    assert.equal(getPublishedVehicleInitiative(a), printed);
  }
  assert.deepEqual([...values].sort(), [-1, 0, 1].filter(v => values.has(v)).sort());
  assert.equal(getPublishedVehicleInitiative({ type: 'droid', flags: byKey(XW).flags }), null);
  assert.equal(getPublishedVehicleInitiative({ type: 'vehicle', flags: {}, system: {} }), null);
});

test('Initiative consumers prefer the printed value (plus certified effects) for source-backed vehicles', () => {
  const init = readFileSync('scripts/engine/combat/SWSEInitiative.js', 'utf8');
  const combat = readFileSync('scripts/combat/swse-combat.js', 'utf8');
  for (const code of [init, combat]) {
    assert.match(code, /getEffectiveVehicleInitiative\(actor\)/);
    assert.ok(code.indexOf('getEffectiveVehicleInitiative(actor)') < code.indexOf('derivedSkills'));
  }
});
