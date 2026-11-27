import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-DC P1: a BAB estimated from a class's progression RATE (because exact level_progression data was missing), or a startup-deferred BAB, must never be
// presented as certified. calculate() stays numeric (compatibility); calculateDetailed() / derived.babProvenance say how the number was obtained.
registerFoundryPathLoader();
installFoundryShimGlobals();
const { BABCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/bab-calculator.js');

// startup-deferred state first (class authority not ready: no registry, no pack)
{
  BABCalculator.clearCaches();
  globalThis.game = { ...(globalThis.game ?? {}), packs: { get: () => null } };
  const r = await BABCalculator.calculateDetailed([{ class: 'Nonheroic', level: 2 }, { class: 'Exact', level: 4 }]);
  assert.equal(r.provenance.certified, false, 'startup-deferred BAB is not certified');
  assert.equal(r.provenance.startupDeferred, true);
  console.log('  ok  startup-deferred BAB is flagged');
}
// class authority ready from here on
globalThis.game = { ...(globalThis.game ?? {}), packs: { get: () => ({}) } };
const exactTable = Array.from({ length: 20 }, (_, i) => ({ level: i + 1, bab: i + 1 }));
const CLASSES = {
  Exact: { levelProgression: exactTable },
  RateOnly: { babProgression: 'slow' },
  FastRateOnly: { babProgression: 'fast' },
  Nonheroic: { isNonheroic: true }
};
BABCalculator._getClassDataLoader = async () => ({ getClassData: async (name) => CLASSES[name] ?? null });
const run = async (levels, opts = {}) => { BABCalculator.clearCaches(); return BABCalculator.calculateDetailed(levels, opts); };

{
  const r = await run([{ class: 'Exact', level: 5 }]);
  assert.equal(r.total, 5);
  assert.deepEqual(r.provenance, { certified: true, startupDeferred: false, estimated: [] });
  console.log('  ok  exact table: certified');
}
{
  const r = await run([{ class: 'RateOnly', level: 7 }, { class: 'Exact', level: 2 }]);
  assert.equal(r.total, Math.floor(7 * 0.75) + 2, 'the estimate value is unchanged');
  assert.equal(r.provenance.certified, false, 'an estimated component makes the whole BAB not certified');
  assert.deepEqual(r.provenance.estimated, [{ class: 'RateOnly', level: 7, bab: 5 }]);
  console.log('  ok  rate-only class: estimated, not certified, component named');
}
{
  const r = await run([{ class: 'FastRateOnly', level: 4 }], { adjustment: 1 });
  assert.equal(r.total, 5);
  assert.equal(r.provenance.certified, false);
  console.log('  ok  fast rate-only class with adjustment');
}
{
  BABCalculator.clearCaches();
  assert.equal(await BABCalculator.calculate([{ class: 'Exact', level: 3 }]), 3, 'calculate() stays numeric');
  const again = await BABCalculator.calculateDetailed([{ class: 'Exact', level: 3 }]);
  assert.equal(again.provenance.certified, true, 'cache returns provenance too');
  console.log('  ok  numeric API and cache');
}
{
  const r = await run([{ class: 'RateOnly', level: 7 }]);
  const cached = await BABCalculator.calculateDetailed([{ class: 'RateOnly', level: 7 }]);
  assert.equal(cached.provenance.certified, false, 'a cached estimate stays flagged');
  assert.equal(r.total, cached.total);
  console.log('  ok  cached estimate stays flagged');
}
console.log('bab-provenance-not-certified-when-estimated: ok');
