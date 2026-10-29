import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { getPublishedDerivedBase } from '../scripts/domain/vehicles/vehicle-published-derived.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const rec = a => a.flags.swse.universalVehicleSource.source;
const XW = 'core-incom-t-65b-x-wing-starfighter';
const byKey = key => actors.find(a => a.system.vehicleSourceEntryKey === key);

const builder = (() => {
  const code = readFileSync('scripts/actors/v2/vehicle-derived-builder.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace(/^export\s+\{[^}]*\};?/gm, '').replace(/\bexport\s+/g, '');
  const ctx = { getPublishedDerivedBase };
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
